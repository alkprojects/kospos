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

/** localStorage key for the optional Cloudflare-Worker URL slot. Lives
 *  outside the session JSON so the value persists across page reloads
 *  even without a session-save (Alex sets it once, KosPos remembers). */
const WORKER_URL_KEY = 'kospos.scrapers.dhrWorkerUrl';

/** Hydrate the worker URL from localStorage on store init. SSR-safe:
 *  guarded against `localStorage` being undefined (Node test env). */
function readWorkerUrl(): string {
  try {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(WORKER_URL_KEY) ?? '';
  } catch {
    return '';
  }
}

interface ScrapersState {
  jobPostings: JobPosting[];
  jobPostingsRefreshedAt: string;
  eligibilityLists: EligibilityList[];
  eligibilityListsRefreshedAt: string;
  /** Optional Cloudflare-Worker proxy URL — Alex's backup option when the
   *  default public proxy chain (corsproxy.io / allorigins / codetabs)
   *  proves flaky. Persisted to localStorage so it survives reloads. */
  dhrWorkerUrl: string;

  setJobPostings: (postings: JobPosting[]) => void;
  setEligibilityLists: (lists: EligibilityList[]) => void;
  appendEligibilityLists: (lists: EligibilityList[]) => void;
  setDhrWorkerUrl: (url: string) => void;
  clearAll: () => void;
}

export const useScrapers = create<ScrapersState>(set => ({
  jobPostings: [],
  jobPostingsRefreshedAt: '',
  eligibilityLists: [],
  eligibilityListsRefreshedAt: '',
  dhrWorkerUrl: readWorkerUrl(),

  setJobPostings: (jobPostings) => set({
    jobPostings,
    jobPostingsRefreshedAt: new Date().toISOString(),
  }),

  setDhrWorkerUrl: (url) => {
    const trimmed = url.trim();
    // Persist to localStorage so the URL survives reloads. Failures
    // (private browsing, quota, missing localStorage) are silent — the
    // in-memory value still updates.
    try {
      if (typeof localStorage !== 'undefined') {
        if (trimmed) {
          localStorage.setItem(WORKER_URL_KEY, trimmed);
        } else {
          localStorage.removeItem(WORKER_URL_KEY);
        }
      }
    } catch {
      // ignore
    }
    set({ dhrWorkerUrl: trimmed });
  },

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

  /** Reset the in-memory scrape data. `dhrWorkerUrl` is intentionally
   *  preserved — it's a user setting, not scrape data, and we don't want
   *  Clear-All to silently wipe Alex's backup configuration. */
  clearAll: () => set({
    jobPostings: [],
    jobPostingsRefreshedAt: '',
    eligibilityLists: [],
    eligibilityListsRefreshedAt: '',
  }),
}));
