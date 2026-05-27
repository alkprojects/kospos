/**
 * Pure helpers over PlannedAction collections.
 *
 * No DOM, no IO. Cost projection delegates to `lib/cost.ts:calcEmployeeCost`
 * which is itself pure — given the same basis + reference data, the same
 * projection comes back. That's what makes the "compare to plan" diff
 * (Tab 24 § Improvement #2) easy: re-run with today's data, compare to
 * the basis the action was authored against.
 */

import { calcEmployeeCost, CostCalcError } from '../cost';
import { normalizePositionKey } from '../chartfields/resolve';
import type { Position } from '../positions';
import type {
  DerivedAction,
  ExpectedCost,
  PlannedAction,
  PlannedActionType,
  StaffingPlanRollup,
} from './types';

/** Display order for the rollup header — mirrors Tab 24's section stack. */
export const ACTION_TYPE_ORDER: readonly PlannedActionType[] = [
  'active-hire',
  'separation',
  'pending',
  'temp-tracking',
  'unfunded',
];

/**
 * Generate an id that survives test environments (Vitest happy-dom doesn't
 * always have `crypto.randomUUID`). Format prefers the standard UUID v4
 * when available; the millisecond+random fallback is still unique enough
 * for in-memory plan rows.
 */
export function newActionId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `pa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Compute the live COLA-aware expected cost for one action. Returns null
 * when `basis === null` (action is unpriced) or when the calculator
 * throws — e.g. an obsolete jobCode that no longer has a snapshot.
 *
 * Sign convention: separations carry a **negative** annual cost (savings);
 * all other types stay positive. The calculator always returns positive
 * totals — the negation lives here so the entity layer is the single
 * source of truth for the sign.
 *
 * Accepts derived rows too — derived `basis` is always null so the function
 * returns null immediately. Keeps rollup code uniform across both kinds.
 */
export function computeExpectedCost(action: PlannedAction | DerivedAction): ExpectedCost | null {
  if (!action.basis) return null;
  let res;
  try {
    res = calcEmployeeCost(action.basis);
  } catch (err) {
    // Surface as "unpriced" rather than crashing — the surface PR will
    // render the underlying CostCalcError code as a diagnostic chip.
    if (err instanceof CostCalcError) return null;
    throw err;
  }
  const ppCount = res.ppRows.length;
  if (ppCount === 0) return null;
  const rawAnnual = res.totalSalary + res.totalBen;
  const sign = action.type === 'separation' ? -1 : 1;
  return {
    annual: sign * rawAnnual,
    perPp: (sign * rawAnnual) / ppCount,
    ppCount,
    empOrg: res.empOrg,
  };
}

/**
 * Group actions by PlannedActionType, returning one rollup row per type
 * in `ACTION_TYPE_ORDER`. Empty buckets are included so the surface can
 * render the full section stack consistently.
 *
 * Accepts manual + derived rows mixed; derived rows always count as
 * `unpriced` since their `basis` is null by definition.
 */
export function rollupByType(actions: (PlannedAction | DerivedAction)[]): StaffingPlanRollup[] {
  const buckets = new Map<PlannedActionType, StaffingPlanRollup>();
  for (const t of ACTION_TYPE_ORDER) {
    buckets.set(t, {
      type: t,
      count: 0,
      pricedCount: 0,
      unpriced: 0,
      annualCost: 0,
      perPpCost: 0,
    });
  }
  for (const a of actions) {
    const bucket = buckets.get(a.type);
    if (!bucket) continue;
    bucket.count += 1;
    const cost = computeExpectedCost(a);
    if (cost) {
      bucket.pricedCount += 1;
      bucket.annualCost += cost.annual;
      bucket.perPpCost += cost.perPp;
    } else {
      bucket.unpriced += 1;
    }
  }
  return ACTION_TYPE_ORDER.map(t => buckets.get(t)!);
}

/**
 * All actions for one position (the multi-action pattern). Useful when
 * Position Detail wants to surface every PlannedAction tied to the
 * currently-viewed position (Marco Jacobo case: Active + Separation +
 * TEMP all visible on one position's detail page).
 *
 * Positions are joined by *normalized* key — callers pass either a raw
 * position number or a pre-normalized id and we normalize both sides
 * defensively.
 */
export function actionsForPosition<T extends { positionId: string }>(
  actions: T[],
  positionIdOrNumber: string,
): T[] {
  const key = normalizePositionKey(positionIdOrNumber);
  if (!key) return [];
  return actions.filter(a => a.positionId === key);
}

/**
 * Diagnostic count for the "X of Y priced ⚠" chip (per Restated Q #12
 * default). Walks the action list once; doesn't trigger cost re-projection
 * for unpriced rows since `basis === null` short-circuits.
 */
export function pricingDiagnostic(actions: (PlannedAction | DerivedAction)[]): {
  total: number;
  priced: number;
  unpriced: number;
} {
  let priced = 0;
  let unpriced = 0;
  for (const a of actions) {
    if (a.basis && computeExpectedCost(a)) priced += 1;
    else unpriced += 1;
  }
  return { total: actions.length, priced, unpriced };
}

/**
 * Net cost-impact across the whole plan, respecting the sign convention.
 * The headline number in the Hiring Plan summary card per Tab 24 § UI
 * sketch.
 */
export function netCostImpact(actions: (PlannedAction | DerivedAction)[]): {
  annual: number;
  perPp: number;
} {
  let annual = 0;
  let perPp = 0;
  for (const a of actions) {
    const cost = computeExpectedCost(a);
    if (!cost) continue;
    annual += cost.annual;
    perPp += cost.perPp;
  }
  return { annual, perPp };
}

// ---------------------------------------------------------------------------
// Derived action rules — Bug 3 (S29 Alex feedback). See types.ts § Derived
// actions for the full design rationale.
//
//   Pending = vacant positions with no manual action
//   TEMP    = Cat 17/18 positions with no manual action
//
// Precedence: TEMP > Pending (a vacant Cat 17/18 position derives as TEMP).
// Per-position manual-wins: any manual action on a position suppresses ALL
// derived defaults for that position.
// ---------------------------------------------------------------------------

/**
 * For one position, return the derived action spec it would produce (per
 * the rules in `types.ts`) OR null if no derived rule applies.
 *
 * Pure — doesn't consult the manual-actions / derived-removed sets; callers
 * filter those out before calling this.
 */
function deriveSpec(p: Position): DerivedAction | null {
  // TEMP precedence: Cat 17/18 wins regardless of fill status. A vacant
  // Cat 17/18 position is still "TEMP" — that's the more specific signal.
  // We check the position-level `cat1718` (set whenever the P&P row has a
  // Cat 17/18 code, filled or not) rather than `appointment.cat1718` (only
  // set when there's an incumbent).
  if (p.cat1718) {
    return {
      source: 'derived',
      id: `derived-${p.id}`,
      positionId: p.id,
      displayNumber: p.displayNumber,
      type: 'temp-tracking',
      derivedReason: `Cat ${p.cat1718.category} temp`,
      basis: null,
      status: null,
      notes: '',
      startPpe: undefined,
    };
  }
  if (p.fillStatus === 'VACANT') {
    return {
      source: 'derived',
      id: `derived-${p.id}`,
      positionId: p.id,
      displayNumber: p.displayNumber,
      type: 'pending',
      derivedReason: 'Vacant, no plan',
      basis: null,
      status: null,
      notes: '',
      startPpe: undefined,
    };
  }
  return null;
}

/**
 * Visible derived rows — these populate the Pending + TEMP sections at view
 * time. A position contributes a derived row iff:
 *   1. The derive rule applies (Cat 17/18 OR vacant), AND
 *   2. No manual action exists on the position (per-position manual-wins), AND
 *   3. The user hasn't explicitly hidden the position via `derivedRemoved`.
 *
 * Results are sorted alphabetically by displayNumber for stable rendering.
 */
export function computeDerivedActions(
  positions: readonly Position[],
  manualPositionIds: ReadonlySet<string>,
  derivedRemoved: ReadonlySet<string>,
): DerivedAction[] {
  const out: DerivedAction[] = [];
  for (const p of positions) {
    if (manualPositionIds.has(p.id)) continue;
    if (derivedRemoved.has(p.id)) continue;
    const spec = deriveSpec(p);
    if (spec) out.push(spec);
  }
  out.sort((a, b) => a.displayNumber.localeCompare(b.displayNumber));
  return out;
}

/**
 * "Manual user changes" section content — derived rows the user explicitly
 * hid via the Hide button. A row appears here iff:
 *   1. The derive rule STILL applies (Cat 17/18 OR vacant on the current
 *      snapshot), AND
 *   2. No manual action exists on the position (otherwise the manual won
 *      and the omission is moot — auto-pruned for clarity), AND
 *   3. The position is in `derivedRemoved`.
 *
 * Auto-pruning condition 1 means: if a previously-vacant position got
 * filled in a newer snapshot, its omission disappears from this section
 * (the rule no longer fires). The omission entry persists in the store
 * (so if the position becomes vacant again, the user's hide intent is
 * remembered), but it's invisible while the rule doesn't apply.
 */
export function computeOmittedDerivedActions(
  positions: readonly Position[],
  manualPositionIds: ReadonlySet<string>,
  derivedRemoved: ReadonlySet<string>,
): DerivedAction[] {
  const out: DerivedAction[] = [];
  for (const p of positions) {
    if (!derivedRemoved.has(p.id)) continue;
    if (manualPositionIds.has(p.id)) continue;
    const spec = deriveSpec(p);
    if (spec) out.push(spec);
  }
  out.sort((a, b) => a.displayNumber.localeCompare(b.displayNumber));
  return out;
}

/**
 * Status-transition guard for the Hiring Plan workflow. Returns true if the
 * transition from `from` → `to` is allowed without an override per S29
 * Alex pick (guarded forward-only + csc-hold/finished branches).
 *
 *   not-started → posted → list → exam → interviews → offer → final → finished
 *
 *   csc-hold reachable from any state, and any state reachable from csc-hold
 *   (a hold pauses the flow; clearing it can resume from any prior point).
 *
 *   finished is terminal (no forward transitions out of it).
 *
 * Same-state is allowed (idempotent — e.g. user re-selecting the current
 * status is not an error).
 *
 * The PlannedActionDetail editor in PR 2 will surface a "force-override"
 * affordance for transitions this guard rejects, with the override logged
 * to the action's history audit log.
 */
export function isAllowedStatusTransition(
  from: PlannedAction['status'],
  to: PlannedAction['status'],
): boolean {
  if (from === to) return true;
  // csc-hold is a bidirectional branch — to/from any state.
  if (from === 'csc-hold' || to === 'csc-hold') return true;

  // Define the linear pipeline order.
  const order: Array<NonNullable<PlannedAction['status']>> = [
    'not-started',
    'posted',
    'list',
    'exam',
    'interviews',
    'offer',
    'final',
    'finished',
  ];
  // Null status (separation / pending / unfunded) → allowed to anything;
  // those types don't use the pipeline so there's nothing to guard against.
  if (from === null || to === null) return true;

  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  // Unknown states (shouldn't happen with the typed enum) — allow.
  if (fi < 0 || ti < 0) return true;
  // Forward-only otherwise.
  return ti > fi;
}
