import { describe, it, expect } from 'vitest';
import { calcEmployeeCost, getBiweeklyRate, topClassBiweekly, CostCalcError } from './cost';
import stepsFileRaw from '../data/dhr-steps.json';
import rangesFileRaw from '../data/dhr-ranges.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stepsSnap0 = (stepsFileRaw as any).snapshots[0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stepsSnap1 = (stepsFileRaw as any).snapshots[1];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rangesSnap0 = (rangesFileRaw as any).snapshots[0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rangesSnap1 = (rangesFileRaw as any).snapshots[1];

describe('getBiweeklyRate', () => {
  describe('step branch', () => {
    it('returns hourly × 80 for known step codes', () => {
      // Class 881 / step 1 = 27.3375 hourly in dhr-steps.json
      const rate = getBiweeklyRate(
        '881', 'COMMN', 'step', 1, undefined,
        stepsSnap0, stepsSnap1, rangesSnap0, rangesSnap1,
      );
      expect(rate).not.toBeNull();
      expect(rate!.pre).toBeCloseTo(27.3375 * 80, 4);
    });
  });

  describe('range branch (MCCP)', () => {
    /**
     * Regression test for the biweekly bug: dhr-ranges.json values are
     * *hourly* (despite the original "biweekly" misnamed comment). Class
     * 0922 Manager I Range A min in the pre-COLA snapshot is 64.7. Per
     * careers.sf.gov/classifications/ that's $134,576 annual pre-COLA
     * (= 64.7 × 80 × 26 = $134,576).
     *
     * The bug was returning 64.7 directly as the biweekly amount, which
     * implied $1,682.20 annual — wildly wrong (off by 80×).
     */
    it('multiplies range bounds by 80 (hourly → biweekly)', () => {
      const rate = getBiweeklyRate(
        '922', 'COMMN', 'range', 'A', 'min',
        stepsSnap0, stepsSnap1, rangesSnap0, rangesSnap1,
      );
      expect(rate).not.toBeNull();
      // pre-COLA hourly 64.7 → biweekly 5176
      expect(rate!.pre).toBeCloseTo(64.7 * 80, 4);
      // Annual sanity-check: ~$134K (matches careers.sf.gov pre-COLA)
      expect(rate!.pre * 26).toBeGreaterThan(130_000);
      expect(rate!.pre * 26).toBeLessThan(140_000);
    });

    it('post-COLA range bounds are also × 80', () => {
      const rate = getBiweeklyRate(
        '922', 'COMMN', 'range', 'A', 'min',
        stepsSnap0, stepsSnap1, rangesSnap0, rangesSnap1,
      );
      // careers.sf.gov says $136,604 annual post-COLA for 0922 Range A;
      // hourly ≈ $65.68 (the data file holds ~65.675 — 0.005/hr drift is
      // immaterial). Range $130K-$140K covers both pre- and post-COLA.
      expect(rate!.post).toBeGreaterThan(rate!.pre);
      expect(rate!.post * 26).toBeGreaterThan(136_000);
      expect(rate!.post * 26).toBeLessThan(137_500);
    });

    it('returns max bound (not min) when rangePos = max', () => {
      const min = getBiweeklyRate(
        '922', 'COMMN', 'range', 'A', 'min',
        stepsSnap0, stepsSnap1, rangesSnap0, rangesSnap1,
      );
      const max = getBiweeklyRate(
        '922', 'COMMN', 'range', 'A', 'max',
        stepsSnap0, stepsSnap1, rangesSnap0, rangesSnap1,
      );
      expect(max!.pre).toBeGreaterThan(min!.pre);
    });

    it('returns null when rangePos is missing', () => {
      const rate = getBiweeklyRate(
        '922', 'COMMN', 'range', 'A', undefined,
        stepsSnap0, stepsSnap1, rangesSnap0, rangesSnap1,
      );
      expect(rate).toBeNull();
    });

    it('returns null for an unknown range letter', () => {
      const rate = getBiweeklyRate(
        '922', 'COMMN', 'range', 'Z', 'min',
        stepsSnap0, stepsSnap1, rangesSnap0, rangesSnap1,
      );
      expect(rate).toBeNull();
    });
  });
});

describe('calcEmployeeCost — MCCP regression', () => {
  /**
   * Annual-total regression: class 922 Range A min, retCode C, PP1 start.
   * Pre-bug: annual salary showed as ~$1,683 (off by 80×).
   * Post-bug: annual salary should be ~$135K-ish (mix of pre + post COLA).
   */
  it('produces an annual salary in the $130K+ range for class 922 Manager I Range A min', () => {
    const result = calcEmployeeCost({
      code: '922',
      setid: 'COMMN',
      retCode: 'C',
      ppStartDate: '2025-07-04', // PP1 ppe
      salaryType: 'range',
      stepOrRange: 'A',
      rangePos: 'min',
      fiscalYear: 'FY2026',
    });
    // Pre-COLA: 64.7 × 80 = $5,176 biweekly. Post-COLA: ~$5,254 biweekly.
    // 27 PPs in FY26 (PP27 is partial at pct=0.7). Annual lands in $130K-$140K.
    expect(result.totalSalary).toBeGreaterThan(130_000);
    expect(result.totalSalary).toBeLessThan(140_000);
    expect(result.preBiweekly).toBeCloseTo(64.7 * 80, 4);
  });

  it('throws CostCalcError for an unknown class code', () => {
    expect(() => calcEmployeeCost({
      code: 'XXXX',
      setid: 'COMMN',
      retCode: 'C',
      ppStartDate: '2025-07-04',
      salaryType: 'step',
      stepOrRange: 1,
      fiscalYear: 'FY2026',
    })).toThrow(CostCalcError);
  });
});

describe('topClassBiweekly', () => {
  // A date the first snapshot covers, so the lookup resolves deterministically.
  const asOf = stepsSnap0.effectiveFrom as string;

  it('returns the top-of-grade biweekly for a step class (≥ its step-1 rate)', () => {
    const top = topClassBiweekly('881', asOf);
    expect(top).not.toBeNull();
    // 881 step 1 = 27.3375 hourly × 80; the top step is at least that.
    expect(top!).toBeGreaterThanOrEqual(27.3375 * 80);
  });

  it('returns the top-of-grade biweekly for a range class (≥ its Range A min)', () => {
    const top = topClassBiweekly('922', asOf);
    expect(top).not.toBeNull();
    // 922 Range A min = 64.7 hourly × 80; the max is at least the min.
    expect(top!).toBeGreaterThanOrEqual(64.7 * 80);
  });

  it('returns null for an unknown class', () => {
    expect(topClassBiweekly('ZZZZ', asOf)).toBeNull();
  });
});
