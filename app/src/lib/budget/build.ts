/**
 * Build BudgetSnapshots + per-position cube from BFM Position eturn rows.
 *
 * Grouping key: `(fiscalYear, asOfDate, budgetPhase)`. Each eturn row carries
 * all FYs simultaneously (FY-this + FY-plus-one columns coexist); the
 * snapshot picks one (FY, phase) lens. Multiple lenses on the same imported
 * rows are cheap — call `buildBudgetSnapshots` again with a different
 * `lens` argument.
 *
 * The cube preserves every phase layer on every position so a UI can switch
 * lenses ("Mayor view" vs "Board view") without re-importing. The scalar
 * `budget` exposed in `BudgetVsActual` is the layer for `budgetPhase`.
 */

import type { BfmPositionRow } from '../importers/types';
import { normalizePositionKey } from '../chartfields/resolve';
import type {
  BfmBudgetPhase,
  BudgetSnapshot,
  BudgetVsActual,
  PositionBudget,
} from './types';

/** Default precedence — earlier = more-advanced. Matches the importer. */
const DEFAULT_PHASE_ORDER: readonly BfmBudgetPhase[] = [
  'Board',
  'TechnicalAdjustment',
  'Committee',
  'Mayor',
  'Department',
  'Base',
  'Original',
];

export interface BuildLens {
  /**
   * Which FY label to look through (e.g. "FY 2025-26"). When omitted, the
   * importer's `defaultFiscalYear` is used; if rows disagree on the
   * default (shouldn't happen in a single eturn but rows may have different
   * column sets), the most-common label wins.
   */
  fiscalYear?: string;
  /**
   * Which phase to expose as the scalar `budgetedSalary` / `fte`. When
   * omitted, the most-advanced phase that has non-zero dollars on the
   * majority of rows wins per `DEFAULT_PHASE_ORDER`.
   */
  budgetPhase?: BfmBudgetPhase;
  /** Caller-supplied import timestamp. Defaults to "" (UI shows "—"). */
  asOfDate?: string;
}

function pickConsensusFy(rows: BfmPositionRow[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.defaultFiscalYear) continue;
    counts.set(r.defaultFiscalYear, (counts.get(r.defaultFiscalYear) ?? 0) + 1);
  }
  let best = '';
  let bestCount = -1;
  for (const [fy, c] of counts) {
    if (c > bestCount) { best = fy; bestCount = c; }
  }
  return best;
}

function pickConsensusPhase(rows: BfmPositionRow[], fy: string): BfmBudgetPhase {
  // For each candidate phase in precedence order, count how many rows have
  // a non-zero (fte || dollars) cell at that phase. The first phase whose
  // count is non-zero wins.
  for (const phase of DEFAULT_PHASE_ORDER) {
    let n = 0;
    for (const r of rows) {
      const layer = r.budgetByFy[fy]?.[phase];
      if (layer && (layer.fte !== 0 || layer.dollars !== 0)) n++;
    }
    if (n > 0) return phase;
  }
  // No non-zero phase anywhere — fall back to Board so the lens is named.
  return 'Board';
}

function emptyBudget(positionId: string, displayNumber: string, phase: BfmBudgetPhase): PositionBudget {
  return {
    positionId,
    displayNumber,
    resolvedPhase: phase,
    fte: 0,
    budgetedSalary: 0,
    byPhase: {},
    fund: '',
    fundTitle: '',
    authority: '',
    authorityTitle: '',
    project: '',
    projectTitle: '',
    activity: '',
    activityTitle: '',
    jobCode: '',
    jobCodeDescription: '',
    departmentCode: '',
    departmentName: '',
  };
}

/**
 * Build one BudgetSnapshot at the given lens. Rows that don't carry the
 * requested FY are skipped (rather than zeroed) so a downstream UI can
 * surface "this FY isn't in the loaded eturn" cleanly via `rowCount === 0`.
 */
