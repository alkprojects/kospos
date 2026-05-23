/**
 * QR-003: OBI payroll YTD total is on pace to exceed the BFM budgeted salary.
 *
 * "On pace" = annualised YTD × (26/pps_elapsed) > budgetedSalary × 1.05
 * We use a 5% buffer to avoid noise from rounding and mid-year step increases.
 *
 * Note: we can't know pps_elapsed from the data alone — we use ytdTotal /
 * budgetedSalary as a ratio proxy instead. If YTD has already consumed more
 * than 100% of budget and it's before the end of the fiscal year, flag it.
 * This is a conservative check; a fuller implementation uses the report period.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const payrollExceedsBudget: QualityRule = {
  id: 'QR-003',
  description: 'OBI payroll YTD total exceeds BFM budgeted salary',
  check(records: ImportedRow[]): Issue[] {
    const budgetByPosition = new Map<string, number>();
    for (const r of records) {
      if (r._source === 'bfm-position' && r.positionNumber) {
        budgetByPosition.set(r.positionNumber, r.budgetedSalary);
      }
    }

    if (budgetByPosition.size === 0) return [];

    const issues: Issue[] = [];
    for (const r of records) {
      if (r._source !== 'obi-payroll') continue;
      const budget = budgetByPosition.get(r.positionNumber);
      if (budget == null || budget === 0) continue;
      if (r.ytdTotal > budget * 1.05) {
        issues.push({
          ruleId: 'QR-003',
          severity: 'error',
          message: `Position ${r.positionNumber} (${r.employeeName || r.emplId}): payroll YTD $${r.ytdTotal.toLocaleString()} exceeds budget $${budget.toLocaleString()}`,
          positionNumber: r.positionNumber,
          emplId: r.emplId,
          sourceRows: [r._row],
        });
      }
    }
    return issues;
  },
};
