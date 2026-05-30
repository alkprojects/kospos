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
 * Proxy order (re-checked S49 — lead with the one still working for free;
 * see DEFAULT_PROXIES below for the per-proxy health notes):
 *   1. codetabs.com — working; uses the trailing-slash path to skip a 301
 *   2. corsproxy.io — now HTTP 403 (went paid); fast-failing fallback
 *   3. allorigins.win/raw — HTTP 500 / slow; last-resort fallback
 *
 * Each proxy wraps the original URL as a query param and returns the
 * upstream body verbatim. We pass the same `?page=N` Drupal pagination
 * to whichever proxy is in use.
 *
 * Speed (Phase 2.2.v): pages are fetched in WAVES of `concurrency`
 * (default 6) rather than one-at-a-time-with-a-500ms-throttle. The old
 * polite throttle made a ~66-page scrape take ~50s (mostly idle waiting);
 * S46 measured the public proxy tolerating 8 concurrent page fetches with
 * zero rate-limiting (8/8 → 200 in 429ms), so bounded concurrency cuts a
 * full scrape to ~5s. Each page still walks the full proxy fallback chain
 * independently, and a per-proxy timeout (default 10s) keeps one slow /
 * hung proxy from stalling its wave.
 *
 * Failure modes:
 *   - all proxies fail on the FIRST page (e.g., user offline) → throw
 *     FetchDhrError naming every proxy that was tried
 *   - a page parses 0 rows → assume end-of-data; stop launching waves
 *     (later pages already in flight in that wave are discarded)
 *   - all proxies fail on a LATER page → treat as end-of-data; return the
 *     partial scrape (a transient blip near the tail shouldn't lose the
 *     pages that already succeeded)
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
/** Pages fetched concurrently per wave. 6 is well under the 8-at-once the
 *  public proxy tolerated in the S46 probe (8/8 → 200, no rate-limiting),
 *  leaving headroom for the deployed origin's possibly-stricter limits
 *  while still cutting a full scrape from ~50s to ~5s. Each page in a wave
 *  walks its own proxy fallback chain, so concurrency multiplies
 *  throughput without giving up resilience. */
const DEFAULT_CONCURRENCY = 6;
/** Per-proxy fetch timeout (ms). Before this existed a hung proxy could
 *  block a page (and thus its wave) indefinitely — the most likely cause
 *  of "the scrape used to be fast, now it hangs". On timeout the fetch is
 *  aborted and the page falls through to the next proxy in the chain. */
const PROXY_TIMEOUT_MS = 10_000;

/**
 * One CORS-proxy strategy. The `wrap` function maps an upstream URL to
 * the URL we actually GET; the proxy passes the upstream body through.
 * The `label` shows up in error messages so failures are debuggable.
 *
 * Exported so the Phase 2.2.o PDF fetcher in `./pdf-parse.ts` can reuse
 * the same proxy abstraction without redefining it.
 */
export interface CorsProxy {
  label: string;
  wrap: (upstreamUrl: string) => string;
}

/**
 * Default public CORS proxy chain. Order matters: within a single page the
 * proxies are tried in sequence and the first usable 200-with-HTML response
 * wins, so the proxy MOST LIKELY to work goes FIRST. (Pages themselves are
 * fetched concurrently in waves — see `fetchDhrExamResults`.)
 *
 * S49 live health check (this order reflects it):
 *   - codetabs.com   — WORKING; the only one still serving free. Uses the
 *                      trailing-slash path `/v1/proxy/?quest=` — the no-slash
 *                      form 301-redirects, costing an extra round trip
 *                      (~0.5s → ~1.2s per page).
 *   - corsproxy.io   — DEAD for free use: HTTP 403 "Server-side requests are
 *                      not allowed on your plan" (moved server-side proxying
 *                      behind a paid plan). Fails in ~0.1s, so it's a cheap
 *                      fallback; kept in case a free tier returns.
 *   - allorigins.win — BROKEN: HTTP 500, and has been seen taking ~12s to
 *                      return it. Last, behind the per-proxy timeout; kept as
 *                      a may-recover fallback.
 *
 * Leading with the two DEAD proxies is exactly what regressed the scrape:
 * every page burned the per-proxy timeout on allorigins before falling
 * through to codetabs. Leading with the working proxy restores the ~5s scrape.
 */
