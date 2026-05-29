/**
 * Cloudflare Pages Function — Workers KV snapshot read/write — Phase 2.2.q PR 2.
 *
 * Routes:
 *   GET  /api/snapshot   → returns the latest published snapshot envelope
 *                          (a `SessionFile` per app/src/lib/session/snapshot.ts),
 *                          or 404 if none has been published yet. Public —
 *                          anyone with the site URL can read.
 *   POST /api/snapshot   → writes a new snapshot. Body must be a valid
 *                          `kospos-session` envelope. Gated by the
 *                          `X-Publish-Secret` header matching the
 *                          `PUBLISH_SECRET` env var. Returns 200 + the
 *                          stored `savedAt` timestamp on success.
 *
 * Storage:
 *   KV binding `KOSPOS_SNAPSHOTS` (set in Cloudflare Pages → Settings →
 *   Functions → KV namespace bindings). Singleton key `current` — one
 *   shared workspace per Cloudflare Pages deployment. Named workspaces
 *   come in Phase 2.2.r+ (would key on `?workspace=<id>`).
 *
 * Environment variables:
 *   PUBLISH_SECRET — string. Required for POST. If unset, POST returns
 *     503 with a "publishing not configured" message (rather than 500)
 *     so a half-deployed setup is debuggable from the client.
 *
 * Why a Worker function (and not direct browser-to-KV):
 *   Workers KV doesn't expose a public HTTP API. The Pages Functions
 *   shim runs server-side, can hold the KV binding, and applies the
 *   secret gate. Bonus: validates the envelope shape before writing so
 *   a typo can't corrupt the stored snapshot.
 *
 * Compression (added S41 after a 110K-row dataset hit Cloudflare's
 * 100 MB request-body limit + KV's 25 MB value limit; refined after
 * a 220K-row dataset blew the Worker's 128 MB memory cap during
 * server-side decompression):
 *   - POST requests with `Content-Encoding: gzip` are stored in KV
 *     verbatim — Worker does NOT decompress (real-data snapshots
 *     expand 8-15× and exceed Workers' 128 MB cap). Sanity checks
 *     only: size <= 25 MB + gzip magic bytes + savedAt from the
 *     `X-Snapshot-SavedAt` header so the response can echo it back
 *     without parsing the body.
 *   - POST requests without `Content-Encoding: gzip` are parsed as
 *     plain JSON (backward-compatible with older clients), validated
 *     as full envelopes, and gzipped before KV storage. Legacy
 *     plaintext bodies are constrained to ~100 MB by Cloudflare's
 *     edge, well within the Worker memory budget.
 *   - GET inspects the stored bytes' magic header (0x1f 0x8b) to
 *     decide whether to set `Content-Encoding: gzip` on the response.
 *     Browsers auto-decompress gzip responses transparently, so the
 *     `fetchPublishedSnapshot` client sees the same JSON envelope
 *     either way.
 *   - Trade-off: skipping Worker-side decompression means we no
 *     longer validate the envelope shape server-side on the gzipped
 *     path. `parseSessionFile` validates on the client both at
 *     publish-time (via `buildSessionFile`) and at read-time, so a
 *     buggy publish only ever poisons the singleton KV value until
 *     the next valid publish overwrites it.
 *
 * Data-sensitivity note:
 *   The snapshot carries SF public-employee data (names, emplIds,
 *   classifications, salaries) — all public records under the Sunshine
 *   Ordinance + state law. See [memory data_sensitivity.md] +
 *   docs/research/persistence-architecture-options.md § What "shared
 *   workspace" means here.
 */

/** The single KV key under which the current snapshot lives. v2 will key
 *  by `?workspace=` for named workspaces. */
const SNAPSHOT_KEY = 'current';

/** Cloudflare Workers KV cap per value (hard limit, not configurable).
 *  We surface this as 413 with a useful error rather than letting
 *  `env.KOSPOS_SNAPSHOTS.put(...)` throw an opaque 500. */
const KV_MAX_VALUE_BYTES = 25 * 1024 * 1024;

/** gzip magic header — first two bytes of any gzip stream (RFC 1952). */
const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

/** Cloudflare Workers KV namespace shape. The Pages binding makes this
 *  available as `env.KOSPOS_SNAPSHOTS` at runtime. The `put` overload
 *  accepts strings, ArrayBuffers, and ReadableStreams — we use
 *  ArrayBuffer for the compressed-bytes path. */
