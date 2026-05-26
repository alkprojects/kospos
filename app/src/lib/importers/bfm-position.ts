/**
 * BFM eturns — Position rows importer (Phase 2.2.13 — "full" shape).
 *
 * Reads the "By Position#" / "Pos" sheet from 15.10.006. The real eturn
 * carries 64 columns (A:BL) per labor-report.md § Tab 4. This importer:
 *
 *   1. Captures every position-metadata + chartfield + date column.
 *   2. Discovers every "FY YYYY-YY <Phase>" budget layer present on the
 *      sheet and stores them as a per-FY map of phase → {fte, dollars} on
 *      each row. Prior-FY Original (e.g. "FY 2024-25 Original") shows up
 *      with just `Original` populated.
 *   3. Resolves a default anchor (`defaultFiscalYear`, `defaultPhase`) from
 *      that map per the precedence Board > TechAdj > Committee > Mayor >
 *      Department > Base > Original, picking the latest FY first. The
 *      anchor backs the back-compat `fte` / `budgetedSalary` scalars.
 *
 * Column names verified against real DBI eturn exports (May 2026).
 * See docs/DECISIONS.md ADR-004 and docs/data-sources/bfm.md.
 */

import type { WorkSheet } from 'xlsx';
import { utils } from 'xlsx';
import type {
  BfmBudgetLayer,
  BfmBudgetLayers,
  BfmBudgetPhase,
  BfmPositionRow,
} from './types';

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

/** Phase ranking — earlier = more-advanced (used when a tie exists). */
const PHASE_ORDER: readonly BfmBudgetPhase[] = [
  'Board',
  'TechnicalAdjustment',
  'Committee',
  'Mayor',
  'Department',
  'Base',
  'Original',
];

/**
 * Map raw phase tokens (as they appear in the eturn column header) to the
 * typed `BfmBudgetPhase`. The eturn uses "Technical Adjustment" with a
 * space; we collapse it to TechnicalAdjustment.
 */
function phaseFromToken(raw: string): BfmBudgetPhase | null {
  const t = raw.trim().toLowerCase();
  if (t === 'board') return 'Board';
  if (t === 'technical adjustment') return 'TechnicalAdjustment';
  if (t === 'committee') return 'Committee';
  if (t === 'mayor') return 'Mayor';
  if (t === 'department') return 'Department';
  if (t === 'base') return 'Base';
  if (t === 'original') return 'Original';
  return null;
}

interface PhaseColumnRef {
  /** "FY 2025-26" */
  fyLabel: string;
  phase: BfmBudgetPhase;
  fteCol: number;
  dollarsCol: number;
  /** The raw FTE header used to label this layer in display (e.g. "FY 2025-26 Board FTE"). */
  fteHeader: string;
}

/**
 * Scans the header row for every "FY YYYY-YY <phase>" pair (FTE + Dollars)
 * and returns one PhaseColumnRef per pair found. Headers come in two parts:
 * "FY 2025-26 Board FTE" + "FY 2025-26 Board". We match the FTE header
 * first, then look up the dollars column with the suffix stripped.
 */
function discoverPhaseColumns(headers: string[]): PhaseColumnRef[] {
  const out: PhaseColumnRef[] = [];
  // Capture: ("FY 2025-26") (phase tokens up to " FTE")
  const re = /^(fy\s+\d{4}-\d{2})\s+(.+?)\s+fte$/i;
  for (let i = 0; i < headers.length; i++) {
    const m = headers[i].match(re);
    if (!m) continue;
    const phase = phaseFromToken(m[2]);
    if (!phase) continue;
    const dollarsHeader = headers[i].replace(/\s+fte$/i, '').trim();
    const dollarsCol = headers.findIndex(h => h.toLowerCase() === dollarsHeader.toLowerCase());
    if (dollarsCol === -1) continue;
    out.push({
      fyLabel: m[1].replace(/\s+/g, ' '),
      phase,
      fteCol: i,
      dollarsCol,
      fteHeader: headers[i],
    });
  }
  return out;
}

/**
 * Given a per-row map of FY → layers, pick the (FY, phase) anchor we
 * default to. Latest FY wins; within an FY, the most-advanced phase that
 * has non-zero dollars wins. A non-zero dollars check matters because the
 * eturn carries "future" FY columns with all-zeros until that phase
 * actually opens — without the check the anchor would land on Board $0
 * mid-cycle when only Base + Department are populated.
 */
function pickDefaultAnchor(
  layers: Record<string, BfmBudgetLayers>,
): { fy: string; phase: BfmBudgetPhase } | null {
  const fyLabels = Object.keys(layers).sort(); // ascending
  for (let i = fyLabels.length - 1; i >= 0; i--) {
    const fy = fyLabels[i];
    const present = layers[fy];
    for (const phase of PHASE_ORDER) {
      const layer = present[phase];
      if (layer && (layer.dollars !== 0 || layer.fte !== 0)) {
        return { fy, phase };
      }
    }
  }
  // Nothing non-zero — pick the most-advanced phase of the latest FY that
  // exists at all, so the row still has a non-empty `budgetPhaseColumn`.
  for (let i = fyLabels.length - 1; i >= 0; i--) {
    const fy = fyLabels[i];
    const present = layers[fy];
    for (const phase of PHASE_ORDER) {
      if (present[phase]) return { fy, phase };
    }
  }
  return null;
}

