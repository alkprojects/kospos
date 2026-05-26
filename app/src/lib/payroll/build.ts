/**
 * Build PayrollSnapshots + per-position rollup cube from OBI BI Payroll rows.
 *
 * Grouping key: `(fiscalYear, asOfDate)`. `asOfDate` is the per-import-call
 * MAX(earningPeriodEnd) the importer stamps onto each row's `_asOfDate`. Two
 * uploads from different OBI runs naturally split into two snapshots; two
 * uploads from the same OBI run (same MAX PPE) merge into one — which means
 * the dollar totals double if the user re-uploads the same file. **Full
 * idempotent de-duplication is deferred to Phase 2.2.33 `snapshots/`**, when
 * IndexedDB persistence makes upload-batch tracking durable.
 */

import type { ObiPayrollRow } from '../importers/types';
import { normalizePositionKey } from '../chartfields/resolve';
import type { PayrollBucket, PayrollSnapshot, PositionYtdActuals } from './types';
import { ACCOUNT_DESCRIPTIONS } from './types';

function bucketOf(accountDescription: string): PayrollBucket {
  switch (accountDescription) {
    case ACCOUNT_DESCRIPTIONS.overtime: return 'overtime';
    case ACCOUNT_DESCRIPTIONS.rpo:      return 'rpo';
    case ACCOUNT_DESCRIPTIONS.premium:  return 'premium';
    case ACCOUNT_DESCRIPTIONS.tempLsp:  return 'tempLsp';
    default:                            return 'regular';
  }
}

function emptyActuals(positionId: string): PositionYtdActuals {
  return { positionId, total: 0, regular: 0, overtime: 0, rpo: 0, premium: 0, tempLsp: 0 };
}

/**
 * Falls back to a row's earningPeriodEnd when the importer-stamped _asOfDate
 * is missing — keeps the function usable for rows constructed by tests or
 * external sources that didn't go through `importObiPayroll`.
 */
function asOfKeyForRow(r: ObiPayrollRow): string {
  return r._asOfDate || r.earningPeriodEnd || '';
}

export function buildPayrollSnapshots(rows: ObiPayrollRow[]): PayrollSnapshot[] {
  // Group by (fiscalYear, asOfDate).
  const groups = new Map<string, ObiPayrollRow[]>();
  for (const r of rows) {
    if (r._source !== 'obi-payroll') continue;
    const key = `${r.fiscalYear}__${asOfKeyForRow(r)}`;
    let g = groups.get(key);
    if (!g) { g = []; groups.set(key, g); }
    g.push(r);
  }

  const snapshots: PayrollSnapshot[] = [];
  for (const groupRows of groups.values()) {
    if (groupRows.length === 0) continue;
    const first = groupRows[0];
    const asOfDate = asOfKeyForRow(first);

    const byPosition = new Map<string, PositionYtdActuals>();
    let total = 0;
    for (const r of groupRows) {
      total += r.balanceAmount;
      const key = normalizePositionKey(r.positionIdentifier);
      if (!key) continue;
      let p = byPosition.get(key);
      if (!p) { p = emptyActuals(key); byPosition.set(key, p); }
      p.total += r.balanceAmount;
      p[bucketOf(r.accountDescription)] += r.balanceAmount;
    }

    snapshots.push({
      fiscalYear:         first.fiscalYear,
      asOfDate,
      rowCount:           groupRows.length,
      totalBalanceAmount: total,
      byPosition,
      rows:               groupRows,
    });
  }

  // Sort oldest → newest by asOfDate so `pickLatestSnapshot` returns the
  // most-recent one (within a single FY) by indexing the tail.
  snapshots.sort((a, b) => {
    if (a.fiscalYear !== b.fiscalYear) return a.fiscalYear.localeCompare(b.fiscalYear);
    return a.asOfDate.localeCompare(b.asOfDate);
  });
  return snapshots;
}

/**
 * Returns the most-recent snapshot overall (highest asOfDate), or null when
 * no snapshots exist. When multiple fiscal years are loaded, the latest
 * asOfDate wins — typical case is a single in-flight FY anyway.
 */
export function pickLatestSnapshot(snapshots: PayrollSnapshot[]): PayrollSnapshot | null {
  if (snapshots.length === 0) return null;
  let latest = snapshots[0];
  for (const s of snapshots) {
    if (s.asOfDate > latest.asOfDate) latest = s;
  }
  return latest;
}
