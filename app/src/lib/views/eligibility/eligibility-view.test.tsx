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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { EligibilityView } from './EligibilityView';
import { useScrapers } from '../../scrapers';
import type { EligibilityList, JobPosting, PdfExtract } from '../../scrapers';

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
  // Phase 2.2.o: opening the modal triggers a useEffect that calls
  // fetchPdfExtractIfNeeded, which by default dynamic-imports pdfjs and
  // spawns a Worker — neither works in jsdom. Tests that want to verify
  // a specific PDF state seed pdfCache directly via setPdfExtract; tests
  // that want to assert call arguments override this with vi.fn().
  useScrapers.setState({ fetchPdfExtractIfNeeded: () => {} });
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
    // Phase 2.2.n: header × has aria-label "Close detail" (per Phase 2.2.m
    // audit recommendation #4 — disambiguates from the footer "Close"
    // button). The footer's accessible name is its text "Close" — that's
    // what the strict regex /^Close$/i picks up.
    fireEvent.click(within(modal).getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('header × button has aria-label "Close detail" to disambiguate from footer Close', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Phase 2.2.n audit follow-up: rename header close aria-label.
    expect(within(modal).getByRole('button', { name: /Close detail/i })).toBeInTheDocument();
  });

  it('modal header drops the constant Duration chip (Phase 2.2.p — per-list Duration is now a column)', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Phase 2.2.p: the "Duration: 2 yr · CSC 411A/412" header chip was
    // dropped — real DHR PDFs encode per-list durations (12 Months, 6
    // Months, etc.), refuting the constant-2yr assumption. The label
    // moves to a per-row column.
    expect(within(modal).queryByText(/2 yr.*CSC.*411A.*412/)).not.toBeInTheDocument();
    // The word "Duration" still appears (as a column header + in the
    // footnote describing PDF columns) so don't assert its absence.
  });

  it('lists table column shape is Post date / List ID / Duration / Expires / Status / Cert rule / Dept / Exam Type / File (Phase 2.2.p)', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Scope to <th> elements so the assertions don't collide with the
    // footnote / progress bar / filter toolbar which also reference
    // these labels.
    const headerTexts = within(modal).getAllByRole('columnheader')
      .map(h => h.textContent?.trim() ?? '');
    expect(headerTexts.some(t => t.startsWith('Post date'))).toBe(true);
    expect(headerTexts.some(t => t.startsWith('List ID'))).toBe(true);
    // Phase 2.2.p — Duration + Exam Type promoted to per-row columns.
    expect(headerTexts.some(t => t.startsWith('Duration'))).toBe(true);
    expect(headerTexts.some(t => t.startsWith('Expires'))).toBe(true);
    expect(headerTexts.some(t => t.startsWith('Status'))).toBe(true);
    // Phase 2.2.o columns still present
    expect(headerTexts.some(t => t.startsWith('Cert rule'))).toBe(true);
    expect(headerTexts.some(t => t.startsWith('Dept'))).toBe(true);
    expect(headerTexts.some(t => t.startsWith('Exam Type'))).toBe(true);
    expect(headerTexts.some(t => t.startsWith('File'))).toBe(true);
    // Phase 2.2.p — Sub-type column dropped per Alex's S39 directive
    // ("the important field to show is exam type, not list type").
    // The List Type / examSubType value stays in pdfCache for future
    // use but is no longer rendered per-row.
    expect(headerTexts.some(t => t.startsWith('Sub-type'))).toBe(false);
    // Phase 2.2.n — Type column still gone.
    expect(within(modal).queryByText(/Score report \(civil service\)/i)).not.toBeInTheDocument();
    expect(headerTexts.some(t => t === 'Type')).toBe(false);
  });

  it('lists table renders the derived expiration date for each row', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // 1820's active list postDate 2025-08-15 → expiration 2027-08-15.
    expect(within(modal).getByText('2027-08-15')).toBeInTheDocument();
  });

  it('expired-list row shows the "expired Xd ago" status pill', () => {
    seedFourRollups();
    render(<EligibilityView />);
    // Q002 has an expired list (postDate 2022-01-01).
    fireEvent.click(screen.getByRole('button', { name: /Open detail for Q002/i }));
    const modal = screen.getByRole('dialog');
    // Open the expired-list disclosure to mount the inner table.
    fireEvent.click(within(modal).getByText(/Expired lists \(1\)/));
    expect(within(modal).getByText(/expired.*d ago/i)).toBeInTheDocument();
  });

  it('expired disclosure shows the type breakdown for uniformed-only rollups', () => {
    seedFourRollups();
    render(<EligibilityView />);
    // Q002 has 1 expired eligible-list → breakdown should read "1 eligible list".
    fireEvent.click(screen.getByRole('button', { name: /Open detail for Q002/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText(/1 eligible list/i)).toBeInTheDocument();
  });

  it('modal footnote describes the PDF columns + their loading/failure states (Phase 2.2.p update)', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Phase 2.2.p footnote: replaces Phase 2.2.o "Cert rule · Dept ·
    // Sub-type" copy. Now lists Duration + Cert rule + Dept + Exam Type
    // (Sub-type / List Type dropped per Alex's S39 directive).
    expect(within(modal).getByText(/Duration.*Cert rule.*Dept.*Exam Type/)).toBeInTheDocument();
    expect(within(modal).getByText(/extracted on demand/i)).toBeInTheDocument();
    // References both Phase 2.2.o (origin) and Phase 2.2.p (this PR).
    expect(within(modal).getByText(/Phase 2\.2\.o/)).toBeInTheDocument();
    expect(within(modal).getByText(/Phase 2\.2\.p/)).toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// Phase 2.2.o — PDF cover-sheet column rendering + lazy fetch behavior.
// ---------------------------------------------------------------------------

describe('EligibilityDetail — Phase 2.2.o PDF columns', () => {
  /** Build a minimal PdfExtract for one of the seedFourRollups lists. */
  function mkExtract(over: Partial<PdfExtract> = {}): PdfExtract {
    return {
      extractedAt: '2026-05-27T00:00:00.000Z',
      success: true,
      ...over,
    };
  }

  it('renders "…" in each PDF cell when extraction has not yet cached', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // 1820 has 1 active list × 3 PDF cells = 3 ellipsis placeholders.
    const dots = within(modal).getAllByText('…');
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the extracted values when pdfCache has a success entry (Phase 2.2.p — Exam Type replaces Sub-type)', () => {
    seedFourRollups();
    // Use 'DBI' for listDepartment to avoid colliding with the seeded
    // posting's department string ('Building Inspection') already
    // rendered elsewhere in the modal.
    useScrapers.getState().setPdfExtract('1820|L-1820|2025-08-15', mkExtract({
      certRule: 'Rule of 3 Names',
      listDepartment: 'DBI',
      examSubType: 'Promotional',   // dropped from per-row UI in Phase 2.2.p
      examType: 'PBT',              // promoted to per-row UI in Phase 2.2.p
      duration: '12 Months',
    }));
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Rule of 3 Names')).toBeInTheDocument();
    expect(within(modal).getByText('DBI')).toBeInTheDocument();
    // Phase 2.2.p — Exam Type is the new per-row primary value. 'PBT'
    // also appears as a filter-chip button (rollup's distinct examTypes
    // populate the chip row), so assert >= 1 match rather than exactly
    // one.
    expect(within(modal).getAllByText('PBT').length).toBeGreaterThanOrEqual(1);
    // Duration column populated with per-list value
    expect(within(modal).getByText('12 Months')).toBeInTheDocument();
    // Phase 2.2.p — Sub-type (examSubType) dropped from per-row UI
    expect(within(modal).queryByText('Promotional')).not.toBeInTheDocument();
  });

  it('renders "—" with an error tooltip when extraction failed', () => {
    seedFourRollups();
    useScrapers.getState().setPdfExtract('1820|L-1820|2025-08-15', mkExtract({
      success: false,
      error: 'All proxies failed',
    }));
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // 3 dashes from the 3 PDF cells.
    const dashes = within(modal).getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
    // At least one of the dashes carries the error in its title attr.
    const errorDashes = dashes.filter(el =>
      (el.getAttribute('title') || '').toLowerCase().includes('all proxies failed'),
    );
    expect(errorDashes.length).toBeGreaterThanOrEqual(3);
  });

  it('renders "—" with a "field not found" tooltip when extraction succeeded but matchers returned undefined', () => {
    seedFourRollups();
    useScrapers.getState().setPdfExtract('1820|L-1820|2025-08-15', mkExtract({
      success: true,
      certRule: undefined,
      listDepartment: undefined,
      examSubType: undefined,
    }));
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    const dashes = within(modal).getAllByText('—');
    const notFoundDashes = dashes.filter(el =>
      (el.getAttribute('title') || '').toLowerCase().includes('not found'),
    );
    expect(notFoundDashes.length).toBeGreaterThanOrEqual(3);
  });

  it('useEffect kicks fetchPdfExtractIfNeeded for each active list on mount', () => {
    const fetchFn = vi.fn();
    useScrapers.setState({ fetchPdfExtractIfNeeded: fetchFn });
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    // 1820 has 1 active list (L-1820). Should fire exactly once for it.
    expect(fetchFn).toHaveBeenCalledWith(expect.objectContaining({
      jobCode: '1820', listId: 'L-1820',
    }));
  });

  it('expired-section extractions only fire when the user expands the disclosure', () => {
    const fetchFn = vi.fn();
    useScrapers.setState({ fetchPdfExtractIfNeeded: fetchFn });
    seedFourRollups();
    render(<EligibilityView />);
    // Q002 has 0 active, 1 expired. Opening the modal alone should NOT
    // fire for the expired list yet.
    fireEvent.click(screen.getByRole('button', { name: /Open detail for Q002/i }));
    const expiredListCalls = fetchFn.mock.calls.filter(
      ([list]) => list.jobCode === 'Q002' && list.listId === 'L-Q002',
    );
    expect(expiredListCalls).toHaveLength(0);
    // Now expand the disclosure. jsdom doesn't reliably fire the
    // <details> toggle event from a click on <summary>, so dispatch the
    // toggle explicitly after flipping `open`. This mirrors the real
    // browser flow: user click → details.open flips → toggle event
    // fires → React onToggle handler runs → expiredOpen state flips →
    // useEffect re-runs → fetchPdfExtractIfNeeded fires.
    const modal = screen.getByRole('dialog');
    const summary = within(modal).getByText(/Expired lists \(1\)/);
    const details = summary.closest('details') as HTMLDetailsElement;
    act(() => {
      details.open = true;
      details.dispatchEvent(new Event('toggle', { bubbles: true }));
    });
    const afterExpand = fetchFn.mock.calls.filter(
      ([list]) => list.jobCode === 'Q002' && list.listId === 'L-Q002',
    );
    expect(afterExpand.length).toBeGreaterThanOrEqual(1);
  });

  it('PDF cells flip from "…" to values when pdfCache populates after mount (Phase 2.2.p)', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    let modal = screen.getByRole('dialog');
    // Before populate: at least 3 "…" PDF-cell placeholders (Cert rule
    // + Dept + Exam Type). Duration cell renders the "2 yr…" fallback
    // (Phase 2.2.p — keeps user oriented while extract is in flight).
    expect(within(modal).getAllByText('…').length).toBeGreaterThanOrEqual(3);
    // Simulate the async fetch completing. The store update must be
    // wrapped in act() so React flushes the Zustand-subscription
    // re-render before the next assertion.
    act(() => {
      useScrapers.getState().setPdfExtract('1820|L-1820|2025-08-15', mkExtract({
        certRule: 'Rule of the List',
        listDepartment: 'Citywide',
        examType: 'CBT',         // Phase 2.2.p — promoted to per-row
        duration: '6 Months',    // Phase 2.2.p — promoted to per-row
      }));
    });
    modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Rule of the List')).toBeInTheDocument();
    expect(within(modal).getByText('Citywide')).toBeInTheDocument();
    // 'CBT' appears in both the filter chip row (rollup's distinct
    // examTypes) and the per-row Exam Type cell → at least 1 match.
    expect(within(modal).getAllByText('CBT').length).toBeGreaterThanOrEqual(1);
    expect(within(modal).getByText('6 Months')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Phase 2.2.p — drill-modal UX overhaul: Duration column · Exam Type
// column · in-modal filter chip row · click-to-sort headers · extraction
// progress bar. Alex's S39 directive.
// ---------------------------------------------------------------------------

describe('EligibilityDetail — Phase 2.2.p Duration column', () => {
  function mkExtract(over: Partial<PdfExtract> = {}): PdfExtract {
    return { extractedAt: '2026-05-27T00:00:00.000Z', success: true, ...over };
  }

  it('Duration column shows "2 yr" fallback when no extract has cached yet', () => {
    seedFourRollups();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // The Duration cell renders the "2 yr" fallback string (with a
    // trailing "…" loading marker) so the user has something to read
    // while extraction is in flight. The footnote also names "2 yr"
    // as the default, so at least 2 matches are expected (cell +
    // footnote).
    expect(within(modal).getAllByText('2 yr').length).toBeGreaterThanOrEqual(1);
  });

  it('Duration column shows extracted per-list value when present (12 Months / 6 Months)', () => {
    seedFourRollups();
    useScrapers.getState().setPdfExtract('1820|L-1820|2025-08-15', mkExtract({
      duration: '12 Months',
    }));
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('12 Months')).toBeInTheDocument();
  });

  it('per-list Duration override shifts the Expires column accordingly', () => {
    seedFourRollups();
    // 1820 list postDate 2025-08-15. With the constant 2yr default,
    // Expires would land on 2027-08-15 (per existing test). With a
    // per-list "6 Months" override → ~180 days → 2026-02-11.
    useScrapers.getState().setPdfExtract('1820|L-1820|2025-08-15', mkExtract({
      duration: '6 Months',
    }));
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // postDate 2025-08-15 + 180d = 2026-02-11 (UTC, +180 × 86400 × 1000ms)
    expect(within(modal).getByText('2026-02-11')).toBeInTheDocument();
    // The Phase 2.2.n-era 2027-08-15 expiration should NO LONGER appear
    // for this list since we override with the per-list duration.
    expect(within(modal).queryByText('2027-08-15')).not.toBeInTheDocument();
  });
});

describe('EligibilityDetail — Phase 2.2.p in-modal filter chip row', () => {
  function mkExtract(over: Partial<PdfExtract> = {}): PdfExtract {
    return { extractedAt: '2026-05-27T00:00:00.000Z', success: true, ...over };
  }

  function seedMultiListRollup() {
    // 1820 with 3 active lists having distinct extracted exam types +
    // depts so we can exercise the filter axes.
    useScrapers.getState().setEligibilityLists([
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-A',
               postDate: '2026-05-01' }),
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-B',
               postDate: '2026-04-01' }),
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-C',
               postDate: '2026-03-01' }),
    ]);
    useScrapers.getState().setPdfExtract('1820|L-A|2026-05-01', mkExtract({
      certRule: 'Rule of the List', listDepartment: 'PUC', examType: 'PBT',
    }));
    useScrapers.getState().setPdfExtract('1820|L-B|2026-04-01', mkExtract({
      certRule: 'Rule of the List', listDepartment: 'DPH', examType: 'ETP',
    }));
    useScrapers.getState().setPdfExtract('1820|L-C|2026-03-01', mkExtract({
      certRule: 'Rule of 3 Names', listDepartment: 'Citywide', examType: 'PBT',
    }));
  }

  it('renders the filter chip row with search · status · exam-type chips · dept picker · citywide-only', () => {
    seedMultiListRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByLabelText(/Search lists/i)).toBeInTheDocument();
    expect(within(modal).getByLabelText(/Status filter/i)).toBeInTheDocument();
    // Exam-type chips reflect the rollup's distinct values
    expect(within(modal).getByRole('button', { name: /^PBT$/ })).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /^ETP$/ })).toBeInTheDocument();
    // Dept picker present
    expect(within(modal).getByRole('button', { name: /Department/i })).toBeInTheDocument();
    expect(within(modal).getByText(/Citywide only/i)).toBeInTheDocument();
  });

  it('search needle narrows the visible list rows', () => {
    seedMultiListRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    fireEvent.change(within(modal).getByLabelText(/Search lists/i), { target: { value: 'L-A' } });
    expect(within(modal).getByText('L-A')).toBeInTheDocument();
    expect(within(modal).queryByText('L-B')).not.toBeInTheDocument();
    expect(within(modal).queryByText('L-C')).not.toBeInTheDocument();
  });

  it('exam-type chip narrows to lists with matching extracted examType', () => {
    seedMultiListRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    fireEvent.click(within(modal).getByRole('button', { name: /^ETP$/ }));
    // L-B (ETP) remains; L-A and L-C (both PBT) drop.
    expect(within(modal).getByText('L-B')).toBeInTheDocument();
    expect(within(modal).queryByText('L-A')).not.toBeInTheDocument();
    expect(within(modal).queryByText('L-C')).not.toBeInTheDocument();
  });

  it('citywide-only toggle restricts to lists with extracted dept = Citywide', () => {
    seedMultiListRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Click the labelled checkbox (the input next to "Citywide only").
    const cityInputs = within(modal).getAllByRole('checkbox');
    const cityToggle = cityInputs.find(el => {
      const label = el.closest('label')?.textContent || '';
      return /Citywide only/i.test(label);
    });
    expect(cityToggle).toBeDefined();
    fireEvent.click(cityToggle!);
    // L-C (Citywide) remains; L-A (PUC) + L-B (DPH) drop.
    expect(within(modal).getByText('L-C')).toBeInTheDocument();
    expect(within(modal).queryByText('L-A')).not.toBeInTheDocument();
    expect(within(modal).queryByText('L-B')).not.toBeInTheDocument();
  });

  it('Reset filters returns to the full list', () => {
    seedMultiListRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    fireEvent.change(within(modal).getByLabelText(/Search lists/i), { target: { value: 'L-A' } });
    expect(within(modal).queryByText('L-B')).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: /Reset filters/i }));
    expect(within(modal).getByText('L-A')).toBeInTheDocument();
    expect(within(modal).getByText('L-B')).toBeInTheDocument();
    expect(within(modal).getByText('L-C')).toBeInTheDocument();
  });
});

