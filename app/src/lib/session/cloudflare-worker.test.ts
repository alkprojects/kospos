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
// `get(key, { type: 'text' })` / `put(key, value)` / `delete(key)` surface
// the Worker function uses.
// ---------------------------------------------------------------------------

interface MockKVNamespace {
  get(key: string, options?: { type: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  _store: Map<string, string>;
}

function makeMockKV(initial: Record<string, string> = {}): MockKVNamespace {
  const store = new Map(Object.entries(initial));
  return {
    _store: store,
    async get(key: string): Promise<string | null> {
      return store.has(key) ? store.get(key)! : null;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
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

  it('returns the stored envelope verbatim on 200', async () => {
    const stored = envelope();
    const response = await onRequestGet({
      request: new Request('https://test.local/api/snapshot'),
      env: {
        KOSPOS_SNAPSHOTS: makeMockKV({ current: JSON.stringify(stored) }) as any,
      },
    } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect((body as { kind: string }).kind).toBe('kospos-session');
    expect((body as { savedAt: string }).savedAt).toBe('2026-05-28T14:30:00Z');
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

  it('writes to KV + returns 200 on success', async () => {
    const kv = makeMockKV();
    const response = await onRequestPost({
      request: mkRequest(envelope(), { 'X-Publish-Secret': 's' }),
      env: { KOSPOS_SNAPSHOTS: kv as any, PUBLISH_SECRET: 's' },
    } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect((body as { ok: boolean }).ok).toBe(true);
    expect((body as { savedAt: string }).savedAt).toBe('2026-05-28T14:30:00Z');
    // KV now contains the envelope (verbatim).
    expect(kv._store.has('current')).toBe(true);
    const stored = JSON.parse(kv._store.get('current')!);
    expect(stored.kind).toBe('kospos-session');
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
  });
});
