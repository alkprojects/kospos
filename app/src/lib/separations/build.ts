/**
 * Pure helpers over PendingSeparation collections + the status-transition
 * guard.
 *
 * No DOM, no IO. Same input → same output. The store layer composes these
 * with mutation; views call them directly for read-only derivations.
 */

import { normalizePositionKey } from '../chartfields/resolve';
import { makeId } from '../id';
import { SEPARATION_STATUS_ORDER } from './types';
import type {
  PendingSeparation,
  SeparationStatus,
  SeparationStatusRollup,
} from './types';

/** Generate a stable separation id (see `lib/id.ts:makeId`). */
export function newSeparationId(): string {
  return makeId('sep');
}

/**
 * Status-transition guard — forward progress only.
 *
 *   rumored → confirmed → paperwork-filed → cleared
 *
 * Same-status transitions are allowed (idempotent — re-saving the row
 * without changing the status is not an error). Skip-forward transitions
 * are allowed (rumored → paperwork-filed is still forward; the user may
 * have learned the formal status in one update). Backward transitions
 * require an explicit override; the UI surfaces a "Force override
 * (logged)" affordance, and the override + reason are appended to the
 * history audit log by the store.
 *
 * Unknown statuses (shouldn't happen with the typed enum) — allow,
 * defensively.
 */
export function isAllowedSeparationStatusTransition(
  from: SeparationStatus,
  to: SeparationStatus,
): boolean {
  if (from === to) return true;
  const fi = SEPARATION_STATUS_ORDER.indexOf(from);
  const ti = SEPARATION_STATUS_ORDER.indexOf(to);
  if (fi < 0 || ti < 0) return true;
  return ti > fi;
}

/**
 * Group separations by status, returning one row per status in canonical
 * order (`SEPARATION_STATUS_ORDER`). Empty buckets are kept so the
 * summary header can render a stable 4-chip strip even when one bucket is
 * empty.
 */
export function rollupByStatus(separations: PendingSeparation[]): SeparationStatusRollup[] {
  const buckets = new Map<SeparationStatus, SeparationStatusRollup>();
  for (const s of SEPARATION_STATUS_ORDER) {
    buckets.set(s, { status: s, count: 0 });
  }
  for (const sep of separations) {
    const b = buckets.get(sep.status);
    if (b) b.count += 1;
  }
  return SEPARATION_STATUS_ORDER.map(s => buckets.get(s)!);
}

/**
 * All separations tied to one position. Joined by *normalized* key —
 * callers can pass either a raw position number or a pre-normalized id
 * and we normalize both sides defensively.
 *
 * Returns empty when the key normalizes to empty (defensive — protects
 * against accidental empty filters).
 */
export function separationsForPosition(
  separations: PendingSeparation[],
  positionIdOrNumber: string,
): PendingSeparation[] {
  const key = normalizePositionKey(positionIdOrNumber);
  if (!key) return [];
  return separations.filter(s => s.positionId === key);
}

/**
 * All separations linked to a Hiring Plan PlannedAction (via
 * `linkedActionId`). Used by the StaffingPlanView to surface a "Tracked
 * in Separations" chip on Separation rows when the cross-link exists.
 *
 * Returns empty when `actionId` is empty (defensive).
 */
export function separationsForAction(
  separations: PendingSeparation[],
  actionId: string,
): PendingSeparation[] {
  if (!actionId) return [];
  return separations.filter(s => s.linkedActionId === actionId);
}
