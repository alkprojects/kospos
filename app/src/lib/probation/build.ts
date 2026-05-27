/**
 * Pure helpers over Probation collections + the status-transition guard
 * + end-date computation.
 *
 * No DOM, no IO. Same input → same output. The store layer composes these
 * with mutation; views call them directly for read-only derivations.
 */

import { normalizePositionKey } from '../chartfields/resolve';
import {
  PROBATION_STATUS_ORDER,
  PROBATION_TERMINAL_STATUSES,
} from './types';
import type {
  Probation,
  ProbationaryPeriodHours,
  ProbationStatus,
  ProbationStatusRollup,
} from './types';

/**
 * Generate a stable id — UUID v4 when available, millisecond+random
 * fallback otherwise (mirrors `lib/separations/build.ts:newSeparationId`
 * for environments — happy-dom in vitest — that don't always expose
 * `crypto.randomUUID`).
 */
export function newProbationId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `prob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Allowed forward transitions from each status. Same-status is allowed
 * (idempotent — re-saving the row without changing the status is not an
 * error). Terminal statuses have only the same-status entry — no forward
 * transitions out. The guard returns `true` for any pair in this table
 * and `false` otherwise; the UI surfaces an override affordance when this
 * returns `false`.
 *
 * Workflow:
 *   open      → open, extended, cleared, failed, resigned
 *   extended  → extended, cleared, failed, resigned
 *   cleared   → cleared        (terminal)
 *   failed    → failed         (terminal)
 *   resigned  → resigned       (terminal)
 *
 * Note: `extended` cannot go back to `open` without override — the
 * extension event itself is the reason for the transition.
 */
const ALLOWED_FORWARD: Record<ProbationStatus, ReadonlySet<ProbationStatus>> = {
  open:     new Set<ProbationStatus>(['open', 'extended', 'cleared', 'failed', 'resigned']),
  extended: new Set<ProbationStatus>(['extended', 'cleared', 'failed', 'resigned']),
  cleared:  new Set<ProbationStatus>(['cleared']),
  failed:   new Set<ProbationStatus>(['failed']),
  resigned: new Set<ProbationStatus>(['resigned']),
};

/**
 * Status-transition guard — forward progress only. Unknown statuses
 * (shouldn't happen with the typed enum) — allow, defensively.
 */
export function isAllowedProbationStatusTransition(
  from: ProbationStatus,
  to: ProbationStatus,
): boolean {
  const allowed = ALLOWED_FORWARD[from];
  if (!allowed) return true;
  return allowed.has(to);
}

/**
 * Group probations by status, returning one row per status in canonical
 * order (`PROBATION_STATUS_ORDER`). Empty buckets are kept so the
 * summary header can render a stable 5-chip strip even when one bucket
 * is empty.
 */
export function rollupByStatus(probations: Probation[]): ProbationStatusRollup[] {
  const buckets = new Map<ProbationStatus, ProbationStatusRollup>();
  for (const s of PROBATION_STATUS_ORDER) {
    buckets.set(s, { status: s, count: 0 });
  }
  for (const p of probations) {
    const b = buckets.get(p.status);
    if (b) b.count += 1;
  }
  return PROBATION_STATUS_ORDER.map(s => buckets.get(s)!);
}

/**
 * All probations tied to one position. Joined by *normalized* key —
 * callers can pass either a raw position number or a pre-normalized id
 * and we normalize both sides defensively.
 *
 * Returns empty when the key normalizes to empty (defensive — protects
 * against accidental empty filters).
 */
export function probationsForPosition(
  probations: Probation[],
  positionIdOrNumber: string,
): Probation[] {
  const key = normalizePositionKey(positionIdOrNumber);
  if (!key) return [];
  return probations.filter(p => p.positionId === key);
}

/**
 * Compute the base probation end date from start date + hours, assuming
 * full-time equivalence (40 hours / week, 7 days / week).
 *
 *   2080 hours → +364 days   (52 weeks × 7)  — exact week boundary, lands
 *                                              1 day shy of a calendar year
 *   1040 hours → +182 days   (26 weeks × 7)  — ~6 months
 *
 * Returns ISO `YYYY-MM-DD` to match the input shape.
 *
 * Note: the 2080-hour case lands at Dec 31 (52 weeks exactly), not Jan 1,
 * because 2080 ÷ 40 = 52 weeks = 364 days < 365.25 day calendar year. CSC
 * Rule 117 completion is hours-tracked not date-tracked, so the 1-day gap
 * doesn't actually matter for compliance — this date is advisory.
 *
 * The caller is responsible for handing this an actual start date; if
 * `startWorkDate` is empty / invalid, returns empty string (so the UI
 * can fall back to a manual entry instead of showing `NaN`).
 *
 * Real-world Cat 16 / part-time employees take longer elapsed time to
 * clock the same hours — the user can override the computed value in the
 * detail editor when the FTE differs.
 */
export function computeBaseEndDate(
  startWorkDate: string,
  hours: ProbationaryPeriodHours,
): string {
  if (!startWorkDate) return '';
  const start = new Date(startWorkDate + 'T00:00:00Z');
  if (Number.isNaN(start.getTime())) return '';
  // Days = hours / 40 hours-per-week × 7 days-per-week. Integer math fine
  // for the two canonical values (1040 → 182, 2080 → 365).
  const daysToAdd = Math.round((hours / 40) * 7);
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + daysToAdd);
  return end.toISOString().slice(0, 10);
}

/**
 * Effective current end date for a probation — the latest extension's
 * `newEndDate` if any extensions exist, otherwise the stored `baseEndDate`
 * (computed if missing).
 *
 * Returns empty string when nothing is computable (no start date + no
 * extensions). Callers should treat empty as "unknown — surface in UI."
 */
export function currentEndDate(probation: Probation): string {
  if (probation.extensions.length > 0) {
    // Latest extension wins. Sort by extendedAt to be defensive against
    // out-of-order pushes (the store always appends in order; this is a
    // safety belt).
    const sorted = [...probation.extensions].sort((a, b) =>
      a.extendedAt.localeCompare(b.extendedAt),
    );
    return sorted[sorted.length - 1].newEndDate;
  }
  if (probation.baseEndDate) return probation.baseEndDate;
  return computeBaseEndDate(probation.startWorkDate, probation.probationaryPeriodHours);
}

/**
 * Returns true when the probation's `currentEndDate` is within
 * `daysAhead` days of `today` (inclusive — same day counts as approaching).
 *
 * Default `daysAhead` is 30 (matches the
 * `probation-end-approaching` flag definition in
 * `docs/domain/labor-report.md` § Tab 10).
 *
 * Returns false when:
 *   - status is terminal (cleared/failed/resigned — already past the
 *     "approaching" window conceptually)
 *   - currentEndDate is empty / unknown
 *   - currentEndDate is already in the past (use `isPastEndWithoutCompletion`
 *     for that case)
 *
 * `today` must be ISO `YYYY-MM-DD`. Callers control the clock so tests
 * can pin the day deterministically.
 */
export function isApproachingEnd(
  probation: Probation,
  today: string,
  daysAhead = 30,
): boolean {
  if (PROBATION_TERMINAL_STATUSES.has(probation.status)) return false;
  const endIso = currentEndDate(probation);
  if (!endIso || !today) return false;
  const end = new Date(endIso + 'T00:00:00Z');
  const now = new Date(today + 'T00:00:00Z');
  if (Number.isNaN(end.getTime()) || Number.isNaN(now.getTime())) return false;
  const diffDays = Math.floor((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays <= daysAhead;
}

/**
 * Returns true when the probation's `currentEndDate` is today or in the
 * past AND the status is not terminal — i.e., the probation should have
 * been cleared/failed/resigned/extended but wasn't.
 *
 * Matches the `probation-extension-required` flag definition in
 * `docs/domain/labor-report.md` § Tab 10.
 *
 * `today` must be ISO `YYYY-MM-DD`.
 */
export function isPastEndWithoutCompletion(
  probation: Probation,
  today: string,
): boolean {
  if (PROBATION_TERMINAL_STATUSES.has(probation.status)) return false;
  const endIso = currentEndDate(probation);
  if (!endIso || !today) return false;
  const end = new Date(endIso + 'T00:00:00Z');
  const now = new Date(today + 'T00:00:00Z');
  if (Number.isNaN(end.getTime()) || Number.isNaN(now.getTime())) return false;
  return end.getTime() <= now.getTime();
}
