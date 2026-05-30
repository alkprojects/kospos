/**
 * IndexedDB persistence — Phase 2.2.q PR 1; per-store split Phase 2.2.aa.
 *
 * Persists the full SessionFile envelope (see `snapshot.ts`) to the
 * browser's IndexedDB so that page reloads + browser restarts no longer
 * lose the loaded P&P / BFM / OBI rows + the scraper data + the
 * staffing-plan / probation / separation / position-notes state.
 *
 * ## Why this isn't one record any more (scaling Stages 0 + 1)
 *
 * The original layout held the whole SessionFile under one key
 * (`'current'`) and re-wrote ALL of it on every change. Since the
 * envelope is almost entirely `loadedRows` (raw OBI payroll — one row
 * per position × earning code × pay period; ~375 MB at DBI+CPC scale),
 * editing a single note structured-cloned all 375 MB to IDB — the ~5 s
 * post-refresh freeze, and an `O(total data)` wall on the road to
 * citywide (see `docs/proposals/s50-citywide-scaling.md`).
 *
 * So the snapshot is split into independently-written pieces:
 *
 *   - `meta`     → envelope metadata (`kind`, `schemaVersion`, `savedAt`,
 *                  `label`). Tiny; rewritten on every save so `savedAt`
 *                  tracks the latest write. In the `snapshots` store.
 *   - `rows`     → the heavy term: `loadedRows` + `lastBfmImportAt`. Lives
 *                  in its OWN `imported-rows` object store (scaling Stage 1)
 *                  and is rewritten only when the import store changes (i.e.
 *                  on import) — NOT when a planning edit happens.
 *   - `scrapers` → `jobPostings` / `eligibilityLists` / `pdfCache` + their
 *                  refreshed-at stamps; in the `snapshots` store. Rewritten
 *                  only on scrape.
 *   - `planning` → the light, frequently-edited term (staffing-plan actions,
 *                  separations, probations, position notes); in the
 *                  `snapshots` store.
 *
 * The caller (`use-auto-persistence.ts`) tracks which store groups went
 * dirty and calls `saveGroupsToIdb(file, dirtyGroups)`. A planning edit
 * passes `['planning']`, so its transaction spans the `snapshots` store
 * alone — the ~375 MB `rows` payload in `imported-rows` is never even
 * opened, let alone rewritten. Stage 0 (Phase 2.2.aa) split the monolith
 * into these four pieces; Stage 1 promoted the heavy `rows` piece from a
 * record in `snapshots` to its own object store — the next concrete step
 * of the scaling roadmap's incremental-persistence model
 * (`docs/proposals/s50-citywide-scaling.md`).
 *
 * ## Migration to the Stage-1 layout
 *
 * `loadSnapshotFromIdb` lazily converges any prior layout to the current
 * one, the first time it runs against a v2 DB:
 *   - A browser left on the Stage-0 layout has a `rows` record in the
 *     `snapshots` store. The load moves it into the `imported-rows` store
 *     and deletes the old record.
 *   - A browser left on the pre-Stage-0 monolith has one `'current'`
 *     record. The load splits it, writes the light records to `snapshots`
 *     + the rows record to `imported-rows`, and deletes `'current'`.
 * Each conversion runs in ONE readwrite transaction spanning both stores,
 * so there is never a window where data is half-written or lost; a failed
 * transaction leaves the old layout intact for the next load to retry.
 * Subsequent loads find the rows store populated and skip migration.
 * Split/merge is a lossless round-trip (`idb-split.test.ts`) and the
 * cross-store orchestration is exercised against a real IDB
 * (`idb-rows-store.test.ts` via fake-indexeddb), so the migration
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
 * Storage layout (DB_VERSION 2):
 *   - DB name: `kospos`
 *   - Object store `snapshots` (string-keyed) — keys `'meta'` / `'scrapers'`
 *     / `'planning'`. Also the home of the now-legacy `'rows'` record
 *     (Stage-0) + `'current'` monolith (pre-Stage-0), both migrated away on
 *     first load.
 *   - Object store `imported-rows` (string-keyed; added in v2) — the single
 *     key `'current'` holds the heavy `{ loadedRows, lastBfmImportAt }` payload
 *     as a gzipped envelope (S57; see "Rows-record compression" below),
 *     written only on import.
 *   - Values: `snapshots` records are plain objects (IDB structured-clones them
 *     natively); the `imported-rows` record is a gzipped `{ gz, data }` envelope
 *     (the rows are highly repetitive JSON — they compress ~8-15× — and are read
 *     into memory on every reload, so compressing them cuts both disk and the
 *     reload-read by the same factor).
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
/** Bump when the object-store *shape* changes (new store / index).
 *  v1 — the single `snapshots` store (Phase 2.2.q + the Stage-0 record
 *       split, which was a record-KEY change within that store, so it did
 *       NOT bump this).
 *  v2 — scaling Stage 1: adds the dedicated `imported-rows` object store for
 *       the heavy import payload (see the module header). */
