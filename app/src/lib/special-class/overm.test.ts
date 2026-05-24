import { describe, it, expect } from 'vitest';
import {
  OT_MANDATORY_FRINGE_RATE,
  OT_FRINGE_MULTIPLIER,
  grossUpFringe,
  roundUpToThousand,
  suggestOvermBudget,
  historicalActualsMean,
  colaAdjustToYear,
  applySentiment,
  ytdBudgetPace,
  salaryToTotalGrossUp,
  projectOvermYearEnd,
} from './overm';

// ---------------------------------------------------------------------------
// Reference data — Overtime!BN6, BN8, BR6, BS6 from Labor Report 5.21.26
// and Special Class!AT5, AU5, AX5 from DBI FY27-28 Budget Master.
// See docs/domain/special-class.md §OVERM_E (post Session 11 doc fix).
// ---------------------------------------------------------------------------

const DBI_FY26 = {
  budgetedSalary: 349_749,      // BN6 — Overtime!$BN$6 (BFM-budgeted OT salary)
  budgetedTotal: 380_000,       // BN8 — Overtime!$BN$8 (BFM-budgeted OT total cost)
  ytdSalaryActual: 438_786.15,  // E37 — Operating Report Summary YTD actual
  ppElapsed: 22.4,              // Calendar!I2
  ppTotal: 26.1,                // Calendar!J2
};

const DBI_ROW5_BUDGET_MASTER = {
  priorYearActual: 1_592.62,    // AT5 — FY-prior salary actual
  grossedUpExpected: 1_714.46,  // AU5 — = AT5 * 1.0765 (workbook computed)
  fy27BudgetEntered: 2_000,     // AX5 — hand-entered cushion (= roundUpToThousand(1714.46))
};

describe('OT_MANDATORY_FRINGE_RATE', () => {
  it('is 7.65% (OASDI 6.20% + Medicare 1.45%)', () => {
    expect(OT_MANDATORY_FRINGE_RATE).toBe(0.0765);
  });

  it('OT_FRINGE_MULTIPLIER is 1 + the rate', () => {
    expect(OT_FRINGE_MULTIPLIER).toBeCloseTo(1.0765, 10);
  });
});

describe('grossUpFringe', () => {
  it('matches Special Class!AU5 for DBI ADM Records Management row 5 (1714)', () => {
    // AU5 = AT5 * 1.0765 = 1592.62 * 1.0765 = 1714.46
    expect(grossUpFringe(DBI_ROW5_BUDGET_MASTER.priorYearActual)).toBe(
      Math.round(DBI_ROW5_BUDGET_MASTER.grossedUpExpected),
    );
  });

  it('rounds to whole dollars', () => {
    // 1234.56 * 1.0765 = 1329.0078 → 1329
    expect(grossUpFringe(1234.56)).toBe(1329);
  });

  it('returns 0 for 0 prior actual', () => {
    expect(grossUpFringe(0)).toBe(0);
  });

  it('handles large amounts', () => {
    // 500_000 * 1.0765 = 538_250
    expect(grossUpFringe(500_000)).toBe(538_250);
  });
});

describe('roundUpToThousand', () => {
  it('rounds 1,714 up to 2,000 (matches AX5 cushion choice)', () => {
    expect(roundUpToThousand(1_714)).toBe(2_000);
  });

  it('returns the input unchanged when already a multiple of 1000', () => {
    expect(roundUpToThousand(2_000)).toBe(2_000);
    expect(roundUpToThousand(50_000)).toBe(50_000);
  });

  it('rounds 1 up to 1,000', () => {
    expect(roundUpToThousand(1)).toBe(1_000);
  });

  it('returns 0 for 0', () => {
    expect(roundUpToThousand(0)).toBe(0);
  });

  it('returns 0 for negative input', () => {
    expect(roundUpToThousand(-500)).toBe(0);
  });

  it('rounds 555,485.23 up to 556,000 (matches BS15 projection ceiling)', () => {
    expect(roundUpToThousand(555_485.23)).toBe(556_000);
  });
});

