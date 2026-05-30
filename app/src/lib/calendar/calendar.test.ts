import { describe, it, expect } from 'vitest';
import { payPeriodElapsed } from './elapsed';
import type { PayPeriod } from './elapsed';

// A tiny 3-PP calendar; weights mirror the FY-boundary partials (0.4 / 1 / 0.7).
const CAL: PayPeriod[] = [
  { pp: 1, ppe: '2025-07-15', pct: 0.4 },
  { pp: 2, ppe: '2025-07-29', pct: 1.0 },
  { pp: 3, ppe: '2025-08-12', pct: 0.7 },
];

describe('payPeriodElapsed', () => {
  it('splits at an as-of date inside the calendar', () => {
    // asOf 2025-07-20: PP1 ended (< asOf); PP2 + PP3 remain (ppe >= asOf).
    const e = payPeriodElapsed(CAL, '2025-07-20');
    expect(e.completed.map(p => p.pp)).toEqual([1]);
    expect(e.current?.pp).toBe(2);
    expect(e.remaining.map(p => p.pp)).toEqual([2, 3]);
    expect(e.totalWeight).toBeCloseTo(2.1);
    expect(e.completedWeight).toBeCloseTo(0.4);
    expect(e.remainingWeight).toBeCloseTo(1.7);
    expect(e.elapsedFraction).toBeCloseTo(0.4 / 2.1);
  });

  it('treats a PP whose ppe equals asOf as still current (not completed)', () => {
    // ppe < asOf is "completed"; ppe >= asOf is "remaining" — boundary is inclusive-current.
    const e = payPeriodElapsed(CAL, '2025-07-29');
    expect(e.completed.map(p => p.pp)).toEqual([1]);
    expect(e.current?.pp).toBe(2);
  });

  it('before the FY starts: nothing completed, current is PP1', () => {
    const e = payPeriodElapsed(CAL, '2025-07-01');
    expect(e.completed).toHaveLength(0);
    expect(e.current?.pp).toBe(1);
    expect(e.completedWeight).toBe(0);
    expect(e.remainingWeight).toBeCloseTo(2.1);
    expect(e.elapsedFraction).toBe(0);
  });

  it('after the FY ends: all completed, no current, fully elapsed', () => {
    const e = payPeriodElapsed(CAL, '2025-09-01');
    expect(e.completed).toHaveLength(3);
    expect(e.current).toBeNull();
    expect(e.remaining).toHaveLength(0);
    expect(e.remainingWeight).toBeCloseTo(0);
    expect(e.elapsedFraction).toBeCloseTo(1);
  });

  it('empty calendar → zeros (elapsedFraction guarded against /0)', () => {
    const e = payPeriodElapsed([], '2025-07-20');
    expect(e.totalWeight).toBe(0);
    expect(e.elapsedFraction).toBe(0);
    expect(e.current).toBeNull();
  });
});
