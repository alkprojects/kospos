/**
 * SF DHR Examination Results — live fetch via CORS-proxy chain.
 *
 * Why a proxy chain (and not direct fetch):
 *   `fetch('https://sfdhr.org/past-examination-results')` from a browser
 *   fails with `TypeError: Failed to fetch` — sfdhr.org doesn't send the
 *   `Access-Control-Allow-Origin: *` header that a static client-side
 *   React app needs to read the response (verified S34 + S35).
 *
 * The S35 workaround that replaced manual-paste (which Alex called "way
 * too much manual work" for 66 pages): a chain of public CORS proxies.
 * Tries each in order; takes the first that returns 200 with HTML body.
 * Falls back to an optional configurable Cloudflare-Worker URL slot
 * (Alex's backup option, set up only if the public proxies prove flaky).
 * Manual paste remains as the ultimate last-resort fallback in the UI.
 *
 * Proxy order picked S35 (most-reliable-first):
 *   1. corsproxy.io — well-maintained, fast, no auth, body-pass-through
 *   2. allorigins.win/raw — older, slower, larger user base
 *   3. codetabs.com — smaller user base, last-resort
 *
 * Each proxy wraps the original URL as a query param and returns the
 * upstream body verbatim. We pass the same `?page=N` Drupal pagination
 * to whichever proxy is in use.
 *
 * Polite throttle: 500ms between page fetches to avoid spooking the
 * proxies' rate limiters. With ~66 pages, total scrape ≈ 33 seconds.
 *
 * Failure modes:
 *   - all proxies fail (e.g., user offline) → throw FetchDhrError with
 *     a message naming every proxy that was tried
 *   - one page parses 0 rows → assume end-of-data; stop iterating
 *   - upstream HTML changes break the parser → caller surfaces 0 rows;
 *     user falls back to the manual-paste panel (still in the UI)
 *
 * @see docs/research/dhr-eligibility-and-jobs-scraping-plan.md
 *      § Source 2 — Examination results
 */

import type { EligibilityList } from '../types';
import { parseDhrExamHtml } from './parse';

const BASE_URL = 'https://sfdhr.org/past-examination-results';
/** Safety cap so a malformed pagination doesn't loop forever. DHR had
 *  66 pages as of S33; 200 is generous headroom. */
const MAX_PAGES = 200;
/** Polite delay between page fetches (ms). Keeps us well below any
 *  reasonable rate-limit + matches the S33 research-doc recommendation. */
const PAGE_DELAY_MS = 500;

/**
 * One CORS-proxy strategy. The `wrap` function maps an upstream URL to
 * the URL we actually GET; the proxy passes the upstream body through.
 * The `label` shows up in error messages so failures are debuggable.
 */
interface CorsProxy {
  label: string;
  wrap: (upstreamUrl: string) => string;
}

/**
 * Default public CORS proxy chain. Order matters — most-reliable first.
 * Each proxy is hit serially per page (not in parallel) — racing them
 * would burn proxy quota for no benefit since we just need ONE to work.
 */
export const DEFAULT_PROXIES: readonly CorsProxy[] = [
  {
    label: 'corsproxy.io',
    wrap: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  },
  {
    label: 'allorigins.win',
    wrap: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  },
  {
    label: 'codetabs.com',
    wrap: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  },
];

/** Build the Cloudflare-Worker proxy entry when a URL is configured. The
 *  worker is expected to take `?url=<upstream>` and return the body. */
function workerProxy(workerUrl: string): CorsProxy {
  return {
    label: 'cloudflare-worker',
    wrap: (u) => {
      // Tolerant of both `?url=` and bare-base URLs — the worker can choose
      // its own param name, but `url` is the de-facto convention.
      const sep = workerUrl.includes('?') ? '&' : '?';
      return `${workerUrl}${sep}url=${encodeURIComponent(u)}`;
    },
  };
}

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchDhrOptions {
  /** Custom fetch impl (defaults to global `fetch`). For tests. */
  fetchImpl?: FetchImpl;
  /** Override the default proxy chain. Tests inject mock proxies. */
  proxies?: readonly CorsProxy[];
  /** Optional Cloudflare-Worker URL (appended to the proxy chain when set
   *  — tried LAST since it's the user's backup, not the default). */
  workerUrl?: string;
  /** Cap pages to fetch (default MAX_PAGES). Tests lower this. */
  maxPages?: number;
  /** Delay between page fetches in ms (default PAGE_DELAY_MS). Set to 0
   *  in tests to keep them fast. */
  pageDelayMs?: number;
  /** Per-stage progress callback. Fires once per successful page parse. */
  onProgress?: (info: {
    page: number;
    pagesSoFar: number;
    rowsSoFar: number;
    proxyUsed: string;
  }) => void;
}

/** Thrown when no proxy in the chain could fetch a given page. */
export class FetchDhrError extends Error {
  readonly proxyAttempts: ReadonlyArray<{ label: string; detail: string }>;
  constructor(msg: string, proxyAttempts: ReadonlyArray<{ label: string; detail: string }>) {
    super(msg);
    this.name = 'FetchDhrError';
    this.proxyAttempts = proxyAttempts;
  }
}

