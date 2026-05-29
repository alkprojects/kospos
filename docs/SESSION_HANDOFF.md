# Session Handoff

> **This file is OVERWRITTEN every session, not appended (ADR-008).** Keep it to three things: current status, carry-forwards, and the next-session prompt. Per-session history lives in `docs/SESSION_LOG.md` — do not re-accumulate it here.

The next session reads this before doing anything else.

---

## Current status (end of Session 45 — Phase 2.2.u, 2026-05-28)

**Phase:** **Phase 2.2.u shipped** — driven by Alex's freeform feedback (five items), not a menu sub-phase. Resolved across **4 feature/docs PRs + 1 chore**. The next sub-phase pick (**2.2.v**) moves to Session 46.
**Last main commit:** this docs PR → [#152](https://github.com/alkprojects/kospos/pull/152) (chore: store comment) → [#151](https://github.com/alkprojects/kospos/pull/151) (Data tab) → [#150](https://github.com/alkprojects/kospos/pull/150) (Save/Load top bar) → [#149](https://github.com/alkprojects/kospos/pull/149) (dev toggle) → [#148](https://github.com/alkprojects/kospos/pull/148) (roadmap tiers).
**Tests:** **857 / 857** (+1 #149, +1 net #150, +7 #151).
**Branches in flight:** none post-merge (this docs PR pending).
**Live site:** GitHub Pages + Cloudflare deploys green; https://alkprojects.github.io/kospos/ and https://kospos.pages.dev in sync.

### What shipped

| # | PR | What |
|---|---|---|
| 1 | [#148](https://github.com/alkprojects/kospos/pull/148) | **ROADMAP permission tiers** — Phase 8+ Regular / Dev / **Super-dev** (super-dev edits what the other tiers see + site functionality). Docs-only. |
| 2 | [#149](https://github.com/alkprojects/kospos/pull/149) | **Dev-mode gear toggle** — `enableDevMode()` + a header ⚙ that toggles both ways; no more typing `?dev=1` (URL flag kept as a hatch). |
| 3 | [#150](https://github.com/alkprojects/kospos/pull/150) | **Save/Load → top bar** — compact header control; Publish + Cloudflare settings stay on Load Data. New shared `useSessionSnapshot` hook. |
| 4 | [#151](https://github.com/alkprojects/kospos/pull/151) | **Data tab** — new top-level tab with sub-tabs (Eligibility Lists + new **Job Postings** table); Eligibility folded under it; Load Data stays separate. |
| 5 | [#152](https://github.com/alkprojects/kospos/pull/152) | **chore** — fixed the stale `scrapers/store.ts` "in-memory only" comment (clears carry-forward K). |
| 6 | this docs PR | Phase 2.2.u close audit + S45 SESSION_LOG + this handoff |

**Cloudflare deploy emails (item 4, answered — no code):** they're an **account-level Notification**, not a Pages-project setting. Turn off at dash.cloudflare.com → account → **Notifications** → the Pages **"Project updates"** notification → toggle **Enabled** off (or **⋯ → Delete**).

**Dev-mode model:** now a true in-app on/off toggle (gear), still gating both whole tabs and in-tab controls. The eventual tiered model (regular/dev/super-dev, auth-gated) is documented in ROADMAP Phase 8+.

### Carry-forward audit

| # | Item | Prior status | This session | Disposition |
|---|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md | ~3,826 ln (S44) | grew with S45 entry | **deferred-with-reason (P6)** |
| C | Memory-citation anti-pattern in `labor-report.md` | 12 instances | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | 8,518 ln | unchanged | **deferred-with-reason (P6)** |
| F | Audit cadence | 20th trigger (S44) | **21st trigger (this session)** | working as designed |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | carries 6+ sessions | unchanged (no modal touched) | **leading standalone 2.2.v candidate** (6+ instances) |
| I | Cloudflare hardening SEC-2 (gzip-bomb cap) + SEC-3 (POST rate-limit) | documented S42 | unchanged | tracked for named-workspace v2 |
| K | ~~Stale `scrapers/store.ts` comment~~ | new S44 | **fixed (#152)** | **resolved** |
| L | ADR for the evolved dev-mode model | new S44 (optional) | not added; **now stronger** (dev mode → in-app toggle; tiers on roadmap) | **optional — Alex's call** |
| M | **Session file-load doesn't restore scraper data** (Save includes it; only IDB auto-restore restores it) | **new this session** | flagged in-code (`use-session-snapshot.ts`), not fixed | **new — real bug; own change** |
| N | **Deep-link Data sub-tabs from the landing dashboard** (job-postings "Open →" → Job Postings sub-tab) | **new this session** | not done (current routing non-regressive) | **new — minor UX, optional** |
| — | ~~Alex S45 freeform (Data tab / dev toggle / roadmap / Cloudflare email / Save-Load)~~ | new | **shipped / answered** | **resolved** |
| — | A / E / G / J | retired/dropped earlier | n/a | E/G remain on the menu; A/J stay retired |

### For Alex to weigh in on (non-blocking)
- **Source tables under Data:** #151 left room to add the imported P&P / BFM / OBI tables as further **Data** sub-tabs — say the word and that's a clean 2.2.v.
- **File-load parity gap (M):** loading a saved session file doesn't bring back the job-postings / eligibility-lists (it does come back from the browser auto-restore). Worth a small fix PR if you hit it.
- **Optional dev-mode/permissions ADR (L):** only if you want the toggle + tiers formalized.

---

## Next session prompt — Session 46 = Phase 2.2.v pick

This is the block Alex pastes to start Session 46. Normal interactive work.

---

This session picks the next Phase 2.2 sub-phase (2.2.v) and ships it. Session 45 shipped 2.2.u — Alex's freeform feedback: the **Data tab** (#151, Eligibility Lists + new Job Postings sub-tables), an **in-app dev-mode gear toggle** (#149), **Save/Load moved to the top bar** (#150), a **ROADMAP permission-tiers** addition (#148), and a chore (#152). Default model is **Opus 4.8 with fast mode**.

Read first, in order:
- `docs/CLAUDE.md` (Opus 4.8 model default, agent-first visual verification)
- `docs/SESSION_HANDOFF.md` (this file — recommendation + carry-forwards)
- `docs/SESSION_LOG.md` (Session 45 entry — Phase 2.2.u)
- `memory/MEMORY.md` + the memory files
- `docs/WORKFLOW.md` § "Skills and the Workflow tool" + "Visual verification protocol"
- `docs/audits/phase-2-2-u-close-audit.md` (the S45 close audit — carry-forwards + the store-seeding / verification notes)
- `docs/domain/labor-report.md` § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
- `git log --oneline origin/main -10`
- Tests baseline: `cd app && npm install && npm test` should show **857 / 857** (run `npm install` first — a fresh worktree has no node_modules).

==============================================================================
STEP 0 — Phase 2.2.v close audit cadence check
==============================================================================
The Phase 2.2.u close audit fired in S45. The **Phase 2.2.v close audit fires when 2.2.v ships** — do it before this session ends, mirroring the [Phase 2.2.u close audit](audits/phase-2-2-u-close-audit.md) format (incl. its carry-forward table). If 2.2.v does NOT ship this session, no close audit fires.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.v
==============================================================================
Use AskUserQuestion. (S44/S45 lesson: keep options plain + concrete — live-site outcomes, not architecture. Batch any real design forks into one question.)

  H. **Lift the modal overlay-frame → `lib/ui/Modal.tsx`** (SUGGESTED —
     carry-forward 6+ sessions, the cleanest standalone). 6+ instances of
     the same fixed-overlay-no-Portal pattern (Positions, Labor, Eligibility,
     Probation, Separations, PlannedAction). NO behavior change; migrate call
     sites one at a time within the PR; tests stay green + preview spot-check
     2-3 modals. (Multi-file touch = the documented single-logical-change
     exception, not bundling.)

  P. **Source tables under Data** — add the imported P&P / BFM / OBI tables as
     further sub-tabs on the new Data tab (#151 left room). Natural follow-on;
     read-only tables like the new Job Postings view.

  M. **Fix the file-load scraper parity gap** — a manual session file-load
     restores everything except job postings / eligibility lists; make it
     restore scrapers too (Save already includes them). Small fix + a
     round-trip test. See the note in `lib/session/use-session-snapshot.ts`.

  E. 2.2.19 `lib/views/temp-limits/` + TemporaryExchange typed entity —
     Tab 12 Cat 16/17/18 expiry + 1040-hour gauges. Confirmation-only on the
     4 TX TODOs per docs/research/cat-17-18-tx-rules-s40.md. devOnly initially.

  F. 2.2.22 `lib/views/vacancies/` — Tab 23 filtered position list,
     cross-checked against the Staffing Plan's planned actions. devOnly.

  G. GitHub Pages → Cloudflare cutover (Step 10 of the runbook). Add
     `_redirects` + HTML meta-refresh from github.io → pages.dev.

  (Paste freeform feedback / UX rough edges instead — it has driven the last
   several sessions' top scope. Or name anything else from the dependency
   graph: 2.2.18 reporting-tree, the dev-mode/permissions ADR (L), etc.)

==============================================================================
STEP 2 — Start Phase 2.2.v (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If H — modal-overlay-frame refactor:
  Branch: `refactor/ui-modal-overlay-frame`
  Scope: extract the repeated fixed-overlay (backdrop + centered card + Esc/
    backdrop-close, role="dialog") into `lib/ui/Modal.tsx`; migrate the 6+
    call sites one at a time within the PR; NO behavior change; tests green +
    preview spot-check 2-3 modals.

If P — source tables under Data:
  Branch: `feat/data-source-tables`
  Scope: add P&P / BFM / OBI (`loadedRows` by `_source`) as read-only tables
    under the Data tab's sub-tab strip (`lib/views/data/DataView.tsx`); model
    on `JobPostingsView`; tests + preview walkthrough.

If M — file-load scraper parity:
  Branch: `fix/session-load-restores-scrapers`
  Scope: in `lib/session/use-session-snapshot.ts` `loadFromFile`, restore
    scraper state via `useScrapers.restoreFromSession(...)` from the parsed
    payload (mirror the IDB auto-restore); add a save→load round-trip test;
    preview spot-check.

If E — temp-limits-view:
  Branch: `feat/temp-limits-view`
  Scope: confirm the 4 TX TODOs (5a-5d) per cat-17-18-tx-rules-s40.md; add
    `lib/temp-exchange/` typed entity; build `lib/views/temp-limits/` (Tab 12);
    surface flags via `lib/quality/`; tab to App.tsx (devOnly); tests + preview.

If F — views/vacancies:
  Branch: `feat/views-vacancies`
  Scope: `lib/views/vacancies/` (Tab 23 filtered position list); cross-check
    against Hiring Plan PlannedActions; tab to App.tsx (devOnly); tests.

If G — github-pages-cloudflare-cutover:
  Branch: `chore/cloudflare-cutover`
  Scope: app/public/_redirects → `/* https://kospos.pages.dev/:splat 302`;
    app/index.html meta-refresh; tests + preview walkthrough.

If freeform feedback:
  Scope depends on what Alex says. Treat as primary; queue the menu as fallback.

==============================================================================
Hard constraints
==============================================================================
  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR (a multi-file refactor like the modal lift or
    a shared-hook extraction is one logical change — that is NOT bundling).
  - `npm test` stays green (currently 857 / 857).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the `Co-authored-by:` line per CLAUDE.md. Use a
    single-quoted heredoc `git commit -F -` for multiline messages (backticks
    in a `-m` string trigger bash command substitution). Windows LF→CRLF
    warnings on `git add` are benign.
  - Worktree gotcha: don't `git checkout main` here (the main worktree holds
    it). Branch each feature from `origin/main`; merge with `gh pr merge
    --squash` (skip `--delete-branch` — it errors trying to switch to main).
  - Run `npm run build` before opening any PR that touches app code.
  - Agent-first visual verification for UI changes. `preview_screenshot`
    worked reliably in S45 (it was flaky in S44) — still lean on
    `preview_snapshot` / `preview_eval` / `preview_inspect` for structural
    proof; the app's base path is `/kospos/`; clear `localStorage['kospos:dev-mode']`
    + reload to test the dev-off default.

==============================================================================
What we are NOT doing
==============================================================================
  - No bundling (multi-file single-logical-change refactors excepted).
  - No promotion of Payroll / Hiring Plan / Inactive / Separations / Temp
    Limits / Reporting Tree to non-dev yet — exercise the new Data tab +
    top-bar Save/Load + dev toggle on real data first.
  - P6 docs cleanups (labor-report split, SESSION_LOG summarize) — deferred
    with reason; only revisit if Alex asks.
  - Named workspaces / R2 migration — later candidates; v1 single shared
    snapshot is verified working; R2 only if snapshot > 25 MB compressed.
  - Auth / login — deferred until Alex shares KosPos for testing (per item 2);
    the dev toggle stays a plain switch until then.

==============================================================================
Session-end checklist
==============================================================================
Before ending, update SESSION_HANDOFF.md (overwrite — keep it lean) with:
  - Phase 2.2.v status + next-session prompt for Phase 2.2.w.
  - Carry-forward update on items B, C, D, F, H, I, L, M, N (E/G as picked).
  - Fire the Phase 2.2.v close audit (mirrors the 2.2.u audit format) **if 2.2.v shipped**.
