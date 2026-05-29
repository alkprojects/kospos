# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 43 — Phase 2.2.s, 2026-05-28)

**Phase:** **Phase 2.2.s shipped** — Option C: cross-tab nav from Eligibility → Positions + promote the Eligibility + Probation tabs out of `devOnly`. The next sub-phase pick (**2.2.t**) moves to Session 44.
**Last main commit:** this docs PR → [#142](https://github.com/alkprojects/kospos/pull/142) (the feature) → [#141](https://github.com/alkprojects/kospos/pull/141) (S42 close).
**Tests:** **839 / 839** (+14 from #142).
**Branches in flight:** none post-merge (this docs PR pending). The merged feature branch's remote was deleted.
**Live site:** GitHub Pages deploy for #142 succeeded; https://alkprojects.github.io/kospos/ is in sync.

### What shipped

| # | PR | What |
|---|---|---|
| 1 | [#142](https://github.com/alkprojects/kospos/pull/142) | Cross-tab nav: a "Positions →" pill on each Eligibility row sets a shared `usePositionsScope` job-code filter (mirrors `useLaborScope`) + fires `onViewPositions` → App switches to Positions, which filters + shows a clearable banner. Eligibility + Probation promoted out of `devOnly`. +14 tests. |
| 2 | this docs PR | Phase 2.2.s close audit + S43 SESSION_LOG + this handoff |

**Design pick (decided at top of session):** shared Zustand scope store, *not* URL routing — the app has no router and the Positions→Payroll nav already works this way. Trade-off (filter not URL-bookmarkable) accepted for a single-snapshot local workspace. Verified end-to-end via the preview tools (agent-first). Details in [`docs/audits/phase-2-2-s-close-audit.md`](audits/phase-2-2-s-close-audit.md).

### Carry-forward audit

| # | Item | Prior status | This session | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | stays dropped |
| B | Trim/summarize SESSION_LOG.md | ~3,860 ln (S42) | ~3,990 ln (S43) | **deferred-with-reason (P6)** — Alex reviews the log; don't thin |
| C | Memory-citation anti-pattern in labor-report.md | 12 instances | unchanged | bundleable with a future labor-report pass |
| D | labor-report.md split | 8,518 ln | unchanged | **deferred-with-reason (P6)** — human-skim only; lower value under 1M ctx |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | stays dropped |
| F | Audit cadence | 18th trigger (S41) | **19th trigger (this session)** | working as designed |
| G | ~~Cloudflare deploy verification~~ | resolved S41 | n/a | stays retired |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | carries 5+ sessions | unchanged (guardrail kept it out of #142) | **now a clean standalone refactor — strong 2.2.t candidate** |
| I | Cloudflare hardening SEC-2 (read-path gzip-bomb size cap) + SEC-3 (POST rate-limit) | documented S42 | unchanged | tracked for named-workspace v2 |
| J | ~~launch.json dev-port collision~~ | resolved S42 (#139) | n/a | stays retired |
| — | ~~Cross-tab nav Eligibility→Positions~~ (was "Recommended Option C", carried S40–S43) | open 4 sessions | **shipped (#142)** | **resolved** |

### Blockers for Alex

- **Cloudflare API token (S41):** its same-day TTL means it has auto-expired by now; no action needed unless you want to confirm via Cloudflare → My Profile → API Tokens. (Last mention — dropping from future handoffs.)

---

## Next session prompt — Session 44 = Phase 2.2.t pick

This is the block Alex pastes to start Session 44. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.t) and ships it. Session 43 shipped 2.2.s (cross-tab nav Eligibility→Positions + promoted those two tabs to non-dev). Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 model default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file — recommendation + carry-forwards)
- `docs/SESSION_LOG.md` (Session 43 entry — Phase 2.2.s)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-s-close-audit.md` (the S43 close audit — carry-forwards + the Vite dynamic-import store-seeding technique for preview verification)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10`
- Tests baseline: `cd app && npm install && npm test` should show **839 / 839** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.t close audit cadence check
==============================================================================
The Phase 2.2.s close audit fired in S43. The **Phase 2.2.t close audit fires when 2.2.t ships** — do it before this session ends, mirroring the [Phase 2.2.s close audit](audits/phase-2-2-s-close-audit.md) format (incl. its carry-forward table). If 2.2.t does NOT ship this session, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.t
==============================================================================
Use AskUserQuestion. No single option has carried for multiple sessions now (the long-standing Option C shipped in S43), so this is a more open pick.

  E. 2.2.19 `lib/views/temp-limits/` + TemporaryExchange typed entity
     (SUGGESTED — lowest-risk, prep done) — Tab 12 Cat 16/17/18 expiry +
     1040-hour gauges. Confirmation-only on the 4 TX TODOs per
     docs/research/cat-17-18-tx-rules-s40.md. Directly relevant to Alex's
     TEMP-limit tracking. tab to App.tsx (devOnly initially); tests +
     preview walkthrough.

  H. Lift the modal overlay-frame → `lib/ui/Modal.tsx` (carry-forward,
     5+ sessions). Now 6+ instances of the same fixed-overlay-no-Portal
     pattern (Positions, Labor, Eligibility, Probation, Separations,
     PlannedAction). Clean standalone refactor; ~1-2 hours. Pays down
     real debt between feature builds.

  F. 2.2.22 `lib/views/vacancies/` — Tab 23 filtered position list,
     cross-checked against the Staffing Plan's planned actions. Clean
     standalone view, ~2-3 hours. devOnly initially.

  D. 2.2.18 `lib/views/reporting-tree/` — Tab 21 (org-chart preview +
     data-quality flags + Change Mode precursor). Scope risk: the
     `lib/changes/` stub lifts alongside.

  G. GitHub Pages → Cloudflare cutover (Step 10 of the runbook). Add
     `_redirects` + HTML meta-refresh from github.io → pages.dev.
     ~1-2 hours.

  (Paste freeform feedback / UX rough edges instead — Alex's freeform
   feedback has driven most recent top scope. Or name anything else from
   the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.t (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If E — temp-limits-view:
  Branch: feat/temp-limits-view
  Scope: confirm the 4 TX TODOs (5a-5d) per cat-17-18-tx-rules-s40.md
    (5-min confirmation, not open research); add `lib/temp-exchange/` typed
    entity; build `lib/views/temp-limits/` (Tab 12); surface
    temp-tx-expiration-imminent + temp-tx-expired flags via `lib/quality/`;
    tab to App.tsx (devOnly); tests + preview walkthrough.

If H — modal-overlay-frame refactor:
  Branch: refactor/ui-modal-overlay-frame
  Scope: extract the repeated fixed-overlay (backdrop + centered card + Esc/
    backdrop-close, role="dialog") into `lib/ui/Modal.tsx`; migrate the 6+
    call sites one at a time within the PR; NO behavior change; tests stay
    green + preview spot-check 2-3 modals. (This is the one case where
    touching many files in one PR is correct — it's a single logical
    refactor, not bundling.)

If F — views/vacancies:
  Branch: feat/views-vacancies
  Scope: `lib/views/vacancies/` (Tab 23 filtered position list); cross-check
    against Hiring Plan PlannedActions; tab to App.tsx (devOnly); tests.

If D — views/reporting-tree:
  Branch: feat/views-reporting-tree
  Scope: `lib/views/reporting-tree/` (Tab 21); surface Scenario 1 flags via
    `lib/quality/`; optionally lift `lib/changes/` from stub; tab to App.tsx
    (devOnly); tests.

If G — github-pages-cloudflare-cutover:
  Branch: chore/cloudflare-cutover
  Scope: app/public/_redirects → `/* https://kospos.pages.dev/:splat 302`;
    app/index.html meta-refresh (ONLY when serving from github.io); ensure
    the GitHub Pages build still produces the right paths while the
    meta-refresh exists; tests + preview walkthrough.

If freeform feedback:
  Scope depends on what Alex says. Treat as primary; queue the menu as
  fallback.

==============================================================================
Hard constraints
==============================================================================
  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR (the modal refactor is one logical change,
    so its multi-file touch is fine — that is NOT bundling).
  - `npm test` stays green (currently 839 / 839).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - Run `npm run build` before opening any PR that touches app code.
  - Agent-first visual verification for UI changes (preview tools). For
    store-driven features, seed stores live via `preview_eval` +
    `import('/kospos/src/lib/.../store.ts')` — see the S43 close audit.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (the modal refactor's multi-file touch is the documented
    single-logical-change exception).
  - No promotion of Payroll / Hiring Plan / Inactive / Separations / Temp
    Limits / Reporting Tree to non-dev yet — wait until the new cross-tab
    nav has been exercised on real data first.
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred
    with reason; only revisit if Alex asks.
  - Named workspaces / R2 migration — Phase 2.2.t+ candidates; v1 single
    shared snapshot is verified working; R2 only if snapshot > 25 MB
    compressed (~8 MB now).

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.t status + next-session prompt for Phase 2.2.u.
  - Carry-forward update on items B, C, D, F, H, I (A, E, G, J retired/
    dropped). Update H if the modal refactor ships.
  - Fire the Phase 2.2.t close audit (mirrors the 2.2.s audit format) **if
    2.2.t shipped**.
