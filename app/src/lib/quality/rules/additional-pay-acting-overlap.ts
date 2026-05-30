/**
 * QR-009: An employee holds 2+ concurrent active acting (ACTFLT) assignments.
 *
 * (aka `additional-pay-acting-overlap`.)
 *
 * An employee normally acts in a single role at a time; multiple simultaneous
 * active acting assignments usually signal a data error, a duplicate entry, or
 * a CSC concern (and risk double acting pay). Detected straight from
 * MRG_HR_EE_ADDL_PAY.
 *
 * Grain note: "the same POSITION acted by multiple people" is not representable
 * in the current data — a position carries a single Position-Used-For emplid
 * (col V) — so the detectable overlap is per-employee. See
 * docs/domain/labor-report-tabs.md § Tab 9 (open question on acting-overlap grain).
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow, PsHcmEeAddlPayRow } from '../../importers/types';
import { buildAdditionalPay } from '../../additional-pay/build';

export const additionalPayActingOverlap: QualityRule = {
  id: 'QR-009',
  description: 'Employee holds 2+ concurrent active acting (ACTFLT) assignments',
  rationale:
    'An employee holds two or more concurrent active acting (ACTFLT) assignments. A person normally acts in a single role at a time, so multiple simultaneous acting assignments usually signal a data error, a duplicate entry, or a CSC concern, and risk double acting pay.',
  fix:
    'Review the acting rows. Close any that have ended, remove duplicates, or confirm with CSC if a genuine multi-acting arrangement exists.',
  citations: [
    { label: 'KosPos domain: Labor Report Tab 9 - acting-overlap (per-employee grain)' },
  ],
  sourceTabs: ['data'],
  check(records: ImportedRow[]): Issue[] {
    const eeRows = records.filter(
      (r): r is PsHcmEeAddlPayRow => r._source === 'ps-hcm-ee-addl-pay',
    );
    if (eeRows.length === 0) return [];

    interface Agg { name: string; rows: number[]; }
    const byEmplId = new Map<string, Agg>();
    for (const a of buildAdditionalPay(eeRows)) {
      if (a.kind !== 'acting' || !a.isActive || !a.emplId) continue;
      let agg = byEmplId.get(a.emplId);
      if (!agg) {
        agg = { name: a.displayName, rows: [] };
        byEmplId.set(a.emplId, agg);
      }
      if (!agg.name && a.displayName) agg.name = a.displayName;
      agg.rows.push(a.sourceRow);
    }

    const issues: Issue[] = [];
    for (const [emplId, agg] of byEmplId) {
      if (agg.rows.length < 2) continue;
      const who = agg.name || emplId;
      issues.push({
        ruleId: 'QR-009',
        severity: 'warning',
        message:
          `${who} (${emplId}) has ${agg.rows.length} concurrent active acting (ACTFLT) assignments. ` +
          `An employee normally acts in one role at a time — review for a data error, a duplicate entry, or a CSC concern.`,
        emplId,
        sourceRows: agg.rows.slice().sort((x, y) => x - y),
      });
    }
    return issues;
  },
};