describe('EligibilityDetail — Phase 2.2.p column-header sort', () => {
  function mkExtract(over: Partial<PdfExtract> = {}): PdfExtract {
    return { extractedAt: '2026-05-27T00:00:00.000Z', success: true, ...over };
  }

  function seedSortableRollup() {
    useScrapers.getState().setEligibilityLists([
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-OLD',
               postDate: '2026-03-01' }),
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-MID',
               postDate: '2026-04-01' }),
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-NEW',
               postDate: '2026-05-01' }),
    ]);
    useScrapers.getState().setPdfExtract('1820|L-OLD|2026-03-01', mkExtract({
      certRule: 'Rule of the List',
    }));
  }

  it('clicking the Post date header toggles asc ↔ desc', () => {
    seedSortableRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Default order is desc by post date — L-NEW first, L-OLD last.
    const postDateButton = within(modal).getByRole('button', { name: /Sort by Post date/i });
    // Click once → asc → L-OLD first
    fireEvent.click(postDateButton);
    let rows = within(modal).getAllByRole('row');
    expect(rows[1].textContent).toContain('L-OLD');
    // Click again → desc → L-NEW first
    fireEvent.click(postDateButton);
    rows = within(modal).getAllByRole('row');
    expect(rows[1].textContent).toContain('L-NEW');
    // Click third time → asc again (2-state toggle, no reset state)
    fireEvent.click(postDateButton);
    rows = within(modal).getAllByRole('row');
    expect(rows[1].textContent).toContain('L-OLD');
  });

  it('clicking the Cert rule header sorts by extracted value (with blanks last)', () => {
    seedSortableRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Only L-OLD has a cached certRule; L-MID + L-NEW have no extract
    // (blank). asc with "blanks last" → L-OLD first, then the two
    // blanks in original (post-date desc) order.
    fireEvent.click(within(modal).getByRole('button', { name: /Sort by Cert rule/i }));
    const rows = within(modal).getAllByRole('row');
    expect(rows[1].textContent).toContain('L-OLD');
  });

  it('File column has no sort button (only sortable columns get buttons)', () => {
    seedSortableRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).queryByRole('button', { name: /Sort by File/i })).not.toBeInTheDocument();
  });
});

