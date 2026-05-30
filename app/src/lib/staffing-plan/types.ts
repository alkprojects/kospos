/**
 * Staffing Plan domain types — the entity layer for hiring + separation
 * planning per Tab 24 § PlannedAction model (labor-report.md § Tab 24
 * Improvement #1).
 *
 * Unlike `lib/budget/` (built from BFM Position eturn rows) or `lib/payroll/`
 * (built from OBI BI Payroll rows), there is no upstream file for the
 * staffing plan in v1 — KosPos's spec IS the staffing plan workspace. The
 * entity is in-app data in a Zustand store (`lib/staffing-plan/store.ts`),
 * auto-persisted to IndexedDB + the session snapshot since Phase 2.2.q
 * (`lib/session/use-auto-persistence.ts`).
 *
 * One position can carry multiple PlannedActions (Marco Jacobo example —
 * see [memory `temporary_exchange_tx.md`]: one position can have an
 * Active hire plan AND a Separation AND a TEMP placeholder all at once).
 * That's why this layer keys actions by their own id, not by position id.
 *
 * Sign convention for `expectedCost` per Tab 24 § Per-section footers:
 *   - Active: positive (cost of hire)
 *   - Separations: negative (savings)
 *   - TEMP / Pending / Unfunded: positive (sensitivity reference, not
 *     a budget commitment)
 *
 * Cost computation honors the COLA schedule by default — every projection
 * routes through `calcEmployeeCost` whose per-PP loop already applies
 * pre-/post-COLA snapshots (per [memory
 * `feedback_projections_always_cola_aware.md`]).
 */

import type { CostInput } from '../cost';

/**
 * What kind of planning event this row represents. Mirrors the 5 sections
 * of Tab 24's stacked-block layout (per [memory `staffing_plan_types.md`]).
 */
export type PlannedActionType =
  | 'active-hire'      // actively recruiting (RTF filed / posting / interviewing)
  | 'separation'       // expected separation (retirement / medical / promotion-out)
  | 'pending'          // vacant, no immediate plan to fill
  | 'temp-tracking'    // temp employee tracked for potential PCS conversion
  | 'unfunded';        // position without budgeted funding source

/**
 * Hiring stage — `M Status` column on Tab 24 Active rows.
 *
 * Separations / Pending / Unfunded rows leave `status: null`; their state
 * is encoded in `type` + (for separations) `separationConfidence`.
 */
export type HiringStatus =
  | 'not-started'
  | 'posted'
  | 'list'
  | 'exam'
  | 'interviews'
  | 'offer'
  | 'final'
  | 'csc-hold'
  | 'finished';

/**
 * Cost-attribution mode (Tab 24 § Improvement #10). Affects whether the
 * action consumes existing budget (backfill / temp-conversion) or
 * requires a new appropriation (new-growth).
 */
export type ActionMode =
  | 'backfill'
  | 'new-growth'
  | 'temp-conversion'
  | 'transfer';

/**
 * Separation sub-states (rumored → confirmed → paperwork-filed). For
 * `type === 'separation'` actions only; null on others.
 */
export type SeparationConfidence =
  | 'rumored'
  | 'confirmed'
  | 'paperwork-filed';

/**
 * Per-row audit entry — one row per saved change. v1 just records the
 * field name + before/after; v2 will add `user` once auth lands.
 */
export interface PlannedActionHistory {
  /** ISO timestamp of the change. */
  at: string;
  /** Field that changed (e.g. `status`, `notes`, `basis.stepOrRange`). */
  field: string;
  /** JSON-serializable representation of the previous value. */
  before: unknown;
  /** JSON-serializable representation of the new value. */
  after: unknown;
}

/**
 * One planned action against one position.
 *
 * Multiple PlannedActions per position is the *normal* case — see Tab 24
 * § Cross-section position duplication and the Marco Jacobo TX example.
 * Identity is `id`, not `positionId`.
 *
 * `basis` carries the full `CostInput` so `computeExpectedCost` can call
 * `calcEmployeeCost` and get a COLA-aware projection. When `basis === null`
 * the action is unpriced (Status = `not-started` / `posted` / `list`
 * typically); the surface PR will surface unpriced rows via a diagnostic
 * chip "X of Y priced ⚠" (Restated Q #12 default).
 */
export interface PlannedAction {
  /** Unique identifier (crypto.randomUUID when available; falls back to a
   *  millisecond + random suffix in environments without it). */
  id: string;
  /** Normalized position key (zero-stripped, trimmed) — joins to
   *  `Position.id` from lib/positions/. */
  positionId: string;
  /** Original (display) form before normalization, for UI. */
  displayNumber: string;
  type: PlannedActionType;
  /** Cost-attribution mode (backfill / new-growth / etc.). Optional —
   *  defaults to undefined when not classified. */
  actionMode?: ActionMode;
  /** Hiring-stage state. Null when `type` isn't `'active-hire'`. */
  status: HiringStatus | null;
  /** Separation rumor → confirmation chain. Null when `type` isn't
   *  `'separation'`. */
  separationConfidence?: SeparationConfidence;
  /** Planned start PPE (ISO `YYYY-MM-DD`). Used by cost projection. Blank
   *  when not yet known. */
  startPpe?: string;
  /** Cost-calculator inputs. When null, the action is unpriced and
   *  `computeExpectedCost` returns `null`. */
  basis: CostInput | null;
  /** Free-text rationale — the "why" beyond the structured fields. */
  notes: string;
  /** Categorical hold reason — chip-friendly enum for filtering. v1
   *  carries it as a free string; the surface PR will narrow this to
   *  a curated enum once Alex confirms the distinct values per Tab 24
   *  § Improvement #6. */
  holdReason?: string;
  /** ISO timestamp the action was first added to the plan. */
  plannedAt: string;
  /** Append-only audit log. */
  history: PlannedActionHistory[];
}

