# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 46 — Phase 2.2.v, 2026-05-28)

**Phase:** **Phase 2.2.v shipped** — Alex's freeform bug report ("refreshing eligibility lists … used to run pretty fast but now seems very slow"), picked as the headline over the menu. Resolved as **1 perf PR** ([#154](https://github.com/alkprojects/kospos/pull/154)), evidence-led. The next sub-phase pick (**2.2.w**) moves to Session 47.
**Last main commit:** this docs PR → [#154](https://github.com/alkprojects/kospos/pull/154) (concurrent-wave DHR fetch).
**Tests:** **861 / 861** (+4 from #154).
**Branches in flight:** none post-merge (this docs PR pending).
**Live site:** GitHub Pages + Cloudflare deploys green; the eligibility refresh is now fast on the live site.

### What shipped / was produced

| # | PR / artifact | What |
|---|---|---|
| 1 | [#154](https://github.com/alkprojects/kospos/pull/154) | **perf(scrapers): concurrent-wave DHR fetch.** Root cause = the ~66-page scrape ran strictly sequentially with a 500ms throttle (~50s, hard ~33s floor) — the *design*, not proxy rot (measured: proxy healthy, 8 concurrent fetches = 8/8 200 in 429ms). Now fetches in **bounded-concurrency waves (default 6)** + a **per-proxy `AbortController` timeout (10s)**. **Verified live: 6,727 lists / ~66 pages in 676ms** (was ~50s). +4 tests. |
| 2 | spawned task (chip) | **Carry-forward O** — the post-refresh full-snapshot IndexedDB auto-save structured-clones the *entire* session on the main thread (~13 ms/MB → ~5s freeze at the 375 MB envelope). Filed as its own change (NOT bundled). |
| 3 | [`docs/proposals/s46-ui-ux-review.md`](proposals/s46-ui-ux-review.md) | **UI/UX review** (Alex's "use my sleep time" directive) — 3 read-only review agents → a triaged backlog. Headlines below. |
| 4 | this docs PR | Phase 2.2.v close audit + S46 SESSION_LOG + this handoff + the proposals doc. |

**UI/UX review headlines (full triage in the proposals doc):** the **modal-frame lift (H)** is now fully inventoried (6 dialogs in 2 families) and also closes **2 P1 a11y gaps** (no focus-trap/restore; Family-B dialogs lack role/Esc) → strongest 2.2.w pick. Plus: **file-load scraper parity (M)** has an exact one-block fix; **clickable rows aren't keyboard-operable** in 5 of 6 views (P1 a11y); **"Data" vs "Load Data" label collision** (P1); **dev-gear accidental-toggle risk** (P1); **write the dev-mode ADR now** (L).

### Carry-forward audit

| # | Item | Prior status | This session | Disposition |
|---|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md | grows each session | grew with S46 entry | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | 12 instances | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | 8,518 ln | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | 21st trigger (S45) | **22nd trigger (this session)** | working as designed |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | carries 6+ sessions | **fully inventoried** by the S46 review; now also fixes P1 a11y | **leading 2.2.w candidate** |
| I | Cloudflare hardening SEC-2 + SEC-3 | documented S42 | unchanged | tracked for named-workspace v2 |
| L | ADR for the evolved dev-mode model | optional (S44/S45) | review **recommends writing it now** | optional — Alex's call |
| M | Session file-load doesn't restore scraper data | new S45 | **exact fix site identified** by the review (`use-session-snapshot.ts:128-159`) | **real bug; small own change** |
| N | Deep-link Data sub-tabs from the landing dashboard | new S45 | re-confirmed; `usePositionsScope` precedent noted | minor UX, optional |
| O | **Post-refresh IDB auto-save main-thread freeze (~5s @ 375 MB)** | **new this session** | measured + **filed as a spawnable task** | **new — own change (persistence)** |
| — | ~~Alex S46 freeform (eligibility slowness)~~ | new | **shipped (#154)** | **resolved** |
| — | A / E / G / J | retired/on-menu | n/a | E/G remain on the menu; A/J stay retired |

### For Alex to weigh in on (non-blocking)
- **Triage [the UI/UX proposals](proposals/s46-ui-ux-review.md)** — it's a ranked menu; pick what graduates to a sub-phase. Top picks: H (modal lift), M (file-load parity), the "Data"/"Load Data" rename, keyboard-operable rows.
- **The IDB-freeze task (O)** is a ready-to-run chip — start it any time (it only bites at citywide data scale).
- **dev-mode/permissions ADR (L):** the review recommends writing it now (cheap; prose already exists). Your call.

---

## Next session prompt — Session 47 = Phase 2.2.w pick

This is the block Alex pastes to start Session 47. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.w) and ships it. Session 46 shipped 2.2.v — the eligibility-scrape concurrency fix (#154, ~50s → ~5s, evidence-led) — and produced a triaged UI/UX proposals backlog (`docs/proposals/s46-ui-ux-review.md`). Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file — recommendation + carry-forwards)
- `docs/SESSION_LOG.md` (Session 46 entry — Phase 2.2.v)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-v-close-audit.md` (the S46 close audit — carry-forwards)
- `docs/proposals/s46-ui-ux-review.md` (the S46 UI/UX triage — the 2.2.w menu is drawn from here)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10`
- Tests baseline: `cd app && npm install && npm test` should show **861 / 861** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.w close audit cadence check
==============================================================================
The Phase 2.2.v close audit fired in S46. The **Phase 2.2.w close audit fires when 2.2.w ships** — do it before this session ends, mirroring [the 2.2.v close audit](audits/phase-2-2-v-close-audit.md) format (incl. its carry-forward table). If 2.2.w does NOT ship, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.w
==============================================================================
Use AskUserQuestion. (S44–S46 lesson: keep options plain + concrete — live-site outcomes, not architecture.) The S46 UI/UX review (`docs/proposals/s46-ui-ux-review.md`) is the curated menu; the strongest picks:

  H. **Lift the modal overlay-frame → `lib/ui/Modal.tsx`** (SUGGESTED — now also fixes
     2 P1 accessibility gaps, not just cleanliness). Fully inventoried: 6 dialogs in 2
     families (4 detail editors + 2 read-only viewers; LoadingOverlay stays separate).
     A shared Modal owns backdrop/card/✕/Esc/role=dialog + focus-trap+restore; migrate
     Family A first, then B (which gains Esc + dialog role). NO behavior change beyond
     the a11y additions; tests green + preview spot-check 2-3 modals.

  M. **File-load scraper parity** — loading a saved session FILE silently drops the
     scraper data it contains (only IDB auto-restore brings it back). Exact one-block
     fix at `lib/session/use-session-snapshot.ts` mirroring `restoreStoresFromPayload`;
     fold both paths into one shared helper. Small + a round-trip test.

  R. **Rename "Data" vs "Load Data"** to kill the label collision (P1) — pure rename,
     no logic (e.g. "Load Data" → "Import / Refresh", "Data" → "Source Tables").

  K. **Keyboard-operable detail rows** (P1 a11y) — 5 of 6 list views can't open a detail
     record without a mouse; replicate the correct `EligibilityView.tsx:342` row pattern
     across Positions/Labor/Separations/Probations/StaffingPlan.

  (Other menu items in the proposals doc: B2 de-risk the dev-gear · B3 write the
   dev-mode ADR (L) · A3/A4 confirm-on-clear + auto-open paste fallback · N deep-link
   sub-tabs · C4/C5 shared Button + color tokens. Plus the standing dependency-graph
   menu: O the IDB-freeze (already a spawned task) · P source-tables-under-Data ·
   2.2.19 temp-limits · 2.2.22 vacancies · Cloudflare cutover. Freeform feedback /
   UX rough edges welcome — it has driven the last several sessions' top scope.)

==============================================================================
STEP 2 — Start Phase 2.2.w (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If H — modal-overlay-frame lift:
  Branch: `refactor/ui-modal-overlay-frame`
  Scope: build `lib/ui/Modal.tsx` (props per the proposals doc: `onClose ariaLabel
    maxWidth align closeOnEsc closeOnBackdrop zIndex`, owning focus-trap+restore);
    migrate the 6 dialogs (SeparationDetail:171, ProbationDetail:259,
    PlannedActionDetail:277, EligibilityDetail:667, then PositionDetail:500,
    LaborView:275) one at a time within the PR; leave LoadingOverlay as-is. Tests
    green + preview spot-check. (Multi-file = the single-logical-change exception.)

If M — file-load scraper parity:
  Branch: `fix/session-load-restores-scrapers`
  Scope: in `use-session-snapshot.ts` `loadFromFile`, restore scrapers via the same
    call the IDB path uses (`use-auto-persistence.ts:113-119`); factor a shared
    `restoreStoresFromPayload` both paths call. Round-trip test + preview spot-check.

If R — Data/Load-Data rename:
  Branch: `refactor/data-tab-labels`
  Scope: rename the two tab labels + reconcile the landing "Load Reports" wording;
    update any tabHint/label tests. No logic change; preview spot-check.

If K — keyboard-operable rows:
  Branch: `fix/a11y-clickable-rows`
  Scope: extract `<ClickableRow>` / `useRowButton` from the `EligibilityView.tsx:342`
    pattern; apply to Positions/Labor/Separations/Probations/StaffingPlan. Tests +
    keyboard spot-check in preview.

If a proposals-doc item / freeform feedback:
  Scope per the doc / what Alex says. Treat freeform as primary; the menu is fallback.

==============================================================================
Hard constraints
==============================================================================
  - Branch from `origin/main`, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor like the modal lift or a
    shared-hook extraction is one logical change — that is NOT bundling).
  - `npm test` stays green (currently 861 / 861).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the `Co-authored-by:` line. Use a single-quoted heredoc
    `git commit -F -` for multiline messages (backticks in a `-m` string trigger bash
    command substitution). Windows LF→CRLF warnings on `git add` are benign.
  - Worktree gotcha: don't `git checkout main` here (the main worktree holds it).
    Branch each feature from `origin/main`; merge with `gh pr merge --squash` (skip
    `--delete-branch` — it errors trying to switch to main).
  - Run `npm run build` before opening any PR that touches app code.
  - Agent-first visual verification for UI changes. `preview_eval` carried the S46
    proof (timed the real scrape end-to-end); lean on `preview_snapshot` /
    `preview_eval` / `preview_inspect` for structural proof. App base path is
    `/kospos/`; clear `localStorage['kospos:dev-mode']` + reload to test the dev-off
    default.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - No promotion of Payroll / Hiring Plan / Inactive / Separations / Temp Limits /
    Reporting Tree to non-dev yet — exercise the Data tab + top-bar Save/Load + dev
    toggle + the now-fast scrape on real data first. (Separations / Inactive are the
    eventual first promotion candidates per the S46 IA review.)
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred with
    reason; only revisit if Alex asks.
  - Named workspaces / R2 migration — later candidates.
  - Auth / login — deferred until Alex shares KosPos for testing; the dev toggle stays
    a plain switch until then.

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.w status + next-session prompt for Phase 2.2.x.
  - Carry-forward update on items B, C, D, F, I, L, N, O (+ H/M/R/K as picked).
  - Fire the Phase 2.2.w close audit (mirrors the 2.2.v audit format) **if 2.2.w shipped**.
