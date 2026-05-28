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
export type { FetchDhrOptions } from './sf-dhr-exam/fetch';

export {
  buildJobCodeRollups,
  filterRollups,
  summarizeRollup,
  applyEligibilityFilters,
  collectDepartments,
  computeListExpiration,
  computeListStatus,
  countListTypes,
  EMPTY_ELIGIBILITY_FILTERS,
  EXPIRING_SOON_DAYS,
} from './build';
export type {
  RollupSummary,
  EligibilityFilters,
  EligibilityStatusFilter,
  ListStatusTone,
} from './build';

export { useScrapers } from './store';
