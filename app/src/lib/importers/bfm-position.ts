/**
 * BFM eturns — Position rows importer.
 *
 * See docs/data-sources/bfm.md and docs/DECISIONS.md ADR-004.
 * Column names are documented assumptions — Alex must verify against a real export.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { BfmPositionRow } from './types';

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

export function importBfmPosition(ws: WorkSheet, headerRow = 0): BfmPositionRow[] {
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
  const iPos      = col('position number');
  const iJC       = col('job code');
  const iJCDesc   = col('job code description');
  const iStatus   = col('position status');
  const iFte      = col('fte');
  const iSal      = col('budgeted salary');
  const iFund     = col('fund');
  const iAuth     = col('authority');
  const iFY       = col('fiscal year');

  const results: BfmPositionRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posNum = str(r[iPos]);
    if (!posNum) continue; // skip blank rows

    results.push({
      _source: 'bfm-position',
      departmentCode:    str(r[iDept]),
      departmentName:    str(r[iDeptName]),
      positionNumber:    posNum,
      jobCode:           str(r[iJC]),
      jobCodeDescription: str(r[iJCDesc]),
      positionStatus:    str(r[iStatus]),
      fte:               num(r[iFte]),
      budgetedSalary:    num(r[iSal]),
      fund:              str(r[iFund]),
      authority:         str(r[iAuth]),
      fiscalYear:        str(r[iFY]),
      _row:              headerRow + i + 1,
    });
  }

  return results;
}