interface KVNamespace {
  get(key: string, options?: { type: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | ArrayBuffer | null>;
  put(key: string, value: string | ArrayBuffer | Uint8Array, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Cloudflare Pages Functions context object — what every handler
 *  receives. Narrowed to the bindings KosPos actually uses. */
interface PagesContext {
  request: Request;
  env: {
    KOSPOS_SNAPSHOTS?: KVNamespace;
    PUBLISH_SECRET?: string;
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding, X-Publish-Secret, X-Snapshot-SavedAt',
  'Access-Control-Max-Age': '86400',
} as const;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Lightweight envelope validation — mirrors `parseSessionFile` in
 * app/src/lib/session/snapshot.ts but stays inline so this function file
 * has zero imports (Cloudflare Pages Functions bundling is happier with
 * self-contained files; sharing code from `src/` would require a build
 * step we don't need yet).
 *
 * Validates only the envelope shape — payload fields are re-validated
 * client-side via the existing `parseSessionFile`. Two-layer check
 * means a corrupt server can't poison the client either.
 */
function isValidEnvelope(value: unknown): value is { kind: string; schemaVersion: number; savedAt: string; payload: unknown } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.kind !== 'kospos-session') return false;
  if (typeof v.schemaVersion !== 'number') return false;
  if (typeof v.savedAt !== 'string') return false;
  if (typeof v.payload !== 'object' || v.payload === null) return false;
  return true;
}

/** gzip the given UTF-8 string. Used for the legacy plaintext POST path
 *  so legacy clients still result in compressed KV storage. The gzipped
 *  POST path skips the Worker-side decompression that the symmetric
 *  `ungzipToString` helper used to perform — see the comment in
 *  `onRequestPost` for why we trade Worker-side envelope validation
 *  for the memory headroom that lets real-data publishes succeed. */
async function gzipString(s: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const stream = new Response(new TextEncoder().encode(s)).body!.pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Detect whether a stored KV value is gzipped (modern publish path) or
 *  raw JSON text (legacy publish path before S41). Magic-header sniff
 *  per RFC 1952. */
function looksGzipped(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1;
}

/**
 * Constant-time comparison for the publish-secret check. Unlike `===`,
 * this never early-exits on the first differing character, so a caller
 * can't use response timing to learn how many leading characters of a
 * guess were correct. The loop length is the (constant, server-side)
 * expected-secret length, so timing is independent of the attacker-
 * supplied value; the length XOR folds in any length mismatch so unequal
 * lengths can never compare equal. Cloudflare's edge + network jitter
 * already make a timing attack against a Worker impractical — this is
 * defense-in-depth, keeping the secret off the trivially-attackable path.
 */
function constantTimeEqual(expected: string, presented: string): boolean {
  let mismatch = expected.length ^ presented.length;
  for (let i = 0; i < expected.length; i++) {
    // charCodeAt past the end of `presented` is NaN; `| 0` coerces it to
    // 0. The length XOR above already guarantees a non-zero accumulator
    // when lengths differ, so the substituted 0 can never produce a
    // false match.
    mismatch |= expected.charCodeAt(i) ^ (presented.charCodeAt(i) | 0);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// GET /api/snapshot
// ---------------------------------------------------------------------------

export const onRequestGet = async ({ env }: PagesContext): Promise<Response> => {
  if (!env.KOSPOS_SNAPSHOTS) {
    return jsonResponse({
      error: 'KV namespace not bound. Bind KOSPOS_SNAPSHOTS in Pages → Settings → Functions.',
    }, 503);
  }
  const raw = await env.KOSPOS_SNAPSHOTS.get(SNAPSHOT_KEY, { type: 'arrayBuffer' });
  if (raw === null) {
    return jsonResponse({ error: 'No snapshot published yet.' }, 404);
  }
  if (typeof raw === 'string') {
    // Defensive: if a KV binding returns text when we asked for
    // arrayBuffer (shouldn't happen in production but the type union
    // allows it), send it as plain JSON.
    return new Response(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        ...CORS_HEADERS,
      },
    });
  }
  const bytes = new Uint8Array(raw);
  // Pass the stored bytes through verbatim. If gzipped, set
  // Content-Encoding so the browser auto-decompresses on receipt
  // (transparent to `response.json()`). If not gzipped (legacy KV
  // value from before S41 or a defensive plaintext path), send as-is.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...CORS_HEADERS,
  };
  if (looksGzipped(bytes)) {
    headers['Content-Encoding'] = 'gzip';
  }
  return new Response(bytes, { status: 200, headers });
};

// ---------------------------------------------------------------------------
// POST /api/snapshot
// ---------------------------------------------------------------------------

export const onRequestPost = async ({ request, env }: PagesContext): Promise<Response> => {
  if (!env.KOSPOS_SNAPSHOTS) {
    return jsonResponse({
      error: 'KV namespace not bound. Bind KOSPOS_SNAPSHOTS in Pages → Settings → Functions.',
    }, 503);
  }
  if (!env.PUBLISH_SECRET) {
    return jsonResponse({
      error: 'PUBLISH_SECRET not configured. Set it in Pages → Settings → Environment variables.',
    }, 503);
  }
  const presentedSecret = request.headers.get('X-Publish-Secret');
  if (presentedSecret === null || !constantTimeEqual(env.PUBLISH_SECRET, presentedSecret)) {
    return jsonResponse({
      error: 'Invalid or missing X-Publish-Secret header.',
    }, 401);
  }

  const encoding = request.headers.get('Content-Encoding');
  const isGzipped = encoding === 'gzip';

  // Gzipped path: skip Worker-side decompression entirely. The earlier
  // implementation decompressed for envelope-shape validation, but
  // Cloudflare Workers' 128 MB memory cap can't hold a fully
  // decompressed real-data snapshot (110K-220K rows of labor data
  // expand to 100-200 MB JSON). DecompressionStream throws "Memory
  // limit exceeded before EOF" mid-stream, producing a 400 that the
  // client can't meaningfully act on.
  //
  // The client (cloudflare-publish.ts → buildSessionFile via
  // SessionExportImport) already validates the envelope before
  // publishing AND on every read via parseSessionFile. Worker-side
  // validation was belt-and-suspenders; we trade it for the memory
  // headroom that lets real-data publishes succeed.
  //
  // What we DO check on the gzipped path:
  //   - Size <= 25 MB (KV cap; surface 413 instead of opaque KV throw)
  //   - First two bytes are the gzip magic (0x1f 0x8b) so a
  //     mis-labelled body doesn't poison KV with random bytes
  //   - savedAt is carried via the X-Snapshot-SavedAt header so the
  //     response can echo it back without parsing the body
  //
  // Worst case if a buggy client publishes garbage: the next read
  // sees parseSessionFile fail and clients stay on their local IDB
  // state until the next valid publish overwrites the bad value.
  let storeBytes: Uint8Array;
  let savedAt: string;
  if (isGzipped) {
    try {
      storeBytes = new Uint8Array(await request.arrayBuffer());
    } catch (err) {
      return jsonResponse({
        error: `Failed to read request body: ${err instanceof Error ? err.message : String(err)}`,
      }, 400);
    }
    if (storeBytes.byteLength > KV_MAX_VALUE_BYTES) {
      return jsonResponse({
        error: `Compressed snapshot is ${storeBytes.byteLength} bytes; Cloudflare Workers KV caps values at ${KV_MAX_VALUE_BYTES}. Switch storage to R2 or split the snapshot.`,
      }, 413);
    }
    if (storeBytes.byteLength < 2 || storeBytes[0] !== GZIP_MAGIC_0 || storeBytes[1] !== GZIP_MAGIC_1) {
      return jsonResponse({
        error: 'Body declared Content-Encoding: gzip but does not begin with the gzip magic bytes (0x1f 0x8b).',
      }, 400);
    }
    savedAt = request.headers.get('X-Snapshot-SavedAt') ?? new Date().toISOString();
  } else {
    // Legacy plaintext path — small payloads only (Cloudflare's edge
    // gates inbound bodies at 100 MB; plaintext JSON of any realistic
    // KosPos dataset would already hit that cap). Validates the
    // envelope, then gzips before KV storage so the read path stays
    // uniform.
    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      return jsonResponse({
        error: `Invalid body: ${err instanceof Error ? err.message : String(err)}`,
      }, 400);
    }
    if (!isValidEnvelope(body)) {
      return jsonResponse({
        error: 'Body is not a valid kospos-session envelope (expected { kind, schemaVersion, savedAt, payload }).',
      }, 400);
    }
    storeBytes = await gzipString(JSON.stringify(body));
    if (storeBytes.byteLength > KV_MAX_VALUE_BYTES) {
      return jsonResponse({
        error: `Compressed snapshot is ${storeBytes.byteLength} bytes; Cloudflare Workers KV caps values at ${KV_MAX_VALUE_BYTES}. Switch storage to R2 or split the snapshot.`,
      }, 413);
    }
    savedAt = body.savedAt;
  }

  await env.KOSPOS_SNAPSHOTS.put(SNAPSHOT_KEY, storeBytes);
  return jsonResponse({
    ok: true,
    savedAt,
    bytes: storeBytes.byteLength,
  }, 200);
};

// ---------------------------------------------------------------------------
// OPTIONS — CORS preflight
// ---------------------------------------------------------------------------

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
