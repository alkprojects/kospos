export type { Issue, IssueSeverity, QualityRule } from './types';
export { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
export { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
export { hcmFteBfmMismatch } from './rules/hcm-fte-bfm-mismatch';
export { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';
export { additionalPayOrphan } from './rules/additional-pay-orphan';
export { additionalPayActingSupervisoryConflict } from './rules/additional-pay-acting-supervisory-conflict';

import type { QualityRule } from './types';
import { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
import { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
import { hcmFteBfmMismatch } from './rules/hcm-fte-bfm-mismatch';
import { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';
import { additionalPayOrphan } from './rules/additional-pay-orphan';
import { additionalPayActingSupervisoryConflict } from './rules/additional-pay-acting-supervisory-conflict';

/** All active quality rules, in evaluation order. */
export const ALL_RULES: QualityRule[] = [
  positionInBfmNotHcm,
  payrollExceedsBudget,
  hcmFteBfmMismatch,
  positionInHcmNotBfm,
  additionalPayOrphan,
  additionalPayActingSupervisoryConflict,
];