export const DEFAULT_PROXIES: readonly CorsProxy[] = [
  {
    label: 'codetabs.com',
    wrap: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  },
  {
    label: 'corsproxy.io',
    wrap: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  },
  {
    label: 'allorigins.win',
    wrap: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
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
  /** Pages to fetch concurrently per wave (default DEFAULT_CONCURRENCY).
   *  Set to 1 to force the old strictly-sequential behavior (tests that
   *  assert exact call order / counts do this). */
  concurrency?: number;
  /** Per-proxy fetch timeout in ms (default PROXY_TIMEOUT_MS). A fetch that
   *  doesn't settle within the window is aborted and the page falls through
   *  to the next proxy. Set to 0 to disable the timeout (tests). */
  timeoutMs?: number;
  /** Delay between waves in ms (default 0 — bounded concurrency is itself
   *  the throttle). Kept configurable for politeness if a proxy ever starts
   *  rate-limiting. Tests pass 0. */
  pageDelayMs?: number;
  /** Per-page progress callback. Fires once per successfully parsed page,
   *  in ascending page order. */
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
 * Run `fetchImpl` with an AbortController-backed timeout. On timeout the
 * request is aborted, which rejects the fetch so the caller falls through
 * to the next proxy. When `timeoutMs <= 0` (or AbortController isn't
 * available) the fetch runs untimed.
 *
 * Exported so `./pdf-parse.ts`'s PDF binary fetch reuses the identical
 * per-proxy timeout mechanism (carry-forward PDF-TO) rather than
 * re-implementing it.
 */
export async function fetchWithTimeout(
  fetchImpl: FetchImpl,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  if (!(timeoutMs > 0) || typeof AbortController === 'undefined') {
    return fetchImpl(url);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
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
  timeoutMs: number,
): Promise<{ html: string; proxyUsed: string }> {
  const attempts: Array<{ label: string; detail: string }> = [];
  for (const proxy of proxies) {
    try {
      const resp = await fetchWithTimeout(fetchImpl, proxy.wrap(upstreamUrl), timeoutMs);
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

/** One page's fetch+parse outcome. `error` is set only when every proxy
 *  failed for that page. */
interface PageResult {
  page: number;
  rows: EligibilityList[];
  proxyUsed: string;
  error: FetchDhrError | null;
}

/**
 * Fetch + parse all pages of sfdhr.org/past-examination-results through
 * the proxy chain. Returns the flat `EligibilityList[]` ready to feed
 * `useScrapers.appendEligibilityLists` (or `setEligibilityLists` — this
 * fetch returns the WHOLE corpus, so a wholesale replace is appropriate).
 *
 * Pagination: Drupal `?page=N` (0-indexed). Pages are fetched in waves of
 * `concurrency`; iteration stops at the first page that parses to zero
 * rows (assumed end-of-data) or `maxPages` (safety cap). Within a wave the
 * fetches race, but results are processed in ascending page order so the
 * output + `onProgress` stream are deterministic regardless of which fetch
 * resolves first.
 *
 * @throws FetchDhrError when the first page fails (all proxies down).
 *         A later-page failure stops iteration but returns whatever was
 *         successfully fetched (graceful degradation — partial scrape
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
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
  const timeoutMs = opts.timeoutMs ?? PROXY_TIMEOUT_MS;
  const waveDelayMs = opts.pageDelayMs ?? 0;

  const pageRows: EligibilityList[][] = [];
  let processed = 0;
  let totalRows = 0;
  let reachedEnd = false;

  for (let waveStart = 0; waveStart < maxPages && !reachedEnd; waveStart += concurrency) {
    const waveEnd = Math.min(waveStart + concurrency, maxPages);
    const pageNums: number[] = [];
    for (let n = waveStart; n < waveEnd; n++) pageNums.push(n);

    // Fire the whole wave concurrently. Each page independently walks the
    // proxy fallback chain; a failed page resolves with `error` set rather
    // than rejecting, so one bad page can't abort the whole Promise.all.
    const settled: PageResult[] = await Promise.all(pageNums.map(async (n) => {
      const upstreamUrl = n === 0 ? BASE_URL : `${BASE_URL}?page=${n}`;
      try {
        const { html, proxyUsed } = await fetchPageThroughProxies(
          upstreamUrl, proxies, fetchImpl, timeoutMs,
        );
        return { page: n, rows: parseDhrExamHtml(html), proxyUsed, error: null };
      } catch (err) {
        return { page: n, rows: [], proxyUsed: '', error: err as FetchDhrError };
      }
    }));

    // Process strictly in page order so end-of-data detection matches the
    // old sequential behavior: the FIRST page that errors or parses to zero
    // rows marks the end; later pages already fetched in this wave are
    // dropped.
    for (const r of settled) {
      if (r.error) {
        // First page failing on every proxy is a hard error (all proxies
        // down / offline) — surface it. A later page failing is treated as
        // end-of-data so a transient tail blip keeps the partial scrape.
        if (r.page === 0) throw r.error;
        reachedEnd = true;
        break;
      }
      if (r.rows.length === 0) {
        // Empty page → assume end-of-data. Common pagination convention:
        // requesting a page past the last one returns the same template
        // shell with zero rows.
        reachedEnd = true;
        break;
      }
      pageRows.push(r.rows);
      processed += 1;
      totalRows += r.rows.length;
      opts.onProgress?.({
        page: r.page + 1,
        pagesSoFar: processed,
        rowsSoFar: totalRows,
        proxyUsed: r.proxyUsed,
      });
    }

    // Polite inter-wave pause (off by default — bounded concurrency is the
    // throttle). Skipped once we've hit the end.
    if (!reachedEnd && waveDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, waveDelayMs));
    }
  }

  return dedupeRows(pageRows.flat());
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
