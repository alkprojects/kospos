/**
 * Render tests for EligibilityView — Phase 2.2.m summary-row + filter
 * overhaul.
 *
 * Heavy live-data coverage stays in scrapers.test.ts (pure helpers) and
 * the preview-MCP walkthrough (real browser). This file pins the view-
 * layer behavior that is awkward to exercise from the unit-helper layer:
 *
 *   - Empty-state copy when the store has no postings + no lists
 *   - One summary row per job code; counts + date ranges render compact
 *   - Click row → detail modal opens with postings + active + expired
 *   - Esc / Close on the modal returns to the table
 *   - Status filter narrows the visible rows
 *   - Search filter narrows the visible rows
 *   - Exam-type chip filters narrow the visible rows
 *   - Reset filters restores the full table
 *
 * The scrapers store is reset between tests via clearAll() — note that
 * clearAll preserves dhrWorkerUrl per store.ts:103-108 (intentional).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EligibilityView } from './EligibilityView';
import { useScrapers } from '../../scrapers';
import type { EligibilityList, JobPosting } from '../../scrapers';

// ---------------------------------------------------------------------------
// Test fixtures — 4 job codes mirroring the applyEligibilityFilters test
// shape from scrapers.test.ts so behavior stays cross-checked.
// ---------------------------------------------------------------------------

function mkPosting(over: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'p',
    name: 'A Posting',
    jobCode: '1820',
    classTitle: '',
    department: '',
    location: '',
    releasedDate: '2026-05-01',
    url: 'https://example.com/posting',
    ...over,
  };
}

function mkList(over: Partial<EligibilityList> = {}): EligibilityList {
  return {
    jobCode: '1820',
    classTitle: '',
    listId: 'L0001',
    postDate: '2026-05-01',
    fileUrl: 'https://sfdhr.org/list.pdf',
    type: 'score-report',
    ...over,
  };
}

/** Seed 4 rollups covering each (posting × list) quadrant. */
function seedFourRollups() {
  useScrapers.getState().setJobPostings([
    mkPosting({ id: 'p1', jobCode: '1820', classTitle: 'Junior Admin Analyst',
                department: 'Building Inspection', releasedDate: '2026-05-15' }),
    mkPosting({ id: 'p2', jobCode: '2622', classTitle: 'Dietetic Technician',
                department: 'Public Health',       releasedDate: '2026-04-20' }),
  ]);
  useScrapers.getState().setEligibilityLists([
    mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-1820',
             postDate: '2025-08-15', type: 'score-report' }),
    mkList({ jobCode: 'Q002', classTitle: 'Police Officer', listId: 'L-Q002',
             postDate: '2022-01-01', type: 'eligible-list' }),
    mkList({ jobCode: '0932', classTitle: 'Manager IV', listId: 'L-0932',
             postDate: '2026-03-10', type: 'score-report' }),
  ]);
}

beforeEach(() => {
  useScrapers.getState().clearAll();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EligibilityView — summary table', () => {
  it('shows the empty-state copy when no postings + no lists exist', () => {
    render(<EligibilityView />);
    expect(screen.getByText(/No data yet/i)).toBeInTheDocument();
  });

  it('renders one summary row per job code when data is loaded', () => {
    seedFourRollups();
    render(<EligibilityView />);
    // Each job code appears once in the summary table cell.
    expect(screen.getByText('1820')).toBeInTheDocument();
    expect(screen.getByText('2622')).toBeInTheDocument();
    expect(screen.getByText('Q002')).toBeInTheDocument();
    expect(screen.getByText('0932')).toBeInTheDocument();
  });

  it('summary row carries count + date range hints, not stacked links', () => {
    seedFourRollups();
    render(<EligibilityView />);
    // 1820 has 1 active list posted 2025-08-15. The date renders with a
    // leading "· " separator, so match by regex.
    expect(screen.getByText(/2025-08-15/)).toBeInTheDocument();
    // 1820 has 1 posting released 2026-05-15.
    expect(screen.getByText(/newest 2026-05-15/)).toBeInTheDocument();
  });

  it('marks list-only rollups with the "citywide?" hint chip', () => {
    seedFourRollups();
    render(<EligibilityView />);
    // 0932 (list, no posting) + Q002 (expired list, no posting) both
    // qualify; "citywide?" should appear at least twice.
    expect(screen.getAllByText('citywide?').length).toBeGreaterThanOrEqual(2);
  });
});

