import { describe, it, expect } from 'vitest';
import {
  historicalActualsMean,
  allocateByLaborShare,
  colaAdjustToYear,
  ytdBudgetPace,
  projectRpoYearEnd,
} from './rtpom';

// ---------------------------------------------------------------------------
// Reference data — Alex's confirmed FY27 RPO walkthrough
// from DBI FY27-28 Budget Master `Special Class` tab F5:F12, F14, F15.
// See docs/domain/special-class.md §RTPOM_E.
// ---------------------------------------------------------------------------

const DBI_FY27_HISTORICAL = [
  142944, // 2018
  93857,  // 2019
  341022, // 2020
  146645, // 2021
  310700, // 2022
  88219,  // 2023
  181295, // 2024
  299051, // 2025
];

describe('historicalActualsMean', () => {
  it('matches Alex Budget Master F14 for DBI FY27 (200467)', () => {
    expect(historicalActualsMean(DBI_FY27_HISTORICAL)).toBe(200467);
  });

  it('returns 0 for an empty actuals list', () => {
    expect(historicalActualsMean([])).toBe(0);
  });

  it('rounds to whole dollars (banker-agnostic, half rounds away from 0)', () => {
    // 100 + 101 = 201 / 2 = 100.5 → 101 under Math.round
    expect(historicalActualsMean([100, 101])).toBe(101);
  });

  it('handles a single year', () => {
    expect(historicalActualsMean([250000])).toBe(250000);
  });
});

describe('allocateByLaborShare', () => {
  it('rounds each dept allocation to whole dollars', () => {
    const result = allocateByLaborShare(300000, {
      A: 1_000_000,
      B: 2_000_000,
      C: 1_000_000,
    });
    expect(result.A).toBe(75000);
    expect(result.B).toBe(150000);
    expect(result.C).toBe(75000);
  });

  it('handles a single-dept allocation', () => {
    expect(allocateByLaborShare(300000, { DBI: 5_000_000 })).toEqual({ DBI: 300000 });
  });

  it('returns 0 for every dept when total labor is 0', () => {
    expect(allocateByLaborShare(300000, { A: 0, B: 0 })).toEqual({ A: 0, B: 0 });
  });

  it('returns an empty object for an empty input', () => {
    expect(allocateByLaborShare(300000, {})).toEqual({});
  });

  it('sum of allocations is within $1 of the chosen total (rounding drift)', () => {
    const shares = { A: 333, B: 333, C: 334 };
    const result = allocateByLaborShare(100000, shares);
    const sum = result.A + result.B + result.C;
    expect(Math.abs(sum - 100000)).toBeLessThanOrEqual(1);
  });
});

describe('colaAdjustToYear', () => {
  it('inflates one year at 2.5%', () => {
    expect(colaAdjustToYear(100_000, 2026, 2027, 0.025)).toBeCloseTo(102_500, 2);
  });

  it('compounds across nine years (DBI 2018 → FY27 at 2.5%)', () => {
    // 142944 * 1.025^9 = 178517.47
    expect(colaAdjustToYear(142_944, 2018, 2027, 0.025)).toBeCloseTo(178_517.47, 1);
  });

  it('returns input unchanged when toYear equals fromYear', () => {
    expect(colaAdjustToYear(299_051, 2025, 2025, 0.025)).toBe(299_051);
  });

  it('returns input unchanged when toYear is before fromYear (no deflation)', () => {
    expect(colaAdjustToYear(299_051, 2025, 2024, 0.025)).toBe(299_051);
  });

  it('returns input unchanged at 0% COLA', () => {
    expect(colaAdjustToYear(299_051, 2018, 2027, 0)).toBe(299_051);
  });

  it('handles a real-world DBI historical row (FY25 2025 → FY27 at 2.5%)', () => {
    // 299051 * 1.025^2 = 314190.46
    expect(colaAdjustToYear(299_051, 2025, 2027, 0.025)).toBeCloseTo(314_190.46, 1);
  });
});

describe('ytdBudgetPace', () => {
  it('paces straight-line: 22.4 of 26.1 PPs * $300k ≈ $257,471', () => {
    // Calendar!I2 = 22.4, Calendar!J2 = 26.1 (realistic mid-year snapshot)
    const pace = ytdBudgetPace(300000, 22.4, 26.1);
    expect(pace).toBeCloseTo(257471.26, 1);
  });

  it('returns 0 when ppTotal is 0 (calendar not loaded)', () => {
    expect(ytdBudgetPace(300000, 5, 0)).toBe(0);
  });

  it('caps at total budget when ppElapsed equals ppTotal', () => {
    expect(ytdBudgetPace(300000, 26.1, 26.1)).toBe(300000);
  });

  it('caps at total budget when ppElapsed exceeds ppTotal (stale calendar)', () => {
    expect(ytdBudgetPace(300000, 27, 26.1)).toBe(300000);
  });

  it('returns 0 at the start of the year (ppElapsed = 0)', () => {
    expect(ytdBudgetPace(300000, 0, 26.1)).toBe(0);
  });
});

describe('projectRpoYearEnd', () => {
  it('returns max(budget, YTD) when PPs remain and YTD < budget', () => {
    // Conservative floor: never project under budget while year is open.
    expect(projectRpoYearEnd(300000, 120000, 5)).toBe(300000);
  });

  it('returns YTD actual when YTD has already exceeded budget', () => {
    expect(projectRpoYearEnd(300000, 425000, 5)).toBe(425000);
  });

  it('returns YTD actual when ppRemaining is 0 (year is over), even if YTD < budget', () => {
    // The MAX rule does not apply once Calendar!K2 = 0.
    expect(projectRpoYearEnd(300000, 180000, 0)).toBe(180000);
  });

  it('returns YTD actual when ppRemaining is 0 and YTD > budget', () => {
    expect(projectRpoYearEnd(300000, 425000, 0)).toBe(425000);
  });

  it('returns budget exactly when YTD equals budget', () => {
    expect(projectRpoYearEnd(300000, 300000, 5)).toBe(300000);
  });
});
