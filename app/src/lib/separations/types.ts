/**
 * Separations domain — Tab 14 Separations workspace. Phase 2.2.i (2.2.26).
 *
 * The third leg of KosPos's vacancy-planning trio (Hiring Plan ⋈ Inactive
 * ⋈ Separations): rumored → planned → orphan-spend. Hiring Plan captures
 * commits to fill positions; Inactive surfaces orphan FYTD spend on
 * positions no longer in the active P&P; Separations tracks the rumored
 * and pending separations that drive both.
 *
 * Unlike `lib/staffing-plan/` (which models PlannedActions across the full
 * hiring lifecycle), `lib/separations/` is a focused tracker for *pending*
 * separations the user hears about before they're committed. Status moves
 * forward over time as confidence solidifies. The cross-link to a
 * PlannedAction (when one exists in the Hiring Plan workspace) lets the
 * user mark "this rumor corresponds to that planned separation row" — the
 * Hiring Plan side surfaces a reciprocal indicator.
 *
 * No upstream importer — KosPos is the system of record. Persists via the
 * Zustand store; round-trips through `lib/session/snapshot.ts`.
 *
 * Naming note: avoids collision with the existing
 * `lib/staffing-plan/SeparationConfidence` (3-value workflow enum on
 * PlannedAction). This module uses `SeparationStatus` (4 values incl.
 * `cleared`) for the workflow axis + `ConfidenceLevel` (low/medium/high)
 * for the orthogonal certainty axis. A future cleanup PR could unify the
 * two staffing-plan workflow concepts if it ever feels worth the churn.
 */

/**
 * Workflow status — the staging pipeline a rumor moves through.
 *
 *   rumored → confirmed → paperwork-filed → cleared
 *
 * `cleared` is terminal (no forward transitions out). Backward transitions
 * require an explicit override (the UI surfaces a checkbox + reason field;
 * the override + reason are logged to the history audit log) — see
 * `isAllowedSeparationStatusTransition`.
 */
export type SeparationStatus = 'rumored' | 'confirmed' | 'paperwork-filed' | 'cleared';

/**
 * Confidence level — how sure the user is the separation will actually
 * happen. Orthogonal to `status`: a "rumored" separation can be high-
 * confidence (employee told you in person); a "confirmed" separation can
 * be low-confidence about timing. Default is `medium` — middle of the road
 * for new rumors where the user hasn't formed a strong view yet.
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/**
 * Per-row audit entry — mirrors `PlannedActionHistory` from
 * `lib/staffing-plan/types.ts`. v1 logs the field name + before/after; an
 * `overrideReason` is appended for status transitions that bypassed the
 * guard. The audit log is append-only and never pruned by the store
 * itself — retention policy lives downstream of the entity layer.
 */
export interface SeparationHistoryEntry {
  /** ISO timestamp of the change. */
  at: string;
  /** Field that changed (e.g. `status`, `confidence`, `linkedActionId`). */
  field: string;
  /** JSON-serializable representation of the previous value. */
  before: unknown;
  /** JSON-serializable representation of the new value. */
  after: unknown;
  /** Free text when a status guard was overridden. Only set on `status`
   *  field entries — other fields don't have a guard to override. */
  overrideReason?: string;
}

/**
 * One pending-separation row. Identity is `id`, not employeeId/positionId,
 * because (a) the same employee could in principle have multiple rumored
 * separations tracked over time, and (b) the position field is optional —
 * sometimes a rumor surfaces before the user knows which position is
 * actually affected.
 *
 * All identifying fields except `employeeName` are optional — the only
 * thing the user is guaranteed to know when starting a row.
 */
export interface PendingSeparation {
  /** Unique id (UUID v4 when available; falls back to a millisecond +
   *  random suffix in environments without `crypto.randomUUID`). */
  id: string;
  /** Required — the employee's name. The other identifiers are optional
   *  because sometimes a rumor lands before the user has the employee
   *  number or position number to attach. */
  employeeName: string;
  /** Optional employee number — populates once the user matches the rumor
   *  to an actual PS HCM record. */
  employeeId?: string;
  /** Normalized position key (joins to `Position.id` from lib/positions/).
   *  Optional — sometimes a rumor names the person but not the position. */
  positionId?: string;
  /** Original (display) form before normalization, for UI. */
  positionDisplayNumber?: string;
  /** Job code on the affected position, surfaced for at-a-glance triage. */
  jobCode?: string;
  /** Workflow status — see `SeparationStatus`. */
  status: SeparationStatus;
  /** Certainty level — see `ConfidenceLevel`. */
  confidence: ConfidenceLevel;
  /** Expected separation date (ISO `YYYY-MM-DD`). Often unknown when
   *  `status === 'rumored'`. */
  expectedSeparationDate?: string;
  /** Free-text reason (e.g. "Retiring", "New job at Port", "Maternity —
   *  may not return"). Not enumerated — too many real-world flavors;
   *  PS HCM has the formal taxonomy. */
  separationReason?: string;
  /** Free text — context the structured fields can't capture. */
  notes: string;
  /** Cross-link to a Hiring Plan `PlannedAction.id` — set when the user
   *  explicitly marks "this rumor maps to that planned Separation row in
   *  the Hiring Plan workspace." Drives a reciprocal "Tracked in
   *  Separations" indicator on the Hiring Plan side. */
  linkedActionId?: string;
  /** Append-only audit log. */
  history: SeparationHistoryEntry[];
  /** ISO timestamp the row was added. */
  createdAt: string;
}

/**
 * Status-keyed rollup for the SeparationsView summary header. One entry
 * per status in canonical order; empty buckets are kept so the surface
 * can render a consistent strip even when one bucket is empty.
 */
export interface SeparationStatusRollup {
  status: SeparationStatus;
  count: number;
}

/** Stable display order for the 4 status buckets. */
export const SEPARATION_STATUS_ORDER: readonly SeparationStatus[] = [
  'rumored',
  'confirmed',
  'paperwork-filed',
  'cleared',
];

/** Stable display order for the 3 confidence levels. */
export const CONFIDENCE_LEVEL_ORDER: readonly ConfidenceLevel[] = [
  'low',
  'medium',
  'high',
];
