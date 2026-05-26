/**
 * Budget domain types — the entity layer over BFM Position eturn rows.
 *
 * A `BudgetSnapshot` is one logical FY-this view of the eturn, keyed by
 * `(fiscalYear, asOfDate, budgetPhase)`. asOfDate is supplied by the caller
 * at build time (BFM eturns don't stamp a snapshot date on the rows
 * themselves — the timestamp lives in the filename and import session).
 *
 * The cube splits each position's budget into its full phase layer set so
 * variance views can compare across phases (e.g. "what changed Mayor →
 * Board?") in O(1) without re-scanning rows.
 *
 * See docs/domain/labor-report.md § Tab 4 — BFM 15.10.006 FY26 for the
 * phase taxonomy + the Board-as-canonical-anchor convention.
 */

import type {
  BfmBudgetLayer,
  BfmBudgetLayers,
  BfmBudgetPhase,
  BfmPositionRow,
} from '../importers/types';

export type { BfmBudgetLayer, BfmBudgetLayers, BfmBudgetPhase };

/**
 * Per-position budget detail at one snapshot. Holds the resolved scalar
 * pair (`fte` / `budgetedSalary` for the chosen phase) plus the full
 * `byPhase` layer set so callers can switch the lens without rebuilding.
 */
export interface PositionBudget {
  /** Normalized position key (zero-stripped, trimmed). */
  positionId: string;
  /** Original (display) form before normalization, for UI. */
  displayNumber: string;
  /** The phase the snapshot's scalar pair resolved to. */
  resolvedPhase: BfmBudgetPhase;
  /** FTE from `byPhase[resolvedPhase]`. */
  fte: number;
  /** Dollars from `byPhase[resolvedPhase]`. */
  budgetedSalary: number;
  /** All layers present for the snapshot's FY on this position. */
  byPhase: BfmBudgetLayers;
  /**
   * Chartfields off this row (from the underlying BfmPositionRow). Mirrors
   * Position Detail's existing chartfield panel — kept here so callers
   * don't need a second join.
   */
  fund: string;
  fundTitle: string;
  authority: string;
  authorityTitle: string;
  project: string;
  projectTitle: string;
  activity: string;
  activityTitle: string;
  /** Job class context (kept for chartfield-string display). */
  jobCode: string;
  jobCodeDescription: string;
  departmentCode: string;
  departmentName: string;
}

/**
 * One logical FY-of-budget view from BFM eturn. Holds the per-position
 * cube + the underlying rows.
 *
 * The "snapshot" key is `(fiscalYear, asOfDate, budgetPhase)`:
 *   - fiscalYear / budgetPhase pick which (FY, phase) layer is the lens.
 *   - asOfDate captures when the eturn was imported, so re-imports with
 *     newer eturns split into separate snapshots in history.
 */
export interface BudgetSnapshot {
  /** "FY 2025-26" — the FY this snapshot looks through. */
  fiscalYear: string;
  /** Caller-supplied (typically file mtime or today's date). */
  asOfDate: string;
  /** The phase the cube's scalar `budgetedSalary` resolved to. */
  budgetPhase: BfmBudgetPhase;
  rowCount: number;
  /** Sum of `budgetedSalary` across the cube. */
  totalBudgetedSalary: number;
  /** Sum of `fte`. */
  totalFte: number;
  /** Per-position budget detail. */
  byPosition: Map<string, PositionBudget>;
  /** Source rows (kept for drill-downs + variance views across phases). */
  rows: BfmPositionRow[];
}

/**
 * Variance line for one position: budget vs YTD actual + an arrow direction
 * for the UI to pick a color.
 */
export interface BudgetVsActual {
  positionId: string;
  budget: number;
  actual: number;
  /** actual - budget (positive = overspent). */
  variance: number;
  /** variance / budget when budget > 0; null when budget is 0. */
  variancePct: number | null;
  /** "over" when actual > budget, "under" when actual < budget, "on" when equal. */
  direction: 'over' | 'under' | 'on';
}
