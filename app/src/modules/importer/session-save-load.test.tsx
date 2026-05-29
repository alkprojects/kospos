/**
 * Render tests for SessionSaveLoad — the top-bar Save / Load control.
 *
 * The Save-enable gating moved here from SessionExportImport in Phase 2.2.u
 * (Save / Load relocated to the header top bar). Scraper data (live job
 * postings + DHR eligibility lists) is first-class session content, so a
 * scraper-only session must be savable just like an uploaded labor report.
 *
 * The snapshot round-trip itself is covered in session.test.ts; the shared
 * build/save/load plumbing lives in useSessionSnapshot.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionSaveLoad } from './SessionSaveLoad';
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

/** Reset every store the control reads so each test starts fully empty. */
beforeEach(() => {
  useAppStore.getState().restoreFromSession([], '');
  useStaffingPlan.getState().restoreFromSession([], []);
  usePositionNotes.getState().restoreFromSession([]);
  useSeparations.getState().restoreFromSession([]);
  useProbations.getState().restoreFromSession([]);
  useScrapers.getState().clearAll();
});

const saveButton = () => screen.getByLabelText('Save current session to a JSON file');

describe('SessionSaveLoad — Save gating', () => {
  it('disables Save when every store is empty', () => {
    render(<SessionSaveLoad />);
    expect(saveButton()).toBeDisabled();
  });

  it('enables Save when only job postings are loaded (no labor rows)', () => {
    useScrapers.getState().setJobPostings([mkPosting(), mkPosting({ id: 'p2', jobCode: '2622' })]);
    render(<SessionSaveLoad />);
    expect(saveButton()).not.toBeDisabled();
  });

  it('enables Save when only eligibility lists are loaded (no labor rows)', () => {
    useScrapers.getState().setEligibilityLists([mkList()]);
    render(<SessionSaveLoad />);
    expect(saveButton()).not.toBeDisabled();
  });

  it('always offers a Load button', () => {
    render(<SessionSaveLoad />);
    expect(screen.getByLabelText('Load a previously-saved session file')).toBeInTheDocument();
  });
});
