/**
 * Build Position entities from PS HCM P&P rows + the dept tree.
 *
 * Inputs:
 *   - rows: `PsHcmPpRow[]` from `lib/importers/ps-hcm-pp.ts`
 *   - deptTree: `DeptTree` instance from `lib/reference/dept-tree/`
 *   - userNotes: `Map<positionId, string>` — looked up by normalized id
 *
 * Output: one `Position` per unique position-number key (normalized).
 *
 * Manager-name resolution: for each Position with a `reportsToPosition`,
 * we look up that position in the same input set to attach the parent's
 * current incumbent first/last name. The workbook does this with XLOOKUP on
 * AL/AM and lives with the snapshot in time — we do the same in a single
 * pass (O(n)) and don't follow the chain further (no transitive walk).
 *
 * Multi-row positions: if the source file has duplicate position numbers
 * (real-world possibility per labor-report.md), we keep the first occurrence
 * and ignore the rest. The Position entity is per-position, not per-row.
 */

import type { PsHcmPpRow } from '../importers/types';
import type { DeptTree, DepartmentNode } from '../reference/dept-tree';
import { normalizePositionKey } from '../chartfields/resolve';
import type {
  Position,
  DepartmentRef,
  Appointment,
  Cat1718Tracking,
  ComboOverride,
  ReportsTo,
  RtfStatus,
  ViceInfo,
} from './types';

function deptRef(
  code: string,
  name: string,
  tree: DeptTree,
  asOf?: string,
): DepartmentRef {
  if (!code) return { code: '', name: name ?? '', node: null, hierarchy: [] };
  const node = tree.lookup(code, asOf);
  const hierarchy = node ? tree.hierarchy(code, asOf) : [];
  // Prefer the tree's description when present (it's the citywide source of
  // truth). Fall back to the row's own description when the code is unknown.
  const resolvedName = node?.description ?? name ?? '';
  return { code, name: resolvedName, node, hierarchy };
}

function buildAppointment(row: PsHcmPpRow): Appointment | undefined {
  // Vacant position when no incumbent.
  if (!row.emplId) return undefined;

  const appointment: Appointment = {
    emplId: row.emplId,
    name: row.employeeName,
    status: row.employeeStatus,
    type: row.appointmentType,
    exemptCategory: row.exemptCategory,
    jobCode: row.employeeJobCode,
    salaryStep: row.salaryStep,
    hourlyRate: row.hourlyRate,
    meritIncreaseDate: row.meritIncreaseDate,
  };

  if (row.cat1718ExemptCode === '17' || row.cat1718ExemptCode === '18') {
    const cat: Cat1718Tracking = {
      category: row.cat1718ExemptCode,
      appointmentDate: row.cat1718AppointmentDate,
      months: row.cat1718ExemptMonths,
      expiredDate: row.cat1718TxExpiredDate,
    };
    appointment.cat1718 = cat;
  }

  return appointment;
}

function buildVice1(row: PsHcmPpRow): ViceInfo | undefined {
  if (!row.vice1EmplId && !row.vice1Name) return undefined;
  return { emplId: row.vice1EmplId, name: row.vice1Name };
}

function buildRtf(row: PsHcmPpRow): RtfStatus | undefined {
  if (!row.rtfId && !row.rtfStatus && !row.rtfExpectedFillDate) return undefined;
  return {
    id: row.rtfId,
    status: row.rtfStatus,
    submittedDate: row.rtfSubmittedDate,
    expectedFillDate: row.rtfExpectedFillDate,
  };
}

function buildCombo(row: PsHcmPpRow, tree: DeptTree, asOf?: string): ComboOverride | undefined {
  if (!row.comboCode) return undefined;
  return {
    code: row.comboCode,
    department: deptRef(row.comboDepartmentCode, row.comboDepartmentName, tree, asOf),
  };
}

export interface BuildPositionsOptions {
  /** asOf date for dept-tree lookups; defaults to snapshot date on each row. */
  asOf?: string;
  /** Free-text notes keyed by normalized position id. */
  userNotes?: Map<string, string>;
}

export function buildPositions(
  rows: PsHcmPpRow[],
  tree: DeptTree,
  opts: BuildPositionsOptions = {},
): Position[] {
  // First pass: resolve manager names via a position-number → row map.
  const byId = new Map<string, PsHcmPpRow>();
  for (const row of rows) {
    const id = normalizePositionKey(row.positionNumber);
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, row);
  }

  // Second pass: build entities.
  const positions: Position[] = [];
  for (const [id, row] of byId.entries()) {
    const asOf = opts.asOf ?? row.snapshotDate;

    let reportsTo: ReportsTo | undefined;
    if (row.reportsToPosition) {
      const parentRow = byId.get(normalizePositionKey(row.reportsToPosition));
      reportsTo = {
        positionNumber: row.reportsToPosition,
        // Prefer the row's own manager name fields (P&P col AL/AM already
        // resolve to the parent's incumbent in the OBI export). If those
        // are missing but the parent row IS in the snapshot, fall back to
        // the parent's name fields.
        managerFirstName: row.managerFirstName || parentRow?.employeeName.split(',')[1]?.trim() || '',
        managerLastName:  row.managerLastName  || parentRow?.employeeName.split(',')[0]?.trim() || '',
      };
    }

    const note = opts.userNotes?.get(id) ?? '';

    positions.push({
      id,
      displayNumber: row.positionNumber,
      jobCode: row.jobCode,
      jobCodeDescription: row.jobCodeDescription,
      positionStatus: row.positionStatus,
      fillStatus: row.fillStatus,
      maxHeadcount: row.positionMaxHeadcount,
      effectiveDept: deptRef(row.departmentCode, row.departmentName, tree, asOf),
      budgetedDept:  deptRef(row.budgetDepartmentCode, row.budgetDepartmentName, tree, asOf),
      comboOverride: buildCombo(row, tree, asOf),
      positionDivision: row.positionDivision,
      fte: row.fte,
      budgetJobCode: row.budgetJobCode,
      snapshotDate: row.snapshotDate,
      vacantDate: row.vacantDate,
      appointment: buildAppointment(row),
      vice1: buildVice1(row),
      previousEmployee: row.previousEmployee,
      reportsTo,
      rtf: buildRtf(row),
      roster: { code: row.rosterCode, description: row.rosterDescription },
      userNotes: note,
      sourceRow: row._row,
    });
  }

  // Stable sort by position display number (numeric-aware) for deterministic
  // output and to match workbook ordering convention.
  positions.sort((a, b) =>
    a.displayNumber.localeCompare(b.displayNumber, undefined, { numeric: true }),
  );
  return positions;
}

/**
 * Convenience: detect when effectiveDept and budgetedDept disagree. Surfaces
 * the "employee moved but no combo code added" data issue mentioned in
 * labor-report.md § Department-code semantics step 2.
 */
export function hasDeptMismatch(p: Position): boolean {
  // No mismatch concept if either side is unknown.
  if (!p.effectiveDept.code || !p.budgetedDept.code) return false;
  if (p.effectiveDept.code === p.budgetedDept.code) return false;
  // The mismatch is only "interesting" when there's no combo override —
  // an override is the documented way to redirect posting after a move.
  if (p.comboOverride && p.comboOverride.department.code === p.budgetedDept.code) return false;
  return true;
}

/** Re-exports for convenience. */
export type { DepartmentNode };
