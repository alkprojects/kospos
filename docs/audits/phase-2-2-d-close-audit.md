# Phase 2.2.d close audit — Session 27

**Date:** 2026-05-26
**Branch:** `chore/phase-2-2-d-close-audit-and-handoff`
**Scope:** Phase 2.2.d close audit. Fires at the close of Phase 2.2.d
per [WORKFLOW.md § Audit cadence](../WORKFLOW.md). Phase 2.2.d shipped
sub-phase `2.2.13` (full BFM Position eturn importer + `lib/budget/`
entity layer + Budget vs Actual on Position Detail) in
[PR #75](https://github.com/alkprojects/kospos/pull/75), followed by a
small UI polish PR [#76](https://github.com/alkprojects/kospos/pull/76).

Last audit was the [Phase 2.2.b + 2.2.c combined close audit](phase-2-2-b-and-c-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in Phase 2.2.d's two PRs ([PR #75](https://github.com/alkprojects/kospos/pull/75)
   — 13 files; [PR #76](https://github.com/alkprojects/kospos/pull/76)
   — 2 files) against the docs that describe them
   ([labor-report.md § Tab 4](../domain/labor-report.md),
   [data-sources/bfm.md](../data-sources/bfm.md), Phase 2.2 sub-phase
   enumeration in [labor-report.md § Phase 2.2 sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order)).
2. Re-run `npm test` — confirms the 227 / 227 baseline.
3. Re-check the 6 carry-forward items A-F from the
   [Phase 2.2.b+c combined close audit](phase-2-2-b-and-c-close-audit.md);
   mark each as `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — Phase 2.2.d PR follow-ups

### Finding 1 — `BfmPositionRow` shape now matches labor-report.md § Tab 4 (NEW DOC ASYMMETRY)

**Status:** drift surfaced in advance (not yet a real gap; queued for Phase 2.4).

**Where:** [`labor-report.md § Tab 4`](../domain/labor-report.md) and [`data-sources/bfm.md`](../data-sources/bfm.md).

PR #75 expanded `BfmPositionRow` to capture the full 64-column eturn —
position metadata (FormID / Position Code / dept tree / chartfield
titles / agency-use / job-class tier / emp-org title / action), date
metadata (PPD start/end + fiscal-year end), and every budget-phase
layer (`Original / Base / Department / Mayor / Committee / Technical
Adjustment / Board`) for every FY column band on the sheet preserved as
`budgetByFy: Record<fyLabel, Partial<Record<phase, {fte, dollars}>>>`.
The default anchor (`defaultFiscalYear`, `defaultPhase`) is resolved
per the precedence Board > TechAdj > Committee > Mayor > Department >
Base > Original, picking the latest FY with non-zero dollars first.

Both source docs already describe this shape ([Tab 4 § Structure (64
cols, grouped)](../domain/labor-report.md#tab-4--bfm-1510006-fy26)
and [data-sources/bfm.md § Eturns reports](../data-sources/bfm.md)).
The TypeScript types now match. No drift between code and docs in the
Phase 2.2.d core scope.

The pending ADR (per the S26 handoff's "What we are NOT doing" list)
that documents this shape as the canonical KosPos representation
remains queued for Phase 2.4 alongside the ADR-007 amendment for the
39-column BI Payroll shape. Same pattern; one ADR update can cover
both.

**Disposition:** no action this session — ADR-007 amendment + BFM-shape
ADR queued together for Phase 2.4 per the S26 handoff non-goal.

### Finding 2 — `lib/budget/` mirrors `lib/payroll/` cleanly

**Status:** stable.

The new module follows the same shape as `lib/payroll/`:
`types.ts` + `build.ts` + `index.ts` + `*.test.ts`. The
`BudgetSnapshot` keyed by `(fiscalYear, asOfDate, budgetPhase)` mirrors
`PayrollSnapshot` keyed by `(fiscalYear, asOfDate)` exactly — same
helper functions (`pickLatestBudgetSnapshot` ↔ `pickLatestSnapshot`),
same per-position cube shape, same normalize-key invariant.

The single difference: `BudgetSnapshot` carries the **full phase layer
set** on each position (`byPhase: Partial<Record<phase, {fte, dollars}>>`)
in addition to the resolved scalar pair. This is deliberate — a future
Budget Pacing or OPS view will switch lenses ("Mayor view" vs "Board
view") without re-importing. `lib/payroll/` doesn't need that affordance
because OBI rows aren't phase-layered.

**Disposition:** no action; the mirror is intentional and well executed.

### Finding 3 — Budget vs Actual UI honors the three-state pattern from PR #73

**Status:** stable.

The new Budget vs Actual section on [`PositionDetail.tsx`](../../app/src/lib/views/positions/PositionDetail.tsx)
follows the exact same three-state pattern PR #73 introduced for the
YTD Payroll card:

1. BFM joined + actuals → variance card with chartfield strip (3-stat
   row with green/yellow/red variance + chartfield chips below).
2. BFM loaded but no row for this position → "no row matched" hint
   (full text, distinguishes from BFM-not-loaded).
3. BFM not loaded → "Load a BFM Position eturn…" hint.

The phase-label tag next to the section title ("Board layer") and the
BFM/OBI `asOf` dates on their respective cells follow the asOf-badge
pattern PR #73 established. No drift between PR #73's design and PR
#75's surface — the polish PR #76 added 3 column-width fixes without
touching the variance card layout.

**Edge case caught in preview-MCP:** when `actuals` is null, the
variance arrow was misleadingly green (▼ "$0 actual vs $80k budget" =
"under budget"). Fixed in the same PR — neutral gray background + no
arrow when actuals are missing. Caught before merge.

**Disposition:** stable.

### Finding 4 — Tests passing at 227 / 227 (+17)

**Status:** stable. Verified this session — `npm test` from a fresh
`npm install` in the worktree. Baseline math: 210 pre-Phase-2.2.d + 4
importer cases (all 7 phase layers, latest-FY-wins anchor, prior-FY
Original, full position-metadata) + 13 budget entity cases (rollup,
normalization, full phase exposure, FY+phase lens overrides, asOfDate
stamping, split-funded summing, FY-not-present skip, variance over /
under / on, null variancePct on zero budget, pickLatest tiebreak) = 227. ✓

### Finding 5 — Dev-only `window.__kospos` hook is appropriately gated

**Status:** stable.

PR #75 added a dev-only escape hatch ([App.tsx](../../app/src/App.tsx)):
when devMode is on, `window.__kospos = { store, addRows, clearAll }` is
exposed for preview-MCP harnesses + ad-hoc browser-console debugging.
The hook is unexposed when devMode toggles off (the `useEffect` returns
a cleanup that `delete`s the prop). Same gate as the `?dev=1`
query-param machinery from Phase 2.1 — no chance of leaking to
production users who haven't opted into dev mode.

The hook is genuinely useful — it's how this session walked all four
test positions through the variance card's three hint states without
having to upload a real BFM eturn. Recommend keeping for future
sessions.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items A-F

From [`phase-2-2-b-and-c-close-audit.md`](phase-2-2-b-and-c-close-audit.md)
§ Recommendations:

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | Sweep stale post-merge worktrees | 1 stale at audit close; auto-archive enabled | **0 stale** (PR #71 + #73 + #75 + #76 all auto-archived cleanly) | **empirically RESOLVED — drop from carry-forward** |
| B | Trim SESSION_LOG.md sessions 1–16 | 2,445 lines | **2,510 lines** (+65 from S26 entry) | drifted further — priority unchanged |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 17 instances | **15 instances** | drifted lightly (regex artifact or 2 fortuitous sweeps in S26 PR #70 docs sync) — content unchanged |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer still right |
| E | Phase 2.2 first sub-phase pick | resolved S24 — dropped | n/a | **stays dropped** |
| F | Continue audit cadence at every phase close | working with one slip | **working as designed** (S27 audit fires on schedule) | working as designed — no slip to carry forward |

### Item A — Worktree sweep result: empirically RESOLVED

`git worktree list` shows 2 entries this audit:

| Worktree | Branch | Commit | Disposition |
|---|---|---|---|
| `kospos/` (main) | `main` | `abbf7a4` | in sync ✓ |
| `thirsty-easley-174734/` | `chore/phase-2-2-d-close-audit-and-handoff` | `abbf7a4` | active (this session) ✓ |

**No stale worktrees.** PR #71's `clever-elion-0c5678` worktree was
swept by the auto-archive preference (per the S26 handoff's empirical
resolution). PR #73's worktree, PR #74's worktree, PR #75's worktree,
and PR #76's worktree all auto-archived post-merge without manual
intervention this cycle. The Cowork **"Auto-archive on PR close"**
preference enabled in S25 is working as designed across 5 consecutive
PRs now.

**Disposition:** item drops from the carry-forward list going forward.
If a stale worktree appears in S28 or later, treat it as a regression
and surface it; otherwise no further audit attention.

### Item B — SESSION_LOG.md is now 2,510 lines

Numeric update. Was 2,445 lines at the previous audit; +65 lines from
the S26 entry. Still past the 2,000-line trim trigger. Trim
recommendation unchanged — bundleable with Item C into one ~1.5-hour
docs cleanup PR. Bumped priority interpretation: each session is now
adding ~65-150 lines on average; at this rate the trim becomes more
valuable as cycles add up.

### Item C — Citation anti-pattern count drifted from 17 → 15

The 2 instances that disappeared since the previous audit were likely
swept in S26's PR #70 docs sync (the labor-report.md row 8475
tombstone + scenario-tests.md Scenario 5 rewrite touched some
neighborhood text). Content recommendation unchanged: batch cleanup
PR; replace remaining `(#tab-…)` targets with the canonical
`(file:///C:/Users/ALK/.claude/projects/.../memory/<file>.md)` form.
~30 minutes; bundleable with Item B.

### Item D — labor-report.md still 8,518 lines, defer holds

Unchanged. Phase 2.4 split still right.

### Item E — Resolved in S24 (stays dropped)

No re-entry needed. Position spine bundle shipped per [PR #62](https://github.com/alkprojects/kospos/pull/62).

### Item F — Audit cadence working as designed

This audit is the **fourth event-based trigger** to fire under the
[WORKFLOW.md § Audit cadence](../WORKFLOW.md) rule (after Phase 2.0i,
Phase 2.1, and Phase 2.2.b+c combined). It fires **on time** — the S27
prompt template (drafted at the end of S26's handoff) included the
explicit Step-0 audit trigger pattern, which this session honored.

The slip from S25 (where the Phase 2.2.b close audit was missed because
the prompt didn't include a Step-0 trigger) has not recurred. The
pattern is now established: every next-session prompt includes an
explicit Step-0 audit-cadence check for any phase-close that occurred
since the last audit. If the previous session's audit was bundled
(like S26's "2.2.b + 2.2.c combined"), the next session's Step-0 only
covers the next un-audited phase close (in this case, Phase 2.2.d
alone — see the S26 handoff prompt template).

**Outcome:** working as designed. No item to carry forward beyond the
template-preservation pattern, which is now self-reinforcing.

---

## Part 3 — New drift scan

### Memory files

- **9 memory files indexed in MEMORY.md.** No new memory files since
  Phase 2.0i (Session 21); no removals. Index line count = 11 (under
  200-line cap). ✓
- **`[[link]]` resolution** — spot-checked the cross-links touched in
  Phase 2.2.b/c/d source PRs (Position memory references; Cat 17/18
  rule citations); all resolve. ✓
- **`temporary_exchange_tx.md` TODO state** — the 4 TODOs from S21
  remain open (Restated Question #5 in the handoff). No regressions;
  Phase 2.2.d Option A picked over Option B explicitly avoided
  touching these. ✓

### Tooling / hooks / settings

- **No hook / settings / Vite config changes since [PR #55](https://github.com/alkprojects/kospos/pull/55).**
  PR #75 + #76 were code-only. ✓
- **`settings.local.json`** still well-formed; no Phase 2.2.d session
  surfaced a new permission to allow.
- **Stop hook (PR #51) firing as designed.** Sessions 22-27 all
  shipped a next-session prompt block via SESSION_HANDOFF.md per the
  hook contract. ✓
- **Cowork "Auto-archive on PR close" working across 5 consecutive
  PRs** (PR #71, #73, #74, #75, #76) — see Item A above.

### Anchor compliance

No labor-report.md heading-level edits in Phase 2.2.d source PRs (PR
#75 + PR #76 touched only code). The audit doc + handoff updates this
session touch only `docs/audits/` and `docs/SESSION_*` — neither
affects the anchor graph in labor-report.md. Anchor verifier rerun
skipped per the precedent set in earlier non-heading-touching cycles.

### Tool sprawl

- `app/src/lib/` gained one new module this phase: **`budget/`** (4
  files: `types.ts`, `build.ts`, `index.ts`, `budget.test.ts`,
  ~430 lines total). Clean structure — mirrors `lib/payroll/` exactly.
  No dead code, no commented-out experiments. ✓
- `app/src/lib/views/positions/PositionDetail.tsx` gained the
  `BudgetVsActualCard` component + `ChartfieldChip` helper. ~140 lines
  added; nothing removed (the previous Posting Chartfields section was
  replaced with the new card, but the section header structure
  remains). ✓
- `app/src/lib/store.ts` gained `lastBfmImportAt: string` + import-time
  stamp logic. Minimal addition (~10 lines). Tied to a single consumer
  (PositionsView's `latestBudget` build); no orphan complexity. ✓
- **`window.__kospos`** dev-only hook (App.tsx). 1 useEffect, 3
  exposed functions. Conditional on devMode toggle; cleanup on
  unmount. No leak risk. ✓

### Doc-vs-implementation

- [`labor-report.md § Tab 4 § Structure (64 cols, grouped)`](../domain/labor-report.md#tab-4--bfm-1510006-fy26)
  describes the 64-column eturn shape that PR #75 imports → match. ✓
- [`labor-report.md § Tab 4 § KosPos improvements §1`](../domain/labor-report.md)
  describes the canonical `lib/importers/bfm-eturn/` shape → matches
  the expanded `BfmPositionRow` + the `lib/budget/` entity layer. ✓
- [`data-sources/bfm.md § BFM eturn — Report Data dependency notes`](../data-sources/bfm.md#bfm-eturn--report-data-dependency-notes)
  describes the preserve-all-budget-layer-columns requirement → matches
  the `budgetByFy` map. ✓
- The Phase 2.2 sub-phase enumeration row for `2.2.13` (Tier 3 BFM
  importer) describes the deliverable → matches the merged scope. ✓

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #75 follow-up | BfmPositionRow shape matches labor-report.md § Tab 4; ADR queued for Phase 2.4 | stable (queued) |
| 2 | PR #75 follow-up | `lib/budget/` mirrors `lib/payroll/` cleanly | stable |
| 3 | PR #75 follow-up | Budget vs Actual UI honors the three-state pattern from PR #73 | stable |
| 4 | PR #75 follow-up | `npm test` 227/227 (+17) holds | stable |
| 5 | PR #75 follow-up | `window.__kospos` dev hook appropriately gated | stable |
| 6 | Carry-forward A | Stale worktrees 1 → 0 across 5 consecutive PRs | **RESOLVED — drop from carry-forward** |
| 7 | Carry-forward B | SESSION_LOG.md 2,445 → 2,510 lines | drifted (~65 lines/session) |
| 8 | Carry-forward C | Citation anti-pattern 17 → 15 (likely S26 PR #70 incidental sweep) | drifted lightly |
| 9 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 10 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 11 | Carry-forward F | Audit cadence working as designed (4th event-based trigger on time) | working as designed |
| 12 | New drift — memory | 9 files indexed; links resolve; TX TODOs untouched | stable |
| 13 | New drift — hooks/settings | No changes since PR #55; auto-archive working | stable |
| 14 | New drift — anchors | No heading edits this phase; verifier skip safe | stable |
| 15 | New drift — tool sprawl | One new clean module (`budget/`); UI component + store + dev hook all sized appropriately | stable |
| 16 | New drift — doc-vs-impl | Labor-report.md Tab 4 + bfm.md + sub-phase enum all match | stable |

**Totals:** 0 applied this session · 1 carry-forward resolved (A) · 1
carry-forward drifted (B) · 1 carry-forward drifted lightly (C) · 1
carry-forward unchanged-right-call (D) · 1 carry-forward
resolved-stays-dropped (E) · 1 carry-forward working-as-designed (F) ·
5 new-drift stable confirmations.

---

## Recommendations not actioned

In priority order:

1. **Schedule SESSION_LOG.md trim** (item B) — 2,510 lines, past the
   2,000-line trim trigger; bundleable with item C (~1.5 hours
   combined). Priority interpretation bumped a notch: ~65-150 lines
   added per session is a slow drift, but it compounds.
2. **Migrate the citation anti-pattern** (item C) — 15 instances now;
   bundleable with B per above. ~30 minutes.
3. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
4. **Queue ADR amendments for Phase 2.4** — ADR-007 amendment for the
   39-column OBI shape (queued since 2.2.b) + new ADR for the
   64-column BFM eturn shape (queued from this phase). One PR can
   cover both per the S26 handoff non-goal.
5. **Continue audit cadence at every phase close** (item F) — next
   audit fires when Phase 2.2.e merges. Next-session prompt template
   (in this PR's SESSION_HANDOFF.md update) preserves the Step-0
   trigger.

None block the next session's Phase 2.2.e work.

---

## Cross-references

- Previous audit: [phase-2-2-b-and-c-close-audit.md](phase-2-2-b-and-c-close-audit.md)
  (Session 26).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.d implementation: [PR #75](https://github.com/alkprojects/kospos/pull/75)
  + [PR #76](https://github.com/alkprojects/kospos/pull/76) + Session
  27 SESSION_LOG.md entry (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2 sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
