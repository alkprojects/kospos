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
| 7 | BI Payroll | pending | Importer staging (OBI BI Payroll) |
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

1. **Separate pay-calendar arithmetic from COLA application.** Two independent layers:
   - `lib/calendar/` — pure PP arithmetic. Citywide. Functions: `dateToPP(date) →
     PPnumber`, `ppToFraction(pp) → number`, `ppsElapsed(asOfDate)`, `ppsInFY(fy)`,
     `ppsRemaining(asOfDate, fy)`. No COLA. One JSON per FY generated from the
     Controller's pay calendar.
   - `lib/cola/` (or extend `lib/dhr/`) — per-bargaining-unit COLA schedule. Lookup
     `bargainingUnit → [{effectiveDate, percent}]`. Sourced from DHR MOUs.
2. **Annualization function takes both.** `project(actuals, asOfDate, fy, bargainingUnit)`
   walks the remaining PPs and applies the rate effective in each. For a DBI-style
   single-MOU population this collapses to a single multiplier (matching today's
   workbook); for a mixed-BU population it produces a correct per-BU projection.
3. **Show both projections, expose the delta.** Always render the straight-line
   ("no-COLA-awareness") and the COLA-aware projection side by side. Makes the COLA
   impact visible and surfaces missing-bargaining-unit data: any class not tagged with
   a BU shows up as a discrepancy.
4. **Don't model the late-June bump.** Confirm with policy; for FY26 the Jun 30, 2026
   +2.0% landing one day before FY27 produces negligible impact. KosPos should
   formalize the rule: "COLA effective dates within the last PP of the FY are
   immaterial and excluded from in-year projection." Alternatively, include them but
   document that contribution is ~one weekday.
5. **Couple "as-of date" to user choice, not to the BI Payroll import.** A drop-down
   at the top of every projection page: "Projecting as of PP22 (5/8/2026)." Default to
   `MAX(PPE)` across all imported sources but allow override.
6. **PP27 user-facing presentation.** Internally: 26.1. User-facing: "PP1–26 plus a
   7-day spillover into PP27 before FY27 starts" — clearer for non-budget audiences.

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

**Status:** walkthrough — pending

**Purpose:** Payroll report from OBI. The source for actuals in Premium, Overtime,
Retirement Payout, and Step tabs (via pivots).

**Data sources:** OBI BI Payroll. See [`../data-sources/obi.md`](../data-sources/obi.md)
and ADR-007.

**Formulas / Manual-fragile / KosPos improvements / UI sketch / Excel export / Open
questions:** _(walkthrough)_

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
