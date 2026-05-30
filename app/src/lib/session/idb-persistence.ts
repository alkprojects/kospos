/**
 * IndexedDB persistence — Phase 2.2.q PR 1; per-store split Phase 2.2.aa.
 *
 * Persists the full SessionFile envelope (see `snapshot.ts`) to the
 * browser's IndexedDB so that page reloads + browser restarts no longer
 * lose the loaded P&P / BFM / OBI rows + the scraper data + the
 * staffing-plan / probation / separation / position-notes state.
 *
 * ## Why this isn't one record any more (Phase 2.2.aa — scaling Stage 0)
 *
 * The original layout held the whole SessionFile under one key
 * (`'current'`) and re-wrote ALL of it on every change. Since the
 * envelope is almost entirely `loadedRows` (raw OBI payroll — one row
 * per position × earning code × pay period; ~375 MB at DBI+CPC scale),
 * editing a single note structured-cloned all 375 MB to IDB — the ~5 s
 * post-refresh freeze, and an `O(total data)` wall on the road to
 * citywide (see `docs/proposals/s50-citywide-scaling.md`).
 *
 * So the snapshot is now split across **per-store-group records**, each
 * written independently:
 *
 *   - `meta`     → envelope metadata (`kind`, `schemaVersion`, `savedAt`,
 *                  `label`). Tiny; rewritten on every save so `savedAt`
 *                  tracks the latest write.
 *   - `rows`     → the heavy term: `loadedRows` + `lastBfmImportAt`.
 *                  Rewritten only when the import store changes (i.e. on
 *                  import) — NOT when a planning edit happens.
 *   - `scrapers` → `jobPostings` / `eligibilityLists` / `pdfCache` +
 *                  their refreshed-at stamps. Rewritten only on scrape.
 *   - `planning` → the light, frequently-edited term: staffing-plan
 *                  actions, separations, probations, position notes.
 *
 * The caller (`use-auto-persistence.ts`) tracks which store groups went
 * dirty and calls `saveGroupsToIdb(file, dirtyGroups)`, so a planning
 * edit rewrites only the small `planning` + `meta` records and never
 * touches the 375 MB `rows` record. This is the first concrete step of
 * the scaling roadmap's incremental-persistence model (Stage 1 then
 * moves `loadedRows` into its own object store written only on import).
 *
 * ## Migration from the legacy single-record layout
 *
 * Browsers that used a pre-split build have one monolithic `'current'`
 * record and no per-group records. On first load, `loadSnapshotFromIdb`
 * detects this, splits the legacy record into the four per-group records
 * and deletes `'current'` — all in ONE readwrite transaction, so there
 * is never a window where data is half-written or lost. Subsequent
 * loads find the per-group records and skip migration. Split/merge is a
 * lossless round-trip (proven in `idb-split.test.ts`), so the migration
 * preserves every byte of the user's saved state.
 *
 * Single-deployment assumption: KosPos ships from one GitHub Pages URL,
 * so only one app version reads a given IndexedDB at a time. (A stale
 * pre-split tab left open across a deploy is the only way both layouts
 * could briefly coexist; it self-heals on the next refresh to the
 * deployed build.)
 *
 * Scope (single-browser):
 *   - Same-browser-cross-reload only. NOT cross-device — that's the
 *     Cloudflare publish path (`cloudflare-publish.ts`).
 *   - One snapshot per browser; the latest write wins. (Named workspaces
 *     come later — they'd key the records on a workspace id.)
 *
 * Storage layout:
 *   - DB name: `kospos`
 *   - Object store: `snapshots` (string-keyed; unchanged — the split is a
 *     record-key change within the same store, so no DB_VERSION bump).
 *   - Keys: `'meta'` / `'rows'` / `'scrapers'` / `'planning'` (current);
 *     `'current'` (legacy monolithic record, migrated away on load).
 *   - Values: plain objects (NOT JSON-serialized — IDB handles
 *     structured-clone natively).
 *
 * Failure modes (all caller-handled by the React hook):
 *   - `idb` open failure (private browsing, denied permissions): the
 *     `load*` / `save*` helpers reject the promise; the hook logs and
 *     falls back to in-memory-only state.
 *   - Schema mismatch on load: the merged envelope carries
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
import {
  SESSION_SCHEMA_VERSION,
  type SessionFile,
  type SessionPayload,
} from './snapshot';

/** IDB database name. Versioned only via the IDB upgrade callback — bump
 *  `DB_VERSION` when the object-store shape changes. The snapshot
 *  schema-version lives separately on the envelope (see `snapshot.ts`). */
const DB_NAME = 'kospos';
/** Object store name. */
const STORE_NAME = 'snapshots';
/** Bump when the object-store *shape* changes (new store / index). The
 *  per-store split is a record-KEY change within the existing store, so
 *  it does NOT bump this — v1 still describes the store shape. */
