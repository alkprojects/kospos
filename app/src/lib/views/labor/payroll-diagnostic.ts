/**
 * Pure helpers for the Payroll "scoped to a position but 0 rows" empty-state
 * diagnostic. Extracted from `LaborView.tsx` so the fuzzy-match + coverage-stat
 * logic is testable on its own.
 *
 * The diagnostic exists to tell a user *why* a scoped position has 0 rows in
 * the snapshot. Three common cases:
 *
 *   (a) positionIdentifier mismatch — whitespace, internal punctuation, or a
 *       digit-format divergence between OBI and HCM. Surfaces as a `nearby`
 *       chip suggestion when a same-prefix candidate exists in the snapshot.
 *   (b) The position is in P&P but OBI just doesn't have rows for it in this
 *       snapshot — either it didn't get paid in the covered FY, or the OBI
 *       export is narrower than the P&P export. Surfaces as a "coverage gap"
 *       affirmation: "this position is among the [N] P&P positions not in
 *       this OBI snapshot."
 *   (c) The position isn't in P&P either. Surfaces as an "orphan" warning so
 *       the user can confirm the position number was typed correctly.
 *
 * Reported by Alex S28 for position 1106950 — the same-4-digit-prefix net
 * only caught 1 candidate (1106348). The widened progressive fallback below
 * (4 → 3 → 2 digits) catches more renumber / TX-history candidates.
 */

/**
 * Find positionIdentifiers in `distinctPositions` that share a common prefix
 * with `scopedPositionId`. Progressive fallback: try the full 4-digit dept
 * prefix first; if it yields fewer than `minMatches` candidates, fall back
 * to 3 digits, then 2 digits. Returns the actual prefix used so the caller
 * can render it in the UI label.
 *
 * Excludes the scoped position itself from results. Caps the result list at
 * `maxResults` (default 12). The candidates are returned in the order they
 * appear in `distinctPositions` — caller can sort if needed.
 */
export function findNearbyPositions(
  scopedPositionId: string,
  distinctPositions: readonly string[],
  options: { minMatches?: number; maxResults?: number } = {},
): { matches: string[]; prefix: string } {
  // Default minMatches = 2: when the strict 4-digit prefix has 2+ candidates
  // we surface them at full precision. Only fall back to 3-digit when the
  // strict prefix has just 1 candidate (the Alex S28 case for 1106950: the
  // OBI snapshot held only 1106348 at the 1106 prefix — widening to 110
  // surfaced 1109xxx / 1107xxx so the user has a more useful "did you mean"
  // list). Tests can override minMatches if they want stricter behavior.
  const minMatches = options.minMatches ?? 2;
  const maxResults = options.maxResults ?? 12;
  if (scopedPositionId.length < 2) return { matches: [], prefix: '' };

  // Progressive fallback. Stops at the first prefix length that yields at
  // least `minMatches` candidates, OR drops to length 2 (the floor — any
  // shorter and the chips would be noise).
  const lengths = [4, 3, 2];
  for (const len of lengths) {
    if (scopedPositionId.length < len) continue;
    const prefix = scopedPositionId.slice(0, len);
    const matches: string[] = [];
    for (const p of distinctPositions) {
      if (p === scopedPositionId) continue;
      if (p.startsWith(prefix)) matches.push(p);
      if (matches.length >= maxResults) break;
    }
    // Take the first prefix length that meets the minimum, OR keep falling
    // back if there's room (we want results, not just the strictest prefix).
    if (matches.length >= minMatches || len === 2) {
      return { matches, prefix };
    }
  }
  return { matches: [], prefix: '' };
}

/**
 * Coverage-gap stat: how does the loaded OBI snapshot compare to the loaded
 * P&P snapshot? This is the key signal Alex needs to tell "expected empty"
 * (P&P knows the position, OBI's snapshot is narrower) from "unexpected
 * empty" (P&P has the position, OBI should too).
 *
 * Returns:
 *   - `totalPAndP`        — count of distinct positions in the P&P snapshot
 *   - `inBoth`            — positions in both P&P and OBI
 *   - `pAndPOnly`         — positions in P&P but not in OBI
 *   - `obiOnly`           — positions in OBI but not in P&P (data-quality
 *                           red flag — payroll without a position record)
 *   - `scopedStatus`      — where the scoped position falls: `'in-both'`,
 *                           `'p-and-p-only'`, `'obi-only'`, or `'orphan'`
 *                           (not in either — unusual; user typo or stale URL).
 */
export function coverageStats(
  scopedPositionId: string,
  pAndPPositionIds: readonly string[],
  obiPositionIds: readonly string[],
): {
  totalPAndP: number;
  totalObi: number;
  inBoth: number;
  pAndPOnly: number;
  obiOnly: number;
  scopedStatus: 'in-both' | 'p-and-p-only' | 'obi-only' | 'orphan';
} {
  const pAndPSet = new Set(pAndPPositionIds);
  const obiSet = new Set(obiPositionIds);
  let inBoth = 0;
  let pAndPOnly = 0;
  for (const p of pAndPSet) {
    if (obiSet.has(p)) inBoth += 1;
    else pAndPOnly += 1;
  }
  let obiOnly = 0;
  for (const o of obiSet) {
    if (!pAndPSet.has(o)) obiOnly += 1;
  }

  const inPAndP = pAndPSet.has(scopedPositionId);
  const inObi = obiSet.has(scopedPositionId);
  let scopedStatus: 'in-both' | 'p-and-p-only' | 'obi-only' | 'orphan';
  if (inPAndP && inObi) scopedStatus = 'in-both';
  else if (inPAndP) scopedStatus = 'p-and-p-only';
  else if (inObi) scopedStatus = 'obi-only';
  else scopedStatus = 'orphan';

  return {
    totalPAndP: pAndPSet.size,
    totalObi: obiSet.size,
    inBoth,
    pAndPOnly,
    obiOnly,
    scopedStatus,
  };
}
