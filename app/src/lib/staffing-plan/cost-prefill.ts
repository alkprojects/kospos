/**
 * Pre-fill helpers for the PlannedActionDetail CostInput sub-editor.
 *
 * When the user opens the editor on a row, the CostInput fields default from
 * the position's current incumbent (if any) so they don't have to re-type
 * the job code + step the position is already paid at. Vacant positions
 * default to the position's budgeted job code + a sensible empty-step seed.
 *
 * Pure — no DOM, no store reads. Given a `Position`, returns a `Partial<CostInput>`
 * that the editor merges over its existing state.
 *
 * Sign convention note: this only fills `CostInput`. Sign for the planned
 * action's `expectedCost` is applied downstream in `computeExpectedCost`
 * based on `PlannedAction.type` (separations carry negative).
 */

import type { CostInput, SalaryType } from '../cost';
import { detectSalaryType, RANGE_CODES, STEP_CODES } from '../calc-opts';
import type { Position } from '../positions';

/** Active FY for v1 — only FY2026 has reference data loaded. */
export const DEFAULT_FY = 'FY2026';

/**
 * Pull a default CostInput seed from a Position. Priority for fields:
 *
 *   `code`     — incumbent's appointment.jobCode if filled (covers vice/acting
 *                cases); otherwise position.jobCode (the budgeted code).
 *   `setid`    — first setId that exists for `code` in the reference data;
 *                blank when the code isn't in STEP_CODES or RANGE_CODES.
 *   `retCode`  — blank; we don't have a reliable per-position retirement-code
 *                signal upstream. User picks.
 *   `salaryType` — derived from `code` via detectSalaryType (null when unknown).
 *   `stepOrRange` — incumbent's salaryStep when filled + salaryType is 'step';
 *                blank otherwise (range positions need explicit min/max pick).
 *   `rangePos` — defaults to 'min' for new hires (the conservative budgeting
 *                default per Tab 24 § Cost-basis defaults).
 *   `ppStartDate` — blank; user picks.
 *   `fiscalYear` — DEFAULT_FY.
 *
 * Returns a partial so the caller can `{...prefill, ...overrides}` without
 * fighting required fields. The editor sums Required-for-submit at the form
 * level.
 */
export function defaultBasisForPosition(p: Position): Partial<CostInput> {
  // Prefer the incumbent's effective code (handles vice/acting cases where
  // appointment.jobCode differs from position.jobCode).
  const code = p.appointment?.jobCode || p.jobCode || '';
  const salaryType = detectSalaryType(code);
  const setid = pickDefaultSetid(code, salaryType);

  const out: Partial<CostInput> = {
    code,
    setid,
    retCode: '',
    ppStartDate: '',
    fiscalYear: DEFAULT_FY,
  };

  if (salaryType) {
    out.salaryType = salaryType;
  }

  // Step seed: only safe to pull from appointment when the salaryType is
  // 'step' (range positions store a different shape in salaryStep).
  if (salaryType === 'step' && p.appointment?.salaryStep) {
    const stepNum = Number(p.appointment.salaryStep);
    if (!isNaN(stepNum) && stepNum > 0) out.stepOrRange = stepNum;
  } else if (salaryType === 'range') {
    out.rangePos = 'min';
  }

  return out;
}

/**
 * First setid available for the given code, preferring `salaryType`'s table.
 * Returns '' when the code isn't in either lookup.
 */
function pickDefaultSetid(code: string, salaryType: SalaryType | null): string {
  if (!code || !salaryType) return '';
  const table = salaryType === 'step' ? STEP_CODES : RANGE_CODES;
  const opts = table[code];
  if (!opts) return '';
  return opts.setids[0] ?? '';
}

/**
 * Whether a partial CostInput has all required fields populated to safely
 * call `calcEmployeeCost`. Mirrors CalculatorView's `canSubmit` predicate.
 *
 * Required: code, setid, retCode, ppStartDate, salaryType, stepOrRange
 * (and rangePos when salaryType === 'range'), fiscalYear.
 */
export function isCostInputComplete(c: Partial<CostInput>): c is CostInput {
  if (!c.code || !c.setid || !c.retCode || !c.ppStartDate) return false;
  if (!c.salaryType) return false;
  if (c.stepOrRange === '' || c.stepOrRange == null) return false;
  if (c.salaryType === 'range' && !c.rangePos) return false;
  if (!c.fiscalYear) return false;
  return true;
}
