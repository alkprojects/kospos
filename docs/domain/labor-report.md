# Labor Report — tab-by-tab reference

The authoritative deep-dive on Alex's `Labor Report 5.21.26.xlsx` (and its successor
weekly snapshots). This file is the **blueprint for Phase 2 (Current-Year Workspace)**:
every tab here has a corresponding workspace concept in KosPos. The KosPos rebuild is
**not a 1:1 visual recreation** — Alex's explicit direction: combine and improve where
that produces a better workflow. A KosPos page may correspond to several Excel tabs,
or one tab may split into multiple KosPos surfaces.

**Status: walkthrough in progress.** Tabs marked _walkthrough — done YYYY-MM-DD_ are
fully captured; others carry an initial Purpose stub from Alex's high-level description
and the rest of the template marked _walkthrough — pending_.

## How to use this file

Each tab section follows the same template:

- **Status** — `walkthrough — pending` / `walkthrough — in progress` / `walkthrough — done YYYY-MM-DD`.
- **Purpose** — what the tab is for; who reads it.
- **Data sources** — where the inputs come from. Includes v1 upload format and the
  path-to-Snowflake for v2.
- **Formulas** — every non-obvious formula decoded, with cell coordinates back to the
  workbook so a future session can re-verify.
- **What's manual / fragile** — places where the tab silently depends on a human having
  remembered something (hardcoded constants, copy-pasted values, DBI-specific shortcuts).
- **KosPos improvements** — what we'd do differently in the rebuild.
- **KosPos UI sketch** — rough notes on how this becomes a surface in the app.
- **Excel export notes** — what the corresponding sheet/column in the KosPos-emitted
  `.xlsx` should look like.
- **Open questions / TODO** — anything left to confirm with Alex or research.

## Cross-cutting concerns

### Calendar-tab constants

`Calendar!I2` (PPs elapsed) / `J2` (total PPs in FY) / `K2` (remaining) are referenced by
nearly every per-tab formula. KosPos derives these from the pay calendar once, then
exposes them as reactive constants — never copy-pasted. See [`definitions.md`](definitions.md)
§ "Pay Period (PP)" and the Calendar tab section below.

### Fund-level filters

The workbook commonly filters to fund **10190** (DBI's operating fund) — a DBI shortcut.
KosPos defaults to "all funds" and offers a per-tab fund filter so other departments
that post to special revenue / capital / grant funds aren't silently under-counted.

### Dept-group rollup

Most tabs roll up to `Department Group Code = "DBI"`. KosPos treats this as the
dept-group dimension; multi-dept extension is a Phase 3 concern.

### Live data, never stale pivots

**Pain point from the Excel workflow:** when a pivot table updates (row count grows or
shrinks), the formulas referencing it next-cell-over **don't move with it**. Excel has
features to fix this (tables, structured references, Power Query) but they take time to
learn and retrofit. **In KosPos this category of bug doesn't exist** — every derived
view is a live query against the underlying dataset, not a pivot snapshot with a
formula range hardcoded next to it. Surface this benefit explicitly in the rebuild's
onboarding: "stop pasting refreshes into adjacent formulas."

### Access control (v1 + future)

Eventual target: **Microsoft Active Directory / Entra ID SSO** (`@sfgov.org` accounts),
aligned with the broader citywide-tenancy goal in [ADR-001](../DECISIONS.md). For v1,
a lightweight password gate is acceptable. Suggested approaches in order of preference:

1. **Static-site-friendly password protection** at the deploy layer — GitHub Pages
   itself doesn't support auth, but we can move v1 hosting to Cloudflare Pages (free,
   supports Access policies including a one-time PIN to allow-listed email addresses)
   or Netlify (similar). Lowest-friction path that doesn't require touching the React
   code.
2. **In-app password hash check** with a single shared password configured at build
   time. Trivial to implement, but the bundle is still publicly downloadable, so the
   gate is security-by-obscurity for the data inside the app, not real auth.
3. **No gate, obscure URL** — defer auth, treat as internal-only by convention. Worst.

For real auth without standing up our own backend, recommended path: **Cloudflare
Access with Entra ID SAML/OIDC** once SF IT signs off on a tenant. Until then,
Cloudflare Access with email PIN to a hand-maintained allow-list is the safest
intermediate. Track in [DECISIONS.md](../DECISIONS.md) when the call is made.

### Bargaining unit (BU) — used throughout this file

A **bargaining unit (BU)** is a group of city employees who share one union contract
(MOU). Each MOU sets that BU's wage table and COLA schedule. Examples: SEIU 1021
Miscellaneous (the largest "Misc" unit), IFPTE Local 21 (professional / technical),
MEA (some managers), POA (police), Local 798 (fire), and ~30 others citywide. Each
job class maps to exactly one BU at a time.

**Why this matters for the labor report rebuild:** different BUs have different COLA
effective dates and percentages. DBI's entire job-class population happens to sit
under a single Misc schedule, which is why Calendar can use one COLA column. A
department mixing BUs (clerical + licensed engineers, say) needs per-BU COLA
treatment. We use the abbreviation **BU** throughout the rest of this file.

A separate `domain/bargaining-units.md` (and/or `data-sources/dhr.md` extension) is a
**TODO for Phase 2.2** — see the Open Questions list.

### Controller-side data masking (sick-leave bucket)

The OBI BI Payroll export the workbook ingests has **sick-leave TRCs hidden by
the Controller** and replaced with a single opaque earnings code `XXX` /
description `***Unspecified***`. At this snapshot the masked bucket carries
$3.51M (4.2% of FYTD payroll). This is a deliberate Controller-side privacy
posture: sick-leave usage by employee is sensitive (HIPAA-adjacent + PII risk
when joined to Person Number).

