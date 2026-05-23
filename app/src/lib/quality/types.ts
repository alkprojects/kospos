import type { ImportedRow } from '../importers/types';

export type IssueSeverity = 'error' | 'warning' | 'info';

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
  description: string;
  /** Receives the full set of loaded rows across all sources. */
  check(records: ImportedRow[]): Issue[];
}
