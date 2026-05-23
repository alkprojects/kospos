/**
 * OBI BI Payroll report importer.
 *
 * All paid amounts YTD. Source-agnostic — sniffs headers, not filename,
 * so this works whether the source is OBI or the future Snowflake replacement.
 * See docs/data-sources/obi.md and docs/DECISIONS.md ADR-007.
 * Column names are documented assumptions — Alex must verify against a real export.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { ObiPayrollRow } from './types';

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function importObiPayroll(ws: WorkSheet, headerRow = 0): ObiPayrollRow[] {
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());

  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const iDept       = col('department code');
  const iDeptName   = col('department name');
  const iPos        = col('position number');
  const iEmplId     = col('empl id');
  const iName       = col('employee name');
  const iJC         = col('job code');
  const iAcct       = col('account code');
  const iFund       = col('fund');
  const iAuth       = col('authority');
  const iYtdSal     = col('ytd salary');
  const iYtdBen     = col('ytd benefits');
  const iYtdTotal   = col('ytd total');
  const iFY         = col('fiscal year');
  const iPeriod     = col('report period');

  const results: ObiPayrollRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const emplId = str(r[iEmplId]);
    if (!emplId) continue;

    results.push({
      _source: 'obi-payroll',
      departmentCode: str(r[iDept]),
      departmentName: str(r[iDeptName]),
      positionNumber: str(r[iPos]),
      emplId,
      employeeName:   str(r[iName]),
      jobCode:        str(r[iJC]),
      accountCode:    str(r[iAcct]),
      fund:           str(r[iFund]),
      authority:      str(r[iAuth]),
      ytdSalary:      num(r[iYtdSal]),
      ytdBenefits:    num(r[iYtdBen]),
      ytdTotal:       num(r[iYtdTotal]),
      fiscalYear:     str(r[iFY]),
      reportPeriod:   str(r[iPeriod]),
      _row:           headerRow + i + 1,
    });
  }

  return results;
}
