/**
 * idb-persistence split/merge tests — Phase 2.2.aa (scaling Stage 0).
 *
 * The per-store record split moved the IDB snapshot from one monolithic
 * `'current'` record to four per-group records (`meta` / `rows` /
 * `scrapers` / `planning`). The DATA-INTEGRITY core of that change — and
 * the thing that makes the one-time legacy-record migration safe — is
 * that `splitSessionFile` and `mergeIdbRecords` are a lossless,
 * order-independent round-trip. These are pure functions, so we test
 * them exhaustively here without IndexedDB.
 *
 * The IDB orchestration itself (atomic migration delete, selective
 * per-group writes) is verified in a real browser via preview-MCP —
 * jsdom ships no IndexedDB, so there's nothing to assert against here.
 */

import { describe, it, expect } from 'vitest';
import {
  splitSessionFile,
  mergeIdbRecords,
  STORE_GROUPS,
} from './idb-persistence';
import {
  buildSessionFile,
  parseSessionFileFromValue,
  SESSION_SCHEMA_VERSION,
  type SessionFile,
} from './snapshot';
import type { ImportedRow } from '../importers/types';
import type { PlannedAction } from '../staffing-plan';
import type { PendingSeparation } from '../separations';
import type { Probation } from '../probation';
import type { EligibilityList, JobPosting, PdfExtract } from '../scrapers/types';

// Split/merge never read row internals — they carry the values by
// reference — so opaque sentinels typed to the right shape keep the
// fixtures lean while still exercising every payload field.
const row = (n: string) => ({ positionNumber: n } as unknown as ImportedRow);
const action = (id: string) => ({ id } as unknown as PlannedAction);
const sep = (id: string) => ({ id } as unknown as PendingSeparation);
const prob = (id: string) => ({ id } as unknown as Probation);
const posting = (id: string) => ({ id } as unknown as JobPosting);
const list = (jobCode: string) => ({ jobCode } as unknown as EligibilityList);
const extract = () => ({ success: true } as unknown as PdfExtract);

/** A SessionFile with every store group populated — the shape a real
 *  auto-save produces. */
function fullFile(): SessionFile {
  return buildSessionFile({
    loadedRows: [row('10001'), row('10002')],
    lastBfmImportAt: '2026-05-20',
    staffingPlanActions: new Map([['a1', action('a1')]]),
    staffingPlanDerivedRemoved: new Set(['10009']),
    positionNotes: new Map([['10001', 'note one']]),
    pendingSeparations: new Map([['s1', sep('s1')]]),
    probations: new Map([['p1', prob('p1')]]),
    jobPostings: [posting('j1')],
    jobPostingsRefreshedAt: '2026-05-21T00:00:00Z',
    eligibilityLists: [list('0932')],
    eligibilityListsRefreshedAt: '2026-05-22T00:00:00Z',
    pdfCache: { '0932|140556|2024-08-01': extract() },
  });
}

describe('splitSessionFile field partitioning', () => {
  it('routes every payload field to exactly one group', () => {
    const s = splitSessionFile(fullFile());
    expect(Object.keys(s.meta).sort()).toEqual(['kind', 'label', 'savedAt', 'schemaVersion']);
    expect(Object.keys(s.rows).sort()).toEqual(['lastBfmImportAt', 'loadedRows']);
    expect(Object.keys(s.scrapers).sort()).toEqual([
      'eligibilityLists', 'eligibilityListsRefreshedAt',
      'jobPostings', 'jobPostingsRefreshedAt', 'pdfCache',
    ]);
    expect(Object.keys(s.planning).sort()).toEqual([
      'pendingSeparations', 'positionNotes', 'probations',
      'staffingPlanActions', 'staffingPlanDerivedRemoved',
    ]);
  });

  it('carries the heavy loadedRows by reference (no copy) into the rows group', () => {
    const file = fullFile();
    const s = splitSessionFile(file);
    // The whole point of the split is that capturing a snapshot for a
    // planning edit does NOT deep-copy loadedRows.
    expect(s.rows.loadedRows).toBe(file.payload.loadedRows);
  });

  it('puts the envelope metadata in the meta group', () => {
    const file = fullFile();
    const s = splitSessionFile(file);
    expect(s.meta).toEqual({
      kind: 'kospos-session',
      schemaVersion: SESSION_SCHEMA_VERSION,
      savedAt: file.savedAt,
      label: undefined,
    });
  });
});

