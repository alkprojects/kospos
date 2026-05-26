/**
 * Payroll domain types — the entity layer over OBI BI Payroll rows.
 *
 * A `PayrollSnapshot` is one logical FY-to-date export from OBI, keyed by
 * `(fiscalYear, asOfDate)` where `asOfDate = MAX(earningPeriodEnd)` among the
 * rows in that snapshot. Multiple uploads with different MAX(PPE) split into
 * separate snapshots automatically (via the row-level `_asOfDate` stamp set
 * by the importer).
 *
 * The 5-bucket model mirrors the workbook's Step / Report Data exclusion
 * logic — see docs/domain/labor-report.md § Tab 7 § How each downstream tab
 * consumes BI Payroll.
 */

import type { ObiPayrollRow } from '../importers/types';

/**
 * Account-description literals from the OBI export (col V) that the workbook's
 * SUMIFS formulas reference verbatim. Renaming any of these on the Controller
 * side silently breaks Step / Report Data / Operating Report Summary in the
 * workbook — KosPos surfaces a Data Issue when an account description present
 * in BI Payroll doesn't match the known set.
 */
export const ACCOUNT_DESCRIPTIONS = {
  overtime: 'Overtime - Scheduled Misc',
  rpo:      'Ret Payout - SP & Vac - Misc',
  premium:  'Premium Pay - Misc',
  tempLsp:  'Temp Misc LumpSum Payoff',
} as const;

/** The 5 special-class buckets per labor-report.md § Tab 7. */
export type PayrollBucket =
  | 'regular'   // Everything not matching the other 4 account-description literals
  | 'overtime'  // ACCOUNT_DESCRIPTIONS.overtime
  | 'rpo'       // ACCOUNT_DESCRIPTIONS.rpo  (Retirement Payout)
  | 'premium'   // ACCOUNT_DESCRIPTIONS.premium
  | 'tempLsp';  // ACCOUNT_DESCRIPTIONS.tempLsp  (Temp Misc Lump-Sum Payoff)

/** YTD totals for one position, split into the 5 buckets. */
export interface PositionYtdActuals {
  /** Normalized position key (zero-stripped, trimmed). */
  positionId: string;
  total: number;
  regular: number;
  overtime: number;
  rpo: number;
  premium: number;
  tempLsp: number;
}

/**
 * One logical FY-to-date OBI export. Holds the parsed rows + the per-position
 * rollup cube so downstream views can answer queries in O(1) instead of
 * scanning the row list.
 */
export interface PayrollSnapshot {
  fiscalYear: string;
  /** MAX(earningPeriodEnd) among rows in this snapshot. */
  asOfDate: string;
  rowCount: number;
  totalBalanceAmount: number;
  /** Per-position YTD actuals split into 5 buckets. */
  byPosition: Map<string, PositionYtdActuals>;
  /** The source rows, kept for drill-downs (per-PP, per-earnings-code). */
  rows: ObiPayrollRow[];
}