describe('suggestOvermBudget', () => {
  it('picks the projection over the grossed-up prior when projection is higher', () => {
    // Grossed-up prior: 1714, projection: 555,485 → max=555,485 → roundup=556,000
    expect(suggestOvermBudget(1_714, 555_485.23)).toBe(556_000);
  });

  it('picks the grossed-up prior when projection is lower (or zero YTD)', () => {
    // Mirrors AX5 = 2000 default for the no-FY26-activity row
    expect(suggestOvermBudget(1_714.46, 0)).toBe(2_000);
  });

  it('rounds up to nearest $1k', () => {
    // max(7_500, 6_999) = 7_500 → 8_000
    expect(suggestOvermBudget(7_500, 6_999)).toBe(8_000);
  });

  it('returns 0 when both inputs are 0', () => {
    expect(suggestOvermBudget(0, 0)).toBe(0);
  });

  it('returns 0 when both inputs are negative', () => {
    expect(suggestOvermBudget(-100, -200)).toBe(0);
  });

  it('handles a missing (NaN) grossed-up prior gracefully', () => {
    expect(suggestOvermBudget(NaN, 4_321)).toBe(5_000);
  });

  it('handles a missing (NaN) projection gracefully', () => {
    expect(suggestOvermBudget(4_321, NaN)).toBe(5_000);
  });
});

describe('historicalActualsMean', () => {
  it('returns 0 for an empty list', () => {
    expect(historicalActualsMean([])).toBe(0);
  });

  it('matches the rtpom pattern (banker-agnostic rounding)', () => {
    expect(historicalActualsMean([100, 101])).toBe(101);
  });

  it('rounds to whole dollars', () => {
    expect(historicalActualsMean([1_000, 1_100, 1_201])).toBe(1_100);
  });

  it('handles a single year', () => {
    expect(historicalActualsMean([438_786])).toBe(438_786);
  });
});

describe('colaAdjustToYear', () => {
  it('inflates one year at 2.5%', () => {
    expect(colaAdjustToYear(100_000, 2026, 2027, 0.025)).toBeCloseTo(102_500, 2);
  });

  it('returns input unchanged when toYear equals fromYear', () => {
    expect(colaAdjustToYear(380_000, 2026, 2026, 0.025)).toBe(380_000);
  });

  it('returns input unchanged when toYear is before fromYear', () => {
    expect(colaAdjustToYear(380_000, 2026, 2025, 0.025)).toBe(380_000);
  });

  it('returns input unchanged at 0% COLA', () => {
    expect(colaAdjustToYear(380_000, 2018, 2027, 0)).toBe(380_000);
  });
});

describe('applySentiment', () => {
  it("'same' returns baseline regardless of pct", () => {
    expect(applySentiment(380_000, 'same', 0)).toBe(380_000);
    expect(applySentiment(380_000, 'same', 50)).toBe(380_000);
  });

  it("'more' inflates by pct", () => {
    expect(applySentiment(380_000, 'more', 10)).toBe(418_000);
  });

  it("'less' deflates by pct", () => {
    expect(applySentiment(380_000, 'less', 20)).toBe(304_000);
  });

  it("clamps 'less' adjustment when it would push below 0", () => {
    expect(applySentiment(100_000, 'less', 200)).toBe(0);
  });

  it('clamps negative pct input to 0', () => {
    expect(applySentiment(380_000, 'more', -25)).toBe(380_000);
    expect(applySentiment(380_000, 'less', -25)).toBe(380_000);
  });

  it('rounds to whole dollars', () => {
    expect(applySentiment(100, 'more', 33.333)).toBe(133);
  });
});

describe('ytdBudgetPace', () => {
  it('paces straight-line: 22.4 of 26.1 PPs * $380k ≈ $326,130 (matches D37)', () => {
    // D37 workbook value = 326,130.27 — confirms formula matches Operating Report Summary
    expect(ytdBudgetPace(380_000, DBI_FY26.ppElapsed, DBI_FY26.ppTotal)).toBeCloseTo(
      326_130.27,
      1,
    );
  });

  it('returns 0 when ppTotal is 0', () => {
    expect(ytdBudgetPace(380_000, 5, 0)).toBe(0);
  });

  it('caps at total budget when ppElapsed equals ppTotal', () => {
    expect(ytdBudgetPace(380_000, 26.1, 26.1)).toBe(380_000);
  });

  it('caps at total budget when ppElapsed exceeds ppTotal (stale calendar)', () => {
    expect(ytdBudgetPace(380_000, 27, 26.1)).toBe(380_000);
  });

  it('returns 0 at start of year', () => {
    expect(ytdBudgetPace(380_000, 0, 26.1)).toBe(0);
  });
});

