/**
 * BFM eturns — Non-position rows importer.
 *
 * Reads "Chart of Account Details" / "Nonpos" sheet from 15.10.001.
 * Column names verified against real DBI exports (May 2026).
 * See docs/DECISIONS.md ADR-005.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type { BfmNonPositionRow } from './types';
import { num, str, makeColLookup } from './cells';

const PHASE_ORDER = ['Board', 'Mayor', 'Committee', 'Department', 'Base'] as const;

/**
 * Picks the most-advanced approved budget dollar column:
 * "FY YYYY-YY <Phase>" (no "FTE" suffix).
 */
function pickBudgetColumn(
  headers: string[],
  rawHeaders: string[],
): { idx: number; label: string } | null {
  type Candidate = { year: number; rank: number; idx: number; label: string };
  const candidates: Candidate[] = [];

  for (let i = 0; i < headers.length; i++) {
    // Match "FY YYYY-YY Phase" but NOT "FY YYYY-YY Phase FTE"
    const m = headers[i].match(/^fy\s+(\d{4})-\d{2}\s+(board|mayor|committee|department|base)$/i);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const phase = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    const rank = PHASE_ORDER.indexOf(phase as typeof PHASE_ORDER[number]);
    if (rank === -1) continue;
    candidates.push({ year, rank, idx: i, label: rawHeaders[i] });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.year - a.year || a.rank - b.rank);
  return { idx: candidates[0].idx, label: candidates[0].label };
}

export function importBfmNonPosition(ws: WorkSheet, headerRow = 0): BfmNonPositionRow[] {
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const rawHeaders = (rows[0] as unknown[]).map(h => str(h));
  const headers = rawHeaders.map(h => h.toLowerCase());

  const col = makeColLookup(headers);

  const iGFS      = col('gfs type');
  const iDept     = col('dept id');
  const iDeptName = col('dept id title');
  const iAcct     = col('account');
  const iAcctDesc = col('account title');
  const iAcctCat  = col('account lvl 5 title');
  const iFund     = col('fund');
  const iAuth     = col('authority');
  const iProj     = col('project');
  const iAct      = col('activity');

  const budget = pickBudgetColumn(headers, rawHeaders);
  const iBudget    = budget?.idx ?? -1;
  const phaseLabel = budget?.label ?? '';

  const results: BfmNonPositionRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const acct = str(r[iAcct]);
    if (!acct) continue;

    results.push({
      _source: 'bfm-non-position',
      gfsType:            str(r[iGFS]),
      departmentCode:     str(r[iDept]),
      departmentName:     str(r[iDeptName]),
      accountCode:        acct,
      accountDescription: str(r[iAcctDesc]),
      accountCategory:    str(r[iAcctCat]),
      fund:               str(r[iFund]),
      authority:          str(r[iAuth]),
      project:            str(r[iProj]),
      activity:           str(r[iAct]),
      budgetAmount:       iBudget >= 0 ? num(r[iBudget]) : 0,
      budgetPhaseColumn:  phaseLabel,
      _row:               headerRow + i + 1,
    });
  }

  return results;
}
