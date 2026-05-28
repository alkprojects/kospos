/**
 * Cloudflare Worker function tests — Phase 2.2.q PR 2.
 *
 * The Worker function file lives at app/functions/api/snapshot.ts (outside
 * src/) so Cloudflare Pages picks it up at build time. The handler
 * exports are plain async functions that take a `{ request, env }` object
 * and return a `Response` — easy to test under Vitest with a faked
 * KV namespace.
 *
 * What this verifies (the "code lands tonight, deploy verifies tomorrow"
 * piece of the A+B combo Alex picked):
 *
 *   - GET / POST / OPTIONS handler signatures match Cloudflare Pages
 *     Functions conventions.
 *   - GET returns 503 when KV unbound, 404 when no snapshot, 200 with
 *     body when present.
 *   - POST gates on the secret, validates the envelope, writes to KV.
 *   - CORS preflight responds correctly.
 *   - S41 compression: POST with `Content-Encoding: gzip` decompresses
 *     before validation; KV holds compressed bytes; GET surfaces the
 *     compressed bytes back with `Content-Encoding: gzip` so the
 *     browser auto-decompresses transparently. Legacy plaintext POST
 *     still works (server gzips before storing).
 *
 * Real Cloudflare Pages will exercise the wire-up + KV binding once
 * Alex's account is set up.
 */

import { describe, it, expect } from 'vitest';
import {
  onRequestGet,
  onRequestPost,
  onRequestOptions,
} from '../../../functions/api/snapshot';

// ---------------------------------------------------------------------------
// Mock KV namespace — minimal in-memory implementation matching the
// `get(key, { type })` / `put(key, value)` / `delete(key)` surface the
// Worker function uses. Values are stored as Uint8Array (the S41 gzip
// shape); the `type: 'text'` branch decodes back to UTF-8 for any
// callers that still ask for a string.
// ---------------------------------------------------------------------------

