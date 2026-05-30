/**
 * QR-007: An employee receives both acting (ACTFLT) and supervisory (SUPFLT)
 * pay at the same time.
 *
 * (aka `additional-pay-acting-supervisory-conflict`.)
 *
 * Per SF DHR "Acting Assignment Pay and Supervisory Differential Adjustments"
 * (rev 3/21/23): *"Employees in an acting assignment are not eligible for
 * supervisory differential pay."* So an active `ACTFLT` + `SUPFLT` on the same
 * employee is a genuine error — one of the two must be corrected.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow, PsHcmEeAddlPayRow } from '../../importers/types';
import { buildAdditionalPay } from '../../additional-pay/build';

export const additionalPayActingSupervisoryConflict: QualityRule = {
  id: 'QR-007',
  description:
    'Employee has both active acting (ACTFLT) and supervisory (SUPFLT) pay — DHR disallows both',
  check(records: ImportedRow[]): Issue[] {
    const eeRows = records.filter(
      (r): r is PsHcmEeAddlPayRow => r._source === 'ps-hcm-ee-addl-pay',
    );
    if (eeRows.length === 0) return [];

    // Group active acting/supervisory assignments per employee, tracking the
    // source rows of each kind so the issue can point at both offending rows.
    interface Agg { name: string; acting: number[]; supervisory: number[]; }
    const byEmplId = new Map<string, Agg>();
    for (const a of buildAdditionalPay(eeRows)) {
      if (!a.isActive || !a.emplId) continue;
      if (a.kind !== 'acting' && a.kind !== 'supervisory') continue;
      let agg = byEmplId.get(a.emplId);
      if (!agg) {
        agg = { name: a.displayName, acting: [], supervisory: [] };
        byEmplId.set(a.emplId, agg);
      }
      if (!agg.name && a.displayName) agg.name = a.displayName;
      agg[a.kind].push(a.sourceRow);
    }

    const issues: Issue[] = [];
    for (const [emplId, agg] of byEmplId) {
      if (agg.acting.length === 0 || agg.supervisory.length === 0) continue;
      const who = agg.name || emplId;
      issues.push({
        ruleId: 'QR-007',
        severity: 'error',
        message:
          `${who} (${emplId}) has both active acting (ACTFLT) and supervisory (SUPFLT) pay. ` +
          `DHR rules make acting assignees ineligible for a supervisory differential — one of the two must be corrected.`,
        emplId,
        sourceRows: [...agg.acting, ...agg.supervisory].sort((x, y) => x - y),
      });
    }
    return issues;
  },
};
