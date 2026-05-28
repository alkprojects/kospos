# Phase 2.2.m close audit — Session 36

**Date:** 2026-05-27
**Branch:** `docs/phase-2-2-m-close-audit-and-handoff`
**Scope:** Phase 2.2.m close audit. **One PR** shipped this session
([PR #116](https://github.com/alkprojects/kospos/pull/116) — Eligibility
summary-row redesign + filter toolbar + detail modal), in direct
response to Alex's S36 added directive that took the place of the
normal "pick the next 2.2 sub-phase" framing:

> -eligibility list lookups works but the ui/ux isn't ideal. there is
> a lot of white/empty space. in addition to the links can you parse
> the data and show that instead. can you show one row per job class
> and summarize the information, number of lists, the dates, etc.
> then when you click into a row you get all the detail.
>
> -also add more filters for searching/narrowing eligibility lists and
> postings, like expired / active, exam type, department (specific or
> citywide, etc.).

This is the third consecutive session where Alex's added directive
superseded the planned A/B/C/D/E option pick — the live Eligibility
fetch from S35 immediately surfaced UX issues that needed addressing
before any further sub-phase work. The directive was sharp and
self-contained; no `AskUserQuestion` was needed at kickoff.

Last audit was the [Phase 2.2.l close audit](phase-2-2-l-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in this session's **1 PR** against the docs
   that describe it (Tab 11 Eligibility, the S35 SESSION_HANDOFF, the
   S36 kickoff directive from Alex, Phase 2.2.l close audit).
2. Re-run `npm test` — confirms **620 / 620** baseline (was 589 at S36
   start; +31 from PR #116 = 620 net).
3. Re-check carry-forward items B-F from the [Phase 2.2.l close
   audit](phase-2-2-l-close-audit.md); mark each `unchanged`, `improved`,
   `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR follow-ups

### One PR shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#116](https://github.com/alkprojects/kospos/pull/116) | feat(views/eligibility) | Summary-row redesign + filter toolbar (search · status · exam type · department · citywide) + EligibilityDetail modal. +31 tests. |

Plus this docs PR (audit + S37 handoff + S36 SESSION_LOG entry).

### Finding 1 — Summary-row redesign collapses tall stacked rows to one line

**Status:** stable.

The S35 EligibilityView rendered postings + active lists as vertical
stacks of clickable date links per row. A job code with 12 active lists
produced a 12-line tall row — which made the page feel sparse for
codes with 0-1 entries (Alex's "lots of white/empty space" complaint)
and overwhelming for codes with many.

PR #116 replaces this with a 7-column compact row:

| Job code | Title | Postings | Active | Expired | Dept(s) | citywide? |
|---|---|---|---|---|---|---|
| 0932 | Manager IV | **2** · newest 2026-04-10 | **1** SR · 2026-03-10 | — | 2 depts | `citywide?` |
| 1042 | IS Engineer-Journey | **1** · newest 2026-05-10 | **2** SR · 2024-11-20 → 2025-06-15 | 1 | Building Inspection | — |

The per-list / per-posting detail moves to `EligibilityDetail`, a
modal opened by clicking the row. Mirrors the existing
`PlannedActionDetail` / `ProbationDetail` / `SeparationDetail`
fixed-overlay pattern (Esc + backdrop close, `role="dialog"` +
`aria-modal`, no Portal, no headless-ui dep).

**Disposition:** stable. The live verification at S36 with 137 real
SmartRecruiters postings (90 rolled-up job codes) confirmed the layout
holds at scale; the table fits 8+ rows above the fold instead of the
prior 2-3.

### Finding 2 — `summarizeRollup` extracts the compact-row inputs as a pure helper

**Status:** stable.

Per `lib/scrapers/build.ts`, `summarizeRollup(rollup)` returns:

- `activeCount`, `expiredCount`, `postingCount` — for the count cells.
- `newestPostingDate`, `oldestActivePostDate`, `newestActivePostDate`
  — for the date-range cells.
- `departments` (alphabetized), `listTypes` (`score-report` /
  `eligible-list` in stable order) — for the Dept(s) cell + the small
  SR/EL chip on the Active count.
- `citywideHint` — v1 heuristic, fires when (a) any list exists with
  no current posting OR (b) postings span 2+ departments.

Pure, deterministic, no DOM, tested with 7 cases including the two
citywide-hint axes individually + the combined empty / multi-dept
cases.

**Disposition:** stable. The "v1 heuristic" framing is recorded in
the type's doc comment + the `RollupSummary` interface comment, so
future sessions know it's intentionally approximate.

### Finding 3 — `applyEligibilityFilters` replaces the substring-only `filterRollups`

**Status:** stable.

The S35 `filterRollups(rollups, needle)` only filtered on a single
substring. PR #116 adds `applyEligibilityFilters(rollups, filters)`
with the full structured shape Alex's S36 directive asked for:

- **`search`** — same substring behavior as before.
- **`status`** — `any` / `active` / `expired` (only expired, no active) /
  `list-only` (no postings) / `posting-only` (no lists).
- **`examTypes`** — Set of `'score-report' | 'eligible-list'`.
- **`departments`** — Set of department labels seen in postings.
- **`citywideOnly`** — boolean toggle.

AND across axes; OR within each multi-value set. Empty Sets = ignore
the axis (matches the user-mental-model "no chips selected = show
everything"). 12 cases pin every axis individually + a combined AND
case + the "everything empty = pass everything" sanity case.

The old `filterRollups` stays as a back-compat export — nothing else
in the codebase consumes it, but removing it would be a separate PR.

**Disposition:** stable. The dept-axis limitation is documented in
the `applyEligibilityFilters` doc comment: lists don't carry
department info in the DHR data, so a rollup with only lists (no
postings) will always fail a non-empty dept filter. This matches the
UI behavior — when a user picks a dept, they're asking "what is
posted by this dept right now?"

### Finding 4 — Modal pattern matches the established KosPos idiom

**Status:** stable.

`EligibilityDetail.tsx` is the 5th modal in KosPos that uses the
fixed-overlay-no-Portal pattern (`PositionDetail`, `ProbationDetail`,
`SeparationDetail`, `PlannedActionDetail`, and now this). All five
share: `role="dialog"` + `aria-modal="true"`, Esc handler on the
outer div, backdrop-click via `e.target === e.currentTarget`, no
headless-ui dep, no Portal, max-width ~720–840px with `padding: 20`
inside a `.card`.

The shared idiom means future modals don't need design discussion;
copy-paste from the closest existing one and adapt the section
shapes.

**Disposition:** stable. The 5-instance count suggests this is the
right time to lift the overlay-frame to `lib/ui/Modal.tsx` — but
NOT in this PR (scope guard). Filed as a low-priority follow-up.

### Finding 5 — Filter toolbar uses a small inline multi-select for departments

**Status:** stable.

The `FilterToolbar` component (~150 LoC inside `EligibilityView.tsx`)
implements an inline department multi-select dropdown directly —
no extra component, no library. Outside-click closes the dropdown via
a single backdrop click-handler on the toolbar card; the dropdown
itself stops propagation.

This is the right scope for v1: SF DHR has ~50+ departments, a chip
row would overflow on a single line, and a multi-select dropdown
with checkboxes is the standard pattern. If a second tab needs the
same pattern, lift to `lib/ui/MultiSelect.tsx`; until then, inline is
fine.

**Disposition:** stable.

### Finding 6 — `npm run build` clean on first run (7 sessions running)

**Status:** stable.

7 sessions in a row of clean first-run builds (S30 caught 1, S31
caught 1, S32 caught 0, S33 caught 0, S34 caught 1, S35 caught 0,
**S36 caught 0**). The habit is firm.

**Disposition:** stable.

### Finding 7 — Tests 620 / 620 (+31 from S36-baseline of 589)

**Status:** stable.

| PR | Tests added | Cumulative |
|---|---|---|
| Phase 2.2.l baseline at S36 start | — | **589** |
| PR #116 — Eligibility summary + filters + detail modal | +31 | 620 |

The +31 from PR #116 breaks down as:

- `scrapers.test.ts` — +20 (summarizeRollup edges 7 · applyEligibilityFilters 12 · collectDepartments 3, minus 2 by subtraction since the test file's existing assertions stayed unchanged).
- `eligibility-view.test.tsx` — +11 (empty-state · row count · summary-row counts/dates · citywide chip · modal open · modal close · expired disclosure · search filter · status filter · exam-type chip · reset filters).

The view test had two initial misses surfaced by `vitest run`:
- Date in summary row renders with `· ` prefix → switched the assertion to a regex match.
- Modal has two close affordances both named "Close" (header × via aria-label, footer text button) → disambiguated by `textContent === 'Close'`. **Surface for follow-up:** consider renaming the header's `aria-label` to `Close detail` for clarity. Filed as low-priority.

**Disposition:** stable.

### Finding 8 — Preview-MCP verification at scale (137 postings, 90 codes, 33-of-90 dept filter)

**Status:** stable.

Live verification ran the SmartRecruiters refresh end-to-end:

- 137 postings returned · 90 distinct job-code rollups built · all
  rendered as one-line summary rows in the new compact layout.
- Clicked row 0923 → modal opened cleanly, showed 1 posting (Public
  Utilities Commission, 2026-05-19), 0 active lists, Esc closed.
- Department dropdown → check Public Health → table narrowed to
  **33 of 90** job codes; "Reset filters" chip appeared above the
  match count.
- Multi-dept rollup (0932 Manager IV, 2 depts) carried the
  `citywide?` hint chip on the right edge of the row.
- `preview_console_logs --level error` returned zero entries.

**Disposition:** stable.

### Finding 9 — `devOnly: true` on the Eligibility tab still holds

**Status:** stable.

Per the S35 "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Inactive / Separations /
> Probation / Eligibility / Temp Limits / Reporting Tree to non-dev
> yet — wait until cross-tab nav has been used end-to-end on real data.

PR #116 doesn't touch the `devOnly` flag. The cross-tab nav follow-up
(clicking a job code in EligibilityView's summary table → filter
Positions to that jobCode) was Option E in the S36 menu and remains
the gating item for promotion.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items B-F

From [`phase-2-2-l-close-audit.md`](phase-2-2-l-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~3,100 lines after S35 entry | **~3,170 lines after S36 entry** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence — working as designed | 12th event-based trigger S35 | **13th event-based trigger this session** | working as designed |

### Item B — SESSION_LOG.md baseline ~3,170 lines after S36 entry

This session adds a shorter entry than S35's 2-PR run — 1 PR + this
docs PR. Estimated ~70 lines for the entry, total ~3,170.

Bundleable with C + the Tab 24 Improvement #6 holdReason language
drift + the OBI serial doc note + the research-doc-location
WORKFLOW.md note + the TS-param-property tip (from S34 audit) + the
new modal-aria-label tip (from this session's Finding 7). Estimated
combined effort: ~2-2.5 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 13th event-based trigger fires on schedule

The S36 prompt template (drafted at the end of S35) included the
explicit Step-0 audit trigger pattern, which this session honored.
The slip from S25 has not recurred across **13 subsequent sessions**.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All
  `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `feedback_dont_reremind.md` — Alex's S36 added directive resolved
    this session; the Restated Q #18 (filterable / multi-select
    everywhere) is partially satisfied for the Eligibility tab; the
    other tabs remain unaddressed (carry forward).
  - `feedback_projections_always_cola_aware.md` — n/a this session
    (no projection math touched).
  - `user_role.md` — Alex as Deputy Director means the citywide-hint
    is contextually meaningful (citywide lists are common DBI gateways
    to fill PCS positions).

### Tooling / hooks / settings

- **No hook / settings changes** in PR #116. All file changes were
  `app/src/` (build helpers + view + new modal + new test file).
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block.
- **Cowork "Auto-archive on PR close"** — PR #116 merged inside the
  session; archive should fire on PR close.

### Anchor compliance

No `labor-report.md` heading-level edits in PR #116. Anchor verifier
rerun skipped per precedent.

### Tool sprawl

- **`app/src/lib/views/eligibility/EligibilityDetail.tsx`** — new
  file (1 in the existing `views/eligibility/` subdir).
- **`app/src/lib/views/eligibility/eligibility-view.test.tsx`** — new
  test file (1 in same subdir).
- **No new top-level modules.** No new ADRs.
- **No new dependencies.** `package.json` unchanged.
- **`buildJobCodeRollups` + `filterRollups`** stay exported but
  `filterRollups` now has no in-app consumer. Removing it is a
  separate PR.

### Doc-vs-implementation

- **Tab 11 in `labor-report.md`** describes the manual list shape +
  KosPos vision; PR #116 satisfies the "show one row per job class
  and summarize" + "click into a row you get all the detail" + "more
  filters" asks without changing the schema. No labor-report.md edits
  needed.
- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`** —
  unchanged. Still the archive-of-rationale for the S35 live-fetch
  layer.
- **`docs/DECISIONS.md`** — no new ADRs in PR #116. Phase 2.4 ADR
  queue unchanged at 5.
- **`docs/data-sources/`** — no changes.

### New drift items

**Zero noteworthy drift items this session.** PR #116 landed clean,
no test-count discrepancies, no unintended file changes. Two tiny
follow-ups surfaced (`Close` aria-label disambiguation + the unused
`filterRollups` export); both are low-priority, neither is a drift
worth tracking in the carry-forwards.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #116 | Summary-row redesign collapses tall stacked rows to one compact line | stable |
| 2 | PR #116 | `summarizeRollup` extracts compact-row inputs as pure helper with v1 citywide-hint heuristic | stable |
| 3 | PR #116 | `applyEligibilityFilters` replaces substring-only filter with full structured shape (search · status · examTypes · departments · citywideOnly) | stable |
| 4 | PR #116 | Modal pattern matches established KosPos idiom (5th instance — lift candidate) | stable |
| 5 | PR #116 | Inline department multi-select inside FilterToolbar — appropriate for v1 scope | stable |
| 6 | PR #116 | `npm run build` clean first-run (7 sessions running) | stable |
| 7 | PR #116 | Tests 620/620 (+31 from S36 baseline of 589) | stable |
| 8 | PR #116 | Preview-MCP verification at scale — 137 postings, 90 rollups, 33-of-90 dept filter, no console errors | stable |
| 9 | PR #116 | Eligibility tab stays devOnly — cross-tab nav still gates promotion | stable |
| 10 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 11 | Carry-forward B | SESSION_LOG.md ~3,170 lines after S36 entry | tracking — still queued |
| 12 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 13 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 14 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 15 | Carry-forward F | Audit cadence working as designed (13th event-based trigger) | working as designed |
| 16 | New drift — memory | 10 files indexed; links resolve | stable |
| 17 | New drift — hooks/settings | No changes | stable |
| 18 | New drift — anchors | No heading edits this phase | stable |
| 19 | New drift — tool sprawl | 2 new files in existing subdir; no new deps, no new ADRs | stable |
| 20 | New drift — doc-vs-impl | No drift; Tab 11 spec still matches implementation | stable |
| 21 | Housekeeping (carries) | 36+ stale local-only `docs/*` branches + ~12 `claude/*` branches | low priority |

**Totals:** 1 carry-forward resolved earlier (A from S33, stays
dropped) · 3 carry-forward unchanged (B, C, D) · 1 stays-dropped
(E) · 1 working-as-designed (F) · 9 stable PR follow-ups + 1
housekeeping carry.

---

## Recommendations not actioned

In priority order:

1. **Cross-tab nav from Eligibility → Positions** — clicking a job
   code in the EligibilityView's summary table filters Positions tab
   to that jobCode. Bundleable with the Eligibility / Probation
   promotion to non-dev. ~1-2 hours. Now that the Eligibility UX is
   clean, this is the natural next sub-phase candidate.
2. **Promote Eligibility + Probation to non-dev** — after the
   cross-tab nav lands and Alex has used it in his real workflow.
3. **Lift modal overlay-frame to `lib/ui/Modal.tsx`** — 5th instance
   of the same fixed-overlay-no-Portal pattern (now: PositionDetail,
   ProbationDetail, SeparationDetail, PlannedActionDetail,
   EligibilityDetail). Each modal currently re-implements the wrapper
   `<div role="dialog" aria-modal …>`. A small `<Modal>` shell would
   delete ~30 LoC per consumer. ~1-2 hours.
4. **Rename `EligibilityDetail` header-close's `aria-label`** to
   `Close detail` to disambiguate from the footer's `Close` button —
   surfaced by the view tests needing `textContent === 'Close'` to
   pick the footer one. ~5 minutes; bundle with a future
   EligibilityView touch.
5. **Remove the now-unused `filterRollups`** export — `applyEligibilityFilters`
   subsumes it. ~5 minutes; bundle with the next scrapers touch.
6. **Schedule SESSION_LOG.md trim** (item B) — ~3,170 lines after S36;
   bundleable with item C + the Tab 24 Improvement #6 holdReason
   language update + the OBI serial doc note + the research-doc-
   location WORKFLOW.md note + the TS-param-property tip + this
   session's modal-aria-label tip. ~2-2.5 hours combined.
7. **Migrate the citation anti-pattern** (item C) — 12 instances;
   ~20 minutes.
8. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
9. **Queue ADR amendments for Phase 2.4** — still 5 queued
   (no-upstream-source 4-view + scraper-layer derived-data
   extension, optionally consolidated).
10. **Lift `buildProbation*Email` to `lib/ui/notifications/`** —
    only if a 2nd consumer arrives.
11. **Local-branch cleanup** (low priority) — ~36+ stale `docs/*`
    + ~12 `claude/*` branches; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-l-close-audit.md](phase-2-2-l-close-audit.md)
  (Session 35).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.m implementation:
  [PR #116](https://github.com/alkprojects/kospos/pull/116) (Eligibility
  summary + filters + detail modal) + Session 36 SESSION_LOG.md entry
  (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
