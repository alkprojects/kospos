/**
 * cloudflare-publish.ts tests — Phase 2.2.q PR 2.
 *
 * Pure-helper tests around config read/write + the fetch/publish HTTP
 * branches. Uses a stubbed `fetch` function so no real network calls
 * fire; the Worker function itself is verified end-to-end via
 * preview-MCP once Alex completes the Cloudflare account setup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  fetchPublishedSnapshot,
  gzipString,
  publishSnapshot,
  readCloudflareConfig,
  writeCloudflareConfig,
  type PublishStage,
} from './cloudflare-publish';
import { buildSessionFile } from './snapshot';

/** Decompress gzip bytes back to a UTF-8 string — used by tests that
 *  capture the POST body to verify what the client actually sent.
 *  `as BodyInit` works around TS 5.7's Uint8Array tightening; see the
 *  matching cast in functions/api/snapshot.ts. */
async function ungzipString(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const stream = new Response(bytes as BodyInit).body!.pipeThrough(ds);
  return await new Response(stream).text();
}

function emptyFile() {
  return buildSessionFile({
    loadedRows: [],
    lastBfmImportAt: '',
    staffingPlanActions: new Map(),
    staffingPlanDerivedRemoved: new Set(),
    positionNotes: new Map(),
  });
}

describe('readCloudflareConfig / writeCloudflareConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty strings when localStorage is empty', () => {
    expect(readCloudflareConfig()).toEqual({ pagesUrl: '', publishSecret: '' });
  });

  it('round-trips a write → read', () => {
    writeCloudflareConfig({
      pagesUrl: 'https://kospos.pages.dev',
      publishSecret: 'shh',
    });
    expect(readCloudflareConfig()).toEqual({
      pagesUrl: 'https://kospos.pages.dev',
      publishSecret: 'shh',
    });
  });

  it('trims whitespace + a trailing slash on pagesUrl', () => {
    writeCloudflareConfig({
      pagesUrl: '  https://kospos.pages.dev/  ',
      publishSecret: '  secret  ',
    });
    expect(readCloudflareConfig()).toEqual({
      pagesUrl: 'https://kospos.pages.dev',
      publishSecret: 'secret',
    });
  });

  it('deletes the underlying key when value is empty', () => {
    writeCloudflareConfig({ pagesUrl: 'https://x.test', publishSecret: 's' });
    writeCloudflareConfig({ pagesUrl: '', publishSecret: '' });
    expect(localStorage.getItem('kospos.cloudflare.pagesUrl')).toBeNull();
    expect(localStorage.getItem('kospos.cloudflare.publishSecret')).toBeNull();
  });
});