Alex has access to a permission level that unmasks the detail but doesn't need
it for labor-report work, so he runs the masked report. **KosPos must preserve
this posture by default** — the importer keeps `XXX` as a single opaque bucket
and surfaces a Data Issues note ("$X of YTD payroll is in the Controller's
masked sick-leave bucket. This is expected.") rather than a warning. Unmasked
detail is an admin-role-only feature gated behind a separately permissioned
upload.

See Tab 7 (BI Payroll) § Manual / fragile and § KosPos improvements #4 for
details.

### Multi-dept generalization caveats (DBI shortcuts to undo)

Catalog of DBI-only assumptions that need to be parameterized for citywide use:

| Shortcut | Lives in | Generalization |
|---|---|---|
| Single COLA % applied to all DBI job classes | Calendar tab (hardcoded) | Per-MOU COLA schedule lookup, joined by job class → bargaining unit |
| Fund 10190 filter | Many tabs | "All funds" default + per-tab fund filter |
| TEMPM = COMMN:5380 only | Operating Report `E40` | Definition-aware temp filter (see [`definitions.md`](definitions.md)) |
| 7.65% OT fringe hardcoded | Budget Master (cross-ref OVERM) | OASDI+Medicare derived constant with year-stamped wage cap |
| `15.4 / 26.1` PP constants in OVERM `AW` | Budget Master | Pull live from Calendar `I2 / J2` |
| `BFM 15.10.006 FY26` row addresses | Multi-tab BFM lookups | Lookup by `(dept, account, fund, authority)` not by row index |
| Single "DBI" dept-group rollup | All tabs | Dept-group dimension, default selectable |
| Account Description literals scattered across Step / Report Data / OPS formulas (`"Overtime - Scheduled Misc"` etc.) | Step, Report Data, Operating Report Summary | Central chart-of-accounts map (versioned by effective date); importer warns on Controller-side renames before they break aggregations |
| BI Payroll fund 10190 filter on Step's per-PP SUMIFS | Step | Multi-fund per-position aggregation; per-call fund filter optional |
| `'COMMN:5380'` job-code prefix as implicit citywide knowledge | BI Payroll consumers (Step, Report Data, TEMPM, Inactive) | Strip prefix at import; store `{job_code, job_code_set}` separately |
| Single masked sick-leave bucket (`XXX`) accepted as opaque | BI Payroll (and downstream rollups that absorb it) | Preserve masking; admin-only unmask via separately permissioned upload |

## Tab list — workbook order (`Labor Report 5.21.26.xlsx`)

The full enumeration. `≡` marks tabs collapsed into the same KosPos surface in the
rebuild. Tabs marked `IGNORE` are excluded from Phase 2 per Alex (cross-org planning
artifacts — not part of the current-year labor workflow).

| # | Tab | Walkthrough status | KosPos surface |
|---|---|---|---|
| 1 | Data | pending | Internal staging (reference index) |
| 2 | Departments | pending | Reference data (citywide dept tree) |
| 3 | Combo | pending | Reference data (combo codes) |
| 4 | BFM 15.10.006 FY26 | pending | Importer staging (BFM position eturn) |
| 5 | Calendar | **in progress (this session)** | Internal reactive constants |
| 6 | P&P Data | pending | Importer staging (PS HCM P&P) |
| 7 | BI Payroll | **done 2026-05-25** | Importer staging (OBI BI Payroll) + per-position drill-down |
| 8 | Roster Approvers | pending | Roster management feature |
| 9 | EE Additional Pay | pending | Acting-pay / supervisory-pay audit |
| 10 | Probation | pending | Probation tracker (user-input feature) |
| 11 | Eligibility Lists | pending | DHR scrape + eligibility lookup |
| 12 | TEMP Limits | pending | Temp-employee expiration tracker |
| 13 | Inactive | pending | Cross-system reconciliation (inactive positions) |
| 14 | Separations | pending | Pending-separations tracker (user-input) |
| 15 | Succession | pending | Succession planning (draft feature) |
| 16 | Premium | pending | Premium-pay YTD + projection view |
| 17 | Overtime | pending | Overtime YTD + projection view |
| 18 | Step | pending | Step-savings YTD + projection view |
| 19 | Retirement Payout | pending | RPO YTD + projection view |
| 20 | Report Data | pending | **Core dataset** — labor positions × budget × actuals × projection |
| 21 | Reporting Tree | pending | Org-chart preview + data-quality flags (lite Phase 7) |
| 22 | Pos by Dept | pending | Filtered view of Report Data (low priority) |
| 23 | Vacancies and TEMP | pending | Vacancies + TEMP filter, feeds Staffing Plan |
| 24 | Staffing Plan | pending | **Staffing Plan workspace** — hiring plan |
| 25 | Budget Summary | pending | BY+1 cost rollup (low priority) |
| 26 | Operating Report Summary | pending | **Headline projection page** |
| 27 | Operating Report Detail | pending | Drill-down for projection variance review |
| – | New Department Org | **IGNORE** | Cross-org merger planning (out of scope) |
| – | New Department Org - Long Term | **IGNORE** | Cross-org merger planning (out of scope) |

## Per-tab detail

---

### Tab 1 — Data

**Status:** walkthrough — pending

**Purpose:** Reference index listing some of the upstream data sources used by the
workbook. Not a working tab — for human navigation.

**Data sources / Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel
export / Open questions:** _(walkthrough)_

---

### Tab 2 — Departments

**Status:** walkthrough — pending

**Purpose:** List of all departments in DBI and CPC. KosPos's target scope is the
**entire citywide department tree**, not just DBI/CPC — see
`Department Classification Structure (16).csv` (PS HCM export) in
`C:\Users\ALK\Desktop\Claude Projects\Position Management\example reports\Reports\`.

**Data sources:** PS HCM (`Department Classification Structure` export). v1 = manual
upload of the CSV; v2 = scheduled pull when city systems expose it. Not currently in
the per-source docs — **TODO: add `docs/data-sources/` note about the department-tree
export** (likely belongs under [`ps-hcm.md`](../data-sources/ps-hcm.md)).

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 3 — Combo

**Status:** walkthrough — pending

**Purpose:** List of combo codes (chartfield string aliases) for DBI and CPC.

**Data sources:** PS HCM query — `MRG_COMBO_CD_DEPT (5).csv` in
`C:\Users\ALK\Desktop\Claude Projects\Position Management\example reports\Reports\`.
v1 = manual upload; v2 = scheduled pull.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — Alex to explain combo codes and their use)_

---

### Tab 4 — BFM 15.10.006 FY26

**Status:** walkthrough — pending

**Purpose:** Approved position eturn from the prior cycle, when FY26 was BY. Used as
historical/anchor lookups by formulas elsewhere in the workbook.

**Data sources:** BFM 15.10.006 position eturn. See
[`../data-sources/bfm.md`](../data-sources/bfm.md) and ADR-004.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 5 — Calendar

**Status:** walkthrough — done 2026-05-24

**Purpose:** The pay-calendar lookup tab. Provides three things:

1. **Per-PP rows** (rows 2–28, one per PP from 1 through 27) with the canonical PPE
   date for the FY.
2. **Two parallel running totals** — a pure-PP elapsed count (col D) and a
   COLA-weighted elapsed count (col F).
3. **Single-row summary block** (cols H–O, row 2) that derives "today's PP" from the
   BI Payroll data, then computes elapsed / total / remaining in both tracks.

Almost every downstream tab references this tab's summary cells. The columns split
along usage lines (verified by counting `Calendar!` refs across all formulas in the
workbook):

| Track | Cells | Used by (column refs) | Purpose |
|---|---|---|---|
| Pure-PP | `I2 / J2 / K2` | Operating Report Summary (28), Overtime (22), Premium (4), Retirement Payout (4), Staffing Plan (4), Budget Summary (1) | Straight-line time-pacing of budget and special-class projections |
| COLA-weighted | `M2 / N2 / O2` | Report Data (~1,400), Step (16,335), Budget Summary (1) | Per-position salary projection and step-savings projection — needs to honor the mid-year COLA |
| Date lookup | col `B` | Step (49,032 — per-PP iteration), Report Data (27) | `XLOOKUP(some_date, Calendar!B, Calendar!C)` returns the PP% for an arbitrary date |
| Per-PP COLA delta | col `E` | Step (16,335) | Step formulas walk each PP and apply the COLA in effect at that PP |

Background pay-period anchors (80-hour PP, 26/26.1/26.2 PPs per FY, PP1 starts 7/1,
PP27 ends 6/30) live in [`definitions.md`](definitions.md) § "Pay Period (PP)" — not
repeated here.

**Data sources:**

- **Source:** Controller's Office Payroll Division annual pay calendar (PPE dates).
  See [`../data-sources/controller.md`](../data-sources/controller.md).
- **Plus:** the Misc-unit MOU COLA schedule (SEIU 1021 Misc 2024–2027), for the in-year
  COLA effective dates and percentages. See [`budget-process.md`](budget-process.md)
  § "SF historical COLAs."
- **v1 mechanism:** Alex re-develops the tab manually each FY — ~30 minutes of work
  pulling PPE dates from the Controller's calendar and dropping in the MOU's mid-year
  COLA % at the correct PP row.
- **v2 plan:** KosPos generates Calendar from (a) the Controller's published pay
  calendar (a JSON or scraped PDF) and (b) the per-bargaining-unit COLA schedule from
  DHR MOUs. Citywide artifact; no per-department version.

**Structure — per-PP rows (A2:F28):**

| Col | Header | Content | Notes |
|---|---|---|---|
| A | PP | PP number (1–27) | Integer |
| B | PPE | Pay Period End date | Literal date (FY26: B2=2025-07-04 … B28=2026-06-30) |
| C | PP% | This PP's contribution to the FY | 1.0 for full PPs; PP1=0.4 (formula); PP27=0.7 (formula) |
| D | Total | Cumulative PP elapsed at end of this PP | `=D{n-1}+C{n}`; `MAX(D:D) = J2` = 26.1 for FY26 |
| E | COLA | The COLA % effective during this PP | Blank for PP1:PP14; **`0.015` for PP15:PP27** (the SEIU 1021 Misc Jan 3, 2026 +1.5%) |
| F | Total COLA | Cumulative C+E | `=F{n-1}+(C{n}+E{n})`; `MAX(F:F) = N2` = 26.295 ≈ "26.3" |

**Structure — summary block (H1:O2):**

| Cell | Formula | Meaning |
|---|---|---|
| H2 | `=MAX('BI Payroll'!X:X)` | "Today's PPE" — latest pay period end date in the BI Payroll export. Drives all elapsed computations |
| I2 | `=XLOOKUP(H2, B:B, D:D)` | PP elapsed, pure (22.4 at this snapshot) |
| J2 | `=MAX(D:D)` | Total PPs in FY, pure (26.1) |
| K2 | `=J2 - I2` | PPs remaining, pure (3.7) |
| L2 | `=B16` | Date the mid-year COLA first takes full effect (= end of PP15 = 2026-01-16) |
| M2 | `=XLOOKUP(H2, B:B, F:F)` | PP elapsed, COLA-weighted (22.535) |
| N2 | `=MAX(F:F)` | Total PPs in FY, COLA-weighted (26.295) |
| O2 | `=N2 - M2` | PPs remaining, COLA-weighted (3.76) |

**Formulas — derived:**

- `C2 = NETWORKDAYS(DATE(YEAR(B2),7,1), B2) / 10` — PP1 partial. Counts weekdays from
  7/1 to PPE, divides by 10. FY26: 7/1=Tue through 7/4=Fri → 4 weekdays → 0.4.
- `C28 = NETWORKDAYS(B27+1, DATE(YEAR(B28),6,30)) / 10` — PP27 spillover. Weekdays
  from the day after PP26 ends to 6/30. FY26: 6/20 through 6/30 → 7 weekdays → 0.7.
- `D{n} = D{n-1} + C{n}` — cumulative pure PPs.
- `F{n} = F{n-1} + (C{n} + E{n})` — cumulative COLA-adjusted PPs. The COLA delta
  (`E{n}`, e.g., 0.015) is **added** as if it were a PP fraction, not multiplied. Math
  works out: each post-COLA PP contributes 1.015 instead of 1.0 to the running total.

**The "26.3 trick" — what's actually happening:**

`J2 = 26.1` (the real FY26 PP count). `N2 = 26.295` (≈ 26.3) is **not** the real PP
count; it's a synthetic "COLA-equivalent" PP count. Downstream projections that use
`actual * N2 / M2` instead of `actual * J2 / I2` inflate the projection slightly to
account for the fact that the post-COLA remaining PPs cost ~1.5% more per PP than the
COLA-mix of YTD PPs.

Worked numbers at this snapshot (`H2 = 2026-05-08`):

| Ratio | Value | Multiplier |
|---|---|---|
| Pure: `J2 / I2` | 26.1 / 22.4 | 1.1652 |
| COLA-weighted: `N2 / M2` | 26.295 / 22.535 | 1.1668 |
| Delta | | 0.14% |

The delta is small at this point in the year (most of the COLA bump is already in YTD).
Earlier in the year, the spread would be larger.

**What's manual / fragile:**

- **Whole tab is rebuilt every FY.** PPE dates change; PP1/PP27 partial fractions
  change; the COLA effective PP changes; the COLA % changes.
- **Single COLA % column E is a DBI shortcut.** Column E carries one rate (0.015 for
  FY26). This works only because every DBI job class happens to sit under the SEIU
  1021 Misc MOU with the same Jan 3, 2026 +1.5% bump. Departments mixing bargaining
  units (Misc + IFPTE 21 + 798/Fire + POA) cannot share a single column — each BU has
  its own COLA effective dates and percentages.
- **Only the largest mid-year COLA is modeled.** Per the FY26 MOU schedule
  (`budget-process.md` table), FY26 actually has three rate changes:
  - Jul 1, 2025 (+1.0%) — baked into starting salary rates by PP1; not in Calendar.
  - Jan 3, 2026 (+1.5%) — **modeled** as E16:E28 = 0.015.
  - Jun 30, 2026 (+2.0%) — one day before FY27 starts; ignored as immaterial.
  
  Future FYs with two material mid-year bumps will need two non-zero ranges in E.
- **`N2 / M2` is treated as a single workbook-wide ratio.** Anywhere it's used, the
  assumption is "this ratio applies to all dollars." Bargaining-unit-specific
  application isn't expressed.
- **`H2 = MAX('BI Payroll'!X:X)` couples the "as-of date" to the payroll import.**
  If BI Payroll is imported through a different PPE than the rest of the data (Report
  Data may be from an earlier P&P snapshot), the elapsed-PP math will be off. Currently
  managed by Alex importing all sources at the same as-of date.

**KosPos improvements:**

#### 1. Separate pay-calendar arithmetic from COLA application

**Problem in the workbook.** Calendar column F (`Total COLA`) is derived in the same
tab as the pay-period dates and percentages. Column F = column D + column E, where E
is a single MOU's schedule. The tab fuses two unrelated facts:

- **Pay calendar** = a citywide, controller-published artifact. Every department uses
  the same dates. Changes once per FY.
- **COLA schedule** = a per-bargaining-unit policy. Different MOUs land at different
  times with different rates. Updates whenever an MOU is ratified or amended.

Fusing them works for DBI because DBI is single-BU; it does not scale to a citywide
app, where adding a second BU means adding a second column to the shared calendar,
adding a third BU means a third column, and so on.

**KosPos design.** Two independent modules:

- **`lib/calendar/`** — pure pay-period arithmetic. Citywide; not dept- or BU-aware.
  - Inputs: one JSON per FY (PP number → PPE date, partial-PP fraction).
  - Functions:
    - `dateToPP(date, fy) → { pp, fraction, ppe }`
    - `ppToDates(pp, fy) → { start, end }`
    - `ppsElapsed(asOfDate, fy) → number`
    - `ppsInFY(fy) → number` (26.0 / 26.1 / 26.2)
    - `ppsRemaining(asOfDate, fy) → number`
  - Generated annually from the Controller's published calendar; checked into source
    control so historical years remain queryable.
- **`lib/cola/`** (or as part of `lib/dhr/`) — per-bargaining-unit COLA schedule.
  - Lookup: `bargainingUnit → [{ effectiveDate, percent, mouCitation }]`.
  - Sourced from the DHR MOU PDFs (each MOU's Wages article is the authority).
  - Versioned by effective date so historical projections re-derive correctly.

**Why the split matters.** When the FY27-30 MOU is ratified in mid-2027 with a
surprise mid-FY27 COLA, KosPos updates **only** `lib/cola/` — pay-calendar code
doesn't move. Conversely, when the Controller shifts a holiday and bumps a PPE date by
one day, only `lib/calendar/` moves. The blast radius of each change is small and
isolated.

#### 2. Annualization function takes both

**Problem in the workbook.** The user has to pick the correct ratio per tab:
`J2/I2` (pure) for OVERM/PREMM/RTPOM, `N2/M2` (COLA-weighted) for Step and Report
Data. The choice is implicit and not documented anywhere obvious — a new analyst won't
know why Overtime uses one and Step uses the other.

**KosPos design.** All projections are **COLA-aware by default** — that's the
correct math. Straight-line is provided only as an **optional simplified view** for
quick reads and parity-checks against the existing workbook; it is never the
authoritative number a KosPos report emits.

A single `project()` function:

```ts
project({
  actualsYTD: number,
  asOfDate: Date,
  fy: number,
  bargainingUnit: string,
  method: 'cola-aware' | 'straight-line',  // default: 'cola-aware'
}) → { projectedAnnual: number, breakdown: ... }
```

`cola-aware` walks the remaining PPs and applies the rate in effect at each.
For a single-MOU population (DBI today), this collapses to a single multiplier —
output matches the workbook's `N2/M2` math exactly. For a mixed-BU population (e.g.,
a future dept with SEIU 1021 + IFPTE 21 staff), the function produces the correct
per-BU projection rather than a flat one-size-fits-all multiplier.

**Per-labor-type projection methods are a separate discussion per labor type, not
shared defaults.** Each labor type (regular labor, overtime, premium, retirement
payout, step, temp, etc.) has its own projection nuances — straight-line annualize,
seasonality-aware, hire-plan-aware, lump-sum, residual. Those choices are decided
when that labor type's tab is walked, not here. **Universal invariant:** whatever
method a tab uses, KosPos always feeds the per-BU COLA schedule through it so the
final number reflects scheduled raises through the projection horizon. Alex's
workbook sometimes uses `J2/I2` (pure straight-line) for OT / Premium / Retirement
Payout — that's a workbook shortcut for simplicity. KosPos does not inherit that
shortcut as its default; the correct answer is always COLA-aware.

**Worked example.** OT YTD $438k at PP 22.4 / 26.1, BU = SEIU 1021 Misc:
- `cola-aware` (KosPos default): $438k × 26.295 / 22.535 = **$511k** ← the answer KosPos emits
- `straight-line` (optional shortcut view): $438k × 26.1 / 22.4 = **$510k**
- Workbook today emits $510k for OT; KosPos emits $511k. Both are surfaced in
  parity-check views during the rebuild.

#### 3. Show the correct projection prominently; surface straight-line as a check

**Problem in the workbook.** Only one number lands in the cell, and the math behind
it isn't obvious — for some tabs the cell is straight-line, for others COLA-aware.
The user can't see how much of the projection comes from "real activity continuing
forward" vs. "scheduled raises hitting the back half of the year." For exec-facing
reports this matters: when the projection rises run-to-run, leadership wants to know
whether it's because of overspend or because of a known scheduled raise.

**KosPos design.** The COLA-aware number is the headline (it's the correct math).
The straight-line number is rendered next to it as a labeled "simplified view" —
useful for quick sanity checks and for matching the workbook during parity testing,
but never the number that goes in a KosPos report.

```
Overtime projection
  $511,000  (year-end, COLA-aware) ← headline
  Simplified (no COLA): $510,000   ← side-note, lower visual weight
  Variance vs G37 budget: -$131,000
```

When the spread is below a threshold (e.g., 0.1% — late in the year) the simplified
view collapses into a tooltip on the headline number. Always queryable, never
overshadowing the correct figure.

**Secondary benefit — data-quality flag.** If a class has no bargaining unit
assigned, the COLA-aware projection has no raises to apply for that class and
becomes numerically identical to the straight-line view. In a department where the
dominant spread should be ~1.5%, a class with zero spread is a missing-BU flag. The
Data Issues panel (per ADR-003) picks this up automatically.

**Tertiary benefit — cross-dept comparison.** Two departments with similar
profiles should have similar spreads. If they don't, that's diagnostic: one has BU
mappings the other lacks, or one is heavy in a class on a different MOU.

#### 4. Treat the late-fiscal-year COLA bump as a policy rule, not an oversight

**Problem in the workbook.** Column E intentionally omits the Jun 30, 2026 +2.0%
bump because it lands on the FY's last weekday (one day of impact ≈ zero dollars).
This works, but it's an undocumented call — a future analyst reading the workbook
won't know whether the omission is "wrong" or "deliberate."

**KosPos design.** A documented inclusion rule in `lib/cola/`:

> A COLA effective date is included in the FY's projection if it lands on or before
> a PPE whose `ppToFraction(pp) = 1.0` (i.e., a full PP). Effective dates within the
> spillover days of PP27 are recorded but produce zero in-year impact (the formula
> still applies them; the math just multiplies by ~0.7 / 26.1 of a tiny rate change).

This generalizes the workbook's special-case to a rule. Edge cases the rule handles
correctly without extra logic:

- **A Jul 1 bump for the upcoming FY** — outside the current FY, doesn't apply at all.
- **A late-FY bump in a year with a longer PP27** — automatically downweighted by the
  fraction.
- **A retroactive MOU bump** — applied to the PPs it covers, regardless of when it
  was ratified.

**Rule-vs-cosmetic distinction.** Don't *exclude* late-FY bumps from the data; let
the math downweight them naturally. Excluding by threshold is a cosmetic shortcut
that breaks the moment someone adjusts the threshold. The math is correct as long as
the per-PP COLA delta `E{n}` is the rate-change contribution **for that PP only**.

#### 5. Decouple "as-of date" from the BI Payroll import

**Problem in the workbook.** `H2 = MAX('BI Payroll'!X:X)` ties the "today" cell to
one specific source. If a user wants to ask "what would the projection look like if
we'd run this report at PP 15?" — or if Report Data is pulled from an earlier P&P
snapshot than BI Payroll — the answer is "rebuild the workbook with a hacked H2
cell." Painful.

**KosPos design.** A first-class `asOfDate` state value on every projection page:

- Default = `MAX(PPE)` across all imported sources (matches workbook behavior).
- Visible as a control at the top of every projection page: `Projecting as of PP22
  (5/8/2026) ▼`.
- Override via dropdown / date picker. Common presets: latest, 6-month report, 9-month
  report, end of last quarter, end of PP15, FY end.
- Validation: cannot exceed the latest PPE present in any source the projection
  depends on. Surfaces a warning if the as-of date pre-dates a source's earliest data.

**Use cases this unlocks:**

- **Retrospective verification.** "What did the 6-month projection say at the time?"
  Pick `asOfDate = 12/12/2025`. Compare to the saved 6-month report.
- **Cross-source consistency.** If P&P is from 5/1 and BI Payroll is from 5/8,
  setting `asOfDate = 5/1` projects from the earlier date for both — avoids
  apples-to-oranges. Conversely, leaving as `5/8` and getting a warning highlights
  that P&P needs a fresher pull.
- **What-if planning.** "If we don't hire anyone else this year, what does year-end
  look like as of today?" Doesn't require a calendar change; only the hiring-plan
  inputs.
- **Parity testing.** When verifying KosPos's math against a snapshot of the
  workbook, set `asOfDate` to match the workbook's `H2` exactly — projections become
  directly comparable.

#### 6. PP27 + percentage progress in user-facing displays

**Problem in the workbook.** `J2 = 26.1` is correct for math but opaque for an exec
audience. "We're at PP 22.4 of 26.1" requires explaining the fractional PP. Reports
sent to CON/MYR/the Board need a different framing.

**KosPos design.** Three parallel forms, picked per audience:

| Form | Used in | Example |
|---|---|---|
| **Fractional PP** | Internal math, formulas, tooltips | `22.4 / 26.1` |
| **Whole PP + spillover** | Operations dashboards | "PP 22 of 26 (plus 7-day spillover to FY27)" |
| **Percent of FY elapsed** | Exec-facing reports, 6-/9-month report titles | "86% through FY26" |

Each displays the same underlying state in a different presentation. No duplicated
calculation — all derive from `ppsElapsed / ppsInFY`. A "format" prop on display
components picks the right rendering.

**Why the third form matters.** When a Board member sees "projected year-end actuals
$580k vs budget $380k," the immediately useful follow-up is "at 86% through the
year, are we overspent by 53% or pacing 53%?" The workbook hides this; KosPos surfaces
it.

#### 7. Version the calendar by FY and persist historical calendars

**New (not in the current workbook).** The workbook only carries the current FY's
calendar; prior FYs' calendars live in prior workbook files. KosPos persists every
imported FY's calendar JSON in `lib/calendar/data/`. When the user opens a Past Year
workspace (Phase 5), the right calendar loads automatically. Re-deriving an FY18
projection won't accidentally use FY26's PPE dates or COLA schedule.

#### 8. Validate the calendar against the published source

**New.** When the user uploads a new FY's calendar JSON (or KosPos generates one
from the Controller's PDF), run a sanity-check pass:

- Exactly 26 or 27 rows.
- PP1 starts on the first weekday on/after 7/1.
- PP27 (if present) ends on the last weekday on/before 6/30.
- Sum of `PP%` = 26.0 / 26.1 / 26.2 (matches the published FY total).
- Per-BU COLA effective dates fall on or between FY start and FY end.

Failures surface in the Data Issues panel rather than producing silently-wrong math.
The workbook has no equivalent check — a typo in column B silently breaks every
downstream projection.

**KosPos UI sketch:**

Internal-only — not a user-facing tab. Surfaces as:

- A **reference-data admin panel** (Settings → Reference Data → Pay Calendar) showing
  the current FY's per-PP table with date, PP%, and (per BU) COLA rate. Editable by
  admin role for the rare late-announced Controller schedule shift.
- A **live "as of" indicator** at the top of every projection page: `Projecting as of
  PP22 of 26 (PPE 2026-05-08)`. Hover: `22.4 PPs elapsed, 3.7 remaining` (pure) and
  `22.5 / 3.8` (COLA-weighted).
- A **PP-arithmetic tooltip** on any projection cell: hover shows
  `YTD × (26.1 / 22.4) = $X (pure)` and `× (26.295 / 22.535) = $Y (COLA-aware)`.

**Excel export notes:**

Include a `Calendar` sheet for downstream compatibility, but built KosPos-style:

- One row per PP with all per-PP fields (A:E or A:F equivalent).
- A header block of **named-range constants** (`PP_Elapsed`, `PPs_In_FY`,
  `PPs_Remaining`, `As_Of_Date`) — replaces the I2/J2/K2 + M2/N2/O2 magic cells with
  documented names.
- **Per-BU COLA columns** added next to the single-COLA column when the dept has
  multiple bargaining units.
- A **"Reference notes"** block in the sheet citing the Controller's pay calendar
  source and the per-BU MOU citations for the COLA schedule.

**Open questions / TODO:**

- [ ] Confirm with Alex: Jun 30, 2026 +2.0% is intentionally ignored (~one weekday
      impact).
- [ ] Confirm `'BI Payroll'!X` is the canonical PPE column in the OBI BI Payroll
      export (will resolve during BI Payroll walkthrough; if it's a different column,
      `H2` formula needs adjusting per FY).
- [ ] Decide where the `job class → bargaining unit` lookup lives — `domain/dhr.md`
      or a separate `domain/bargaining-units.md`?
- [ ] Settle the per-projection-page UI for the pure-vs-COLA-aware delta: always show
      both, or show only when the delta exceeds a threshold (e.g., >0.5%)?

---

### Tab 6 — P&P Data

**Status:** walkthrough — pending

**Purpose:** Labor report run from OBI, listing position + person details. Columns
**A–CJ** are the OBI report itself; columns past CJ are derived formulas. Some field
duplication may exist within the OBI export.

**Data sources:** OBI (Oracle Business Intelligence) — labor report query. See
[`../data-sources/obi.md`](../data-sources/obi.md) and ADR-006.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — Alex to confirm columns + formulas)_

---

### Tab 7 — BI Payroll

**Status:** walkthrough — done 2026-05-25

**Purpose:** The **transactional payroll feed** for the workbook. One row per
`(person × pay-period × earnings-code × chartfield-string)`. At the snapshot
(`Labor Report 5.21.26.xlsx`) the tab carries 110,027 rows for FY26 YTD
(2025-07-04 through 2026-05-08) totaling $84,252,500.67. It is the single source
of truth for every actuals figure in:

- the **Calendar** tab's "as-of date" (`Calendar!H2 = MAX('BI Payroll'!X:X)`),
- the **Premium**, **Overtime**, **Retirement Payout** tabs (each is a
  pivot-cache view of BI Payroll filtered by Account Description),
- the **Step** tab's `YTD Operating STEP Actual` column (per-position per-PP
  SUMIFS that subtracts OT / RPO / Premium / Temp lump-sum from the position's
  total regular labor),
- the **Report Data** tab's per-PP per-position regular labor columns (same
  shape as Step but multi-fund),
- the **TEMP Limits** tab's "hours remaining" formula
  (`1040 − hours-worked-by-this-temp-at-this-position`),
- the **Inactive** tab's "what did this position actually get paid?" total
  (column E `Sum of Balance Amount`, computed from the cache),
- the **Budget Summary** tab's BY+1 projection anchor
  (`MAX('BI Payroll'!X:X)` again, as the projection "as-of" PP).

Six of the workbook's pivot caches live on the BI Payroll tab — three of them
(`pivotCacheDefinition6.xml`) are reused across the Premium / Overtime /
Retirement Payout tabs. Translation: **rename a column on this tab and the
entire downstream chain breaks.**

**Snapshot scope.** The export currently covers two department groups:
**DBI** (67,078 rows) and **CPC** (42,949 rows). The DBI/CPC pairing is
**merger-driven**: the report was originally DBI-only; Alex has begun expanding
it to CPC in anticipation of the DBI/CPC consolidation, but that expansion is
still in progress. Long-term direction: connect the report directly to
Snowflake so this manual OBI re-pull can be retired. Until then, BI Payroll is
manually re-exported every payday (every other Tuesday) — see § Data sources.

#### Data sources

- **Source system:** OBI (Oracle Business Intelligence), `BI Payroll` report,
  scoped to `Department Group Code IN (DBI, CPC)` and `Fiscal Year = 2026` at
  this snapshot. See [`../data-sources/obi.md`](../data-sources/obi.md).
- **Refresh cadence:** Alex re-runs the **full FY-to-date** query every
  pay-day Tuesday (every two weeks). PeopleSoft posts payroll + the PS
  Financials journal entries the day before payday (sometimes earlier). A pure
  incremental-append model isn't safe because **prior-PP adjustments happen
  retroactively** (a corrected timesheet from PP10 might land in the export 4
  PPs later); a full re-pull catches those rewrites.
- **v1 KosPos mechanism:** user uploads each FY snapshot; importer treats it as
  a **full-replace** for the FY (not append). Snapshot history is preserved so
  the Operating Report Detail "what changed since last run" feature has prior
  snapshots to diff against.
- **v2 KosPos mechanism:** Snowflake direct query when SF's data platform
  exposes the source. See [`../data-sources/obi.md`](../data-sources/obi.md)
  on the Snowflake-vs-OBI uncertainty.

#### Formulas / structure — column inventory

The tab is **flat data only — no formulas in any cell of BI Payroll itself.**
Every column comes straight from OBI. 39 columns:

| Col | Header | Type | Notes |
|---|---|---|---|
| A | Fiscal Year | int | `2026` at snapshot |
| B | Department Group Code | text | `DBI` / `CPC` — drives RPO pivot's dept-group rollup |
| C | Fund Lvl 1 Code | int | Hierarchy parent (`10000` GF / `10100`-band SR / etc.) |
| D | Fund Lvl 1 Desc | text | Hierarchy parent description |
| E | Fund Control | text | `FACCT` (annual) / `FCNT` (continuing) — see [`budget-process.md`](budget-process.md) |
| F | **Fund Code** | int | **6-digit fund.** Used by Step tab's `10190` (DBI BIF operating) filter |
| G | Fund Description | text | "SR BIF Operating Project" etc. |
| H | Department Code | int | 6-digit dept ID (`229235`, `109733`, etc.) |
| I | Department Description | text | "DBI IS Building Inspection" etc. |
| J | Project Code | int | Chartfield-string component |
| K | Project Description | text | |
| L | Activity Code | int | Chartfield-string component |
| M | Activity Description | text | |
| N | Authority Lvl 1 Code | int | Hierarchy parent (`10000` Operating, etc.) |
| O | Authority Lvl 1 Description | text | |
| P | Authority Code | int | Chartfield-string component |
| Q | Authority Description | text | |
| R | Account Lvl 2 Description | text | `Expenditures` / `Liabilities` — almost all is Expenditures |
| S | Account Lvl 5 Name | text | `5010Salary` / `5130Fringe` / `200075` (a liability bucket) |
| T | Account Lvl 3 Description | text | `Salaries` / `Mandatory Fringe Benefits` / `Current Liabilities` |
| U | Account Code | int | 6-digit account (`501010` Perm Misc, `511010` OT Misc, `510210` RPO, etc.) |
| V | **Account Description** | text | **The text used by every Step / Report Data exclusion SUMIFS** ("Overtime - Scheduled Misc", "Ret Payout - SP & Vac - Misc", "Premium Pay - Misc", "Temp Misc LumpSum Payoff") |
| W | Earning Period Number | int | **All zero in this export** — unused; PP is derived from X |
| X | **Earning Period End Date** | date | **The PPE** — `MAX(X) = 2026-05-08` drives `Calendar!H2`; per-PP filters in Step / Report Data slice on this |
| Y | Person Number | int | PS Empl ID |
| Z | Person Full Name | text | "Last,First [M]" |
| AA | Roster Code | text | 5-char roster code (`DBIXE`, `CPCBB`, etc.) — links to Tab 8 Roster Approvers |
| AB | Earnings Code | text/int | 3-letter alpha (`WKP`, `OTP`, `VPO`, `SVO`, `CTP`) or 3-digit numeric (`289`, `253`, `125`). **Null for benefit lines.** |
| AC | Earnings Code Description | text | Human label. **Null for benefit lines** (~71% of rows). Most-common values reflect the underlying earnings type — see § Earnings-code dictionary below. |
| AD | **Position Identifier** | int | **PS HCM position number — the per-position key for Step + Report Data SUMIFS** |
| AE | **Job Code** | text | **Prefixed format `COMMN:5380` etc.** — the `COMMN:` prefix is a citywide common-job-set marker; the 4-digit suffix is the SF job code. This is why TEMPM's `'BI Payroll'!AE = "COMMN:5380"` filter works |
| AF | Job Description | text | "Building Inspector", "Manager VI", etc. |
| AG | Assignment Number | int | `0` for primary assignment; > 0 for acting / additional |
| AH | HR Assignment Appointment Type | text | `PCS` / `PEX` / `TEX` / `ELC` / `TPV` — see [`appointment-types.md`](appointment-types.md) |
| AI | Is FTE Hours | text | `Y` / `N` flag — used by TEMP Limits to count only FTE-counted hours |
| AJ | Earning Hours | numeric | Hours behind the dollar — used by TEMP Limits (`= 1040 − SUMIFS(AJ,…)`) and by the Overtime pivot (`Sum of Earning Hours` as a data field) |
| AK | Pay Period FTE | numeric | Computed FTE for this PP (can exceed 1.0 for OT) |
| AL | **Balance Amount** | numeric | **The dollar amount** — the data field for every aggregation downstream |
| AM | (blank) | — | Empty trailing column (artifact of the OBI export) |

**No derived columns on this tab.** All KPI rollups happen elsewhere (pivots
on Premium / Overtime / RPO; SUMIFS on Step + Report Data + TEMP Limits +
Inactive; MAX on Calendar + Budget Summary).

#### Earnings-code dictionary observed in this snapshot

Built by streaming the full export. 58 distinct earnings codes (counting null
as one). Top buckets, with their dollar share of the $84.25M total:

| Earnings code(s) | Description | $ (DBI+CPC) | Routes to |
|---|---|---|---|
| `WKP` | Regular Hours - Worked | $49.1M | Position regular labor (Step `S` column subtracts after excluding OT/RPO/PREMM/Temp LSP) |
| _(null)_ | (benefit lines have no earnings code) | $21.4M | Mandatory fringe accounts (5130xxx) — health, retire, OASDI, dental, life, LTD, etc. |
| `XXX` | `***Unspecified***` | $3.51M | **Sick leave TRCs hidden by Controller** — see § Manual / fragile |
| `VAP` | Vacation Leave Pay | $3.38M | Position regular labor (no exclusion) |
| `LHP` | Legal Holiday Pay | $2.62M | Position regular labor |
| `FHP` | Floating Holiday Pay | $1.24M | Position regular labor |
| `VPO` | Vacation Pay Out | $534k | **RTPOM** (account 510210 or 505060 for temp) |
| `OTP` | Overtime Pay 1.5 | $423k | **OVERM** (account 511010) |
| `CTP` | Comp Time Pay | $414k | **PREMM** (posts to 509010 Premium Pay - Misc per MOU) |
| `253` | Certification Prem - 6% | $265k | **PREMM** |
| `SVO` | Severance Pay Out | $149k | **RTPOM** |
| `125` | Certification Prem - 4% | $133k | **PREMM** |
| _(structural-eng)_ | Structural Eng Prem - 10.27% | $124k | **PREMM** |
| _(mgmt-leave)_ | Management Leave Pay | $117k | Position regular labor (not the cashable balance — that's RPO; this is paid time off taken) |
| `289` | Bilingual Pay - $60.00 | $54k | **PREMM** (per [`special-class.md`](special-class.md) § PREMM_E) |
| `L08` | Lead Worker Pay - $5 | $22k | **PREMM** |
| `OTF` | FLSA Overtime Pay | (small) | **OVERM** |
| ~40 other premium / leave / retro codes | various | residual | Mix |

The **routing rule** is the workbook's downstream filter: each pivot or SUMIFS
keys on `Account Description` (column V), not on earnings code directly. The
earnings-code → account mapping is determined upstream in PeopleSoft / TRC
configuration, not in this tab. Importer implication: KosPos should aggregate
on Account Description first (mirroring how the workbook slices), but keep the
earnings code in the row so per-code drill-downs and the PREMM per-class-type
breakdown (Bilingual vs Cert Prem 6% vs Lead Worker, etc.) remain possible.

#### How each downstream tab consumes BI Payroll

A complete reference so future per-tab walkthroughs (Premium, Overtime, RPO,
Step, Inactive, TEMP Limits) can lean on this section instead of re-deriving.

##### Calendar — `H2 = MAX('BI Payroll'!X:X)` → 2026-05-08

Single-cell read. Drives every elapsed-PP computation in the workbook. See
Tab 5 walkthrough for the math; the only BI Payroll dependency is that **PPE
column X is the "as-of date"** for the whole workbook. See Improvement #5
("Decouple as-of date from BI Payroll import") in the Calendar walkthrough.

##### Premium — pivot from `pivotCacheDefinition6.xml`

- **Pivot:** `Premium!A3:J116` (pivotTable9, cache 1006).
- **Page filter:** `Account Description = "Premium Pay - Misc"` (single
  account 509010).
- **Row fields:** Department Group Code → Department Description → Job Code →
  Job Description → Earnings Code → Earnings Code Description (six-level
  group-by, displayed as outline rows).
- **Column field:** Fund Code (one column per fund — 10190 DBI BIF, 10000 CPC
  GF, 10020 GF Continuing, 10840 CPC Planning Code Enforcement, ...).
- **Data field:** `Sum of Balance Amount` (column AL).
- **Downstream:** `Operating Report Summary!E36 = GETPIVOTDATA("Balance
  Amount", Premium!$A$3, "Fund Code", 10190)` pulls the DBI fund-10190 cell.
  See [`special-class.md`](special-class.md) § PREMM_E.

##### Overtime — pivot from `pivotCacheDefinition6.xml`

- **Main pivot:** `Overtime!A5:BL114` (pivotTable11). Page filter:
  `Account Description = "Overtime - Scheduled Misc"` (account 511010). Row
  fields: Fund → Department → Job Code → Job Desc → Person Full Name.
  Column field: Earning Period End Date (one column per PP). **Data field:
  `Sum of Earning Hours`** (column AJ) — *not* dollars. The visual is a
  per-person per-PP OT hours matrix.
- **GETPIVOTDATA target:** `Operating Report Summary!E37 =
  GETPIVOTDATA("Sum of Balance Amount", Overtime!$A$3, "Fund Code", 10190)`
  pulls the dollar figure from a parallel pivot — both `Sum of Earning Hours`
  and `Sum of Balance Amount` exist as data fields in the cache; the visible
  pivot displays hours, while the GETPIVOTDATA call references the dollar
  aggregation by name.
- **Smaller pivots:** `Overtime!BP5:BR19` (pivotTable13) — Sum of Balance
  Amount by Dept Grp × Department for OT account only, used as the
  per-department YTD anchor for the projection formula. Plus the BFM-sourced
  budget reference table at `BK5:BN8` (pivotTable12).
- **Projection rollup:** `Overtime!BS15` (cited by `OPS!H37`) consumes these.
  See [`special-class.md`](special-class.md) § OVERM_E.

##### Retirement Payout — pivot from `pivotCacheDefinition6.xml`

- **Pivot:** `Retirement Payout!A5:AF66` (pivotTable15). Page filter:
  `Account Description = "(Multiple Items)"` — manually checked accounts.
  In this snapshot the two visible items in the pivot XML are the indices
  pointing at the two RPO accounts (`510210` "Ret Payout - SP & Vac - Misc"
  and `505060` "Temp Misc LumpSum Payoff"). Row fields: Dept Grp → Dept →
  Job Code → Job Desc → Person → Earnings Code → Earnings Code Description.
  Column fields: Fund Code (outer) × Earning Period End Date (inner).
- **Downstream:** `Operating Report Summary!E38 = GETPIVOTDATA("Balance
  Amount", 'Retirement Payout'!$A$3, "Department Group Code", "DBI")` —
  the workbook rolls up by **Department Group Code = DBI** here (not by
  fund), so it picks up both perm RPO (510210) and temp lump-sum (505060)
  for the whole DBI group, regardless of fund. See
  [`special-class.md`](special-class.md) § RTPOM_E.
- **Earnings codes in this pivot:** `VPO` (Vacation Pay Out — $534k) and
  `SVO` (Severance Pay Out — $149k) are the only two contributors in this
  snapshot. The "Multiple Items" account filter is what *includes* the
  $71k of Temp Misc LumpSum Payoff (`505060`) alongside the perm RPO
  account. **Account-vs-earnings-code reconciliation:** account 510210 =
  $650k + 505060 = $71k = $721k; VPO+SVO sum = $683k — the $38k spread
  comes from VPO/SVO posting that doesn't carry an earnings code on a
  small number of liability adjustments (seen in Account Lvl 5 = `200075`
  "Payroll Employee Reimbursement"). Worth a deeper look during the RPO
  walkthrough but doesn't break the OPS!E38 number, which pulls from
  the pivot's account-filtered total.

##### Step — per-position per-PP SUMIFS

The Step tab's `S` column (`YTD Operating STEP Actual`) is computed as
`SUM(BY2:CY2)` where each `BY..CY` cell is one PP. Per-PP cell shape (e.g.,
`U2` is PP-of-2025-07-04):

```excel
U2 = IF(COUNTIF($D$2:$D2, $D2) > 1, 0,
       SUMIFS('BI Payroll'!$AL:$AL,
              'BI Payroll'!$AD:$AD, $D2,       -- position
              'BI Payroll'!$X:$X,  U$1,         -- this PP
              'BI Payroll'!$F:$F,  10190)       -- fund 10190 only (DBI shortcut)
       - SUMIFS('BI Payroll'!$AL:$AL, ..., 'BI Payroll'!$V:$V, "Overtime - Scheduled Misc")
       - SUMIFS('BI Payroll'!$AL:$AL, ..., 'BI Payroll'!$V:$V, "Ret Payout - SP & Vac - Misc")
       - SUMIFS('BI Payroll'!$AL:$AL, ..., 'BI Payroll'!$V:$V, "Premium Pay - Misc")
       - SUMIFS('BI Payroll'!$AL:$AL, ..., 'BI Payroll'!$V:$V, "Temp Misc LumpSum Payoff"))
```

In words: **regular-labor dollars per position per PP, in fund 10190 only,
excluding the four special-class accounts.** The `COUNTIF` guard ensures only
the first occurrence of a position number contributes (positions can appear
multiple times in the Step tab — one per appointment / split).

Four columns referenced: `AL` (amount), `AD` (position), `X` (PPE), `F`
(fund), `V` (account description for exclusions). 32,670 cells reference
BI Payroll on this tab — one per `(position × PP)`.

**Fund 10190 filter is a DBI shortcut.** CPC's regular labor lives in 10000,
10840, 10770, etc. — the Step tab as currently written would compute zero
step variance for every CPC position. KosPos's per-position projection should
sum across all funds (or accept a per-call fund filter).

##### Report Data — per-position per-PP SUMIFS, **multi-fund**

Same shape as Step but **without the fund filter**:

```excel
BB2 = IF(COUNTIF($D$2:$D2, $D2) > 1, 0,
        SUMIFS('BI Payroll'!$AL:$AL,
               'BI Payroll'!$AD:$AD, $D2,    -- position
               'BI Payroll'!$X:$X,  Y$1)      -- this PP (no fund filter)
        - SUMIFS('BI Payroll'!$AL:$AL, ..., 'BI Payroll'!$V:$V, "Overtime - Scheduled Misc")
        - SUMIFS('BI Payroll'!$AL:$AL, ..., 'BI Payroll'!$V:$V, "Ret Payout - SP & Vac - Misc")
        - SUMIFS('BI Payroll'!$AL:$AL, ..., 'BI Payroll'!$V:$V, "Temp Misc LumpSum Payoff"))
        - Y2  -- subtracts a manual-adjustments column
```

Three columns excluded instead of four (no Premium exclusion — Report Data
includes premium in the per-position regular labor figure, presumably because
PREMM_E rolls up separately at the special-class level). 18,225 cells
reference BI Payroll on this tab. **Multi-fund-aware** because it's the
position-level dataset that everything else trues up to.

##### TEMP Limits — hours-remaining gauge

```excel
V2 = 1040 − SUMIFS('BI Payroll'!AJ:AJ,           -- earning hours
                    'BI Payroll'!Y:Y,  R2,        -- person
                    'BI Payroll'!AI:AI, "Y",      -- only FTE-counted hours
                    'BI Payroll'!AD:AD, P2)       -- this position
```

Citywide temp employees are capped at 1040 hours per FY (half-time). This
formula computes hours remaining before the cap. Different cell shape from
the per-PP iteration in Step / Report Data — only one cell per temp, summing
across the full FY snapshot. **Critical use of `AI = "Y"`** (Is FTE Hours
flag) — non-FTE hours (e.g., comp time taken in lieu of OT pay) don't count
against the temp cap.

##### Inactive — total spend per inactive position

Column `E` (`Sum of Balance Amount`) is computed from the BI Payroll pivot
cache, listing positions whose PPE activity exists in BI Payroll but whose
position number doesn't appear in P&P Data. Per Alex's description in
[`labor-report.md`](labor-report.md) § Tab 13: when a temp separates, the
position is inactivated and drops off P&P, but BI Payroll retains the FYTD
record. The Inactive tab catches these so they can be hand-added to Report
Data.

##### Budget Summary — BY+1 projection anchor

```excel
B20 = -SUM(INDEX('Report Data'!$Y$2:$CB$350, 0,
                 MATCH(MAX('BI Payroll'!X:X), 'Report Data'!$Y$1:$CB$1, 0)))
      * Calendar!N2
      - 'Staffing Plan'!X30 - 'Staffing Plan'!X41
```

Uses BI Payroll only to find "today's PPE" (`MAX(X)`) so it knows which
column of Report Data to pull. The actual values come from Report Data; the
COLA-weighted `Calendar!N2` scales them.

#### What's manual / fragile

- **Column-name dependency is total.** Every downstream formula uses literal
  column references (`$AL`, `$AD`, `$X`, `$V`, `$F`, `$AJ`, `$AI`, `$Y`,
  `$AE`). If OBI ever renames a field or shifts column order — common after
  a PeopleSoft version bump or an OBI report rebuild — **all** of Premium /
  Overtime / RPO / Step / Report Data / TEMP Limits / Inactive / Calendar /
  Budget Summary fail silently. The pivot caches (which embed the column
  names) are equally exposed. There is no defensive header sniff anywhere.
- **`'XXX' = "***Unspecified***" is the Controller hiding sick-leave TRCs.**
  This snapshot has $3.51M of payroll bucketed under XXX (4.2% of the
  workbook total). Alex has access to a permission level that unhides
  per-employee sick-leave detail but doesn't use it because the leave-detail
  isn't needed for labor-report work. **Privacy implication for KosPos:**
  sick-leave data is considered sensitive (HIPAA-adjacent, plus PII risk if
  joined to Person Number). The default importer must preserve the Controller's
  hiding — keep XXX as a single bucket, do **not** attempt to back-fill from
  unmasked sources. See § KosPos improvements #4.
- **`Earning Period Number` (col W) is all zero** in this export. Time
  slicing relies entirely on `Earning Period End Date` (col X). If a future
  OBI export populates W, no formula will start using it; if a future OBI
  export drops X, every formula breaks. Both states are equally undefended.
- **Fund-10190 filter in Step.** Step's per-PP SUMIFS filter to fund 10190
  only — works for DBI's BIF-funded operating positions but silently
  zeroes out:
  - DBI fund 10230 (BIF-Continuing — $213k in this snapshot),
  - DBI fund 10840 (Planning Code Enforcement),
  - all CPC funds (10000 GF + special revenues).
- **Account-filter strings are literal.** The OT exclusion `"Overtime -
  Scheduled Misc"`, the RPO exclusion `"Ret Payout - SP & Vac - Misc"`,
  the Premium exclusion `"Premium Pay - Misc"`, the Temp LSP exclusion
  `"Temp Misc LumpSum Payoff"`. If the Controller renames an account
  description (e.g., "Misc" → "Miscellaneous" in a chart-of-accounts
  refresh), every Step + Report Data + Operating Report Summary formula
  silently drops the relevant exclusion and double-counts dollars.
- **Account 509010 ("Premium Pay - Misc") is the *bulk* premium account
  but not the *only* one.** The Premium pivot's page filter is just this
  one account description. Earnings codes like Bilingual ($60 = 289),
  Cert Prem (113/125/253/etc.), Lead Worker ($5 = L08) all post to 509010.
  But some premium categories — e.g., **Structural Eng Prem - 10.27%
  ($124k)** — appear in BI Payroll with no clear posting account confirmed
  yet. If any premium variant ever posts to a different account
  description (e.g., a Police 9.5% prem to "Premium Pay - Uniformed"),
  the Premium tab would miss it. **Worth confirming during Tab 16 (Premium)
  walkthrough.**
- **CPC inclusion is in-progress.** Alex started extending the report to
  cover CPC for merger planning. The Premium / Overtime / Step / Report
  Data downstream consumers do *not* currently distinguish DBI from CPC
  in their projection formulas (Step's 10190 filter accidentally does, by
  side effect). A naive read of "total premium" from the Premium pivot
  today would mix DBI and CPC dollars. KosPos importer should keep
  Department Group Code as a first-class dimension on every aggregation.
- **`'AM' is a trailing empty column.** Pure OBI export artifact —
  KosPos importer should ignore it rather than reify a "column 39" placeholder.
- **`AE` job code prefix `COMMN:` is implicit citywide knowledge.** New
  analysts hit `"COMMN:5380"` and assume the prefix is a typo. KosPos
  should store the prefix-stripped 4-digit job code as the primary key
  and surface the prefix as metadata (originated in citywide common job
  set vs department-specific).
- **No formulas on this tab at all** — but it's *referenced* by 50,898
  formulas across Step + Report Data + Calendar + TEMP Limits + Budget
  Summary + OPS. The blast radius of any structural change is enormous.

#### KosPos improvements

##### 1. Importer is a full-replace per FY snapshot, with snapshot history

**Problem in the workbook.** Alex re-runs the full FYTD query every two
weeks because prior-PP adjustments leak in retroactively. The workbook
overwrites BI Payroll wholesale each time; there is no record of what
changed between snapshots. The Operating Report Detail tab tries to
diagnose run-over-run changes but has no real before-state to diff against
— Alex's only recourse is to keep prior workbooks around and eyeball them.

**KosPos design.** Each BI Payroll upload is treated as **the canonical
FY-to-date snapshot** for an `(fiscal_year, as_of_date)` tuple. Persist
every snapshot — small relative to the rest of IndexedDB. Two surfaces:

- **Current snapshot** is what every downstream view reads from by default.
- **Snapshot diff** view (powers the eventual Operating Report Detail
  feature): pick two snapshots, get per-position / per-account / per-PP
  deltas. Surfaces retroactive adjustments to old PPs as their own
  highlight ("PP12 was adjusted +$3,142 between the 5/8 and 5/22 runs").

Importer is **idempotent**: uploading the same snapshot twice produces no
change; uploading a newer snapshot with the same `as_of_date` warns rather
than overwriting silently.

##### 2. Header-driven importer with fingerprint-based schema detection

**Problem in the workbook.** Column letters are hardcoded in every
downstream formula. A column rename or reorder upstream breaks everything.

**KosPos design.** Continue the pattern from ADR-007 — match columns by
fingerprint (case-insensitive substring match on canonical header names),
not by position. **Update ADR-007's column list** to reflect the real
export: not pre-aggregated `YTD Salary / Benefits / Total`, but the 39
transactional columns above. Importer aggregates per
`(position, pay-period, account-description)` on the fly so downstream
KosPos modules see whatever shape they need without the workbook's
per-PP-SUMIFS gymnastics.

Critical fingerprints to detect:

| Workbook formula uses | Fingerprint | Why critical |
|---|---|---|
| `'BI Payroll'!AL` | "balance amount" | The dollar — every aggregation |
| `'BI Payroll'!AD` | "position identifier" | Per-position joins |
| `'BI Payroll'!X` | "earning period end date" | The PPE used to slice time |
| `'BI Payroll'!V` | "account description" | The text used for exclusions |
| `'BI Payroll'!F` | "fund code" | Fund-level slicing |
| `'BI Payroll'!Y` | "person number" | Per-employee aggregation |
| `'BI Payroll'!AE` | "job code" | TEMPM filter, job-class joins |
| `'BI Payroll'!AB` / `AC` | "earnings code" / "earnings code description" | Per-code drill-down (premium types) |
| `'BI Payroll'!AJ` / `AI` | "earning hours" / "is fte hours" | TEMP Limits hours math |

A missing fingerprint at import time blocks the import with a clear
"column not found" error rather than silently producing zeros.

##### 3. Pre-compute the rollup cube once, query it many ways

**Problem in the workbook.** The same 110k rows are pivoted three times
(Premium / Overtime / RPO) and SUMIFS-iterated 50k times (Step + Report
Data + TEMP Limits + Inactive). Excel does this on every recalc.
Performance is fine in a desktop workbook with one user; it does not
generalize.

**KosPos design.** On import, build a per-snapshot **rollup cube** in
memory and persist to IndexedDB:

- Primary aggregation key: `(fiscal_year, dept_group, dept_code, fund,
  position, account_description, earnings_code, pp_end_date)`.
- Stored value: `(balance_amount, earning_hours)`.
- Plus a denormalized `(position, account_description, pp_end_date) →
  balance_amount` index for the per-PP per-position queries that Step and
  Report Data need.

Every downstream view (Premium, Overtime, RPO, Step, Report Data, TEMP
Limits, Inactive, Operating Report Summary) becomes an O(k) cube query
where k is the number of grouping keys actually selected — not an O(N)
scan of 110k rows times M formula cells.

This eliminates the workbook's "pivot cache must be refreshed before
the GETPIVOTDATA cell sees the new data" failure mode (see
[`labor-report.md`](labor-report.md) § Cross-cutting / Live data, never
stale pivots).

##### 4. Preserve the Controller's sick-leave masking by default

**Problem in the workbook.** `XXX = "***Unspecified***"` carries $3.51M
in this snapshot (4.2% of total payroll) and the user has no way to
distinguish "did the employee take 8 hours of sick" from "did the
employee take 8 hours of jury duty leave" — both fall into the masked
bucket. This is a deliberate Controller-side privacy posture.

**KosPos design.** The importer keeps `XXX` as a single opaque bucket.
**Sick-leave detail is not unmasked** unless an admin user explicitly
uploads a separately-permissioned export, in which case it's stored
encrypted-at-rest in IndexedDB (and surfaces only in views the admin role
can see).

Implication: KosPos's "leave balance" reports (a future Phase 4 feature
adjacent to RPO eligibility computation) can show *aggregate* sick-leave
totals but cannot per-employee attribute them. This matches the
Controller's stance and is the right default for a department-admin tool.

Surface in the Data Issues panel as a note rather than a warning: "$3.51M
of YTD payroll is in the Controller's masked sick-leave bucket (XXX).
This is expected and intentional."

##### 5. Strip the `COMMN:` job-code prefix and store both

**Problem in the workbook.** `'COMMN:5380'` is opaque. Filters that
copy-paste a 4-digit job class don't match because of the prefix.

**KosPos design.** Importer parses `AE` into `{prefix: 'COMMN', code:
'5380'}`. Display defaults to the 4-digit code; filters and joins use
the 4-digit code. The prefix is preserved as metadata for the rare cases
where a department-specific job-set prefix matters (per
[`appointment-types.md`](appointment-types.md) § citywide common vs
department-specific). Two columns on the imported row:
`job_code = "5380"` and `job_code_set = "COMMN"`.

##### 6. Make Department Group Code a first-class dimension

**Problem in the workbook.** The current cross-tab consumers (Premium pivot,
Overtime pivot, Step SUMIFS) do not consistently group by Department Group
Code. The Premium pivot includes it as a row field (so DBI and CPC are
visible separate row groups); the Step tab's fund-10190 filter
*coincidentally* isolates DBI; the OPS!E36 cell pulls only `Fund Code =
10190` from the Premium pivot, mixing in any CPC dollars that happen to
post to fund 10190 (none in this snapshot, but not a guaranteed invariant).

**KosPos design.** Every aggregation has Department Group Code as an
explicit grouping key. Pages default to the current user's department
group (multi-dept access is a Phase 3 concern); when multi-dept is
enabled, the rollup makes the dept-group split explicit in the UI rather
than relying on a fund-code coincidence.

This also unblocks Alex's in-progress CPC extension: KosPos sees the same
BI Payroll file and produces a separate, clean CPC view without rewriting
formulas.

##### 7. Account-description rename guard

**Problem in the workbook.** Account Description literals are scattered
across hundreds of formulas. A Controller-side text change ("Ret Payout
- SP & Vac - Misc" → "Retirement Payout - Misc") would silently drop the
exclusion from Step / Report Data — every position's regular labor would
suddenly include RPO dollars, inflating projections by the RPO amount.

**KosPos design.** Account descriptions are looked up from a **central
chart-of-accounts map** (sourced from BFM or a CON publish), not
hardcoded. The map versions by effective date. The importer logs a
warning when an Account Description in the BI Payroll snapshot doesn't
match the active chart-of-accounts map — early-warns on Controller-side
renames before they break aggregations.

##### 8. Per-snapshot data-quality flags

Add to `lib/quality/` (per [ADR-003](../DECISIONS.md)):

- **Row-count sanity.** Compare to prior snapshots; warn if total rows or
  total Balance Amount changes by more than ~30% (signals a botched
  export or a query scope change like "I forgot to set Fiscal Year").
- **Negative or zero Balance Amount.** Expected for retroactive
  adjustments (negatives) but should be small share of the total. Surfaces
  outliers (a $-50,000 reversal needs human eyes).
- **Earnings Code Description without Earnings Code (or vice-versa).**
  Inconsistencies indicate OBI-side data-quality issues.
- **Fund / Account / Department Code orphans.** An unknown fund or
  account code (not in the BFM chartfield reference) suggests either a
  new chartfield or a typo upstream.
- **Position appears in BI Payroll but not in P&P Data.** Drives the
  Inactive tab automatically — no separate manual lookup needed.

#### KosPos UI sketch

BI Payroll is **internal staging**, not a user-facing module. Two surfaces:

1. **Upload page** (Settings → Data Sources → BI Payroll):
   - Drop a `.xlsx` file. Importer validates the 39-column fingerprint,
     reports diff vs. prior snapshot (row count, total Balance Amount,
     new PPE if any).
   - Snapshot list with timestamp, FY, as-of date, row count, total
     amount. Toggle which snapshot is the "active" one.
   - Per-snapshot data-quality summary (count of XXX-masked rows, count
     of zero/negative amounts, count of unknown chartfields).
2. **Per-position payroll drill-down** (a tab on the Position Detail
   page, available from every position-aware module — Report Data,
   Operating Report Detail, Inactive, TEMP Limits, etc.):
   - PP-by-PP table: PPE | Earnings Code | Description | Account | Fund |
     Hours | Amount.
   - Filter: by earnings code, by account, by PP range.
   - Quick aggregates at the top: YTD regular labor (= total − OT − RPO
     − Premium − Temp LSP), YTD OT, YTD Premium, YTD RPO, YTD Temp LSP.
   - "Trace to source": each row links to the underlying BI Payroll
     snapshot row so a user can verify a number against the raw export.

#### Excel export notes

KosPos's Excel emitter does **not** rebuild a 39-column transactional sheet
— that's an importer detail, not user-facing output. Instead:

- A **`Payroll Detail` sheet** with the per-position-per-PP table from the
  drill-down (filtered to whatever the user has selected: a department, a
  position, a fund), so a user reviewing a projection can verify the
  underlying activity in one click.
- A **`Payroll Summary by Account` sheet** with the rollup cube sliced by
  Account Description × Department × Fund × PP — replaces the manual
  Premium/Overtime/RPO pivots with a single live-query table.
- **Named ranges** for the special-class subtotals (`PREMM_YTD`, `OVERM_YTD`,
  `RTPOM_YTD`, etc.) so a user maintaining a side-by-side parity workbook
  can reference them by name instead of cell address.
- A `Reference notes` block citing the OBI report and the snapshot timestamp,
  so the file is self-documenting.

#### Open questions / TODO

- [ ] **Confirm Account Description routing for `Structural Eng Prem -
      10.27%` ($124k in this snapshot).** Does it post to account 509010
      "Premium Pay - Misc" (and therefore land in the Premium pivot
      correctly)? If not, the workbook is under-counting PREMM YTD. Resolve
      during Tab 16 (Premium) walkthrough.
- [ ] **Confirm the "Multiple Items" account filter on the RPO pivot.** The
      pivot XML shows two account-description items as visible (the rest
      hidden); inferred from accounts present in the data to be `510210`
      + `505060`. A future RPO walkthrough should open the pivot in Excel
      and confirm the human-side filter selection.
- [ ] **Reconcile the $38k VPO/SVO vs account 510210+505060 spread.** Account
      total = $721k; earnings-code total (VPO + SVO) = $683k. Investigate
      whether the difference is in `200075` payroll-employee-reimbursement
      liability bucket or a small-dollar miscategorization.
- [ ] **TEMPM filter `'BI Payroll'!AE = "COMMN:5380"` undercounts.** The
      workbook misses temp pay posting to `505020` ($49k Sick), `505040`
      ($42k Vac), `505050` ($55k Other Timeoff), `505060` ($71k LSP),
      `505070` ($44k Holiday) at the DBI+CPC level. Confirm the desired
      definition during Tab 16+ (TEMPM is on the Premium tab's adjacent
      block, or on its own Tab 40 / OPS row 40). See
      [`special-class.md`](special-class.md) § TEMPM_E open question.
- [ ] **Update ADR-007.** The provisional column list (`YTD Salary / Benefits
      / Total`) was wrong — BI Payroll is transactional, not pre-aggregated.
      ADR-007 needs an amendment landing with the real 39 columns and the
      full-replace import model. Suggest doing this during the importer-build
      sub-phase (2.4) rather than now, since the deep-dive doc captures the
      real columns already.
- [ ] **Decide where the citywide chart-of-accounts map lives.** Referenced
      in Improvement #7 above — likely `lib/chartfields/` with a JSON dataset
      sourced from BFM. Belongs in [`chartfields.md`](chartfields.md) when
      that gets fleshed out.

---

### Tab 8 — Roster Approvers

**Status:** walkthrough — pending

**Purpose:** Query from PS HCM listing roster approvers. Rosters are a feature Alex
flagged as **important to KosPos** — full definition pending walkthrough.

**Data sources:** PS HCM query.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — Alex to explain rosters and their use)_

---

### Tab 9 — EE Additional Pay

**Status:** walkthrough — pending

**Purpose:** Audits acting assignments and supervisory pay. Columns **A–R** are a PS
HCM query; the rest are formulas + pivots. Two specific checks:

1. **Acting-assignment dual-entry check.** Acting assignments must be entered in two
   places in PS HCM; this tab confirms both entries exist.
2. **Missed supervisory pay.** Identifies employees who should be receiving supervisory
   pay but currently aren't.

Detail nuance to come — acting assignments and supervisory pay are MOU-defined.

**Data sources:** PS HCM (additional-pay query) + cross-referenced P&P Data.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — Alex to walk acting/supervisory pay rules)_

---

### Tab 10 — Probation

**Status:** walkthrough — pending

**Purpose:** Tracks probationary employees. Data currently lives in an offline
spreadsheet (no known PS HCM source). **KosPos becomes the new tracker** — user input
allowed; additional functionality TBD.

**Data sources:** Offline (Alex's spreadsheet). KosPos = system of record going forward.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 11 — Eligibility Lists

**Status:** walkthrough — pending

**Purpose:** Per-job-class eligibility lists for DBI classes. Compiled manually by
looking up each DBI class at <https://sfdhr.org/examination-results>. No structured
data source currently exists.

**Data sources:** DHR website (manual lookup). KosPos improvement: **periodic scrape**
of `sfdhr.org/examination-results` to keep current. Belongs in
[`../data-sources/dhr.md`](../data-sources/dhr.md).

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 12 — TEMP Limits

**Status:** walkthrough — pending

**Purpose:** Pivot view of P&P Data filtered to temp-appointment categories (Alex's
words: "cat 16, 17, and 18"). Tracks each temp employee's expiration date so the
department can plan around them.

**Data sources:** P&P Data (pivot).

**Open inconsistency to resolve in walkthrough:** [`definitions.md`](definitions.md)
records the temp appointment categories as `16 / 17 / c2`; Alex's tab description here
says `16 / 17 / 18`. Need to reconcile — see chat clarifying question.

**BI Payroll formula (decoded during Tab 7 walkthrough):** the "hours remaining" cell
per temp:
```excel
V2 = 1040 − SUMIFS('BI Payroll'!AJ, Y=person, AI="Y", AD=position)
```
1040 = citywide half-time annual cap. `AI = "Y"` filters to FTE-counted hours only —
non-FTE hours (e.g., comp time taken in lieu of OT pay) don't count against the cap.
See Tab 7 § How each downstream tab consumes BI Payroll.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 13 — Inactive

**Status:** walkthrough — pending

**Purpose:** Cross-reference between BI Payroll and P&P Data to surface **inactive
positions** that still need to be projected. Mechanism: when a temp employee separates,
the position is inactivated; once inactive it drops off the P&P report, but BI Payroll
still shows it was paid. Since Report Data pivots primarily off P&P Data, these
inactive-but-paid positions and amounts must be **manually added** to Report Data —
this tab identifies which.

**Structure (decoded during Tab 7 walkthrough):** Cols A-E come from the BI Payroll
pivot cache (Position Identifier, Dept Desc, Job Code, Person Full Name, Sum of
Balance Amount). Cols F:K are formulas: `F = XLOOKUP(position, 'P&P Data'!B, 'P&P
Data'!B)` (returns #N/A when position is missing from P&P → that's the inactive flag),
`G = XLOOKUP(dept, 'P&P Data'!H, 'P&P Data'!F)` (division backfill), `H =
NUMBERVALUE(RIGHT(jobcode, 4))` (strips the `COMMN:` prefix), `I/J` parse the
"Last,First" name string, `K` is the disposition flag (`Add` / blank). At snapshot,
640 rows. See Tab 7 § How each downstream tab consumes BI Payroll.

**Data sources:** BI Payroll ∪ P&P Data (lookups).

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 14 — Separations

**Status:** walkthrough — pending

**Purpose:** **Rumored / pending** separations (not a complete list, not from a system
of record). Manually maintained.

**Data sources:** Manual entry. KosPos = user-input tracker.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 15 — Succession

**Status:** walkthrough — pending

**Purpose:** Draft feature — succession planning. Alex flagged as a possible KosPos
addition; scope TBD.

**Data sources:** Manual.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 16 — Premium

**Status:** walkthrough — pending

**Purpose:** Summary of premium pay actuals + straight-line projections. Data from
BI Payroll.

**Source pivot (decoded during Tab 7 walkthrough):** `Premium!A3:J116` (pivotTable9
on `pivotCacheDefinition6.xml`). Page filter `Account Description = "Premium Pay -
Misc"` (account 509010). Row fields: Dept Grp → Dept → Job Code → Job Desc → Earn
Code → Earn Desc. Col field: Fund Code. Data field: `Sum of Balance Amount`. Adjacent
projection panel `L3:Q11` is **not** a pivot — manual table comparing budget vs
projected per (dept × Account Lvl 5 = 5010Salary / 5130Fringe). See Tab 7 § How each
downstream tab consumes BI Payroll.

**Existing math reference:** [`special-class.md`](special-class.md) § PREMM_E (partial
— `Premium!P5 / P6` decoded; `N5 / N6 / N7` ratios pending).

**KosPos improvement Alex flagged:** projections could incorporate hiring information
— some positions to be hired later will carry premium pay. Small expected impact, but
the model can be made aware.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 17 — Overtime

**Status:** walkthrough — pending

**Purpose:** Summary of overtime actuals + projections. Data from BI Payroll.

**Source pivot (decoded during Tab 7 walkthrough):** main pivot `Overtime!A5:BL114`
(pivotTable11 on `pivotCacheDefinition6.xml`). Page filter `Account Description =
"Overtime - Scheduled Misc"` (account 511010). Row fields: Fund → Dept → Job Code →
Job Desc → Person. Col field: Earning Period End Date. **Visible data field is `Sum of
Earning Hours`** (not dollars); the dollar field exists in the cache and is pulled
via the OPS!E37 `GETPIVOTDATA("Sum of Balance Amount", …, "Fund Code", 10190)`.
Secondary pivot `Overtime!BP5:BR19` (pivotTable13) provides per-dept dollar totals
feeding the BS15 projection rollup. See Tab 7 § How each downstream tab consumes BI
Payroll.

**Existing math reference:** [`special-class.md`](special-class.md) § OVERM_E (fully
documented from Session 11 extraction). The labor-report-tab view is the YTD + projection
presentation; the existing OVERM UI in `app/src/modules/special-class/` is the
budget-development form (hidden in Phase 2.1).

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — Alex to confirm Overtime tab BN5:BT15 dept rows 7–14 not
yet extracted; cross-ref special-class.md)_

---

### Tab 18 — Step

**Status:** walkthrough — pending

**Purpose:** Per-position step-savings YTD + projection. **Formulas are complicated**;
Alex flagged that COLA shortcuts may exist in the math and wants to review carefully.

**Source SUMIFS shape (decoded during Tab 7 walkthrough):** the `S` column
(`YTD Operating STEP Actual`) is `SUM(BY2:CY2)`, where each `BY..CY` cell is one PP.
Per-PP cell: `SUMIFS('BI Payroll'!AL, AD=position, X=PPE, F=10190) − SUMIFS(... V="Overtime
- Scheduled Misc") − SUMIFS(... V="Ret Payout - SP & Vac - Misc") − SUMIFS(... V="Premium
Pay - Misc") − SUMIFS(... V="Temp Misc LumpSum Payoff")`. **Fund 10190 filter is a DBI
shortcut** — silently zeroes out CPC + DBI's BIF-Continuing (10230) positions. 32,670
cells reference BI Payroll on this tab. See Tab 7 § How each downstream tab consumes BI
Payroll.

**Existing math reference:** [`special-class.md`](special-class.md) § STEPM_C (partial
— per-position cell map captured; `BY2` per-PP variance formula known to use
`XLOOKUP(BY1, Calendar!B, Calendar!C) * 80` denominator with 80-hour PP assumption baked
in, per [`definitions.md`](definitions.md)).

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — Alex to confirm COLA treatment in `BY2`)_

