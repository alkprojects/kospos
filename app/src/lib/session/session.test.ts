/**
 * lib/session/ tests — pure serializer / deserializer round-trip + the
 * parse-error tagging. No store integration here; the UI component is
 * the only place the stores actually get touched.
 */

import { describe, it, expect } from 'vitest';
import {
  SESSION_SCHEMA_VERSION,
  buildSessionFile,
  defaultSessionFilename,
  parseSessionFile,
} from './snapshot';
import type { ImportedRow } from '../importers/types';
import type { PlannedAction } from '../staffing-plan';
import type { PendingSeparation } from '../separations';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function obiRow(positionIdentifier: string, partial: Partial<ImportedRow> = {}): ImportedRow {
  return {
    _source: 'obi-payroll',
    _row: 1,
    fiscalYear: '2026',
    departmentGroupCode: 'DBI',
    fundLvl1Code: '',
    fundLvl1Description: '',
    fundControl: '',
    fund: '',
    fundDescription: '',
    departmentCode: '',
    departmentName: '',
    projectCode: '',
    projectDescription: '',
    activityCode: '',
    activityDescription: '',
    authorityLvl1Code: '',
    authorityLvl1Description: '',
    authority: '',
    authorityDescription: '',
    accountLvl2Description: '',
    accountLvl5Name: '',
    accountLvl3Description: '',
    accountCode: '',
    accountDescription: '',
    earningPeriodNumber: 1,
    earningPeriodEnd: '2026-05-08',
    personNumber: '12345',
    personFullName: 'Test, Person',
    rosterCode: '',
    earningsCode: 'WKP',
    earningsDescription: '',
    positionIdentifier,
    jobCode: '6278',
    jobCodeSet: 'COMMN',
    jobDescription: 'Building Inspector',
    assignmentNumber: 0,
    appointmentType: 'PCS',
    isFteHours: 'Y',
    earningHours: 80,
    payPeriodFTE: 1,
    balanceAmount: 5000,
    _asOfDate: '2026-05-08',
    ...partial,
  } as ImportedRow;
}

function plannedAction(id: string, positionId: string): PlannedAction {
  return {
    id,
    positionId,
    displayNumber: positionId,
    type: 'active-hire',
    status: 'not-started',
    basis: null,
    notes: '',
    plannedAt: '2026-05-26T00:00:00.000Z',
    history: [],
  };
}

