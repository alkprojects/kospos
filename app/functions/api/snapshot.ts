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
 * 100 MB request-body limit + KV's 25 MB value limit):
 *   - POST requests with `Content-Encoding: gzip` are decompressed
 *     before envelope validation. The raw compressed bytes are then
 *     stored in KV (singleton `current` key) so the KV value stays
 *     well under the 25 MB cap (JSON gzips 8-15× on this dataset).
 *   - POST requests without `Content-Encoding: gzip` are parsed as
 *     plain JSON (backward-compatible with older clients) and the
 *     decompressed bytes are gzipped before being stored in KV.
 *   - GET inspects the stored bytes' magic header (0x1f 0x8b) to
 *     decide whether to set `Content-Encoding: gzip` on the response.
 *     Browsers + the cloudflare-publish.ts client both auto-decompress
 *     gzip responses transparently, so callers see the same JSON
 *     envelope either way.
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
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding, X-Publish-Secret',
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
 *  so legacy clients still result in compressed KV storage. */
async function gzipString(s: string): Promise<Uint8Array> {
  const cs = new CompressionStream('gzip');
  const stream = new Response(new TextEncoder().encode(s)).body!.pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Decompress gzip bytes back to a UTF-8 string. Used to validate the
 *  envelope after a gzipped POST. The `as BodyInit` cast works around
 *  TypeScript 5.7's tightening of `Uint8Array<ArrayBufferLike>` vs
 *  `Uint8Array<ArrayBuffer>` — both are valid `BufferSource` at
 *  runtime, but the strict inference picks the wrong union member. */
async function ungzipToString(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const ds = new DecompressionStream('gzip');
  const stream = new Response(view as BodyInit).body!.pipeThrough(ds);
  return await new Response(stream).text();
}

/** Detect whether a stored KV value is gzipped (modern publish path) or
 *  raw JSON text (legacy publish path before S41). Magic-header sniff
 *  per RFC 1952. */
function looksGzipped(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1;
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
  if (presentedSecret !== env.PUBLISH_SECRET) {
    return jsonResponse({
      error: 'Invalid or missing X-Publish-Secret header.',
    }, 401);
  }

  // Read the body once. If gzipped, decompress for envelope validation
  // but keep the raw bytes around so we can store them in KV without
  // a redundant re-compression round-trip.
  const encoding = request.headers.get('Content-Encoding');
  const isGzipped = encoding === 'gzip';

  let body: unknown;
  let storeBytes: Uint8Array;
  try {
    if (isGzipped) {
      const rawBytes = new Uint8Array(await request.arrayBuffer());
      const decompressedText = await ungzipToString(rawBytes);
      body = JSON.parse(decompressedText);
      storeBytes = rawBytes;
    } else {
      // Legacy plaintext path — parse JSON directly, then gzip the
      // serialized form for KV storage (small enough on legacy
      // datasets that the CPU cost is negligible).
      body = await request.json();
      storeBytes = await gzipString(JSON.stringify(body));
    }
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

  // KV has a hard 25 MB cap per value. Surface this with a useful
  // error rather than letting the put() call throw an opaque 500.
  if (storeBytes.byteLength > KV_MAX_VALUE_BYTES) {
    return jsonResponse({
      error: `Compressed snapshot is ${storeBytes.byteLength} bytes; Cloudflare Workers KV caps values at ${KV_MAX_VALUE_BYTES}. Switch storage to R2 or split the snapshot.`,
    }, 413);
  }

  await env.KOSPOS_SNAPSHOTS.put(SNAPSHOT_KEY, storeBytes);
  return jsonResponse({
    ok: true,
    savedAt: body.savedAt,
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
