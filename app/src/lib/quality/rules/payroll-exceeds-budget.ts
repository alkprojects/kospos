/**
 * QR-003: OBI base salary for a position exceeds its BFM budgeted salary.
 *
 * Sums BASE-PAY Balance Amount rows in OBI (regular pay — earnings code WKP) per
 * Position Identifier, then compares against the BFM budgeted salary. Premiums,
 * overtime, and other non-base earnings are excluded so it is a base-to-base
 * comparison (BFM budgets base salary; premiums / OT are budgeted separately).
 * Flags positions where base pay > budget × 1.05 (5% buffer for rounding and
 * mid-year step increases).
 *
 * OBI rows are per-period, so summing gives base pay to date across loaded PPs.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';
import { normalizePositionKey } from '../../chartfields/resolve';

/**
 * Earnings codes that count as base salary for the budget comparison. BFM
 * budgets base salary, so QR-003 compares like-for-like and ignores premiums /
 * overtime / one-time pay. `WKP` = Regular Biweekly Pay. (Per Alex, S58: "only
 * base salary / WKP counts." Extend this set if base pay posts under other
 * codes.)
 */
const BASE_PAY_EARN_CODES = new Set(['WKP']);

export const payrollExceedsBudget: QualityRule = {
  id: 'QR-003',
  description: 'OBI base salary (WKP) exceeds BFM budgeted salary',
  rationale:
    'Base salary (regular pay, earnings code WKP) paid against this position — summed across loaded pay periods — exceeds its BFM budgeted salary by more than 5%. Premiums, overtime, and other non-base earnings are excluded so the comparison is base-to-base. The position may be over budget, the budget may be stale, or base pay may be posting to the wrong position.',
  fix:
    'Reconcile the base-salary charges against the budget. Look for an unbudgeted step increase, base pay mis-coded to the wrong position, or a budget that needs a supplemental.',
  citations: [
    { label: 'Cross-system reconciliation: OBI base salary (WKP) vs BFM budgeted salary (5% tolerance)' },
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
      // Base salary only — exclude premiums / overtime / one-time pay so the
      // comparison is base-to-base against the budgeted salary.
      if (!BASE_PAY_EARN_CODES.has(r.earningsCode.trim().toUpperCase())) continue;
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
          message: `Position ${spent.display}: base salary $${spent.total.toLocaleString()} exceeds budget $${budget.toLocaleString()}`,
          positionNumber: spent.display,
          sourceRows: spent.rows,
        });
      }
    }
    return issues;
  },
};
