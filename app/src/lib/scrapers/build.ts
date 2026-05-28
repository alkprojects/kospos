/**
 * Pure helpers over scraped JobPosting + EligibilityList collections.
 *
 * No DOM, no IO. Builds the per-jobCode rollup that EligibilityView
 * renders. Same input → same output. Tests call these directly.
 */

import type {
  EligibilityList,
  JobCodeRollup,
  JobPosting,
  PdfExtract,
} from './types';
import { DEFAULT_ACTIVE_LIST_WINDOW_DAYS } from './types';
import { isListActive } from './sf-dhr-exam/parse';

/**
 * Compact summary of one rollup — counts + date ranges + department /
 * type extracts. Drives the summary-row rendering in EligibilityView so
 * each row stays one line tall regardless of how many lists exist.
 *
 * The "citywide hint" is a v1 heuristic since DHR's listing doesn't tag
 * lists as citywide vs department-specific. A rollup is hinted citywide
 * when (a) lists exist but no current posting (the list is generic /
 * not bound to one open recruitment), OR (b) postings span two or more
 * departments (multiple depts are recruiting against the same code).
 * Both are weak signals — the user can override with the regular filter.
 */
export interface RollupSummary {
  /** Number of active eligibility lists (within the 2-year window). */
  activeCount: number;
  /** Number of expired eligibility lists (older than the window). */
  expiredCount: number;
  /** Number of open postings for this jobCode. */
  postingCount: number;
  /** ISO date of the most recently released posting. '' if no postings. */
  newestPostingDate: string;
  /** ISO date of the oldest active list. '' if no active lists. */
  oldestActivePostDate: string;
  /** ISO date of the newest active list. '' if no active lists. */
  newestActivePostDate: string;
  /** All distinct posting departments, alphabetical. */
  departments: string[];
  /** Which DHR list types appear across active + expired. */
  listTypes: Array<'score-report' | 'eligible-list'>;
  /** Heuristic — see RollupSummary doc comment. */
  citywideHint: boolean;
}

/**
 * Build a RollupSummary from a JobCodeRollup. Pure. Stable date strings
 * (ISO) compare lexically — no Date construction needed.
 */
export function summarizeRollup(r: JobCodeRollup): RollupSummary {
  const activeCount = r.activeLists.length;
  const expiredCount = r.expiredLists.length;
  const postingCount = r.postings.length;

  // Postings are sorted newest-first in build; first is newest.
  const newestPostingDate = postingCount > 0
    ? r.postings[0].releasedDate.slice(0, 10)
    : '';

  // Active lists are sorted newest-first; head = newest, tail = oldest.
  let oldestActivePostDate = '';
  let newestActivePostDate = '';
  if (activeCount > 0) {
    newestActivePostDate = r.activeLists[0].postDate;
    oldestActivePostDate = r.activeLists[activeCount - 1].postDate;
  }

  const depts = new Set<string>();
  for (const p of r.postings) if (p.department) depts.add(p.department);
  const departments = [...depts].sort((a, b) => a.localeCompare(b));

  const typeSet = new Set<'score-report' | 'eligible-list'>();
  for (const l of r.activeLists) typeSet.add(l.type);
  for (const l of r.expiredLists) typeSet.add(l.type);
  // Stable order: score-report first (the common case), then eligible-list.
  const listTypes: Array<'score-report' | 'eligible-list'> = [];
  if (typeSet.has('score-report')) listTypes.push('score-report');
  if (typeSet.has('eligible-list')) listTypes.push('eligible-list');

  const citywideHint =
    // (a) any list (active or expired) exists without a currently-posted
    //     recruitment — the list isn't bound to a single open requisition.
    ((activeCount + expiredCount > 0) && postingCount === 0)
    // (b) postings span 2+ departments — same code is being recruited by
    //     more than one dept simultaneously.
    || departments.length >= 2;

  return {
    activeCount,
    expiredCount,
    postingCount,
    newestPostingDate,
    oldestActivePostDate,
    newestActivePostDate,
    departments,
    listTypes,
    citywideHint,
  };
}

/**
 * Status axis for the EligibilityView filter toolbar.
 *
 *   - `any`           — pass everything (default)
 *   - `active`        — has at least one active list
 *   - `expired`       — has at least one expired list AND zero active
 *   - `list-only`     — has lists (active or expired) AND zero postings
 *   - `posting-only`  — has postings AND zero lists
 */
