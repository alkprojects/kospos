# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 49 — Phase 2.2.y, 2026-05-29)

**Phase:** **Phase 2.2.y shipped — a bug-fix + code-health away-session.** Alex was heading to sleep and gave three directives: (1) ask blocking questions ASAP, (2) **the eligibility-list refresh "used to run fast, now seems very slow" — check on it**, (3) use the sleep time for any productive work. Shipped as **3 single-purpose PRs**.

**⚠️ Stale-prompt note (read this):** the prompt pasted to start this session was the **S46-era** block (it said "pick Phase 2.2.v" and offered H/P/M/E/F/G). The repo was actually at **end-of-S48 (#165)**. So the menu was stale — **H (modal lift), the eligibility concurrency rework, and the file-load scraper-parity fix had ALL already shipped** (S46–S47, #154/#156/#157). Alex picked **H** via `AskUserQuestion`, but H was already done — so I pivoted to his real, current directive (the eligibility slowdown) plus the handoff's pre-blessed away-session work. **Next session: trust THIS handoff's state, not a pasted prompt, if they disagree** — confirm with `git log --oneline origin/main -10`.

**Last main commit:** the S49 docs PR (this) → [#168](https://github.com/alkprojects/kospos/pull/168) → [#167](https://github.com/alkprojects/kospos/pull/167) → [#166](https://github.com/alkprojects/kospos/pull/166).
**Tests:** **875 / 875** (+1 from a new proxy-ordering regression test in #166; #167/#168 are behavior-neutral, no delta).
**Branches in flight:** none post-merge.
**Live site:** GitHub Pages + Cloudflare deploys green; main worktree fast-forwarded to `origin/main`.

### What shipped

| PR | What |
|---|---|
| [#166](https://github.com/alkprojects/kospos/pull/166) | **perf(scrapers): fix the slow eligibility refresh.** Root cause = **external proxy rot**, not our code. Live S49 check: `corsproxy.io` → HTTP 403 (went paid), `allorigins.win` → HTTP 500 and **~12s to return it**, `codetabs.com` → 200 (~0.5s). `DEFAULT_PROXIES` still listed the two dead proxies FIRST, so every page burned the 10s per-proxy timeout on the hung allorigins before reaching codetabs (~2 min total over the 6-wide waves). Fix: **reorder codetabs-first** + use codetabs' trailing-slash URL (skips a 301). Restores the ~5s scrape. +1 regression test. |
| [#167](https://github.com/alkprojects/kospos/pull/167) | **refactor(format): `lib/format.ts`** — code-health **batch 1** (U2+U3). 5 `fmtMoney` + 3 `fmtSignedMoney` byte-identical copies → one module. Behavior-neutral. |
| [#168](https://github.com/alkprojects/kospos/pull/168) | **chore: correct stale "not persisted" claims** — code-health **batch L1**, *expanded*. 7 comments + **3 user-facing banners** (StaffingPlan/Separations/Probation footers) that falsely told the user data is "in-memory until Phase 2.2.33" — false since IDB auto-persistence shipped in 2.2.q. Clears the 3-audit-old `pdfCache` carry-forward. |
| this docs PR | Phase 2.2.y close audit + S49 SESSION_LOG + this handoff + a new memory (`proxy_rot.md`). |

### Carry-forward audit

| # | Item | This session | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md (3,979 ln) | grew with S49 | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | **25th event-based trigger** | working as designed |
| I | Cloudflare hardening SEC-2 + SEC-3 | unchanged | tracked for named-workspace v2 |
| L | dev-mode/permissions ADR | not picked | optional — Alex's call (proposals B3) |
| N | Deep-link Data sub-tabs from landing | unchanged | minor UX, optional |
| **O** | **Post-refresh IDB auto-save freeze (~5s @ 375 MB)** | **DIAGNOSED (not fixed)** — `use-auto-persistence.ts` serializes the *whole* snapshot (incl. `loadedRows` + `pdfCache`) to JSON on a 500ms debounce after **every** store change. On ~375 MB that JSON+IDB write blocks the main thread ~5s. This is the **likely second half** of Alex's "refresh is slow" feeling (fetch was the first, now fixed). | **own change (persistence) — spawned task stands.** See proposed fixes below. |
| D1/D2/D3 | The C-series aesthetic tail (Button+radius · color consolidation · chip-shape) | unchanged — **need Alex's sign-off** | strong 2.2.z candidate — [proposal](proposals/s48-ui-primitives-followups.md) |
| **CH** | **Code-health safe-dedup menu** ([s48-code-health-review.md](proposals/s48-code-health-review.md)) | **batch 1 (format) ✅ #167 · batch 4 (L1 stale comments) ✅ #168** | **batches 2/3/5/6/7/8/9 remain** — ideal next away-session work |
| **PDF-TO** | **`pdf-parse.ts` has no per-proxy timeout** (found S49) | new — the codetabs-first reorder (#166, shared `DEFAULT_PROXIES`) speeds its serial loop, but a *hung* proxy on a PDF fetch still has no abort | **new carry-forward** — give `fetchPdfBinary` the same `fetchWithTimeout` wrapper `fetch.ts` already has (small) |
| ~~pdfCache "lost on reload" comment~~ | — | **RESOLVED (#168)** | retired (cleared after 3 audits) |
| ~~Eligibility refresh slow~~ | — | **RESOLVED (#166)** | retired |

### For Alex to weigh in on (non-blocking)
- **Confirm the eligibility refresh is fast again** on the live site: Load Data → "Refresh eligibility lists" (should be ~5s, not minutes). If it's *still* slow, it's the IDB freeze (O) — the save-after-refresh, not the fetch.
- **The ~375 MB snapshot (O) is worth a look regardless** — it's large for a browser-local store, and it freezes the tab ~5s after any change. Proposed fixes (pick later): (a) only serialize `loadedRows` on explicit save, not on every debounce; (b) move JSON serialization to a Web Worker; (c) store structured data in IDB instead of a JSON blob. Each is its own change.
- **D1/D2 still need your two answers** (canonical pill radius 10/12/14; should `#b91c1c` become `--danger-strong`) — then they're mechanical.

---

## Next session prompt — Session 50 = Phase 2.2.z pick

This is the block Alex pastes to start Session 50. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.z) and ships it. Session 49 was a bug-fix + code-health away-session: fixed the slow **eligibility refresh** (proxy rot — codetabs-first, [#166](https://github.com/alkprojects/kospos/pull/166)) and shipped two safe code-health batches (`lib/format.ts` [#167](https://github.com/alkprojects/kospos/pull/167); stale "not persisted" claims [#168](https://github.com/alkprojects/kospos/pull/168)). Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file)
- `docs/SESSION_LOG.md` (Session 49 entry — Phase 2.2.y)
- `memory/MEMORY.md` + the memory files (note the new `proxy_rot.md`)
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-y-close-audit.md` (the S49 close audit)
- `docs/proposals/s48-code-health-review.md` (the safe-dedup menu — **batches 1 + 4 are now done**; 2/3/5/6/7/8/9 remain)
- `docs/proposals/s48-ui-primitives-followups.md` (D1/D2/D3 — need a sign-off)
- `docs/proposals/s46-ui-ux-review.md` (broader UX menu)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10` (should top out at the S49 docs PR; HEAD before it = #168/#167/#166)
- Tests baseline: `cd app && npm install && npm test` should show **875 / 875** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.z close audit cadence check
==============================================================================
The Phase 2.2.y close audit fired in S49. The **Phase 2.2.z close audit fires when 2.2.z ships** — do it before this session ends, mirroring [the 2.2.y close audit](audits/phase-2-2-y-close-audit.md). If 2.2.z does NOT ship, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.z
==============================================================================
Use `AskUserQuestion` (plain + concrete options — live-site outcomes, not architecture). Strong candidates:

  CH2. **Code-health batch 2 — `lib/ui/Stat.tsx`.** 7–8 byte-identical `Stat` summary-card copies → one component (one is hint-less; the canonical takes `{label, value, hint?}`). Behavior-neutral, test + computed-style verifiable. **Prepped + verified ready in S49** — the fastest safe win. (CH batch 2)

  CH-more. **Other safe-dedup batches** (no sign-off needed): `importers/cells.ts` (`num`/`str`/`col`, batch 3), `lib/ui/table.tsx` (TableEmptyRow/TableHead/TableCard, batch 5), `lib/id.ts`+`rollupByStatus` (batch 6), `lib/store-history.ts` (batch 7, biggest LOC win, med risk), filters (batch 8), dead-code (batch 9).

  O. **Fix the post-refresh IDB freeze** (~5s @ 375 MB) — VISIBLE perf win Alex will feel. Pick (a)/(b)/(c) from the carry-forward note. Persistence change → verify carefully. (own change; a spawned task already tracks it)

  PDF-TO. **Give `pdf-parse.ts` a per-proxy timeout** — small; mirrors the `fetchWithTimeout` already in `sf-dhr-exam/fetch.ts`. Hardens the lazy PDF cover-sheet fetch against a hung proxy (same class of bug as the #166 eligibility fix).

  D1/D2. **The C-series aesthetic tail** — needs Alex's two answers first (pill radius; `--danger-strong`). VISIBLE; sign-off required.

  B2. **De-risk the dev-mode gear** (a bare ⚙ one click from Save/Load reshuffles the whole tab strip) — small, visible, reviewable.

  (Freeform feedback / a bug report is welcome — it has driven several sessions' top scope.)

==============================================================================
STEP 2 — Start Phase 2.2.z (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick (single-purpose branch from `origin/main`).

If CH2 — `Stat`: branch `refactor/lib-ui-stat`; extract `lib/ui/Stat.tsx` (`{label, value, hint?}`); migrate the 7–8 copies (PositionsView is hint-less → just omit the prop); verify byte-identical render via existing view tests + a computed-style spot-check; tests + build.
If O / PDF-TO / a proposals item / freeform: scope per the note / proposal / what Alex says.

==============================================================================
Hard constraints
==============================================================================
  - Branch from `origin/main`, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor is one logical change — NOT bundling). Several asks → separate sequential PRs (merge each, re-branch the next from updated main — kept S47–S49 conflict-free).
  - `npm test` stays green (currently **875 / 875**).
  - One PR per logical change; merge after CI passes (`gh pr checks <n> --watch`); fast-forward main; sync the main worktree post-merge (`git -C <main-worktree> merge --ff-only origin/main`).
  - Commit messages end with the `Co-authored-by:` line. Use a single-quoted heredoc `git commit -F -` for multiline. Windows LF→CRLF warnings are benign.
  - Worktree gotcha: don't `git checkout main` here. Branch each feature from `origin/main`; merge with `gh pr merge --squash` (skip `--delete-branch`).
  - Run `npm run build` before opening any PR that touches app code (tsc catches over-broad imports — it caught one in #167).
  - Agent-first visual verification for *visible* UI changes. App base path is `/kospos/`; clear `localStorage['kospos:dev-mode']` + reload to test the dev-off default. For behavior-neutral refactors, computed-style assertions are the proof of choice. **Don't run a heavy preview for changes the preview can't exercise** (e.g. dev-gated views with no committed data, or network-timing fixes — verify those with tests + direct measurement, as #166 did via live `curl`).

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - No promotion of dev-gated tabs to non-dev yet — exercise the now-fast scrape + Save/Load + dev toggle on real data first. (Separations / Inactive are the first promotion candidates per the S46 IA review.)
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred with reason.
  - Named workspaces / R2 migration — later. Auth / login — deferred until KosPos is shared.

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.z status + next-session prompt for Phase 2.2.aa.
  - Carry-forward update on B, C, D, F, I, L, N, O, D1/D2/D3, CH, PDF-TO (+ whatever 2.2.z picks).
  - Fire the Phase 2.2.z close audit (mirrors the 2.2.y audit format) **if 2.2.z shipped**.
