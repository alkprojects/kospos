/**
 * SF Careers — SmartRecruiters Posting API fetcher.
 *
 * Verified S34 (2026-05-27): the public read-only endpoint accepts
 * browser fetch without an X-SmartToken header and returns the full
 * job-postings JSON. Total posting count at time of verification: 133.
 *
 * Strategy: paginate via `offset` until `content.length < limit`.
 * Limit 100 (the API's max).
 *
 * Returns `JobPosting[]` already normalized — name/jobCode/classTitle/
 * department/location extracted into KosPos-friendly fields.
 */

import type { JobPosting } from '../types';

const COMPANY = 'CityAndCountyOfSanFrancisco1';
const BASE_URL = `https://api.smartrecruiters.com/v1/companies/${COMPANY}/postings`;
const PAGE_SIZE = 100;
// SmartRecruiters' API caps responses at 1000 across all queries —
// hard ceiling on our paginate loop to avoid runaway pagination if
// the totalFound field is missing or wrong. 13 pages of 100 = 1300,
// well past the API ceiling.
const MAX_PAGES = 20;

/**
 * One SmartRecruiters Posting object as returned by the API. Partial —
 * we type only the fields KosPos consumes. The full shape is
 * documented at https://developers.smartrecruiters.com/docs/posting-api.
 */
interface SmartRecruitersPosting {
  id: string;
  name?: string;
  releasedDate?: string;
  ref?: string;
  uuid?: string;
  department?: { id?: string; label?: string };
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  // … other fields ignored.
}

interface SmartRecruitersPage {
  offset: number;
  limit: number;
  totalFound: number;
  content: SmartRecruitersPosting[];
}

/**
 * Extract the SF Job Code + class title from a posting `name`.
 *
 * SF Careers names use several formats; we try each in priority order:
 *
 *   "Physician Director of Jail Health Services (0943 Manager VIII)
 *    - Department of Public Health - EXEMPT"
 *      → jobCode 0943, classTitle "Manager VIII"
 *
 *   "Dietetic Technician (2622) - Department of Public Health - (EXEMPT)"
 *      → jobCode 2622, classTitle "" (caller falls back to posting name)
 *
 *   "Air Quality & Compliance Lead (5642)  - SFO - (163094)"
 *      → jobCode 5642, classTitle ""
 *
 *   "LATERAL 8530-Deputy Probation Officer (SFERS)"
 *      → jobCode 8530, classTitle ""
 *
 *   "Public Safety Communications Dispatcher - Dept Emergency Mgmt (8238)"
 *      → jobCode 8238, classTitle ""
 *
 * Returns `{ jobCode: '', classTitle: '' }` when no pattern matches —
 * caller keeps the posting but it won't cross-link to a Position.
 */
export function extractJobCodeFromName(name: string): { jobCode: string; classTitle: string } {
  if (!name) return { jobCode: '', classTitle: '' };
  // Pattern 1: (NNNN Title) — code AND title in parens (the richest form).
  // Greedy on the title portion — some titles have nested parens
  // ("Manager VIII (Job Sharing)") so we match the first 4-digit code.
  const m1 = name.match(/\((\d{4})\s+([^)]+)\)/);
  if (m1) return { jobCode: m1[1], classTitle: m1[2].trim() };
  // Pattern 2: (NNNN) — code-only in parens, no title attached.
  const m2 = name.match(/\((\d{4})\)/);
  if (m2) return { jobCode: m2[1], classTitle: '' };
  // Pattern 3: NNNN- — code-prefixed (e.g. "LATERAL 8530-Deputy Probation
  // Officer"). Word-boundary anchored so a phone-number-like sequence
  // doesn't accidentally match.
  const m3 = name.match(/\b(\d{4})\s*-/);
  if (m3) return { jobCode: m3[1], classTitle: '' };
  return { jobCode: '', classTitle: '' };
}

/**
 * Compose a user-facing URL from a SmartRecruiters posting id. The API
 * `ref` field points at the API resource; we want the human page.
 */
export function userFacingUrl(postingId: string): string {
  return `https://jobs.smartrecruiters.com/${COMPANY}/${postingId}`;
}

/**
 * Pure transform: SmartRecruiters posting → KosPos JobPosting.
 * Exposed for testing.
 */
export function normalizePosting(p: SmartRecruitersPosting): JobPosting {
  const { jobCode, classTitle } = extractJobCodeFromName(p.name ?? '');
  const locationParts = [
    p.location?.city,
    p.location?.region,
    p.location?.country,
  ].filter(Boolean) as string[];
  return {
    id: p.id,
    name: p.name ?? '',
    jobCode,
    classTitle,
    department: p.department?.label ?? '',
    location: locationParts.join(', '),
    releasedDate: p.releasedDate ?? '',
    url: userFacingUrl(p.id),
  };
}

/**
 * Inject a fetch impl for tests — default is the global fetch. The
 * signature matches `(input, init?) => Promise<Response>`.
 */
type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchJobPostingsOptions {
  /** Custom fetch impl (defaults to global `fetch`) — for tests. */
  fetchImpl?: FetchImpl;
  /** Cap pages to fetch — defaults to MAX_PAGES (20). Tests can lower. */
  maxPages?: number;
  /** Per-stage progress callback — called once per page fetched. */
  onProgress?: (info: { page: number; offset: number; postingsSoFar: number; totalFound: number }) => void;
}

/**
 * Fetch all open postings from SmartRecruiters for the SF company
 * account. Paginated; returns the flattened list.
 *
 * Errors: throws a `FetchJobPostingsError` with a human-readable
 * message. Caller (the UI) should catch and surface the message in
 * the LoadingOverlay error state.
 */
export class FetchJobPostingsError extends Error {
  /** Underlying cause if there was one — usually a network TypeError. */
  readonly cause?: unknown;
  constructor(msg: string, cause?: unknown) {
    super(msg);
    this.name = 'FetchJobPostingsError';
    this.cause = cause;
  }
}

export async function fetchJobPostings(
  opts: FetchJobPostingsOptions = {},
): Promise<JobPosting[]> {
  const fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const all: JobPosting[] = [];
  let offset = 0;
  let totalFound = 0;
  for (let page = 0; page < maxPages; page++) {
    const url = `${BASE_URL}?limit=${PAGE_SIZE}&offset=${offset}`;
    let response: Response;
    try {
      response = await fetchImpl(url);
    } catch (cause) {
      throw new FetchJobPostingsError(
        `Network error fetching page ${page + 1} from SmartRecruiters. Check your internet connection or VPN.`,
        cause,
      );
    }
    if (!response.ok) {
      throw new FetchJobPostingsError(
        `SmartRecruiters returned HTTP ${response.status} on page ${page + 1}.`,
      );
    }
    let json: SmartRecruitersPage;
    try {
      json = await response.json() as SmartRecruitersPage;
    } catch (cause) {
      throw new FetchJobPostingsError(
        `SmartRecruiters returned non-JSON on page ${page + 1}.`,
        cause,
      );
    }
    totalFound = json.totalFound ?? totalFound;
    const contentLen = json.content?.length ?? 0;
    for (const p of json.content ?? []) {
      all.push(normalizePosting(p));
    }
    opts.onProgress?.({
      page: page + 1,
      offset,
      postingsSoFar: all.length,
      totalFound,
    });
    if (contentLen < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}