/**
 * Fetch one Drupal page through the proxy chain. Returns the first
 * successful response's text. Throws `FetchDhrError` when every proxy
 * fails, carrying the per-proxy failure detail for the UI to surface.
 */
async function fetchPageThroughProxies(
  upstreamUrl: string,
  proxies: readonly CorsProxy[],
  fetchImpl: FetchImpl,
): Promise<{ html: string; proxyUsed: string }> {
  const attempts: Array<{ label: string; detail: string }> = [];
  for (const proxy of proxies) {
    try {
      const resp = await fetchImpl(proxy.wrap(upstreamUrl));
      if (!resp.ok) {
        attempts.push({ label: proxy.label, detail: `HTTP ${resp.status}` });
        continue;
      }
      const html = await resp.text();
      // Some proxies return JSON-wrapped responses on error — detect by
      // checking that the body actually looks like HTML. Real DHR pages
      // (full or end-of-pagination shell) all carry the document type
      // declaration + an <html tag. JSON error envelopes start with `{`
      // or `[`. Body-content sniffing is more robust than length-based
      // checks: an empty-data page is still many KB of header/nav HTML.
      if (!looksLikeHtml(html)) {
        attempts.push({
          label: proxy.label,
          detail: `non-HTML body (first 40: ${html.slice(0, 40)})`,
        });
        continue;
      }
      return { html, proxyUsed: proxy.label };
    } catch (err) {
      attempts.push({
        label: proxy.label,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const detail = attempts.map(a => `${a.label}: ${a.detail}`).join('; ');
  throw new FetchDhrError(
    `All ${proxies.length} CORS proxies failed for ${upstreamUrl}. Details: ${detail}`,
    attempts,
  );
}

/**
 * Fetch + parse all pages of sfdhr.org/past-examination-results through
 * the proxy chain. Returns the flat `EligibilityList[]` ready to feed
 * `useScrapers.appendEligibilityLists` (or `setEligibilityLists` — this
 * fetch returns the WHOLE corpus, so a wholesale replace is appropriate).
 *
 * Pagination: Drupal `?page=N` (0-indexed). Iterates until a page parses
 * to zero rows (assumed end-of-data) or `maxPages` is hit (safety cap).
 *
 * @throws FetchDhrError when the first page fails (all proxies down).
 *         Subsequent-page failures stop the iteration but return whatever
 *         was successfully fetched (graceful degradation — partial scrape
 *         beats no scrape).
 */
export async function fetchDhrExamResults(
  opts: FetchDhrOptions = {},
): Promise<EligibilityList[]> {
  const fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  const baseProxies = opts.proxies ?? DEFAULT_PROXIES;
  // Optional Worker URL appended LAST so the default proxies handle the
  // common case; the worker is the user's hand-rolled backup.
  const proxies: readonly CorsProxy[] = opts.workerUrl
    ? [...baseProxies, workerProxy(opts.workerUrl)]
    : baseProxies;
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const delayMs = opts.pageDelayMs ?? PAGE_DELAY_MS;

  const all: EligibilityList[] = [];
  let pageNum = 0;
  for (; pageNum < maxPages; pageNum++) {
    const upstreamUrl = pageNum === 0
      ? BASE_URL
      : `${BASE_URL}?page=${pageNum}`;
    const { html, proxyUsed } = await fetchPageThroughProxies(
      upstreamUrl,
      proxies,
      fetchImpl,
    );
    const rows = parseDhrExamHtml(html);
    if (rows.length === 0) {
      // Empty page → assume end-of-data. Common pagination convention:
      // requesting a page past the last one returns the same template
      // shell with zero rows.
      break;
    }
    all.push(...rows);
    opts.onProgress?.({
      page: pageNum + 1,
      pagesSoFar: pageNum + 1,
      rowsSoFar: all.length,
      proxyUsed,
    });
    // Polite throttle between pages.
    if (delayMs > 0 && pageNum + 1 < maxPages) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return dedupeRows(all);
}

/** Body-sniff helper — does the response look like HTML (any flavor)?
 *  Catches both full DHR pages (`<!DOCTYPE html>`) and the empty-data
 *  shell (still wraps in `<html>`). Rejects JSON error envelopes (start
 *  with `{` or `[`) and plain-text error messages. */
function looksLikeHtml(body: string): boolean {
  // Quick reject for clearly-non-HTML first chars (saves a regex round trip).
  const head = body.trimStart().slice(0, 80).toLowerCase();
  if (!head) return false;
  if (head.startsWith('{') || head.startsWith('[')) return false;
  // Real HTML response: opens with a doctype or an <html (case-insensitive),
  // or at minimum carries an HTML tag the parser would recognize. Match
  // generously so we don't reject minor variants.
  return head.includes('<!doctype') || head.includes('<html') || head.includes('<body');
}

/** Dedupe by `(jobCode, listId, postDate)` — same key the store uses on
 *  append-paste. Belt-and-suspenders in case the proxy returns the same
 *  page twice (which we saw once during S35 verification). */
function dedupeRows(rows: EligibilityList[]): EligibilityList[] {
  const seen = new Set<string>();
  const out: EligibilityList[] = [];
  for (const r of rows) {
    const key = `${r.jobCode}|${r.listId}|${r.postDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