describe('salaryToTotalGrossUp', () => {
  it('matches DBI FY26 BN8/BN6 ratio (380000/349749 ≈ 1.0865)', () => {
    expect(salaryToTotalGrossUp(DBI_FY26.budgetedSalary, DBI_FY26.budgetedTotal)).toBeCloseTo(
      1.0865,
      4,
    );
  });

  it('returns 1 when budgetedSalary is 0 (no gross-up; defensive)', () => {
    expect(salaryToTotalGrossUp(0, 380_000)).toBe(1);
  });

  it('returns 1 when budgetedSalary is negative (defensive)', () => {
    expect(salaryToTotalGrossUp(-1_000, 380_000)).toBe(1);
  });

  it('returns 1.0 exactly when budgetedTotal equals budgetedSalary', () => {
    expect(salaryToTotalGrossUp(380_000, 380_000)).toBe(1);
  });

  it('returns < 1 when total < salary (degenerate; defensive does not clamp)', () => {
    // Pure ratio — caller is responsible for sanity-checking budget inputs.
    expect(salaryToTotalGrossUp(380_000, 350_000)).toBeCloseTo(0.9211, 4);
  });
});

describe('projectOvermYearEnd', () => {
  it('matches DBI FY26 workbook scaled to the salary-only YTD ($438,786 → $555k-ish)', () => {
    // Workbook BS15 = 555,485.23 is a sum of per-dept rows BS6:BS14 — each row uses a
    // per-dept YTD slice from BR. The total-dept BR equivalent would be the Operating
    // Report E37 = 438,786.15. Sanity check: projecting E37 with the citywide gross-up
    // and the same annualization should land in the same neighborhood as BS15.
    //
    // 438,786.15 * (26.1 / 22.4) * (380,000 / 349,749) ≈ 555,485 (matches H37)
    const projected = projectOvermYearEnd(
      DBI_FY26.ytdSalaryActual,
      DBI_FY26.ppElapsed,
      DBI_FY26.ppTotal,
      DBI_FY26.budgetedSalary,
      DBI_FY26.budgetedTotal,
    );
    expect(projected).toBeCloseTo(555_485.23, 0);
  });

  it('reduces to plain annualization when budgetedSalary equals budgetedTotal (grossUp = 1)', () => {
    // 200,000 * (26.1 / 22.4) = 233,035.71
    const projected = projectOvermYearEnd(200_000, 22.4, 26.1, 380_000, 380_000);
    expect(projected).toBeCloseTo(233_035.71, 1);
  });

  it('returns 0 when ppElapsed is 0 (no YTD to annualize)', () => {
    expect(projectOvermYearEnd(100_000, 0, 26.1, 349_749, 380_000)).toBe(0);
  });

  it('returns 0 when ppTotal is 0 (calendar not loaded)', () => {
    expect(projectOvermYearEnd(100_000, 5, 0, 349_749, 380_000)).toBe(0);
  });

  it('does not over-annualize when ppElapsed >= ppTotal (year over)', () => {
    // grossUp only, no scaling beyond what actually happened
    const projected = projectOvermYearEnd(400_000, 26.1, 26.1, 349_749, 380_000);
    // 400,000 * (380,000 / 349,749) = 434,597.38
    expect(projected).toBeCloseTo(434_597.38, 1);
  });

  it('uses grossUp = 1 when budgetedSalary <= 0 (defensive; before BFM data lands)', () => {
    // Annualize only: 200,000 * (26.1 / 22.4) = 233,035.71
    const projected = projectOvermYearEnd(200_000, 22.4, 26.1, 0, 380_000);
    expect(projected).toBeCloseTo(233_035.71, 1);
  });

  it('handles negative ppElapsed defensively (returns 0)', () => {
    expect(projectOvermYearEnd(100_000, -1, 26.1, 349_749, 380_000)).toBe(0);
  });
});
