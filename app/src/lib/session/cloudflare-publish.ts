/**
 * Cloudflare snapshot publish/fetch helpers — Phase 2.2.q PR 2.
 *
 * Talks to the Cloudflare Pages Function defined in
 * `app/functions/api/snapshot.ts`:
 *
 *   GET  {pagesUrl}/api/snapshot — returns published `SessionFile` or 404
 *   POST {pagesUrl}/api/snapshot — writes a new snapshot, gated by header
 *
 * Pure / static module — no React, no Zustand subscriptions. The hook
 * layer in `use-auto-persistence.ts` wires the on-load fetch; the UI
 * layer in `SessionExportImport.tsx` wires the Publish button.
 *
 * Configuration (per-device, localStorage):
 *
 *   kospos.cloudflare.pagesUrl — base URL of the Cloudflare Pages
 *     deployment (e.g. `https://kospos.pages.dev`). Empty when not
 *     configured; publish/fetch are no-ops in that case.
 *   kospos.cloudflare.publishSecret — shared secret that Alex sets up
 *     in Cloudflare Pages → Settings → Environment variables as
 *     `PUBLISH_SECRET`. Required for POST; the GET path doesn't need it.
 *
 * Why localStorage and not env vars: env vars baked into the bundle
 * would expose the publish secret to anyone who downloads the JS.
 * localStorage means each device that wants publish access has to be
 * configured once by the user pasting the secret. Read-only visitors
 * never need the secret.
 *
 * Compression (added S41): `publishSnapshot` gzips the JSON body via the
 * Web Streams CompressionStream API before POSTing, and sets
 * `Content-Encoding: gzip` so the Worker decompresses on receipt. This
 * was forced by Cloudflare's 100 MB request-body limit + KV's 25 MB
 * value cap — KosPos's 110K-row dataset serializes to ~150 MB raw,
 * which both limits reject. JSON gzips 8-15× on this dataset so
 * compressed bodies sit comfortably under both limits.
 * `fetchPublishedSnapshot` is unchanged on the source — the browser
 * auto-decompresses any response with `Content-Encoding: gzip`, so
 * `response.json()` returns the same envelope shape either way.
 */

import type { SessionFile } from './snapshot';

const STORAGE_KEYS = {
  pagesUrl: 'kospos.cloudflare.pagesUrl',
  publishSecret: 'kospos.cloudflare.publishSecret',
} as const;

/**
 * gzip a UTF-8 string via the Web Streams CompressionStream API. The
 * Worker mirrors this with DecompressionStream on receipt. Modern
 * browsers (Chrome 80+, Firefox 113+, Safari 16.4+) + Node 18+ +
 * Cloudflare Workers runtime all support this natively — no library
 * needed. Vitest runs under Node so the tests exercise the real API.
 */
