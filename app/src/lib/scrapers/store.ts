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
import type { EligibilityList, JobPosting, PdfExtract } from './types';

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

/**
 * Module-level dedupe set for in-flight PDF extractions.
 *
 * Lives outside Zustand state because it's not user-visible UI state —
 * it's plumbing to keep the modal's `useEffect` from firing the same
 * fetch twice when the component re-renders (or remounts) before the
 * first extraction completes.
 *
 * Why a module-level Set and not store state:
 *   1. Re-render the modal → useEffect retriggers → would re-fire every
 *      already-in-flight extraction without dedupe. Set in module scope
 *      survives the re-render naturally.
 *   2. Storing in Zustand would cause every in-flight change to re-render
 *      every subscriber — pointless churn since no UI element subscribes
 *      to "is extraction N in flight?".
 *   3. Reset on full page reload is desirable + automatic — the Set
 *      vanishes with the module.
 */
const pdfInFlight = new Set<string>();

interface ScrapersState {
  jobPostings: JobPosting[];
  jobPostingsRefreshedAt: string;
  eligibilityLists: EligibilityList[];
  eligibilityListsRefreshedAt: string;
  /** Optional Cloudflare-Worker proxy URL — Alex's backup option when the
   *  default public proxy chain (corsproxy.io / allorigins / codetabs)
   *  proves flaky. Persisted to localStorage so it survives reloads. */
  dhrWorkerUrl: string;
  /** Per-list PDF cover-sheet extracts — Phase 2.2.o. Keyed by
   *  `pdfCacheKey(jobCode, listId, postDate)`. In-memory only (lost on
   *  reload, same as the rest of the scraper data); a follow-up may wire
   *  this into the session snapshot if Alex hits the re-extract cost
   *  often enough across reloads. */
  pdfCache: Record<string, PdfExtract>;

  setJobPostings: (postings: JobPosting[]) => void;
  setEligibilityLists: (lists: EligibilityList[]) => void;
  appendEligibilityLists: (lists: EligibilityList[]) => void;
  setDhrWorkerUrl: (url: string) => void;
  /** Store one PDF extraction result under its `(jobCode|listId|postDate)`
   *  key. Both `success: true` and `success: false` entries are stored —
   *  the failed entry prevents the UI from re-firing the extraction on
   *  every modal re-open. */
  setPdfExtract: (key: string, extract: PdfExtract) => void;
  /** Kick off a lazy PDF extraction for `list` IF it isn't already cached
   *  and isn't already in flight. Fire-and-forget — the caller doesn't
   *  await; the next render after the fetch resolves picks up the new
   *  cache entry automatically via the Zustand subscription.
   *
   *  Pass `extractImpl` to bypass the real `fetchAndExtractPdfFields`
   *  call — tests use this to avoid touching pdfjs / the network. */
  fetchPdfExtractIfNeeded: (
    list: EligibilityList,
    extractImpl?: (fileUrl: string, workerUrl?: string) => Promise<PdfExtract>,
  ) => void;
  clearAll: () => void;
  /**
   * Replace scraper state wholesale from a session-snapshot restore
   * (Phase 2.2.q). `dhrWorkerUrl` is *not* touched — it's a user setting
   * persisted to localStorage independently. Used by
   * `lib/session/use-auto-persistence.ts` on app open.
   */
  restoreFromSession: (input: {
    jobPostings: JobPosting[];
    jobPostingsRefreshedAt: string;
    eligibilityLists: EligibilityList[];
    eligibilityListsRefreshedAt: string;
    pdfCache: Record<string, PdfExtract>;
  }) => void;
}

/**
 * Compose the side-cache key from an EligibilityList's identity tuple.
 * Same key shape `appendEligibilityLists` dedupes on, so the two views
 * of the same logical row map to the same cache entry.
 */
export function pdfCacheKey(
  jobCode: string,
  listId: string,
  postDate: string,
): string {
  return `${jobCode}|${listId}|${postDate}`;
}

export const useScrapers = create<ScrapersState>((set, get) => ({
  jobPostings: [],
  jobPostingsRefreshedAt: '',
  eligibilityLists: [],
  eligibilityListsRefreshedAt: '',
  dhrWorkerUrl: readWorkerUrl(),
  pdfCache: {},

  setJobPostings: (jobPostings) => set({
    jobPostings,
    jobPostingsRefreshedAt: new Date().toISOString(),
  }),

  setPdfExtract: (key, extract) => set(state => ({
    pdfCache: { ...state.pdfCache, [key]: extract },
  })),

  fetchPdfExtractIfNeeded: (list, extractImpl) => {
    const key = pdfCacheKey(list.jobCode, list.listId, list.postDate);
    const state = get();
    if (state.pdfCache[key]) return;
    if (pdfInFlight.has(key)) return;
    pdfInFlight.add(key);

    // Default impl: dynamic-import pdf-parse so pdfjs-dist + its worker
    // stay out of the main bundle until the first PDF extraction fires.
    const impl = extractImpl ?? ((fileUrl, workerUrl) =>
      import('./sf-dhr-exam/pdf-parse').then(mod =>
        mod.fetchAndExtractPdfFields(fileUrl, { workerUrl }),
      ));

    impl(list.fileUrl, state.dhrWorkerUrl || undefined)
      .then(extract => {
        set(s => ({ pdfCache: { ...s.pdfCache, [key]: extract } }));
      })
      .catch((err: unknown) => {
        // Belt-and-suspenders: fetchAndExtractPdfFields never throws, but
        // if `extractImpl` is misbehaving we still need to populate the
        // cache so the UI gives up on the spinner.
        set(s => ({
          pdfCache: {
            ...s.pdfCache,
            [key]: {
              extractedAt: new Date().toISOString(),
              success: false,
              error: err instanceof Error ? err.message : String(err),
            },
          },
        }));
      })
      .finally(() => {
        pdfInFlight.delete(key);
      });
  },

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
   *  Clear-All to silently wipe Alex's backup configuration.
   *
   *  `pdfCache` IS cleared — the cache is derived from the lists, so
   *  wiping the lists should wipe the derived data too (otherwise stale
   *  entries linger if a future refresh produces different list IDs). */
  clearAll: () => set({
    jobPostings: [],
    jobPostingsRefreshedAt: '',
    eligibilityLists: [],
    eligibilityListsRefreshedAt: '',
    pdfCache: {},
  }),

  restoreFromSession: ({
    jobPostings,
    jobPostingsRefreshedAt,
    eligibilityLists,
    eligibilityListsRefreshedAt,
    pdfCache,
  }) => set({
    jobPostings,
    jobPostingsRefreshedAt,
    eligibilityLists,
    eligibilityListsRefreshedAt,
    pdfCache,
  }),
}));
