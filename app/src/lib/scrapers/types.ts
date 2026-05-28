/**
 * Shared types for the DHR / SF Careers data scrapers — Phase 2.2.k.
 *
 * Two upstream sources, two scrape paths:
 *
 *   - SF Careers (careers.sf.gov) — backed by SmartRecruiters' public
 *     Posting API. **CORS permissive** as of S34 CORS verification —
 *     browser fetch works without a token. Real scrape, on demand.
 *
 *   - SF DHR Examination Results (sfdhr.org/past-examination-results) —
 *     Drupal-rendered HTML table, 66+ pages. **CORS blocked** as of S34
 *     verification. Manual-paste fallback: user copies the page HTML
 *     from a browser tab, KosPos parses the paste.
 *
 * KosPos's job is to keep a per-job-code rollup answering:
 *   1. Is there an active posting right now? (link to careers.sf.gov)
 *   2. Is there an active eligibility list? (link to the PDF on sfdhr.org)
 *
 * Both answers join to `Position.jobCode` from `lib/positions/types.ts`.
 *
 * @see docs/research/dhr-eligibility-and-jobs-scraping-plan.md — the
 *      S33 research doc that informed this layer.
 */

/**
 * One open job posting at careers.sf.gov, as returned by the
 * SmartRecruiters Posting API. We narrow the SmartRecruiters response
 * shape to just what KosPos needs.
 *
 * `jobCode` is extracted from the posting `name` (which embeds the SF
 * job code in parens — `"Title (1820 Junior Admin Analyst) - Dept"`).
 * When extraction fails we keep the posting but leave jobCode empty;
 * the row still surfaces in the all-postings list, just not in the
 * per-position cross-link.
 */
export interface JobPosting {
  /** SmartRecruiters posting id (string — they're numeric but big). */
  id: string;
  /** Posting title verbatim from SmartRecruiters (long form). */
  name: string;
  /** SF Job Code extracted from `name` — e.g. `'1820'`. Empty when
   *  extraction failed; row stays but won't link to a Position. */
  jobCode: string;
  /** Class title extracted from `name` — e.g. `'Junior Admin Analyst'`.
   *  Empty when extraction failed. */
  classTitle: string;
  /** Department name from SmartRecruiters (e.g. `'Public Health'`). */
  department: string;
  /** SmartRecruiters location label (sometimes a city, sometimes blank). */
  location: string;
  /** Release ISO timestamp (e.g. `'2026-05-27T15:28:32.842Z'`). */
  releasedDate: string;
  /** Permalink to the SmartRecruiters posting page (user-facing URL on
   *  jobs.smartrecruiters.com). */
  url: string;
}

/**
 * One eligibility list / score report from sfdhr.org. Either is a
 * passing-the-exam record — `score-report` for miscellaneous civil
 * service classes (most), `eligible-list` for uniformed police/fire
 * ranks.
 *
 * The data here is the *metadata* from the listing page — class code,
 * list id, post date, file URL. We do NOT parse the PDF contents
 * for candidate names + scores (KosPos only needs aggregate "does an
 * active list exist?" answers). Phase 2.2.o adds the **header-only**
 * PDF text extraction for the cover-sheet fields (cert rule, list
 * department, exam sub-type) — see {@link PdfExtract}.
 */
export interface EligibilityList {
  /** SF Job Code — first segment of the filename (e.g. `'0932'`). */
  jobCode: string;
  /** Class title parsed from the row's link text (e.g. `'Manager IV'`). */
  classTitle: string;
  /** DHR's list identifier — varies in format (numeric `161040`, or
   *  letter-prefixed `A00026` / `C00188` / `X00018`). Treat as opaque. */
  listId: string;
  /** Post date — ISO `YYYY-MM-DD` after normalization from DHR's
   *  human-readable form ("May 14, 2026"). */
  postDate: string;
  /** Full URL to the PDF score report / eligibility list. */
  fileUrl: string;
  /** Which DHR section the row came from. Both are "people who passed
   *  the exam"; uniformed ranks just use a different page region. */
  type: 'score-report' | 'eligible-list';
}

