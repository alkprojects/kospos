/**
 * RTPOM_E — Retirement Payout (account 510210) math.
 *
 * Pure functions for the three-function model (see docs/domain/budget-process.md):
 *   1. BUDGET DEV  → historicalActualsMean + allocateByLaborShare
 *   2. YTD vs ACT  → ytdBudgetPace
 *   3. PROJECTION  → projectRpoYearEnd  (Operating Report Summary H38)
 *
 * Canonical spec: docs/domain/special-class.md  §RTPOM_E
 */

// Shared special-class math (historical-mean / COLA-inflate / sentiment /
// straight-line pace) lives in ./shared and is re-exported here so this
// module's public surface is unchanged (s48 CH L7; see the s55 proposal).
export {
  historicalActualsMean,
  colaAdjustToYear,
  applySentiment,
  ytdBudgetPace,
} from './shared';
export type { Sentiment as RetirementSentiment } from './shared';

// ---------------------------------------------------------------------------
// 1. Budget development
// ---------------------------------------------------------------------------

/**
 * Spread the chosen total across departments by each dept's share of regular labor.
 *
 * Budget Master `Special Class` tab K5 = ROUND(I5/$I$24 * $F$15, 0).
 *
 * `deptLaborShares` is a map of dept code → that dept's regular-labor total
 * (raw dollars, not pre-normalized).  Returns dept code → allocated RPO budget,
 * each rounded to whole dollars.
 *
 * If the total labor across depts is 0, returns 0 for every dept.
 */
export function allocateByLaborShare(
  chosenTotal: number,
  deptLaborShares: Record<string, number>,
): Record<string, number> {
  const totalLabor = Object.values(deptLaborShares).reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  if (totalLabor === 0) {
    for (const dept of Object.keys(deptLaborShares)) out[dept] = 0;
    return out;
  }
  for (const [dept, share] of Object.entries(deptLaborShares)) {
    out[dept] = Math.round((share / totalLabor) * chosenTotal);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Year-end projection (the conservative floor)
// ---------------------------------------------------------------------------

/**
 * Projected RPO year-end actuals.
 *
 * Operating Report Summary H38 = IF(Calendar!$K$2=0, E38, MAX(G38, E38)).
 *
 * Translated:
 *   - if no PPs remain → projection = YTD actual (the year is over).
 *   - otherwise        → projection = max(total budget, YTD actual).
 *
 * Conservative by design — RPO is lumpy (individual retirements), so
 * straight-line annualization over-reacts to a quiet first half.  Never
 * projects under budget when PPs remain.
 */
export function projectRpoYearEnd(
  totalBudget: number,
  ytdActual: number,
  ppRemaining: number,
): number {
  if (ppRemaining === 0) return ytdActual;
  return Math.max(totalBudget, ytdActual);
}
