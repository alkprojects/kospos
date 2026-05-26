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
import type {
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
 */
export function computeExpectedCost(action: PlannedAction): ExpectedCost | null {
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
 */
export function rollupByType(actions: PlannedAction[]): StaffingPlanRollup[] {
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
export function actionsForPosition(
  actions: PlannedAction[],
  positionIdOrNumber: string,
): PlannedAction[] {
  const key = normalizePositionKey(positionIdOrNumber);
  if (!key) return [];
  return actions.filter(a => a.positionId === key);
}

/**
 * Diagnostic count for the "X of Y priced ⚠" chip (per Restated Q #12
 * default). Walks the action list once; doesn't trigger cost re-projection
 * for unpriced rows since `basis === null` short-circuits.
 */
export function pricingDiagnostic(actions: PlannedAction[]): {
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
export function netCostImpact(actions: PlannedAction[]): {
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