export async function gzipString(s: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const stream = new Response(new TextEncoder().encode(s)).body!.pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Configuration read from localStorage. Both fields may be empty
 * strings when the user hasn't configured the Cloudflare integration
 * yet (the default state on a fresh browser).
 */
export interface CloudflareConfig {
  /** Base URL of the Cloudflare Pages deployment. Empty when not set. */
  pagesUrl: string;
  /** Shared publish secret. Empty when not set. */
  publishSecret: string;
}

/** SSR-safe read of localStorage. Returns empty strings in non-browser
 *  environments (test / SSR), which the caller treats as "not configured". */
export function readCloudflareConfig(): CloudflareConfig {
  if (typeof localStorage === 'undefined') {
    return { pagesUrl: '', publishSecret: '' };
  }
  return {
    pagesUrl: localStorage.getItem(STORAGE_KEYS.pagesUrl) ?? '',
    publishSecret: localStorage.getItem(STORAGE_KEYS.publishSecret) ?? '',
  };
}

/**
 * Persist Cloudflare config to localStorage. Empty values delete the
 * underlying key (so a "clear secret" UX matches the localStorage
 * defaults shape).
 */
export function writeCloudflareConfig(config: CloudflareConfig): void {
  if (typeof localStorage === 'undefined') return;
  const trimmedUrl = config.pagesUrl.trim().replace(/\/$/, '');
  const trimmedSecret = config.publishSecret.trim();
  if (trimmedUrl) localStorage.setItem(STORAGE_KEYS.pagesUrl, trimmedUrl);
  else localStorage.removeItem(STORAGE_KEYS.pagesUrl);
  if (trimmedSecret) localStorage.setItem(STORAGE_KEYS.publishSecret, trimmedSecret);
  else localStorage.removeItem(STORAGE_KEYS.publishSecret);
}

/**
 * Result tagging for fetch / publish operations. Surfaced to the UI so
 * the Landing page + the SessionExportImport panel can show
 * fine-grained status.
 */
export type FetchResult =
  | { ok: true; file: SessionFile }
  | { ok: false; reason: 'not-configured' }
  | { ok: false; reason: 'no-snapshot' }
  | { ok: false; reason: 'http-error'; status: number; detail: string }
  | { ok: false; reason: 'network-error'; detail: string }
  | { ok: false; reason: 'parse-error'; detail: string };

export type PublishResult =
  | { ok: true; savedAt: string; bytes: number }
  | { ok: false; reason: 'not-configured' }
  | { ok: false; reason: 'no-secret' }
  | { ok: false; reason: 'http-error'; status: number; detail: string }
  | { ok: false; reason: 'network-error'; detail: string };

/**
 * Fetch the latest published snapshot. Returns a tagged result so the
 * caller can distinguish "not configured" / "no snapshot" / "fetch
 * failed" without parsing exception messages.
 *
 * `fetchImpl` is the seam for tests + the SSR no-fetch case; defaults
 * to the global `fetch`.
 */
export async function fetchPublishedSnapshot(
  config: CloudflareConfig = readCloudflareConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<FetchResult> {
  if (!config.pagesUrl) {
    return { ok: false, reason: 'not-configured' };
  }
  const url = `${config.pagesUrl}/api/snapshot`;
  let response: Response;
  try {
    response = await fetchImpl(url, { method: 'GET' });
  } catch (err) {
    return {
      ok: false, reason: 'network-error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  if (response.status === 404) {
    return { ok: false, reason: 'no-snapshot' };
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof (body as { error?: unknown }).error === 'string') {
        detail = (body as { error: string }).error;
      }
    } catch {
      // Body wasn't JSON; keep statusText.
    }
    return { ok: false, reason: 'http-error', status: response.status, detail };
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (err) {
    return {
      ok: false, reason: 'parse-error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  // Light envelope sanity. Full payload validation lives in
  // `parseSessionFile` — the caller threads the value through that
  // before restoring stores.
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'parse-error', detail: 'Response is not an object.' };
  }
  const p = parsed as Record<string, unknown>;
  if (p.kind !== 'kospos-session') {
    return { ok: false, reason: 'parse-error', detail: `Expected kind "kospos-session", got ${JSON.stringify(p.kind)}.` };
  }
  return { ok: true, file: parsed as SessionFile };
}

/**
 * Publish the current snapshot. Returns a tagged result so the UI can
 * distinguish "not configured" / "no secret" / "auth rejected" / "saved".
 *
 * `fetchImpl` is the seam for tests.
 */
export async function publishSnapshot(
  file: SessionFile,
  config: CloudflareConfig = readCloudflareConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<PublishResult> {
  if (!config.pagesUrl) {
    return { ok: false, reason: 'not-configured' };
  }
  if (!config.publishSecret) {
    return { ok: false, reason: 'no-secret' };
  }
  const url = `${config.pagesUrl}/api/snapshot`;
  // gzip the JSON body. See the module header — without this, the
  // 110K-row real-world dataset trips Cloudflare's 100 MB request
  // limit at the edge before the Worker even runs. Modern browsers
  // + Cloudflare Workers both support CompressionStream natively.
  let compressed: Uint8Array;
  try {
    compressed = await gzipString(JSON.stringify(file));
  } catch (err) {
    return {
      ok: false, reason: 'network-error',
      detail: `gzip failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'X-Publish-Secret': config.publishSecret,
        // Worker no longer decompresses (memory cap), so it can't
        // read `savedAt` from the body. Pass it via header so the
        // response can echo it back without parsing the body.
        'X-Snapshot-SavedAt': file.savedAt,
      },
      body: compressed as BodyInit,
    });
  } catch (err) {
    return {
      ok: false, reason: 'network-error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof (body as { error?: unknown }).error === 'string') {
        detail = (body as { error: string }).error;
      }
    } catch {
      // ignore
    }
    return { ok: false, reason: 'http-error', status: response.status, detail };
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    parsed = {};
  }
  const p = (typeof parsed === 'object' && parsed !== null) ? parsed as Record<string, unknown> : {};
  return {
    ok: true,
    savedAt: typeof p.savedAt === 'string' ? p.savedAt : file.savedAt,
    bytes: typeof p.bytes === 'number' ? p.bytes : 0,
  };
}