export function buildBudgetSnapshot(
  rows: BfmPositionRow[],
  lens: BuildLens = {},
): BudgetSnapshot {
  // Keep only BFM Position rows (defensive — callers may pass mixed sources).
  const bfmRows = rows.filter(r => r._source === 'bfm-position') as BfmPositionRow[];

  const fy = lens.fiscalYear ?? pickConsensusFy(bfmRows);
  const phase: BfmBudgetPhase = lens.budgetPhase ?? pickConsensusPhase(bfmRows, fy);

  const byPosition = new Map<string, PositionBudget>();
  let totalFte = 0;
  let totalBudgeted = 0;
  let rowCount = 0;

  for (const r of bfmRows) {
    const layers = r.budgetByFy[fy];
    if (!layers) continue; // FY not present on this row
    const layer = layers[phase];
    const key = normalizePositionKey(r.positionNumber);
    if (!key) continue;

    rowCount += 1;
    let pb = byPosition.get(key);
    if (!pb) {
      pb = emptyBudget(key, r.positionNumber, phase);
      pb.fund               = r.fund;
      pb.fundTitle          = r.fundTitle;
      pb.authority          = r.authority;
      pb.authorityTitle     = r.authorityTitle;
      pb.project            = r.project;
      pb.projectTitle       = r.projectTitle;
      pb.activity           = r.activity;
      pb.activityTitle      = r.activityTitle;
      pb.jobCode            = r.jobCode;
      pb.jobCodeDescription = r.jobCodeDescription;
      pb.departmentCode     = r.departmentCode;
      pb.departmentName     = r.departmentName;
      // Copy the whole layer set so callers can switch phase without
      // re-walking the source rows.
      pb.byPhase = { ...layers };
      byPosition.set(key, pb);
    } else {
      // Multiple rows per position can happen when a position splits across
      // chartfields; sum FTE + dollars on both the scalar and the per-phase
      // layers so the snapshot reflects the total.
      pb.byPhase = mergeLayers(pb.byPhase, layers);
    }

    if (layer) {
      pb.fte             += layer.fte;
      pb.budgetedSalary  += layer.dollars;
      totalFte           += layer.fte;
      totalBudgeted      += layer.dollars;
    }
  }

  return {
    fiscalYear:          fy,
    asOfDate:            lens.asOfDate ?? '',
    budgetPhase:         phase,
    rowCount,
    totalBudgetedSalary: totalBudgeted,
    totalFte,
    byPosition,
    rows:                bfmRows,
  };
}

/**
 * Sum two layer sets pairwise. Used when a position has multiple rows in
 * the eturn (split-funded across chartfields). Missing phases pass through.
 */
function mergeLayers(
  a: import('./types').BfmBudgetLayers,
  b: import('./types').BfmBudgetLayers,
): import('./types').BfmBudgetLayers {
  const out: import('./types').BfmBudgetLayers = { ...a };
  for (const k of Object.keys(b) as BfmBudgetPhase[]) {
    const av = a[k];
    const bv = b[k]!;
    if (av) {
      out[k] = { fte: av.fte + bv.fte, dollars: av.dollars + bv.dollars };
    } else {
      out[k] = { ...bv };
    }
  }
  return out;
}

/**
 * Convenience: compute the variance line for one position given a budget
 * (from BudgetSnapshot.byPosition) and an actuals number (from
 * PayrollSnapshot.byPosition).
 */
export function computeBudgetVsActual(positionId: string, budget: number, actual: number): BudgetVsActual {
  const variance = actual - budget;
  const variancePct = budget !== 0 ? variance / budget : null;
  const direction: BudgetVsActual['direction'] =
    variance > 0 ? 'over' : variance < 0 ? 'under' : 'on';
  return { positionId, budget, actual, variance, variancePct, direction };
}

/**
 * Returns the snapshot with the highest asOfDate. When multiple snapshots
 * share the same asOfDate, the latest fiscalYear within them wins. Returns
 * null on empty input.
 */
export function pickLatestBudgetSnapshot(snapshots: BudgetSnapshot[]): BudgetSnapshot | null {
  if (snapshots.length === 0) return null;
  let latest = snapshots[0];
  for (const s of snapshots) {
    if (
      s.asOfDate > latest.asOfDate ||
      (s.asOfDate === latest.asOfDate && s.fiscalYear > latest.fiscalYear)
    ) {
      latest = s;
    }
  }
  return latest;
}
