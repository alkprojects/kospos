/**
 * Filter + aggregate helpers for the Labor view. Pure functions so the table /
 * aggregates math can be unit-tested without rendering the React surface.
 */

import { normalizePositionKey } from '../../chartfields/resolve';
import { ACCOUNT_DESCRIPTIONS, type PayrollBucket } from '../../payroll';
import type { ObiPayrollRow } from '../../importers/types';

export interface LaborFilters {
  /** Position id (normalized key). Null = all positions. */
  positionId: string | null;
  /** Earnings code (e.g. "WKP"). '' = any. */
  earningsCode: string;
  /** Account description literal. '' = any. */
  accountDescription: string;
  /** Earning Period End >= this date (YYYY-MM-DD). '' = no lower bound. */
  pperStart: string;
  /** Earning Period End <= this date (YYYY-MM-DD). '' = no upper bound. */
  pperEnd: string;
}

export interface LaborAggregates {
  rowCount: number;
  total: number;
  regular: number;
  overtime: number;
  rpo: number;
  premium: number;
  tempLsp: number;
  totalHours: number;
}

export const EMPTY_FILTERS: LaborFilters = {
  positionId: null,
  earningsCode: '',
  accountDescription: '',
  pperStart: '',
  pperEnd: '',
};

export function bucketOf(accountDescription: string): PayrollBucket {
  switch (accountDescription) {
    case ACCOUNT_DESCRIPTIONS.overtime: return 'overtime';
    case ACCOUNT_DESCRIPTIONS.rpo:      return 'rpo';
    case ACCOUNT_DESCRIPTIONS.premium:  return 'premium';
    case ACCOUNT_DESCRIPTIONS.tempLsp:  return 'tempLsp';
    default:                            return 'regular';
  }
}

export function applyFilters(rows: ObiPayrollRow[], f: LaborFilters): ObiPayrollRow[] {
  return rows.filter(r => {
    if (f.positionId && normalizePositionKey(r.positionIdentifier) !== f.positionId) {
      return false;
    }
    if (f.earningsCode && r.earningsCode !== f.earningsCode) return false;
    if (f.accountDescription && r.accountDescription !== f.accountDescription) return false;
    if (f.pperStart && r.earningPeriodEnd < f.pperStart) return false;
    if (f.pperEnd   && r.earningPeriodEnd > f.pperEnd)   return false;
    return true;
  });
}

export function aggregate(rows: ObiPayrollRow[]): LaborAggregates {
  const agg: LaborAggregates = {
    rowCount: rows.length,
    total: 0, regular: 0, overtime: 0, rpo: 0, premium: 0, tempLsp: 0,
    totalHours: 0,
  };
  for (const r of rows) {
    agg.total += r.balanceAmount;
    agg.totalHours += r.earningHours;
    agg[bucketOf(r.accountDescription)] += r.balanceAmount;
  }
  return agg;
}

/**
 * Distinct values for the option dropdowns. Sorted alphabetically; empty
 * string excluded. Built from the snapshot's full row set (not the filtered
 * subset) so changing one filter doesn't hide options that would still match
 * if other filters relaxed.
 */
export function distinctValues<K extends keyof ObiPayrollRow>(
  rows: ObiPayrollRow[],
  key: K,
): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v === 'string' && v.length > 0) set.add(v);
  }
  return [...set].sort();
}
