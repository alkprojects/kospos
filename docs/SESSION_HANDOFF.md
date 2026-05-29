# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 44 — Phase 2.2.t, 2026-05-28)

**Phase:** **Phase 2.2.t shipped** — driven by Alex's freeform feedback (not a menu sub-phase). Two items resolved across **three single-purpose code PRs**. The next sub-phase pick (**2.2.u**) moves to Session 45.
**Last main commit:** this docs PR → [#146](https://github.com/alkprojects/kospos/pull/146) (Load Data hub) → [#145](https://github.com/alkprojects/kospos/pull/145) (gating) → [#144](https://github.com/alkprojects/kospos/pull/144) (header fix).
**Tests:** **848 / 848** (+4 from #145, +5 from #146).
**Branches in flight:** none post-merge (this docs PR pending).
**Live site:** GitHub Pages + Cloudflare deploys green; https://alkprojects.github.io/kospos/ and https://kospos.pages.dev in sync.

### What shipped

| # | PR | What |
|---|---|---|
| 1 | [#144](https://github.com/alkprojects/kospos/pull/144) | Eligibility summary header: `alignItems: center` → `flex-start` so the four stat values share a baseline ("never" no longer droops). Style-only. Fixes Alex's "text is off for open posting and active lists." |
| 2 | [#145](https://github.com/alkprojects/kospos/pull/145) | Save/Publish gating + status summary now count scraper data (job postings + eligibility lists), so an eligibility-only refresh is savable + publishable like an upload. +4 tests. |
| 3 | [#146](https://github.com/alkprojects/kospos/pull/146) | **Load Data hub**: promote the importer tab out of `devOnly` + rename Load Reports → Load Data; move both refresh buttons (+ proxy/paste/clear) into a new `ScrapeSourcesPanel`; dev-gate the file importers + "Clear all loaded data"; Eligibility is now a pure read-only view. +5 tests. |
| 4 | this docs PR | Phase 2.2.t close audit + S44 SESSION_LOG + this handoff |

**Key finding:** the persistence pipeline *already* carried scraper data across sessions (IDB auto-save) and into the published snapshot — so "across sessions" was never broken. The real gaps were the Save/Publish gating (#145) and that Publish was unreachable on the non-dev site (resolved by promoting Load Data, #146). Details in [`docs/audits/phase-2-2-t-close-audit.md`](audits/phase-2-2-t-close-audit.md).

**Dev-mode model evolved:** dev mode now gates *in-tab controls* (file imports + clear on the always-visible Load Data tab), not just whole tabs. The live scrapes (postings + eligibility) stay available to everyone.

### Carry-forward audit

| # | Item | Prior status | This session | Disposition |
|---|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md | ~3,990 ln (S43) | ~3,900 ln | **deferred-with-reason (P6)** — Alex reviews the log; don't thin |
| C | Memory-citation anti-pattern in labor-report.md | 12 instances | unchanged | bundleable with a future labor-report pass |
| D | labor-report.md split | 8,518 ln | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | 19th trigger (S43) | **20th trigger (this session)** | working as designed |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | carries 5+ sessions | unchanged (no modal touched) | **leading standalone 2.2.u candidate** (6+ instances) |
| I | Cloudflare hardening SEC-2 (read-path gzip-bomb size cap) + SEC-3 (POST rate-limit) | documented S42 | unchanged | tracked for named-workspace v2 |
| K | Stale `scrapers/store.ts` header comment ("in-memory only … deferred" — false since 2.2.q) | **new this session** | not fixed (code-comment-only) | **low priority** — fix on next `scrapers/store.ts` touch |
| L | ADR for evolved dev-mode model (tab-hiding → also in-tab gating) | **new this session** | not added | **optional — Alex's call** |
| — | ~~Eligibility-refresh persistence + Load Data hub~~ (Alex S44 freeform) | new | **shipped (#144/#145/#146)** | **resolved** |
| — | ~~Publish unreachable on non-dev site~~ | discovered | **resolved (#146)** | **resolved** |
| — | A / E / G / J | retired/dropped earlier | n/a | stay retired/dropped |

### For Alex to weigh in on (non-blocking)
- **#146 dev-gated the "Clear all loaded data" button** (beyond your literal "grey out the upload") — for consistency, so a normal user can't wipe source data they can't re-import. Say the word if you'd rather it stay always-visible.
- **Optional ADR (item L)** for the evolved dev-mode model — only if you want it formalized.

---

## Next session prompt — Session 45 = Phase 2.2.u pick

This is the block Alex pastes to start Session 45. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.u) and ships it. Session 44 shipped 2.2.t — Alex's freeform feedback: eligibility-refresh persistence parity (#145) + the **Load Data hub** (#146, promoted that tab out of dev mode, moved the scrape refresh buttons there, dev-gated the file importers) + an Eligibility header alignment fix (#144). Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 model default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file — recommendation + carry-forwards)
- `docs/SESSION_LOG.md` (Session 44 entry — Phase 2.2.t)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-t-close-audit.md` (the S44 close audit — carry-forwards + the Vite dynamic-import store-seeding technique + the `preview_screenshot`-is-flaky note: lean on snapshot/eval/inspect)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10`
- Tests baseline: `cd app && npm install && npm test` should show **848 / 848** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.u close audit cadence check
==============================================================================
The Phase 2.2.t close audit fired in S44. The **Phase 2.2.u close audit fires when 2.2.u ships** — do it before this session ends, mirroring the [Phase 2.2.t close audit](audits/phase-2-2-t-close-audit.md) format (incl. its carry-forward table). If 2.2.u does NOT ship this session, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.u
==============================================================================
Use AskUserQuestion. (S44 lesson: keep the options plain + concrete, not jargon — Alex steers best on the live-site outcome, not the architecture.)

  H. **Lift the modal overlay-frame → `lib/ui/Modal.tsx`** (SUGGESTED —
     carry-forward 5+ sessions, now the cleanest standalone). 6+ instances
     of the same fixed-overlay-no-Portal pattern (Positions, Labor,
     Eligibility, Probation, Separations, PlannedAction). NO behavior
     change; migrate call sites one at a time within the PR; tests stay
     green + preview spot-check 2-3 modals. (This multi-file touch is the
     documented single-logical-change exception, not bundling.)

  E. 2.2.19 `lib/views/temp-limits/` + TemporaryExchange typed entity —
     Tab 12 Cat 16/17/18 expiry + 1040-hour gauges. Confirmation-only on
     the 4 TX TODOs per docs/research/cat-17-18-tx-rules-s40.md. Directly
     relevant to Alex's TEMP-limit tracking. tab to App.tsx (devOnly
     initially); tests + preview walkthrough.

  F. 2.2.22 `lib/views/vacancies/` — Tab 23 filtered position list,
     cross-checked against the Staffing Plan's planned actions. Clean
     standalone view, ~2-3 hours. devOnly initially.

  D. 2.2.18 `lib/views/reporting-tree/` — Tab 21 (org-chart preview +
     data-quality flags + Change Mode precursor). Scope risk: the
     `lib/changes/` stub lifts alongside.

  G. GitHub Pages → Cloudflare cutover (Step 10 of the runbook). Add
     `_redirects` + HTML meta-refresh from github.io → pages.dev.

  (Paste freeform feedback / UX rough edges instead — Alex's freeform
   feedback has driven the last several sessions' top scope. Or name
   anything else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.u (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If H — modal-overlay-frame refactor:
  Branch: `refactor/ui-modal-overlay-frame`
  Scope: extract the repeated fixed-overlay (backdrop + centered card + Esc/
    backdrop-close, role="dialog") into `lib/ui/Modal.tsx`; migrate the 6+
    call sites one at a time within the PR; NO behavior change; tests stay
    green + preview spot-check 2-3 modals.

If E — temp-limits-view:
  Branch: `feat/temp-limits-view`
  Scope: confirm the 4 TX TODOs (5a-5d) per cat-17-18-tx-rules-s40.md; add
    `lib/temp-exchange/` typed entity; build `lib/views/temp-limits/`
    (Tab 12); surface temp-tx-expiration flags via `lib/quality/`; tab to
    App.tsx (devOnly); tests + preview walkthrough.

If F — views/vacancies:
  Branch: `feat/views-vacancies`
  Scope: `lib/views/vacancies/` (Tab 23 filtered position list); cross-check
    against Hiring Plan PlannedActions; tab to App.tsx (devOnly); tests.

If D — views/reporting-tree:
  Branch: `feat/views-reporting-tree`
  Scope: `lib/views/reporting-tree/` (Tab 21); surface Scenario 1 flags via
    `lib/quality/`; optionally lift `lib/changes/` from stub; tab to App.tsx
    (devOnly); tests.

If G — github-pages-cloudflare-cutover:
  Branch: `chore/cloudflare-cutover`
  Scope: app/public/_redirects → `/* https://kospos.pages.dev/:splat 302`;
    app/index.html meta-refresh; tests + preview walkthrough.

If freeform feedback:
  Scope depends on what Alex says. Treat as primary; queue the menu as
  fallback. (Quick win available alongside: carry-forward K — fix the stale
  `scrapers/store.ts` header comment, a 2-minute chore PR.)

==============================================================================
Hard constraints
==============================================================================
  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR (the modal refactor is one logical change,
    so its multi-file touch is fine — that is NOT bundling).
  - `npm test` stays green (currently 848 / 848).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md. (S44
    gotcha: backticks in a `-m` string trigger bash command substitution —
    use a single-quoted heredoc `-F -` for multiline messages.)
  - Run `npm run build` before opening any PR that touches app code.
  - Agent-first visual verification for UI changes. `preview_screenshot`
    was flaky in S44 — lean on `preview_snapshot` / `preview_eval` /
    `preview_inspect` for structural proof; for store-driven features seed
    stores via `preview_eval` + `import('/kospos/src/lib/.../store.ts')`.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (the modal refactor's multi-file touch is the documented
    single-logical-change exception).
  - No promotion of Payroll / Hiring Plan / Inactive / Separations / Temp
    Limits / Reporting Tree to non-dev yet — wait until the new cross-tab
    nav + Load Data hub have been exercised on real data first.
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred
    with reason; only revisit if Alex asks.
  - Named workspaces / R2 migration — Phase 2.2.u+ candidates; v1 single
    shared snapshot is verified working; R2 only if snapshot > 25 MB
    compressed (~8 MB now).

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.u status + next-session prompt for Phase 2.2.v.
  - Carry-forward update on items B, C, D, F, H, I, K, L (A, E/G/J as picked, retired/dropped).
  - Fire the Phase 2.2.u close audit (mirrors the 2.2.t audit format) **if 2.2.u shipped**.