describe('split → merge round-trip (the migration-safety guarantee)', () => {
  it('reassembles a fully-populated file losslessly', () => {
    const file = fullFile();
    expect(mergeIdbRecords(splitSessionFile(file))).toEqual(file);
  });

  it('produces an envelope that passes the real validator', () => {
    const merged = mergeIdbRecords(splitSessionFile(fullFile()));
    expect(parseSessionFileFromValue(merged).ok).toBe(true);
  });

  it('defaults the optional fields of a pre-scraper legacy envelope', () => {
    // A v1 file saved before Phase 2.2.i/j/q — no separations, probations,
    // or scraper fields. This is exactly what the legacy-record migration
    // splits, so it must merge back to a valid, fully-defaulted envelope.
    const legacy: SessionFile = {
      kind: 'kospos-session',
      schemaVersion: SESSION_SCHEMA_VERSION,
      savedAt: '2026-05-01T00:00:00Z',
      payload: {
        loadedRows: [row('X')],
        lastBfmImportAt: '',
        staffingPlanActions: [],
        staffingPlanDerivedRemoved: [],
        positionNotes: [],
      },
    };
    const merged = mergeIdbRecords(splitSessionFile(legacy));
    expect(merged).not.toBeNull();
    expect(parseSessionFileFromValue(merged).ok).toBe(true);
    expect(merged!.payload.loadedRows).toEqual(legacy.payload.loadedRows);
    expect(merged!.payload.pendingSeparations).toEqual([]);
    expect(merged!.payload.probations).toEqual([]);
    expect(merged!.payload.jobPostings).toEqual([]);
    expect(merged!.payload.eligibilityLists).toEqual([]);
    expect(merged!.payload.pdfCache).toEqual([]);
  });
});

describe('mergeIdbRecords with missing groups (incremental reads)', () => {
  it('returns null when nothing is present (fresh browser)', () => {
    expect(mergeIdbRecords({})).toBeNull();
  });

  it('defaults rows + scrapers when only the planning record is present', () => {
    // After a planning-only edit before any import, the rows / scrapers
    // records may never have been written. The load must still succeed.
    const { meta, planning } = splitSessionFile(fullFile());
    const merged = mergeIdbRecords({ meta, planning });
    expect(merged).not.toBeNull();
    expect(parseSessionFileFromValue(merged).ok).toBe(true);
    expect(merged!.payload.loadedRows).toEqual([]);
    expect(merged!.payload.jobPostings).toEqual([]);
    expect(merged!.payload.positionNotes).toEqual([['10001', 'note one']]);
  });

  it('defaults planning + scrapers when only the rows record is present', () => {
    // The first import writes meta + rows only.
    const file = fullFile();
    const { meta, rows } = splitSessionFile(file);
    const merged = mergeIdbRecords({ meta, rows });
    expect(merged).not.toBeNull();
    expect(parseSessionFileFromValue(merged).ok).toBe(true);
    expect(merged!.payload.loadedRows).toEqual(file.payload.loadedRows);
    expect(merged!.payload.staffingPlanActions).toEqual([]);
    expect(merged!.payload.pdfCache).toEqual([]);
  });

  it('carries savedAt from the meta record', () => {
    const file = fullFile();
    const { meta, planning } = splitSessionFile(file);
    expect(mergeIdbRecords({ meta, planning })!.savedAt).toBe(file.savedAt);
  });
});

describe('STORE_GROUPS', () => {
  it('lists the mutable groups and excludes the always-written meta', () => {
    expect([...STORE_GROUPS]).toEqual(['rows', 'scrapers', 'planning']);
    expect(STORE_GROUPS as readonly string[]).not.toContain('meta');
  });
});
