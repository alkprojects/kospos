export type { Issue, IssueSeverity, QualityRule, IssueCitation, SourceTabId } from './types';
export { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
export { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
export { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';
export { additionalPayOrphan } from './rules/additional-pay-orphan';
export { additionalPayActingSupervisoryConflict } from './rules/additional-pay-acting-supervisory-conflict';
export { additionalPaySupervisoryOwed } from './rules/additional-pay-supervisory-owed';
export { additionalPayActingOverlap } from './rules/additional-pay-acting-overlap';
export { positionDeptNotBudgetDept } from './rules/position-dept-not-budget-dept';
export { payrollWithoutBudgetedPosition } from './rules/payroll-without-budgeted-position';
export { multipleIncumbentsPerPosition } from './rules/multiple-incumbents-per-position';
export { budgetEliminatedNextFy } from './rules/budget-eliminated-next-fy';

import type { QualityRule } from './types';
import { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
import { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
import { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';
import { additionalPayOrphan } from './rules/additional-pay-orphan';
import { additionalPayActingSupervisoryConflict } from './rules/additional-pay-acting-supervisory-conflict';
import { additionalPaySupervisoryOwed } from './rules/additional-pay-supervisory-owed';
import { additionalPayActingOverlap } from './rules/additional-pay-acting-overlap';
import { positionDeptNotBudgetDept } from './rules/position-dept-not-budget-dept';
import { payrollWithoutBudgetedPosition } from './rules/payroll-without-budgeted-position';
import { multipleIncumbentsPerPosition } from './rules/multiple-incumbents-per-position';
import { budgetEliminatedNextFy } from './rules/budget-eliminated-next-fy';

/** All active quality rules, in evaluation order. */
export const ALL_RULES: QualityRule[] = [
  positionInBfmNotHcm,
  payrollExceedsBudget,
  positionInHcmNotBfm,
  additionalPayOrphan,
  additionalPayActingSupervisoryConflict,
  additionalPaySupervisoryOwed,
  additionalPayActingOverlap,
  positionDeptNotBudgetDept,
  payrollWithoutBudgetedPosition,
  multipleIncumbentsPerPosition,
  budgetEliminatedNextFy,
];