const DB_VERSION = 2;

/** Record keys inside the `snapshots` store. */
const KEY_META = 'meta';
const KEY_SCRAPERS = 'scrapers';
const KEY_PLANNING = 'planning';
/** Legacy Stage-0 `rows` record key inside the `snapshots` store. Stage 1
 *  moves the import payload into its own object store, so this key is only
 *  ever READ + DELETED by the one-time migration now — never written. */
const KEY_ROWS = 'rows';
/** Legacy monolithic record key (pre-Stage-0). Migrated away on first load. */
const LEGACY_KEY = 'current';

/** Stage-1 dedicated object store for the heavy import payload, plus its
 *  single record key. Written only when the `rows` group is dirty (i.e. on
 *  import), so a planning / scrapers save never even opens this store —
 *  removing the `O(total data)` re-serialization wall for the biggest term. */
const ROWS_STORE = 'imported-rows';
const ROWS_KEY = 'current';

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
        // v1 — the shared snapshots store (meta / scrapers / planning
        // records; pre-Stage-1 it also held the rows record + the legacy
        // monolith).
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        // v2 (scaling Stage 1) — the heavy import payload gets its OWN
        // object store. Created for both fresh installs (oldVersion 0) and
        // the v1->v2 upgrade (oldVersion 1). Existing rows data is migrated
        // lazily on the next load (see loadSnapshotFromIdb), NOT in this
        // versionchange transaction — keeping the upgrade trivial and the
        // (test-covered) migration logic in one place.
        if (!db.objectStoreNames.contains(ROWS_STORE)) {
          db.createObjectStore(ROWS_STORE);
        }
      },
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Rows-record compression (S57)
//
// `loadedRows` dominates the snapshot — one OBI row per position × earning code
// × pay period, ~110K-330K rows at DBI+CPC scale — and it is highly repetitive
// JSON (the same fund / dept / account / person / description strings recur on
// every row). IDB stores values via structured-clone, which does NOT compress,
// so the rows record sat on disk (and was read into memory on every reload) at
// its full ~350 MB. Gzipping the record before `put` shrinks the on-disk + the
// reload-read size ~8-15× (the ratio the Cloudflare publish path already gets
// on this data). We store a small `{ gz, data }` envelope instead of the raw
// object.
//
// Round-trip safety: the importers coerce every numeric cell to a finite number
// (`num` → 0, never NaN) and every text cell to a string (`str`), so the rows
// payload is pure JSON — JSON.stringify/parse is lossless here (the publish path
// already relies on this on real 331K-row data). The gzip MUST complete before
// the IDB transaction opens: an IDB tx auto-commits the moment control yields to
// a non-IDB promise, so awaiting CompressionStream mid-transaction would drop
// the write.
// ---------------------------------------------------------------------------

/** Gzipped rows record as stored in the `imported-rows` object store. The `gz`
 *  marker (a format version) distinguishes it from a legacy plain `RowsRecord`
 *  written before compression — those are still read (decoded as a pass-through)
 *  and rewritten gzipped on the next import. */
interface GzRowsRecord {
  gz: 1;
  data: Uint8Array;
}

/** What the rows store may hold: the gzipped envelope (S57+), or a legacy plain
 *  record (pre-S57, or freshly written by the one-time layout migration). */
type StoredRowsRecord = GzRowsRecord | RowsRecord;

