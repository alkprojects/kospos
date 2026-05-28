/**
 * Pure helpers for the Landing dashboard — Phase 2.2.q PR 1.
 *
 * Builds a `DataSummary` from raw store state: counts per source +
 * freshness (snapshot date / latest PP / refreshedAt) for each kind of
 * data KosPos can carry. Drives the welcome-tab dashboard so a fresh
 * page-load — including one that auto-loaded a published snapshot —
 * shows the user exactly what they're looking at.
 *
 * Pure module — no React, no DOM, no IO. The view layer subscribes to
 * the stores + passes raw arrays/values; this module returns one
 * `DataSummary` object the JSX uses without further logic.
 *
 * Per Alex's S40 design call (auto-load silently + landing page with
 * data details): the landing dashboard is the "what just loaded?"
 * surface so silent auto-restore is never disorienting.
 */

import type { ImportedRow } from '../../importers/types';

/**
 * One row in the loaded-data table. `latestLabel` is the
 * source-appropriate freshness signal:
 *
 *   - P&P: latest snapshotDate across rows.
 *   - BFM Position / Non-position: lastBfmImportAt (wall-clock import
 *     time — BFM rows don't carry their own as-of).
 *   - OBI Payroll: latest _asOfDate across rows (MAX earningPeriodEnd).
 *   - Job postings / Eligibility lists: refreshedAt timestamps from the
 *     scrapers store.
 *   - PDF extracts: count only; freshness is per-entry on the cache.
 */
export interface DataSourceSummary {
  /** Stable identifier — used as React key + as a click target for jumping
   *  to the source's tab. */
  source:
    | 'ps-hcm-pp'
    | 'bfm-position'
    | 'bfm-non-position'
    | 'obi-payroll'
    | 'job-postings'
    | 'eligibility-lists'
    | 'pdf-extracts';
  /** Human label rendered as the row's primary text. */
  label: string;
  /** Number of rows / entries. 0 when this source isn't loaded yet. */
  count: number;
  /** Subtitle describing what the count means (e.g. "rows", "lists"). */
  countLabel: string;
  /** Source-appropriate freshness label — already formatted; empty when
   *  no data loaded. Examples: "snapshot 2026-05-15", "imported
   *  2026-05-25", "latest PP 2026-05-08", "refreshed 14:31". */
  latestLabel: string;
  /** Tab the user should click to interact with this data (Load Reports
   *  vs Eligibility vs Positions). Used by the dashboard's "Open" link. */
  tabHint?: 'importer' | 'positions' | 'labor' | 'eligibility' | 'staffing-plan';
}

/** Per-user-edits row (planned actions / separations / probations / notes). */
export interface UserStateSummary {
  source:
    | 'planned-actions'
    | 'planned-actions-hidden'
    | 'pending-separations'
    | 'probations'
    | 'position-notes';
  label: string;
  count: number;
  countLabel: string;
  tabHint?: 'staffing-plan' | 'separations' | 'probation' | 'positions';
}

/** Combined dashboard payload — what the LandingView renders. */
export interface DataSummary {
  sources: DataSourceSummary[];
  userState: UserStateSummary[];
  /** True when every count is 0 — the dashboard renders the empty-state
   *  CTA in that case ("No data loaded yet — Load Reports to begin"). */
  empty: boolean;
}

/**
 * Build the dashboard payload from raw store state.
 *
 * `loadedRows` is the appStore's loaded rows array; the other inputs
 * come from individual stores. Caller passes raw values so this stays
 * pure + easily testable.
 */
