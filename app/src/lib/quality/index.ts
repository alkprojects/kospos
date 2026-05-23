export type { Issue, IssueSeverity, QualityRule } from './types';
export { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
export { vacantNoRtf } from './rules/vacant-no-rtf';
export { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
export { hcmFteBfmMismatch } from './rules/hcm-fte-bfm-mismatch';
export { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';

import type { QualityRule } from './types';
import { positionInBfmNotHcm } from './rules/position-in-bfm-not-hcm';
import { vacantNoRtf } from './rules/vacant-no-rtf';
import { payrollExceedsBudget } from './rules/payroll-exceeds-budget';
import { hcmFteBfmMismatch } from './rules/hcm-fte-bfm-mismatch';
import { positionInHcmNotBfm } from './rules/position-in-hcm-not-bfm';

/** All active quality rules, in evaluation order. */
export const ALL_RULES: QualityRule[] = [
  positionInBfmNotHcm,
  vacantNoRtf,
  payrollExceedsBudget,
  hcmFteBfmMismatch,
  positionInHcmNotBfm,
];
