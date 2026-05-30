/**
 * Build typed `AdditionalPay` entities from PS HCM EE Additional Pay rows.
 *
 * Pure transform — caller pre-filters `loadedRows` to the
 * `ps-hcm-ee-addl-pay` source (mirrors `buildPositions(ppRows, ...)`).
 */

import type { PsHcmEeAddlPayRow } from '../importers/types';
import type {
  AdditionalPay,
  AdditionalPayKind,
  AdditionalPayRollup,
} from './types';

const KIND_BY_RATE_CODE: Record<string, AdditionalPayKind> = {
  ACTFLT: 'acting',
  SUPFLT: 'supervisory',
};

/** Display labels for each kind. Stable rollup order is acting → supervisory → other. */
export const KIND_LABEL: Record<AdditionalPayKind, string> = {
  acting: 'Acting',
  supervisory: 'Supervisory',
  other: 'Other',
};

export const KIND_ORDER: AdditionalPayKind[] = ['acting', 'supervisory', 'other'];

/** Map a raw PS HCM rate code to its classified kind (case-insensitive). */
export function classifyRateCode(rateCode: string): AdditionalPayKind {
  return KIND_BY_RATE_CODE[rateCode.trim().toUpperCase()] ?? 'other';
}

/**
 * Compose a "Last, First" display name from the split source name fields,
 * preferring the Preferred First name when the employee has one. Degrades
 * gracefully when a part is missing (some rows carry only a last name).
 */
function composeName(row: PsHcmEeAddlPayRow): string {
  const first = (row.preferredFirstName || row.firstName).trim();
  const last = row.lastName.trim();
  if (last && first) return `${last}, ${first}`;
  return last || first || '';
}

export function buildAdditionalPay(rows: PsHcmEeAddlPayRow[]): AdditionalPay[] {
  return rows.map(row => ({
    id: `${row.emplId}·${row.emplRecord}·${row.effectiveDate}·${row.rateCode}`,
    emplId: row.emplId,
    emplRecord: row.emplRecord,
    displayName: composeName(row),
    lastName: row.lastName,
    firstName: row.preferredFirstName || row.firstName,
    effectiveDate: row.effectiveDate,
    kind: classifyRateCode(row.rateCode),
    rateCode: row.rateCode,
    amount: row.additionalPayAmount,
    isActive: row.payStatus.trim().toUpperCase() === 'A',
    payStatus: row.payStatus,
    jobCode: row.jobCode,
    unionCode: row.unionCode,
    salaryPlan: row.salaryPlan,
    step: row.step,
    departmentGroupCode: row.departmentGroupCode,
    rosterCode: row.rosterCode,
    rosterDescription: row.rosterDescription,
    sourceRow: row._row,
  }));
}

/**
 * Index entities by employee id (one employee can hold several assignments).
 * Used to join additional pay onto a position's incumbent / vice by emplId.
 * Rows with a blank emplId are skipped.
 */
export function indexByEmplId(entities: AdditionalPay[]): Map<string, AdditionalPay[]> {
  const byEmplId = new Map<string, AdditionalPay[]>();
  for (const e of entities) {
    if (!e.emplId) continue;
    const list = byEmplId.get(e.emplId);
    if (list) list.push(e);
    else byEmplId.set(e.emplId, [e]);
  }
  return byEmplId;
}

/**
 * Roll up entities by classified kind: count + summed per-PP dollars. Only
 * kinds actually present are returned, in the stable `KIND_ORDER`.
 */
export function rollupByKind(entities: AdditionalPay[]): AdditionalPayRollup[] {
  return KIND_ORDER.flatMap(kind => {
    const inKind = entities.filter(e => e.kind === kind);
    if (inKind.length === 0) return [];
    return [{
      kind,
      label: KIND_LABEL[kind],
      count: inKind.length,
      totalAmount: inKind.reduce((sum, e) => sum + e.amount, 0),
    }];
  });
}
