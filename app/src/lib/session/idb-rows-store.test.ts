/**
 * idb-persistence real-IDB tests — scaling Stage 1.
 *
 * Where `idb-split.test.ts` tests the PURE split/merge functions (no IDB),
 * this file drives the actual IndexedDB orchestration — the `DB_VERSION`
 * 1→2 upgrade, the dedicated `imported-rows` object store, selective
 * per-group writes, and the one-time migration from both prior layouts —
 * against a REAL IndexedDB implementation (`fake-indexeddb`). That's the
 * "real-IDB migration check via tests" this sub-phase calls for, rather
 * than a manual browser/preview pass.
 *
 * Each test gets a pristine in-memory IDB (a fresh `IDBFactory`) plus a
 * reset of the module's memoized connection, so nothing leaks between tests.
 */

// `fake-indexeddb/auto` polyfills the FULL IDB global surface (indexedDB +
// IDBRequest / IDBTransaction / IDBKeyRange / …) that the `idb` wrapper
// reaches for. beforeEach then swaps in a fresh IDBFactory for per-test
// isolation while leaving those stateless constructors in place.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory as FakeIDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import {
  saveGroupsToIdb,
  loadSnapshotFromIdb,
  clearSnapshotFromIdb,
  splitSessionFile,
  _resetDbForTests,
} from './idb-persistence';
import { buildSessionFile, type SessionFile } from './snapshot';
import type { ImportedRow } from '../importers/types';
import type { PlannedAction } from '../staffing-plan';

// Opaque sentinels typed to the right shape — the persistence layer never
// reads row internals, it carries them by reference (mirrors idb-split.test).
const row = (n: string) => ({ positionNumber: n } as unknown as ImportedRow);
const action = (id: string) => ({ id } as unknown as PlannedAction);

/** A SessionFile with every group populated — what a real auto-save produces. */
function fullFile(rows: ImportedRow[] = [row('10001'), row('10002')]): SessionFile {
  return buildSessionFile({
    loadedRows: rows,
    lastBfmImportAt: '2026-05-20',
    staffingPlanActions: new Map([['a1', action('a1')]]),
    staffingPlanDerivedRemoved: new Set(['10009']),
    positionNotes: new Map([['10001', 'note one']]),
  });
}

const DB_NAME = 'kospos';
const ROWS_STORE = 'imported-rows';
const SNAPSHOTS_STORE = 'snapshots';
const ROWS_KEY = 'current';

/** Open the existing DB (whatever version exists) for raw store inspection. */
function rawDb() {
  return openDB(DB_NAME);
}

beforeEach(() => {
  // Fresh, empty IDB per test; clear the module's memoized connection so the
  // next getDb() opens against this new factory.
  globalThis.indexedDB = new FakeIDBFactory() as unknown as IDBFactory;
  _resetDbForTests();
});

describe('Stage-1 layout: round-trip + store placement', () => {
  it('round-trips a full snapshot through save → reopen → load', async () => {
    const file = fullFile();
    await saveGroupsToIdb(file, ['rows', 'scrapers', 'planning']);
    _resetDbForTests(); // simulate a page reload (new connection)
    const loaded = await loadSnapshotFromIdb();
    expect(loaded).toEqual(file);
  });

  it('stores the rows record gzipped in imported-rows (not a raw object), never in snapshots', async () => {
    await saveGroupsToIdb(fullFile(), ['rows', 'scrapers', 'planning']);
    const raw = await rawDb();
    const stored = (await raw.get(ROWS_STORE, ROWS_KEY)) as
      | { gz?: number; data?: Uint8Array; loadedRows?: unknown }
      | undefined;
    const inSnapshots = await raw.get(SNAPSHOTS_STORE, 'rows');
    raw.close();
    // A gzipped { gz, data } envelope — NOT a structured-clone object with a
    // raw loadedRows array (the pre-S57 layout the ~350 MB came from). Assert
    // the gzip magic bytes (1f 8b) rather than `instanceof Uint8Array`, which
    // is unreliable across the IDB structured-clone realm boundary.
    expect(stored?.gz).toBeGreaterThan(0);
    expect(stored?.data?.[0]).toBe(0x1f);
    expect(stored?.data?.[1]).toBe(0x8b);
    expect(stored?.loadedRows).toBeUndefined();
    expect(inSnapshots).toBeUndefined();
  });

  it('returns null for a fresh, empty browser', async () => {
    expect(await loadSnapshotFromIdb()).toBeNull();
  });
});