---

### Tab 19 — Retirement Payout

**Status:** walkthrough — pending

**Purpose:** Per-employee retirement-payout actuals YTD + year-end projection. Data
from BI Payroll (earnings codes VPO, SVO).

**Source pivot (decoded during Tab 7 walkthrough):** `Retirement Payout!A5:AF66`
(pivotTable15 on `pivotCacheDefinition6.xml`). Page filter `Account Description =
"(Multiple Items)"` — inferred to be accounts `510210` "Ret Payout - SP & Vac - Misc"
+ `505060` "Temp Misc LumpSum Payoff" (the temp parallel). Row fields: Dept Grp →
Dept → Job Code → Job Desc → Person → Earn Code → Earn Desc. Col fields: Fund Code
(outer) × Earning Period End Date (inner). Data field: `Sum of Balance Amount`.
**OPS!E38 rolls up by `Department Group Code = "DBI"`**, not by fund — so picks up
both 510210 and 505060 for the whole DBI group regardless of fund. Snapshot
reconciliation: account totals $721k vs earnings-code totals (VPO + SVO) $683k —
$38k spread to investigate (see Tab 7 § Open questions). See Tab 7 § How each
downstream tab consumes BI Payroll.

**Existing math reference:** [`special-class.md`](special-class.md) § RTPOM_E (fully
documented; `H38 = IF(Calendar!K2=0, E38, MAX(G38, E38))` projection).

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 20 — Report Data

