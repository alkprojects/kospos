/**
 * QR-011: A position's department chartfields disagree.
 *
 * PS HCM Position & Personnel carries three department codes for a position:
 *   - `departmentCode` (col G, "Position Department ID") — where the position
 *     lives / is administered.
 *   - `budgetDepartmentCode` ("Budget Department Code 1") — the department that
 *     budgets (funds) it.
 *   - `comboDepartmentCode` ("Combo Cd Deptid") — the department a combo code
 *     redirects the position's payroll GL posting to (see memory
 *     `combo-code-task-profile`).
 *
 * Two conditions are flagged (redefined S59, per Alex's ruling — no exclusions;
 * commissioners + temps are included and cleared individually via the Issues
 * view's "mark not an error"):
 *
 *   (1) ERROR — position department != budget department. The position is
 *       administered by one department but funded by another. Often a transfer
 *       that was not fully processed, or a keying error; sometimes an
 *       intentional combo-code/task-profile funding split.
 *
 *   (2) POSSIBLE ERROR (warning) — combo department == position department.
 *       The combo code redirects payroll posting back to the position's own
 *       department, so the redirect is a no-op — a delete-combo candidate.
 *
 * Only codes that are present are compared — a blank code means "not
 * specified", not a mismatch.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const positionDeptNotBudgetDept: QualityRule = {
  id: 'QR-011',
  description: 'Position department disagrees with its budget or combo department',
  rationale:
    'PS HCM records a position’s department (col G), the department that budgets it (Budget Department Code 1), and the department a combo code redirects its payroll posting to (Combo Cd Deptid). Two things are worth a look: (a) when the position department and budget department differ, the position is administered by one department but funded by another; (b) when the combo code redirects to the position’s own department, the redirect is redundant.',
  fix:
    'For a budget mismatch, confirm the funding split is intentional (a real combo-code / task-profile redirect) or correct whichever code is wrong. For a redundant combo, consider deleting the combo code so payroll posts to the position’s own department by default. Use “mark not an error” to clear cases you have confirmed (e.g. commissioners on shared positions).',
  citations: [
    { label: 'PS HCM P&P: Position Department ID (col G) vs Budget Department Code 1 vs Combo Cd Deptid' },
    { label: 'KosPos domain: combo-code / task-profile GL posting (labor-report.md § Department-code semantics)' },
  ],
  sourceTabs: ['positions', 'data'],
  check(records: ImportedRow[]): Issue[] {
    const issues: Issue[] = [];
    for (const r of records) {
      if (r._source !== 'ps-hcm-pp') continue;
      const posDept = (r.departmentCode ?? '').trim();
      const budDept = (r.budgetDepartmentCode ?? '').trim();
      const comboDept = (r.comboDepartmentCode ?? '').trim();
      const who = r.employeeName || (r.fillStatus === 'FILLED' ? 'filled' : 'vacant');

      // (1) ERROR — administered by one department, funded by another.
      if (posDept && budDept && posDept !== budDept) {
        issues.push({
          ruleId: 'QR-011',
          severity: 'error',
          message:
            `Position ${r.positionNumber} (${who}) has position department ${posDept} ` +
            `but budget department ${budDept} — administered by one department, funded by another.`,
          positionNumber: r.positionNumber,
          emplId: r.emplId || undefined,
          sourceRows: [r._row],
        });
      }

      // (2) POSSIBLE ERROR — combo code redirects payroll posting back to the
      // position's own department, so the redirect is a no-op.
      if (comboDept && posDept && comboDept === posDept) {
        issues.push({
          ruleId: 'QR-011',
          severity: 'warning',
          message:
            `Position ${r.positionNumber} (${who}) has a combo code redirecting to department ${comboDept}, ` +
            `the same as its position department — the redirect is redundant (likely a delete-combo candidate).`,
          positionNumber: r.positionNumber,
          emplId: r.emplId || undefined,
          sourceRows: [r._row],
        });
      }
    }
    return issues;
  },
};
