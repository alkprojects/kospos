/**
 * Scrapers Zustand store — in-memory cache of the latest scrape results.
 *
 * Two parallel slices: `jobPostings` (from SmartRecruiters, live fetch)
 * + `eligibilityLists` (from sfdhr.org, manual paste). Each carries its
 * own `lastRefreshedAt` ISO timestamp so the UI can show "Last refreshed
 * X minutes ago" per source.
 *
 * Lifetime: same as every other Zustand store — in-memory only, lost on
 * page reload. Hooks into `lib/session/snapshot.ts` if Alex wants the
 * scrapes saved alongside the rest of the session JSON (deferred — wait
 * for Alex to ask, since scrape data is cheap to refresh).
 */

import { create } from 'zustand';
import type { EligibilityList, JobPosting } from './types';

interface ScrapersState {
  jobPostings: JobPosting[];
  jobPostingsRefreshedAt: string;
  eligibilityLists: EligibilityList[];
  eligibilityListsRefreshedAt: string;

  setJobPostings: (postings: JobPosting[]) => void;
  setEligibilityLists: (lists: EligibilityList[]) => void;
  appendEligibilityLists: (lists: EligibilityList[]) => void;
  clearAll: () => void;
}

export const useScrapers = create<ScrapersState>(set => ({
  jobPostings: [],
  jobPostingsRefreshedAt: '',
  eligibilityLists: [],
  eligibilityListsRefreshedAt: '',

  setJobPostings: (jobPostings) => set({
    jobPostings,
    jobPostingsRefreshedAt: new Date().toISOString(),
  }),

  setEligibilityLists: (eligibilityLists) => set({
    eligibilityLists,
    eligibilityListsRefreshedAt: new Date().toISOString(),
  }),

  /** Append-paste — when the user pastes more pages (DHR is 66+ pages),
   *  each paste adds to the existing set. Dedupes by `(jobCode, listId,
   *  postDate)` to handle accidental double-paste. */
  appendEligibilityLists: (incoming) => set(state => {
    const key = (l: EligibilityList) => `${l.jobCode}|${l.listId}|${l.postDate}`;
    const seen = new Set(state.eligibilityLists.map(key));
    const additions = incoming.filter(l => !seen.has(key(l)));
    return {
      eligibilityLists: [...state.eligibilityLists, ...additions],
      eligibilityListsRefreshedAt: new Date().toISOString(),
    };
  }),

  clearAll: () => set({
    jobPostings: [],
    jobPostingsRefreshedAt: '',
    eligibilityLists: [],
    eligibilityListsRefreshedAt: '',
  }),
}));
