/**
 * Probation domain — Tab 10 Probation workspace. Phase 2.2.j (2.2.25).
 *
 * KosPos is the **system of record** for probation tracking. There is no
 * upstream PS HCM feed for DBI's probation list — Alex maintains it by
 * hand today, in a 26-row × 11-col spreadsheet tab. KosPos types it as a
 * typed entity per probation period with a status workflow + auto-computed
 * end-date + extension history. Mirrors the no-upstream-source pattern
 * already used by `lib/staffing-plan/`, `lib/views/inactive/`, and
 * `lib/separations/` (Phase 2.4 ADR queue: one consolidated ADR).
 *
 * Why typed (rather than the workbook's free-text):
 *   - The workbook's `Probationary Period` column carries free text like
 *     `2080 hours worked` or `1040 hours worked`. A typo silently fails to
 *     match any filter. KosPos enforces a 2-value enum.
 *   - The workbook's `ENDS` column is hand-typed with no formula — drifts
 *     when extensions are added but ENDS isn't recomputed. KosPos auto-
 *     computes `baseEndDate` from `startWorkDate + probationaryPeriodHours`
 *     and tracks extensions in an append-only array so the "current end
 *     date" is always derivable.
 *   - The workbook's 3 extension columns (1st/2nd/3rd EXT) overwrite each
 *     other if the user extends multiple times in the wrong column. KosPos
 *     tracks extensions as an array; no overwrites possible.
 *   - The workbook's `Completion` column records the date but not the
 *     *outcome* (cleared vs failed vs resigned). KosPos models all three
 *     as terminal status states for trend analysis later.
 *
 * Naming note: avoids collision with anything in `lib/separations/`. The
 * Probation entity has its own status enum, history entry shape, and
 * rollup shape — even though the workflow concept (forward-only transitions
 * + override-on-backward) mirrors Separations.
 *
 * CSC Rule 117 hours thresholds (per Tab 10 walkthrough):
 *   - **2,080 hours** — full-time-equivalent (52 weeks × 40 hrs/wk = 1 year)
 *   - **1,040 hours** — half-time-equivalent (26 weeks × 40 hrs/wk = ~6 months)
 *
 * For the auto-computed `baseEndDate` we assume full-time equivalence (the
 * common case). Real-world Cat 16 / part-time employees take longer
 * elapsed time to clock the same hours; the user can override `baseEndDate`
 * manually in the detail editor when the FTE differs.
 */

/**
 * Workflow status — the lifecycle states for a probation period.
 *
 *   open → extended (one or more times) → cleared / failed / resigned
 *
 * `open` is the initial state. `extended` is re-entrant (multiple
 * extensions allowed — each appends to the extensions array). `cleared`,
 * `failed`, and `resigned` are terminal — no forward transitions out.
 * Backward transitions require an explicit override (the UI surfaces a
 * checkbox + reason field; the override + reason are logged to the history
 * audit log) — see `isAllowedProbationStatusTransition`.
 *
 * Note: "Approaching" is NOT a stored status — it's a derived flag
 * computed from `currentEndDate(probation) - today < 30 days`. Computing
 * it from the dates avoids drift if the user forgets to manually transition
 * the status as the end date nears.
 */
export type ProbationStatus = 'open' | 'extended' | 'cleared' | 'failed' | 'resigned';

/**
 * The CSC Rule 117 probationary-period hour thresholds. v1 supports the
 * two canonical values (full-time = 2080, half-time = 1040); if a class
 * later needs a non-standard threshold we can widen this to `number`.
 */
export type ProbationaryPeriodHours = 1040 | 2080;

/**
 * One probation extension — captures the date the extension was granted
 * and the new end date. Append-only; the workbook overwrites old values
 * by reusing extension columns, which loses the audit trail.
 */
export interface ProbationExtension {
  /** ISO timestamp the extension was recorded. */
  extendedAt: string;
  /** New end date for the probation after this extension (ISO YYYY-MM-DD). */
  newEndDate: string;
  /** Optional free-text reason for the extension. */
  reason?: string;
}

/**
 * Per-row audit entry — mirrors `SeparationHistoryEntry` from
 * `lib/separations/types.ts`. v1 logs the field name + before/after; an
 * `overrideReason` is appended for status transitions that bypassed the
 * guard. The audit log is append-only and never pruned by the store
 * itself — retention policy lives downstream of the entity layer.
 */
