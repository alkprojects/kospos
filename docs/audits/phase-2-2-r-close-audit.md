# Phase 2.2.r close audit — Session 41

**Date:** 2026-05-28
**Branch:** Multiple feature branches; all squash-merged to main
**Scope:** Phase 2.2.r close audit. Alex's S41 pick was **Option A — Verify Cloudflare cross-device end-to-end**, which turned into a multi-PR sequence as real-data verification surfaced architectural issues that needed fixing in flight. **7 PRs** shipped this session (vs. the Phase 2.2.q baseline of 3 PRs).

The 7 PRs:
- [PR #130](https://github.com/alkprojects/kospos/pull/130) — fix: vite base must be conditional for Cloudflare Pages vs GitHub Pages (blank page on first Cloudflare deploy).
- [PR #131](https://github.com/alkprojects/kospos/pull/131) — chore: gitignore .cloudflare-token/ directory (defensive, after Alex saved an API token in the repo).
- [PR #132](https://github.com/alkprojects/kospos/pull/132) — feat: gzip publish/fetch — unblocks 110K-row real-data publishing (HTTP 413 fix).
- [PR #133](https://github.com/alkprojects/kospos/pull/133) — fix: Worker stops decompressing gzipped POSTs (memory cap blew at 221K rows).
- [PR #134](https://github.com/alkprojects/kospos/pull/134) — fix: publish UX (immediate spinner + stage progress) + defensive cross-device load.
- [PR #135](https://github.com/alkprojects/kospos/pull/135) — fix: empty pagesUrl falls back to relative URL (cross-device actually works in incognito).
- [PR #136](https://github.com/alkprojects/kospos/pull/136) — fix: cross-device load UX — accurate source, spinner, skip 375MB re-parse, yield between phases.

Plus this docs PR (ADR-016 + runbook refresh + audit + S41 SESSION_LOG entry + S42 SESSION_HANDOFF).

Alex's S41 collaboration shape was **interactive throughout** — every PR was triggered by a real failure or UX complaint he hit during the verification walkthrough, not by speculative work. Mid-session he also opted into **autonomous Cloudflare API operations** via a scoped token, which let Claude provision the KV namespace + binding + secret + redeploy directly.

Last audit was the [Phase 2.2.q close audit](phase-2-2-q-close-audit.md) one session prior.

## Methodology

1. Read every file touched in this session's **7 PRs** against the docs that describe them (S41 prompt, [persistence-architecture-options.md](../research/persistence-architecture-options.md), [cloudflare-pages-setup.md](../runbooks/cloudflare-pages-setup.md), the in-PR design comments).
2. Re-run `npm test` — confirms **823 / 823** baseline (was 813 at S40 close + S41 start; +10 net from PR #132's +5 + PR #133's +1 + PR #134's +3 + PR #136's +5 minus PR #135's net 0 minus PR #133's test rewrites = +10).
3. Re-check carry-forward items B–F from the [Phase 2.2.q close audit](phase-2-2-q-close-audit.md); mark each `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR follow-ups

### Seven PRs shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#130](https://github.com/alkprojects/kospos/pull/130) | fix | `vite.config.ts` base conditional on `CF_PAGES`. Blank-page-on-Cloudflare fix. |
| 2 | [#131](https://github.com/alkprojects/kospos/pull/131) | chore | gitignore `.cloudflare-token/` directory. Defensive after API-token workflow. |
| 3 | [#132](https://github.com/alkprojects/kospos/pull/132) | feat | gzip publish/fetch. Unblocks 110K-row real-data publishing past Cloudflare's 100 MB edge cap. +5 tests. |
| 4 | [#133](https://github.com/alkprojects/kospos/pull/133) | fix | Worker stops decompressing gzipped POSTs. Workers' 128 MB memory cap blew at 221K rows. +1 test net. |
| 5 | [#134](https://github.com/alkprojects/kospos/pull/134) | fix | publish UX (spinner + stage progress) + defensive cross-device decompression. +3 tests. |
| 6 | [#135](https://github.com/alkprojects/kospos/pull/135) | fix | empty `pagesUrl` falls back to relative URL. Cross-device actually works in incognito. |
| 7 | [#136](https://github.com/alkprojects/kospos/pull/136) | fix | cross-device load UX. Accurate source text + spinner + skip 375MB re-parse + yield between phases. +5 tests. |

Plus this docs PR (ADR-016 + runbook refresh + audit + S41 SESSION_LOG entry + S42 SESSION_HANDOFF).

### Finding 1 — Real-data verification surfaces real architecture issues

**Status:** stable; first cross-device-verification session.

The S41 pick was "Verify Cloudflare cross-device end-to-end" (Option A from the S41 prompt) — what looked like a runbook walkthrough turned out to be a multi-PR engineering session because the original code shipped in [PR #126](https://github.com/alkprojects/kospos/pull/126) couldn't survive contact with real data:

- **First publish attempt:** 110K rows → blank page on `kospos.pages.dev` (PR #130 fix)
- **Second publish attempt:** HTTP 413 from Cloudflare's edge (PR #132 added gzip)
- **Third publish attempt:** HTTP 400 "Memory limit exceeded before EOF" from Workers' 128 MB cap (PR #133 removed server-side decompression)
- **Successful publish:** worked but UI was unresponsive (PR #134 added spinner + yields)
- **Cross-device load:** silently no-op in incognito (PR #135 added same-origin default)
- **Cross-device load succeeded:** UI was unresponsive + wrong source text (PR #136 fixed all three)

Each failure was caught at the user-visible layer (banner error, blank page, DevTools Network panel) and addressed with a tight, single-purpose PR. Per-PR test count + build status checked before merging. No regressions in the 813 → 823 test count.

**Lesson learned:** "code-only ship + human-side runbook verification" (the S40 A+B combo pattern) is a high-value pattern, but the human-side verification IS NOT optional. Code shipped against mocks does not survive contact with real-data scale + edge behavior. The S41 session is the proof that the runbook + verification step is where the real engineering happens.

**Disposition:** stable; pattern documented in this audit's findings.

### Finding 2 — Cloudflare API token autonomous setup pattern is repeatable

**Status:** stable; first time used.

Alex created a scoped Cloudflare API token (Workers KV Edit + Cloudflare Pages Edit, account-scoped, today-only TTL) and saved it at `.cloudflare-token/claudecftoken.txt`. The session used the token to:

- POST `/accounts/{id}/storage/kv/namespaces` — create the KV namespace
- PATCH `/accounts/{id}/pages/projects/kospos` — add KV binding + `PUBLISH_SECRET` env var
- POST `/accounts/{id}/pages/projects/kospos/deployments` — trigger fresh deploy
- End-to-end test the deployed Worker via `curl` (GET 404 → POST 200 → GET 200 → POST wrong-secret 401)
- Delete test envelopes from KV between sessions

The token cut dashboard-clicking time from ~20 minutes to a few API calls + made every config change reproducible from chat logs. The pattern is documented in the updated runbook as Appendix A. Future Cloudflare-related sessions can use this rather than walking through the dashboard.

**Trade-offs:**
- **Pro:** repeatable, auditable, fast.
- **Pro:** the token file is gitignored from the start (PR #131); no risk of accidental commit.
- **Con:** Alex has to remember to revoke the token after each session.
- **Con:** scope creep risk — a token with broad permissions could do more than intended; tight scoping (only KV + Pages) mitigates.

**Disposition:** stable; new pattern. Filed as Appendix A in the runbook.

### Finding 3 — gzip compression as the unlock for real-data publishing

**Status:** stable; primary architectural addition this session.

The original Cloudflare publish path POSTed raw JSON. Real-world data (110K rows = ~150 MB JSON; 220K rows = ~300 MB JSON; 330K rows = ~400 MB JSON) blew through Cloudflare's edge body cap (100 MB) and Workers KV's value cap (25 MB).

gzip compression solved both — JSON of repetitive labor-data structure gzips 8-15× (375 MB → 8.4 MB observed). Implementation:

- Client `CompressionStream('gzip')` before POST + `Content-Encoding: gzip` header.
- Worker stores gzipped bytes verbatim — NO server-side decompression. The Worker's 128 MB memory cap can't hold a fully decompressed real-data envelope, and DecompressionStream throws "Memory limit exceeded before EOF" mid-stream.
- Envelope validation runs client-side at publish time (`buildSessionFile`) AND at read time (`parseSessionFile`); no server-side validation on the gzip path. Trade-off accepted: a buggy publish corrupts the singleton KV value until the next valid publish overwrites it.
- GET serves the gzipped bytes with `Content-Encoding: gzip`; browser auto-decompresses; `response.json()` returns the envelope.
- Defensive client-side fallback peels up to 3 residual gzip layers in case Cloudflare's edge re-encodes the response.

**Disposition:** stable; codified in [ADR-016](../DECISIONS.md#adr-016--cross-device-persistence-via-cloudflare-pages--workers-kv-gzipped-same-origin-default).

### Finding 4 — Same-origin URL default is what makes "shared workspace" actually work

**Status:** stable; primary correctness fix.

The original publish/fetch client required `pagesUrl` to be set in localStorage. Fresh browsers / incognito windows / never-seen-before devices have empty localStorage by design → `fetchPublishedSnapshot` returned `'not-configured'` → **no network request fired** → cross-device load silently failed for the exact users it was meant to serve.

Diagnosis was a textbook DevTools moment: Network panel filtered for "snapshot" showed zero requests in the incognito window. `localStorage.getItem('kospos.cloudflare.pagesUrl')` returned `null`. The fetch was short-circuiting on the wrong assumption.

Fix: empty `pagesUrl` defaults to relative URL `/api/snapshot`. Browsers resolve relative URLs against the current page origin, so any visitor to `kospos.pages.dev` automatically fetches from the right place. Explicit `pagesUrl` still works for cross-origin cases.

**Disposition:** stable; ADR-016 codifies the same-origin default as architectural.

### Finding 5 — UX work is necessary for real-data scale

**Status:** stable; primary UX investment.

A 375 MB JSON parse + Zustand restore on 330K+ rows blocks the main thread for 5-15 seconds even with all the perf fixes (skip wasteful re-parse, yield between phases). Without any UX feedback the user sees a static blue banner, browser slows, eventually Chrome's "page unresponsive" dialog fires.

PRs #134 + #136 added:
- Immediate status banner display BEFORE heavy sync work starts (yields before `buildCurrentSnapshot` + before `publishSnapshot`)
- Stage-aware text ("Building snapshot from in-memory state…" → "Compressing snapshot for upload…" → "Uploading to Cloudflare…" on publish; "Restoring saved session… (checking this browser + any shared snapshot)" on load)
- Animated SMIL SVG spinner — no CSS keyframes, no external dependency
- `parseSessionFileFromValue` — skip the wasteful `JSON.stringify` → `JSON.parse` round-trip in `validateOnly` on the auto-load path

Alex's confirmation after PR #136 deployed: "ux is ok, proceed."

**Disposition:** stable. Web Worker for the initial `JSON.parse` is the next architectural step if real-world payloads grow further; deferred until UX pain returns.

### Finding 6 — Cache-tier interactions are real

**Status:** stable; documented.

Two cache / edge encoding behaviors observed during S41:

1. **HEAD requests to `/api/snapshot` return `text/html`** — because the Worker doesn't export `onRequestHead`, Cloudflare's static asset handler picks up the HEAD and serves the SPA's `index.html`. Harmless for the GET/POST flow but confusing in DevTools when inspecting headers. Not worth a fix; the GET flow is what the client uses.
2. **GET response body size varies** between curl, Node fetch, and browser fetch — suggests Cloudflare's edge does some response transformation when the response carries `Content-Encoding: gzip`. Browser auto-decompression handles whatever Cloudflare emits transparently; the defensive client-side decompression loop (PR #134) catches any residual layers. The behavior is opaque but bounded.

**Disposition:** stable; both behaviors documented in the runbook + Worker source comments.

### Finding 7 — Per-PR test discipline maintained across 7 PRs

**Status:** stable.

Every PR ran `npm test --run` + `npm run build` before commit. No PR landed with failing tests or build errors. Test count progression:

| PR | Tests added | Cumulative |
|---|---|---|
| S40 close baseline | — | **813** |
| [#125 / #126 / #127 / #128 / #129](https://github.com/alkprojects/kospos/pull/127) (S40 docs + bonus) | -4 (filterRollups removal in #128) | 809 |
| [#130](https://github.com/alkprojects/kospos/pull/130) — vite base conditional | 0 | 809 |
| [#131](https://github.com/alkprojects/kospos/pull/131) — gitignore .cloudflare-token | 0 | 809 |
| [#132](https://github.com/alkprojects/kospos/pull/132) — gzip publish/fetch | +5 | 814 |
| [#133](https://github.com/alkprojects/kospos/pull/133) — Worker skip decompression | +1 net (3 rewrites + 1 new) | 815 |
| [#134](https://github.com/alkprojects/kospos/pull/134) — publish UX + defensive load | +3 | 818 |
| [#135](https://github.com/alkprojects/kospos/pull/135) — relative-URL default | 0 net (2 rewrites) | 818 |
| [#136](https://github.com/alkprojects/kospos/pull/136) — cross-device load UX | +5 | 823 |

**Disposition:** stable; +10 net across the 7 PRs.

### Finding 8 — `npm run build` clean across all 7 PRs

**Status:** stable.

Every PR built clean on first invocation, with two exceptions both caught in-session:

- **TS 5.7 `Uint8Array<ArrayBuffer>` vs `<ArrayBufferLike>` typing** in PR #132 — required 4 `as BodyInit` casts at boundary points (Worker `ungzipToString`, `publishSnapshot` body, two test helpers). Runtime behavior unchanged.
- **Worktree node_modules not carried** to origin repo after PR #130 merged the worktree branch — `npm install` in the origin repo refreshed deps and resolved a `pdfjs-dist` import error that was masking the actual test count.

Streak across the project: 10 of 11 strict-clean / 11 of 11 practical-clean baseline as of S40; both PR #130 + PR #132's TS fix counted as "caught + resolved in-session" (not regressions).

**Disposition:** stable.

### Finding 9 — Cloudflare deploy verification working end-to-end

**Status:** resolved this session — the original "Cloudflare deploy verification gap" carry-forward from S40 audit.

The Phase 2.2.q audit listed "Cloudflare deploy verification gap" as the one explicit gap from the A+B combo split. S41 closed it via:

1. Manual Cloudflare account + Pages project setup (Alex did Steps 1+2 manually; Steps 3-6 + redeploy were API-driven via the token).
2. Real-data publish (331,893 rows / 375 MB JSON / 8.4 MB gzipped) succeeded on the third attempt after 3 architectural fixes (PR #130, #132, #133).
3. Cross-device load in incognito succeeded on the second attempt after the same-origin fix (PR #135).
4. UX polish landed in PR #134 + #136.

The runbook is now refreshed with every gotcha encountered. ADR-016 codifies the as-shipped decision.

**Disposition:** resolved; carry-forward retired.

### Finding 10 — User-driven PR sequence vs upfront design

**Status:** stable; new collaboration pattern.

The S40 session was deliberately unattended ("ask questions up front so I can sleep" → 6 hours autonomous Opus 4.7 work). The S41 session was the opposite — Alex was interactive throughout, watching the publish/load flow in his browser, sending screenshots when something failed, asking targeted follow-ups ("can you do the work on cloudflare autonomously?", "ux is ok, proceed").

Each PR this session was triggered by a specific user-visible failure or complaint:
- "build was successful but page is blank" → PR #130
- "How long should 'Publishing snapshot to Cloudflare…' last?" → PR #134 (UX) + PR #132/133 (size)
- "the incognito window doesn't appear to be loading the data" → PR #135
- "shouldn't say loading from browser right?... my computer slows down" → PR #136

This is a fundamentally different shape from the S40 batched-upfront-decisions pattern. Both are valid; pick based on whether the work is heavily-explorable (S41 — real verification surfaces unknowns) or scoped (S40 — known-shape architecture work).

**Disposition:** stable; both patterns documented as valid.

### Finding 11 — One docs PR consolidating all session-end docs work

**Status:** stable; reaffirmed pattern.

Per the project convention, all docs work (ADR + runbook updates + audit + SESSION_LOG entry + SESSION_HANDOFF) ships as ONE docs PR at session end rather than threaded through the feature PRs. This audit + ADR-016 + runbook refresh + S41 SESSION_LOG entry + S42 SESSION_HANDOFF are this PR.

Benefit: feature PRs stay tightly scoped to their code change; docs PR captures the full session arc. Cost: requires a final docs-only commit at session end, which is exactly what this is.

**Disposition:** stable.

### Finding 12 — `.cloudflare-token/` gitignore as defensive PR

**Status:** stable; lesson learned.

When Alex created the API token, he picked the file location (`.cloudflare-token/claudecftoken.txt`). Before reading the token, the session verified gitignore coverage with `git check-ignore` — it returned exit code 1 (NOT ignored). A stray `git add .` would have committed the secret to the repo.

[PR #131](https://github.com/alkprojects/kospos/pull/131) added `.cloudflare-token/` to `.gitignore` defensively. The token file itself was never staged (verified with `git ls-files` before the rule was added).

**Lesson learned:** when a user-chosen path is used for secrets, always check `git check-ignore` BEFORE reading the file. The verify-then-act pattern is the right shape; never assume gitignore covers what you think it should.

**Disposition:** stable; pattern documented in the runbook + .gitignore.

### Finding 13 — Worker function design refinement: validation-on-client-only

**Status:** stable; trade-off documented.

The original Worker function in [PR #126](https://github.com/alkprojects/kospos/pull/126) validated the envelope shape server-side. PR #132 kept that on the gzipped path (decompress → validate → store). PR #133 removed it (server-side decompression of real data blew the memory cap).

Trade-off: the Worker now stores any client-POSTed bytes that pass the magic-byte sniff + size guard. A buggy client publish corrupts the singleton KV value until the next valid publish overwrites it. Mitigations:
- Client validates twice (at publish time via `buildSessionFile`, at read time via `parseSessionFile`).
- The `parseSessionFileFromValue` helper (PR #136) ensures the validation is fast even on 375 MB envelopes.
- Worst case: a single bad publish corrupts the snapshot until the user re-publishes (which they will, because their next data load will trigger an auto-save followed by an explicit Publish).

**Disposition:** stable; trade-off explicit in Worker source comments + ADR-016.

### Finding 14 — Multiple architectural lessons compressed into ADR-016

**Status:** stable.

[ADR-016](../DECISIONS.md#adr-016--cross-device-persistence-via-cloudflare-pages--workers-kv-gzipped-same-origin-default) is one ADR rather than multiple because the decisions are tightly coupled:

- Cloudflare Pages + KV (vs Vercel / Supabase / Git-based) — high-level architecture
- gzip on the wire AND in storage — required for the Cloudflare-imposed limits
- No server-side decompression — required for the Workers memory cap
- Same-origin URL default — required for the cross-device value prop
- Conditional Vite `base` — required because GH Pages and Cloudflare Pages serve at different roots

Splitting these into 5 ADRs would obscure their interdependence. ADR-016 captures the full decision arc + the alternatives considered + the consequences. Future ADRs may want to update or supersede individual aspects (e.g., "supersede ADR-016 storage layer: KV → R2") rather than splitting.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items from Phase 2.2.q

From [`phase-2-2-q-close-audit.md`](phase-2-2-q-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~3,450 lines after S40 entry | **~3,610 lines after S41 entry (est.)** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence — working as designed | 17th event-based trigger S40 | **18th event-based trigger this session** | working as designed |
| G | Cloudflare deploy verification gap | open S40 | **resolved this session** | **resolved**; ADR-016 codified |

### Item B — SESSION_LOG.md baseline ~3,610 lines after S41 entry

This session adds a multi-PR entry. Estimated ~160 lines for the entry (more than usual because 7 PRs + extensive in-session diagnostic narrative). Total ~3,610.

Bundleable with C + the Tab 24 Improvement #6 holdReason language drift + the OBI serial doc note + the research-doc-location WORKFLOW.md note + the TS-param-property tip. Estimated combined effort: ~2 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 18th event-based trigger fires on schedule

The S41 prompt template (drafted at the end of S40) included the explicit Step-0 audit trigger pattern, which this session honored. The slip from S25 has not recurred across **18 subsequent sessions**.

### Item G — Cloudflare deploy verification — RESOLVED

Phase 2.2.q audit explicitly named this as the one open gap from the A+B combo split. Phase 2.2.r closed it via end-to-end verification + 7 architectural-fix PRs + this audit + ADR-016. Carry-forward retired.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `data_sensitivity.md` — directly relevant: the Cloudflare publish endpoint sends `Access-Control-Allow-Origin: *` for reads, which is acceptable because the data is SF public records.
  - `feedback_session_end.md` — applies to this session's end; this docs PR honors it.
  - `feedback_dont_reremind.md` — Alex's "ux is ok, proceed" is the signal to drop carry-forward items he's acknowledged.
  - `session_logging.md` — S41 entry being added to SESSION_LOG.md.

### Tooling / hooks / settings

- **One new infrastructure dep: none directly.** All new functionality uses Web Streams (CompressionStream / DecompressionStream / TextEncoder) which are native to modern browsers + Node 18+ + Workers runtime.
- **`settings.local.json`** unchanged.
- **`.gitignore`** updated in PR #131 — added `.cloudflare-token/` defensively.
- **`.cloudflare-token/`** directory exists locally + gitignored. Alex revokes the token at session end.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands with a next-session prompt block.

### Anchor compliance

No `labor-report.md` heading-level edits in any of the 7 PRs. Anchor verifier rerun skipped per precedent.

### Tool sprawl

- **4 source files edited in `app/src/lib/session/`** (`cloudflare-publish.ts`, `use-auto-persistence.ts`, `snapshot.ts` extended with `parseSessionFileFromValue`, plus tests).
- **1 Worker file edited** in `app/functions/api/snapshot.ts`.
- **1 UI file edited** in `app/src/modules/importer/SessionExportImport.tsx` (publish UX).
- **1 view file edited** in `app/src/lib/views/landing/LandingView.tsx` (load UX).
- **1 config file edited** in `app/vite.config.ts` (conditional base).
- **1 HTML file edited** in `app/index.html` (favicon path).
- **No new directories.** All changes in existing dirs.
- **`filterRollups` export** — resolved in S40 PR #128 per the S40 audit; this S41 session didn't touch it. Stays resolved.

### Doc-vs-implementation

- **`docs/research/persistence-architecture-options.md`** — still accurate; the implementation matches Option α with the S41 architectural refinements (gzip, no-server-decomp, same-origin default) now documented in ADR-016.
- **`docs/DECISIONS.md`** — **ADR-016 added this session** (Phase 2.4 ADR queue: 6 → 5 because the Cloudflare-Pages-+-KV ADR is now shipped). The remaining 5 Phase 2.4 ADRs stay queued.
- **`docs/runbooks/cloudflare-pages-setup.md`** — **substantial refresh this session** with all S41 gotchas, the API-token automation appendix, and the conditional Vite base note.
- **`docs/data-sources/`** — no changes.

### New drift items

- **R2 migration as a known future need** — KV's 25 MB cap is reachable; if Alex's dataset grows another 3× the snapshot will exceed it even compressed. Filed in the runbook's "Future work" section + as a Phase 2.2.s+ candidate.
- **Web Worker for `JSON.parse`** — would eliminate the 5-15 second main-thread block on real-data restore. Filed as a Phase 2.2.s+ candidate; the S41 UX work makes it not-urgent.
- **Cloudflare API token automation pattern** — documented in runbook Appendix A. Reusable for any future Cloudflare config session.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | Workflow | Real-data verification surfaces real architecture issues (7-PR sequence) | stable (new pattern documented) |
| 2 | Workflow | Cloudflare API token autonomous setup pattern | stable (new; runbook Appendix A) |
| 3 | Architecture | gzip compression as the unlock for real-data publishing | stable (ADR-016) |
| 4 | Architecture | Same-origin URL default makes "shared workspace" actually work | stable (ADR-016) |
| 5 | UX | Spinner + stage progress + in-place validation for real-data scale | stable |
| 6 | Edge | Cache-tier interactions documented (HEAD fallback, response re-encoding) | stable |
| 7 | Tests | 823/823 (+10 net across 7 PRs) | stable |
| 8 | Build | `npm run build` clean across all 7 PRs (TS 5.7 cast + worktree-deps fixes in-session) | stable |
| 9 | Carry-forward G | Cloudflare deploy verification gap resolved | **resolved** |
| 10 | Workflow | User-driven PR sequence vs upfront design (both valid patterns) | stable |
| 11 | Workflow | One docs PR consolidating all session-end docs work | stable (reaffirmed) |
| 12 | Security | `.cloudflare-token/` gitignore as defensive PR | stable (lesson: verify gitignore before reading user-chosen secret path) |
| 13 | Worker design | Validation-on-client-only trade-off documented | stable |
| 14 | Decision log | ADR-016 captures coupled decisions as one ADR | stable |
| 15 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 16 | Carry-forward B | SESSION_LOG.md ~3,610 lines after S41 entry (est.) | tracking — still queued |
| 17 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 18 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 19 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 20 | Carry-forward F | Audit cadence working as designed (18th event-based trigger) | working as designed |
| 21 | New drift — memory | 10 files indexed; links resolve | stable |
| 22 | New drift — hooks/settings | `.cloudflare-token/` gitignore added; no new deps | stable |
| 23 | New drift — anchors | No heading edits this phase | stable |
| 24 | New drift — tool sprawl | 4 lib/session edits + 1 Worker + 2 UI/view + 2 config; no new dirs | stable |
| 25 | New drift — doc-vs-impl | ADR-016 added; runbook refreshed | resolved (this PR) |
| 26 | Future work | R2 migration filed if snapshot exceeds 25 MB compressed | tracking |
| 27 | Future work | Web Worker for JSON.parse filed | tracking |

**Totals:** 2 carry-forwards resolved this session (G — Cloudflare deploy verification gap + the doc-vs-impl gap on the runbook) · 3 carry-forwards unchanged (B, C, D) · 2 stays-dropped (A, E) · 1 working-as-designed (F) · 14 stable findings · 0 new follow-up PRs beyond R2/Worker tracking · 1 docs PR (this one).

---

## Recommendations not actioned

In priority order:

1. **Alex revokes the Cloudflare API token** — Cloudflare → My Profile → API Tokens. Token's TTL is end-of-day so it'll auto-expire even if forgotten, but explicit revoke is cleaner.
2. **Cross-tab nav from Eligibility → Positions** (carries from S39+S40) — the original S41 "Recommended Option C" that the verification-first pick bumped. Still the unlock for promoting Eligibility + Probation tabs to non-dev. ~1-2 hours. Probable S42 pick.
3. **Cutover from GitHub Pages → Cloudflare Pages** (Step 10 of the runbook) — Alex's S40 design pick was "redirect immediately." ~1-2 hours; bundleable with cross-tab nav PR or filed standalone.
4. **Lift modal overlay-frame to `lib/ui/Modal.tsx`** (carries) — 5th instance of the same fixed-overlay-no-Portal pattern. ~1-2 hours.
5. **Schedule SESSION_LOG.md trim** (item B) — ~3,610 lines after S41; bundleable with item C + Tab 24 Improvement #6 holdReason language update + OBI serial doc note + research-doc-location WORKFLOW.md note + TS-param-property tip. ~2 hours combined.
6. **Migrate the citation anti-pattern** (item C) — 12 instances; ~20 minutes.
7. **Defer `labor-report.md` split until Phase 2.4** (item D) — no change.
8. **Switch `computeListExpiration` to calendar arithmetic** — eliminates the leap-year 1-day drift (carries from S37). Low priority; defer until UX-relevant.
9. **Named workspaces** (`?workspace=`) for the Cloudflare publish endpoint — Phase 2.2.s+ candidate. ~3-4 hours including the UI for naming + switching.
10. **R2 migration** if snapshot exceeds 25 MB compressed — not yet, but tracking.
11. **Web Worker for `JSON.parse`** — tracking; defer until UX pain returns.
12. **Local-branch cleanup** (low priority) — many stale `docs/*` + `claude/*` + `feat/*` + `fix/*` branches from this session; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-q-close-audit.md](phase-2-2-q-close-audit.md) (Session 40).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.r implementation: [PR #130](https://github.com/alkprojects/kospos/pull/130) (vite base) + [PR #131](https://github.com/alkprojects/kospos/pull/131) (gitignore) + [PR #132](https://github.com/alkprojects/kospos/pull/132) (gzip) + [PR #133](https://github.com/alkprojects/kospos/pull/133) (no-decomp) + [PR #134](https://github.com/alkprojects/kospos/pull/134) (publish UX) + [PR #135](https://github.com/alkprojects/kospos/pull/135) (same-origin) + [PR #136](https://github.com/alkprojects/kospos/pull/136) (load UX).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2 sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
- Architecture decision: [ADR-016](../DECISIONS.md#adr-016--cross-device-persistence-via-cloudflare-pages--workers-kv-gzipped-same-origin-default).
- Architecture research: [persistence-architecture-options.md § Option α](../research/persistence-architecture-options.md#option-α--cloudflare-pages--workers-kv--recommended).
- Setup runbook (refreshed): [cloudflare-pages-setup.md](../runbooks/cloudflare-pages-setup.md).
