/**
 * Special-class budget math shared by RTPOM (Retirement Payout) and OVERM
 * (Overtime). These four helpers — historical-mean, COLA inflation, sentiment
 * adjustment, and straight-line YTD pace — were byte-identical in both
 * `rtpom.ts` and `overm.ts`. Consolidated here; each module re-exports them so
 * its public surface (and the `overm.*` barrel namespace) is unchanged.
 *
 * The S55 projection-engine proposal (`docs/proposals/s55-projection-engine.md`)
 * named `special-class/shared.ts` as an acceptable home for these; a future
 * `lib/projections/` may re-home them (and `ytdBudgetPace` is where the
 * proposal's B1 weighted/COLA-aware decision would land).
 */

/**
 * The user's expectation about next-year spend relative to history, layered on
 * a historical baseline as `baseline * (1 + sign(sentiment) * pct/100)`:
 *   'same' → sign 0 (pct ignored) · 'more' → +1 · 'less' → −1
 */
export type Sentiment = 'same' | 'more' | 'less';

/**
 * Mean of historical actuals (Budget Master `Special Class` AVERAGE pattern).
 * Whole-dollar rounded; window length is flexible; empty input → 0.
 */
export function historicalActualsMean(actuals: number[]): number {
  if (actuals.length === 0) return 0;
  const sum = actuals.reduce((a, b) => a + b, 0);
  return Math.round(sum / actuals.length);
}

/**
 * Inflate a historical dollar amount from `fromYear` to `toYear` using a flat
 * per-year COLA (decimal, e.g. 0.025). `toYear <= fromYear` → unchanged.
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
 * Adjust a baseline by a sentiment + magnitude. Whole-dollar rounded. Negative
 * pct is clamped to 0 (use 'less' instead of 'more by −X'); a 'less' that would
 * go below 0 is clamped to 0.
 */
export function applySentiment(
  baseline: number,
  sentiment: Sentiment,
  adjustmentPct: number,
): number {
  const pct = Math.max(0, adjustmentPct);
  const sign = sentiment === 'more' ? 1 : sentiment === 'less' ? -1 : 0;
  return Math.max(0, Math.round(baseline * (1 + (sign * pct) / 100)));
}

/**
 * Straight-line YTD budget pace (Operating Report Summary `D37 / D38`:
 * `totalBudget * ppElapsed / ppTotal`). Capped at `totalBudget` when
 * `ppElapsed >= ppTotal` (defensive against a stale `Calendar!I2`);
 * `ppTotal === 0` → 0 (no calendar loaded).
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
