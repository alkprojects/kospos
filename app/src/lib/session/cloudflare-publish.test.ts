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
  publishSnapshot,
  readCloudflareConfig,
  writeCloudflareConfig,
} from './cloudflare-publish';
import { buildSessionFile } from './snapshot';

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

  it('returns not-configured when pagesUrl is empty', async () => {
    const result = await fetchPublishedSnapshot({ pagesUrl: '', publishSecret: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-configured');
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
});

describe('publishSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns not-configured when pagesUrl is empty', async () => {
    const result = await publishSnapshot(emptyFile(), { pagesUrl: '', publishSecret: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-configured');
  });

  it('returns no-secret when secret is empty', async () => {
    const result = await publishSnapshot(emptyFile(), { pagesUrl: 'https://x.test', publishSecret: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-secret');
  });

  it('sends X-Publish-Secret header + JSON body', async () => {
    let capturedHeaders: Record<string, string> = {};
    let capturedMethod = '';
    let capturedBody = '';
    const fakeFetch = async (url: string | URL, init?: RequestInit): Promise<Response> => {
      expect(String(url)).toBe('https://x.test/api/snapshot');
      capturedMethod = init?.method ?? 'GET';
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers) capturedHeaders = headers;
      if (typeof init?.body === 'string') capturedBody = init.body;
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
    expect(JSON.parse(capturedBody).kind).toBe('kospos-session');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.savedAt).toBe('2026-05-28T14:35:00Z');
      expect(result.bytes).toBe(42);
    }
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
});