export type EligibilityStatusFilter =
  | 'any'
  | 'active'
  | 'expired'
  | 'list-only'
  | 'posting-only';

/**
 * Structured filter shape used by the EligibilityView toolbar.
 *
 * Empty Sets (departments / examTypes) mean "don't restrict on this
 * axis" — matches the user-mental-model of "no chips selected = show
 * everything". Non-empty Sets restrict to rollups that match at least
 * one element (OR within an axis; AND across axes).
 */
export interface EligibilityFilters {
  /** Substring needle on jobCode | classTitle (case-insensitive). */
  search: string;
  status: EligibilityStatusFilter;
  examTypes: ReadonlySet<'score-report' | 'eligible-list'>;
  departments: ReadonlySet<string>;
  /** When true, restrict to rollups whose summary.citywideHint is true. */
  citywideOnly: boolean;
}

/**
 * Empty / no-op filter — all rollups pass. Convenience for the view's
 * initial state.
 */
export const EMPTY_ELIGIBILITY_FILTERS: EligibilityFilters = {
  search: '',
  status: 'any',
  examTypes: new Set(),
  departments: new Set(),
  citywideOnly: false,
};

/**
 * Group postings + lists by SF Job Code (the 4-digit class code). One
 * rollup row per jobCode that has at least one posting or list.
 * Postings/lists with empty jobCode are dropped from the rollup (they
 * stay in the raw lists for the all-postings / all-lists views).
 *
 * `today` is ISO `YYYY-MM-DD`; pinned by caller for determinism.
 * `windowDays` defaults to 2 years.
 *
 * Order: alphabetical by jobCode. Stable.
 */
export function buildJobCodeRollups(
  postings: JobPosting[],
  lists: EligibilityList[],
  today: string,
  windowDays: number = DEFAULT_ACTIVE_LIST_WINDOW_DAYS,
): JobCodeRollup[] {
  const byCode = new Map<string, JobCodeRollup>();

  function ensure(jobCode: string, classTitle: string): JobCodeRollup {
    let r = byCode.get(jobCode);
    if (!r) {
      r = {
        jobCode,
        classTitle,
        postings: [],
        activeLists: [],
        expiredLists: [],
      };
      byCode.set(jobCode, r);
    } else if (!r.classTitle && classTitle) {
      r.classTitle = classTitle;
    }
    return r;
  }

  for (const p of postings) {
    if (!p.jobCode) continue;
    ensure(p.jobCode, p.classTitle).postings.push(p);
  }

  for (const l of lists) {
    if (!l.jobCode) continue;
    const r = ensure(l.jobCode, l.classTitle);
    if (isListActive(l, today, windowDays)) {
      r.activeLists.push(l);
    } else {
      r.expiredLists.push(l);
    }
  }

  // Within each rollup: postings by releasedDate (newest first); lists
  // by postDate (newest first). Stable in document order if dates
  // collide.
  for (const r of byCode.values()) {
    r.postings.sort((a, b) => b.releasedDate.localeCompare(a.releasedDate));
    r.activeLists.sort((a, b) => b.postDate.localeCompare(a.postDate));
    r.expiredLists.sort((a, b) => b.postDate.localeCompare(a.postDate));
  }

  return [...byCode.values()].sort((a, b) => a.jobCode.localeCompare(b.jobCode));
}

/**
 * Filter rollups by needle — case-insensitive substring across jobCode
 * + classTitle. Returns rollups in original order. Kept for back-compat;
 * prefer `applyEligibilityFilters` for the full filter surface.
 */
export function filterRollups(rollups: JobCodeRollup[], needle: string): JobCodeRollup[] {
  const q = needle.trim().toLowerCase();
  if (!q) return rollups;
  return rollups.filter(r =>
    r.jobCode.toLowerCase().includes(q) ||
    r.classTitle.toLowerCase().includes(q),
  );
}

/**
 * Apply the structured EligibilityFilters to a rollups list. AND across
 * axes; OR within multi-value axes (examTypes, departments).
 *
 * Returns rollups in original (alphabetical) order. Pure — caller pins
 * `today` upstream when computing active vs expired.
 */
