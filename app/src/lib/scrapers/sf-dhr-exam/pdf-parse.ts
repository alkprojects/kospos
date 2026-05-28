/**
 * Lazy PDF cover-sheet text extraction — Phase 2.2.o.
 *
 * The DHR exam-results listing pages (parsed by `./parse.ts`) give us
 * metadata for each list (jobCode, classTitle, listId, postDate, fileUrl,
 * type). Three additional fields live on the **PDF cover sheet** of each
 * list and are not in the listing HTML:
 *
 *   - Certification rule — e.g. "Rule of the List", "Rule of 3 Names"
 *     (CSC Rule 411A vs. 412 governs the count of names the appointing
 *     officer must consider)
 *   - List department — e.g. "Citywide" vs. "DBI" vs. "Department of
 *     Public Health" (governs who may use the list to hire from)
 *   - Exam sub-type — e.g. "Promotional", "PCS", "CBT", "Q&E"
 *     (governs the examination format + eligibility class)
 *
 * Why lazy:
 *   ~6,729 lists × ~3-10s per PDF fetch+parse = ~6 hours of background
 *   work if eager. The user only ever looks at a few job codes per
 *   session, so we extract per-modal-open + cache the result. Cost: the
 *   first modal open is 3-10s slower; re-opens within the same session
 *   are instant.
 *
 * Why a separate CORS-proxy fetch (vs. direct fetch):
 *   sfdhr.org PDFs are served with the same restrictive CORS posture as
 *   the listing pages — direct fetch from a browser throws. We reuse the
 *   same proxy chain `./fetch.ts` uses for the listing HTML (corsproxy.io
 *   → allorigins.win → codetabs.com → optional Cloudflare-Worker), just
 *   asking for binary instead of text.
 *
 * Why pdfjs-dist:
 *   Mozilla's reference PDF.js renderer. Pure-JS, no native deps, works
 *   in the browser without a Node bridge. v4+ ships ESM + a separate
 *   worker file; we dynamic-import both so neither lands in the main
 *   bundle until the first PDF extract is requested.
 *
 * Limitations:
 *   - Scanned PDFs (older lists, image-only) extract to empty text; all
 *     three fields fall back to undefined. The UI shows `—` with the
 *     cause in a tooltip; the user can still click ↗ PDF to read it.
 *   - The regex/heuristic matchers are best-effort against DHR's varying
 *     cover-sheet layouts. Each matcher independently returns undefined
 *     on no match, so a partial extraction (e.g., cert rule found, dept
 *     not) is the common middle case + still useful.
 *
 * @see ../types.ts § PdfExtract — the side-cache shape.
 * @see ./fetch.ts § DEFAULT_PROXIES — the proxy chain we reuse.
 */

import type { PdfExtract } from '../types';
import { DEFAULT_PROXIES, type CorsProxy } from './fetch';

// ---------------------------------------------------------------------------
// Lazy pdfjs loader — keeps the ~500 KB main module + the worker out of
// the main bundle. The first PDF extract pays the import cost; subsequent
// extracts within the session reuse the resolved module + worker URL.
// ---------------------------------------------------------------------------

/** Resolved pdfjs handle, cached after first load. */
let pdfjsModule: typeof import('pdfjs-dist') | undefined;

async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsModule) return pdfjsModule;
  const [pdfjs, workerUrlMod] = await Promise.all([
    import('pdfjs-dist'),
    // Vite asset import — resolves to a hashed URL under `/kospos/assets/`
    // at build time; in dev resolves to the source path. The dynamic
    // import keeps both files out of the initial bundle.
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrlMod.default;
  pdfjsModule = pdfjs;
  return pdfjs;
}

// ---------------------------------------------------------------------------
// PDF binary fetch — reuses the same proxy chain as ./fetch.ts for HTML
// but asks for arrayBuffer + sniffs the PDF magic bytes (`%PDF-`).
// ---------------------------------------------------------------------------

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

/** Thrown when no proxy in the chain could fetch a given PDF. */
export class FetchPdfError extends Error {
  readonly proxyAttempts: ReadonlyArray<{ label: string; detail: string }>;
  constructor(msg: string, proxyAttempts: ReadonlyArray<{ label: string; detail: string }>) {
    super(msg);
    this.name = 'FetchPdfError';
    this.proxyAttempts = proxyAttempts;
  }
}

/** Quick binary sniff — is this an actual PDF or a JSON/text error envelope? */
function looksLikePdf(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 5) return false;
  const head = new Uint8Array(buf, 0, 5);
  // ASCII `%PDF-` is `25 50 44 46 2D`.
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44
      && head[3] === 0x46 && head[4] === 0x2D;
}

