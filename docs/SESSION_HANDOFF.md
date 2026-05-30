# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 51 — Phase 2.2.aa, 2026-05-29)

**Phase:** **Phase 2.2.aa shipped — the post-refresh freeze is fixed, the scaling-aligned way.** Alex picked candidate **A — scaling Stage 0 / carry-forward O** from a 3-option menu. The IDB auto-persistence snapshot, previously one monolithic `'current'` record re-written whole (~375 MB) on every edit, is now split into **per-store-group records** written incrementally — so a planning edit rewrites a tiny record instead of re-serializing all of `loadedRows`. **Carry-forward O is closed; this is Stage 0 of the citywide-scaling roadmap.**

**Last main commit:** this S51 docs PR → [#174](https://github.com/alkprojects/kospos/pull/174) (the code).
**Tests:** **891 / 891** (+11 split/merge in #174; this docs PR is docs-only).
**Branches in flight:** none post-merge.
**Live site:** GitHub Pages + Cloudflare deploys green; main worktree fast-forwarded to `origin/main`.

### What shipped

| PR | What |
|---|---|
| [#174](https://github.com/alkprojects/kospos/pull/174) | **refactor(session): per-store IDB record split** — the single `'current'` snapshot record → four independently-written records (`meta`/`rows`/`scrapers`/`planning`); the hook writes only the dirty groups. Plus: the redundant post-load re-save removed (move `loadCompleteRef` past the restore), and an **atomic** one-time migration of the legacy `'current'` record. Verified four ways (unit round-trip, real-IDB migration, **444ms→1.4ms** timing, live-app group isolation). 880→891. |
| this docs PR | Phase 2.2.aa close audit + S51 SESSION_LOG + this handoff. |

### The win in one paragraph
Editing one note used to structured-clone the whole ~375 MB envelope to IndexedDB on the 500ms debounce — the ~5s freeze, and an `O(total)` wall toward citywide. Now each store group is its own IDB record; a planning edit writes the small `planning` record + tiny `meta` and **never touches the 375 MB `rows` record** (measured **~317× faster** at 92 MB). A legacy single-record browser migrates losslessly + atomically on first load. This is **scaling Stage 0** — the freeze fix and the first incremental-persistence step are the same work. **Stage 1** (move `loadedRows` into its own IDB object store, written only on import) is the natural next scaling step.

### Carry-forward audit

| # | Item | This session | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md (~4,100 ln) | grew with S51 | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | **27th event-based trigger** | working as designed |
| I | Cloudflare hardening SEC-2 + SEC-3 | unchanged | **== scaling Stage 3** (shared storage) |
| L | dev-mode/permissions ADR | not picked | optional — Alex's call |
| N | Deep-link Data sub-tabs from landing | unchanged | minor UX, optional |
| ~~O~~ | Post-refresh IDB freeze (~5s @ 375 MB) | **RESOLVED (#174)** — per-store split + post-load re-save removed | **retired** |
| **SCALE** | Citywide-scaling roadmap | **Stage 0 shipped (#174)** | **Stage 1** (loadedRows → own IDB store, written only on import) is the next scaling step — a strong 2.2.ab candidate |
| D1/D2/D3 | The C-series aesthetic tail (Button+radius · color consolidation · chip-shape) | unchanged — **need Alex's sign-off** | still a candidate — [proposal](proposals/s48-ui-primitives-followups.md) |
| **CH** | **Code-health safe-dedup menu** ([s48-code-health-review.md](proposals/s48-code-health-review.md)) | unchanged | **batches 3/5/6/7/8/9 remain** — safe away-session fodder |

### For Alex to weigh in on (non-blocking)
- **The scaling roadmap** ([`s50-citywide-scaling.md`](proposals/s50-citywide-scaling.md)) — Stage 0 is now done. The next real decision is *when* to do Stage 1 (still browser-local, pure win) and eventually the Stage 2–3 re-architecture. When you pick a direction it should become an ADR.
- **D1/D2 still need your two answers** (canonical pill radius 10/12/14; should `#b91c1c` become `--danger-strong`) — then they're mechanical.
- **The Cloudflare Worker** (`dhrWorkerUrl` slot already in the UI) is both the durable proxy-rot fix AND the first toe into scaling Stage 3 — needs your Cloudflare action.

---

## Next session prompt — Session 52 = Phase 2.2.ab pick

This is the block Alex pastes to start Session 52. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.ab) and ships it. Session 51 shipped the **per-store IDB record split** ([#174](https://github.com/alkprojects/kospos/pull/174)) — scaling Stage 0 — which killed the ~5s post-refresh freeze (a planning edit no longer re-serializes all ~375 MB of `loadedRows`; measured ~317× faster) and closed carry-forward O. Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file)
- `docs/SESSION_LOG.md` (Session 51 entry — Phase 2.2.aa)
- `memory/MEMORY.md` + the memory files (note `citywide_scaling.md` — Stage 0 now shipped)
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-aa-close-audit.md` (the S51 close audit)
- `docs/proposals/s50-citywide-scaling.md` (the scaling roadmap — **Stage 1 is the natural follow-on** to the just-shipped Stage 0)
- `docs/proposals/s48-code-health-review.md` (safe-dedup menu — batches 1/2/4 done; 3/5/6/7/8/9 remain)
- `docs/proposals/s48-ui-primitives-followups.md` (D1/D2/D3 — need a sign-off)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main (do this BEFORE trusting anything above):
- `git log --oneline origin/main -10` (should top out at the S51 docs PR; HEAD before it = #174)
- Tests baseline: `cd app && npm install && npm test` should show **891 / 891** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.ab close audit cadence check
==============================================================================
The Phase 2.2.aa close audit fired in S51. The **Phase 2.2.ab close audit fires when 2.2.ab ships** — do it before this session ends, mirroring [the 2.2.aa close audit](audits/phase-2-2-aa-close-audit.md). If 2.2.ab does NOT ship, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.ab
==============================================================================
Use `AskUserQuestion` (plain + concrete options — live-site outcomes). Strong candidates:

  SCALE / **Stage 1 — move `loadedRows` into its own IDB object store**, written only on import (rows don't change between imports). The natural follow-on to Stage 0: removes the monolithic-save concern for the biggest data term and shrinks the publish/export envelope (scaling wall #3). Still browser-local, pure win. Design context in `s50-citywide-scaling.md`. ⚠️ Persistence change again — but the per-store split infra (split/merge/migrate) from #174 makes it lower-risk; lean on the same four-way verification (unit round-trip + real-IDB migration + timing + live-app check).

  CH-more. **Safe-dedup batches** (no sign-off): `importers/cells.ts` (`num`/`str`/`col`, batch 3), `lib/ui/table.tsx` (TableEmptyRow/Head/Card, batch 5), `lib/id.ts`+`rollupByStatus` (batch 6), `lib/store-history.ts` (batch 7, biggest LOC, med risk), filters (batch 8), dead-code (batch 9). Behavior-neutral, computed-style/test verifiable.

  D1/D2. **The C-series aesthetic tail** — needs Alex's two answers first (pill radius 10/12/14; should `#b91c1c` become `--danger-strong`). VISIBLE; sign-off required.

  (Freeform feedback / a bug report is welcome — it has driven the top scope of several sessions.)

==============================================================================
STEP 2 — Start Phase 2.2.ab (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick (single-purpose branch from `origin/main`).

If SCALE / Stage 1 — branch `refactor/idb-rows-own-store` (or similar): add a dedicated IDB object store (or record) for `loadedRows`, written only when the import store changes; keep the per-group split for the rest. Migrate the existing `rows` record. Verify with the same four-way approach #174 used (the freeze proof is now "an import writes rows; planning edits don't"). It's persistence again → verify carefully.
If CH-more / D1/D2 / freeform: scope per the proposal / Alex's two answers / what Alex says.

==============================================================================
Hard constraints
==============================================================================
  - Branch from `origin/main`, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor is one logical change — NOT bundling). Several asks → separate sequential PRs (merge each, re-branch the next from updated main — kept S47–S51 conflict-free).
  - `npm test` stays green (currently **891 / 891**).
  - One PR per logical change; merge after CI passes (`gh pr checks <n> --watch`); fast-forward main; sync the main worktree post-merge (`git -C <main-worktree> merge --ff-only origin/main`).
  - Commit messages end with the `Co-authored-by:` line. Use a single-quoted heredoc `git commit -F -` for multiline. Windows LF→CRLF warnings are benign.
  - Worktree gotcha: don't `git checkout main` here. Branch each feature from `origin/main`; merge with `gh pr merge --squash` (skip `--delete-branch`).
  - Run `npm run build` before opening any PR that touches app code (tsc catches over-broad imports).
  - Agent-first visual verification for *visible* UI changes. For behavior-neutral refactors, computed-style assertions are the proof. **For persistence/timing internals (like Stage 0/1): tests + direct measurement + a real-IDB migration check, NOT a heavy UI preview** — jsdom has no IndexedDB, so pure split/merge helpers carry the unit load and the real browser carries the migration/timing proof.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - **No jumping ahead to scaling Stages 2–3** (indexed-IDB rows / backend) — Stage 1 first; the big re-architecture is its own Phase and Alex's call.
  - No promotion of dev-gated tabs to non-dev yet.
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred with reason.
  - Auth / login — deferred until KosPos is shared (part of scaling Stage 3).

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.ab status + next-session prompt for Phase 2.2.ac.
  - Carry-forward update on B, C, D, F, I, L, N, D1/D2/D3, CH, SCALE (+ whatever 2.2.ab picks).
  - Fire the Phase 2.2.ab close audit (mirrors the 2.2.aa audit format) **if 2.2.ab shipped**.
