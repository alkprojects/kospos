/**
 * OVERM_E — Overtime (Misc) math.
 *
 * Pure functions for the three-function model (see docs/domain/budget-process.md):
 *   1. BUDGET DEV  → grossUpFringe + suggestOvermBudget (cushion default)
 *   2. YTD vs ACT  → ytdBudgetPace                       (Operating Report Summary D37)
 *   3. PROJECTION  → projectOvermYearEnd                 (Operating Report Summary H37
 *                                                         = Overtime!BS15 = SUM(BS6:BS14))
 *
 * Canonical spec: docs/domain/special-class.md  §OVERM_E (post Session 11 doc fix).
 *
 * Notes that shape this file:
 * - The Overtime tab pivot holds **OT salary actuals only**. There is no OT-specific
 *   benefit account; OT benefits live in pooled benefit accounts. To project the full
 *   salary+benefits cost, we annualize YTD salary and gross up via the BFM-budgeted
 *   salary-to-total ratio (`BN8 / BN6`).
 * - TODO: replace the budget-ratio gross-up with TRC-based actual benefit derivation
 *   from Time & Labor when a T&L importer exists. T&L data is not always clean, so the
 *   budget-ratio approach is the conservative choice for now.
 * - The workbook filters strictly to Fund 10190 (DBI operating fund). KosPos does NOT
 *   reproduce that filter — sum across all funds — see special-class.md § OVERM_E.
 */

// ---------------------------------------------------------------------------
// 1. Budget development
// ---------------------------------------------------------------------------

/**
 * Mandatory-fringe gross-up rate applied to OT salary.
 *
 * Budget Master `Special Class!AU5 = AT5*1.0765`. The 7.65% is OASDI (Social Security)
 * 6.20% + Medicare 1.45% — the only benefits that apply universally to overtime pay.
 * Both components are mechanical and unchanged in FY26/FY27/FY28; only the OASDI wage
 * cap shifts annually (\$189,337 → \$199,265). Treat as a derived constant, not a
 * `15.15.002` lookup.
 */
export const OT_MANDATORY_FRINGE_RATE = 0.0765;
export const OT_FRINGE_MULTIPLIER = 1 + OT_MANDATORY_FRINGE_RATE; // 1.0765

/**
 * Gross up prior-year OT salary actuals by the mandatory 7.65% OASDI + Medicare fringe.
 *
 * Budget Master `Special Class!AU5 = AT5 * 1.0765`. Used as the "FY-prior with MFB"
 * reference number shown to the user when picking next-FY OT budget.
 *
 * Returns whole-dollar rounded.
 */
export function grossUpFringe(priorYearSalaryActual: number): number {
  return Math.round(priorYearSalaryActual * OT_FRINGE_MULTIPLIER);
}

/**
 * Round an amount up to the nearest \$1,000.
 *
 * Used by `suggestOvermBudget` to produce a "nice" cushion default. Negative inputs
 * return 0 (you don't budget a negative number).
 */
export function roundUpToThousand(amount: number): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 1000) * 1000;
}

/**
 * Suggest a next-FY OT budget per row.
 *
 * Default = `roundUpToThousand(max(grossed-up prior actual, current-year projection))`.
 *
 * Per Alex (Session 11): the `Special Class!AX` column in the workbook is hand-entered
 * with no formula trail — every row is judgment. KosPos's contribution is to seed the
 * input with a sensible default that gives the user a visible cushion above whatever
 * the current year is tracking toward. The user can override per row.
 *
 * Edge cases:
 *   - both inputs ≤ 0 → returns 0
 *   - either input missing (NaN / undefined arg) → uses the other
 *
 * Returns whole-dollar rounded (a multiple of 1,000).
 */
export function suggestOvermBudget(
  grossedUpPriorActual: number,
  currentYearProjection: number,
): number {
  const a = Number.isFinite(grossedUpPriorActual) ? grossedUpPriorActual : 0;
  const b = Number.isFinite(currentYearProjection) ? currentYearProjection : 0;
  return roundUpToThousand(Math.max(a, b));
}

/**
 * Mean of historical OT actuals (salary, pre-fringe).
 *
 * Budget Master pattern equivalent to RPO's `F14 = AVERAGE(F5:F12)`. OVERM doesn't ship
 * a literal multi-year mean cell in the extracted ranges (the workbook only carries
 * FY-prior), but Alex's Session 9 RPO walkthrough established the "3-year and 8-year
 * trailing mean" UI pattern as desirable. Included here so the OVERM view can show
 * the same multi-year context once historical data flows in.
 *
 * Empty input → 0. Window length is flexible (caller controls).
 */
export function historicalActualsMean(actuals: number[]): number {
  if (actuals.length === 0) return 0;
  const sum = actuals.reduce((a, b) => a + b, 0);
  return Math.round(sum / actuals.length);
}

