/**
 * QR-008: Supervisory differential likely owed but not paid.
 *
 * (aka `additional-pay-supervisory-owed` — the workbook's Tab 9 `Rep To Pay
 * Above` scan, made automatic.)
 *
 * SF DHR "Acting Assignment Pay and Supervisory Differential Adjustments"
 * (rev 3/21/23): a Supervisory Differential Adjustment is owed when a
 * supervisor's salary **GRADE** (top step of their class) is less than 5% above
 * the highest-paid subordinate's grade. Critically this is **grade-to-grade,
 * not paycheck-to-paycheck** — per the deck's Example 5, step placement and
 * premiums do NOT matter; only the class grade does. So we compare class top
 * steps (via `cost.ts:topClassBiweekly`), not anyone's actual pay.
 *
 * The rule flags a manager when: the manager's grade is < 5% above the highest
 * subordinate's grade AND the manager isn't already receiving a supervisory
 * (SUPFLT) differential. The adjustment (to 5% above the subordinate's top step)
 * is subject to a ~10% / two-full-step per-FY cap, noted in the message.
 *
 * Severity is `warning` (advisory — same-class-over-class is allowed for Local
 * 21 / MEA, and exemptions exist, so a human confirms before acting).
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow, PsHcmPpRow, PsHcmEeAddlPayRow } from '../../importers/types';
import { buildAdditionalPay } from '../../additional-pay/build';
import { topClassBiweekly } from '../../cost';
import { normalizePositionKey } from '../../chartfields/resolve';

/** Required supervisory differential over the highest subordinate's grade. */
const DIFFERENTIAL = 0.05;

/** Grade lookup: class job code + as-of date → top-of-grade biweekly (or null). */
export type GradeLookup = (jobCode: string, asOfDate: string) => number | null;

/**
 * Core logic, with the grade lookup injected so it's testable without the real
 * salary reference data. Production callers use the `topClassBiweekly` default.
 */
export function findSupervisoryOwed(
  records: ImportedRow[],
  gradeOf: GradeLookup = topClassBiweekly,
): Issue[] {
  const ppRows = records.filter((r): r is PsHcmPpRow => r._source === 'ps-hcm-pp');
  const eeRows = records.filter(
    (r): r is PsHcmEeAddlPayRow => r._source === 'ps-hcm-ee-addl-pay',
  );
  // Need both: the positions/reporting graph AND the additional-pay rows, so a
  // "no SUPFLT recorded" finding isn't just "the pay source wasn't imported".
  if (ppRows.length === 0 || eeRows.length === 0) return [];

  // emplIds already receiving an active supervisory (SUPFLT) differential.
  const supfltEmplIds = new Set<string>();
  for (const a of buildAdditionalPay(eeRows)) {
    if (a.kind === 'supervisory' && a.isActive && a.emplId) supfltEmplIds.add(a.emplId);
  }

  // Reverse reports-to index: parent position id → its child P&P rows.
  const childrenByParent = new Map<string, PsHcmPpRow[]>();
  for (const r of ppRows) {
    const parent = normalizePositionKey(r.reportsToPosition);
    if (!parent) continue;
    const list = childrenByParent.get(parent);
    if (list) list.push(r);
    else childrenByParent.set(parent, [r]);
  }

  // Grades read at the data's snapshot vintage (one shared date across rows).
  const asOfDate = ppRows[0].snapshotDate;

  const issues: Issue[] = [];
  for (const mgr of ppRows) {
    if (!mgr.emplId) continue;                       // vacant — no supervisor
    if (supfltEmplIds.has(mgr.emplId)) continue;     // already paid a differential
    const mgrKey = normalizePositionKey(mgr.positionNumber);

    const subs = (childrenByParent.get(mgrKey) ?? []).filter(
      s => s.emplId && normalizePositionKey(s.positionNumber) !== mgrKey, // filled, not self
    );
    if (subs.length === 0) continue;

    const mgrClass = mgr.employeeJobCode || mgr.jobCode;
    const mgrTop = gradeOf(mgrClass, asOfDate);
    if (mgrTop == null) continue;                    // grade unknown — can't evaluate

    // Highest-graded subordinate (DHR: "the highest-paid subordinate").
    let highestSubTop = 0;
    let highestSubClass = '';
    for (const s of subs) {
      const sClass = s.employeeJobCode || s.jobCode;
      const t = gradeOf(sClass, asOfDate);
      if (t != null && t > highestSubTop) {
        highestSubTop = t;
        highestSubClass = sClass;
      }
    }
    if (highestSubTop === 0) continue;               // no priceable subordinate

    // OK when the manager's grade is already ≥ 5% above the top subordinate.
    if (mgrTop >= highestSubTop * (1 + DIFFERENTIAL)) continue;

    const owedAnnual = Math.round((highestSubTop * (1 + DIFFERENTIAL) - mgrTop) * 26);
    const who = mgr.employeeName || mgr.emplId;
    issues.push({
      ruleId: 'QR-008',
      severity: 'warning',
      message:
        `Possible supervisory differential owed — position ${mgr.positionNumber} (${who}, class ${mgrClass}) ` +
        `supervises class ${highestSubClass}, whose grade top step is within 5% of (or above) the manager's, ` +
        `and no supervisory differential (SUPFLT) is recorded. DHR allows raising the manager to 5% above the ` +
        `subordinate's top step (≈ $${owedAnnual.toLocaleString('en-US')}/yr, subject to the ~10% / two-step ` +
        `per-FY cap). Review.`,
      positionNumber: mgr.positionNumber,
      emplId: mgr.emplId,
      sourceRows: [mgr._row],
    });
  }
  return issues;
}

export const additionalPaySupervisoryOwed: QualityRule = {
  id: 'QR-008',
  description:
    "Supervisory differential likely owed — a manager's class grade is < 5% above a subordinate's, with no SUPFLT recorded",
  rationale:
    'A supervisory differential may be owed. This manager grade (class top step) is less than 5% above the highest-graded subordinate grade, and no SUPFLT differential is recorded. Per DHR this is judged grade-to-grade, not paycheck-to-paycheck: step placement and premiums do not matter.',
  fix:
    'Review for a supervisory differential. DHR allows raising the manager to 5% above the subordinate top step, subject to a ~10% / two-full-step per-FY cap. Same-class-over-class and some bargaining units are exempt, so confirm before acting.',
  citations: [
    { label: 'SF DHR: Acting Assignment Pay and Supervisory Differential Adjustments (rev. 3/21/23), Example 5 - the 5%-of-grade, grade-to-grade rule' },
  ],
  sourceTabs: ['positions', 'data'],
  check: (records: ImportedRow[]) => findSupervisoryOwed(records),
};
