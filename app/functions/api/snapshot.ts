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

/** Cloudflare Workers KV namespace shape. The Pages binding makes this
 *  available as `env.KOSPOS_SNAPSHOTS` at runtime. */
interface KVNamespace {
  get(key: string, options?: { type: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
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
  'Access-Control-Allow-Headers': 'Content-Type, X-Publish-Secret',
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

// ---------------------------------------------------------------------------
// GET /api/snapshot
// ---------------------------------------------------------------------------

export const onRequestGet = async ({ env }: PagesContext): Promise<Response> => {
  if (!env.KOSPOS_SNAPSHOTS) {
    return jsonResponse({
      error: 'KV namespace not bound. Bind KOSPOS_SNAPSHOTS in Pages → Settings → Functions.',
    }, 503);
  }
  const raw = await env.KOSPOS_SNAPSHOTS.get(SNAPSHOT_KEY, { type: 'text' });
  if (raw === null) {
    return jsonResponse({ error: 'No snapshot published yet.' }, 404);
  }
  // Return the body verbatim so the client gets the exact bytes that
  // were POSTed (preserves any savedAt or label fields).
  return new Response(raw, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    },
  });
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
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse({
      error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    }, 400);
  }
  if (!isValidEnvelope(body)) {
    return jsonResponse({
      error: 'Body is not a valid kospos-session envelope (expected { kind, schemaVersion, savedAt, payload }).',
    }, 400);
  }
  // Persist verbatim — client validation already ran via `buildSessionFile`.
  const text = JSON.stringify(body);
  await env.KOSPOS_SNAPSHOTS.put(SNAPSHOT_KEY, text);
  return jsonResponse({
    ok: true,
    savedAt: body.savedAt,
    bytes: text.length,
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
