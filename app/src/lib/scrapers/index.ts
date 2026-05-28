/**
 * Scrapers public surface — Phase 2.2.k.
 *
 *   - SmartRecruiters Posting API fetcher (live, CORS-permissive)
 *   - DHR exam-results HTML parser (manual-paste, CORS blocked upstream)
 *   - Per-jobCode rollup + Zustand store
 */

export type {
  JobPosting,
  EligibilityList,
  JobCodeRollup,
  PdfExtract,
} from './types';
export { DEFAULT_ACTIVE_LIST_WINDOW_DAYS } from './types';

export {
  fetchJobPostings,
  extractJobCodeFromName,
  normalizePosting,
  userFacingUrl,
  FetchJobPostingsError,
} from './sf-careers/fetch';

export {
  parseDhrExamHtml,
  normalizeDateString,
  isListActive,
} from './sf-dhr-exam/parse';

export {
  DEFAULT_PROXIES,
  FetchDhrError,
  fetchDhrExamResults,
} from './sf-dhr-exam/fetch';
export type { CorsProxy, FetchDhrOptions } from './sf-dhr-exam/fetch';

// Phase 2.2.o note — pdf-parse.ts's runtime exports
// (fetchAndExtractPdfFields, matchCertRule, …) are intentionally NOT
// re-exported from here. They're consumed by:
//   - the scrapers store via dynamic import (`fetchPdfExtractIfNeeded` in
//     store.ts) — keeps pdfjs-dist + its 330 KB chunk out of the main
//     bundle until the first PDF extract fires.
//   - tests via direct path (`./sf-dhr-exam/pdf-parse`).
// Static re-export here would force the regex helpers into the main
// chunk (Vite warns INEFFECTIVE_DYNAMIC_IMPORT). The TYPE export below
// is fine — types vanish at compile time.

export {
  buildJobCodeRollups,
  filterRollups,
  summarizeRollup,
  applyEligibilityFilters,
  collectDepartments,
  computeListExpiration,
  computeListStatus,
  countListTypes,
  parseDuration,
  EMPTY_ELIGIBILITY_FILTERS,
  EXPIRING_SOON_DAYS,
  // Phase 2.2.p — per-list filter + sort helpers for the in-modal view.
  applyEligibilityDetailFilters,
  collectExamTypes,
  collectListDepartments,
  sortEligibilityLists,
  EMPTY_DETAIL_FILTERS,
  DEFAULT_DETAIL_SORT,
} from './build';
export type {
  RollupSummary,
  EligibilityFilters,
  EligibilityStatusFilter,
  ListStatusTone,
  EligibilityDetailFilters,
  DetailListStatusFilter,
  DetailSortColumn,
  DetailSortDirection,
  DetailSort,
} from './build';

export { useScrapers, pdfCacheKey } from './store';