export interface ProbationHistoryEntry {
  /** ISO timestamp of the change. */
  at: string;
  /** Field that changed (e.g. `status`, `probationaryPeriodHours`,
   *  `extensions`). */
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
 * One probation row. Identity is `id`, not employeeId/positionId, because
 * the same employee could in principle have multiple probation periods
 * tracked over time (e.g., after a promotion to a new class that starts a
 * new probation).
 *
 * Required fields are kept minimal — `employeeName` is the only thing the
 * user is guaranteed to know at row-creation time; the rest can be filled
 * in the detail editor later.
 */
export interface Probation {
  /** Unique id (UUID v4 when available; falls back to a millisecond +
   *  random suffix in environments without `crypto.randomUUID`). */
  id: string;
  /** Required — the employee's name. */
  employeeName: string;
  /** Optional employee number — populates once the user matches the
   *  record to an actual PS HCM person. */
  employeeId?: string;
  /** Normalized position key (joins to `Position.id` from lib/positions/). */
  positionId?: string;
  /** Original (display) form before normalization, for UI. */
  positionDisplayNumber?: string;
  /** Job code on the affected position, surfaced for at-a-glance triage. */
  jobCode?: string;
  /** CSC Rule 117 hours threshold for this probation. */
  probationaryPeriodHours: ProbationaryPeriodHours;
  /** Employee's start-work date on the position (ISO YYYY-MM-DD). */
  startWorkDate: string;
  /** Base end date — computed as startWorkDate + N hours (assuming full-
   *  time equivalence). User can override in the detail editor when the
   *  FTE differs (Cat 16 part-time, leaves of absence, etc.). Optional so
   *  rows can be created with only a startWorkDate and the base date is
   *  computed lazily by `computeBaseEndDate`. */
  baseEndDate?: string;
  /** Append-only list of extensions. Each carries its own new end date so
   *  the "current end date" is always the latest extension's `newEndDate`
   *  (or `baseEndDate` if no extensions). */
  extensions: ProbationExtension[];
  /** Workflow status — see `ProbationStatus`. */
  status: ProbationStatus;
  /** Optional free-text supervisor — the workbook uses values like
   *  `confirmed / Carey McElroy`. Not enumerated; supervisors come and go.
   *
   *  When blank, the ProbationsView falls back to the auto-resolved manager
   *  name from the linked Position's `reportsTo` chain. Set this field
   *  explicitly to override the auto-resolved value (e.g. when the
   *  immediate supervisor is acting / vice / on leave). */
  supervisor?: string;
  /** Optional list of deputies — people looped in on probation-related
   *  communications above the immediate supervisor (typically Deputy
   *  Directors / section deputies). Stored as an array because a probation
   *  in a deep org may legitimately have multiple deputies in the reports-
   *  to chain (section deputy → division deputy → division head).
   *
   *  Auto-resolved on add: when the position is set, KosPos walks up the
   *  reportsTo chain and pre-fills any ancestor whose `jobCodeDescription`
   *  contains "Deputy" (case-insensitive). The user can remove pre-filled
   *  entries from the chip list and add more people freely — the stored
   *  array is the source of truth (the auto-resolve is one-shot at fill
   *  time, not re-derived on every render).
   *
   *  Back-compat: session JSON files saved before Phase 2.2.l carry a
   *  single-string `deputy` field instead. `restoreFromSession` promotes
   *  it to `deputies: [deputy]` so old saves don't lose data. */
  deputies?: string[];
  /** Date the probation reached a terminal status (cleared / failed /
   *  resigned). Optional — only meaningful when status ∈ terminal set. */
  completionDate?: string;
  /** Free text — context the structured fields can't capture. */
  notes: string;
  /** Append-only audit log. */
  history: ProbationHistoryEntry[];
  /** ISO timestamp the row was added. */
  createdAt: string;
}

/**
 * Status-keyed rollup for the ProbationsView summary header. One entry
 * per status in canonical order; empty buckets are kept so the surface
 * can render a consistent strip even when one bucket is empty.
 */
export interface ProbationStatusRollup {
  status: ProbationStatus;
  count: number;
}

/** Stable display order for the 5 status buckets. */
export const PROBATION_STATUS_ORDER: readonly ProbationStatus[] = [
  'open',
  'extended',
  'cleared',
  'failed',
  'resigned',
];

/** The terminal statuses — cannot transition out without an override. */
export const PROBATION_TERMINAL_STATUSES: ReadonlySet<ProbationStatus> = new Set([
  'cleared',
  'failed',
  'resigned',
]);

/** The canonical probationary-period hours values (CSC Rule 117). */
export const PROBATIONARY_PERIOD_HOURS: readonly ProbationaryPeriodHours[] = [
  1040,
  2080,
];