function pendingSep(id: string, employeeName: string): PendingSeparation {
  return {
    id,
    employeeName,
    status: 'rumored',
    confidence: 'medium',
    notes: '',
    history: [],
    createdAt: '2026-05-27T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// buildSessionFile + parseSessionFile round-trip
// ---------------------------------------------------------------------------

describe('session snapshot round-trip', () => {
  it('round-trips an empty session cleanly', () => {
    const file = buildSessionFile({
      loadedRows: [],
      lastBfmImportAt: '',
      staffingPlanActions: new Map(),
      staffingPlanDerivedRemoved: new Set(),
      positionNotes: new Map(),
    });
    expect(file.kind).toBe('kospos-session');
    expect(file.schemaVersion).toBe(SESSION_SCHEMA_VERSION);
    expect(file.payload.loadedRows).toEqual([]);
    expect(file.payload.staffingPlanActions).toEqual([]);
    expect(file.payload.staffingPlanDerivedRemoved).toEqual([]);
    expect(file.payload.positionNotes).toEqual([]);

    const json = JSON.stringify(file);
    const parsed = parseSessionFile(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.file.payload.loadedRows).toEqual([]);
    }
  });

  it('round-trips loaded rows + actions + notes + hidden derived', () => {
    const file = buildSessionFile({
      loadedRows: [obiRow('10001'), obiRow('10002')],
      lastBfmImportAt: '2026-05-25',
      staffingPlanActions: new Map([
        ['a1', plannedAction('a1', '10001')],
        ['a2', plannedAction('a2', '10002')],
      ]),
      staffingPlanDerivedRemoved: new Set(['50001', '50002']),
      positionNotes: new Map([
        ['10001', 'Note A'],
        ['10002', 'Note B'],
      ]),
      label: 'mid-FY check',
    });
    expect(file.label).toBe('mid-FY check');

    const json = JSON.stringify(file);
    const parsed = parseSessionFile(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // Map and Set entries survive as ordered tuples.
    expect(parsed.file.payload.loadedRows).toHaveLength(2);
    expect(parsed.file.payload.staffingPlanActions).toHaveLength(2);
    expect(parsed.file.payload.staffingPlanActions[0][0]).toBe('a1');
    expect(parsed.file.payload.staffingPlanActions[0][1].positionId).toBe('10001');
    expect(parsed.file.payload.staffingPlanDerivedRemoved).toEqual(['50001', '50002']);
    expect(parsed.file.payload.positionNotes).toEqual([
      ['10001', 'Note A'],
      ['10002', 'Note B'],
    ]);
    expect(parsed.file.payload.lastBfmImportAt).toBe('2026-05-25');
  });

  it('round-trips pendingSeparations through Map → array → Map', () => {
    const file = buildSessionFile({
      loadedRows: [],
      lastBfmImportAt: '',
      staffingPlanActions: new Map(),
      staffingPlanDerivedRemoved: new Set(),
      positionNotes: new Map(),
      pendingSeparations: new Map([
        ['s1', pendingSep('s1', 'Smith, A.')],
        ['s2', pendingSep('s2', 'Jones, B.')],
      ]),
    });
    expect(file.payload.pendingSeparations).toHaveLength(2);

    const json = JSON.stringify(file);
    const parsed = parseSessionFile(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.payload.pendingSeparations).toHaveLength(2);
    expect(parsed.file.payload.pendingSeparations![0][1].employeeName).toBe('Smith, A.');
  });

  it('defaults pendingSeparations to [] when buildSessionFile omits the arg (back-compat)', () => {
    const file = buildSessionFile({
      loadedRows: [],
      lastBfmImportAt: '',
      staffingPlanActions: new Map(),
      staffingPlanDerivedRemoved: new Set(),
      positionNotes: new Map(),
      // pendingSeparations omitted on purpose
    });
    expect(file.payload.pendingSeparations).toEqual([]);
  });

  it('parseSessionFile accepts a v1 file with pendingSeparations missing entirely', () => {
    // Simulates a session file saved on a build prior to Phase 2.2.i, when
    // the field didn't exist. Should still parse cleanly.
    const result = parseSessionFile(JSON.stringify({
      kind: 'kospos-session',
      schemaVersion: SESSION_SCHEMA_VERSION,
      savedAt: '2026-05-27T00:00:00.000Z',
      payload: {
        loadedRows: [],
        lastBfmImportAt: '',
        staffingPlanActions: [],
        staffingPlanDerivedRemoved: [],
        positionNotes: [],
        // pendingSeparations intentionally omitted
      },
    }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.payload.pendingSeparations).toBeUndefined();
    }
  });

  it('parseSessionFile rejects pendingSeparations if present but not an array', () => {
    const result = parseSessionFile(JSON.stringify({
      kind: 'kospos-session',
      schemaVersion: SESSION_SCHEMA_VERSION,
      savedAt: '2026-05-27T00:00:00.000Z',
      payload: {
        loadedRows: [],
        lastBfmImportAt: '',
        staffingPlanActions: [],
        staffingPlanDerivedRemoved: [],
        positionNotes: [],
        pendingSeparations: 'oops not an array',
      },
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-a-session-file');
  });

  it('savedAt is an ISO timestamp at build time', () => {
    const before = Date.now();
    const file = buildSessionFile({
      loadedRows: [],
      lastBfmImportAt: '',
      staffingPlanActions: new Map(),
      staffingPlanDerivedRemoved: new Set(),
      positionNotes: new Map(),
    });
    const after = Date.now();
    const t = new Date(file.savedAt).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
    expect(file.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ---------------------------------------------------------------------------
// parseSessionFile error branches
// ---------------------------------------------------------------------------

describe('parseSessionFile error branches', () => {
  it('rejects invalid JSON', () => {
    const result = parseSessionFile('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid-json');
  });

  it('rejects valid JSON that is not an object', () => {
    const result = parseSessionFile('[1,2,3]');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-a-session-file');
  });

  it('rejects wrong kind tag', () => {
    const result = parseSessionFile(JSON.stringify({
      kind: 'something-else', schemaVersion: 1, savedAt: '', payload: {},
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-a-session-file');
  });

  it('rejects future schemaVersion (and surfaces both got + expected)', () => {
    const result = parseSessionFile(JSON.stringify({
      kind: 'kospos-session',
      schemaVersion: 999,
      savedAt: '2026-05-26T00:00:00.000Z',
      payload: {
        loadedRows: [], lastBfmImportAt: '',
        staffingPlanActions: [], staffingPlanDerivedRemoved: [], positionNotes: [],
      },
    }));
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === 'schema-mismatch') {
      expect(result.got).toBe(999);
      expect(result.expected).toBe(SESSION_SCHEMA_VERSION);
    } else {
      throw new Error('expected schema-mismatch');
    }
  });

  it('rejects payload missing required arrays', () => {
    const result = parseSessionFile(JSON.stringify({
      kind: 'kospos-session',
      schemaVersion: SESSION_SCHEMA_VERSION,
      savedAt: '2026-05-26T00:00:00.000Z',
      payload: {
        // loadedRows missing!
        lastBfmImportAt: '',
        staffingPlanActions: [], staffingPlanDerivedRemoved: [], positionNotes: [],
      },
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-a-session-file');
  });
});

// ---------------------------------------------------------------------------
// defaultSessionFilename
// ---------------------------------------------------------------------------

describe('defaultSessionFilename', () => {
  it('formats local-time YYYY-MM-DDTHHMM', () => {
    // Use UTC date that maps to a known local time depending on tz —
    // assert the pattern, not the exact value.
    const filename = defaultSessionFilename(new Date(2026, 4, 26, 14, 35));
    expect(filename).toBe('kospos-session-2026-05-26T1435.json');
  });

  it('pads single-digit month / day / hour / minute', () => {
    const filename = defaultSessionFilename(new Date(2026, 0, 5, 7, 9));
    expect(filename).toBe('kospos-session-2026-01-05T0709.json');
  });
});