function isGzRowsRecord(v: StoredRowsRecord): v is GzRowsRecord {
  // Detect by the `gz` marker key, NOT `data instanceof Uint8Array`: a value
  // round-tripped through IDB structured-clone can come back as a typed array
  // from a different JS realm, so `instanceof` is unreliable. A legacy plain
  // RowsRecord has no `gz` key, so the key test cleanly distinguishes the two.
  return typeof v === 'object' && v !== null && 'gz' in v;
}

/** gzip a UTF-8 string via the Web Streams API (Node 18+ / modern browsers /
 *  Workers support it natively). Mirrors `cloudflare-publish.ts:gzipString`. */
async function gzip(s: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const stream = new Response(new TextEncoder().encode(s)).body!.pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Inverse of `gzip` — gunzip bytes back to the original UTF-8 string. */
async function gunzip(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const stream = new Response(bytes as BodyInit).body!.pipeThrough(ds);
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

/** Compress a rows record for storage. */
async function encodeRowsRecord(rows: RowsRecord): Promise<GzRowsRecord> {
  return { gz: 1, data: await gzip(JSON.stringify(rows)) };
}

/** Decompress a stored rows record. A legacy plain record (pre-S57 or freshly
 *  migrated) is passed through unchanged. */
async function decodeRowsRecord(stored: StoredRowsRecord): Promise<RowsRecord> {
  if (isGzRowsRecord(stored)) {
    return JSON.parse(await gunzip(stored.data)) as RowsRecord;
  }
  return stored;
}

/**
 * Persist the given store groups to IDB. Always rewrites the tiny `meta`
 * record (so `savedAt` tracks the latest write) plus the record for each
 * requested group, in ONE transaction. Groups NOT listed are left as they
 * were — that's the whole point: a planning edit passes `['planning']` and
 * the heavy `rows` payload (now its own `imported-rows` object store) is
 * never even opened, so the save cost is O(that edit), not O(all rows).
 *
 * The transaction spans the `imported-rows` store ONLY when the `rows`
 * group is dirty (an import); otherwise it is a single-store `snapshots`
 * transaction that can't contend with — or block on — the rows store.
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
  const writeRows = groups.includes('rows');
  // Gzip the heavy rows record BEFORE opening the tx — an IDB transaction
  // auto-commits the moment control yields to a non-IDB promise, so the async
  // CompressionStream must finish first (see the compression note above).
  const rowsValue = writeRows ? await encodeRowsRecord(split.rows) : null;
  const tx = db.transaction(
    writeRows ? [STORE_NAME, ROWS_STORE] : STORE_NAME,
    'readwrite',
  );
  const snap = tx.objectStore(STORE_NAME);
  const ops: Promise<unknown>[] = [snap.put(split.meta, KEY_META)];
  if (groups.includes('scrapers')) ops.push(snap.put(split.scrapers, KEY_SCRAPERS));
  if (groups.includes('planning')) ops.push(snap.put(split.planning, KEY_PLANNING));
  if (rowsValue) ops.push(tx.objectStore(ROWS_STORE).put(rowsValue, ROWS_KEY));
  ops.push(tx.done);
  await Promise.all(ops);
}

/**
 * Read the saved snapshot from IDB, reassembled into a SessionFile
 * envelope. Resolves with the envelope or `null` if nothing has been
 * saved yet. Rejects only on IDB open / permission failures.
 *
 * Reads the light records (meta / scrapers / planning) from the
 * `snapshots` store and the heavy rows payload from the dedicated
 * `imported-rows` store. When the rows store is empty, lazily migrates
 * from whichever prior layout exists — each migration is atomic and
 * one-time (see the module header):
 *   - Stage-0: a `rows` record still in the `snapshots` store → move it
 *     into `imported-rows` and delete the old record.
 *   - Pre-Stage-0: the monolithic `'current'` record → split it, write the
 *     light records + the rows record to their new homes, delete `'current'`.
 */
export async function loadSnapshotFromIdb(): Promise<SessionFile | null> {
  const db = await getDb();
  const [meta, scrapers, planning, rowsStored] = await Promise.all([
    db.get(STORE_NAME, KEY_META) as Promise<MetaRecord | undefined>,
    db.get(STORE_NAME, KEY_SCRAPERS) as Promise<ScrapersRecord | undefined>,
    db.get(STORE_NAME, KEY_PLANNING) as Promise<PlanningRecord | undefined>,
    db.get(ROWS_STORE, ROWS_KEY) as Promise<StoredRowsRecord | undefined>,
  ]);

  // Fast path: rows already live in the Stage-1 `imported-rows` store. Decode
  // handles both the gzipped envelope (S57+) and a legacy plain record.
  if (rowsStored !== undefined) {
    const rows = await decodeRowsRecord(rowsStored);
    return mergeIdbRecords({ meta, rows, scrapers, planning });
  }

  // Rows not in the Stage-1 store — migrate from a prior layout if present.
  // (a) Stage-0: a `rows` record still in the `snapshots` store.
  const stage0Rows = (await db.get(STORE_NAME, KEY_ROWS)) as RowsRecord | undefined;
  if (stage0Rows !== undefined) {
    await migrateStage0RowsRecord(db, stage0Rows);
    return mergeIdbRecords({ meta, rows: stage0Rows, scrapers, planning });
  }
  // (b) Pre-Stage-0: the monolithic `'current'` record.
  const legacy = (await db.get(STORE_NAME, LEGACY_KEY)) as SessionFile | undefined;
  if (legacy !== undefined) {
    const split = splitSessionFile(legacy);
    await migrateLegacyRecord(db, split);
    return mergeIdbRecords(split);
  }
  // (c) No rows in any layout. The light records may still exist from a
  // planning-only save before any import — return them (rows default to []).
  if (meta || scrapers || planning) {
    return mergeIdbRecords({ meta, scrapers, planning });
  }
  return null;
}

/**
 * One-time Stage-0 → Stage-1 migration: move a `rows` record out of the
 * `snapshots` store into the dedicated `imported-rows` store and delete the
 * old record, atomically across both stores. All-or-nothing — if the
 * transaction fails, the old record is left intact and the next load retries.
 */
async function migrateStage0RowsRecord(db: IDBPDatabase, rows: RowsRecord): Promise<void> {
  const tx = db.transaction([STORE_NAME, ROWS_STORE], 'readwrite');
  await Promise.all([
    tx.objectStore(ROWS_STORE).put(rows, ROWS_KEY),
    tx.objectStore(STORE_NAME).delete(KEY_ROWS),
    tx.done,
  ]);
}

/**
 * One-time pre-Stage-0 → Stage-1 migration: write a split legacy `'current'`
 * envelope to its new homes — the light records into `snapshots`, the rows
 * record into `imported-rows` — and delete `'current'`, atomically across
 * both stores. All-or-nothing — a failure leaves `'current'` intact for the
 * next load to retry.
 */
async function migrateLegacyRecord(db: IDBPDatabase, split: SplitRecords): Promise<void> {
  const tx = db.transaction([STORE_NAME, ROWS_STORE], 'readwrite');
  const snap = tx.objectStore(STORE_NAME);
  await Promise.all([
    snap.put(split.meta, KEY_META),
    snap.put(split.scrapers, KEY_SCRAPERS),
    snap.put(split.planning, KEY_PLANNING),
    tx.objectStore(ROWS_STORE).put(split.rows, ROWS_KEY),
    snap.delete(LEGACY_KEY),
    tx.done,
  ]);
}

/**
 * Delete the saved snapshot — every `snapshots` record (incl. any leftover
 * Stage-0 `rows` record + legacy monolith) and the `imported-rows` store's
 * record — in one transaction across both stores. Used by the "Clear All"
 * affordance + the "Reset" debug path. No-op for keys that don't exist.
 */
export async function clearSnapshotFromIdb(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORE_NAME, ROWS_STORE], 'readwrite');
  const snap = tx.objectStore(STORE_NAME);
  await Promise.all([
    snap.delete(KEY_META),
    snap.delete(KEY_ROWS),
    snap.delete(KEY_SCRAPERS),
    snap.delete(KEY_PLANNING),
    snap.delete(LEGACY_KEY),
    tx.objectStore(ROWS_STORE).delete(ROWS_KEY),
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
