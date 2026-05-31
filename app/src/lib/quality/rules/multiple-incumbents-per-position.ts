/**
 * QR-013: A position has 2+ distinct current incumbents.
 *
 * A budgeted position normally holds one person. PS HCM P&P carries the current
 * incumbent in `emplId` (col W "Current Employee ID", blank when vacant). When
 * the same positionNumber appears with two or more distinct non-blank current
 * employee IDs, more than one person is currently assigned to it.
 *
 * This is legitimate for a shared position — commissioners sharing one seat, a
 * pool position (`positionMaxHeadcount` > 1), temp interns — and an anomaly
 * otherwise (an over-fill, a transfer not fully processed, or a data error).
 * Per Alex's S58 ruling there are NO exclusions: the rule flags every multi-
 * incumbent position and the legitimate ones are cleared once via the Issues
 * view's "mark not an error". The message carries the position's max headcount
 * so the reviewer can judge at a glance.
 *
 * Grain is the POSITION — the complement to QR-009's per-EMPLOYEE acting-overlap
 * check, which the EE source can see but the position source cannot.
 */

import type { QualityRule, Issue } from '../types';
import type { ImportedRow } from '../../importers/types';

export const multipleIncumbentsPerPosition: QualityRule = {
  id: 'QR-013',
  description: 'Position has 2+ distinct current incumbents',
  rationale:
    'A budgeted position normally holds one person. PS HCM P&P records the current incumbent in “Current Employee ID” (col W). When one position shows two or more distinct current employees, more than one person is assigned to it — legitimate for a shared / pool position (commissioners, temp interns) but otherwise an over-fill, an unprocessed transfer, or a data error.',
  fix:
    'Confirm whether the position is genuinely shared (a pool with max headcount > 1, a commissioner seat, temp interns). If so, “mark not an error” to clear it. Otherwise close the assignment that has ended or correct the duplicate record.',
  citations: [
    { label: 'PS HCM P&P: Current Employee ID (col W), Position Max Headcount (col I)' },
  ],
  sourceTabs: ['positions', 'data'],
  check(records: ImportedRow[]): Issue[] {
    interface Agg {
      /** distinct incumbent emplId → best-known display name */
      names: Map<string, string>;
      rows: number[];
      maxHeadcount: number;
    }
    const byPos = new Map<string, Agg>();
    for (const r of records) {
      if (r._source !== 'ps-hcm-pp') continue;
      const empl = (r.emplId ?? '').trim();
      if (!empl) continue;
      let agg = byPos.get(r.positionNumber);
      if (!agg) {
        agg = { names: new Map(), rows: [], maxHeadcount: 0 };
        byPos.set(r.positionNumber, agg);
      }
      // First sighting of an incumbent records its name; a later row only fills
      // in a name we didn't have (effective-dated rows repeat the same person).
      if (!agg.names.has(empl) || (!agg.names.get(empl) && r.employeeName)) {
        agg.names.set(empl, r.employeeName || '');
      }
      agg.rows.push(r._row);
      if (r.positionMaxHeadcount > agg.maxHeadcount) agg.maxHeadcount = r.positionMaxHeadcount;
    }

    const issues: Issue[] = [];
    for (const [positionNumber, agg] of byPos) {
      if (agg.names.size < 2) continue;
      const people = [...agg.names.entries()].map(([id, name]) => (name ? `${name} (${id})` : id));
      const headcount = agg.maxHeadcount > 0 ? ` Max headcount ${agg.maxHeadcount}.` : '';
      issues.push({
        ruleId: 'QR-013',
        severity: 'warning',
        message:
          `Position ${positionNumber} has ${agg.names.size} current incumbents: ${people.join(', ')}.` +
          `${headcount} Confirm it is a shared / pool position, otherwise resolve the over-fill.`,
        positionNumber,
        sourceRows: [...new Set(agg.rows)].sort((a, b) => a - b),
      });
    }
    return issues;
  },
};