**Status:** walkthrough — pending

**Purpose:** **The most important tab.** Brings together payroll, budget, hiring plan,
and other inputs into one position-level dataset. Shows budget, actuals, and projections
in one place. Source of `'Report Data'!$S$649:$S$748` references in `special-class.md`.
Alex notes: **manual to update, may contain errors**.

**Data sources:** P&P Data (primary), BI Payroll, Inactive, Staffing Plan, BFM —
joined manually.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — high priority; this is the spine of the rebuild)_

---

### Tab 21 — Reporting Tree

**Status:** walkthrough — pending

**Purpose:** Visual org chart drawn from P&P Data — who reports to whom at each level.
Used both to **flag data errors** (broken reports-to chains, etc.) and to **communicate
system changes** to staff. Error identification is currently manual; KosPos can
automate. Precursor to the full Phase 7 org-chart module.

**Data sources:** P&P Data (Reports-To position).

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — enumerate the manual error-checks to automate)_

---

### Tab 22 — Pos by Dept

**Status:** walkthrough — pending

**Purpose:** Pivot view of Report Data by department. Alex notes: rarely used; low
priority. Likely subsumed by KosPos's filterable position list.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — confirm whether to keep as separate surface or fold in)_

---

### Tab 23 — Vacancies and TEMP

