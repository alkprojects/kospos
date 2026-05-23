/**
 * Sniffs a worksheet's header row to identify which SF labor report it came from.
 *
 * Strategy: each report type has a set of "fingerprint" columns that appear
 * together only in that report. We check the first two rows (row 0 and row 1)
 * because some BFM exports have a title row above the column headers.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { DetectionResult, ReportType } from './types';

/** Fingerprint column sets — ALL of these must be present to match. */
const FINGERPRINTS: Record<Exclude<ReportType, 'unknown'>, string[]> = {
  'bfm-position': [
    'Position Number',
    'Job Code',
    'FTE',
    'Budgeted Salary',
    'Position Status',
  ],
  'bfm-non-position': [
    'Account Code',
    'Account Description',
    'Budget Amount',
    'Department Code',
    'Fund',
  ],
  'ps-hcm-pp': [
    'Position Number',
    'Empl ID',
    'Appointment Type',
    'Reports To Position',
    'Union Code',
  ],
  'obi-payroll': [
    'YTD Salary',
    'YTD Benefits',
    'YTD Total',
    'Report Period',
    'Empl ID',
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