async function fetchPdfBinary(
  fileUrl: string,
  proxies: readonly CorsProxy[],
  fetchImpl: FetchImpl,
): Promise<ArrayBuffer> {
  const attempts: Array<{ label: string; detail: string }> = [];
  for (const proxy of proxies) {
    try {
      const resp = await fetchImpl(proxy.wrap(fileUrl));
      if (!resp.ok) {
        attempts.push({ label: proxy.label, detail: `HTTP ${resp.status}` });
        continue;
      }
      const buf = await resp.arrayBuffer();
      if (!looksLikePdf(buf)) {
        attempts.push({
          label: proxy.label,
          detail: `non-PDF body (${buf.byteLength} bytes, no %PDF- magic)`,
        });
        continue;
      }
      return buf;
    } catch (err) {
      attempts.push({
        label: proxy.label,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const detail = attempts.map(a => `${a.label}: ${a.detail}`).join('; ');
  throw new FetchPdfError(
    `All ${proxies.length} CORS proxies failed for ${fileUrl}. Details: ${detail}`,
    attempts,
  );
}

// ---------------------------------------------------------------------------
// PDF text extraction — pdfjs first N pages → plain text join.
// ---------------------------------------------------------------------------

/** Extract concatenated plain text from the first `maxPages` of a PDF.
 *  Cover sheets are typically the first 1-2 pages, so we don't need to
 *  walk the whole document (some lists run 50+ pages of candidate names). */
async function extractFirstPagesText(buf: ArrayBuffer, maxPages: number): Promise<string> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    // Silence pdfjs's verbose console output on minor PDF irregularities;
    // we only care about the extracted text, not warnings about font hints
    // or broken xref tables in older files.
    verbosity: 0,
  }).promise;
  const pageCount = Math.min(doc.numPages, maxPages);
  const parts: string[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    // pdfjs text items are { str, ... } when present (TextItem) or a
    // marked-content boundary (TextMarkedContent) without `str`. We
    // collect only the actual text runs.
    const pageText = tc.items
      .map(it => ('str' in it ? it.str : ''))
      .filter(Boolean)
      .join(' ');
    parts.push(pageText);
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Field matchers — pure string functions, exported individually so the
// regex behavior can be unit-tested without needing a real PDF binary.
// Each returns string | undefined; undefined = no match.
//
// Real DHR score-report cover sheets are a labeled table:
//
//   List ID:    161040
//   Exam Type:  PBT
//   Class:      0932-Manager IV
//   Scope:      PUC
//   Working Title: Manager IV
//   List Type:  CPE
//   Job Specialty: None
//   Post:       2026-05-14
//   Cert Rule:  Rule of the List
//   Duration:   12 Months
//   Inspection Start: 2026-05-14
//   ...
//
// pdfjs flattens this into one text run with run-on spacing, e.g.
//   "Exam Type:   PBT Class:   0932-Manager IV   Scope:   PUC ..."
//
// The TIER-1 strategy (`extractLabeledField`) parses each value by
// matching the literal label + colon, then capturing up to the next
// known label or ISO date. This is far more reliable than the freeform
// regex chains we used before live data confirmed the format.
//
// The TIER-2 fallbacks (the original freeform regexes) stay because:
//   1. Test fixtures still use synthetic English ("Rule of 3 Names",
//      "Department of Public Health") which doesn't match DHR labels.
//   2. Older legacy PDFs may not use the modern labeled layout.
//   3. Defensive: if DHR changes the labels in a future scrape, the
//      freeform tier still salvages partial data.
// ---------------------------------------------------------------------------

/**
 * Known DHR labels — used as boundary markers when extracting a labeled
 * field's value. The value is captured up to the NEXT label in this set
 * (or an ISO date, which is what `Post:` / `Inspection Start:` etc.
 * carry). Add new labels here if DHR introduces new fields; ordering
 * doesn't matter — the regex sees the union.
 */
const DHR_LABELS: ReadonlyArray<string> = [
  'List ID',
  'Exam Type',
  'Class',
  'Scope',
  'Working Title',
  'List Type',
  'Job Specialty',
  'Post',
  'Cert Rule',
  'Duration',
  'Inspection Start',
  'Inspection End',
  'Adoption',
  'List Note',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Boundary pattern: any known DHR label followed by `:`, OR an ISO
 *  date (since several labels' values ARE ISO dates). The match's value
 *  capture stops just before this boundary. Compiled once. */
const DHR_BOUNDARY = `(?:\\s+(?:${DHR_LABELS.map(escapeRegex).join('|')})\\s*:|\\s+\\d{4}-\\d{2}-\\d{2}\\b|$)`;

/**
 * TIER-1 helper: extract the value of a `<label>:` field from DHR
 * cover-sheet text. Returns trimmed + whitespace-collapsed value, or
 * undefined when label not present / value empty / value too long
 * (defensive cap to keep runaway parses from polluting the cache).
 *
 * Exported for tests; consumers usually call the higher-level `matchX`
 * helpers below instead.
 */
export function extractLabeledField(
  text: string,
  label: string,
  maxLen = 80,
): string | undefined {
  const re = new RegExp(escapeRegex(label) + '\\s*:\\s*(.+?)(?=' + DHR_BOUNDARY + ')', 's');
  const m = text.match(re);
  if (!m || !m[1]) return undefined;
  const v = m[1].trim().replace(/\s+/g, ' ');
  if (!v || v.length > maxLen) return undefined;
  return v;
}

// ---------------------------------------------------------------------------
// Per-field matchers — Tier-1 (label) → Tier-2 (freeform regex chain).
// ---------------------------------------------------------------------------

/**
 * Match the CSC certification rule.
 *
 * Tier 1: `Cert Rule:` label on modern DHR PDFs.
 * Tier 2: freeform "Rule of (the List|N Names|N Scores)" pattern for
 * legacy PDFs or non-DHR test fixtures.
 *
 * In both tiers, the output is normalized: "Rule of the List", "Rule
 * of 3 Names", "Rule of 1 Name" (singular). Two PDFs with different
 * whitespace render identically in the table.
 */
export function matchCertRule(text: string): string | undefined {
  const labeled = extractLabeledField(text, 'Cert Rule');
  if (labeled) {
    // Normalize the labeled value so "Rule of the List" / "rule of 3
    // names" / "Rule of  the  List" all map to the same display form.
    return normalizeCertRule(labeled) ?? labeled;
  }
  // Tier 2: freeform.
  const m = text.match(/Rule\s+of\s+(?:the\s+List|(\d+)\s+(Name|Score)s?)/i);
  if (!m) return undefined;
  return normalizeCertRule(m[0]);
}

/** Internal: collapse a raw cert-rule string to a canonical form. */
function normalizeCertRule(raw: string): string | undefined {
  if (/the\s+List/i.test(raw)) return 'Rule of the List';
  const nm = raw.match(/Rule\s+of\s+(\d+)\s+(Name|Score)s?/i);
  if (!nm) return raw.trim();
  const n = nm[1];
  // n === '1' is grammatically singular ("Rule of 1 Name", not "Names").
  // CSC convention almost always uses 3 / 5 / 10, but n=1 surfaces
  // occasionally and we'd rather not normalize to ungrammatical output.
  const baseKind = nm[2].toLowerCase() === 'name' ? 'Name' : 'Score';
  const kind = n === '1' ? baseKind : `${baseKind}s`;
  return `Rule of ${n} ${kind}`;
}

/**
 * Match the list department / hiring scope.
 *
 * Tier 1: `Scope:` label on modern DHR PDFs (values like `PUC`, `DPH`,
 *   `CTW`, `DBI`). `CTW` is normalized to "Citywide" for readability.
 * Tier 2: legacy strategies (try in order, take first match):
 *   - Literal "Citywide" anywhere in text.
 *   - "Department: <Name>" / "Examination Department: <Name>" /
 *     "Hiring Department: <Name>".
 *   - "Department of <Name>" narrative form (excluding the "Department
 *     of Human Resources" issuing-body header which appears on every
 *     DHR PDF as boilerplate).
 *   - 3-letter SF dept code whitelist as a last resort.
 */
export function matchListDepartment(text: string): string | undefined {
  // Tier 1: labeled.
  const scoped = extractLabeledField(text, 'Scope');
  if (scoped) {
    if (/^CTW$/i.test(scoped)) return 'Citywide';
    return scoped;
  }
  // Tier 2: freeform fallbacks.
  if (/\bCitywide\b/i.test(text)) return 'Citywide';
  const labeledLegacy = text.match(
    /(?:Examination|Hiring|List)?\s*Department\s*:\s*([A-Z][A-Za-z0-9 &().,'\-]{2,60})/,
  );
  if (labeledLegacy) {
    const name = labeledLegacy[1].trim().replace(/\s+/g, ' ');
    if (name) return name;
  }
  // Narrative — walk EACH "Department of" occurrence individually,
  // because the greedy [A-Za-z &-]{2,60} capture against the first
  // occurrence may consume past later occurrences (e.g. "Department of
  // Human Resources Eligible List for Department of Public Works"
  // captures everything in one go via the first match). For each
  // occurrence: extract the value, truncate at the first STOP_WORD
  // (DHR concatenation artifact), skip if it's the "Human Resources"
  // issuing-body boilerplate.
  const STOP_WORDS = /\s+(?:Eligible|Score|List|Examination|Position|Working|Class|Scope|Job|Cert|Duration|Inspection|Adoption|Department|for)\b/;
  const needle = 'Department of';
  for (let pos = text.indexOf(needle); pos !== -1; pos = text.indexOf(needle, pos + 1)) {
    const slice = text.slice(pos);
    const m = slice.match(/^Department\s+of\s+([A-Z][A-Za-z &-]{2,60})/);
    if (!m || !m[1]) continue;
    let name = m[1].trim().replace(/\s+/g, ' ');
    const stopMatch = name.match(STOP_WORDS);
    if (stopMatch && stopMatch.index !== undefined) {
      name = name.slice(0, stopMatch.index).trim();
    }
    if (name && !/^Human\s+Resources/i.test(name)) {
      return `Department of ${name}`;
    }
  }
  const codeMatch = text.match(/\b(DBI|DPH|DPW|MTA|SFO|SFPD|SFFD|REC|HRD|CON|MYR|PUC)\b/);
  if (codeMatch) return codeMatch[1];
  return undefined;
}

/**
 * Match the exam sub-type (eligibility classification).
 *
 * Tier 1: `List Type:` label on modern DHR PDFs (values like `CPE`
 *   (Combined Promotive Entrance), `PCS`, `Promotive`, `Entrance`).
 * Tier 2: whitelist of known classification keywords for legacy PDFs
 *   or non-DHR test fixtures.
 *
 * Note: distinct from `matchExamType` (which captures the testing
 * METHODOLOGY — PBT/CBT/ETP — under the `Exam Type:` label).
 */
const EXAM_SUB_TYPE_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // Specific forms first so they win over the bare keyword variants below.
  [/\bDepartmental\s+Promotive\b/i, 'Departmental Promotive'],
  [/\bPermanent\s+Civil\s+Service\b/i, 'PCS'],
  [/\bPermanent\s+Exempt\b/i, 'PEX'],
  [/\bTemporary\s+Exempt\b/i, 'TEX'],
  [/\bComputer-?Based\s+Test\b/i, 'CBT'],
  [/\bQualifications\s+(?:&|and)\s+Experience\b/i, 'Q&E'],
  [/\bOpen-?Competitive\b/i, 'Open Competitive'],
  [/\bCombined\s+Promotive\s+Entrance\b/i, 'CPE'],
  // Then the abbreviations.
  [/\bCPE\b/, 'CPE'],
  [/\bPCS\b/, 'PCS'],
  [/\bPEX\b/, 'PEX'],
  [/\bTEX\b/, 'TEX'],
  [/\bCBT\b/, 'CBT'],
  [/\bQ\s*(?:&|and)\s*E\b/i, 'Q&E'],
  // Then the broad keywords (only fire if nothing more specific matched).
  [/\bPromotional\b/i, 'Promotional'],
  [/\bPromotive\b/i, 'Promotive'],
  [/\bEntrance\b/i, 'Entrance'],
  [/\bDepartmental\b/i, 'Departmental'],
];

export function matchExamSubType(text: string): string | undefined {
  const labeled = extractLabeledField(text, 'List Type');
  if (labeled) return labeled;
  for (const [regex, label] of EXAM_SUB_TYPE_PATTERNS) {
    if (regex.test(text)) return label;
  }
  return undefined;
}

/**
 * Match the exam TYPE (testing methodology — PBT / CBT / ETP / Q&E).
 *
 * Tier 1: `Exam Type:` label. Tier 2: keyword whitelist.
 *
 * Captured for future UI (tooltip on Sub-type cell or separate column);
 * not surfaced visually in Phase 2.2.o per the scoped column count.
 */
export function matchExamType(text: string): string | undefined {
  const labeled = extractLabeledField(text, 'Exam Type');
  if (labeled) return labeled;
  // Whitelist: PBT (Performance-Based Test), ETP (Education/Training/
  // Promotive), CBT (Computer-Based Test), T&E (Training & Experience).
  const m = text.match(/\b(PBT|ETP|CBT|T\s*&\s*E)\b/i);
  return m ? m[1].toUpperCase().replace(/\s+/g, '') : undefined;
}

/**
 * Match the per-list `Duration:` value (e.g., "12 Months", "6 Months",
 * "2 Years"). Captured here because real DHR data varies from 6mo to
 * 24mo+, contradicting the Phase 2.2.n "constant 2yr per CSC Rule
 * 411A/412" assumption. Surfacing this in the UI (per-row Expires
 * column + recalc) is filed as a Phase 2.2.p follow-up.
 */
export function matchDuration(text: string): string | undefined {
  const labeled = extractLabeledField(text, 'Duration');
  if (labeled) return labeled;
  return undefined;
}

/**
 * Apply all matchers to a single pre-extracted text blob. Pure function
 * — tests cover the matcher chain without needing pdfjs or a real PDF
 * binary.
 */
export function extractPdfFields(text: string): Pick<PdfExtract,
  'certRule' | 'listDepartment' | 'examSubType' | 'examType' | 'duration'
> {
  return {
    certRule: matchCertRule(text),
    listDepartment: matchListDepartment(text),
    examSubType: matchExamSubType(text),
    examType: matchExamType(text),
    duration: matchDuration(text),
  };
}

// ---------------------------------------------------------------------------
// Top-level entry point — fetch the PDF + extract + match, return PdfExtract.
// ---------------------------------------------------------------------------

export interface ExtractPdfFieldsOptions {
  /** Custom fetch impl (defaults to global `fetch`). For tests. */
  fetchImpl?: FetchImpl;
  /** Override the default proxy chain. Tests inject mock proxies. */
  proxies?: readonly CorsProxy[];
  /** Optional Cloudflare-Worker URL (appended to the proxy chain when set
   *  — tried LAST since it's the user's backup, not the default). Same
   *  semantics as `fetchDhrExamResults`'s `workerUrl` option. */
  workerUrl?: string;
  /** How many leading pages to scan for cover-sheet fields. Default 2 —
   *  cover sheets are 1-2 pages on every DHR list we've sampled. */
  maxPages?: number;
  /** Override the text extractor. Tests inject a stub so they don't need
   *  to bundle real PDF fixtures or boot pdfjs. */
  extractTextImpl?: (buf: ArrayBuffer, maxPages: number) => Promise<string>;
}

/** Build the Cloudflare-Worker proxy entry when a URL is configured.
 *  Mirrors `./fetch.ts`'s same-named helper so behavior matches. */
function workerProxy(workerUrl: string): CorsProxy {
  return {
    label: 'cloudflare-worker',
    wrap: (u) => {
      const sep = workerUrl.includes('?') ? '&' : '?';
      return `${workerUrl}${sep}url=${encodeURIComponent(u)}`;
    },
  };
}

/**
 * Fetch one PDF through the CORS-proxy chain + extract the cover-sheet
 * fields. Returns a `PdfExtract` describing the outcome — `success: true`
 * with whichever fields matched, or `success: false` with an `error`
 * message when the fetch/parse couldn't complete.
 *
 * Never throws — the caller (UI) treats failure as a cache entry too so
 * we don't retry on every modal re-open. Use the `error` field for the
 * tooltip text on the failed `—` cells.
 */
export async function fetchAndExtractPdfFields(
  fileUrl: string,
  opts: ExtractPdfFieldsOptions = {},
): Promise<PdfExtract> {
  const fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);
  const baseProxies = opts.proxies ?? DEFAULT_PROXIES;
  const proxies: readonly CorsProxy[] = opts.workerUrl
    ? [...baseProxies, workerProxy(opts.workerUrl)]
    : baseProxies;
  const maxPages = opts.maxPages ?? 2;
  const extractText = opts.extractTextImpl ?? extractFirstPagesText;
  const extractedAt = new Date().toISOString();

  try {
    const buf = await fetchPdfBinary(fileUrl, proxies, fetchImpl);
    const text = await extractText(buf, maxPages);
    const fields = extractPdfFields(text);
    return {
      ...fields,
      extractedAt,
      success: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      extractedAt,
      success: false,
      error: msg,
    };
  }
}
