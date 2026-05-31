/**
 * Session snapshot — pure serializer / deserializer for all in-memory
 * KosPos state.
 *
 * Why this exists: this is the single serialization format for all in-memory
 * KosPos state, used two ways — (1) IndexedDB auto-persistence (Phase 2.2.q:
 * `use-auto-persistence.ts` writes it on change + restores it on app open, so
 * a reload no longer loses the loaded P&P / BFM / OBI rows, staffing-plan
 * actions, separations, probations, or user notes), and (2) a downloadable
 * session JSON file the user can save and re-upload across devices.
 *
 * Pure module — no React, no DOM, no IO. Callers wire it up:
 *   - [SessionExportImport.tsx](../../modules/importer/SessionExportImport.tsx)
 *     handles the file-download/upload UI.
 *   - The Zustand stores (`useAppStore`, `useStaffingPlan`,
 *     `usePositionNotes`) provide the live data + the restore helpers.
 *
 * File-format invariants:
 *   - JSON envelope with `schemaVersion` + `savedAt` ISO timestamp +
 *     `payload`. Bumping `schemaVersion` is how we tell users their
 *     old file is incompatible.
 *   - Map and Set values are serialized as arrays so JSON survives the
 *     round trip cleanly.
 *   - `loadedRows` carries the full discriminated-union row shape from
 *     [importers/types.ts](../importers/types.ts) — no transformation.
 *     The store's `addRows` then re-runs quality rules + recomputes
 *     `issues` from the rebuilt row set.
 *
 * Data-sensitivity note: this file contains SF public-employee data
 * (names, emplIds, classifications, salaries) — all public records
 * under the Sunshine Ordinance + state law. Private fields (SSN,
 * dependents, health info) aren't in these reports. The download
 * lives in the browser's default downloads folder; the user is
 * responsible for storage hygiene. See [[data-sensitivity]] memory.
 *
 * Files aren't committed to the repo because the workbook is the
 * user's active working file (binary-blob churn in git) — NOT
 * because the data is confidential.
 */

import type { ImportedRow } from '../importers/types';
import type { PlannedAction } from '../staffing-plan';
import type { PendingSeparation } from '../separations';
import type { Probation } from '../probation';
import type { EligibilityList, JobPosting, PdfExtract } from '../scrapers/types';
import type { ClearedFinding } from '../quality/cleared';

/**
 * Schema version. Increment when the payload shape changes incompatibly.
 *
 * History:
 *   v1 — initial — loadedRows + lastBfmImportAt + staffingPlanActions +
 *                  staffingPlanDerivedRemoved + positionNotes
 *   v1 — extended (Phase 2.2.i) — added optional `pendingSeparations`
 *        field. Stays on v1 because the new field is backward-compatible:
 *        v1 files saved before Phase 2.2.i don't carry the field, and the
 *        restore defaults to []. New v1 files always include the field.
 *   v1 — extended (Phase 2.2.j) — added optional `probations` field.
 *        Same back-compat rule: pre-Phase-2.2.j files load with the
 *        field undefined; restore defaults to []. New v1 files always
 *        include the field.
 *   v1 — extended (Phase 2.2.q) — added optional scraper-state fields:
 *        `jobPostings`, `jobPostingsRefreshedAt`, `eligibilityLists`,
 *        `eligibilityListsRefreshedAt`, `pdfCache`. Same back-compat
 *        rule: pre-Phase-2.2.q files load with each field undefined;
 *        the restore defaults to [] / '' / {}. This lets the auto-save
 *        path persist the Eligibility scrape + 100+ PDF extracts so a
 *        page reload doesn't force the user to re-paste DHR HTML +
 *        re-fetch every PDF.
 *   v1 — extended (Session 59) — added optional `clearedFindings` field:
 *        the user's "this isn't a real error" dismissals from the Issues
 *        view. Same back-compat rule — pre-S59 files load with the field
 *        undefined; the restore defaults to []. New v1 files always
 *        include it.
 */
