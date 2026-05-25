# Reports folder inventory — Alex's example upstream files

**Folder:** `C:\Users\ALK\Desktop\Claude Projects\Position Management\example reports\Reports\`
**Catalogued:** 2026-05-25 (autonomous session 17, Task C)
**Source of truth on intent:** `reports.txt` in the same folder — Alex's hand-written one-line description per file.

This is the **complete set of upstream files** the labor-report workflow
depends on, captured in a single snapshot. Each file falls into one of
six families, summarized below; the per-source detail files
([`bfm.md`](bfm.md), [`ps-hcm.md`](ps-hcm.md), etc.) carry the
operational guidance.

## Quick overview

| Family | Files | Total cols × rows | KosPos consumer |
|---|---|---|---|
| **BFM reports (5)** | 15.10.001 (chart of accounts), 15.10.006 (position+benefits), 15.15.002 (benefit rates), 15.15.014 (job class rates + COLA), 15.15.016 (FTE cost) | 49+64+10+13+13 cols (varying row counts; largest is 15.10.006 By-Job-Class at 3,923 rows) | `lib/importers/bfm-*` (Phase 2.4) |
| **PS Financials chartfield trees (11)** | Account / Account Budget Control / Activity / Agency Use / Authority / Department / Department Budget Control / Fund / Project / TRIO / WBS Classification Structures | 3–17 cols (Activity = 81,905 rows; WBS = **390,470 rows**; total ~579k rows of tree data) | `lib/reference/<tree-name>/` (Phase 3) |
| **PS HCM exports (4)** | MRG_COMBO_CD_DEPT, MRG_HR_EE_ADDL_PAY, MRG_TL_TASK_PROFILE_BY_TASKGRP, MTL0170_4531347 (roster approvers) | 14+18+20+9 cols; tiny sample row counts | `lib/importers/ps-hcm-*` (Phase 2.4) |
| **OBI labor reports (3)** | Active Labor 8.30.24 (= older P&P Data), Payroll Detail 11.8.23 (= older BI Payroll variant), BvA 10.20.25 (the BVA reconciliation source) | 88+38+68 cols; row counts vary by snapshot | `lib/importers/obi-pnp`, `obi-payroll`, `bva` (Phase 2.4) |
| **DHR pay rates (1)** | Hourly Rates of Pay by Classification and Step FY25-26 | 29 cols × 17,116 rows (Steps tab); 20 × 124 (Ranges) | `lib/reference/dhr-steps`, `dhr-ranges` |
| **Recent eturns / labor report (2)** | Eturns 5.14.26 (sibling of BFM 15.10.006); Labor Report 5.21.26 itself | Multi-sheet workbooks | Importer staging only |

## BFM reports (5 files)

All sourced from BFM (Sherpa hosted at `nm.bfm.cloud`). Refresh cadence
varies by report. **Source-of-truth status per Alex's `reports.txt`** is
preserved in each row.

### `15.10.001 Chart of Account Query (37).xlsx`

Per Alex: _"this is a nonposition eturn from bfm, this is source of
budget truth"_

| Sheet | Rows | Cols | Headers (first 15) |
|---|---|---|---|
| Chart of Account Details | 1,016 | 49 | GFS Type / Dept Grp / Division / Division Title / Section / Section Title / Dept ID / Dept ID Title / Fund / Fund Title / Project / Project Title / Project Type / Grant / Activity |

**Role:** the **non-position eturn** that captures all budget dollar
data for **non-labor accounts** (materials, services, contracts, etc.)
plus labor totals **without position attribution**. Complements
15.10.006 (which carries the position-level labor detail). Together,
the two eturns cover every dollar in the dept's budget.

**Implication for KosPos:** Phase 2's BFM importer must consume both
eturn flavors. The non-position eturn at 49 cols × ~1,016 rows is
small; treat it the same way as the position eturn structurally but
key on `(chartfield_string, fy)` only (no position number).

### `15.10.006 Position and Calc'd Benefits Detail (22).xlsx`

Per Alex: _"this is a position eturn from bfm, position tab has position
detail and other tab has benefit detail, this is source of budget truth"_

