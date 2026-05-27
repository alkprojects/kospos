/**
 * People index — extracts known employees (name + emplId pairs) from a
 * loaded Position[] for downstream autocomplete in any view that needs to
 * pick an employee (Separations, Probation, future EE Additional Pay,
 * Roster Approvers, etc.).
 *
 * Sources per Position:
 *   - `appointment.{name,emplId}` — the current incumbent
 *   - `vice1.{name,emplId}`       — the acting/vice employee, when present
 *
 * NOT included:
 *   - `previousEmployee` (string only — no emplId, can't anchor an autofill)
 *   - Cross-tab people that aren't on any position (the OBI Payroll cube
 *     has its own `personFullName + personNumber` columns; if a tab needs
 *     payroll-only people we can layer a second index source on later).
 *
 * Dedupes by emplId — a person on multiple positions over time is indexed
 * once (first occurrence wins for the position+jobCode autofill).
 *
 * Sub-millisecond cost at DBI's ~700 positions; safe to recompute on
 * every positions change via `useMemo`.
 */

import type { Position } from './types';

export interface PersonRef {
  emplId: string;
  name: string;
  /** First position the person was seen on — auto-fills position + jobCode
   *  when the user picks from the datalist. Always present in v1 since
   *  every PersonRef is sourced from a Position. */
  positionDisplayNumber: string;
  jobCode: string;
  positionId: string;
}

export interface PeopleIndex {
  /** Lookup by exact employee name (PS HCM's `Person Full Name` form). */
  byName: Map<string, PersonRef>;
  /** Lookup by exact emplId. */
  byEmplId: Map<string, PersonRef>;
  /** Alphabetically-sorted list for datalist rendering. */
  list: PersonRef[];
}

/**
 * Build the indexes off a positions list. Returns empty indexes on empty
 * input (the autocomplete still renders — just with no options).
 */
export function buildPeopleIndex(positions: Position[]): PeopleIndex {
  const list: PersonRef[] = [];
  const seen = new Set<string>();

  for (const p of positions) {
    const candidates: Array<{ emplId: string; name: string }> = [];
    if (p.appointment?.emplId && p.appointment.name) {
      candidates.push({ emplId: p.appointment.emplId, name: p.appointment.name });
    }
    if (p.vice1?.emplId && p.vice1.name) {
      candidates.push({ emplId: p.vice1.emplId, name: p.vice1.name });
    }
    for (const c of candidates) {
      if (seen.has(c.emplId)) continue;
      seen.add(c.emplId);
      list.push({
        emplId: c.emplId,
        name: c.name,
        positionDisplayNumber: p.displayNumber,
        jobCode: p.jobCode,
        positionId: p.id,
      });
    }
  }

  list.sort((a, b) => a.name.localeCompare(b.name));

  return {
    byName: new Map(list.map(p => [p.name, p])),
    byEmplId: new Map(list.map(p => [p.emplId, p])),
    list,
  };
}
