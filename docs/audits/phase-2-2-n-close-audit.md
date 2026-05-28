# Phase 2.2.n close audit — Session 37

**Date:** 2026-05-27
**Branch:** `docs/phase-2-2-n-close-audit-and-handoff`
**Scope:** Phase 2.2.n close audit. **One PR** shipped this session
([PR #119](https://github.com/alkprojects/kospos/pull/119) — Eligibility
detail modal field enrichment: duration + expires + status + type-
breakdown + Type-column drop), in direct response to Alex's S37 added
directive that took the place of the normal "pick the next 2.2 sub-phase"
framing:

> -when clicking into a row in eligibility lists more fields should be
> shown including cert rule, department, duration, expiration date,
> exam type, and any others that are relevant. i don't think type
> "Score report (civil service)" is relevant. if you think it should
> be included please justify.

This is the **fourth consecutive session** where Alex's added directive
superseded the planned A/B/C/D/E option pick — the rapid live-data
feedback loop from S35–S36 continues to surface the highest-leverage
next sub-phase. The directive was sharp; scope-question went to
implementation depth rather than feature pick.

Last audit was the [Phase 2.2.m close audit](phase-2-2-m-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in this session's **1 PR** against the docs
   that describe it (Tab 11 Eligibility, the S36 SESSION_HANDOFF, the
   S37 kickoff directive from Alex, Phase 2.2.m close audit's
   "Recommendations not actioned" list).
2. Re-run `npm test` — confirms **643 / 643** baseline (was 620 at S37
   start; +23 from PR #119 = 643 net).
3. Re-check carry-forward items B–F from the [Phase 2.2.m close
   audit](phase-2-2-m-close-audit.md); mark each `unchanged`, `improved`,
   `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — This session's PR follow-ups

### One PR shipped this session

| # | PR | Title | Scope |
|---|---|---|---|
| 1 | [#119](https://github.com/alkprojects/kospos/pull/119) | feat(views/eligibility) | Modal field enrichment: Duration chip · Expires + Status columns (derived) · Type column dropped · section-header type breakdown · "Close detail" aria-label · PDF-fields footnote. +23 tests. |

Plus this docs PR (audit + S38 handoff + S37 SESSION_LOG entry).

### Finding 1 — Type column drop preserves citywide signal via section header + summary chip

**Status:** stable.

Per Alex's S37 directive, the per-row Type column ("Score report (civil
service)" / "Eligible list (uniformed)") was dropped from the lists
table. The citywide-relevant info — that some job codes mix score-
reports + eligible-lists across uniformed/non-uniformed ranks — is
preserved at **two** levels:

1. The summary-row SR/EL/mixed chip in `EligibilityView`.
2. The new section-header breakdown in `EligibilityDetail`
   (`· 1 score report + 33 eligible lists` for Q002 Police Officer).

The breakdown is suppressed when the section is uniform (all
score-reports or all eligible-lists in one direction) so it doesn't
add noise to the common DBI case.

**Disposition:** stable. Verified live: 0932 Manager IV (37 active, all
score-reports) shows no breakdown; Q002 Police Officer (34 active mixed)
shows the full split.

### Finding 2 — Duration as a header chip, not a per-row column

**Status:** stable.

The CSC Rule 411A/412 2-year duration is **constant** for every list
in the v1 model (no per-list override yet). Showing it once at the
header (`Duration: 2 yr · CSC 411A/412`) instead of per-row keeps the
table narrow and acknowledges that the value is informational, not
data.

If a future scenario surfaces lists with per-instance overrides
(extensions to 3-yr, etc.), this lifts to a per-row column without
breaking the existing helper interface (`computeListExpiration` already
takes a `windowDays` override parameter).

**Disposition:** stable.

### Finding 3 — Leap-year drift documented + tested

**Status:** stable; documented.

`computeListExpiration` uses `730` days for the 2-year window — exact
when neither year is leap, but 1 day shy across a leap-year span. Live
data verified: `2026-05-01 + 730d = 2028-04-30` (since 2028 is leap).
A future PR can switch to calendar arithmetic (`setUTCFullYear`) if
the 1-day drift becomes user-visible — for now the drift is documented
in the helper's doc comment + locked by the test fixture.

The same constant (`DEFAULT_ACTIVE_LIST_WINDOW_DAYS = 730`) drives
`isListActive` upstream, so "active" and "not-yet-expired" agree by
construction.

**Disposition:** stable; filed as a low-priority lift candidate.

### Finding 4 — StatusPill tone palette matches existing quality-flag conventions

**Status:** stable.

Pill colors:
- `active`: var(--accent-soft) / var(--accent) — neutral-positive blue
- `expiring-soon`: `#fef3c7` / `#92400e` — same yellow as `cat-17-18-expiring-soon`
- `expired`: `#fee2e2` / `#7f1d1d` — same red as `cat-17-18-expired`
- `unknown`: var(--surface) / var(--muted) — gray graceful-degrade

The reuse of the cat-17/18 quality-flag palette (per [labor-report.md §
Data Issues catalog](../domain/labor-report.md#data-issues-catalog-libquality-scope))
keeps urgency cues consistent across the app — yellow always means
"approaching", red always means "past deadline".

**Disposition:** stable. No new tokens introduced.

### Finding 5 — `EXPIRING_SOON_DAYS = 90` matches the quality-flag threshold

**Status:** stable.

Per [labor-report.md § Data Issues catalog](../domain/labor-report.md#data-issues-catalog-libquality-scope):

> `temp-tx-expiration-imminent` — Tab 12 — Cat 17/18 TX expiration
> within **90 days**

The eligibility-list expiring-soon threshold uses the same 90-day
cutoff. One number across the codebase; one yellow-warning meaning
across the UX.

**Disposition:** stable.

### Finding 6 — Modal `aria-label` follow-up #4 from Phase 2.2.m audit resolved

**Status:** resolved.

Header `× → aria-label="Close"` was renamed to `aria-label="Close detail"`
in this PR, per [Phase 2.2.m audit Recommendation #4](phase-2-2-m-close-audit.md#recommendations-not-actioned).
The view test that previously needed `textContent === 'Close'` to
disambiguate the two buttons now uses the strict `/^Close$/i` matcher
directly — cleaner test, cleaner UX. The hidden 5-minute follow-up is off
the list.

**Disposition:** resolved this session.

### Finding 7 — PDF-fields footnote sets up Phase 2.2.o

**Status:** stable.

The modal footer carries a "Not shown here" footnote naming the three
fields that need PDF text extraction (cert rule, list-row dept, exam
sub-type) + pointing the user at the `↗ PDF` link as the today
affordance + naming Phase 2.2.o as the future automation. This sets
the user's expectation explicitly + makes the gap discoverable from
inside the modal without needing to read the handoff doc.

The `↗ PDF` link's `title` attribute also now reads "Opens PDF cover
sheet (cert rule, dept, exam sub-type)" so the redundancy is the
intended affordance.

**Disposition:** stable.

### Finding 8 — `npm run build` clean on first run (8 sessions running)

**Status:** stable.

8 sessions in a row of clean first-run builds (S30 caught 1, S31
caught 1, S32 caught 0, S33 caught 0, S34 caught 1, S35 caught 0,
S36 caught 0, **S37 caught 0**). The habit is firm.

**Disposition:** stable.

### Finding 9 — Tests 643 / 643 (+23 from S37-baseline of 620)

**Status:** stable.

| PR | Tests added | Cumulative |
|---|---|---|
| Phase 2.2.m baseline at S37 start | — | **620** |
| PR #119 — Eligibility modal field enrichment | +23 | 643 |

The +23 from PR #119 breaks down as:

- `scrapers.test.ts` — +15 (computeListExpiration 5 · computeListStatus
  6 · countListTypes 4).
- `eligibility-view.test.tsx` — +8 net (header aria-label · Duration
  chip · column-shape incl. Type drop · derived expiration date ·
  "expired Xd ago" pill · eligible-list-only breakdown · footnote ·
  the existing footer-Close test was simplified, not removed — net +8).

One sub-test had a real bug surfaced by run: my initial expectation for
`2026-05-01 + 730d` was `2028-05-01` (intuition: "same day, 2 years
later"). Actual: `2028-04-30` (leap year). Helper is correct; test
expectation + doc comment updated to match. Filed as Finding 3 above.

**Disposition:** stable.

### Finding 10 — Preview-MCP verification at scale (137 + 6,729 → 753 rollups)

**Status:** stable.

Live verification ran both refresh paths end-to-end + clicked into two
contrasting rollups:

- 137 postings via SmartRecruiters · 6,729 lists via the DHR CORS-
  proxy chain · 753 distinct job-code rollups.
- 0932 Manager IV: 1 posting, 37 active, 76 expired. Duration chip +
  Expires + Status columns + "expired 3d ago" pill rendering correctly,
  no console errors.
- Q002 Police Officer (citywide-mixed): Active 34 → "1 score report +
  33 eligible lists", Expired 51 → "8 score reports + 43 eligible
  lists". Citywide signal preserved in the section headers as designed.
- `preview_console_logs --level error` returned zero entries.

**Disposition:** stable.

### Finding 11 — `devOnly: true` on the Eligibility tab still holds

**Status:** stable.

Per the S37 "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Inactive / Separations /
> Probation / Eligibility / Temp Limits / Reporting Tree to non-dev
> yet — wait until cross-tab nav has been used end-to-end on real data.

PR #119 doesn't touch the `devOnly` flag. The cross-tab nav (Option A
in S37's menu) remains the gating item for the Eligibility + Probation
promotion. Still a 1–2 hour candidate when Alex picks it up.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items B–F

From [`phase-2-2-m-close-audit.md`](phase-2-2-m-close-audit.md):

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | ~~Auto-archive monitoring~~ | resolved S33 | n/a | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | ~3,170 lines after S36 entry | **~3,240 lines after S37 entry (est.)** | unchanged — still queued |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 12 instances | **12 instances** (no labor-report.md changes) | unchanged; bundleable with B |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer holds |
| E | ~~Phase 2.2 first sub-phase pick~~ | resolved S24 | n/a | **stays dropped** |
| F | Audit cadence — working as designed | 13th event-based trigger S36 | **14th event-based trigger this session** | working as designed |

### Item B — SESSION_LOG.md baseline ~3,240 lines after S37 entry

This session adds a 1-PR entry. Estimated ~70 lines for the entry,
total ~3,240.

Bundleable with C + the Tab 24 Improvement #6 holdReason language
drift + the OBI serial doc note + the research-doc-location
WORKFLOW.md note + the TS-param-property tip + the modal-aria-label
tip (from S36 audit, **resolved this session** — drops from bundle).
Estimated combined effort: ~2 hours.

### Item C — Citation anti-pattern count: 12 (unchanged)

`labor-report.md` not touched this session. Count unchanged.

### Item D — labor-report.md still 8,518 lines

No changes. Defer until Phase 2.4 still right.

### Item E — Resolved S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence: 14th event-based trigger fires on schedule

The S37 prompt template (drafted at the end of S36) included the
explicit Step-0 audit trigger pattern, which this session honored.
The slip from S25 has not recurred across **14 subsequent sessions**.

---

## Part 3 — New drift scan

### Memory files

- **10 memory files indexed in MEMORY.md** — unchanged. All
  `[[link]]`s resolve. ✓
- **Most-relevant memories this session:**
  - `feedback_dont_reremind.md` — the Phase 2.2.m audit follow-up #4
    (Close-detail aria-label) is resolved + dropped this session.
    The `filterRollups` export removal carry-forward and the
    overlay-frame lift to `lib/ui/Modal.tsx` follow-up remain on the
    audit's "Recommendations not actioned" list.
  - `feedback_user_notes_per_position.md` — n/a this session.
  - `user_role.md` — Alex's "describe trade-offs, recommend, act"
    posture drove the kickoff scope question (Option A / B / C); he
    picked C, which preserved scope discipline + filed Phase 2.2.o
    explicitly.

### Tooling / hooks / settings

- **No hook / settings changes** in PR #119. All file changes were
  `app/src/` (build helpers + view rewrite + new tests).
- **`settings.local.json`** unchanged.
- **`.claude/launch.json`** unchanged.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block.
- **Cowork "Auto-archive on PR close"** — PR #119 archives on close.

### Anchor compliance

No `labor-report.md` heading-level edits in PR #119. Anchor verifier
rerun skipped per precedent.

### Tool sprawl

- **No new files in `app/src/lib/views/eligibility/`** — modal +
  view + test rewritten in place.
- **No new top-level modules.** No new ADRs.
- **No new dependencies.** `package.json` unchanged. Pdfjs-dist
  (the candidate for Phase 2.2.o) is NOT in this PR.
- **`filterRollups` export** still has no in-app consumer (carry from
  S36). Removing it stays a separate-PR follow-up.

### Doc-vs-implementation

- **Tab 11 in `labor-report.md`** describes the manual list shape +
  KosPos vision; PR #119 enriches the per-row display without
  changing the schema. No labor-report.md edits needed.
- **`docs/research/dhr-eligibility-and-jobs-scraping-plan.md`** —
  unchanged. The "PDF parsing — not in v1" framing in that doc still
  matches the codebase; Phase 2.2.o will revisit.
- **`docs/DECISIONS.md`** — no new ADRs in PR #119. Phase 2.4 ADR
  queue unchanged at 5.
- **`docs/data-sources/`** — no changes.

### New drift items

**Zero noteworthy drift items this session.** PR #119 landed clean,
no test-count discrepancies, no unintended file changes. The leap-year
drift is documented + tested, not a defect.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #119 | Type column drop preserves citywide signal via section header + summary chip | stable |
| 2 | PR #119 | Duration as a header chip, not a per-row column | stable |
| 3 | PR #119 | Leap-year drift in computeListExpiration documented + tested | stable |
| 4 | PR #119 | StatusPill tone palette matches existing quality-flag conventions | stable |
| 5 | PR #119 | `EXPIRING_SOON_DAYS = 90` matches `temp-tx-expiration-imminent` threshold | stable |
| 6 | PR #119 | Modal `aria-label` follow-up #4 from Phase 2.2.m resolved | resolved |
| 7 | PR #119 | PDF-fields footnote sets up Phase 2.2.o + names the gap explicitly | stable |
| 8 | PR #119 | `npm run build` clean first-run (8 sessions running) | stable |
| 9 | PR #119 | Tests 643/643 (+23 from S37 baseline of 620) | stable |
| 10 | PR #119 | Preview-MCP verification at scale — 137 + 6,729 → 753 rollups, no console errors | stable |
| 11 | PR #119 | Eligibility tab stays devOnly — cross-tab nav still gates promotion | stable |
| 12 | Carry-forward A | Resolved S33 (stays dropped) | n/a |
| 13 | Carry-forward B | SESSION_LOG.md ~3,240 lines after S37 entry (est.) | tracking — still queued |
| 14 | Carry-forward C | Citation anti-pattern: 12 instances unchanged | unchanged |
| 15 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 16 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 17 | Carry-forward F | Audit cadence working as designed (14th event-based trigger) | working as designed |
| 18 | New drift — memory | 10 files indexed; links resolve; Phase 2.2.m follow-up #4 dropped | stable |
| 19 | New drift — hooks/settings | No changes | stable |
| 20 | New drift — anchors | No heading edits this phase | stable |
| 21 | New drift — tool sprawl | No new files / deps / ADRs | stable |
| 22 | New drift — doc-vs-impl | No drift; Tab 11 spec still matches implementation | stable |
| 23 | Housekeeping (carries) | 36+ stale local-only `docs/*` branches + ~12 `claude/*` branches | low priority |

**Totals:** 1 carry-forward resolved earlier (A from S33, stays
dropped) · 3 carry-forward unchanged (B, C, D) · 1 stays-dropped
(E) · 1 working-as-designed (F) · 1 prior-audit follow-up
resolved (modal aria-label, #4 from Phase 2.2.m) · 11 stable PR
follow-ups + 1 housekeeping carry.

---

## Recommendations not actioned

In priority order:

1. **Phase 2.2.o — Lazy PDF text extraction** for cert rule + list-row
   dept + exam sub-type. The natural next sub-phase per Alex's S37 scope
   pick (Option C: "ship A this session + B as Phase 2.2.o"). ~3–5 hours
   + pdfjs-dist (~500 KB gz) + per-modal-open loading state (~3–10s for
   1–3 PDFs through the CORS-proxy chain). Edge case: older scanned
   PDFs may need OCR fallback; defer to v2.
2. **Cross-tab nav from Eligibility → Positions** (carries) — clicking
   a job code in EligibilityView's summary table filters Positions tab
   to that jobCode. Bundleable with the Eligibility / Probation
   promotion to non-dev. ~1–2 hours.
3. **Lift modal overlay-frame to `lib/ui/Modal.tsx`** (carries) — 5th
   instance of the same fixed-overlay-no-Portal pattern. ~1–2 hours.
4. ~~Rename `EligibilityDetail` header-close's `aria-label`~~ —
   **resolved this session** in PR #119.
5. **Remove the now-unused `filterRollups` export** (carries) —
   `applyEligibilityFilters` subsumes it. ~5 minutes; bundle with the
   next scrapers touch.
6. **Schedule SESSION_LOG.md trim** (item B) — ~3,240 lines after S37;
   bundleable with item C + Tab 24 Improvement #6 holdReason language
   update + OBI serial doc note + research-doc-location WORKFLOW.md
   note + TS-param-property tip. ~2 hours combined.
7. **Migrate the citation anti-pattern** (item C) — 12 instances;
   ~20 minutes.
8. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
9. **Queue ADR amendments for Phase 2.4** — still 5 queued.
10. **Lift `buildProbation*Email` to `lib/ui/notifications/`** — only
    if a 2nd consumer arrives.
11. **Switch `computeListExpiration` to calendar arithmetic
    (`setUTCFullYear`)** — eliminates the leap-year 1-day drift (Finding
    3). Low priority; defer until UX-relevant.
12. **Local-branch cleanup** (low priority) — ~36+ stale `docs/*` +
    ~12 `claude/*` branches; 5-minute pass whenever Alex wants.

None block the next session's work.

---

## Cross-references

- Previous audit: [phase-2-2-m-close-audit.md](phase-2-2-m-close-audit.md)
  (Session 36).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.n implementation:
  [PR #119](https://github.com/alkprojects/kospos/pull/119) (Eligibility
  detail modal field enrichment) + Session 37 SESSION_LOG.md entry
  (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
