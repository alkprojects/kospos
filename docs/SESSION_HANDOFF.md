# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 36 — Phase 2.2.m: Eligibility summary-row redesign + filter toolbar + detail modal, 2026-05-27)

**Phase:** Phase 2.2.m — **Eligibility tab summary-row redesign + filter toolbar (search · status · exam type · department · citywide) + `EligibilityDetail` drill-down modal** ([PR #116](https://github.com/alkprojects/kospos/pull/116)). Phase 2.2.m close audit fired on schedule (13th event-based trigger).
**Last main commit:** [PR #116](https://github.com/alkprojects/kospos/pull/116) (Eligibility summary + filters + modal) → [PR #115](https://github.com/alkprojects/kospos/pull/115) (S35 audit + S36 handoff) → [PR #114](https://github.com/alkprojects/kospos/pull/114) (DHR CORS proxy).
**Tests:** 620 / 620 passing (+31 net from S36 baseline of 589, all from PR #116).
**Branches in flight:** none post-merge (this docs PR pending).
**Worktree hygiene:** PR #116 auto-archives on merge.

### What landed this session — 1 PR (plus this docs PR)

Alex's S36 prompt + added directive defined Phase 2.2.m on the spot: the per-row stack-of-links rendering from S35 had too much whitespace; ship a one-line-per-job-code summary with click-to-detail drill-down, plus filters for status / exam type / department / citywide-candidate. ~45 minutes of execution; no AskUserQuestion needed at kickoff (directive was unambiguous and design choices were mechanical).

#### [PR #116](https://github.com/alkprojects/kospos/pull/116) — Eligibility summary-row redesign + filter toolbar + detail modal

Alex's S36 ask:

> -eligibility list lookups works but the ui/ux isn't ideal. there is a lot of white/empty space. in addition to the links can you parse the data and show that instead. can you show one row per job class and summarize the information, number of lists, the dates, etc. then when you click into a row you get all the detail.
>
> -also add more filters for searching/narrowing eligibility lists and postings, like expired / active, exam type, department (specific or citywide, etc.).

- **Pure helpers** in `lib/scrapers/build.ts`:
  - `summarizeRollup(rollup)` → counts + date ranges + departments + list types + v1 citywide-hint heuristic.
  - `applyEligibilityFilters(rollups, filters)` — structured shape (search · status · examTypes · departments · citywideOnly), AND across axes, OR within multi-value sets. Empty sets = ignore the axis. Old `filterRollups` kept for back-compat.
  - `collectDepartments(rollups)` — alphabetized dept universe for the multi-select dropdown.
- **`EligibilityView` rewrite** — 7-column compact summary table (Job code · Title · Postings · Active · Expired · Dept(s) · `citywide?`-chevron). Click a row to open `EligibilityDetail`. Filter toolbar above the table: search + status select + exam-type chips + department multi-select + citywide-only toggle + reset.
- **`EligibilityDetail` new modal** — mirrors `PlannedActionDetail` / `ProbationDetail` / `SeparationDetail` overlay pattern (Esc + backdrop close, `role="dialog"` + `aria-modal`). Sections: header with summary chips, Open Postings table, Active Eligibility Lists table, Expired (collapsed `<details>`).
- **+31 tests:** `scrapers.test.ts` +20 (summarizeRollup edges 7 · applyEligibilityFilters axes 12 · collectDepartments 3) · new `eligibility-view.test.tsx` +11 (empty-state · row count · summary-row counts/dates · citywide chip · modal open/close · expired disclosure · search/status/exam-type filter · reset).
- **Live preview-MCP verification** — SmartRecruiters refresh → 137 postings → 90 distinct rollups, one-line rows. Click row 0923 → modal opens cleanly, Esc closes. Public Health dept filter → 33 of 90 job codes. `citywide?` hint visible on the multi-dept rollup. Zero console errors.

#### This docs PR — Phase 2.2.m close audit + S37 SESSION_HANDOFF + S36 SESSION_LOG entry

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **dropped items this session** —

- **Eligibility UX whitespace + summarize per job class + click-to-detail — SHIPPED in PR #116.** Drops from carry-forward.
- **More filters (active/expired, exam type, department) — SHIPPED in PR #116.** Drops from carry-forward. The Restated Q #18 "filterable + multi-selectable on every field, every tab" is now partially satisfied for the Eligibility tab; other tabs unaddressed (carries).

#### Restated questions for Alex (5 — unchanged from S36)

Items 1-5 carry from S32/S33/S34/S35/S36.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level — G42 / H42 (9993 ÷ non-9993 labor), L23 / L32 (projected balance ÷ total budget), H43 (hand-keyed "Calculated, Questionable"). Which is "the attrition rate" for CON / MYR reporting? **My current default:** G42 / H42 is canonical; L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** When KosPos emits the labor-report-shaped .xlsx for downstream consumers, preserve the `Department Group` GETPIVOTDATA label so other people's formulas still work? **My current default:** yes, preserve it.

3. **OPS Detail snapshot-diff key.** Options: (a) Position Number alone, (b) `(Effective Dept, Position Number, Fill Status, Budget Job Code)`, (c) Position Number + a separate tracker for "who occupied it when". **My current default:** option (b).

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware." Implement in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation (5a CSC vs negotiated, 5b Cat 16 eligibility, 5c TX vs limited-duration appointment, 5d renewal). See [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md) for the worked-example backdrop.

18. **Filterable + multi-selectable on every field, every tab** (Alex's reiterated UI directive). **Partial progress this session:** the Eligibility tab now has the full search · status · examTypes · departments · citywideOnly filter shape. Roll-out to the other tabs is still pending. Two implementation paths for the remaining tabs:
   (a) **Add per-column filter chips** to each table (homemade, incremental).
   (b) **Adopt a table library** (TanStack Table v8, AG Grid Community).
   **My current default:** option (a) incrementally per-tab, since the existing tables are small and the Eligibility v1 chip-row pattern can serve as a template. **Confirm or correct?**

#### Reasonable-default calls deferred (12 — unchanged from S36)

**8 from Session 20 (Tab 23-25 walkthroughs):**

6. **(Tab 23)** 6 slicer-chip semantics reverse-engineered — confirm or correct?
7. **(Tab 23)** Where does `Vacant Date` come from?
8. **(Tab 23)** `Previous Employee2` vs `Previous Employee` — which is which?
9. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — `IF(P="TEMPM", "", ...)` skips check.
10. **(Tab 24)** Cost-basis for blank `W` cells — **Default:** KosPos always computes expected cost.
11. **(Tab 24)** PlannedAction history retention — **Default:** 18 months with summary roll-up.
12. **(Tab 24)** DBI→CPC transfer-of-function propagation — **Default:** stays on originating dept until EOY.
13. **(Tab 24 + Tab 25)** Active-row blank-`W` "X of Y priced ⚠" diagnostic chip — placement OK?

**4 from Session 21 (Tab 1-22 walkthroughs):**

14. **(Tab 12)** `E2P` = "Eligible to Promote" — what does it mean exactly?
15. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions. Map to `is_pool_position = true`?
16. **(Tab 21)** Reporting Tree change-proposal cols — workflow today?
17. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year) or Phase 7 (talent)?

#### Open action items (1 — S32/S33 #19 carries)

19. **The 5 vacant-no-RTF positions.** 5 positions show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.**

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.m close audit](audits/phase-2-2-m-close-audit.md):

A. ~~Auto-archive monitoring~~ — **stays dropped** (resolved S33).

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** ~3,170 lines after S36 entry. Past the 2,000-line trim trigger. Bundleable with C + Tab 24 Improvement #6 holdReason language drift + OBI serial doc note + research-doc-location WORKFLOW.md note + TS-param-property tip + new modal-aria-label tip (S36). ~2-2.5 hours combined.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** **12 instances unchanged** (no labor-report.md edits this session). Bundleable with B.

D. **Defer the `labor-report.md` split until Phase 2.4.** Still 8,518 lines. Defer holds.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 13th event-based trigger fired on schedule this session.

### Top 3 findings to surface for Alex this session

1. **Eligibility tab redesigned per your S36 directive.** Visit `/kospos/?dev=1` → click Eligibility tab → click "↻ Refresh job postings". You'll see one compact row per job code instead of the prior stack-of-links layout. Each row shows postings count + newest date · active-list count + date range · expired count · dept(s). Click any row for the full posting / active-list / expired-list drill-down. The `citywide?` chip on the right edge flags rollups that have lists with no postings OR span 2+ departments.

2. **Five new filter axes on the Eligibility tab.** Above the summary table you now have: search (jobCode + classTitle), status dropdown (any / has-active / has-only-expired / list-only / posting-only), exam-type chips (score-report / eligible-list), department multi-select dropdown (populated from the current postings), citywide-only toggle. Mix any combination; "Reset filters" returns to the full set.

3. **PR #116 landed clean — 1 PR in ~45 minutes.** 620/620 tests passing (+31 from S36 baseline). `npm run build` clean first-run (7 sessions running). Phase 2.2.m close audit shows zero new drift items.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full + `lib/budget/` + Budget vs Actual | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` v1 + Hiring Plan workspace | done 2026-05-26 |
| 2.2.f | `2.2.21` v2 PR 1: Bug 3 + status-transition guard + Bug 2 polish | done 2026-05-26 |
| 2.2.g | `2.2.21` v2 PR 2: PlannedActionDetail + delta-pay + Bug 2a asOf-serial fix | done 2026-05-26 |
| 2.2.h | `2.2.20` `views/inactive/` — Tab 13 INACTIVE live query | done 2026-05-27 |
| 2.2.i | `2.2.26` `lib/separations/` + `views/separations/` — Tab 14 + Hiring Plan cross-link | done 2026-05-27 |
| 2.2.j | `2.2.25` `lib/probation/` + `views/probation/` + 4 follow-ups | done 2026-05-28 |
| 2.2.k | `2.2.28` `lib/scrapers/` + `views/eligibility/` — Tab 11 + SmartRecruiters live + DHR manual-paste + 5 follow-ups | done 2026-05-27 |
| 2.2.l | DHR live fetch via CORS proxy + Probation deputy multi-resolve (Alex's S35 directives) | done 2026-05-27 |
| **2.2.m** | **Eligibility summary-row redesign + filter toolbar + detail modal (Alex's S36 directive)** | **done 2026-05-27** |
| **2.2.n** | **Next sub-phase** — Alex's pick. Top candidates carry: **(a) cross-tab nav from Eligibility job code → filtered Positions** (lighter, unlocks Eligibility / Probation promotion to non-dev — ~1-2 hours); **(b) `2.2.18` `views/reporting-tree/`** (Tab 21 — feeds Phase 7 org chart, lib/changes/ stub lift); **(c) `2.2.19` `views/temp-limits/`** (TX entity + Cat 17/18 expiry — STILL gated on TX TODOs Restated Q #5); **(d) `2.2.22` `views/vacancies/`** (Tab 23 — lighter-weight); **(e)** roll-out the Eligibility v1 filter pattern to other tabs (Restated Q #18). | **NEXT** |
| 2.2.n-rest | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (5 ADRs queued, possibly consolidated; scraper-layer pattern folds into the no-upstream-source ADR as derived-data extension) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Eligibility tab summary table** — one compact row per job code with counts + date ranges. Click any row → drill-down modal.
- **Filter toolbar** — try the search, the status dropdown, the exam-type chips, the department multi-select, the citywide-only toggle, the "Reset filters" affordance.
- **Modal interactions** — Esc closes; backdrop click closes; the footer "Close" button closes; the header × closes.
- **No regression on prior surfaces.** Positions / Payroll / Hiring Plan / Inactive / Separations / Probation / Calculator / Special Class still render.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.n).** See Recommendations.

### Recommendation for Phase 2.2.n

**Option A (NEW — top pick) — Cross-tab nav from Eligibility → Positions + lift `devOnly` on Eligibility + Probation.** Now that the Eligibility UX is clean and you've validated it on real data, the natural next step is to make a job code in the Eligibility table click-through to a filtered Positions tab. ~1-2 hours; bundleable with the promotion to non-dev. **Recommended.**

**Option B (carries from S36) — `2.2.18` `lib/views/reporting-tree/`.** Tab 21 Reporting Tree feeds Phase 7 org chart. Pros: unblocks Phase 7, surfaces Scenario 1 reports-to-cycle / dangling-ref flags. Cons: Change Mode design (`lib/changes/` stub) needs to land alongside or shortly after to make the change-proposal cols meaningful.

**Option C (carries from S36) — `2.2.19` `lib/views/temp-limits/` (Cat 17/18 + TX).** Still gated on the 4 TX TODOs (Restated Q #5a-d). Resolving those (~30 min of your input) unlocks ~10-12 hours of build.

**Option D (carries from S36) — `2.2.22` `lib/views/vacancies/`** (Tab 23). Lighter-weight; filtered position list with cross-check against Staffing Plan.

**Option E (NEW — partial-rollout) — Roll the Eligibility v1 filter pattern to other tabs.** This session built the search · status · examTypes · departments · citywideOnly chip-row pattern. The same skeleton can lift to Probation / Inactive / Separations / Hiring Plan tables. 4-8 hours; do one tab as a proof, file the rest as carry.

**My pick: Option A.** Smallest, well-defined, unlocks two devOnly promotions. Best done while the Eligibility UX is still fresh in your mind.

## Next session prompt — Phase 2.2.n (Alex picks A, B, C, D, E, or another sub-phase)

Paste this verbatim to start Session 37:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.n),
then ships it. Phase 2.2.m shipped 1 PR:
#116 (Eligibility summary-row redesign + filter toolbar — search ·
status · examTypes · departments · citywideOnly · reset — + click-to-
detail modal mirroring PlannedActionDetail / ProbationDetail /
SeparationDetail / PositionDetail's fixed-overlay pattern; verified
live with 137 SmartRecruiters postings → 90 job-code rollups; +31 tests).

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 36 entry — 1 PR)
  memory/MEMORY.md + the 10 memory files
  docs/audits/phase-2-2-m-close-audit.md (carry-forwards B-F; A stays
    dropped)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
  git log --oneline origin/main -8

==============================================================================
STEP 0 — Phase 2.2.n close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.m close audit fired
in S36. This session, the audit cadence check is only the Phase
2.2.n close audit when 2.2.n ships. Don't re-audit 2.2.m.

DO fire the 2.2.n audit before this session ends. Use the Phase
2.2.m close audit format; mirror the prior audit's table of
carry-forwards.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.n
==============================================================================
Use AskUserQuestion. Five options (Option A is the recommended top
pick now that the Eligibility UX is clean):

  A. Cross-tab nav from Eligibility → Positions + lift devOnly on
     Eligibility + Probation tabs
     — Clicking a job code in the Eligibility table filters the
     Positions tab to that jobCode. Likely via a shared Zustand
     "active filter" slice or URL hash route. ~1-2 hours. Unlocks
     two devOnly promotions.

  B. 2.2.18 lib/views/reporting-tree/ + Change Mode precursor
     — Tab 21. Feeds Phase 7 org chart. lib/changes/ stub needs lift
     alongside (scope risk).

  C. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry + 1040-hour gauges. STILL GATED: the 4 TX
     TODOs in Restated Question #5 must be answered up front (5a-5d).

  D. 2.2.22 lib/views/vacancies/
     — Tab 23 Vacancies and TEMP, filtered position list with
     cross-check against Staffing Plan. Light-weight, low-risk.

  E. Roll-out the Eligibility v1 filter pattern to other tabs
     (Restated Q #18). Build the chip-row pattern as a small
     reusable component; apply to one tab as a proof (recommend
     Separations — smallest); file the rest as carry-forward.

  Option 0: Paste any feedback on what shipped this session (e.g.,
  Eligibility UX issues that the live data exposed). Alex's feedback
  in the last 3 sessions has consistently produced the highest-
  leverage next sub-phase.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.n (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If A — eligibility-positions-crosstabnav-and-promote:
  Branch: feat/eligibility-positions-crosstabnav-and-promote
  Scope:
    - Add cross-tab nav: clicking a job code in EligibilityView's
      summary row filters the Positions tab to that jobCode (likely
      via a shared Zustand "active filter" slice or a URL hash route)
    - Lift devOnly: true on Eligibility + Probation tabs in App.tsx
    - Tests + preview-MCP walkthrough

If B — views/reporting-tree/:
  Branch: feat/views-reporting-tree
  Scope:
    - lib/views/reporting-tree/ — Tab 21 surface (org-chart preview
      + reports-to chain integrity flags)
    - Surface Scenario 1 flags: reports-to-cycle / reports-to-dangling-
      ref / reports-to-empty-non-commissioner / reports-to-excessive-
      depth via lib/quality/
    - Optionally lift lib/changes/ from stub (flag if it becomes
      the bigger lift)
    - Tab to App.tsx (devOnly initially)
    - Tests

If C — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5a-5d)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 surface
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
    - Tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If D — views/vacancies/:
  Branch: feat/views-vacancies
  Scope:
    - lib/views/vacancies/ — Tab 23 filtered position list
    - Cross-check rows against Hiring Plan PlannedActions (visual
      indicator: planned/unclaimed)
    - Tab to App.tsx (devOnly initially)
    - Tests

If E — filter-pattern rollout:
  Branch: feat/filterable-tables-pattern
  Scope:
    - Lift the Eligibility v1 FilterToolbar shape into a small
      reusable shell (or keep per-table for v2 — design pick at start)
    - Apply to one tab as a proof (recommend Separations — smallest)
    - DO NOT roll out to all tabs in one session — bound the scope to
      the primitive + one application
    - Tests + preview-MCP walkthrough
    - File the per-tab rollout as carry-forward

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 620 / 620).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - **Run `npm run build` before opening PR** — 7 sessions running of
    clean first-run builds (habit firm).

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (5 ADRs queued, possibly folded:
    ADR-007 amendment for the 39-col OBI shape + iso() serial-converter
    note + BFM eturn ADR + Position.cat1718 lift note + ONE
    consolidated ADR for the no-upstream-source pattern shared by
    lib/staffing-plan/ + lib/views/inactive/ + lib/views/separations/
    + lib/views/probation/ + lib/scrapers/ as derived-data extension).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Inactive / Separations /
    Temp Limits / Reporting Tree to non-dev yet — wait until cross-tab
    nav has been used end-to-end on real data (Option A above is the
    explicit unlock for Eligibility + Probation).
  - Don't lift the modal overlay-frame to lib/ui/Modal.tsx in the same
    PR as Option A/B/D/E — that's a separate refactor (filed as
    follow-up #3 in the Phase 2.2.m audit).

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.n status + next-session prompt for Phase 2.2.o.
  - Re-ask the 5 restated questions + 12 reasonable-default calls
    (#6-17) + 1 open action item (#19). DROP items Alex acknowledges
    this session.
  - Carry-forward update on items B-F (A resolved S33, off the list).
  - Fire the Phase 2.2.n close audit (mirrors Phase 2.2.m audit format).

Recommended model: claude-sonnet-4-6 for A (well-defined cross-tab nav),
D (smallest, well-trodden pattern), or E (small if scoped to primitive +
one application). claude-opus-4-7 for B (entity + cross-cutting quality
wiring) or C (TX design with 4 unanswered policy questions). Effort:
low-to-medium for A/D/E; medium-to-high for B; medium for C.
````

### Recommended model (Phase 2.2.n)

`claude-sonnet-4-6` for A / D / E (small, well-trodden patterns). `claude-opus-4-7` for B (cross-cutting reasoning) or C (TX policy + entity design).

### S36 follow-ups (new — low priority)

- **Lift modal overlay-frame to `lib/ui/Modal.tsx`** — 5th instance of the same pattern shipped this session. Each modal currently re-implements the wrapper `<div role="dialog" aria-modal …>`. A small `<Modal>` shell would delete ~30 LoC per consumer. ~1-2 hours.
- **Rename `EligibilityDetail` header-close `aria-label`** to `Close detail` to disambiguate from the footer's `Close` button — view tests needed `textContent === 'Close'` to pick the right one. ~5 minutes; bundle with a future EligibilityView touch.
- **Remove the now-unused `filterRollups`** export — `applyEligibilityFilters` subsumes it. ~5 minutes; bundle with the next scrapers touch.

---

## Current status (end of Session 35 — Phase 2.2.l: DHR live fetch via CORS proxy + Probation deputy multi-resolve, 2026-05-27)

**Phase:** Phase 2.2.l — **DHR exam-results live fetch via CORS-proxy chain (manual paste demoted to fallback) + Probation deputy auto-resolves from reports-to chain as a multi-person chip field** ([PR #113](https://github.com/alkprojects/kospos/pull/113) — Probation deputy chain-walk + chip-list UI; [PR #114](https://github.com/alkprojects/kospos/pull/114) — DHR CORS-proxy fetcher + Worker URL backup slot). Phase 2.2.l close audit fired on schedule (12th event-based trigger).
**Last main commit:** [PR #114](https://github.com/alkprojects/kospos/pull/114) (DHR CORS proxy) → [PR #113](https://github.com/alkprojects/kospos/pull/113) (Probation deputy) → [PR #112](https://github.com/alkprojects/kospos/pull/112) (S34 audit + S35 handoff).
**Tests:** 589 / 589 passing (+40 net from S35 baseline of 549: +23 from PR #113 + +17 from PR #114).
**Branches in flight:** none post-merge (this docs PR pending).
**Worktree hygiene:** PR #113 auto-archived after merge; PR #114 archives on merge.

### What landed this session — 2 PRs (plus this docs PR)

Alex sent the S35 prompt + two added directives that effectively redefined Phase 2.2.l. The two directives were sharp and unambiguous; one AskUserQuestion at the top resolved the only real design choice (DHR mechanism = public CORS proxy + Cloudflare Worker backup). ~80 minutes of execution.

#### [PR #113](https://github.com/alkprojects/kospos/pull/113) — Probation deputy auto-resolves from reports-to chain + multi-person chip field

Alex's S35 ask: "you should automatically know who the deputy is based on the reports to tree. it should be pre-filled, but user should have the option to remove them and add more people."

- `Probation.deputy: string` → `Probation.deputies: string[]`
- New `lib/probation/deputy.ts:resolveDeputiesFromChain` walks `reportsTo.positionNumber` upward, matches ancestor positions whose `jobCodeDescription` contains "Deputy" (case-insensitive whole-word; rejects "Predeputy", "Deputies Coordinator"). Cycle-safe, dedupes by name.
- Chip-list UI in AddProbationForm + ProbationDetail: per-chip X-to-remove; "Add deputy" input commits on Enter / blur; backspace-on-empty pops the most-recent chip.
- Auto-fills on employee-name autocomplete pick, position-input resolve, detail modal's "Use these" button.
- Notification email: Oxford-comma greeting (`Hello {sup}, {dep1}, ..., and {depN},`).
- Session JSON back-compat: `migrateLegacyDeputy` promotes legacy `deputy: "Name"` → `deputies: ["Name"]`. +23 tests.

#### [PR #114](https://github.com/alkprojects/kospos/pull/114) — DHR live fetch via CORS-proxy chain (primary), manual paste demoted to fallback

Alex's S35 ask: "eligibility, exam results solution is not acceptable. it is way too much manual work. please try to find an alternate method of extracting the information."

S35 kickoff answer: **Public CORS proxy + Cloudflare Worker as backup.**

- New `lib/scrapers/sf-dhr-exam/fetch.ts` with the 3-proxy chain (corsproxy.io → allorigins.win/raw → codetabs.com/v1/proxy) + optional appended Cloudflare-Worker URL slot.
- `useScrapers.dhrWorkerUrl` persists to localStorage (`kospos.scrapers.dhrWorkerUrl`); `clearAll` preserves the setting (it's user config, not scrape data).
- Body-content sniff (`looksLikeHtml`) catches proxy error envelopes regardless of HTTP status.
- Polite 500ms throttle between pages; pagination via Drupal `?page=N`; stops on first empty page.
- EligibilityView UI: new `↻ Refresh eligibility lists` button + `<details>` "Backup proxy: Cloudflare-Worker URL" card + Phase-2.2.k manual paste demoted into `<details>` "Advanced fallback".
- **Live verification:** one click → 6,727 rows from 66+ pages in ~90s. 738 distinct SF job codes. 1,848 active lists. 100% via corsproxy.io. +17 tests.

#### This docs PR — Phase 2.2.l close audit + S36 SESSION_HANDOFF + S35 SESSION_LOG entry

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **dropped items this session** —

- **DHR scrape mechanism — RATIFIED in the kickoff question** ("Public cord proxy with cloudflare worker as backup"). Item drops from carry-forward.
- **Probation deputy auto-resolve / multi-person field — SHIPPED in PR #113.** Drops from carry-forward.
- **S34 action item #20 (DHR real-data paste walkthrough) — implicitly RESOLVED.** The live fetch in PR #114 flowed 6,727 real rows through the parser with zero errors. Drops from carry-forward.

#### Restated questions for Alex (5 — unchanged from S35)

Items 1-5 carry from S32/S33/S34/S35.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level — G42 / H42 (9993 ÷ non-9993 labor), L23 / L32 (projected balance ÷ total budget), H43 (hand-keyed "Calculated, Questionable"). Which is "the attrition rate" for CON / MYR reporting? **My current default:** G42 / H42 is canonical; L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** When KosPos emits the labor-report-shaped .xlsx for downstream consumers, preserve the `Department Group` GETPIVOTDATA label so other people's formulas still work? **My current default:** yes, preserve it.

3. **OPS Detail snapshot-diff key.** Options: (a) Position Number alone, (b) `(Effective Dept, Position Number, Fill Status, Budget Job Code)`, (c) Position Number + a separate tracker for "who occupied it when". **My current default:** option (b).

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware." Implement in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation (5a CSC vs negotiated, 5b Cat 16 eligibility, 5c TX vs limited-duration appointment, 5d renewal). See [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md) for the worked-example backdrop.

18. **Filterable + multi-selectable on every field, every tab** (Alex's reiterated UI directive). Two implementation paths:
   (a) **Add per-column filter chips** to every table (homemade).
   (b) **Adopt a table library** (TanStack Table v8, AG Grid Community).
   **My current default:** option (a) incrementally per-tab, since the existing tables are small; library adoption is overkill for v1. **Confirm or correct?**

#### Reasonable-default calls deferred (12 — unchanged from S35)

**8 from Session 20 (Tab 23-25 walkthroughs):**

6. **(Tab 23)** 6 slicer-chip semantics reverse-engineered — confirm or correct?
7. **(Tab 23)** Where does `Vacant Date` come from?
8. **(Tab 23)** `Previous Employee2` vs `Previous Employee` — which is which?
9. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — `IF(P="TEMPM", "", ...)` skips check.
10. **(Tab 24)** Cost-basis for blank `W` cells — **Default:** KosPos always computes expected cost.
11. **(Tab 24)** PlannedAction history retention — **Default:** 18 months with summary roll-up.
12. **(Tab 24)** DBI→CPC transfer-of-function propagation — **Default:** stays on originating dept until EOY.
13. **(Tab 24 + Tab 25)** Active-row blank-`W` "X of Y priced ⚠" diagnostic chip — placement OK?

**4 from Session 21 (Tab 1-22 walkthroughs):**

14. **(Tab 12)** `E2P` = "Eligible to Promote" — what does it mean exactly?
15. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions. Map to `is_pool_position = true`?
16. **(Tab 21)** Reporting Tree change-proposal cols — workflow today?
17. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year) or Phase 7 (talent)?

#### Open action items (1 — S34 #20 resolved, S32/S33 #19 carries)

19. **The 5 vacant-no-RTF positions.** 5 positions show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.**

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.l close audit](audits/phase-2-2-l-close-audit.md):

A. ~~Auto-archive monitoring~~ — **stays dropped** (resolved S33).

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** ~3,100 lines after S35 entry. Past the 2,000-line trim trigger. Bundleable with C + Tab 24 Improvement #6 holdReason language drift + OBI serial doc note + research-doc-location WORKFLOW.md note + TS-param-property tip. ~2-2.5 hours combined.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** **12 instances unchanged** (no labor-report.md edits this session). Bundleable with B.

D. **Defer the `labor-report.md` split until Phase 2.4.** Still 8,518 lines. Defer holds.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 12th event-based trigger fired on schedule this session.

### Top 3 findings to surface for Alex this session

1. **DHR live fetch ships with real data flowing.** Visit `/kospos/?dev=1` → click Eligibility tab → click "↻ Refresh eligibility lists". You'll see progress tick through ~66 pages in ~90 seconds; ~6,700 eligibility lists parsed; ~740 SF job codes rolled up; ~1,800 within the 2-year active window. All via corsproxy.io — the public CORS-proxy chain. Backup-proxy slot (Cloudflare Worker URL) sits in a collapsed `<details>` if you ever need it; the existing manual-paste workflow is still there as the "Advanced fallback" `<details>`.

2. **Probation deputy field is now multi-person + chain-walked.** On the Probation tab: when you pick a known employee, the deputy chip list auto-fills with anyone in the reports-to chain above them whose title contains "Deputy". Each chip has an ✕ to remove. Type + Enter (or just blur) adds another. Backspace on an empty draft pops the most-recent chip. The notification email's greeting line uses the Oxford-comma "Hello {sup}, {dep1}, ..., and {depN}," form.

3. **Both PRs landed clean — 2 PRs in ~80 minutes.** 589/589 tests passing (+40 from S35 baseline). `npm run build` clean first-run (6 sessions running). Phase 2.2.l close audit shows zero new drift items.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full + `lib/budget/` + Budget vs Actual | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` v1 + Hiring Plan workspace | done 2026-05-26 |
| 2.2.f | `2.2.21` v2 PR 1: Bug 3 + status-transition guard + Bug 2 polish | done 2026-05-26 |
| 2.2.g | `2.2.21` v2 PR 2: PlannedActionDetail + delta-pay + Bug 2a asOf-serial fix | done 2026-05-26 |
| 2.2.h | `2.2.20` `views/inactive/` — Tab 13 INACTIVE live query | done 2026-05-27 |
| 2.2.i | `2.2.26` `lib/separations/` + `views/separations/` — Tab 14 + Hiring Plan cross-link | done 2026-05-27 |
| 2.2.j | `2.2.25` `lib/probation/` + `views/probation/` + 4 follow-ups | done 2026-05-28 |
| 2.2.k | `2.2.28` `lib/scrapers/` + `views/eligibility/` — Tab 11 + SmartRecruiters live + DHR manual-paste + 5 follow-ups | done 2026-05-27 |
| **2.2.l** | **DHR live fetch via CORS proxy + Probation deputy multi-resolve (Alex's S35 directives)** | **done 2026-05-27** |
| **2.2.m** | **Next sub-phase** — Alex's pick. Top candidates carry from S35: **(a) `2.2.18` `views/reporting-tree/`** (Tab 21 — feeds Phase 7 org chart, requires `lib/changes/` stub lift); **(b) `2.2.19` `views/temp-limits/`** (TX entity + Cat 17/18 expiry — STILL gated on TX TODOs Restated Q #5); **(c) `2.2.22` `views/vacancies/`** (Tab 23 — lighter-weight); **(d)** the filterable/multi-select UI directive (Restated Q #18) as its own cross-cutting sub-phase. | **NEXT** |
| 2.2.m-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (5 ADRs queued, possibly consolidated; scraper-layer pattern folds into the no-upstream-source ADR as derived-data extension) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **`↻ Refresh eligibility lists`** in the Eligibility tab summary header (next to the existing job-postings refresh). One click → ~90s scrape → ~6,700 lists, ~740 job codes, ~1,800 active rolled up.
- **Backup proxy `<details>`** under the summary header — saving a Cloudflare-Worker URL persists across reloads (localStorage); the "configured" badge appears next to the summary label when set.
- **Advanced fallback `<details>`** — the Phase-2.2.k manual paste still works exactly as before.
- **Probation deputy chip list** in both the Probation add form and the detail modal.
  - Pick a known employee with a "Deputy"-titled ancestor in their reports-to chain → chip pre-fills.
  - Each chip has an ✕ to remove; type a new name + Enter adds another; backspace on empty pops the last chip.
- **Notification email greeting line** — Oxford-comma "Hello {sup}, {dep1}, ..., and {depN},". Mailto: URI uses %20 (Outlook-safe).
- **No regression on prior surfaces.** Positions / Payroll / Hiring Plan / Inactive / Separations / Probation / Calculator / Special Class / Eligibility table all still render.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.m).** See Recommendations.

### Recommendation for Phase 2.2.m

**Option B (carries from S35) — `2.2.19` `lib/views/temp-limits/` (Cat 17/18 + TX).** Still gated on the 4 TX TODOs (Restated Q #5a-d). Resolving those (~30 min of Alex's input) unlocks ~10-12 hours of build.

**Option A — `2.2.18` `lib/views/reporting-tree/`.** Tab 21 Reporting Tree feeds Phase 7 org chart. Pros: unblocks Phase 7, surfaces Scenario 1 reports-to-cycle / dangling-ref flags. Cons: Change Mode design (`lib/changes/` stub) needs to land alongside or shortly after to make the change-proposal cols meaningful.

**Option C — `2.2.22` `lib/views/vacancies/`** (Tab 23). Lighter-weight; filtered position list with cross-check against Staffing Plan. Pros: small, low-risk, no gating. Cons: less user-visible payoff than A/B; vacancy planning largely covered by the Hiring Plan workspace.

**Option D — Cross-cutting: filterable + multi-select fields on every tab** (Restated Q #18). 20-40 hours. Two paths (chip-per-column vs adopt TanStack Table v8) — design pick + primitive + apply-to-one-tab proof.

**Option E — Promote Eligibility + Probation to non-dev + cross-tab nav.** Light: ~1-2 hours total. Cross-tab nav from Eligibility job code → filtered Positions, then lift the `devOnly: true` flag on both tabs. Recommended **AFTER** Alex has used the live Eligibility fetch end-to-end on his real workflow.

**My pick: Option E first (small, validates the cross-tab nav pattern at low risk), then Option B** — the temp-limits view has the highest user-visible payoff (Cat 17/18 expiration warnings are governance-critical at DBI), and the gating is just 4 short Alex answers. If Alex doesn't have time to answer the 4 TX questions, fall back to Option C (Vacancies, no gating).

## Next session prompt — Phase 2.2.m (Alex picks A, B, C, D, E, or another sub-phase)

Paste this verbatim to start Session 36:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.m),
then ships it. Phase 2.2.l shipped 2 PRs:
#113 (Probation deputy auto-resolves from reports-to chain as a
multi-person chip field — chain-walks ancestor positions with "Deputy"
in their title; X to remove pre-filled chips, Enter to add more);
#114 (DHR exam-results live fetch via public CORS-proxy chain
[corsproxy.io → allorigins.win → codetabs.com] + optional Cloudflare-
Worker URL backup slot — verified 6,727 rows from 66+ pages in ~90s).
Manual paste demoted to `<details>` "Advanced fallback".

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 35 entry — 2 PRs)
  memory/MEMORY.md + the 10 memory files
  docs/audits/phase-2-2-l-close-audit.md (carry-forwards B-F; A stays
    dropped)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
  git log --oneline origin/main -8

==============================================================================
STEP 0 — Phase 2.2.m close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.l close audit fired
in S35. This session, the audit cadence check is only the Phase
2.2.m close audit when 2.2.m ships. Don't re-audit 2.2.l.

DO fire the 2.2.m audit before this session ends. Use the Phase
2.2.l close audit format; mirror the prior audit's table of
carry-forwards.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.m
==============================================================================
Use AskUserQuestion. Five options:

  A. 2.2.18 lib/views/reporting-tree/ + Change Mode precursor
     — Tab 21. Feeds Phase 7 org chart. lib/changes/ stub needs lift
     alongside (scope risk).

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry + 1040-hour gauges. STILL GATED: the 4 TX
     TODOs in Restated Question #5 must be answered up front (5a-5d).

  C. 2.2.22 lib/views/vacancies/
     — Tab 23 Vacancies and TEMP, filtered position list with
     cross-check against Staffing Plan. Light-weight, low-risk.

  D. Cross-cutting: filterable + multi-selectable fields on every tab
     — Alex's reiterated UI directive (Restated Q #18). 20-40 hours
     across all tabs. Needs design pick: per-column chips vs adopt a
     table library (TanStack Table v8). Could be its own sub-phase.

  E. Promote Eligibility + Probation to non-dev + cross-tab nav from
     Eligibility job code → filtered Positions. Light: ~1-2 hours.
     Best AFTER Alex has used the live Eligibility fetch on his real
     workflow.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.m (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If A — views/reporting-tree/:
  Branch: feat/views-reporting-tree
  Scope:
    - lib/views/reporting-tree/ — Tab 21 surface (org-chart preview
      + reports-to chain integrity flags)
    - Surface Scenario 1 flags: reports-to-cycle / reports-to-dangling-
      ref / reports-to-empty-non-commissioner / reports-to-excessive-
      depth via lib/quality/
    - Optionally lift lib/changes/ from stub (flag if it becomes
      the bigger lift)
    - Tab to App.tsx (devOnly initially)
    - Tests

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5a-5d)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 surface
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
    - Tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If C — views/vacancies/:
  Branch: feat/views-vacancies
  Scope:
    - lib/views/vacancies/ — Tab 23 filtered position list
    - Cross-check rows against Hiring Plan PlannedActions (visual
      indicator: planned/unclaimed)
    - Tab to App.tsx (devOnly initially)
    - Tests

If D — filterable everywhere (cross-cutting):
  Branch: feat/filterable-tables OR feat/adopt-tanstack-table
  Scope:
    - Pick approach via AskUserQuestion at the start (per-column chips
      OR TanStack Table adoption)
    - Build the primitive (FilterableColumn component or table-library
      wrapper)
    - Apply to one tab as a proof (recommend Separations — smallest)
    - DO NOT roll out to all tabs in one session — bound the scope to
      the primitive + one application
    - Tests + preview-MCP walkthrough
    - File the per-tab rollout as carry-forward

If E — Promote + cross-tab nav:
  Branch: feat/eligibility-positions-crosstabnav-and-promote
  Scope:
    - Add cross-tab nav: clicking a job code in EligibilityView's
      table filters the Positions tab to that jobCode (likely via
      a shared Zustand "active filter" slice or a URL hash route)
    - Lift devOnly: true on Eligibility + Probation tabs in App.tsx
    - Tests + preview-MCP walkthrough

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 589 / 589).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - **Run `npm run build` before opening PR** — 6 sessions running of
    clean first-run builds (habit firm).

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (5 ADRs queued, possibly folded:
    ADR-007 amendment for the 39-col OBI shape + iso() serial-converter
    note + BFM eturn ADR + Position.cat1718 lift note + ONE
    consolidated ADR for the no-upstream-source pattern shared by
    lib/staffing-plan/ + lib/views/inactive/ + lib/views/separations/
    + lib/views/probation/ + lib/scrapers/ as derived-data extension).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Inactive / Separations /
    Probation / Eligibility / Temp Limits / Reporting Tree to non-dev
    yet — wait until cross-tab nav has been used end-to-end on real
    data (Option E above explicitly tackles this).

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.m status + next-session prompt for Phase 2.2.n.
  - Re-ask the 5 restated questions + 12 reasonable-default calls
    (#6-17) + 1 open action item (#19). DROP items Alex acknowledges
    this session.
  - Carry-forward update on items B-F (A resolved S33, off the list).
  - Fire the Phase 2.2.m close audit (mirrors Phase 2.2.l audit format).

Recommended model: claude-opus-4-7 for A (entity + cross-cutting quality
wiring) or D (cross-cutting design pick). claude-sonnet-4-6 OK for B
(well-defined once TX TODOs answered), C (smallest, well-trodden pattern),
or E (small, well-trodden cross-tab nav). Effort: medium-to-high for A/D;
medium for B; low-to-medium for C/E.
````

### Recommended model (Phase 2.2.m)

`claude-opus-4-7` for A or D (cross-cutting reasoning + design pick). `claude-sonnet-4-6` OK for B / C / E. Effort: medium-to-high for A/D; medium for B; low-to-medium for C/E.

### S35 follow-ups (new — low priority)

- **Promote Eligibility / Probation to non-dev** — after Alex's first real-workflow run with the live Eligibility fetcher. Option E above.
- **Cross-tab nav from Eligibility → Positions** — same pattern as Positions ↔ Payroll. Bundleable into Option E.
- **Cloudflare Worker deployment** — only if the public proxy chain proves flaky. The slot is shipped; the 10-line worker is documented in PR #114's body.
- **Lift `buildProbation*Email` to `lib/ui/notifications/`** — only if a 2nd consumer arrives.
- **Phase 2.2.k S34 follow-up: queue full 66-page DHR paste** — implicitly resolved; the live fetch handles all 66+ pages in one click.

---

## Current status (end of Session 34 — Phase 2.2.k: lib/views/eligibility/ + DHR/SF-Careers scrapers + 5 follow-up PRs in autonomous mode, 2026-05-27)

**Phase:** Phase 2.2.k — **`lib/scrapers/` + `lib/views/eligibility/` + Eligibility tab + 5 follow-up PRs from Alex's S34 added-items list** ([PR #106](https://github.com/alkprojects/kospos/pull/106) — Probation+Separations employee-ID-stuck-on-old-person bug fix; [PR #107](https://github.com/alkprojects/kospos/pull/107) — Probation supervisor auto-resolves from position.reportsTo + new deputy field; [PR #108](https://github.com/alkprojects/kospos/pull/108) — Probation end-date up-front + 5 preset durations + click-to-edit; [PR #109](https://github.com/alkprojects/kospos/pull/109) — Probation row selection + email-generator with both mailto: AND copy-template per row; [PR #110](https://github.com/alkprojects/kospos/pull/110) — CopyButton rollout to Positions+Payroll+Inactive+Hiring Plan+Position Detail; [PR #111](https://github.com/alkprojects/kospos/pull/111) — **Phase 2.2.k primary** — Tab 11 Eligibility + SmartRecruiters live fetcher (CORS-permissive) + DHR manual-paste parser (CORS blocked)). Phase 2.2.k close audit fired on schedule (11th event-based trigger).
**Last main commit:** [PR #111](https://github.com/alkprojects/kospos/pull/111) (Eligibility + scrapers) → [PR #110](https://github.com/alkprojects/kospos/pull/110) (CopyButton rollout) → [PR #109](https://github.com/alkprojects/kospos/pull/109) (Probation email gen) → [PR #108](https://github.com/alkprojects/kospos/pull/108) (Probation end-date + presets) → [PR #107](https://github.com/alkprojects/kospos/pull/107) (Probation supervisor/deputy) → [PR #106](https://github.com/alkprojects/kospos/pull/106) (bug fix)
**Tests:** 549 / 549 passing (+59 net from S33 actual baseline of 490 — see audit Finding 8 for the S33-baseline-recount correction).
**Branches in flight:** none post-merge (this docs PR pending).
**Worktree hygiene:** **6 of 6 session PRs auto-archived inside the session as they merged**. Item A (auto-archive watcher) stays dropped — pattern continues to work.

### What landed this session — 6 PRs (plus this docs PR)

Alex was away for 9 hours, phone-only for short answers. The kickoff
question batched 2 decisions; Alex tapped both fast (Phase 2.2.k =
Option A + your added items; email feature = both mailto + copy
template). Everything else proceeded under reasonable-default rules.

#### [PR #106](https://github.com/alkprojects/kospos/pull/106) — Bug fix: employee # updates when name switches to a different known person

Both Probation + Separations had the same `applyPersonMatch` bug from
S33's PR #101/#102 — the guard against "overwriting user-typed values"
also blocked overwriting *previously-auto-filled* values. Picking
Smith, Jane after Smith, John was auto-filled now updates the # too.
Same fix to both views. +4 regression tests (2 per view).

#### [PR #107](https://github.com/alkprojects/kospos/pull/107) — Probation: supervisor auto-resolves from position.reportsTo + deputy free-text field

Alex's S34 ask: "supervisor and deputy for each potition should be
shown." Supervisor cell now: (1) manual `probation.supervisor` wins,
(2) falls back to `position.reportsTo.managerFirstName +
managerLastName` (annotated `(auto)`), (3) "—" otherwise. Deputy added
as a parallel free-text field. +5 tests.

#### [PR #108](https://github.com/alkprojects/kospos/pull/108) — Probation: end-date up-front + 5 preset durations + click-to-edit on row

Alex's S34 ask: "probation end date should be added up front next to
start date and modified on click. selectable options in addition to
freeform entry like 6 months 1040 hours, 1 year, etc." End-date input
next to Start date. 5-chip Duration radiogroup (6 months · 1040 hrs ·
1 year · 2080 hrs · Custom). Calendar vs hours presets diverge by 1-2
days for the same nominal duration — documented. Click-to-edit on the
"Current end" table cell for rows without extensions. +5 tests.

#### [PR #109](https://github.com/alkprojects/kospos/pull/109) — Probation: row selection + email-generator for supervisor/deputy notifications

Alex's S34 ask: "selection box for every row and then a button that
generates emails to the supervisors and deputies." His kickoff-question
answer specified BOTH mailto AND copy-template buttons per row.
Checkbox column + sticky action bar + NotificationPanel below the
table. Template names supervisor + deputy in the greeting (deputy
omitted when blank), asks them to email HR if there are any issues.
mailto: URIs use %20 (Outlook-safe). +10 tests.

#### [PR #110](https://github.com/alkprojects/kospos/pull/110) — CopyButton rollout to Positions, Payroll, Inactive, Hiring Plan, Position Detail

Alex's S34 ask: "the copy box ui element should be for all the data in
all the tabs." CopyButton added to Positions table (4 cells/row),
Payroll table + row detail, Inactive table (4 cells/row), Hiring Plan
position cell, Position Detail RTF + Reports-To sections. Skipped
Calculator / Special Class / Importer (input-driven, native Ctrl+C
works). +0 tests (mechanical JSX consumption of an already-tested
primitive). 8 CopyButtons per 2-row preview of Positions tab verified.

#### [PR #111](https://github.com/alkprojects/kospos/pull/111) — Phase 2.2.k primary: Eligibility view + DHR/SF-Careers scrapers

CORS verified at session top (the mandatory 30-min check):
**SmartRecruiters permissive** (133 postings, no token needed),
**sfdhr.org blocked** (TypeError: Failed to fetch). Manual-paste
fallback shipped for DHR per the S33 research doc (no infra Alex
hasn't pre-approved). `lib/scrapers/` (types + sf-careers fetcher
with 3-pattern jobCode extractor + sf-dhr-exam parser + rollup
builder + Zustand store with append-dedupe). `lib/views/eligibility/`
EligibilityView with summary header, inline-progress Refresh button,
DHR paste panel with linked sfdhr.org URL, search, per-jobCode table.
Empirical: **88 distinct SF job codes** rolled up from the 133 live
postings. Eligibility tab added devOnly between Inactive and Load
Reports. +35 tests.

#### This docs PR — Phase 2.2.k close audit + S35 handoff + S34 SESSION_LOG

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **dropped items this session** —

- **Phase 2.2.k pick — RATIFIED in the kickoff question** ("A + your added items"). Item drops from carry-forward.
- **Email-feature mechanism for Probation — RATIFIED** ("Both — mailto + copy template"). Drops.
- **The 4 S34 inline added-items — SHIPPED.** (Bug fix, supervisor/deputy, end-date+presets, row-selection+email-gen). Drop from carry-forward.
- **"Copy box UI for all data in all tabs" S34 directive — SHIPPED in PR #110.** Drop.
- **DHR scraping research question — IMPLEMENTED in PR #111** (the S33 research doc's recommended path). Drop.

#### Restated questions for Alex (5 — unchanged from S33)

Items 1-5 carry from S32/S33. Item 18 (filterable/multi-select directive) carries from S33 — still a future requirement, ~20-40 hr; not picked yet.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level — G42 / H42 (9993 ÷ non-9993 labor), L23 / L32 (projected balance ÷ total budget), H43 (hand-keyed "Calculated, Questionable"). Which is "the attrition rate" for CON / MYR reporting? **My current default:** G42 / H42 is canonical; L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** When KosPos emits the labor-report-shaped .xlsx for downstream consumers, preserve the `Department Group` GETPIVOTDATA label so other people's formulas still work? **My current default:** yes, preserve it.

3. **OPS Detail snapshot-diff key.** Options: (a) Position Number alone, (b) `(Effective Dept, Position Number, Fill Status, Budget Job Code)`, (c) Position Number + a separate tracker for "who occupied it when". **My current default:** option (b).

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware." Implement in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation (5a CSC vs negotiated, 5b Cat 16 eligibility, 5c TX vs limited-duration appointment, 5d renewal). See [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md) for the worked-example backdrop.

18. **Filterable + multi-selectable on every field, every tab** (Alex's reiterated UI directive). Two implementation paths:
   (a) **Add per-column filter chips** to every table (homemade).
   (b) **Adopt a table library** (TanStack Table v8, AG Grid Community).
   **My current default:** option (a) incrementally per-tab, since the existing tables are small; library adoption is overkill for v1. **Confirm or correct?**

#### Reasonable-default calls deferred (12 — unchanged from S33)

**8 from Session 20 (Tab 23-25 walkthroughs):**

6. **(Tab 23)** 6 slicer-chip semantics reverse-engineered — confirm or correct?
7. **(Tab 23)** Where does `Vacant Date` come from?
8. **(Tab 23)** `Previous Employee2` vs `Previous Employee` — which is which?
9. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — `IF(P="TEMPM", "", ...)` skips check.
10. **(Tab 24)** Cost-basis for blank `W` cells — **Default:** KosPos always computes expected cost.
11. **(Tab 24)** PlannedAction history retention — **Default:** 18 months with summary roll-up.
12. **(Tab 24)** DBI→CPC transfer-of-function propagation — **Default:** stays on originating dept until EOY.
13. **(Tab 24 + Tab 25)** Active-row blank-`W` "X of Y priced ⚠" diagnostic chip — placement OK?

**4 from Session 21 (Tab 1-22 walkthroughs):**

14. **(Tab 12)** `E2P` = "Eligible to Promote" — what does it mean exactly?
15. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions. Map to `is_pool_position = true`?
16. **(Tab 21)** Reporting Tree change-proposal cols — workflow today?
17. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year) or Phase 7 (talent)?

#### Open action items (1 — same as S32/S33, plus 1 new from S34)

19. **The 5 vacant-no-RTF positions.** 5 positions show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.**

20. **(NEW S34)** **DHR real-data paste walkthrough.** PR #111 ships the manual-paste workflow against unit-tested synthetic input that mirrors the real DHR HTML (verified via WebFetch during planning). But no live data has flowed through. **S35 first task: Alex pastes 1-2 pages from <https://sfdhr.org/past-examination-results>, reports any rows that didn't parse.** If pages parse cleanly, queue a full 66-page paste session.

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.k close audit](audits/phase-2-2-k-close-audit.md):

A. ~~Auto-archive monitoring~~ — **stays dropped** (resolved S33, pattern continues to work — 6/6 PRs auto-archived this session).

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** ~3,020 lines after S34 entry (was ~2,940 pre-entry). Past the 2,000-line trim trigger. Bundleable with C + Tab 24 Improvement #6 holdReason language drift + OBI serial doc note + research-doc-location WORKFLOW.md note + new TS-param-property tip. ~2-2.5 hours combined.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** **12 instances unchanged** (no labor-report.md edits this session). Bundleable with B.

D. **Defer the `labor-report.md` split until Phase 2.4.** Still 8,518 lines. Defer holds.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 11th event-based trigger fired on schedule this session.

### Top 3 findings to surface for Alex this session

1. **Phase 2.2.k Eligibility is live with real SmartRecruiters data.** Visit `/kospos/?dev=1` → click Eligibility tab. Click "↻ Refresh job postings". You'll see 133 open postings roll up into ~88 SF job codes (job code + class title + link to careers.sf.gov per posting). DHR paste workflow is below — try pasting one page from <https://sfdhr.org/past-examination-results> to test the parser.

2. **Probation tab is now the most-feature-dense workspace in KosPos.** Bug fixed (employee-# sync), supervisor/deputy added, end-date + 5 preset durations + click-to-edit, row selection + email generator with both mailto: and copy-template buttons. Try selecting 1-2 rows → Generate emails → click Open mailto (opens email client) and click Copy template (puts subject+body in clipboard).

3. **All 5 of Alex's S34 added-items shipped, plus Phase 2.2.k.** In 9 unsupervised hours. Bug fix + 3 Probation features + CopyButton rollout (8 buttons per Positions row × N rows) + Eligibility + scrapers. 549/549 tests passing (+59 from S33 baseline of 490 — see audit Finding 8 for the S33-audit reconciliation correction).

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full + `lib/budget/` + Budget vs Actual | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` v1 + Hiring Plan workspace | done 2026-05-26 |
| 2.2.f | `2.2.21` v2 PR 1: Bug 3 + status-transition guard + Bug 2 polish | done 2026-05-26 |
| 2.2.g | `2.2.21` v2 PR 2: PlannedActionDetail + delta-pay + Bug 2a asOf-serial fix | done 2026-05-26 |
| 2.2.h | `2.2.20` `views/inactive/` — Tab 13 INACTIVE live query | done 2026-05-27 |
| 2.2.i | `2.2.26` `lib/separations/` + `views/separations/` — Tab 14 + Hiring Plan cross-link | done 2026-05-27 |
| 2.2.j | `2.2.25` `lib/probation/` + `views/probation/` + 4 follow-ups | done 2026-05-28 |
| **2.2.k** | **`2.2.28` `lib/scrapers/` + `views/eligibility/` — Tab 11 + SmartRecruiters live + DHR manual-paste** + 5 follow-ups (bug fix + supervisor/deputy + end-date+presets + email gen + CopyButton rollout) | **done 2026-05-27** |
| **2.2.l** | **Next sub-phase** — Alex's pick. Top candidates: **(a) `2.2.18` `views/reporting-tree/`** (Tab 21 — feeds Phase 7 org chart, requires `lib/changes/` stub lift); **(b) `2.2.19` `views/temp-limits/`** (TX entity + Cat 17/18 expiry — STILL gated on TX TODOs Restated Q #5); **(c) `2.2.22` `views/vacancies/`** (Tab 23 — lighter-weight); **(d)** the filterable/multi-select UI directive (Restated Q #18) as its own cross-cutting sub-phase. | **NEXT** |
| 2.2.m-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (ADR queue grows to 5 with scraper-layer pattern, optionally folded into the no-upstream-source ADR) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Eligibility tab is visible in dev mode** between Inactive and Load Reports.
- **↻ Refresh job postings** loads ~130 live postings → ~85-90 SF job codes (numbers vary as SF Careers updates daily).
- **CopyButton** appears on every Positions / Payroll / Inactive / Hiring Plan / Eligibility row's identity cells + Position Detail RTF / ReportsTo sections.
- **Probation supervisor** auto-resolves to `position.reportsTo` manager name with `(auto)` annotation when blank.
- **Probation deputy** is editable free-text per row.
- **Probation duration chip row** works: 6 months · 1040 hrs · 1 year · 2080 hrs · Custom.
- **Probation end-date input** appears next to Start date in the add form.
- **Probation click-to-edit on end-date** opens an inline date input on rows without extensions; opens detail modal on rows with extensions.
- **Probation row selection + Generate emails** shows the action bar; clicking Generate opens the NotificationPanel with mailto: AND copy-template per row.
- **Name → ID sync** works: pick Smith, John from name datalist → ID = his. Pick Smith, Jane → ID = hers (was sticky on John in S33).
- **No regression on prior surfaces.** Positions / Payroll / Hiring Plan / Inactive / Separations / Calculator / Special Class all still render.

**Two decisions pending — pick the next Phase 2.2 sub-phase (2.2.l), plus do the DHR real-data paste walkthrough.** See Recommendations.

### Recommendation for Phase 2.2.l

**Option B (was option C in S34 — TX gating) — `2.2.19` `lib/views/temp-limits/` (Cat 17/18 + TX).** Still gated on the 4 TX TODOs (Restated Q #5a-d). Resolving those (~30 min of Alex's input) unlocks ~10-12 hours of build.

**Option A — `2.2.18` `lib/views/reporting-tree/`.** Tab 21 Reporting Tree feeds Phase 7 org chart. Pros: unblocks Phase 7, surfaces Scenario 1 reports-to-cycle / dangling-ref flags. Cons: Change Mode design (`lib/changes/` stub) needs to land alongside or shortly after to make the change-proposal cols meaningful.

**Option C — `2.2.22` `lib/views/vacancies/`** (Tab 23). Lighter-weight; filtered position list with cross-check against Staffing Plan. Pros: small, low-risk, no gating. Cons: less user-visible payoff than A/B; vacancy planning largely covered by the Hiring Plan workspace from PR #79/85/90.

**Option D — Cross-cutting: filterable + multi-select fields on every tab** (Restated Q #18). 20-40 hours. Two paths (chip-per-column vs adopt TanStack Table v8) — design pick + primitive + apply-to-one-tab proof.

**Option E — Eligibility v2.** Cross-tab nav (Eligibility job code → filtered Positions), real-data DHR paste walkthrough, optional Cloudflare Worker for live DHR fetch. Light v1 polish; not really a "sub-phase" in the dependency-graph sense.

**My pick: Option B** — the temp-limits view has the highest user-visible payoff (Cat 17/18 expiration warnings are governance-critical at DBI) AND the gating is just 4 short Alex answers. If Alex doesn't have time to answer the 4 TX questions, fall back to Option C (Vacancies, no gating).

## Next session prompt — Phase 2.2.l (Alex picks A, B, C, D, E, or another sub-phase)

Paste this verbatim to start Session 35:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.l),
then ships it. Phase 2.2.k shipped 6 PRs in an autonomous-mode
session (Alex was away 9 hours, phone-only for short answers):
#106 (Probation + Separations employee # sync bug fix); #107
(Probation supervisor auto-resolves from position.reportsTo + new
deputy free-text field); #108 (Probation end-date up-front + 5
preset durations + click-to-edit on the row); #109 (Probation row
selection + email-generator with both mailto: AND copy-template
buttons per row); #110 (CopyButton rollout to Positions + Payroll +
Inactive + Hiring Plan + Position Detail RTF/ReportsTo); #111
(Phase 2.2.k primary — Tab 11 Eligibility + SmartRecruiters live
fetcher [CORS-permissive, 133 postings → 88 job codes] + DHR
manual-paste parser [CORS blocked, infra-free fallback]).

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 34 entry — Phase 2.2.k + 5 follow-ups)
  memory/MEMORY.md + the 10 memory files
  docs/audits/phase-2-2-k-close-audit.md (carry-forwards B-F; A stays dropped)
  docs/research/dhr-eligibility-and-jobs-scraping-plan.md (implementation backdrop)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
  git log --oneline origin/main -8

==============================================================================
STEP 0 — Phase 2.2.l close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.k close audit fired
in S34. This session, the audit cadence check is only the Phase
2.2.l close audit when 2.2.l ships. Don't re-audit 2.2.k.

DO fire the 2.2.l audit before this session ends. Use the Phase
2.2.k close audit format; mirror the prior audit's table of
carry-forwards.

==============================================================================
STEP 0.5 — First task: DHR real-data paste walkthrough
==============================================================================
PR #111 shipped the manual-paste DHR workflow against unit-tested
synthetic input that mirrors the real DHR HTML structure
(WebFetch'd during planning). But no live data has flowed through.

Before doing anything else this session, open
  https://sfdhr.org/past-examination-results
in a browser tab, select all + copy, paste into the Eligibility tab's
"Paste DHR exam-results HTML" textarea on KosPos, click Parse.
Report:
  - How many rows parsed (success path)?
  - Any rows that should have parsed but didn't (failure path)?
  - Any rows that parsed but with wrong data (data-quality path)?

Outcome:
  - Clean parse → file a low-priority "queue full 66-page paste"
    follow-up; the parser is real-data-validated.
  - Some failures → file the failure patterns as restated questions
    OR fix the parser this session (low-risk, scoped).
  - Major failures → escalate to "scope a CORS-proxy follow-up" as a
    new restated question.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.l
==============================================================================
Use AskUserQuestion. Four options:

  A. 2.2.18 lib/views/reporting-tree/ + Change Mode precursor
     — Tab 21. Feeds Phase 7 org chart. lib/changes/ stub needs lift
     alongside (scope risk).

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry + 1040-hour gauges. STILL GATED: the 4 TX
     TODOs in Restated Question #5 must be answered up front (5a-5d).

  C. 2.2.22 lib/views/vacancies/
     — Tab 23 Vacancies and TEMP, filtered position list with
     cross-check against Staffing Plan. Light-weight, low-risk.

  D. Cross-cutting: filterable + multi-selectable fields on every tab
     — Alex's reiterated UI directive (Restated Q #18). 20-40 hours
     across all tabs. Needs design pick: per-column chips vs adopt a
     table library (TanStack Table v8). Could be its own sub-phase.

  (Escape hatch: Alex names something else from the dependency graph,
   e.g. "Eligibility v2 polish" — cross-tab nav from job code to
   Positions + optional Cloudflare Worker for live DHR fetch.)

==============================================================================
STEP 2 — Start Phase 2.2.l (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If A — views/reporting-tree/:
  Branch: feat/views-reporting-tree
  Scope:
    - lib/views/reporting-tree/ — Tab 21 surface (org-chart preview
      + reports-to chain integrity flags)
    - Surface Scenario 1 flags: reports-to-cycle / reports-to-dangling-
      ref / reports-to-empty-non-commissioner / reports-to-excessive-
      depth via lib/quality/
    - Optionally lift lib/changes/ from stub (flag if it becomes
      the bigger lift)
    - Tab to App.tsx (devOnly initially)
    - Tests

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5a-5d)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 surface
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
    - Tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If C — views/vacancies/:
  Branch: feat/views-vacancies
  Scope:
    - lib/views/vacancies/ — Tab 23 filtered position list
    - Cross-check rows against Hiring Plan PlannedActions (visual
      indicator: planned/unclaimed)
    - Tab to App.tsx (devOnly initially)
    - Tests

If D — filterable everywhere (cross-cutting):
  Branch: feat/filterable-tables OR feat/adopt-tanstack-table
  Scope:
    - Pick approach via AskUserQuestion at the start (per-column chips
      OR TanStack Table adoption)
    - Build the primitive (FilterableColumn component or table-library
      wrapper)
    - Apply to one tab as a proof (recommend Separations — smallest)
    - DO NOT roll out to all tabs in one session — bound the scope to
      the primitive + one application
    - Tests + preview-MCP walkthrough
    - File the per-tab rollout as carry-forward

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 549 / 549).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - **Run `npm run build` before opening PR** — 5 sessions running of
    clean first-run builds (S34 caught 1 TS error pre-PR; habit firm).

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (5 ADRs queued, possibly folded:
    ADR-007 amendment for the 39-col OBI shape + iso() serial-converter
    note + BFM eturn ADR + Position.cat1718 lift note + ONE
    consolidated ADR for the 4-view no-upstream-source pattern shared
    by lib/staffing-plan/ + lib/views/inactive/ + lib/views/separations/
    + lib/views/probation/ (optionally folding in lib/positions/people.ts
    + lib/scrapers/ as a derived-data extension)).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Inactive / Separations /
    Probation / Eligibility / Temp Limits / Reporting Tree to non-dev
    yet — wait until cross-tab nav has been used end-to-end on real
    data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.l status + next-session prompt for Phase 2.2.m.
  - Re-ask the 5 restated questions + 12 reasonable-default calls
    (#6-17) + 2 open action items (#19, #20). DROP items Alex
    acknowledges this session.
  - Carry-forward update on items B-F (A resolved S33, off the list).
  - Fire the Phase 2.2.l close audit (mirrors Phase 2.2.k audit format).

Recommended model: claude-opus-4-7 for A (entity + cross-cutting quality
wiring), D (cross-cutting design pick), or if Alex picks a complex
"escape hatch". claude-sonnet-4-6 OK for B (well-defined once TX TODOs
answered) or C (smallest, well-trodden pattern). Effort: medium-to-high
for A/D; medium for B; low-to-medium for C.
````

### Recommended model (Phase 2.2.l)

`claude-opus-4-7` for A (entity + cross-cutting quality wiring) or D (cross-cutting design pick). `claude-sonnet-4-6` OK for B (well-defined once TX TODOs answered) or C (smallest, well-trodden pattern). Effort: medium-to-high for A/D; medium for B; low-to-medium for C.

### S34 follow-ups (new — low priority)

- **DHR real-data paste walkthrough** (action item #20 above — S35 first task).
- **Cross-tab nav from Eligibility → Positions** — click a job code on Eligibility → filter Positions to that jobCode. ~30 min. Bundleable into any future PR.
- **Promote Probation to non-dev** — after Alex's first walkthrough on real data.
- **Lift `buildProbation*Email` to `lib/ui/notifications/`** — only if a 2nd consumer arrives.
- **Cloudflare Worker for DHR live fetch** — only if Alex wants ~1-minute auto-refresh over the page-by-page manual paste. ~2-4 hours build + deploy.
- **Document TS class-parameter-property restriction** — `erasableSyntaxOnly` rejects `constructor(public readonly x)` syntax. Worth a one-liner in WORKFLOW.md or CLAUDE.md (bundleable with B + C).

---

## Current status (end of Session 33 — Phase 2.2.j: lib/probation/ + lib/views/probation/ + 4 follow-up PRs in autonomous mode, 2026-05-28)

**Phase:** Phase 2.2.j — **`lib/probation/` + `lib/views/probation/` + Probation tab + 4 follow-up PRs from Alex's S33 added-items list** ([PR #100](https://github.com/alkprojects/kospos/pull/100) — Probation typed entity with 5-status workflow + auto end-date math + extension audit log; [PR #101](https://github.com/alkprojects/kospos/pull/101) — Separations employee name autocomplete + Employee # input + new shared `lib/positions/people.ts` module; [PR #102](https://github.com/alkprojects/kospos/pull/102) — Probation autocomplete parity; [PR #103](https://github.com/alkprojects/kospos/pull/103) — LoadingOverlay modal for file uploads; [PR #104](https://github.com/alkprojects/kospos/pull/104) — CopyButton primitive with two-squares icon + applied to first 3 surfaces). Phase 2.2.j close audit fired on schedule (10th event-based trigger).
**Last main commit:** [PR #104](https://github.com/alkprojects/kospos/pull/104) (CopyButton) → [PR #103](https://github.com/alkprojects/kospos/pull/103) (LoadingOverlay) → [PR #102](https://github.com/alkprojects/kospos/pull/102) (Probation autocomplete) → [PR #101](https://github.com/alkprojects/kospos/pull/101) (Separations autocomplete) → [PR #100](https://github.com/alkprojects/kospos/pull/100) (Probation entity + view)
**Tests:** 485 / 485 passing (+72 net from start of Phase 2.2.j: ~57 entity-layer + ~13 view-level + 5 session export/import + 6 LoadingOverlay + 7 people-index + 6 CopyButton, with a 5-test reconciliation discrepancy flagged in the audit).
**Branches in flight:** none post-merge.
**Worktree hygiene:** **3 of 3 watch-PRs auto-archived cleanly at S33 open** (PR #96 + #98 + S32 docs PR). All 5 session PRs auto-archived inside the session as they merged. Pattern resumed — **Item A drops from carry-forward permanently**.

### What landed this session — 5 PRs (plus this docs PR)

Alex was away from the computer for the entire session. The S33 prompt provided 3 sub-phase options + 5 "added by alex" items (1 issue + 2 feature requests + 1 UI directive + 1 research question). Sub-phase pick made autonomously: **Option C (Probation)** — the lowest-risk autonomous-mode pick because it mirrors Separations end-to-end with no gating questions.

#### [PR #100](https://github.com/alkprojects/kospos/pull/100) — Phase 2.2.j primary: Probation typed entity + 5-status workflow + auto end-date + extension audit

13 files / +2,809 / −2. KosPos becomes the system of record for probation tracking. Replaces the workbook's 26-row × 11-col hand-maintained Tab 10. Status workflow: `open → extended → cleared / failed / resigned` (cleared/failed/resigned terminal). `computeBaseEndDate` math: 2080 hrs = +364 days exact, 1040 hrs = +182 days. Derived flags: ⏳ Approaching (within 30d, non-terminal), ⚠ Past due (today-or-past, non-terminal). Extensions modeled as append-only array — `addExtension` action auto-transitions `open → extended` on first extension. Session JSON wired with optional `probations?:` (back-compat: schema stays at v1). Probation tab between Separations and Inactive, `devOnly: true`.

#### [PR #101](https://github.com/alkprojects/kospos/pull/101) — Separations autocomplete fix (Alex's S33 issue #1)

Added the Employee # input (was missing entirely) + datalist-backed autocomplete for both Employee name and Employee # fields. Reciprocal autofill: picking a known name fills # + position + jobCode; vice versa. Extracted shared `lib/positions/people.ts` module — `buildPeopleIndex(positions) → {byName, byEmplId, list}`. Future tabs needing person autocomplete (EE Additional Pay, Roster Approvers) reuse for free.

#### [PR #102](https://github.com/alkprojects/kospos/pull/102) — Probation autocomplete parity

Mirror PR #101 for Probation. Uses the same shared module — no new logic.

#### [PR #103](https://github.com/alkprojects/kospos/pull/103) — LoadingOverlay (Alex's S33 feature request #1)

Full-screen modal with spinner + per-file progress + stage label (reading → parsing → importing). FilePicker yields a frame via `requestAnimationFrame` between stages so the overlay can repaint at stage boundaries. The .xlsx parse itself remains synchronous (xlsx-library limit) — Web Worker upgrade deferred until needed.

#### [PR #104](https://github.com/alkprojects/kospos/pull/104) — CopyButton primitive (Alex's S33 feature request #2)

New `lib/ui/CopyButton` — small icon-only button with two-squares ⧉ SVG icon. Click → `navigator.clipboard.writeText`; swaps to checkmark / X for ~1.2s. Fallback to `document.execCommand('copy')` for insecure contexts. Stops event bubbling so safe inside clickable rows. Applied to Position Detail header + Incumbent section, Separations + Probation table employee cells. Future PRs extend to remaining surfaces (Hiring Plan / Payroll / Calculator / Special Class — 1-line-per-cell now).

#### This docs PR — Phase 2.2.j close audit + DHR scraping plan + S33 SESSION_LOG + S34 handoff

Includes the [DHR scraping feasibility plan](research/dhr-eligibility-and-jobs-scraping-plan.md) answering Alex's "how realistic is it to add a button that kicks off a manual scrape" question. Summary: **job postings via SmartRecruiters API is highly realistic v1 (4-8 hr, depends on CORS)** + **exam results via paginated HTML scrape is moderately realistic (8-16 hr, needs CORS proxy)**. Recommended next-step task: a 30-min CORS verification.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **no items acknowledged this session** (Alex was away). The carry-forward list carries over from S32 + adds new items from S33.

#### Restated questions for Alex (5 — adds new item #18 from S33)

Items 1-4 carry from S32. Item 5 (TX rules — 4 sub-questions) **still gates Phase 2.2.19 `views/temp-limits/`**. Item 18 is new this session.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level — G42 / H42 (9993 ÷ non-9993 labor), L23 / L32 (projected balance ÷ total budget), H43 (hand-keyed "Calculated, Questionable"). Which is "the attrition rate" for CON / MYR reporting? **My current default:** G42 / H42 is canonical; L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** When KosPos emits the labor-report-shaped .xlsx for downstream consumers, preserve the `Department Group` GETPIVOTDATA label so other people's formulas still work? **My current default:** yes, preserve it.

3. **OPS Detail snapshot-diff key.** Options: (a) Position Number alone, (b) `(Effective Dept, Position Number, Fill Status, Budget Job Code)`, (c) Position Number + a separate tracker for "who occupied it when". **My current default:** option (b).

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware." Implement in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation:

   **5a.** Is the TX `expired_date` set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or **negotiated independently** between DHR and the originating dept?

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18?

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or distinct?

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" but CSC Rule 114 implies up-to-1,040-hour increments are allowed.

18. **(NEW S33)** **Filterable + multi-selectable on every field, every tab** (Alex's reiterated UI directive). Confirmed as a future requirement. Scope: ~20-40 hours across all tabs. Two implementation paths:
   (a) **Add per-column filter chips** to every table, with multi-select dropdowns for enum-like columns (status, type, department, job code). High user-perceived value, moderate component-design lift.
   (b) **Adopt a table library** (TanStack Table v8, AG Grid Community) and migrate every table at once. Higher upfront effort, lower per-tab incremental cost going forward.
   **My current default:** option (a) incrementally per-tab, since the existing tables are small and homemade; library adoption is overkill for v1. **Confirm or correct?**

#### Reasonable-default calls deferred (12 — unchanged from S32)

**8 from Session 20 (Tab 23-25 walkthroughs):**

6. **(Tab 23)** 6 slicer-chip semantics reverse-engineered — confirm or correct?
7. **(Tab 23)** Where does `Vacant Date` come from?
8. **(Tab 23)** `Previous Employee2` vs `Previous Employee` — which is which?
9. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — `IF(P="TEMPM", "", ...)` skips check.
10. **(Tab 24)** Cost-basis for blank `W` cells — **Default:** KosPos always computes expected cost.
11. **(Tab 24)** PlannedAction history retention — **Default:** 18 months with summary roll-up.
12. **(Tab 24)** DBI→CPC transfer-of-function propagation — **Default:** stays on originating dept until EOY.
13. **(Tab 24 + Tab 25)** Active-row blank-`W` "X of Y priced ⚠" diagnostic chip — placement OK?

**4 new from Session 21 (Tab 1-22 walkthroughs):**

14. **(Tab 12)** `E2P` = "Eligible to Promote" — what does it mean exactly?
15. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions. Map to `is_pool_position = true`?
16. **(Tab 21)** Reporting Tree change-proposal cols — workflow today?
17. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year) or Phase 7 (talent)?

#### Open action items (1 — same as S32)

19. **The 5 vacant-no-RTF positions.** Restated: 5 positions show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.**

#### Resolved this session (drops from carry-forward)

- **Phase 2.2.j pick — SHIPPED autonomously as Option C (Probation).** Alex didn't ratify but didn't need to — the option was the safest autonomous-mode pick given the gating on A and the scope risk on B. PR #100 ships end-to-end.
- **Separations autocomplete + Employee # input issue — FIXED in PR #101.**
- **Loading screen for file uploads feature request — SHIPPED in PR #103.**
- **Two-squares copy-to-clipboard feature request — SHIPPED in PR #104** (with first-pass coverage; extension to remaining surfaces is a low-priority follow-up).
- **DHR scraping research question — ANSWERED in the new [docs/research/dhr-eligibility-and-jobs-scraping-plan.md](research/dhr-eligibility-and-jobs-scraping-plan.md).** Plan only; implementation is Alex's pick when he returns.

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.j close audit](audits/phase-2-2-j-close-audit.md):

A. **Auto-archive monitoring — RESOLVED.** Pattern resumed cleanly. **3 of 3 watch-PRs auto-archived at S33 open**; all 5 session PRs cleaned inside the session. **Item drops permanently from carry-forward.**

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** ~2,940 lines after S33 entry (was 2,870 pre-entry). Past the 2,000-line trim trigger; bundleable with C + the Tab 24 Improvement #6 holdReason language drift + the OBI serial doc note + a new item (document `docs/research/` location convention in WORKFLOW.md). ~1.5-2 hours combined.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** **12 instances unchanged** (no labor-report.md edits this session). Bundleable with B.

D. **Defer the `labor-report.md` split until Phase 2.4.** Still 8,518 lines. Defer holds.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 10th event-based trigger fired on schedule this session.

### Top 3 findings to surface for Alex this session

1. **Phase 2.2.j Probation is shippable.** Visit `/kospos/?dev=1` → click Probation (between Separations and Inactive). Add a probation row (name + 2080 hrs + start date required). End-date auto-computes from start + hours (verify: start 2026-01-01 + 2080 hrs → 2026-12-31). Add a row with an old start date (e.g. 2024-12-01 → end 2025-11-30) to see the ⚠ Past due chip. Click a row → modal opens with extensions section + status guard.

2. **The vacancy/lifecycle workspace set is now 4 typed entities deep.** Hiring Plan + Inactive + Separations + Probation. All four follow the no-upstream-source pattern (KosPos as system of record). Phase 2.4 ADR queue folds all four into ONE consolidated ADR (was 3 pre-this-session).

3. **Three of Alex's S33 added-items shipped this session.** Separations autocomplete + Employee # field (PR #101). LoadingOverlay for file uploads (PR #103). CopyButton with the two-squares icon (PR #104, applied to 4 surfaces — extensions are 1-line-per-cell follow-ups). The DHR scraping plan landed as research only (no code); Alex picks the implementation path when he returns. The "filterable on every field" directive is too large for an autonomous-mode session; captured as new restated question #18.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full + `lib/budget/` + Budget vs Actual | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` v1 + Hiring Plan workspace | done 2026-05-26 |
| 2.2.f | `2.2.21` v2 PR 1: Bug 3 + status-transition guard + Bug 2 polish | done 2026-05-26 |
| 2.2.g | `2.2.21` v2 PR 2: PlannedActionDetail + delta-pay + Bug 2a asOf-serial fix | done 2026-05-26 |
| 2.2.h | `2.2.20` `views/inactive/` — Tab 13 INACTIVE live query | done 2026-05-27 |
| 2.2.i | `2.2.26` `lib/separations/` + `views/separations/` — Tab 14 + Hiring Plan cross-link | done 2026-05-27 |
| **2.2.j** | **`2.2.25` `lib/probation/` + `views/probation/` + 4 follow-ups** — Tab 10 + autocomplete + LoadingOverlay + CopyButton | **done 2026-05-28** |
| **2.2.k** | **Next sub-phase** — Alex's pick. Top candidates: **(a) `2.2.28` `views/eligibility/`** + DHR scraper button (Tab 11 + the scraping plan that landed this session); **(b) `2.2.18` `views/reporting-tree/`** (Tab 21 — feeds Phase 7 org chart, requires `lib/changes/` stub lift); **(c) `2.2.19` `views/temp-limits/`** (TX entity + Cat 17/18 expiry — STILL gated on TX TODOs Restated Q #5); **(d) `2.2.22` `views/vacancies/`** (Tab 23, lighter-weight than the others); **(e)** the new filterable/multi-select UI directive as its own cross-cutting sub-phase. | **NEXT** |
| 2.2.l-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the 39-col OBI shape + new ADR for the 64-col BFM eturn shape + **new ADR for the 4-view no-upstream-source pattern: `lib/staffing-plan/` + `lib/views/inactive/` + `lib/views/separations/` + `lib/views/probation/`** + Position.cat1718 lift note + iso() serial-converter from PR #89 — 4 queued together) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Probation tab is visible in dev mode** between Separations and Inactive.
- **Add probation flow** works (employee name + hours + start date required). End-date auto-computes from start + hours.
- **Derived flags work.** Try adding a row with start 2024-12-01 (well past) → ⚠ Past due chip. Add a row with start ~30 days back → ⏳ Approaching chip.
- **Detail modal works.** Click a row → modal opens with all fields editable + extensions inline-prompt + history audit log.
- **Add extension auto-transitions open → extended.** Click "+ Add extension" in the modal, set a new end date, Save extension. Row status flips to "Extended" + history entry logged.
- **Separations + Probation autocomplete from loaded P&P.** Load a P&P snapshot, then type a known employee name into Separations or Probation add form — Employee # + Position # + Job code auto-fill from the matching incumbent.
- **LoadingOverlay shows during file uploads.** Drop a real .xlsx into Load Reports — full-screen overlay with spinner, filename, size, stage label.
- **Copy-to-clipboard buttons render.** The ⧉ two-squares icon appears next to Position #, Job code, Employee name, Empl ID in Position Detail; next to employee name + ID + position # in the Separations and Probation table cells. Click any → 1.2s checkmark confirmation.
- **Session JSON roundtrip preserves Probations.** Save session, reload, load session back → probations survive.
- **No regression on prior surfaces.** Positions / Payroll / Hiring Plan / Inactive / Separations / Calculator / Special Class all still render.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.k).** See Recommendations.

### Recommendation for Phase 2.2.k

**Option A — `2.2.28` `lib/views/eligibility/` + DHR scrape button.** Tab 11 Eligibility Lists + the manual-scrape button Alex asked about (informed by the new [docs/research/dhr-eligibility-and-jobs-scraping-plan.md](research/dhr-eligibility-and-jobs-scraping-plan.md)). **Pros:** answers Alex's S33 scraping question with a real implementation; replaces a hand-maintained workbook tab; unlocks per-position "is there an active eligibility list?" cross-link. **Cons:** depends on the 30-min CORS verification first; if CORS is blocked, requires a serverless proxy (Cloudflare Worker) which adds operational infrastructure beyond GitHub Pages. Effort: 4-16 hours depending on CORS outcome.

**Option B — `2.2.18` `lib/views/reporting-tree/`.** Tab 21 Reporting Tree (org-chart preview + data-quality flags + change-proposal cols → KosPos Change Mode precursor). Feeds Phase 7 org chart. **Pros:** unblocks Phase 7; surfaces Scenario 1 reports-to-cycle / dangling-ref flags; Reporting Tree is a high-visibility surface. **Cons:** Change Mode design (`lib/changes/` — still a stub) needs to land alongside or shortly after to make the change-proposal cols meaningful. Effort: medium-to-high.

**Option C — `2.2.19` `lib/views/temp-limits/` (Cat 17/18 + TX).** Still **GATED** on the 4 TX TODOs (Restated Q #5a-5d). Resolving those (~30 min of Alex's input) unlocks ~10-12 hours of build. If Alex picks this, answer the 4 TX questions up front.

**Option D — `2.2.22` `lib/views/vacancies/`** (Tab 23). Lighter-weight; filtered position list with cross-check against Staffing Plan. **Pros:** small, low-risk, no gating. **Cons:** less user-visible payoff than A/B/C; vacancy planning already largely covered by the Hiring Plan workspace from PR #79/85/90.

**Option E — Cross-cutting: filterable + multi-select fields on every tab** (Restated Q #18). Could be its own sub-phase. **Pros:** addresses Alex's reiterated UI requirement. **Cons:** 20-40 hours; cuts across every existing table; warrants its own design decision (per-column chips vs adopt a table library).

**My pick: Option A** — the DHR scraping plan is fresh, Alex specifically asked about it, and shipping Eligibility Lists unlocks a real user workflow (knowing which positions have active hiring lists). The 30-min CORS check at the top of the session decides the build estimate. If CORS proves problematic, **Option D is the fast pivot** — no infrastructure decisions, ships in one session.

## Next session prompt — Phase 2.2.k (Alex picks A, B, C, D, E, or another sub-phase)

Paste this verbatim to start Session 34:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.k),
then ships it. Phase 2.2.j shipped 5 PRs in an autonomous-mode session:
#100 (lib/probation/ + lib/views/probation/ — Tab 10 Probation typed
entity + 5-status workflow + auto end-date + extension audit); #101
(Separations autocomplete + Employee # field + new shared
lib/positions/people.ts module); #102 (Probation autocomplete parity);
#103 (LoadingOverlay for file uploads); #104 (CopyButton primitive
with two-squares icon + applied to first 3 surfaces). The
vacancy/lifecycle workspace set is now 4 typed entities deep (Hiring
Plan + Inactive + Separations + Probation).

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 33 entry — Phase 2.2.j + 4 follow-ups)
  memory/MEMORY.md + the 10 memory files
  docs/audits/phase-2-2-j-close-audit.md (carry-forwards A-F; A resolved)
  docs/research/dhr-eligibility-and-jobs-scraping-plan.md (informs Option A)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.k close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.j close audit fired in
S33. This session, the audit cadence check is only the Phase 2.2.k
close audit when 2.2.k ships. Don't re-audit 2.2.j.

DO fire the 2.2.k audit before this session ends. Use the Phase 2.2.j
close audit format; mirror the prior audit's table of carry-forwards.

==============================================================================
STEP 0.5 — Item A removed from monitoring (resolved S33)
==============================================================================
Auto-archive monitoring resolved cleanly at S33 (3/3 watch-PRs clean;
5/5 session PRs clean). No watchlist this session. If a slip recurs
in the next 3 sessions, reopen and investigate the Cowork watcher.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.k
==============================================================================
Use AskUserQuestion. Five options:

  A. 2.2.28 lib/views/eligibility/ + DHR scrape button
     — Tab 11 Eligibility Lists + manual-scrape button informed by
     the new docs/research/dhr-eligibility-and-jobs-scraping-plan.md.
     PREREQ: 30-min CORS verification at session top — fetch from
     api.smartrecruiters.com/v1/companies/CityAndCountyOfSanFrancisco1/postings
     and from sfdhr.org/past-examination-results in a browser console
     to determine whether a serverless proxy is needed. Outcome
     determines build estimate (4 hr if CORS works, 12-16 hr if not).

  B. 2.2.18 lib/views/reporting-tree/ + Change Mode precursor
     — Tab 21. Feeds Phase 7 org chart. lib/changes/ stub needs lift
     alongside (scope risk).

  C. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry + 1040-hour gauges. STILL GATED: the 4 TX
     TODOs in Restated Question #5 must be answered up front (5a-5d).

  D. 2.2.22 lib/views/vacancies/
     — Tab 23 Vacancies and TEMP, filtered position list with
     cross-check against Staffing Plan. Light-weight, low-risk.

  E. Cross-cutting: filterable + multi-selectable fields on every tab
     — Alex's reiterated UI directive (Restated Q #18). 20-40 hours
     across all tabs. Needs design pick: per-column chips vs adopt a
     table library (TanStack Table v8). Could be its own sub-phase.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.k (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If A — views/eligibility/ + DHR scrape:
  Branch: feat/views-eligibility-and-dhr-scrape
  Scope:
    - 30-min CORS verification at top (fetch from both URLs above)
    - If CORS works: lib/scrapers/sf-careers/ + lib/scrapers/sf-dhr-exam/
      (4-8 hr each, per the research doc)
    - If CORS blocked: serverless proxy setup (+ 2-4 hr) OR fall back
      to manual-paste flow OR pivot to Option D
    - lib/views/eligibility/ — Tab 11 surface with active-list
      indicators per job code
    - Wire scrape buttons into Importer/Load Reports tab with
      LoadingOverlay reuse (already shipped PR #103)
    - Tests + preview-MCP walkthrough

If B — views/reporting-tree/:
  Branch: feat/views-reporting-tree
  Scope:
    - lib/views/reporting-tree/ — Tab 21 surface (org-chart preview
      + reports-to chain integrity flags)
    - Surface Scenario 1 flags: reports-to-cycle / reports-to-dangling-
      ref / reports-to-empty-non-commissioner / reports-to-excessive-
      depth via lib/quality/
    - Optionally lift lib/changes/ from stub (flag if it becomes
      the bigger lift)
    - Tab to App.tsx (devOnly initially)
    - Tests

If C — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5a-5d)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 surface
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
    - Tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If D — views/vacancies/:
  Branch: feat/views-vacancies
  Scope:
    - lib/views/vacancies/ — Tab 23 filtered position list
    - Cross-check rows against Hiring Plan PlannedActions (visual
      indicator: planned/unclaimed)
    - Tab to App.tsx (devOnly initially)
    - Tests

If E — filterable everywhere (cross-cutting):
  Branch: feat/filterable-tables OR feat/adopt-tanstack-table
  Scope:
    - Pick approach via AskUserQuestion at the start (per-column chips
      OR TanStack Table adoption)
    - Build the primitive (FilterableColumn component or table-library
      wrapper)
    - Apply to one tab as a proof (recommend Separations — smallest)
    - DO NOT roll out to all tabs in one session — bound the scope to
      the primitive + one application
    - Tests + preview-MCP walkthrough
    - File the per-tab rollout as carry-forward

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 485 / 485).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - **Run `npm run build` before opening PR** — 4 sessions running of
    clean first-run builds; habit firm.

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (4 ADRs queued: ADR-007 amendment
    for the 39-col OBI shape + iso() serial-converter note + BFM
    eturn ADR + Position.cat1718 lift note + ONE consolidated ADR
    for the 4-view no-upstream-source pattern shared by
    lib/staffing-plan/ + lib/views/inactive/ + lib/views/separations/
    + lib/views/probation/, optionally folding in the
    lib/positions/people.ts people-index).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Inactive / Separations /
    Probation / Temp Limits / Reporting Tree to non-dev yet — wait
    until cross-tab nav has been used end-to-end on real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.k status + next-session prompt for Phase 2.2.l.
  - Re-ask the 5 restated questions + 13 reasonable-default calls
    (#6-17) + 1 open action item (#19). DROP items Alex acknowledges
    this session.
  - Carry-forward update on items B-F (A resolved S33, off the list).
  - Fire the Phase 2.2.k close audit (mirrors Phase 2.2.j audit format).

Recommended model: claude-opus-4-7 for Option A (CORS investigation +
scraper design + UI), Option B (entity + cross-cutting quality wiring),
or Option E (cross-cutting design pick). claude-sonnet-4-6 OK for
Option C (well-defined once TX TODOs answered) or Option D (smallest,
well-trodden pattern). Effort: medium-to-high for A/B/E; medium for C;
low-to-medium for D.
````

### Recommended model (Phase 2.2.k)

`claude-opus-4-7` for A (CORS investigation + scraper design), B (entity + cross-cutting quality wiring), or E (cross-cutting design pick). `claude-sonnet-4-6` OK for C (well-defined once TX TODOs answered) or D (smallest, well-trodden pattern). Effort: medium-to-high for A/B/E; medium for C; low-to-medium for D.

### S33 follow-ups (new — low priority)

- **Extend CopyButton coverage** — Hiring Plan / Payroll / Calculator / Special Class tables + Position Detail beyond identity. 1-line-per-cell now that the shared `lib/ui/CopyButton` exists. Bundleable into any future PR that touches those surfaces.
- **Web Worker for xlsx parse** — LoadingOverlay only repaints between stages (within a single sync parse, UI is frozen). Web Worker rewrite would unblock the main thread during parse. Deferred until the overlay-only fix proves insufficient on Alex's hardware.
- **CORS verification for DHR sources** — 30-min task; gates the Option A build estimate. Should be the first task in S34 if Option A is picked.
- **Document `docs/research/` location convention in WORKFLOW.md** — first research doc landed this session; bundleable with B + C cleanup.
- **Test count reconciliation** — `npm test` shows 485 but per-PR sums expected 490. 5-test discrepancy flagged in the S33 audit + log; future session may want to re-count.

---

## Current status (end of Session 32 — Phase 2.2.i: lib/views/separations/ — Tab 14 Separations + cross-link to Hiring Plan, 2026-05-27)

**Phase:** Phase 2.2.i — **`lib/separations/` + `lib/views/separations/` + Separations tab + Hiring Plan cross-link indicator** ([PR #98](https://github.com/alkprojects/kospos/pull/98) — PendingSeparation typed entity with status workflow + confidence axis + cross-link to PlannedAction.id; SeparationsView with summary header, add form, filter chips, table; SeparationDetail modal editor with status guard + override-reason flow + history audit log; Separations tab between Hiring Plan and Inactive; "Tracked in Separations" reciprocal indicator on Hiring Plan side; session JSON export/import wired backward-compatibly). Phase 2.2.i close audit fired on schedule (9th event-based trigger).
**Last main commit:** `d1703ea` ([PR #98](https://github.com/alkprojects/kospos/pull/98) — Separations) → `2cefa12` ([PR #97](https://github.com/alkprojects/kospos/pull/97) — S31 docs/audit/handoff) → `7fef159` ([PR #96](https://github.com/alkprojects/kospos/pull/96) — Inactive view) → `bb38f9d` ([PR #95](https://github.com/alkprojects/kospos/pull/95) — data-sensitivity correction) → `90fb86f` ([PR #94](https://github.com/alkprojects/kospos/pull/94) — S30 tail docs)
**Tests:** 413 / 413 passing (+39 from start of Phase 2.2.i: 23 entity-layer + 12 view-level + 4 session export/import).
**Branches in flight:** none post-merge.
**Worktree hygiene:** **1 of 3 watch-PRs clean.** PR #96 auto-archived cleanly at S31→S32 transition (the first datapoint after PR #95's one-off slip in S30→S31). PR #98 + this docs PR will be measured at S33 open. **Two more clean PRs needed to declare the pattern resumed.**

### What landed this session — one PR (plus this docs PR)

#### [PR #98](https://github.com/alkprojects/kospos/pull/98) — Phase 2.2.i: lib/views/separations/ — Tab 14 Separations

The workbook's Tab 14 is a hand-maintained list with no employee ID join, no status workflow, and no cross-link to Tab 24 § Separations. KosPos types it as a focused workspace for rumored / pending separations the user hears about before they're formally entered as PlannedActions in the Hiring Plan.

14 files / +2,042 / −4. Highlights:

| What | Where |
|---|---|
| **`PendingSeparation` typed entity** + `SeparationStatus` enum (`rumored / confirmed / paperwork-filed / cleared`) + `ConfidenceLevel` enum (`low / medium / high`) on separate axes + canonical orderings. Naming note: the existing `PlannedAction.separationConfidence` is a 3-value workflow enum (no "cleared" terminal); the new module's `SeparationStatus` is the 4-value workflow + `ConfidenceLevel` is the orthogonal certainty axis. Kept names distinct to avoid module-import collisions. | new [types.ts](../app/src/lib/separations/types.ts) |
| **`useSeparations` Zustand store** — Map-keyed by id; history-diff-on-update with optional `overrideReason` routed to the `status` field only (other fields don't have a guard to override); `restoreFromSession` for the JSON roundtrip; defensive `normalizePositionKey` on positionId at add + patch time. | new [store.ts](../app/src/lib/separations/store.ts) |
| **Pure helpers** — `newSeparationId`; `isAllowedSeparationStatusTransition` (mirrors PR #85 guard pattern — forward + same-state allowed, backward requires override); `rollupByStatus` (4-bucket strip in canonical order); `separationsForPosition` (normalized-key join); `separationsForAction` (by `linkedActionId`). | new [build.ts](../app/src/lib/separations/build.ts) |
| **`SeparationsView`** — summary header (total + 4-status rollup chips) + add form (employee name required, position picker autocomplete optional, status defaults to `rumored`, confidence to `medium`) + filter bar (search + status radiogroup chips with counts) + 8-col table (Employee / Position / Job / Status / Conf / Expected / Reason / Link). Works even with no P&P loaded — the position field is optional in v1. | new [SeparationsView.tsx](../app/src/lib/views/separations/SeparationsView.tsx) |
| **`SeparationDetail` modal editor** — all fields editable (employee name + ID + position picker + job code + status + confidence + expected date + reason + notes + linkedActionId picker). Status guard: backward transitions surface "Force override (logged)" checkbox + required reason text input; Save is gated until both. Override reason flows into the history audit log on the status entry. History audit log preview at modal bottom. | new [SeparationDetail.tsx](../app/src/lib/views/separations/SeparationDetail.tsx) |
| **`Separations` tab** between Hiring Plan and Inactive, `devOnly: true` per "no promotion to non-dev until cross-tab nav has been used end-to-end on real data". | [App.tsx](../app/src/App.tsx) |
| **Session export / import wiring** — added optional `pendingSeparations?: Array<[string, PendingSeparation]>` to `SessionPayload`. Schema stays at v1 (backward-compatible: pre-Phase-2.2.i files load with the field undefined, restore defaults to `[]`). `buildSessionFile`'s pendingSeparations arg is optional for back-compat with existing test fixtures. 4 new session tests cover the roundtrip + backward-compat + wrong-type rejection. | [snapshot.ts](../app/src/lib/session/snapshot.ts) + [SessionExportImport.tsx](../app/src/modules/importer/SessionExportImport.tsx) |
| **Hiring Plan cross-link indicator** — Separation-section rows whose id matches a `PendingSeparation.linkedActionId` get a 🔗 Tracked in Separations chip in the Notes column. One-way pointer keeps the data shape simple; the Hiring Plan side queries the separations store and computes `Map<actionId, count>` once per separationsMap change. | [StaffingPlanView.tsx](../app/src/lib/views/staffing-plan/StaffingPlanView.tsx) |
| **39 new tests** — 23 entity (guard transitions, rollup, by-position/by-action joins, store CRUD with defaults / patch / history / override-reason routing / positionId normalization) + 12 view (empty state, render, add flow, status filter, search, count tracking, row-click → modal, delete, linked indicator, guard override flow) + 4 session (Map → array → Map roundtrip + back-compat + wrong-type rejection). | [separations.test.ts](../app/src/lib/separations/separations.test.ts) + [separations-view.test.tsx](../app/src/lib/views/separations/separations-view.test.tsx) + [session.test.ts](../app/src/lib/session/session.test.ts) |

#### This docs PR — Phase 2.2.i close audit + S32 handoff + SESSION_LOG entry

Audit doc at [`docs/audits/phase-2-2-i-close-audit.md`](audits/phase-2-2-i-close-audit.md) + this handoff + the S32 SESSION_LOG entry.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **one new acknowledgment this session** (Phase 2.2.i pick → D). Nothing else.

#### Restated questions for Alex (4 — unchanged from S31, since none were re-asked this session)

Items 1-4 carry. Item 5 (TX rules — 4 sub-questions) **still gates Phase 2.2.19 `views/temp-limits/`** if Alex picks that as 2.2.j.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level — G42 / H42 (9993 ÷ non-9993 labor), L23 / L32 (projected balance ÷ total budget), H43 (hand-keyed "Calculated, Questionable"). All three display as percentages but mean different things. Which is "the attrition rate" for CON / MYR reporting? **My current default:** G42 / H42 is canonical; L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it.

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key. Options: (a) Position Number alone, (b) `(Effective Dept, Position Number, Fill Status, Budget Job Code)`, (c) Position Number + a separate tracker for "who occupied it when". **My current default:** option (b).

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — adds modeling complexity but makes per-PP variance numbers meaningful. Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation before the TX typed entity can ship:

   **5a.** Is the TX `expired_date` set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis?

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18?

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct?

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17.

#### Reasonable-default calls deferred (12 — unchanged, nothing acknowledged this session)

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** 6 slicer-chip semantics reverse-engineered — confirm or correct?
6. **(Tab 23)** Where does `Vacant Date` come from?
7. **(Tab 23)** `Previous Employee2` vs `Previous Employee` — which is which?
8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — `IF(P="TEMPM", "", ...)` skips check.
9. **(Tab 24)** Cost-basis for blank `W` cells — **Default:** KosPos always computes expected cost.
10. **(Tab 24)** PlannedAction history retention — **Default:** 18 months with summary roll-up.
11. **(Tab 24)** DBI→CPC transfer-of-function propagation — **Default:** stays on originating dept until EOY.
12. **(Tab 24 + Tab 25)** Active-row blank-`W` "X of Y priced ⚠" diagnostic chip — placement OK?

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — what does it mean exactly?
14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions. Map to `is_pool_position = true`?
15. **(Tab 21)** Reporting Tree change-proposal cols — workflow today?
16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year) or Phase 7 (talent)?

#### Open action items (1 — same as S31)

17. **The 5 vacant-no-RTF positions.** Restated: 5 positions show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.** These auto-populate as Pending in the Hiring Plan workspace — click row → add holdReason note + actionMode + startPpe to claim each one explicitly.

#### Resolved this session (drops from carry-forward)

- **Phase 2.2.i pick (B / D / escape hatch) — ANSWERED + SHIPPED.** Alex picked D; PR #98 ships the Separations entity + view + cross-link end-to-end.

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.i close audit](audits/phase-2-2-i-close-audit.md):

A. **Auto-archive monitoring — improved.** PR #96 auto-archived cleanly at the S31→S32 transition (first datapoint after PR #95's one-off slip). **1 of 3 watch-PRs clean.** PR #98 + this docs PR will be measured at S33 open. If both auto-archive cleanly, item A drops back to "stays dropped." If either lingers, that's the second slip and the pattern is real.

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** ~2,870 lines after S32 entry (was 2,809 pre-entry). Past the 2,000-line trim trigger; bundleable with C + the Tab 24 Improvement #6 holdReason language drift + the OBI serial doc note.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** **12 instances unchanged** (no labor-report.md edits this session). Bundleable with B.

D. **Defer the `labor-report.md` split until Phase 2.4.** Still 8,518 lines. Defer holds.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 9th event-based trigger fired on schedule this session.

### Top 3 findings to surface for Alex this session

1. **The Separations tab is shippable.** Visit `/kospos/?dev=1` → click Separations (between Hiring Plan and Inactive). Type an employee name, hit Add → row appears with default Rumored / medium chips. Click the row → modal opens with all fields editable. Forward status transitions save normally; backward transitions (e.g., reverting a "cleared" back to "rumored") surface a Force override checkbox + required reason input. Override + reason flow into the history audit log on the status entry. The Position # picker autocompletes from the loaded P&P snapshot when one exists; works without P&P too.

2. **The vacancy-planning trio is complete.** Hiring Plan (planned hires + separations with cost projection) ⋈ Inactive (orphan FYTD spend on positions absent from the active P&P) ⋈ Separations (rumored / pending). The cross-link `🔗 Tracked in Separations` indicator surfaces on Hiring Plan Separation rows whose id is linked from a PendingSeparation — so once you wire a rumor to a planned action, both surfaces show the connection.

3. **Session JSON save/load now preserves Separations.** The schema stays at v1 (backward-compatible — pre-Phase-2.2.i session files still load; the field defaults to empty array when missing). New saves always include the field. Alex's existing session files keep working.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle (dept-tree + obi-pnp full + views/positions) | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` — per-PP drill-down + Position Detail "View payroll →" | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full — full 64-col importer + `lib/budget/` cube + Budget vs Actual on Position Detail | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` — PlannedAction entity + Hiring Plan workspace v1 (devOnly) + UI fix PR #78 | done 2026-05-26 |
| 2.2.f | `2.2.21` v2 PR 1: Bug 3 derived defaults + status-transition guard + Bug 2 payroll-diagnostic polish | done 2026-05-26 |
| 2.2.g | `2.2.21` v2 PR 2: PlannedActionDetail editor + full CostInput + delta-pay + status-workflow UI + Bug 2a asOf-serial importer fix | done 2026-05-26 |
| 2.2.h | `2.2.20` `views/inactive/` — Tab 13 INACTIVE live query replacing the workbook's 3-step manual flow | done 2026-05-27 |
| **2.2.i** | **`2.2.26` `lib/separations/` + `views/separations/`** — Tab 14 Separations PendingSeparation entity + status workflow + Hiring Plan cross-link indicator | **done 2026-05-27** |
| **2.2.j** | **Next sub-phase** — Alex's pick. Top candidates: **(a) `2.2.19` `views/temp-limits/`** (TX entity + Cat 17/18 expiry — gated on TX TODOs Restated Q #5); **(b) `2.2.18` `views/reporting-tree/`** (Tab 21 — feeds Phase 7 org chart); **(c) `2.2.25` `views/probation/`** (Tab 10 — typed status workflow, system of record going forward); **(d)** any other Tier-4 sub-phase from the dependency graph. | **NEXT** |
| 2.2.k-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the 39-col OBI shape + new ADR for the 64-col BFM eturn shape + **new ADR for the 3-view no-upstream-source pattern: `lib/staffing-plan/` + `lib/views/inactive/` + `lib/views/separations/`** + Position.cat1718 lift note + iso() serial-converter from PR #89 — 4 queued together, down from 5 by folding) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Separations tab is visible in dev mode** between Hiring Plan and Inactive.
- **Add separation flow** works without P&P (employee name only). With P&P loaded, position picker autocompletes.
- **Row click → detail editor.** Status guard: backward transition surfaces override + reason; Save gated until both filled. Override reason logs in history audit log on the status entry.
- **Cross-link works both ways.** In Hiring Plan, add a Separation-type PlannedAction. In Separations, open a row, pick that PlannedAction in the "Linked Hiring Plan action" picker, Save. Back to Hiring Plan → the matching row shows the `🔗 Tracked in Separations` chip.
- **Session JSON roundtrip preserves Separations.** Save session, reload, load session back → separations survive.
- **No regression on prior surfaces.** Positions / Payroll / Hiring Plan / Inactive / Calculator / Special Class all still render.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.j).** Top candidates below; see Recommendations.

### Recommendation for Phase 2.2.j

Three options worth surfacing now that the vacancy-planning trio is complete:

**Option A — `2.2.19` `lib/views/temp-limits/` + TemporaryExchange typed entity.** Tab 12 TEMP Limits — Cat 17/18 expiry alerts + 1040-hour gauge using the cube's `earningHours`. **Pros:** the `Position.cat1718` lift from PR #85 + the delta-pay infrastructure from PR #90 + the OBI cube's `earningHours` aggregator all feed naturally; visible payoff (red/yellow expiry banners + 1040-hour progress bars); the operational pain at DBI is real (Cat 17/18 expiration tracking is hand-managed today). **Cons:** the 4 TX TODOs in Restated Question #5 need Alex confirmation up front — those are stop-the-world questions that can't be defaulted past. Effort: medium-to-high.

**Option B — `2.2.18` `lib/views/reporting-tree/`.** Tab 21 Reporting Tree (org-chart preview + data-quality flags + change-proposal cols → KosPos Change Mode precursor). Feeds Phase 7 org chart. **Pros:** unblocks Phase 7; surfaces the reports-to chain integrity flags from Scenario 1; can deliver Reports-to-cycle / dangling-ref detection as part of the same surface. **Cons:** Change Mode design (lib/changes/ — still a stub) needs to land alongside or shortly after to make the change-proposal cols meaningful. Effort: medium-to-high.

**Option C — `2.2.25` `lib/views/probation/`.** Tab 10 Probation — typed entity with status workflow (Open → Approaching → Extended → Cleared / Failed / Resigned); end-date auto-computation; system of record going forward (no PS HCM source for DBI). **Pros:** clean entity + workflow surface; mirrors the patterns now used in 3 surfaces (Hiring Plan, Separations); typed system-of-record approach matches Separations directly. **Cons:** smaller user-visible payoff than A or B; standalone surface with no cross-link yet. Effort: low-to-medium.

**Escape hatch:** Alex picks any other Tier-4 sub-phase from the dependency graph in `labor-report.md § Phase 2.2 sub-phases`.

**My pick: Option A** — TX is the most asked-about operational surface at DBI, the upstream entity layer is already in place, and the 4 TX TODOs are real domain questions worth answering anyway (a TX modeling discussion is overdue regardless of which sub-phase it powers). **Option C remains a strong fast-shipping alternative** if Alex wants a no-gating-questions session.

## Next session prompt — Phase 2.2.j (Alex picks A, B, C, or another sub-phase)

Paste this verbatim to start Session 33:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.j),
then ships it. Phase 2.2.i shipped in 1 PR: #98 (lib/separations/ +
lib/views/separations/ — Tab 14 Separations PendingSeparation entity
with status workflow + confidence axis + Hiring Plan cross-link
indicator; SeparationsView + SeparationDetail modal + tab; session
JSON export/import wired backward-compatibly). The vacancy-planning
trio (Hiring Plan ⋈ Inactive ⋈ Separations) is now complete.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 32 entry — Phase 2.2.i)
  memory/MEMORY.md + the 10 memory files
  docs/audits/phase-2-2-i-close-audit.md (carry-forwards A-F)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.j close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.i close audit fired in
S32. This session, the audit cadence check is only the Phase 2.2.j
close audit when 2.2.j ships. Don't re-audit 2.2.i.

DO fire the 2.2.j audit before this session ends. Use the Phase 2.2.i
close audit format; mirror the prior audit's table of carry-forwards.

==============================================================================
STEP 0.5 — Auto-archive monitoring (carries from S32 Item A)
==============================================================================
At session open, check `git worktree list`. PR #96 auto-archived cleanly
at S31→S32 (1 of 3 watch-PRs). PR #98 + the S32 docs PR are the next 2
datapoints — if both worktrees are gone at S33 open, the streak resumes
(3 clean PRs in a row) and Item A drops back to "stays dropped." If
either lingers, that's the second slip — surface as a confirmed pattern
and investigate the Cowork watcher's merge-event lifecycle.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.j
==============================================================================
Use AskUserQuestion. Three options:

  A. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry surfaces + 1040-hour gauges. Position.cat1718
     lift (PR #85) + delta-pay infrastructure (PR #90) + earningHours
     from the OBI cube all feed naturally.
     GATING: the 4 TX TODOs in Restated Question #5 must be answered
     up front (5a expired_date set by CSC vs negotiated; 5b Cat 16
     TX-capable?; 5c TX = limited-duration appointment?; 5d renewal
     reconciliation Charter §10.104 vs CSC Rule 114).

  B. 2.2.18 lib/views/reporting-tree/ + Change Mode precursor
     — Tab 21 Reporting Tree. Feeds Phase 7 org chart. Surfaces
     reports-to chain integrity flags from Scenario 1 (cycle /
     dangling-ref / excessive-depth). Change-proposal cols → KosPos
     Change Mode precursor (lib/changes/ stub needs to land alongside
     or shortly after).

  C. 2.2.25 lib/views/probation/ + Probation typed entity
     — Tab 10 Probation. Typed status workflow (Open → Approaching
     → Extended → Cleared / Failed / Resigned). End-date auto-
     computation. KosPos as system of record going forward (no PS HCM
     source for DBI). Mirrors Separations entity + workflow patterns
     directly. Low gating, low cross-cutting risk.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.j (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If A — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5a-5d)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours,
      expiry alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If B — views/reporting-tree/:
  Branch: feat/views-reporting-tree
  Scope:
    - Add lib/views/reporting-tree/ — Tab 21 surface (org-chart
      preview + reports-to chain integrity flags)
    - Surface Scenario 1 flags: reports-to-cycle / reports-to-dangling-
      ref / reports-to-empty-non-commissioner / reports-to-excessive-
      depth via lib/quality/
    - Optionally: change-proposal cols precursor (requires lib/changes/
      to be lifted from stub — flag if this becomes the bigger lift)
    - Add the tab to App.tsx (devOnly initially)
    - Tests

If C — views/probation/:
  Branch: feat/views-probation
  Scope:
    - Add lib/probation/ typed entity (Probation + ProbationStatus
      + transition guard helper + end-date auto-computation)
    - Build lib/views/probation/ — typed editable list with status
      chips + due-date countdown + end-date inference
    - Surface probation-end-approaching + probation-extension-required
      flags from lib/quality/
    - Wire history audit log via the same pattern as PR #90 + PR #98
    - Add the tab to App.tsx (devOnly initially)
    - Tests

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 413 / 413).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - **Run `npm run build` before opening PR** — production build catches
    type errors that `npx tsc --noEmit` glosses over. S32 was the first
    session in 3 not to need a build catch — the habit is firm; keep
    running it.

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (4 ADRs queued: ADR-007 amendment
    for the 39-col OBI shape + iso() serial-converter note + BFM
    eturn ADR + Position.cat1718 lift note + ONE consolidated ADR
    for the 3-view no-upstream-source pattern shared by
    lib/staffing-plan/ + lib/views/inactive/ + lib/views/separations/).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Inactive / Separations /
    Temp Limits / Reporting Tree / Probation to non-dev yet — wait
    until cross-tab nav has been used end-to-end on real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.j status + next-session prompt for Phase 2.2.k.
  - Re-ask the 4 restated questions + 12 reasonable-default calls
    (#5-16) + 1 open action item (#17). DROP items Alex acknowledges
    this session.
  - Carry-forward update on items A-F (A monitor: if both S32 PRs
    auto-archived, item drops; if either lingered, confirmed pattern).
  - Fire the Phase 2.2.j close audit (mirrors Phase 2.2.i audit format).

Recommended model: claude-opus-4-7 for Option A (entity layer + UI
+ TX domain reasoning) or Option B (entity layer + UI + cross-cutting
quality-flag wiring). claude-sonnet-4-6 OK for Option C (smallest
scope, well-trodden pattern). Effort: medium-to-high for A; medium for
B; low-to-medium for C.
````

### Recommended model (Phase 2.2.j)

`claude-opus-4-7` for either A (TX domain reasoning) or B (entity + UI + cross-cutting quality wiring). `claude-sonnet-4-6` is fine for C (smallest scope, well-trodden pattern). Effort medium-to-high for A, medium for B, low-to-medium for C.

### S32 follow-ups (new)

- **`SeparationConfidence` enum naming overlap.** The new `lib/separations/` module avoids importing `SeparationConfidence` from `lib/staffing-plan/`; new names are `SeparationStatus` (4 values incl. `cleared`) + `ConfidenceLevel` (low/medium/high). A future cleanup PR could unify the two (rename PlannedAction's `separationConfidence` to `separationProgress` and reuse `SeparationStatus`). Not urgent; flag for the next time someone touches staffing-plan types.
- **3-view no-upstream-source ADR consolidation.** Phase 2.4 ADR queue now has the staffing-plan + inactive + separations triplet to document as ONE ADR (was queued as 2 separate). Updated count: 4 ADRs queued (down from 5).
- **"View tracked separation" affordance on Hiring Plan chip.** Currently the `🔗 Tracked in Separations` chip is read-only. Click-through-to-Separations-tab would be a 1-hour add; defer until Alex asks.

---

## Current status (end of Session 31 — Phase 2.2.h: lib/views/inactive/ — Tab 13 INACTIVE live query, 2026-05-27)

**Phase:** Phase 2.2.h — **`lib/views/inactive/` + InactiveView tab** ([PR #96](https://github.com/alkprojects/kospos/pull/96) — pure live query replacing the workbook's manual Tab 13 INACTIVE flow: positions paid in OBI but absent from the active P&P roster, with 5-bucket breakdown + inferred reason chip). Phase 2.2.h close audit fired on schedule (8th event-based trigger).
**Last main commit:** `7fef159` ([PR #96](https://github.com/alkprojects/kospos/pull/96) — Inactive view) → `bb38f9d` ([PR #95](https://github.com/alkprojects/kospos/pull/95) — data-sensitivity correction) → `90fb86f` ([PR #94](https://github.com/alkprojects/kospos/pull/94) — S30 tail docs) → `187861a` ([PR #93](https://github.com/alkprojects/kospos/pull/93) — global search) → `7392713` ([PR #92](https://github.com/alkprojects/kospos/pull/92) — session export/import)
**Tests:** 374 / 374 passing (+20 from start of Phase 2.2.h: 11 build cases + 7 view-level + 2 implicit `useAppStore` integration).
**Branches in flight:** none post-merge.
**Worktree hygiene:** **streak broken at PR #95** — found 1 stale worktree at S31 open (`docs/data-is-public-records` from PR #95, merged ~3h before S31 opened, outside an active session — likely auto-archive watcher missed the merge event). Swept manually. PR #96 auto-archive is the first new datapoint; **monitor across next 3-4 PRs**.

### What landed this session — one PR (plus docs PR)

#### [PR #96](https://github.com/alkprojects/kospos/pull/96) — Phase 2.2.h: lib/views/inactive/ Tab 13 INACTIVE replacement

The workbook's Tab 13 carries a three-step manual flow: `PivotTable5` on BI Payroll (Sum of Balance Amount per Position Identifier) → `XLOOKUP` against P&P Data to flag absent positions → hand-paste flagged rows into Report Data's 7-slot `INACTIVATED` block. The 7-slot cap silently under-counts any month with >7 inactives; the disposition flag `Add` / `Done` / blank requires Alex to remember the paste across PP refreshes.

[PR #96](https://github.com/alkprojects/kospos/pull/96) replaces all of that with a single live query.

6 files / +958 / −1. Highlights:

| What | Where |
|---|---|
| **`buildInactiveSummary(positions, snapshot)`** — pure query: positions present in latest OBI but absent from active P&P. Joined on `normalizePositionKey` so zero-padded OBI ids match unpadded P&P ids. Last-known incumbent = personFullName on the row with MAX `earningPeriodEnd` (falls back across blank-name rows for orphan-RPO-only spend). Returns `InactivePositionSummary[]` sorted by total FYTD spend descending. | new [build.ts](../app/src/lib/views/inactive/build.ts) |
| **`InactiveReasonHint`** — derived enum: `retirement-payout` (RPO > 0) / `temp-lumpsum-payoff` (tempLsp > 0 and no RPO) / `wages-only` (otherwise). Informational hint surfaced as a clickable chip — PS HCM has the authoritative separation reason. | `build.ts` |
| **`InactiveView`** — summary header (count + 5-bucket totals tracking the filtered set), search input (uses shared `matchesNeedle` from PR #93), reason-chip radiogroup filter with per-reason counts, 12-col table. 4 empty-state branches: no data / no OBI / no P&P / no inactives. | new [InactiveView.tsx](../app/src/lib/views/inactive/InactiveView.tsx) |
| **New `Inactive` tab** between Hiring Plan and Load Reports in App.tsx, `devOnly: true` per "no promotion to non-dev until cross-tab nav has been used end-to-end on real data". | [App.tsx](../app/src/App.tsx) |
| **20 new tests** — 11 build (null snapshot; empty inactives; OBI ⊄ P&P; zero-padded normalize; skips empty position ids; 5-bucket aggregation; 3 reasonHint paths; last-incumbent MAX-PPE picking; blank-name fallback; descending sort) + 7 view (3 empty-state branches; "all active" message; row render; chip filter; search filter; count tracking) + 2 implicit useAppStore paths. | [inactive.test.ts](../app/src/lib/views/inactive/inactive.test.ts) + [inactive-view.test.tsx](../app/src/lib/views/inactive/inactive-view.test.tsx) |

#### [PR (this docs PR)](https://github.com/alkprojects/kospos/pulls) — Phase 2.2.h close audit + S31 handoff

Audit doc at [`docs/audits/phase-2-2-h-close-audit.md`](audits/phase-2-2-h-close-audit.md) + this handoff + the S31 SESSION_LOG entry.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **one new acknowledgment this session** (Phase 2.2.h pick → C). Nothing else.

#### Restated questions for Alex (4 — unchanged from S30, since none were re-asked this session)

Items 1-4 carry. Item 5 (TX rules — 4 sub-questions) **still gates Phase 2.2.19 `views/temp-limits/`** if Alex picks that as 2.2.i or later.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation before the TX typed entity can ship:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — unchanged, nothing acknowledged this session)

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?**

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip (already shipped in PR #80; **chip + diagnostic placement matches your expectation?**)

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else?

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)?

#### Open action items (1 — same as S30)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.** These 5 positions auto-populate as Pending in the Hiring Plan workspace; you can click Hide to send to "Manual user changes," or click the row to open the detail editor → add a `holdReason` note + actionMode + startPpe target to claim each one explicitly.

#### Resolved this session (drops from carry-forward)

- **Phase 2.2.h pick (B / C / escape hatch) — ANSWERED + SHIPPED.** Alex picked C; PR #96 ships the Inactive view end-to-end.

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.h close audit](audits/phase-2-2-h-close-audit.md):

A. **Stale post-merge worktree found at S31 start.** **Drifted** — one slip after a 15-PR clean streak. PR #95 `docs/data-is-public-records` worktree wasn't auto-archived (merged ~3 hours after Alex closed S30; auto-archive watcher likely event-bound to the active session). Swept manually at session open. **Streak resets at PR #96; monitor next 3-4 PRs.**

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** Current: **2,809 lines** (was 2,630 pre-S30 entry; +179 from S30 + S30-tail). Past the 2,000-line trim trigger; bundleable with C + the Tab 24 Improvement #6 holdReason language drift + the OBI serial doc note from item #19.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** **Recount: 12 instances** (Phase 2.2.g audit text said "17"; recount via canonical pattern shows 12). Baseline reset to 12 going forward. Bundleable with B.

D. **Defer the `labor-report.md` split until Phase 2.4.** Still 8,518 lines. Defer holds.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 8th event-based trigger fired on schedule this session.

**New low-priority housekeeping note:** 36 stale local-only `docs/*` branches on the local clone (from S11-S26 era PRs). They don't occupy worktrees but clutter `git branch` listings. 5-minute cleanup whenever Alex wants — out of scope for the Phase 2.2.h carry-forward.

### Top 3 findings to surface for Alex this session

1. **The Inactive tab is shippable.** Visit `/kospos/?dev=1` → Load Reports, load a P&P + an OBI snapshot → open Inactive. Every position with FYTD spend in BI Payroll but no row in the active roster shows up, sorted by FYTD descending. The reason chip is a hint inferred from which buckets are non-zero (Retirement payout / Temp lump-sum / Wages only) — PS HCM has the real reason, but the chip is enough to triage which orphan-spend rows are likely retirees vs temp closeouts vs recent separations. Filter chips + search input narrow the table; the summary header rolls up totals across the filtered set.

2. **Tab 13 INACTIVE's 7-slot cap is gone.** The workbook silently under-counted any month with >7 inactive positions. KosPos has no cap. If Alex's department ever has 8+ inactive positions in a PP, the workbook would have lost the count silently; KosPos will surface all of them.

3. **Worktree auto-archive missed one merge.** PR #95 (docs-only data-sensitivity correction) merged ~3 hours after Alex closed S30. The Cowork auto-archive watcher likely missed the event because the session had already closed. Found + swept manually at S31 open. **Not a Cowork bug per se** — more an edge case in the watcher's "watching during merge" lifecycle. Monitoring next 3-4 PRs to confirm one-off vs pattern.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle (dept-tree + obi-pnp full + views/positions) | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` — per-PP drill-down + Position Detail "View payroll →" | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full — full 64-col importer + `lib/budget/` cube + Budget vs Actual on Position Detail | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` — PlannedAction entity + Hiring Plan workspace v1 (devOnly) + UI fix PR #78 | done 2026-05-26 |
| 2.2.f | `2.2.21` v2 PR 1: Bug 3 derived defaults + status-transition guard + Bug 2 payroll-diagnostic polish | done 2026-05-26 |
| 2.2.g | `2.2.21` v2 PR 2: PlannedActionDetail editor + full CostInput + delta-pay + status-workflow UI + Bug 2a asOf-serial importer fix | done 2026-05-26 |
| **2.2.h** | **`2.2.20` `views/inactive/`** — Tab 13 INACTIVE live query replacing the workbook's 3-step manual flow | **done 2026-05-27** |
| **2.2.i** | **Next sub-phase** — Alex's pick. Top candidates: **(a) `2.2.19` `views/temp-limits/`** (TX entity layer + Cat 17/18 expiry surfaces — gated on TX TODOs Restated Q #5); **(b)** any other Tier-4 sub-phase from the dependency graph. | **NEXT** |
| 2.2.j-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the 39-col OBI shape + new ADR for the 64-col BFM eturn shape + new ADR for the `lib/staffing-plan/` no-upstream-source pattern + Position.cat1718 lift note + iso() serial-converter from PR #89 — five queued together) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Inactive tab is visible in dev mode.** Visit with `?dev=1` → the Inactive tab appears between Hiring Plan and Load Reports. Load a P&P + an OBI snapshot → tab renders positions paid in OBI but absent from P&P, with reason chips + 5-bucket breakdown.
- **No regression on prior surfaces.** Positions / Payroll / Hiring Plan / Calculator / Special Class all still render. Cross-tab nav (PositionsView → Position Detail → "View payroll →") still works.
- **Worktree hygiene reset.** PR #96 is the new baseline for auto-archive tracking. Any stale worktree across the next 3-4 PRs is a confirmation of a pattern; one is a one-off.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.i).** Two recommended options below; see Recommendations.

### Recommendation for Phase 2.2.i

Two options worth surfacing (Option C from S31 — Inactive — is now done):

**Option B (carries from S31) — `2.2.19` `lib/views/temp-limits/` + TemporaryExchange typed entity.** Tab 12 TEMP Limits — Cat 17/18 expiry alerts + 1040-hour gauge using the cube's `earningHours`. **Pros:** the `Position.cat1718` lift from PR #85 + the delta-pay infrastructure from PR #90 + the OBI cube's `earningHours` aggregator all feed naturally into this surface; visible payoff (red/yellow expiry banners + 1040-hour progress bars); the second-most-asked TEMP surface after the now-shipped Hiring Plan + Inactive workspaces. **Cons:** the 4 TX TODOs in Restated Question #5 need Alex confirmation up front — those are stop-the-world questions that can't be defaulted past. Effort: medium-to-high.

**Option D (new for S32) — `2.2.18` `lib/views/separations/` + PendingSeparation typed entity.** Tab 14 Separations — rumored / pending separations. Today this is a hand-maintained list with no employee ID join to PS HCM + no status workflow + no cross-link to Tab 24 Staffing Plan's Separations section. KosPos would type it (`status: 'rumored' | 'confirmed' | 'paperwork-filed' | 'cleared'` + `confidence: 'low' | 'medium' | 'high'` + `acting_plan_position_id?` cross-link). **Pros:** no upstream importer (matches Inactive's pattern); cross-links naturally with Hiring Plan; the status workflow guard + history audit log from PR #85 / PR #90 transplant cleanly. **Cons:** the cross-link to Tab 24 § Separations needs a join-key story (positionId? employeeId?); requires user-input UI (it's a person-typing surface, not a data-derived one). Effort: medium.

**Escape hatch:** Alex picks any other Tier-4 sub-phase from the dependency graph in `labor-report.md § Phase 2.2 sub-phases`.

**My pick: Option D** — Separations naturally chains off the now-complete Hiring Plan + Inactive surfaces (the three together cover the full vacancy-planning loop: rumored → planned → orphan-spend). The cross-link join-key story is interesting but not blocking — sensible default is `positionId` with a "no link yet" affordance. **Option B remains viable** if Alex is ready to answer the 4 TX TODOs upfront and wants the more user-visible payoff (expiry banners + 1040-hr gauges).

## Next session prompt — Phase 2.2.i (Alex picks B, D, or another sub-phase)

Paste this verbatim to start Session 32:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.i),
then ships it. Phase 2.2.h shipped in 1 PR: #96 (lib/views/inactive/ —
Tab 13 INACTIVE live query replacing the workbook's 3-step manual flow:
positions paid in BI Payroll but absent from active P&P roster, with
5-bucket breakdown + inferred reason chip). The Inactive surface
naturally chains off the Hiring Plan: together they cover "planned
hires" + "orphan FYTD spend" — separations is the missing third leg.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 31 entry — Phase 2.2.h)
  memory/MEMORY.md + the 10 memory files
  docs/audits/phase-2-2-h-close-audit.md (carry-forwards A-F)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.i close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.h close audit fired in
S31. This session, the audit cadence check is only the Phase 2.2.i
close audit when 2.2.i ships. Don't re-audit 2.2.h.

DO fire the 2.2.i audit before this session ends. Use the Phase 2.2.h
close audit format; mirror the prior audit's table of carry-forwards.

==============================================================================
STEP 0.5 — Auto-archive monitoring (carries from S31 Item A)
==============================================================================
At session open, check `git worktree list`. If any worktree other than
the current session's + the main worktree shows up — that's a 2nd slip
after PR #95's missed auto-archive in S30→S31. Surface it in the audit
as a confirmed pattern rather than a one-off; investigate the Cowork
watcher's merge-event lifecycle.

If clean, note in the audit: "auto-archive working again after PR #95's
one-off slip."

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.i
==============================================================================
Use AskUserQuestion. Two options:

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry surfaces + 1040-hour gauges. The
     Position.cat1718 lift (PR #85) + delta-pay infrastructure (PR #90)
     + the OBI cube's earningHours aggregator all feed naturally into
     this surface.
     GATING: the 4 TX TODOs in Restated Question #5 must be answered
     up front (5a expired_date set by CSC vs negotiated; 5b Cat 16
     TX-capable?; 5c TX = limited-duration appointment?; 5d renewal
     reconciliation Charter §10.104 vs CSC Rule 114).

  D. 2.2.18 lib/views/separations/ + PendingSeparation typed entity
     — Tab 14 Separations. Naturally chains off Hiring Plan + Inactive.
     No upstream importer. Status workflow (rumored / confirmed /
     paperwork-filed / cleared) + confidence + optional cross-link to
     Tab 24 § Separations rows. Borrows the status-transition guard +
     history audit log patterns from PR #85/#90.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.i (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5a-5d)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours,
      expiry alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If D — views/separations:
  Branch: feat/views-separations
  Scope:
    - Add lib/separations/ typed entity (PendingSeparation +
      SeparationStatus enum + transition guard helper)
    - Build lib/views/separations/ — typed editable list with status
      chips, confidence picker, optional positionId cross-link
    - Wire history audit log via the same pattern as PR #90
    - Surface "linked-to-Hiring-Plan-Separation-row" indicator on
      Hiring Plan when the cross-link exists
    - Add the tab to App.tsx (devOnly initially)
    - Tests

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 374 / 374).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - **Run `npm run build` before opening PR** — production build catches
    type errors that `npx tsc --noEmit` glosses over. PR #96 had a
    catch this session (third session in a row to need this).

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (5 ADRs queued: ADR-007 amendment
    for the 39-col OBI shape + iso() serial-converter note + BFM
    eturn ADR + staffing-plan no-upstream-source ADR + Position.cat1718
    lift note; the inactive-view no-upstream-source pattern can fold
    into the staffing-plan ADR).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Temp Limits / Inactive /
    Separations to non-dev yet — wait until cross-tab nav has been used
    end-to-end on real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.i status + next-session prompt for Phase 2.2.j.
  - Re-ask the 4 restated questions + 12 reasonable-default calls
    (#5-16) + 1 open action item (#17). DROP items Alex acknowledges
    this session.
  - Carry-forward update on items A-F (A monitor next 3-4 PRs; F
    working as designed).
  - Fire the Phase 2.2.i close audit (mirrors Phase 2.2.h audit format).

Recommended model: claude-opus-4-7 for Option B (entity layer + UI +
TX domain reasoning) OR Option D (entity layer + UI + cross-link
domain design). Effort: medium-to-high for B; medium for D.
````

### Recommended model (Phase 2.2.i)

`claude-opus-4-7` for either B (TX domain reasoning) or D (PendingSeparation entity + cross-link design). Effort medium-to-high for B, medium for D.

### Surfaced UX/UI proposals carrying forward from S27

Same B-tier list — not yet shipped:

- **Phase lens switcher on Budget vs Actual card.** Phase-chip buttons next to "Board layer" to switch lens to Mayor / Committee / TechAdj.
- **Mobile responsive layout** on Position Detail's Budget vs Actual 3-stat row.
- **Snapshot date strip on Load Reports.** BFM / OBI / P&P asOf dates at a glance.
- **Positions list "as of" footer.** Per-source asOf badge under the stats summary.

C-tier (future features, not polish) also carry forward:

- **Sortable column headers on Positions list.**
- **Bulk-select positions for aggregate Budget vs Actual.**
- **`?labor=<positionId>` URL persistence for scope.**

### S30-tail follow-ups (still deferred)

- **Field-qualified search syntax.** PR #93 shipped the simple-needle scope. Live with it for a session or two; if Alex wants `name:Smith jobCode:6278 step:>5` power-user mode, queue a follow-up PR. Decision: ship after Alex has lived with the simple needle on real data.
- **Multi-user shared state (Vercel / Cloudflare pivot).** Real blockers per [data_sensitivity memory](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/data_sensitivity.md): auth + schema migration + conflict resolution + hosting cost. Revisit whenever Alex wants — no policy review needed.
- **IndexedDB persistence (Phase 2.2.33 `snapshots/`).** Pre-existing carry-forward. PR #92 (session JSON file) is the interim answer.

### S31 follow-ups (new)

- **Auto-archive watcher merge-outside-session lifecycle (carries from Item A).** Monitor next 3-4 PRs. If a 2nd slip happens within the next 3 PRs, file it as a confirmed pattern + investigate. If clean, item A drops again.
- **36 stale local-only `docs/*` branches** on the local clone. 5-minute cleanup whenever Alex wants. Out of scope for any code session.

---

## Current status (end of Session 30 — Phase 2.2.g + S30-tail QoL: session export/import + global search, 2026-05-26)

**Phase:** Phase 2.2.g — **PlannedActionDetail editor (Option A — staffing-plan v2 PR 2)** ([PR #90](https://github.com/alkprojects/kospos/pull/90) — full CostInput sub-editor + row-click drill-down + status workflow UI + delta-pay view) preceded by a small standalone bug-fix PR ([PR #89](https://github.com/alkprojects/kospos/pull/89) — Bug 2a: coerce OBI Earning Period End Excel-serial cells to ISO `YYYY-MM-DD`). Phase 2.2.g close audit fired on schedule (7th event-based trigger). **Plus two QoL PRs at session tail** addressing Alex's late feedback ("testing is tedious" + "search by any combination of fields"): [PR #92](https://github.com/alkprojects/kospos/pull/92) — save / load session as JSON; [PR #93](https://github.com/alkprojects/kospos/pull/93) — global needle search on Positions / Payroll / Hiring Plan.
**Last main commit:** `187861a` ([PR #93](https://github.com/alkprojects/kospos/pull/93) — global search) → `7392713` ([PR #92](https://github.com/alkprojects/kospos/pull/92) — session export/import) → `88efab8` ([PR #91](https://github.com/alkprojects/kospos/pull/91) — Phase 2.2.g close audit) → `016c9c3` ([PR #90](https://github.com/alkprojects/kospos/pull/90) — PlannedActionDetail editor) → `9aca9fb` ([PR #89](https://github.com/alkprojects/kospos/pull/89) — Bug 2a asOf-serial fix)
**Tests:** 354 / 354 passing (+51 from start of Phase 2.2.g: +5 from PR #89; +20 from PR #90; +10 from PR #92 session round-trip + parse-error branches; +16 from PR #93 needle helper + view-level search filtering).
**Branches in flight:** none post-merge.
**Worktree hygiene:** auto-archive working across **15 consecutive PRs** (#71, #73, #74, #75, #76, #78, #79, #80, #82, #84, #85, #89, #90, #92, #93). Carry-forward Item A stays dropped. Any stale worktree in S31+ is a regression.

### S30-tail QoL additions (PRs #92 + #93)

After the Phase 2.2.g close audit + handoff merged, Alex flagged two pain points that needed addressing before S31:

#### [PR #92](https://github.com/alkprojects/kospos/pull/92) — Save / load session as JSON

Alex: *"testing is becoming tedious. I have to import files each time."* Until Phase 2.2.33 ships IndexedDB persistence, every browser reload loses all in-memory state. This PR adds Save/Load session buttons above the FilePicker on the Load Reports tab. Save → downloads `kospos-session-YYYY-MM-DDTHHMM.json` with all loaded rows + staffing-plan actions + position notes + hidden-derived set. Load → uploads a previously-saved JSON + fans the payload back to the three Zustand stores via `restoreFromSession` helpers. 6 files / +679 / −0. 10 new tests covering round-trip + parse-error branches (invalid JSON / wrong kind / future schemaVersion / missing payload fields) + filename formatting.

**Considered: Vercel pivot for true multi-user shared state.** Alex asked whether we should move off GitHub Pages to enable shared uploads. **Not pivoting this session** — but the previous framing here (which cited "PII / personnel-data policy review" as the top blocker) was **wrong** per Alex's S30-tail clarification. See [memory `data_sensitivity.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/data_sensitivity.md): **all KosPos data is SF public-employee public records** (Sunshine Ordinance + state law); no SSNs / dependents / health info in the reports. The CLAUDE.md non-negotiable #5 ("real labor reports never committed") is about binary-blob churn in git + the workbook being Alex's active working file, NOT confidentiality. The actual remaining blockers for a hosting pivot are smaller: **auth + schema migration + conflict resolution + cost** — engineering trade-offs, not policy. Session files (PR #92) are still the simplest interim answer; a hosting pivot is a viable S31+ conversation whenever Alex wants it.

#### [PR #93](https://github.com/alkprojects/kospos/pull/93) — Global needle search on Positions / Payroll / Hiring Plan tabs

Alex: *"on the position, payroll, and hiring plan tabs there should be a search function that allows searching and filtering by any combination of all fields."* Per the S30 AskUserQuestion pick (simple needle now, field-qualified syntax later), this PR ships the simple-needle scope: case-insensitive substring match against every string/numeric leaf on the row, walks nested objects + arrays, handles `Date` ISO matching + cycle safety. Multi-term needle ANDs across terms but ORs across fields (so `smith 6278` finds rows where one field has "smith" + another has "6278"). 6 files / +346 / −14. 16 new tests covering helper rules + view-level integration (StaffingPlanView search by job description / position # / incumbent name; `N of M match` stat; Clear button).

**Field-qualified search syntax (`name:Smith jobCode:6278 step:>5`) is queued as a follow-up** after Alex lives with the global needle on real data. Decision deferred — Alex's S30 pick was explicitly "ship simple now, decide on syntax later."

### What landed this session — two PRs (plus docs PR)

#### [PR #89](https://github.com/alkprojects/kospos/pull/89) — Bug 2a: coerce OBI Earning Period End serial dates to ISO

Alex's S29-tail live-site review showed the Payroll summary header displayed `Snapshot asOf 46150 · FY 2026` — the raw Excel date serial for 2026-05-08. Root cause: `obi-payroll.ts`'s `str()` helper converted numeric date cells via `String(v)`, which yields the serial unchanged. The serial flowed into:

1. `_asOfDate` (the Payroll summary header binds directly to it).
2. `applyFilters`'s PP-range filter in `lib/views/labor/aggregate.ts` — lexicographic comparison of `earningPeriodEnd` against ISO `YYYY-MM-DD` user input. Because `'4' > '2'`, a serial-shaped value like `"46150"` is `>` every ISO date in 2026, so the range filter silently dropped every row.

3 files / +139 / −1. New `iso()` converter in [`obi-payroll.ts`](../app/src/lib/importers/obi-payroll.ts) applied to the `iPeriodEnd` reads. Handles numeric serials (Excel epoch 1899-12-30 → JS 1970-01-01 offset 25569, accounts for the spurious 1900 leap day), JS `Date` objects (defensive), already-ISO strings (passthrough), and empty cells. **Targeted to obi-payroll only** — passing `cellDates: true` globally at the FilePicker `read()` level would also affect `ps-hcm-pp` / `bfm-position` date columns whose `str()` wrappers would yield JS `Date.toString()` strings ("Thu May 08 2026 17:00:00 GMT-0700") instead of ISO. 5 new test cases including a downstream regression test in `labor.test.ts` documenting the PP-range filter's ISO invariant.

#### [PR #90](https://github.com/alkprojects/kospos/pull/90) — Phase 2.2.g Option A: PlannedActionDetail editor (staffing-plan v2 PR 2)

The biggest gap on the Hiring Plan workspace at the close of S29: the only row-level affordance was Delete. Clicking a row did nothing; pricing an action required no UI path at all. The "X of Y priced ⚠" diagnostic chip was informational but not actionable.

9 files / +1525 / −5. Resolves 1 S30 AskUserQuestion gating item at the start:

- **CostInput-scope question:** Alex picked **Full with deltaPay support**. All 8 CostInput fields editable + delta-pay view modeling incumbent vs planned-action cost side-by-side.

| What | Where |
|---|---|
| **`PlannedActionDetail` modal** — opens on row click; covers manual edit + derived-to-manual conversion in one component; fixed-overlay pattern (no Portal / no headless-ui dep), Esc + backdrop click to close, `role="dialog"` + `aria-modal="true"` + `aria-label`. Save / Cancel / Delete footer; Delete hidden in derive-convert mode. Per-row Hide / Delete buttons `stopPropagation`. | new [PlannedActionDetail.tsx](../app/src/lib/views/staffing-plan/PlannedActionDetail.tsx) |
| **Full `CostInputEditor` sub-component** — all 8 `CostInput` fields editable: code datalist + setid button group + retCode buttons + ppStartDate / fiscalYear selects + step / range pickers + range-pos toggle + `cumulativeCalendarYearSalary` input. Mirrors `CalculatorView`'s affordances. Controlled — parent owns partial state. | new [CostInputEditor.tsx](../app/src/lib/views/staffing-plan/CostInputEditor.tsx) |
| **`defaultBasisForPosition` + `isCostInputComplete` pre-fill helpers** — pure functions seeding the editor from appointment data + type-narrowing predicate gating `calcEmployeeCost` calls. | new [cost-prefill.ts](../app/src/lib/staffing-plan/cost-prefill.ts) |
| **`incumbentCostInput` + `deltaCost` + `DeltaCost` typed entity** — synthesizes the incumbent's CostInput; computes incumbent + planned + signed delta. Renders three stats: Incumbent (positive) + Planned action (signed per type — separations negative) + Δ Annual (positive red = adds cost, negative green = savings). | [build.ts](../app/src/lib/staffing-plan/build.ts) + [types.ts](../app/src/lib/staffing-plan/types.ts) |
| **Status workflow UI with force-override** — consumes the `isAllowedStatusTransition` guard from PR #85. Rejected transitions surface a "Force override (skip {from} → {to} guard — logged)" checkbox; Save gated until override is checked. Override flows through `updateAction`, which logs the field change in the history audit log automatically. | `PlannedActionDetail.tsx` |
| **All fields editable** — `startPpe` date input, `holdReason` (Pending/Unfunded only), `separationConfidence` (Separation only), `actionMode` select, multi-line notes textarea, collapsible history audit log preview. | `PlannedActionDetail.tsx` |
| **Convert-from-derived flow** — clicking a derived (virtual) row opens the editor with "Converting from auto" tag + "Save (convert to manual)" button. On save, derive-spec is materialized as a manual action via `addAction`; existing per-position manual-wins rule then suppresses the auto row. | `PlannedActionDetail.tsx` + `StaffingPlanView.tsx` |
| **Row-click drill-down** — every section row clickable; `selectedActionId` state in `StaffingPlanView`. | [StaffingPlanView.tsx](../app/src/lib/views/staffing-plan/StaffingPlanView.tsx) |
| **20 new tests** — 4 `defaultBasisForPosition` + 3 `isCostInputComplete` + 4 `incumbentCostInput` + 3 `deltaCost` (incl. negative for separations + null operands) + 6 view-level modal cases (row-click opens, derived → convert mode, Cancel preserves store, Hide/Delete stopPropagation, status guard override checkbox, convert-save materializes manual). | [staffing-plan.test.ts](../app/src/lib/staffing-plan/staffing-plan.test.ts) + [staffing-plan-view.test.tsx](../app/src/lib/views/staffing-plan/staffing-plan-view.test.tsx) |

#### [PR (this docs PR)](https://github.com/alkprojects/kospos/pulls) — Phase 2.2.g close audit + S30 handoff

Audit doc at [`docs/audits/phase-2-2-g-close-audit.md`](audits/phase-2-2-g-close-audit.md) + this handoff + the S30 SESSION_LOG entry.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **two new acknowledgments this session** (Phase 2.2.g pick → A; CostInput-scope → Full with deltaPay). Bug 2 (both 2a + 2b) drops fully from carry-forward.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (4 — unchanged from S29, since none were re-asked this session)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 (TX rules — 4 sub-questions) still gates Phase 2.2.19 `views/temp-limits/`** — if Alex picks that as 2.2.h or later, the 4 TODOs need answers up front.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation before the TX typed entity can ship:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

Same as Session 29; nothing acknowledged this session beyond the staffing-plan v2 close. Verbatim copies retained.

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?**

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip (already shipped in PR #80; **chip + diagnostic placement matches your expectation?**)

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else?

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)?

#### Open action items (1 — same as S29)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.** **NEW context (S29):** these 5 positions now auto-populate as Pending in the Hiring Plan workspace (Bug 3 design). You can click Hide on each to send to "Manual user changes," or **(NEW S30)** click the row to open the detail editor → add a holdReason note (free text) + actionMode + startPpe target to claim each one explicitly.

#### Resolved this session (drops from carry-forward)

- **Bug 2a (asOf serial display) — SHIPPED.** PR #89 ships the `iso()` converter in `obi-payroll.ts` + the PP-range filter regression test. Spot-check awaits Alex's new CPC+DBI export.
- **Bug 2b (1106950 not in OBI) — RESOLVED user-side in S29.** No further action.
- **CostInput-scope gating question (Minimal vs Full with deltaPay) — ANSWERED + SHIPPED.** Alex S30: Full with deltaPay support. Shipped in PR #90.
- **Phase 2.2.f Option C PR 2 (PlannedActionDetail editor) — SHIPPED.** PR #90 closes the staffing-plan v2 work.

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.g close audit](audits/phase-2-2-g-close-audit.md):

A. ~~Stale post-merge worktrees.~~ **Stays dropped.** **13 consecutive PRs** auto-archived (#71, #73, #74, #75, #76, #78, #79, #80, #82, #84, #85, #89, #90). Any stale worktree in S31+ is a regression.

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** Pre-S30 entry: **2,630 lines**. After S30 entry: TBD; will resume drift tracking next audit. Past the 2,000-line trim trigger; bundleable with items C + the Tab 24 Improvement #6 holdReason language drift + new minor drift item #19 (OBI data-source doc lacks the Excel-serial note).

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** Count unchanged at **17 instances** (no labor-report.md changes this session). Single-purpose cleanup PR; ~30 min. Bundleable with B.

D. **Defer the `labor-report.md` split until Phase 2.4.** File still 8,518 lines.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 7th event-based trigger fired on schedule this session. S31 prompt template (below) preserves the Step-0 trigger pattern.

**New for S31 carry-forward:** OBI BI Payroll data-source doc doesn't mention the Excel-serial date-cell behavior. Could fold into the Phase 2.4 ADR-007 amendment alongside the column-shape note. Low priority.

### Top 3 findings to surface for Alex this session

1. **The Hiring Plan workspace is now end-to-end interactive.** Visit `/kospos/?dev=1` → Load Reports, load a P&P → open Hiring Plan. Click any row (manual or auto) → a detail editor modal opens. Fill the 8 CostInput fields (job code datalist + setid + retCode buttons + ppStartDate / fiscalYear selects + step or range picker + range-position toggle + optional cumulative CY salary) → the action gets priced via the live COLA-aware projection + a delta-pay view shows incumbent vs planned-action cost side-by-side. Change the status to a backward state (e.g., posted → not-started) → the "Force override (logged)" checkbox appears; Save is gated until you check it. The history audit log preview at the bottom of the modal shows every saved field change.

2. **Bug 2a (asOf-serial display) is shipped.** Visit the Payroll tab on the live site after the deploy completes. The summary header should now read `Snapshot asOf 2026-05-08 · FY 2026` (or whatever the real MAX is in your latest OBI export) instead of `Snapshot asOf 46150`. The PP-range filter join-key damage is also fixed — a regression test in `labor.test.ts` documents the ISO invariant downstream consumers rely on.

3. **`Position.cat1718` lift from PR #85 is now exercised by the delta-pay view.** `incumbentCostInput` + `deltaCost` build their incumbent half from appointment data; vacant Cat 17/18 positions still derive as TEMP (via the lift), but their incumbent half is correctly null (no incumbent to project). The position-level vs appointment-level split is paying real dividends in PR #90's surface.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle (dept-tree + obi-pnp full + views/positions) | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` — per-PP drill-down + Position Detail "View payroll →" | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full — full 64-col importer + `lib/budget/` cube + Budget vs Actual on Position Detail | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` — PlannedAction entity + Hiring Plan workspace v1 (devOnly) + UI fix PR #78 | done 2026-05-26 |
| 2.2.f | `2.2.21` v2 PR 1: Bug 3 derived defaults + status-transition guard + Bug 2 payroll-diagnostic polish | done 2026-05-26 |
| **2.2.g** | **`2.2.21` v2 PR 2: PlannedActionDetail editor + full CostInput + delta-pay + status-workflow UI** + Bug 2a asOf-serial importer fix | **done 2026-05-26** |
| **2.2.h** | **Next sub-phase** — Alex's pick. Top candidates: **(a) `2.2.19` `views/temp-limits/`** (TX entity layer + Cat 17/18 expiry surfaces — gated on TX TODOs Restated Q #5); **(b) `2.2.20` `views/inactive/`** (smallest sub-phase; pure query view: active roster ⋈ paid-this-FY); **(c)** any other Tier-4 sub-phase from the dependency graph. | **NEXT** |
| 2.2.i-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the 39-col OBI shape + new ADR for the 64-col BFM eturn shape + new ADR for the `lib/staffing-plan/` no-upstream-source pattern + Position.cat1718 lift note + iso() serial-converter from PR #89 — five queued together) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Hiring Plan row click opens the detail editor.** Click any auto-Pending row → modal with "Converting from auto" affordance. Click any manual row → modal with Delete button + history audit log preview.
- **Status workflow UI.** On an Active hire row with status `offer`, change status to `posted` (backward) → the "Force override (skip offer → posted guard — logged)" checkbox appears. Without checking it, Save is disabled.
- **Delta-pay view.** On a filled position with a known job code (e.g., 881 or 6278), fill retCode + ppStartDate → three stats appear: Incumbent / Planned action / Δ Annual. Try a separation type → the planned-action stat shows a negative number (savings); the delta is negative too.
- **Payroll summary header asOf.** Open Payroll on the live site → header should read `Snapshot asOf 2026-05-08 · FY 2026` (or whatever the real MAX is) instead of the raw serial.
- **Worktree hygiene is self-managing.** 13 consecutive PRs auto-archived. Any stale worktree in S31+ is a regression.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.h).** Two recommended options below; see Recommendations.

### Recommendation for Phase 2.2.h

Two options worth surfacing (Option A from S30 — staffing-plan PR 2 — is now done; B and C from S30 remain as picks):

**Option B — `2.2.19` `lib/views/temp-limits/` + TemporaryExchange typed entity.** Tab 12 TEMP Limits — Cat 17/18 expiry alerts + 1040-hour gauge using the cube's `earningHours`. **Pros:** the `Position.cat1718` lift from PR #85 + the delta-pay infrastructure from PR #90 both feed naturally into this surface; visible payoff (red/yellow expiry banners + 1040-hour progress bars); the second-most-asked TEMP surface after the now-shipped Hiring Plan workspace. **Cons:** the 4 TX TODOs in Restated Question #5 need Alex confirmation up front — those are stop-the-world questions that can't be defaulted past. Effort: medium-to-high.

**Option C — `2.2.20` `lib/views/inactive/`.** Tab 13 Inactive — pure query, no separate importer. Cross-references P&P (active employees) against BI Payroll (people paid in this FY) to surface "people who got paid but aren't in the active roster anymore" — typically separations + leaves. **Pros:** smallest focused sub-phase; fast win; no new entity layer; no gating questions; surfaces real data quality signal. **Cons:** doesn't unblock any other sub-phase; the user-visible payoff is informational rather than actionable. Effort: low.

**Escape hatch:** Alex picks any other Tier-4 sub-phase from the dependency graph in `labor-report.md § Phase 2.2 sub-phases`.

**My pick: Option C** for the quick win if S31 ought to be a small session; **Option B** if Alex is ready to answer the 4 TX TODOs upfront and wants the more user-visible payoff. Both are viable.

## Next session prompt — Phase 2.2.h (Alex picks B, C, or another sub-phase)

Paste this verbatim to start Session 31:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.h),
then ships it. Phase 2.2.g shipped in 2 PRs (plus docs): #89 (Bug 2a
asOf-serial fix in OBI importer + downstream PP-range filter regression
coverage) and #90 (PlannedActionDetail editor + full CostInput sub-editor
+ delta-pay view + status workflow UI consuming the
isAllowedStatusTransition guard helper). Phase 2.2.f Option C — the
queued staffing-plan v2 — is now COMPLETE.

S30-tail QoL shipped: PR #92 (session export/import), PR #93 (global
needle search on Positions / Payroll / Hiring Plan).

**Important S30-tail clarification (read before any architectural
decisions):** All KosPos data is **SF public-employee public records**
(Sunshine Ordinance + state law) — names, IDs, classifications,
salaries. No SSNs / dependents / health info in these reports. Don't
gate hosting / sharing / cloud-storage decisions on "PII concerns" —
that framing was wrong in prior sessions + has been corrected. See
[[data-sensitivity]] memory. Engineering / cost trade-offs only.

Read first, in order:
  docs/CLAUDE.md (non-negotiable #5 rationale updated to reflect this)
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 30 entry — Phase 2.2.g + S30 tail)
  memory/MEMORY.md + the 10 memory files (data-sensitivity is new)
  docs/audits/phase-2-2-g-close-audit.md (carry-forwards A-F)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.h close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.g close audit fired in
S30. This session, the audit cadence check is only the Phase 2.2.h
close audit when 2.2.h ships. Don't re-audit 2.2.g.

DO fire the 2.2.h audit before this session ends. Use the Phase 2.2.g
close audit format; mirror the prior audit's table of carry-forwards.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.h
==============================================================================
Use AskUserQuestion. Two options:

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry surfaces + 1040-hour gauges. The
     Position.cat1718 lift (PR #85) + delta-pay infrastructure (PR #90)
     both feed into this surface naturally.
     GATING: the 4 TX TODOs in Restated Question #5 must be answered
     up front (5a expired_date set by CSC vs negotiated; 5b Cat 16
     TX-capable?; 5c TX = limited-duration appointment?; 5d renewal
     reconciliation Charter §10.104 vs CSC Rule 114).

  C. 2.2.20 lib/views/inactive/ — smallest sub-phase, no importer
     expansion, fast win. Pure query view (active roster ⋈
     paid-this-FY). No gating questions.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.h (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick:

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5a-5d)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours,
      expiry alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If C — views/inactive:
  Branch: feat/views-inactive
  Scope:
    - Add lib/views/inactive/ — query view joining P&P (active
      roster) with BI Payroll (people paid this FY)
    - Surface "paid but not in active roster" rows + separation/leave
      reasons inferred from the data
    - Add the tab to App.tsx (devOnly initially)
    - Tests

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 354 / 354).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.
  - Run `npm run build` before opening PR — production build catches
    some type errors that `tsc --noEmit` glosses over (lesson learned
    in S30).

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (5 ADRs queued: ADR-007 amendment
    for the 39-col OBI shape + iso() serial-converter note + BFM
    eturn ADR + staffing-plan no-upstream-source ADR + Position.cat1718
    lift note).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Temp Limits / Inactive to
    non-dev yet — wait until cross-tab nav has been used end-to-end on
    real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.h status + next-session prompt for Phase 2.2.i.
  - Re-ask the 4 restated questions + 12 reasonable-default calls
    (#5-16) + 1 open action item (#17). DROP items Alex acknowledges
    this session.
  - Carry-forward update on items A-F (A stays dropped, F working as
    designed). Note: SESSION_LOG.md drift item B will have a new
    baseline after the S30 entry lands; track from there.
  - Fire the Phase 2.2.h close audit (mirrors Phase 2.2.g audit format).

Recommended model: claude-opus-4-7 for Option B (entity layer + UI +
TX domain reasoning); claude-sonnet-4-6 for Option C (smallest).
Effort: medium-to-high for B; low for C.
````

### Recommended model (Phase 2.2.h)

`claude-opus-4-7` for Option B (TX entity layer + UI surface + the 4 TX TODOs need careful domain reasoning); `claude-sonnet-4-6` for Option C (smallest).

### Recommended effort (Phase 2.2.h)

`medium-to-high` for Option B; `low` for Option C.

### Surfaced UX/UI proposals carrying forward from S27

Same B-tier list — not yet shipped:

- **Phase lens switcher on Budget vs Actual card.** Phase-chip buttons next to "Board layer" to switch lens to Mayor / Committee / TechAdj.
- **Mobile responsive layout** on Position Detail's Budget vs Actual 3-stat row.
- **Snapshot date strip on Load Reports.** BFM / OBI / P&P asOf dates at a glance.
- **Positions list "as of" footer.** Per-source asOf badge under the stats summary.

C-tier (future features, not polish) also carry forward:

- **Sortable column headers on Positions list.**
- **Bulk-select positions for aggregate Budget vs Actual.**
- **`?labor=<positionId>` URL persistence for scope.**

### New S30-tail follow-ups (deferred from PR #92 + #93)

- **Field-qualified search syntax.** Per S30 Alex pick, PR #93 ships the simple-needle scope. Live with it for a session or two; if Alex wants `name:Smith jobCode:6278 step:>5` power-user mode, queue a follow-up PR. Decision: ship after Alex has lived with the simple needle on real data.
- **Multi-user shared state (Vercel / Cloudflare pivot).** Alex asked about this in S30; deferred. PR #92 (session export/import) is the v1 answer to "I have to import files every session." **Data-sensitivity update (S30 tail):** the previous framing of this item gated it on "Department policy review on putting personnel data on external infrastructure" — that was wrong. Per [`data_sensitivity.md` memory](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/data_sensitivity.md) + Alex's S30-tail confirmation, **all KosPos data is SF public-employee public records** (Sunshine Ordinance + state law). The real blockers are smaller: auth + schema migration + conflict resolution + hosting cost. Revisit whenever Alex wants — no policy review needed.
- **IndexedDB persistence (Phase 2.2.33 `snapshots/`).** Pre-existing carry-forward. PR #92 (session JSON file) doesn't replace this — IndexedDB still lands as part of the snapshots/ sub-phase whenever it's picked.

---

## Pre-Session 30 status archived below

Original content from end-of-Session-29 handoff retained for reference.

---

## Current status (end of Session 29 — Phase 2.2.f Option C PR 1: Bug 3 derived defaults + Bug 2 payroll-diagnostic polish, 2026-05-26)

**Phase:** Phase 2.2.f — **Option C PR 1: `lib/staffing-plan/` Bug 3 derived defaults ([PR #85](https://github.com/alkprojects/kospos/pull/85))** plus a small payroll-diagnostic-polish PR ([PR #84](https://github.com/alkprojects/kospos/pull/84) — Bug 2 follow-up: widened the Payroll empty-state diagnostic with a P&P-vs-OBI coverage stat + progressive prefix fallback). Phase 2.2.f close audit fired on schedule (6th event-based trigger). **Option C PR 2 (`PlannedActionDetail` editor + row-click drill-down + status workflow UI + CostInput exposure) is queued for S30** — the status-transition guard helper already shipped in PR #85, so PR 2 is the UI wiring on top.
**Last main commit:** `52a5529` ([PR #85](https://github.com/alkprojects/kospos/pull/85) — Bug 3 derived defaults) → `f91ed7f` ([PR #84](https://github.com/alkprojects/kospos/pull/84) — Bug 2 diagnostic polish) → `64269ea` ([PR #83](https://github.com/alkprojects/kospos/pull/83) — S28 handoff bug-followup) → `0285a35` ([PR #82](https://github.com/alkprojects/kospos/pull/82) — UI hotfix) → `63bba32` ([PR #81](https://github.com/alkprojects/kospos/pull/81) — Phase 2.2.e close audit)
**Tests:** 303 / 303 passing (+40 from start of Phase 2.2.f: +13 from PR #84 payroll-diagnostic cases; +27 from PR #85 Bug 3 + Position.cat1718 + status-transition cases).
**Branches in flight:** none post-merge.
**Worktree hygiene:** auto-archive working across **11 consecutive PRs** (#71, #73, #74, #75, #76, #78, #79, #80, #82, #84, #85). Carry-forward Item A stays dropped. Any stale worktree in S30+ is a regression.

### ⚠️ Bug 2 reopened on live data — Bug 2b RESOLVED (user-side); Bug 2a still real

Alex reviewed the live site after S29 close and initially reported the diagnostic still showed 1106950 as "not in the OBI snapshot" despite his belief the position had payroll data. His screenshot also revealed a second, smaller bug. **Late S29 update:** Alex confirmed the OBI export he loaded **genuinely does not contain 1106950** — he had the wrong file in mind. He's running a new export with both CPC and DBI positions to confirm the join works end-to-end on a position that IS in both snapshots.

**Bug 2a (still real — clear bug, fix first).** Snapshot meta line shows `Snapshot asOf 46150 · FY 2026`. The `46150` is a **raw Excel date serial** — `46150` ≈ 2026-05-08. Root cause: [`app/src/lib/importers/obi-payroll.ts`](../app/src/lib/importers/obi-payroll.ts) line 24's `str()` converts numeric cells via `String(v)`, which yields the serial number unchanged. The xlsx import doesn't pass `cellDates: true`, so dates come through as serials. The MAX-tracker on line 132 then stores `"46150"`, every row gets `_asOfDate = "46150"`, and the display surfaces it raw. **Fix:** either pass `cellDates: true` to the xlsx sheet-read OR add an Excel-serial → ISO converter applied to the `iPeriodEnd` column read. Worth checking whether `earningPeriodEnd` *itself* is also serial — if so, the PP-range filter in Payroll is comparing string serials against ISO dates in `applyFilters` and silently no-matching. The summary-header serial display is the visible symptom; the under-the-hood join damage may be larger.

**Bug 2b — RESOLVED (user-side; no code fix needed).** Alex's screenshot showed 1106950 in the 336 "P&P-only" group with no variant in OBI's positionIdentifier column. The diagnostic from PR #84 was technically correct: that specific OBI export did not contain 1106950. Alex confirmed mid-S29-tail this was a wrong-file mistake on his side. Loading a new OBI export with the full dept-group coverage (both DBI + CPC) will be his next validation step. No alias-map needed; no diagnostic copy needed beyond what PR #84 already says.

**S30 STEP 0 (revised — only the asOf-serial fix is urgent):**

  0a. **Ship the asOf-serial fix as a small standalone PR.** Pass `cellDates: true` to the xlsx read OR add a serial-to-ISO converter applied to the `iPeriodEnd` column. Verify the fix doesn't break the existing 303-test baseline (importer tests use synthetic ISO strings, so they should still pass). Add a new test case feeding an Excel-serial-numeric cell through the importer and asserting `earningPeriodEnd` + `_asOfDate` are ISO strings. **Also audit downstream:** is `applyFilters`'s PP-range filter in `lib/views/labor/aggregate.ts` comparing ISO strings against potentially-serial `earningPeriodEnd`? If so, fix at the same time + add a regression test. Spot-check the live site: the summary header should read `Snapshot asOf 2026-05-08 · FY 2026` (or whatever the MAX truly is).

  0b. **(Demoted to nice-to-have — defer to a future polish PR or skip entirely.)** A "search snapshot positionIdentifiers for ____" affordance in the empty-state diagnostic is still useful for future debugging cases, but no longer urgent now that Bug 2b is resolved. Pick this up later if a similar mystery recurs.

  0c. **(Cancelled.)** The alias-map / more-specific-message conditional from the prior plan is moot — Alex confirmed the diagnostic copy is correct as-is for the actual case (P&P-only, position genuinely not in this OBI export).

After 0a ships, S30 can move directly to the Phase 2.2.g pick (Option A staffing-plan PR 2 / B temp-limits / C inactive).

### What landed this session — two PRs (plus docs PR)

#### [PR #84](https://github.com/alkprojects/kospos/pull/84) — Bug 2 follow-up: widened Payroll empty-state diagnostic

Alex's S28 review surfaced: scoping Payroll to position **1106950** showed 0 rows + only 1 nearby chip (1106348) — not enough information to act on. The S29 chip output confirmed OBI's snapshot coverage is narrow (234 distinct positionIdentifiers across 42,949 rows). PR #84 makes the empty state self-diagnosing:

- **P&P-vs-OBI coverage-gap stat.** New pure helper `coverageStats` classifies the scoped position as `in-both` / `p-and-p-only` / `obi-only` / `orphan`. The diagnostic now says affirmatively *"Position 1106950 is in the loaded P&P snapshot, but not in the OBI snapshot. OBI covers 2 of the 4 P&P positions; this is one of the 2 P&P-only positions in this loaded pair. Typically this means no posted payroll in the FY covered by the loaded OBI cut — confirm the snapshot meta below matches the FY you expect."*
- **Progressive prefix fallback for nearby chips.** New pure helper `findNearbyPositions` tries 4-digit prefix first; falls back to 3-digit when <2 candidates; 2-digit as the floor. Alex's case would widen from `1106` → `110`, surfacing 1107xxx / 1109xxx candidates the strict net missed.
- **Snapshot meta line:** FY · asOf · row count · distinct-positionIdentifier count. User confirms the right OBI cut without bouncing back to the summary header.

3 files / +367 / −32. New pure module `lib/views/labor/payroll-diagnostic.ts` (testable without React). 13 new test cases.

#### [PR #85](https://github.com/alkprojects/kospos/pull/85) — Phase 2.2.f Option C PR 1: Bug 3 derived defaults

The biggest user-visible gap on the Hiring Plan workspace per Alex's S28 ask. 10 files / +864 / −42. Resolves 3 S29 AskUserQuestion gating items at the start:

- **Q #18 holdReason enum:** dropped per Alex ("not enough regular reasons to justify pre-built tags"). `PlannedAction.holdReason` stays free string. **Drops from carry-forward.**
- **Q #19 status workflow:** guarded forward-only + csc-hold/finished branches. Pure guard helper `isAllowedStatusTransition` ships in PR #85; PR 2 (S30) wires it into the UI.
- **Bug 3 override scope:** per-position manual-wins (cleanest dedup; "manual wins" as a mental model).

| What | Where |
|---|---|
| **Derived rules** (virtual — computed at view time, never stored). Pending = vacant + no manual action. TEMP = Cat 17/18 + no manual action. **Precedence TEMP > Pending** (vacant Cat 17/18 derives as TEMP). | `computeDerivedActions` in [build.ts](../app/src/lib/staffing-plan/build.ts) |
| **`DerivedAction` + `UnifiedAction` discriminated union** — lets the existing Section + ActionRow components render manual + derived uniformly, dispatching on `source` for the Hide/Delete affordance. | [types.ts](../app/src/lib/staffing-plan/types.ts) |
| **`derivedRemoved: Set<positionId>`** on the store + `hideDerivedAction(positionId)` + `restoreDerivedAction(positionId)` methods. Auto-prune: an omission auto-hides from the Manual user changes section when the derive rule no longer fires (e.g. previously-vacant position got filled); the entry stays in the store so a future re-vacancy remembers the user's hide intent. | [store.ts](../app/src/lib/staffing-plan/store.ts) |
| **`Position.cat1718` lift** — moved Cat1718Tracking from `appointment.cat1718` (only set for filled positions) to a parallel `Position.cat1718` (set whenever the row has the code, filled or vacant). Reason: TEMP-derivation needs to fire on vacant Cat 17/18 positions, which have no `appointment` to hang the legacy field off. Both fields coexist; appointment.cat1718 still mirrors the incumbent, position.cat1718 mirrors the row. Additive — no breaking changes. | [positions/types.ts](../app/src/lib/positions/types.ts) + [positions/build.ts](../app/src/lib/positions/build.ts) |
| **`isAllowedStatusTransition(from, to)`** — guard helper per Q #19 pick. Allows forward in the not-started → posted → list → exam → interviews → offer → final → finished pipeline; csc-hold is a bidirectional branch from/to any state; null status (separation/pending/unfunded types) is unconstrained. PR 2 surfaces it. | [build.ts](../app/src/lib/staffing-plan/build.ts) |
| **Workspace UI** — auto-chip badge on derived row position numbers; Hide button (instead of Delete) on derived rows; "Manual user changes" section block below the 5 type sections with Restore buttons; footer shows manual/auto count breakdown. | [StaffingPlanView.tsx](../app/src/lib/views/staffing-plan/StaffingPlanView.tsx) |
| **27 new tests** — 5 store derivedRemoved + 7 computeDerivedActions + 3 computeOmittedDerivedActions + 7 isAllowedStatusTransition + 1 Position.cat1718 + 5 view-level Bug 3 integration cases. | [staffing-plan.test.ts](../app/src/lib/staffing-plan/staffing-plan.test.ts) + [positions.test.ts](../app/src/lib/positions/positions.test.ts) + [staffing-plan-view.test.tsx](../app/src/lib/views/staffing-plan/staffing-plan-view.test.tsx) |

**Verification (preview-MCP, synthetic 4-position fixture):**
- 50001 FILLED non-Cat → no derived row ✓
- 50002 VACANT non-Cat → derived **Pending** · "Vacant, no plan" ✓
- 60001 FILLED Cat 17 → derived **TEMP** · "Cat 17 temp" ✓
- 70001 VACANT Cat 18 → derived **TEMP** · "Cat 18 temp" (precedence) ✓

Header: `Actions 3 / Active 0 / Pending 1 / TEMP 2`. Hide flow: click Hide on 50002 → row moves to `Manual user changes · 1` → Restore brings it back to Pending. Manual-wins flow: add manual Active on 50002 → derived Pending disappears, position appears only in Active. Footer: `3 actions (1 manual · 2 auto-derived)`. No console errors.

#### [PR (this docs PR)](https://github.com/alkprojects/kospos/pulls) — Phase 2.2.f close audit + S29 handoff

Audit doc at [`docs/audits/phase-2-2-f-close-audit.md`](audits/phase-2-2-f-close-audit.md) + this handoff + the S29 SESSION_LOG entry.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): **three new acknowledgments this session** (Q #18 → dropped, Q #19 → answered, Bug 3 override scope → answered + shipped). Carry-forward narrowed accordingly.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (4 — Q #18 dropped, Q #19 answered, one new question added)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 (TX rules — 4 sub-questions) still gates Phase 2.2.19 `views/temp-limits/`** — if Alex picks that as 2.2.g or later, the 4 TODOs need answers up front.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation before the TX typed entity can ship:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

Same as Session 28; nothing acknowledged this session beyond the Hiring Plan workspace items. Verbatim copies retained.

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?**

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip (already shipped in PR #80; **chip + diagnostic placement matches your expectation?**)

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else?

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)?

#### Open action items (1 — same as S28)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice. **Disposition needed per position: data bug vs intentional hold.** **NEW context (S29):** these 5 positions now auto-populate as Pending in the Hiring Plan workspace (Bug 3 design). You can click Hide on each to send to "Manual user changes," or add a manual action with a holdReason note to claim each one explicitly.

#### Resolved this session (drops from carry-forward)

- **Q #18 (holdReason enum narrowing) — DROPPED.** Alex S29: "don't do any pre-built tags for now. everything should be entered manually. there aren't enough regular reasons to justify pre-built tags." holdReason stays free string.
- **Q #19 (status workflow transitions) — ANSWERED.** Alex S29: guarded forward-only + csc-hold/finished branches. Shipped as `isAllowedStatusTransition` helper in PR #85; PR 2 (S30) wires it into the UI.
- **Bug 3 (Pending/TEMP defaults + Manual user changes) — SHIPPED.** PR #85 (with per-position manual-wins per Alex S29 pick).
- **Bug 2 (Payroll 1106950 0-rows) — RESOLVED via improved diagnostic.** PR #84 explains affirmatively that 1106950 is in P&P but not in the OBI snapshot. No data-model fix needed; the diagnostic now tells the user that directly.

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.f close audit](audits/phase-2-2-f-close-audit.md):

A. ~~Stale post-merge worktrees.~~ **Stays dropped.** **11 consecutive PRs** auto-archived (#71, #73, #74, #75, #76, #78, #79, #80, #82, #84, #85). Any stale worktree in S30+ is a regression.

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** File at **2,630 lines** (was 2,572 at S28 audit; +58 from S28 entry). Past 2,000-line trim trigger; slower drift this session. Bundleable with items C + the Tab 24 Improvement #6 holdReason language drift.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** Count unchanged at **17 instances** (no labor-report.md changes this session). Single-purpose cleanup PR; ~30 min. Bundleable with B + the Tab 24 Improvement #6 drift.

D. **Defer the `labor-report.md` split until Phase 2.4.** File still 8,518 lines.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 6th event-based trigger fired on schedule this session. S30 prompt template (below) preserves the Step-0 trigger pattern.

**New for S30 carry-forward:** Tab 24 § Improvement #6 (holdReason enum) language in `labor-report.md` is now stale — Alex dropped the enum. Surface as a doc-drift TODO; bundleable with B + C.

### Top 3 findings to surface for Alex this session

1. **The Hiring Plan workspace now defaults to "useful out of the box."** Visit `/kospos/?dev=1` → Load Reports, load a P&P → open Hiring Plan. Every vacant non-Cat-17/18 position auto-populates Pending (purple AUTO badge + "Vacant, no plan" reason). Every Cat 17/18 position auto-populates TEMP. Click Hide on any auto row → moves to a new "Manual user changes" section at the bottom with a Restore button. Add a manual Active hire on a vacant position → that position vanishes from auto-Pending (per-position manual-wins). The footer shows the count breakdown: `N actions (X manual · Y auto-derived)`.

2. **The Payroll empty-state diagnostic is now self-diagnosing.** Scope Payroll to a position that has no OBI rows → instead of "no rows + nearby chips," the diagnostic now tells you affirmatively: *"Position X is in the loaded P&P snapshot, but not in the OBI snapshot. OBI covers Y of the Z P&P positions; this is one of the (Z-Y) P&P-only positions in this loaded pair."* Plus snapshot meta line (FY · asOf · row count). Plus the chip net widened to fall back to 3-digit or 2-digit prefix when the strict 4-digit prefix is sparse — surfacing more candidates when there's a renumber / TX-history case to investigate.

3. **`Position.cat1718` lift is a small data-model refactor worth noting.** Vacant Cat 17/18 positions now expose Cat 17/18 attributes at the position level (not only via the incumbent's appointment). Powers the TEMP-derivation rule for vacant slots; doesn't break any existing consumer (additive change). Documented in the close audit + queued for the Phase 2.4 ADR set.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle (dept-tree + obi-pnp full + views/positions) | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` — per-PP drill-down + Position Detail "View payroll →" | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full — full 64-col importer + `lib/budget/` cube + Budget vs Actual on Position Detail | done 2026-05-26 |
| 2.2.e | `2.2.21` `staffing-plan/` — PlannedAction entity + Hiring Plan workspace v1 (devOnly) + UI fix PR #78 | done 2026-05-26 |
| **2.2.f** | **`2.2.21` v2 PR 1: Bug 3 derived defaults + status-transition guard** + Bug 2 payroll-diagnostic polish | **done 2026-05-26 (PR 2 queued for S30)** |
| **2.2.g** | **Next sub-phase** — Alex's pick. Top candidates: **(a) Option C PR 2** (PlannedActionDetail + row-click drill-down + status workflow UI + CostInput exposure — finishes staffing-plan v2); **(b) `2.2.19` `views/temp-limits/`** (TX entity layer + Cat 17/18 expiry surfaces — gated on TX TODOs Restated Q #5); **(c) `2.2.20` `views/inactive/`** (smallest, no gating). | **NEXT** |
| 2.2.h-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the 39-col OBI shape + new ADR for the 64-col BFM eturn shape + new ADR for the `lib/staffing-plan/` no-upstream-source pattern + Position.cat1718 lift note — four queued together) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **The Hiring Plan tab defaults to "useful out of the box."** Hit `/kospos/?dev=1`, load a P&P, open Hiring Plan. Every vacant non-Cat-17/18 position should appear as an auto Pending row; every Cat 17/18 position should appear as an auto TEMP row. Click Hide on one → it should move to Manual user changes at the bottom. Click Restore → it should come back to its auto section. Add a manual Active hire on a vacant position via the form → that position's auto Pending row should disappear.
- **The Payroll empty-state diagnostic is now clearer.** Scope Payroll to position 1106950 (the bug 2 case) on your real data → you should see the "OBI covers X of Y P&P positions; this is one of the (Y-X) P&P-only positions" message. The diagnostic confirms whether the empty result is expected.
- **Worktree hygiene is self-managing.** 11 consecutive PRs auto-archived. Any stale worktree in S30+ is a regression.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.g).** Three recommended options below; see Recommendations.

### Recommendation for Phase 2.2.g

Three options worth surfacing, with trade-offs:

**Option A — Phase 2.2.f Option C PR 2 (`PlannedActionDetail` editor + row-click drill-down + status workflow UI + CostInput exposure).** Finishes the staffing-plan v2 work started this session. Adds: (1) modal/drawer editor that opens on row click; (2) full CostInput sub-editor so actions can be priced (the "X of Y priced ⚠" chip becomes actionable); (3) status workflow UI consuming the `isAllowedStatusTransition` guard helper shipped in PR #85, with a force-override affordance; (4) notes textarea (multi-line vs the inline single-line input on AddActionForm); (5) startPpe date input; (6) history audit log preview. **Pros:** continues the focused theme (Hiring Plan workspace), high user-visible payoff (actions become priced + status workflow becomes interactive), guard helper is already there so just UI wiring. **Cons:** the CostInput sub-editor is the biggest unknown (many fields — code/setid/retCode/ppStartDate/salaryType/stepOrRange/rangePos/fiscalYear) — might warrant a small AskUserQuestion at the start to pick "minimal CostInput" vs "full CostInput with deltaPay support."

**Option B — `2.2.19` `lib/views/temp-limits/` + TemporaryExchange typed entity.** Tab 12 TEMP Limits — Cat 17/18 expiry alerts + 1040-hour gauge using the cube's `earningHours`. **Pros:** small focused sub-phase; immediately visible (red/yellow expiry banners + 1040-hour progress bars). The `Position.cat1718` lift from PR #85 makes the data join easier. **Cons:** the 4 TX TODOs in Restated Question #5 need Alex confirmation up front before the typed entity ships — those are stop-the-world questions that can't be defaulted past.

**Option C — `2.2.20` `lib/views/inactive/`.** Tab 13 Inactive — pure query, no separate importer. Cross-references P&P (active employees) against BI Payroll (people paid in this FY) to surface "people who got paid but aren't in the active roster anymore" — typically separations + leaves. **Pros:** smallest focused sub-phase; fast win; no new entity layer; no gating questions. **Cons:** doesn't unblock any other sub-phase; the user-visible payoff is informational rather than actionable.

**My pick: Option A** if Alex wants to keep the Hiring Plan momentum (closes out Phase 2.2.f cleanly + biggest user-facing payoff); **Option B** if Alex can answer the 4 TX TODOs upfront; **Option C** for the smallest win. All three are viable; Option A is the most coherent continuation of this session's work.

## Next session prompt — Phase 2.2.g (Alex picks A, B, or C)

Paste this verbatim to start Session 30:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.g),
then ships it. Phase 2.2.f shipped in 2 PRs (plus docs): #84 (Payroll
empty-state diagnostic polish — coverage stat + progressive prefix
fallback) and #85 (Bug 3 derived defaults + status-transition guard
helper). Option C PR 2 (PlannedActionDetail editor) is QUEUED — the
guard helper is in place; just UI wiring needed.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 29 entry — Phase 2.2.f)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-2-f-close-audit.md (carry-forwards A-F)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph
  app/src/lib/staffing-plan/ (entity + helpers + store)
  app/src/lib/views/staffing-plan/StaffingPlanView.tsx (workspace)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.g close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.f close audit fired in
S29. This session, the audit cadence check is only the Phase 2.2.g
close audit when 2.2.g ships. Don't re-audit 2.2.f.

DO fire the 2.2.g audit before this session ends. Use the Phase 2.2.f
close audit format; mirror the prior audit's table of carry-forwards.

==============================================================================
STEP 0.5 — Bug 2a asOf-serial fix (Bug 2b RESOLVED user-side)
==============================================================================
Alex's S29-tail clarification: the OBI export he loaded genuinely does
not contain 1106950 (wrong file on his side). PR #84's diagnostic was
correct as-is. Bug 2b is RESOLVED — no alias-map / search affordance
needed this session.

Bug 2a (asOf raw Excel serial) IS still real and must ship first.

  0a. asOf-serial bug — diagnostic shows "Snapshot asOf 46150" (raw
      Excel date serial). Fix in app/src/lib/importers/obi-payroll.ts:
      pass cellDates: true to the xlsx read OR add a serial → ISO
      converter applied to the iPeriodEnd column. Add a test feeding a
      numeric Excel-serial cell and asserting earningPeriodEnd +
      _asOfDate are ISO strings.

      WARNING: also audit downstream — is applyFilters's PP-range
      filter in lib/views/labor/aggregate.ts comparing ISO date strings
      against potentially-serial earningPeriodEnd values? If so, fix at
      the same time + add a regression test. The asOf-display bug may
      be the visible tip of a larger join-key damage.

      Spot-check on the live site after merge: summary header should
      read "Snapshot asOf 2026-05-08 · FY 2026" (or whatever the real
      MAX is). Alex's new CPC+DBI export will exercise this end-to-end.

  0b. (Demoted to nice-to-have / defer.) A "search snapshot
      positionIdentifiers for ____" text input in the empty-state
      diagnostic is still useful for future debugging cases, but no
      longer urgent. Pick up later if a similar mystery recurs.

  0c. (Cancelled.) Diagnostic copy from PR #84 is correct for the
      actual P&P-only case Alex saw.

After 0a merges, S30 can move directly to STEP 1.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.g
==============================================================================
Use AskUserQuestion. Three options in SESSION_HANDOFF.md § "Recommendation
for Phase 2.2.g":

  A. (RECOMMENDED) Phase 2.2.f Option C PR 2 — PlannedActionDetail
     editor + row-click drill-down + status workflow UI + CostInput
     exposure. Closes out staffing-plan v2 cleanly. Status-transition
     guard is already shipped (PR #85); just UI wiring.
     GATING: small AskUserQuestion at start — minimal vs full CostInput
     sub-editor scope.

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry surfaces + 1040-hour gauges. The
     Position.cat1718 lift from PR #85 makes the data join easier.
     GATING: the 4 TX TODOs in Restated Question #5 must be answered
     up front.

  C. 2.2.20 lib/views/inactive/ — smallest sub-phase, no importer
     expansion, fast win. Pure query view (active roster ⋈
     paid-this-FY). No gating questions.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.g (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick.

If A — staffing-plan v2 PR 2:
  Branch: feat/staffing-plan-detail-editor
  Scope:
    - Resolve CostInput-scope question via AskUserQuestion at start
    - Build PlannedActionDetail.tsx — modal/drawer editor
        * Full or minimal CostInput sub-editor (per Alex's pick)
        * Status workflow dropdown with isAllowedStatusTransition guard
          + force-override affordance
        * Notes multi-line textarea
        * startPpe date input
        * History audit log preview
    - Wire row-click on Section table → PlannedActionDetail
    - Tests + preview-MCP walkthrough

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours,
      expiry alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If C — views/inactive:
  Branch: feat/views-inactive
  Scope:
    - Add lib/views/inactive/ — query view joining P&P (active
      roster) with BI Payroll (people paid this FY)
    - Surface "paid but not in active roster" rows + separation/leave
      reasons inferred from the data
    - Add the tab to App.tsx (devOnly initially)
    - Tests

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 303 / 303).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (ADR-007 amendment + BFM eturn ADR
    + staffing-plan no-upstream-source ADR + Position.cat1718 lift
    note — four queued together).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Temp Limits / Inactive to
    non-dev yet — wait until cross-tab nav has been used end-to-end on
    real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.g status + next-session prompt for Phase 2.2.h.
  - Re-ask the 4 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17). DROP items Alex acknowledges this session.
  - Carry-forward update on items A-F (A stays dropped, F working as
    designed). Note: the Tab 24 Improvement #6 holdReason language drift
    surfaced in the Phase 2.2.f audit could be folded into a docs-cleanup
    PR alongside items B + C.
  - Fire the Phase 2.2.g close audit (mirrors Phase 2.2.f audit format).

Recommended model: claude-opus-4-7 for Option A (UI surface + CostInput
sub-editor); claude-opus-4-7 for Option B (entity layer + UI);
claude-sonnet-4-6 for Option C (smallest).
Effort: medium-to-high for A; medium-to-high for B; low for C.
````

### Recommended model (Phase 2.2.g)

`claude-opus-4-7` for Option A (CostInput editor design + UI integration); `claude-opus-4-7` for Option B (TX entity layer + UI surface); `claude-sonnet-4-6` for Option C (smallest).

### Recommended effort (Phase 2.2.g)

`medium-to-high` for Option A; `medium-to-high` for Option B; `low` for Option C.

### Surfaced UX/UI proposals carrying forward from S27

Same B-tier list — not yet shipped:

- **Phase lens switcher on Budget vs Actual card.** Phase-chip buttons next to "Board layer" to switch lens to Mayor / Committee / TechAdj.
- **Mobile responsive layout** on Position Detail's Budget vs Actual 3-stat row.
- **Snapshot date strip on Load Reports.** BFM / OBI / P&P asOf dates at a glance.
- **Positions list "as of" footer.** Per-source asOf badge under the stats summary.

C-tier (future features, not polish) also carry forward:

- **Sortable column headers on Positions list.**
- **Bulk-select positions for aggregate Budget vs Actual.**
- **`?labor=<positionId>` URL persistence for scope.**

---

## Pre-Session 29 status archived below

Original content from end-of-Session-28 handoff retained for reference.

---

## Current status (end of Session 28 — Phase 2.2.e lib/staffing-plan/ + Hiring Plan workspace + UI fixes, 2026-05-26)

**Phase:** Phase 2.2.e — **`lib/staffing-plan/` entity layer ([PR #79](https://github.com/alkprojects/kospos/pull/79)) + Hiring Plan workspace surface ([PR #80](https://github.com/alkprojects/kospos/pull/80))** plus two small UI fixes ([PR #78](https://github.com/alkprojects/kospos/pull/78) — Labor → Payroll rename + always-show "View payroll →" button; [PR #82](https://github.com/alkprojects/kospos/pull/82) — Hiring Plan dropdown shows all positions + Payroll scoped-empty diagnostic). Phase 2.2.e close audit fired on schedule (5th event-based trigger).
**Last main commit:** `<PR #82 hash>` ([PR #82](https://github.com/alkprojects/kospos/pull/82) — UI hotfix) → `63bba32` ([PR #81](https://github.com/alkprojects/kospos/pull/81) — Phase 2.2.e close audit + S28 handoff) → `23d8ed7` ([PR #80](https://github.com/alkprojects/kospos/pull/80) — Hiring Plan surface) → `8f92115` ([PR #79](https://github.com/alkprojects/kospos/pull/79) — staffing-plan entity) → `3cdf2c8` ([PR #78](https://github.com/alkprojects/kospos/pull/78) — Payroll rename + always-show button)
**Tests:** 263 / 263 passing (PR #82 added no tests — pure UI / diagnostic shipping).
**Branches in flight:** none post-merge.
**Worktree hygiene:** auto-archive working across **9 consecutive PRs** (PR #71, #73, #74, #75, #76, #78, #79, #80, #82). Carry-forward Item A stays dropped. Any stale worktree in S29+ is a regression.

### ⚠️ Three live-site bugs Alex flagged at session close — fix first in S29

After the Phase 2.2.e close, Alex reviewed the live site and reported three bugs. Two shipped a fix in [PR #82](https://github.com/alkprojects/kospos/pull/82); **one needs design work in S29**:

**(fixed in PR #82) Bug 1 — Hiring Plan dropdown was capped at 200 positions.** Marco Jacobo's position 1115135 didn't appear in autocomplete because `positions.slice(0, 200)` truncated the datalist. Fix: drop the slice. **Validate on live site:** `?dev=1` → Hiring Plan → start typing `111` in Position #; 1115135 should appear in the dropdown.

**(diagnostic in PR #82, root-cause pending) Bug 2 — Payroll scope to position 1106950 shows 0 rows, but Alex confirms position has payroll data.** Most likely a `positionIdentifier` mismatch between P&P (`1106950`) and OBI (probably `1106950 ` with whitespace, or a renumbered identifier, or a TX-history identifier). PR #82 adds a diagnostic to the Payroll scoped-empty state showing snapshot stats + "nearby positionIdentifiers" chips with the same 4-digit prefix. **NEXT SESSION:** Alex opens the live site → `?dev=1` → Positions → 1106950 → View payroll → reports which chip (if any) is "the real one" → S29 ships the fix (extend `normalizePositionKey` to strip internal whitespace? add an alias-map? change the join to fuzzy-match?). **Don't ship the fix blindly — wait for the diagnostic's chip output.**

**(deferred to S29) Bug 3 — Pending + TEMP sections should default-populate from data, with a "Manual user changes" override section.** Significant design change to `lib/staffing-plan/`. Alex's exact ask:

> "everything should be user editable and addable, but pending positions should by default show all vacant positions that are not active and the temp section should by default show all temp positions. if a user removes a position from pending without adding it to active it should go in a section at the bottom, something like manual user changes. same with temp, if a user removes something from that section it should show up in the manual changes section."

**Proposed design** (for S29 to confirm/correct via AskUserQuestion):

- **Derived actions** are computed at render time, not stored. Source: the P&P spine. Rules:
  - `Pending` = positions with `fillStatus === 'VACANT'` AND no manual `active-hire` or `separation` action
  - `TEMP` = positions with a Cat 17/18 appointment AND no manual override
- **Manual actions** (the existing `PlannedAction` shape from PR #79) override derived defaults on the same position. Adding an Active action for a vacant position removes that position from the auto-Pending list.
- **Manual omissions** — a new entity type (or a `'derived-removed'` source enum on `PlannedAction`) records "user removed this from the default list." When set, the position no longer appears in derived Pending/TEMP — it appears in a new **"Manual user changes"** section at the bottom of the workspace.
- **Implementation:** extend `PlannedAction` types with `source: 'manual' | 'derived' | 'derived-removed'`. Derived rows are virtual (computed at view time). Derived-removed rows are stored but marked. Sections render `manual ⊕ derived` then subtract `derived-removed`.
- **Persistence:** unchanged (in-memory v1; manual + derived-removed persist; derived are recomputed).

This is the right scope for Phase 2.2.f Option C (staffing-plan v2) — combine with the per-action detail editor + status workflow + holdReason narrowing that were already queued. **Recommend Phase 2.2.f Option C be expanded to include this Bug 3 design, and that it become the recommended pick** since it's the most user-visible gap on the workspace.

### What landed this session — four PRs (plus docs PR)

#### [PR #82](https://github.com/alkprojects/kospos/pull/82) — UI hotfix: Hiring Plan dropdown shows all positions + Payroll scoped-empty diagnostic

Two post-deploy bugs Alex spotted on the live site after PR #80 (Hiring Plan surface). 2 files changed (+83 / −2).

- **Dropdown cap removed.** `positions.slice(0, 200)` truncated the datalist — Marco Jacobo's 1115135 didn't appear in autocomplete. Removed the slice; browsers handle long `<datalist>` lists fine.
- **Payroll scoped-empty diagnostic.** When the user scopes to a position with 0 OBI rows, the table previously just said "No rows match." Now surfaces: snapshot row + distinct-positionIdentifier counts; common causes (whitespace / digit-format divergence / position renumber / wrong FY); "nearby positionIdentifiers" chips for same 4-digit prefix (catches TX-history + renumber cases). When Alex opens this on his data for 1106950 the chips will surface the actual variant identifier OBI is using.

**Bug 3 from Alex's report (Pending/TEMP defaults-from-data + Manual user changes section) is deferred to S29** as the recommended Phase 2.2.f Option C scope expansion.

#### [PR #78](https://github.com/alkprojects/kospos/pull/78) — UI fix: Labor → Payroll rename + always-show "View payroll →" button

Two surface fixes Alex flagged on the live site at session open. 2 files changed (+35 / −23).

- **Rename "Labor" tab → "Payroll".** The tab drills into BI Payroll rows; "Labor" was misleading. Pure label change in `App.tsx`; internal symbol/directory names (`LaborView`, `lib/views/labor/`) stay as-is.
- **"View payroll →" button always shows** when Payroll tab is available + OBI is loaded, including the "no rows for this position" hint branch. Previously the button was inside `YtdPayrollCard` which only rendered when matching OBI rows existed — positions Alex *knew* had posted payroll but didn't match the join had no drill-in. Fix: extracted `ViewPayrollButton`; reused in both branches. Hint copy updated to mention the drill-down explicitly.

**Verification (preview-MCP):** synthetic 2-position data → 50001 (matches OBI) shows the YTD breakdown card with button; 50002 (no match) shows the hint + button. Click on 50002 → switches to Payroll tab, banner `Scoped to: 50002 · 1234 Test Position B (no OBI)`, table `No rows match the current filters` with stats `0 of 1 in snapshot`.

#### [PR #79](https://github.com/alkprojects/kospos/pull/79) — Phase 2.2.e Option A PR 1 — `lib/staffing-plan/` entity layer

The PlannedAction typed entity per [Tab 24 § Improvement #1](docs/domain/labor-report.md#tab-24--staffing-plan). 5 files / +866 lines. Entity-only, no UI.

| What | Where |
|---|---|
| **PlannedAction type + 5 enums** (PlannedActionType / HiringStatus / ActionMode / SeparationConfidence + StaffingPlanRollup + PlannedActionHistory). Sign convention encoded in JSDoc + types: separations carry negative annual cost (savings); others positive. | [types.ts](../app/src/lib/staffing-plan/types.ts) |
| **Pure helpers** — `computeExpectedCost` wraps `calcEmployeeCost` (already COLA-aware via per-PP loop), applies type-keyed sign, returns null on unpriced or CostCalcError; `rollupByType` groups + sums per section; `actionsForPosition` filters with double-normalized key lookup (Marco Jacobo TX pattern); `pricingDiagnostic` drives the "X of Y priced ⚠" chip; `netCostImpact` is the headline summary number; `newActionId` generates ids with `crypto.randomUUID` fallback. | [build.ts](../app/src/lib/staffing-plan/build.ts) |
| **Zustand store** — `useStaffingPlan` with add/update/delete/toArray/clearAll. Mirrors `usePositionNotes` shape (Map-backed, in-memory v1; IndexedDB persistence deferred to Phase 2.2.33 `snapshots/`). `updateAction` diffs the patch against current state and appends one history entry per changed field — no-op updates don't create entries. | [store.ts](../app/src/lib/staffing-plan/store.ts) |
| **Tests (27)** — id uniqueness; sign convention across all 5 types using real reference data (class 922 Range A min — same fixture cost.test.ts uses); CostCalcError → null; perPp × ppCount = annual; rollupByType bucket math; Marco Jacobo multi-action pattern; pricing diagnostic; net cost impact; full store CRUD (default-by-type status; positionId normalization on add; history append-only with no-op equality check; unknown-id no-op; delete return values; clearAll). | [staffing-plan.test.ts](../app/src/lib/staffing-plan/staffing-plan.test.ts) |

#### [PR #80](https://github.com/alkprojects/kospos/pull/80) — Phase 2.2.e Option A PR 2 — Hiring Plan workspace surface

The Tab 24 workspace on top of PR #79's entity layer. 4 files / +609 lines. New `Hiring Plan` tab (devOnly) appears between `Payroll` and `Load Reports`.

- **`StaffingPlanView.tsx`** — summary header (5 type counts + net cost impact + "X priced · Y unpriced" hint), inline `AddActionForm` (pick position from datalist of P&P spine + Type select + Notes; cost basis editor deferred to v2), **5 section blocks** (Active / Separations / Pending / TEMP / Unfunded) with per-section "X of Y priced ⚠" diagnostic + per-section cost rollup + Delete button per row + **multi-action positions disclosure** (surfaces Marco Jacobo TX pattern explicitly: "Position 1115135 · 3 actions: Active + Separations + TEMP"). Live COLA-aware cost projection per row via `computeExpectedCost`.
- **App.tsx tab wiring** — `Tab` union widened with `'staffing-plan'`; `ALL_TABS` gets a new `Hiring Plan` entry (devOnly); main router branches to `<StaffingPlanView />`.
- **Tests (9)** — empty-position state; summary header counts; "X of Y priced ⚠" chip; unpriced-cell rendering; add-form happy path; add-form unknown-position error; delete; Marco Jacobo TX 3-section pattern.

**Verification (preview-MCP):** loaded 4 positions, added 4 actions (Marco Jacobo TX pattern: Active + Separation + TEMP on 1115135 + 1 Pending on 50001). Header reads `Actions 4 / 0 priced · 4 unpriced / Active 1 / Separations 1 / Pending 1 / TEMP 1 / Unfunded 0`. Each populated section shows the diagnostic chip. Multi-action disclosure surfaces the 1115135 case.

#### [PR (this docs PR)](https://github.com/alkprojects/kospos/pulls) — Phase 2.2.e close audit + S28 handoff

Audit doc at [`docs/audits/phase-2-2-e-close-audit.md`](audits/phase-2-2-e-close-audit.md) + this handoff + the S28 SESSION_LOG entry.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): one new acknowledgment this session (AskUserQuestion: A/B/C → A — Staffing Plan). The 5 restated questions + 12 reasonable-default calls + 1 open action item all carry forward unchanged.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (5)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 (TX rules — 4 sub-questions) still gates Phase 2.2.19 `views/temp-limits/`** — if Alex picks that as 2.2.f or later, the 4 TODOs need answers up front.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules — still gates Phase 2.2.19 `views/temp-limits/`.** Four follow-up rules need confirmation before the TX typed entity can ship:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

Same as Session 27; nothing acknowledged this session. Verbatim copies retained.

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?** (Most important: `Position =/= Budget` — does it mean "employee's effective job code differs from position's budgeted job code", or something else?)

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain. I haven't inspected the CI formula yet to confirm.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip with one-click jump-to-fix; annualized rows switched from pure-PP to COLA-aware per [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md). **Confirm both?** Note: the chip itself shipped this session (PR #80); the "jump-to-fix" affordance + the COLA-aware rule both shipped at the same time. Confirmation now mostly cosmetic — does the chip + diagnostic placement match your expectation?

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else? Belongs in `appointment-types.md`.

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)? Currently positioned as draft. What class set counts as "leadership/strategic" — MCCP + selected senior PCS, or broader?

#### Open action items (1 — remaining after S21 acknowledgments)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null**. Per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), "no RTF" is not always accurate in practice — the position may have had an incumbent in the past (a "vice" history), meaning an RTF *must* have been filed historically. **Disposition needed per position: data bug vs intentional hold.** Now that the Hiring Plan workspace surface ships in dev mode, these 5 positions can also be added as Pending rows (with a hold-reason note) once Alex confirms the disposition.

#### New surfaced for Alex (from this session)

18. **`holdReason` enum narrowing.** PR #80 carries `holdReason` as a free string. The v2 surface (per-action detail editor with full CostInput) is the right moment to narrow this to an enum. **Need from you:** the curated list of distinct holdReason values from the workbook. Observed candidates: `Hold per Jimmy`, `Hold per Mary`, `Hold per Matt`, `Hold per David`, `Pending CPC`, `Pending merge`, `Transferring to CPC`, `TPV to PCS`, `E2P`, `CSC hold`. Which of these are categorical vs free-text? Other values not on this list? Confirm before the v2 detail editor PR.

19. **Status-workflow transitions.** The HiringStatus enum exists on PlannedAction (`not-started → posted → list → exam → interviews → offer → final → finished` + `csc-hold` as any-state branch). v1 lets the user set status only at add-time. The v2 detail editor needs to expose transitions — but should they be free (any status → any status) or guarded (only forward transitions + csc-hold ↔ final back-and-forth)? Tab 24 § Improvement #4 sketched a state machine; **default to guarded** with a "force-override" affordance when Alex can confirm.

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.e close audit](audits/phase-2-2-e-close-audit.md):

A. ~~Stale post-merge worktrees.~~ **Stays dropped.** 8 consecutive PRs auto-archived (PR #71, #73, #74, #75, #76, #78, #79, #80). Any stale worktree in S29+ is a regression.

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** File at **2,572 lines** (was 2,510; +62 from S27 entry). Past 2,000-line trim trigger; same ~62 lines/session drift rate. Bundleable with item C.

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** Count **17 instances** (was 15; regex re-measure, content unchanged). Single-purpose cleanup PR; ~30 min. Bundleable with item B.

D. **Defer the `labor-report.md` split until Phase 2.4.** File still 8,518 lines.

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 5th event-based trigger fired on schedule this session. S29 prompt template (below) preserves the Step-0 trigger pattern.

### Top 3 findings to surface for Alex this session

1. **The Hiring Plan workspace is live in dev mode.** Visit `/kospos/?dev=1` → Load Reports → load a P&P → open Hiring Plan. Add a planned action (Position # + Type + optional Notes). The 5-section stack populates. The Marco Jacobo TX pattern works end-to-end: add 3 actions on the same position (Active + Separation + TEMP) and the multi-action disclosure block surfaces it explicitly.

2. **The `View payroll →` button now always shows when Payroll tab is available + OBI is loaded.** Positions with no matching OBI rows now have a drill-in path to verify — clicking the button scopes the Payroll tab to that position so you can see "0 of 1 in snapshot" rather than guessing whether the button's absence meant "no data" or "data exists but didn't join."

3. **Tab renamed Labor → Payroll.** Internal symbol/directory names (`LaborView`, `lib/views/labor/`) kept — pure label change.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle (dept-tree + obi-pnp full + views/positions) | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` — per-PP drill-down + Position Detail "View payroll →" | done 2026-05-27 |
| 2.2.d | `2.2.13` `bfm-eturn/` full — full 64-col importer + `lib/budget/` cube + Budget vs Actual on Position Detail | done 2026-05-26 |
| **2.2.e** | **`2.2.21` `staffing-plan/`** — PlannedAction entity + Hiring Plan workspace (devOnly) + UI fix PR #78 | **done 2026-05-26** |
| **2.2.f** | **Next sub-phase** — Alex's pick. Top candidates: `2.2.19` `views/temp-limits/` (gated on TX TODOs in Restated Q #5) or `2.2.20` `views/inactive/` (smallest) or v2 work on staffing-plan (per-action detail editor + status workflow + holdReason enum narrowing — gated on Q #18 + #19). | **NEXT** |
| 2.2.g-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the 39-col OBI shape + new ADR for the 64-col BFM eturn shape + new ADR for the `lib/staffing-plan/` no-upstream-source pattern — three queued together) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **The Hiring Plan tab works end-to-end.** Hit `/kospos/?dev=1`, load a P&P, open Hiring Plan, add a couple of planned actions for real positions. The 5-section stack should populate; the "X of Y priced ⚠" chip should appear; the Multi-action disclosure should surface any position with ≥2 actions.
- **The Payroll tab rename is live.** "Labor" → "Payroll" in the nav. The "View payroll →" button appears on Position Detail for both matching-OBI and no-match positions.
- **Worktree hygiene is self-managing.** 8 consecutive PRs auto-archived. Any stale worktree in S29+ is a regression.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.f).** Three recommended options below; see Recommendations.

### Recommendation for Phase 2.2.f

Three options worth surfacing, with trade-offs:

**Option A — `2.2.19` `lib/views/temp-limits/` + TemporaryExchange typed entity.** Tab 12 TEMP Limits — Cat 17/18 expiry alerts + 1040-hour gauge using the cube's `earningHours`. **Pros:** small focused sub-phase; immediately visible (red/yellow expiry banners + 1040-hour progress bars per Cat 16/17/18 temp); resolves the TX-entity question that's been carrying since S21. The cube's `earningHours` field is already there from PR #66; lib/cat1718/ exists for the expiry math; lib/staffing-plan/ is the natural neighbor for TX-as-Planned-Action. **Cons:** the 4 TX TODOs in Restated Question #5 need Alex confirmation up front before the typed entity ships — those are stop-the-world questions that can't be defaulted past.

**Option B — `2.2.20` `lib/views/inactive/`.** Tab 13 Inactive — pure query, no separate importer. Cross-references P&P (active employees) against BI Payroll (people paid in this FY) to surface "people who got paid but aren't in the active roster anymore" — typically separations + leaves. **Pros:** smallest focused sub-phase; fast win; no new entity layer; no gating questions. **Cons:** doesn't unblock any other sub-phase; the user-visible payoff is informational rather than actionable.

**Option C — staffing-plan v2 (per-action detail editor + status workflow + holdReason enum).** The v1 surface shipped this session is read + add-with-defaults + delete. v2 adds the per-action detail editor with full `CostInput` exposure (actions become priced), the status workflow with transition guards (Tab 24 § Improvement #4), and the holdReason enum narrowing (Tab 24 § Improvement #6). **Pros:** consumes the entity layer that PR #79 just shipped; user-visible payoff is "the workspace is actually usable for planning." **Cons:** **gated on Restated Q #18 (holdReason enum values) + Q #19 (status workflow transitions free vs guarded)** — those need Alex confirmation before the surface PR can be written.

**My pick: Option B** if Alex would rather close out the smallest remaining Tier-4 sub-phase first; **Option A** if Alex can answer the 4 TX TODOs upfront (Option A then unlocks a Tier-3 entity layer); **Option C** if Alex can answer Q #18 + Q #19 upfront (then the workspace becomes usable end-to-end). All three are viable; the gating items are what changes the recommendation.

## Next session prompt — Phase 2.2.f (Alex picks A, B, or C)

Paste this verbatim to start Session 29:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.f),
then ships it. Phase 2.2.e landed in 3 PRs: #78 (UI fix Labor→Payroll +
always-show View Payroll button), #79 (lib/staffing-plan/ entity layer),
#80 (Hiring Plan workspace surface, devOnly tab).

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 28 entry — Phase 2.2.e)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-2-e-close-audit.md (carry-forwards A-F)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph
  app/src/lib/staffing-plan/ (the new entity layer)
  app/src/lib/views/staffing-plan/StaffingPlanView.tsx (the workspace)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.f close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.e close audit fired in
S28. This session, the audit cadence check is only the Phase 2.2.f
close audit when 2.2.f ships. Don't re-audit 2.2.e.

DO fire the 2.2.f audit before this session ends. Use the Phase 2.2.e
close audit format; mirror the prior audit's table of carry-forwards.

==============================================================================
STEP 0.5 — Triage the S28 live-site bugs Alex flagged at session close
==============================================================================
Alex reported three bugs after Phase 2.2.e shipped. PR #82 fixed two of
them; one needs Alex's input + design work. Before picking 2.2.f,
RESOLVE these two:

  Bug 2 (Payroll scope to position 1106950 shows 0 rows) — Alex needs
  to open the live site (?dev=1 → Positions → 1106950 → View payroll)
  and report what the diagnostic chips show. The chips list nearby
  positionIdentifiers in the snapshot for the same 1106 prefix. The
  fix lands once we know which chip (if any) is "the real one":
    - whitespace variant ("1106950 ") → tighten normalizePositionKey
    - renumbered identifier ("1106950A" or "5106950") → alias map
    - position not in OBI at all → real no-pay case; no fix needed
  Use AskUserQuestion to surface this to Alex up front.

  Bug 3 (Pending/TEMP sections should default from data + manual
  override + Manual user changes section) — the design is sketched in
  SESSION_HANDOFF.md § "Three live-site bugs Alex flagged at session
  close — fix first in S29". Strong recommendation: fold this into
  Phase 2.2.f Option C (staffing-plan v2) scope and make C the
  recommended pick. This is the biggest user-visible gap on the
  workspace and gets the Hiring Plan from "blank slate" to "useful
  out of the box" — much higher payoff than Options A or B.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.f
==============================================================================
Use AskUserQuestion. Three options in SESSION_HANDOFF.md § "Recommendation
for Phase 2.2.f":

  A. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — Cat 17/18 expiry surfaces + 1040-hour gauges.
     GATING: the 4 TX TODOs in Restated Question #5 must be answered
     up front via AskUserQuestion before the typed entity ships.

  B. 2.2.20 lib/views/inactive/
     — smallest sub-phase, no importer expansion, fast win. Pure
     query view (active roster ⋈ paid-this-FY). No gating questions.

  C. (RECOMMENDED) staffing-plan v2 — per-action detail editor +
     status workflow + holdReason enum narrowing + **Bug 3 design
     (Pending/TEMP defaults from data + Manual user changes section)**.
     GATING: Restated Q #18 (holdReason enum values) + Q #19 (status
     workflow transitions free vs guarded) + new Q (Bug 3 design
     details) must be answered up front. This is the recommended pick
     because Bug 3 is the most-visible gap on the workspace.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.f (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick.

If A — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours,
      expiry alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready)
    - Tests + preview-MCP walkthrough

If B — views/inactive:
  Branch: feat/views-inactive
  Scope:
    - Add lib/views/inactive/ — query view that joins P&P (active
      roster) with BI Payroll (people paid this FY) and surfaces
      "paid but not in active roster" rows + separation/leave
      reasons inferred from the data
    - Add the tab to App.tsx (devOnly initially)
    - Tests

If C — staffing-plan v2 (RECOMMENDED — includes Bug 3 design):
  Branch: feat/staffing-plan-v2 (likely split into 2-3 PRs given scope)
  Scope:
    - Resolve Q #18 (holdReason enum) + Q #19 (status transitions) +
      Bug 3 design questions via AskUserQuestion at the start
    - Bug 3 design: derived defaults from data
        * Pending = vacant positions with no manual active/separation
        * TEMP = Cat 17/18 positions with no manual override
        * 'Manual user changes' section at bottom for derived-removed rows
        * Extend PlannedAction with source: 'manual' | 'derived' | 'derived-removed'
        * Render = (manual rows) ⊕ (derived rows) − (derived-removed rows)
        * derived-removed persists; derived is virtual (recomputed)
    - Narrow holdReason to a typed enum in lib/staffing-plan/types.ts
    - Add status-transition guard helper to lib/staffing-plan/build.ts
    - Build PlannedActionDetail.tsx — full CostInput exposure so
      actions become priced + status workflow UI + holdReason chip
      selector
    - Wire row-click on the section table → PlannedActionDetail
    - Tests + preview-MCP walkthrough
  Plus Bug 2 (positionIdentifier mismatch for 1106950):
    - Use Alex's diagnostic chip output from STEP 0.5 to pick the fix
    - Ship as a separate small PR before the v2 work begins

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - Strict one-sub-phase-per-PR.
  - npm test stays green (currently 263 / 263).
  - One PR per logical change; merge after CI passes; fast-forward main.
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - No bundling.
  - No tab walkthroughs. Phase 2.0 is closed.
  - No ADR amendments. Phase 2.4 (ADR-007 amendment + BFM eturn ADR
    + staffing-plan no-upstream-source ADR are queued together).
  - No tool / setting / hook changes unless surfaced by audit.
  - No promotion of Payroll / Hiring Plan / Temp Limits / Inactive to
    non-dev yet — wait until cross-tab nav has been used end-to-end on
    real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.f status + next-session prompt for Phase 2.2.g.
  - Re-ask the 5 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17) + 2 new restated questions (#18, #19).
    DROP items Alex acknowledges this session.
  - Carry-forward update on items A-F (A stays dropped, F working as
    designed).
  - Fire the Phase 2.2.f close audit (mirrors Phase 2.2.e audit format).

Recommended model: claude-sonnet-4-6 for Option B (smallest);
claude-opus-4-7 for Option A or C (large entity layers + UI).
Effort: low for B; medium-to-high for A or C.
````

### Recommended model (Phase 2.2.f)

`claude-sonnet-4-6` for Option B (smallest); `claude-opus-4-7` for Option A or C (entity layer + UI surface depth).

### Recommended effort (Phase 2.2.f)

`low` for Option B; `medium-to-high` for Option A or C.

### Surfaced UX/UI proposals carrying forward from S27

Same B-tier list from the S27 handoff — not yet shipped:

- **Phase lens switcher on Budget vs Actual card.** Phase-chip buttons next to "Board layer" to switch lens to Mayor / Committee / TechAdj.
- **Mobile responsive layout** on Position Detail's Budget vs Actual 3-stat row.
- **Snapshot date strip on Load Reports.** BFM / OBI / P&P asOf dates at a glance.
- **Positions list "as of" footer.** Per-source asOf badge under the stats summary.

C-tier (future features, not polish) from S27 also carry forward:

- **Sortable column headers on Positions list.**
- **Bulk-select positions for aggregate Budget vs Actual.**
- **`?labor=<positionId>` URL persistence for scope.**

---

## Pre-Session 28 status archived below

Original content from end-of-Session-27 handoff retained for reference.

---

## Current status (end of Session 27 — Phase 2.2.d bfm-eturn full + lib/budget/ + Budget vs Actual, 2026-05-26)

**Phase:** Phase 2.2.d — **`lib/importers/bfm-eturn/` brought to full + `lib/budget/` entity layer + Budget vs Actual mini-card on Position Detail ([PR #75](https://github.com/alkprojects/kospos/pull/75)).** Followed by a small UI polish PR [#76](https://github.com/alkprojects/kospos/pull/76) (hide zero-bucket Labor stats + tighten column nowrap on Labor + Positions tables). Phase 2.2.d close audit (PR — this one) caught Carry-forward Item A as **empirically RESOLVED** after 5 consecutive PRs auto-archived cleanly.
**Last main commit:** `abbf7a4` ([PR #76](https://github.com/alkprojects/kospos/pull/76) — polish) → `a1123a1` ([PR #75](https://github.com/alkprojects/kospos/pull/75) — Phase 2.2.d Option A) → `d784357` ([PR #74](https://github.com/alkprojects/kospos/pull/74) — S26 handoff) → `97e599a` ([PR #73](https://github.com/alkprojects/kospos/pull/73) — sticky header + three-state hints) → `ac52461` ([PR #72](https://github.com/alkprojects/kospos/pull/72) — S26 handoff initial)
**Tests:** 227 / 227 passing (210 baseline + 4 importer cases covering the full phase ladder + 13 budget entity cases). PR #76 added no tests — pure CSS tweaks.
**Branches in flight:** `chore/phase-2-2-d-close-audit-and-handoff` (this docs PR)
**Worktree hygiene:** auto-archive working across **5 consecutive PRs** (PR #71, #73, #74, #75, #76 all swept cleanly). Carry-forward Item A **empirically RESOLVED**; drops from carry-forward going forward. Treat any stale worktree in S28+ as a regression.

### What landed this session — three PRs

#### [PR #75](https://github.com/alkprojects/kospos/pull/75) — Phase 2.2.d sub-phase 2.2.13: bfm-eturn full + lib/budget/ + Budget vs Actual

The big PR. 13 files changed (+1,429 / −116).

| What | Where |
|---|---|
| **Importer expansion (sub-phase 2.2.13)** — `BfmPositionRow` now carries the full 64-column eturn shape per [labor-report.md § Tab 4](docs/domain/labor-report.md#tab-4--bfm-1510006-fy26). Identity (FormID / Position Code / Prior Budget Position Code), dept tree (Dept Grp / Division / Section + titles), chartfield titles (Fund / Authority / Project / Activity titles, Account Lvl 5 Title, Agency Use), job-class tier, emp-org title, action, and full date metadata (PPD Start / Fiscal Year End / PPD End). The importer no longer collapses to one `(fte, budgetedSalary)` pair — every phase layer (Original / Base / Department / Mayor / Committee / Technical Adjustment / Board) for every FY column band is preserved on `budgetByFy: Record<fyLabel, Partial<Record<phase, {fte, dollars}>>>`. The back-compat scalars expose the "default anchor" — latest FY × most-advanced *non-zero* phase per the precedence Board > TechAdj > Committee > Mayor > Department > Base > Original. | [app/src/lib/importers/types.ts](../app/src/lib/importers/types.ts) + [bfm-position.ts](../app/src/lib/importers/bfm-position.ts) |
| **`lib/budget/` entity layer (mirrors `lib/payroll/`)** — `BudgetSnapshot` keyed by `(fiscalYear, asOfDate, budgetPhase)` with a per-position cube. `PositionBudget` exposes the resolved scalar pair + the full `byPhase` layer set + chartfields, so a future Budget Pacing view can switch lenses ("Mayor view" vs "Board view") without re-importing. `computeBudgetVsActual` returns `{ budget, actual, variance, variancePct, direction }` with a `null` variancePct guard for budget=0. `asOfDate` comes from `useAppStore.lastBfmImportAt` (stamped at import-time) because BFM eturns don't carry a natural per-row snapshot date the way OBI rows do (via `_asOfDate = MAX(earningPeriodEnd)`). | [app/src/lib/budget/](../app/src/lib/budget/) |
| **Position Detail "Budget vs Actual" mini-card** — replaces the bare Posting Chartfields panel with a 3-stat row (Budget / YTD Actual / Variance) plus a chartfield strip (Fund / Authority / Project / Activity with both code and title). Variance direction colored: green under, yellow on-track, red over. Neutral gray when actuals are missing entirely (avoids misleading "this is under budget" cue on a zero-YTD position). Arrow glyph (▲▼◆) matches direction; omitted when actuals null. Phase label appears next to the title ("Board layer" by default). BFM and OBI asOf dates show on their respective cells. Honors the three-state hint pattern from PR #73. | [PositionDetail.tsx](../app/src/lib/views/positions/PositionDetail.tsx) + [PositionsView.tsx](../app/src/lib/views/positions/PositionsView.tsx) |
| **Dev-only `window.__kospos` hook** — `{ store, addRows, clearAll }` exposed when devMode is active for preview-MCP harnesses + ad-hoc browser-console debugging. Cleared in lockstep with devMode toggle. | [App.tsx](../app/src/App.tsx) |
| **Store: `lastBfmImportAt`** — addRows stamps `new Date().toISOString().slice(0,10)` when any new rows are bfm-position. Cleared by `clearAll`. | [store.ts](../app/src/lib/store.ts) |

**Verification (preview-MCP, synthetic data via the new `window.__kospos.addRows` harness):**
- Position 50001 (P&P + BFM + OBI): Budget $100k / YTD $24.9k / ▼ −$75,100 (−75.1%) green variance + full chartfield strip ✓
- Position 50002 (P&P + BFM, no OBI): Budget $80k / YTD — / VARIANCE — neutral gray, no arrow ✓
- Position 50003 (P&P only): "No BFM Position eturn row matched position 50003…" hint ✓
- Position 50004 (P&P + OBI, no BFM): same hint, YTD Payroll bucket breakdown still renders ✓
- No console errors. YTD Payroll 5-bucket section (PR #66) untouched.

#### [PR #76](https://github.com/alkprojects/kospos/pull/76) — UI polish (zero-bucket hide + column nowrap)

Three clear-cut polish wins surfaced during the Phase 2.2.d preview-MCP walkthrough. 2 files changed (+16 / −10).

- **Labor aggregates header: hide $0 special-class bucket stats.** Matches the YTD Payroll card pattern (PR #66). Total + Regular always shown; OT / RPO / Prem / Temp LSP appear only when non-zero. Reduces noise on scoped views with no overtime / no RPO.
- **Labor row table — PPE / Account / Fund columns: `whiteSpace: nowrap`.** "2026-05-08", "Overtime - Scheduled Misc", and "10190 SR BIF Operating" now render on one line each. Table picks up horizontal scroll on narrow viewports (overflowX wrapper already present).
- **Positions list — Description + Effective Dept cells nowrap.** "Building Inspector" and "229235 CPC Current Planning" no longer wrap. Same horizontal-scroll tradeoff.

#### [PR (this one)](https://github.com/alkprojects/kospos/pulls) — Phase 2.2.d close audit + S27 handoff

This PR — the audit doc at [`docs/audits/phase-2-2-d-close-audit.md`](audits/phase-2-2-d-close-audit.md) + the S27 handoff + S27 SESSION_LOG.md entry.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): no new acknowledgments this session (autonomous-mode session per Alex's 18-hour-away note; Alex confirmed Option A as the recommended default by saying "do as much as you can without me"). The 5 restated questions + 12 reasonable-default calls + 1 open action item all carry forward unchanged.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (5)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 (TX rules — 4 sub-questions) gates Phase 2.2.19 `views/temp-limits/`** — if Alex picks that as 2.2.e or later, the 4 TODOs need answers up front.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules.** Session 21 surfaced the TX concept via Alex's Marco Jacobo worked example, but four follow-up rules need confirmation before the `lib/views/temp-limits/` sub-phase can model TX as a typed entity:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?** (Most important: `Position =/= Budget` — does it mean "employee's effective job code differs from position's budgeted job code", or something else?)

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain. I haven't inspected the CI formula yet to confirm.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip with one-click jump-to-fix; annualized rows switched from pure-PP to COLA-aware per [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md). **Confirm both?**

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else? Belongs in `appointment-types.md`.

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)? Currently positioned as draft. What class set counts as "leadership/strategic" — MCCP + selected senior PCS, or broader?

#### Open action items (1 — remaining after S21 acknowledgments)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null** — meaning the workbook claims no Request to Fill has ever been filed. **But** per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), you flagged that "no RTF" is not always accurate in practice — the position may have had an incumbent in the past (i.e., a "vice" history), which would mean an RTF *must* have been filed at some point. **Disposition needed per position: data bug vs intentional hold.** (Note: PR #68 dropped the catalog flag `vacant-no-rtf`; the surviving "data-bug" axis is the `rtf-data-integrity-suspected` flag — vacant + has-prior-incumbent + no RTF. Whether to ship that detector is part of the action item.)

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.d close audit](audits/phase-2-2-d-close-audit.md):

A. ~~Stale post-merge worktrees.~~ **Empirically RESOLVED.** Auto-archive caught 5 consecutive PRs (PR #71, #73, #74, #75, #76). Drops from carry-forward going forward. If a stale worktree appears in S28+, treat as a regression.

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** File at **2,510 lines** (was 2,445; +65 from S26 entry). Past 2,000-line trim trigger; ~65-150 lines added per session — slow but compounding drift. Bundleable with item C (~1.5 hours combined). Priority unchanged: "schedule when capacity allows."

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** Count **15 instances** (was 17; 2 swept incidentally in S26 PR #70 docs sync). Single-purpose cleanup PR; ~30 min. Bundleable with item B.

D. **Defer the `labor-report.md` split until Phase 2.4.** File still 8,518 lines (unchanged).

E. ~~Phase 2.2 first sub-phase pick.~~ Resolved S24; **stays dropped**.

F. **Audit cadence — working as designed.** 4th event-based trigger fired on schedule this session. The S27 prompt template's Step-0 trigger pattern (drafted at the end of S26) is self-reinforcing. S28 prompt template (below) preserves it.

### Top 3 findings to surface for Alex this session

1. **The Budget vs Actual mini-card is live in dev mode.** Visit `/kospos/?dev=1` → Load Reports, load a P&P + BI Payroll + BFM Position eturn — then open Positions → any row. The chartfields panel is now a 3-stat row (Budget / YTD Actual / Variance) with a Fund / Authority / Project / Activity strip below. The "Board layer" tag next to the section title shows which phase the variance is computed against. Out-of-budget positions get a red ▲ chip; well-under shows green ▼; on-budget shows yellow ◆.

2. **The full BFM eturn shape is now imported.** `BfmPositionRow` carries all 64 columns including every phase layer (Original / Base / Department / Mayor / Committee / Technical Adjustment / Board) for every FY band on the sheet. The `lib/budget/` cube exposes the full layer set on each position so a future Budget Pacing view can switch lenses ("Mayor view" vs "Board view") without re-importing.

3. **5 consecutive auto-archived PRs.** Worktree hygiene is now self-managing — Item A drops from the carry-forward list. If a stale worktree appears in S28+, surface as a regression.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle (dept-tree + obi-pnp full + views/positions) | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| 2.2.c | `2.2.17` `views/labor/` — per-PP drill-down + Position Detail "View payroll →" | done 2026-05-27 |
| **2.2.d** | **`2.2.13` `bfm-eturn/` full** — full 64-col importer + `lib/budget/` cube + Budget vs Actual on Position Detail | **done 2026-05-26** |
| **2.2.e** | **Next sub-phase** — Alex's pick. Top candidates: `2.2.19` `views/temp-limits/` (now best-positioned — its 4 TX TODOs are the only remaining gate on shipping it, and `lib/budget/` no longer competes), or `2.2.20` `views/inactive/` (smallest), or `2.2.21` `staffing-plan/` (large but now fully unblocked — Position + Budget + Payroll all shipped). | **NEXT** |
| 2.2.f-n | Remaining Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the 39-col OBI shape **+ new ADR for the 64-col BFM eturn shape** — both queued together) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **The Budget vs Actual surface works end-to-end.** Hit `/kospos/?dev=1`, load a P&P + BI Payroll + BFM Position eturn, open Positions → any row → see the variance card with the chartfield strip below.
- **The phase layers are preserved.** `window.__kospos.store.getState().loadedRows.filter(r => r._source === 'bfm-position')[0].budgetByFy` from the browser console returns the full per-phase map. (Useful for spot-checks; not user-facing yet.)
- **Worktree hygiene is self-managing.** `git worktree list` should show just the main worktree post-merge.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.e).** Three recommended options below; see Recommendations.

### Recommendation for Phase 2.2.e

Three options worth surfacing, with trade-offs:

**Option A (recommended) — `2.2.21` `lib/staffing-plan/`.** The Tab 24 Staffing Plan workspace — KosPos's primary forward-looking surface. **All three dependencies are now shipped** (Position spine 2.2.16, Payroll cube 2.2.b, Budget cube 2.2.d). The sub-phase models PlannedAction (with TX cases per Marco Jacobo worked example), status workflow, cost calculator integration, and the multi-action-per-position pattern. **Pros:** architecturally the most significant Tier-4 sub-phase; consumes everything 2.2.a/b/c/d shipped; the user-visible payoff is the "forward-looking workspace" KosPos's spec exists to enable. **Cons:** large — comparable to 2.2.d in size, possibly larger; might warrant a two-PR split (PlannedAction entity + cost integration in one, the surface + status workflow in the second).

**Option B — `2.2.19` `lib/views/temp-limits/` + TemporaryExchange typed entity.** Tab 12 TEMP Limits — Cat 17/18 expiry alerts + 1040-hour gauge using the cube's `earningHours`. **Pros:** small focused sub-phase; immediately visible (red/yellow expiry banners + 1040-hour progress bars per Cat 16/17/18 temp); resolves the TX-entity question. **Cons:** the 4 TX TODOs in Restated Question #5 need Alex confirmation up front before the typed entity ships — those are stop-the-world questions that can't be defaulted past. (Alex is back from his 18-hour-away window before the session starts — he can answer the 4 TODOs upfront via AskUserQuestion.)

**Option C — `2.2.20` `lib/views/inactive/`.** Tab 13 Inactive — pure query, no separate importer. Cross-references P&P (active employees) against BI Payroll (people paid in this FY) to surface "people who got paid but aren't in the active roster anymore" — typically separations + leaves. **Pros:** smallest focused sub-phase; fast win; no new entity layer. **Cons:** doesn't unblock any other sub-phase; the user-visible payoff is informational ("here are 7 names that don't fully reconcile") rather than actionable. Worth doing eventually; less impactful than A or B.

**My pick: Option A** because `lib/staffing-plan/` is the architecturally heaviest Tier-4 sub-phase and its three dependencies (Position spine, Payroll cube, Budget cube) all shipped in 2.2.a/b/c/d. Shipping it now consumes the spine layer's full investment. Option B is the strong second if Alex would rather close the TX TODOs first and ship a smaller surface; Option C is right only if the session needs to be unusually small.

## Next session prompt — Phase 2.2.e (Alex picks A, B, or C)

Paste this verbatim to start Session 28:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.e),
then ships it. Phase 2.2.d landed in PR #75 — lib/importers/bfm-eturn/
is now full + lib/budget/ exposes a per-position cube split into full
phase layers; Position Detail's chartfields panel became a Budget vs
Actual mini-card. Polish PR #76 hid zero-bucket Labor stats + tightened
Labor/Positions column nowrap.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — has the recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 27 entry — Phase 2.2.d bfm-eturn full)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-2-d-close-audit.md (carry-forwards A-F status;
    A now permanently RESOLVED, E stays dropped, F working as designed)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph
  app/src/lib/budget/ (the BudgetSnapshot + cube that just landed)
  app/src/lib/views/positions/PositionDetail.tsx (the Budget vs Actual
    surface — note the three-state pattern)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.e close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.d close audit was fired
in S27. This session, the audit cadence check is **only the Phase 2.2.e
close audit** when 2.2.e ships. Don't re-audit 2.2.d.

DO fire the 2.2.e audit before this session ends. Use the Phase 2.1
close audit format; mirror the prior audit's table of carry-forwards.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.e
==============================================================================
Use AskUserQuestion. Three recommended options with trade-offs are in
SESSION_HANDOFF.md § "Recommendation for Phase 2.2.e":

  A. (recommended) 2.2.21 lib/staffing-plan/
     — Tab 24 Staffing Plan workspace. All three dependencies (Position
     spine + Payroll cube + Budget cube) now shipped, so this is the
     architecturally heaviest Tier-4 sub-phase that's ready to ship.
     Comparable to 2.2.d in size, possibly larger — consider a
     two-PR split (PlannedAction entity + cost integration; then
     surface + status workflow).

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — focused, immediately visible (Cat 17/18 expiry surfaces +
     1040-hour gauges). **GATING:** the 4 TX TODOs in Restated
     Question #5 must be answered up front via AskUserQuestion before
     the typed entity schema can ship.

  C. 2.2.20 lib/views/inactive/
     — smallest sub-phase, no importer expansion, fast win. Pure
     query view (active roster ⋈ paid-this-FY).

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.e (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick.

If A — lib/staffing-plan/:
  Branch: feat/staffing-plan
  Scope (consider splitting into 2 PRs):
    PR 1 (entity):
      - lib/staffing-plan/ — PlannedAction typed entity per Tab 24 § PlannedAction model
      - Status workflow: planned → in-progress → completed (with rumored / confirmed / paperwork-filed sub-states for separations)
      - Multi-action-per-position pattern (Marco Jacobo TX example)
      - Cost calculator integration: each PlannedAction has expected_cost using lib/cost.ts (COLA-aware per memory feedback_projections_always_cola_aware.md)
      - Tests
    PR 2 (surface):
      - lib/views/staffing-plan/ — Tab 24 surface (Active / Separations / Pending / Temp / Unfunded row types per memory staffing_plan_types.md)
      - PR 1's "X of Y priced ⚠" diagnostic chip (per restated Q #12 default)
      - Add the tab to App.tsx (devOnly initially)
      - Tests + preview-MCP walkthrough

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5 in this file's carry-forwards) — Alex is back
      from his away-window and can answer in real time.
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours,
      expiry alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready, then promoted)
    - Tests

If C — views/inactive:
  Branch: feat/views-inactive
  Scope:
    - Add lib/views/inactive/ — query view that joins P&P (active
      roster) with BI Payroll (people paid this FY) and surfaces
      "paid but not in active roster" rows + separation/leave
      reasons inferred from the data
    - Add the tab to App.tsx (devOnly initially)
    - Tests

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **Strict one-sub-phase-per-PR** (continued from 2.2.b/c/d). Option A
    may justify a 2-PR split per the scope above.
  - **`npm test` stays green** (currently 227 / 227).
  - One PR per logical change; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - **No bundling** outside the explicit 2-PR split for Option A.
  - **No tab walkthroughs.** Phase 2.0 is closed.
  - **No ADR amendments.** Phase 2.4 (ADR-007 amendment for the 39-col
    OBI shape + new ADR for the 64-col BFM eturn shape are queued
    together there).
  - **No tool / setting / hook changes** unless surfaced by audit.
  - **No promotion of Labor / Staffing Plan / Temp Limits / Inactive to
    non-dev yet** — wait until the cross-tab nav workflow has been used
    end-to-end on real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.e status + next-session prompt for Phase 2.2.f.
  - Re-ask the 5 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17). DROP items Alex acknowledges this
    session (per memory feedback_dont_reremind.md).
  - Carry-forward update on items A-F (A stays dropped, F working as designed).
  - Fire the Phase 2.2.e close audit (mirrors Phase 2.1 audit format).

If a Phase 2.2 sub-phase reveals an architectural question that needs
ADR treatment, elevate during the session rather than carrying forward
(per CLAUDE.md non-negotiable #7).

Recommended model: claude-opus-4-7 for Option A (large entity layer +
surface, mirrors 2.2.d's reasoning depth); claude-sonnet-4-6 for
Options B or C.
Effort: high for Option A (justifying the 2-PR split); medium for B or C.
````

### Recommended model (Phase 2.2.e)

`claude-opus-4-7` for Option A (large entity layer + surface, mirrors
2.2.d's reasoning depth); `claude-sonnet-4-6` for Options B or C.

### Recommended effort (Phase 2.2.e)

`high` for Option A (large enough to warrant a 2-PR split); `medium`
for Options B or C.

### Surfaced UX/UI proposals from this session (autonomous-mode follow-ups)

During the autonomous Phase 2.2.d session, I walked every tab and
flagged polish opportunities. Three landed in [PR #76](https://github.com/alkprojects/kospos/pull/76)
(hide zero-bucket Labor stats; nowrap Labor PPE/Account/Fund columns;
nowrap Positions Description/Effective Dept). The following are larger
or judgment-calls — surfaced for Alex's review:

**B-tier (worth doing in a future polish PR if Alex agrees):**

- **Phase lens switcher on Budget vs Actual card.** Currently shows
  the consensus phase (Board). Could add small phase-chip buttons next
  to "Board layer" — clicking "Mayor" would re-render the variance
  against the Mayor layer. Useful for variance analysis ("what changed
  Mayor → Board?"). Needs a small lens-state hook + the chip UI; ~1
  hour. Not shipping in 2.2.d because it adds a new affordance type.

- **Mobile responsive layout on Position Detail's Budget vs Actual
  3-stat row.** At 375px viewport the variance value wraps awkwardly
  ("▼ −" then "$75,100" on next line). Could collapse to a single
  vertical stack at narrow widths. The desktop layout is the primary
  surface (KosPos users are department admins on desktop), so deferred.

- **Snapshot date strip on Load Reports.** Currently shows row counts
  per source but no "asOf" dates. A small strip like "BFM imported
  2026-05-26 · OBI snapshot 2026-05-08 · P&P snapshot 2026-05-20"
  would surface data freshness at a glance.

- **Positions list — "as of" footer.** Add a one-line footer under the
  stats summary: "Sources: BFM asOf YYYY-MM-DD · OBI asOf YYYY-MM-DD ·
  P&P asOf YYYY-MM-DD". Mirrors the per-row footer already on Position
  Detail.

**C-tier (future features, not polish):**

- **Sortable column headers on Positions list.** Click on column to
  sort ascending/descending. Currently fixed-order.
- **Bulk-select positions for aggregate Budget vs Actual.** Pick N
  positions in the list, see their combined budget / actual / variance
  in a footer panel. Useful for "this dept" / "this section"
  variance views.
- **`?labor=<positionId>` URL persistence for scope.** Currently
  in-memory; would let users share a scoped Labor view via URL.

The B-tier items would be a small polish PR (~2-3 hours total). Worth
running by Alex before committing.

---

## Pre-Session 27 status archived below

Original content from end-of-Session-26 handoff retained for reference.

---

## Current status (end of Session 26 — Phase 2.2.c views/labor/, 2026-05-27)

**Phase:** Phase 2.2.c — **`lib/views/labor/` per-PP drill-down shipped + post-deploy UI fixes ([PR #73](https://github.com/alkprojects/kospos/pull/73)).** The Tab 7 BI Payroll drill-down sub-phase 2.2.17 sits on top of the rollup cube PR #66 added; Position Detail gains a "View payroll →" button that scopes the Labor view to that position and switches tabs. Audit cadence caught up: Phase 2.2.b close audit was bundled with 2.2.c into [PR #70](https://github.com/alkprojects/kospos/pull/70). Two post-deploy bugs Alex flagged on the live site (header scrolled out of view while scrolling; YTD/BFM hints conflated "no data loaded" with "no data for this position") fixed in PR #73.
**Last main commit:** `97e599a` ([PR #73](https://github.com/alkprojects/kospos/pull/73) — sticky header + three-state YTD/BFM hints) → `ac52461` ([PR #72](https://github.com/alkprojects/kospos/pull/72) — S26 handoff) → `35daba2` ([PR #71](https://github.com/alkprojects/kospos/pull/71) — Phase 2.2.c views/labor) → `e0c659b` ([PR #70](https://github.com/alkprojects/kospos/pull/70) — combined 2.2.b+c close audit + PR #68 docs sync) → `2755559` ([PR #69](https://github.com/alkprojects/kospos/pull/69) — S25 handoff reflect)
**Tests:** 210 / 210 passing (199 baseline + 11 new labor view tests covering filter math single-axis + combined + zero-strip normalization, aggregate math, bucketOf routing, distinctValues helper). PR #73 added no tests — the new conditional copy is rendered text, not logic that benefits from coverage.
**Branches in flight:** none post-merge (this small docs sync PR is the only one open)
**Worktree hygiene:** Auto-archive is now working as designed — `git worktree list` after PR #73's merge shows only the main worktree. The `vibrant-margulis-960939` worktree flagged in the combined audit was swept (the worktree directory was deleted between PR #72's merge and PR #73's session). Item A in the carry-forward is now empirically RESOLVED (auto-archive caught both PR #71 and PR #73 worktrees post-merge). If a stale worktree shows up in S27, treat it as a regression and surface it.

### What landed this session — four PRs

#### [PR #70](https://github.com/alkprojects/kospos/pull/70) — Combined Phase 2.2.b + 2.2.c close audit + PR #68 docs sync

Step 0 of the S26 prompt. The Phase 2.2.b close audit was owed in S25 per [WORKFLOW.md § Audit cadence](WORKFLOW.md) but wasn't run; combined here with the Phase 2.2.c close audit, fired pre-pick so it's grounded in pre-2.2.c state. Audit doc at [`docs/audits/phase-2-2-b-and-c-close-audit.md`](audits/phase-2-2-b-and-c-close-audit.md). 3 files changed (+334 / −5).

| Status | Item |
|---|---|
| **Carry-forward A** | Stale worktrees 5 → 1 (auto-archive enabled S25 caught most; 1 slipped through) — surface for manual sweep + monitor |
| **Carry-forward B** | SESSION_LOG.md 2,295 → 2,445 lines (still past trigger; trim deferred) |
| **Carry-forward C** | Citation anti-pattern count revised 25 → 17 (regex methodology, not content) |
| **Carry-forward D** | labor-report.md 8,518 lines unchanged — defer-to-Phase-2.4 holds |
| **Carry-forward E** | Phase 2.2 first sub-phase pick — resolved S24 — **dropped from carry-forward** |
| **Carry-forward F** | Audit cadence: one slip (S25), caught up this session; S27 prompt template preserves the Step-0 audit trigger pattern |
| **In-session fix** | PR #68 docs sync — labor-report.md row 8475 + scenario-tests.md Scenario 5 both still referenced the dropped QR-002 vacant-no-rtf rule; both reconciled to match merged behavior |

#### [PR #71](https://github.com/alkprojects/kospos/pull/71) — Phase 2.2.c lib/views/labor/

The Tab 7 BI Payroll drill-down. 8 files changed (+837 / −5). Single-sub-phase PR per the "strict one-PR-per-sub-phase" rule continued from 2.2.b.

| What | Where |
|---|---|
| **`lib/views/labor/aggregate.ts`** — pure filter + 5-bucket aggregate math. Filters on positionId (with zero-strip normalization), earnings code, account description, PPE range. Aggregates compute rowCount / total / per-bucket / totalHours from any filtered subset. | [app/src/lib/views/labor/aggregate.ts](../app/src/lib/views/labor/aggregate.ts) |
| **`lib/views/labor/scope-store.ts`** — tiny Zustand store holding the currently-scoped position id. Set by Position Detail's "View payroll" button; cleared by the Labor view's "Clear scope" button. | [scope-store.ts](../app/src/lib/views/labor/scope-store.ts) |
| **`LaborView.tsx`** — per Tab 7 § KosPos UI sketch #2: quick-aggregates header (Rows / Total / 5 buckets / Hours / asOf), filter row (earnings code / account / PPE range), per-row table (PPE × Position × Earn × Description × Account × Fund × Hours × Amount × bucket badge), row-click opens the "Trace to source" modal showing all 40 source fields. | [LaborView.tsx](../app/src/lib/views/labor/LaborView.tsx) |
| **Position Detail "View payroll →" button** on the YTD Payroll card. Sets the scope and fires the App-level tab switch. Gated on the parent providing `onViewPayroll` so the button is hidden when the Labor tab isn't currently visible. | [PositionDetail.tsx](../app/src/lib/views/positions/PositionDetail.tsx) + [PositionsView.tsx](../app/src/lib/views/positions/PositionsView.tsx) |
| **App.tsx new "Labor" tab** — devOnly initially per the prompt; promote to non-dev once the workflow stabilizes. | [App.tsx](../app/src/App.tsx) |

**Verification (preview-MCP, synthetic data):** Unscoped view (20 OBI rows, 2 positions × 3 PPEs × 3 buckets each + 1 RPO + 1 LSP) shows $31,200 / $27,000 reg / $1,200 OT / $1,200 RPO / $900 prm / $900 LSP / 658 hrs / asOf 2026-05-22 ✓. Scoped to position `50001` via "View payroll →": 9 of 20 / $14,550 (= 3 PPE × $4,850) / $13,500 reg / $600 OT / $450 prm ✓. Filter (OTP) + scope: 3 rows / $600 OT / 9 hrs ✓. Trace modal: all 40 fields render correctly. Clear scope returns to all-positions; reset filters wipes filter chips. No console errors/warnings.

#### [PR #72](https://github.com/alkprojects/kospos/pull/72) — Session 26 handoff (initial)

Initial closeout doc reflecting PRs #70 + #71; superseded by this update (which also reflects PR #73).

#### [PR #73](https://github.com/alkprojects/kospos/pull/73) — Sticky nav header + three-state YTD/BFM hints on Position Detail

Post-deploy follow-up after Alex spot-checked the live `/kospos/` and flagged two UI bugs on Position Detail. 3 files changed (+69 / −9).

- **Bug 1 — Header scrolled out of view.** The KosPos nav header wasn't sticky. Long Position Detail modals or scrolled lists pushed the tabs off-screen so they weren't reachable mid-scroll. Fix: `position: sticky; top: 0; z-index: 10` on `.site-header`. The dev-mode banner above stays in normal flow (scrolls away naturally); the header docks at the top of the viewport once the banner is past.
- **Bug 2 — "Load a BI Payroll export…" hint shown when data was loaded.** The YTD Payroll section had a binary state — either render the breakdown, or render the "Load…" hint. The second branch fired in two indistinguishable cases: (a) BI Payroll genuinely not loaded, OR (b) BI Payroll loaded but no rows for this specific position (vacant, brand-new, no FY-to-date activity). Same bug on the Posting Chartfields hint for BFM. Fix: thread `obiLoaded` + `bfmLoaded` global flags from `PositionsView` to `PositionDetail`; render three-state copy per panel: matched rows → data card; source loaded but no rows for this position → "No BI Payroll activity recorded for position X in the loaded snapshot…"; source not loaded → "Load a …" (existing copy).
- **Bonus:** the bottom Sources line now surfaces `obi` when OBI is loaded anywhere in the app, not only when it joined to this position. The footer honestly reflects "what's loaded" vs "what joined here".

**Verification:** 210/210 tests still pass (the change is conditional rendered text, not logic that benefits from coverage); `npm run build` clean; preview-MCP confirmed: (a) header computed `position: sticky / top: 0 / z-index: 10`; at scrollY=1500 with a 3000px spacer, `header.getBoundingClientRect().top === 0` with banner off-screen above ✓ (b) synthetic 2-position data (one with OBI rows, one without) — the without-rows position now shows "No BI Payroll activity recorded for position 70002 in the loaded snapshot…" with the asOf badge; Sources line shows `hcm + obi` ✓.

#### [PR (this one)](https://github.com/alkprojects/kospos/pulls) — S26 handoff reflect PR #73

Small docs sync reflecting the post-deploy fix PR into the S26 handoff doc.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos--memory/feedback_dont_reremind.md): no new acknowledgments this session beyond the AskUserQuestion answer (Option A — views/labor/). The 5 restated questions + 12 reasonable-default calls + 1 open action item all carry forward unchanged.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (5)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 (TX rules — 4 sub-questions) gates Phase 2.2.19 `views/temp-limits/`** — if Alex picks that as 2.2.d, the 4 TODOs need answers up front.

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules.** Session 21 surfaced the TX concept via Alex's Marco Jacobo worked example, but four follow-up rules need confirmation before the `lib/views/temp-limits/` sub-phase can model TX as a typed entity:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?** (Most important: `Position =/= Budget` — does it mean "employee's effective job code differs from position's budgeted job code", or something else?)

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain. I haven't inspected the CI formula yet to confirm.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip with one-click jump-to-fix; annualized rows switched from pure-PP to COLA-aware per [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos--memory/feedback_projections_always_cola_aware.md). **Confirm both?**

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else? Belongs in `appointment-types.md`.

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)? Currently positioned as draft. What class set counts as "leadership/strategic" — MCCP + selected senior PCS, or broader?

#### Open action items (1 — remaining after S21 acknowledgments)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null** — meaning the workbook claims no Request to Fill has ever been filed. **But** per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos--memory/staffing_plan_types.md), you flagged that "no RTF" is not always accurate in practice — the position may have had an incumbent in the past (i.e., a "vice" history), which would mean an RTF *must* have been filed at some point. **Disposition needed per position: data bug vs intentional hold.** (Note: PR #68 dropped the catalog flag `vacant-no-rtf`; the surviving "data-bug" axis is the `rtf-data-integrity-suspected` flag — vacant + has-prior-incumbent + no RTF. Whether to ship that detector is part of the action item.)

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.2.b+c combined close audit](audits/phase-2-2-b-and-c-close-audit.md):

A. **Stale post-merge worktrees — empirically RESOLVED.** Auto-archive now confirmed working: `git worktree list` after PR #73's merge shows only the main worktree. PR #71's worktree (`clever-elion-0c5678`) and PR #73's worktree both auto-archived post-merge without manual intervention. The `vibrant-margulis-960939` worktree previously flagged was also cleaned up. **Treat any stale worktree appearing in S27 as a regression** and surface it; otherwise this item drops from carry-forward in the next audit.

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** File at 2,445 lines (+150 from S25); past the 2,000-line trim trigger. Bundleable with item C (~1.5 hours combined). Priority unchanged: "schedule when capacity allows."

C. **Migrate the memory-file citation anti-pattern in `labor-report.md`.** Count revised 25 → 17 (regex methodology, not content). Single-purpose cleanup PR; ~30 min. Bundleable with item B.

D. **Defer the `labor-report.md` split until Phase 2.4.** File still 8,518 lines (unchanged).

E. ~~Phase 2.2 first sub-phase pick.~~ **Resolved S24; dropped from carry-forward list.**

F. **Audit cadence — working with one slip.** Phase 2.2.b close audit was missed in S25, caught up in S26 (combined with 2.2.c). The S27 next-session prompt template (below) preserves the explicit Step-0 audit trigger pattern so this doesn't slip again.

### Top 3 findings to surface for Alex this session

1. **The Labor tab is live in dev mode.** Visit `/kospos/?dev=1` and you'll see Calculator | Positions | **Labor** | Load Reports | Special Class. Load a P&P + BI Payroll via Load Reports, then click Labor to see the per-PP table + aggregates header. Click any row to see all 40 source fields (the "Trace to source" affordance). Click Positions → any row → YTD Payroll card → "View payroll →" to jump to the Labor view scoped to that position.

2. **The cube is now visible.** Phase 2.2.b shipped the rollup math; Phase 2.2.c makes it auditable. From any aggregate number on Position Detail (or eventually OPS / Staffing Plan), the user can trace down to the underlying OBI rows in one click. This is the "no number without provenance" pattern the spec calls for.

3. **Labor tab is devOnly while we shake out the workflow.** The plan is to promote it to non-dev once Phase 2.2.d ships and we've used the cross-tab navigation enough to be confident in the UX. Until then, only dev users see the tab. Position Detail's "View payroll →" button is gated on the same — it only renders when the parent (App.tsx) provides the navigation callback, which only happens when the Labor tab is visible.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a-h | All 27 tabs | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | `?dev=1` route guard + Phase 2.1 close audit | done 2026-05-25 |
| 2.2.a | Position spine bundle (dept-tree + obi-pnp full + views/positions) | done 2026-05-25 |
| 2.2.b | obi-payroll full + lib/payroll/ rollup cube | done 2026-05-26 |
| 2.2.b+c | Combined close audit + PR #68 docs sync | done 2026-05-27 |
| **2.2.c** | **`2.2.17` `views/labor/`** — per-PP drill-down + Position Detail "View payroll →" | **done 2026-05-27** |
| **2.2.d** | **Next sub-phase** — Alex's pick. Recommended: `2.2.13` `bfm-eturn/` full (biggest downstream unblock; 5 sub-phases depend on it). Strong alternatives: `2.2.19` `views/temp-limits/` (focused but requires Q5 TX TODOs resolved) or `2.2.20` `views/inactive/` (smallest, no new importer). | **NEXT** |
| 2.2.e-n | Remaining Tier-3/Tier-4 sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-007 amendment for the confirmed 39-col BI Payroll shape) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **The Labor tab works end-to-end.** Hit `/kospos/?dev=1`, load a P&P + a BI Payroll, then either: (a) open Positions → pick a position → View payroll → see the per-PP view scoped to that position with the trace-to-source affordance; or (b) open Labor directly to see the full snapshot drill-down.
- **The aggregates header is the "no number without provenance" affordance.** Every dollar in Position Detail's YTD Payroll section can be drilled down to the per-row level via the "View payroll" button. This is the foundation for OPS / Staffing Plan eventually doing the same.
- **One stale worktree (`vibrant-margulis-960939`) carries over.** Sweep when convenient — command above in carry-forward A.

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.d).** Three recommended options below; see Recommendations.

### Recommendation for Phase 2.2.d

Three options worth surfacing, with trade-offs:

**Option A (recommended) — `2.2.13` `lib/importers/bfm-eturn/` full + entity layer.** The BFM Position eturn importer is currently a stub (`app/src/lib/importers/bfm-position.ts`). Bringing it to full mirrors the 2.2.b pattern (obi-payroll stub → full) — expand the column set to the real eturn shape, model the budget-phase resolution (Board > Mayor > Committee > Department > Base) explicitly, surface budget vs actual variance on Position Detail. **Pros:** unblocks the most downstream sub-phases of any pick — `2.2.14` bfm-special-class, `2.2.21` staffing-plan, `2.2.23` views/ops, `2.2.31` reconciliation/bva, `2.2.33` snapshots. **Cons:** importer-heavy rather than view-heavy; the user-visible surface is Position Detail's chartfields panel becoming more useful + (if scoped) a budget-vs-actual line on the YTD Payroll card — less dramatic than a new tab.

**Option B — `2.2.19` `lib/views/temp-limits/` + TemporaryExchange typed entity.** Tab 12 TEMP Limits — Cat 17/18 expiry alerts + 1040-hour gauge using the cube's `earningHours`. **Pros:** small focused sub-phase; immediately visible (red/yellow expiry banners + 1040-hour progress bars per Cat 16/17/18 temp); resolves the TX-entity question. **Cons:** the 4 TX TODOs in Restated Question #5 need Alex confirmation up front before the typed entity ships — those are stop-the-world questions that can't be defaulted past.

**Option C — `2.2.20` `lib/views/inactive/`.** Tab 13 Inactive — pure query, no separate importer. Cross-references P&P (active employees) against BI Payroll (people paid in this FY) to surface "people who got paid but aren't in the active roster anymore" — typically separations + leaves. **Pros:** smallest focused sub-phase (no importer expansion, no new entity layer, just a query view); fast win. **Cons:** doesn't unblock any other sub-phase; the user-visible payoff is informational ("here are 7 names that don't fully reconcile") rather than actionable.

**My pick: Option A** because Phase 2.2.b+c established the obi-payroll + obi-pnp pattern (stub → full → entity → view); bringing bfm-eturn to the same state is the natural next step and unblocks the biggest downstream backlog. Option B is the strong second if Alex would rather close the TX TODOs first. Option C is right if the session needs to be unusually small.

## Next session prompt — Phase 2.2.d (Alex picks A, B, or C)

Paste this verbatim to start Session 27:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.d),
then ships it. Phase 2.2.c landed in PR #71 — lib/views/labor/ now
exposes the Tab 7 per-PP drill-down on top of the rollup cube, and
Position Detail's "View payroll →" button scopes the Labor view to a
specific position.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — has the recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 26 entry — Phase 2.2.c views/labor)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-2-b-and-c-close-audit.md (carry-forwards A-F status;
    E now permanently dropped; A still has 1 stale worktree to sweep)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph
  app/src/lib/views/labor/ (the per-PP drill-down that just landed)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 0 — Phase 2.2.c+d close audit cadence check
==============================================================================
Per WORKFLOW.md § Audit cadence, the Phase 2.2.c close audit was
combined with 2.2.b into PR #70. This session, the audit cadence
check is **only the Phase 2.2.d close audit** when 2.2.d ships.
Don't fire a separate 2.2.c audit (already covered) — but DO fire
the 2.2.d audit before this session ends. Use the Phase 2.1 close
audit format; mirror the combined audit's table of carry-forwards.

Also: sweep the 1 stale worktree if it's still there (per Item A
in the combined audit). The auto-archive preference may have caught
it; verify before doing manual cleanup.

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.d
==============================================================================
Use AskUserQuestion. Three recommended options with trade-offs are in
SESSION_HANDOFF.md § "Recommendation for Phase 2.2.d":

  A. (recommended) 2.2.13 lib/importers/bfm-eturn/ full + entity layer
     — biggest downstream unblock (5 sub-phases depend on it). Mirrors
     the 2.2.b pattern: stub → full importer → entity layer → surface
     improvement on Position Detail (chartfields + budget-vs-actual).

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — focused, immediately visible (Cat 17/18 expiry surfaces +
     1040-hour gauges). **GATING:** the 4 TX TODOs in Restated
     Question #5 must be answered up front via AskUserQuestion before
     the typed entity schema can ship.

  C. 2.2.20 lib/views/inactive/
     — smallest sub-phase, no importer expansion, fast win. Pure
     query view (active roster ⋈ paid-this-FY).

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.d (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick.

If A — bfm-eturn full:
  Branch: feat/bfm-eturn-full
  Scope:
    - Expand BfmPositionRow to the full eturn column set per
      data-sources/bfm.md (currently ~16 fields; the real eturn
      carries more — phase-aware columns for Base/Dept/Committee/
      Mayor/Board, char vs labor split, etc.)
    - Add lib/budget/ entity layer mirroring lib/payroll/'s shape:
      BudgetSnapshot keyed by (fiscalYear, asOfDate, budgetPhase),
      per-position budget vs actual cube
    - Surface on Position Detail: replace the bare chartfields
      panel with a "Budget vs Actual" mini-card showing budget,
      YTD actual (from cube), and the variance + arrow
    - Tests: importer column-mapping, entity build, variance math

If B — views/temp-limits:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5 in this file's carry-forwards)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours,
      expiry alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready, then promoted)
    - Tests

If C — views/inactive:
  Branch: feat/views-inactive
  Scope:
    - Add lib/views/inactive/ — query view that joins P&P (active
      roster) with BI Payroll (people paid this FY) and surfaces
      "paid but not in active roster" rows + separation/leave
      reasons inferred from the data
    - Add the tab to App.tsx (devOnly initially)
    - Tests

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **Strict one-sub-phase-per-PR** (continued from 2.2.b + 2.2.c).
  - **`npm test` stays green** (currently 210 / 210).
  - One PR per logical change; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - **No bundling.** Strict one-PR-per-sub-phase.
  - **No tab walkthroughs.** Phase 2.0 is closed.
  - **No ADR amendments.** Phase 2.4 (the ADR-007 amendment for the
    confirmed 39-column BI Payroll shape is queued there; ADR amendment
    for the BFM eturn shape will queue with 2.2.d Option A if picked).
  - **No tool / setting / hook changes** unless surfaced by audit.
  - **No promotion of the Labor tab to non-dev yet** — wait until 2.2.d
    ships and the cross-tab nav workflow has been used end-to-end on
    real data.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.d status + next-session prompt for Phase 2.2.e.
  - Re-ask the 5 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17). DROP items Alex acknowledges this
    session (per memory feedback_dont_reremind.md).
  - Carry-forward update on items A-F.
  - Fire the Phase 2.2.d close audit (mirrors Phase 2.1 audit format).

If a Phase 2.2 sub-phase reveals an architectural question that needs
ADR treatment, elevate during the session rather than carrying forward
(per CLAUDE.md non-negotiable #7).

Recommended model: claude-sonnet-4-6 for Options B or C; claude-opus-4-7
for Option A (importer expansion + entity layer is heavier reasoning).
Effort: medium for any pick.
````

### Recommended model (Phase 2.2.d)

`claude-opus-4-7` for Option A (importer expansion + entity layer
work is heavier reasoning, mirrors 2.2.b which used Opus); 
`claude-sonnet-4-6` for Options B or C.

### Recommended effort (Phase 2.2.d)

`medium` for any pick — one importer expansion + entity layer (A),
or one view + one typed entity + 4 TODOs (B), or one query view (C).

---

## Pre-Session 26 status archived below

Original content from end-of-Session-25 handoff retained for reference.

---

## Current status (end of Session 25 — Phase 2.2.b obi-payroll full, 2026-05-26)

**Phase:** Phase 2.2.b — **obi-payroll full importer + lib/payroll/ rollup cube shipped.** Production `/kospos/` Positions tab now shows YTD actuals split into 5 special-class buckets (regular / overtime / retirement payout / premium / temp lump-sum) when BI Payroll is loaded. Mid-session follow-up (PR #68) dropped QR-002 vacant-no-rtf and added a CON-limitation hint to the Position Detail RTF section.
**Last main commit:** `24c7f57` ([PR #68](https://github.com/alkprojects/kospos/pull/68) — drop QR-002 + RTF hint) → `bd60433` ([PR #67](https://github.com/alkprojects/kospos/pull/67) — S25 handoff) → `c91815c` ([PR #66](https://github.com/alkprojects/kospos/pull/66) — Phase 2.2.b obi-payroll full) → `be58105` ([PR #65](https://github.com/alkprojects/kospos/pull/65) — S24 handoff sync) → `61f69a0` ([PR #64](https://github.com/alkprojects/kospos/pull/64) — calculator fixes)
**Tests:** 199 / 199 passing (189 baseline + 5 obi-payroll importer additions + 8 payroll cube tests; −3 from QR-002 removal)
**Branches in flight:** none
**Worktree hygiene:** 6 stale post-merge worktrees cleared end of S25; Cowork "Auto-archive on PR close" preference now enabled (item A resolved permanently).

### What landed this session — three PRs

#### [PR #66](https://github.com/alkprojects/kospos/pull/66) — Phase 2.2.b obi-payroll full + lib/payroll/ rollup cube

Single-sub-phase PR per the "strict one-PR-per-sub-phase" rule established in the S24 handoff. 11 files changed (+874 / −102).

| What | Where |
|---|---|
| **Importer expansion (sub-phase 2.2.11)** — `ObiPayrollRow` now carries the full 39 columns of the real OBI export (was ~18). Critical additions: `Department Group Code`, `Account Description` (col V — drives the 5-bucket math), the fund / project / activity / authority hierarchies, `Roster Code`, `Earning Hours`, `Is FTE Hours`, `Assignment Number`. The `COMMN:` job-code prefix is split into `jobCode = "5380"` + `jobCodeSet = "COMMN"` per [labor-report.md § Tab 7 improvement #5](docs/domain/labor-report.md#tab-7--bi-payroll). | [app/src/lib/importers/types.ts](../app/src/lib/importers/types.ts) + [obi-payroll.ts](../app/src/lib/importers/obi-payroll.ts) |
| **`lib/payroll/` entity layer** — `PayrollSnapshot` keyed by `(fiscalYear, asOfDate)` with a per-position rollup cube splitting YTD actuals into the 5 special-class buckets that mirror the workbook's Step + Report Data exclusion SUMIFS literally. | [app/src/lib/payroll/](../app/src/lib/payroll/) |
| **Snapshot history (the minimum-viable shape)** — importer stamps `_asOfDate = MAX(earningPeriodEnd)` per import call so uploads from different OBI runs naturally split into separate snapshots without an explicit upload-batch tracker. Full idempotent re-import + diff UI is deferred to `2.2.33 snapshots/` with IndexedDB persistence. | [build.ts](../app/src/lib/payroll/build.ts) |
| **Position Detail wired** — new "YTD Payroll" section shows the 5-bucket breakdown + asOfDate when BI Payroll is loaded; falls back to a "Load a BI Payroll export…" hint otherwise. Existing BFM-chartfields panel untouched. The redundant `ytdActuals` row from the chartfields panel was removed (the breakdown supersedes it). | [PositionDetail.tsx](../app/src/lib/views/positions/PositionDetail.tsx) + [PositionsView.tsx](../app/src/lib/views/positions/PositionsView.tsx) |

**Verification:** 202/202 tests at merge; `npm run build` clean; preview-MCP walkthrough with synthetic data showed `$65k regular / $3.2k OT / $1.8k RPO / $950 premium → $70,950 total asOf 2026-05-08`. Empty-bucket rows (Temp LSP at $0) hidden as designed. Fallback hint renders cleanly when no BI Payroll is loaded. Sources line correctly shows `joined with hcm + obi` ↔ `hcm` based on what's loaded. No console errors.

#### [PR #67](https://github.com/alkprojects/kospos/pull/67) — Session 25 handoff (docs only, mid-session)

Initial closeout doc reflecting PR #66; superseded by this update.

#### [PR #68](https://github.com/alkprojects/kospos/pull/68) — Drop QR-002 vacant-no-rtf + note CON limitation

Late-session follow-up after Alex flagged the Data Issues panel surfacing a vacant-no-RTF warning. The RTF status fields on Tab 6 P&P Data are CON-sourced and not always populated for vacancies — that's a CON data-pipeline limitation, not a missing departmental action.

- Delete `app/src/lib/quality/rules/vacant-no-rtf.ts` + its test block; remove from `ALL_RULES`
- Position Detail now always renders a "Request to Fill" section for VACANT positions with one of: the populated RTF table, OR a plain-text hint ("No RTF data on this position in the snapshot. The Controller's source doesn't always carry RTF status for vacancies — this is a CON data limitation, not a missing departmental action.")
- Filled positions still hide the RTF section unless RTF fields happen to be present
- Tests: 202 → **199** / 199 (−3 from removed QR-002 cases)
- Preview-MCP walkthrough verified all three RTF states (vacant-no-RTF, vacant-with-RTF, filled-no-RTF)

### Pre-Session 25 status archived below — see § Session 24 closeout

---

### What landed in prior sessions (rolling)

Original Session 24 closeout content below for reference.

### What landed in Session 24 — four PRs

#### [PR #61](https://github.com/alkprojects/kospos/pull/61) — Phase 2.1 close audit (small)

Second phase-close audit under [WORKFLOW.md § Audit cadence](WORKFLOW.md). 3 files changed (+275 / -2 lines). In-PR docs sync: ROADMAP.md said `?budget=1`, implementation shipped `?dev=1` — reconciled. New audit doc at [`docs/audits/phase-2-1-close-audit.md`](audits/phase-2-1-close-audit.md). The audit confirmed Phase 2.1 was healthy (152/152 tests, no anchor regressions, no new hook/settings drift), updated the carry-forward A-F items (A worktrees and B SESSION_LOG.md drifted further; E pick scheduled for this session; rest stable), and flagged no new audit-worthy drift.

#### [PR #62](https://github.com/alkprojects/kospos/pull/62) — Phase 2.2.a Position spine bundle

Three sub-phases shipped as one cohesive PR per Alex's pick on audit item E (Option A — Position spine bundle).

| Sub-phase | What |
|---|---|
| **2.2.4** `lib/reference/dept-tree/` | Citywide dept lookup, versioned by effective date. `DeptTree` class + `DEFAULT_DEPT_TREE` singleton. Seeded with DBI + CPC depts from the 2026-05-20 snapshot. Full citywide CSV importer deferred to Phase 2.4 — schema stable, swap-in additive. |
| **2.2.12** `lib/importers/obi-pnp/` (full) | `PsHcmPpRow` expanded from ~20 → ~40 fields. Captures the **three department concepts** (effective / budgeted / combo), Cat 17/18 tracking (AV/AW/AX/AY), vice + previous employee, manager linkage, RTF, exempt category, merit increase, position division, max headcount, vacant date. File path preserved (`lib/importers/ps-hcm-pp.ts`) — pure rename was no-value churn. |
| **2.2.16** `lib/views/positions/` | The spine view. `Position` entity layer in `lib/positions/` joins P&P rows + dept tree + userNotes. List view (stats / filters / table); detail modal (three-dept breakdown + mismatch warning, incumbent, Cat 17/18 tracking with expiry alerts, reports-to, RTF, inline userNotes editor). Replaces the superseded `modules/positions/PositionsView.tsx`. |

**Tab promoted to non-dev:** Positions tab loses `devOnly` and reorders to position 2 (right after Calculator). Production `/kospos/` now shows 2 tabs; `?dev=1` adds Load Reports + Special Class. The dev gate from Phase 2.1 continues to gate those two tabs cleanly.

**Verification:** 181/181 tests at spine-bundle merge; `npm run build` clean; preview-MCP walkthrough of empty state, populated table, filters, detail modal (3-dept warning, Cat 18 tracking, reports-to), userNotes inline edit (saved note shows ● in Notes column), `?dev=0` production surface, `?dev=1` dev surface. No console errors.

#### [PR #63](https://github.com/alkprojects/kospos/pull/63) — Session 24 handoff (docs only)

Updated SESSION_HANDOFF.md + appended SESSION_LOG.md Session 24 entry. Mid-session iteration; this update supersedes it with PR #64 reflected.

#### [PR #64](https://github.com/alkprojects/kospos/pull/64) — Job Class Calculator bug fixes

Alex spot-checked the live calculator and surfaced three bugs. All three fixed in one PR:

1. **Autocomplete on "code — title"**. Input label now reads "Job Code — Title". Datalist has 1136 class entries with "code — title" labels (e.g. "922 — Manager I") extracted from `Hourly-Rates-of-Pay-by-Classification-and-Step-FY25-26 (2).xlsx`. Users can type either the code or any substring of the title to filter. Class title shows under the input once a known code is recognized. New file: `app/src/data/job-class-titles.json`. Refresh script: `.scratch/extract-job-titles.py` (gitignored dir; reproducible from the PR body).
2. **MCCP setId UX bug.** Range-based MCCP classes (which usually have one SetID = COMMN) highlighted the SetID button automatically, but Range A/B/C + Min/Max + Calculate stayed hidden / grey until the user clicked the already-highlighted SetID. Root cause: `availableSteps`/`availableRanges` memos referenced raw `setid` state instead of `effectiveSetid` (the auto-selected fallback). Fixed both memos.
3. **MCCP biweekly amounts off by 80×.** `dhr-ranges.json` values are *hourly* rates (same convention as `dhr-steps.json`), despite a misleading "biweekly" comment in the JSON. `cost.ts`'s `getBiweeklyRate` step branch multiplied by 80; the range branch returned values as-is. Verified against [careers.sf.gov/classifications/](https://careers.sf.gov/classifications/): class 0922 Manager I Range A post-COLA = "$136,604 annual" = $5,254 biweekly = $65.68 hourly × 80 × 26. Calculator now shows **$136,084 annual salary** for Alex's screenshotted test case (was $1,701.05). JSON comment updated to "HOURLY rates" with the verification note.

**Tests:** 181 → 189 (+8 in new `cost.test.ts` covering step + range branches and the MCCP regression).

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): the 4 items Alex acknowledged in S21 stay DROPPED (the 7 expired Cat 17/18 positions; Cat 17/18 Charter cite reminders; Guaiumi data bug; CPO=510210). The 6 items the [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md) surfaced for Alex's decision are listed under "Audit-surfaced items" below.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (5)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 is new from Session 21** (TX rules — 4 TODOs in [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md)).

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules.** Session 21 surfaced the TX concept via Alex's Marco Jacobo worked example, but four follow-up rules need confirmation before the `lib/views/temp-limits/` sub-phase can model TX as a typed entity:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?** (Most important: `Position =/= Budget` — does it mean "employee's effective job code differs from position's budgeted job code", or something else?)

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain. I haven't inspected the CI formula yet to confirm.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip with one-click jump-to-fix; annualized rows switched from pure-PP to COLA-aware per [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md). **Confirm both?**

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else? Belongs in `appointment-types.md`.

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)? Currently positioned as draft. What class set counts as "leadership/strategic" — MCCP + selected senior PCS, or broader?

#### Open action items (1 — remaining after S21 acknowledgments)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null** — meaning the workbook claims no Request to Fill has ever been filed. **But** per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), you flagged that "no RTF" is not always accurate in practice — the position may have had an incumbent in the past (i.e., a "vice" history), which would mean an RTF *must* have been filed at some point. The action: for each of these 5 positions, look at the prior-incumbent history. If there's a "vice" (prior employee on the position), the "no RTF" is a data integrity issue (the RTF was filed but didn't get tracked here), not a real "we've never tried to fill this." If there's no vice history, "no RTF" is likely real and the position is truly an intentional hold or unfunded slot. **Disposition needed per position: data bug vs intentional hold.** Surfaced in [scenario-tests § Scenario 5](audits/labor-report-scenario-tests.md#scenario-5--vacant-but-no-rtf).

#### Audit-surfaced items (carry-forward update — items A-F)

From [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md) + [Phase 2.1 close audit](audits/phase-2-1-close-audit.md):

A. **Stale post-merge worktrees — RESOLVED end of S25.** All 6 stale worktrees swept manually (1 directory needed a reboot to clear a Windows file lock; cleared post-reboot). Alex also enabled the Cowork **"Auto-archive on PR close"** preference end of S25, which automates this cleanup going forward — no manual sweep should be needed in future sessions. If a stale worktree does appear in `git worktree list`, treat it as a regression and surface it.

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** File grew 1,977 → 2,295 lines in 2 sessions; **past the 2,000-line trim trigger** per Phase 2.1 audit. Sessions 1–16 are pre-Phase-2; their per-prompt detail isn't actively consulted. ~1,000 lines removed estimate. Single-purpose docs PR, ~1 hour. **Priority bumped** from "evaluate" to "schedule when capacity allows."

C. **Migrate the 25× memory-file citation anti-pattern in `labor-report.md`.** Pattern (shown in a fenced block to avoid this handoff triggering the verifier):

   ```text
   [`memory file.md` ...](#tab-24--staffing-plan)
   ```

   Should become:

   ```text
   [memory `file.md`](file:///C:/Users/ALK/.claude/projects/.../memory/file.md)
   ```

   Single-purpose cleanup PR; ~30 min. Bundleable with item B (combined ~1.5 hours).

D. **Defer the `labor-report.md` split until Phase 2.4.** File still 8,518 lines (unchanged); no action this cycle.

E. **Phase 2.2 first sub-phase pick — RESOLVED in S24.** Position spine bundle shipped in [PR #62](https://github.com/alkprojects/kospos/pull/62). No longer carry-forward.

F. **Audit cadence — Phase 2.2.b close audit owed.** Per [WORKFLOW.md § Audit cadence](WORKFLOW.md) ("event-based — every phase close"), Phase 2.2.b's close (S25) triggered an audit. **It was not run in S25** — surfaced here for Session 26 to fire as Step 0. The Phase 2.1 close audit was a 270-line doc for a 3-file PR; Phase 2.2.b is larger (11 files in PR #66 + 4 in PR #68) so expect a slightly larger doc. Item A (worktrees) is now resolved end of S25; item B (SESSION_LOG.md trim — now ~2,540+ lines) drifted further; the audit will quantify both.

### Top 3 findings to surface for Alex this session

1. **The Positions tab is live in production.** Visit `/kospos/` and you'll see Job Class Calculator + Positions side by side. Empty until you load data via `/kospos/?dev=1` → Load Reports, then return to `/kospos/` → Positions to see the spine table. Detail modal shows the three-dept distinction (Effective / Budgeted / Combo) with a yellow warning when they disagree without a combo override — surfaces the "employee moved but no combo code added" issue [memory `feedback_user_notes_per_position.md` predicted](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_user_notes_per_position.md). Inline user-notes editor works (notes don't persist across reload yet — IndexedDB persistence is queued for a small follow-up).

2. **Three sub-phases bundled cleanly into one PR.** The mild "one change per branch" violation was justified per [labor-report.md § Recommended Phase 2.2 first sub-phase Option A](docs/domain/labor-report.md#recommended-phase-22-first-sub-phase-phase-20i-recommendation) — sub-phases share an end-user surface and no individual piece is testable alone. The next-bundle question (Phase 2.2.b) is whether to repeat that pattern or revert to strict one-sub-phase-per-PR; see Recommendations below.

3. **Position entity is now the spine — every Tier-4 view from here joins through it.** Per the dependency graph in `labor-report.md`, the spine unblocks `2.2.17 views/labor/`, `2.2.18 views/reporting-tree/`, `2.2.19 views/temp-limits/`, `2.2.20 views/inactive/`, `2.2.21 staffing-plan/`, `2.2.22 views/vacancies/`, `2.2.25 views/probation/`, `2.2.26 views/separations/`, `2.2.27 views/succession/`, `2.2.28 views/eligibility/`, `2.2.29 views/roster-approvers/`, `2.2.30 views/ee-additional-pay/`. Most-impactful next picks: `2.2.11 obi-payroll/ full` (unblocks 5 downstream incl. OPS) or `2.2.19 views/temp-limits/` (small, models TX, surfaces Cat 17/18 expiry — see Recommendation below).

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a | 5 Calendar | done 2026-05-24 |
| 2.0b | 7 BI Payroll | done 2026-05-25 |
| 2.0c | 6 P&P Data | done 2026-05-25 |
| 2.0d | 20 Report Data | done 2026-05-25 |
| 2.0e | 26 OPS Summary + 27 OPS Detail | done 2026-05-25 |
| 2.0f | 16 Premium + 17 Overtime + 18 Step + 19 Retirement Payout | done 2026-05-25 |
| 2.0g | 23 Vacancies and TEMP + 24 Staffing Plan + 25 Budget Summary | done 2026-05-25 |
| 2.0h | 14 tabs: 1 Data, 2 Departments, 3 Combo, 4 BFM, 8 Roster Approvers, 9 EE Additional Pay, 10 Probation, 11 Eligibility Lists, 12 TEMP Limits, 13 Inactive, 14 Separations, 15 Succession, 21 Reporting Tree, 22 Pos by Dept | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration final + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | Hide budget-dev UI (route guard) — `?dev=1` + localStorage + banner | done 2026-05-25 |
| 2.1 close audit | small audit per cadence; ROADMAP `?budget=1` → `?dev=1` reconciled | done 2026-05-25 |
| **2.2.a** | **Position spine bundle** — `2.2.4` `dept-tree/` + `2.2.12` `obi-pnp/` (full) + `2.2.16` `views/positions/` shipped together; Positions tab promoted to production | done 2026-05-25 |
| **2.2.b** | **`2.2.11` `obi-payroll/` full** — full 39-column importer + `lib/payroll/` rollup cube + Position Detail YTD breakdown | **done 2026-05-26** |
| **2.2.c** | **Next sub-phase** — Alex's pick. Recommended: `2.2.17` `views/labor/` (drill-down view on top of the cube, small win), `2.2.19` `views/temp-limits/` (Tab 12 TEMP Limits + TX entity), or `2.2.23` `views/ops/` (the headline projection page; bigger). | **NEXT** |
| 2.2.d-n | Remaining Tier-3/Tier-4 sub-phases per dependency graph | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR amendments per the 6 proposed ADRs — though 5 of 6 landed in PR #54 ADRs 010-015; only ADR-007 amendment for BVA-as-distinct-source remains) | pending |

## Blockers for Alex

None landing-related. Live site: <https://alkprojects.github.io/kospos/>. Spot-check once the deploy completes:

- **Production `/kospos/` Positions tab now shows YTD payroll actuals.** Load a P&P file + a BI Payroll export via `?dev=1` → Load Reports, then return to Positions. Click any row — Position Detail shows the "YTD Payroll" section with 5 buckets (regular / overtime / retirement payout / premium / temp lump-sum) + an `asOf <date>` based on `MAX(earningPeriodEnd)` from the loaded BI Payroll. Without BI Payroll loaded, the section shows a "Load a BI Payroll export…" hint.
- **The bucket math mirrors the workbook's Step + Report Data exclusion SUMIFS literally.** Regular labor = everything except the 4 special-class account-description literals; the 4 specials each get their own line. Total at the bottom sums all 5. Zero-buckets are hidden to keep the panel tight.
- **Inline user notes** still work as in 2.2.a (browser-session only; IndexedDB persistence queued).

**One decision pending — pick the next Phase 2.2 sub-phase (2.2.c).** Three recommended options below; see Recommendations.

### Recommendation for Phase 2.2.c

Three options worth surfacing, with trade-offs:

**Option A (recommended) — `2.2.17` `lib/views/labor/`.** The Tab 7 BI Payroll drill-down view. The rollup cube exists; this sub-phase adds a per-position per-PP table (PPE × earnings code × account × balance) with filters + the quick-aggregates header from Tab 7 § KosPos UI sketch #2. **Pros:** small focused sub-phase (no new importer); immediately visible win — clicking "View payroll" from Position Detail opens a tab with the full per-PP picture; only Phase 2.2.b's cube is needed (no further upstream prerequisites); unblocks the "trace to source" affordance on every projection. **Cons:** doesn't unblock as many downstream sub-phases as `2.2.23 views/ops/`.

**Option B — `2.2.19` `lib/views/temp-limits/` (Tab 12).** Build the TEMP Limits view + the typed `TemporaryExchange` entity from S21. **Pros:** builds on the spine + cube (Cat 17/18 already modeled; the cube's `earningHours` field exposed in 2.2.b enables the 1040-hour gauge math); small focused sub-phase; surfaces the 4 TX TODOs from Restated Q #5 in a concrete UI; visible win — user sees "your Cat 17/18s are expiring on X" + "hours remaining" per temp. **Cons:** the 4 TX TODOs need Alex confirmation before the typed entity can ship; opening the modal and clicking through a per-PP drill-down (Option A) would let Alex see the cube he just built faster.

**Option C — `2.2.23` `lib/views/ops/` (Tabs 26 + 27).** The headline projection page — Operating Report Summary + Detail. **Pros:** biggest user-visible payoff; consumes the cube + the BFM eturn (already imported) directly. **Cons:** depends on `2.2.13 bfm-eturn/` full (the BFM Position eturn importer is stub-level; full version needed); also depends on `2.2.33 snapshots/` for the OPS Detail "what changed" feature; bigger sub-phase than 2.2.b was. Right answer eventually but probably 2.2.d or 2.2.e, not the immediate next pick.

**My pick: Option A** because Phase 2.2.b just shipped the rollup cube and the drill-down view is the most natural "make the cube visible" next step; small enough to ship without bundling, big enough to feel like progress. Option B is the strong second if Alex would rather close the TX TODOs first.

## Next session prompt — Phase 2.2.c (Alex picks A, B, or C)

Paste this verbatim to start Session 26:

````
This session asks Alex to pick the next Phase 2.2 sub-phase (2.2.c),
then ships it. Phase 2.2.b landed in PR #66 — the BI Payroll importer
is now full + lib/payroll/ exposes a per-position rollup cube split
into the 5 special-class buckets; Position Detail shows YTD actuals.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — has the recommendation + carry-forwards)
  docs/SESSION_LOG.md (Session 25 entry — Phase 2.2.b obi-payroll full)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-1-close-audit.md (still has the live carry-forward A-F;
    A and B drifted further this session — see "Audit-surfaced items" below)
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — dependency graph
  app/src/lib/payroll/ + app/src/lib/importers/obi-payroll.ts
    (the obi-payroll bundle that just landed)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 1 — Ask Alex to pick Phase 2.2.c
==============================================================================
Use AskUserQuestion. Three recommended options with trade-offs are in
SESSION_HANDOFF.md § "Recommendation for Phase 2.2.c":

  A. (recommended) 2.2.17 lib/views/labor/
     — per-position per-PP drill-down view on top of the new cube.
     Small focused sub-phase; immediately visible win.

  B. 2.2.19 lib/views/temp-limits/ + TemporaryExchange typed entity
     — surfaces Cat 17/18 expiry alerts + 1040-hour gauges. The 4 TX
     TODOs (Restated Q #5) need Alex confirmation before the typed
     entity ships.

  C. 2.2.23 lib/views/ops/  (Tabs 26 + 27 — headline projection page)
     — bigger win but ALSO requires 2.2.13 bfm-eturn full + 2.2.33
     snapshots/. Better as 2.2.d or 2.2.e.

  (Escape hatch: Alex names something else from the dependency graph.)

==============================================================================
STEP 2 — Start Phase 2.2.c (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick.

If A — views/labor/:
  Branch: feat/views-labor
  Scope:
    - Add lib/views/labor/ — per-position per-PP table (PPE × earnings
      code × account × hours × balance) with filters (earnings code,
      account, PP range)
    - Quick-aggregates header per labor-report.md § Tab 7 § KosPos UI
      sketch #2 — YTD regular / OT / RPO / Premium / Temp LSP (already
      in the cube via PositionYtdActuals)
    - "Trace to source" affordance: row click highlights the original
      BI Payroll snapshot row
    - Add a "View payroll" button to Position Detail that opens the
      labor view scoped to that position
    - Add the tab to App.tsx (devOnly initially; promote when stable)
    - Tests: filter math, position-scoped view, empty state

If B — views/temp-limits/:
  Branch: feat/temp-limits-view
  Scope:
    - Resolve the 4 TX TODOs via AskUserQuestion at the start
      (Restated Q #5 in this file)
    - Add lib/temp-exchange/ typed entity (per memory
      temporary_exchange_tx.md schema)
    - Build lib/views/temp-limits/ — Tab 12 TEMP Limits surface
      (1040-hour gauge per temp using the cube's earningHours, expiry
      alerts via the existing cat1718 model)
    - Surface temp-tx-expiration-imminent + temp-tx-expired flags
      from lib/quality/
    - Add the tab to App.tsx (devOnly until ready, then promoted)
    - Tests

If C — views/ops/: NOT recommended for 2.2.c (heavy prereqs). If
chosen anyway: scope per the labor-report.md dependency graph +
plan on TWO sub-phases of upstream work first (2.2.13 + 2.2.33).

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **Strict one-sub-phase-per-PR** (continued from 2.2.b).
  - **`npm test` stays green** (currently 199 / 199).
  - One PR per logical change; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - **No bundling.** Strict one-PR-per-sub-phase.
  - **No tab walkthroughs.** Phase 2.0 is closed.
  - **No ADR amendments.** Phase 2.4 (the ADR-007 amendment for the
    confirmed 39-column BI Payroll shape is queued there).
  - **No tool / setting / hook changes** unless surfaced by audit.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.2.c status + next-session prompt for Phase 2.2.d.
  - Re-ask the 5 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17). DROP items Alex acknowledges this
    session (per memory feedback_dont_reremind.md).
  - Carry-forward update on items A-F (E resolved in S24, F working
    as designed, D unchanged; A and B keep drifting — sweep them
    if capacity allows).

**Audit trigger — TWO close audits owed at the start of Session 26:**
  - **Phase 2.2.b close audit** (was owed last session, deferred per the
    handoff disclosure under § Audit-surfaced items / F)
  - **Phase 2.2.c close audit** (this session's close)

Per WORKFLOW.md § Audit cadence ("event-based — every phase close"),
both should fire BEFORE Phase 2.2.d work starts. They can be bundled
into one combined audit doc to save context — Phase 2.1 close audit
established the format; mirror it. Items A (worktree sweep), B
(SESSION_LOG.md trim — now >2,540 lines), and C (memory citation
anti-pattern in labor-report.md) all carry forward unchanged.

If a Phase 2.2 sub-phase reveals an architectural question that needs
ADR treatment, elevate during the session rather than carrying forward
(per CLAUDE.md non-negotiable #7).

Recommended model: claude-sonnet-4-6 — Phase 2.2.c is one focused
sub-phase regardless of A or B pick. Use claude-opus-4-7 if Alex
picks C (cross-source-heavy).
Effort: medium.
````

### Recommended model (Phase 2.2.c)

`claude-sonnet-4-6` — Phase 2.2.c is one focused sub-phase (smaller
than 2.2.b's importer-plus-entity-layer). Opus only if Alex picks
Option C (heavy prereqs).

### Recommended effort (Phase 2.2.c)

`medium` — one view + one wire-in to Position Detail (Option A) OR
one view + one typed entity + 4 TODOs to resolve (Option B).

---

## Notes for the next-session model

- **The workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\Labor Report 5.21.26.xlsx` (gitignored — never commit).
  openpyxl `read_only=True` mode if needed (read_only=False chokes on
  pivot caches under Python 3.14 + openpyxl 3.1.5).
- **Example reports folder:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\example reports\Reports\` — full inventory in
  [`data-sources/reports-folder-inventory.md`](data-sources/reports-folder-inventory.md).
- **The local main worktree is at** `C:\Users\ALK\Desktop\Claude Projects\kospos`.
  After each merge: `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos"
  pull --ff-only origin main`.
- **Anchor-link convention** (per [ADR-014](DECISIONS.md) +
  [Session 19 audit](audits/internal-claude-setup-audit.md) +
  Phase 2.0h migration + [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md)):
  github-slugger uses lowercase + strip-non-(word|space|hyphen|underscore)
  + per-space-replaced-with-hyphen (NOT collapse multi-space runs) +
  0-indexed occurrence-count suffix on dupes. Phase 2.0i added the
  Phase 2.2 tier rename — direct refs to old `#1-cross-cutting-infrastructure`
  / `#2-per-tab-modules` were migrated to the parent section
  `#phase-22-sub-phases-dependency-order` for stability against future
  tier renumbering.
- **Memory-file citation convention** — use the file:// URL pattern.
  AVOID the `(#tab-24--staffing-plan)` anti-pattern (semantically
  misleading even when it "works" inside labor-report.md). The audit's
  item C surfaces this for batch cleanup.
- **Make the reasonable call, document it, keep going** when
  Alex-level prose details aren't blocking. Flag in the relevant
  tab's Open Questions list. **But: don't re-ask items Alex
  already acknowledged** per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md).
- **`gh pr merge --squash` fails from a worktree** when local main is
  checked out elsewhere. Use `gh api -X PUT repos/alkprojects/kospos/pulls/N/merge
  -f merge_method=squash` instead — pure server-side merge, no local
  branch switch.
- **Audit cadence** (per [WORKFLOW.md § Audit cadence](WORKFLOW.md)):
  Phase 2.0i close + Phase 2.1 close audits have both fired correctly.
  Next audit fires at Phase 2.2.b close (or every-10-session backstop —
  whichever comes first).
- **Anchor verifier** is at `.scratch/verify_anchors.py` (intra-file)
  + `.scratch/verify_anchors_full.py` (intra + cross-doc). `.scratch/`
  is gitignored. Run with `python .scratch/verify_anchors_full.py`
  from the worktree root after any heading-level edit.

---

## Pre-Session 24 status archived below

Original content from end-of-Session-21 handoff retained for reference.

---

## Current status (end of Session 21 — Phase 2.0h Reference + tracking tabs, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **COMPLETE — all 27 walkable tabs walked.**
**Last main commit (pre-merge):** `b523ad4` (PR #56 — Phase 2.0g) → `17b4fad` (PR #57 — Session 21 Phase 2.0h)
**Tests:** 146 / 146 passing (no app-code changes this session)
**Branches in flight:** none after this PR merges

### What landed in Session 21 — Phase 2.0h

[**PR #57**](https://github.com/alkprojects/kospos/pull/57) — Phase 2.0h shipped 14 walkthroughs (Tabs 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22) + 14 KosPos improvement headings + 16 new Data Issue flag categories + 9 new Phase 2.2 sub-phases + 2 new memory files (TX entity, don't-re-remind). ~1,700 lines added to `labor-report.md`. 23 anchor migrations clean (Tab 26: -10 → -24; Tab 27: -11 → -25).

### Top findings (S21)

1. **Phase 2.0 walkthrough COMPLETE** — every tab in the workbook now has a walkthrough.
2. **TX (Temporary Exchange) modeled provisionally** — typed entity with `(original_position, original_employee, temp_employee, start_date, expired_date, source_appointment_type)` schema; 4 TODOs for Alex confirmation (now surfaced as Restated Question #5 above).
3. **Reporting Tree change-proposal columns are the Change Mode precursor** — Tab 21 has 13 user-input change-proposal columns that map 1:1 to KosPos's `ProposedChange` entity per ADR-003.

(See full Session 21 closeout in `docs/SESSION_LOG.md` § Session 21.)
