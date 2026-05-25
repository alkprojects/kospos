# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 20 — Phase 2.0g Staffing Plan + Vacancies + Budget Summary, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** `99d630f` (PR #55 — workflow audit follow-ups) → `<this PR>` (Session 20 Phase 2.0g landed)
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after this PR merges

### What landed this session — Phase 2.0g

[**PR #_TBD_**](https://github.com/alkprojects/kospos/pulls) — `docs(labor-report): Phase 2.0g — Staffing Plan + Vacancies + Budget Summary (Tabs 23-25) + Tab 16 PREMM COLA-aware fix-up + Cat 17/18 Charter cite + lib/quality enumeration` — ~1,500 lines added across:

- `docs/domain/labor-report.md` — Tab 23 / 24 / 25 walkthroughs (per-tab template); Tab 16 PREMM COLA-aware projection narrative + Open Question resolution; 10 new cross-cutting concerns rows; Phase 2.2 sub-phase enumeration populated with `lib/quality/` 28-category Data Issues catalog; 4 anchor-link migrations (Tab 26/27 occurrence indices shifted -7/-8 → -10/-11); 2 opportunistic pre-existing anchor fixes; tab-list table updated.
- `docs/audits/labor-report-scenario-tests.md` — Scenario 3 expanded with Charter §10.104-17/18 + CSC Rule 114 cites + 2 new Cat 17/18 categorical flags; Scenario 4 reclassified Guaiumi case to "labor-report data bug suspected" with per-position cap-check requirement; 5 broken intra-file memory-pointer anti-patterns converted to file:// convention.
- `docs/domain/special-class.md` — 2 broken `scenario-9` anchor refs fixed opportunistically.
- `memory/cat_16_17_18_rules.md` — updated with Charter cites (Cat 17 + Cat 18 confirmed via web research).
- `docs/SESSION_LOG.md` — Session 20 entry appended.

**107 / 107 anchor refs in labor-report.md verified clean.**

### Items surfaced for Alex's review (carry forward)

All four restated questions + five open action items are below. **None block Phase 2.0h** — recommended path: Alex reviews at his pace; next session continues to Phase 2.0h (remaining 14 unwalked tabs).

#### Restated questions for Alex (4 — repeated from prior sessions)

These were drafted in Session 17 + 18 as reasonable-default calls deferred for Alex's confirmation. **Re-asked in plain English per Alex's preference.**

1. **Restated #1 (was S17 #2):** "On the Operating Report Summary, three different things look like they're called 'attrition rate' at the DBI / CPC dept-group level: G42/H42 = (9993 ÷ non-9993 labor), L23/L32 = (projected balance ÷ total budget), and H43 = a hand-keyed prior-year number with a 'Calculated, Questionable' note. They display as percentages on the same page, look similar, but mean different things. Which one is 'the attrition rate' that goes in the report you send to CON/MYR? My current default: G42/H42 is canonical (9993 ÷ non-9993); L23/L32 gets renamed to 'leftover %' in KosPos. Confirm or correct?"

2. **Restated #2 (was S17 #4):** "The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called 'Department Group' — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that 'Department Group' label so other people's GETPIVOTDATA formulas still work? My current default: yes, preserve it. (Slightly more cosmetic, but breaks downstream Excel formulas if we rename.)"

3. **Restated #3 (was S17 #5):** "The OPS Detail snapshot-diff feature (the 'what changed since the last report' panel) needs a key to identify each row across snapshots. Options:
     (a) Position Number alone (simplest, but doesn't differentiate vacant-then-filled — same position number, different occupant)
     (b) (Eff Dept, Position Number, Fill Status, Budget Job Code) (current default — captures dept moves + reclassifications)
     (c) Position Number + a separate tracker for 'who occupied it when'
   My current default: option (b). Confirm or correct?"

4. **Restated #4 (was S18 #4):** "The Step (Tab 18) walkthrough's improvement #3 proposes making per-PP step variance 'merit-event aware' — instead of uniform per-PP proration, the formula would understand 'this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget.' Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? Default: defer."

#### Reasonable-default calls deferred this session (8 — Phase 2.0g additions)

Each made during Tabs 23 / 24 / 25 walkthroughs. Confirm or correct.

1. **(Tab 23 § Open question)** The 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) reverse-engineered from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table — confirm each definition matches Alex's working semantics.
2. **(Tab 23 § Open question)** `Vacant Date` source — computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain? CI formula not yet inspected.
3. **(Tab 23 § Open question)** `Previous Employee2` (col Q) vs `Previous Employee` (cache field 19) — possibly second-to-last vs most-recent incumbent.
4. **(Tab 24 § Open question)** `V Check` semantics for TEMPM-budgeted rows — formula `IF(P="TEMPM", "", ...)` skips the check; confirm temp-on-TEMPM planned for E2P should still appear in Vacancies.
5. **(Tab 24 § Open question)** Cost-basis for blank `W` cells — KosPos default = compute always; let user toggle "show planned-only" view. Confirm.
6. **(Tab 24 § Open question)** PlannedAction history retention — keep diff records indefinitely or roll up older than 18 months? Default: 18 months with summary roll-up.
7. **(Tab 24 § Open question)** DBI→CPC transfer-of-function propagation — when a position transfers mid-year, does it stay on DBI's Staffing Plan until EOY or jump to CPC's immediately? Tied to BVA chartfield reconciliation.
8. **(Tab 24 § Open question + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip with one-click jump-to-fix. Plus annualized rows switched from pure-PP to COLA-aware (per memory [`feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md)). Confirm.

#### Open action items from Session 17 + 18 (5)

1. **The 7 already-expired Cat 17/18 positions** ([scenario-tests § Scenario 3](audits/labor-report-scenario-tests.md#scenario-3--cat-1718-expiry-warning-already-expired-emphasized)) — review with HR; each row needs convert-to-PCS / terminate / document override in [free-text userNotes field](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_user_notes_per_position.md). **Now with Charter cite for severity context: Cat 17 § 10.104-17 = 2 yr; Cat 18 § 10.104-18 = 3 yr; both "shall not be renewable."**
2. **Person 187518 (Guaiumi, Jimmy) at 172% of Cat 16 hours cap** — Session 20 update: re-classified as "labor-report data bug suspected" (workbook likely sums hours by Person Number, not Position Number, mixing prior Cat 16 stint). Confirm or correct.
3. **The 5 vacant-no-RTF positions** ([scenario-tests § Scenario 5](audits/labor-report-scenario-tests.md#scenario-5--vacant-but-no-rtf)) — disposition after Tab 24 walkthrough cross-checks "vice" history. Session 20 documented the cross-check pattern; per-position review still pending.
4. **9 reasonable-default calls** (5 from Session 17 + 4 from Session 18) — review the restated set above (now 12 total: 4 restated + 8 from Phase 2.0g).
5. **CPO posting account** — Tab 19 found CPO (Comp Time Pay Out) posting to 510210 alongside VPO/SVO. Confirm with Controller that CPO always posts to 510210 (not a separate comp-time account).

### Top 3 findings to surface for Alex this session

1. **Staffing Plan's per-position multi-action pattern is intentional.** Position 1115135 appears 3× across Active + Separation + TEMP — three planned actions against one position, not a duplication bug. KosPos models this as `PlannedAction[]` per Position (Tab 24 § KosPos improvement #1). Architecturally the most significant decision from this session.
2. **Cat 17/18 limits authoritatively cited.** Both are Charter-set and "shall not be renewable": Cat 17 = 2 years (Charter §10.104-17); Cat 18 = 3 years (Charter §10.104-18). CSC Rule 114 adds operational detail (1,040-hour increments for Cat 17, limited-term-funding certification for Cat 18). Memory file updated; scenario-tests Scenario 3 references the cites. The 7 already-expired positions remain operationally urgent.
3. **Tab 16 PREMM projection switched to COLA-aware as primary.** Percentage-of-base premiums (`269` 10.27%, `600` 5%, 9 Cert codes) DO COLA-inflate — workbook's pure-PP shortcut under-projects post-COLA. Reconciles with [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md) "COLA-everywhere principle." Session-17 reasonable-default call corrected.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a | 5 Calendar | done 2026-05-24 |
| 2.0b | 7 BI Payroll | done 2026-05-25 |
| 2.0c | 6 P&P Data | done 2026-05-25 |
| 2.0d | 20 Report Data | done 2026-05-25 |
| 2.0e | 26 OPS Summary + 27 OPS Detail | done 2026-05-25 |
| 2.0f | 16 Premium + 17 Overtime + 18 Step + 19 Retirement Payout | done 2026-05-25 |
| 2.0g | 23 Vacancies and TEMP + 24 Staffing Plan + 25 Budget Summary | **done 2026-05-25** |
| **2.0h** | **14 other tabs (1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22)** | **NEXT** |
| 2.0i | Data Sources Inventory final + Phase 2.2 sub-phase enumeration refresh + **next audit** | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases (15+ sub-phases enumerated this session) | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR amendments per the 6 proposed ADRs) | pending |

## Blockers for Alex

None landing-related. Live site:
<https://alkprojects.github.io/kospos/>. Spot-check the new walkthroughs on
the live site when convenient:

- [docs/domain/labor-report.md § Tab 23 Vacancies and TEMP](domain/labor-report.md#tab-23--vacancies-and-temp)
- [docs/domain/labor-report.md § Tab 24 Staffing Plan](domain/labor-report.md#tab-24--staffing-plan) — the most architecturally significant single new section
- [docs/domain/labor-report.md § Tab 25 Budget Summary](domain/labor-report.md#tab-25--budget-summary)
- [docs/domain/labor-report.md § Phase 2.2 sub-phases](domain/labor-report.md#phase-22-sub-phases-dependency-order) — populated this session with 15+ sub-phases and the 28-category Data Issues catalog
- [docs/domain/labor-report.md § Tab 16 — COLA-aware premium projection (NEW subsection)](domain/labor-report.md#cola-aware-premium-projection--the-kospos-default)
- [docs/audits/labor-report-scenario-tests.md § Scenario 3 (Charter cites added)](audits/labor-report-scenario-tests.md#scenario-3--cat-1718-expiry-warning-already-expired-emphasized)
- [docs/audits/labor-report-scenario-tests.md § Scenario 4 (Guaiumi reclassified)](audits/labor-report-scenario-tests.md#scenario-4--cat-16-hours-approaching-cap)

## Next session prompt — Phase 2.0h (the 14 remaining unwalked tabs)

Paste this verbatim to start Session 21:

````
This session continues Phase 2 of the labor-report deep-dive. Phase 2.0h
covers the 14 remaining unwalked tabs — the "reference + tracking" cluster
that doesn't fit any of the prior thematic groups. These tabs are
generally smaller and simpler than the planning + projection surfaces
already walked.

Tabs to walk (in this order — same as workbook order):

  1. **Data** (Tab 1) — reference index. Trivial walkthrough.
  2. **Departments** (Tab 2) — DBI + CPC dept list. Cross-link to citywide tree.
  3. **Combo** (Tab 3) — chartfield-string aliases. Wide table (~4,800 rows).
  4. **BFM 15.10.006 FY26** (Tab 4) — the canonical BFM eturn (2,694 rows × 64 cols).
     Note: most of this is decoded already in cross-cutting concerns + ADR-004;
     the walkthrough confirms shape + per-column meaning.
  5. **Roster Approvers** (Tab 8) — 867 rows × 9 cols. Routing approvers per roster.
  6. **EE Additional Pay** (Tab 9) — 363 rows × 35 cols. Acting-pay / supervisory pay.
  7. **Probation** (Tab 10) — 26 rows. Probation tracker (user-input).
  8. **Eligibility Lists** (Tab 11) — 40 rows. DHR scrape staging.
  9. **TEMP Limits** (Tab 12) — 30 rows × 37 cols. Cat 16/17/18 expiry tracker.
     **Cross-link to Session 20's Charter cites** in memory cat_16_17_18_rules.md.
  10. **Inactive** (Tab 13) — 640 rows. BI Payroll cross-check (Inactive positions).
      Already documented in Tab 20 walkthrough's INACTIVATED block source notes.
  11. **Separations** (Tab 14) — 12 rows. Pending-separations tracker (user-input).
      Cross-link to Tab 24 Staffing Plan § Separations section.
  12. **Succession** (Tab 15) — 15 rows. Succession planning (draft feature).
  13. **Reporting Tree** (Tab 21) — 606 rows × 53 cols. Org-chart preview + data-quality flags.
      The Phase 7 org-chart Phase precursor.
  14. **Pos by Dept** (Tab 22) — 622 rows. Filtered view of Report Data; low priority.

These break into three groups:

  - **Reference / lookup** (Tabs 1, 2, 3, 4): mostly thin; surface what's there.
  - **Tracking / staging** (Tabs 8, 9, 10, 11, 14, 15): user-input + per-snapshot data.
  - **Per-position pivots** (Tabs 12, 13, 21, 22): pivot views of P&P Data / Report Data
    similar to Tab 23.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/SESSION_LOG.md (Session 20 entry — Tab 23/24/25 walkthroughs +
    PREMM COLA-aware fix + Cat 17/18 Charter cite for context)
  memory/MEMORY.md + all 8 memory files (cat_16_17_18_rules.md is
    updated with verified Charter cites; staffing_plan_types.md +
    feedback_user_notes_per_position.md still relevant)
  docs/domain/labor-report.md (per-tab template at top; cross-cutting
    concerns table; tab list status; Phase 2.2 sub-phase enumeration
    populated last session)
  docs/audits/* (all 4 audit files — anchor convention + scenario-tests
    + walkthrough-audit + BVA reconciliation; scenario-tests was updated
    last session with Charter cites)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
TASK — Phase 2.0h: 14 remaining unwalked tabs (1, 2, 3, 4, 8, 9, 10, 11, 12,
                   13, 14, 15, 21, 22)
==============================================================================
Branch: docs/labor-report-reference-and-tracking-tabs
Scope: ALL 14 tabs in this one PR. The group is uniformly lower-complexity
than 2.0g; one PR is reasonable.

  1. Open `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor
     Report 5.21.26.xlsx` (gitignored; never commit). Use openpyxl
     read-only.
  2. For each of the 14 tabs:
       - Inventory columns + sample formulas + pivot sources (if any)
       - Note DBI vs CPC asymmetries
       - For pivot tabs (Tabs 12, 13, 21, 22): decode pivot fields via
         xl/pivotTables/pivotTable*.xml (same approach as Tab 23 in S20)
       - Cross-link to existing memory + audit doc findings where relevant
  3. Walk each tab through the per-tab template. Default to shorter
     walkthroughs for the truly thin tabs (Data, Probation, Separations,
     Succession) — Status / Purpose / Data sources / Manual-fragile /
     Open questions only.
  4. **Anchor migration carry-forward.** Each new `#### KosPos improvements`
     heading shifts the Tab 26 / Tab 27 occurrence indices by +1. Expected
     final occurrence indices after Phase 2.0h:
       - Tab 26 KosPos improvements: -10 → +N (where N = count of new
         improvements headings added)
       - Tab 27 KosPos improvements: -11 → +N
     Run the verifier script (PR #45 style — Python anchor checker
     reproduced in S20) over the full labor-report.md after each tab is
     added.
  5. Cross-cutting concerns updates: add per-tab DBI shortcuts.
  6. Update Data Sources Inventory + tab-list status (pending → done).
  7. **Refresh Phase 2.2 sub-phase enumeration** with any new sub-phases
     surfaced.
  8. Update SESSION_HANDOFF.md to point at Phase 2.0i (Data Sources
     Inventory final + next audit) as next.

  Also: re-ask the 4 restated questions + 8 reasonable-default calls
  from Session 20 + 5 open action items in the end-of-session
  SESSION_HANDOFF.md update.

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **No app code.** Phase 2 is docs only.
  - **No new npm packages.**
  - **`npm test` stays green.**
  - One PR; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit message ends with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - No app/src/ code changes.
  - No new web research (Cat 17/18 already cited; other reference data
    can wait for Phase 2.4 importer build).
  - No tabs beyond the 14 listed.
  - No BVA importer build (Phase 2.4).
  - No ADR amendments (Phase 2.4).
  - No tool / setting / hook changes (those land in the post-2.0i ADR-batch PR).

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Which tabs walked (status updated).
  - What didn't get done (and why).
  - Top 3 findings.
  - Next-session prompt for Phase 2.0i (DSI final + next audit).
  - Any reasonable-default calls deferred (so Alex can correct).

Re-ask carry-forwards from this session + S18 + S17:
  - 4 restated questions
  - 12 reasonable-default calls (8 from S20 + 4 from S18)
  - 5 open action items (per the S20 handoff)

Recommended model: claude-sonnet-4-6 (the 14 tabs are individually
simpler; high-effort Opus not required unless a specific tab proves
unexpectedly complex). Fallback to claude-opus-4-7 if needed.
Effort: medium.
````

### Recommended model (Phase 2.0h)

`claude-sonnet-4-6` — 14 thin tabs; less synthesis-heavy than 2.0g.

### Recommended effort (Phase 2.0h)

`medium` — bulk per-tab template work, fewer per-tab open design
questions than 2.0g.

---

## Notes for the next-session model

- **The workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\Labor Report 5.21.26.xlsx` (gitignored — never commit).
  openpyxl read-only mode.
- **Example reports folder:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\example reports\Reports\` — full inventory in
  [`data-sources/reports-folder-inventory.md`](data-sources/reports-folder-inventory.md).
- **The local main worktree is at** `C:\Users\ALK\Desktop\Claude Projects\kospos`.
  After each merge: `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos"
  pull --ff-only origin main`.
- **Anchor-link convention** (per Task D audit + Phase 2.0f migration +
  Session 19 audit + Phase 2.0g migration): GitHub uses github-slugger.
  Duplicate-heading suffix = 0-indexed occurrence-count, NOT tab number.
  After Phase 2.0g, Tab 26's `#### KosPos improvements` slug is
  `kospos-improvements-10` and Tab 27's is `kospos-improvements-11`.
  Each Phase 2.0h tab walkthrough adds +1 to those indices.
- **Memory-file citation convention** — use the file:// URL pattern
  per SESSION_HANDOFF (S19 + S20): `[memory `name.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/name.md)`.
  Avoid the `(#tab-24--staffing-plan)` anti-pattern (semantically misleading
  even when it "works" inside labor-report.md).
- **Make the reasonable call, document it, keep going** when
  Alex-level prose details aren't blocking. Flag in the relevant
  tab's Open Questions list.
- **`gh pr merge --squash` fails from a worktree** when local main is
  checked out elsewhere. Use `gh api -X PUT repos/alkprojects/kospos/pulls/N/merge
  -f merge_method=squash` instead — pure server-side merge, no local
  branch switch.
- **Audit cadence** (per Session 19 audit § C): next audit fires at
  Phase 2.0i close. Don't audit again before then unless a rule is
  visibly drifting.
- **Per-tab anchor-verifier script** — reproduced in S20 from PR #45.
  Save inline in the SESSION_LOG entry or rebuild from the github-slugger
  algorithm: lowercase + strip non-(word|space|hyphen|underscore) +
  spaces → hyphens + 0-indexed occurrence-count suffix on dupes. Verifier
  checked both intra-file `[text](#anchor)` and cross-doc
  `[text](../file.md#anchor)` patterns.
