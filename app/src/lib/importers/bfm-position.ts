/**
 * BFM eturns — Position rows importer.
 *
 * Reads the "By Position#" / "Pos" sheet from 15.10.006.
 * Column names verified against real DBI exports (May 2026).
 * See docs/DECISIONS.md ADR-004.
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

const PHASE_ORDER = ['Board', 'Mayor', 'Committee', 'Department', 'Base'] as const;

/**
 * Scans headers for "FY YYYY-YY <Phase> FTE" columns and returns the
 * indices for the most-advanced phase of the latest fiscal year found.
 */
function pickBudgetColumns(
  headers: string[],
  rawHeaders: string[],
): { fteCol: number; salaryCol: number; label: string } | null {
  type Candidate = { year: number; rank: number; fteIdx: number; salaryIdx: number; label: string };
  const candidates: Candidate[] = [];

  for (let i = 0; i < headers.length; i++) {
    const m = headers[i].match(/^fy\s+(\d{4})-\d{2}\s+(board|mayor|committee|department|base)\s+fte$/i);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const phase = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    const rank = PHASE_ORDER.indexOf(phase as typeof PHASE_ORDER[number]);
    if (rank === -1) continue;
    // Salary column has the same name minus " FTE"
    const salaryLabel = headers[i].replace(/\s+fte$/i, '').trim();
    const salaryIdx = headers.findIndex(h => h === salaryLabel);
    if (salaryIdx === -1) continue;
    candidates.push({ year, rank, fteIdx: i, salaryIdx, label: rawHeaders[i] });
  }

  if (candidates.length === 0) return null;
  // Latest year wins; within same year, lowest rank (Board=0) wins
  candidates.sort((a, b) => b.year - a.year || a.rank - b.rank);
  const best = candidates[0];
  return { fteCol: best.fteIdx, salaryCol: best.salaryIdx, label: best.label };
}

export function importBfmPosition(ws: WorkSheet, headerRow = 0): BfmPositionRow[] {
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const rawHeaders = (rows[0] as unknown[]).map(h => str(h));
  const headers = rawHeaders.map(h => h.toLowerCase());

  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const iPos      = col('by hcm position#');
  const iPrior    = col('prior budget hcm position#');
  const iDept     = col('dept id');
  const iDeptName = col('dept id title');
  const iJC       = col('job class');
  const iJCDesc   = col('job class title');
  const iEmpOrg   = col('emp org');
  const iRet      = col('ret indicator');
  const iStatus   = col('status');
  const iFund     = col('fund');
  const iAuth     = col('authority');
  const iProj     = col('project');
  const iAct      = col('activity');
  const iFYStart  = col('fiscal year start');

  const budget = pickBudgetColumns(headers, rawHeaders);
  const iFte     = budget?.fteCol ?? -1;
  const iSal     = budget?.salaryCol ?? -1;
  const phaseLabel = budget?.label ?? '';

  const results: BfmPositionRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posNum = str(r[iPos]);
    if (!posNum) continue;

    results.push({
      _source: 'bfm-position',
      positionNumber:      posNum,
      priorPositionNumber: str(r[iPrior]),
      departmentCode:      str(r[iDept]),
      departmentName:      str(r[iDeptName]),
      jobCode:             str(r[iJC]),
      jobCodeDescription:  str(r[iJCDesc]),
      empOrg:              str(r[iEmpOrg]),
      retIndicator:        str(r[iRet]),
      positionStatus:      str(r[iStatus]),
      fund:                str(r[iFund]),
      authority:           str(r[iAuth]),
      project:             str(r[iProj]),
      activity:            str(r[iAct]),
      fte:                 iFte >= 0 ? num(r[iFte]) : 0,
      budgetedSalary:      iSal >= 0 ? num(r[iSal]) : 0,
      budgetPhaseColumn:   phaseLabel,
      fiscalYearStart:     str(r[iFYStart]),
      _row:                headerRow + i + 1,
    });
  }

  return results;
}
