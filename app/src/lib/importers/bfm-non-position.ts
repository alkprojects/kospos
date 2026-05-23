/**
 * BFM eturns — Non-position rows importer.
 *
 * See docs/data-sources/bfm.md and docs/DECISIONS.md ADR-005.
 * Column names are documented assumptions — Alex must verify against a real export.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { BfmNonPositionRow } from './types';

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function importBfmNonPosition(ws: WorkSheet, headerRow = 0): BfmNonPositionRow[] {
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const headers = (rows[0] as unknown[]).map(h => str(h).toLowerCase());

  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const iDept     = col('department code');
  const iDeptName = col('department name');
  const iAcct     = col('account code');
  const iAcctDesc = col('account description');
  const iFund     = col('fund');
  const iAuth     = col('authority');
  const iBudget   = col('budget amount');
  const iFY       = col('fiscal year');

  const results: BfmNonPositionRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const acct = str(r[iAcct]);
    if (!acct) continue;

    results.push({
      _source: 'bfm-non-position',
      departmentCode:    str(r[iDept]),
      departmentName:    str(r[iDeptName]),
      accountCode:       acct,
      accountDescription: str(r[iAcctDesc]),
      fund:              str(r[iFund]),
      authority:         str(r[iAuth]),
      budgetAmount:      num(r[iBudget]),
      fiscalYear:        str(r[iFY]),
      _row:              headerRow + i + 1,
    });
  }

  return results;
}
