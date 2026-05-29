# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 47 — Phase 2.2.w, 2026-05-29)

**Phase:** **Phase 2.2.w shipped — all four top UI/UX picks**, each as its own single-purpose PR (Alex delegated: *"whatever you suggest, can you do all this session?"*). The next sub-phase pick (**2.2.x**) moves to Session 48.
**Last main commit:** this docs PR (Phase 2.2.w close). The four feature PRs are merged: [#156](https://github.com/alkprojects/kospos/pull/156) [#157](https://github.com/alkprojects/kospos/pull/157) [#158](https://github.com/alkprojects/kospos/pull/158) [#159](https://github.com/alkprojects/kospos/pull/159).
**Tests:** **874 / 874** (+13 from this session: H +7, M +1, K +5).
**Branches in flight:** none post-merge (this docs PR pending).
**Live site:** GitHub Pages + Cloudflare deploys green.

### What shipped

| PR | Pick | What |
|---|---|---|
| [#156](https://github.com/alkprojects/kospos/pull/156) | **H** | **Modal overlay-frame → `lib/ui/Modal`.** Lifts the shell copy-pasted across 6 dialogs; adds focus-trap/restore (all 6) + role/aria/Esc for the 2 read-only viewers (closes P1 a11y C3/C6). ✕ buttons left as-is (the C1 follow-up). +7 tests. |
| [#157](https://github.com/alkprojects/kospos/pull/157) | **M** | **File-load scraper parity.** `loadFromFile` now restores scrapers via the shared `restoreStoresFromPayload` (was silently dropping them). +1 round-trip test. |
| [#158](https://github.com/alkprojects/kospos/pull/158) | **R** | **Tab rename.** "Data" → **Source Tables**, "Load Data" → **Load Reports** (kills the P1 label collision; one noun everywhere). Pure text. |
| [#159](https://github.com/alkprojects/kospos/pull/159) | **K** | **Keyboard-operable rows.** `lib/ui/rowButtonProps` makes the 5 mouse-only list views' detail rows openable by keyboard (P1 a11y C2). Composes with H's focus management. +5 tests. |
| this docs PR | — | Phase 2.2.w close audit + S47 SESSION_LOG + this handoff. |

### Carry-forward audit

| # | Item | This session | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md | grew with S47 | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split (8,518 ln) | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | **23rd event-based trigger** | working as designed |
| ~~H~~ | ~~Modal overlay-frame lift~~ | **shipped (#156)** | **RESOLVED — retired** |
| I | Cloudflare hardening SEC-2 + SEC-3 | unchanged | tracked for named-workspace v2 |
| L | dev-mode/permissions ADR | not picked | optional — Alex's call (proposals B3) |
| ~~M~~ | ~~File-load scraper parity~~ | **shipped (#157)** | **RESOLVED — retired** |
| N | Deep-link Data sub-tabs from landing | unchanged | minor UX, optional (proposals A2/A5) |
| O | Post-refresh IDB auto-save freeze (~5s @ 375 MB) | unchanged | **spawned task stands** — own change (persistence) |
| **C1** | **Extract `ModalFooter`/`Field`/✕/`OverrideBox` now that `Modal` exists** | **new — created by H** | **strong 2.2.x candidate** (the rest of the H payoff) |
| **popup** | **The popup suggestion Alex saw — he says it was NOT `/fewer-permission-prompts`** | **new — Alex to describe it** | **awaiting Alex** (transcript search blocked in unsupervised mode) |

### For Alex to weigh in on (non-blocking)
- **What was the popup?** You said last session's popup suggestion was "something else" (not the permission-prompts tip). Tell me what it suggested and I'll handle it. I held off on any settings change.
- **2.2.x pick** — the S46 proposals backlog still has good picks (see the next-session menu); **C1** (finish the modal extraction) is the natural follow-on to H.

---

## Next session prompt — Session 48 = Phase 2.2.x pick

This is the block Alex pastes to start Session 48. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.x) and ships it. Session 47 shipped 2.2.w — **all four** top S46 UI/UX picks (H modal-lift #156, M file-load parity #157, R tab rename #158, K keyboard rows #159), each as its own PR. Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file — recommendation + carry-forwards)
- `docs/SESSION_LOG.md` (Session 47 entry — Phase 2.2.w)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-w-close-audit.md` (the S47 close audit — carry-forwards)
- `docs/proposals/s46-ui-ux-review.md` (the still-live UI/UX menu)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10`
- Tests baseline: `cd app && npm install && npm test` should show **874 / 874** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.x close audit cadence check
==============================================================================
The Phase 2.2.w close audit fired in S47. The **Phase 2.2.x close audit fires when 2.2.x ships** — do it before this session ends, mirroring [the 2.2.w close audit](audits/phase-2-2-w-close-audit.md) format (incl. its carry-forward table). If 2.2.x does NOT ship, no close audit fires.

==============================================================================
STEP 1 — Resolve the popup item, then ask Alex to pick Phase 2.2.x
==============================================================================
First: **the popup.** Alex said last session's popup suggestion was NOT `/fewer-permission-prompts` — ask him what it actually suggested (or check if he left a note), then investigate/handle it. (Transcript search is blocked in unsupervised mode.)

Then use `AskUserQuestion` for the pick (S44–S47 lesson: plain + concrete options — live-site outcomes, not architecture). Strongest 2.2.x candidates:

  C1. **Finish the modal extraction** (the rest of the H payoff). Now that `lib/ui/Modal`
      exists, extract the shared `ModalFooter` (Delete/Cancel/Save — 3 copies),
      `Field` + `inputStyle` (twins in SeparationDetail/ProbationDetail), the ✕ close
      button, and the amber `OverrideBox` into `lib/ui/`. The 3 detail editors collapse
      to their field schemas. Pairs with C4 (a shared `Button`). Tests + preview.

  B2. **De-risk the dev-mode gear** (P1) — a bare ⚙ one click from Save/Load reshuffles
      the whole tab strip with no confirm. Options: visually separate it, confirm on
      *enable* only, or hide behind the `?dev=1` URL hatch. Small `App.tsx` change.

  B3 / L. **Write the dev-mode/permissions ADR** (docs-only) — the model has changed
      shape 3× and Phase 8 will replace it with SSO tiers; consolidate the rationale
      before a 4th drift. Cheap; prose already exists in the proposals doc.

  C4 + C5. **Shared `Button` + semantic color tokens + `Badge`** — ~84 ad-hoc button
      styles / ~109 hardcoded hex literals across the views. Pairs with C1.

  (Other menu items in the proposals doc: A3/A4 confirm-on-clear + auto-open paste
   fallback · A2/N deep-link the right Data sub-tab. Plus the standing dependency-graph
   menu: O the IDB-freeze (spawned task) · P source-tables-under-Data · 2.2.19 temp-limits
   · 2.2.22 vacancies · Cloudflare cutover. Freeform feedback / a bug report is welcome —
   it has driven several sessions' top scope.)

==============================================================================
STEP 2 — Start Phase 2.2.x (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick (single-purpose branch from `origin/main`).

If C1 — modal-component extraction:
  Branch: `refactor/ui-modal-footer-field`
  Scope: extract `ModalFooter`/`Field`/`TextInput`/`OverrideBox` into `lib/ui/`; migrate
    SeparationDetail / ProbationDetail / PlannedActionDetail (and EligibilityDetail's ✕)
    to them. NO behavior change beyond dedupe. Tests green + preview spot-check 2–3 editors.

If B2 / B3 / C4+C5 / a proposals item / freeform:
  Scope per the proposals doc / what Alex says. Treat freeform as primary; the menu is fallback.

==============================================================================
Hard constraints
==============================================================================
  - Branch from `origin/main`, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor like the modal-component extraction
    is one logical change — that is NOT bundling). If Alex again asks for several, ship
    them as separate sequential PRs (merge each, re-branch the next from updated main —
    that kept S47's overlapping H/K branches conflict-free).
  - `npm test` stays green (currently 874 / 874).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the `Co-authored-by:` line. Use a single-quoted heredoc
    `git commit -F -` for multiline messages. Windows LF→CRLF warnings are benign.
  - Worktree gotcha: don't `git checkout main` here. Branch each feature from `origin/main`;
    merge with `gh pr merge --squash` (skip `--delete-branch` — it errors switching to main).
  - Run `npm run build` before opening any PR that touches app code.
  - Agent-first visual verification for UI changes. App base path is `/kospos/`; clear
    `localStorage['kospos:dev-mode']` + reload to test the dev-off default. (Note: editing a
    live-running hook's selector count triggers a benign dev-only React hook-order HMR
    warning — confirm on a fresh reload before treating it as a bug.)

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - No promotion of Payroll / Hiring Plan / Inactive / Separations / Temp Limits /
    Reporting Tree to non-dev yet — exercise Source Tables + Save/Load + dev toggle + the
    fast scrape on real data first. (Separations / Inactive are the first promotion
    candidates per the S46 IA review.)
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred with reason.
  - Named workspaces / R2 migration — later. Auth / login — deferred until KosPos is shared.

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.x status + next-session prompt for Phase 2.2.y.
  - Carry-forward update on items B, C, D, F, I, L, N, O, C1 (+ whatever 2.2.x picks) + the popup.
  - Fire the Phase 2.2.x close audit (mirrors the 2.2.w audit format) **if 2.2.x shipped**.