describe('Stage-1 incrementality: rows are written ONLY on import', () => {
  it('a planning-only save does not touch the rows store', async () => {
    // First import writes the rows.
    await saveGroupsToIdb(fullFile([row('A'), row('B')]), ['rows']);
    // A later planning edit captures a snapshot whose loadedRows happen to
    // differ (3 rows) — but it only requests the 'planning' group, so the
    // rows store must NOT be rewritten.
    await saveGroupsToIdb(fullFile([row('A'), row('B'), row('C')]), ['planning']);
    _resetDbForTests();
    const loaded = await loadSnapshotFromIdb();
    // Rows still reflect the import (2), not the planning save's payload (3).
    expect(loaded?.payload.loadedRows).toHaveLength(2);
    // The planning record DID persist.
    expect(loaded?.payload.positionNotes).toEqual([['10001', 'note one']]);
  });

  it('a planning-only save leaves the rows-store record byte-identical', async () => {
    await saveGroupsToIdb(fullFile([row('A'), row('B')]), ['rows']);
    const before = await (await rawDb()).get(ROWS_STORE, ROWS_KEY);
    await saveGroupsToIdb(fullFile([row('A'), row('B'), row('C')]), ['planning']);
    const after = await (await rawDb()).get(ROWS_STORE, ROWS_KEY);
    expect(after).toEqual(before);
  });
});

describe('migration: Stage-0 (rows record in snapshots) → Stage-1', () => {
  it('moves the legacy rows record into the imported-rows store and deletes it', async () => {
    const file = fullFile();
    const split = splitSessionFile(file);
    // Seed a Stage-0 DB: v1, single snapshots store with the four records.
    const seed = await openDB(DB_NAME, 1, {
      upgrade(db) { db.createObjectStore(SNAPSHOTS_STORE); },
    });
    await seed.put(SNAPSHOTS_STORE, split.meta, 'meta');
    await seed.put(SNAPSHOTS_STORE, split.rows, 'rows');
    await seed.put(SNAPSHOTS_STORE, split.scrapers, 'scrapers');
    await seed.put(SNAPSHOTS_STORE, split.planning, 'planning');
    seed.close();
    _resetDbForTests();

    // Load triggers the v1→v2 upgrade + the rows-record migration.
    const loaded = await loadSnapshotFromIdb();
    expect(loaded).toEqual(file);

    // Physical migration: rows now in imported-rows; old record gone.
    const raw = await rawDb();
    expect(await raw.get(ROWS_STORE, ROWS_KEY)).toBeDefined();
    expect(await raw.get(SNAPSHOTS_STORE, 'rows')).toBeUndefined();
    // Light records untouched in snapshots.
    expect(await raw.get(SNAPSHOTS_STORE, 'meta')).toBeDefined();
    raw.close();
  });

  it('is idempotent — a second load reads straight from the new store', async () => {
    const file = fullFile();
    const split = splitSessionFile(file);
    const seed = await openDB(DB_NAME, 1, {
      upgrade(db) { db.createObjectStore(SNAPSHOTS_STORE); },
    });
    await seed.put(SNAPSHOTS_STORE, split.meta, 'meta');
    await seed.put(SNAPSHOTS_STORE, split.rows, 'rows');
    seed.close();
    _resetDbForTests();

    expect((await loadSnapshotFromIdb())?.payload.loadedRows).toHaveLength(2);
    _resetDbForTests();
    expect((await loadSnapshotFromIdb())?.payload.loadedRows).toHaveLength(2);
  });
});

