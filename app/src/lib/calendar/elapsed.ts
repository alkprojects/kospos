/**
 * Pay-period calendar primitives — roadmap sub-phase 2.2.1 `lib/calendar/`.
 *
 * Lifts the pay-period "how much of the FY has elapsed" math that lived inline
 * in `lib/views/calendar/CalendarView.tsx` into a reusable, tested module.
 * This is the weight-based elapsed/remaining primitive every COLA-aware
 * year-end projection needs as its denominator — see the projection-engine
 * proposal in `docs/proposals/s55-projection-engine.md`.
 *
 * Weights (`pct`): a pay period that only partially falls inside the FY counts
 * as a fraction (FY26: PP1 = 0.4, PP2–26 = 1.0, PP27 = 0.7 → weighted sum
 * 26.1). "Elapsed" is therefore weight-based, never a raw PP count — the
 * workbook's `Calendar!I2 / J2 / K2` (elapsed / total / remaining) are all
 * weighted sums.
 */

/** One pay period: number, period-end ISO date (`YYYY-MM-DD`), partial weight. */
export interface PayPeriod {
  pp: number;
  ppe: string;
  pct: number;
}

export interface PayPeriodElapsed {
  /** Pay periods whose period-end is strictly before `asOf`. */
  completed: PayPeriod[];
  /**
   * The pay period we're inside: the first one whose period-end is on/after
   * `asOf`. Null once the whole FY has elapsed.
   */
  current: PayPeriod | null;
  /** Pay periods whose period-end is on/after `asOf` (current + everything after). */
  remaining: PayPeriod[];
  /** Sum of `pct` across all pay periods (the workbook's `Calendar!J2`). */
  totalWeight: number;
  /** Sum of `pct` across completed pay periods (`Calendar!I2`). */
  completedWeight: number;
  /** `totalWeight − completedWeight` — weighted PPs left to run (`Calendar!K2`). */
  remainingWeight: number;
  /** `completedWeight / totalWeight`, or 0 when no calendar is loaded. */
  elapsedFraction: number;
}

const sumWeight = (pps: PayPeriod[]): number => pps.reduce((sum, p) => sum + p.pct, 0);

/**
 * Split a pay-period calendar at `asOf` into completed vs remaining, with the
 * weighted sums each projection needs.
 *
 * Expects `payPeriods` in chronological order (the pre-baked calendar always
 * is); `current` is the first PP in array order whose `ppe >= asOf`. Matches
 * the prior CalendarView behavior exactly — `asOf` is compared
 * lexicographically against ISO `ppe` strings.
 */
export function payPeriodElapsed(payPeriods: PayPeriod[], asOf: string): PayPeriodElapsed {
  const completed = payPeriods.filter(p => p.ppe < asOf);
  const remaining = payPeriods.filter(p => p.ppe >= asOf);
  const totalWeight = sumWeight(payPeriods);
  const completedWeight = sumWeight(completed);
  return {
    completed,
    current: remaining[0] ?? null,
    remaining,
    totalWeight,
    completedWeight,
    remainingWeight: totalWeight - completedWeight,
    elapsedFraction: totalWeight > 0 ? completedWeight / totalWeight : 0,
  };
}