const DB_VERSION = 1;

/** Per-store-group record keys (the split layout). */
const KEY_META = 'meta';
const KEY_ROWS = 'rows';
const KEY_SCRAPERS = 'scrapers';
const KEY_PLANNING = 'planning';
/** Legacy monolithic record key (pre-split). Migrated away on first load. */
const LEGACY_KEY = 'current';

/**
 * The mutable store groups a save can target. `meta` is excluded because
 * it is always written alongside whichever group(s) changed (it carries
 * `savedAt`), so callers never request it explicitly.
 */
export const STORE_GROUPS = ['rows', 'scrapers', 'planning'] as const;
export type StoreGroup = (typeof STORE_GROUPS)[number];

/** Envelope-metadata record. */
type MetaRecord = Pick<SessionFile, 'kind' | 'schemaVersion' | 'savedAt' | 'label'>;
/** Heavy record — the import payload. */
type RowsRecord = Pick<SessionPayload, 'loadedRows' | 'lastBfmImportAt'>;
/** Scraper-state record. */
type ScrapersRecord = Pick<
  SessionPayload,
  'jobPostings' | 'jobPostingsRefreshedAt' | 'eligibilityLists' | 'eligibilityListsRefreshedAt' | 'pdfCache'
>;
/** Light, frequently-edited planning record. */
type PlanningRecord = Pick<
  SessionPayload,
  'staffingPlanActions' | 'staffingPlanDerivedRemoved' | 'positionNotes' | 'pendingSeparations' | 'probations'
>;

/** The four records a SessionFile splits into. */
interface SplitRecords {
  meta: MetaRecord;
  rows: RowsRecord;
  scrapers: ScrapersRecord;
  planning: PlanningRecord;
}

/**
 * Split a SessionFile envelope into the four per-group records. Pure —
 * no IDB. Optional payload fields are normalized to their empty defaults
 * so the on-disk records never carry `undefined` (older envelopes that
 * predate the scraper / separations / probations fields split cleanly).
 *
 * `mergeIdbRecords(splitSessionFile(file))` is a lossless round-trip for
 * any envelope `buildSessionFile` produces — that property is what makes
 * the legacy-record migration safe (see `idb-split.test.ts`).
 */
export function splitSessionFile(file: SessionFile): SplitRecords {
  // Defensive: a structurally-broken legacy record (no payload) splits to
  // empty records rather than throwing, so a single corrupt save can't
  // wedge the load path.
  const p: Partial<SessionPayload> = file.payload ?? {};
  return {
    meta: {
      kind: file.kind,
      schemaVersion: file.schemaVersion,
      savedAt: file.savedAt,
      label: file.label,
    },
    rows: {
      loadedRows: p.loadedRows ?? [],
      lastBfmImportAt: p.lastBfmImportAt ?? '',
    },
    scrapers: {
      jobPostings: p.jobPostings ?? [],
      jobPostingsRefreshedAt: p.jobPostingsRefreshedAt ?? '',
      eligibilityLists: p.eligibilityLists ?? [],
      eligibilityListsRefreshedAt: p.eligibilityListsRefreshedAt ?? '',
      pdfCache: p.pdfCache ?? [],
    },
    planning: {
      staffingPlanActions: p.staffingPlanActions ?? [],
      staffingPlanDerivedRemoved: p.staffingPlanDerivedRemoved ?? [],
      positionNotes: p.positionNotes ?? [],
      pendingSeparations: p.pendingSeparations ?? [],
      probations: p.probations ?? [],
    },
  };
}

/**
 * Reassemble per-group records back into a SessionFile envelope. Pure —
 * no IDB. Any absent group defaults to its empty shape (a planning-only
 * save leaves `rows` / `scrapers` records untouched, so a later load may
 * legitimately read only some of them). Returns `null` only when NOTHING
 * is present (a fresh browser with no saved snapshot at all).
 *
 * The reconstructed envelope is the same shape `buildSessionFile`
 * produces, so it passes `parseSessionFileFromValue` unchanged — the
 * hook validates it before restoring exactly as before.
 */
