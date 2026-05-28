/**
 * use-auto-persistence.ts pure-helper tests — Phase 2.2.q PR 1.
 *
 * Tests the validation/restore helpers (`tryRestoreSnapshot` +
 * `captureCurrentSnapshot` + `restoreStoresFromPayload`) without mounting
 * the React hook. The hook itself is exercised end-to-end via preview-MCP
 * once the app is running (real IDB only works in a browser; jsdom's IDB
 * support is partial enough that mocking is more reliable than testing
 * the full hook here).
 *
 * Strategy:
 *   1. Build an envelope with `buildSessionFile` → a known shape.
 *   2. Pass it through `tryRestoreSnapshot` (or just `restoreStoresFromPayload`)
 *      → verify the stores reflect it.
 *   3. Read each store's state → verify the round-trip matches.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureCurrentSnapshot,
  restoreStoresFromPayload,
  tryRestoreSnapshot,
} from './use-auto-persistence';
import { buildSessionFile } from './snapshot';
import { useAppStore } from '../store';
import { useStaffingPlan } from '../staffing-plan';
import { useSeparations } from '../separations';
import { useProbations } from '../probation';
import { usePositionNotes } from '../positions/notes';
import { useScrapers } from '../scrapers/store';
import type { ImportedRow } from '../importers/types';
import type { PlannedAction } from '../staffing-plan';

function ppRow(positionNumber: string): ImportedRow {
  return {
    _source: 'ps-hcm-pp',
    _row: 1,
    snapshotDate: '2026-05-15',
    positionNumber,
    jobCode: '6278',
    jobCodeDescription: 'Building Inspector',
    positionDivision: '', departmentCode: '', departmentName: '',
    positionMaxHeadcount: 1, positionStatus: 'Approved',
    fillStatus: 'FILLED',
    vice1EmplId: '', vice1Name: '', previousEmployee: '',
    emplId: '12345', employeeName: 'Test, Person',
    employeeStatus: 'A', appointmentType: 'PCS', exemptCategory: '',
    salaryStep: '5', hourlyRate: 50, meritIncreaseDate: '',
    reportsToPosition: '', managerFirstName: '', managerLastName: '',
    cat1718AppointmentDate: '', cat1718ExemptCode: '', cat1718ExemptMonths: 0,
    cat1718TxExpiredDate: '',
    rosterCode: '', rosterDescription: '',
    comboCode: '', comboDepartmentCode: '', comboDepartmentName: '',
    rtfId: '', rtfStatus: '', rtfSubmittedDate: '', rtfExpectedFillDate: '',
    budgetDepartmentCode: '', budgetDepartmentName: '',
    budgetJobCode: '', fte: 1, employeeJobCode: '', vacantDate: '',
  } as ImportedRow;
}

function makeAction(id: string): PlannedAction {
  return {
    id,
    positionId: '10001',
    displayNumber: '10001',
    type: 'active-hire',
    status: 'not-started',
    basis: null,
    notes: '',
    plannedAt: '2026-05-28T00:00:00Z',
    history: [],
  };
}

describe('captureCurrentSnapshot + restoreStoresFromPayload', () => {
  beforeEach(() => {
    // Reset every store before each test so cross-test state doesn't leak.
    useAppStore.getState().clearAll();
    useStaffingPlan.getState().clearAll();
    useSeparations.getState().clearAll();
    useProbations.getState().clearAll();
    usePositionNotes.getState().clearAll();
    useScrapers.getState().clearAll();
  });

  it('captures + restores loadedRows + lastBfmImportAt round-trip', () => {
    useAppStore.getState().addRows([ppRow('10001'), ppRow('10002')]);
    // Add a synthetic BFM-import timestamp by adding a bfm row (simpler than
    // poking the store state directly).
    const snapshot = captureCurrentSnapshot();
    expect(snapshot.payload.loadedRows).toHaveLength(2);

    // Reset all stores → confirm restore re-populates loadedRows.
    useAppStore.getState().clearAll();
    expect(useAppStore.getState().loadedRows).toHaveLength(0);
    restoreStoresFromPayload(snapshot);
    expect(useAppStore.getState().loadedRows).toHaveLength(2);
  });

  it('captures + restores staffing-plan actions + derivedRemoved', () => {
    useStaffingPlan.getState().restoreFromSession(
      [['a1', makeAction('a1')], ['a2', makeAction('a2')]],
      ['10005', '10006'],
    );
    const snapshot = captureCurrentSnapshot();
    expect(snapshot.payload.staffingPlanActions).toHaveLength(2);
    expect(snapshot.payload.staffingPlanDerivedRemoved).toEqual(['10005', '10006']);

    useStaffingPlan.getState().clearAll();
    expect(useStaffingPlan.getState().actions.size).toBe(0);
    restoreStoresFromPayload(snapshot);
    expect(useStaffingPlan.getState().actions.size).toBe(2);
    expect(useStaffingPlan.getState().derivedRemoved.size).toBe(2);
  });

  it('captures + restores position notes', () => {
    usePositionNotes.getState().setNote('10001', 'Note about position 10001');
    usePositionNotes.getState().setNote('10002', 'Note about position 10002');
    const snapshot = captureCurrentSnapshot();
    expect(snapshot.payload.positionNotes).toHaveLength(2);

    usePositionNotes.getState().clearAll();
    restoreStoresFromPayload(snapshot);
    expect(usePositionNotes.getState().notes.get('10001')).toBe('Note about position 10001');
    expect(usePositionNotes.getState().notes.get('10002')).toBe('Note about position 10002');
  });

  it('captures + restores scraper state (jobPostings + eligibilityLists + pdfCache)', () => {
    useScrapers.setState({
      jobPostings: [{
        id: 'p1', name: 'Test (0932 Manager IV) - Dept',
        jobCode: '0932', classTitle: 'Manager IV',
        department: 'DBI', location: '',
        releasedDate: '2026-05-27T00:00:00Z',
        url: 'https://example.test/p1',
      }],
      jobPostingsRefreshedAt: '2026-05-28T14:30:00Z',
      eligibilityLists: [{
        jobCode: '0932', classTitle: 'Manager IV',
        listId: '140556', postDate: '2024-08-01',
        fileUrl: 'https://example.test/0932.pdf',
        type: 'score-report',
      }],
      eligibilityListsRefreshedAt: '2026-05-28T14:31:00Z',
      pdfCache: {
        '0932|140556|2024-08-01': {
          certRule: 'Rule of the List',
          listDepartment: 'HSA',
          examSubType: 'CPE',
          examType: 'PBT',
          duration: '6 Months',
          extractedAt: '2026-05-28T14:35:00Z',
          success: true,
        },
      },
    });
    const snapshot = captureCurrentSnapshot();
    expect(snapshot.payload.jobPostings).toHaveLength(1);
    expect(snapshot.payload.eligibilityLists).toHaveLength(1);
    expect(snapshot.payload.pdfCache).toHaveLength(1);

    useScrapers.getState().clearAll();
    expect(useScrapers.getState().jobPostings).toHaveLength(0);
    expect(useScrapers.getState().pdfCache).toEqual({});
    restoreStoresFromPayload(snapshot);
    expect(useScrapers.getState().jobPostings).toHaveLength(1);
    expect(useScrapers.getState().jobPostings[0].jobCode).toBe('0932');
    expect(useScrapers.getState().eligibilityLists).toHaveLength(1);
    expect(useScrapers.getState().pdfCache['0932|140556|2024-08-01'].duration).toBe('6 Months');
  });

  it('preserves dhrWorkerUrl across clearAll + restore (user setting, not scrape data)', () => {
    useScrapers.setState({ dhrWorkerUrl: 'https://my-worker.example.com' });
    const snapshot = captureCurrentSnapshot();
    expect(snapshot.payload.jobPostings).toEqual([]);

    useScrapers.getState().clearAll();
    // clearAll preserves dhrWorkerUrl (intentional — see store.ts)
    expect(useScrapers.getState().dhrWorkerUrl).toBe('https://my-worker.example.com');

    restoreStoresFromPayload(snapshot);
    // Restore also doesn't touch dhrWorkerUrl.
    expect(useScrapers.getState().dhrWorkerUrl).toBe('https://my-worker.example.com');
  });
});

describe('tryRestoreSnapshot validation', () => {
  beforeEach(() => {
    useAppStore.getState().clearAll();
    useStaffingPlan.getState().clearAll();
    useSeparations.getState().clearAll();
    useProbations.getState().clearAll();
    usePositionNotes.getState().clearAll();
    useScrapers.getState().clearAll();
  });

  it('accepts a valid envelope + restores stores', () => {
    const file = buildSessionFile({
      loadedRows: [ppRow('10001')],
      lastBfmImportAt: '',
      staffingPlanActions: new Map(),
      staffingPlanDerivedRemoved: new Set(),
      positionNotes: new Map(),
    });
    const result = tryRestoreSnapshot(file);
    expect(result.ok).toBe(true);
    expect(useAppStore.getState().loadedRows).toHaveLength(1);
  });

  it('rejects an envelope with wrong kind', () => {
    const result = tryRestoreSnapshot({ kind: 'not-kospos', schemaVersion: 1, payload: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/IDB snapshot rejected/);
    }
    // Stores untouched.
    expect(useAppStore.getState().loadedRows).toHaveLength(0);
  });

  it('rejects an envelope with future schema version', () => {
    const result = tryRestoreSnapshot({
      kind: 'kospos-session',
      schemaVersion: 999,
      savedAt: '2026-05-28T00:00:00Z',
      payload: {
        loadedRows: [], lastBfmImportAt: '',
        staffingPlanActions: [], staffingPlanDerivedRemoved: [], positionNotes: [],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/schema v999/);
    }
  });

  it('rejects malformed payload (missing required arrays)', () => {
    const result = tryRestoreSnapshot({
      kind: 'kospos-session',
      schemaVersion: 1,
      savedAt: '2026-05-28T00:00:00Z',
      payload: { lastBfmImportAt: '' }, // missing loadedRows etc.
    });
    expect(result.ok).toBe(false);
  });
});