interface MockKVNamespace {
  get(key: string, options?: { type: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | ArrayBuffer | null>;
  put(key: string, value: string | ArrayBuffer | Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  _store: Map<string, Uint8Array>;
}

function makeMockKV(initial: Record<string, Uint8Array> = {}): MockKVNamespace {
  const store = new Map(Object.entries(initial));
  return {
    _store: store,
    async get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | ArrayBuffer | null> {
      const bytes = store.get(key);
      if (bytes === undefined) return null;
      if (options?.type === 'arrayBuffer') {
        // Return a fresh ArrayBuffer copy so callers can't mutate the
        // store via the returned reference.
        const copy = new Uint8Array(bytes.length);
        copy.set(bytes);
        return copy.buffer;
      }
      // Default + 'text': decode to UTF-8 string.
      return new TextDecoder().decode(bytes);
    },
    async put(key: string, value: string | ArrayBuffer | Uint8Array): Promise<void> {
      let bytes: Uint8Array;
      if (typeof value === 'string') {
        bytes = new TextEncoder().encode(value);
      } else if (value instanceof Uint8Array) {
        bytes = value;
      } else {
        bytes = new Uint8Array(value);
      }
      store.set(key, bytes);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };
}

function envelope() {
  return {
    kind: 'kospos-session',
    schemaVersion: 1,
    savedAt: '2026-05-28T14:30:00Z',
    payload: {
      loadedRows: [],
      lastBfmImportAt: '',
      staffingPlanActions: [],
      staffingPlanDerivedRemoved: [],
      positionNotes: [],
    },
  };
}

/** Helper: gzip a string for seeding the mock KV. Mirrors the
 *  client-side helper exported from cloudflare-publish.ts. */
async function gzipString(s: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const stream = new Response(new TextEncoder().encode(s)).body!.pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Helper: decompress gzip bytes back to a UTF-8 string.
 *  `as BodyInit` works around TS 5.7's Uint8Array tightening; see the
 *  matching cast in functions/api/snapshot.ts. */
async function ungzipString(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const stream = new Response(bytes as BodyInit).body!.pipeThrough(ds);
  return await new Response(stream).text();
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/snapshot', () => {
  it('returns 503 when KV not bound', async () => {
    const response = await onRequestGet({
      request: new Request('https://test.local/api/snapshot'),
      env: {},
    } as any);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect((body as { error: string }).error).toMatch(/KV namespace not bound/);
  });

  it('returns 404 when no snapshot stored', async () => {
    const response = await onRequestGet({
      request: new Request('https://test.local/api/snapshot'),
      env: { KOSPOS_SNAPSHOTS: makeMockKV() as any },
    } as any);
    expect(response.status).toBe(404);
  });

  it('returns gzipped envelope with Content-Encoding header on modern KV value', async () => {
    const stored = envelope();
    const gzipped = await gzipString(JSON.stringify(stored));
    const response = await onRequestGet({
      request: new Request('https://test.local/api/snapshot'),
      env: {
        KOSPOS_SNAPSHOTS: makeMockKV({ current: gzipped }) as any,
      },
    } as any);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Encoding')).toBe('gzip');
    // Body should be the raw gzipped bytes; decompressing gives us
    // the envelope back. (In a real browser fetch, Content-Encoding:
    // gzip would auto-decompress before `.json()` sees it.)
    const bodyBytes = new Uint8Array(await response.arrayBuffer());
    const json = JSON.parse(await ungzipString(bodyBytes));
    expect(json.kind).toBe('kospos-session');
    expect(json.savedAt).toBe('2026-05-28T14:30:00Z');
  });

  it('returns plaintext envelope without Content-Encoding for legacy KV values', async () => {
    // Simulate a pre-S41 KV value: raw JSON bytes, no gzip framing.
    const plain = new TextEncoder().encode(JSON.stringify(envelope()));
    const response = await onRequestGet({
      request: new Request('https://test.local/api/snapshot'),
      env: { KOSPOS_SNAPSHOTS: makeMockKV({ current: plain }) as any },
    } as any);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Encoding')).toBeNull();
    const body = await response.json();
    expect((body as { kind: string }).kind).toBe('kospos-session');
  });

  it('includes CORS headers on every response', async () => {
    const response = await onRequestGet({
      request: new Request('https://test.local/api/snapshot'),
      env: { KOSPOS_SNAPSHOTS: makeMockKV() as any },
    } as any);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

describe('POST /api/snapshot', () => {
  function mkRequest(body: unknown, headers: Record<string, string> = {}): Request {
    return new Request('https://test.local/api/snapshot', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }

  async function mkGzippedRequest(body: unknown, headers: Record<string, string> = {}): Promise<Request> {
    const gzipped = await gzipString(JSON.stringify(body));
    return new Request('https://test.local/api/snapshot', {
      method: 'POST',
      body: gzipped as BodyInit,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        // Worker reads savedAt from this header on the gzipped path
        // (it no longer decompresses to parse the envelope).
        'X-Snapshot-SavedAt': typeof body === 'object' && body !== null && 'savedAt' in body
          ? String((body as { savedAt: unknown }).savedAt)
          : '2026-05-28T00:00:00Z',
        ...headers,
      },
    });
  }

  it('returns 503 when KV not bound', async () => {
    const response = await onRequestPost({
      request: mkRequest(envelope(), { 'X-Publish-Secret': 's' }),
      env: { PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(503);
  });

  it('returns 503 when PUBLISH_SECRET not set', async () => {
    const response = await onRequestPost({
      request: mkRequest(envelope(), { 'X-Publish-Secret': 's' }),
      env: { KOSPOS_SNAPSHOTS: makeMockKV() as any },
    } as any);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect((body as { error: string }).error).toMatch(/PUBLISH_SECRET/);
  });

  it('returns 401 when X-Publish-Secret missing', async () => {
    const response = await onRequestPost({
      request: mkRequest(envelope()),
      env: { KOSPOS_SNAPSHOTS: makeMockKV() as any, PUBLISH_SECRET: 'expected' },
    } as any);
    expect(response.status).toBe(401);
  });

  it('returns 401 when X-Publish-Secret wrong', async () => {
    const response = await onRequestPost({
      request: mkRequest(envelope(), { 'X-Publish-Secret': 'wrong' }),
      env: { KOSPOS_SNAPSHOTS: makeMockKV() as any, PUBLISH_SECRET: 'expected' },
    } as any);
    expect(response.status).toBe(401);
  });

  it('returns 400 on invalid JSON', async () => {
    const response = await onRequestPost({
      request: mkRequest('{ not json', { 'X-Publish-Secret': 's' }),
      env: { KOSPOS_SNAPSHOTS: makeMockKV() as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(400);
  });

  it('returns 400 when envelope shape is wrong', async () => {
    const response = await onRequestPost({
      request: mkRequest({ wrong: 'shape' }, { 'X-Publish-Secret': 's' }),
      env: { KOSPOS_SNAPSHOTS: makeMockKV() as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect((body as { error: string }).error).toMatch(/envelope/);
  });

  it('legacy plaintext POST gets compressed before KV storage', async () => {
    const kv = makeMockKV();
    const response = await onRequestPost({
      request: mkRequest(envelope(), { 'X-Publish-Secret': 's' }),
      env: { KOSPOS_SNAPSHOTS: kv as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect((body as { ok: boolean }).ok).toBe(true);
    expect((body as { savedAt: string }).savedAt).toBe('2026-05-28T14:30:00Z');
    // KV value should be gzipped bytes (magic header 0x1f 0x8b), NOT
    // raw JSON text. Decompressing gives us the envelope back.
    const stored = kv._store.get('current');
    expect(stored).toBeDefined();
    expect(stored![0]).toBe(0x1f);
    expect(stored![1]).toBe(0x8b);
    const parsed = JSON.parse(await ungzipString(stored!));
    expect(parsed.kind).toBe('kospos-session');
  });

  it('gzipped POST is stored verbatim without server-side decompression', async () => {
    const kv = makeMockKV();
    const req = await mkGzippedRequest(envelope(), { 'X-Publish-Secret': 's' });
    const response = await onRequestPost({
      request: req,
      env: { KOSPOS_SNAPSHOTS: kv as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect((body as { ok: boolean }).ok).toBe(true);
    // savedAt is echoed from the X-Snapshot-SavedAt header (not parsed
    // from the body), so the round-trip matches what the client sent.
    expect((body as { savedAt: string }).savedAt).toBe('2026-05-28T14:30:00Z');
    // KV holds the exact gzipped bytes the client POSTed; decompressing
    // them gives the original envelope back.
    const stored = kv._store.get('current');
    expect(stored).toBeDefined();
    expect(stored![0]).toBe(0x1f);
    expect(stored![1]).toBe(0x8b);
    const parsed = JSON.parse(await ungzipString(stored!));
    expect(parsed.savedAt).toBe('2026-05-28T14:30:00Z');
  });

  it('gzipped POST stores bytes regardless of envelope shape (validation lives on the client)', async () => {
    // The Worker no longer decompresses gzipped POSTs (Cloudflare's
    // 128 MB Worker memory cap can't fit a 200+ MB decompressed
    // labor-data snapshot), so envelope validation is deferred to
    // the client. This test documents that trade-off explicitly.
    const kv = makeMockKV();
    const req = await mkGzippedRequest({ wrong: 'shape' }, { 'X-Publish-Secret': 's' });
    const response = await onRequestPost({
      request: req,
      env: { KOSPOS_SNAPSHOTS: kv as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(200);
    expect(kv._store.has('current')).toBe(true);
  });

  it('gzipped POST with non-gzip bytes returns 400 (magic-header check)', async () => {
    const kv = makeMockKV();
    // Body labeled as Content-Encoding: gzip but actually plain text —
    // caught by the leading-bytes sniff before reaching KV.
    const req = new Request('https://test.local/api/snapshot', {
      method: 'POST',
      body: new TextEncoder().encode('not actually gzipped'),
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-Publish-Secret': 's',
        'X-Snapshot-SavedAt': '2026-05-28T00:00:00Z',
      },
    });
    const response = await onRequestPost({
      request: req,
      env: { KOSPOS_SNAPSHOTS: kv as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect((body as { error: string }).error).toMatch(/gzip magic/);
    expect(kv._store.has('current')).toBe(false);
  });

  it('gzipped POST too big returns 413 before touching KV', async () => {
    const kv = makeMockKV();
    // Synthesize a body exceeding the 25 MB KV cap. We don't need the
    // bytes to be valid gzip — size check fires before magic check.
    const huge = new Uint8Array(26 * 1024 * 1024);
    huge[0] = 0x1f;
    huge[1] = 0x8b;
    const req = new Request('https://test.local/api/snapshot', {
      method: 'POST',
      body: huge as BodyInit,
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-Publish-Secret': 's',
        'X-Snapshot-SavedAt': '2026-05-28T00:00:00Z',
      },
    });
    const response = await onRequestPost({
      request: req,
      env: { KOSPOS_SNAPSHOTS: kv as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(413);
    expect(kv._store.has('current')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OPTIONS
// ---------------------------------------------------------------------------

describe('OPTIONS /api/snapshot (CORS preflight)', () => {
  it('returns 204 with CORS headers', async () => {
    const response = await onRequestOptions();
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toMatch(/POST/);
    expect(response.headers.get('Access-Control-Allow-Headers')).toMatch(/X-Publish-Secret/);
    // S41: the gzipped publish path needs Content-Encoding pre-flighted.
    expect(response.headers.get('Access-Control-Allow-Headers')).toMatch(/Content-Encoding/);
    // S41 fix: gzipped POSTs carry savedAt as a header (the Worker
    // doesn't decompress the body, so it can't read savedAt from JSON).
    expect(response.headers.get('Access-Control-Allow-Headers')).toMatch(/X-Snapshot-SavedAt/);
  });
});
