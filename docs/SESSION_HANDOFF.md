# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here. (Slimmed in S42 after it had grown to 494 KB / 6,143 lines of stacked archives, against ADR-008's intent.)

The next session reads this before doing anything else.

---

## Current status (end of Session 42 — Opus 4.8 setup review, setup-only, 2026-05-28)

**Phase:** No Phase 2.2 sub-phase shipped — a deliberate **setup-only** session triggered by Alex's directive: *"opus 4.8 was just released. do a deep review and audit to determine if there are any improvements to this project setup and any new opportunities for improvement."* The Phase 2.2.s pick + ship moves to **Session 43**.
**Last main commit:** this docs PR (#141) → [#140](https://github.com/alkprojects/kospos/pull/140) constant-time secret + security review → [#139](https://github.com/alkprojects/kospos/pull/139) dev-server strictPort → [#138](https://github.com/alkprojects/kospos/pull/138) Opus 4.8 collab-docs refresh.
**Tests:** 825 / 825 (+2 from #140's security-fix tests).
**Branches in flight:** none post-merge (this docs PR pending).

### What shipped — 4 PRs

| # | PR | What |
|---|---|---|
| 1 | [#138](https://github.com/alkprojects/kospos/pull/138) | Opus 4.8 review doc + applied P1–P4 to CLAUDE.md + WORKFLOW.md (model default, agent-first visual verification, Skills/Workflow section, 1M-context session-sizing) |
| 2 | [#139](https://github.com/alkprojects/kospos/pull/139) | `vite.config` `strictPort` — dev-server port collisions fail loudly (P2) |
| 3 | [#140](https://github.com/alkprojects/kospos/pull/140) | Cloudflare write-path security review + constant-time publish-secret check (P7) |
| 4 | #141 | This docs PR — slim SESSION_HANDOFF.md (P5) + S42 SESSION_LOG + this handoff |

### The Opus 4.8 review (`docs/audits/internal-opus-4-8-setup-review.md`)

7 findings; 6 applied (P1–P5, P7), 1 deferred (P6):
- **P1 (applied)** — model guidance → **Opus 4.8 (fast mode) default**; Sonnet/Haiku reframed as optional cost-savers.
- **P2 (applied)** — visual verification is **agent-first** (preview tools); launch.json port hazard fixed via `vite.config` `strictPort`.
- **P3 (applied)** — new **"Skills and the Workflow tool"** section (Workflow is opt-in only).
- **P4 (applied)** — 1M-context session-sizing reframe; continuity machinery preserved.
- **P5 (applied)** — this handoff slimmed back to ADR-008 intent.
- **P6 (deferred, with reason)** — labor-report.md split + SESSION_LOG summarization: human-skim only; 1M context lowers the split's value; summarizing thins Alex's review record.
- **P7 (applied)** — Cloudflare write-path security review (`docs/audits/cloudflare-write-path-security-review.md`); SEC-1 timing-side-channel fixed.

### Carry-forward audit

| # | Item | Prior status | This session | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | stays dropped |
| B | Trim/summarize SESSION_LOG.md | ~3,610 ln after S41 | ~3,860 ln after S42 | **deferred-with-reason (P6)** — Alex reviews the log; don't thin |
| C | Memory-citation anti-pattern in labor-report.md | 12 instances | unchanged | bundleable with a future labor-report pass |
| D | labor-report.md split | 8,518 ln | unchanged | **deferred-with-reason (P6)** — human-skim only; lower value under 1M ctx |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | stays dropped |
| F | Audit cadence | 18th trigger (S41) | out-of-band capability trigger this session | working as designed |
| G | ~~Cloudflare deploy verification~~ | resolved S41 | n/a | stays retired |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | carries 4+ sessions | unchanged | still queued; don't bundle with C/D/F/G |
| I | Cloudflare hardening SEC-2 (read-path gzip-bomb size cap) + SEC-3 (POST rate-limit) | new this session | documented | tracked for named-workspace v2 |
| J | launch.json dev-port collision hazard | open since S19 | **RESOLVED (#139 strictPort)** | retired |

### Blockers for Alex

- **Revoke the Cloudflare API token** from S41 (Cloudflare → My Profile → API Tokens) if not already done. It was scoped (Workers KV Edit + Pages Edit) with a TTL, so it auto-expires, but explicit revoke is cleaner.

---

## Next session prompt — Session 43 = Phase 2.2.s pick

This is the block Alex pastes to start Session 43. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.s) and ships it. Session 42 was a setup-only session (Opus 4.8 capability review + 4 PRs); no feature sub-phase shipped, so 2.2.s is still open. Default model is now **Opus 4.8 with fast mode** (per the refreshed WORKFLOW.md).

Read first, in order:
- `docs/CLAUDE.md` (refreshed S42 — Opus 4.8 model default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file — recommendation + carry-forwards)
- `docs/SESSION_LOG.md` (Session 42 entry — Opus 4.8 setup review)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol" (both refreshed S42)
- `docs/audits/internal-opus-4-8-setup-review.md` (the S42 review — P6 deferred items)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10`
- Tests baseline: `cd app && npm test` should show **825 / 825**.

==============================================================================
STEP 0 — Phase 2.2.s close audit cadence check
==============================================================================
The Phase 2.2.r close audit fired in S41; the S42 Opus-4.8 review was an out-of-band capability audit (not a phase close). The **Phase 2.2.s close audit fires when 2.2.s ships** — do it before this session ends, using the Phase 2.2.r close audit format (mirror its carry-forward table). If 2.2.s does NOT ship this session, no close audit fires.

==============================================================================
STEP 1 — Cloudflare API token (~30 sec, if not already done)
==============================================================================
If Alex hasn't already revoked the S41 Cloudflare API token, do so now (Cloudflare → My Profile → API Tokens). For future autonomous Cloudflare sessions, see runbook Appendix A (create a fresh scoped token then).

==============================================================================
STEP 2 — Ask Alex to pick Phase 2.2.s
==============================================================================
Use AskUserQuestion. Option C is the top pick — Recommended for FOUR consecutive sessions now (S40, S41, S42, S43); bumped each time by higher-priority work that's now resolved.

  C. Cross-tab nav from Eligibility → Positions + lift devOnly
     (RECOMMENDED — carries 4+ sessions) — Clicking a job code in
     Eligibility filters the Positions tab. ~1-2 hours. Unlocks
     promoting Eligibility + Probation tabs to non-dev.

  D. 2.2.18 lib/views/reporting-tree/ + Change Mode precursor.
     Tab 21. lib/changes/ stub needs to lift alongside (scope risk).

  E. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity.
     Cat 17/18 expiry + 1040-hour gauges. Confirmation-only on the
     4 TX TODOs (per docs/research/cat-17-18-tx-rules-s40.md).

  F. 2.2.22 lib/views/vacancies/ — Tab 23 light-weight filtered
     position list. ~2-3 hours.

  G. GitHub Pages → Cloudflare cutover (Step 10 of the runbook).
     Add `_redirects` + HTML meta-refresh from github.io → pages.dev.
     ~1-2 hours. Bundleable with C (cross-tab nav).

  H. Paste freeform feedback (UX rough edges, anything from using the
     app). Alex's freeform feedback has driven most recent top scope.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 3 — Start Phase 2.2.s (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If C — eligibility-positions-crosstabnav-and-promote:
  Branch: feat/eligibility-positions-crosstabnav-and-promote
  Scope:
    - Cross-tab nav (shared Zustand "active filter" slice OR URL hash
      route — design pick at top of session)
    - Lift `devOnly: true` on Eligibility + Probation tabs in App.tsx
    - Tests + preview-tool walkthrough (agent-first per WORKFLOW.md)

If D — views/reporting-tree/:
  Branch: feat/views-reporting-tree
  Scope: lib/views/reporting-tree/ (Tab 21); surface Scenario 1 flags via
    lib/quality/; optionally lift lib/changes/ from stub; tab to App.tsx
    (devOnly initially); tests.

If E — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope: confirm the 4 TX TODOs (5a-5d) per cat-17-18-tx-rules-s40.md
    (5-min confirmation, not open research); add lib/temp-exchange/ typed
    entity; build lib/views/temp-limits/ (Tab 12); surface
    temp-tx-expiration-imminent + temp-tx-expired flags; tab to App.tsx
    (devOnly); tests + preview-tool walkthrough.

If F — views/vacancies/:
  Branch: feat/views-vacancies
  Scope: lib/views/vacancies/ (Tab 23 filtered position list); cross-check
    against Hiring Plan PlannedActions; tab to App.tsx (devOnly); tests.

If G — github-pages-cloudflare-cutover:
  Branch: chore/cloudflare-cutover
  Scope: app/public/_redirects → `/* https://kospos.pages.dev/:splat 302`;
    app/index.html meta-refresh (ONLY when serving from github.io); ensure
    the GitHub Pages build still produces the right paths while the
    meta-refresh exists; tests + preview-tool walkthrough.

If H — Alex's freeform feedback:
  Scope depends on what Alex says. Treat as primary; queue the menu above
  as fallback.

==============================================================================
Hard constraints
==============================================================================
  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - `npm test` stays green (currently 825 / 825).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - Run `npm run build` before opening any PR that touches app code.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling. No tab walkthroughs (Phase 2.0 is closed).
  - No promotion of Payroll / Hiring Plan / Inactive / Separations / Temp
    Limits / Reporting Tree to non-dev yet — wait until cross-tab nav has
    been used end-to-end on real data (Option C is the unlock for
    Eligibility + Probation).
  - Don't lift the modal overlay-frame to lib/ui/Modal.tsx in the same PR
    as Option C/D/F/G — separate refactor (carry-forward H).
  - Named workspaces / multi-user editing — Phase 2.2.s+ candidate. v1
    (anyone-with-the-link single shared snapshot) is verified working.
  - R2 migration — only if snapshot exceeds 25 MB compressed (~8 MB now).
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred
    with reason in the S42 review; only revisit if Alex asks.

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.s status + next-session prompt for Phase 2.2.t.
  - Carry-forward update on items B, C, D, F, H, I (A, E, G, J retired/dropped).
  - Fire the Phase 2.2.s close audit (mirrors Phase 2.2.r audit format) **if
    2.2.s shipped**.
