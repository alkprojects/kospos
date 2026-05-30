# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 50 — Phase 2.2.z, 2026-05-29)

**Phase:** **Phase 2.2.z shipped — two safe code-health wins + the strategic scaling answer Alex asked for.** Alex was offered a 4-candidate pick menu (CH2 / O / PDF-TO / D1-D2) but answered **"whichever you recommend — could you do all?"** and added a strategic ask: **think about scaling from DBI+CPC (~1k people) to the whole city (~45k).** That reframed the session — the scaling question and carry-forward O are the *same* problem (monolithic persistence). Shipped the two scaling-independent safe wins + a grounded scaling roadmap, and reframed O as the roadmap's Stage 0.

**Last main commit:** this S50 docs PR → [#172](https://github.com/alkprojects/kospos/pull/172) → [#171](https://github.com/alkprojects/kospos/pull/171) → [#170](https://github.com/alkprojects/kospos/pull/170).
**Tests:** **880 / 880** (+4 Stat tests in #170, +1 PDF-timeout test in #171; #172 docs-only).
**Branches in flight:** none post-merge.
**Live site:** GitHub Pages + Cloudflare deploys green; main worktree fast-forwarded to `origin/main`.

### What shipped

| PR | What |
|---|---|
| [#170](https://github.com/alkprojects/kospos/pull/170) | **refactor(ui): `lib/ui/Stat.tsx`** — code-health **batch 2**. 8 byte-identical `Stat` summary-card copies → one component (PositionsView = the hint-less subset → omits the prop). +`stat.test.tsx` (computed-style contract). Behavior-neutral. 875→879. |
| [#171](https://github.com/alkprojects/kospos/pull/171) | **fix(scrapers): per-proxy timeout for the lazy PDF fetch** — clears **PDF-TO**. `fetchPdfBinary` had no timeout → a hung proxy could block the PDF extract forever (same class as #166). Exported + reused `fetch.ts`'s `fetchWithTimeout`; default 20s. +1 hung-proxy test. 879→880. |
| [#172](https://github.com/alkprojects/kospos/pull/172) | **docs(proposals): citywide scaling analysis + staged roadmap** — the grounded answer to Alex's question. New memory `citywide_scaling.md`. |
| this docs PR | Phase 2.2.z close audit + S50 SESSION_LOG + this handoff. |

### The scaling answer in one paragraph (read `docs/proposals/s50-citywide-scaling.md` for the full version)
The ~375 MB snapshot is almost all `loadedRows` — raw OBI payroll, *one row per position × earning code × pay period* — held in one in-memory array and structured-cloned **whole** to IDB on **every** change. Both are O(total), so the current design caps at **~a few thousand people**. Citywide (~45×, ~10–20 GB) needs a different data layer (IDB-indexed rows, incremental persistence, lazy per-dept load, and eventually revisiting ADR-001's no-backend rule). That's a dedicated Phase — Alex pre-authorized deferring it. **But carry-forward O (the freeze) is Stage 0 of that roadmap**, so the immediate perf win and the long-term direction are the same work.

### Carry-forward audit

| # | Item | This session | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md (~4,080 ln) | grew with S50 | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | **26th event-based trigger** | working as designed |
| I | Cloudflare hardening SEC-2 + SEC-3 | unchanged | **now == scaling Stage 3** (shared storage) |
| L | dev-mode/permissions ADR | not picked | optional — Alex's call |
| N | Deep-link Data sub-tabs from landing | unchanged | minor UX, optional |
| **O** | **Post-refresh IDB freeze (~5s @ 375 MB)** | **REFRAMED as scaling Stage 0** — the per-store IDB record split (write only the changed store's record, not the whole snapshot). Kills the freeze AND is the first incremental-persistence step. **Designed in the s50 proposal.** | **strongest 2.2.aa candidate** — but it's a persistence change (data-loss-adjacent): needs a one-time migration of the existing single `'current'` record + careful load/merge + the auto-persistence tests. |
| D1/D2/D3 | The C-series aesthetic tail (Button+radius · color consolidation · chip-shape) | unchanged — **need Alex's sign-off** | still a candidate — [proposal](proposals/s48-ui-primitives-followups.md) |
| **CH** | **Code-health safe-dedup menu** ([s48-code-health-review.md](proposals/s48-code-health-review.md)) | **batch 2 (Stat) ✅ #170** (batches 1+4 done S49) | **batches 3/5/6/7/8/9 remain** — safe away-session fodder |
| ~~PDF-TO~~ | `pdf-parse.ts` per-proxy timeout | **RESOLVED (#171)** | retired |

### For Alex to weigh in on (non-blocking)
- **The scaling roadmap** ([`s50-citywide-scaling.md`](proposals/s50-citywide-scaling.md)) — does the staged plan match your intent? The only real decision is *when* to start the re-architecture (Stages 2–3); Stages 0–1 keep KosPos browser-local and are pure wins. When you pick a direction it should become an ADR.
- **D1/D2 still need your two answers** (canonical pill radius 10/12/14; should `#b91c1c` become `--danger-strong`) — then they're mechanical.
- **The Cloudflare Worker** (`dhrWorkerUrl` slot already in the UI) is both the durable proxy-rot fix AND the first toe into scaling Stage 3 — needs your Cloudflare action.

---

## Next session prompt — Session 51 = Phase 2.2.aa pick

This is the block Alex pastes to start Session 51. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.aa) and ships it. Session 50 shipped two safe code-health/robustness wins (`lib/ui/Stat.tsx` [#170](https://github.com/alkprojects/kospos/pull/170); the PDF-fetch per-proxy timeout [#171](https://github.com/alkprojects/kospos/pull/171)) and a **citywide-scaling roadmap** ([#172](https://github.com/alkprojects/kospos/pull/172)) answering my question about scaling DBI+CPC → the whole city. Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file)
- `docs/SESSION_LOG.md` (Session 50 entry — Phase 2.2.z)
- `memory/MEMORY.md` + the memory files (note the new `citywide_scaling.md`)
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-z-close-audit.md` (the S50 close audit)
- **`docs/proposals/s50-citywide-scaling.md`** (the scaling roadmap — Stage 0 is carry-forward O; this is the lead 2.2.aa candidate)
- `docs/proposals/s48-code-health-review.md` (safe-dedup menu — batches 1/2/4 done; 3/5/6/7/8/9 remain)
- `docs/proposals/s48-ui-primitives-followups.md` (D1/D2/D3 — need a sign-off)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main (do this BEFORE trusting anything above):
- `git log --oneline origin/main -10` (should top out at the S50 docs PR; HEAD before it = #172/#171/#170)
- Tests baseline: `cd app && npm install && npm test` should show **880 / 880** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.aa close audit cadence check
==============================================================================
The Phase 2.2.z close audit fired in S50. The **Phase 2.2.aa close audit fires when 2.2.aa ships** — do it before this session ends, mirroring [the 2.2.z close audit](audits/phase-2-2-z-close-audit.md). If 2.2.aa does NOT ship, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.aa
==============================================================================
Use `AskUserQuestion` (plain + concrete options — live-site outcomes). Strong candidates:

  O / **Scaling Stage 0 — fix the ~5s post-refresh freeze the scaling-aligned way.** Split the monolithic IDB snapshot (`db.put(file,'current')`) into **per-store records** so a planning edit (note / separation / staffing action) stops re-serializing all ~375 MB of `loadedRows`. Kills the freeze AND is the first incremental-persistence step toward citywide. **A perf win Alex will feel.** Design in `s50-citywide-scaling.md`. ⚠️ Persistence change — needs a one-time migration of the existing single `'current'` record + careful load/merge + the existing auto-persistence tests. Verify carefully (data-loss-adjacent).

  CH-more. **Safe-dedup batches** (no sign-off): `importers/cells.ts` (`num`/`str`/`col`, batch 3), `lib/ui/table.tsx` (TableEmptyRow/Head/Card, batch 5), `lib/id.ts`+`rollupByStatus` (batch 6), `lib/store-history.ts` (batch 7, biggest LOC, med risk), filters (batch 8), dead-code (batch 9). Behavior-neutral, computed-style/test verifiable.

  D1/D2. **The C-series aesthetic tail** — needs Alex's two answers first (pill radius 10/12/14; should `#b91c1c` become `--danger-strong`). VISIBLE; sign-off required.

  (Freeform feedback / a bug report is welcome — it has driven the top scope of several sessions, including this one.)

==============================================================================
STEP 2 — Start Phase 2.2.aa (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick (single-purpose branch from `origin/main`).

If O / Stage 0 — branch `refactor/idb-per-store-records` (or similar): per the s50 design, split the single `snapshots/'current'` record into per-store records (heavy `loadedRows`+scraper data vs light planning data is the minimum viable split); update the save path to write only changed stores, the load path to read+merge, and **migrate the existing single record on first load** so Alex doesn't lose data. Lean hard on the auto-persistence tests + add migration coverage. Verify the freeze is gone with a before/after timing (the load path documents the 375 MB case).
If CH-more / D1/D2 / freeform: scope per the proposal / Alex's two answers / what Alex says.

==============================================================================
Hard constraints
==============================================================================
  - Branch from `origin/main`, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor is one logical change — NOT bundling). Several asks → separate sequential PRs (merge each, re-branch the next from updated main — kept S47–S50 conflict-free).
  - `npm test` stays green (currently **880 / 880**).
  - One PR per logical change; merge after CI passes (`gh pr checks <n> --watch`); fast-forward main; sync the main worktree post-merge (`git -C <main-worktree> merge --ff-only origin/main`).
  - Commit messages end with the `Co-authored-by:` line. Use a single-quoted heredoc `git commit -F -` for multiline. Windows LF→CRLF warnings are benign.
  - Worktree gotcha: don't `git checkout main` here. Branch each feature from `origin/main`; merge with `gh pr merge --squash` (skip `--delete-branch`).
  - Run `npm run build` before opening any PR that touches app code (tsc catches over-broad imports).
  - Agent-first visual verification for *visible* UI changes. For behavior-neutral refactors, computed-style assertions are the proof of choice. **Don't run a heavy preview for changes the preview can't exercise** (dev-gated views with no committed data, persistence/network-timing internals — verify those with tests + direct measurement). For Stage 0 specifically: a before/after IDB-save timing IS the proof of the felt win.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - **No jumping ahead to scaling Stages 2–3** (indexed-IDB rows / backend) — Stage 0 first proves the incremental-persistence model; the big re-architecture is its own Phase and Alex's call.
  - No promotion of dev-gated tabs to non-dev yet.
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred with reason.
  - Auth / login — deferred until KosPos is shared (part of scaling Stage 3).

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.aa status + next-session prompt for Phase 2.2.ab.
  - Carry-forward update on B, C, D, F, I, L, N, O (Stage 0), D1/D2/D3, CH, SCALE (+ whatever 2.2.aa picks).
  - Fire the Phase 2.2.aa close audit (mirrors the 2.2.z audit format) **if 2.2.aa shipped**.
