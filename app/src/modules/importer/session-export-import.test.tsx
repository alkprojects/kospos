/**
 * Render tests for SessionExportImport — the Save / Publish gating.
 *
 * S44 fix: scraper data (live job postings + DHR eligibility lists) is
 * first-class session content (it auto-saves to IDB + rides along in the
 * published snapshot), so a scraper-only session must be savable +
 * publishable just like an uploaded labor report. Before the fix the
 * Save/Publish enable-check ignored the scrapers store, so an eligibility
 * refresh with no labor rows left the buttons disabled — the refresh could
 * not persist across devices.
 *
 * These tests pin the enable logic + the status summary at the view layer;
 * the snapshot round-trip itself is covered in session.test.ts.
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

const saveButton = () => screen.getByLabelText('Save current session to a JSON file');

describe('SessionExportImport — Save/Publish gating', () => {
  it('disables Save when every store is empty', () => {
    render(<SessionExportImport />);
    expect(saveButton()).toBeDisabled();
  });

  it('enables Save when only job postings are loaded (no labor rows)', () => {
    useScrapers.getState().setJobPostings([mkPosting(), mkPosting({ id: 'p2', jobCode: '2622' })]);
    render(<SessionExportImport />);
    expect(saveButton()).not.toBeDisabled();
  });

  it('enables Save when only eligibility lists are loaded (no labor rows)', () => {
    useScrapers.getState().setEligibilityLists([mkList()]);
    render(<SessionExportImport />);
    expect(saveButton()).not.toBeDisabled();
  });

  it('surfaces the scraper counts in the status summary', () => {
    useScrapers.getState().setJobPostings([mkPosting(), mkPosting({ id: 'p2', jobCode: '2622' })]);
    useScrapers.getState().setEligibilityLists([mkList()]);
    render(<SessionExportImport />);
    // One posting count is plural, the single list is singular.
    expect(screen.getByText(/2 postings/)).toBeInTheDocument();
    expect(screen.getByText(/1 eligibility list(?!s)/)).toBeInTheDocument();
  });
});
