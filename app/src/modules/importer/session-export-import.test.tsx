/**
 * Render test for SessionExportImport — the Load Reports tab's Publish panel.
 *
 * Save / Load gating moved to session-save-load.test.tsx in Phase 2.2.u (the
 * Save / Load buttons relocated to the header top bar). What stays here is the
 * status **summary** line, which still lives on this panel and must surface
 * scraper counts (live job postings + DHR eligibility lists) — first-class
 * session content that rides along in the published snapshot.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionExportImport } from './SessionExportImport';
import { useAppStore } from '../../lib/store';
import { useStaffingPlan } from '../../lib/staffing-plan';
import { useSeparations } from '../../lib/separations';
import { useProbations } from '../../lib/probation';
import { usePositionNotes } from '../../lib/positions/notes';
import { useScrapers } from '../../lib/scrapers/store';
import type { EligibilityList, JobPosting } from '../../lib/scrapers/types';

function mkPosting(over: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'p1', name: 'A Posting', jobCode: '1820', classTitle: 'Junior Admin Analyst',
    department: 'Building Inspection', location: '', releasedDate: '2026-05-15',
    url: 'https://example.com/posting', ...over,
  };
}

function mkList(over: Partial<EligibilityList> = {}): EligibilityList {
  return {
    jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-1820',
    postDate: '2025-08-15', fileUrl: 'https://sfdhr.org/list.pdf',
    type: 'score-report', ...over,
  };
}

/** Reset every store the panel reads so each test starts from a clean,
 *  fully-empty session. */
beforeEach(() => {
  useAppStore.getState().restoreFromSession([], '');
  useStaffingPlan.getState().restoreFromSession([], []);
  usePositionNotes.getState().restoreFromSession([]);
  useSeparations.getState().restoreFromSession([]);
  useProbations.getState().restoreFromSession([]);
  useScrapers.getState().clearAll();
});

describe('SessionExportImport — status summary', () => {
  it('surfaces the scraper counts in the status summary', () => {
    useScrapers.getState().setJobPostings([mkPosting(), mkPosting({ id: 'p2', jobCode: '2622' })]);
    useScrapers.getState().setEligibilityLists([mkList()]);
    render(<SessionExportImport />);
    // One posting count is plural, the single list is singular.
    expect(screen.getByText(/2 postings/)).toBeInTheDocument();
    expect(screen.getByText(/1 eligibility list(?!s)/)).toBeInTheDocument();
  });
});