export function buildDataSummary(input: {
  loadedRows: ImportedRow[];
  lastBfmImportAt: string;
  jobPostingsCount: number;
  jobPostingsRefreshedAt: string;
  eligibilityListsCount: number;
  eligibilityListsRefreshedAt: string;
  pdfCacheCount: number;
  staffingActionsCount: number;
  staffingDerivedRemovedCount: number;
  pendingSeparationsCount: number;
  probationsCount: number;
  positionNotesCount: number;
}): DataSummary {
  const ppRows = input.loadedRows.filter(r => r._source === 'ps-hcm-pp');
  const bfmPosRows = input.loadedRows.filter(r => r._source === 'bfm-position');
  const bfmNonPosRows = input.loadedRows.filter(r => r._source === 'bfm-non-position');
  const obiRows = input.loadedRows.filter(r => r._source === 'obi-payroll');

  // P&P snapshot date: take MAX snapshotDate across rows. Format as
  // ISO `YYYY-MM-DD`. Empty when no rows.
  const ppSnapshotDate = ppRows.reduce<string>(
    (max, r) => {
      // ImportedRow union — narrow on _source so TS sees snapshotDate.
      if (r._source !== 'ps-hcm-pp') return max;
      return r.snapshotDate > max ? r.snapshotDate : max;
    },
    '',
  );

  // OBI payroll: MAX _asOfDate across rows (the importer stamps it).
  const obiAsOfDate = obiRows.reduce<string>(
    (max, r) => {
      if (r._source !== 'obi-payroll') return max;
      const d = r._asOfDate || r.earningPeriodEnd;
      return d > max ? d : max;
    },
    '',
  );

  const sources: DataSourceSummary[] = [
    {
      source: 'ps-hcm-pp',
      label: 'P&P (Positions)',
      count: ppRows.length,
      countLabel: 'rows',
      latestLabel: ppSnapshotDate ? `snapshot ${ppSnapshotDate}` : '',
      tabHint: 'positions',
    },
    {
      source: 'bfm-position',
      label: 'BFM Position',
      count: bfmPosRows.length,
      countLabel: 'rows',
      latestLabel: bfmPosRows.length > 0 && input.lastBfmImportAt ? `imported ${input.lastBfmImportAt}` : '',
      tabHint: 'positions',
    },
    {
      source: 'bfm-non-position',
      label: 'BFM Non-position',
      count: bfmNonPosRows.length,
      countLabel: 'rows',
      latestLabel: bfmNonPosRows.length > 0 && input.lastBfmImportAt ? `imported ${input.lastBfmImportAt}` : '',
      tabHint: 'importer',
    },
    {
      source: 'obi-payroll',
      label: 'Payroll (OBI)',
      count: obiRows.length,
      countLabel: 'rows',
      latestLabel: obiAsOfDate ? `latest PP ${obiAsOfDate}` : '',
      tabHint: 'labor',
    },
    {
      source: 'job-postings',
      label: 'Job postings (SF Careers)',
      count: input.jobPostingsCount,
      countLabel: 'postings',
      latestLabel: input.jobPostingsRefreshedAt
        ? `refreshed ${formatRefreshedAt(input.jobPostingsRefreshedAt)}`
        : '',
      tabHint: 'eligibility',
    },
    {
      source: 'eligibility-lists',
      label: 'Eligibility lists (DHR)',
      count: input.eligibilityListsCount,
      countLabel: 'lists',
      latestLabel: input.eligibilityListsRefreshedAt
        ? `refreshed ${formatRefreshedAt(input.eligibilityListsRefreshedAt)}`
        : '',
      tabHint: 'eligibility',
    },
    {
      source: 'pdf-extracts',
      label: 'PDF cover-sheet extracts',
      count: input.pdfCacheCount,
      countLabel: 'cached extracts',
      latestLabel: input.pdfCacheCount > 0 ? 'lazy — populated on modal open' : '',
      tabHint: 'eligibility',
    },
  ];

  const userState: UserStateSummary[] = [
    {
      source: 'planned-actions',
      label: 'Planned actions (Hiring Plan)',
      count: input.staffingActionsCount,
      countLabel: 'actions',
      tabHint: 'staffing-plan',
    },
    {
      source: 'planned-actions-hidden',
      label: 'Hidden derived actions',
      count: input.staffingDerivedRemovedCount,
      countLabel: 'hidden',
      tabHint: 'staffing-plan',
    },
    {
      source: 'pending-separations',
      label: 'Pending separations',
      count: input.pendingSeparationsCount,
      countLabel: 'separations',
      tabHint: 'separations',
    },
    {
      source: 'probations',
      label: 'Probations',
      count: input.probationsCount,
      countLabel: 'probations',
      tabHint: 'probation',
    },
    {
      source: 'position-notes',
      label: 'Position notes',
      count: input.positionNotesCount,
      countLabel: 'notes',
      tabHint: 'positions',
    },
  ];

  const empty =
    sources.every(s => s.count === 0) &&
    userState.every(s => s.count === 0);

  return { sources, userState, empty };
}

/**
 * Format an ISO timestamp as a short local-time label for the dashboard.
 *
 * Heuristic:
 *   - If today: render `HH:MM`.
 *   - Else: render `YYYY-MM-DD HH:MM`.
 *
 * The user is reading the dashboard right after loading data — knowing
 * the wall-clock time is meaningful; the date is meaningful only when
 * the data wasn't loaded today.
 */
export function formatRefreshedAt(isoTimestamp: string, now: Date = new Date()): string {
  if (!isoTimestamp) return '';
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return isoTimestamp;
  const today =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (today) return hhmm;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hhmm}`;
}
