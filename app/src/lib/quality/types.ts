import type { ImportedRow } from '../importers/types';

export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * App tab where a flagged item's underlying data lives, so the Issues view can
 * offer a "go to source" link. These MUST match tab ids in App.tsx's `Tab` union.
 */
export type SourceTabId =
  | 'positions'
  | 'labor'
  | 'data'
  | 'separations'
  | 'probation'
  | 'staffing-plan'
  | 'special-class';

/**
 * A reference backing a rule — an MOU clause, DHR guidance, Charter section, or
 * a KosPos domain doc. `href` is set only when a stable public link exists.
 */
export interface IssueCitation {
  label: string;
  href?: string;
}

export interface Issue {
  ruleId: string;
  severity: IssueSeverity;
  message: string;
  positionNumber?: string;
  emplId?: string;
  /** Source rows involved (1-based sheet row numbers). */
  sourceRows?: number[];
}

export interface QualityRule {
  id: string;
  /** Short label shown as the issue's category in the list + detail header. */
  description: string;
  /** Plain-language explanation of what the rule checks and why it matters. */
  rationale: string;
  /** Suggested correction / next step for a flagged item. */
  fix: string;
  /** Authorities backing the rule (MOU / DHR / Charter / KosPos domain docs). */
  citations: IssueCitation[];
  /** App tab(s) whose data underlies the finding, for "go to source" links. */
  sourceTabs: SourceTabId[];
  /** Receives the full set of loaded rows across all sources. */
  check(records: ImportedRow[]): Issue[];
}