export const SESSION_SCHEMA_VERSION = 1;

/**
 * The on-disk file shape. Round-trips through `JSON.stringify` /
 * `JSON.parse` cleanly — no Map / Set values; those convert at the
 * store boundary.
 */
export interface SessionFile {
  /** Identifier so a future tool can tell what kind of file this is. */
  kind: 'kospos-session';
  /** Bump when the payload shape changes incompatibly. */
  schemaVersion: number;
  /** ISO timestamp the file was generated. Informational only. */
  savedAt: string;
  /** Human label included in the download filename. */
  label?: string;
  payload: SessionPayload;
}

export interface SessionPayload {
  loadedRows: ImportedRow[];
  lastBfmImportAt: string;
  /** Tuple-of-entries form of `useStaffingPlan.actions`. */
  staffingPlanActions: Array<[string, PlannedAction]>;
  /** Array form of `useStaffingPlan.derivedRemoved`. */
  staffingPlanDerivedRemoved: string[];
  /** Tuple-of-entries form of `usePositionNotes.notes`. */
  positionNotes: Array<[string, string]>;
  /**
   * Tuple-of-entries form of `useSeparations.separations` (Phase 2.2.i).
   * Optional for backward compatibility: v1 files saved before this field
   * was added load with `pendingSeparations` undefined; the restore code
   * defaults to []. New v1 files always include the field.
   */
  pendingSeparations?: Array<[string, PendingSeparation]>;
  /**
   * Tuple-of-entries form of `useProbations.probations` (Phase 2.2.j).
   * Optional for backward compatibility: v1 files saved before this field
   * was added load with `probations` undefined; the restore code defaults
   * to []. New v1 files always include the field.
   */
  probations?: Array<[string, Probation]>;
  /**
   * Tuple-of-entries form of `useClearedFindings.cleared` (Session 59) — the
   * user's "this isn't a real error" dismissals, keyed by
   * `clearedKey(ruleId, positionNumber, emplId)`. Optional for backward
   * compatibility: v1 files saved before this field was added load with
   * `clearedFindings` undefined; the restore code defaults to [].
   */
  clearedFindings?: Array<[string, ClearedFinding]>;
  /**
   * SmartRecruiters job postings (Phase 2.2.q). Optional for backward
   * compatibility: v1 files saved before this field was added load with
   * `jobPostings` undefined; the restore code defaults to []. Pairs with
   * `jobPostingsRefreshedAt`.
   */
  jobPostings?: JobPosting[];
  /** ISO timestamp of the last SmartRecruiters fetch. Empty string when
   *  no fetch has happened yet. */
  jobPostingsRefreshedAt?: string;
  /**
   * DHR eligibility lists (Phase 2.2.q). Optional for backward
   * compatibility: v1 files saved before this field was added load with
   * `eligibilityLists` undefined; the restore code defaults to []. Pairs
   * with `eligibilityListsRefreshedAt`.
   */
  eligibilityLists?: EligibilityList[];
  /** ISO timestamp of the last DHR scrape / paste. Empty string when no
   *  data has loaded yet. */
  eligibilityListsRefreshedAt?: string;
  /**
   * Tuple-of-entries form of `useScrapers.pdfCache` (Phase 2.2.q).
   * Persisting the PDF extract cache avoids re-fetching 100+ PDFs through
   * the CORS-proxy chain on every reload. Optional for backward
   * compatibility: v1 files saved before this field was added load with
   * `pdfCache` undefined; the restore code defaults to {}.
   */
  pdfCache?: Array<[string, PdfExtract]>;
}

/**
 * Validation outcome from `parseSessionFile`. Distinguishes "wrong
 * file kind" (likely a user error) from "schema mismatch" (older /
 * newer KosPos version) so the UI can surface a useful message.
 */
