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

// ---------------------------------------------------------------------------
// 1. Budget development
// ---------------------------------------------------------------------------

/**
 * Mean of historical actuals for account 510210.
 *
 * Budget Master `Special Class` tab F14 = AVERAGE(F5:F12) — 8 years of priors.
 * The 8-year window isn't a hard rule; the function accepts any length.
 *
 * Returns whole-dollar rounded mean. Empty input → 0.
 */
export function historicalActualsMean(actuals: number[]): number {
  if (actuals.length === 0) return 0;
  const sum = actuals.reduce((a, b) => a + b, 0);
  return Math.round(sum / actuals.length);
}

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
// 2. YTD budget pace
// ---------------------------------------------------------------------------

/**
 * Straight-line YTD budget pace.
 *
 * Operating Report Summary D38 = G38 * Calendar!I2 / Calendar!J2.
 *
 * Capped at totalBudget when ppElapsed > ppTotal (defensive — should not happen
 * in a sane calendar, but a stale Calendar!I2 can produce >100% pacing).
 *
 * ppTotal === 0 → 0 (no calendar loaded yet; pacing is undefined).
 */
export function ytdBudgetPace(
  totalBudget: number,
  ppElapsed: number,
  ppTotal: number,
): number {
  if (ppTotal === 0) return 0;
  if (ppElapsed >= ppTotal) return totalBudget;
  return (totalBudget * ppElapsed) / ppTotal;
}

// ---------------------------------------------------------------------------
// 3. Year-end projection (the conservative floor)
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