/**
 * Live cost result for one action. `annual` is COLA-aware (computed by
 * `calcEmployeeCost`'s per-PP loop, which routes through pre-/post-COLA
 * snapshots); `perPp` is the average per-PP cost across the projection
 * horizon (totalSalary + totalBen ÷ ppCount).
 *
 * Sign convention applied here: separations carry a **negative** annual
 * cost (savings); all other types are positive. The raw `calcEmployeeCost`
 * result is always positive — `computeExpectedCost` negates per
 * `PlannedAction.type`.
 */
export interface ExpectedCost {
  /** COLA-aware annual cost (totalSalary + totalBen across the run). */
  annual: number;
  /** Average per-PP cost across the run. */
  perPp: number;
  /** Number of PPs the projection covers (start PPE → end-of-FY). */
  ppCount: number;
  /** The `empOrg` resolved by the calculator — useful for badge UI
   *  (e.g. "SEIU 1021 Misc"). */
  empOrg: string;
}

/**
 * Side-by-side cost view for delta-pay modeling. The PlannedActionDetail
 * editor renders these as three stats: current incumbent cost, planned
 * action cost, and the difference. Drives the "separation of PCS at Step 5
 * → backfill with TX at Step 1" scenario per the S30 CostInput-scope pick.
 *
 * All three numbers are signed per the action's type (separations carry
 * negative `planned.annual`). `delta = planned.annual - incumbent.annual`
 * — positive means the plan adds cost vs the incumbent baseline; negative
 * means savings. `null` slots indicate "no cost calculable" (incumbent on
 * a vacant position; planned action with an incomplete basis).
 */
export interface DeltaCost {
  /** Current incumbent's projected cost. Null when the position is vacant
   *  or the incumbent's CostInput can't be derived (rare — only when the
   *  appointment is missing step/range data). */
  incumbent: ExpectedCost | null;
  /** Planned action's projected cost. Null when the action is unpriced. */
  planned: ExpectedCost | null;
  /** Annual delta = planned.annual - incumbent.annual. Null when either
   *  operand is null. */
  delta: number | null;
}

/**
 * Rollup per PlannedActionType for the Hiring Plan summary header. The
 * 5 sections of Tab 24 each get one rollup row.
 *
 * `annualCost` carries the sign convention (negative for separations).
 * `unpriced` is the count of actions in the section whose `basis === null`
 * — drives the "X of Y priced ⚠" diagnostic chip.
 */
export interface StaffingPlanRollup {
  type: PlannedActionType;
  count: number;
  pricedCount: number;
  unpriced: number;
  /** Sum of all priced actions' COLA-aware annual cost (sign-respecting). */
  annualCost: number;
  /** Sum of all priced actions' per-PP cost. */
  perPpCost: number;
}

// ---------------------------------------------------------------------------
// Derived actions — Bug 3 (S29 Alex feedback): Pending + TEMP sections should
// default-populate from data; user can hide individual derived rows; hidden
// rows surface in a "Manual user changes" section. Rules:
//
//   Pending = vacant positions with no manual action  (one of the 5 types)
//   TEMP    = Cat 17/18 positions with no manual action
//
// Precedence: when a position is BOTH vacant AND Cat 17/18, derive as TEMP
// (the more specific signal — vacant Cat 17/18 is a specific case of "no
// permanent plan to fill it").
//
// **Override scope per S29 Alex pick — per-position manual-wins.** Any
// manual PlannedAction on a position suppresses ALL derived defaults for
// that position. Simple mental model: "manual wins." Cleanest dedup. If
// the user wants both flavors visible (e.g. TEMP + Separation on the same
// Cat 17/18 position), they add a manual TEMP row + a manual Separation
// row explicitly.
//
// **Storage model.** Derived rows are *virtual* — computed at view time
// from the P&P spine + the current `derivedRemoved` set + the current
// manual-action positionId set. The store only persists manual actions
// (`PlannedAction`) and the omission set (`derivedRemoved`); derived rows
// themselves are never written down.
// ---------------------------------------------------------------------------

/**
 * A virtual row computed from the P&P spine. Render-only — never stored.
 * Identity is the synthetic `derived-${positionId}` so React keys are stable
 * across renders; the row itself can be recomputed safely between snapshots
 * (the rule fires on whatever the current snapshot looks like).
 *
 * Carries the same display fields as PlannedAction so the existing section
 * row component can render both kinds uniformly.
 */
export interface DerivedAction {
  /** Discriminator for the UnifiedAction union. */
  source: 'derived';
  /** Synthetic id: `derived-${positionId}`. Stable across renders. */
  id: string;
  /** Normalized position key (joins to Position.id). */
  positionId: string;
  /** Original (display) form for the UI. */
  displayNumber: string;
  /** Always one of the two derived types in v1. */
  type: 'pending' | 'temp-tracking';
  /** Human-readable reason chip ("Vacant" or "Cat 17 temp" / "Cat 18 temp"). */
  derivedReason: string;
  /** Always null — derived rows aren't priced in v1. Manual conversion lets
   *  the user supply a `basis` (the row stops being virtual at that point). */
  basis: null;
  /** Always null — derived rows don't have a hiring-stage status. */
  status: null;
  /** Empty — derived rows don't carry user notes. */
  notes: string;
  /** Undefined — derived rows don't have a planned start PPE. */
  startPpe: undefined;
}

/**
 * Discriminated union for view-time row rendering. Manual actions get a
 * synthetic `source: 'manual'` tag added at the view layer; derived rows
 * carry their own `source: 'derived'`.
 */
export type UnifiedAction =
  | (PlannedAction & { source: 'manual' })
  | DerivedAction;
