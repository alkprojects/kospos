/**
 * QR-003: Total OBI payroll expenditure for a position exceeds its BFM budgeted salary.
 *
 * Sums all Balance Amount rows in OBI for each Position Identifier, then compares
 * against the BFM budgeted salary. Flags positions where total > budget × 1.05
 * (5% buffer for rounding and mid-year step increases).
 *
 * OBI rows are per-period, so summing gives the full-year expenditure to date.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const payrollExceedsBudget: QualityRule = {
  id: 'QR-003',
  description: 'OBI payroll total exceeds BFM budgeted salary',
  check(records: ImportedRow[]): Issue[] {
    const budgetByPosition = new Map<string, number>();
    for (const r of records) {
      if (r._source === 'bfm-position' && r.positionNumber) {
        budgetByPosition.set(r.positionNumber, r.budgetedSalary);
      }
    }

    if (budgetByPosition.size === 0) return [];

    // Sum balance amounts per position
    const spentByPosition = new Map<string, { total: number; rows: number[] }>();
    for (const r of records) {
      if (r._source !== 'obi-payroll') continue;
      const entry = spentByPosition.get(r.positionIdentifier) ?? { total: 0, rows: [] };
      entry.total += r.balanceAmount;
      entry.rows.push(r._row);
      spentByPosition.set(r.positionIdentifier, entry);
    }

    const issues: Issue[] = [];
    for (const [posId, spent] of spentByPosition) {
      const budget = budgetByPosition.get(posId);
      if (budget == null || budget === 0) continue;
      if (spent.total > budget * 1.05) {
        issues.push({
          ruleId: 'QR-003',
          severity: 'error',
          message: `Position ${posId}: payroll total $${spent.total.toLocaleString()} exceeds budget $${budget.toLocaleString()}`,
          positionNumber: posId,
          sourceRows: spent.rows,
        });
      }
    }
    return issues;
  },
};
