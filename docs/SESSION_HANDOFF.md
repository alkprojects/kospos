# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 48 — Phase 2.2.x, 2026-05-29)

**Phase:** **Phase 2.2.x shipped — the no-visual-change core of the C-series UI-primitives arc** (Alex picked C1+C4+C5; away on remote). Shipped as three single-purpose PRs. **C4 + the C5 color-consolidation tail were deliberately deferred** — they move pixels and need Alex's aesthetic sign-off — into a decision-ready proposal. Next sub-phase pick (**2.2.y**) moves to Session 49.
**Last main commit:** the S48 code-health-review docs PR (a bonus safe-dedup menu the away-time review agents produced — [s48-code-health-review.md](proposals/s48-code-health-review.md)); before it, the Phase 2.2.x close PR ([#164](https://github.com/alkprojects/kospos/pull/164)) + the three feature PRs [#161](https://github.com/alkprojects/kospos/pull/161) [#162](https://github.com/alkprojects/kospos/pull/162) [#163](https://github.com/alkprojects/kospos/pull/163).
**Tests:** **874 / 874** (no delta — pure refactors).
**Branches in flight:** none post-merge.
**Live site:** GitHub Pages + Cloudflare deploys green.

### What shipped

| PR | Pick | What |
|---|---|---|
| [#161](https://github.com/alkprojects/kospos/pull/161) | **C1** | **Modal/detail-editor primitives → `lib/ui`.** `ModalFooter`/`Field`/`OverrideBox`/`CloseButton` + `inputStyle` extracted; the 3 detail editors collapse to field schemas. +290/−311, no visual change. |
| [#162](https://github.com/alkprojects/kospos/pull/162) | **C5 p1** | **Semantic color tokens.** 108 status-palette hex literals → 10 `--success/--warn/--caution/--danger/--neutral(+ -soft)` tokens at exact values; folded re-hardcoded accent blue into `--accent`. Zero value change. |
| [#163](https://github.com/alkprojects/kospos/pull/163) | **C5 p2** | **`lib/ui/Badge`.** 3 copied `badge()` helpers → 1 component (`tone` + `color`/`bg`). |
| this docs PR | — | Phase 2.2.x close audit + S48 SESSION_LOG + this handoff + the deferred-work proposal. |

### Carry-forward audit

| # | Item | This session | Disposition |
|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md | grew with S48 | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split (8,518 ln) | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | **24th event-based trigger** | working as designed |
| I | Cloudflare hardening SEC-2 + SEC-3 | unchanged | tracked for named-workspace v2 |
| L | dev-mode/permissions ADR | not picked | optional — Alex's call (proposals B3) |
| N | Deep-link Data sub-tabs from landing | unchanged | minor UX, optional (proposals A2/A5) |
| O | Post-refresh IDB auto-save freeze (~5s @ 375 MB) | unchanged | **spawned task stands** — own change (persistence) |
| ~~C1~~ | ~~Extract `ModalFooter`/`Field`/✕/`OverrideBox`~~ | **shipped (#161)** | **RESOLVED — retired** |
| ~~popup~~ | ~~The popup suggestion~~ | Alex: **"don't remember — skip it"** | **RESOLVED — dropped** |
| **D1/D2/D3** | **The C-series aesthetic tail** (Button+radius scale · color consolidation · chip-shape/close-button unification) | **new — deferred for sign-off** | **strong 2.2.y candidate** — see [proposal](proposals/s48-ui-primitives-followups.md) |
| **CH** | **Code-health safe-dedup menu** (S48 review agents — `Stat`/`fmtMoney`/importer helpers/store-history/stale comments) | **new — proposals doc** | behavior-neutral away-session fodder — [s48-code-health-review.md](proposals/s48-code-health-review.md) |

### For Alex to weigh in on (non-blocking) — two small aesthetic decisions unblock the rest of the C-series
- **D1 — canonical pill/button radius?** Buttons currently use 2…20 inconsistently. A shared `Button` standardizes them. Recommend **`--radius-pill: 12`** (least movement). Pick 10 / 12 / 14.
- **D2 — should the interactive red `#b91c1c` (Delete buttons, required-asterisk) become its own `--danger-strong` token**, distinct from the status-text `--danger` `#7f1d1d`? Recommend **yes**.
- Answer those two and D1/D2 become mechanical next session. Full menu in [`docs/proposals/s48-ui-primitives-followups.md`](proposals/s48-ui-primitives-followups.md).

---

## Next session prompt — Session 49 = Phase 2.2.y pick

This is the block Alex pastes to start Session 49. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.y) and ships it. Session 48 shipped 2.2.x — the **no-visual-change core of the C-series UI-primitives arc** (C1 modal-component extraction #161, C5p1 color tokens #162, C5p2 Badge #163), each as its own PR; **C4 + the color-consolidation tail were deferred** for an aesthetic sign-off (see the proposal). Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file — recommendation + carry-forwards)
- `docs/SESSION_LOG.md` (Session 48 entry — Phase 2.2.x)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-x-close-audit.md` (the S48 close audit — carry-forwards)
- `docs/proposals/s48-ui-primitives-followups.md` (the deferred C-series tail — D1/D2/D3, decision-ready)
- `docs/proposals/s48-code-health-review.md` (NEW — behavior-neutral safe-dedup batches from the S48 review agents; ideal away-session PRs)
- `docs/proposals/s46-ui-ux-review.md` (the still-live broader UI/UX menu)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10`
- Tests baseline: `cd app && npm install && npm test` should show **874 / 874** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.y close audit cadence check
==============================================================================
The Phase 2.2.x close audit fired in S48. The **Phase 2.2.y close audit fires when 2.2.y ships** — do it before this session ends, mirroring [the 2.2.x close audit](audits/phase-2-2-x-close-audit.md) format (incl. its carry-forward table). If 2.2.y does NOT ship, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.y
==============================================================================
Use `AskUserQuestion` for the pick (S44–S48 lesson: plain + concrete options — live-site outcomes, not architecture). Two of the strongest candidates need an aesthetic sign-off first — **fold those two questions into the pick** if Alex leans that way:

  D1. **Finish C4 — shared `Button` + radius scale.** The biggest remaining dedup (~84 buttons, radii sprawled 2…20). Standardizes radii (a *visible* change). **Needs:** the canonical pill radius (recommend 12). `ModalFooter` becomes its first consumer. ~1 PR. (proposal D1)

  D2. **Finish C5 — consolidate the near-duplicate color families** (#2563eb/#dc2626/#c0392b/#27ae60/… → the palette tokens) + add `--danger-strong` (#b91c1c) for the interactive red. *Visible* (small shade shifts). ~1 PR. (proposal D2)

  B2. **De-risk the dev-mode gear** (P1) — a bare ⚙ one click from Save/Load reshuffles the whole tab strip with no confirm. VISIBLE + safe + reviewable; good if Alex wants a non-refactor change. Small `App.tsx` change.

  B3 / L. **Write the dev-mode/permissions ADR** (docs-only) — consolidate the rationale before a 4th drift. Cheap.

  CH. **Safe-dedup batches** (`docs/proposals/s48-code-health-review.md`) — behavior-neutral, no sign-off needed: `lib/format.ts` (money formatters, 5+3 copies), `lib/ui/Stat` (7 copies), importer `cells.ts` (`num`/`str`/`col`), the stale-"lost on reload"-comment sweep (clears the 3-audit `pdfCache` carry-forward + 4 siblings), `lib/store-history.ts` (the biggest LOC win). Each ~1 small PR, computed-style/test verifiable. Ideal if Alex wants safe throughput or another away-session.

  (Other menu items: D3 chip-shape/close-button unification (= U7 in the code-health doc) · A3/A4 confirm-on-clear + auto-open paste fallback · A2/N deep-link the right Data sub-tab. Plus the standing dependency-graph menu: O the IDB-freeze (spawned task) · P source-tables-under-Data · 2.2.19 temp-limits · 2.2.22 vacancies · Cloudflare cutover. Freeform feedback / a bug report is welcome — it has driven several sessions' top scope.)

==============================================================================
STEP 2 — Start Phase 2.2.y (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick (single-purpose branch from `origin/main`).

If D1 — `Button` + radius scale:
  Branch: `refactor/ui-button-radius`
  Scope: add `--radius-*` tokens (Alex's chosen pill radius); `lib/ui/Button` (`variant: primary|secondary|danger`, `size`); migrate the ~84 buttons + point `ModalFooter` at it. This DOES change some button radii — verify before/after live + present proof; Alex signs off the look.

If D2 / B2 / B3 / a proposals item / freeform:
  Scope per the proposal / what Alex says. Treat freeform as primary; the menu is fallback.

==============================================================================
Hard constraints
==============================================================================
  - Branch from `origin/main`, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor is one logical change — that is NOT bundling). If Alex asks for several, ship them as separate sequential PRs (merge each, re-branch the next from updated main — that kept S47+S48's overlapping branches conflict-free).
  - `npm test` stays green (currently 874 / 874).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the `Co-authored-by:` line. Use a single-quoted heredoc `git commit -F -` for multiline messages. Windows LF→CRLF warnings are benign.
  - Worktree gotcha: don't `git checkout main` here. Branch each feature from `origin/main`; merge with `gh pr merge --squash` (skip `--delete-branch` — it errors switching to main).
  - Run `npm run build` before opening any PR that touches app code.
  - **Aesthetic sign-off:** D1/D2 *change pixels* — verify before/after live and present proof; Alex makes the final call on the look. Don't ship a visual change blind (S48 lesson). For no-visual-change refactors, computed-style assertions (read the rendered rgb/radius and compare to the prior literal) are the proof of choice.
  - Agent-first visual verification for UI changes. App base path is `/kospos/`; clear `localStorage['kospos:dev-mode']` + reload to test the dev-off default.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - No promotion of Payroll / Hiring Plan / Inactive / Separations / Temp Limits / Reporting Tree to non-dev yet — exercise Source Tables + Save/Load + dev toggle + the fast scrape on real data first. (Separations / Inactive are the first promotion candidates per the S46 IA review.)
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred with reason.
  - Named workspaces / R2 migration — later. Auth / login — deferred until KosPos is shared.

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.y status + next-session prompt for Phase 2.2.z.
  - Carry-forward update on items B, C, D, F, I, L, N, O, D1/D2/D3 (+ whatever 2.2.y picks).
  - Fire the Phase 2.2.y close audit (mirrors the 2.2.x audit format) **if 2.2.y shipped**.
