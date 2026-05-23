/**
 * OBI BI Payroll report importer.
 *
 * Per-pay-period rows — NOT a YTD summary.
 * Each row = one position × one earning code × one pay period.
 * Column names verified against real DBI exports (May 2026).
 * See docs/DECISIONS.md ADR-007.
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
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());

  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const iFY        = col('fiscal year');
  const iDept      = col('department');
  const iDeptName  = col('department description');
  const iPos       = col('position identifier');
  const iPerson    = col('person number');
  const iName      = col('person full name');
  const iJC        = col('job code');
  const iJCDesc    = col('job description');
  const iAcct      = col('account');
  const iFund      = col('fund code');
  const iAuth      = col('authority code');
  const iPeriodNum = col('earning period number');
  const iPeriodEnd = col('earning period end date');
  const iEarnCode  = col('earnings code');
  const iEarnDesc  = col('earnings code description');
  const iBalance   = col('balance amount');
  const iFte       = col('pay period fte');
  const iAppt      = col('hr assignment appointment type');

  const results: ObiPayrollRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posId = str(r[iPos]);
    if (!posId) continue;

    results.push({
      _source: 'obi-payroll',
      fiscalYear:          str(r[iFY]),
      departmentCode:      str(r[iDept]),
      departmentName:      str(r[iDeptName]),
      positionIdentifier:  posId,
      personNumber:        str(r[iPerson]),
      personFullName:      str(r[iName]),
      jobCode:             str(r[iJC]),
      jobDescription:      str(r[iJCDesc]),
      accountCode:         str(r[iAcct]),
      fund:                str(r[iFund]),
      authority:           str(r[iAuth]),
      earningPeriodNumber: num(r[iPeriodNum]),
      earningPeriodEnd:    str(r[iPeriodEnd]),
      earningsCode:        str(r[iEarnCode]),
      earningsDescription: str(r[iEarnDesc]),
      balanceAmount:       num(r[iBalance]),
      payPeriodFTE:        num(r[iFte]),
      appointmentType:     str(r[iAppt]),
      _row:                headerRow + i + 1,
    });
  }

  return results;
}