describe('EligibilityDetail — Phase 2.2.p extraction progress bar', () => {
  function mkExtract(over: Partial<PdfExtract> = {}): PdfExtract {
    return { extractedAt: '2026-05-27T00:00:00.000Z', success: true, ...over };
  }

  function seedMultiListRollup() {
    useScrapers.getState().setEligibilityLists([
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-A',
               postDate: '2026-05-01' }),
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-B',
               postDate: '2026-04-01' }),
      mkList({ jobCode: '1820', classTitle: 'Junior Admin Analyst', listId: 'L-C',
               postDate: '2026-03-01' }),
    ]);
  }

  it('shows "extracting" progress while any active-section list has no cache entry', () => {
    seedMultiListRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('status', { name: /PDF extraction progress/i })).toBeInTheDocument();
    expect(within(modal).getByText(/0 of 3/)).toBeInTheDocument();
  });

  it('progress count advances as extractions cache; hides at 100%', () => {
    seedMultiListRollup();
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    let modal = screen.getByRole('dialog');
    // Pre-populate one of three.
    act(() => {
      useScrapers.getState().setPdfExtract('1820|L-A|2026-05-01', mkExtract({ examType: 'PBT' }));
    });
    modal = screen.getByRole('dialog');
    expect(within(modal).getByText(/1 of 3/)).toBeInTheDocument();
    // Populate the rest → bar should disappear at 3 of 3.
    act(() => {
      useScrapers.getState().setPdfExtract('1820|L-B|2026-04-01', mkExtract({ examType: 'ETP' }));
      useScrapers.getState().setPdfExtract('1820|L-C|2026-03-01', mkExtract({ examType: 'CBT' }));
    });
    modal = screen.getByRole('dialog');
    expect(within(modal).queryByRole('status', { name: /PDF extraction progress/i })).not.toBeInTheDocument();
  });

  it('hides the progress bar when the rollup has only 1 visible list', () => {
    seedFourRollups();  // 1820 has 1 active list
    render(<EligibilityView />);
    fireEvent.click(screen.getByRole('button', { name: /Open detail for 1820/i }));
    const modal = screen.getByRole('dialog');
    // Per-cell "…" loaders already convey the loading state — bar adds
    // noise for a single row.
    expect(within(modal).queryByRole('status', { name: /PDF extraction progress/i })).not.toBeInTheDocument();
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
