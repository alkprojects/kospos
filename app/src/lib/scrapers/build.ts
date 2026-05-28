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
