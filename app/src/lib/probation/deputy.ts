/**
 * Probation deputy resolver — walks the reports-to chain from a position
 * looking for ancestor positions whose `jobCodeDescription` contains
 * "Deputy" (case-insensitive), and returns the resolved manager names.
 *
 * Why chain-walk rather than a single field on Position: SF org structure
 * routes probation review through multiple deputy layers — for DBI the
 * chain is roughly Inspector → Senior Inspector → Manager → Deputy Director
 * (section) → Deputy Director (admin) → Director. The "deputy" responsible
 * for any given probation is typically the first deputy ancestor. Sometimes
 * there are two layers of deputies (section + admin) and Alex wants both
 * pre-filled so he can decide whom to include.
 *
 * Algorithm:
 *   1. Start with the input position (positionId, normalized form).
 *   2. Follow `reportsTo.positionNumber` upward.
 *   3. At each ancestor, check the ancestor's `jobCodeDescription` for
 *      "deputy" (case-insensitive substring match).
 *   4. When matched, the ancestor's *current incumbent name* is the
 *      deputy. That name is stored on the CHILD's `reportsTo` record
 *      (denormalized from build.ts:140-141), not on the ancestor itself.
 *   5. Stop at top of tree (no reportsTo), unknown parent (not in the
 *      loaded snapshot), or cycle detection — return whatever was found.
 *
 * The chain-walk is O(depth) — typically 3-7 hops in DBI's tree. Cycle
 * detection guards against malformed P&P data (would otherwise infinite-
 * loop on a cycle; surfaced as a `reports-to-cycle` quality flag separately).
 *
 * Returns deduplicated names in the order encountered (closest deputy first).
 * Empty array when no chain, no matches, or no positions loaded.
 *
 * Pure function — no side effects, no I/O. Called by the ProbationsView
 * add form when a position is picked, by ProbationDetail when the
 * positionId changes, and by tests directly.
 */

import { normalizePositionKey } from '../chartfields/resolve';
import type { Position } from '../positions';

/**
 * Match predicate — does a position's `jobCodeDescription` look like a
 * "deputy" position? Case-insensitive substring match on the literal word.
 *
 * Conservative on purpose: matches "Deputy Director", "Deputy Manager",
 * "Deputy Chief", "Section Deputy", etc.; doesn't match "Senior Manager"
 * or "Assistant Director". Alex can always add more people via the chip
 * field; over-matching here would clutter the pre-fill.
 */
export function isDeputyTitle(jobCodeDescription: string): boolean {
  if (!jobCodeDescription) return false;
  // Word-boundary anchored so "deputies" doesn't match but "deputy", "Deputy",
  // "DEPUTY DIRECTOR", "Acting Deputy" all do.
  return /\bdeputy\b/i.test(jobCodeDescription);
}

/**
 * Walk up the reports-to chain from `positionId`, returning the incumbent
 * names of any ancestor positions whose title contains "Deputy".
 *
 * Names are returned in walk order (closest deputy ancestor first), with
 * duplicates removed. Trimmed empty strings are dropped (a deputy ancestor
 * that's currently vacant produces no name and is skipped).
 *
 * @param positionId — normalized position key (use `normalizePositionKey`
 *                     on the display number before calling; or pass an
 *                     already-normalized id from `Position.id`).
 * @param positionsById — the `Position[]` indexed by normalized id.
 * @returns deduplicated array of resolved deputy names; empty when none found.
 */
export function resolveDeputiesFromChain(
  positionId: string,
  positionsById: Map<string, Position>,
): string[] {
  if (!positionId || positionsById.size === 0) return [];

  const seen = new Set<string>();   // position-ids visited (cycle guard)
  const names = new Set<string>();  // dedupe by name
  const out: string[] = [];

  let current = positionsById.get(positionId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const reportsTo = current.reportsTo;
    if (!reportsTo || !reportsTo.positionNumber) break;

    const parentId = normalizePositionKey(reportsTo.positionNumber);
    if (!parentId) break;
    const parent = positionsById.get(parentId);
    if (!parent) break;

    // Match on the parent's title. The deputy's NAME comes from the child's
    // denormalized reportsTo record (build.ts:140-141) — that's the parent's
    // current incumbent, surfaced on the child for free.
    if (isDeputyTitle(parent.jobCodeDescription)) {
      const name = `${reportsTo.managerFirstName} ${reportsTo.managerLastName}`.trim();
      if (name && !names.has(name)) {
        names.add(name);
        out.push(name);
      }
      // Continue walking up — there may be more deputies above this one.
    }

    current = parent;
  }
  return out;
}
