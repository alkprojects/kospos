# Decision Log

Append-only. Newest at top. Format inspired by Architecture Decision Records (ADRs).

Each entry: what we decided, the context, what we considered instead, and the consequences (good and bad). When a decision is reversed, do not delete it — add a new entry referencing the prior one.

---

## ADR-017 — Lightened per-session ceremony; full close audits only at milestones

**Date:** 2026-05-30
**Status:** Accepted (decided Session 53 by Alex during the S53 deep project-state audit)

**Context:** From Phase 2.0 onward, every sub-phase — even a read-only docs sub-tab — triggered the full close-out ritual: a `docs/audits/phase-2-2-*-close-audit.md`, a SESSION_LOG entry with brief-audit + lessons subsections, and a SESSION_HANDOFF rewrite. By S53 that was 28 close-audit events across 35 audit docs. The S53 audit found the ritual had outgrown the change size (a full close audit for the read-only Calendar sub-tab), generated "deferral debt" (the SESSION_LOG-trim and labor-report-split items deferred 10 sessions running), and — while the heavy artifacts were dutifully produced — the **Session 52 SESSION_LOG entry was silently skipped** (PR #177's message claimed it; git shows it never landed). The ceremony was consuming attention without proportional value.

**Decision:** Lighten the per-session ceremony. Concretely:

- **Full close audit** (the grading-lens `docs/audits/…` doc) fires **only at meaningful milestones**: a new user-facing feature surface, an architectural / persistence change, a phase boundary, or a freeform bug/UX session with non-trivial findings. It does **not** fire for docs-only PRs, pure mechanical refactors, single-comment/typo fixes, or small behavior-neutral cleanups.
- **SESSION_LOG.md** always gets a **short** entry every session (what shipped + PR #s + test delta, ~1 paragraph). The heavy "brief audit / lessons" subsections are reserved for milestone sessions. A floor of one short entry is mandatory — never zero (the S52 miss is the failure mode this guards against).
- **SESSION_HANDOFF.md** is always updated (status + carry-forwards) and **always ends with the copyable next-session prompt rendered verbatim in the chat** — non-negotiable, Alex's explicit S53 caveat. (Memory `feedback-session-end` / `feedback-handoff-paste-prompt-inline`; the PR #51 Stop hook; CLAUDE.md shutdown step 4. This is the one bit of ceremony that is never trimmed.)
- **Unchanged non-negotiables:** one logical change per PR, `npm test` green, `npm run build` before app PRs, branch from `origin/main` → squash-merge → fast-forward `main` → sync the main worktree.

**Alternatives considered:**

1. **Keep the full ritual every PR** — rejected: overhead outgrew change size, bred deferral debt, and still produced a missed log; the cost wasn't buying proportional quality.
2. **Drop close audits entirely** — rejected: the hiring-screen grading lens is genuinely valuable at milestones; it is the project's self-evaluation mechanism (memory `session-logging`).
3. **Lighten without codifying** — rejected by Alex: undocumented conventions drift (this is exactly how the effort-level-vs-fast-mode and the "audit every sub-phase" conventions drifted unnoticed). Writing it down is the point.

**Consequences:**

- `docs/audits/` stops growing ~1 file per PR; audit docs become milestone markers, not per-PR receipts.
- A "is this a milestone?" judgment call is now required each session; when genuinely unsure, err toward writing the audit.
- The copyable prompt + a short SESSION_LOG entry are the permanent floors — lightening never reaches zero.
- Supersedes the implicit "audit every sub-phase" practice; carry-forward **F (audit cadence)** is now governed by this ADR. Complements ADR-008 (handoff convention), which is unchanged.

**See also:** ADR-008 (session handoff convention); memory `session-logging`, `feedback-session-end`; the S53 audit (logged in SESSION_LOG.md).

---

## ADR-016 — Cross-device persistence via Cloudflare Pages + Workers KV (gzipped, same-origin default)

**Date:** 2026-05-28
**Status:** Accepted (designed Session 39 via [persistence-architecture-options.md § Option α](research/persistence-architecture-options.md#option-α--cloudflare-pages--workers-kv--recommended), code-shipped Session 40, verified end-to-end on real 331,893-row data Session 41)

**Context:** KosPos data already persists per-browser via IndexedDB (Phase 2.2.q PR 1). The "shared workspace" promise — Alex publishing from one device, opening on another — needed a tiny backend. The S39 research doc evaluated four options (Cloudflare Pages + KV, Vercel + KV, GitHub Pages + data-branch commits, Supabase) on cost, latency, free-tier headroom, auth-UX, migration risk, and v2/v3 paths. Cloudflare Pages + Workers KV won on every axis except minor (Vercel ties on convenience).

Implementation hit two hard limits when real-data publish was attempted in Session 41:

1. **Cloudflare's 100 MB inbound request-body cap at the edge** — Alex's 110K-row dataset serialized to ~150 MB JSON, rejected with HTTP 413 before the Worker ran.
2. **Workers KV's 25 MB value cap per key** — even if the body reached the Worker, the `put()` would have failed.

Resolution: client-side gzip (`CompressionStream`) before POST + Worker stores the gzipped bytes verbatim in KV. JSON compresses 8-15× on this dataset (375 MB → 8.4 MB observed). A subsequent attempt with 221K rows tripped a third limit — Cloudflare Workers' **128 MB memory cap** during server-side decompression — fixed by removing server-side decompression entirely (the Worker now stores the bytes without parsing; envelope validation stays on the client where it already runs twice: at publish time and at read time).

Cross-device load also needed a same-origin default: the original implementation required an explicit `pagesUrl` in localStorage, which blocked every fresh browser / incognito window from ever fetching (empty localStorage → fetch short-circuits with `not-configured`). Now an empty `pagesUrl` falls back to relative URL `/api/snapshot` — any visitor to the deployment fetches from the right place with zero per-device config.

**Decision:** Cross-device persistence runs on **Cloudflare Pages + Workers KV**, configured as:

- **Pages project** auto-builds from `main` push (root directory `app`, Vite preset, output `dist`, Node 24). The `vite.config.ts` `base` is `process.env.CF_PAGES ? '/' : '/kospos/'` so the same source serves both GitHub Pages (subpath) and Cloudflare Pages (root).
- **KV namespace `KOSPOS_SNAPSHOTS`** bound at the Pages-project level. Singleton key `current` holds the gzipped snapshot bytes — one shared workspace per deployment in v1; named workspaces (`?workspace=<id>`) are the v2+ path.
- **Worker function** at `app/functions/api/snapshot.ts` exposes `GET /api/snapshot` (public read, response carries `Content-Encoding: gzip` so browsers auto-decompress) and `POST /api/snapshot` (gated by `X-Publish-Secret` header matching the `PUBLISH_SECRET` env var). POST accepts gzipped bytes (`Content-Encoding: gzip`) with `X-Snapshot-SavedAt` header carrying the timestamp for response echo.
- **Client helpers** at `app/src/lib/session/cloudflare-publish.ts`. `publishSnapshot` gzips JSON before POST; `fetchPublishedSnapshot` defensively peels up to 3 residual gzip layers (insurance against CDN re-encoding) and reads as ArrayBuffer (not `response.json()`) to handle any edge encoding behavior. Both use relative URL when `pagesUrl` is empty.
- **Auto-load hook** (`use-auto-persistence.ts`) reads IDB + Cloudflare in parallel; newer `savedAt` wins. UI banner shows stage progress with an SMIL-animated spinner so the user has visible motion during the 5-15-second restore on a real-data envelope.

**Alternatives considered (per [persistence-architecture-options.md](research/persistence-architecture-options.md)):**

1. **Vercel + KV** — same architectural shape, tighter free-tier limits (30K KV reads/day vs Cloudflare's 100K), Vercel narrowed their free tier in Spring 2025. Rejected as objectively worse on the same axes.
2. **GitHub Pages + data-branch commits** — no new host, but publish latency is 30-60s vs Cloudflare's ~100ms; PAT management is painful; commit-blob churn would balloon the `data` branch within months. Rejected.
3. **Supabase** — full Postgres + Auth + RLS. Overkill for v1 (no multi-user editing); the right call when Phase 7+ wants per-row audit across users.
4. **Server-side gzip decompression for validation** — initially tried in [PR #132](https://github.com/alkprojects/kospos/pull/132); blew Workers' 128 MB memory cap on real data ([PR #133](https://github.com/alkprojects/kospos/pull/133) removed it). The client-twice validation (publish + read) is sufficient and architecturally simpler.
5. **Explicit `pagesUrl` required for read** — original [PR #126](https://github.com/alkprojects/kospos/pull/126) shape; blocked the entire cross-device value prop because incognito / fresh browsers have empty localStorage. [PR #135](https://github.com/alkprojects/kospos/pull/135) fell back to same-origin relative URL.

**Consequences:**

- **Free tier covers KosPos by ~1000×.** 100K KV reads/day, 1K writes/day, 1 GB storage on the free Cloudflare tier; KosPos's actual load is a handful of reads per device-open + a handful of writes per work-session.
- **Anyone with the URL can read.** Acceptable because the data is SF public-employee public records (see [memory `data_sensitivity.md`]). Tightening would mean adding a read secret + a "share with key" UX — premature.
- **Only publish-secret holders can write.** v1's single-tenant write model. v2 (named workspaces) would let each owner have their own secret + URL key.
- **Browser memory pressure on read.** A 375 MB JSON parse + Zustand restore on a 330K-row envelope is slow (~5-15 seconds) and visible to the user. Mitigations shipped Session 41: yields between phases, in-place validation (no stringify→parse round-trip), animated spinner with stage text. A Web Worker for the initial `JSON.parse` is the next step if real-world payloads grow further.
- **GitHub Pages stays alive in parallel** — not yet redirected. Cutover work is filed as a Phase 2.2.s+ follow-up. The conditional `vite.config.ts` `base` already produces correct builds for both hosts.
- **`docs/runbooks/cloudflare-pages-setup.md` is the canonical setup procedure** for a fresh Cloudflare account through to verified cross-device publish. Includes lessons from this session: direct-URL Pages-create flow (dashboard reorg hid the path), "React (Vite)" framework preset label, Root directory + Build output under `(advanced)` expanders, conditional Vite `base`, gzip compression, server-side memory cap, same-origin default, optional API-token automation for future autonomous sessions.

**See also:** [persistence-architecture-options.md](research/persistence-architecture-options.md) (S39 design); [cloudflare-pages-setup.md](runbooks/cloudflare-pages-setup.md) (setup procedure); [phase-2-2-q-close-audit.md](audits/phase-2-2-q-close-audit.md) (S40 code-only ship); [phase-2-2-r-close-audit.md](audits/phase-2-2-r-close-audit.md) (S41 verification + 7 follow-up PRs); PRs [#125](https://github.com/alkprojects/kospos/pull/125), [#126](https://github.com/alkprojects/kospos/pull/126), [#130](https://github.com/alkprojects/kospos/pull/130), [#131](https://github.com/alkprojects/kospos/pull/131), [#132](https://github.com/alkprojects/kospos/pull/132), [#133](https://github.com/alkprojects/kospos/pull/133), [#134](https://github.com/alkprojects/kospos/pull/134), [#135](https://github.com/alkprojects/kospos/pull/135), [#136](https://github.com/alkprojects/kospos/pull/136).

---

## ADR-015 — BVA is a distinct PS Financials data source, separate from BFM

**Date:** 2026-05-25
**Status:** Accepted (decided Session 16 + post-Session-16 interlude; ratified at Session 19 audit)

**Context:** The Session 16 Report Data walkthrough surfaced that DBI's mid-year DBI→CPC transfer-of-function uses KK budget journals and GL actuals journals to move budget and actuals between departments. **These journals carry only chartfield-string detail — no Position Number attribution.** The position-aware Report Data has no way to capture them; the MERGE row 753 + GL placeholder 762 in the workbook are stop-gaps.

Alex provided the BVA (Budget vs Actuals) sample export in the post-S16 interlude (`BvA - All Fields - Version 10.20.25 (42).csv`). The BVA is sourced from PS Financials via OBI — it carries every budget+actuals line at chartfield grain. It is **not** part of BFM (which is the budget-system feed for the eturns). BVA captures KK + GL journal movements that BFM and BI Payroll miss.

Original ADR-007 (OBI BI Payroll importer) treats OBI as a single labor data source. ADR-005 (BFM Non-Position eturn) treats BFM as the budget source. Neither captures the BVA pattern.

**Decision:** `docs/data-sources/bva.md` is the canonical reference for the BVA report. It is treated as a distinct data source — separate importer, separate refresh cadence (Wednesday-or-later after payroll posts to GL), distinct from both BFM and the existing OBI BI Payroll importer.

The KosPos reconciliation pattern (per Session 17 Task B):

- **BVA `Revised - eturn Board`** = KK budget adjustments
- **BVA `GL Actuals - BI Payroll YTD (excl. inactives)`** = GL adjustments

Reconciliations run at chartfield grain, not position grain. Position-aware Report Data + chartfield-aware BVA reconciliation together cover the full picture.

**Alternatives considered:**

1. **Treat BVA as a sub-section of BFM** — they share some lineage (both ultimately reach PS Financials' budget tables) but differ in granularity, refresh cadence, and what they capture. Rejected as confusing.
2. **Extend the existing OBI BI Payroll importer to also handle BVA** — BVA is a separate OBI report. Closer to its own data source than an extension of an existing one. Rejected.
3. **Defer the question to Phase 2.4 importer wiring** — Alex provided the file mid-Session-16; documenting now (Session 16 interlude) gives Phase 2.4 a head start. Rejected the deferral.

**Consequences:**

- New data-source doc `docs/data-sources/bva.md` (landed in PR #40, post-Session-16 interlude).
- Phase 2.4 BVA importer scoped explicitly.
- ADR-007 amendment (BI Payroll importer) may follow during Phase 2.4 to clarify it does NOT cover BVA.
- Reconciliation suite at [audits/bva-reconciliation-suite.md](audits/bva-reconciliation-suite.md) verifies the BVA reconciliation patterns against real DBI+CPC data.
- Future tabs that need chartfield-grain budget actuals (vs position-grain) pull from BVA, not BFM.

**See also:** [PR #40](https://github.com/alkprojects/kospos/pull/40); [audits/bva-reconciliation-suite.md](audits/bva-reconciliation-suite.md); [labor-report.md Tab 20](domain/labor-report.md#tab-20--report-data).

---

## ADR-014 — Anchor-link convention uses github-slugger occurrence-index for duplicate headings

**Date:** 2026-05-25
**Status:** Accepted (decided Session 17 Task D / PR #45; ratified at Session 19 audit)

**Context:** GitHub renders Markdown headings as anchors via github-slugger. When a heading appears multiple times in the same file (e.g., the per-tab template's nine `#### KosPos improvements` headings in `labor-report.md`), github-slugger appends a 0-indexed occurrence count suffix:

- 1st occurrence: `kospos-improvements` (no suffix)
- 2nd occurrence: `kospos-improvements-1`
- 3rd occurrence: `kospos-improvements-2`
- ...

Prior to PR #45 (Session 17 Task D), intra-file anchor links used an *ad-hoc* "tab number" suffix (e.g., `#kospos-improvements-7` was meant to point to Tab 7's improvements heading). This was always broken — github-slugger doesn't number by tab; it numbers by occurrence order in the file. The audit script in PR #45 found 13 broken anchors.

**Decision:** All anchor links across `docs/` use the **github-slugger occurrence-index** convention. When a duplicate heading appears, the link suffix matches the heading's 0-indexed occurrence count, not a tab number, section number, or other ad-hoc index.

When a new tab walkthrough is added that introduces another instance of a duplicate heading, ALL subsequent occurrence-indices shift by +1, and existing intra-file references to those headings must be migrated. Example: Phase 2.0g adds Tabs 23/24/25 — three new `#### KosPos improvements` headings — shifting Tab 26's slug from `-7` to `-10` and Tab 27's from `-8` to `-11`. The migration list is baked into each session's prompt (see SESSION_HANDOFF.md Phase 2.0g prompt for the carry-forward).

**Alternatives considered:**

1. **Use unique headings per tab** (e.g., `#### KosPos improvements (Tab 7)` instead of just `#### KosPos improvements`) — would eliminate the slug-shift problem at the cost of cluttered headings throughout the doc. Rejected as cosmetic.
2. **Use HTML anchor tags** (`<a id="custom-anchor">`) — bypasses github-slugger entirely. Rejected because GitHub's Markdown rendering quirks make HTML-in-Markdown brittle.
3. **Don't use intra-file anchors; reference tabs by full file path + heading text** — verbose. Rejected.

**Consequences:**

- Every PR that adds a tab walkthrough must audit & migrate downstream anchor references to duplicate headings.
- The verifier script style from PR #45 (extract every heading → compute github-slugger slug → check every intra-file `](#...)` link resolves) should be re-run after each new walkthrough. Convention documented in [labor-report-walkthrough-audit.md](audits/labor-report-walkthrough-audit.md).
- Session 19 audit confirmed compliance across `docs/` post-Phase-2.0f.
- Future tab walkthroughs (Phase 2.0g, 2.0h) carry the migration step explicitly in their session prompts.

**See also:** [PR #45](https://github.com/alkprojects/kospos/pull/45); [labor-report-walkthrough-audit.md](audits/labor-report-walkthrough-audit.md); [Session 19 audit § Area E](audits/internal-claude-setup-audit.md#area-e--file--repo-organization).

---

## ADR-013 — Stop hook enforces copyable next-session prompt

**Date:** 2026-05-25
**Status:** Accepted (landed Session 18 / PR #51)

**Context:** The end-of-session protocol requires Claude to paste the next-session prompt as a copyable triple-backtick fenced block at the end of the final response (so Alex can copy it without opening a file). This was set up as a memory rule in Session 4 + S6 + S7. The rule was missed three times before the memory rule shipped, and at least twice more after. Memory-only enforcement is fragile.

**Decision:** Install a Claude Code Stop hook (`.claude/hooks/check-session-end-prompt.py`) that:

1. Triggers ONLY when this session modified `docs/SESSION_HANDOFF.md` (the canonical signal that the session is wrapping).
2. Scans the session transcript for an `Edit`/`Write`/`MultiEdit`/`NotebookEdit` targeting `docs/SESSION_HANDOFF.md`.
3. Inspects the most recent assistant final reply (text after the last real user turn, excluding tool results).
4. If the touched-handoff condition is true AND the final reply has no triple-backtick fenced block → returns `decision=block` with a reminder telling Claude to paste the prompt.

The hook is registered in `.claude/settings.json` (committed; shared across worktrees) with a 10-second timeout. Personal state (`settings.local.json`, `projects/`) added to `.gitignore` in the same PR.

**Alternatives considered:**

1. **Keep memory-only enforcement, accept the misses** — current state pre-PR-#51. Rejected: memory rules drifted twice; the cost of one Python script is small.
2. **PostToolUse hook on Edit/Write of `SESSION_HANDOFF.md`** — fires too early (the handoff edit happens mid-session, not at the end). Stop hook fires at session end, which is the right moment.
3. **Block on every Stop, not just when handoff was touched** — too noisy; many sessions end without touching the handoff and shouldn't require a prompt.

**Consequences:**

- Reliable enforcement; the rule cannot be silently dropped.
- Minor false-positive risk: a session that touched `SESSION_HANDOFF.md` mid-stream for a typo fix but isn't ending will block on its final reply (observed in Session 19 — required a re-paste). Mitigation candidates for a future revision: scope to the *first* post-handoff-edit final reply only, or require an explicit "session ending" marker in the handoff edit's diff.
- The hook is self-contained (stdlib only, cross-platform); no extra dependencies.
- Future audits (per [Session 19 audit § Area D](audits/internal-claude-setup-audit.md#area-d--hooks--settings)) may add similar hooks for other repeatedly-violated rules — but only when a rule has actually drifted, not preemptively.

**See also:** [PR #51](https://github.com/alkprojects/kospos/pull/51); memory `feedback_session_end.md`.

---

## ADR-012 — Position entity carries a free-text `userNotes` field

**Date:** 2026-05-25
**Status:** Accepted (decided Session 18 Cat 17/18 walkthrough)

**Context:** The labor-report data captures structured fields about each position (Position Number, Job Code, Exempt Category, Expiration Date, etc.) but cannot represent context like:

- "Cat 18 set up for 5-year IS project despite 3-year max per DHR override letter"
- "Cat 17 covering [name] who is expected back PP20"
- "Position on hold pending grant funding decision"
- "Reports-To is intentionally outside the dept because [reason]"

Without a place to capture this, the context dies in someone's email, sticky note, or institutional memory.

**Decision:** The KosPos Position entity carries a free-text `userNotes: string` field.

- Editable inline from the Position Detail view.
- Versioned across snapshots so historical context survives.
- Admin-role-only for view (notes may carry HR-sensitive info).
- Notes always pair with the data-derived quality flags (the flag stays as the trigger; the note explains the human context).

**Alternatives considered:**

1. **Structured note categories** (separate fields for "HR override reason", "expected return date", "funding status", etc.) — premature; the categories aren't known yet. Free-text first; promote to structured if a pattern emerges. Rejected for now.
2. **External notes system** (SharePoint, OneNote, etc.) — fragments context away from the position record. Defeats the point. Rejected.
3. **No field; rely on data flags only** — current state; loses the human-context layer the data can't capture. Rejected.

**Consequences:**

- Every persisted Position record schema includes `userNotes`.
- Position Detail view exposes the field with inline edit; saves on blur or explicit save.
- Snapshot-diff feature (per [Tab 27 walkthrough](domain/labor-report.md#tab-27--operating-report-detail)) shows when notes change between snapshots.
- Schema versioning bump when the field lands (per `docs/CLAUDE.md` Schema version pattern).
- Captured in memory at `feedback_user_notes_per_position.md`.

**See also:** memory `cat_16_17_18_rules.md` — the trigger that surfaced this requirement.

---

## ADR-011 — MCCP positions split from STEPM_C into 9994M_C

**Date:** 2026-05-25
**Status:** Accepted (decided Session 18 Tab 18 walkthrough)

**Context:** Alex's labor-report workbook lumps MCCP (Management Classification and Compensation Plan — range-based, not step-based) positions into the STEPM_C special-class category alongside step-based positions. This is conceptually wrong because MCCP and Step differ in three load-bearing ways:

- **Reference data:** DHR MCCP-range tables vs DHR Steps tables.
- **Account:** 9994 MCCP Offset vs STEPM_C.
- **Projection logic:** step events triggered by anniversary date and step-eligibility rules vs range-based merit increases that may or may not happen.

The Session 18 Tab 18 (Step) walkthrough surfaced this when decoding the workbook's Step tab — MCCP rows appear in the Step pivot but the column logic only fits step-based positions.

**Decision:** KosPos's data model splits MCCP into a dedicated `9994M_C` special-class category. STEPM_C importer filters `is_mccp=false` so MCCP positions don't double-count. A new "9994 MCCP Offset" tab parallel to the Step tab will surface in Phase 2.0h.

**Alternatives considered:**

1. **Keep MCCP+Step lumped in STEPM_C, match workbook** — simplest data-model but propagates the workbook's conceptual error. Rejected.
2. **Display MCCP-and-Step on the same tab, split internally** — possible UI, but the per-position math is genuinely different and conflating them in one view hides the distinction. Rejected for clarity.

**Consequences:**

- Special-class enumeration grows to 8 codes + 9994M_C = 9 active categories (see [special-class.md § The eight special classes](domain/special-class.md)).
- Phase 2.0h walkthrough adds a 9994 MCCP Offset tab walkthrough.
- ADR-006 (PS HCM P&P Data importer column assumptions) may need an `is_mccp` derivation rule when Phase 2.4 importer lands.
- Captured in [Tab 18 walkthrough](domain/labor-report.md#tab-18--step) (improvement #4) and the [STEPM_C walkthrough](domain/special-class.md).

---

## ADR-010 — All KosPos projections are COLA-aware by default

**Date:** 2026-05-25
**Status:** Accepted (originally established Session 13 2026-05-24; reconfirmed Session 18 2026-05-25)

**Context:** Alex's `Labor Report 5.21.26.xlsx` projects different special-class accounts with different math: Overtime / Premium / Retirement Payout use straight-line annualization (`Calendar!J2/I2` — current PP count / total PP count); Step and Report Data use COLA-weighted annualization (`Calendar!N2/M2` — synthetic PP count accounting for the COLA effective date). Initial Calendar walkthrough proposed matching each tab to the workbook's existing pattern as the per-tab default. Alex corrected this in Session 13: the straight-line uses are *shortcuts he takes for simplicity*, not the right math.

**Decision:** Every projection KosPos computes defaults to **COLA-aware**. The COLA-aware number is the authoritative figure for any KosPos report or export. Straight-line projections may be exposed as an optional "simplified view" for parity checks against the existing workbook, but they are never the default and never what KosPos emits as its own answer.

Concretely:

- Every `project()`-style function defaults to applying the COLA schedule across the projection horizon.
- Per-labor-type projection methodology (straight-line vs seasonality vs hire-plan vs lump-sum vs residual) is decided per-tab during walkthrough — but whatever method is chosen, the COLA schedule is applied.
- Per-tab UI may offer a "straight-line view" toggle alongside the primary COLA-aware view.

Alex's worked example (Session 18 reconfirmation): "Year with 26 PPs. Employee salary starts at $1/PP. 100% COLA at PP13. Projected annual salary = $39: 13 PPs × $1 + 13 PPs × $2."

**Alternatives considered:**

1. **Per-tab default = whatever the workbook does for that tab** — would match the source workbook's behavior exactly. Rejected per Alex's S13 correction: the workbook's straight-line uses are shortcuts, not the right answer.
2. **COLA-aware behind a feature flag** — adds complexity without value; the COLA-aware computation collapses to straight-line when COLA doesn't apply, so there's no cost to making it default. Rejected.

**Consequences:**

- The Phase 2.0f Tab 16 (Premium) walkthrough's pure-PP annualization for PREMM needs a fix-up to COLA-aware (carry-forward to Phase 2.0g). Percentage-of-base premiums (e.g., 269 Struct Eng 10.27%, 600 Architect 5%) DO COLA-inflate because their base inflates; the function still returns straight-line numerically when applied to $-amount premiums (e.g., L08 Lead Worker Pay $5).
- All per-tab walkthroughs going forward inherit this default.
- Captured in memory at `feedback_projections_always_cola_aware.md`.

**See also:** [labor-report.md § Calendar tab](domain/labor-report.md#tab-5--calendar) (improvements #2 and #3).

---

## ADR-009 — Roadmap pivot: current-year workspace first

**Date:** 2026-05-24
**Status:** Accepted

**Context:** The original roadmap (Phases 0 → 10, org chart last, "the whole thing comes together at the end") was hard to execute. Deciding which piece to work on and in what order was difficult; the edges of each phase were vague because of cross-phase data and knowledge dependencies. Sessions 9–11 shipped solid RPO + OVERM math + UI for budget development, but the value wasn't visible to the real users (department admins) because the surrounding pieces weren't there.

**Decision:** Reframe the project as a sequence of self-contained workspaces, starting with the **current-year workspace** — a recreated-and-improved version of `Labor Report 5.21.26.xlsx`. Every tab of that workbook becomes a corresponding KosPos page; KosPos also produces an improved Excel export so users keep the workbook-as-deliverable habit while moving the analysis into the app.

The RPO + OVERM work from Sessions 9–11 is **kept in code (`app/src/lib/special-class/` + `app/src/modules/special-class/`) but route-guarded out of the app shell** until the budget-development phase (now Phase 6). A `?budget=1` query escape hatch preserves developer access.

**Alternatives considered:**

1. **Continue the original phase order** (PREMM next, then STEPM, then 9993, etc.) — would have produced a complete budget-development module before any current-year value shipped. Rejected: too long before real users see something useful.
2. **Pause everything; do a single end-to-end vertical slice** (one position from import → org chart → report) — too thin to be useful; would still defer the labor-report workbook replacement.
3. **Drop the budget-development work entirely** — wastes Sessions 9–11. Hiding the UI but keeping the code is cheaper and preserves the option to re-expose.

**Consequences:**

- Each sub-phase under Phase 2 (Current-Year Workspace) is small and shippable.
- Department admins start seeing value within a few sessions instead of waiting for "the whole thing."
- The importer work becomes demand-driven (each labor-report tab pulls the importers it needs) instead of speculative.
- The budget-development UI being hidden for now means Alex's existing workbook stays the source for budget-dev tasks; KosPos's budget-dev value re-emerges in Phase 6.
- Data-source strategy is now explicit: until SF's Snowflake migration lands (timeline unclear, treated as "a ways off"), every update is a user-uploaded source file; some enhancements may require website scraping.

**See also:** [`docs/ROADMAP.md`](ROADMAP.md) for the revised phase order; [`docs/domain/labor-report.md`](domain/labor-report.md) is the deep-dive deliverable that opens Phase 2.

---

## ADR-008 — Session handoff convention: SESSION_HANDOFF.md

**Date:** 2026-05-23
**Status:** Accepted

**Context:** Each Claude session was re-deriving context from scratch. End-of-session prompts were written manually and sometimes lost.

**Decision:** Maintain `docs/SESSION_HANDOFF.md` as a machine-updated file. Every session reads it on startup and overwrites it on shutdown with the next prompt, recommended model, branch state, and any blockers. Added mandatory startup/shutdown sequences to `docs/CLAUDE.md`.

**Alternatives considered:** A Cron-scheduled remote agent — overkill for a single-user project where Alex manually starts each session.

**Consequences:** Sessions self-configure without Alex needing to remember context. The file becomes the source of truth for "where we left off."

---

## ADR-007 — OBI BI Payroll importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** The `docs/data-sources/obi.md` doc does not specify exact column names. OBI is also migrating to Snowflake.

**Decision:** Implemented the importer using these assumed column names: `Department Code`, `Department Name`, `Position Number`, `Empl ID`, `Employee Name`, `Job Code`, `Account Code`, `Fund`, `Authority`, `YTD Salary`, `YTD Benefits`, `YTD Total`, `Fiscal Year`, `Report Period`. Importer is header-driven (sniffs by lowercase match), so a column rename only requires updating the fingerprint and the `col()` lookup — not a rewrite.

**Consequences:** If real column names differ, Alex updates the fingerprint strings in `detect.ts` and the `col()` lookups in `obi-payroll.ts`. No structural change needed.

---

## ADR-006 — PS HCM P&P Data importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** The P&P report is described as "88 columns" in the data-source doc but exact names are not listed.

**Decision:** Implemented against this assumed column set (the fields KosPos actually uses): `Position Number`, `Job Code`, `Job Code Description`, `Department Code`, `Department Name`, `Position Status`, `Empl ID`, `Employee Name`, `Appointment Type`, `Salary Step`, `Salary Amount`, `Reports To Position`, `RTF Status`, `RTF Expected Fill Date`, `FTE`, `Union Code`. Remaining ~72 columns are ignored.

**Consequences:** Same as ADR-007 — header-driven, column renames are isolated changes.

---

## ADR-005 — BFM Non-Position eturn importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** `docs/data-sources/bfm.md` describes the non-position eturn as "all budget dollar data for all accounts including labor (as totals, no position detail)" but doesn't list columns.

**Decision:** Assumed columns: `Department Code`, `Department Name`, `Account Code`, `Account Description`, `Fund`, `Authority`, `Budget Amount`, `Fiscal Year`.

**Consequences:** Same as ADR-007.

---

## ADR-004 — BFM Position eturn importer column assumptions

**Date:** 2026-05-23
**Status:** Provisional — awaiting Alex's confirmation against a real export

**Context:** `docs/data-sources/bfm.md` describes the position eturn as "Position details only (FTE, job class)" but doesn't list column names.

**Decision:** Assumed columns: `Department Code`, `Department Name`, `Position Number`, `Job Code`, `Job Code Description`, `Position Status`, `FTE`, `Budgeted Salary`, `Fund`, `Authority`, `Fiscal Year`.

**Consequences:** Same as ADR-007.

---

## ADR-002-update — xlsx CDN swap deferred to Phase 2 completion

**Date:** 2026-05-23
**Status:** Deferred

**Context:** ADR-002 called for switching to the SheetJS CDN build when Phase 2 parsing began. The swap was attempted but blocked by the Claude Code auto-mode security classifier (installing from an external URL requires explicit user authorization).

**Decision:** Continue using the npm `xlsx@0.18.5` package for Phase 2. Alex should run `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` manually in `app/` when convenient, or authorize the action in the next session.

**Consequences:** `npm audit` will continue to report the two known advisories (prototype pollution, ReDoS). Acceptable for a local-only tool with no user-supplied untrusted Excel files. Revisit before any public deployment.

---

## ADR-003 — Data quality + change tracking are cross-cutting, not their own phase

**Date:** 2026-05-22
**Status:** Accepted

**Context:** Labor data is always changing and often has errors. Two questions: where do anomaly checks live, and how does the app communicate fixes to upstream systems?

**Decisions:**

**Anomaly detection** lives in `app/src/lib/quality/`, one rule per file, with a common interface. Every imported dataset is run through the active rule set. Output goes into a global "Data Issues" panel and into per-module badges.

**Change tracking** lives in `app/src/lib/changes/`. When the user toggles **Change Mode** in any module, every edit produces a `ProposedChange` record rather than mutating data directly. The Change List is reviewable and discardable. "Generate Change Report" outputs Excel/PDF grouped by system-of-record (PS HCM, BFM, PS Financials), telling the appropriate clerical owner what to update.

**The app never writes back to source systems.** Write-back is reserved for Phase 11+, behind auth.

**Why both as cross-cutting:**

- A single "Phase 4 - data quality" attempt would mean other modules wait to flag issues until much later.
- Change Mode is the mechanism by which the org chart's drag-to-reorganize produces a `Reports To` update report. Building Change Mode in the org-chart-only phase would mean every other module misses out on the same idea.

**Consequences:**

- Every phase from 2 onward adds rules to `quality/` and Change Mode capabilities to its module.
- The lift in Phase 2 includes building the rule + change-tracking scaffolding even though only basic referential-integrity rules ship there.

---

## ADR-002 — `xlsx` from npm has an open audit warning; ship anyway in v1, revisit in Phase 2

**Date:** 2026-05-22
**Status:** Accepted

**Context:** `npm install xlsx` brings in a version with two open advisories (prototype pollution, ReDoS). SheetJS publishes fixes on their own CDN but not to npm. Phase 0 has no parsing yet, so the dependency is dead code on the production page right now.

**Decision:** Accept the warning for Phase 0–1. In Phase 2 (when we first parse Excel), switch to the CDN install:

```sh
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

…and record an ADR-update.

**Alternatives considered:**

- `exceljs` — actively maintained, but the API is more complex and the SF labor reports are simple enough that SheetJS suffices.
- `papaparse` — CSV-only; the canonical reports are `.xlsx`.

**Consequences:**

- `npm audit` will report 1 high-severity finding during Phase 0/1. This is known.
- Phase 2 must verify the CDN install and re-run `npm audit`.

---

## ADR-001 — Stack and structure for KosPos

**Date:** 2026-05-22
**Status:** Accepted

**Context:** Building a new position-management web app. Need to pick a stack, hosting, and persistence model that a beginner Claude user can maintain and that scales toward eventual citywide use.

**Decisions:**

| Concern | Choice |
|---|---|
| **Frontend** | Vite + React + TypeScript |
| **Diagramming (Phase 10)** | `@xyflow/react` (React Flow) + `dagre` for auto-layout |
| **Excel parsing** | `xlsx` (SheetJS) — see ADR-002 |
| **State** | `zustand` (small store, no Redux ceremony) |
| **Persistence (v1)** | IndexedDB via `idb` library (NOT localStorage — single labor report exceeds the 5 MB cap) |
| **Hosting** | GitHub Pages, static build, no backend |
| **Tests** | Vitest + Testing Library |
| **CI** | GitHub Actions — `deploy.yml` for Pages, `test.yml` for tests |
| **Persistence (v2 citywide)** | Cloudflare D1 or Supabase + `@sfgov.org` SSO, behind a swappable storage adapter |
| **App structure** | One unified app with tabbed modules (`app/src/modules/<feature>/`). Calculator math lifted into shared `lib/cost.ts`; orgchartbuilder folds in as `modules/orgchart/` in Phase 10. |

**Alternatives considered:**

| Choice | Rejected because |
|---|---|
| Vue / Svelte | Alex's other project uses React; consistency matters more than marginal DX gains. |
| Next.js | Server-side rendering is unnecessary for a static, single-user-per-browser tool. |
| Plain HTML/JS (like the calculator) | Doesn't scale to ten modules; no type safety for "AI invented a function" mistakes. |
| localStorage | 5 MB cap is too small; single labor report exceeds it. |
| Backend from day one | Adds auth, billing, IT-approval complexity before any value ships. |
| Separate apps per module | Forces context-switching for users; data sharing across modules is the whole point. |

**Consequences:**

- The app is bound to React Flow for the org chart phase. Acceptable — that's why v1 collapsed without it.
- IndexedDB is async-only, which means every storage call returns a Promise. The `idb` library makes this ergonomic.
- The storage adapter must be designed in Phase 2 so the eventual backend swap doesn't ripple through every module.
