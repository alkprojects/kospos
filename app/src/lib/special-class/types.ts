/**
 * Special-class domain types for Phase 4.
 * Ref: docs/domain/special-class.md, docs/domain/budget-process.md
 */

/**
 * Eight SF labor special classes (per docs/domain/special-class.md).
 * Suffix _C = Credit (offsets labor budget); _E = Expense (adds to labor budget).
 */
export type SpecialClassCode =
  | '9993M_C'   // Attrition Savings
  | '9994M_C'   // MCCP Offset
  | '9995M_E'   // Positions Not Detailed
  | 'OVERM_E'   // Overtime
  | 'PREMM_E'   // Premium Pay
  | 'RTPOM_E'   // Retirement Payout
  | 'STEPM_C'   // Step Adjustments
  | 'TEMPM_E';  // Temporary

/**
 * One special-class line for a given chartfield × fiscal year.
 *
 * The three-function model (see docs/domain/budget-process.md):
 *   - budget               → function 1 (budget development)
 *   - ytdActual / ytdBudget→ function 2 (YTD vs actuals)
 *   - projectedActual      → function 3 (year-end projection)
 *
 * balance / projectedBalance follow the same sign convention as the source workbook:
 *   balance          = budget - ytdActual
 *   projectedBalance = budget - projectedActual
 *
 * `source` flags whether the line is computed from formulas/imported data or
 * manually entered by the user (e.g., the RPO "chosen amount" cushion).
 */
export interface SpecialClassRecord {
  code: SpecialClassCode;
  chartfieldString: string;
  fy: string;
  budget: number;
  ytdActual: number;
  projectedActual: number;
  ytdBudget: number;
  balance: number;
  projectedBalance: number;
  source: 'computed' | 'manual';
  notes?: string;
}
