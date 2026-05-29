# Security review — Cloudflare snapshot write path (Session 42)

**Date:** 2026-05-28
**Branch:** `docs/cloudflare-write-path-security`
**Scope:** The internet-facing publish/fetch path shipped in S41 under
[ADR-016](../DECISIONS.md): the Cloudflare Pages Function
[`app/functions/api/snapshot.ts`](../../app/functions/api/snapshot.ts) (the
Worker) and its client `app/src/lib/session/cloudflare-publish.ts`. Triggered by
the Opus 4.8 setup review (finding **P7**): this is brand-new public write surface
that no security lens had seen, and the GitHub-Pages → Cloudflare cutover would
expose it more widely.

## Threat model

- **Data is public records** (SF public-employee names, IDs, classifications,
  salaries — Sunshine Ordinance + state law; see
  [memory `data_sensitivity.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/data_sensitivity.md)).
  Confidentiality of the *contents* is **not** a concern. So "anyone can read the
  published snapshot" is by design, not a vulnerability.
- **The write path is the surface that matters.** A single shared
  `PUBLISH_SECRET` gates POST; anyone holding it can overwrite the one shared
  snapshot (ADR-016's documented single-tenant write model). The relevant
  questions: can an *unauthenticated* actor write, DoS, or corrupt state? Can the
  secret leak or be brute-forced? Can a malicious publisher harm readers?

## What's already done right (verified)

- **Auth is checked before the body is read.** `onRequestPost` returns 401 on a
  bad/missing `X-Publish-Secret` *before* `request.arrayBuffer()` / `.json()`, so
  an unauthenticated attacker cannot make the Worker buffer a large body. Good.
- **Two-layer validation.** The Worker validates the envelope shape (legacy path)
  and the client re-validates every payload via `parseSessionFile`, so a corrupt
  server value can't poison clients — worst case a bad publish leaves clients on
  their local IndexedDB state until the next valid publish.
- **No server-side decompression.** Storing gzipped bytes verbatim keeps the
  Worker under its 128 MB memory cap and removes a decompression-bomb vector
  *on the server*.
- **KV size cap surfaced as 413**, magic-byte sniff rejects mislabelled bodies,
  `Cache-Control: no-store` on responses.

## Findings

| ID | Severity | Title | Disposition |
|---|---|---|---|
| SEC-1 | Low | Non-constant-time secret comparison (timing side-channel) | **Fixed this PR** |
| SEC-2 | Low | No decompressed-size bound on the client read path (gzip-bomb amplification by a secret-holder) | Accepted v1; documented |
| SEC-3 | Low | No application-level rate limiting on POST | Accepted (high-entropy secret + platform DDoS) |
| SEC-4 | Info | Client-controlled `X-Snapshot-SavedAt` echoed in response | Accepted (cosmetic) |
| SEC-5 | Info | CORS `Access-Control-Allow-Origin: *` | Reviewed — acceptable under header-auth + public-data model |
| SEC-6 | Info | Error messages disclose deployment state | Accepted (operability; nothing sensitive) |
| SEC-7 | Info | Public read + single shared write secret | By design (ADR-016); secret-hygiene note |

### SEC-1 — Non-constant-time secret comparison *(Low — fixed)*
`onRequestPost` compared the presented secret with `presentedSecret !==
env.PUBLISH_SECRET`. JavaScript string `===`/`!==` short-circuits at the first
differing character, so response timing can in principle leak how many leading
characters of a guess are correct, turning a brute-force from exponential to
linear in secret length. Cloudflare's edge + network jitter make this attack
impractical against a Worker, so this is **defense-in-depth**, not a live hole —
but it's a standard hardening and cheap to apply.

**Fix (this PR):** a self-contained `constantTimeEqual(expected, presented)` that
XOR-accumulates over the constant server-side secret length and folds in any
length mismatch, so it never early-exits and its timing is independent of the
attacker-supplied value. Behaviourally identical (same accept/reject); the Worker
file keeps its zero-imports property (no `crypto.subtle` dependency). Two tests
added: a same-length near-miss (`expected` vs `expecteX`) still 401, and the
exact-match positive path writes to KV.

### SEC-2 — gzip-bomb amplification on the client read path *(Low — accepted v1)*
`fetchPublishedSnapshot` defensively peels up to `MAX_DECOMPRESSION_LAYERS` (3)
gzip layers but does not bound the *decompressed* size. The Worker stores ≤25 MB
compressed; a maliciously crafted value could expand enormously, OOM-ing a
reader's browser tab. **Mitigations already in place:** writing requires the
publish secret (single-tenant trust model — the only attacker is someone who has
Alex's secret), and the layer cap bounds iterations. **Why not fixed now:** under
the v1 trust model the publisher is trusted, and real data already legitimately
decompresses to ~375 MB, so any client-side cap must sit above that — a tuning
exercise better done if/when the multi-secret (named-workspace) model lands.
**Future hardening:** add a decompressed-size ceiling (e.g. 600 MB) in the peel
loop. Tracked, not blocking.

### SEC-3 — No application-level rate limiting on POST *(Low — accepted)*
There is no per-IP / per-token throttle. **Why acceptable:** auth is rejected
before the body is read (cheap), the secret is high-entropy so network
brute-force is infeasible, and Cloudflare's platform absorbs volumetric abuse.
Revisit only if abuse is observed or the secret model widens.

### SEC-4 — Client-controlled `X-Snapshot-SavedAt` echoed *(Info)*
On the gzipped path the Worker takes `savedAt` from the client header and echoes
it in the response (defaulting to `now()` if absent). It is **not** persisted —
the authoritative `savedAt` lives inside the gzipped payload and is validated
client-side. Worst case: a malicious publisher makes the "Restored from shared
(saved HH:MM)" banner show a wrong time. Cosmetic; accepted.

### SEC-5 — CORS `Access-Control-Allow-Origin: *` *(Info — acceptable)*
A wildcard origin would be dangerous if auth rode on cookies (CSRF). Here auth is
an **explicit custom header** (`X-Publish-Secret`) that a cross-origin attacker
cannot read from a victim's `localStorage`, and there are no ambient credentials,
so `*` creates no write-CSRF path. Read is public by design. No change.

### SEC-6 — Error messages disclose deployment state *(Info)*
503s name the missing binding/var ("KV namespace not bound", "PUBLISH_SECRET not
configured") and 400s echo parser messages. This is minor configuration-state
disclosure that aids debugging; no secret or snapshot content leaks. Accepted for
operability.

### SEC-7 — Public read + single shared write secret *(Info — by design)*
ADR-016's single-tenant model: one shared snapshot, one shared secret, public
read. Residual risk is **secret leakage** (pasted somewhere, left in a shared
browser's `localStorage`) → anyone can overwrite the shared workspace. **Secret
hygiene:** treat `PUBLISH_SECRET` like a password; if it may have leaked, rotate
it in Pages → Settings → Environment variables (and clear it from any shared
device's localStorage). The named-workspace / per-owner-secret model noted in
ADR-016 and `DECISIONS.md` is the v2 path.

## Recommendations

1. **SEC-1 fix lands this PR.** No further action.
2. **SEC-2 / SEC-3** — track as future hardening; tie to the named-workspace v2
   work, not v1.
3. **Operational:** add "rotate `PUBLISH_SECRET` if leaked" to the
   [Cloudflare runbook](../runbooks/cloudflare-pages-setup.md) when it next gets
   a pass (out of scope for this review's PR).

**Totals:** 1 fixed (SEC-1) • 2 accepted-with-tracking (SEC-2, SEC-3) • 4
informational/by-design (SEC-4–7). No high- or medium-severity findings; the
write path's pre-auth body-read ordering and two-layer validation are solid.