export type ParseResult =
  | { ok: true; file: SessionFile }
  | { ok: false; reason: 'invalid-json'; detail: string }
  | { ok: false; reason: 'not-a-session-file'; detail: string }
  | { ok: false; reason: 'schema-mismatch'; got: number; expected: number };

/**
 * Parse + validate the JSON text from a user-supplied file. Returns a
 * tagged result so the UI can render the right message for each
 * failure mode.
 *
 * Forward-compatibility: we accept ONLY the exact schema version we
 * understand. Older files (schemaVersion < current) → require a
 * migration. Newer files (saved on a future KosPos build) → reject
 * with a "this file was saved on a newer version" message.
 */
export function parseSessionFile(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false, reason: 'invalid-json',
      detail: err instanceof Error ? err.message : 'JSON parse failed',
    };
  }
  return parseSessionFileFromValue(parsed);
}

/**
 * Same validation as `parseSessionFile` but takes an already-parsed
 * value (skipping the JSON.parse step). Exists so the auto-load path
 * can validate the SessionFile it just received from fetch/IDB
 * without burning seconds on a wasteful JSON.stringify + JSON.parse
 * round-trip — on a 375 MB envelope (S41 real data) that round-trip
 * alone was the difference between a snappy load and Chrome's
 * "page unresponsive" dialog firing.
 *
 * Kept in this file (rather than use-auto-persistence) so the
 * validation rules stay co-located with the snapshot type
 * definitions. Any new payload field added to SessionFile gets
 * validated here once and benefits both paths.
 */
export function parseSessionFileFromValue(parsed: unknown): ParseResult {
  if (!isObject(parsed)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'Top-level value is not an object.' };
  }
  if (parsed.kind !== 'kospos-session') {
    return {
      ok: false, reason: 'not-a-session-file',
      detail: `Expected kind "kospos-session", got ${JSON.stringify(parsed.kind)}.`,
    };
  }
  if (typeof parsed.schemaVersion !== 'number') {
    return {
      ok: false, reason: 'not-a-session-file',
      detail: 'schemaVersion missing or not a number.',
    };
  }
  if (parsed.schemaVersion !== SESSION_SCHEMA_VERSION) {
    return {
      ok: false, reason: 'schema-mismatch',
      got: parsed.schemaVersion, expected: SESSION_SCHEMA_VERSION,
    };
  }
  // Light payload sanity (shape, not content — content gets re-validated
  // when the stores rebuild from it).
  if (!isObject(parsed.payload)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload missing.' };
  }
  const p = parsed.payload;
  if (!Array.isArray(p.loadedRows)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.loadedRows missing or not an array.' };
  }
  if (!Array.isArray(p.staffingPlanActions)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.staffingPlanActions missing or not an array.' };
  }
  if (!Array.isArray(p.staffingPlanDerivedRemoved)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.staffingPlanDerivedRemoved missing or not an array.' };
  }
  if (!Array.isArray(p.positionNotes)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.positionNotes missing or not an array.' };
  }
  if (typeof p.lastBfmImportAt !== 'string') {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.lastBfmImportAt missing.' };
  }
  // `pendingSeparations` is optional for backward compatibility with v1
  // files saved before Phase 2.2.i. If present, it must be an array; if
  // absent, the restore path defaults to []. Reject only on a wrong-type
  // (e.g. someone hand-edited the JSON and inserted a string).
  if (p.pendingSeparations !== undefined && !Array.isArray(p.pendingSeparations)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.pendingSeparations must be an array if present.' };
  }
  // `probations` is optional for backward compatibility with v1 files
  // saved before Phase 2.2.j. Same rule as pendingSeparations.
  if (p.probations !== undefined && !Array.isArray(p.probations)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.probations must be an array if present.' };
  }
  // `clearedFindings` is optional for backward compatibility with v1 files
  // saved before Session 59. Same rule as pendingSeparations.
  if (p.clearedFindings !== undefined && !Array.isArray(p.clearedFindings)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.clearedFindings must be an array if present.' };
  }
  // Phase 2.2.q scraper-state fields — same back-compat rule. Each is
  // optional; if present it must be the correct shape (arrays for
  // jobPostings / eligibilityLists / pdfCache, string for the *RefreshedAt
  // timestamps).
  if (p.jobPostings !== undefined && !Array.isArray(p.jobPostings)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.jobPostings must be an array if present.' };
  }
  if (p.jobPostingsRefreshedAt !== undefined && typeof p.jobPostingsRefreshedAt !== 'string') {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.jobPostingsRefreshedAt must be a string if present.' };
  }
  if (p.eligibilityLists !== undefined && !Array.isArray(p.eligibilityLists)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.eligibilityLists must be an array if present.' };
  }
  if (p.eligibilityListsRefreshedAt !== undefined && typeof p.eligibilityListsRefreshedAt !== 'string') {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.eligibilityListsRefreshedAt must be a string if present.' };
  }
  if (p.pdfCache !== undefined && !Array.isArray(p.pdfCache)) {
    return { ok: false, reason: 'not-a-session-file', detail: 'payload.pdfCache must be an array if present.' };
  }
  return { ok: true, file: parsed as unknown as SessionFile };
}

