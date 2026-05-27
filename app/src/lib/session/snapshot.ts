/**
 * Session snapshot — pure serializer / deserializer for all in-memory
 * KosPos state.
 *
 * Why this exists: until Phase 2.2.33 ships IndexedDB persistence,
 * every browser reload loses the loaded P&P + BFM + OBI rows + the
 * staffing-plan actions + per-position user notes. Re-importing four
 * .xlsx files for every dev/test session is tedious enough that the
 * user requested a side-channel: download the current state as one
 * JSON file; re-upload it next session.
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
 * PII note: this file contains real personnel data (names, emplIds,
 * salaries). It is intended to live on the user's local machine,
 * never committed to the repo, never uploaded anywhere outside their
 * own session. The download lives in the browser's default
 * downloads folder + the user is responsible for storage hygiene.
 */

import type { ImportedRow } from '../importers/types';
import type { PlannedAction } from '../staffing-plan';

/**
 * Schema version. Increment when the payload shape changes incompatibly.
 *
 * History:
 *   v1 — initial — loadedRows + lastBfmImportAt + staffingPlanActions +
 *                  staffingPlanDerivedRemoved + positionNotes
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