describe('migration: pre-Stage-0 monolith (current) → Stage-1', () => {
  it('splits the monolith, routes rows to imported-rows, deletes current', async () => {
    const file = fullFile();
    const seed = await openDB(DB_NAME, 1, {
      upgrade(db) { db.createObjectStore(SNAPSHOTS_STORE); },
    });
    await seed.put(SNAPSHOTS_STORE, file, 'current'); // monolithic legacy record
    seed.close();
    _resetDbForTests();

    const loaded = await loadSnapshotFromIdb();
    expect(loaded).toEqual(file);

    const raw = await rawDb();
    expect(await raw.get(ROWS_STORE, ROWS_KEY)).toBeDefined();      // rows moved here
    expect(await raw.get(SNAPSHOTS_STORE, 'current')).toBeUndefined(); // monolith deleted
    expect(await raw.get(SNAPSHOTS_STORE, 'planning')).toBeDefined(); // light records written
    raw.close();
  });
});

describe('clearSnapshotFromIdb', () => {
  it('clears both stores so a subsequent load is empty', async () => {
    await saveGroupsToIdb(fullFile(), ['rows', 'scrapers', 'planning']);
    await clearSnapshotFromIdb();
    _resetDbForTests();
    expect(await loadSnapshotFromIdb()).toBeNull();

    const raw = await rawDb();
    expect(await raw.get(ROWS_STORE, ROWS_KEY)).toBeUndefined();
    expect(await raw.get(SNAPSHOTS_STORE, 'meta')).toBeUndefined();
    raw.close();
  });
});

describe('S57: rows-record compression + back-compat', () => {
  it('reads a legacy un-gzipped rows record (written before compression)', async () => {
    // A Stage-1-but-pre-S57 browser has a PLAIN RowsRecord in imported-rows.
    // decodeRowsRecord must pass it through so no saved data is lost.
    const file = fullFile([row('A'), row('B')]);
    const split = splitSessionFile(file);
    const seed = await openDB(DB_NAME, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) db.createObjectStore(SNAPSHOTS_STORE);
        if (!db.objectStoreNames.contains(ROWS_STORE)) db.createObjectStore(ROWS_STORE);
      },
    });
    await seed.put(ROWS_STORE, split.rows, ROWS_KEY); // plain, un-gzipped
    await seed.put(SNAPSHOTS_STORE, split.meta, 'meta');
    seed.close();
    _resetDbForTests();

    const loaded = await loadSnapshotFromIdb();
    const nums = loaded?.payload.loadedRows.map(r => (r as { positionNumber: string }).positionNumber);
    expect(nums).toEqual(['A', 'B']);
  });

  it('round-trips rows through gzip on save -> reload -> load', async () => {
    const file = fullFile([row('X1'), row('X2'), row('X3')]);
    await saveGroupsToIdb(file, ['rows']);
    _resetDbForTests();
    const loaded = await loadSnapshotFromIdb();
    expect(loaded?.payload.loadedRows.map(r => (r as { positionNumber: string }).positionNumber))
      .toEqual(['X1', 'X2', 'X3']);
  });

  it('compresses the rows payload far below the raw JSON size', async () => {
    // Repetitive rows mirror real OBI data (the same long strings on every
    // row). Gzip should shrink this by well over 5x.
    const rows = Array.from(
      { length: 1000 },
      (_, i) =>
        ({
          positionNumber: '10001',
          desc: 'Dept of Building Inspection - Regular Biweekly Pay - 1GAGF',
          _row: i,
        }) as unknown as ImportedRow,
    );
    await saveGroupsToIdb(fullFile(rows), ['rows']);
    const raw = await rawDb();
    const stored = (await raw.get(ROWS_STORE, ROWS_KEY)) as { data: Uint8Array };
    raw.close();
    const rawJsonLen = JSON.stringify({ loadedRows: rows, lastBfmImportAt: '2026-05-20' }).length;
    expect(stored.data.length).toBeLessThan(rawJsonLen / 5);
  });
});
