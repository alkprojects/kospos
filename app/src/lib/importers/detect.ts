/**
 * Sniffs a worksheet's header row to identify which SF labor report it came from.
 *
 * Fingerprints are verified against real DBI exports (May 2026).
 * See docs/DECISIONS.md ADR-004 through ADR-007.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { DetectionResult, ReportType } from './types';

/**
 * Columns that must ALL be present to match a given report type.
 * Chosen to be unique to each report and stable across fiscal years.
 */
const FINGERPRINTS: Record<Exclude<ReportType, 'unknown'>, string[]> = {
  // 15.10.006 "By Position#" sheet / "Pos" sheet in Eturns export
  'bfm-position': [
    'BY HCM Position#',
    'Job Class',
    'Status',
    'Dept ID',
    'Ret Indicator',
  ],
  // 15.10.001 "Chart of Account Details" / "Nonpos" sheet in Eturns export
  'bfm-non-position': [
    'GFS Type',
    'Dept ID',
    'Account',
    'Account Title',
    'Account Lvl 5 Title',
    'Change Type',
  ],
  // "Active Labor" CSV / "P&P Data" sheet — PS HCM Position & Personnel
  'ps-hcm-pp': [
    'Snapshot Date',
    'Position Job Code',
    'Current Employee ID',
    'Position Reports To',
    'Roster Code',
  ],
  // "Payroll Detail" CSV / "BI Payroll" sheet — OBI per-pay-period payroll
  'obi-payroll': [
    'Balance Amount',
    'Earning Period End Date',
    'Person Number',
    'Position Identifier',
    'Pay Period FTE',
  ],
};

function extractHeaders(ws: WorkSheet, row: number): string[] {
  const range = utils.decode_range(ws['!ref'] ?? 'A1:A1');
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = ws[utils.encode_cell({ r: row, c: col })];
    if (cell && cell.v != null) headers.push(String(cell.v).trim());
  }
  return headers;
}

function matches(headers: string[], fingerprint: string[]): boolean {
  const set = new Set(headers.map(h => h.toLowerCase()));
  return fingerprint.every(f => set.has(f.toLowerCase()));
}

export function detect(ws: WorkSheet): DetectionResult {
  for (const row of [0, 1]) {
    const headers = extractHeaders(ws, row);
    if (headers.length === 0) continue;
    for (const [type, fp] of Object.entries(FINGERPRINTS) as [Exclude<ReportType, 'unknown'>, string[]][]) {
      if (matches(headers, fp)) return { type, headerRow: row };
    }
  }
  return { type: 'unknown', headerRow: 0 };
}
