# Phase 2.2.p close audit — Session 39

**Date:** 2026-05-28
**Branch:** `claude/peaceful-thompson-acadd8`
**Scope:** Phase 2.2.p close audit. **One PR** shipped this session
([PR #123](https://github.com/alkprojects/kospos/pull/123) — Eligibility
drill-modal UX overhaul: Duration column · Exam Type replaces Sub-type ·
in-modal filter chip row · sortable column headers · top-of-modal
extraction progress bar). Plus a research doc on cross-device persistence
architecture (the user's S38/S39 directive) landing alongside the
audit in this docs PR.

Alex's S39 directive was concrete UX feedback layered on the S39
menu's Option A. The recommended split (drill UX this session,
persistence-architecture decision doc this session, implement next)
was accepted; both pieces shipped.

Last audit was the [Phase 2.2.o close audit](phase-2-2-o-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in this session's **1 PR** against the
   docs that describe it (S39 SESSION_HANDOFF prompt, [PR #119](https://github.com/alkprojects/kospos/pull/119)'s
   Phase 2.2.p follow-up notes, Phase 2.2.o close audit's
   "Recommendations not actioned" list).
2. Re-run `npm test` — confirms **762 / 762** baseline (was 718 at
   S39 start; +44 net from PR #123 = 762).
3. Re-check carry-forward items B–F from the [Phase 2.2.o close
   audit](phase-2-2-o-close-audit.md); mark each `unchanged`,
   `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR follow-ups

### One PR shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#123](https://github.com/alkprojects/kospos/pull/123) | feat(views/eligibility) | Phase 2.2.p — drill-modal UX overhaul. Duration column · Exam Type replaces Sub-type · in-modal filter chip row · sortable column headers · progress bar. +44 tests. |

Plus this docs PR (audit + S39 SESSION_LOG entry + S40 SESSION_HANDOFF +
the persistence-architecture research doc).

### Finding 1 — Real DHR data refutes the constant-2yr assumption (resolved by Duration column)

**Status:** resolved in PR #123.

[Phase 2.2.o close audit Finding 2](phase-2-2-o-close-audit.md#finding-2--real-dhr-data-contradicts-the-phase-22n-constant-2yr-duration-assumption)
flagged this as a carry-forward. PR #123 ships the surfacing:

- Per-row Duration column with PDF-extracted values (`12 Months`,
  `6 Months`, `24 Months` observed).
- Expires column now uses per-list Duration (via the extended
  `computeListExpiration(list, windowDays, durationStr)` signature).
- Header "Duration: 2 yr · CSC 411A/412" chip dropped — the
  constant was misleading on real data.
- Fallback to `2 yr` only when the PDF doesn't carry a Duration
  row (or extraction failed). Tooltip explains.

Verified live on 0932 Manager IV: list `140556` postDate `2024-08-01` +
extracted `6 Months` → Expires `2025-01-28` (formerly `2026-08-01`
under the constant-2yr model). The shift is the proof.

**Disposition:** resolved. Phase 2.2.n design assumption is named
as refuted in the doc-comment header of `EligibilityDetail.tsx`.

### Finding 2 — Exam Type column promotes the right field

**Status:** resolved in PR #123.

[Phase 2.2.o close audit Finding 3](phase-2-2-o-close-audit.md#finding-3--bonus-examtype-field-captured-but-not-surfaced)
flagged `examType` (PBT/ETP/CBT/Q&E — the testing methodology) as
captured but not surfaced. Alex's S39 directive made the call:
"the important field to show is exam type, not list type." PR
#123 replaces the Sub-type column (CPE / examSubType — the
classification) with Exam Type (the methodology).

Trade-off accepted: the List Type / examSubType value still lives
on `PdfExtract` for future use, but isn't rendered per-row. This
is the third design call where Alex chose UX prominence over
information density — consistent with the per-row Type column
drop (S37) and the constant-Duration chip drop (this PR).

**Disposition:** resolved.

### Finding 3 — In-modal filter shape matches the main toolbar

**Status:** stable.

Alex's S39 ask: "the drill window should have search/filter options
like every other page." Cleanest reading: same chip-row shape as
the main EligibilityView FilterToolbar. PR #123 implements that
exactly: search · status · exam type chips · dept multi-select ·
citywide-only · reset · match count.

Two design subtleties that landed cleanly:

1. **Filter universes are scoped to the rollup.** Available exam
   type chips + dept options come from the rollup's own pdfCache
   entries (via `collectExamTypes` / `collectListDepartments`),
   not the global universe. The chip row only shows axes that
   actually distinguish lists *within this rollup* — no noise.

2. **Loading state passes through the filter.** Rows without a
   cache entry yet still appear even when a filter axis is active.
   Otherwise filtering by Dept while extractions are still
   loading would briefly empty the table. The cache populates →
   the filter narrows naturally.

Documented at [build.ts:`applyEligibilityDetailFilters`](../../app/src/lib/scrapers/build.ts).

**Disposition:** stable.

### Finding 4 — Progress bar UX with rollup-scoped visibility

**Status:** stable; preview-MCP verified.

Determinate progress bar shows `N of M extracted` while extractions
are in flight. Three subtleties:

- **Scoped to visible sections.** Counts active lists always +
  expired lists only when the expired-section disclosure is open.
  Matches the gated-extraction behavior so the bar's denominator
  doesn't include rows that aren't actively fetching.
- **Hidden at 100%** — fades cleanly so the user knows extraction
  is done without dwelling on the bar.
- **Hidden for single-list rollups.** Per-cell `…` already conveys
  loading state for one row; the bar would be noise.

Preview-MCP timing on 0932 Manager IV: `0 of 37` → `21 of 37` ~12s
later → gone at 100% after ~25s total. Clean.

**Disposition:** stable.

### Finding 5 — Click-to-sort cycle: 2-state toggle, not 3-state

**Status:** stable; corrected mid-implementation.

Initial design used a 3-state cycle (asc → desc → reset-to-default).
The reset-to-default state was a no-op on the default column
(`postDate desc` is both the default and a state in the cycle),
which would confuse the user — clicking the Post date header once
in the default view would visibly do nothing.

Switched to 2-state (asc ↔ desc). Reset is achieved by clicking
any other column → returns to that column's asc. Predictable +
matches the spreadsheet-sort UX users already know.

**Disposition:** stable.

### Finding 6 — Blanks-last sort semantics

**Status:** stable.

`sortEligibilityLists` puts blank/undefined values last regardless
of direction, matching the spreadsheet intuition of "blanks at the
bottom." Without this, sorting by Duration (where some rows have
extracted values + others don't yet) would shuffle the unloaded
rows to the top in asc, away from where the user expects them.

Implementation: a `decorated` array maps each row to a primary
sort value + an `isBlank` flag; the comparator short-circuits
blank-vs-non-blank before comparing. Stable on ties via the
original input index.

**Disposition:** stable.

### Finding 7 — Per-list Duration parser tolerates real-world variation

**Status:** stable.

The `parseDuration` helper handles every variant observed on real
DHR PDFs + the most common typographical edge cases:

| Input | Output (days) |
|---|---|
| `12 Months` | 360 |
| `6 Months`  | 180 |
| `1 Year`    | 365 |
| `2 years`   | 730 |
| `30 days`   | 30 |
| `12mo`      | 360 |
| `1yr`       | 365 |
| `30d`       | 30 |
| `Approximately 12 Months` | 360 |
| `forever` / `TBD` / `12` / `Months` / `0 Months` | undefined |

Returning `undefined` (rather than the 2yr default) lets the
caller distinguish "no value given" from "parsed and unknown" —
the former falls back to the 2yr default, the latter falls back
silently. 9 unit tests cover the matrix.

Months convert at 30 days/month — matches DHR's own internal
arithmetic (DHR uses month-granular durations, not day-granular).
The slight calendar drift (12 × 30 = 360, not exactly 1 year) is
documented in the parser's doc-comment.

**Disposition:** stable.

### Finding 8 — `npm run build` clean first-run (10 of 10 practical)

**Status:** stable.

`npm run build` first-run completed without errors. Same
`INEFFECTIVE_DYNAMIC_IMPORT` warning category that S38 caught did
not recur — pdf-parse's runtime exports stayed out of the static
re-export tree as designed in S38.

The chunk-size warning (`>500 KB after minification`) is informational
+ has been around for many sessions. Same value before/after this
PR — main bundle grew from 1,172 KB to 1,182 KB gzip (314 KB), all
in the new EligibilityDetail UI code. Acceptable; the lazy-loaded
pdf chunks stayed put.

Streak: 9 of 10 strict-clean / 10 of 10 practical-clean (S38's
warning was caught + resolved in-session and counted only by the
strict measure).

**Disposition:** stable.

### Finding 9 — Tests 762 / 762 (+44 from S39 baseline of 718)

**Status:** stable.

| PR | Tests added | Cumulative |
|---|---|---|
| Phase 2.2.o baseline at S39 start | — | **718** |
| PR #123 — Phase 2.2.p drill-modal UX | +44 | 762 |

The +44 breaks down as:

- `scrapers.test.ts` — +30 tests:
  - `parseDuration` — 9
  - `computeListExpiration` with `durationStr` — 5
  - `applyEligibilityDetailFilters` — 8
  - `collectExamTypes` / `collectListDepartments` — 2
  - `sortEligibilityLists` — 6

- `eligibility-view.test.tsx` — +14 net:
  - `EligibilityDetail — Phase 2.2.p Duration column` — 3
  - `EligibilityDetail — Phase 2.2.p in-modal filter chip row` — 5
  - `EligibilityDetail — Phase 2.2.p column-header sort` — 3
  - `EligibilityDetail — Phase 2.2.p extraction progress bar` — 3
  - 4 existing tests updated for the new column shape / chip
    presence / "12 Months"+"6 Months" extracts (net +14 after the
    rewrites).

**Disposition:** stable.

### Finding 10 — Test-collision pattern for chip-mirrored cell values

**Status:** stable; documented in the test file.

The in-modal filter chip row renders distinct examType values as
buttons. The same examType values also appear in per-row table cells.
`getByText('PBT')` fails when both render together because two
elements match. Tests now use `getAllByText('PBT').length >= 1`
where the chip row mirrors a cell value.

This pattern is documented inline in each affected test so
future sessions don't re-fix it. Filed as a low-priority audit
note: if the chip row grows further (e.g. dept-code chips
visible), more tests may need similar updates.

**Disposition:** stable; lightweight pattern to maintain.

### Finding 11 — Preview-MCP verification (133 + 6,732 → 753 rollups · 37 + 76 PDF extracts on 0932)

**Status:** stable.

Same live walkthrough as PR #121 (Phase 2.2.o), now exercising
the new affordances:

- All 37 active extractions completed ~25s after modal open
  (progress bar tracked 0 → 21 → done).
- Sample row data confirmed end-to-end:
  `2024-08-01 | 140556 | 6 Months | 2025-01-28 | expired 485d ago | Rule of the List | HSA | PBT`
  — the Expires shift to 2025-01-28 (vs. the prior +2yr 2026-08-01)
  proves the per-list Duration override is wired through.
- Filter exercised: ETP chip → 78 of 113 lists, active section narrowed
  to 2 rows. Sort exercised: List ID asc → `01112854` rendered first.
- Zero console errors.

**Disposition:** stable.

### Finding 12 — Persistence-architecture decision doc landed alongside audit

**Status:** new addition this session.

Per Alex's S38+S39 directive ("find a way for the data to persist
across sessions until updated or deleted… i want to share the
website with others and have them see the same data"), this
session ships `docs/research/persistence-architecture-options.md`
— a 4-option comparison (Cloudflare Pages + KV ★ / Vercel + KV /
GitHub Pages + data branch / Supabase) with a recommendation
(Cloudflare Pages + KV) + a concrete Phase 2.2.q scope outline +
4 open questions for Alex to answer before implementation starts.

The doc lives at `docs/research/` matching the convention set by
`dhr-eligibility-and-jobs-scraping-plan.md` (Session 33 research
doc that informed the Phase 2.2.k+ scraper layer). When the
implementation lands the resulting ADR will go in `DECISIONS.md`
per project convention.

**Disposition:** stable. Queued as Phase 2.2.q with Alex's
questions blocking start.

### Finding 13 — Filter universes scoped to rollup avoids overflow

**Status:** stable.

The main EligibilityView's department picker uses a dropdown-list
with checkboxes because 50+ depts make a chip-row overflow.
Inside the modal, the dept universe is much smaller (1-5 depts
typical, since it's restricted to one rollup's lists). A chip
row would have been viable here — but using the SAME dropdown
pattern keeps the toolbar visually identical to the main view
(Alex's "like every other page" ask).

The exam-type axis uses chips because the universe is small (2-4
values: PBT, ETP, CBT, Q&E). Consistent with the main view's
exam-type chips.

**Disposition:** stable.

### Finding 14 — `devOnly: true` on the Eligibility tab still holds

**Status:** stable.

Carries from S37/S38. PR #123 doesn't touch the `devOnly` flag.
The cross-tab nav from Eligibility → Positions (Option C in S39's
menu) remains the gating item for the Eligibility + Probation
promotion. 1-2 hour candidate when Alex picks it up.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items B–F

From [`phase-2-2-o-close-audit.md`](phase-2-2-o-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~3,310 lines after S38 entry | **~3,380 lines after S39 entry (est.)** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence — working as designed | 15th event-based trigger S38 | **16th event-based trigger this session** | working as designed |

### Item B — SESSION_LOG.md baseline ~3,380 lines after S39 entry

This session adds a 1-PR + 1-research-doc entry. Estimated ~70
lines for the entry, total ~3,380.

Bundleable with C + the Tab 24 Improvement #6 holdReason language
drift + the OBI serial doc note + the research-doc-location
WORKFLOW.md note + the TS-param-property tip. Estimated combined
effort: ~2 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 16th event-based trigger fires on schedule

The S39 prompt template (drafted at the end of S38) included the
explicit Step-0 audit trigger pattern, which this session honored.
The slip from S25 has not recurred across **16 subsequent sessions**.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All
  `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `user_role.md` — Alex's "describe trade-offs, recommend, act"
    posture drove the kickoff response: I answered his
    persistence-architecture question inline with a 4-option
    comparison + recommendation, then asked focused design picks
    via AskUserQuestion before starting code.
  - `data_sensitivity.md` — directly relevant to the persistence
    doc. KosPos data being SF public records lets the cross-device
    discussion stay on engineering + cost grounds, not DPA.
  - `session_logging.md` — S39 entry being added to SESSION_LOG.md.
  - `feedback_dont_reremind.md` — Alex acknowledged the
    cross-device persistence question by directing concrete work
    this session (drafting the decision doc); next session's
    handoff should not re-ask the broad "do you want persistence?"
    question — it should ask the 4 implementation-detail
    questions the decision doc surfaced.

### Tooling / hooks / settings

- **No new deps.** `pdfjs-dist` from S38 still the only addition
  to the scraper stack this phase block.
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged.
- **Stop hook (PR #51) firing as designed.** This handoff doc
  lands with a next-session prompt block.
- **Cowork "Auto-archive on PR close"** — PR #123 auto-archived.

### Anchor compliance

No `labor-report.md` heading-level edits in PR #123. Anchor
verifier rerun skipped per precedent.

### Tool sprawl

- **Two files edited in `app/src/lib/scrapers/`**:
  - `build.ts` — extended with `parseDuration` + per-list helpers.
  - `index.ts` — re-exports.
- **One file edited in `app/src/lib/views/eligibility/`**:
  - `EligibilityDetail.tsx` — significant rewrite (additive,
    no behavior removed from the row level except the dropped
    Sub-type column).
- **One new doc**: `docs/research/persistence-architecture-options.md`.
- **No new ADRs** (5 still queued for Phase 2.4).
- **`filterRollups` export** still has no in-app consumer (carry
  from S36). Removing it stays a separate-PR follow-up.

### Doc-vs-implementation

- **Tab 11 in `labor-report.md`** describes the manual list shape +
  KosPos vision; PR #123 enriches the per-row display + adds the
  filter/sort layer without changing the schema. No labor-report.md
  edits needed.
- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`** —
  the "PDF parsing — not in v1" framing in that doc is **still
  stale** (carried from S38). 5-minute fix; bundle with any other
  research-doc touch.
- **`docs/DECISIONS.md`** — no new ADRs in PR #123. Phase 2.4 ADR
  queue unchanged at 5 (could grow to 6 if Alex picks Option α
  for persistence — would warrant a "Cross-device persistence via
  Cloudflare Pages + KV" ADR when shipped).
- **`docs/data-sources/`** — no changes.

### New drift items

- **Persistence-architecture doc** — landed cleanly. No drift.
- **Per-list Duration override semantics** are now in two places
  (the parser at `parseDuration` + the computeListExpiration
  signature) — both well-documented but worth a note that
  changes to the "default 2yr" constant need to update both.
  Low-priority; filed as a comment in the parser's doc-comment.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #123 | Per-list Duration column refutes constant-2yr (Phase 2.2.o follow-up #1) | resolved |
| 2 | PR #123 | Exam Type column replaces Sub-type (Phase 2.2.o follow-up #2) | resolved |
| 3 | PR #123 | In-modal filter chip row matches main toolbar shape | stable |
| 4 | PR #123 | Progress bar — rollup-scoped, hides at 100% and for 1-list rollups | stable |
| 5 | PR #123 | Click-to-sort: 2-state toggle (asc ↔ desc) — 3-state would have been confusing | stable |
| 6 | PR #123 | Blanks-last sort semantics (matches spreadsheet intuition) | stable |
| 7 | PR #123 | parseDuration handles real-world variation (9 tests) | stable |
| 8 | PR #123 | `npm run build` clean first-run (10 of 10 practical) | stable |
| 9 | PR #123 | Tests 762/762 (+44 from S39 baseline of 718) | stable |
| 10 | PR #123 | Chip-mirrored cell-value test-collision pattern documented | stable |
| 11 | PR #123 | Preview-MCP verification (37 active + per-list Duration shifts Expires) | stable |
| 12 | Docs | Persistence-architecture decision doc + 4 open questions | new |
| 13 | PR #123 | Filter universes scoped to rollup (small dept universe by design) | stable |
| 14 | PR #123 | Eligibility tab stays devOnly — cross-tab nav still gates promotion | stable |
| 15 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 16 | Carry-forward B | SESSION_LOG.md ~3,380 lines after S39 entry (est.) | tracking — still queued |
| 17 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 18 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 19 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 20 | Carry-forward F | Audit cadence working as designed (16th event-based trigger) | working as designed |
| 21 | New drift — memory | 10 files indexed; links resolve | stable |
| 22 | New drift — hooks/settings | No changes; no new deps | stable |
| 23 | New drift — anchors | No heading edits this phase | stable |
| 24 | New drift — tool sprawl | Significant `EligibilityDetail.tsx` rewrite + 1 new research doc, all justified by scope | stable |
| 25 | New drift — doc-vs-impl | `research/dhr-eligibility-and-jobs-scraping-plan.md` "no PDF in v1" framing still stale (carries from S38) | carry-forward |

**Totals:** 2 carry-forwards resolved this session (Phase 2.2.o
follow-ups #1 and #2) · 3 carry-forwards unchanged (B, C, D) ·
1 stays-dropped (E) · 1 working-as-designed (F) · 12 stable PR
follow-ups + 1 new research doc + 1 new low-priority parser-comment
note + 1 housekeeping carry.

---

## Recommendations not actioned

In priority order:

1. **Phase 2.2.q — Implement cross-device persistence (Cloudflare
   Pages + KV).** Per the decision doc landed this session. Needs
   Alex's answers to 4 questions first (Cloudflare account state,
   publish-secret distribution, cutover preference, first-load UX).
   ~3-4 hours including preview-MCP cross-device verification.
2. **Update `research/dhr-eligibility-and-jobs-scraping-plan.md`**
   — the doc's "PDF parsing not in v1" framing is now stale
   (carried from S38, second session). ~10 minutes; bundleable
   with any docs touch.
3. **Cross-tab nav from Eligibility → Positions** (carries) —
   clicking a job code in EligibilityView's summary table filters
   Positions tab to that jobCode. Bundleable with the Eligibility /
   Probation promotion to non-dev. ~1–2 hours.
4. **Lift modal overlay-frame to `lib/ui/Modal.tsx`** (carries) —
   5th instance of the same fixed-overlay-no-Portal pattern.
   ~1–2 hours.
5. **Remove the now-unused `filterRollups` export** (carries) —
   `applyEligibilityFilters` subsumes it. ~5 minutes; bundle with
   the next scrapers touch.
6. **Schedule SESSION_LOG.md trim** (item B) — ~3,380 lines after
   S39; bundleable with item C + Tab 24 Improvement #6 holdReason
   language update + OBI serial doc note + research-doc-location
   WORKFLOW.md note + TS-param-property tip. ~2 hours combined.
7. **Migrate the citation anti-pattern** (item C) — 12 instances;
   ~20 minutes.
8. **Defer `labor-report.md` split until Phase 2.4** (item D) —
   no change.
9. **Queue ADR amendments for Phase 2.4** — still 5 queued (could
   grow to 6 with the Cloudflare-Pages-+-KV ADR if Alex picks
   Option α and it ships).
10. **Switch `computeListExpiration` to calendar arithmetic
    (`setUTCFullYear`)** — eliminates the leap-year 1-day drift
    (S37 Finding 3, still carries). Low priority; defer until
    UX-relevant.
11. **Per-list Duration override semantics note** — surface in
    `parseDuration`'s doc-comment that month conversions use 30
    days/month, NOT calendar months. Already done in the
    doc-comment; this is just a reminder for future sessions
    that change the constant.
12. **Local-branch cleanup** (low priority) — ~36+ stale `docs/*`
    + ~12 `claude/*` branches; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-o-close-audit.md](phase-2-2-o-close-audit.md)
  (Session 38).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.p implementation:
  [PR #123](https://github.com/alkprojects/kospos/pull/123)
  (Drill-modal UX overhaul) + Session 39 SESSION_LOG.md entry
  (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
- Phase 2.2.o audit Findings 2 + 3 (resolved by this PR):
  [phase-2-2-o-close-audit.md § Finding 2](phase-2-2-o-close-audit.md#finding-2--real-dhr-data-contradicts-the-phase-22n-constant-2yr-duration-assumption) ·
  [§ Finding 3](phase-2-2-o-close-audit.md#finding-3--bonus-examtype-field-captured-but-not-surfaced).
- Persistence-architecture research doc:
  [persistence-architecture-options.md](../research/persistence-architecture-options.md)
  (drafted this session; Phase 2.2.q implementation pending Alex's
  answers).
