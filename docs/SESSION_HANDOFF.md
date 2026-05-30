# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 52 — Phase 2.2.ab, 2026-05-29)

**Phase:** **Phase 2.2.ab shipped — a Calendar sub-tab in the Data section.** Alex's S52 ask, picked from a 4-option menu. A new read-only sub-view (`lib/views/calendar/`) is wired as the third sub-tab under the Data tab ("Source Tables"), surfacing the FY pay-period calendar (`data/calendar-fy2026.json`) and the COLA / payroll constants (`data/cola-fy2026.json`) — the same reference data the Job Class Calculator's pay-period dropdown reads from. First user-visible surface for roadmap sub-phase `2.2.1 lib/calendar/` and the home for workbook Tab 5 (Calendar).

**Last main commit:** this S52 docs PR (the code is [#176](https://github.com/alkprojects/kospos/pull/176)).
**Tests:** **896 / 896** (+5 in #176: 4 CalendarView + 1 DataView sub-tab switch; this docs PR is docs-only).
**Branches in flight:** none post-merge.
**Live site:** GitHub Pages deploy green; main worktree fast-forwarded to `origin/main`.

### What shipped

| PR | What |
|---|---|
| [#176](https://github.com/alkprojects/kospos/pull/176) | **feat(views/data): Calendar sub-tab** — read-only FY pay-period calendar (27 rows, PPE dates + partial-period weights, current-PP highlight, weighted year-elapsed %) + COLA constants table (mid-year + PP1 rates incl. per-emp-org overrides + two OASDI wage bases). Reuses the existing calendar JSON, the shared `Stat`, and `fmtMoney`; matches the existing DataView sub-tab pattern. Verified live (as-of `2026-05-29` → PP25, 89.66% elapsed). 891 → 896. |
| this docs PR | Phase 2.2.ab close audit (28th) + S52 SESSION_LOG + this handoff. |

### Alex's S52 roadmap questions — answered (for reference)
- **Active assignments + supervisory pay** — active assignments = the P&P Data / Positions spine (`2.2.12 obi-pnp` + `2.2.16 views/positions`, partly shipped: Positions is a live tab). Supervisory pay = **`2.2.30 views/ee-additional-pay`** (Tab 9 EE Additional Pay — acting / supervisory-pay tracker); deps `2.2.6` (DHR MOU PDFs → per-BU `SupervisoryDifferentialRule`), `2.2.16`, + a PS HCM additional-pay importer. **Not built.**
- **Year-end actuals projections** — **`2.2.23 views/ops`** (Tabs 26 + 27 Operating Report Summary + Detail, the headline projection page), powered by **`2.2.32 lib/projections`** (the unified COLA-aware engine); deps `2.2.11` BI Payroll importer + `2.2.13` BFM eturn + `2.2.16`. Per-tab year-end projections also live in Step/Premium/Overtime/Retirement tabs. **Not built** (biggest remaining arc).
- **Special-class actuals** — **`2.2.14 bfm-special-class`** importer (the 100-row block hand-pasted into Report Data S649–748) feeding the OPS special-class blocks inside `2.2.23 views/ops`. The budget side already shipped in the Phase-1 Special Class tab (devOnly). **Actuals not built.**

### Carry-forward audit

| # | Item | This session | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md (~4,200 ln) | grew with S52 | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | **28th event-based trigger** | working as designed |
| I | Cloudflare hardening SEC-2 + SEC-3 | unchanged | **== scaling Stage 3** (shared storage) |
| L | dev-mode/permissions ADR | not picked | optional — Alex's call |
| N | Deep-link Data sub-tabs from landing | now **3** Data sub-tabs | minor UX, optional |
| **SCALE** | Citywide-scaling roadmap | Stage 0 shipped (#174) | **Stage 1** (loadedRows → own IDB store, written only on import) still the next scaling step |
| D1/D2/D3 | The C-series aesthetic tail (Button+radius · color consolidation · chip-shape) | unchanged — **need Alex's sign-off** | still a candidate — [proposal](proposals/s48-ui-primitives-followups.md) |
| **CH** | **Code-health safe-dedup menu** ([s48-code-health-review.md](proposals/s48-code-health-review.md)) | unchanged | **batches 3/5/6/7/8/9 remain** — safe away-session fodder |
| **CAL** | Calendar view adopts `2.2.1 lib/calendar/` | **new** | when `lib/calendar/` is lifted to per-FY effective-date lookup, switch `CalendarView` off the raw single-FY JSON imports |

### For Alex to weigh in on (non-blocking)
- **What's the next big build?** Your S52 questions point at three unbuilt surfaces — **year-end OPS projection** (`2.2.23`, the headline page, biggest), **acting/supervisory pay** (`2.2.30`), **special-class actuals** (`2.2.14`→`2.2.23`). Any of these is a strong 2.2.ac; the OPS page is the most impactful but multi-session (needs the BI Payroll importer first).
- **D1/D2 still need your two answers** (canonical pill radius 10/12/14; should `#b91c1c` become `--danger-strong`) — then they're mechanical.
- **The Cloudflare Worker** (`dhrWorkerUrl` slot already in the UI) is both the durable proxy-rot fix AND the first toe into scaling Stage 3 — needs your Cloudflare action.

---

## Next session prompt — Session 53 = Phase 2.2.ac pick

This is the block Alex pastes to start Session 53. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.ac) and ships it. Session 52 shipped the **Calendar sub-tab** ([#176](https://github.com/alkprojects/kospos/pull/176)) — a read-only FY pay-period calendar + COLA constants table under the Data tab ("Source Tables"), the first UI for roadmap `2.2.1 lib/calendar/`. Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file)
- `docs/SESSION_LOG.md` (Session 52 entry — Phase 2.2.ab)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-ab-close-audit.md` (the S52 close audit — incl. the tool-channel process lesson)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph (the sub-phase IDs below come from here)
- `docs/proposals/s50-citywide-scaling.md` (scaling roadmap — Stage 1 next)
- `docs/proposals/s48-code-health-review.md` (safe-dedup menu — batches 3/5/6/7/8/9 remain)
- `docs/proposals/s48-ui-primitives-followups.md` (D1/D2/D3 — need a sign-off)

Confirm state on main (do this BEFORE trusting anything above):
- `git log --oneline origin/main -10` (should top out at the S52 docs PR; the code PR before it = #176)
- Tests baseline: `cd app && npm install && npm test` should show **896 / 896**. **Run `npm install` first** — a fresh worktree has no `node_modules` (S52 lost a build cycle to "vitest not recognized"). **Prefer single error-proof tool calls** (`cmd 2>/dev/null; ... || echo none`) over large interdependent batches — a batch cancels on the first erroring call (S52 tool-channel lesson).

==============================================================================
STEP 0 — Phase 2.2.ac close audit cadence check
==============================================================================
The Phase 2.2.ab close audit fired in S52 (28th). The **Phase 2.2.ac close audit fires when 2.2.ac ships** — do it before this session ends, mirroring [the 2.2.ab close audit](audits/phase-2-2-ab-close-audit.md). If 2.2.ac does NOT ship, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.ac
==============================================================================
Use `AskUserQuestion` (plain + concrete options — live-site outcomes). Strong candidates (Alex's own S52 questions surfaced the first three):

  **Year-end OPS projection** (`2.2.23 views/ops`) — the headline year-end actuals + projection page (Tabs 26 + 27). The most impactful surface, but **multi-session**: needs the full BI Payroll importer (`2.2.11`) and ideally the projection engine (`2.2.32`) first. A first session would scope + ship a foundation slice, not the whole page.

  **Acting / supervisory pay** (`2.2.30 views/ee-additional-pay`) — Tab 9. Acting + supervisory-pay tracker with the dual-entry check + per-BU supervisory-differential. Needs an additional-pay importer + (for multi-BU correctness) the DHR-MOU rules.

  **Special-class actuals** (`2.2.14 bfm-special-class`) — the special-class importer feeding the OPS special-class blocks; budget side already exists in the Special Class tab.

  **Scaling Stage 1** — move `loadedRows` into its own IDB object store, written only on import. Pure-win persistence refactor, fully specced, ships clean in one session. Verified via tests + real-IDB migration + timing (not UI).

  **Safe code-health batch** (CH 3/5/6/7/8/9) — behavior-neutral dedup; batch 5 would create the shared table component the views currently inline.

  (Freeform feedback / a bug report is welcome — it has driven the top scope of several sessions.)

==============================================================================
STEP 2 — Start Phase 2.2.ac (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick (single-purpose branch from `origin/main`).
- A new view → mirror the S52 Calendar pattern: a `lib/views/<name>/` sub-view + barrel + test, wired into its container; reuse `lib/ui` primitives (`Stat`, `Badge`, …) and `lib/format`; match the existing inline-table style.
- Scaling Stage 1 / CH / D1/D2 → scope per the relevant proposal / Alex's two aesthetic answers.

==============================================================================
Hard constraints
==============================================================================
  - Branch from `origin/main`, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor is one logical change — NOT bundling). Several asks → separate sequential PRs (merge each, re-branch the next from updated main — kept S47–S52 conflict-free).
  - `npm test` stays green (currently **896 / 896**).
  - One PR per logical change; merge after CI passes (`gh pr checks <n> --watch`); fast-forward main; sync the main worktree post-merge (`git -C <main-worktree> merge --ff-only origin/main`).
  - Commit messages end with the `Co-authored-by:` line. Use a single-quoted heredoc `git commit -F -` for multiline. Windows LF→CRLF warnings are benign.
  - Worktree gotcha: don't `git checkout main` here. Branch each feature from `origin/main`; merge with `gh pr merge --squash` (skip `--delete-branch`).
  - Run `npm run build` before opening any PR that touches app code (tsc catches over-broad imports).
  - Agent-first visual verification for *visible* UI changes (preview server name is `kospos`, app at `/kospos/`; reload between edits — HMR can show stale intermediate renders, as S52 saw). For behavior-neutral refactors, computed-style assertions are the proof. For persistence/timing internals: tests + direct measurement + a real-IDB migration check, not a heavy UI preview.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - **No jumping ahead to scaling Stages 2–3** (indexed-IDB rows / backend) — Stage 1 first; the big re-architecture is its own Phase and Alex's call.
  - No promotion of dev-gated tabs to non-dev without Alex's say.
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred with reason.
  - Auth / login — deferred until KosPos is shared (part of scaling Stage 3).

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.ac status + next-session prompt for Phase 2.2.ad.
  - Carry-forward update on B, C, D, F, I, L, N, SCALE, D1/D2/D3, CH, CAL (+ whatever 2.2.ac picks).
  - Fire the Phase 2.2.ac close audit (mirrors the 2.2.ab audit format) **if 2.2.ac shipped**.
