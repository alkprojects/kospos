/**
 * Chartfield domain types for Phase 3.
 * Ref: docs/domain/chartfields.md
 */

// ---------------------------------------------------------------------------
// Core dimensions
// ---------------------------------------------------------------------------

/**
 * The six posting dimensions that appear on every SF financial transaction.
 * Any field may be blank — not all reports populate all six.
 */
export interface ChartfieldString {
  fund: string;
  dept: string;
  project: string;
  activity: string;
  authority: string;
  account: string;
}

// ---------------------------------------------------------------------------
// Shortcuts
// ---------------------------------------------------------------------------

/**
 * Combo Code = Fund + Dept + Authority (no Project / Activity).
 * Overrides the employee's budgeted fund/dept/authority when set on a position.
 */
export interface ComboCode {
  code: string;
  fund: string;
  dept: string;
  authority: string;
  description?: string;
}

/**
 * Task Profile = all chartfields except Account.
 * Overrides the full posting string when set on a position.
 */
export interface TaskProfile {
  code: string;
  fund: string;
  dept: string;
  project: string;
  activity: string;
  authority: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Appropriation control
// ---------------------------------------------------------------------------

/**
 * Which appropriation tree controls budget availability for an account code.
 *
 * - 'account'   — Account tree (Dept group → Fund → Account level 3/5)
 * - 'project'   — Project tree (Dept group → Fund → Project)
 * - 'authority' — Authority tree (Dept group → Fund → Authority level 1)
 * - 'labor'     — Labor actuals; always posts, ignores appropriation controls
 * - 'none'      — Work orders, reserves — controlled separately
 */
export type AppropriationLevel = 'account' | 'project' | 'authority' | 'labor' | 'none';

// ---------------------------------------------------------------------------
// Resolved position posting
// ---------------------------------------------------------------------------

/**
 * The result of joining BFM Position + HCM P&P + OBI Payroll for one position.
 * Answers the question: "where would this position's labor post?"
 */
export interface ResolvedChartfields {
  positionNumber: string;
  jobCode: string;
  jobCodeDescription: string;
  departmentCode: string;
  departmentName: string;

  /** Effective posting dimensions (BFM defaults, possibly flagged for combo override). */
  fund: string;
  authority: string;
  project: string;
  activity: string;

  /**
   * Combo code string from HCM P&P (e.g. "DBII1"), if set.
   * Indicates that Fund/Dept/Authority should come from the combo code definition
   * rather than the BFM defaults.  Null when not overridden.
   * Full expansion requires a ComboCode reference table — see ComboCode type.
   */
  comboCodeOverride: string | null;

  /** True when comboCodeOverride is set. */
  hasComboOverride: boolean;

  /** Status from HCM P&P: "Approved", "Frozen", etc. Blank if no HCM row. */
  positionStatus: string;

  /** Fill status from HCM P&P: "FILLED" / "VACANT". Blank if no HCM row. */
  fillStatus: string;

  /** FTE from BFM or HCM (BFM preferred). */
  fte: number;

  /** Sum of OBI Payroll balance amounts for this position in the loaded data. */
  ytdActuals: number;

  /** Whether BFM, HCM, or both sources contributed data for this position. */
  dataSources: Array<'bfm' | 'hcm' | 'obi'>;

  /** Human-readable posting string: "FUND / DEPT / AUTH / PROJ / ACT" */
  postingString: string;
}