**Status:** walkthrough — pending

**Purpose:** Another pivot view of Report Data filtered to vacancies + temp positions.
**Used as a reconciliation check** — every vacant or temp position must appear in the
Staffing Plan. If a position is here but missing from Staffing Plan, that's a gap.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

---

### Tab 24 — Staffing Plan

**Status:** walkthrough — pending

**Purpose:** **Very important.** The hiring plan — which vacant / temp positions to
fill, when (in PP terms), at what cost. Feeds the cost ladder that Budget Summary uses.

**Data sources:** Vacancies + TEMP (tab 23), manually elaborated with fill-PP, fill-cost
estimates, and hiring sequence.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — major surface; reserve a session for this alone)_

---

### Tab 25 — Budget Summary

**Status:** walkthrough — pending

**Purpose:** Early-attempt rollup of what next-year's budget *could* look like given
the Staffing Plan. Example logic Alex described: if you hire 100 people who all start
in PP26, the cost for this year is tiny, but next year (full year) is ~26× that. Alex
notes: rarely used in current form; the concept is right but the implementation never
matured.

**Data sources:** Staffing Plan.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — frame as BY+1 projection from current-year hiring plan)_

---

### Tab 26 — Operating Report Summary

**Status:** walkthrough — pending

**Purpose:** **The main labor projection tab.** Budget vs actuals + special-class
budget vs actuals. The number that feeds the 6-month and 9-month reports to CON / MYR.

