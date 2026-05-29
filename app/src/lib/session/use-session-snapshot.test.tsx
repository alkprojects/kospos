/**
 * useSessionSnapshot.loadFromFile round-trip — Phase 2.2.w / carry-forward M.
 *
 * Regression test for the file-load scraper-parity bug: a saved session file
 * always *carried* the scraper data (job postings / eligibility lists /
 * pdfCache), but loading one back used to restore only the core stores and
 * silently DROP the scrapers — leaving file-restored core data mixed with
 * whatever stale scrape was in memory. Only the IDB auto-restore path restored
 * scrapers. The fix routes both paths through the shared
 * restoreStoresFromPayload; this test pins the file path to that behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionSnapshot } from './use-session-snapshot';
import { useAppStore } from '../store';
import { useStaffingPlan } from '../staffing-plan';
import { useSeparations } from '../separations';
import { useProbations } from '../probation';
import { usePositionNotes } from '../positions/notes';
import { useScrapers } from '../scrapers/store';

function clearAllStores(): void {
  useAppStore.getState().clearAll();
  useStaffingPlan.getState().clearAll();
  useSeparations.getState().clearAll();
  useProbations.getState().clearAll();
  usePositionNotes.getState().clearAll();
  useScrapers.getState().clearAll();
}

describe('useSessionSnapshot loadFromFile', () => {
  beforeEach(clearAllStores);

  it('restores scraper data from a loaded file (parity with IDB auto-restore)', async () => {
    // Seed scraper data + a position note, then capture the snapshot the way
    // the Save control would. (Seeded BEFORE renderHook so the hook's
    // buildCurrentSnapshot selectors pick the data up.)
    useScrapers.setState({
      jobPostings: [{
        id: 'p1', name: 'Test (0932 Manager IV) - DBI', jobCode: '0932',
        classTitle: 'Manager IV', department: 'DBI', location: '',
        releasedDate: '2026-05-27T00:00:00Z', url: 'https://example.test/p1',
      }],
      jobPostingsRefreshedAt: '2026-05-28T14:30:00Z',
      eligibilityLists: [{
        jobCode: '0932', classTitle: 'Manager IV', listId: '140556',
        postDate: '2024-08-01', fileUrl: 'https://example.test/0932.pdf',
        type: 'score-report',
      }],
      eligibilityListsRefreshedAt: '2026-05-28T14:31:00Z',
      pdfCache: {
        '0932|140556|2024-08-01': {
          certRule: 'Rule of the List', listDepartment: 'HSA',
          examSubType: 'CPE', examType: 'PBT', duration: '6 Months',
          extractedAt: '2026-05-28T14:35:00Z', success: true,
        },
      },
    });
    usePositionNotes.getState().setNote('10001', 'Keep me');

    const { result } = renderHook(() => useSessionSnapshot());
    const json = JSON.stringify(result.current.buildCurrentSnapshot());

    // Simulate loading into a fresh session: wipe everything first so we can
    // prove the load (not leftover state) is what re-populates the scrapers.
    clearAllStores();
    expect(useScrapers.getState().eligibilityLists).toHaveLength(0);
    expect(usePositionNotes.getState().notes.size).toBe(0);

    const outcome = await result.current.loadFromFile(
      new File([json], 'session.json', { type: 'application/json' }),
    );

    expect(outcome.ok).toBe(true);
    // The bug: scraper data must now be restored from the file.
    expect(useScrapers.getState().jobPostings).toHaveLength(1);
    expect(useScrapers.getState().eligibilityLists).toHaveLength(1);
    expect(useScrapers.getState().eligibilityLists[0].jobCode).toBe('0932');
    expect(useScrapers.getState().pdfCache['0932|140556|2024-08-01'].duration)
      .toBe('6 Months');
    // No regression: core data still restores alongside.
    expect(usePositionNotes.getState().notes.get('10001')).toBe('Keep me');
  });
});
