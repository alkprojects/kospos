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
 *     deployment (e.g. `https://kospos.pages.dev`). Optional when the
 *     page itself is served from the Cloudflare deployment (a relative
 *     URL `/api/snapshot` resolves correctly against window.location).
 *     Required when running from a different origin (localhost dev
 *     pointing at production, GitHub Pages mirror, etc.).
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
 * Same-origin default (S41 fix): the original implementation required
 * an explicit `pagesUrl` in localStorage even for the read path. That
 * blocked the entire cross-device "shared workspace" value prop — any
 * fresh browser / incognito window / never-seen-before visitor has
 * empty localStorage and would short-circuit to 'not-configured'
 * without ever firing a network request. Now an empty `pagesUrl` falls
 * back to a relative URL, so any visitor to the Cloudflare deployment
 * auto-loads the published snapshot with zero per-device config.
 *
 * Compression (added S41): `publishSnapshot` gzips the JSON body via the
 * Web Streams CompressionStream API before POSTing, and sets
 * `Content-Encoding: gzip`. This was forced by Cloudflare's 100 MB
 * request-body limit + KV's 25 MB value cap — KosPos's 110K-row
 * dataset serializes to ~150 MB raw, which both limits reject. JSON
 * gzips 8-15× on this dataset so compressed bodies sit comfortably
 * under both limits. The Worker stores the gzipped bytes verbatim
 * (no server-side decompression — Workers' 128 MB memory cap can't
 * hold a fully decompressed real-data snapshot).
 *
 * Cross-device load (S41 hardening): `fetchPublishedSnapshot` reads
 * the response body as raw bytes and defensively unwraps any residual
 * gzip framing in a loop (up to 3 layers). This handles cases where
 * Cloudflare's edge re-encodes our already-gzipped response on top
 * of `Content-Encoding: gzip` — observed empirically on real-data
 * responses where the browser auto-decompresses one layer but leaves
 * the inner gzip intact, breaking `response.json()`.
 *
 * Publish progress (S41 UX): `publishSnapshot` accepts an optional
 * `onProgress` callback that fires before each heavy stage
 * (`compressing` → `uploading`). The caller uses these to keep the
 * UI updating while JSON.stringify + gzip churn through 300K+ rows
 * on the main thread, and yields to React between stages so the
 * banner can paint before Chrome's "page unresponsive" dialog fires.
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
 * Decompress gzip bytes back to a Uint8Array. Used by the defensive
 * fetch path — if Cloudflare's edge re-encodes our already-gzipped
 * response (which it sometimes does, observed S41 on a 1.25 MB body
 * being returned as ~34 KB of doubly-gzipped bytes), the browser's
 * auto-decompression peels one layer and we have to peel the rest.
 */
async function ungzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip');
  const stream = new Response(bytes as BodyInit).body!.pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** RFC 1952 gzip magic header — first two bytes of any gzip stream. */
function looksGzipped(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/** Cap on defensive decompression iterations. Real responses have at
 *  most 1-2 layers; allowing 3 covers worst-case CDN behavior without
 *  letting a malicious response loop forever. */
const MAX_DECOMPRESSION_LAYERS = 3;

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

/** Stages of `publishSnapshot` work for the optional progress callback.
 *  The UI uses these to keep the user informed while heavy sync work
 *  (JSON.stringify on a 330K-row payload can take seconds) progresses
 *  on the main thread. The callback fires before each stage starts. */
export type PublishStage = 'compressing' | 'uploading';

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
  // S41 fix: when pagesUrl is empty, default to a relative URL. This is
  // the critical path for cross-device load — incognito windows + fresh
  // browsers start with empty localStorage, so the original "require
  // pagesUrl" gate blocked every read-only visitor from ever seeing
  // the shared snapshot. Visitors to the Cloudflare Pages deployment
  // (kospos.pages.dev) automatically hit /api/snapshot on the same
  // origin — no localStorage config needed. Explicit pagesUrl still
  // works (cross-origin: localhost dev pointing at production, etc.).
  const url = config.pagesUrl
    ? `${config.pagesUrl}/api/snapshot`
    : '/api/snapshot';
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
  // Read body as bytes (not response.json()) so we can defensively
  // unwrap any residual gzip framing left over from Cloudflare-edge
  // re-encoding. The browser auto-decompresses one layer of
  // Content-Encoding: gzip; if Cloudflare wraps another layer on top
  // (observed S41 on real-data responses), we have to peel the rest
  // manually here.
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch (err) {
    return {
      ok: false, reason: 'network-error',
      detail: `Reading response body failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  let layers = 0;
  while (looksGzipped(bytes) && layers < MAX_DECOMPRESSION_LAYERS) {
    try {
      bytes = await ungzipBytes(bytes);
    } catch (err) {
      // Magic header looked like gzip but the bytes aren't valid gzip
      // (truncated or corrupted). Stop peeling; fall through to JSON
      // parse which will likely fail and surface a parse-error.
      return {
        ok: false, reason: 'parse-error',
        detail: `gunzip failed at layer ${layers + 1}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    layers += 1;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch (err) {
    return {
      ok: false, reason: 'parse-error',
      detail: `JSON parse failed after ${layers} gzip layer${layers === 1 ? '' : 's'}: ${err instanceof Error ? err.message : String(err)}`,
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
  onProgress?: (stage: PublishStage) => void,
): Promise<PublishResult> {
  if (!config.publishSecret) {
    return { ok: false, reason: 'no-secret' };
  }
  // Same relative-URL default as fetchPublishedSnapshot — publishing
  // from the deployed page itself needs no pagesUrl config. The secret
  // is still required (publishing is gated; reading is public).
  const url = config.pagesUrl
    ? `${config.pagesUrl}/api/snapshot`
    : '/api/snapshot';
  // gzip the JSON body. See the module header — without this, the
  // 110K-row real-world dataset trips Cloudflare's 100 MB request
  // limit at the edge before the Worker even runs. Modern browsers
  // + Cloudflare Workers both support CompressionStream natively.
  //
  // Stage-by-stage progress + yields are for the responsiveness path:
  // JSON.stringify on a 300K+ row file blocks the main thread for
  // multiple seconds, and without `await`ing a microtask the browser
  // never gets a chance to paint the "publishing…" banner the caller
  // set just before invoking us — the user sees nothing happen for
  // seconds and may see Chrome's "page unresponsive" dialog. Yielding
  // before each heavy chunk gives the browser breathing room.
  onProgress?.('compressing');
  await new Promise(r => setTimeout(r, 0));
  let compressed: Uint8Array;
  try {
    const json = JSON.stringify(file);
    // One more yield before gzip — CompressionStream is async-streaming
    // but the JSON.stringify above was sync and likely just blocked us.
    await new Promise(r => setTimeout(r, 0));
    compressed = await gzipString(json);
  } catch (err) {
    return {
      ok: false, reason: 'network-error',
      detail: `gzip failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  onProgress?.('uploading');
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
