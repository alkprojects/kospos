/**
 * Position entity — the spine.
 *
 * A Position is a budgeted slot in PS HCM (has a Position Number, Job Code,
 * Department, Reports-To). It lives whether filled or vacant; its incumbent
 * (Employee) can change over time. The three department concepts (budgeted /
 * effective / combo) are modeled explicitly per labor-report.md § Tab 6
 * "Department-code semantics" so KosPos can surface mismatches as data
 * issues instead of hiding them in a single conflated field.
 *
 * Inputs: `PsHcmPpRow[]` from `lib/importers/ps-hcm-pp.ts` + a `DeptTree`
 * reference from `lib/reference/dept-tree/`.
 *
 * Output: one `Position` per unique position-number key (normalized via
 * `lib/chartfields/resolve.ts:normalizePositionKey` so the spine joins
 * cleanly with BFM + OBI rows).
 */

import type { DepartmentNode } from '../reference/dept-tree';

/** Department reference: the bare PS code + name + (optional) hierarchy from the tree. */
export interface DepartmentRef {
  code: string;
  name: string;
  /** Tree lookup result; null when the code wasn't in the loaded dept tree. */
  node: DepartmentNode | null;
  /**
   * Chain from this dept up to the root dept-group. Empty when `node` is
   * null (unknown code). Otherwise: [self, ..., root].
   */
  hierarchy: DepartmentNode[];
}

/** Cat 17 / Cat 18 time-limited tracking — see [memory cat-16-17-18-rules.md]. */
export interface Cat1718Tracking {
  /** "17" | "18" — undefined when the position isn't Cat 17/18. */
  category: '17' | '18';
  /** Appointment-start date (P&P col AV). */
  appointmentDate: string;
  /** Months allowed (P&P col AX). Typically 24 for Cat 17, 36 for Cat 18. */
  months: number;
  /** TX expiration (P&P col AY). The actual end-date the workbook uses. */
  expiredDate: string;
}

/** Acting / vice — Position-Used-For pattern see Tab 6 § Vice / acting. */
export interface ViceInfo {
  emplId: string;
  name: string;
}

export interface Appointment {
  emplId: string;
  name: string;
  /** "A" active / "L" leave / blank-for-vacant. */
  status: string;
  /** PCS / PEX / TEX / TPV / ELC / blank-for-vacant. */
  type: string;
  /** Charter §10.104 subsection description (e.g., "18 Special Proj - Limited Term"). */
  exemptCategory: string;
  /** When the incumbent's job code differs from the position's (acting). */
  jobCode: string;
  salaryStep: string;
  hourlyRate: number;
  meritIncreaseDate: string;
  cat1718?: Cat1718Tracking;
}

export interface ReportsTo {
  /** Parent position number; '' when this is a top-of-tree position. */
  positionNumber: string;
  /** Resolved manager name (from the parent position's current incumbent). */
  managerFirstName: string;
  managerLastName: string;
}

export interface RtfStatus {
  id: string;
  status: string;
  submittedDate: string;
  expectedFillDate: string;
}

export interface ComboOverride {
  /** Combo code string (e.g., "DBII1") — non-empty means there IS an override. */
  code: string;
  /** Combo-CD dept (from cols BD/BE). */
  department: DepartmentRef;
}

export interface RosterRef {
  code: string;
  description: string;
}

/**
 * One Position. The spine entity. Every per-tab view that lists or filters
 * positions joins through this type.
 */
export interface Position {
  /** Normalized join key (leading zeros stripped). */
  id: string;
  /** Original display form (e.g. preserves "00010001" zero-padding). */
  displayNumber: string;
  jobCode: string;
  jobCodeDescription: string;

  /** Position-level "regular" vs "temporary"; not the appointment type. */
  positionStatus: string;
  fillStatus: string;
  maxHeadcount: number;

  /** ----------------------------------------------------------------------
   * The three department concepts — distinct per labor-report.md § Tab 6.
   * ---------------------------------------------------------------------- */

  /** Effective (where-the-employee-works) department. From P&P col G. */
  effectiveDept: DepartmentRef;
  /** Budgeted (locked-at-adoption) department. From P&P col CB. */
  budgetedDept: DepartmentRef;
  /** Combo override, when set (col BB/BD). Absent = posts to budgeted defaults. */
  comboOverride?: ComboOverride;

  /** DBI-only text label preserved for parity (col F). */
  positionDivision: string;

  fte: number;
  budgetJobCode: string;

  /** Snapshot date this position came from. */
  snapshotDate: string;
  vacantDate: string;

  /** ----------------------------------------------------------------------
   * People + acting linkage
   * ---------------------------------------------------------------------- */
  appointment?: Appointment;
  vice1?: ViceInfo;
  previousEmployee: string;
  reportsTo?: ReportsTo;

  /** ----------------------------------------------------------------------
   * RTF + roster (operational fields)
   * ---------------------------------------------------------------------- */
  rtf?: RtfStatus;
  roster: RosterRef;

  /** ----------------------------------------------------------------------
   * User notes — free-text per Position, per [memory feedback_user_notes_per_position.md].
   * Persisted separately (lib/positions/notes.ts) so notes survive snapshot
   * replacements. Mirrored onto the Position record at build time for read.
   * ---------------------------------------------------------------------- */
  userNotes: string;

  /** Row index in the source sheet (1-based). */
  sourceRow: number;
}