**Existing math reference:** [`special-class.md`](special-class.md) § "Operating
Report Summary — DBI section reference" (rows 36–42 for the special-class block — PREMM,
OVERM, RTPOM, STEPM, TEMPM, 9993). Walkthrough should fill in the non-special-class
rows.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — headline page)_

---

### Tab 27 — Operating Report Detail

**Status:** walkthrough — pending

**Purpose:** Drill-down view of Operating Report Summary. Used when investigating
**what changed between two report runs** — early in the FY, projections can swing
materially run-to-run. Alex flagged "what changed since the last report" as a clear
improvement area for KosPos.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough — KosPos snapshot-diff feature is the obvious win)_

---

### Ignored tabs

- **New Department Org** — DBI / CPC merger planning. Out of scope for Phase 2.
- **New Department Org - Long Term** — same, longer horizon.

If the merger lands, these become an org-restructure workspace (Phase 7 org-chart
territory or earlier "merger planning" feature). Not part of the current-year
workspace.

---

## Data sources inventory (built during walkthrough)

A flat list of every upstream file/query the labor report consumes. For each, capture
the v1 mechanism (manual upload? scrape?) and the eventual v2 plan (Snowflake when
available).

| Source | Used by tab(s) | v1 mechanism | v2 plan | KosPos importer path |
|---|---|---|---|---|
| Controller's pay calendar (PPE dates) | Calendar | Manual rebuild of Calendar tab annually (~30 min) | Generated from published Controller calendar (JSON / scraped PDF) | `lib/calendar/` — one JSON per FY |
| Per-BU MOU COLA schedule | Calendar (col E), implicitly Step, Report Data | Hardcoded single % in Calendar!E (DBI shortcut) | Per-bargaining-unit lookup sourced from DHR MOUs | `lib/cola/` (or part of `lib/dhr/`); also referenced by [`budget-process.md`](budget-process.md) |
| OBI `BI Payroll` report (transactional, 39 cols, ~110k rows for DBI+CPC FYTD) | **BI Payroll** (raw stage), Calendar (`H2`), Premium / Overtime / Retirement Payout (pivots), Step + Report Data (per-PP SUMIFS), TEMP Limits (hours math), Inactive (cross-ref vs P&P), Budget Summary (`MAX(X)` for as-of PP), Operating Report Summary (rows 36–41) | Manual OBI re-run every payday Tuesday (every two weeks); **full FYTD re-pull** because prior-PP adjustments leak in retroactively | Snowflake direct query when SF data platform exposes it; preserve full-replace import model | `lib/importers/obi-payroll/` — header-driven fingerprint, full-replace per `(fiscal_year, as_of_date)` with snapshot history retained; rollup cube precomputed on import (see Tab 7 § KosPos improvements #3) |

## Phase 2.2 sub-phases (dependency order)

_(Built at the end of the walkthrough — depends on which tabs Alex flags as core vs
low priority.)_

## Cross-references

- [`special-class.md`](special-class.md) — math already documented for RTPOM, OVERM
  (and pending for PREMM, STEPM, 9993, 9994, 9995, TEMPM).
- [`budget-process.md`](budget-process.md) — three-function framework + COLA history.
  This file covers functions 2 and 3 (current-year YTD and projection).
- [`definitions.md`](definitions.md) — context-dependent definitions (Temp, Vacancy,
  Department, Pay Period) referenced throughout labor-report formulas.
- [`authorities.md`](authorities.md) — authority chain (DHR / CSC / CON / MYR / BOS).
- [`appointment-types.md`](appointment-types.md) — appointment-type taxonomy.
- [`../data-sources/`](../data-sources/) — per-source detail.
- [`../DECISIONS.md`](../DECISIONS.md) — ADR-009 (Phase 2 pivot reasoning).
