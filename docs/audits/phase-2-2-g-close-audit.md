# Phase 2.2.g close audit — Session 30

**Date:** 2026-05-26
**Branch:** `chore/phase-2-2-g-close-audit-and-handoff`
**Scope:** Phase 2.2.g close audit. Fires at the close of Phase 2.2.g per
[WORKFLOW.md § Audit cadence](../WORKFLOW.md). Phase 2.2.g shipped the
queued staffing-plan v2 PR 2 ([PR #90](https://github.com/alkprojects/kospos/pull/90)
— `PlannedActionDetail` editor + row-click drill-down + full `CostInput`
sub-editor + delta-pay view + status-workflow UI consuming the
`isAllowedStatusTransition` guard helper shipped in PR #85), preceded by
a small standalone bug-fix PR ([PR #89](https://github.com/alkprojects/kospos/pull/89)
— Bug 2a: coerce OBI Earning Period End Excel-serial cells to ISO
`YYYY-MM-DD`) that ran first to address the live-site asOf-display bug
Alex flagged at the close of S29.

Last audit was the [Phase 2.2.f close audit](phase-2-2-f-close-audit.md)
one session prior.

## Methodology

1. Read every file touched in Phase 2.2.g's two PRs
   ([PR #89](https://github.com/alkprojects/kospos/pull/89) — 3 files;
   [PR #90](https://github.com/alkprojects/kospos/pull/90) — 9 files)
   against the docs that describe them ([labor-report.md § Tab 24
   Staffing Plan](../domain/labor-report.md#tab-24--staffing-plan),
   the Phase 2.2.f close audit, the S30 prompt + SESSION_HANDOFF
   recommendations).
2. Re-run `npm test` — confirms the **328 / 328** baseline (was 303 at
   the start of Phase 2.2.g; +5 from PR #89 + +20 from PR #90).
3. Re-check the 6 carry-forward items A-F from the
   [Phase 2.2.f close audit](phase-2-2-f-close-audit.md); mark each as
   `unchanged`, `improved`, `drifted`, or `resolved`.
4. Scan for new drift: memory-file freshness, tool sprawl, hook
   regressions, doc-vs-implementation mismatches, anchor-graph integrity.
5. Apply trivial in-session fixes; surface non-trivial items for Alex.

---

## Part 1 — Phase 2.2.g PR follow-ups

### Finding 1 — PR #89 fixes Bug 2a at the importer level + adds downstream regression coverage

**Status:** stable.

Alex's S29-tail live-site review surfaced: the Payroll summary header
displayed `Snapshot asOf 46150 · FY 2026` — the raw Excel date serial
for 2026-05-08. Root cause: [`obi-payroll.ts`](../../app/src/lib/importers/obi-payroll.ts)'s
`str()` helper converted numeric date cells via `String(v)`, which
yields the serial unchanged. The serial then flowed into:

1. `_asOfDate` (the Payroll summary header binds directly to it).
2. `applyFilters`'s PP-range filter in
   [`lib/views/labor/aggregate.ts`](../../app/src/lib/views/labor/aggregate.ts) —
   lexicographic comparison of `earningPeriodEnd` against ISO
   `YYYY-MM-DD` user input. Because `'4' > '2'`, a serial-shaped value
   like `"46150"` is `>` every ISO date in 2026, so the range filter
   silently dropped every row.

[PR #89](https://github.com/alkprojects/kospos/pull/89) addresses this
with a focused `iso()` converter in `obi-payroll.ts` applied to the
`iPeriodEnd` reads. Handles numeric serials (Excel epoch 1899-12-30 →
JS 1970-01-01 offset 25569), JS `Date` objects, already-ISO strings
(pass-through), and empty cells.

**Scope choice:** targeted to obi-payroll only — passing `cellDates:
true` globally at the FilePicker level would also affect `ps-hcm-pp` /
`bfm-position` date columns whose `str()` wrappers would yield JS
`Date.toString()` output ("Thu May 08 2026 17:00:00 GMT-0700"). The
targeted helper avoids that wider blast radius.

**Tests:** +5, total 308 / 308 at PR #89's merge. Coverage:
- numeric serial → ISO (`46150` → `2026-05-08`)
- MAX(asOfDate) across mixed serial + ISO rows
- already-ISO passthrough (CSV / text-formatted cells)
- empty-cell handling (no spurious 1899 epoch)
- regression test in `labor.test.ts`: PP-range filter requires ISO
  `earningPeriodEnd` — documents the downstream invariant the importer
  fix protects.

**Disposition:** stable. Spot-check awaits Alex's new CPC+DBI OBI
export — the live site should now read `Snapshot asOf 2026-05-08 ·
FY 2026` (or whatever the real MAX is) instead of the raw serial.

### Finding 2 — PR #90 ships PlannedActionDetail editor end-to-end

**Status:** stable.

The biggest user-visible gap on the Hiring Plan workspace at the close
of S29: the only row-level affordance was Delete. Clicking a row did
nothing; pricing an action required no UI path at all (the inline
AddActionForm only collected position + type + notes). The "X of Y
priced ⚠" diagnostic chip was informational but not actionable.

[PR #90](https://github.com/alkprojects/kospos/pull/90) ships the
detail editor end-to-end:

- **Modal pattern** — fixed overlay with backdrop, Esc / backdrop click
  to close. Footer with Save / Cancel / Delete (Delete hidden in
  derive-convert mode). Per-row Hide / Delete buttons `stopPropagation`
  so they don't double-fire the modal open.
- **`CostInputEditor` sub-component** — all 8 `CostInput` fields
  editable per the S30 AskUserQuestion (Alex picked "Full with
  deltaPay"): code datalist + setId button group + retCode buttons +
  ppStartDate / fiscalYear selects + step / range pickers + range-pos
  toggle + `cumulativeCalendarYearSalary` input.
- **`defaultBasisForPosition`** — pure pre-fill helper. Seeds code +
  salaryType + setid + step (when filled + step-class) from the
  position's appointment data; sensible defaults for the rest.
- **`incumbentCostInput` + `deltaCost`** — synthesizes the incumbent's
  CostInput from appointment data; computes incumbent / planned /
  delta side-by-side. Signed delta: positive = plan adds cost, negative
  = savings.
- **Status workflow UI** — consumes the `isAllowedStatusTransition`
  guard helper shipped in PR #85. Rejected transitions surface a
  "Force override (skip {from} → {to} guard — logged)" checkbox; Save
  gated on the checkbox when override is needed. Override save flows
  through `updateAction`, which logs the field change in the history
  audit log automatically.
- **All fields editable** — `startPpe` date input, `holdReason`
  (Pending / Unfunded only), `separationConfidence` (Separation only),
  `actionMode` select, multi-line notes textarea.
- **History audit log preview** — collapsible list, newest first.
  Format: `YYYY-MM-DD HH:MM · field · before → after`.
- **Convert-from-derived flow** — clicking a derived (virtual) row
  opens the editor in convert mode with a "Converting from auto" tag
  + Save button labeled "Save (convert to manual)". On save, the
  derive-spec is materialized as a manual action via `addAction`;
  the existing per-position manual-wins rule then suppresses the
  auto-derived row.

The S30 AskUserQuestion run-up resolved 1 gating item:
- **CostInput-scope question:** Alex picked **Full with deltaPay
  support** — all 8 fields editable + delta-pay view. Ships in this PR.

**Tests:** +20, total 328 / 328 at PR #90's merge. Coverage:
- 4 `defaultBasisForPosition` cases (filled step seed, vacant fallback,
  unknown-code blank, step from appointment.salaryStep)
- 3 `isCostInputComplete` cases (rejects incomplete; accepts complete
  step + range)
- 4 `incumbentCostInput` cases (null for vacant + unknown; builds for
  step + range incumbents)
- 3 `deltaCost` cases (both halves + signed delta; negative delta for
  separations; null operands return null delta)
- 6 view-level cases (row-click opens modal; derived-row opens in
  convert mode; Cancel preserves store; Hide/Delete stopPropagation;
  status guard surfaces override checkbox on backward transition;
  convert-from-derived save materializes a manual action)

**Disposition:** stable. The Hiring Plan workspace's row-level
affordance is now complete — every PlannedAction field is editable,
the "X of Y priced ⚠" chip is actionable, the status guard is in the
UI, and the delta-pay view models hire-vs-incumbent scenarios.

### Finding 3 — Decision tree on `cellDates: true` was documented in the commit

**Status:** stable.

The PR #89 commit + PR description spell out why the fix is targeted
to obi-payroll only rather than passing `cellDates: true` at the
FilePicker `read()` level. Future sessions hitting a similar
serial-vs-string bug in `ps-hcm-pp` won't have to re-derive the
trade-off — lifting `iso()` to a shared importer-helpers module is a
5-minute move documented in the JSDoc.

**Disposition:** stable. Worth a brief mention in a future Phase 2.4
ADR (the ADR-007 amendment for the 39-col OBI shape could note the
serial-vs-ISO converter alongside the column inventory).

### Finding 4 — Modal pattern stays simple (no Portal / no headless-ui)

**Status:** stable.

PR #90's modal uses a fixed-position overlay rendered inline (no
React Portal, no third-party headless-ui library). Accessibility
basics covered: `role="dialog"`, `aria-modal="true"`,
`aria-label="Planned action detail"`, Esc-to-close handler, backdrop
click to close. No focus-trap (deferred until a wider a11y pass —
mark for future investigation).

**Disposition:** stable. Avoiding Portal keeps the test setup simple
(testing-library finds the modal in the same render tree). If we
later need backdrop scroll-lock or focus-trap, the modal can move
to a Portal then.

### Finding 5 — `useEffect` dependency was tightened on `action.id` alone

**Status:** stable.

The `useEffect` that resets the editor's draft state on `action` prop
change was originally `[action.id, isDerived, position, action]`. As
written, any store update that re-created the `action` object reference
(e.g., the user toggling another action via Hide) would wipe the
in-progress draft. The dependency narrowed to `[action.id]` with an
`eslint-disable-next-line react-hooks/exhaustive-deps` comment + a
prose note in the source. Trade-off documented: if the underlying
action's data changes via some other path while the modal is open, the
user has to cancel + reopen to see the new state — acceptable for v1.

**Disposition:** stable.

### Finding 6 — Tests passing at 328 / 328 (+25 from Phase 2.2.f close baseline of 303)

**Status:** stable.

| Phase point | Tests | Delta |
|---|---|---|
| Start of Phase 2.2.e | 227 | baseline at S27 |
| Phase 2.2.e PR #79 + #80 | 263 | +36 entity + view-render |
| Phase 2.2.f PR #84 + #85 | 303 | +40 payroll-diagnostic + Bug 3 |
| **Phase 2.2.g PR #89** | **308** | **+5 importer serial-coerce + downstream invariant** |
| **Phase 2.2.g PR #90** | **328** | **+20 cost-prefill + incumbent / delta + view-level modal** |

The +20 in PR #90 breaks down:
- 4 `defaultBasisForPosition` (filled step seed; vacant fallback;
  unknown-code blank; step from `appointment.salaryStep`)
- 3 `isCostInputComplete` (rejects incomplete; accepts step + range)
- 4 `incumbentCostInput` (null for vacant; null for unknown code;
  builds for step + range incumbents)
- 3 `deltaCost` (both halves with priced action; negative delta for
  separations; null when operands missing)
- 6 view-level (row-click opens modal; derived → convert mode;
  Cancel preserves store; Hide/Delete stopPropagation; status guard
  override checkbox; convert save materializes manual)

### Finding 7 — `Hiring Plan` tab stays appropriately devOnly

**Status:** stable.

Per the prompt's "What we are NOT doing":

> No promotion of Payroll / Hiring Plan / Temp Limits / Inactive to
> non-dev yet — wait until cross-tab nav has been used end-to-end on
> real data.

PR #90 doesn't touch the tab gating; the `devOnly: true` flag from
[PR #80](https://github.com/alkprojects/kospos/pull/80) remains in
[App.tsx](../../app/src/App.tsx). Still visible only when `?dev=1`
is set or dev mode has been toggled.

**Disposition:** stable.

### Finding 8 — Bug 2 (both 2a + 2b) drops fully from carry-forward

**Status:** stable.

- **Bug 2a (asOf-serial display)** — shipped via PR #89. Spot-check
  on live site awaits Alex's new CPC+DBI export, but the test suite
  covers the round-trip (numeric serial input → ISO output) end-to-end.
- **Bug 2b (1106950 not in OBI)** — already resolved user-side in S29
  (Alex confirmed wrong-file mistake). PR #84's diagnostic copy was
  correct for the actual P&P-only case.

Bug 2 (in all sub-cases) is now fully off the carry-forward.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items A-F

From [`phase-2-2-f-close-audit.md`](phase-2-2-f-close-audit.md) §
Recommendations not actioned, plus the carry-forward table:

| # | Item | Prior status | This audit status | Disposition |
|---|---|---|---|---|
| A | Sweep stale post-merge worktrees | dropped (11 consecutive PRs auto-archived) | **0 stale** (PR #89 + #90 both auto-archived) — **13 consecutive PRs** now | **stays dropped** |
| B | Trim SESSION_LOG.md sessions 1–16 | 2,630 lines | TBD after S30 entry lands | unchanged baseline + S30 entry pending |
| C | Migrate memory-file citation anti-pattern in `labor-report.md` | 17 instances | **17 instances** (no labor-report.md changes this session) | unchanged |
| D | Defer `labor-report.md` split until Phase 2.4 | 8,518 lines | 8,518 lines (unchanged) | unchanged — defer still right |
| E | Phase 2.2 first sub-phase pick | resolved S24 — dropped | n/a | **stays dropped** |
| F | Continue audit cadence at every phase close | working as designed (6th event-based trigger fired on time) | **working as designed** (S30 audit fires on schedule — **7th event-based trigger**) | working as designed — no slip to carry forward |

### Item A — Worktree sweep result: still empirically RESOLVED

The 2 PRs this session ([PR #89](https://github.com/alkprojects/kospos/pull/89)
+ [PR #90](https://github.com/alkprojects/kospos/pull/90)) both
auto-archived after merge. **13 consecutive PRs** now (#71, #73, #74,
#75, #76, #78, #79, #80, #82, #84, #85, #89, #90) auto-archived
cleanly. Item stays dropped from the carry-forward.

### Item B — SESSION_LOG.md drift baseline

Baseline at this audit reads 2,630 lines (pre-S30 entry). After
the S30 entry lands, drift will resume tracking. Still bundleable
with item C into one ~1.5-hour docs cleanup PR. Priority unchanged.

### Item C — Citation anti-pattern count unchanged at 17

No labor-report.md changes this session, so the count is unchanged.
Recommendation unchanged: batch cleanup PR.

### Item D — labor-report.md still 8,518 lines, defer holds

Unchanged. Phase 2.4 split still right.

### Item E — Resolved in S24 (stays dropped)

No re-entry needed.

### Item F — Audit cadence working as designed (7th event-based trigger)

This audit is the **seventh event-based trigger** to fire under the
[WORKFLOW.md § Audit cadence](../WORKFLOW.md) rule (after Phase 2.0i,
Phase 2.1, Phase 2.2.b+c combined, Phase 2.2.d, Phase 2.2.e, Phase
2.2.f). It fires **on time** — the S30 prompt template (drafted at
the end of S29's handoff) included the explicit Step-0 audit trigger
pattern, which this session honored.

The slip from S25 has not recurred across **7 subsequent sessions**.
The pattern is self-reinforcing — every next-session prompt now
includes an explicit Step-0 audit-cadence check.

**Outcome:** working as designed. No item to carry forward.

---

## Part 3 — New drift scan

### Memory files

- **9 memory files indexed in MEMORY.md.** No new memory files this
  session; no removals. `staffing_plan_types.md` +
  `temporary_exchange_tx.md` + `feedback_projections_always_cola_aware.md`
  all referenced in PR #90's commentary; schema unchanged. ✓
- **`[[link]]` resolution** — all referenced memories resolve. ✓
- **`feedback_projections_always_cola_aware.md`** — the COLA-aware
  rule is honored throughout. `computeExpectedCost` and
  `incumbentCostInput` both route through `calcEmployeeCost` whose
  per-PP loop applies pre-/post-COLA snapshots. ✓
- **`feedback_dont_reremind.md`** — followed for the Bug 2 + Q #18 +
  Q #19 + Bug 3 + CostInput-scope acknowledgments. S30 handoff drops
  them all from carry-forward.

### Tooling / hooks / settings

- **No hook / settings / Vite config changes** in either of the 2 PRs.
  PR #89 was 3 files (importer + 2 test files); PR #90 was 9 files
  (3 new view components + cost-prefill helper + types + index +
  build + 2 test files + view edit). ✓
- **`settings.local.json`** still well-formed; no new permissions
  needed.
- **`.claude/launch.json`** unchanged from S29.
- **Stop hook (PR #51) firing as designed.** This handoff doc lands
  with a next-session prompt block. ✓
- **Cowork "Auto-archive on PR close" working across 13 consecutive
  PRs** — see Item A above.

### Anchor compliance

No `labor-report.md` heading-level edits in Phase 2.2.g source PRs
(both PRs were code-only). The audit doc + handoff updates this
session touch only `docs/audits/` and `docs/SESSION_*` — neither
affects the anchor graph in labor-report.md. Anchor verifier rerun
skipped per the precedent set in earlier non-heading-touching cycles.

### Tool sprawl

- `app/src/lib/staffing-plan/` gained one new module —
  **`cost-prefill.ts`** (~100 lines, no separate test file —
  test cases live in the existing `staffing-plan.test.ts`). Clean
  pure-function module. ✓
- `app/src/lib/staffing-plan/build.ts` extended in place with
  `incumbentCostInput` + `deltaCost` (+128 lines). No new module. ✓
- `app/src/lib/staffing-plan/types.ts` extended in place with
  `DeltaCost` (+24 lines). ✓
- `app/src/lib/views/staffing-plan/` gained two new modules —
  **`CostInputEditor.tsx`** (~290 lines) + **`PlannedActionDetail.tsx`**
  (~640 lines). Both are pure React components — no separate state
  modules. ✓
- `app/src/lib/views/staffing-plan/StaffingPlanView.tsx` grew by
  ~49 lines for the modal wiring + `selectedActionId` state + click
  propagation handling. Additive change. ✓
- `app/src/lib/importers/obi-payroll.ts` gained ~50 lines for the
  `iso()` converter + JSDoc. ✓
- No new dependencies. `package.json` unchanged. ✓

### Doc-vs-implementation

- [`labor-report.md § Tab 24 § Improvement #1 — PlannedAction model`](../domain/labor-report.md#tab-24--staffing-plan)
  describes the model that PR #79 first shipped. PR #90 surfaces the
  full editor for that model. Spec stays in sync. ✓
- [`labor-report.md § Tab 24 § Improvement #4 — state machine`](../domain/labor-report.md#tab-24--staffing-plan)
  sketches the status-transition state machine. PR #90 surfaces the
  `isAllowedStatusTransition` guard in the editor with force-override.
  ✓
- [`labor-report.md § Tab 24 § Improvement #6 — holdReason enum`](../domain/labor-report.md#tab-24--staffing-plan)
  language is still stale (was flagged in the Phase 2.2.f audit). PR
  #90 didn't touch this — Alex dropped the enum in S29. **Still queued
  for the docs cleanup PR** (items B + C bundle).
- **`docs/DECISIONS.md`** — no new ADRs in either PR. The
  staffing-plan no-upstream-source pattern + `Position.cat1718` lift +
  ADR-007 amendment + BFM eturn ADR — all 4 still queued for Phase 2.4.
- **`docs/data-sources/`** — OBI BI Payroll data-source doc doesn't
  yet note the Excel-serial date-cell behavior. **Surface as a minor
  doc-update TODO** (or fold into the Phase 2.4 ADR-007 amendment).

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | PR #89 | Bug 2a asOf-serial fixed at importer level; PP-range filter regression covered | stable |
| 2 | PR #90 | PlannedActionDetail editor end-to-end (modal + full CostInput + status guard UI + delta-pay) | stable |
| 3 | PR #89 | Targeted-to-obi-payroll decision rationale documented in commit / JSDoc | stable |
| 4 | PR #90 | Modal pattern stays simple (no Portal / no third-party headless lib) | stable |
| 5 | PR #90 | `useEffect` dependency narrowed to `[action.id]` to preserve in-progress drafts | stable |
| 6 | PR #89 + #90 | `npm test` 328/328 (+25 from Phase 2.2.g start) holds | stable |
| 7 | PR #90 | `Hiring Plan` tab remains devOnly | stable |
| 8 | Bug 2 | Both 2a + 2b drop fully from carry-forward | stable |
| 9 | Carry-forward A | Stale worktrees: 0 — **13 consecutive PRs** auto-archived | **stays dropped** |
| 10 | Carry-forward B | SESSION_LOG.md 2,630 lines (pre-S30 entry); S30 entry will resume drift tracking | baseline reset; tracking continues |
| 11 | Carry-forward C | Citation anti-pattern unchanged at 17 (no labor-report.md changes) | unchanged |
| 12 | Carry-forward D | labor-report.md 8,518 lines unchanged | unchanged |
| 13 | Carry-forward E | Resolved S24 (stays dropped) | n/a |
| 14 | Carry-forward F | Audit cadence working as designed (7th event-based trigger on time) | working as designed |
| 15 | New drift — memory | 9 files indexed; links resolve; no schema changes | stable |
| 16 | New drift — hooks/settings | No changes; auto-archive working | stable |
| 17 | New drift — anchors | No heading edits this phase; verifier skip safe | stable |
| 18 | New drift — tool sprawl | Three new pure modules (cost-prefill.ts + CostInputEditor.tsx + PlannedActionDetail.tsx); two in-place extensions (build.ts + types.ts + StaffingPlanView.tsx); no new deps | stable |
| 19 | New drift — doc-vs-impl | OBI data-source doc doesn't mention the Excel-serial behavior; could fold into Phase 2.4 ADR-007 amendment | minor; low priority |

**Totals:** 0 applied this session · 1 carry-forward stays dropped (A)
· 1 carry-forward baseline-reset (B) · 1 carry-forward unchanged (C)
· 1 carry-forward unchanged-right-call (D) · 1 carry-forward
resolved-stays-dropped (E) · 1 carry-forward working-as-designed (F)
· 4 new-drift stable confirmations + 1 minor new-drift TODO (OBI
serial doc language).

---

## Recommendations not actioned

In priority order:

1. **Schedule SESSION_LOG.md trim** (item B) — 2,630 lines pre-S30
   entry; past the 2,000-line trim trigger; bundleable with item C
   (~1.5 hours combined). Priority unchanged.
2. **Migrate the citation anti-pattern** (item C) — 17 instances;
   bundleable with B. ~30 minutes. Could also fold in the Tab 24
   Improvement #6 holdReason language update (now 2 sessions stale)
   + the OBI serial doc note from item #19 above.
3. **Defer `labor-report.md` split until Phase 2.4** (item D) — no
   change since Phase 2.0i.
4. **Queue ADR amendments for Phase 2.4** — ADR-007 amendment for
   the 39-column OBI shape (+ note the `iso()` serial-converter from
   PR #89) + new ADR for the 64-column BFM eturn shape + new ADR for
   the `lib/staffing-plan/` no-upstream-source pattern (could also
   note the Position.cat1718 lift). All 4 still queued.
5. **Continue audit cadence at every phase close** (item F) — next
   audit fires when Phase 2.2.h ships. The S31 prompt template (in
   this PR's SESSION_HANDOFF.md update) preserves the Step-0 trigger.

None block the next session's work (Phase 2.2.h sub-phase pick).

---

## Cross-references

- Previous audit: [phase-2-2-f-close-audit.md](phase-2-2-f-close-audit.md)
  (Session 29).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- Phase 2.2.g implementation: [PR #89](https://github.com/alkprojects/kospos/pull/89)
  (Bug 2a asOf-serial fix) + [PR #90](https://github.com/alkprojects/kospos/pull/90)
  (PlannedActionDetail editor) + Session 30 SESSION_LOG.md entry
  (drafted in this PR).
- Phase 2.2 sub-phase enumeration: [labor-report.md § Phase 2.2
  sub-phases](../domain/labor-report.md#phase-22-sub-phases-dependency-order).