/**
 * PDF cover-sheet fields extracted on demand from a single eligibility
 * list PDF — Phase 2.2.o.
 *
 * Why this is a SEPARATE side-table (rather than embedded on
 * `EligibilityList`):
 *   1. Extraction is **lazy** — only fires when the user opens the
 *      detail modal for a job code. We don't pay the bandwidth + parse
 *      cost for the ~6,729 lists that never get opened.
 *   2. Extraction is **per-PDF** (1-3 PDFs per modal open) so the cache
 *      grows organically; embedding would force us to either populate
 *      the field upfront (defeats laziness) or leave it dangling
 *      `undefined` on every list (less type-honest than a side-cache
 *      where presence implies an extraction attempt happened).
 *   3. Older scanned PDFs may parse to empty strings; the `success`
 *      flag distinguishes "we tried and got nothing" from "we haven't
 *      tried yet" — important so the UI doesn't re-extract on every
 *      modal re-open.
 *
 * Side-cache lives in `useScrapers.pdfCache` keyed by
 * `(jobCode|listId|postDate)` — same identity key the
 * `appendEligibilityLists` setter dedupes on.
 *
 * All three extracted fields are `string | undefined` — undefined means
 * the regex/heuristic chain didn't find a match in the cover sheet (the
 * PDF was scanned, the layout was atypical, or the field genuinely
 * isn't present). The user can click `↗ PDF` to see for themselves.
 */
export interface PdfExtract {
  /** Certification rule from PDF cover sheet's `Cert Rule:` label, e.g.
   *  `'Rule of the List'` or `'Rule of 3 Names'`. Undefined when no
   *  match. */
  certRule?: string;
  /** List department from PDF cover sheet's `Scope:` label, e.g.
   *  `'Citywide'` (DHR uses `CTW` which we normalize), `'DBI'`,
   *  `'DPH'`, `'PUC'`, or a longer name on legacy PDFs. Undefined when
   *  no match. */
  listDepartment?: string;
  /** Exam sub-type from PDF cover sheet's `List Type:` label, e.g.
   *  `'CPE'` (Combined Promotive Entrance), `'PCS'`, `'Promotional'`,
   *  `'Entrance'`. Undefined when no match. */
  examSubType?: string;
  /** Exam testing methodology from PDF cover sheet's `Exam Type:`
   *  label, e.g. `'PBT'` (Performance-Based Test), `'ETP'` (Education /
   *  Training / Promotive), `'CBT'`, `'Q&E'`. Distinct from
   *  `examSubType` (which is the classification). Captured here for
   *  future use; not yet surfaced in the column UI as of Phase 2.2.o
   *  (filed as Phase 2.2.p follow-up). Undefined when no match. */
  examType?: string;
  /** Per-list duration from PDF cover sheet's `Duration:` label, e.g.
   *  `'12 Months'` or `'6 Months'`. **Important**: contradicts the
   *  Phase 2.2.n "constant 2yr per CSC Rule 411A/412" assumption;
   *  real DHR lists vary from 6mo to 24mo+. Captured here so a future
   *  PR can replace the constant Duration chip + per-row Expires
   *  computation with the actual value. Undefined when no match. */
  duration?: string;
  /** ISO timestamp of the extraction attempt. */
  extractedAt: string;
  /** True when the PDF was fetched + parsed without error (even if one
   *  or more individual fields didn't match). False when the fetch
   *  failed (all CORS proxies down) or pdfjs threw. */
  success: boolean;
  /** Error message when `success === false`; surfaced as a tooltip on
   *  the failed-cell `—`. Undefined when `success === true`. */
  error?: string;
}

/**
 * Per-jobCode rollup combining open postings + active lists. The
 * EligibilityView builds this on the fly from the latest scrape;
 * not persisted independently.
 */
export interface JobCodeRollup {
  jobCode: string;
  /** Best-effort class title — picked from the most-recent posting or
   *  list. Helps the user disambiguate codes without loading P&P. */
  classTitle: string;
  /** All open postings for this code (often 0 or 1, occasionally more). */
  postings: JobPosting[];
  /** All active eligibility lists for this code (sorted by post date,
   *  newest first). "Active" is age-based — see `isListActive`. */
  activeLists: EligibilityList[];
  /** Older lists past the active window. Kept for context. */
  expiredLists: EligibilityList[];
}

/**
 * Default "active" window for eligibility lists — 2 years from post
 * date, per CSC Rule 411A / 412 (lists may be extended; for v1 we
 * surface raw age and let the user assert active vs expired in
 * exception cases).
 */
export const DEFAULT_ACTIVE_LIST_WINDOW_DAYS = 365 * 2;
