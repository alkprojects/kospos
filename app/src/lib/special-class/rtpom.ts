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

/**
 * Inflate a historical dollar amount from `fromYear` to `toYear` dollars
 * using a flat per-year COLA percentage.
 *
 * Used to put historical RPO actuals on a common-year footing before
 * averaging — a 2018 retirement payout is denominated in 2018 dollars; to
 * compare against an FY27 budget you'd want to know "what would the same
 * pattern cost in FY27 dollars."
 *
 * Caveat (relevant to RPO specifically): RPO is driven by individual
 * retirements, so year-over-year volatility (factor of ~4 across DBI's
 * 8-yr window) dominates the inflation adjustment (~25% over 9 years at
 * 2.5%).  The COLA-adjusted mean is useful as a sanity check, not as a
 * precision-critical input.
 *
 * `colaPctPerYear` is the per-year COLA expressed as a decimal (e.g., 0.025
 * for 2.5%).  When `toYear <= fromYear`, returns the input unchanged.
 */
export function colaAdjustToYear(
  amount: number,
  fromYear: number,
  toYear: number,
  colaPctPerYear: number,
): number {
  if (toYear <= fromYear) return amount;
  const years = toYear - fromYear;
  return amount * Math.pow(1 + colaPctPerYear, years);
}

/**
 * The user's expectation about next-year retirements relative to history.
 *
 * The sentiment + a magnitude % is layered on top of a historical baseline
 * (typically the COLA-adjusted mean) to produce the chosen amount:
 *
 *   chosen = baseline * (1 + sign(sentiment) * pct/100)
 *
 *   'same' → sign 0  → chosen = baseline   (pct ignored)
 *   'more' → sign +1 → chosen > baseline
 *   'less' → sign -1 → chosen < baseline
 */
export type RetirementSentiment = 'same' | 'more' | 'less';

/**
 * Adjust a historical baseline by a sentiment + magnitude.
 *
 * Returns whole-dollar rounded.  Negative pct values are clamped to 0
 * (you don't pick "more by negative %" — use 'less' instead).
 *
 * A 'less' adjustment that would push chosen below 0 is clamped to 0.
 */
export function applySentiment(
  baseline: number,
  sentiment: RetirementSentiment,
  adjustmentPct: number,
): number {
  const pct = Math.max(0, adjustmentPct);
  const sign = sentiment === 'more' ? 1 : sentiment === 'less' ? -1 : 0;
  return Math.max(0, Math.round(baseline * (1 + (sign * pct) / 100)));
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
