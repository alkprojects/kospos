/**
 * QR-012: OBI is actively paying a position with no budgeted/established record.
 *
 * Flags positions paid in the LATEST pay period whose identifier appears in
 * NEITHER the BFM budget NOR PS HCM P&P - someone is being paid now against a
 * position no source can identify. Cost-side counterpart to QR-001/QR-005.
 *
 * Latest-pay-period gate (S58, Alex): a position absent from P&P is usually a
 * temporary (TEMPM) position that was vacated and inactivated - so it drops off
 * the P&P list while its historical pay stays in OBI. That historical-only
 * spend is EXPECTED, not an error. We therefore flag only positions still being
 * paid in the most recent pay period (someone is actively on a position no
 * source can identify), and ignore positions whose spend is all in prior PPs.
 *
 * Runs once OBI is loaded with at least one of BFM / PS HCM. Blank Position
 * Identifiers (non-position earnings) are skipped.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';
import { normalizePositionKey } from '../../chartfields/resolve';

export const payrollWithoutBudgetedPosition: QualityRule = {
  id: 'QR-012',
  description: 'OBI is actively paying a position with no BFM budget line or PS HCM record',
  rationale:
    'In the latest pay period, payroll (OBI) is posting against a position identifier that appears in neither the BFM budget nor the PS HCM position list - someone is actively being paid on a position no source can identify. Usually a mis-coded position identifier or a cross-department charge. Historical-only spend on a position that has since been inactivated (e.g. a temporary TEMPM position vacated and closed) is expected and is NOT flagged.',
  fix:
    'Trace the active payroll to the correct position. If the position identifier is wrong, correct the OBI coding; if the position should exist, establish it in PS HCM and budget it in BFM.',
  citations: [
    { label: 'Cross-system reconciliation: OBI Position Identifier vs BFM budget lines and PS HCM positions' },
  ],
  sourceTabs: ['labor', 'data'],
  check(records: ImportedRow[]): Issue[] {
    // Positions that ARE budgeted (BFM) or established (HCM). Also find the
    // latest OBI pay-period-end date (`asOf`) so we can tell active pay from
    // historical pay. ISO dates sort lexically.
    const known = new Set<string>();
    let hasBfm = false;
    let hasHcm = false;
    let asOf = '';
    for (const r of records) {
      if (r._source === 'bfm-position') {
        hasBfm = true;
        const key = normalizePositionKey(r.positionNumber);
        if (key) known.add(key);
      } else if (r._source === 'ps-hcm-pp') {
        hasHcm = true;
        const key = normalizePositionKey(r.positionNumber);
        if (key) known.add(key);
      } else if (r._source === 'obi-payroll') {
        if (r.earningPeriodEnd > asOf) asOf = r.earningPeriodEnd;
      }
    }
    // Need a reference source; otherwise "in neither" is meaningless.
    if (!hasBfm && !hasHcm) return [];

    // Sum OBI spend per position identifier, tracking total + LATEST-pay-period
    // spend, source rows, and a name. Join on the normalized key so a
    // zero-padded BFM/HCM number matches the unpadded OBI identifier; keep the
    // original OBI form for display.
    const byPos = new Map<
      string,
      { total: number; current: number; rows: number[]; name: string; display: string }
    >();
    let hasObi = false;
    for (const r of records) {
      if (r._source !== 'obi-payroll') continue;
      hasObi = true;
      const posId = (r.positionIdentifier ?? '').trim();
      if (!posId) continue; // non-position earnings
      const key = normalizePositionKey(posId);
      const entry = byPos.get(key) ?? { total: 0, current: 0, rows: [], name: '', display: posId };
      entry.total += r.balanceAmount;
      if (asOf && r.earningPeriodEnd === asOf) entry.current += r.balanceAmount;
      entry.rows.push(r._row);
      if (!entry.name && r.personFullName) entry.name = r.personFullName;
      byPos.set(key, entry);
    }
    if (!hasObi) return [];

    const issues: Issue[] = [];
    for (const [key, entry] of byPos) {
      if (known.has(key)) continue;
      // Only flag positions still being paid in the latest pay period — someone
      // is actively on a position no source can identify. Historical-only spend
      // on a now-inactivated temp position has no current-PP amount and is
      // skipped (this also drops net-zero washes, whose current amount nets out).
      if (Math.abs(entry.current) < 0.005) continue;
      const who = entry.name ? ` (${entry.name})` : '';
      issues.push({
        ruleId: 'QR-012',
        severity: 'warning',
        message:
          `Position ${entry.display}${who} is being paid in the latest pay period ` +
          `($${entry.current.toLocaleString('en-US', { maximumFractionDigits: 0 })} of ` +
          `$${entry.total.toLocaleString('en-US', { maximumFractionDigits: 0 })} total) but has no BFM ` +
          `budget line or PS HCM position record - no budgeted position identified for this active spend.`,
        positionNumber: entry.display,
        sourceRows: entry.rows,
      });
    }
    return issues;
  },
};
