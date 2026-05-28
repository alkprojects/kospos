/**
 * IndexedDB persistence — Phase 2.2.q PR 1.
 *
 * Persists the full SessionFile envelope (see `snapshot.ts`) to the
 * browser's IndexedDB so that page reloads + browser restarts no longer
 * lose the loaded P&P / BFM / OBI rows + the scraper data + the
 * staffing-plan / probation / separation / position-notes state.
 *
 * Scope (single-browser):
 *   - Same-browser-cross-reload only. NOT cross-device — that's Phase
 *     2.2.q PR 2 (Cloudflare Pages + Workers KV).
 *   - One snapshot per browser; the latest write wins. (Named workspaces
 *     come later.)
 *
 * Storage layout:
 *   - DB name: `kospos`
 *   - Object store: `snapshots`
 *   - Key: the literal string `'current'` — we hold one snapshot. Future
 *     versions may key on `(workspace-id)` once Phase 2.2.r+ ships named
 *     workspaces.
 *   - Value: the full SessionFile object (NOT JSON-serialized — IDB
 *     handles structured-clone natively).
 *
 * Failure modes (all caller-handled by the React hook):
 *   - `idb` open failure (private browsing, denied permissions): the
 *     `load*` / `save*` helpers reject the promise; the hook logs and
 *     falls back to in-memory-only state.
 *   - Schema mismatch on load: the snapshot envelope carries
 *     `schemaVersion`; the hook re-validates via `parseSessionFile`
 *     before restoring.
 *   - Quota exceeded on save: the underlying `put` rejects; the hook
 *     logs but does NOT clear other state (the in-memory copy is still
 *     valid; user can manually clear via the Load Reports tab).
 *
 * Why a thin wrapper around `idb` rather than direct IDBObjectStore
 * calls: the `idb` package gives us a Promise interface + automatic
 * schema-versioning callbacks. Adds ~3 KB gzip but saves us writing the
 * boilerplate twice (open + transaction + onsuccess/onerror per call).
 *
 * Data-sensitivity note: the snapshot contains SF public-employee data
 * (names, emplIds, salaries) — all public records under the Sunshine
 * Ordinance + state law. Private fields (SSN, dependents, health info)
 * aren't in the source reports, so they can't end up here. See
 * [memory `data_sensitivity.md`].
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { SessionFile } from './snapshot';

/** IDB database name. Versioned only via the IDB upgrade callback — bump
 *  `DB_VERSION` when the object-store shape changes. The snapshot
 *  schema-version lives separately on the envelope (see `snapshot.ts`). */
const DB_NAME = 'kospos';
/** Object store name. */
const STORE_NAME = 'snapshots';
/** Singleton snapshot key — one snapshot per browser, latest write wins. */
const SNAPSHOT_KEY = 'current';
/** Bump when the object-store shape changes. v1: single `snapshots`
 *  store keyed by string. */
const DB_VERSION = 1;

/**
 * Lazily-opened DB handle. We memoize across calls so concurrent
 * saveSnapshotToIdb + loadSnapshotFromIdb share one connection. The
 * Promise is reused (not the resolved DB) so concurrent first calls
 * don't race to open twice.
 */
let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Persist the snapshot envelope to IDB. Overwrites any existing snapshot.
 * Resolves on commit; rejects on quota / permission failures.
 *
 * Callers should NOT JSON.stringify before calling — IDB uses the
 * structured-clone algorithm so Maps, Sets, Dates, ArrayBuffers, etc.
 * round-trip natively. We accept the SessionFile shape (which already
 * pre-serializes Maps/Sets to arrays for cross-device JSON compatibility
 * via `snapshot.ts:buildSessionFile`) so the on-disk shape is identical
 * to the JSON-file format — easier to reason about + future cross-device
 * publish reuses the same envelope.
 */
export async function saveSnapshotToIdb(file: SessionFile): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, file, SNAPSHOT_KEY);
}

/**
 * Read the snapshot envelope from IDB. Resolves with the envelope or
 * `null` if no snapshot has been saved yet. Rejects only on IDB open /
 * permission failures.
 */
export async function loadSnapshotFromIdb(): Promise<SessionFile | null> {
  const db = await getDb();
  const value = await db.get(STORE_NAME, SNAPSHOT_KEY);
  return (value as SessionFile | undefined) ?? null;
}

/**
 * Delete the snapshot. Used by the "Clear All" affordance + by the
 * "Reset" debug path. No-op if no snapshot exists.
 */
export async function clearSnapshotFromIdb(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, SNAPSHOT_KEY);
}

/**
 * TEST HOOK — reset the memoized DB connection so a fresh-DB test
 * isn't tangled with state from the previous test. Not for production
 * use; the production lifecycle keeps the connection open for the page
 * lifetime.
 */
export function _resetDbForTests(): void {
  dbPromise = null;
}