export function importBfmPosition(ws: WorkSheet, headerRow = 0): BfmPositionRow[] {
  const rows = utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    range: headerRow,
    defval: '',
  }) as unknown[][];

  if (rows.length < 2) return [];

  const rawHeaders = (rows[0] as unknown[]).map(h => str(h));
  const headersLc = rawHeaders.map(h => h.toLowerCase());

  const col = (name: string) => headersLc.indexOf(name.toLowerCase());

  // Identity
  const iPos      = col('by hcm position#');
  const iPrior    = col('prior budget hcm position#');
  const iPosCode  = col('position code');
  const iPriorPosCode = col('prior budget position code');
  const iFormId   = col('formid');

  // Dept tree
  const iDeptGrp  = col('dept grp');
  const iDiv      = col('division');
  const iDivTitle = col('division title');
  const iSec      = col('section');
  const iSecTitle = col('section title');
  const iGfs      = col('gfs type');
  const iDept     = col('dept id');
  const iDeptName = col('dept id title');

  // Chartfields
  const iFund      = col('fund');
  const iFundTitle = col('fund title');
  const iAuth      = col('authority');
  const iAuthTitle = col('authority title');
  const iProj      = col('project');
  const iProjTitle = col('project title');
  const iAct       = col('activity');
  const iActTitle  = col('activity title');
  const iAcctLvl5  = col('account lvl 5 title');
  const iAgency    = col('agency use');
  const iAgencyTit = col('agency use title');

  // Job class + union
  const iJC       = col('job class');
  const iJCDesc   = col('job class title');
  const iJCTier   = col('job class tier');
  const iEmpOrg   = col('emp org');
  const iEmpOrgT  = col('emp org title');
  const iRet      = col('ret indicator');

  // Status
  const iStatus   = col('status');
  const iAction   = col('action');

  // FY span
  const iFYStart  = col('fiscal year start');
  const iPpdStart = col('ppd start');
  const iFYEnd    = col('fiscal year end');
  const iPpdEnd   = col('ppd end');

  const phaseColumns = discoverPhaseColumns(rawHeaders);

  const results: BfmPositionRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const posNum = str(r[iPos]);
    if (!posNum) continue;

    // Walk every discovered (FY, phase) cell and bucket by FY label.
    const budgetByFy: Record<string, BfmBudgetLayers> = {};
    for (const ref of phaseColumns) {
      const fte = num(r[ref.fteCol]);
      const dollars = num(r[ref.dollarsCol]);
      // Keep zero-only cells too — variance views need them to show
      // "this phase opened but hasn't been priced yet". Skip only when
      // BOTH cells are missing entirely (rare; eturn pads with 0).
      const layer: BfmBudgetLayer = { fte, dollars };
      if (!budgetByFy[ref.fyLabel]) budgetByFy[ref.fyLabel] = {};
      budgetByFy[ref.fyLabel][ref.phase] = layer;
    }

    const anchor = pickDefaultAnchor(budgetByFy);
    const fte = anchor ? budgetByFy[anchor.fy][anchor.phase]?.fte ?? 0 : 0;
    const budgetedSalary = anchor ? budgetByFy[anchor.fy][anchor.phase]?.dollars ?? 0 : 0;
    let budgetPhaseColumn = '';
    if (anchor) {
      // Reconstruct the display header from the discoverPhaseColumns ref
      // matching this anchor, so callers get the same string the eturn
      // showed (e.g. "FY 2025-26 Technical Adjustment FTE").
      const match = phaseColumns.find(
        p => p.fyLabel === anchor.fy && p.phase === anchor.phase,
      );
      budgetPhaseColumn = match?.fteHeader ?? '';
    }

    results.push({
      _source: 'bfm-position',
      // identity
      positionNumber:      posNum,
      priorPositionNumber: str(r[iPrior]),
      positionCode:        str(r[iPosCode]),
      priorPositionCode:   str(r[iPriorPosCode]),
      formId:              str(r[iFormId]),
      // dept tree
      deptGroup:           str(r[iDeptGrp]),
      division:            str(r[iDiv]),
      divisionTitle:       str(r[iDivTitle]),
      section:             str(r[iSec]),
      sectionTitle:        str(r[iSecTitle]),
      gfsType:             str(r[iGfs]),
      departmentCode:      str(r[iDept]),
      departmentName:      str(r[iDeptName]),
      // chartfields
      fund:                str(r[iFund]),
      fundTitle:           str(r[iFundTitle]),
      authority:           str(r[iAuth]),
      authorityTitle:      str(r[iAuthTitle]),
      project:             str(r[iProj]),
      projectTitle:        str(r[iProjTitle]),
      activity:            str(r[iAct]),
      activityTitle:       str(r[iActTitle]),
      accountLvl5Title:    str(r[iAcctLvl5]),
      agencyUse:           str(r[iAgency]),
      agencyUseTitle:      str(r[iAgencyTit]),
      // job class + union
      jobCode:             str(r[iJC]),
      jobCodeDescription:  str(r[iJCDesc]),
      jobClassTier:        str(r[iJCTier]),
      empOrg:              str(r[iEmpOrg]),
      empOrgTitle:         str(r[iEmpOrgT]),
      retIndicator:        str(r[iRet]),
      // status
      positionStatus:      str(r[iStatus]),
      action:              str(r[iAction]),
      // FY span
      fiscalYearStart:     str(r[iFYStart]),
      ppdStart:            str(r[iPpdStart]),
      fiscalYearEnd:       str(r[iFYEnd]),
      ppdEnd:              str(r[iPpdEnd]),
      // budget layers
      budgetByFy,
      defaultFiscalYear:   anchor?.fy ?? '',
      defaultPhase:        anchor?.phase ?? '',
      fte,
      budgetedSalary,
      budgetPhaseColumn,
      _row:                headerRow + i + 1,
    });
  }

  return results;
}
