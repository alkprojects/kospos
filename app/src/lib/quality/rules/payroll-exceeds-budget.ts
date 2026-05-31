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
import { normalizePositionKey } from '../../chartfields/resolve';

export const payrollExceedsBudget: QualityRule = {
  id: 'QR-003',
  description: 'OBI payroll total exceeds BFM budgeted salary',
  rationale:
    'Total OBI payroll paid against this position (summed across all pay periods) exceeds its BFM budgeted salary by more than 5%. The position may be over budget, the budget may be stale, or pay may be posting to the wrong position.',
  fix:
    'Reconcile the OBI charges against the budget. Look for mis-coded earnings, an unbudgeted step or premium, or a budget that needs a supplemental.',
  citations: [
    { label: 'Cross-system reconciliation: OBI Payroll Balance Amount vs BFM budgeted salary (5% tolerance)' },
  ],
  sourceTabs: ['labor', 'data'],
  check(records: ImportedRow[]): Issue[] {
    const budgetByPosition = new Map<string, number>();
    for (const r of records) {
      if (r._source === 'bfm-position' && r.positionNumber) {
        budgetByPosition.set(normalizePositionKey(r.positionNumber), r.budgetedSalary);
      }
    }

    if (budgetByPosition.size === 0) return [];

    // Sum balance amounts per position. Join on the normalized key so a
    // zero-padded BFM number matches the unpadded OBI identifier; keep the
    // original OBI form for display.
    const spentByPosition = new Map<string, { total: number; rows: number[]; display: string }>();
    for (const r of records) {
      if (r._source !== 'obi-payroll') continue;
      const key = normalizePositionKey(r.positionIdentifier);
      if (!key) continue;
      const entry = spentByPosition.get(key) ?? { total: 0, rows: [], display: r.positionIdentifier };
      entry.total += r.balanceAmount;
      entry.rows.push(r._row);
      spentByPosition.set(key, entry);
    }

    const issues: Issue[] = [];
    for (const [posKey, spent] of spentByPosition) {
      const budget = budgetByPosition.get(posKey);
      if (budget == null || budget === 0) continue;
      if (spent.total > budget * 1.05) {
        issues.push({
          ruleId: 'QR-003',
          severity: 'error',
          message: `Position ${spent.display}: payroll total $${spent.total.toLocaleString()} exceeds budget $${budget.toLocaleString()}`,
          positionNumber: spent.display,
          sourceRows: spent.rows,
        });
      }
    }
    return issues;
  },
};
