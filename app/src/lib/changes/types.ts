/**
 * Proposed change types — see ADR-003 and docs/DECISIONS.md.
 *
 * When Change Mode is active, edits produce ProposedChange records instead of
 * mutating data directly. The change list is reviewable and discardable.
 * "Generate Change Report" outputs Excel grouped by system-of-record.
 */

/** Which system owns the field being changed. */
export type ChangeSource = 'ps-hcm' | 'bfm' | 'obi' | 'kospos';

export interface ProposedChange {
  /** Stable ID for deduplication and undo. */
  id: string;
  positionNumber: string;
  /** The field being changed, e.g. "reportsToPosition", "budgetedSalary". */
  field: string;
  from: string | number | null;
  to: string | number | null;
  /** System that owns this field and would need to be updated. */
  source: ChangeSource;
  /** ISO timestamp when the change was proposed. */
  proposedAt: string;
  /** Free-text reason supplied by the user. */
  reason?: string;
}
