/**
 * PS HCM Position & Personnel (P&P) Data importer.
 *
 * The "88-column report" — the canonical source for position and incumbency data.
 * See docs/data-sources/ps-hcm.md and docs/DECISIONS.md ADR-006.
 * Column names are documented assumptions — Alex must verify against a real export.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { PsHcmPpRow } from './types';

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function importPsHcmPp(ws: WorkSheet, headerRow = 0): PsHcmPpRow[] {
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());

  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const iPos        = col('position number');
  const iJC         = col('job code');
  const iJCDesc     = col('job code description');
  const iDept       = col('department code');
  const iDeptName   = col('department name');
  const iStatus     = col('position status');
  const iEmplId     = col('empl id');
  const iName       = col('employee name');
  const iAppt       = col('appointment type');
  const iStep       = col('salary step');
  const iSal        = col('salary amount');
  const iRptsTo     = col('reports to position');
  const iRtfStatus  = col('rtf status');
  const iRtfDate    = col('rtf expected fill date');
  const iFte        = col('fte');
  const iUnion      = col('union code');

  const results: PsHcmPpRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posNum = str(r[iPos]);
    if (!posNum) continue;

    results.push({
      _source: 'ps-hcm-pp',
      positionNumber:      posNum,
      jobCode:             str(r[iJC]),
      jobCodeDescription:  str(r[iJCDesc]),
      departmentCode:      str(r[iDept]),
      departmentName:      str(r[iDeptName]),
      positionStatus:      str(r[iStatus]),
      emplId:              str(r[iEmplId]),
      employeeName:        str(r[iName]),
      appointmentType:     str(r[iAppt]),
      salaryStep:          str(r[iStep]),
      salaryAmount:        num(r[iSal]),
      reportsToPosition:   str(r[iRptsTo]),
      rtfStatus:           str(r[iRtfStatus]),
      rtfExpectedFillDate: str(r[iRtfDate]),
      fte:                 num(r[iFte]),
      unionCode:           str(r[iUnion]),
      _row:                headerRow + i + 1,
    });
  }

  return results;
}
