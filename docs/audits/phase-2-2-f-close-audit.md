# Phase 2.2.f close audit — Session 29

**Date:** 2026-05-26
**Branch:** `chore/phase-2-2-f-close-audit-and-handoff`
**Scope:** Phase 2.2.f close audit. Fires at the close of Phase 2.2.f per
[WORKFLOW.md § Audit cadence](../WORKFLOW.md). Phase 2.2.f shipped Option
C PR 1 ([PR #85](https://github.com/alkprojects/kospos/pull/85) —
`lib/staffing-plan/` Bug 3 derived defaults + status-transition guard
helper) plus a small payroll-diagnostic-polish PR
([PR #84](https://github.com/alkprojects/kospos/pull/84) — Bug 2
follow-up: widened the empty-state diagnostic with a P&P-vs-OBI
coverage stat + progressive prefix fallback) that ran first to address
the live-site bug Alex flagged at the close of S28.

Option C PR 2 (`PlannedActionDetail` editor + row-click drill-down +
status workflow UI + CostInput exposure) is **queued for S30** — the
guard helper this audit reviews already shipped in PR #85, so PR 2 is
purely the UI wiring on top.

Last audit was the [Phase 2.2.e close audit](phase-2-2-e-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in Phase 2.2.f's two PRs ([PR #84](https://github.com/alkprojects/kospos/pull/84)
   — 3 files; [PR #85](https://github.com/alkprojects/kospos/pull/85) —
   10 files) against the docs that describe them ([labor-report.md §
   Tab 24 Staffing Plan](../domain/labor-report.md#tab-24--staffing-plan),
   [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md),
   [memory `cat_16_17_18_rules.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/cat_16_17_18_rules.md)).
2. Re-run `npm test` — confirms the 303 / 303 baseline (was 263 at the
   start of Phase 2.2.e; +13 from PR #84 + +27 from PR #85).
3. Re-check the 6 carry-forward items A-F from the
   [Phase 2.2.e close audit](phase-2-2-e-close-audit.md); mark each as
   `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches, anchor-graph integrity.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — Phase 2.2.f PR follow-ups

### Finding 1 — PR #84 widens the Payroll empty-state diagnostic with affirmative coverage signal

**Status:** stable.

Alex's S28 live-site review surfaced: scoping Payroll to position
**1106950** returned 0 rows + a 1-chip nearby suggestion (`1106348`) —
not enough information to tell "expected empty" from "unexpected empty."
The S29 chip output confirmed the snapshot's narrow coverage (234
distinct positionIdentifiers across 42,949 rows) — meaning many P&P
positions simply aren't in the OBI cut Alex loaded.

[PR #84](https://github.com/alkprojects/kospos/pull/84) addresses this
with three additions to the diagnostic:

1. **P&P-vs-OBI coverage-gap stat.** A new pure helper
   [`coverageStats(scopedId, pAndPIds, obiIds)`](../../app/src/lib/views/labor/payroll-diagnostic.ts)
   classifies the scoped position as `in-both` (defensive — shouldn't
   happen if rows = 0), `p-and-p-only` (the expected-empty branch),
   `obi-only` (orphan-payroll data-quality flag), or `orphan` (not in
   either snapshot — typo / stale URL). The diagnostic renders a
   plain-English message per branch.
2. **Progressive prefix fallback for nearby chips.** A new pure helper
   [`findNearbyPositions(scopedId, candidates, opts)`](../../app/src/lib/views/labor/payroll-diagnostic.ts)
   tries 4-digit prefix first, falls back to 3-digit when the strict
   net has <2 matches, then 2-digit as the floor. The Alex 1106950
   case would have widened to '110' and surfaced 1107xxx / 1109xxx
   candidates the original strict net missed.
3. **Snapshot meta line** at the bottom: FY · asOf · row count ·
   distinct-positionIdentifier count. Lets the user verify they loaded
   the right OBI cut without bouncing back to the summary header.

Live-site verification (preview-MCP with 4 P&P + 2 OBI synthetic rows):
- Scope to 1106950 (P&P-only): "Position 1106950 is in the loaded P&P
  snapshot, but **not** in the OBI snapshot. OBI covers **2** of the
  **4** P&P positions; this is one of the **2** P&P-only positions in
  this loaded pair. Typically this means no posted payroll in the FY
  covered by the loaded OBI cut — confirm the snapshot meta below
  matches the FY you expect." ✓
- Scope to 9999999 (orphan): "Position 9999999 is in neither the
  loaded P&P snapshot (4 positions) nor the OBI snapshot (2
  positions). Likely a stale URL or a typo in the position number." ✓

**Disposition:** stable. Bug 2 root-cause is now self-diagnosing on
the live site — Alex doesn't need to escalate to a maintainer to
interpret the empty state.

### Finding 2 — PR #85 ships Bug 3 derived defaults end-to-end

**Status:** stable.

The biggest user-visible gap on the Hiring Plan workspace per Alex's
S28 ask:

> "everything should be user editable and addable, but pending
> positions should by default show all vacant positions that are not
> active and the temp section should by default show all temp
> positions. if a user removes a position from pending without adding
> it to active it should go in a section at the bottom, something
> like manual user changes."

[PR #85](https://github.com/alkprojects/kospos/pull/85) ships this end
to end:

- **Derived rules** (computed at view time — never stored): Pending =
  vacant positions with no manual action; TEMP = Cat 17/18 positions
  with no manual action; **precedence TEMP > Pending** (vacant Cat
  17/18 derives as TEMP).
- **Per-position manual-wins** per S29 Alex pick: any manual action
  on a position suppresses ALL auto-defaults for that position.
- **Hide flow:** click Hide on an auto row → joins `derivedRemoved`
  Set → moves to a new **Manual user changes** section below the 5
  type sections with a Restore button.
- **Auto-prune:** an omission auto-hides from the section when the
  derive rule no longer fires (e.g. a previously-vacant position got
  filled). The entry stays in the store so a future re-vacancy
  remembers the user's hide intent.

The S29 AskUserQuestion run-up resolved 3 gating items:
- **Q #18 holdReason enum:** dropped per Alex ("not enough regular
  reasons to justify pre-built tags"). Stays free string.
- **Q #19 status workflow:** guarded forward-only + csc-hold/finished
  branches.
- **Bug 3 override scope:** per-position manual-wins (cleanest dedup).

The Q #19 pick lands as
[`isAllowedStatusTransition(from, to)`](../../app/src/lib/staffing-plan/build.ts)
— a pure guard helper. PR 2 (queued for S30) wires it into the
`PlannedActionDetail` editor UI.

**Disposition:** stable. The Hiring Plan workspace now defaults to
"useful out of the box" instead of "blank slate." The
manual-suppresses-derived rule keeps the UX clean as the user starts
planning.

### Finding 3 — `Position.cat1718` lift is a small but principled refactor

**Status:** stable.

PR #85 lifted `Cat1718Tracking` from `Position.appointment.cat1718`
(only set for filled positions) to a parallel `Position.cat1718`
(set whenever the P&P row has the code, filled or vacant). Reason:
the TEMP-derivation rule needs to fire on vacant Cat 17/18 positions,
which have no `appointment` to hang the legacy field off.

Both fields now coexist:
- `appointment.cat1718` — mirrors the **incumbent's** Cat 17/18
  attributes (only when filled). Useful for incumbent-level concerns
  (e.g., "this temp is at month 12 of 24").
- `Position.cat1718` — mirrors the **row's** Cat 17/18 attributes
  (always when the code is set). The derive rule + future TEMP-limit
  surfaces (Phase 2.2.19) consult this field.

This is an additive change — no breaking modifications to the existing
`appointment.cat1718` consumers. A new test case
[`positions.test.ts`](../../app/src/lib/positions/positions.test.ts)
covers the vacant Cat 17/18 case.

**Disposition:** stable. Worth a brief mention in a future Phase 2.4
ADR (the lib/staffing-plan/ no-upstream-source ADR — queued — could
note the Position.cat1718 lift alongside).

### Finding 4 — Discriminated union pattern for manual + derived rows is clean

**Status:** stable.

The new `UnifiedAction = (PlannedAction & { source: 'manual' }) |
DerivedAction` discriminated union lets the existing `Section` +
`ActionRow` components render both kinds uniformly while dispatching
on `source` for the Hide/Delete affordance. Manual rows get the
synthetic `source: 'manual'` tag added at the view layer; derived
rows carry their own `source: 'derived'` from `computeDerivedActions`.

The widened entity helpers (`computeExpectedCost`, `rollupByType`,
`pricingDiagnostic`, `netCostImpact`, `actionsForPosition`) accept
the union without code changes — `DerivedAction.basis` is always
null, so `computeExpectedCost` returns null immediately for derived
rows (treated as "unpriced," which the diagnostic chip surfaces).

**Disposition:** stable. The union pattern keeps the rendering code
free of per-source branching everywhere except the row's
Hide-vs-Delete button.

### Finding 5 — Tests passing at 303 / 303 (+40 from Phase 2.2.f opening 263)

**Status:** stable.

| Phase point | Tests | Delta |
|---|---|---|
| Start of Phase 2.2.e | 227 | baseline at S27 |
| Phase 2.2.e PR #79 | 254 | +27 entity-layer cases |
| Phase 2.2.e PR #80 | 263 | +9 view-render cases |
| **Phase 2.2.f PR #84** | **276** | **+13 payroll-diagnostic cases** |
| **Phase 2.2.f PR #85** | **303** | **+27 derived-action / Position.cat1718 / status-transition cases** |

The +27 in PR #85 breaks down:
- 5 store derivedRemoved cases (add, restore, normalize, no-op
  rerender, clearAll behavior)
- 7 `computeDerivedActions` cases (Pending from vacant, TEMP from Cat
  17/18, precedence vacant+Cat18 → TEMP, manual suppression,
  derivedRemoved suppression, no-rule on filled-non-Cat, sort order)
- 3 `computeOmittedDerivedActions` cases (visible + 2 auto-prune)
- 7 `isAllowedStatusTransition` cases (forward / backward / csc-hold
  / null-status / same-state)
- 1 `Position.cat1718` lift case
- 5 view-level Bug 3 integration cases (auto Pending, auto TEMP w/
  Cat 17 reason, manual suppresses derived, Hide → Manual user
  changes, Restore brings back)

### Finding 6 — `Hiring Plan` tab stays appropriately devOnly

**Status:** stable.

Per the prompt's "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Temp Limits / Inactive to
> non-dev yet — wait until cross-tab nav has been used end-to-end on
> real data.

PR #85 doesn't touch the tab gating; the `devOnly: true` flag from
[PR #80](https://github.com/alkprojects/kospos/pull/80) remains in
[App.tsx](../../app/src/App.tsx). Still visible only when `?dev=1`
is set or dev mode has been toggled.

**Disposition:** stable.

### Finding 7 — Q #18 (holdReason enum) drops from carry-forward cleanly

**Status:** stable.

Alex's S29 answer to Q #18 ("don't do any pre-built tags for now")
removes the question from carry-forward without any code change
required — `PlannedAction.holdReason` remains the free string it was
in PR #79. The S30 handoff drops Q #18 from the restated-questions
list per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md).

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items A-F

From [`phase-2-2-e-close-audit.md`](phase-2-2-e-close-audit.md) §
Recommendations not actioned, plus the carry-forward table:

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | Sweep stale post-merge worktrees | dropped (8 consecutive PRs auto-archived) | **0 stale** (PR #82 + #84 + #85 all auto-archived) — **11 consecutive PRs** now | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | 2,572 lines | **2,630 lines** (+58 from S28 entry) | drifted further (slower rate this session — S28 had a shorter entry than typical) |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 17 instances | **17 instances** (no labor-report.md changes this session) | unchanged |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer still right |
| E | Phase 2.2 first sub-phase pick | resolved S24 — dropped | n/a | **stays dropped** |
| F | Continue audit cadence at every phase close | working as designed (5th event-based trigger fired on time) | **working as designed** (S29 audit fires on schedule — **6th event-based trigger**) | working as designed — no slip to carry forward |

### Item A — Worktree sweep result: still empirically RESOLVED

`git worktree list` shows 2 entries this audit:

| Worktree | Branch | Commit | Disposition |
|---|---|---|---|
| `kospos/` (main) | `main` | `52a5529` | in sync ✓ (fast-forwarded post-merge) |
| `ecstatic-bardeen-0cfa33/` | `chore/phase-2-2-f-close-audit-and-handoff` | `52a5529` | active (this session) ✓ |

**No stale worktrees.** The 3 PRs this session ([PR #82](https://github.com/alkprojects/kospos/pull/82)'s
S28-tail worktree was already cleaned at the start of S29, plus
[PR #84](https://github.com/alkprojects/kospos/pull/84) +
[PR #85](https://github.com/alkprojects/kospos/pull/85) this session)
all auto-archived. **11 consecutive PRs** now (#71, #73, #74, #75,
#76, #78, #79, #80, #82, #84, #85) auto-archived cleanly. Item stays
dropped from the carry-forward.

### Item B — SESSION_LOG.md is now 2,630 lines

Numeric update. Was 2,572 at the previous audit; +58 lines from the
S28 entry. Slightly lower drift than the past three audits (~62
lines/session) because the S28 entry covered a partial-bundle
session. Past the 2,000-line trim trigger; bundleable with item C
into one ~1.5-hour docs cleanup PR. Priority unchanged.

### Item C — Citation anti-pattern count unchanged at 17

No labor-report.md changes this session, so the count is unchanged
from the S28 measure. Recommendation unchanged: batch cleanup PR.

### Item D — labor-report.md still 8,518 lines, defer holds

Unchanged. Phase 2.4 split still right.

### Item E — Resolved in S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence working as designed (6th event-based trigger)

This audit is the **sixth event-based trigger** to fire under the
[WORKFLOW.md § Audit cadence](../WORKFLOW.md) rule (after Phase 2.0i,
Phase 2.1, Phase 2.2.b+c combined, Phase 2.2.d, and Phase 2.2.e). It
fires **on time** — the S29 prompt template (drafted at the end of
S28's handoff) included the explicit Step-0 audit trigger pattern,
which this session honored.

The slip from S25 has not recurred across **6 subsequent sessions**.
The pattern is self-reinforcing — every next-session prompt now
includes an explicit Step-0 audit-cadence check.

**Outcome:** working as designed. No item to carry forward.

---

## Part 3 — New drift scan

### Memory files

- **9 memory files indexed in MEMORY.md.** No new memory files this
  session; no removals. `staffing_plan_types.md` + `temporary_exchange_tx.md`
  + `cat_16_17_18_rules.md` all referenced in PR #85's commentary;
  schema unchanged. ✓
- **`[[link]]` resolution** — `[[staffing-plan-types]]`,
  `[[temporary-exchange-tx]]`, `[[cat-16-17-18-rules]]`,
  `[[feedback_dont_reremind]]`, `[[feedback_projections_always_cola_aware]]`,
  `[[feedback_user_notes_per_position]]` all resolve. ✓
- **`feedback_projections_always_cola_aware.md`** — the COLA-aware
  rule is honored by `computeExpectedCost` (unchanged from PR #79;
  derived rows have `basis: null` so they never reach the cost
  calculator). ✓

### Tooling / hooks / settings

- **No hook / settings / Vite config changes** in either of the 2
  PRs. PR #84 was 3 source files (1 new pure module + 1 new test +
  1 view edit); PR #85 was 10 source files (entity types + helpers +
  store + position type + position build + 2 test files + view +
  index). ✓
- **`settings.local.json`** still well-formed; no new permissions
  needed.
- **`.claude/launch.json`** was added (or restored from a prior
  config) this session to support the preview-MCP workflow — well
  within the harness's expected use; no new permissions surfaced.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block. ✓
- **Cowork "Auto-archive on PR close" working across 11 consecutive
  PRs** — see Item A above.

### Anchor compliance

No `labor-report.md` heading-level edits in Phase 2.2.f source PRs
(both PRs were code-only). The audit doc + handoff updates this
session touch only `docs/audits/` and `docs/SESSION_*` — neither
affects the anchor graph in labor-report.md. Anchor verifier rerun
skipped per the precedent set in earlier non-heading-touching cycles.

### Tool sprawl

- `app/src/lib/views/labor/` gained one new module —
  **`payroll-diagnostic.ts`** + `payroll-diagnostic.test.ts` (2
  files, ~280 lines). Clean pure-function module; testable without
  React. ✓
- `app/src/lib/staffing-plan/` expanded by ~250 lines of new
  helpers + ~210 lines of new tests. Existing files extended in
  place — no new modules. ✓
- `app/src/lib/positions/` got a small refactor (factored
  `buildCat1718`; added `Position.cat1718` field). Net delta +35
  lines including the new test case. ✓
- `app/src/lib/views/staffing-plan/StaffingPlanView.tsx` grew by
  ~225 lines for the unified row dispatch + `ManualOmissionsSection`
  + auto-chip badges. Code reads cleanly as an additive change. ✓
- No new dependencies. `package.json` unchanged. ✓

### Doc-vs-implementation

- [`labor-report.md § Tab 24 § Improvement #6 — holdReason enum`](../domain/labor-report.md#tab-24--staffing-plan)
  describes a curated enum. **Alex S29 dropped this** — the doc
  language is now aspirational but stale (it sketches an enum that
  won't ship). **Surface as a doc-drift TODO** for the S30 doc PR
  (or fold into the broader labor-report.md cleanup item C). Low
  priority — the spec section is correctly described as "the
  surface PR will narrow this once Alex confirms," which is now
  resolved as "Alex confirmed: don't narrow."
- [`labor-report.md § Tab 24 § Improvement #4 — state machine`](../domain/labor-report.md#tab-24--staffing-plan)
  sketches the status-transition state machine. PR #85's
  `isAllowedStatusTransition` honors that sketch with the
  forward-only + csc-hold bidirectional branches. PR 2 (S30) will
  surface this in the editor UI. ✓
- [`memory staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md)
  enumerates the 5 row types → unchanged. The derived rule adds two
  *sources* (manual / derived) but doesn't change the underlying
  types. ✓
- [`memory cat_16_17_18_rules.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/cat_16_17_18_rules.md)
  describes the Cat 16/17/18 rules. PR #85's derive rule uses Cat
  17/18 (not Cat 16) — consistent with the memory's TEMP framing. ✓

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #84 | Widened Payroll empty-state diagnostic: coverage stat + progressive prefix + snapshot meta | stable (Bug 2 root-cause now self-diagnosing) |
| 2 | PR #85 | Bug 3 derived defaults end-to-end (Pending + TEMP auto-populate; Manual user changes section) | stable |
| 3 | PR #85 | `Position.cat1718` lift — vacant Cat 17/18 positions now derive correctly | stable |
| 4 | PR #85 | `UnifiedAction` discriminated union renders manual + derived uniformly | stable |
| 5 | PR #84 + #85 | `npm test` 303/303 (+40 from Phase 2.2.f start) holds | stable |
| 6 | PR #85 | `Hiring Plan` tab remains devOnly | stable |
| 7 | Q #18 | holdReason enum dropped per Alex — `holdReason` stays free string | stable; drops from carry-forward |
| 8 | Carry-forward A | Stale worktrees: 0 — **11 consecutive PRs** auto-archived | **stays dropped** |
| 9 | Carry-forward B | SESSION_LOG.md 2,572 → 2,630 lines (+58) | drifted (~58 lines/session — slightly slower) |
| 10 | Carry-forward C | Citation anti-pattern unchanged at 17 (no labor-report.md changes) | unchanged |
| 11 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 12 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 13 | Carry-forward F | Audit cadence working as designed (6th event-based trigger on time) | working as designed |
| 14 | New drift — memory | 9 files indexed; links resolve; no schema changes | stable |
| 15 | New drift — hooks/settings | No changes; auto-archive working; .claude/launch.json restored for preview-MCP | stable |
| 16 | New drift — anchors | No heading edits this phase; verifier skip safe | stable |
| 17 | New drift — tool sprawl | One new pure module (payroll-diagnostic.ts); two refactors in place (staffing-plan + positions); no new deps | stable |
| 18 | New drift — doc-vs-impl | labor-report.md § Tab 24 Improvement #6 now stale (holdReason enum was dropped) — surface as doc-drift TODO | minor; low priority |

**Totals:** 0 applied this session · 1 carry-forward stays dropped (A)
· 1 carry-forward drifted (B) · 1 carry-forward unchanged (C) · 1
carry-forward unchanged-right-call (D) · 1 carry-forward
resolved-stays-dropped (E) · 1 carry-forward working-as-designed (F)
· 4 new-drift stable confirmations + 1 minor new-drift TODO (Tab 24
holdReason language now stale).

---

## Recommendations not actioned

In priority order:

1. **Schedule SESSION_LOG.md trim** (item B) — 2,630 lines, past the
   2,000-line trim trigger; bundleable with item C (~1.5 hours
   combined). Priority unchanged; slightly lower drift this session.
2. **Migrate the citation anti-pattern** (item C) — 17 instances;
   bundleable with B per above. ~30 minutes. Could also fold in the
   Tab 24 Improvement #6 holdReason language update (#18 above).
3. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
4. **Queue ADR amendments for Phase 2.4** — ADR-007 amendment for
   the 39-column OBI shape + new ADR for the 64-column BFM eturn
   shape + new ADR for the `lib/staffing-plan/` no-upstream-source
   pattern (could also note the Position.cat1718 lift). Three ADR
   moves could share one Phase 2.4 docs PR.
5. **Continue audit cadence at every phase close** (item F) — next
   audit fires when Phase 2.2.g ships. The S30 prompt template
   (in this PR's SESSION_HANDOFF.md update) preserves the Step-0
   trigger.

None block the next session's work (Phase 2.2.f Option C PR 2 or
Phase 2.2.g sub-phase pick).

---

## Cross-references

- Previous audit: [phase-2-2-e-close-audit.md](phase-2-2-e-close-audit.md)
  (Session 28).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.f implementation: [PR #84](https://github.com/alkprojects/kospos/pull/84)
  (Bug 2 polish) + [PR #85](https://github.com/alkprojects/kospos/pull/85)
  (Bug 3 + derived defaults) + Session 29 SESSION_LOG.md entry
  (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