export function applyEligibilityFilters(
  rollups: JobCodeRollup[],
  filters: EligibilityFilters,
): JobCodeRollup[] {
  const q = filters.search.trim().toLowerCase();
  const examTypeAxis = filters.examTypes.size > 0;
  const deptAxis = filters.departments.size > 0;

  return rollups.filter(r => {
    // Search axis
    if (q) {
      const hay = `${r.jobCode} ${r.classTitle}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // Status axis
    const hasActive = r.activeLists.length > 0;
    const hasExpired = r.expiredLists.length > 0;
    const hasPosting = r.postings.length > 0;
    switch (filters.status) {
      case 'any':
        break;
      case 'active':
        if (!hasActive) return false;
        break;
      case 'expired':
        if (!hasExpired || hasActive) return false;
        break;
      case 'list-only':
        if (!(hasActive || hasExpired) || hasPosting) return false;
        break;
      case 'posting-only':
        if (!hasPosting || (hasActive || hasExpired)) return false;
        break;
    }

    // Exam type axis — match if any list (active or expired) has a type
    // in the selected set.
    if (examTypeAxis) {
      const anyMatch = r.activeLists.some(l => filters.examTypes.has(l.type))
                    || r.expiredLists.some(l => filters.examTypes.has(l.type));
      if (!anyMatch) return false;
    }

    // Department axis — match if any posting has a department in the
    // selected set. Rollups with zero postings always fail the dept axis
    // (we can't infer department from DHR list data alone — see
    // RollupSummary doc comment for the v1 limitation).
    if (deptAxis) {
      const anyMatch = r.postings.some(p => p.department && filters.departments.has(p.department));
      if (!anyMatch) return false;
    }

    // Citywide-hint axis
    if (filters.citywideOnly) {
      const summary = summarizeRollup(r);
      if (!summary.citywideHint) return false;
    }

    return true;
  });
}

/**
 * Collect the universe of departments seen across a rollups list. Used
 * to populate the department multi-select in the filter toolbar. Sorted
 * alphabetical, empty strings dropped.
 */
export function collectDepartments(rollups: JobCodeRollup[]): string[] {
  const set = new Set<string>();
  for (const r of rollups) {
    for (const p of r.postings) {
      if (p.department) set.add(p.department);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// Phase 2.2.n — per-list derived helpers (expiration, days-left, status,
// type counts). All pure; consumed by EligibilityDetail to surface
// duration + expiration + days-left columns Alex asked for in S37.
//
// Cert rule, list-row department, and exam sub-type live in the PDF
// cover sheet — not on the DHR listing page's 3-column table. Phase
// 2.2.o lazy-PDF-parse is filed as the explicit follow-on sub-phase
// (per Alex's S37 scope pick "C: A this session + B as Phase 2.2.o").
// ---------------------------------------------------------------------------

/** "Expiring soon" threshold — list within 90 days of expiration. Matches
 *  the `temp-tx-expiration-imminent` quality flag's 90-day cutoff
 *  (labor-report.md § Data Issues catalog) so the UX uses one threshold. */
export const EXPIRING_SOON_DAYS = 90;

/**
 * Parse a PDF-extracted duration string ("12 Months" / "6 Months" /
 * "1 Year" / "2 years" / "30 days") to a day count.
 *
 * Phase 2.2.p: real DHR PDFs encode per-list durations explicitly
 * (sampled values: 6mo, 12mo, 24mo) — refuting the Phase 2.2.n
 * "constant 2yr per CSC Rule 411A/412" assumption. Surface the actual
 * value when present + fall back to the 2yr default when extraction
 * came back undefined.
 *
 * Returns the equivalent day count, or `undefined` if the string
 * doesn't match the expected `<N> <unit>` shape. Months convert at
 * 30 days/month (DHR uses month-granular durations, not day-granular,
 * so the 30d approximation matches DHR's own internal arithmetic).
 *
 * Returning undefined (rather than the 2yr default) lets the caller
 * distinguish "no duration given" from "parsed and unknown" — the
 * former gets the 2yr default, the latter would otherwise silently
 * mask a parse failure.
 */
export function parseDuration(durationStr: string | undefined): number | undefined {
  if (!durationStr) return undefined;
  const trimmed = durationStr.trim().toLowerCase();
  // Allow plurals + abbreviations + optional "approximately" prefix some PDFs use.
  const m = /^(?:approximately\s+)?(\d+)\s*(day|days|d|month|months|mo|mos|year|years|y|yr|yrs)\b/.exec(trimmed);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const unit = m[2];
  if (unit === 'day' || unit === 'days' || unit === 'd') return n;
  if (unit === 'month' || unit === 'months' || unit === 'mo' || unit === 'mos') return n * 30;
  if (unit === 'year' || unit === 'years' || unit === 'y' || unit === 'yr' || unit === 'yrs') return n * 365;
  return undefined;
}

/**
 * Compute an eligibility list's expiration date — `postDate + windowDays`,
 * with an optional per-list `durationStr` override (Phase 2.2.p).
 *
 * Returns ISO `YYYY-MM-DD`; empty string when `postDate` is malformed.
 *
 * The default window (2 years per CSC Rule 411A/412) matches the
 * isListActive cutoff so "active" and "not-yet-expired" agree.
 *
 * Day arithmetic: uses `730` days for the 2-year window — exact only
 * when neither year is a leap year. On a leap-year span the displayed
 * expiration is 1 day shy of the same-month-and-day-2-years-later
 * intuition (e.g., 2026-05-01 + 730 days = 2028-04-30 because 2028 is
 * a leap year). Tradeoff accepted in v1: the 1-day drift is invisible
 * to the user against the 90-day expiring-soon threshold + the fact
 * that DHR lists can be extended anyway. Switch to calendar arithmetic
 * (setUTCFullYear) when this becomes UX-relevant.
 *
 * When `durationStr` is supplied and parses (via {@link parseDuration})
 * it overrides `windowDays`. When it's supplied but doesn't parse, we
 * fall back to `windowDays` — never throw, never return a wrong date
 * silently.
 */
export function computeListExpiration(
  list: EligibilityList,
  windowDays: number = DEFAULT_ACTIVE_LIST_WINDOW_DAYS,
  durationStr?: string,
): string {
  if (!list.postDate) return '';
  const post = new Date(list.postDate + 'T00:00:00Z');
  if (Number.isNaN(post.getTime())) return '';
  const effectiveDays = parseDuration(durationStr) ?? windowDays;
  const exp = new Date(post.getTime() + effectiveDays * 24 * 60 * 60 * 1000);
  const y = exp.getUTCFullYear();
  const m = String(exp.getUTCMonth() + 1).padStart(2, '0');
  const d = String(exp.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Status of an eligibility list relative to `today`. */
export type ListStatusTone = 'active' | 'expiring-soon' | 'expired' | 'unknown';

/**
 * Compute the days-until-expiration + status tone for a list.
 *
 *   - `unknown`        — postDate missing/malformed (caller renders "—")
 *   - `expired`        — daysRemaining < 0 (today past expiration)
 *   - `expiring-soon`  — daysRemaining ≤ EXPIRING_SOON_DAYS (yellow)
 *   - `active`         — daysRemaining > EXPIRING_SOON_DAYS (green)
 *
 * `daysRemaining` is signed — positive = days until expiration, negative
 * = days since expiration. Caller formats the user-facing label.
 *
 * Phase 2.2.p: accepts an optional `durationStr` (PDF-extracted) to
 * override the default 2yr window when the per-list value is known.
 */
export function computeListStatus(
  list: EligibilityList,
  today: string,
  windowDays: number = DEFAULT_ACTIVE_LIST_WINDOW_DAYS,
  durationStr?: string,
): { daysRemaining: number; tone: ListStatusTone; expirationDate: string } {
  const expirationDate = computeListExpiration(list, windowDays, durationStr);
  if (!expirationDate || !today) {
    return { daysRemaining: 0, tone: 'unknown', expirationDate };
  }
  const exp = new Date(expirationDate + 'T00:00:00Z');
  const now = new Date(today + 'T00:00:00Z');
  if (Number.isNaN(exp.getTime()) || Number.isNaN(now.getTime())) {
    return { daysRemaining: 0, tone: 'unknown', expirationDate };
  }
  const daysRemaining = Math.floor((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const tone: ListStatusTone = daysRemaining < 0
    ? 'expired'
    : daysRemaining <= EXPIRING_SOON_DAYS
      ? 'expiring-soon'
      : 'active';
  return { daysRemaining, tone, expirationDate };
}

/**
 * Count list types across a list set. Used by EligibilityDetail to
 * promote per-row type info to a section-header breakdown — e.g.,
 * "Active eligibility lists · 2 score reports + 1 eligible list".
 *
 * Drops the per-row Type column per Alex's S37 directive ("Score report
 * (civil service)" is constant noise for DBI's use case) while
 * preserving the citywide signal for Police/Fire when mixed.
 */
export function countListTypes(
  lists: ReadonlyArray<EligibilityList>,
): { scoreReports: number; eligibleLists: number } {
  let scoreReports = 0;
  let eligibleLists = 0;
  for (const l of lists) {
    if (l.type === 'score-report') scoreReports++;
    else if (l.type === 'eligible-list') eligibleLists++;
  }
  return { scoreReports, eligibleLists };
}

// ---------------------------------------------------------------------------
// Phase 2.2.p — per-list filter + sort helpers used by EligibilityDetail's
// in-modal chip-row filter and click-to-sort headers. Per-LIST shape
// (one rollup expanded into rows), not per-rollup like
// `applyEligibilityFilters` above.
//
// The PDF-extracted axes (exam type, dept) read from a side-cache. Lists
// without a cache entry (extraction in flight / failed) pass through —
// filtering a not-yet-known value would otherwise wrongly hide rows that
// will populate moments later.
// ---------------------------------------------------------------------------

/** Per-list status axis used by the in-modal filter. */
export type DetailListStatusFilter = 'any' | 'active' | 'expiring-soon' | 'expired';

/** Structured filter for the in-modal lists view. */
export interface EligibilityDetailFilters {
  /** Substring needle on listId | certRule | listDepartment | examType. */
  search: string;
  status: DetailListStatusFilter;
  /** Selected exam types (PBT/ETP/CBT/Q&E). Empty = no restriction. */
  examTypes: ReadonlySet<string>;
  /** Selected dept codes (PUC/DPH/Citywide/…). Empty = no restriction. */
  departments: ReadonlySet<string>;
  /** When true, restrict to lists whose extracted dept is "Citywide". */
  citywideOnly: boolean;
}

/** Empty / no-op in-modal filter — all lists pass. */
export const EMPTY_DETAIL_FILTERS: EligibilityDetailFilters = {
  search: '',
  status: 'any',
  examTypes: new Set(),
  departments: new Set(),
  citywideOnly: false,
};

/**
 * Look up the PdfExtract for a given list. Pure — caller passes the
 * cache + the key function.
 */
function getExtract(
  list: EligibilityList,
  pdfCache: Readonly<Record<string, PdfExtract>>,
  keyFn: (jobCode: string, listId: string, postDate: string) => string,
): PdfExtract | undefined {
  return pdfCache[keyFn(list.jobCode, list.listId, list.postDate)];
}

/**
 * Apply the in-modal filter to a list of EligibilityLists. Returns the
 * subset that passes every axis.
 *
 * Axis behavior:
 *   - `search`        — case-insensitive substring across listId,
 *                       certRule, listDepartment, examType.
 *   - `status`        — match `tone` from `computeListStatus`. Filter
 *                       skips the axis when `status === 'any'`.
 *   - `examTypes`     — match if the list's extracted examType is in
 *                       the set. Lists with no extract YET pass (data
 *                       not loaded vs. data excluded). Lists with an
 *                       extract but no examType match only when the
 *                       set is empty.
 *   - `departments`   — same pattern as examTypes against
 *                       listDepartment.
 *   - `citywideOnly`  — match when extracted listDepartment is
 *                       "Citywide" (the CTW-normalized value).
 *
 * `today` is ISO `YYYY-MM-DD`; pinned by caller for determinism.
 */
export function applyEligibilityDetailFilters(
  lists: ReadonlyArray<EligibilityList>,
  pdfCache: Readonly<Record<string, PdfExtract>>,
  keyFn: (jobCode: string, listId: string, postDate: string) => string,
  filters: EligibilityDetailFilters,
  today: string,
): EligibilityList[] {
  const q = filters.search.trim().toLowerCase();
  const examTypeAxis = filters.examTypes.size > 0;
  const deptAxis = filters.departments.size > 0;

  return lists.filter(l => {
    const extract = getExtract(l, pdfCache, keyFn);

    // Search axis — concat the searchable fields. Undefined fields
    // contribute nothing.
    if (q) {
      const hay = [
        l.listId,
        extract?.certRule,
        extract?.listDepartment,
        extract?.examType,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // Status axis
    if (filters.status !== 'any') {
      const { tone } = computeListStatus(l, today, undefined, extract?.duration);
      if (tone !== filters.status) return false;
    }

    // Exam type axis — only restricts when we have an extract; rows
    // still loading pass through.
    if (examTypeAxis && extract && extract.success) {
      if (!extract.examType || !filters.examTypes.has(extract.examType)) {
        return false;
      }
    }

    // Department axis — same pattern.
    if (deptAxis && extract && extract.success) {
      if (!extract.listDepartment || !filters.departments.has(extract.listDepartment)) {
        return false;
      }
    }

    // Citywide-only — only restricts when we have an extract.
    if (filters.citywideOnly && extract && extract.success) {
      if (extract.listDepartment !== 'Citywide') return false;
    }

    return true;
  });
}

/** Collect the distinct examType values seen across the given lists'
 *  cache entries. Alphabetical, undefined/empty dropped. */
export function collectExamTypes(
  lists: ReadonlyArray<EligibilityList>,
  pdfCache: Readonly<Record<string, PdfExtract>>,
  keyFn: (jobCode: string, listId: string, postDate: string) => string,
): string[] {
  const set = new Set<string>();
  for (const l of lists) {
    const e = getExtract(l, pdfCache, keyFn);
    if (e?.success && e.examType) set.add(e.examType);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Collect the distinct listDepartment values seen across the given
 *  lists' cache entries. Alphabetical, undefined/empty dropped. */
export function collectListDepartments(
  lists: ReadonlyArray<EligibilityList>,
  pdfCache: Readonly<Record<string, PdfExtract>>,
  keyFn: (jobCode: string, listId: string, postDate: string) => string,
): string[] {
  const set = new Set<string>();
  for (const l of lists) {
    const e = getExtract(l, pdfCache, keyFn);
    if (e?.success && e.listDepartment) set.add(e.listDepartment);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Column identifiers for the in-modal lists table click-to-sort. */
export type DetailSortColumn =
  | 'postDate'
  | 'listId'
  | 'duration'
  | 'expires'
  | 'status'
  | 'certRule'
  | 'dept'
  | 'examType';

/** Sort direction; null collapses to "default order" (post date desc). */
export type DetailSortDirection = 'asc' | 'desc' | null;

export interface DetailSort {
  column: DetailSortColumn;
  direction: DetailSortDirection;
}

/** Default sort matches the existing newest-first behavior. */
export const DEFAULT_DETAIL_SORT: DetailSort = {
  column: 'postDate',
  direction: 'desc',
};

/**
 * Sort lists by the given column + direction. Stable (preserves input
 * order on ties). `direction: null` is a no-op (caller already passed
 * the default order in).
 *
 * Empty / undefined PDF-extracted values sort last (in both asc + desc)
 * so the user always sees populated rows first on a sorted column —
 * matches the spreadsheet intuition of "blanks at the bottom".
 */
export function sortEligibilityLists(
  lists: ReadonlyArray<EligibilityList>,
  pdfCache: Readonly<Record<string, PdfExtract>>,
  keyFn: (jobCode: string, listId: string, postDate: string) => string,
  sort: DetailSort,
  today: string,
): EligibilityList[] {
  const { column, direction } = sort;
  if (direction === null) return [...lists];

  // Build comparator-friendly values once per row (avoid re-running
  // computeListStatus / parseDuration per pair-wise compare).
  const decorated = lists.map((l, i) => {
    const extract = getExtract(l, pdfCache, keyFn);
    const status = computeListStatus(l, today, undefined, extract?.duration);
    let primary: string | number = '';
    switch (column) {
      case 'postDate': primary = l.postDate || ''; break;
      case 'listId':   primary = l.listId || ''; break;
      case 'duration': {
        // Sort by parsed-day count so "12 Months" beats "6 Months".
        // Undefined → +Infinity so blanks fall to the end.
        const days = parseDuration(extract?.duration);
        primary = days ?? Number.POSITIVE_INFINITY;
        break;
      }
      case 'expires':  primary = status.expirationDate || ''; break;
      case 'status':   primary = status.daysRemaining; break;
      case 'certRule': primary = extract?.certRule || ''; break;
      case 'dept':     primary = extract?.listDepartment || ''; break;
      case 'examType': primary = extract?.examType || ''; break;
    }
    return { list: l, primary, i, isBlank: primary === '' || primary === Number.POSITIVE_INFINITY };
  });

  decorated.sort((a, b) => {
    // Blanks always last regardless of direction — spreadsheet-like.
    if (a.isBlank && !b.isBlank) return 1;
    if (!a.isBlank && b.isBlank) return -1;
    if (a.isBlank && b.isBlank) return a.i - b.i;

    let cmp = 0;
    if (typeof a.primary === 'number' && typeof b.primary === 'number') {
      cmp = a.primary - b.primary;
    } else {
      cmp = String(a.primary).localeCompare(String(b.primary));
    }
    if (cmp === 0) return a.i - b.i;
    return direction === 'asc' ? cmp : -cmp;
  });

  return decorated.map(d => d.list);
}
