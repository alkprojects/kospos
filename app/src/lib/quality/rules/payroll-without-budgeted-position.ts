/**
 * QR-012: OBI payroll posts to a position with no budgeted/established record.
 *
 * Sums OBI Balance Amount per Position Identifier and flags positions that
 * appear in NEITHER the BFM budget (no budget line) NOR PS HCM P&P (no
 * established position) - payroll dollars going out against a position no
 * source can identify. This is the cost-side counterpart to QR-001/QR-005:
 * those flag a position present in one system but missing from the other;
 * this flags spend with no position record anywhere.
 *
 * Runs once OBI is loaded together with at least one of BFM / PS HCM, so
 * "in neither" is meaningful (with only one of the two loaded it degrades to
 * "not in the loaded source"). Blank Position Identifiers (non-position
 * earnings) and net-zero positions (washes / corrections) are skipped.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const payrollWithoutBudgetedPosition: QualityRule = {
  id: 'QR-012',
  description: 'OBI payroll posts to a position with no BFM budget line or PS HCM record',
  rationale:
    'Payroll (OBI) is posting against a position identifier that appears in neither the BFM budget nor the PS HCM position list. The money is going out but no budgeted or established position can be identified for it - usually a mis-coded position identifier, a position closed in HR/budget but still being paid, or a cross-department charge.',
  fix:
    'Trace the payroll to the correct position. If the position identifier is wrong, correct the OBI coding; if the position should exist, establish it in PS HCM and budget it in BFM.',
  citations: [
    { label: 'Cross-system reconciliation: OBI Position Identifier vs BFM budget lines and PS HCM positions' },
  ],
  sourceTabs: ['labor', 'data'],
  check(records: ImportedRow[]): Issue[] {
    // Positions that ARE budgeted (BFM) or established (HCM).
    const known = new Set<string>();
    let hasBfm = false;
    let hasHcm = false;
    for (const r of records) {
      if (r._source === 'bfm-position') {
        hasBfm = true;
        if (r.positionNumber) known.add(r.positionNumber);
      } else if (r._source === 'ps-hcm-pp') {
        hasHcm = true;
        if (r.positionNumber) known.add(r.positionNumber);
      }
    }
    // Need a reference source; otherwise "in neither" is meaningless.
    if (!hasBfm && !hasHcm) return [];

    // Sum OBI spend per position identifier, tracking source rows + a name.
    const byPos = new Map<string, { total: number; rows: number[]; name: string }>();
    let hasObi = false;
    for (const r of records) {
      if (r._source !== 'obi-payroll') continue;
      hasObi = true;
      const posId = (r.positionIdentifier ?? '').trim();
      if (!posId) continue; // non-position earnings
      const entry = byPos.get(posId) ?? { total: 0, rows: [], name: '' };
      entry.total += r.balanceAmount;
      entry.rows.push(r._row);
      if (!entry.name && r.personFullName) entry.name = r.personFullName;
      byPos.set(posId, entry);
    }
    if (!hasObi) return [];

    const issues: Issue[] = [];
    for (const [posId, entry] of byPos) {
      if (known.has(posId)) continue;
      if (Math.abs(entry.total) < 0.005) continue; // net-zero wash / correction
      const who = entry.name ? ` (${entry.name})` : '';
      issues.push({
        ruleId: 'QR-012',
        severity: 'warning',
        message:
          `Position ${posId}${who} has $${entry.total.toLocaleString('en-US', { maximumFractionDigits: 0 })} ` +
          `of OBI payroll but no BFM budget line or PS HCM position record - no budgeted position identified for this spend.`,
        positionNumber: posId,
        sourceRows: entry.rows,
      });
    }
    return issues;
  },
};
