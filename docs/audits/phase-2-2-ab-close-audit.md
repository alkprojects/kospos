# Phase 2.2.ab close audit — Calendar sub-tab (Session 52)

_Audit cadence item F. Fires at sub-phase close, mirroring the 2.2.aa audit. This is the 28th event-based close audit. Grading lens: would this pass an Anthropic hiring screen?_

---

## What shipped

| PR | Title | Tests |
|---|---|---|
| [#176](https://github.com/alkprojects/kospos/pull/176) | feat(views/data): add a Calendar sub-tab to the Data section | 891 → 896 |
| this docs PR | docs(session): Phase 2.2.ab close | docs-only |

## The feature / the win

One-paragraph statement, in plain language.

Alex asked for "a calendar sub-tab in the data section." The pre-baked FY
pay-period calendar (`data/calendar-fy2026.json`) and COLA / payroll constants
(`data/cola-fy2026.json`) were already in the app — but only reachable
indirectly, as the pay-period dropdown on the Job Class Calculator. This adds
a third sub-tab under the Data tab ("Source Tables") that surfaces both as
read-only reference tables: the 27-row pay-period calendar (PPE dates +
partial-period weights, current-PP row highlighted, weighted year-elapsed %)
and the COLA constants (mid-year + PP1 rates incl. per-emp-org overrides, plus
the two OASDI wage bases). It is the first user-visible surface for roadmap
sub-phase `2.2.1 lib/calendar/` and the home for workbook Tab 5 (Calendar).

## Grading lens — would this pass an Anthropic hiring screen?

### What went well

- **Matched the existing pattern exactly.** The new sub-view slots into the
  `DataView` sub-tab container the same way Eligibility Lists and Job Postings
  do — same `role="tab"` strip, same `.card` summary header, same CSS tokens
  (`--surface-2`, `--accent-soft`, `--border`, `--muted`). No new primitives,
  no new CSS file.
- **Reused the canonical data + formatters.** Reads the same JSON the
  calculator reads; reuses the shared `Stat` and `fmtMoney`. No data
  duplication, no second source of truth.
- **Timezone-safe dates.** PPE dates are formatted by parsing the ISO parts
  directly (no `Date` round-trip), so they can't shift a day in a
  negative-UTC-offset timezone — the same defensive pattern `JobPostingsView`
  already uses for its released-date column.
- **Weight-aware "year elapsed."** The elapsed fraction is the sum of
  completed-period weights over the total (26.1), not a raw PP count — so it
  lines up with COLA-aware projection rather than implying 27 equal periods.
- **Verified live, not just asserted.** Agent-first browser check confirmed the
  as-of control recomputes the current PP (`2026-05-29` → PP25, 89.66%
  elapsed), the current-row highlight tracks it, all COLA values match the
  JSON, and there are no console errors. Build clean; 891 → 896 (+5 tests).

### What to watch

- **Single-FY, hardcoded import.** The view imports `calendar-fy2026.json` /
  `cola-fy2026.json` directly — the same single-FY shortcut the calculator
  carries. When `2.2.1 lib/calendar/` lifts these to per-FY effective-date
  lookup, this view should switch to that module rather than the raw imports.
  Called out here so the follow-on isn't forgotten.
- **As-of defaults to the browser clock.** On a machine whose wall clock is
  past `effectiveTo` (2026-06-30), the view opens on "FY ended / 100%". Correct
  behavior, but a reminder that the calendar is FY26-specific until versioned.
- **Inline styles, like its siblings.** The table markup uses inline styles
  matching `JobPostingsView`. Consistent with the current code, but it is the
  same not-yet-extracted table pattern CH batch 5 targets.

## A note on process this session

The session opened with a flaky tool channel — a long burst of queued,
interdependent calls where one erroring call cancelled the rest, which
produced phantom reads (a non-existent `nav/tabs.ts`, a wrong calendar-module
path). The recovery was the right one: stop batching, switch to single
error-proof commands (`… 2>/dev/null; … || echo none`), and re-establish
ground truth from the actual files before writing a line of code. The first
draft (written against the phantom structure) was discarded entirely. Lesson
logged for the handoff: in a fresh worktree, **`npm install` first** (the
"vitest not recognized" failure cost a build cycle) and **prefer single
error-proof tool calls** over large interdependent batches.

## Carry-forwards (status this session)

| # | Item | Status |
|---|---|---|
| B | SESSION_LOG.md trim | deferred (P6) |
| C | labor-report.md memory-citation cleanup | deferred |
| D | labor-report.md split | deferred (P6) |
| F | Audit cadence | this audit = 28th |
| I | Cloudflare SEC-2 + SEC-3 | == scaling Stage 3 |
| L | dev-mode/permissions ADR | open |
| N | Deep-link Data sub-tabs from landing | open — now 3 sub-tabs to deep-link |
| SCALE | Citywide scaling | Stage 0 shipped (#174); Stage 1 next |
| D1/D2/D3 | C-series aesthetic tail | need Alex sign-off |
| CH | Code-health safe-dedup menu | batches 3/5/6/7/8/9 remain |
| CAL | `2.2.1 lib/calendar/` per-FY lift | new — view should adopt it when built |

## Verdict

**Pass.** A small, well-scoped, user-requested feature that matched the
existing sub-tab pattern, reused the canonical data and formatters, handled the
timezone and weighting edge cases correctly, and was verified live. The one
real follow-on (adopt `lib/calendar/` when it lands) is recorded. The rocky
tool-channel start was recovered cleanly with no compromise to the shipped
result.

## Recommended next sub-phase

Phase 2.2.ac — Alex picks. Strong candidates surfaced by his S52 roadmap
questions: the **year-end actuals / projection page** (`2.2.23 views/ops`, the
headline projection surface — large, multi-session, has unbuilt importer
prereqs); **acting / supervisory pay** (`2.2.30 views/ee-additional-pay`); and
**special-class actuals** (`2.2.14 bfm-special-class` importer feeding the OPS
special-class blocks). Scaling Stage 1 (loadedRows → own IDB store) and the
safe-dedup CH batches remain as lower-risk alternatives.

## Audit trail

(Per ADR — close audits are appended here as a running index.)

| Sub-phase | Audit | Verdict |
|---|---|---|
| 2.2.aa | [phase-2-2-aa-close-audit.md](phase-2-2-aa-close-audit.md) | Pass |
| 2.2.ab | this file | Pass |
