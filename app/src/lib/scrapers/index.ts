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
  buildJobCodeRollups,
  filterRollups,
} from './build';

export { useScrapers } from './store';
