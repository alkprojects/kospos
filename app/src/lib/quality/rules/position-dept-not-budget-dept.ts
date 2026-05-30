/**
 * QR-011: A position's department in PS HCM does not match its budget department.
 *
 * PS HCM Position & Personnel carries both the position's effective department
 * (col G, `departmentCode`) and the department that budgets it (col CB,
 * `budgetDepartmentCode`). When the two differ, the position is administered by
 * one department but funded by another - commonly a combo-code redirect, a
 * transfer that was not fully processed, or a keying error. Surfacing it lets
 * the administrator confirm the funding split is intentional.
 *
 * Only rows where BOTH codes are present are compared - a blank budget
 * department means "not specified", not a mismatch.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const positionDeptNotBudgetDept: QualityRule = {
  id: 'QR-011',
  description: 'Position department (PS HCM) does not equal its budget department',
  rationale:
    'PS HCM records both the position department (col G) and the department that budgets it (col CB). When they differ, the position is administered by one department but funded by another - commonly a combo-code redirect, a transfer that was not fully processed, or a keying error.',
  fix:
    'Confirm the funding split is intentional. If the position transferred, make sure both the position department and the budget department are updated; otherwise correct whichever code is wrong.',
  citations: [
    { label: 'PS HCM P&P: Position Department ID (col G) vs Budget Department Code 1 (col CB)' },
  ],
  sourceTabs: ['positions', 'data'],
  check(records: ImportedRow[]): Issue[] {
    const issues: Issue[] = [];
    for (const r of records) {
      if (r._source !== 'ps-hcm-pp') continue;
      const posDept = (r.departmentCode ?? '').trim();
      const budDept = (r.budgetDepartmentCode ?? '').trim();
      if (!posDept || !budDept || posDept === budDept) continue;
      const who = r.employeeName || (r.fillStatus === 'FILLED' ? 'filled' : 'vacant');
      issues.push({
        ruleId: 'QR-011',
        severity: 'warning',
        message:
          `Position ${r.positionNumber} (${who}) has position department ${posDept} ` +
          `but budget department ${budDept} - administered by one department, funded by another.`,
        positionNumber: r.positionNumber,
        emplId: r.emplId || undefined,
        sourceRows: [r._row],
      });
    }
    return issues;
  },
};