describe('fetchPublishedSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses relative /api/snapshot URL when pagesUrl is empty (same-origin default)', async () => {
    // S41 fix: empty pagesUrl no longer short-circuits; it falls back
    // to a relative URL so any visitor to the Cloudflare deployment
    // (including incognito windows + fresh browsers with empty
    // localStorage) auto-loads the published snapshot with zero config.
    let capturedUrl = '';
    const fakeFetch = async (url: string | URL): Promise<Response> => {
      capturedUrl = String(url);
      return new Response('not found', { status: 404 });
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: '', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(capturedUrl).toBe('/api/snapshot');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-snapshot');
  });

  it('returns no-snapshot on 404', async () => {
    const fakeFetch = async (url: string | URL): Promise<Response> => {
      expect(String(url)).toBe('https://x.test/api/snapshot');
      return new Response('not found', { status: 404 });
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: 'https://x.test', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-snapshot');
  });

  it('returns http-error on non-2xx non-404', async () => {
    const fakeFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ error: 'KV not bound' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: 'https://x.test', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === 'http-error') {
      expect(result.status).toBe(503);
      expect(result.detail).toBe('KV not bound');
    }
  });

  it('returns network-error when fetch throws', async () => {
    const fakeFetch = async (): Promise<Response> => {
      throw new Error('connection refused');
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: 'https://x.test', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === 'network-error') {
      expect(result.detail).toBe('connection refused');
    }
  });

  it('returns parse-error when body is not an envelope shape', async () => {
    const fakeFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ wrong: 'shape' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: 'https://x.test', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('parse-error');
  });

  it('returns the parsed envelope on success', async () => {
    const envelope = emptyFile();
    const fakeFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify(envelope), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: 'https://x.test', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.kind).toBe('kospos-session');
  });

  it('defensively decompresses a gzipped response body that the browser left intact', async () => {
    // Simulates: Cloudflare's edge re-encoded our gzipped Worker
    // response and the browser only peeled the outer Content-Encoding
    // layer, leaving the inner gzip framing on the body.
    const envelope = emptyFile();
    const gzipped = await gzipString(JSON.stringify(envelope));
    const fakeFetch = async (): Promise<Response> => {
      return new Response(gzipped as BodyInit, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: 'https://x.test', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.kind).toBe('kospos-session');
  });

  it('defensively peels up to 3 gzip layers (real-world Cloudflare double-encoding)', async () => {
    const envelope = emptyFile();
    // Build a double-gzipped body: gzip(gzip(json))
    const once = await gzipString(JSON.stringify(envelope));
    const cs = new CompressionStream('gzip');
    const stream = new Response(once as BodyInit).body!.pipeThrough(cs);
    const twice = new Uint8Array(await new Response(stream).arrayBuffer());
    const fakeFetch = async (): Promise<Response> => {
      return new Response(twice as BodyInit, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await fetchPublishedSnapshot(
      { pagesUrl: 'https://x.test', publishSecret: '' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.kind).toBe('kospos-session');
  });
});

describe('publishSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses relative /api/snapshot URL when pagesUrl is empty (same-origin default)', async () => {
    // S41 fix: same shape as the fetch path — empty pagesUrl falls
    // back to relative URL. The secret is still required (publishing
    // is gated; reading is public), so publishing from the deployed
    // site requires only the secret to be configured.
    let capturedUrl = '';
    const fakeFetch = async (url: string | URL): Promise<Response> => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ ok: true, savedAt: 'x', bytes: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await publishSnapshot(
      emptyFile(),
      { pagesUrl: '', publishSecret: 's' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(capturedUrl).toBe('/api/snapshot');
    expect(result.ok).toBe(true);
  });

  it('returns no-secret when secret is empty', async () => {
    const result = await publishSnapshot(emptyFile(), { pagesUrl: 'https://x.test', publishSecret: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-secret');
  });

  it('sends X-Publish-Secret + Content-Encoding gzip headers + gzipped body', async () => {
    let capturedHeaders: Record<string, string> = {};
    let capturedMethod = '';
    let capturedBody: Uint8Array | null = null;
    const fakeFetch = async (url: string | URL, init?: RequestInit): Promise<Response> => {
      expect(String(url)).toBe('https://x.test/api/snapshot');
      capturedMethod = init?.method ?? 'GET';
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers) capturedHeaders = headers;
      // S41: body is now a Uint8Array (gzipped), not a string.
      if (init?.body instanceof Uint8Array) capturedBody = init.body;
      return new Response(JSON.stringify({ ok: true, savedAt: '2026-05-28T14:35:00Z', bytes: 42 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await publishSnapshot(
      emptyFile(),
      { pagesUrl: 'https://x.test', publishSecret: 'sekret' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(capturedMethod).toBe('POST');
    expect(capturedHeaders['X-Publish-Secret']).toBe('sekret');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedHeaders['Content-Encoding']).toBe('gzip');
    // S41 fix: savedAt travels via header so the Worker can echo it
    // back without decompressing the body.
    expect(capturedHeaders['X-Snapshot-SavedAt']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Captured body decompresses back to the original JSON envelope.
    expect(capturedBody).not.toBeNull();
    expect(capturedBody![0]).toBe(0x1f);
    expect(capturedBody![1]).toBe(0x8b);
    const decompressed = await ungzipString(capturedBody!);
    expect(JSON.parse(decompressed).kind).toBe('kospos-session');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.savedAt).toBe('2026-05-28T14:35:00Z');
      expect(result.bytes).toBe(42);
    }
  });

  it('gzipped body is smaller than the original JSON for realistic payloads', async () => {
    // Synthesize a payload with repetitive structure (like real
    // KosPos data) so we can verify compression is actually firing.
    const file = emptyFile();
    // Mutate the payload in a type-safe way: the SessionFile envelope
    // allows arbitrary `loadedRows`, so push 1000 similar-looking
    // rows. JSON.stringify of this should be many KB; gzipped, KB → tiny.
    const big = {
      ...file,
      payload: {
        ...file.payload,
        loadedRows: Array.from({ length: 1000 }, (_, i) => ({
          kind: 'position-row' as const,
          positionNumber: `PN${i.toString().padStart(6, '0')}`,
          jobCode: '1842',
          employeeName: `Test Person ${i}`,
          deptId: 'DBI',
        })),
      },
    };
    const json = JSON.stringify(big);
    const gz = await gzipString(json);
    expect(gz.byteLength).toBeLessThan(json.length / 5);
    // And the magic header is correct.
    expect(gz[0]).toBe(0x1f);
    expect(gz[1]).toBe(0x8b);
  });

  it('returns http-error on 401 (bad secret)', async () => {
    const fakeFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ error: 'Invalid or missing X-Publish-Secret header.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const result = await publishSnapshot(
      emptyFile(),
      { pagesUrl: 'https://x.test', publishSecret: 'wrong' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === 'http-error') {
      expect(result.status).toBe(401);
      expect(result.detail).toMatch(/X-Publish-Secret/);
    }
  });

  it('returns network-error when fetch throws', async () => {
    const fakeFetch = async (): Promise<Response> => {
      throw new Error('timed out');
    };
    const result = await publishSnapshot(
      emptyFile(),
      { pagesUrl: 'https://x.test', publishSecret: 's' },
      fakeFetch as unknown as typeof fetch,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === 'network-error') {
      expect(result.detail).toBe('timed out');
    }
  });

  it('fires onProgress with compressing → uploading stages in order', async () => {
    const stages: PublishStage[] = [];
    const fakeFetch = async (): Promise<Response> => {
      return new Response(JSON.stringify({ ok: true, savedAt: 'x', bytes: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    await publishSnapshot(
      emptyFile(),
      { pagesUrl: 'https://x.test', publishSecret: 's' },
      fakeFetch as unknown as typeof fetch,
      stage => stages.push(stage),
    );
    expect(stages).toEqual(['compressing', 'uploading']);
  });
});
