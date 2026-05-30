/**
 * Additional Pay entity — the typed shape of one PS HCM additional-pay
 * assignment (workbook Tab 9 — EE Additional Pay).
 *
 * Built from `PsHcmEeAddlPayRow[]` (the MRG_HR_EE_ADDL_PAY import). One entity
 * per source row; the labor report cares chiefly about two rate codes —
 * acting (`ACTFLT`) and supervisory (`SUPFLT`) — but every rate code is
 * preserved and classified as `other` when it isn't one of those two.
 *
 * Deliberately NOT modeled here (each is a nuanced follow-up that needs Alex's
 * input — see docs/domain/labor-report-tabs.md § Tab 9 and the S55 questions):
 *   - the acting dual-entry cross-check (needs the P&P "Position Used For"
 *     join — vice-direction semantics unconfirmed)
 *   - supervisory `Rep To Pay Above` (needs per-BU MOU differential rules)
 *   - an annualized cost (that is a COLA-aware projection, not a raw field)
 */

/** Classified rate code. Raw `ACTFLT`/`SUPFLT` map to acting/supervisory. */
export type AdditionalPayKind = 'acting' | 'supervisory' | 'other';

export interface AdditionalPay {
  /** Natural composite key: emplId · emplRecord · effectiveDate · rateCode. */
  id: string;
  emplId: string;
  emplRecord: number;
  /** Composed "Last, First" (prefers Preferred First when present). */
  displayName: string;
  lastName: string;
  firstName: string;
  /** Additional-pay effective date (ISO yyyy-mm-dd). */
  effectiveDate: string;
  /** Classified kind. */
  kind: AdditionalPayKind;
  /** Raw rate code from the source (`ACTFLT` / `SUPFLT` / ...). */
  rateCode: string;
  /** Per-pay-period dollar amount of the differential (raw, not annualized). */
  amount: number;
  /** `payStatus === 'A'`. */
  isActive: boolean;
  payStatus: string;
  jobCode: string;
  /** Bargaining unit / union code (351 / 790 / ...). */
  unionCode: string;
  /** Salary plan (4 = MCCP range, 1 = SEIU step, ...). */
  salaryPlan: string;
  step: string;
  departmentGroupCode: string;
  rosterCode: string;
  rosterDescription: string;
  /** 1-based source sheet row. */
  sourceRow: number;
}

/** One row of the rate-code rollup (count + summed per-PP dollars by kind). */
export interface AdditionalPayRollup {
  kind: AdditionalPayKind;
  label: string;
  count: number;
  /** Summed per-pay-period dollars across the entities in this kind. */
  totalAmount: number;
}

/**
 * One additional-pay assignment paired with *why* a person is attached to a
 * position — the incumbent in it, or a vice acting on it. Used to surface
 * additional pay on Position Detail.
 *
 * NOTE: `role` says which person the assignment belongs to, NOT that the pay
 * is *for* this position. The acting-target join ("this ACTFLT is the vice
 * entry on this exact position") is the deferred dual-entry check — see the
 * Tab 9 notes + the S55 questions.
 */
export interface PositionAdditionalPay {
  role: 'Incumbent' | 'Vice';
  /** The person's name (from the P&P side, falling back to the pay source). */
  personName: string;
  item: AdditionalPay;
}