/**
 * Serialize an in-memory session into the SessionFile envelope. Caller
 * passes raw store state; this function converts Maps/Sets to arrays.
 */
export function buildSessionFile(input: {
  loadedRows: ImportedRow[];
  lastBfmImportAt: string;
  staffingPlanActions: Map<string, PlannedAction>;
  staffingPlanDerivedRemoved: Set<string>;
  positionNotes: Map<string, string>;
  /** Optional — backward compatible with pre-Phase 2.2.i callers. */
  pendingSeparations?: Map<string, PendingSeparation>;
  /** Optional — backward compatible with pre-Phase 2.2.j callers. */
  probations?: Map<string, Probation>;
  /** Optional — backward compatible with pre-Session-59 callers. */
  clearedFindings?: Map<string, ClearedFinding>;
  /** Optional — backward compatible with pre-Phase 2.2.q callers. */
  jobPostings?: JobPosting[];
  jobPostingsRefreshedAt?: string;
  eligibilityLists?: EligibilityList[];
  eligibilityListsRefreshedAt?: string;
  pdfCache?: Record<string, PdfExtract>;
  label?: string;
}): SessionFile {
  return {
    kind: 'kospos-session',
    schemaVersion: SESSION_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    label: input.label,
    payload: {
      loadedRows: input.loadedRows,
      lastBfmImportAt: input.lastBfmImportAt,
      staffingPlanActions: [...input.staffingPlanActions.entries()],
      staffingPlanDerivedRemoved: [...input.staffingPlanDerivedRemoved],
      positionNotes: [...input.positionNotes.entries()],
      pendingSeparations: input.pendingSeparations
        ? [...input.pendingSeparations.entries()]
        : [],
      probations: input.probations
        ? [...input.probations.entries()]
        : [],
      clearedFindings: input.clearedFindings
        ? [...input.clearedFindings.entries()]
        : [],
      jobPostings: input.jobPostings ?? [],
      jobPostingsRefreshedAt: input.jobPostingsRefreshedAt ?? '',
      eligibilityLists: input.eligibilityLists ?? [],
      eligibilityListsRefreshedAt: input.eligibilityListsRefreshedAt ?? '',
      pdfCache: input.pdfCache
        ? Object.entries(input.pdfCache)
        : [],
    },
  };
}

/**
 * Build the default download filename: `kospos-session-YYYY-MM-DDTHHMM.json`.
 * Compact local-time-shaped so multiple saves in a day don't collide.
 *
 * Caller passes `now` (Date) explicitly so tests can pin the filename.
 */
export function defaultSessionFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `kospos-session-${y}-${m}-${d}T${hh}${mm}.json`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