/**
 * Inflate a historical dollar amount from `fromYear` to `toYear` dollars using a
 * flat per-year COLA percentage.
 *
 * Currently the project uses a flat 2.5%/yr placeholder for the COLA. Per Alex
 * (Session 11), per-FY COLAs will be sourced from the `15.15.014` report in a future
 * session; the per-FY table in `docs/domain/budget-process.md` § "SF historical COLAs"
 * is reference-only until then.
 *
 * `colaPctPerYear` is the per-year COLA as a decimal (e.g., 0.025 for 2.5%). When
 * `toYear <= fromYear`, returns the input unchanged.
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
 * User's expectation about next-year OT relative to history.
 *
 *   chosen = baseline * (1 + sign(sentiment) * pct/100)
 *
 *   'same' → sign  0 → chosen = baseline   (pct ignored)
 *   'more' → sign +1 → chosen > baseline
 *   'less' → sign -1 → chosen < baseline
 *
 * Same shape as RPO's `RetirementSentiment` so the FY-card UI pattern can be reused.
 */
export type OvertimeSentiment = 'same' | 'more' | 'less';

/**
 * Adjust a baseline by a sentiment + magnitude. Returns whole-dollar rounded.
 *
 * Negative pct is clamped to 0 (use 'less' instead of 'more by -X'). A 'less' adjustment
 * that would push the result below 0 is clamped to 0.
 */
export function applySentiment(
  baseline: number,
  sentiment: OvertimeSentiment,
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
 * Operating Report Summary `D37 = G37 / Calendar!J2 * Calendar!I2`. Mathematically
 * identical to RPO's `D38`; the formula is generic to any straight-line-paced row.
 *
 * Capped at totalBudget when ppElapsed >= ppTotal (defensive — a stale Calendar!I2
 * can produce >100% pacing). `ppTotal === 0` → 0 (no calendar loaded yet; pacing
 * is undefined).
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
// 3. Year-end projection
// ---------------------------------------------------------------------------

/**
 * Salary-to-total cost gross-up factor implied by the FY budget.
 *
 * Equals `budgetedTotal / budgetedSalary` — for FY26 DBI this is
 * `380,000 / 349,749 ≈ 1.0865`, sourced from the Overtime tab's `$BN$8` (total) and
 * `$BN$6` (salary) literals. Both constants come from BFM's annual budget snapshot
 * and refresh once per fiscal year (administered by the super admin).
 *
 * Edge case: `budgetedSalary <= 0` → returns 1 (no gross-up; behaves as if salary
 * IS the total cost). Avoids divide-by-zero in projections when budget is missing.
 */
export function salaryToTotalGrossUp(
  budgetedSalary: number,
  budgetedTotal: number,
): number {
  if (budgetedSalary <= 0) return 1;
  return budgetedTotal / budgetedSalary;
}

/**
 * Projected OVERM year-end actuals (salary + benefits).
 *
 * Per-dept formula on the workbook's Overtime tab:
 *
 *   BS6 = BR6 * $BN$8 / Calendar!$I$2 * Calendar!$J$2 / $BN$6
 *
 * Rewritten:
 *
 *   projected_total_cost
 *     = YTD_OT_salary_actual          (BR6, payroll pivot, salary only)
 *     × (ppTotal / ppElapsed)         (Calendar!J2 / I2 — annualize)
 *     × (budgetedTotal / budgetedSalary)  ($BN$8 / $BN$6 — salary → total gross-up)
 *
 * Per-dept rows roll up at `BS15 = SUM(BS6:BS14)`, which Operating Report Summary
 * references at `H37 = Overtime!BS15`.
 *
 * Edge cases:
 *   - `ppElapsed <= 0`          → 0 (no actuals to annualize; year just started or
 *                                    calendar not loaded)
 *   - `ppTotal <= 0`            → 0 (defensive — same as ytdBudgetPace)
 *   - `ppElapsed >= ppTotal`    → `ytdSalaryActual * grossUp` (year is over, don't
 *                                    annualize further)
 *   - `budgetedSalary <= 0`     → grossUp = 1, projection = annualized salary only
 *                                    (preserves behavior before BFM data lands)
 *
 * Returns floating-point dollars; round at display time.
 */
export function projectOvermYearEnd(
  ytdSalaryActual: number,
  ppElapsed: number,
  ppTotal: number,
  budgetedSalary: number,
  budgetedTotal: number,
): number {
  if (ppElapsed <= 0 || ppTotal <= 0) return 0;
  const annualizationFactor = ppElapsed >= ppTotal ? 1 : ppTotal / ppElapsed;
  const annualizedSalary = ytdSalaryActual * annualizationFactor;
  const grossUp = salaryToTotalGrossUp(budgetedSalary, budgetedTotal);
  return annualizedSalary * grossUp;
}
