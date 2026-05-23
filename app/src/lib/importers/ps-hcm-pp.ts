/**
 * PS HCM Position & Personnel (P&P) Data importer.
 *
 * Reads "Active Labor" CSV / "P&P Data" sheet.
 * Column names verified against real DBI exports (May 2026).
 * See docs/DECISIONS.md ADR-006.
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
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());

  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const iSnapshot   = col('snapshot date');
  const iPos        = col('position number');
  const iJC         = col('position job code');
  const iJCDesc     = col('position description');
  const iDept       = col('position department id');
  const iDeptName   = col('position department description');
  const iStatus     = col('position status');
  const iFillStatus = col('position fill status');
  const iEmplId     = col('current employee id');
  const iName       = col('person full name');
  const iAppt       = col('employee appointment type');
  const iStep       = col('employee step');
  const iHourly     = col('employee hourly rate');
  const iRptsTo     = col('position reports to');
  const iRoster     = col('roster code');
  const iRosterDesc = col('roster code description');
  const iRtfStatus  = col('rtf status');
  const iRtfDate    = col('rtf expected fill date');
  const iFte        = col('budget position total fte');
  const iCombo      = col('combo code');
  const iEmpJC      = col('employee job code');

  const results: PsHcmPpRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posNum = str(r[iPos]);
    if (!posNum) continue;

    results.push({
      _source: 'ps-hcm-pp',
      snapshotDate:        str(r[iSnapshot]),
      positionNumber:      posNum,
      jobCode:             str(r[iJC]),
      jobCodeDescription:  str(r[iJCDesc]),
      departmentCode:      str(r[iDept]),
      departmentName:      str(r[iDeptName]),
      positionStatus:      str(r[iStatus]),
      fillStatus:          str(r[iFillStatus]),
      emplId:              str(r[iEmplId]),
      employeeName:        str(r[iName]),
      appointmentType:     str(r[iAppt]),
      salaryStep:          str(r[iStep]),
      hourlyRate:          num(r[iHourly]),
      reportsToPosition:   str(r[iRptsTo]),
      rosterCode:          str(r[iRoster]),
      rosterDescription:   str(r[iRosterDesc]),
      rtfStatus:           str(r[iRtfStatus]),
      rtfExpectedFillDate: str(r[iRtfDate]),
      fte:                 num(r[iFte]),
      comboCode:           str(r[iCombo]),
      employeeJobCode:     str(r[iEmpJC]),
      _row:                headerRow + i + 1,
    });
  }

  return results;
}