describe('EligibilityView — detail modal', () => {
  it('opens the detail modal when a summary row is clicked', () => {
    seedFourRollups();
    render(<EligibilityView />);
    // Find the row by its aria-label (assigned per SummaryRow component).
    const row = screen.getByRole('button', { name: /Open detail for 1820/i });
    fireEvent.click(row);
    // Modal carries an aria-label per EligibilityDetail.
    const modal = screen.getByRole('dialog', { name: /Eligibility detail for job code 1820/i });
    expect(modal).toBeInTheDocument();
    // Modal shows the posting + active-list sections for 1820.
    expect(within(modal).getByText(/Open postings/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Active eligibility lists/i)).toBeInTheDocument();
  });

  it('closes the modal when the footer Close button is clicked', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // The modal has TWO close affordances both named "Close" (header ×
    // with aria-label and footer text button). Pick the footer one by
    // its exact visible text content — getAllByRole returns both; the
    // footer button is the one whose textContent is exactly "Close".
    const closes = within(modal).getAllByRole('button', { name: /^Close$/i });
    const footer = closes.find(b => b.textContent === 'Close');
    expect(footer).toBeDefined();
    fireEvent.click(footer!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the expired-only rollup detail with expired-section disclosure', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for Q002/i }));
    const modal = screen.getByRole('dialog');
    // The expired disclosure summary contains the count.
    expect(within(modal).getByText(/Expired lists \(1\)/)).toBeInTheDocument();
    // No active section content — Q002 has 0 active lists.
    expect(within(modal).getByText(/No active lists within the 2-year window/i)).toBeInTheDocument();
  });
});

describe('EligibilityView — filters', () => {
  it('search narrows the rendered rows to job codes / class titles matching', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.change(screen.getByLabelText(/Search rollups/i), { target: { value: 'manager' } });
    // 0932 Manager IV matches; others should not.
    expect(screen.getByText('0932')).toBeInTheDocument();
    expect(screen.queryByText('1820')).not.toBeInTheDocument();
    expect(screen.queryByText('Q002')).not.toBeInTheDocument();
  });

  it('status=active drops rollups with no active lists', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.change(screen.getByLabelText(/Status filter/i), { target: { value: 'active' } });
    // 1820 + 0932 have active lists; 2622 (posting-only) + Q002 (expired-only) drop.
    expect(screen.getByText('1820')).toBeInTheDocument();
    expect(screen.getByText('0932')).toBeInTheDocument();
    expect(screen.queryByText('2622')).not.toBeInTheDocument();
    expect(screen.queryByText('Q002')).not.toBeInTheDocument();
  });

  it('exam-type chip toggle narrows to rollups with at least one matching list', () => {
    seedFourRollups();
    render(<EligibilityView />);
    // Click the eligible-list chip → only Q002 should remain.
    fireEvent.click(screen.getByRole('button', { name: /Eligible lists \(uniformed\)/i }));
    expect(screen.getByText('Q002')).toBeInTheDocument();
    expect(screen.queryByText('1820')).not.toBeInTheDocument();
    expect(screen.queryByText('0932')).not.toBeInTheDocument();
    expect(screen.queryByText('2622')).not.toBeInTheDocument();
  });

  it('reset-filters restores the full table after narrowing', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.change(screen.getByLabelText(/Search rollups/i), { target: { value: 'manager' } });
    expect(screen.queryByText('1820')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reset filters/i }));
    expect(screen.getByText('1820')).toBeInTheDocument();
    expect(screen.getByText('Q002')).toBeInTheDocument();
  });
});
