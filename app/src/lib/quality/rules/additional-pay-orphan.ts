/**
 * QR-006: Acting-pay dual-entry orphan.
 *
 * (aka `additional-pay-orphan` in docs/domain/labor-report-tabs.md § Tab 9.)
 *
 * An acting assignment is recorded in TWO places that must agree:
 *   1. PS HCM `MRG_HR_EE_ADDL_PAY` — an `ACTFLT` row that actually PAYS the
 *      acting differential. This is the source of truth for who is paid acting.
 *   2. The manual P&P marker — a position with `Position Used For =
 *      "Acting Assignment"` (col U) carrying the acting employee's emplid in
 *      the Description (col V).
 *
 * A one-sided entry is an orphan that needs correction (the workbook's T2/AA2
 * "Check"):
 *   - **paid-but-not-marked** — an `ACTFLT` payee with no position marking them
 *     acting (the manual position-side entry was forgotten).
 *   - **marked-but-not-paid** — a position marks an employee acting but no
 *     `ACTFLT` pay exists (acting ended without clearing the marker, or the pay
 *     was never set up).
 *
 * Vice 1 plays NO role here — Vice is incumbency history, not an acting pointer
 * (see the S56 Vice-vs-Acting correction in labor-report-tabs.md).
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow, PsHcmPpRow, PsHcmEeAddlPayRow } from '../../importers/types';
import type { AdditionalPay } from '../../additional-pay/types';
import { buildAdditionalPay } from '../../additional-pay/build';

const ACTING_MARKER = 'Acting Assignment';

export const additionalPayOrphan: QualityRule = {
  id: 'QR-006',
  description:
    'Acting-pay dual-entry orphan — ACTFLT pay and the "Position Used For" marker disagree',
  check(records: ImportedRow[]): Issue[] {
    const eeRows = records.filter(
      (r): r is PsHcmEeAddlPayRow => r._source === 'ps-hcm-ee-addl-pay',
    );
    const ppRows = records.filter(
      (r): r is PsHcmPpRow => r._source === 'ps-hcm-pp',
    );

    // Both sides must be loaded to cross-check; otherwise we can't tell a real
    // orphan from "the other source just isn't imported yet".
    if (eeRows.length === 0 || ppRows.length === 0) return [];

    // Source of truth: active acting-pay (ACTFLT) payees, keyed by emplid.
    const paidByEmplId = new Map<string, AdditionalPay>();
    for (const a of buildAdditionalPay(eeRows)) {
      if (a.kind !== 'acting' || !a.isActive || !a.emplId) continue;
      if (!paidByEmplId.has(a.emplId)) paidByEmplId.set(a.emplId, a);
    }

    // Manual side: positions marked "Acting Assignment", keyed by the acting
    // employee's emplid (col V Description).
    const markedByEmplId = new Map<string, PsHcmPpRow[]>();
    for (const r of ppRows) {
      // `?? ''` guards rows persisted before U/V existed (pre-S56 IDB saves
      // restore without these fields until the report is re-imported).
      if ((r.positionUsedFor ?? '').trim() !== ACTING_MARKER) continue;
      const actingEmplId = (r.positionUsedForDescription ?? '').trim();
      if (!actingEmplId) continue;
      const list = markedByEmplId.get(actingEmplId);
      if (list) list.push(r);
      else markedByEmplId.set(actingEmplId, [r]);
    }

    // Best-effort emplid → name for friendlier messages (falls back to emplid).
    const nameByEmplId = new Map<string, string>();
    for (const r of ppRows) {
      if (r.emplId && r.employeeName && !nameByEmplId.has(r.emplId)) {
        nameByEmplId.set(r.emplId, r.employeeName);
      }
    }

    const issues: Issue[] = [];

    // Direction 1 — paid but not marked (workbook T2 "Check").
    for (const [emplId, pay] of paidByEmplId) {
      if (markedByEmplId.has(emplId)) continue;
      const who = pay.displayName || nameByEmplId.get(emplId) || emplId;
      issues.push({
        ruleId: 'QR-006',
        severity: 'warning',
        message:
          `Acting pay (ACTFLT) is recorded for ${who} (${emplId}) but no position is ` +
          `marked "Acting Assignment" for them — the position-side entry is missing in PS HCM.`,
        emplId,
        sourceRows: [pay.sourceRow],
      });
    }

    // Direction 2 — marked but not paid (workbook AA2 "Check").
    for (const [emplId, posRows] of markedByEmplId) {
      if (paidByEmplId.has(emplId)) continue;
      const who = nameByEmplId.get(emplId) || emplId;
      for (const r of posRows) {
        issues.push({
          ruleId: 'QR-006',
          severity: 'warning',
          message:
            `Position ${r.positionNumber} is marked "Acting Assignment" for ${who} (${emplId}) ` +
            `but no acting pay (ACTFLT) is recorded — the pay entry is missing, or the acting ` +
            `assignment ended without clearing the marker.`,
          positionNumber: r.positionNumber,
          sourceRows: [r._row],
        });
      }
    }

    return issues;
  },
};
