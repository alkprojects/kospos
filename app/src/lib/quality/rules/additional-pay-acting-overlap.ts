/**
 * QR-009: An employee holds 2+ concurrent active acting (ACTFLT) assignments.
 *
 * (aka `additional-pay-acting-overlap`.)
 *
 * An employee normally acts in a single role at a time; multiple simultaneous
 * active acting assignments usually signal a data error, a duplicate entry, or
 * a CSC concern (and risk double acting pay).
 *
 * Grain (confirmed by Alex, S58): the overlap is per-EMPLOYEE — one person
 * holding two acting assignments at once.
 *
 * IMPORTANT — the MRG_HR_EE_ADDL_PAY export is EFFECTIVE-DATED: a single
 * ongoing acting assignment appears as several rows (one per effective-dated
 * change — a COLA bump, a step move). Counting raw rows read that one
 * assignment as "concurrent" and fired falsely. A genuine second concurrent
 * assignment lands on a DIFFERENT employee record (empl_rcd), so we collapse
 * the effective-date history by record and flag only when an employee has
 * active acting pay on 2+ distinct records.
 *
 * ("Same POSITION acted by two different people" is a separate position-level
 * check the EE source can't see on its own; the
 * Position-Used-For-Description-across-two-positions signal is a possible
 * complement — see docs/domain/labor-report-tabs.md § Tab 9.)
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow, PsHcmEeAddlPayRow } from '../../importers/types';
import { buildAdditionalPay } from '../../additional-pay/build';

export const additionalPayActingOverlap: QualityRule = {
  id: 'QR-009',
  description: 'Employee holds 2+ concurrent active acting (ACTFLT) assignments',
  rationale:
    'An employee holds two or more concurrent active acting (ACTFLT) assignments on different employee records. A person normally acts in a single role at a time, so simultaneous acting assignments usually signal a data error, a duplicate entry, or a CSC concern, and risk double acting pay. The EE Additional Pay export is effective-dated, so the effective-date history of a single assignment (same employee record) is collapsed and never miscounted as concurrent.',
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

    // Group active acting rows per employee, bucketed by employee record so the
    // effective-date history of ONE assignment collapses to a single record.
    interface Agg { name: string; byRecord: Map<number, number[]>; }
    const byEmplId = new Map<string, Agg>();
    for (const a of buildAdditionalPay(eeRows)) {
      if (a.kind !== 'acting' || !a.isActive || !a.emplId) continue;
      let agg = byEmplId.get(a.emplId);
      if (!agg) {
        agg = { name: a.displayName, byRecord: new Map() };
        byEmplId.set(a.emplId, agg);
      }
      if (!agg.name && a.displayName) agg.name = a.displayName;
      const rows = agg.byRecord.get(a.emplRecord);
      if (rows) rows.push(a.sourceRow);
      else agg.byRecord.set(a.emplRecord, [a.sourceRow]);
    }

    const issues: Issue[] = [];
    for (const [emplId, agg] of byEmplId) {
      // One assignment (any number of effective-dated rows) is fine; flag only
      // when acting pay spans 2+ distinct employee records.
      if (agg.byRecord.size < 2) continue;
      const who = agg.name || emplId;
      const rows = [...agg.byRecord.values()].flat().sort((x, y) => x - y);
      issues.push({
        ruleId: 'QR-009',
        severity: 'warning',
        message:
          `${who} (${emplId}) has ${agg.byRecord.size} concurrent active acting (ACTFLT) assignments ` +
          `on different employee records. An employee normally acts in one role at a time — review for a ` +
          `data error, a duplicate entry, or a CSC concern.`,
        emplId,
        sourceRows: rows,
      });
    }
    return issues;
  },
};
