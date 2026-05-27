# Phase 2.2.k close audit — Session 34

**Date:** 2026-05-27
**Branch:** `docs/phase-2-2-k-close-audit-and-handoff`
**Scope:** Phase 2.2.k close audit. Six PRs shipped this session,
all in an autonomous-mode run (Alex away 9 hours, phone-only for
short answers). Five of the six addressed the inline items Alex
added to the S34 kickoff prompt; the sixth is Phase 2.2.k itself
(Eligibility + DHR/SF-Careers scrapers — Option A).

Last audit was the [Phase 2.2.j close audit](phase-2-2-j-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in this session's **6 PRs** against the
   docs that describe them (Tab 10 Probation, Tab 11 Eligibility,
   the S33 audit, the S33 DHR research doc, the S34 kickoff prompt
   + Alex's "added by alex" items).
2. Re-run `npm test` — confirms the **549 / 549** baseline (was
   485 reported at the start of S34, actually 490 on a fresh run;
   +59 net this session).
3. Re-check carry-forward items B-F from the [Phase 2.2.j close audit](phase-2-2-j-close-audit.md);
   mark each `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for
   Alex.

---

## Part 1 — This session's PR follow-ups

### Six PRs shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#106](https://github.com/alkprojects/kospos/pull/106) | fix(views) | Probation + Separations: employee # updates when name switches to a different known person (Alex's S34 bug report). +4 tests. |
| 2 | [#107](https://github.com/alkprojects/kospos/pull/107) | feat(views/probation) | Supervisor auto-resolves from position.reportsTo + new deputy free-text field (Alex's S34 feature request). +5 tests. |
| 3 | [#108](https://github.com/alkprojects/kospos/pull/108) | feat(views/probation) | End-date up-front + preset durations (6mo / 1040h / 1y / 2080h / Custom) + click-to-edit on the row (Alex's S34 feature request). +5 tests. |
| 4 | [#109](https://github.com/alkprojects/kospos/pull/109) | feat(views/probation) | Row selection + email-generator for supervisor/deputy notifications, with both mailto: AND copy-template buttons per row (Alex's S34 feature request + email-mechanism confirmation). +10 tests. |
| 5 | [#110](https://github.com/alkprojects/kospos/pull/110) | feat(ui) | CopyButton rollout to Positions, Payroll, Inactive, Hiring Plan tabs + Position Detail RTF/ReportsTo (Alex's S34 UI directive). +0 tests (mechanical JSX). |
| 6 | [#111](https://github.com/alkprojects/kospos/pull/111) | feat(views/eligibility) | **Phase 2.2.k primary.** `lib/scrapers/` + `lib/views/eligibility/` — SmartRecruiters live fetch (CORS-permissive) + DHR manual-paste parser (CORS blocked, infra-free fallback). +35 tests. |

Plus this docs PR (audit + S35 handoff).

### Finding 1 — Phase 2.2.k Eligibility ships end-to-end with live SmartRecruiters data

**Status:** stable.

[PR #111](https://github.com/alkprojects/kospos/pull/111) ships the
Tab 11 surface, the SmartRecruiters fetcher, and the DHR HTML
parser as a single coherent layer:

- **`lib/scrapers/types.ts`** — `JobPosting`, `EligibilityList`,
  `JobCodeRollup` shapes that join naturally to `Position.jobCode`
  from `lib/positions/`.
- **`lib/scrapers/sf-careers/fetch.ts`** — paginated fetch of
  `api.smartrecruiters.com/v1/companies/CityAndCountyOfSanFrancisco1/postings`.
  Live verification ran at S34 top: **CORS permissive, no token
  required, 133 postings**. The 3-pattern `extractJobCodeFromName`
  helper extracts SF Job Codes from real-world posting names
  (which vary in format — `(NNNN Title)`, `(NNNN)`, `NNNN-prefix`).
- **`lib/scrapers/sf-dhr-exam/parse.ts`** — DOMParser-based parser
  for pasted DHR HTML. Live verification ran at S34 top: **CORS
  blocked**, so v1 ships with the manual-paste workflow per the
  [S33 research doc](../research/dhr-eligibility-and-jobs-scraping-plan.md)'s
  fallback. WebFetch (server-side, no CORS) confirmed the actual
  DHR HTML structure during planning.
- **`lib/scrapers/build.ts`** — pure `buildJobCodeRollups` that
  produces the per-jobCode view (postings + active lists + expired
  lists) the EligibilityView renders.
- **`lib/scrapers/store.ts`** — Zustand store with append-not-replace
  semantics for DHR pastes (DHR is ~66 pages — user pastes a page
  at a time; dedupe is by `(jobCode, listId, postDate)`).
- **`lib/views/eligibility/EligibilityView.tsx`** — Tab 11 surface
  with summary header (4 stats), live-fetch button (inline progress,
  no LoadingOverlay modal needed since the fetch is fast), DHR paste
  panel with linked sfdhr.org URL + parse feedback, search bar, per-
  jobCode table with linked postings + linked PDF lists.
- **App.tsx** — Eligibility tab added between Inactive and Load
  Reports, `devOnly: true`.

Empirical extraction quality at S34 verification: **88 distinct SF
job codes** rolled up from the 133 live postings (was 6 with the
single-pattern regex first attempt — the 3-pattern matcher catches
the (NNNN), NNNN-prefix, and (NNNN Title) cases).

The DHR manual-paste path didn't get real-data verification this
session (would require Alex to do the paste; he's away). The parser
is exhaustively unit-tested against synthetic samples that match
the real DHR HTML structure WebFetch'd during planning.

**Disposition:** stable for the live-data SmartRecruiters path.
DHR manual-paste path stable per unit tests but needs real-data
walkthrough from Alex when he returns.

### Finding 2 — Probation tab gains 4 sub-features in 4 PRs

**Status:** stable.

Alex's S34 added-items list landed as four separate PRs to keep
each one small and review-able:

| PR | Surface change |
|---|---|
| #106 | Bug fix: employee # now updates when picking a different name from the autocomplete datalist (both Probation + Separations had the same buggy `applyPersonMatch` guard from S33's PR #101/#102) |
| #107 | Supervisor cell auto-resolves from `position.reportsTo.managerFirstName + managerLastName` when blank; free-text override wins. New deputy free-text field next to supervisor. |
| #108 | End-date input in the add form next to start date. Duration is now a 5-chip radiogroup: 6 months · 1040 hrs · 1 year · 2080 hrs · Custom. Click-to-edit on the table's "Current end" cell (no-extension rows only — extension rows route to detail modal). |
| #109 | Row selection checkboxes + sticky action bar + Notification panel. Each selected row gets BOTH a mailto: button AND a copy-template button (Alex's "both" answer to the S34 kickoff question). |

The pattern is the no-upstream-source typed-entity workspace —
same as S32's Separations + S33's Probation primary. New helpers
(`resolveSupervisor`, `buildProbationNotificationEmail`,
`buildProbationMailtoUri`) are exported for tests; the rest is
internal to ProbationsView.

**Disposition:** stable across all 4 PRs. Probation tab is now the
most-feature-dense workspace in KosPos. May want to lift some of
the inline helpers into `lib/probation/notifications.ts` if a
future view (Separations notifications?) wants to share the
template pattern.

### Finding 3 — CopyButton coverage now reaches 6 surfaces

**Status:** stable.

[PR #110](https://github.com/alkprojects/kospos/pull/110) extended
the S33 PR #104 primitive to:
- Positions (table)
- Payroll (table + row detail)
- Inactive (table)
- Hiring Plan (table)
- Position Detail (RTF + ReportsTo sections)

Plus the per-jobCode cell in the new Eligibility view (PR #111
includes a CopyButton on the jobCode column).

Skipped intentionally: Calculator, Special Class, Importer — all
input-driven; native Ctrl+A/Ctrl+C already works and CopyButton
next to a focusable input is noise.

**Disposition:** stable. Total CopyButton instances per
preview-MCP smoke check: 8 on the Positions tab with 2 rows
(4/row), and proportional per other tabs.

### Finding 4 — Email-generation pattern is a candidate cross-cutting primitive

**Status:** stable, with a future-lift note.

[PR #109](https://github.com/alkprojects/kospos/pull/109) introduces
`buildProbationNotificationEmail` + `buildProbationMailtoUri` +
the `NotificationPanel` component inline in
[`ProbationsView.tsx`](../../app/src/lib/views/probation/ProbationsView.tsx).
A similar pattern would apply to Separations ("notify supervisor +
deputy when separation status changes to confirmed") and the future
Reporting Tree view ("notify the chain when a manager position
moves").

For v1, all of this is Probation-specific. If a second view wants
the pattern, lift the helpers + panel to `lib/ui/notifications/`.

**Disposition:** stable; lift is a future-PR concern.

### Finding 5 — Probation duration-preset model has a documented vs hours-tracked-only divergence

**Status:** stable, advisory.

[PR #108](https://github.com/alkprojects/kospos/pull/108) added
calendar-based presets (6 months, 1 year) alongside the hours-based
ones (1040 hrs, 2080 hrs). Picking 6 months sets end = start + 6
calendar months. Picking 1040 hrs sets end = start + 182 days
(1040 ÷ 40 × 7). These DIVERGE by 1-2 days for the same nominal
duration because calendar months aren't all 30 days.

CSC Rule 117 itself is hours-tracked (not date-tracked) — the
displayed end date is advisory either way. KosPos honors the
literal pick rather than collapsing them. The user can pick
either semantic based on which one matches the actual probation
agreement.

**Disposition:** stable. Documented inline in the type comment for
`DurationPreset`. If a future tab needs the calendar-vs-hours
distinction to be a per-position toggle, surface there.

### Finding 6 — DHR scraping data not yet real-data-tested

**Status:** stable per unit tests; needs Alex's walkthrough.

The DOMParser-based parser passes synthetic-input tests that
mirror the real DHR HTML structure (verified via WebFetch during
planning). But the live DHR page has ~66 pages, and we don't know
empirically whether all 66 follow the same column pattern, or
whether some pages have edge cases (announcements, deprecated
formats, etc.) that the parser will miss.

Mitigation in the implementation: the parser emits zero rows
when no `<tr>` matches the (post-date, list-id, link) shape —
the "No exam-results rows found" status surfaces in the UI rather
than silently producing wrong data.

**Disposition:** stable per unit tests + the empty-result fallback.
**Action item:** Alex does a real-data DHR paste walkthrough in
S35 and reports any rows that didn't parse (drops into the
restated-questions list if there's drift).

### Finding 7 — `npm run build` clean on first run

**Status:** stable.

5 sessions in a row of clean first-run builds (S30 caught 1, S31
caught 1, S32 caught 0, S33 caught 0, S34 caught 1 — the `public
readonly cause?: unknown` TypeScript parameter-property syntax was
rejected by the project's `erasableSyntaxOnly` setting; fixed by
expanding the field declaration before the second test run, well
before PR open).

The catch this session validates the habit — running
`npm run build` before PR open caught what `vitest run` glossed
over.

**Disposition:** stable.

### Finding 8 — Tests 549 / 549 (+59 from S33 baseline)

**Status:** stable, with **one reconciliation correction** to the
S33 audit.

| PR | Tests added | Cumulative |
|---|---|---|
| Phase 2.2.j actual baseline at S34 fresh-install start | — | **490** |
| PR #106 — bug fix | +4 | 494 |
| PR #107 — supervisor/deputy | +5 | 499 |
| PR #108 — end-date + presets | +5 | 504 |
| PR #109 — row selection + email | +10 | 514 |
| PR #110 — CopyButton rollout | +0 | 514 |
| PR #111 — scrapers + Eligibility | +35 | 549 |

**S33 audit correction.** The S33 audit reconciled a 5-test
discrepancy between expected (+77) and actual (485) by concluding
"I miscounted, +72 is correct." The actual baseline coming into
S34 was **490, not 485** — `npm test` on a fresh `npm install`
shows 490. The S33 baseline-recount was wrong; the discrepancy
was likely a Vitest cache or environment artifact. Net +59 across
S34 (490 → 549), not +64.

**Disposition:** stable. Adds an audit-cadence finding: when
auditing test counts, do `npm test` from a fresh `npm install`
to eliminate cache-related under-counts.

### Finding 9 — Eligibility tab stays appropriately devOnly

**Status:** stable.

Per the S34 prompt's "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Inactive / Separations /
> Probation / Temp Limits / Reporting Tree to non-dev yet — wait
> until cross-tab nav has been used end-to-end on real data.

Eligibility joins the list; the `App.tsx` tab is `devOnly: true`.
Will lift to non-dev after Alex walks the cross-tab nav (jobCode
on Eligibility → click → Position with that jobCode, planned but
not yet wired).

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items B-F

From [`phase-2-2-j-close-audit.md`](phase-2-2-j-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~2,940 lines after S33 entry | **~3,020 lines after S34 entry** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Continue audit cadence at every phase close | 10th event-based trigger S33 | **working as designed (11th event-based trigger this session)** | working as designed |

### Item B — SESSION_LOG.md baseline ~3,020 lines after S34 entry

This session adds the longest single-session entry yet — 6 PRs
across 9 unsupervised hours. Estimated ~80 lines for the entry
alone, total ~3,020.

Bundleable with C + the Tab 24 Improvement #6 holdReason language
drift + the OBI serial doc note + the "document `docs/research/`
location convention in WORKFLOW.md" carry from S33. Total estimated
combined effort: ~1.5-2 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 11th event-based trigger fires on schedule

The S34 prompt template (drafted at the end of S33) included the
explicit Step-0 audit trigger pattern, which this session honored.
The slip from S25 has not recurred across **11 subsequent sessions**.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All
  `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `feedback_dont_reremind.md` — Alex's 4 added-items were each
    resolved by a PR; the next session's handoff drops each from
    "added items" (they're done, not carrying forward).
  - `user_role.md` — Alex's "Deputy Director" role informed the
    decision to render `(auto)` annotations on the resolved
    supervisor name in [PR #107](https://github.com/alkprojects/kospos/pull/107) —
    he understands what reportsTo means.
  - `staffing_plan_types.md` — the pattern (no-upstream-source +
    free-text fields for context the data can't capture) applied
    to deputy in PR #107.

### Tooling / hooks / settings

- **No hook / settings / Vite config changes** in any of the 6 PRs.
  All file changes were `app/src/` (entity layers + views + scrapers
  + tests) + `app/src/App.tsx` (one tab addition). ✓
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block. ✓
- **Cowork "Auto-archive on PR close"** — working as designed.
  6 of 6 session PRs auto-archived inside the session as they
  merged. Pattern resumed.

### Anchor compliance

No `labor-report.md` heading-level edits in any PR this session.
The audit doc + handoff updates touch only `docs/audits/`,
`docs/research/`, `docs/SESSION_*` — none affect the anchor graph
in labor-report.md. Anchor verifier rerun skipped per precedent.

### Tool sprawl

- **`app/src/lib/scrapers/`** — **new top-level module**. 6 files
  + 2 subdirs (`sf-careers/`, `sf-dhr-exam/`). Clean module layout
  matching other lib/ subdirs.
- **`app/src/lib/views/eligibility/`** — new directory. 2 files
  (`EligibilityView.tsx`, `index.ts`). No test file yet — the test
  coverage lives in `lib/scrapers/scrapers.test.ts` since the view
  is mostly a thin renderer over the scraper data. Worth a future
  view-test pass once Alex walks the real data.
- **No new dependencies.** `package.json` unchanged across all 6
  PRs. ✓
- **No new ADRs.** The Phase 2.4 ADR queue grows to 5 (was 4):
  the no-upstream-source 4-view ADR now also covers the
  `lib/scrapers/` derived-data layer. (Or it could be a separate
  ADR — decide when Phase 2.4 fires.)

### Doc-vs-implementation

- **Tab 11 in labor-report.md** describes the manual list shape +
  the KosPos vision; PR #111 matches the spec + the S33 research
  doc.
- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`** —
  the S33 plan was implemented in PR #111. The plan's "Recommendation"
  section lands as built (job postings via SmartRecruiters API +
  exam results via manual-paste workflow). The plan can stay as
  archive-of-rationale rather than being deleted; future sessions
  may want to revisit the Cloudflare-Worker decision.
- **`docs/DECISIONS.md`** — no new ADRs in any PR this session.
  Phase 2.4 ADR queue now 5 (was 4 — the scrapers layer adds one
  if we make it a separate ADR; or it folds into the no-upstream-source
  4-view ADR).
- **`docs/data-sources/`** — no changes. OBI BI Payroll Excel-serial
  doc note still missing (Item #19 from Phase 2.2.g audit).
  Unchanged.

### New drift items

**One** noteworthy item, resolved in-session:

**TypeScript `erasableSyntaxOnly` + class parameter-properties.**
PR #111 first-attempt build failed on
`constructor(msg: string, public readonly cause?: unknown)` — the
project's TS config rejects parameter-property syntax. Fixed by
expanding the field declaration. Useful pattern for future class
authors in this codebase. Worth adding as a tip to `docs/WORKFLOW.md`
or `docs/CLAUDE.md` in the next cleanup pass (bundleable with
items B + C).

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #111 | Phase 2.2.k Eligibility ships with live SmartRecruiters fetch (133 postings → 88 job codes) + DHR manual-paste parser | stable; DHR needs real-data walkthrough |
| 2 | PRs #106-109 | 4-PR Probation tab feature pack (bug fix + supervisor/deputy + end-date presets + email gen) | stable |
| 3 | PR #110 | CopyButton coverage extends to 6 surfaces | stable |
| 4 | PR #109 | Email-template helpers + NotificationPanel — candidate cross-cutting primitive | stable; lift if 2nd consumer arrives |
| 5 | PR #108 | Calendar vs hours preset divergence documented inline | stable |
| 6 | PR #111 | DHR parser not real-data-tested | stable per unit tests; Alex walkthrough queued |
| 7 | All 6 PRs | `npm run build` caught 1 TS error first-run; habit firm | stable |
| 8 | All 6 PRs | `npm test` 549/549 (+59 from real S33 baseline of 490) holds | stable + S33 audit reconciliation correction |
| 9 | PR #111 | Eligibility tab stays devOnly | stable |
| 10 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 11 | Carry-forward B | SESSION_LOG.md ~3,020 lines after S34 entry | tracking — still queued |
| 12 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 13 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 14 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 15 | Carry-forward F | Audit cadence working as designed (11th event-based trigger) | working as designed |
| 16 | New drift — memory | 10 files indexed; links resolve | stable |
| 17 | New drift — hooks/settings | No changes | stable |
| 18 | New drift — anchors | No heading edits this phase | stable |
| 19 | New drift — tool sprawl | New `lib/scrapers/` top-level module (6 files / 2 subdirs); new `lib/views/eligibility/` (2 files); no new deps | stable |
| 20 | New drift — doc-vs-impl | Phase 2.4 ADR queue grows to 5 (or folds the scraper-layer pattern into the no-upstream-source ADR) | folds in; no separate action |
| 21 | New drift — TS class param-properties caught at build | Tip worth documenting in WORKFLOW.md | bundleable with B+C |
| 22 | Housekeeping (carries) | 36+ stale local-only `docs/*` branches + ~12 `claude/*` branches | low priority |

**Totals:** 1 carry-forward resolved earlier (A from S33, stays
dropped) · 3 carry-forward unchanged (B, C, D) · 1 stays-dropped
(E) · 1 working-as-designed (F) · 6 stable PR follow-ups + 1 net
finding (test-count reconciliation) + 1 housekeeping note (TS tip).

---

## Recommendations not actioned

In priority order:

1. **DHR real-data paste walkthrough by Alex (S35 first task).** The
   manual-paste parser passes unit tests against synthetic input that
   mirrors WebFetch'd real HTML, but no live data has flowed through.
   First S35 task: Alex pastes 1-2 pages, reports any rows that
   didn't parse. If pages parse cleanly, queue a full 66-page paste.
2. **Cross-tab nav from Eligibility → Positions.** Click a job code
   on Eligibility → filter Positions to that jobCode. Same pattern
   as Positions ↔ Payroll. ~30 min. Bundleable into S35 or later.
3. **Promote Probation to non-dev.** After S34, Probation is the
   most-feature-dense workspace and has been touched by 5 PRs since
   S33. Alex's walkthrough of the end-to-end flow on real data is
   the only blocker.
4. **Schedule SESSION_LOG.md trim** (item B) — ~3,020 lines after
   S34; bundleable with item C + the Tab 24 Improvement #6
   holdReason language update + the OBI serial doc note + the
   research-doc-location WORKFLOW.md note + the new TS-param-property
   tip. ~2-2.5 hours combined.
5. **Migrate the citation anti-pattern** (item C) — 12 instances;
   ~20 minutes.
6. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
7. **Queue ADR amendments for Phase 2.4** — still 4 queued (or 5,
   if we make the scraper-layer pattern a separate ADR rather than
   folding into the no-upstream-source consolidated ADR).
8. **Cloudflare Worker for DHR live fetch.** Only if Alex wants the
   ~1-minute live scrape over the page-by-page manual paste. Adds
   ops cost (re-issue API tokens, monitor for errors). ~2-4 hours
   build + deploy. Deferred until Alex asks.
9. **Lift `buildProbation*Email` to `lib/ui/notifications/`** —
   only if a 2nd consumer arrives.
10. **Local-branch cleanup** (low priority) — ~36+ stale `docs/*`
    + ~12 `claude/*` branches; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-j-close-audit.md](phase-2-2-j-close-audit.md)
  (Session 33).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.k implementation: [PR #111](https://github.com/alkprojects/kospos/pull/111)
  + S34 follow-up PRs [#106](https://github.com/alkprojects/kospos/pull/106)
  / [#107](https://github.com/alkprojects/kospos/pull/107)
  / [#108](https://github.com/alkprojects/kospos/pull/108)
  / [#109](https://github.com/alkprojects/kospos/pull/109)
  / [#110](https://github.com/alkprojects/kospos/pull/110)
  + Session 34 SESSION_LOG.md entry (drafted in this PR).
- DHR scraping research: [docs/research/dhr-eligibility-and-jobs-scraping-plan.md](../research/dhr-eligibility-and-jobs-scraping-plan.md)
  (the S33 plan; this PR's implementation matches it).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