| Sheet | Rows | Cols | Headers (first 15) |
|---|---|---|---|
| **By Position#** | 1,931 | 64 | GFS Type / Dept Grp / Prior Budget HCM Position# / **BY HCM Position#** / FormID / Division / Division Title / Section / Section Title / Dept ID / Dept ID Title / Fund / Fund Title / Project / Project Title |
| By Job Class | 3,923 | 60 | (Same as Position# but with no Position# column; rolled up to Job Class × chartfield) |

**Role:** the canonical position-level budget eturn already documented
in [labor-report.md Tab 4](../domain/labor-report.md#tab-4--bfm-1510006-fy26)
and consumed by Report Data S Total Budget (per-position SUMIFS) +
Operating Report Summary TEMPM G40 (per-class summary rows). The
workbook's `BFM 15.10.006 FY26` tab is an embedded snapshot of the
By Position# sheet for FY26 (2,694 rows × 64 cols).

**Implication for KosPos:** the By Position# sheet is the primary
import target. The By Job Class sheet (3,923 rows) is a derivable
rollup — KosPos can compute it from the position-level rows if needed,
but the BFM-emitted version may differ slightly because of
job-class-level adjustments. **TODO** at Phase 2.4: verify whether
By Job Class is purely derivable or carries an independent edit layer.

### `15.15.002 Benefit Rates (1).xlsx`

Per Alex: _"this is a benefit rate report from bfm, it is for the next
budgeted year, i am not 100% confident these rates are 100% accurate
and complete. payroll is the true source of truth on what employees are
actually paid, this should be very close/accurate though"_

| Sheet | Rows | Cols | Headers |
|---|---|---|---|
| Retirement | 54 | 10 | Fiscal Year / Retirement / Job Class Retirement Tier / Account / Account Descr / Benefit Code / Benefit Name / Type / Value / FICA Cap/Tier HighAmt |
| Health Dental etc | 1,621 | 9 | Fy / Emp Org / Emp Org Title / Account / Account Descr / Benefit Code / Benefit Name / Type / Value |

**Role:** Per-(class, account, benefit code) benefit rates for FY26-27
and FY27-28. **No FY25-26 rates** — the current FY's benefit rates aren't
re-published here because the labor report uses live BI Payroll for
current-year actuals, not rate × FTE. Cross-referenced from
[`special-class.md` § OVERM](../domain/special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight)
where the OT fringe rate of 7.65% must be derived manually (OASDI 6.20% +
Medicare 1.45%) because there's no "OT fringe" line in this report.

**Implication for KosPos:** `lib/reference/bfm-benefit-rates/` — versioned
by FY. Note Alex's confidence caveat: BFM rates are budget-development
inputs, not authoritative actuals. KosPos surfaces both: the BFM rate
for budget-development math and the actual BI Payroll rate for
current-year reconciliation.

### `15.15.014 Job Class Rates and COLA  (1).xlsx`

Per Alex: _"this is a report showing jobs and colas from bfm, overrides
are special agreements for specific job classes that differ from the
rest of the union, this is the last year of the 3 year contract cycle
so there are no overrides remaining, this is the source of truth
initially but may not be updated with rare changes during the year"_

| Sheet | Rows | Cols | Headers |
|---|---|---|---|
| Cross Tab | 1,314 | 13 | (cross-tab format; columns indexed by FY) |
| Emp Org COLA | _empty_ | _empty_ | _(empty in this snapshot)_ |
| Job Class Override | 5 | 13 | _(class-level override list)_ |

**Role:** Per-job-class hourly rate + COLA schedule. The Emp Org COLA
sheet is supposed to carry per-union COLA scheduling — empty here
because there are no remaining overrides this late in the 3-year
contract cycle. The Job Class Override sheet has 5 rows: special
agreements with individual classes outside the union-wide schedule.

**Implication for KosPos:** combine into `lib/reference/bfm-job-class-rates/`
+ `lib/cola/`. The class-override sheet is a critical data quality
hook — a non-empty override sheet on a future FY needs to surface as a
Data Issue so KosPos doesn't silently apply union-wide COLA to the
overriden classes.

### `15.15.016 FTE Cost Report - 9900 Form - to be retired in BY28 & BY29 (1).xlsx`

Per Alex: _"this is an fte cost calculator from bfm, it is being
retired, the calculator created for this project is likely more
accurate"_

| Sheet | Rows | Cols | Headers |
|---|---|---|---|
| Cost per FTE | 1,174 | 13 | In Both SetID? / SetID / Job Class / Fndg Strt Dt / Fndg End Dt / FY27 FTE Count / FY27 Salary / FY27 Benefit / FY27 Total / FY28 FTE / FY28 Salary / FY28 Benefit / FY28 Total |

**Role:** Per-job-class FTE cost calculator used during budget
formulation. **Being retired in FY28 / FY29 cycle** per Alex.

**Implication for KosPos:** this is the report KosPos's
[`special-class.md`](../domain/special-class.md) RTPOM walkthrough's
"Cost per FTE" reference matches. KosPos's Phase 4 RPO calculator is
the modern replacement Alex referenced. **No new importer needed** —
the data feeds the budget-formulation phase, which the calculator
already implements correctly. Worth a sanity-check pass during Phase 2.4
to confirm parity between the workbook calc and KosPos's calc.

## PS Financials chartfield trees (11 CSVs)

All sourced via OBI from PS Financials. Per Alex's `reports.txt`,
**all 11 are source-of-truth for chartfield structure** (the Account
Budget Control + Department Budget Control trees additionally drive
budget checks).

These are the trees referenced as "future work" in [Tab 6 § Companion
reference dataset](../domain/labor-report.md#companion-reference-dataset--citywide-department-tree)
— this inventory makes them concrete.

| Tree | Cols | Rows | Notes |
|---|---|---|---|
| **Account Classification Structure (13).csv** | 16 | 6,723 | Levels 2/3/4/5 hierarchy → Account Code → Account Description; carries `Account Tree Effective Date`. Joins `Account Code` to `Account Description` (the readable name used everywhere in the labor report). |
| **Account Budget Control Classification Structure.csv** | 13 | 2,971 | Lighter 3-level Budget Control hierarchy. Per Alex: drives budget checks. |
| **Activity Classification Structure.csv** | 9 | **81,905** | Activity Code + Activity Name + Activity Type per Project. Large because activities are project-internal. |
| **Agency Use Classification Structure.csv** | 3 | 3,724 | Smallest tree — Agency Use is rarely populated outside Public Health / specific federal grants. |
| **Authority Classification Structure (6).csv** | 9 | 14,307 | 2-level Authority hierarchy → Authority Code. Authority is the "what kind of appropriation" dimension. |
| **Department Classification Structure (16).csv** | 13 | 14,240 | Full dept hierarchy: Dept Group → Division → Section → Unit → Sub-Unit → Department, with effective date. Already used by Tab 6 to fix the "Update Formula" placeholder. |
| **Department Budget Control Classification Structure.csv** | 16 | 1,512 | 4-level Dept Budget Control hierarchy → Department Code. Drives budget checks. |
| **Fund Classification Structure (9).csv** | 16 | 1,951 | Fund Group → Fund Type → Lvl 1/2/3 → Fund Code, with `Annual/Continuing` flag. **Carries the operating-fund vs continuing-fund distinction** referenced by the labor report cross-cutting concerns. |
| **Project Classification Structure (1).csv** | 13 | 43,012 | Project Code + Owning Dept + Owning Dept Group + Manager + Accountant + Start/End Date + Type + Grant flag. **Very useful for KosPos's chartfield drill-down** — gives human-readable project context. |
| **TRIO Classification Structure (3).csv** | 3 | 3,677 | TRIO is mostly empty per [`bva.md`](bva.md). Likely the "Three Initials Or" capital-project codes. |
| **WBS Classification Structure (1).csv** | 17 | **390,470** | Work Breakdown Structure — 5-level hierarchy for capital projects. Huge because capital projects can split into hundreds of WBS elements each. |

**Total: ~579,000 rows of chartfield tree data.** All as standalone
CSVs; refresh cadence is "manual when chartfields are added or
retired" per Alex.

**Implication for KosPos:**

- `lib/reference/<tree-name>/` directory per tree, versioned by
  `*_Tree Effective Date`. Each tree is read-only reference data
  imported as a one-off CSV upload (Phase 3 design).
- **Department + Account + Fund** are the highest-priority trees because
  they're consumed by every labor report tab. Activity / WBS only
  become relevant when KosPos touches capital projects.
- **Authority's 2-level hierarchy** lets KosPos automatically roll
  Authority Codes up to Authority Lvl 1 (typically `Fund-Annual`,
  `Fund-Continuing`, `Capital`, `Grant`, etc.).
- **The Fund tree's `Annual/Continuing` flag** is what KosPos uses to
  derive the per-dept-group operating-fund-set (per [cross-cutting
  concerns](../domain/labor-report.md#multi-dept-generalization-caveats-dbi-shortcuts-to-undo)) —
  no more hardcoded `10190` filters.

## PS HCM exports (4 CSVs)

All sourced via PS HCM Query Manager. **Source-of-truth** for their
respective domains per Alex's `reports.txt`.

| Export | Cols | Rows | Source-of-truth for | Labor-report consumer |
|---|---|---|---|---|
| **MRG_COMBO_CD_DEPT (5).csv** | 14 | 3,697 | Combo codes per department | Workbook Tab 3 (Combo); referenced by [`ps-financials.md`](ps-financials.md) note about combo codes |
| **MRG_HR_EE_ADDL_PAY (65).csv** | 18 | 10 (tiny sample) | Acting + supervisory pay items | Workbook Tab 9 (EE Additional Pay); see [`ps-hcm.md` § Reports & queries](ps-hcm.md#reports--queries-kospos-consumes) |
| **MRG_TL_TASK_PROFILE_BY_TASKGRP.csv** | 20 | 1 (essentially empty) | Task profiles per dept | Not in current labor report; planned consumer per [`ps-hcm.md`](ps-hcm.md) |
| **MTL0170_4531347.csv** | 9 | 866 | Roster + roster approvers | Workbook Tab 8 (Roster Approvers); MTL0170 = the canonical roster query in PS HCM |

**Headers:**

- `MRG_COMBO_CD_DEPT`: Department / Combo Code / Combo Code Description / Eff Date / Status / Dept ID / DeptID Description / Fund / Fund Descr / Authority / Authority Descr / Agency Use / Agency Descr / Account
- `MRG_HR_EE_ADDL_PAY`: Department / Dept Title / Emplid / Empl Record / Eff Date / Last / First Name / Middle / Preferred First / Roster Code / Roster Code Descr / Pay Status / Job Code / Union Code / Sal Plan / Step / Addl Pay / Rate Code
- `MRG_TL_TASK_PROFILE_BY_TASKGRP`: Taskgroup / Descr / Eff Date / TskProfID / Profile Eff Date / Status / Descr / Seq Nbr / AllocType / Amount / Dept / Descr / Fund / Authority / Agency Use / Combo Code / Project / Project Descr / Activity / Activity Descr
- `MTL0170_4531347`: GROUP_ID / DESC1 / ROLENAME / EMPLID / LAST_NAME / FIRST_NAME / JOBCODE / DESC2 / EMPL_STATUS

**Implication for KosPos:**

- **`MRG_COMBO_CD_DEPT`** maps `(Department, Combo Code) → chartfield_string`.
  Phase 3's combo-code feature reads this. Already documented in
  [`ps-hcm.md`](ps-hcm.md).
- **`MRG_HR_EE_ADDL_PAY`** is the EE Additional Pay source. Phase 4
  PREMM walkthrough needs this. The 10-row sample in the folder is
  not enough for testing — KosPos importer expects production-scale
  exports (~thousand rows).
- **`MRG_TL_TASK_PROFILE_BY_TASKGRP`** is the Task Profiles source for
  Phase 3 chartfields. Currently empty in this snapshot.
- **`MTL0170_4531347`** matches Tab 8 (Roster Approvers) — confirm the
  `4531347` suffix is just the run ID; the canonical name is
  `MTL0170`.

## OBI labor reports (3 CSVs)

OBI is the Controller-owned reporting layer over PS HCM + PS Financials.
Three labor-relevant exports live in this folder:

### `Active Labor - Version 8.30.24 (73).csv`

Per Alex: _"this is a custom report created in OBI, data is from PS HCS,
should be accurate and trustworthy"_

| Cols | Rows | Header start (first 20) |
|---|---|---|
| 88 | 604 | Snapshot Date / Position Number / Position Job Code / Position Description / Position Status / Position Division / Position Department ID / Position Department Description / Position Max Headcount / Position Full Part Time Description / Position Regular or Temporary / Position TX Job Code / Position Fill Type / Position Fill Status / Position Filled Headcount / Employee ID Vice 1 / Employee Name Vice 1 / Employee ID Vice 2 / Employee Name Vice 2 / Previous Employee |

**This is the OBI export that becomes the workbook's P&P Data tab.**
604 rows × 88 cols matches exactly the [Tab 6 P&P Data walkthrough's
OBI portion](../domain/labor-report.md#tab-6--pp-data) ("88 OBI cols
+ 50 derived = 138 cols × 604 rows"). The version date `8.30.24` is
older than this workbook's snapshot (2026-05-08), so the actual data
differs — but the **schema is the same**. Use this as the canonical
sample for P&P Data importer testing.

### `Payroll Detail - Version 11.8.23 (80).csv`

Per Alex: _"from OBI data from PS, should be accurate, should be source
of truth for expenditure details"_

| Cols | Rows | Header start (first 20) |
|---|---|---|
| 38 | 42,949 | Fiscal Year / Department Group Code / Fund Lvl 1 Code / Fund Lvl 1 Desc / Fund Control / Fund Code / Fund Description / Department Code / Department Description / Project Code / Project Description / Activity Code / Activity Description / Authority Lvl 1 Code / Authority Lvl 1 Description / Authority Code / Authority Description / Account Lvl 2 Description / Account Lvl 5 Name / Account Lvl 3 Description |

**This is the OBI export that becomes the workbook's BI Payroll tab**
but **at an earlier version (FY23 dataset, 38 cols)**. The current BI
Payroll is 39 cols × 110,028 rows (see [Tab 7](../domain/labor-report.md#tab-7--bi-payroll))
— one extra column added since `Version 11.8.23` (likely the
`HR Assignment Appointment Type` column added later, since Tab 7 docs
that column). So `Payroll Detail v11.8.23` is the **predecessor schema**
of `BI Payroll v_current`.

**Implication for KosPos:** importer must handle both 38-col and
39-col variants. Header-driven fingerprint (per [Tab 7 KosPos
improvement #2](../domain/labor-report.md#kospos-improvements-7))
already accounts for this — the importer matches columns by canonical
substring, so adding/removing a column doesn't silently break.

### `BvA - All Fields - Version 10.20.25 (42).csv`

Already documented exhaustively in [`bva.md`](bva.md). 68 cols × 2,710
rows. The reconciliation suite in
[`../audits/bva-reconciliation-suite.md`](../audits/bva-reconciliation-suite.md)
exercises this file end-to-end against the workbook.

## DHR pay rates (1 file)

### `Hourly-Rates-of-Pay-by-Classification-and-Step-FY25-26 (2).xlsx`

Per Alex: _"this is from DHR website, source of truth at time of
creation, may not be updated with rare changes mid-year"_

| Sheet | Rows | Cols | Notes |
|---|---|---|---|
| Steps | 17,116 | 29 | Per-(class, step) hourly rate detail. Cross-tab format with FY25-26 as the implicit header. |
| Ranges | 124 | 20 | MCCP range table for management positions. |

**Implication for KosPos:** this is the canonical source for [`dhr.md` §
Reference data](dhr.md#what-lives-where-for-kospos): the file Alex
typed as the source. `app/src/data/dhr-steps.json` and
`app/src/data/dhr-ranges.json` should re-derive from this. Updated
per FY when DHR publishes (typically 1–2 months after MOU ratification
or the annual fiscal cutover).

## Recent eturns + the labor report itself (2 files)

### `Eturns 5.14.26.xlsx`

| Sheet | Rows | Cols |
|---|---|---|
| Pos 5.14 | 2,055 | 64 |
| Nonpos 5.14 | 1,072 | 49 |

**Role:** a **more recent BFM eturn pull** than the embedded `BFM
15.10.006 FY26` tab in the labor workbook. Same schema as 15.10.006
+ 15.10.001 combined into one workbook with two sheets. The
filename's `5.14.26` is the export date.

**Implication for KosPos:** confirms the eturn refresh cadence is
**at least weekly during budget-prep season**. The labor report's
embedded eturn was the May 7-ish version (matching the workbook's
snapshot date); this `5.14.26` export is a week later. KosPos's BFM
importer should expect frequent refreshes during March–June and rare
refreshes outside.

### `Labor Report 5.21.26.xlsx`

The workbook itself. 29 sheets; documented exhaustively in
[`../domain/labor-report.md`](../domain/labor-report.md).

## How this folder integrates with KosPos's importers

```
example reports/Reports/  <— Alex's working folder; gitignored
  │
  ├── BFM (5 files) ──────────────────→ lib/importers/bfm-*/
  │     15.10.001 chart of accts          - 15-10-001-nonposition-eturn
  │     15.10.006 position eturn ──┬──→   - 15-10-006-position-eturn  (already Phase 2.4 target)
  │     15.15.002 benefit rates    │
  │     15.15.014 jobclass + COLA  │
  │     15.15.016 FTE cost (retiring)
  │
  ├── PS Financials trees (11) ──────→ lib/reference/<tree>/  (Phase 3)
  │
  ├── PS HCM exports (4) ────────────→ lib/importers/ps-hcm-*/
  │     MRG_COMBO_CD_DEPT                 - combo-codes
  │     MRG_HR_EE_ADDL_PAY                - ee-additional-pay
  │     MRG_TL_TASK_PROFILE               - task-profiles
  │     MTL0170 (roster approvers)        - roster-approvers
  │
  ├── OBI exports (3) ───────────────→ lib/importers/obi-*/
  │     Active Labor (P&P) ───────────→   - obi-pnp  (Phase 2.4)
  │     Payroll Detail ───────────────→   - obi-payroll  (Phase 2.4)
  │     BvA ─────────────────────────→   - bva  (Phase 2.4)
  │
  ├── DHR (1)
  │     Hourly Rates ────────────────→ lib/reference/dhr-steps/, dhr-ranges/
  │
  ├── Eturns 5.14.26 ────────────────→ (same path as 15.10.006/15.10.001)
  │
  └── Labor Report 5.21.26 ──────────→ Importer staging only (not in v2)
        (29 sheets; the workbook KosPos is replacing)
```

## Cross-references

- [`bfm.md`](bfm.md) — BFM platform overview; the eturn detail; the
  5 reports above are the BFM section's concrete files.
- [`ps-hcm.md`](ps-hcm.md) — PS HCM platform overview; the 4 PS HCM
  exports above are this section's concrete files.
- [`ps-financials.md`](ps-financials.md) — PS Financials platform
  overview; the 11 chartfield trees + BVA + Payroll Detail are this
  section's concrete files.
- [`dhr.md`](dhr.md) — DHR; the Hourly Rates file is this section's
  concrete file.
- [`obi.md`](obi.md) — the OBI delivery channel.
- [`bva.md`](bva.md) — BVA's full schema + refresh-order timing rule.
- [`../domain/labor-report.md`](../domain/labor-report.md) — the labor
  report workbook deep-dive; § Data Sources Inventory has the
  per-source rollup.
- [`../audits/bva-reconciliation-suite.md`](../audits/bva-reconciliation-suite.md) —
  the BVA file exercised end-to-end.