export function mergeIdbRecords(records: {
  meta?: MetaRecord;
  rows?: RowsRecord;
  scrapers?: ScrapersRecord;
  planning?: PlanningRecord;
}): SessionFile | null {
  const { meta, rows, scrapers, planning } = records;
  if (!meta && !rows && !scrapers && !planning) return null;
  return {
    kind: 'kospos-session',
    schemaVersion: meta?.schemaVersion ?? SESSION_SCHEMA_VERSION,
    savedAt: meta?.savedAt ?? '',
    label: meta?.label,
    payload: {
      loadedRows: rows?.loadedRows ?? [],
      lastBfmImportAt: rows?.lastBfmImportAt ?? '',
      staffingPlanActions: planning?.staffingPlanActions ?? [],
      staffingPlanDerivedRemoved: planning?.staffingPlanDerivedRemoved ?? [],
      positionNotes: planning?.positionNotes ?? [],
      pendingSeparations: planning?.pendingSeparations ?? [],
      probations: planning?.probations ?? [],
      jobPostings: scrapers?.jobPostings ?? [],
      jobPostingsRefreshedAt: scrapers?.jobPostingsRefreshedAt ?? '',
      eligibilityLists: scrapers?.eligibilityLists ?? [],
      eligibilityListsRefreshedAt: scrapers?.eligibilityListsRefreshedAt ?? '',
      pdfCache: scrapers?.pdfCache ?? [],
    },
  };
}

/**
 * Lazily-opened DB handle. We memoize across calls so concurrent
 * saveGroupsToIdb + loadSnapshotFromIdb share one connection. The
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
 * Persist the given store groups to IDB. Always rewrites the tiny `meta`
 * record (so `savedAt` tracks the latest write) plus the record for each
 * requested group, in ONE transaction. Groups NOT listed are left as
 * they were — that's the whole point: a planning edit passes
 * `['planning']` and the heavy `rows` record is never touched.
 *
 * Callers should NOT JSON.stringify before calling — IDB uses the
 * structured-clone algorithm so the SessionFile shape (Maps/Sets already
 * pre-serialized to arrays by `snapshot.ts`) round-trips natively.
 *
 * Resolves on commit; rejects on quota / permission failures.
 */
export async function saveGroupsToIdb(
  file: SessionFile,
  groups: readonly StoreGroup[],
): Promise<void> {
  const db = await getDb();
  const split = splitSessionFile(file);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const ops: Promise<unknown>[] = [tx.store.put(split.meta, KEY_META)];
  if (groups.includes('rows')) ops.push(tx.store.put(split.rows, KEY_ROWS));
  if (groups.includes('scrapers')) ops.push(tx.store.put(split.scrapers, KEY_SCRAPERS));
  if (groups.includes('planning')) ops.push(tx.store.put(split.planning, KEY_PLANNING));
  ops.push(tx.done);
  await Promise.all(ops);
}

/**
 * Read the saved snapshot from IDB, reassembled into a SessionFile
 * envelope. Resolves with the envelope or `null` if nothing has been
 * saved yet. Rejects only on IDB open / permission failures.
 *
 * Migration: if no per-group records exist but a legacy monolithic
 * `'current'` record does, split it into per-group records and delete
 * `'current'` atomically, then return it (see the module header).
 */
export async function loadSnapshotFromIdb(): Promise<SessionFile | null> {
  const db = await getDb();
  const [meta, rows, scrapers, planning] = await Promise.all([
    db.get(STORE_NAME, KEY_META) as Promise<MetaRecord | undefined>,
    db.get(STORE_NAME, KEY_ROWS) as Promise<RowsRecord | undefined>,
    db.get(STORE_NAME, KEY_SCRAPERS) as Promise<ScrapersRecord | undefined>,
    db.get(STORE_NAME, KEY_PLANNING) as Promise<PlanningRecord | undefined>,
  ]);
  if (meta || rows || scrapers || planning) {
    return mergeIdbRecords({ meta, rows, scrapers, planning });
  }
  // No per-group records — migrate a legacy monolithic snapshot if present.
  const legacy = (await db.get(STORE_NAME, LEGACY_KEY)) as SessionFile | undefined;
  if (!legacy) return null;
  await migrateLegacyRecord(db, legacy);
  return legacy;
}

/**
 * One-time migration: split a legacy `'current'` envelope into the four
 * per-group records and delete the legacy key, atomically. All-or-nothing
 * — if the transaction fails, `'current'` is left intact and the next
 * load retries.
 */
async function migrateLegacyRecord(db: IDBPDatabase, legacy: SessionFile): Promise<void> {
  const split = splitSessionFile(legacy);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    tx.store.put(split.meta, KEY_META),
    tx.store.put(split.rows, KEY_ROWS),
    tx.store.put(split.scrapers, KEY_SCRAPERS),
    tx.store.put(split.planning, KEY_PLANNING),
    tx.store.delete(LEGACY_KEY),
    tx.done,
  ]);
}

/**
 * Delete the saved snapshot — every per-group record plus any leftover
 * legacy record — in one transaction. Used by the "Clear All" affordance
 * + the "Reset" debug path. No-op for keys that don't exist.
 */
export async function clearSnapshotFromIdb(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    tx.store.delete(KEY_META),
    tx.store.delete(KEY_ROWS),
    tx.store.delete(KEY_SCRAPERS),
    tx.store.delete(KEY_PLANNING),
    tx.store.delete(LEGACY_KEY),
    tx.done,
  ]);
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
