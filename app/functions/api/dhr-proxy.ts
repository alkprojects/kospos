/**
 * Cloudflare Pages Function — CORS proxy for the SF DHR scrape (S57).
 *
 * Why: sfdhr.org sends no `Access-Control-Allow-Origin`, so a browser can't
 * read it directly (TypeError: Failed to fetch). KosPos's DHR eligibility /
 * exam-results / job-postings scrape (app/src/lib/scrapers/sf-dhr-exam/) has
 * ridden a chain of free public CORS proxies that rot on their own schedule
 * (2 of the 3 were dead as of S57). This function is the durable replacement:
 * a proxy KosPos controls, deployed WITH the existing Pages project (no
 * separate Worker to set up). Configure it as the "Backup proxy:
 * Cloudflare-Worker URL" in the Load Reports scraper settings (`dhrWorkerUrl`)
 * and `fetch.ts` tries it FIRST, ahead of the public proxies.
 *
 *   GET /api/dhr-proxy?url=<sfdhr.org URL> → the upstream response body,
 *        verbatim (HTML or PDF), with `Access-Control-Allow-Origin: *` added
 *        so the browser client can read it.
 *
 * Open-relay guard: only `https` sfdhr.org URLs are proxied. This is the DHR
 * scrape's backup, NOT a general-purpose proxy — refusing other hosts keeps it
 * from being abused to relay arbitrary traffic through the deployment.
 *
 * Self-contained (zero imports) like app/functions/api/snapshot.ts — Cloudflare
 * Pages Functions bundling is happiest with files that don't reach into src/.
 */

/** Cloudflare Pages Functions context — narrowed to what this handler uses. */
interface PagesContext {
  request: Request;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
} as const;

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Only sfdhr.org (and its subdomains) may be proxied — this is the DHR
 *  scrape's backup, not an open relay. */
function isAllowedHost(hostname: string): boolean {
  return hostname === 'sfdhr.org' || hostname.endsWith('.sfdhr.org');
}

export const onRequestGet = async ({ request }: PagesContext): Promise<Response> => {
  const target = new URL(request.url).searchParams.get('url');
  if (!target) {
    return errorResponse('Missing ?url= parameter.', 400);
  }
  let upstream: URL;
  try {
    upstream = new URL(target);
  } catch {
    return errorResponse('Invalid ?url= value.', 400);
  }
  if (upstream.protocol !== 'https:' || !isAllowedHost(upstream.hostname)) {
    return errorResponse('Only https sfdhr.org URLs may be proxied.', 403);
  }

  let resp: Response;
  try {
    resp = await fetch(upstream.toString(), { headers: { 'User-Agent': 'KosPos-DHR-proxy' } });
  } catch (err) {
    return errorResponse(
      `Upstream fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }

  // Pass the upstream body + status through verbatim (handles both the HTML
  // listing pages and PDF cover-sheet binaries), adding CORS so the browser
  // client can read it. Preserve the upstream Content-Type.
  const headers = new Headers(CORS_HEADERS);
  const contentType = resp.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'no-store');
  return new Response(resp.body, { status: resp.status, headers });
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};
