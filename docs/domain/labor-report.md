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

### Refresh-order timing — OBI 1-day lag + payroll-to-GL gap + BVA Wed-or-later

A BVA-vs-payroll reconciliation (or any cross-system comparison that
involves the GL) is **only meaningful if both sides reflect the same PP**.
Three coupled constraints govern when each source becomes "current":

1. **Payroll OBI reports run BEFORE payroll actually posts to GL.** A
   BI Payroll pull on a Tuesday morning shows what's posted *so far*, not
   what's about to post that day.
2. **OBI data is 1 business day behind live.** Whatever posted today won't
   be in OBI until tomorrow.
3. **Payroll posts every other Tuesday.**

**Practical rule:** BVA (and any reconciliation against payroll) **must be
run Wednesday or later** after a payday Tuesday to reflect the full PP. A
Tuesday-morning BVA pull is one PP behind BI Payroll, and the apparent
"GL adjustment" of one full PP between the two is a timing artifact, not a
real journal entry.

KosPos UX must surface each snapshot's effective PP alongside the others
(BI Payroll, P&P Data, BVA, eturn) so users can see when two sources are
out-of-sync by timing rather than by data. Same rule applies to the
Inactive view (BI Payroll vs P&P Data both have to be from the same
post-payday cycle for the cross-check to be valid).

See [`../data-sources/bva.md`](../data-sources/bva.md) § Refresh-order
timing rule for the canonical statement.

### Multi-dept generalization caveats (DBI shortcuts to undo)

Catalog of DBI-only assumptions that need to be parameterized for citywide use:

| Shortcut | Lives in | Generalization |
|---|---|---|
| Single COLA % applied to all DBI job classes | Calendar tab (hardcoded) | Per-MOU COLA schedule lookup, joined by job class → bargaining unit |
| Fund 10190 filter (DBI) and Fund 10000 filter (CPC) — mirror shortcuts applied to OPS Summary E36/E37 (DBI Premium/OT GETPIVOTDATA) and E45/E46 (CPC), Step's per-PP SUMIFS, and Report Data Y:AY operating grid | Many tabs | Dept-group → operating-fund set sourced from BFM `Fund Control = "FACCT"`; multi-fund-per-dept-group support |
| TEMPM = COMMN:5380 only | Operating Report `E40` | Definition-aware temp filter (see [`definitions.md`](definitions.md)) |
| 7.65% OT fringe hardcoded | Budget Master (cross-ref OVERM) | OASDI+Medicare derived constant with year-stamped wage cap |
| `15.4 / 26.1` PP constants in OVERM `AW` | Budget Master | Pull live from Calendar `I2 / J2` |
| `BFM 15.10.006 FY26` row addresses | Multi-tab BFM lookups | Lookup by `(dept, account, fund, authority)` not by row index |
| Single "DBI" dept-group rollup | All tabs | Dept-group dimension, default selectable |
| Account Description literals scattered across Step / Report Data / OPS formulas (`"Overtime - Scheduled Misc"` etc.) | Step, Report Data, Operating Report Summary | Central chart-of-accounts map (versioned by effective date); importer warns on Controller-side renames before they break aggregations |
| BI Payroll fund 10190 filter on Step's per-PP SUMIFS | Step | Multi-fund per-position aggregation; per-call fund filter optional |
| `'COMMN:5380'` job-code prefix as implicit citywide knowledge | BI Payroll consumers (Step, Report Data, TEMPM, Inactive) | Strip prefix at import; store `{job_code, job_code_set}` separately |
| Single masked sick-leave bucket (`XXX`) accepted as opaque | BI Payroll (and downstream rollups that absorb it) | Preserve masking; admin-only unmask via separately permissioned upload |
| DBI-only manual lookup table in OBI for `Effective Employee Division` (column CH); CPC rows get the literal `"Update Formula"` placeholder | P&P Data CH (and any view reading it) | Join Position Department ID to citywide `Department Classification Structure` tree; placeholder ceases to exist |
| 11-level `Level 1…11` hierarchy climb materialized in 44 columns next to P&P Data | P&P Data CO:DJ + DL:EG (read by Reporting Tree pivot) | Compute hierarchy lazily by walking `reports_to_position_id`; cap not at 11 |
| `'BI Payroll'!F = 10190` filter on Report Data's per-PP OPERATING grid (Y:AY) — multi-fund via `F IN {10190, 10000}` but DBI+CPC-operating-only | Report Data Y:AY per-position + OVERTIME/PAYOUT catcher blocks | Configurable per-dept operating-fund set; multi-dept join derives operating funds from BFM fund-control = `FACCT` |
| `'BI Payroll'!F <> 10190` filter on Report Data's per-PP CONTINUING grid (BB:CB) — **wrong complement** of the `{10190, 10000}` operating filter; dormant fund-10000 double-count bug | Report Data BB:CB per-position + OVERTIME/PAYOUT catcher blocks | Derive continuing-fund filter as the **complement** of the operating-fund set, not a hardcoded `<>10190` |
| `'BFM 15.10.006 FY26'!AX` (Technical Adjustment) used as the budget anchor in Report Data S; should be `AZ` (Board-adopted) per [Tab 20 § Manual / fragile](#whats-manual--fragile-6) | Report Data S (per-position auto-SUMIFS) + NEWP rows (hand-key); inconsistent with TEMPM OPS E40 which already uses `AZ` | KosPos defaults to **Board-adopted (`AZ`)**; preserves earlier-layer columns (Original / Department / Mayor / Committee / Technical Adjustment) for variance views |
| OVERTIME + PAYOUT catcher blocks DBI-only (18 + 18 rows; **zero CPC**) — under-counts CPC OT/RPO in the dept rollup | Report Data rows 611–628 + 630–647 | Catcher rows generated per `(dept-group, dept)` for every dept in the active scope, not just DBI |
| 100 hand-pasted SPECIAL-block budgets (rows 649–748) refreshed manually each PP from BFM special-class summary rows | Report Data rows 649–748 | Derived live query: `SUM(eturn.budget WHERE account_description = X AND dept_group = Y)` from the BFM importer |
| 6 hand-pasted INACTIVATED YTD actuals (Report Data U755:U760) copied from Inactive tab's pivot each refresh | Report Data INACTIVATED block | Live query: `positions WHERE in_bi_payroll AND NOT in_pnp_snapshot` — no separate paste |
| MERGE row 753 + GL row 762 as ad-hoc placeholders for mid-year KK and GL journals (no systematic capture of chartfield-level adjustments) | Report Data rows 753 + 762 | Dedicated **BVA-driven reconciliation** view: per-chartfield budget delta (KK) + actuals delta (GL); excludes inactive positions |
| Pool positions (multiple incumbents share one Position Number — commissioners, some temps/exempts) carried as duplicate rows in Report Data with COUNTIF-zeroed actuals/budget | Report Data per-position rows (e.g., position 1094089 = 14 rows) | Data Issues flag suggesting one-position-per-person; user decides per-position whether to split |
| OPS Summary block-shape asymmetry (DBI = 6 special-class rows; CPC = 7 with extra MCCP Offset row). Adding/removing a class requires inserting a row + rebasing the residual SUM range (F36:F40 / F45:F50). | Operating Report Summary rows 36–42 + 45–52 | Special-class list driven by dept-group's position population; residual computed over "every class not explicitly named," no row-position dependencies |
| OPS Summary prior-year actual attrition rate (H43 = `-0.15438` literal for DBI; H53 missing for CPC). Hand-keyed annually; methodology not documented; J43 note self-flags as "Questionable." | Operating Report Summary H43 + H53 | Derive from saved end-of-FY snapshot of prior FY; methodology rendered as tooltip |
| OPS Summary G40 references hardcoded BFM rows `AZ1195+AZ1197+AZ1199+AZ1201` for DBI TEMPM Interns total budget. Row addresses shift when BFM republishes the eturn. | Operating Report Summary G40 | SUMIFS by `(dept-group, account-description = "Temporary - Misc")` against the BFM eturn, not row indices |
| OPS Summary H40 hardcoded literal `0` (DBI TEMPM Interns projection) with J40 note "No interns planned at this time." Easy to forget to update when interns are planned mid-year. | Operating Report Summary H40 | "Expected interns this year" input on TEMPM card with COMMN:5380 YTD as baseline; default to "match YTD" not zero |
| OPS Summary CPC E49 / E50 / H49 / H50 absent (MCCP Offset + TEMP have no YTD-actuals or projection; absorbed into 9993 residual). MCCP YTD spend invisible. | Operating Report Summary rows 49 + 50 | Every named special class gets explicit YTD + projection treatment; no implicit-residual absorption |
| OPS Summary uses pure-PP pacing (`G/J2*I2`) in special-class D column while the per-dept rollup D column uses COLA-weighted from Report Data T. Same header ("YTD Operating Budget"), two different math. | Operating Report Summary D36–D51 (special-class) vs D2–D33 (pivot) | All YTD-budget pacing COLA-weighted universally (per memory `feedback_projections_always_cola_aware.md`); straight-line as an optional simplified-view side-note |
| OPS Summary L23 / L32 / L33 ratio (`projected_balance / total_budget`) conceptually different from G42 / H42 attrition rate (`9993 / non-9993`). Both display as %, easy to confuse. | Operating Report Summary L column vs row 42/52 | Separate visual treatment with explicit "leftover %" vs "attrition rate %" labels; tooltips explain the math |
| Premium tab `N5/N6/N7` (DBI) + `O8/O9/O10` (CPC) hardcoded budget literals — refresh annually from BFM eturn. Same pattern as Overtime's `BN6/BN8`; both classes share the "single per-FY refresh point" fragility. | Premium L:Q projection panel + Overtime BK3:BN8 reference panel | Each special-class card pulls its FY budget literals from BFM's special-class summary rows by `(dept-group, account, FY)` lookup, not by hand-keyed cells |
| Premium tab `N7` (DBI total) and `O10` (CPC total) are hardcoded literal sums, not `=SUM(N5:N6)` / `=SUM(O8:O9)` formulas. Salary-share ratio (`N5/N7`) silently drifts if budget literals are updated but total isn't kept in sync. | Premium L:Q projection panel | Derived totals — never literal sums where the components are present |
| Overtime CPC rows inherit DBI's salary-to-total gross-up ratio (`BN8/BN6 ≈ 1.086`) — `BS16/BS17` formulas reference the same `$BN$8` and `$BN$6`. Wrong if CPC's OT-benefit composition differs from DBI's. | Overtime BP:BS projection panel rows 16-17 | Per-dept-group salary-to-total gross-up ratio sourced from each dept-group's own BFM budget |
| Retirement Payout tab `(Multiple Items)` page filter is opaque — the visible cell doesn't show which accounts are selected (510210 + 505060 inferred from posting patterns). A new RPO account added by Controller silently disappears unless someone re-edits the pivot. | Retirement Payout B1 page filter | Explicit account-list in the routing rule; importer flags unrecognized accounts posting to RPO-relevant earnings codes |
| Retirement Payout `OPS!E38` uses `Department Group Code = "DBI"` for GETPIVOTDATA, **not Fund Code** — inconsistent with PREMM/OVERM/STEPM which all filter by fund. Reader expecting same-shortcut pattern would be wrong. | OPS Summary E38 vs E36/E37/E39 | Unify on `sum across dept_group.operating_funds + capital_funds`; RPO needs no different treatment than other classes |
| Retirement Payout earnings codes incomplete — Phase 4 RPO research identified `VPO` + `SVO`; this session (Phase 2.0f) added `CPO` Comp Time Pay Out at row 61 ($7,209 at DBI PS Technical Support); $31k of the snapshot reconciliation gap still unaccounted. | RPO routing rules (importer) | Importer enumerates all `(account, earnings_code)` pairs in BI Payroll posting to RPO accounts; flags unknowns in Data Issues |
| Step tab `BI Payroll!AI` (`Step Indicator = "Y"`) is a **workbook-internal column added on import**, not present in OBI source. Mapping from TRC → step-eligibility is set in the import script. If the mapping drifts, every Step variance silently changes. | Step U:AU + AW:BW per-PP cells | Explicit TRC-to-step-eligibility table in `lib/labor/step-eligibility.ts`, versioned by effective date, with per-TRC MOU citations |
| Step tab `U2` formula subtracts **four hardcoded earnings-code categories** (`"Overtime - Scheduled Misc"`, `"Ret Payout - SP & Vac - Misc"`, `"Premium Pay - Misc"`, `"Temp Misc LumpSum Payoff"`) — residual approach. If Controller renames any, the SUMIFS silently zeroes and the non-step earnings get over-attributed to STEPM. | Step U:AU per-PP cells | Sum positively (only step-eligible $ included) using the TRC step-indicator; eliminates literal account-description subtractions |
| Step tab `COUNTIF($D$2:D2, D2)>1` guard on every per-position cell handles pool positions by zeroing duplicates. Loses per-incumbent visibility + O(n²) recalc cost. | Step R, S, U:AU, AW:BW, BY:CY | Pool positions modeled with explicit `max_headcount > 1` attribute; rollup function attributes one prorated budget share per Position Number |
| Step tab `BY2` per-PP variance assumes **uniform per-PP pay rate** within the FY — doesn't model merit-step events (col AJ of P&P Data). Aggregate sum is correct (actuals also rise post-merit, washes out) but per-PP variance drifts: pre-merit PPs show under-budget, post-merit over-budget. Misleads trend visualization. | Step BY:CY per-PP variance | Per-PP proration uses expected rate at that PP, derived from each employee's step history + future Merit Increase Date |
| Step tab folds **MCCP positions into STEPM**. Same per-position variance shape, but conceptually wrong — MCCP positions should post to 9994 MCCP Offset (separate account, separate reference data: DHR MCCP-range table vs DHR salary-steps table). DBI's small MCCP population (Deputy Directors) leaks into DBI STEPM; CPC's larger MCCP population is sort-of-correctly attributed to CPC but only because `SUMIFS("Planning")` happens to pick it up. | Step tab + OPS Summary rows 39/48/49 | KosPos splits MCCP into its own tab (per Alex's flag in Phase 2.0f session prompt). STEPM filters to `job_class.is_mccp = false`; 9994 filters to `job_class.is_mccp = true`. |

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
| 6 | P&P Data | **done 2026-05-25** | Importer staging (PS HCM P&P) + Position entity |
| 7 | BI Payroll | **done 2026-05-25** | Importer staging (OBI BI Payroll) + per-position drill-down |
| 8 | Roster Approvers | pending | Roster management feature |
| 9 | EE Additional Pay | pending | Acting-pay / supervisory-pay audit |
| 10 | Probation | pending | Probation tracker (user-input feature) |
| 11 | Eligibility Lists | pending | DHR scrape + eligibility lookup |
| 12 | TEMP Limits | pending | Temp-employee expiration tracker |
| 13 | Inactive | pending | Cross-system reconciliation (inactive positions) |
| 14 | Separations | pending | Pending-separations tracker (user-input) |
| 15 | Succession | pending | Succession planning (draft feature) |
| 16 | Premium | **done 2026-05-25** | Premium-pay YTD + projection view |
| 17 | Overtime | **done 2026-05-25** | Overtime YTD + projection view |
| 18 | Step | **done 2026-05-25** | Step-savings YTD + projection view (MCCP split to dedicated tab) |
| 19 | Retirement Payout | **done 2026-05-25** | RPO YTD + projection view |
| 20 | Report Data | **done 2026-05-25** | **Core dataset** — labor positions × budget × actuals × projection |
| 21 | Reporting Tree | pending | Org-chart preview + data-quality flags (lite Phase 7) |
| 22 | Pos by Dept | pending | Filtered view of Report Data (low priority) |
| 23 | Vacancies and TEMP | pending | Vacancies + TEMP filter, feeds Staffing Plan |
| 24 | Staffing Plan | pending | **Staffing Plan workspace** — hiring plan |
| 25 | Budget Summary | pending | BY+1 cost rollup (low priority) |
| 26 | Operating Report Summary | **done 2026-05-25** | **Headline projection page** |
| 27 | Operating Report Detail | **done 2026-05-25** | Drill-down for projection variance review |
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
- [x] Confirm `'BI Payroll'!X` is the canonical PPE column in the OBI BI Payroll
      export (will resolve during BI Payroll walkthrough; if it's a different column,
      `H2` formula needs adjusting per FY). **Resolved 2026-05-25 (Tab 7 walkthrough):**
      column X = "Earning Period End Date" confirmed.
- [ ] Decide where the `job class → bargaining unit` lookup lives — `domain/dhr.md`
      or a separate `domain/bargaining-units.md`?
- [ ] Settle the per-projection-page UI for the pure-vs-COLA-aware delta: always show
      both, or show only when the delta exceeds a threshold (e.g., >0.5%)?

---

### Tab 6 — P&P Data

**Status:** walkthrough — done 2026-05-25

**Purpose:** The **position-and-personnel snapshot** for the workbook. One row per
active or proposed position in DBI + CPC (604 positions at this snapshot, mirroring
the DBI/CPC merger-prep scope already noted for BI Payroll). Carries position
identity, classification, incumbent person details, manager linkage, RTF status,
budget linkage, and chartfield mappings. P&P Data is the **position spine** of the
workbook in the same way that BI Payroll is the **actuals spine**: Report Data joins
to it; Inactive cross-references it; EE Additional Pay / Reporting Tree / Pos by
Dept / Vacancies and TEMP / TEMP Limits / Staffing Plan / Step all pull from it
(via XLOOKUP or pivot caches). Rename a column upstream and the entire downstream
chain breaks silently — same blast-radius problem as BI Payroll.

**Snapshot scope.** 604 data rows × 138 columns (A:EH) at this snapshot. Columns
A:CJ (88) are the OBI export; CK:EH (50) are derived in the workbook. Distribution:

- **Position Status:** 536 Approved + 68 Proposed.
- **Position Fill Status:** 490 FILLED + 87 VACANT + 21 PARTIALLY FILLED + 6 OVER FILLED.
- **Department spread:** DBI Inspection Services (153) / CPC Current Planning (144) /
  DBI Permit Services (111) / DBI Administration (73) / six other CPC divisions (123).
- **Appointment types:** PCS (429), ELC (35 — elected/commissioner), PEX (29), TEX
  (19), TPV (5 — Temporary Provisional, CS Rule 114.5), blank=vacant (87).

#### Data sources

- **Source system:** OBI (Oracle Business Intelligence), labor-report query over
  PS HCM Position + Job + RTF tables. See [`../data-sources/obi.md`](../data-sources/obi.md)
  and [`../data-sources/ps-hcm.md`](../data-sources/ps-hcm.md).
- **Refresh cadence:** Alex re-runs the OBI query manually — typically when he
  re-pulls BI Payroll on paydays, or any time a significant position change happens
  between paydays. Full snapshot replaces the prior export.
- **Snapshot field:** Column A `Snapshot Date` = 2026-05-20 in this export (a
  Wednesday, two business days before the 5/21 workbook timestamp). Snapshot date is
  recorded *in the data*, not just the filename — an improvement over BI Payroll.
- **v1 KosPos mechanism:** user uploads each P&P snapshot; importer treats it as
  **full-replace per snapshot** (same model as BI Payroll). Snapshot history preserved
  so position-change history (job-code reclassifications, reports-to moves, employee
  assignments) can be diffed.
- **v2 KosPos mechanism:** Snowflake direct query when the data platform exposes the
  source.

#### Companion reference dataset — citywide department tree

The workbook silently depends on a **citywide department classification tree** that
does *not* live in P&P Data itself but is required to fix the CH `Effective Employee
Division` placeholder for non-DBI positions. Available as `Department Classification
Structure (16).csv` (14,240 rows, 64 dept groups across SF) from the same OBI report
library; refreshed periodically as new codes are added.

KosPos importer joins each position's `Position Department ID` (col G) against this
tree to resolve the full hierarchy: Department Group → Division → Section → Unit →
Sub-Unit → Department Code + Description. This eliminates the workbook's "Update
Formula" placeholder pattern (see § Manual / fragile).

Other chartfield trees live in the same OBI folder (Account, Activity, Authority,
Fund, Project, WBS, Agency Use, Account Budget Control, Department Budget Control,
TRIO) and become reference data when the corresponding KosPos modules need them.
Only the Department tree is documented here.

**UX convention (Alex):** every chartfield rendered anywhere in the app must show
**code AND description** in the same control (e.g., `229235 — CPC Current Planning`,
not one or the other). Applies to all chartfield types, not just department.

#### Department-code semantics (critical to model correctly)

Three different "department" concepts collide in P&P Data, and the workbook treats
them as distinct columns. KosPos must preserve the distinction:

| Concept | P&P Data column(s) | Mutability | Used for |
|---|---|---|---|
| **Budgeted department** | CB Budget Department Code 1 / CC Budget Department Description 1 | **Locked at budget adoption**; cannot change mid-year | Which department owns the budgeted FTE / position count |
| **Effective department** | CE Employee Department Code / CF Employee Department Description / CG Effective Employee Department (rolled-up text) | Mutable any time in PS HCM | Where the employee actually works (reports physically / functionally) |
| **Combo department** | BD Combo CD DEPTID / BE Combo CD DEPT Description | Set per-employee via combo code | What chartfield string payroll posts to |

**Default behavior:** payroll posts to the budgeted position's chartfields. **When
an employee moves mid-year**, the position's effective department updates in PS HCM
but the budget cannot change until the next budget cycle. To redirect payroll to the
new department's chartfields, a **combo code** must be added for that employee. The
combo code is the bridge between effective-department changes (any time) and
budgeted-department locks (annual).

This three-way modeling is why the workbook has so many "department" columns.
KosPos must:

1. Store all three on the Position record explicitly: `budgeted_dept`,
   `effective_dept`, `combo_dept`.
2. Surface mismatches as Data Issues (e.g., `effective_dept ≠ budgeted_dept ∧
   combo_dept = budgeted_dept` → "employee moved but no combo code added, payroll
   still charges old dept").
3. Show all three in any Position Detail view, with labels, so users don't conflate
   them.

#### Formulas / structure — OBI export columns (A:CJ, 88 columns)

Grouped by purpose. The full inventory follows.

##### Identity (A:N) — position metadata

| Col | Header | Type | Notes |
|---|---|---|---|
| A | Snapshot Date | date | OBI run date — 2026-05-20 in this snapshot |
| B | **Position Number** | int | **PS HCM position number; primary key** |
| C | Position Job Code | int | 4-digit SF job class (`1450`, `5380`, etc.) |
| D | Position Description | text | Job-class display name |
| E | Position Status | text | `Approved` (536) / `Proposed` (68) |
| F | Position Division | text | DBI/CPC division ("DBI Inspection Services", etc.) — DBI-only nine values + one Zoning |
| G | Position Department ID | int | 6-digit PS HCM dept code; joins to the citywide dept tree |
| H | Position Department Description | text | |
| I | Position Max Headcount | int | Almost always 1 (563); pool positions show 30 / 7 / 10 / 3 / 2 for as-needed temps |
| J | Position Full Part Time Description | text | `Full-Time` (595) / `As Needed` (7) / `Reg Work Schedule<1,040 Hours` (2) |
| K | Position Regular or Temporary | text | `R` for all 604 — every position is *regular* at this snapshot. The *appointment* can still be temporary (see AF/AG). |
| L | Position TX Job Code | text | TX (Transit Authority) job-code mapping — empty for DBI/CPC |
| M | Position Fill Type | text | `PERMANENT` (491) / `PERMANENT EXEMPT` (71) / `TEMPORARY EXEMPT` (35) / `None` (7) — the *position's intended* fill type, distinct from the appointment mechanism |
| N | Position Fill Status | text | `FILLED` (490) / `VACANT` (87) / `PARTIALLY FILLED` (21) / `OVER FILLED` (6) |

`K` (position regular/temp) is *position-level*; `AF` (employee appointment type) is
*appointment-level*. A row can have `K=R ∧ AF=TEX` (a temp-exempt incumbent in a
regular position). Central to [appointment-types.md § exempt class vs exempt
appointment](appointment-types.md#exempt-class-vs-exempt-appointment).

##### Vice / acting (O:V)

| Col | Header | Type | Notes |
|---|---|---|---|
| O | Position Filled Headcount | int | How many bodies currently occupy this position |
| P | Employee ID Vice 1 | int | Primary acting / "vice" person |
| Q | Employee Name Vice 1 | text | |
| R | Employee ID Vice 2 | int | Secondary acting / vice |
| S | Employee Name Vice 2 | text | |
| T | Previous Employee | text | Who held the position before (if known) |
| U | Position Used For | text | `Acting Assignment` (8 rows) — marks positions whose seat supports an acting role |
| V | Position Used For Description | text | The position number being supported (when U is `Acting Assignment`) |

Vice 1/2 names the person acting in *this* position; Position Used For names the
*position the acting person is acting in*. A clean acting relationship requires both
pointers; many positions have one without the other.

##### Person / incumbent (W:AC)

| Col | Header | Type | Notes |
|---|---|---|---|
| W | Current Employee ID | int | Empl ID of the current incumbent |
| X | Current Employee Rcd | int | PS HCM `EMPL_RCD` (multi-job indicator: 0 = primary) |
| Y | Employee Status | text | `A` (511) / `L` on leave (6) / blank vacant (87) |
| Z | Person Full Name | text | "Last,First [M]" |
| AA | Employee First Name | text | |
| AB | Employee Last Name | text | |
| AC | Preferred Name | text | Override for display |

##### Classification / compensation (AD:AJ)

| Col | Header | Type | Notes |
|---|---|---|---|
| AD | Employee Job Code | int | **Can differ from C** when incumbent is acting in a different class |
| AE | Employee Job Description | text | |
| AF | **Employee Appointment Type** | text | `PCS` (429) / `ELC` (35) / `PEX` (29) / `TEX` (19) / `TPV` (5) / blank vacant (87). ELC = elected/commissioner; TPV = Temporary Provisional (CS Rule 114.5). See [appointment-types.md](appointment-types.md). |
| AG | **EE Exempt Category Description** | text | Charter §10.104 sub-section name. 12 distinct values in this snapshot — `00 Not Exempt` (434), `03 Comsnrs, Boards & Committee` (35), `18 Special Proj - Limited Term` (26), `06 Deputy Dept Heads` (6), `C2 Temp Exempt Retiree` (4), `08 Conf. Secty/Exec Asst` (3), `17 Substitutes for EE On Leave` (3), `12 Prof Services (CSC)` (2), `04 Comm Board Secretary` (2), `05 Dept. & Agency Heads` (1), `16 Temp & Seasonal` (1), `__NOT_APPLICABLE__` (87 vacant) |
| AH | Employee Step | int | Step within the class's salary range |
| AI | Employee Hourly Rate | numeric | Snapshot rate from PS HCM (pre mid-year COLA bump if applicable) |
| AJ | Employee Merit Increase Date | date | Drives next step advance |

##### Reporting line (AK:AN)

| Col | Header | Type | Notes |
|---|---|---|---|
| AK | **Position Reports To** | int | **Position-to-position parent edge** — the supervisor's *position number*, not name |
| AL | Manager First Name | text | Resolved name of the incumbent of AK's position |
| AM | Manager Last Name | text | |
| AN | Manager Name Vice 1 | text | When the manager's position is vacant or acting, this gives the acting incumbent |

##### PCS leave (AO:AS) — current leave from a permanent position

| Col | Header | Type | Notes |
|---|---|---|---|
| AO | PCS Leave Date | date | When the employee went on PCS leave |
| AP | PCS Leave Appointment Type | text | The appointment type they're on leave from |
| AQ | PCS Leave Job Code | int | |
| AR | PCS Leave Department Group | text | |
| AS | PCS Leave Position Number | int | Position they're on leave from (links to a Cat 17 backfill chain) |

##### Contact / Cat 17/18 tracking (AT:AY)

| Col | Header | Type | Notes |
|---|---|---|---|
| AT | Work Phone | text | |
| AU | IAM Email Address | text | `firstname.lastname@sfgov.org` |
| AV | CAT_17_18 Appointment Date | date | When the time-limited TEX appointment started |
| AW | **CAT_17_18 Exempt Code** | text | `17` (3) / `18` (26) / blank (575). **Column tracks ONLY Cat 17 and Cat 18** — the two date-bounded non-renewable categories. Cat 16 (hours-based) and C2 (Temp Exempt Retiree) appear in AG but NOT here. |
| AX | CAT_17_18 Exempt Months | int | Months allowed under the category (typically 24 for Cat 17, 36 for Cat 18) |
| AY | CAT_17_18 Exempt TX Expired Date | date | When the appointment expires (drives TEMP Limits date warnings) |

##### Roster (AZ:BA)

| Col | Header | Type | Notes |
|---|---|---|---|
| AZ | Roster Code | text | 5-char roster (matches BI Payroll col AA); links to Tab 8 Roster Approvers |
| BA | Roster Code Description | text | |

##### Combo / chartfield (BB:BH)

| Col | Header | Type | Notes |
|---|---|---|---|
| BB | Combo Code | int | PS chartfield-string combo |
| BC | Combo CD Fund Code | int | |
| BD | Combo CD DEPTID | int | **Combo department** — see § Department-code semantics |
| BE | Combo CD DEPT Description | text | |
| BF | Combo CD Project ID | int | |
| BG | Combo CD Activity | int | |
| BH | Combo CD Authority | int | |

##### RTF — Request to Fill (BI:BN)

| Col | Header | Type | Notes |
|---|---|---|---|
| BI | Latest RTF ID | text | e.g., `RTF0120903` |
| BJ | RTF Request Action | text | `FILL A VACANT POSITION` (292) / `FUTURE VACANCY` (201) / `BACKFILL` (12) / `MODIFICATION` (10) / blank (89) |
| BK | RTF Submitted Date | date | |
| BL | RTF Status | text | `APPROVED` (532) / `IN WORKFLOW` (3) / `DENIED` (3) / blank (66) |
| BM | RTF Approval Step | text | `Completed` (532) / `Rejected` (3) / `Controller/Mayor` (2) / `DHR-CS` (1) / blank (66) — workflow position |
| BN | RTF Expected Fill date | date | Drives the vacancy-fill projection |

[appointment-types.md](appointment-types.md) is correct that "RTF" is internal
SFDHR / PeopleSoft vocabulary for the Rule 113 Personnel Requisition workflow.
KosPos preserves the RTF label because the data carries it, but presents it as the
operational concept it is.

##### Budget (BO:CD) — budgeted attributes per the FY ASO

| Col | Header | Type | Notes |
|---|---|---|---|
| BO | Budget Position Number | int | Usually `= B` but can diverge after re-pos / split |
| BP | Budget Position Primary Job Code | int | |
| BQ | Budget Temp Position | text | `Y` (35) / `N` (525) / blank (44) |
| BR | Budget Position Total FTE | numeric | |
| BS | Budget Fiscal Year | int | `2026` everywhere in this snapshot |
| BT | BUD_SEQ_KEY 1 | int | PS Budget internal key |
| BU | Budget Job Code 1 | int | |
| BV | Budget Job Description | text | |
| BW | Budget FTE 1 | numeric | |
| BX | Budget Project Code 1 | int | |
| BY | Budget Activity Code 1 | int | |
| BZ | Budget Fund Code 1 | int | |
| CA | Budget Authority 1 | int | |
| CB | Budget Department Code 1 | int | **Budgeted department** |
| CC | Budget Department Description 1 | text | |
| CD | Split Funded | text | `No` (593) / `Yes` (11) — position funded across multiple chartfields. The `1` suffix on BT:CC implies further numbered columns (`2`, `3`, …) would exist when more than one split is in play; not present in this snapshot. |

##### Effective department + vacancy tracking (CE:CJ)

| Col | Header | Type | Notes |
|---|---|---|---|
| CE | Employee Department Code | int | |
| CF | Employee Department Description | text | |
| CG | Effective Employee Department | text | Rolled-up text (typically = CF) |
| CH | Effective Employee Division | text | **Manual OBI lookup table; DBI-only**. 267 CPC rows (44%) carry the literal string `"Update Formula"`. KosPos derives this from the citywide dept tree. See § Manual / fragile. |
| CI | Vacant Date | date | When the position became vacant (drives RTF date / TEMP backfill logic) |
| CJ | Vacant TEMP | text | `Y` (14) / blank (590) — marks positions held vacant for an incoming TEMP-track candidate |

#### Formulas / structure — derived columns (CK:EH, 50 columns)

Six groups; **none come from OBI** — all are computed in the workbook.

1. **Cross-tab status (CK:CL)** — lookups *out of* P&P Data, not derivations *within* it.
   - `CK Exclude = XLOOKUP(B, 'Report Data'!D, 'Report Data'!R)` — reads a manual
     exclusion flag from Report Data's `R` column. `Y` (11 rows) excludes the
     position from various downstream rollups.
   - `CL Included In Staffing Plan = IF(XLOOKUP(B, 'Staffing Plan'!B, 'Staffing
     Plan'!B, "") = "", "", "Y")` — checks whether this position has a Staffing
     Plan entry. 60 of 604 positions have entries.
2. **Formatted IDs (CM:CN)** — zero-padded 8-digit position-number strings used by
   the hierarchy climb.
   - `CM Pos # Formatted = TEXT(B, "00000000")`.
   - `CN Rep To # Formatted = TEXT(AK, "00000000")`.
3. **Hierarchy climb (CO:DJ)** — 22 columns implementing an 11-level reports-to
   walk. Shape:
   - `CO Level 1 = IF(AK="", CM, "")` — a position is its own L1 when it has no
     Reports-To.
   - `CP L1C = IF(CO="", "", COUNTIF(CO$2:CO2, "??*"))` — a sequence number per L1
     entry.
   - For levels 2–11: `Level N = IF(ISERROR(XLOOKUP($CN, prior-level-col,
     $CM:$CM)), "", $CM)` — walks one step up by asking "what `L(N-1)` position has
     my Reports-To as its own position number?".

   Each level rebuilds in place on every recalc. Tolerable at 600 rows × 11 levels;
   does not generalize to a citywide org with deeper chains.
4. **Employee Level array formula (DK)** — array formula constructs a display string
   like `"L05-#1450-00304335-1450/1450-Suzette Parinas"` for the position, used by
   Reporting Tree.
5. **Per-level filtering and naming (DL:EG)** — 22 columns (`1R` through `11R` +
   `1RC` through `11RC`). `R` columns hold formatted position+name strings; `RC`
   columns hold the trailing name component (cleaned via
   `RIGHT(R, LEN(R) - 19)`). Reporting Tree consumes the `RC` columns as the
   visible names of each level.
6. **Pay differential (EH) `Rep To Pay Above`** —
   `IFERROR(IF(N="VACANT", "", (XLOOKUP(CN, CM, AI) - AI) / XLOOKUP(CN, CM, AI)), "")`.
   Percent difference between this employee's hourly rate and the rate of the
   incumbent in their Reports-To position. Negative when the employee earns *more*
   than their supervisor — a supervisory-differential audit signal. Feeds EE
   Additional Pay's `Sum of Rep To Pay Above` pivot.

#### TEMP-category column reconciliation (resolves Calendar walkthrough open question)

The workbook tracks temp/exempt categories in **two different columns** with **two
different scopes**:

| Column | Scope | Values in this snapshot |
|---|---|---|
| `AG EE Exempt Category Description` | **All** Charter §10.104 sub-categories + `C2 Temp Exempt Retiree` + `00 Not Exempt` | 12 distinct: 00, 03, 04, 05, 06, 08, 12, 16, 17, 18, C2, `__NOT_APPLICABLE__` |
| `AW CAT_17_18 Exempt Code` | **Only** the two date-bounded non-renewable cats (17 and 18) | 17 / 18 / blank only |

Both prior descriptions are correct, just measuring different things:

- **[definitions.md "16/17/c2"](definitions.md)** describes the *full TEMP cohort*
  relevant for temp-hour tracking — Cat 16 (hours-based) + Cat 17 + C2 Temp Exempt
  Retiree. Cat 18 isn't in this list because Cat 18 is special-project special-class
  on a date clock — not the same operational category as the short-term temps.
- **Tab 12 TEMP Limits "16/17/18"** describes the *time-limit-tracking cohort* the
  tab surfaces: Cat 16 (hours-tracked via BI Payroll's `1,040 − SUMIFS(hours)`
  formula) and Cat 17 / 18 (date-tracked via AV / AW / AX / AY).

KosPos models all three:

- `appointment.exempt_category` — free-form taxonomy from AG, mapped to
  [appointment-types.md](appointment-types.md).
- `appointment.cat_17_18_expiry_date` — only set for Cat 17 / 18 appointments.
- `appointment.cat_16_hours_remaining` — derived, only for Cat 16, computed from
  BI Payroll using the TEMP Limits formula. C2 (Temp Exempt Retiree) gets its own
  field; CalPERS sets hour rules for retiree returnees separately from the
  §10.104 categories.

#### How each downstream tab consumes P&P Data

Reference table so future per-tab walkthroughs can lean on this section instead of
re-deriving the join shapes.

| Tab | Mechanism | Volume | What it pulls |
|---|---|---|---|
| **Report Data** (Tab 20) | XLOOKUP (248) + pivot 17 | 124 lookups on Position Number; 28 each on `CH` (Effective Emp Div), `CB`+`CC` (Budget Dept), `BE` (Combo Dept Desc); pivot exposes 17 row fields | The position spine — every row in Report Data has a corresponding row here, or is flagged in Inactive |
| **Inactive** (Tab 13) | XLOOKUP (2,556) | 1,278 lookups on Position Number (`B`); 639 each on `H` (Pos Dept Desc) and `F` (Pos Division) | Reconciliation: positions paid in BI Payroll but absent from P&P (separated temps whose position was inactivated). `F2 = XLOOKUP(A2, 'P&P Data'!B:B, 'P&P Data'!B:B)` confirms "this position number exists in P&P"; blank result means it's truly inactive |
| **Staffing Plan** (Tab 24) | XLOOKUP (1,844) | Pulls position metadata when a hiring plan entry references an existing position: `D` (Pos Desc), `CG` (Effective Emp Dept), `BP` (Budget Pos Primary Job Code), `AL`+`AM` (Mgr First+Last), `T` (Previous Employee), `CI` (Vacant Date), `AD` (Emp Job Code), `AF`+`AG` (Appt Type, Exempt Cat), `AH` (Step), `AZ`+`BA` (Roster) | Pre-fills hiring plan rows with current position state |
| **Step** (Tab 18) | Pivot 14 (cache 1) | 17 row fields | Per-position frame that the YTD Operating STEP Actual SUMIFS (from BI Payroll) joins to |
| **Pos by Dept** (Tab 22) | Pivot 19 | 18 row fields + 2 page filters (`Exclude`, `Included in Staffing Plan`) + count data field | Position census by department |
| **Vacancies and TEMP** (Tab 23) | Pivot 20 | Same as Pos by Dept + `Vacant TEMP` + `Pos # Formatted` | Vacancy + TEMP filter view; feeds Staffing Plan |
| **TEMP Limits** (Tab 12) | Pivots 5, 6, 7 (cache 1) | Job Code, Empl Rcd, Emp First, Job Desc, Appt Type, `CAT_17_18 Exempt Code`, `CAT_17_18 Exempt Months`, Roster, Effective Emp Dept, Vacant Date (+ Step + Exempt Cat in pivot 7) | Per-position frame for temp-expiration tracking |
| **Reporting Tree** (Tab 21) | Pivot 18 (cache 4) | 24 row fields plus the derived `2RC` … `11RC` level codes | Org-chart hierarchy display (rendered as a tree via the level codes) |
| **EE Additional Pay** (Tab 9) | Pivots 3 + 4 (cache 4) | Pivot 3: Position Used For Description, Current Employee ID, Employee First Name (acting / supervisory-pay audit). Pivot 4: appointment type + manager fields + `Sum of Rep To Pay Above` data field | Audit acting and supervisory-differential anomalies |

10 pivot tables across 8 sheets are sourced from P&P Data via **two cache
definitions** (cache 1: 137 fields covering through `CL`; cache 4: 138 fields
covering through `EH`).

#### What's manual / fragile

- **`CH Effective Employee Division = "Update Formula"` for every CPC row (267 /
  44%).** Alex built a manual lookup table *inside the OBI report* that only knows
  DBI's departments; non-DBI positions get the literal "Update Formula" placeholder
  flagging that the lookup needs updating. This is the same merger-driven CPC
  inclusion shortcut already noted for BI Payroll. **KosPos fix:** join Position
  Department ID to the citywide [Department Classification Structure](#companion-reference-dataset--citywide-department-tree)
  and derive the full hierarchy (Dept Group / Division / Section / Unit / Sub-Unit)
  at display time. Placeholder ceases to exist.
- **Cross-tab columns (CK, CL) silently depend on the consumer tab existing.**
  `CK Exclude` reads `Report Data!R`; `CL Included In Staffing Plan` reads
  `Staffing Plan!B`. If those tabs are renamed, regenerated, or restructured (Report
  Data shifted columns, Staffing Plan tab renamed), these lookups silently return
  blanks and the downstream pivots' page filters on `Exclude` / `Included In
  Staffing Plan` cease to work. The columns aren't *inputs* to P&P Data — they're
  materialized views sitting in P&P's space.
- **The 11-level hierarchy climb (CO:DJ + DL:EG, 44 columns) is per-row
  XLOOKUP-walked at recalc.** Inserting a new position with an unbroken chain to
  root is fine; inserting one with a broken Reports-To creates an `#N/A` somewhere
  in the climb that propagates through `DL:EG` and into the Reporting Tree pivot.
  No validation step.
- **Hierarchy depth is capped at 11 levels.** A 12-level chain (rare but possible
  in citywide rollout) would silently truncate.
- **`AK Position Reports To` semantics are position-to-position, not
  name-to-name.** Renaming a manager doesn't break Reports-To; *moving the manager
  out of their position* without re-pointing the reports does. Confusion source:
  the resolved manager **name** (AL/AM) updates automatically when AK's incumbent
  changes, so users can mistake AL/AM as the source of truth.
- **`AF` appointment type can disagree with `AG` exempt category in ways the docs
  don't fully resolve.** In this snapshot: 15 rows are `AF=PEX ∧ AG="18 Special
  Proj - Limited Term"` — but [appointment-types.md](appointment-types.md) defines
  PEX as Charter §10.104 subs 1–15 + 19, and Cat 18 should be TEX. Likely cause:
  Exempt-to-Permanent conversion (per [appointment-types.md § Exempt class vs
  exempt appointment](appointment-types.md#exempt-class-vs-exempt-appointment))
  where the appointment converts but the position's exempt-category designation
  persists. Worth surfacing in Data Issues rather than silently treating AG as
  authoritative.
- **`Vice 1` (P/Q) and `Position Used For` (U/V) are two separate Vice
  mechanisms.** Vice 1 names the person acting in *this* position; Position Used
  For names the *position the acting person is acting in*. A clean acting
  relationship requires both pointers; many positions have one without the other.
- **`Snapshot Date` (A) is consistent across all rows** — there's no per-position
  effective-dated history within a single snapshot. To track "when did position
  X's reports-to change," KosPos needs to keep per-snapshot history (same diff
  feature already planned for BI Payroll).
- **No defensive header-name sniff on the OBI export.** Every downstream XLOOKUP
  and pivot reference uses literal column letters. Adding or reordering a column
  in the OBI report breaks the workbook silently. Same blast-radius problem as
  BI Payroll.
- **`L`, `K`, and `BS` are constants in this snapshot but unenforced.**
  `L Position TX Job Code` is empty for all 604 rows; `K Position Regular or
  Temporary` is `R` everywhere; `BS Budget Fiscal Year` is `2026` everywhere.
  Reasonable to keep them as columns (they vary across departments / fiscal
  years) but downstream formulas don't realize they're constant.
- **No combo-code mismatch detector exists in the workbook.** When an employee
  moves departments mid-year, a combo code must be added to redirect payroll. The
  workbook gives you three columns (`CC`, `CG`, `BE`) but no flag that "these
  three disagree in the bad way." Easy to miss; payroll silently charges the old
  dept's budget.

#### KosPos improvements

##### 1. Position is a first-class entity; P&P Data is a snapshot import

P&P Data isn't a "tab" in KosPos — it's the source for the **Position** entity that
the entire app revolves around. The importer parses each P&P snapshot into Position
records with explicit fields for the three department concepts (budgeted, effective,
combo), the two appointment columns (mechanism in `AF`, exempt category in `AG`),
RTF state, Cat 17/18 expiry tracking, and an explicit reports-to position pointer.

**Derived columns (`CK Exclude`, `CL Included In Staffing Plan`, `CH Effective
Employee Division`, the 44-column hierarchy climb, `EH Rep To Pay Above`) do NOT
become Position fields** — they're computed views:

- **Exclude** → user annotation; persists with the Position as `exclude_from_rollups`.
- **Included In Staffing Plan** → derived query — ask the Staffing Plan if it
  contains this position; never materialized on the Position record.
- **Effective Division** → derived join — look up `Position Department ID` in the
  citywide dept tree; never materialized.
- **Hierarchy climb** → derived walk of `reports_to_position_id`; never materialized.
- **Rep To Pay Above** → derived query at view time from the position's hourly rate
  and its reports-to position's incumbent's rate.

##### 2. Snapshot history + diff (mirrors BI Payroll improvement #1)

Each P&P snapshot is preserved with its `Snapshot Date`. Snapshot diff surfaces
per-position changes: reports-to moves, employee transitions, RTF status changes,
vacancy-date appearances/disappearances. Powers a "What changed since last
snapshot?" view the workbook can't provide.

Importer is idempotent (uploading the same snapshot twice produces no change);
uploading a same-day re-pull warns rather than overwriting silently.

##### 3. Header-driven fingerprint import (same pattern as BI Payroll)

Match OBI columns by canonical-name substring, not by letter position. Critical
fingerprints:

| Fingerprint | KosPos field | Why critical |
|---|---|---|
| "position number" | `position.id` | Primary key |
| "position reports to" | `position.reports_to_position_id` | Hierarchy spine |
| "position job code" | `position.job_code` | Classification |
| "position fill status" | `position.fill_status` | Vacancy logic |
| "current employee id" | `position.incumbent_employee_id` | Person link |
| "employee appointment type" | `appointment.type` | Tenure rules |
| "ee exempt category description" | `appointment.exempt_category` | Charter §10.104 sub |
| "cat_17_18 exempt code" + "expired date" | `appointment.cat_17_18_*` | Time-limit enforcement |
| "vacant date" / "rtf expected fill date" / "rtf status" | `position.vacancy_state.*` | Vacancy projection |
| "budget department code 1" / "budget fte 1" / "budget position primary job code" | `position.budget.*` | Budget linkage |
| "combo cd dept description" | `position.combo_dept` | Chartfield mapping |
| "effective employee department" | `position.effective_dept` | Operational dept |

A missing fingerprint at import time blocks the import with a clear "column not
found" error rather than silently producing zeros.

##### 4. Citywide department tree as a companion reference dataset

Import `Department Classification Structure.csv` once (refresh whenever new dept
codes are added). The Position importer joins each position's `Position Department
ID` against the tree at load time and exposes the full hierarchy (Dept Group →
Division → Section → Unit → Sub-Unit) as derived attributes. **The workbook's
"Update Formula" placeholder ceases to exist** because the join works for all 64
dept groups, not just DBI.

The other chartfield trees in the same OBI folder (Account, Activity, Authority,
Fund, Project, WBS, Agency Use, Account Budget Control, Department Budget Control,
TRIO) become Phase 3 / 4 / 5 reference data when their consuming modules need them.

**UX convention:** every chartfield rendered in the app shows **code AND
description** in the same control (e.g., `229235 — CPC Current Planning`). Per Alex.

##### 5. Three departments modeled explicitly

Position record carries `budgeted_dept`, `effective_dept`, and `combo_dept` as
named, distinct fields (each with `code` + `description`). The Position Detail
page shows all three with labels, so users don't conflate them. Data Issues
surfaces mismatches that suggest a missing combo code — e.g., `effective_dept ≠
budgeted_dept ∧ combo_dept = budgeted_dept`. Catches the "employee moved
mid-year but nobody added a combo code so payroll is still charging the old
dept's budget" failure mode.

##### 6. Reports-To validation — error-vs-noise framework (sketch)

Reports-To should be the **supervisor**: the person who approves timesheets and
expense reports. For most staff this is clear. It gets fuzzy at the top of the
organization:

- **Commissioners** report formally to no one in the department. In practice the
  commission secretary approves their timesheets — but the secretary doesn't
  supervise them.
- **Department heads** report formally to the mayor (or the board/commission per
  Charter) but the mayor doesn't approve their timesheets. In practice the
  director's secretary or admin handles approvals.

KosPos's validation should distinguish:

- **Hard errors:** Reports-To references a Position Number that doesn't exist;
  cycles (A → B → A); climb depth exceeds a sane bound (15?).
- **Likely errors needing review:** an in-department position with no Reports-To
  *and* a Position Fill Type of `PERMANENT` (not Commissioner / Dept Head); a
  manager with an empty incumbent position holding subordinates; a Reports-To
  pointing at a separated employee's old position.
- **Noise (expected):** Reports-To blank on Commissioner / Dept Head / elected
  positions (they report outside the department); operational reporting via
  "manager's secretary approves timesheets" — surface separately as an
  *Operational Approver* attribute distinct from formal reports-to.

This framing is a sketch. Full rule set deserves its own session, likely after the
Reporting Tree (Tab 21) walkthrough. **The app's correction-list feature is a
major surface area:** users want a generated list of "things that look wrong,
please confirm" rather than silent failure or blocking errors.

##### 7. Hierarchy climb is computed, not materialized

The workbook's 44 columns of `CO:DJ + DL:EG` hierarchy climb don't survive into
KosPos. Instead:

- Position records carry only `reports_to_position_id`.
- Hierarchy is computed lazily by walking the chain on demand (with cycle
  detection).
- The Reporting Tree, Pos by Dept, Vacancies and TEMP, and TEMP Limits views
  become live queries over the Position store, not consumers of materialized
  level codes.

##### 8. Supervisory-pay-differential as a derived metric

`EH Rep To Pay Above` is a reasonable audit signal but lives outside Position
state. Implement as a query in the EE Additional Pay surface (Phase 4 special-class
audit), computed at view time from each position's `incumbent.hourly_rate` and its
reports-to position's incumbent's rate. Surface negative deltas as a Data Issues
flag ("subordinate earns more than supervisor") with optional explanation (acting,
longevity, special-class pay).

##### 9. Snapshot Date and Source recorded with the import

Every Position record (and every snapshot diff) records:

- `snapshot_date` (from col A — already on the OBI export, unlike BI Payroll).
- `snapshot_source` (`OBI` / `OBI → Snowflake` / future direct query).
- `dept_groups` (sourcing set: `{"DBI", "CPC"}` in this snapshot).

The snapshot becomes self-describing — Operating Report Detail's "what's the as-of
for this view" query has a real answer.

##### 10. Importer data-quality flags (additions to `lib/quality/`)

- **Reports-To resolves**: every non-empty `AK` must reference an extant Position
  Number in the same snapshot.
- **Reports-To cycle**: `A → B → A` or longer cycles.
- **CPC division resolves**: `CH Effective Employee Division` shouldn't literally
  equal `"Update Formula"` — surfaces stale lookup tables on import.
- **Vacant-but-no-RTF**: `Fill Status = VACANT ∧ Latest RTF ID is blank` for
  non-pool positions.
- **RTF expected past**: `RTF Expected Fill date < today ∧ Fill Status = VACANT`
  — the RTF date should have produced a fill.
- **Cat 17 / 18 expiry warning**: position has `CAT_17_18 Exempt TX Expired Date`
  ≤ 90 days from today.
- **Cat 16 hours approaching cap**: cross-reference with BI Payroll TEMP Limits
  formula; warn at 80 % of 1,040 hours.
- **Appointment ↔ Exempt-Category mismatch**: e.g., `AF=PEX ∧ AG starts with "18
  Special Proj"` flags an Exempt-to-Permanent conversion worth confirming.
- **Combo code missing for moved employee**: `effective_dept ≠ budgeted_dept ∧
  combo_dept = budgeted_dept` (payroll posts to old dept).
- **Hierarchy depth exceeds 11**: warns about positions whose climb extends past
  the workbook's modeled depth.
- **Snapshot row-count sanity**: compare to prior snapshot; warn on > 5 % swing
  not explained by known position adds/removes.

#### KosPos UI sketch

P&P Data is **internal staging** in the same way BI Payroll is — its data surfaces
through the Position entity and the views that read it. No P&P-only page.
Touchpoints:

1. **Upload page** (Settings → Data Sources → P&P Data):
   - Drop the OBI `.xlsx` (or `.csv` when Snowflake exposes it). Importer validates
     fingerprints, reports diff vs prior snapshot (new / removed positions,
     reports-to changes, RTF status changes, vacancy-date appearances).
   - Snapshot list with timestamp, Snapshot Date, row count, dept-group set.
     Active-snapshot toggle.
   - Companion dataset: Department Classification Structure CSV (uploaded here;
     refreshed independently).
2. **Position Detail page** (the main user-facing surface — see also Phase 7 org-chart
   when that lands):
   - Header: Position Number, Job Code + Description, Fill Status, Dept (effective
     shown by default; budgeted and combo shown with labels if they differ).
   - **Incumbent block**: name, appointment type, exempt category, step, hourly
     rate, merit increase date.
   - **Reports-To block**: parent position + climb breadcrumb up to root + the
     incumbent of each ancestor.
   - **RTF block** (when vacant or hiring): status, request action, submitted
     date, expected fill date, approval step.
   - **Cat 17/18 / Cat 16 block** (when applicable): appointment date, expected
     expiry, hours-used (for Cat 16, joined from BI Payroll), days/hours remaining
     gauge.
   - **Vice / Acting block** (when applicable): Vice 1, Vice 2, Position Used For
     pointer.
   - **Budget block**: budgeted FTE, budgeted job code (= or ≠ filled job code),
     budgeted dept, split-funded indicator.
   - Drill-down tabs: Payroll Detail (per [Tab 7 § UI sketch](#kospos-ui-sketch-1)),
     Snapshot History (this position's changes over time), Data Issues (flags from
     `lib/quality/`).
3. **Data Issues panel** (`lib/quality/`):
   - Cross-cutting view aggregating P&P-related flags grouped by category,
     exportable as a correction-list (per the major Alex requirement).

#### Excel export notes

KosPos's Excel emitter rebuilds a P&P-equivalent sheet for round-trip parity but
cleaned of the workbook's derived columns:

- A **`Positions` sheet** with the 88 OBI columns plus explicit named columns for
  the three department concepts (no "Update Formula" placeholder; unresolved
  dept-tree joins flagged in Data Issues).
- A **`Position Hierarchy` sheet** with one row per position and a single
  materialized `parent_position` + an integer `depth` + a path string
  (`/1112304/1112305/304335`). Replaces the 44-column climb with a 3-column
  representation; hierarchy views in KosPos render from this directly.
- A **`Position Snapshot Diff` sheet** (between two named snapshots) — new
  positions, removed positions, reports-to changes, RTF status transitions, etc.
- A **`Position Data Issues` sheet** — the live correction-list, formatted for a
  user to walk through one row at a time.
- Named ranges for `POSITIONS_FILLED`, `POSITIONS_VACANT`, `POSITIONS_OVERFILLED`,
  `POSITIONS_TEMP` so a side-by-side parity workbook can name-reference them.

#### Open questions / TODO

- [ ] **Confirm the PEX-on-Cat-18 rows are Exempt-to-Permanent conversions** (15
      rows in this snapshot). Alternatives: (a) classification error in PS HCM;
      (b) the EE Exempt Category Description column shows the *position's* exempt
      designation rather than the *appointment*'s, in which case PEX-on-Cat-18 is
      the appointment converting but the position's designation persisting
      (consistent with [appointment-types.md § exempt class vs exempt
      appointment](appointment-types.md#exempt-class-vs-exempt-appointment)).
      Worth a one-shot DHR query during Phase 4.
- [ ] **TPV definition.** Five rows are `AF=TPV ∧ AG="00 Not Exempt"`. Likely
      Temporary Provisional (CS Rule 114.5) but [appointment-types.md](appointment-types.md)
      doesn't have a TPV entry in the Quick Reference table. Add after confirming.
- [ ] **Reports-To error-vs-noise rules.** The Improvement #6 sketch is a starting
      point; full rule set deserves its own session after the Reporting Tree (Tab
      21) walkthrough. Includes the Operational Approver (timesheet approver)
      data model — currently no column carries this.
- [ ] **Per-snapshot vs per-position effective dates.** `Snapshot Date` (col A) is
      identical across all rows. Confirm whether OBI can emit per-position
      effective-dated changes (would let KosPos compute change history without
      snapshot diffs) or whether snapshot history is the only path.
- [x] **Other chartfield trees.** Account, Activity, Authority, Fund, Project, WBS,
      etc. live in the same OBI folder. Document each when its consumer surfaces;
      only the Department tree is documented here. **Resolved 2026-05-25 (Task C
      this session):** full inventory of all 11 chartfield trees + their row/col
      shapes captured in [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md)
      § PS Financials chartfield trees. Per-tree details surface as each
      consuming module is built.
- [ ] **Combo-code maintenance workflow.** When an employee moves departments, a
      combo code must be added so payroll posts to the new dept's chartfields.
      Currently no column in P&P Data tells you *which* employees moved without a
      new combo code — must be inferred from `effective_dept ≠ budgeted_dept ∧
      combo_dept = budgeted_dept`. Confirm whether the OBI report can flag this
      directly.
- [ ] **Pivot caches 1 vs 4.** Two different P&P caches (137 fields vs 138 —
      cache 4 includes `EH Rep To Pay Above`, cache 1 stops at column 89). Resolve
      whether the dual caches are deliberate (cache 4 for EE Additional Pay only)
      or accidental (one cache went stale).
- [ ] **`Position Used For Description` numeric values.** Col V is mostly blank but
      contains 8 numeric values like `37644`, `235254`. Likely the target position
      number for an acting assignment — confirm during EE Additional Pay walkthrough.
- [ ] **Split funded numbered columns (`2`, `3`, … suffix).** The `1` suffix on
      `BUD_SEQ_KEY 1`, `Budget Job Code 1`, `Budget FTE 1`, etc. implies the OBI
      export would emit `2`, `3` numbered columns when a position has more than
      one split. None present in this snapshot. Confirm OBI behavior so the
      importer can grow column-count dynamically.

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
reference BI Payroll on this tab (counting formula cells with at least one
`'BI Payroll'!` reference; the SUMIFS-clause occurrence count is much
higher at ~133k across the dual operating-vs-continuing grid — see
[Tab 20 § per-position formulas](#formulas--per-position-block-rows-2606)).
**Multi-fund-aware** because it's the position-level dataset that
everything else trues up to.

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
- [x] **TEMPM filter `'BI Payroll'!AE = "COMMN:5380"` undercounts.** The
      workbook misses temp pay posting to `505020` ($49k Sick), `505040`
      ($42k Vac), `505050` ($55k Other Timeoff), `505060` ($71k LSP),
      `505070` ($44k Holiday) at the DBI+CPC level. Confirm the desired
      definition during Tab 16+ (TEMPM is on the Premium tab's adjacent
      block, or on its own Tab 40 / OPS row 40). See
      [`special-class.md`](special-class.md) § TEMPM_E open question.
      **Partially resolved 2026-05-25 (Tab 26 OPS Summary walkthrough):**
      at CPC the workbook's response is to leave row 50's E/H formulas
      empty and absorb the dollars into 9993 attrition residual.
      KosPos's design is "every named class gets full math, no
      implicit-residual absorption" — see [Tab 26 § KosPos improvement
      #4](#kospos-improvements-7).
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

_(Two pivots on P&P Data (cache 4) — see [Tab 6 § How each downstream tab consumes
P&P Data](#how-each-downstream-tab-consumes-pp-data). Pivot 4's data field is the
`Rep To Pay Above` derived column — feeds the supervisory-pay-differential audit.)_


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

_(Three pivots on P&P Data (cache 1) for the per-position frame — see [Tab 6 §
How each downstream tab consumes P&P Data](#how-each-downstream-tab-consumes-pp-data).
BI Payroll hours-remaining formula decoded in [Tab 7 § TEMP Limits](#temp-limits--hours-remaining-gauge).
TEMP-category 16/17/c2 vs 16/17/18 reconciliation resolved in [Tab 6 § TEMP-category
column reconciliation](#temp-category-column-reconciliation-resolves-calendar-walkthrough-open-question).)_


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

_(P&P Data XLOOKUP shape decoded in [Tab 6 § How each downstream tab consumes P&P
Data](#how-each-downstream-tab-consumes-pp-data) — 2,556 references on Position
Number / Pos Department / Pos Division. BI Payroll consumption shape decoded in
[Tab 7 § Inactive](#inactive--total-spend-per-inactive-position).)_


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

**Status:** walkthrough — done 2026-05-25

**Purpose:** **Per-(dept × job class × earnings code) YTD premium-pay actuals and
year-end projection** for the special-class line PREMM. Two regions on one sheet:

1. **Main pivot (A1:J116)** — pivot of BI Payroll filtered to `Account
   Description = "Premium Pay - Misc"` (account 509010), broken out per (Dept
   Group → Dept → Job Code → Job Desc → Earnings Code → Earnings Code
   Description) × Fund Code. Where the YTD actuals live, by earnings code.
2. **Projection panel (L1:Q11)** — hand-built reference table mapping each
   dept-group's `(5010 Salary, 5130 Fringe)` budget components to a projected
   year-end actual, using a salary-actuals-times-fringe-ratio mechanism. Where
   OPS Summary row 36 (DBI) and row 45 (CPC) source their `H` column from.

**Snapshot scope.** 116 rows in the pivot × 17 cols total (J + the projection
panel). The pivot has 9 DBI dept rows and 2 CPC dept rows at this snapshot.

#### Data sources

- **Source:** OBI BI Payroll, filtered to `Account Description = "Premium Pay -
  Misc"`. The pivot reads from cache `pivotCacheDefinition6.xml` (= the BI Payroll
  source range `BI Payroll!A1:AL1048576`, per [Tab 7 § How each downstream tab
  consumes BI Payroll](#how-each-downstream-tab-consumes-bi-payroll)). The
  projection panel's literal `N5/N6/O8/O9` budget cells are refreshed once per FY
  from the BFM 15.10.006 eturn's special-class summary rows (the same source
  feeding [Tab 20 Report Data SPECIAL block](#tab-20--report-data)).
- **Refresh cadence:** the pivot refreshes whenever BI Payroll re-imports (each
  payday Tuesday + ad-hoc); the budget literals refresh annually when BFM
  republishes the position eturn.

#### Structure — main pivot (A1:J116)

**Page filter (row 1):**

| Cell | Value |
|---|---|
| A1 | `Account Description` (page-filter label) |
| B1 | `Premium Pay - Misc` (selected value — account 509010) |

**Header rows (rows 3–4):**

| Cell | Value | Meaning |
|---|---|---|
| A3 | `Sum of Balance Amount` | Data field |
| G3 | `Fund Code` | Column field label |
| A4 | `Department Group Code` | Row field 1 |
| B4 | `Department Description` | Row field 2 |
| C4 | `Job Code` | Row field 3 |
| D4 | `Job Description` | Row field 4 |
| E4 | `Earnings Code` | Row field 5 |
| F4 | `Earnings Code Description` | Row field 6 |
| G4 | `10190` | Fund column (DBI operating) |
| H4 | `10000` | Fund column (CPC operating) |
| I4 | `10020` | Fund column (occasional) |
| J4 | `10840` | Fund column (occasional) |

**Earnings codes seen at this snapshot:** `L08` Lead Worker Pay - $5, `289`
Bilingual Pay - $60.00, `600` Architect License Prem - 5%, and others — see
[Tab 7 walkthrough](#tab-7--bi-payroll) and the scenario-tests audit for the
broader catalog of 11+ premium codes the importer must enumerate.

#### Structure — projection panel (L1:Q11)

**Page tag (row 1):** L1 = `Job Class`, M1 = `PREMM_E`. Just identifying labels;
no math.

**Header row (row 4):**

| Cell | Value |
|---|---|
| L4 | `Dept Grp` |
| M4 | `Account Lvl 5 Title` |
| N4 | `10190` (DBI fund column) |
| O4 | `10000` (CPC fund column) |
| P4 | `Projected` |
| Q4 | `Surplus / (Deficit)` |

**Per-dept-group block (rows 5–10):**

| Row | L Dept Grp | M Account Lvl 5 | N (10190) | O (10000) | P Projected | Q Surplus |
|---|---|---|---|---|---|---|
| 5 | `DBI` | `5010Salary` | **1,096,699** literal | — | =GETPIVOTDATA(...,10190)×(N5/N7)/I2×J2 = 942,752 | =N5−P5 = 153,946 |
| 6 | (blank) | `5130Fringe` | **94,860** literal | — | =N6/N5×P5 = 81,544 | =N6−P6 = 13,316 |
| 7 | `DBI Total` | — | **1,191,559** literal (sum N5+N6) | — | — | — |
| 8 | `CPC` | `5010Salary` | — | **5,512** literal | =GETPIVOTDATA(...,10000)×(O8/O10)/I2×J2 = 41,841 | =N8−P8 = -41,841 |
| 9 | (blank) | `5130Fringe` | — | **477** literal | =O9/O8×P8 = 3,621 | =N9−P9 = -3,621 |
| 10 | `CPC Total` | — | — | **5,989** literal (sum O8+O9) | — | — |
| 11 | `Grand Total` | — | 1,191,559 | 5,989 | — | — |

**Projection formula decoded — per dept-group, two-step:**

```excel
P5_DBI_Salary  = GETPIVOTDATA("Balance Amount", $A$3, "Fund Code", 10190)
                 × (N5 / N7)                  ← salary share of total budget
                 / Calendar!I2 × Calendar!J2  ← annualize via pure-PP ratio
P6_DBI_Fringe  = N6 / N5 × P5                 ← gross up salary projection by budgeted fringe-to-salary ratio
```

Decoded in words:

1. **Get YTD actual premium-pay dollars** for the dept-group's operating fund
   (DBI = 10190, CPC = 10000). The `GETPIVOTDATA` call sums the pivot's data
   field filtered to that one fund.
2. **Scale by the salary share of the dept-group's premium budget.** N5/N7
   = 1,096,699 / 1,191,559 = 92.04% — DBI's PREMM budget is 92% salary, 8%
   fringe. The pivot only holds premium *salary* actuals (the 509010 account
   is salary-only); benefits don't post to a dedicated premium-benefit account.
   So we apportion the YTD actuals as if they reflected the budgeted
   salary-to-total split.
3. **Annualize via the pure-PP ratio** (`J2/I2` = 26.1/22.4 = 1.165 at this
   snapshot). The same straight-line pacing OVERM and RTPOM use.
4. **Cross-walk salary projection → fringe projection** via the budgeted
   fringe-to-salary ratio (`N6/N5` = 94,860/1,096,699 = 8.65%). Same "use the
   budget's ratio because benefits don't post separately" reasoning as
   [OVERM § Year-end projection](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight).

OPS Summary consumers:

- **DBI H36** = `=Premium!P5 + Premium!P6` = $1,024,297 (projected total)
- **CPC H45** = `=Premium!P8 + Premium!P9` = $45,462 (projected total)

#### What's manual / fragile

1. **N5 / N6 / O8 / O9 are hardcoded literals** refreshed once per FY from the
   BFM 15.10.006 eturn's premium-pay summary rows. No formula trace; an FY27
   refresh requires Alex to update each cell by hand. Same annual-refresh risk
   pattern as [OVERM's BN6/BN8](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight).
2. **N7 / O10 are literal totals**, not `=SUM(N5:N6)` / `=SUM(O8:O9)`. If N5
   is updated and N7 isn't kept in sync, the salary-share ratio silently drifts
   from 92% to something else.
3. **Fund 10190 / 10000 GETPIVOTDATA hardcodes** — the DBI/CPC shortcut
   already cataloged in [cross-cutting concerns](#multi-dept-generalization-caveats-dbi-shortcuts-to-undo).
   Any premium pay posting to a non-operating fund (DBI BIF-Continuing 10230,
   CPC capital projects 10770) is silently excluded from the projection.
4. **Pure-PP annualization** (`/I2*J2`) rather than COLA-weighted. Same shortcut
   the workbook uses for OVERM and RTPOM. Premium dollar amounts mostly don't
   COLA-inflate (a $5 lead-worker premium stays $5 regardless of MOU), so the
   shortcut is mathematically defensible for *premium itself*; but the fringe
   gross-up rides on the (budgeted) ratio which is COLA-influenced. KosPos
   default = COLA-aware everywhere (per memory
   `feedback_projections_always_cola_aware.md`) and let the per-class projection
   function decide whether COLA inflation applies.
5. **Salary-vs-fringe split assumes the budgeted ratio matches the actual
   ratio.** True at the start of the year; can drift if Controller reclasses
   between accounts (rare). No reconciliation between the projection's implied
   total and the actual posted benefit dollars for premium-flagged earnings.
6. **Account filter is the literal string `"Premium Pay - Misc"`.** If the
   Controller renames account 509010 (e.g., "Premium Pay - Misc - All"), the
   pivot silently goes empty. Same fragility pattern as other tabs' literal
   account-description filters (cataloged in cross-cutting concerns).
7. **No per-(job class, earnings code) breakout in the projection.** The
   projection collapses to a single (Dept Grp × Salary/Fringe) cell. The
   pivot shows the per-(job class × earnings code) detail, but the projection
   doesn't drill down. Hard to surface "53% of DBI's premium overrun is from
   `289` Bilingual Pay" without manual analysis.
8. **No hiring-information awareness in the projection.** Alex's flag:
   positions hired mid-year will accrue premium pay only for their fraction
   of the FY. Workbook ignores this — projects on the run-rate of YTD only.
   Small expected impact (Alex's note), but a known under-projection bias.

#### KosPos improvements

##### 1. Per-(job class × earnings code) projection grain

**Problem in the workbook.** Projection collapses to one cell per dept-group ×
(salary, fringe). The pivot has the per-(job class × earnings code) detail, but
nothing in the projection uses it.

**KosPos design.** Project at the same grain the pivot exposes:
`projected_premium[dept_group, job_class, earnings_code] = YTD_per_grain ×
annualize_factor`. Roll up to the (dept_group, salary_vs_fringe) cells the
OPS Summary needs. The grain-level projections power a drill-down: "DBI
projected $1.02M PREMM — of which $670k Bilingual Pay (`289`), $180k Lead
Worker Pay (`L08`), $100k Architect License Prem (`600`), $74k others."

##### 2. Surface premium codes the importer doesn't yet enumerate

**Problem flagged in [position-level scenario tests § Scenario 9](../audits/labor-report-scenario-tests.md#scenario-9--undocumented-premium-pay-codes):**
11+ premium-pay earnings codes (`253` Cert Prem 6%, `125` Cert 4%, `269` Struct
Eng Prem 10.27%, `113`, `335`, `318`, `117`, `332`, `600`, `601`, etc.)
carrying $1M+ total are not enumerated in the KosPos importer's premium-routing
rules. The current rules only handle `L08` + `289`.

**KosPos design.** The importer's premium-pay router uses **the account
description as the primary discriminator** (`Premium Pay - Misc` →
`category: PREMM`) and stores the earnings code as a sub-classification dim.
Any new earnings code that posts to 509010 is automatically picked up. The Data
Issues panel flags the first PP an unknown earnings code appears, prompting the
admin to confirm the classification (vs. mis-posted to the wrong account).

##### 3. Make the fringe gross-up auditable

**Problem in the workbook.** `P6 = N6/N5 × P5` is opaque. A reader can't see
the 8.65% fringe-to-salary ratio it embeds, can't see whether that ratio
matches the dept-group's actual fringe rate.

**KosPos design.** Show the ratio inline with the projection: `P6 fringe
projection = $81,544 ($P5 salary × 8.65% budgeted fringe-to-salary ratio)`.
On hover: "Ratio derived from FY26 BFM budget: $94,860 fringe / $1,096,699
salary = 8.65%". If the actual posted fringe-to-salary ratio for the dept-
group's premium spend is materially different (>1pp), flag in Data Issues as
"premium fringe ratio drift — review chart of accounts mapping."

##### 4. Hire-plan-aware projection

**Problem in the workbook.** Workbook projects on YTD run-rate only. Positions
hired mid-year haven't accrued YTD premium-pay yet; the projection misses
their post-hire premium pay. The error is small for most positions (only some
job classes carry premiums) but cumulative.

**KosPos design.** Project per position:
`projected_premium[position] = YTD_premium[position] + expected_per_PP_premium[position, job_class] × remaining_PPs`.
For positions in the hiring plan with a known start date, `remaining_PPs`
starts from the start date. `expected_per_PP_premium` is computed from the
job class's historical premium-pay rate (Budget Master's `Y5` cell — premium $
as pct of total salary for that job class — but applied per PP, not per FY).
Small material change vs the run-rate-only projection, but it's the right
direction and matches what Alex flagged.

##### 5. Per-fund projection (drop the 10190 / 10000 hardcode)

**Problem in the workbook.** GETPIVOTDATA filters to one fund per dept-group.
DBI premium pay posting to BIF-Continuing (10230) is silently excluded.

**KosPos design.** Sum across `dept_group.operating_funds` (the per-dept-group
fund set sourced from BFM `Fund Control = "FACCT"`, per
[cross-cutting concerns](#multi-dept-generalization-caveats-dbi-shortcuts-to-undo)).
Show a per-fund breakdown drilldown for users investigating "where is my
premium pay actually posting."

#### KosPos UI sketch

**Premium Pay page** — one of the per-special-class cards on the Operating
Report headline (see [Tab 26 § KosPos improvement #1](#tab-26--operating-report-summary)).

Layout:

```
DBI · Premium Pay (PREMM) · FY26 · as of PP 22 of 26.1
┌────────────────────────────────────────────────────────────────────┐
│ Total Budget    YTD Actual    YTD Pace    Projected    Variance    │
│  $1,191,559     $879,090       $1,022,641  $1,024,297  +$167,262   │
└────────────────────────────────────────────────────────────────────┘

By earnings code (FY26 YTD)              By dept (FY26 YTD)
  289 Bilingual Pay        $670,000        DBI ADM Finance      $120k
  L08 Lead Worker Pay      $180,000        DBI IS Bldg Insp     $240k
  600 Architect License    $100,000        DBI PS Plan Review   $200k
  others (8 codes)          $74,000        ... (6 more depts)
                                         
Year-end projection breakdown
  YTD actuals (run-rate)             $879,090
  + Continuing premium pay           $145,207  (annualize remaining PPs)
  + Fringe gross-up                  $81,544   (× 8.65% budgeted ratio)
  + Hire-plan adjustment             $0        (no premium-pay positions in plan)
  ────                              ─────────
  Projected total                  $1,024,297
```

Drill-down: click any earnings-code row → grain-level view (per-job-class
breakdown for that code, per-PP trend chart).

#### Excel export notes

For parity:

- **Sheet `Premium`.** A1:J116 = mirror the BI Payroll-sourced pivot (KosPos
  emits its own pivot from the live data, not a paste-snapshot).
- L1:Q11 = mirror the projection panel structure.
- Add an explicit `Projection Methodology` block at the bottom citing each
  ratio source (BFM eturn rows, COLA-aware vs straight-line choice, fund-set
  membership).
- **Named ranges:** `DBI_PREMM_SalaryBudget`, `DBI_PREMM_FringeBudget`,
  `DBI_PREMM_Projected`, etc. — downstream-formula compatibility without the
  workbook's cell-address fragility.

#### Open questions / TODO

- [ ] **Confirm account 509010 = "Premium Pay - Misc" is the only premium-pay
      account at the dept-group level.** Some MCCP-related premium variations
      (e.g., MCCP performance bonus) may use other accounts; if so, the page
      filter is incomplete.
- [ ] **Verify the Y5 ratio in Budget Master** (premium $ as pct of total
      salary per job class). The hire-plan-aware projection (improvement #4)
      needs this ratio per-job-class; confirm it's stable enough to project
      forward and where exactly it lives in the BFM workbook.
- [ ] **Reasonable-default call (this session):** the projection's pure-PP
      annualization stays as-is for PREMM because premium $ amounts mostly
      don't COLA-inflate. KosPos still calls the COLA-aware projection
      function but the function returns the same number when COLA inflation
      doesn't apply to the dollars. Confirm with Alex if any premium codes
      DO COLA-inflate (e.g., percentage-of-base premiums like the 6248
      structural eng prem 10.27%).
- [ ] **CPC PREMM rounds to $5,989 budget, projects to $45,462** — 7.6× the
      budget. Tiny absolute numbers but large variance ratio. Confirm
      whether CPC PREMM is materially mis-budgeted or whether the
      reclassifications across the year shift one or two specific premiums
      from one dept-group to another (manual reclass would post YTD against
      CPC fund without a corresponding budget transfer).
- [ ] **Reconcile against [Task B BVA reconciliation suite](../audits/bva-reconciliation-suite.md)**
      Test 3 — does BVA show the same DBI premium total as BI Payroll
      filtered by `Account Description = "Premium Pay - Misc"`? Should be
      a clean account-level reconciliation; if not, an opposite-direction
      reclass exists.

---

---

### Tab 17 — Overtime

**Status:** walkthrough — done 2026-05-25

**Purpose:** **Per-(fund × dept × job class × person × PP) YTD overtime hours +
dollars and year-end projection** for the special-class line OVERM. Three regions on
one sheet:

1. **Main pivot (A5:BA114)** — pivot of BI Payroll filtered to `Account
   Description = "Overtime - Scheduled Misc"` (account 511010), broken out per
   (Fund Code → Department Description → Job Code → Job Description → Person Full
   Name) × Earning Period End Date. Cols F:AB carry `Sum of Earning Hours`
   per-PP; cols AC:AY carry `Sum of Balance Amount` (dollars) per-PP. AZ + BA
   are the row totals. Where the per-person YTD OT detail lives.
2. **Side reference panel (BK3:BN8)** — small per-(dept-group × account-lvl-5)
   table holding the **hardcoded FY budget literals** (BN6 = DBI OT salary
   budget $349,749; BN8 = DBI OT total budget $380,000) that feed the
   projection formula. Refreshed once per FY from BFM.
3. **Projection panel (BP5:BS19)** — per-dept-row projection table that gross-
   ups YTD salary actuals to total cost. Feeds `OPS!H37` (DBI) and `OPS!H46`
   (CPC).

Already documented in detail in
[special-class.md § OVERM_E](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight)
(formulas decoded from Session 10 + Session 11). This tab walkthrough adds the
**labor-report-as-Excel-surface view** of the same math, plus three things the
existing special-class.md walkthrough doesn't catalog: the row 18 CPC rollup
formula, the BS-row dept-by-dept distribution, and the OPS Summary consumer
linkage.

**Snapshot scope.** 114 rows × 71 cols (A:BS). Main pivot 9 DBI dept slices
(rows 6–14) + 10190 Total (15) + 2 CPC dept slices (110–112, partial) + 10000
Total (113) + Grand Total (114). Projection panel: 9 DBI rows (6–14) + DBI
total (15) + 2 CPC rows (16–17) + CPC total (18) + Grand Total (19).

#### Data sources

- **Source:** OBI BI Payroll, account `Overtime - Scheduled Misc` (511010).
  Pivot cache = `pivotCacheDefinition6.xml` (BI Payroll source range
  `A1:AL1048576`). The data field that appears visibly is **Earning Hours**
  (not dollars) — convenient for spot-check ("how many OT hours did
  Smith,John work in PP15?"). The **dollar field is available in the same
  cache** and gets pulled by OPS Summary via `GETPIVOTDATA("Sum of Balance
  Amount", ...)`. Both fields are computed from the BI Payroll's per-row
  Earning Hours / Balance Amount; the pivot just aggregates them.
- **Budget literals:** `BN6`, `BN7`, `BN8` refresh once per FY from BFM
  15.10.006 special-class summary rows (the same source as
  [Tab 16 Premium § N5/N6/N7](#tab-16--premium)).
- **Refresh cadence:** pivot re-aggregates on BI Payroll re-import; budget
  literals updated annually.

#### Structure — main pivot (A5:BA114)

**Page filter (row 1):** A1 = `Account Description`, B1 = `Overtime - Scheduled
Misc`.

**Row 3 labels:** F3 = `Values`, G3 = `Earning Period End Date` (col field).
BK3 = `Job Class`, BL3 = `OVERM_E` (just identifiers).

**Row 4 data field labels:** F4 = `Sum of Earning Hours`, AC4 = `Sum of Balance
Amount`. The pivot has both data fields side-by-side: cols F:AB = hours per PP,
cols AC:AY = dollars per PP, AZ = hours total, BA = dollars total. **23 PPs per
side** (rather than 27) because PP1–PP3 had no Misc OT activity in the snapshot.

**Row 5 axis headers:**

| Cell | Value | Meaning |
|---|---|---|
| A5 | `Fund Code` | Row field 1 (outer) |
| B5 | `Department Description` | Row field 2 |
| C5 | `Job Code` | Row field 3 |
| D5 | `Job Description` | Row field 4 |
| E5 | `Person Full Name` | Row field 5 (innermost) |
| F5 | `2025-07-04` (PP1 PPE) | First PPE column (hours sub-pivot) |
| ... | ... | ... |
| AB5 | `2026-05-08` (PP22 PPE) | Last hours-by-PP column |
| AC5 | `2025-07-04` | First PPE column (dollars sub-pivot) |
| ... | ... | ... |
| AY5 | `2026-05-08` | Last dollars-by-PP column |
| AZ4 | `Total Sum of Earning Hours` | Row hours total |
| BA4 | `Total Sum of Balance Amount` | Row dollars total |

**Sub-rollup rows** (the pivot's subtotal rows):

- `10190 Total` at row 15 (DBI fund total)
- `10000 Total` at row 113 (CPC fund total) — BA113 = $3,944.37 (DBI's E46 source)
- `Grand Total` at row 114 — BA114 = $442,730.52 (matches BR19 in projection panel)

#### Structure — side reference panel (BK3:BN8)

| Cell | Value | Meaning |
|---|---|---|
| BK3 | `Job Class` | (label) |
| BL3 | `OVERM_E` | Identifier |
| BK5 | `Dept Grp` | Row field |
| BL5 | `Fund` | Row field |
| BM5 | `Account Lvl 5 Title` | Row field |
| BN5 | `Sum of FY 2025-26 Board` | Data field |
| BK6 | `DBI` | DBI row |
| BL6 | `10190` | DBI fund |
| BM6 | `5010Salary` | Account |
| **BN6** | **349,749** literal | **DBI budgeted OT salary** (refresh: annually from BFM) |
| BM7 | `5130Fringe` | Account |
| **BN7** | **30,251** literal | DBI budgeted OT fringe |
| BK8 | `Grand Total` | Sum |
| **BN8** | **380,000** literal | **DBI budgeted OT total** (= BN6+BN7) |

These three literals are the single annual-refresh point that drives every
projection in the BS column. If BN6 or BN8 is stale, every BS cell drifts.

#### Structure — projection panel (BP5:BS19) — verbatim

| Row | BP Fund | BQ Department | BR YTD Actual $ | BS Projected |
|---|---|---|---|---|
| 5 | (header) Fund Code | Department Description | Sum of Balance Amount | Projected |
| 6 | `10190` | DBI ADM Finance | 40.24 | =BR6×$BN$8/I2×J2/$BN$6 = 50.94 |
| 7 | (blank inherits 10190) | DBI IS Building Inspection | 46,996.41 | 59,495.52 |
| 8 | | DBI IS Code Compliance | 15.16 | 19.19 |
| 9 | | DBI IS Electrical Inspection | 185,893.40 | 235,333.40 |
| 10 | | DBI IS Housing Inspection | 1,846.85 | 2,338.04 |
| 11 | | DBI IS Plumbing Inspection | 16,847.73 | 21,328.53 |
| 12 | | DBI PS Permit Processing | 1,132.90 | 1,434.20 |
| 13 | | DBI PS Plan Review | 185,963.19 | 235,421.75 |
| 14 | | DBI IS Administrative Support | 50.27 | 63.64 |
| **15** | `10190 Total` | | **438,786.15** | **=SUM(BS6:BS14) = 555,485.23** ← OPS!H37 |
| 16 | `10000` | CPC Current Planning | 2,356.06 | 2,982.68 |
| 17 | (blank inherits 10000) | CPC Administration | 1,588.31 | 2,010.74 |
| **18** | `10000 Total` | | **3,944.37** | **=SUM(BS16:BS17) = 4,993.41** ← OPS!H46 |
| 19 | `Grand Total` | | 442,730.52 | (no formula; visual total only) |

**Per-dept projection formula:**

```excel
BS6 = BR6 * $BN$8 / Calendar!$I$2 * Calendar!$J$2 / $BN$6
```

Decoded in [special-class.md § OVERM_E year-end projection](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight):
`YTD_OT_salary_for_dept × (budgeted_total / budgeted_salary) × (PPs_in_FY / PPs_elapsed)`.
The `BN8/BN6` ratio is a **salary→total gross-up via the BFM-budgeted ratio**
(≈1.086 — for every $1 of OT salary actual, the formula assumes $1.086 of true
OT cost including OT-attributable benefits that BI Payroll can't tag directly).

OPS Summary consumers:

- **DBI H37** = `=Overtime!BS15` = $555,485 (DBI OT projected)
- **CPC H46** = `=Overtime!BS18` = $4,993 (CPC OT projected)

Both feed the OPS Summary special-class block's H column ("Projected Operating
Actuals") for their respective dept-group OVERM row.

#### What's manual / fragile

Most fragility is already cataloged in
[special-class.md § OVERM_E](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight).
Tab-level additions:

1. **CPC uses the same `BN6`/`BN8` budget literals as DBI** — but CPC's
   budget should be its own salary + total. Looking at the formula
   `BS16 = BR16*BN8/I2*J2/BN6`, CPC inherits DBI's salary-to-total gross-up
   ratio (1.086). For CPC's tiny OT activity this is harmless ($4k); for a
   larger dept-group with different OT-benefit composition (e.g., a higher
   premium-cap-OT mix that changes the benefit load), the formula would
   silently produce wrong CPC projections. KosPos: per-dept-group salary-to-
   total ratio derived from each dept-group's own BFM budget, not shared.
2. **No row reserved for "Grand Total" projection.** BS19 is empty by
   convention. KosPos: the OPS Summary derives the all-dept-groups total
   from the per-dept-group rows; no separate Grand Total cell to maintain.
3. **Fund-coded rows (BP6=10190, BP16=10000) are pivot-style sub-rollup
   labels.** Inserting a third fund (BIF-Continuing 10230 for DBI's
   billable OT) requires adding rows and shifting the SUM ranges in BS15
   and BS18. KosPos: query-driven, no row-position dependencies.
4. **9 DBI rows hardcoded in the SUM(BS6:BS14) range.** If a 10th DBI
   dept gets OT activity, it lands in row 14a (insert) — which Excel
   usually picks up — *or* the new dept gets pivoted differently and
   ends up outside the SUM, in which case it silently disappears from
   `OPS!H37`. The
   [Tab 26 OPS Summary § "DBI/CPC block-shape asymmetry"](#tab-26--operating-report-summary)
   note generalizes this fragility category.
5. **`BN6` and `BN8` literals are at the same scale as the projection
   they feed.** If BN6 is updated to FY27's $370,000 but BS6 hasn't
   re-computed (Excel sometimes caches), the formula silently outputs
   wrong dollars. Hard to detect without a comparison against the BFM
   eturn directly.
6. **Pure-PP annualization** (`/I2*J2`) — same shortcut as PREMM/RTPOM.
   OT dollars don't COLA-inflate at the rate-of-pay level (OT premium is
   1.5× of base, base is already COLA-adjusted in BI Payroll). But the
   gross-up ratio uses budgeted dollars that include COLA. Mostly washes
   out for OT, but KosPos's COLA-aware default still applies — the
   function chooses straight-line when COLA inflation doesn't apply.

#### KosPos improvements

Most improvements already documented in
[special-class.md § OVERM_E TODO resolution](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight)
+ existing OVERM UI in `app/src/modules/special-class/`. Tab-level additions:

##### 1. Per-dept-group salary-to-total gross-up ratio

**Problem:** BN6/BN8 are DBI-specific; CPC inherits via cross-formula. Each
dept-group should derive its own salary-to-total OT ratio from its own BFM
budget.

**KosPos design.** When the BFM importer ingests the special-class summary
rows, persist `dept_group → {ot_salary_budget, ot_total_budget,
ot_gross_up_ratio}`. The projection function takes (dept_group, ytd_salary)
and applies that dept-group's ratio, not a shared one.

##### 2. Per-person OT pattern detection

**Problem:** the pivot has per-person YTD detail (`Person Full Name` row
field, per-PP hours in cols F:AB) but the projection only uses the
dept-aggregated number. Anomalous individual patterns — one person racking
up 40+ OT hours per PP for the last 6 PPs — are invisible until someone
manually scans the pivot.

**KosPos design.** Surface as a Data Issue: "Person X (Job Class Y) has
worked >Z OT hours/PP for the last N PPs — possible misclassification of
a regular schedule, or a workload signal." Threshold tunable; default to
flag anything 3σ above the dept-group's per-person mean over the last 8 PPs.

##### 3. T&L-based OT-benefit derivation (future)

Already noted in special-class.md § OVERM_E. When a T&L (Time & Labor)
importer exists, replace the budgeted salary-to-total ratio with the actual
per-PP OT-benefit posting. Today's ratio is the conservative second-best.

##### 4. PP1–PP3 zero-activity collapse

**Problem:** the pivot has 27 PPE columns reserved but at this snapshot
PP1–PP3 had zero Misc OT activity, so they're collapsed out of the
visible pivot. The OPS!H37 projection doesn't notice — it's already
working off the row totals. But the per-PP trend in the KosPos UI should
display all 27 columns (with empty cells where no activity) so the user
sees the seasonality correctly.

**KosPos design.** Per-PP trend chart always shows the full PP set;
zero-activity PPs render as gaps, not as collapsed columns.

#### KosPos UI sketch

Mirrors [Tab 16 Premium § KosPos UI sketch](#tab-16--premium):

```
DBI · Overtime (OVERM) · FY26 · as of PP 22 of 26.1
┌────────────────────────────────────────────────────────────────────┐
│ Total Budget    YTD Actual    YTD Pace    Projected    Variance    │
│  $380,000       $438,786       $326,130    $555,485    -$175,485   │
└────────────────────────────────────────────────────────────────────┘

By dept (FY26 YTD)                          By person (top 5)
  DBI PS Plan Review            $186k         Trevor Byrne          $9,000
  DBI IS Electrical Inspection  $186k         (other names redacted in mock)
  DBI IS Plumbing Inspection    $17k          ...
  ... (6 more depts)
                                            
Year-end projection breakdown
  YTD OT salary actuals              $438,786
  Annualize to FY end (× 26.1/22.4)  $510,000  (pure-PP shown for parity)
                                     $511,000  (COLA-aware, KosPos default — same to ±0.1%)
  Salary → Total gross-up (× 1.086)  $555,485  (= projected total OT cost)
  ────                              ─────────
  Projected total                  $555,485    matches workbook BS15
```

Per-PP trend chart underneath: line chart with FY week-by-week OT
salary $ + a band showing the budget pace.

#### Excel export notes

- Mirror A5:BA114 layout for the pivot (live data, no paste-snapshot).
- BP5:BS19 projection panel emitted with the same shape but with
  per-dept-group salary-to-total ratios broken out (one block per
  dept-group, not a single `BN6/BN8` constant).
- Named ranges: `DBI_OVERM_SalaryBudget`, `DBI_OVERM_TotalBudget`,
  `DBI_OVERM_GrossUpRatio`, etc.
- Add an explicit `Projection Methodology` block at the bottom citing
  the BN6/BN8 source and the salary-to-total gross-up reasoning.

#### Open questions / TODO

All seven open questions for OVERM_E were resolved in Session 11 — see
[special-class.md § OVERM_E TODO resolution status](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight).
Tab-walkthrough additions:

- [ ] **CPC OT projection uses DBI's BN6/BN8 ratio.** Confirm with Alex
      whether this is intentional (CPC's OT is too small to bother with
      its own budget) or an oversight. KosPos: per-dept-group ratio
      regardless of size.
- [ ] **Per-PP trend visualization.** Confirm Alex's preference: line
      chart, bar chart, or sparkline-in-table.
- [ ] **Per-person anomaly threshold.** What's the "this person is
      working too much OT" threshold? Probably 80 hrs/PP is the absolute
      cap (you can't work more than 100% of a PP). Below that, flag at
      3σ vs dept-group mean? At 40 hrs/PP regardless?
- [ ] **Reconcile against [Task B BVA reconciliation suite](../audits/bva-reconciliation-suite.md)**
      Test 3 — does BVA show the same per-chartfield OT total as
      BI Payroll filtered by Account = "Overtime - Scheduled Misc"?
      Should be a clean reconciliation.

---

---

### Tab 18 — Step

**Status:** walkthrough — done 2026-05-25

**Purpose:** **Per-position YTD step-variance and year-end step-savings projection**
for the special-class line STEPM. The most complex of the four per-special-class
tabs — by far. Five layers of per-position math:

1. **Position spine (A:Q, 17 cols)** — copy of the position roster (Effective
   Division → Dept → Budget Dept Code → Position Number → Fill Status → Job
   Code → Appointment Type → Budget Job Code → Names → Manager → Roster →
   Budgeted Dept → Combo Dept).
2. **Per-position totals (R, S, T)** — Total Budget, YTD STEP Actual,
   Projected STEP Actual.
3. **Per-PP YTD salary actuals (U:AU, 27 PPs)** — per-PP salary actuals
   excluding OT, RPO, Premium, TEMP (= step-eligible salary only).
4. **Per-PP step-flagged hours (AW:BW, 27 PPs)** — per-PP hours flagged
   `Step Indicator = "Y"` in BI Payroll col AI (the step-relevant earnings
   only — regular pay, vacation, sick, holiday; NOT overtime, premium, or
   payouts).
5. **Per-PP step variance (BY:CY, 27 PPs)** — the heart of step math:
   per-PP actual minus prorated budget, scaled by the step-hours share of the
   80-hour PP.

The S column = `SUM(BY:CY)` per position. The T column projects forward to FY
end using a clever pre-vs-post-COLA switching rule. OPS Summary row 39 (DBI)
and row 48 (CPC) split Step's per-position rows by Effective Division =
"Planning" → CPC, all other → DBI.

**Snapshot scope.** 605 data rows × 103 cols (A:CY). Division split: 267
Planning (CPC) + 153 DBI Inspection Services + 111 DBI Permit Services + 73
DBI AdminIstration + 1 blank. Appointment-type spread: 429 PCS / 88 vacant /
35 ELC / 29 PEX / 19 TEX / 5 TPV. Every position appears even if it has
zero step variance — the COUNTIF guard zeroes out duplicate rows for pool
positions (same Position Number, multiple incumbents).

#### Data sources

- **Position spine + salary actuals:** [Tab 6 P&P Data](#tab-6--pp-data) +
  [Tab 7 BI Payroll](#tab-7--bi-payroll). The U:AU per-PP cells issue
  per-(position, PP) SUMIFS against BI Payroll's `AL` (Balance Amount)
  column, joined on `AD` (Position Number) and `X` (Earning Period End
  Date), filtered to `F = 10190` (DBI operating fund — a **DBI shortcut**,
  see § Manual / fragile).
- **Step-flagged hours:** BI Payroll col `AI` is a workbook-internal column
  set on import = `"Y"` for earnings that count toward step (regular pay,
  vacation, sick, holiday). The AW:BW cells SUMIFS BI Payroll's `AJ` (hours)
  column with the same per-(position, PP) filter, plus `AI = "Y"`.
- **Budget:** R column = `SUMIFS('BFM 15.10.006 FY26'!AX, ..., D = Position
  Number)`, summing the Technical-Adjustment budget per position. **Uses BFM
  col AX (Technical Adjustment), not AZ (Board-adopted)** — same staleness
  bug as [Tab 20 Report Data § Manual / fragile](#whats-manual--fragile-6);
  the catalog item is already in [cross-cutting concerns](#multi-dept-generalization-caveats-dbi-shortcuts-to-undo).
- **Calendar constants:** the per-PP variance formula uses Calendar `B`
  (PPE date), `C` (PP%), `E` (per-PP COLA delta), `H2` (today's PPE), `K2`
  (pure remaining PPs), `L2` (COLA effective date), `N2` (total COLA PPs),
  `O2` (COLA-weighted remaining). **Step is the workbook's heaviest
  Calendar consumer** (~49k cell refs per Tab 5 walkthrough).
- **Refresh cadence:** rebuilt per PP from the BI Payroll re-import.

#### Structure — position spine + totals (A:T)

| Col | Header | Source / Formula |
|---|---|---|
| A | Effective Employee Division | from P&P Data |
| B | Effective Employee Department | from P&P Data |
| C | Budget Department Code 1 | from P&P Data |
| **D** | **Position Number** | from P&P Data — **primary key** |
| E | Position Fill Status | from P&P Data |
| F | Employee Job Code | from P&P Data |
| G | Employee Appointment Type | from P&P Data |
| H | Budget Job Code | from P&P Data |
| I | Employee First Name | from P&P Data |
| J | Employee Last Name | from P&P Data |
| K | Employee Name Vice 1 | from P&P Data |
| L | Manager First Name | from P&P Data |
| M | Manager Last Name | from P&P Data |
| N | Roster Code | from P&P Data |
| O | Roster Code Description | from P&P Data |
| P | Budgeted Department | from P&P Data |
| Q | Combo CD DEPT Description | from P&P Data |
| **R** | **Total Budget** | `=IF(COUNTIF($D$2:D2,D2)>1, 0, SUMIFS('BFM 15.10.006 FY26'!$AX, ...$D, D2))` |
| **S** | **YTD Operating STEP Actual** | `=SUM(BY2:CY2)` |
| **T** | **Projected Operating STEP Actual** | (formula below) |

**COUNTIF guard on every per-position cell** (R, S/sum-source U, T-via-BY):
`IF(COUNTIF($D$2:D2, D2)>1, 0, ...)`. This zeros out duplicate rows for **pool
positions** — positions with `Position Max Headcount > 1` where one Position
Number serves multiple bodies (commissioners, some temps). The first
occurrence of a Position Number gets the full SUMIFS; subsequent occurrences
get zero. Prevents double-counting at the dept rollup.

#### Structure — per-PP YTD salary actuals (U:AU)

**Headers:** `U1 = =Calendar!B2` (PP1 PPE 2025-07-04) through `AU1 =
=Calendar!B28` (PP27 PPE 2026-06-30). Cols mirror Calendar rows 2–28.

**Per-PP cell formula:**

```excel
U2 = IF(COUNTIF($D$2:$D2, $D2)>1, 0,
       SUMIFS('BI Payroll'!$AL, 'BI Payroll'!$AD, $D2, 'BI Payroll'!$X, U$1, 'BI Payroll'!$F, 10190)
     - SUMIFS('BI Payroll'!$AL, 'BI Payroll'!$AD, $D2, 'BI Payroll'!$X, U$1, 'BI Payroll'!$F, 10190, 'BI Payroll'!$V, "Overtime - Scheduled Misc")
     - SUMIFS('BI Payroll'!$AL, 'BI Payroll'!$AD, $D2, 'BI Payroll'!$X, U$1, 'BI Payroll'!$F, 10190, 'BI Payroll'!$V, "Ret Payout - SP & Vac - Misc")
     - SUMIFS('BI Payroll'!$AL, 'BI Payroll'!$AD, $D2, 'BI Payroll'!$X, U$1, 'BI Payroll'!$F, 10190, 'BI Payroll'!$V, "Premium Pay - Misc")
     - SUMIFS('BI Payroll'!$AL, 'BI Payroll'!$AD, $D2, 'BI Payroll'!$X, U$1, 'BI Payroll'!$F, 10190, 'BI Payroll'!$V, "Temp Misc LumpSum Payoff"))
```

Decoded: **per-(position, PPE, fund=10190) total salary, minus the four
non-step earnings categories (OT, RPO, PREMM, TEMPM lump sum)**. The
remainder is the step-eligible salary actuals for that position × PP.

Why subtract: the BI Payroll pivot table doesn't have a "step-only" earnings
category, so Step computes it residually. Earnings types NOT subtracted but
still in U include: regular pay, vacation, sick, holiday, comp time used —
all of which count toward step.

#### Structure — per-PP step-flagged hours (AW:BW)

**Headers:** `AW1 = =U1`, `AX1 = =V1`, ... — same PPE dates as U:AU.

**Per-PP cell formula:**

```excel
AW2 = IF(COUNTIF($D$2:$D2, $D2)>1, 0,
        SUMIFS('BI Payroll'!$AJ, 'BI Payroll'!$AD, $D2, 'BI Payroll'!$X, AW$1, 'BI Payroll'!$F, 10190, 'BI Payroll'!$AI, "Y"))
```

`'BI Payroll'!AI` is a workbook-internal column added on import = `"Y"` for
step-eligible TRC (Time Reporting Codes), blank otherwise. `AJ` = Earning
Hours. So `AW2` = **per-(position, PPE) step-flagged hours**.

Worked example: position 1106950 (Lewis-Koskinen — Alex's own seat) at PP1
shows `AW2 = 32` (4-day partial PP; 32 of 32 weekday-hours all step-flagged
because the position is exempt PCS with regular schedule), then 80 hours/PP
sustained through the FY.

#### Structure — per-PP step variance (BY:CY) — the heart of the math

**Headers:** `BY1 = =AW1`, ... — same PPE dates.

**Per-PP cell formula:**

```excel
BY2 = IF(U2 = 0, 0,
         U2 - ((XLOOKUP(BY$1, Calendar!$B, Calendar!$C) + XLOOKUP(BY$1, Calendar!$B, Calendar!$E))
                / Calendar!$N$2) * $R2)
      * AW2 / (XLOOKUP(BY$1, Calendar!$B, Calendar!$C) * 80)
```

**Decoded in two parts.**

Part 1 — **how much over/under the prorated budget for this PP**:

```
prorated_budget_this_PP = ((PP_fraction + COLA_delta_at_PP) / total_COLA_PPs) × position_total_budget
over_under = actual_salary_this_PP − prorated_budget_this_PP
```

- `PP_fraction` (Calendar!C) = 1.0 for full PPs, ~0.4 for PP1, ~0.7 for PP27.
- `COLA_delta_at_PP` (Calendar!E) = 0 for pre-COLA PPs, 0.015 for post-COLA
  PPs (FY26 SEIU 1021 Misc Jan 3, 2026 +1.5%).
- `total_COLA_PPs` (Calendar!N2) = 26.295 (≈ 26.3) — the synthetic
  COLA-weighted PP count (per [Calendar § "The 26.3 trick"](#tab-5--calendar)).
- `position_total_budget` (R2) = the position's full-year BFM budget.

So a position's prorated budget for any given PP is its share of the FY's
COLA-weighted PP count, weighted by both the PP's own fraction (full or
partial) and any COLA effect kicking in during that PP. **This is COLA-aware
per-PP proration** — not a shortcut.

Part 2 — **scale by step-hours share of the 80-hour PP**:

```
step_share_of_PP = AW2 / (PP_fraction × 80)
```

`PP_fraction × 80` = the maximum hours possible in that PP (full PP = 80,
PP1 partial = 32). `AW2` = the position's step-flagged hours that actually
posted. Ratio = "what fraction of this PP did the position spend on step-
eligible work."

**Final per-PP variance** = `over_under × step_share_of_PP`.

In words: **for each PP, take how far over (or under) budget the position
ran, then attribute only the step-eligible hours' share of that variance
to STEP**. The rest goes to whichever bucket the non-step earnings posted to
(OT, RPO, PREMM, TEMP) — and those buckets have their own per-class lines.

**Convention:** if the position has zero salary actual for the PP (U2 = 0,
i.e., position was vacant or person was on unpaid leave that whole PP), the
variance is forced to 0. Avoids attributing a "fully under budget" variance
to STEP when the person simply wasn't there.

#### Structure — year-end projection (T column)

```excel
T2 = S2
   + INDEX($BY2:$CY2, 1, XLOOKUP(Calendar!$H$2, Calendar!$B, Calendar!$A))
     / XLOOKUP(Calendar!$H$2, Calendar!B, Calendar!C)
     × IF(Calendar!$H$2 >= Calendar!$L$2, Calendar!$K$2, Calendar!$O$2)
```

Decoded:

1. **YTD step variance** (S2 = sum of BY:CY for elapsed PPs).
2. **Annualize the current-PP variance:** `INDEX(BY:CY, 1, current_PP_index) /
   current_PP_fraction × remaining_PPs`. `XLOOKUP(H2, Calendar!B, Calendar!A)`
   returns the current PP number; `INDEX` pulls that column's variance from
   the BY:CY array; divide by `PP_fraction` (Calendar!C) to get the per-full-
   PP rate; multiply by `remaining_PPs`.
3. **Pre-vs-post-COLA switching for `remaining_PPs`:**
   - If `today's PPE ≥ COLA effective date (L2 = 2026-01-16)` → use pure-PP
     remaining (`Calendar!K2`).
   - Otherwise → use COLA-weighted remaining (`Calendar!O2`).
4. Add to S2.

**Why the switch.** Pre-COLA: the projection assumes the remaining PPs
include the COLA delta (which inflates per-PP step variance because budget
proration suddenly absorbs more per PP). Post-COLA: the COLA has already
landed; remaining PPs are at the new wage with no further COLA delta to add.
The math is internally consistent with the per-PP proration in BY:CY: it
uses the COLA-weighted denominator pre-COLA and the pure-PP denominator
post-COLA, matching whatever proration logic was in effect when the run-rate
sample (current-PP variance) was taken.

OPS Summary consumers:

- **DBI E39** = `=SUM(Step!S:S) − SUMIFS(Step!S, A, "Planning")` = -$884,974
  (verified ✓ via summing Step's S col by Division).
- **DBI H39** = `=SUM(Step!T:T) − SUMIFS(Step!T, A, "Planning")` = -$939,939
  (verified ✓).
- **CPC E48** = `=SUMIFS(Step!S, A, "Planning")` = $5,247 (CPC's STEP value
  is tiny because Planning's positions are mostly TEMPM-flagged or MCCP-Range
  positions; step variance is near-zero by structure).
- **CPC H48** = `=SUMIFS(Step!T, A, "Planning")` = $5,247.

#### What's manual / fragile

1. **`'BI Payroll'!F = 10190` filter on every U:AU and AW:BW cell.** DBI
   shortcut. Silently zeroes CPC positions (CPC operates in fund 10000) and
   DBI's BIF-Continuing positions (fund 10230). CPC's Step rows in this
   workbook therefore show $0 for U:AU and AW:BW — but the Effective
   Division is `Planning`, so OPS Summary still attributes them to CPC. The
   $5,247 CPC step value comes from a handful of rows where the position
   posted to 10190 for some reason. **The fund filter needs to come from
   `dept_group.operating_funds`**, already cataloged in [cross-cutting
   concerns](#multi-dept-generalization-caveats-dbi-shortcuts-to-undo).
2. **BFM AX column (Technical Adjustment) in R formula.** Should be AZ
   (Board-adopted). Same staleness pattern as Tab 20. KosPos default = AZ;
   user can switch to other budget layers (Original / Department / Mayor /
   Committee / Technical Adjustment) for variance views.
3. **80 hours per PP hardcoded** in the variance denominator. The PP1
   partial and PP27 partial don't have 80 hours available (they have
   `PP_fraction × 80` = 32 / 56). The formula compensates by multiplying
   `PP_fraction × 80` instead of literal 80, so it's actually self-correcting
   for partial PPs. **But the 80-hour assumption ignores Fire dept** (Fire
   has a different schedule — see [definitions.md § Pay Period](definitions.md#pay-period-pp)
   for the 56-hour-week Platoon schedule note). For DBI/CPC this is fine;
   for future Fire-dept rollout the per-PP-hours constant must be looked up
   from the bargaining unit's schedule.
4. **Four hardcoded earnings-code subtractions in U:AU** (`"Overtime -
   Scheduled Misc"`, `"Ret Payout - SP & Vac - Misc"`, `"Premium Pay - Misc"`,
   `"Temp Misc LumpSum Payoff"`). If the Controller renames any of these
   account descriptions, the SUMIFS silently goes to 0, and the position's
   step variance silently *includes* the non-step earnings (over-attributing
   variance to STEP). KosPos: derive step-eligibility from the BI Payroll
   `Step Indicator` flag (AI = "Y") directly, not by subtracting non-step
   buckets. This collapses U into a single SUMIFS and eliminates the four
   literal account descriptions.
5. **Step Indicator column AI is a workbook-internal value.** Set on import,
   not in OBI source. If the import script's TRC-to-Step-Indicator mapping
   drifts, every step variance silently changes. **KosPos:** explicit
   TRC-to-step-eligibility table in `lib/labor/step-eligibility.ts`,
   versioned by effective date, with the source MOU citation per TRC.
6. **COUNTIF guard at every cell** (R, S, U, AW, BY, ...). Inefficient
   (O(n²) eval per workbook recalc) and obscures the math intent. KosPos:
   pool positions get their `Position Max Headcount > 1` flag preserved;
   the rollup function knows to count each position once regardless of
   incumbent count.
7. **`BY2`'s structure assumes `position_total_budget` (R2) is allocated
   evenly across PPs proportional to PP_fraction + COLA_delta.** True for
   positions with no merit-step events during the year. For a position that
   gets a step bump mid-year, the budget allocation should rise after the
   step date. The BY:CY formula doesn't know about step events — it just
   prorates the FY total uniformly across COLA-weighted PPs. STEPM correctly
   captures the *variance* (because actuals jump too), but the **per-PP
   proration is theoretical, not actual**. Step-variance is correct in
   aggregate (S column sums to the right number) but the per-PP attribution
   is approximate.
8. **MCCP positions get folded into Step** — the per-position variance
   formula treats MCCP positions the same as step positions, which is
   conceptually wrong:
   - **Step positions:** budget at top regular step; actual at incumbent's
     current step; STEPM credit = difference. Per-PP variance formula
     correctly captures it.
   - **MCCP positions:** budget at top of Range A; actual anywhere in
     Range A/B/C; **9994 MCCP Offset credit = difference**. The variance
     mechanism is the same shape but the bucket is different. Today's
     formula attributes the MCCP offset to STEPM in the per-position math;
     the OPS Summary's `SUMIFS(Step, "Planning", ...)` happens to pick up
     CPC MCCP and route it to CPC's row, but that's a happy accident of
     CPC being mostly MCCP. **DBI has MCCP positions too** (a small
     handful, e.g., MCCP-classified Deputy Directors) and their offsets
     leak into the DBI STEPM line. See § KosPos improvements #1 below for
     the proposed split.
9. **103-col-wide tab is slow to recalc.** Every per-PP cell does 4 SUMIFS
   against BI Payroll (~40k rows). 605 positions × 27 PPs × (U + AW + BY) =
   ~50k cells; each does 1–5 SUMIFS = up to 250k SUMIFS evaluations per
   workbook recalc. Excel handles it but reopens are slow. KosPos: same
   math as a single SQL query against the position-by-PP grid.

#### KosPos improvements

##### 1. Split MCCP Offset into its own special-class tab (9994)

**Alex's flag** (carried forward from Phase 4 / Session 8 [special-class.md
§ 9994](special-class.md#9994m_c--mccp-offset-misc--pending-walkthrough),
re-flagged in this session's prompt): **MCCP handling needs splitting out
from STEPM**.

**The conceptual distinction:**

| | **STEPM (step classes)** | **9994 (MCCP)** |
|---|---|---|
| Budget assumption | Top regular step | Top of Range A |
| Actual position | At incumbent's current step (1–10 typically) | Anywhere in Range A / Range B / Range C |
| Adjustment classification | Step Adjustments - Misc (account 5050xx) | MCCP Offset - Misc (separate account) |
| Reference axis | DHR salary steps table | DHR MCCP range table |
| Per-position math | Top-step budget − projected step actual | Range-A-top budget − projected range actual |
| Mid-year change | Merit step bump auto-advances on Merit Increase Date | Performance review can re-set within range (not auto) |

The math shape is the same — both compute `(budget − projected_actual)` per
position — but the **reference data** is different (Steps table vs MCCP
Ranges table) and the **accounts they post to** are different (50xx Step
Adjustments vs the MCCP Offset account family).

**KosPos design.** Two separate special-class surfaces:

- **STEPM tab (this Tab 18, rebuilt):** per-position step-class adjustments,
  using the DHR salary-steps reference data, posting to STEPM account.
  Excludes MCCP positions (filtered out by `job_class.is_mccp = false`).
- **MCCP Offset tab (new, to be drafted in Phase 2.0h):** per-position MCCP
  offset, using the DHR MCCP-range reference data, posting to MCCP Offset
  account. Includes only MCCP positions. Each position's offset = (Range A
  top − incumbent's current rate × annualized).

This eliminates the OPS Summary CPC asymmetry where MCCP Offset (row 49)
gets a hardcoded budget cell but no E/H formulas — because under the split,
9994 is its own row with its own per-tab YTD + projection treatment.

DBI's small MCCP population (handful of Deputy Directors) gets correctly
routed to a DBI 9994 row in the rebuilt OPS Summary instead of leaking
into DBI STEPM. Visibility improves; reconciliation closure tightens.

**Tab order in KosPos:** Step, MCCP Offset, ... — kept adjacent to make
the conceptual pair obvious in the UI.

##### 2. Step-eligibility from BI Payroll TRC table, not residual subtraction

**Problem in the workbook.** U:AU = "all salary minus four hardcoded
non-step earnings categories." The four are literal account-description
strings. If the chart of accounts is renamed, the subtraction silently
fails open (variance over-attributed to STEPM).

**KosPos design.** Source step-eligibility from BI Payroll's TRC (Time
Reporting Code) directly:

```ts
type StepEligibleTRC = {
  trc_code: string;
  trc_description: string;
  step_eligible: true;
  effective_start: Date;
  effective_end: Date | null;
  mou_citation: string;
};
```

The labor-data importer joins BI Payroll's TRC code against this lookup
to set `is_step_eligible` per BI Payroll row at import time. Step variance
then sums positively (only step-eligible $ included) instead of negatively
(everything minus non-step). Eliminates the four literal subtractions.

##### 3. Surface step-event awareness

**Problem in the workbook.** BY2's per-PP proration assumes the position's
budget is uniformly spread across PPs — including the assumption that the
employee's pay rate is constant within the FY. In reality, employees on
Step 1–9 typically advance one step on their Merit Increase Date (col AJ of
P&P Data). The proration absorbs this incorrectly: post-merit PPs cost
more per PP than pre-merit, but the formula treats them equally.

The aggregate S column sums correctly (because actuals also rise post-
merit, so variance washes out at year-end), but **the per-PP variance values
themselves drift** — pre-merit PPs show under-budget variance (too generous),
post-merit PPs show over-budget variance (too tight). Misleading for trend
visualization.

**KosPos design.** Per-PP proration takes the **expected rate at that PP**
into account, derived from each employee's step history + future Merit
Increase Date. Aggregate variance unchanged; per-PP variance becomes
meaningful (zero variance when employees are on plan; positive variance
only when actuals differ from expected).

##### 4. Pool position handling

**Problem:** the COUNTIF guard absorbs pool positions by zeroing duplicate
rows. Loses the per-incumbent visibility.

**KosPos design:** pool positions modeled with explicit `max_headcount > 1`
attribute. The variance rollup function knows to attribute one prorated
budget share per Position Number (not per incumbent), but **the per-PP
variance breakdown can drill into per-incumbent detail** (which body in
the pool contributed how much variance). Today's workbook can't do this.

##### 5. Per-FY constants pulled live

**Problem:** PP-hours assumption (80) hardcoded; subset of dept-groups
(DBI 10190 only). Both already cataloged.

**KosPos design:** per-bargaining-unit per-PP-hours from the MOU's schedule
article; per-dept-group operating-fund-set from BFM.

#### KosPos UI sketch

**Step Savings page** — one of the per-special-class cards. Different layout
from Premium/Overtime because Step is per-position, not per-earnings-code:

```
DBI · Step Savings (STEPM) · FY26 · as of PP 22 of 26.1
┌────────────────────────────────────────────────────────────────────┐
│ Total Budget    YTD Actual    YTD Pace    Projected    Variance    │
│  -$586,292      -$884,974     -$503,178   -$939,939    +$353,647   │
└────────────────────────────────────────────────────────────────────┘
                                                  (credit; positive = more savings)

By position (top 5 contributors to projected savings)
  POS 1106950  Lewis-Koskinen   Class 953  -$8,932   (1 step below top)
  POS 11xxxxx  Smith,John       Class 6248 -$7,621   (3 steps below top)
  POS 11xxxxx  Doe,Jane         Class 6270 -$6,884
  POS 11xxxxx  ... (vacant)     Class 6248 -$5,500   (vacancy savings)
  POS 11xxxxx  ... (vacant)     Class 1450 -$4,732
                                                  
Step events this FY
  PP15 merit advances: 47 positions advanced 1 step (Jan 16, 2026)
  PP12 reclasses: 3 positions to higher class (Dec 5, 2025)
                                                  
Year-end projection breakdown
  YTD step actual variance                  -$884,974
  Current-PP run-rate × remaining PPs       -$54,965    (pre-COLA switch: ÷ O2; post-COLA: ÷ K2)
  Step event adjustments (planned merits)   $0          (none scheduled past PP22)
  ────                                     ─────────
  Projected total                          -$939,939
```

Position drill-down: click a row → per-position step trajectory chart
showing PP-by-PP variance + step-event annotations.

#### Excel export notes

- Mirror A:T layout (per-position spine + totals).
- U:AU per-PP YTD salary actuals — emitted from the live query, no
  per-cell SUMIFS chain.
- AW:BW per-PP step-flagged hours — emitted from the live query.
- BY:CY per-PP step variance — emitted with the same proration formula,
  using whichever salary-rate source KosPos has (step-event-aware in
  improvement #3 mode, uniform proration in legacy-parity mode).
- **Named ranges:** `STEPM_DBI_TotalActual`, `STEPM_DBI_TotalProjection`,
  `STEPM_PerPosition[positionNumber].variance`, etc.
- **MCCP positions excluded** when KosPos has split MCCP into its own tab
  (improvement #1). Excel export emits two sheets: `Step` (step-class
  positions only) and `MCCP Offset` (MCCP positions only).

#### Open questions / TODO

- [ ] **Reasonable-default call (this session, per Alex's session prompt):**
      KosPos splits MCCP into its own tab (9994). Aligns with the deferred
      reasonable-default #3 in [Tab 26 open questions](#open-questions--todo-7).
      No correction needed — Alex's session prompt explicitly endorses this.
- [ ] **Confirm step-event awareness (improvement #3) is wanted.** Adds
      modeling complexity; benefit is meaningful per-PP variance display.
      Possibly defer to a Phase 2.2 sub-phase.
- [ ] **Confirm BI Payroll col AI (`Step Indicator = "Y"`) value-set is
      authoritative.** The workbook treats `"Y"` as the only step-eligible
      flag value. Are there other values (`"P"` partial? `"E"` exempt?) we
      need to handle?
- [ ] **Step events extraction.** Where in the data sources are merit-step
      events? P&P Data col AJ = `Employee Merit Increase Date` gives the
      *next* event date but not history. For step-event-aware projection
      we need a per-employee step history from PS HCM.
- [ ] **MCCP range data source.** The 9994 tab walkthrough (deferred to
      Phase 2.0h) needs DHR's MCCP range table. Confirm location with
      Alex; if it lives in `15.15.022 - SF MCCP Pay Tables FY26.xlsx`
      (already in [`data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md)),
      tag the importer requirement.
- [ ] **Pool positions in Step.** Confirm whether pool positions
      (e.g., commissioner positions with 30 incumbents) carry meaningful
      step variance or whether their COUNTIF-zeroed pattern is correct
      end-to-end. Suspect they're all TEMPM-classified so the variance is
      zero regardless, but verify.
- [ ] **Cross-check against [Task B BVA reconciliation](../audits/bva-reconciliation-suite.md)**:
      does BVA show STEPM total = $586,292 budget for DBI? If the BFM
      special-class summary rows the SPECIAL block in Tab 20 reads from
      reconcile, then OPS!G39 should match.

---

---

### Tab 19 — Retirement Payout

**Status:** walkthrough — done 2026-05-25

**Purpose:** **Per-(dept-group × dept × job class × person × earnings code × PP) YTD
retirement-payout actuals** for the special-class line RTPOM. Pure pivot, no
projection panel — the year-end projection lives in OPS Summary as
`H38 = IF(Calendar!K2=0, E38, MAX(G38, E38))` (already documented in
[special-class.md § RTPOM_E year-end projection](special-class.md#rtpom_e--retirement-payout-account-510210--walked-through-2026-05-23)).

This is the simplest of the four per-special-class tabs structurally — a single
pivot with no auxiliary panels — but the **per-employee detail it surfaces is the
most operationally interesting**. Each row names a specific person, the earnings
codes they cashed out, when, and how much. This is the per-employee retirement-
payout data Alex would use to recognize patterns and identify candidates for
the per-employee scenario builder deferred from Phase 4 (Session 9).

**Snapshot scope.** 66 rows × 70 cols (A:BR; visible projection slice A:AF). Two
dept-group blocks (CPC rows 6–8 envt planning + 9–13 community equity + 14–15
exec office + 16–18 citywide + 19–... current planning ; DBI rows starting
around row 30). Two row totals (row 65 DBI Total $359,014, row 66 Grand Total).

#### Data sources

- **Source:** OBI BI Payroll, page-filtered to **two accounts** rolled up via
  the `"(Multiple Items)"` selection in B1:
  - **`510210`** "Ret Payout - SP & Vac - Misc" — the main retirement-payout
    account (vacation pay out + vested-sick / wellness pay out — see
    [special-class.md § RTPOM_E per-employee math](special-class.md#per-employee-payout-math--eligibility-rules)
    for the eligibility research).
  - **`505060`** "Temp Misc LumpSum Payoff" — the temp parallel (temp
    employees' final payouts).
  
  Pivot cache = `pivotCacheDefinition6.xml` (BI Payroll source).
- **Earnings codes in account 510210:**
  - **`VPO`** (Vacation Pay Out) — every position pays this out.
  - **`SVO`** (Severance Pay Out) — only for positions with vested sick /
    wellness pay eligibility.
  - **`CPO`** (Comp Time Pay Out) — **third earnings code newly identified
    this session** at row 61 (DBI PS Technical Support). Per the Phase 4
    RTPOM research, SEIU 1021 ¶431 pays comp time at termination — and the
    workbook does post it to 510210. KosPos must enumerate this code in
    the RTPOM routing rules (the prior research had only identified VPO
    + SVO; CPO is the third).
- **Refresh cadence:** pivot re-aggregates on BI Payroll re-import.

#### Structure — pivot (A1:AF66)

**Page filter (row 1):** A1 = `Account Description`, B1 = `(Multiple Items)`.
The `(Multiple Items)` label means a multi-value selection (510210 + 505060) is
active. The actual selected values aren't visible in the cell — they're stored
in the pivot's `pageItems` XML. **Maintenance fragility:** if the selection is
accidentally narrowed to one account, the pivot silently drops the other; no
visible cue.

**Row 3 labels:** A3 = `Sum of Balance Amount` (data field), H3 = `Fund Code`
(outer col field), I3 = `Earning Period End Date` (inner col field).

**Row 4 fund headers (outer col axis):**

| Cell | Value | Meaning |
|---|---|---|
| H4 | `10190` | DBI operating fund |
| R4 | `10230` | DBI BIF-Continuing |
| T4 | `10000` | CPC operating fund |
| AE4 | `10770` | CPC capital projects |
| AF4 | `Grand Total` | Row-total column |

Five fund segments cover most DBI/CPC retirement-payout activity. The pivot's
**OPS Summary consumer (E38) uses `Department Group Code = "DBI"` not Fund
Code** — so picks up the **entire** DBI block (sum across all 5 funds for
DBI), not just one fund. This is a meaningful difference from PREMM and OVERM
which filter by fund.

**Row 5 PPE headers (inner col axis):** sparse — only PPs with activity get
columns. At this snapshot, the visible PPE dates start at 2025-07-18 (H5)
and continue through 2026-05-08 (AD5). Cols are dynamically generated per
PP × fund combination, hence H:AF spans 5 funds × ~13 PPs per fund (with
empty cells where no activity in that PP × fund slice).

**Row fields (rows 6+):** Department Group Code → Department Description →
Job Code → Job Description → Person Full Name → Earnings Code → Earnings Code
Description. Six-deep row axis — this is the per-person grain. Worked
examples:

- Row 6: `CPC > CPC Environmental Planning > COMMN:5298 (Planner 3-Env
  Review) > Dito,Laura C > VPO Vacation Pay Out > $3,100.34` (in PP starting
  9/26 — col U)
- Row 9: `CPC > Community Equity > COMMN:0931 Manager III > Haddadanyazdi >
  VPO > $5,111.54`
- Row 10: `(same person) > SVO Severance Pay Out > $49,738`
- Row 12: `(another person) > VPO > $632.98`
- Row 61: **`CPO Comp Time Pay Out`** at DBI PS Technical Support, $7,209
  (the newly-identified earnings code)

#### Structure — sub-rollup rows + totals

**Dept-group sub-rollups** appear as expected:

- `CPC Environmental Planning Total` (row 8): $3,604
- `CPC Community Equity Total` (row 13): $93,458
- `CPC Executive Office Total` (row 15): $7,036
- `CPC Citywide Planning Total` (row 18): $28,576
- `CPC Current Planning Total` (subsequent rows): not extracted but contributes
  to CPC overall

DBI sub-rollups appear in the later rows. **Row 65 = `DBI Total` = $359,014**
(verified ✓ against OPS!E38 = $359,014 GETPIVOTDATA). **Row 66 = `Grand Total`
= $721,528** (CPC $362,514 + DBI $359,014, per OPS!E47 + E38).

#### Year-end projection (lives in OPS Summary, not here)

The projection rule from [special-class.md § RTPOM_E year-end projection](special-class.md#rtpom_e--retirement-payout-account-510210--walked-through-2026-05-23):

```excel
OPS!H38 = IF(Calendar!$K$2 = 0, E38, MAX(G38, E38))
        = IF(0 = 0, E38, MAX(249,998, 359,014))
        = $359,014  (since K2 = 3.7 ≠ 0, → MAX(249,998, 359,014) = 359,014)
```

**Re-verified this session against the live OPS Summary cell** ✓ —
`H38 = =IF(Calendar!$K$2=0,E38,MAX(G38,E38))`, evaluates to $359,014.

In words: **if no PPs remain (year is over), projection = YTD actual; otherwise,
projection = max(total budget, YTD actual)**. The MAX-of-budget-vs-actual is
deliberately conservative: it floors at budget so RPO never projects below
budget, protecting against under-projecting an overrun in a lumpy line.

CPC's parallel: `OPS!H47 = IF(Calendar!$K$2=0, E47, MAX(G47, E47))` =
$362,514.

#### What's manual / fragile

1. **`"(Multiple Items)"` page filter is opaque.** Reader can't see which
   accounts are selected. If a third RTPOM-relevant account is added by the
   Controller (e.g., a new "Ret Payout - Bonus Misc" account), it doesn't
   get picked up unless someone manually edits the pivot's page selection.
   The CPO comp-time code identified this session is at least posting to
   the existing 510210, so it's caught — but **a new account would silently
   disappear**.
2. **Per-PPE columns are dynamically generated** based on which (Fund × PPE)
   slices have data. **The fund-outer × PPE-inner ordering means PPEs are
   not aligned across funds.** Row 6's $3,100 (CPC fund 10190, PPE 2025-
   09-26) sits in column U; the same PPE for fund 10000 sits in a different
   column. KosPos: per-PP rendering should align by PPE across funds, not
   nest fund-then-PPE.
3. **OPS Summary uses Department Group Code, not Fund Code, for RTPOM
   GETPIVOTDATA.** Different from PREMM/OVERM. Means RTPOM picks up *all*
   funds for the dept-group, including BIF-Continuing and capital project
   funds. Operationally correct (a retiring employee's accrued vacation
   pays out regardless of which fund their position was budgeted in), but
   **inconsistent with PREMM/OVERM/STEPM which all filter by fund.** A
   reader expecting the same fund-shortcut pattern would be wrong here.
   KosPos: unify on "sum across `dept_group.operating_funds`" plus capital
   funds where the dept-group operates; RTPOM is no different.
4. **Per-employee detail is sensitive.** Knowing "Person X received $50k in
   severance pay" is HR-confidential. The workbook displays this in plain
   text. **KosPos must gate per-person RPO data behind admin-only access**
   (same posture as the [Tab 7 § Controller-side data masking](#tab-7--bi-payroll)
   sick-leave bucket). Public-facing views collapse to dept-group totals.
5. **Snapshot reconciliation gap** (noted in [Tab 7 § Open questions](#tab-7--bi-payroll)):
   the account-side total ($721k) vs earnings-code-side total (VPO + SVO =
   $683k) shows a **$38k spread**. The CPO finding this session ($7,209
   at DBI PS Technical Support) explains part of it, but only part. There
   may be other unrecognized earnings codes posting to 510210 + 505060.
   **Action:** when KosPos importer runs, enumerate all distinct (account,
   earnings_code) pairs in BI Payroll and flag any that aren't in the
   RTPOM routing table.
6. **`SP` in account name (`Ret Payout - SP & Vac - Misc`)** has now been
   confirmed as **Sick Pay** = vested-sick / wellness balance (per Phase 4
   RTPOM research, [special-class.md § per-employee math](special-class.md#per-employee-payout-math--eligibility-rules)).
   The TODO in that section to "confirm with Controller's Payroll Division"
   can be marked complete based on the observed posting pattern (SVO codes
   post here exclusively).

#### KosPos improvements

##### 1. Per-PPE column alignment (not fund-nested)

**Problem:** the workbook's outer-fund × inner-PPE column structure
fragments per-PP detail. A person's $3,100 in PP6 sits in one column for
DBI's fund 10190 and a different column for the rare fund 10230 posting.

**KosPos design.** Single per-PPE column axis (one column per PP), with
a fund attribute on each per-employee row. Faceted view lets the user
filter by fund if needed; default view aggregates across funds.

##### 2. Per-employee retirement scenarios

**Already deferred** from Phase 4 (Session 9 — "per employee scenarios,
move to out of scope"). The Tab 19 walkthrough reaffirms the
data-availability case: RPO has clean per-employee history (this person
cashed out $X in PP Y), and combined with P&P Data's eligibility
attributes (years of service, age, MOU, sick balance), KosPos can offer
"if Person X retires by PP Z, expected payout is $Q" estimates. Re-flag
as a Phase 6 item rather than Phase 4 — needs:

- Per-employee leave-balance importer (sick + vacation balances from
  PS HCM) — not in the current data set.
- Per-MOU comp-time + vested-sick payout rules already researched.
- Per-employee retirement-eligibility flag derived from age + service
  + tier (per the [SFERS Leaving City Service guide](https://mysfers.org/leaving-city-service/)).

##### 3. Enumerate CPO + any other earnings codes posting to 510210/505060

**Problem:** Phase 4 RPO research enumerated VPO + SVO; CPO was missed.
The Data Issues panel should flag any unrecognized earnings codes
posting to these accounts so KosPos's routing rules stay current.

**KosPos design.** Importer maintains a known-codes registry:

```ts
type RPOEarningsCode = {
  code: string;          // "VPO" / "SVO" / "CPO"
  description: string;
  payout_kind: 'vacation' | 'sick_vested' | 'comp_time' | 'severance' | 'other';
  mou_section?: string;
  effective_since: Date;
};
```

A new earnings code observed in 510210 + 505060 surfaces in Data Issues
as "unrecognized RPO earnings code — confirm routing". The
[scenario-tests audit](../audits/labor-report-scenario-tests.md) already
flagged similar "enumerate unknown codes" requirements for premium pay;
RPO follows the same pattern.

##### 4. Conservative projection alternative

**Problem:** `MAX(budget, YTD)` is conservative but coarse. Lumpy line —
in PP 22 RPO might be $50k under budget; in PP 23 a single retirement
cashes out $80k and suddenly it's $30k over. The projection swings
between PPs depending on luck of cashout timing.

**KosPos design.** Three projection modes side-by-side (only the conservative
displays as headline; others queryable):

1. **Conservative (workbook default)**: `MAX(budget, YTD)`.
2. **Straight-line annualize**: `YTD × J2/I2`. Often lower than conservative
   mid-year, sometimes wildly off if a $50k cashout happened in PP1.
3. **Historical-mean-anchored**: `MAX(YTD, average of prior 3 FYs × pacing
   factor)`. Smooths the lumpiness.

The conservative answer goes in the report; the others inform planning.
Same pattern proposed in [Tab 26 § attrition rate](#tab-26--operating-report-summary)
for the 9993 line.

##### 5. Itemized projection (per Phase 4 deferred work)

For positions tagged `likelyToRetire = {yes, no, unknown}`, compute an
itemized projection: "if all 'yes' employees retire by year-end at their
estimated payout, expected RPO = $X." Use as a sanity bound on the lump-sum
projection. Already in [special-class.md § RTPOM notes / improvement
ideas](special-class.md#rtpom_e--retirement-payout-account-510210--walked-through-2026-05-23).

#### KosPos UI sketch

**Retirement Payout page** — one of the per-special-class cards. Mirrors
PREMM/OVERM headline but with per-employee detail behind admin-only role
gate:

```
DBI · Retirement Payout (RTPOM) · FY26 · as of PP 22 of 26.1
┌────────────────────────────────────────────────────────────────────┐
│ Total Budget    YTD Actual    YTD Pace    Projected    Variance    │
│  $249,998       $359,014       $214,558    $359,014    -$109,016   │
│                                                  ↑ MAX(budget, YTD)│
└────────────────────────────────────────────────────────────────────┘
                  (conservative — never projects below budget)

By earnings code (FY26 YTD)
  VPO Vacation Pay Out       $270,000
  SVO Severance Pay Out      $82,000
  CPO Comp Time Pay Out      $7,000     ← NEW: enumerate in routing rules
                                                  
[Admin only:] By dept × person (FY26 YTD)
  DBI ADM Records Mgmt        Smith,J          $48,000
  DBI IS Plumbing Inspection  Jones,T          $35,000
  ... (8 more individuals)
                                                  
Projection mode (conservative — default)
  YTD actuals                $359,014
  Total budget               $249,998
  MAX rule selects           $359,014
  ────                       ─────────
  Projected total            $359,014
  
Alternative projections (planning view)
  Straight-line annualize    $418,330  (YTD × 26.1/22.4)
  Hist-mean anchored         $312,000  (mean of FY23-FY25 × pacing)
```

Admin-role-gated per-employee table appears only for users with HR-detail
permission.

#### Excel export notes

- Mirror A1:AF66 pivot layout for parity.
- Per-employee rows masked or omitted in standard exports; admin export
  emits full detail.
- Earnings-code summary block added (count + total per code) so the import
  side can be cross-referenced.
- Named ranges: `DBI_RTPOM_YTDActual`, `DBI_RTPOM_TotalBudget`,
  `DBI_RTPOM_Projected`, `RTPOM_KnownEarningsCodes` (the routing table).

#### Open questions / TODO

- [ ] **Confirm CPO posting account.** This session's extraction shows CPO
      (Comp Time Pay Out) at row 61 contributing to 510210. SEIU 1021 ¶431
      says comp time pays out at termination. Confirm with Controller that
      CPO always posts to 510210 (not to a separate comp-time account or
      back to the regular OT account 511010).
- [ ] **Investigate the $38k snapshot reconciliation gap** (Tab 7 §
      Open questions). CPO accounts for $7k; the remaining $31k is
      still unaccounted for. May be other earnings codes (e.g., a
      bilingual lump sum at termination), or may be a refund / reversal
      causing one side to net different from the other.
- [ ] **Reasonable-default call (this session):** RPO projection rule
      `MAX(budget, YTD)` is correct as-is — it's the conservative report
      figure. Alternative projections render as planning view, never as
      headline. Aligns with [Tab 5 Calendar § Improvement #3 — show
      correct headline + alternatives as side notes](#tab-5--calendar).
- [ ] **Per-employee scenario builder is Phase 6**, not Phase 2.0f.
      Already cataloged; re-affirmed this walkthrough.
- [ ] **Reconcile against [Task B BVA reconciliation suite](../audits/bva-reconciliation-suite.md)**
      Test 3 — does BVA show $721k for accounts 510210 + 505060 across
      DBI + CPC dept groups? Already covered for PREMM/OVERM-style
      reconciliation; RPO should join cleanly too.
- [ ] **Per-MOU pay rules verification.** RTPOM research left ~5 open
      MOU items (vacation caps per MOU, comp-time pay rate, vested-sick
      formula details, public-safety MOUs). Defer to Phase 6 — none
      block the YTD-and-projection presentation that Tab 19 provides.

---

---

### Tab 20 — Report Data

**Status:** walkthrough — done 2026-05-25

**Purpose:** **The spine of the workbook.** Brings together budget (from BFM), actuals
(from BI Payroll), position identity (from P&P Data), Staffing Plan additions, and
Inactive cross-references into one position-aware dataset. Every per-position row
carries a YTD budget pace, YTD actuals (split into operating-fund and
continuing-fund grids), and a COLA-aware year-end projection. Per-dept catcher rows
capture overtime / retirement-payout actuals that were excluded from the
per-position rows so the dept-level rollup doesn't lose them. A 100-row reference
block at the bottom holds per-(dept × special-class) budget amounts that
Operating Report Summary reads to populate its special-class lines.

Report Data is the **most fragile spine in the workbook** because it joins 5
upstream sources (BFM, BI Payroll, P&P Data, Staffing Plan, Inactive) through a
mix of XLOOKUPs, SUMIFS, direct cell refs, and **hand-pasted values** that have
to be refreshed every PP. Alex's own note: "manual to update, may contain errors."

**Snapshot scope.** 798 rows × 80 columns (A:CB). The rows organize into **eight
archetypes** that share the same column shape (S:X budget/actuals/projection
block + Y:AY per-PP operating grid + AZ:BA continuing rollup + BB:CB per-PP
continuing grid) but differ in how their identity and per-PP values are computed:

| Archetype | Row range | Count | Per-row identity | Per-PP grid filter |
|---|---|---|---|---|
| **Per-position** | 2–606 (with 4 blank-separator rows 607–610) | 604 | Static A:Q pasted from P&P Data (current snapshot) | `AD = position` |
| **OVERTIME** (catcher) | 611–628 | 18 (DBI-only) | A:Q hand-keyed per dept | `I = dept`, `V = "Overtime - Scheduled Misc"` |
| **PAYOUT** (catcher) | 630–647 | 18 (DBI-only) | A:Q hand-keyed per dept | `I = dept`, `V IN ("Ret Payout - SP & Vac - Misc", "Temp Misc LumpSum Payoff")` |
| **SPECIAL** (budget ref block) | 649–748 | 100 | A:Q hand-keyed per (dept × class); `K = LEFT(A,3)` for dept-group | _(none — Y:CB empty)_ |
| **NEWP** (new mid-year position) | 750–751 | 2 (= 1 hire × 2 lines) | Hand-keyed; `E = "NEWPxxxxx"` carries BFM eturn ID | _(empty — actuals come once filled)_ |
| **MERGE** (KK budget transfer) | 753 | 1 | Hand-keyed dept attribution | _(empty)_ |
| **INACTIVATED** | 755–760 | 6 | Hand-keyed; identity for positions no longer in P&P | `U` hand-keyed (copied from Inactive tab) |
| **GL** (placeholder) | 762 | 1 | Hand-keyed; zeroed-out by design | _(none this year)_ |
| **HIRING** (Staffing Plan) | 767–790 | 24 | XLOOKUP A/C/P/Q from P&P Data + direct ref to Staffing Plan B/D/F/G/H/K/L/M/N/O/W | _(empty — `W` taken from Staffing Plan directly)_ |
| **SEPARATING** (Staffing Plan) | 795–798 | 4 | Same as HIRING + I/J/K from P&P Data XLOOKUP | _(empty — `W` from Staffing Plan)_ |

(Blank rows 607–610, 629, 648, 749, 752, 754, 761, 763–766, 791–794 are visual
separators between sections.)

Per-position rows break down: 490 FILLED + 87 VACANT + 21 PARTIALLY FILLED + 6
OVER FILLED. Same totals as P&P Data — confirming the per-position row count
matches the active-position snapshot exactly.

**Per-position rows are not unique by position number.** 604 rows cover only 568
distinct positions. The 36 excess rows are **pool / shared positions** where
multiple incumbents occupy the same position number — most prominently
**commissioners** (e.g., position 1094089 has 14 rows in this snapshot). Per
Alex: best practice is one position per person, but for cohorts where individuals
churn frequently (commissioners, temps, exempts), creating/inactivating
positions per person isn't worth the workflow overhead — they share a position
number. The Report Data formulas defend against double-counting via a `COUNTIF
guard` (see § Formulas) that zeroes the second-and-later occurrences of a
position number; only the first row carries the budget and actuals.
**KosPos surfaces these pool positions as a Data Issue suggesting one-position-per-person but lets the user decide.**

#### Data sources

Report Data is **workbook-internal** — there is no Report Data OBI export. Each
column draws from one of five upstream sources or is hand-keyed:

| Source | Read by | Mechanism | Freshness |
|---|---|---|---|
| **P&P Data** (Tab 6) | A:Q identity columns (per-position rows: static-pasted; HIRING/SEPARATING: dynamic XLOOKUP) | XLOOKUP on Position Number into 7 P&P columns (`CH`, `CB`, `CC`, `BE`, `AA`, `AB`, `Q`) | Per refresh; 124 XLOOKUPs total |
| **BI Payroll** (Tab 7) | Y:AY (operating-fund per-PP grid) + BB:CB (continuing-fund per-PP grid) | SUMIFS on `(AD position, X PPE, F fund, V account)` — 130k+ calls total | Per refresh; live formula recalc |
| **BFM 15.10.006 FY26** (Tab 4) | S `Total Budget` for per-position rows | SUMIFS on `D BY HCM Position#` → `AX FY 2025-26 Technical Adjustment` | Annual (BFM eturn); 603 SUMIFS into BFM |
| **Staffing Plan** (Tab 24) | B/D/F/G/H/K/L/M/N/O/W for HIRING + SEPARATING rows | Direct cell refs (`='Staffing Plan'!Bn`) | Per Staffing Plan edits; 28 cols × ~10 cells |
| **Inactive** (Tab 13) | `U YTD Operating Actuals` for INACTIVATED rows | **Hand-pasted** from Inactive's `E Sum of Balance Amount` pivot | Per refresh; manual paste, no formula |
| **BFM 15.10.006 FY26** (Tab 4, again) | S column for SPECIAL block (rows 649–748) | **Hand-pasted** from BFM Special Class summary rows | Annual; 100 hand-pasted cells per refresh |

**Refresh workflow.** Each pay-day Tuesday (when BI Payroll is re-pulled — see
Tab 7 § Data sources), Alex:

1. Re-pastes P&P Data identity columns into A:Q for any newly-added or moved
   positions (or relies on the existing static paste if no changes).
2. Lets the SUMIFS into BI Payroll auto-recalc the per-PP grids and the budget
   pacing.
3. Re-pastes the Inactive tab's `Sum of Balance Amount` values into the
   INACTIVATED block's U column (6 cells in this snapshot).
4. Re-checks the SPECIAL block budgets if any mid-year BFM adjustments happened
   (rarely).
5. Adjusts HIRING / SEPARATING / NEWP rows as the Staffing Plan changes.

**Planned addition (Phase 2.4 importer + Phase 6 reconciliation):** the
**`BVA` report** from PS Financials (delivered via OBI) should be uploaded each
PP as the **source-of-truth for budget AND actuals**. KK budget journals
(mid-year transfers) and GL actuals journals (post-PP adjustments) **do not
carry position detail — only chartfields**. Comparing BVA against the eturn
(budget side) and against BI Payroll (actuals side) surfaces the
chartfield-level variance that the position-aware Report Data cannot model.
**KosPos should require the BVA upload alongside BI Payroll and P&P Data each
PP and reconcile per chartfield string, excluding inactive positions.** Full
schema (68 columns), refresh-order timing rule, and verified reconciliation
pattern in [`../data-sources/bva.md`](../data-sources/bva.md);
KosPos-side approach in [§ KosPos improvements](#kospos-improvements-6) below.

#### Cross-cutting: the dual per-PP grid (Y:AY operating, BB:CB continuing)

Every row's actuals grid is **two parallel 27-column grids**, one per
fund-control class, both indexed by PPE date in row 1:

| Cols | Header (row 1) | Meaning | Fund filter |
|---|---|---|---|
| Y:AY | `=Calendar!B2` … `=Calendar!B28` (PPE dates PP1–PP27) | **Operating-fund per-PP actuals** | `F IN (10190, 10000)` — DBI BIF Operating + CPC GF Operating |
| AZ | `YTD Continuing Actuals` (header) / `=SUM(BB2:CB2)` (data) | YTD continuing rollup | — |
| BA | `Projected Continuing Actuals` (header) / projection formula (data) | Year-end continuing projection | — |
| BB:CB | `=Y1` … `=AY1` (mirrors PPE dates) | **Continuing-fund per-PP actuals** | `F <> 10190` — everything outside DBI BIF Operating |

The "operating" / "continuing" terminology matches [`budget-process.md`](budget-process.md)'s
`Fund Control: FACCT (annual)` vs `FCNT (continuing)` split. **Two operating funds
get the special pair `{10190, 10000}` treatment** (DBI's BIF Operating + CPC's
General Fund); everything else (10230 BIF Continuing, 10840 CPC Planning Code
Enforcement, special revenues, grants, capital) goes in the continuing grid.

**`<>10190` not `<>{10190, 10000}` in the continuing filter is a bug** — when
the operating grid catches `{10190, 10000}`, the continuing grid should exclude
both, but the BB2-style formula only excludes 10190. The result: **fund 10000
dollars get double-counted** when CPC positions land there. In this snapshot
no CPC positions post to 10000 at the PP-level (all CPC operating goes to
its CPC-specific funds), so the bug is dormant — but it's a real defect Alex's
in-progress CPC roll-in will trigger. KosPos must derive the continuing-grid
filter as the **complement of the operating set**, not a hardcoded `<>10190`.

#### Formulas — per-position block (rows 2–606)

The columns split into seven concerns. The shared S:X block + Y:CB dual grid
described above is identical across all archetypes; this section walks through
the per-position-specific shapes.

##### A:Q — identity (static paste from P&P Data this refresh)

For per-position rows these are **literal values** copied from the P&P Data
snapshot at refresh time (not live XLOOKUP formulas). The 124 XLOOKUP formulas
counted by Tab 6 § "How each downstream tab consumes P&P Data" actually live in
the **HIRING / SEPARATING / NEWP** archetypes, not the per-position rows.

| Col | Source | Notes |
|---|---|---|
| A | P&P Data `CH` Effective Employee Division | DBI-only manual lookup table; CPC rows carry literal `"Update Formula"` — see [Tab 6 § Manual / fragile](#whats-manual--fragile) |
| B | P&P Data `CG` Effective Employee Department | Rolled-up text dept name |
| C | P&P Data `CB` Budget Department Code 1 | 6-digit dept ID (annual-locked) |
| D | P&P Data `B` Position Number | **Primary key** — drives BFM join, BI Payroll SUMIFS, COUNTIF dedup |
| E | P&P Data `N` Position Fill Status | `FILLED` / `VACANT` / `PARTIALLY FILLED` / `OVER FILLED` |
| F | P&P Data `AD` Employee Job Code | Can differ from H (budget job code) when acting |
| G | P&P Data `AF` Employee Appointment Type | `PCS` / `PEX` / `TEX` / `ELC` / `TPV` / `(blank)` for vacant |
| H | P&P Data `BP` Budget Position Primary Job Code (mostly); literal `"TEMPM"` / `"(blank)"` for special-handled rows | The `R` Exclude formula reads H = `"TEMPM"` or `"(blank)"` to auto-exclude |
| I, J | P&P Data `AA / AB` Employee First / Last Name | Person name |
| K | P&P Data `Q` Employee Name Vice 1 | Acting incumbent (when present) |
| L, M | P&P Data `AL / AM` Manager First / Last Name | Reports-To incumbent's name |
| N, O | P&P Data `AZ / BA` Roster Code / Description | 5-char roster code; links to Tab 8 Roster Approvers |
| P | P&P Data `CC` Budget Department Description 1 | Annual-locked dept description |
| Q | P&P Data `BE` Combo CD DEPT Description | Combo-code dept (chartfield string dept; may differ from C/P) |

##### R — auto-Exclude flag

```excel
R2 = IF(OR(AND(H2="TEMPM", E2="VACANT", U2+AZ2=0),
          AND(H2="(blank)", E2="VACANT", U2+AZ2=0)),
        "Y", "")
```

Marks a row `Y` to exclude from downstream rollups iff (a) it's a TEMPM-budgeted
or unbudgeted-blank-coded position AND (b) it's vacant AND (c) it has zero YTD
actuals (operating + continuing). **Read upward by P&P Data's `CK Exclude`
column** (per Tab 6 § Formulas — cross-tab status) — closing the cross-tab loop.
Manual `Y` entries (the 11 rows Tab 6 noted) are user-curated exclusions on
non-TEMPM-vacant positions; the formula here covers the auto-detectable cases.

##### S — Total Budget (BFM SUMIFS, with COUNTIF dedup)

```excel
S2 = IF(COUNTIF($D$2:D2, D2) > 1, 0,
       SUMIFS('BFM 15.10.006 FY26'!$AX:$AX,
              'BFM 15.10.006 FY26'!$D:$D, D2))
```

Sums BFM column `AX FY 2025-26 Technical Adjustment` where BFM column `D BY HCM
Position#` matches this row's position number. The `COUNTIF` guard zeroes the
second-and-later occurrences of a position number (pool positions), so only the
first row carries the budget — preventing 14x-counting for the commissioner
pool, etc.

**Confirmed-stale formula.** `AX` is the **Technical Adjustment** layer in BFM,
not the **Board-adopted** layer (`AZ`). Per Alex this is a residual — the formula
was built when Technical Adjustment was the live column; **it should now reference
AZ (Board-adopted)**. KosPos must use the Board-adopted column. The NEWP rows
750–751 show the same bug: their hand-keyed S doesn't match BFM!AZ1273–1274
either, evidence the AX-vs-AZ confusion has spread beyond the auto-SUMIFS.

**Why 502 of 604 per-position rows have non-zero S** and 102 have S=0:
~36 of the zeros come from the COUNTIF dedup zeroing pool-position duplicates;
the remaining ~66 are positions not present in BFM's eturn (typically new
positions added to PS HCM post-budget-adoption, or positions whose BFM
row was missed because of the `D` text-vs-numeric coercion issue — BFM stores
position as zero-padded string `"01106950"`, Report Data as int `1106950`,
relying on Excel's loose-type SUMIFS comparison).

##### T — YTD Operating Budget (COLA-weighted pacing)

```excel
T2 = S2 / Calendar!$N$2 * Calendar!$M$2
```

Paces the total budget by **COLA-weighted elapsed-PP fraction** (`M2 / N2` —
both from Calendar's COLA-weighted track; see [Tab 5 § Calendar](#tab-5--calendar)).
Why COLA-weighted: actuals at any mid-year point reflect a blend of pre-COLA
and post-COLA pay periods, and the COLA-weighted track normalizes both onto
the same "PPs of full-rate work" scale. Pacing the budget the same way keeps
budget-vs-actual variance meaningful.

##### U — YTD Operating Actuals (sum of per-PP cells)

```excel
U2 = SUM(Y2:AY2)
```

Just the sum of the 27 operating-fund per-PP cells.

##### V — YTD Operating Balance (variance)

```excel
V2 = T2 - U2
```

YTD budget minus YTD actuals. Positive = under budget; negative = over.

##### W — Projected Operating Actuals (COLA-aware, two-mode projection)

```excel
W2 = U2
     + INDEX($Y2:$AY2, 1, XLOOKUP(Calendar!$H$2, Calendar!$B:$B, Calendar!$A:$A))
       / XLOOKUP(Calendar!$H$2, Calendar!$B:$B, Calendar!$C:$C)
     * IF(Calendar!$H$2 >= Calendar!$L$2, Calendar!$K$2, Calendar!$O$2)
```

In words:

1. **Start** with YTD actuals (`U2`).
2. Take the **current PP's actuals** (`INDEX(Y:AY, current PP number)` — looked
   up via Calendar's PPE-to-PP table).
3. **Normalize to full-PP equivalent** by dividing by the current PP's PP%
   (`Calendar!C` — handles partial PPs like PP1 at 0.4 and PP27 at 0.7).
4. **Multiply by remaining PPs**, choosing the track based on the COLA boundary:
   - If today's PPE ≥ COLA effective PPE (`Calendar!L2 = B16 = PP15's PPE` —
     the start of the SEIU 1021 Misc Jan 3, 2026 +1.5% bump) → use **pure
     remaining PPs** (`K2`). Current actuals already reflect the bumped rate;
     projecting forward at the same per-PP pace is right.
   - Otherwise → use **COLA-weighted remaining PPs** (`O2`). Current actuals
     don't yet include the COLA; weighting future PPs adds the bump.

This formula is the heart of [§ KosPos projections always COLA-aware](#) (see
memory `feedback_projections_always_cola_aware.md`) — **every per-position
projection in the workbook is COLA-aware**, but the math switches modes
depending on whether today's PPE is before or after the COLA threshold.

Reads four Calendar cells: `H2` (today's PPE), `L2` (COLA threshold PPE), `K2`
(pure remaining), `O2` (COLA-weighted remaining). Plus the `B:B` / `A:A` / `C:C`
columns for the per-PP lookup.

##### X — Projected Operating Balance

```excel
X2 = S2 - W2
```

Year-end budget vs projected actuals. Positive = projected under; negative = projected over.

##### Y:AY — operating-fund per-PP grid (multi-fund, three exclusions)

```excel
Y2 = IF(COUNTIF($D$2:$D2, $D2) > 1, 0,
        SUM(SUMIFS('BI Payroll'!$AL:$AL, AD:AD, $D2, X:X, Y$1, F:F, {10190, 10000}))
        - SUM(SUMIFS(..., F:F, {10190,10000}, V:V, "Overtime - Scheduled Misc"))
        - SUM(SUMIFS(..., F:F, {10190,10000}, V:V, "Ret Payout - SP & Vac - Misc"))
        - SUM(SUMIFS(..., F:F, {10190,10000}, V:V, "Temp Misc LumpSum Payoff")))
```

Regular labor dollars for this position in this PP **in operating funds**
(`F ∈ {10190, 10000}`), with three account-description exclusions: OT, RPO,
and Temp LSP. **No premium exclusion** — premium pay flows through as regular
labor here; the special-class PREMM rollup re-credits at the SPECIAL block.

Key differences from Tab 7's description of this formula:

- **Multi-fund: `{10190, 10000}`** (operating fund array), not just `10190`.
  This is the Report Data formula that "fixes" the Step-tab DBI-only `10190`
  shortcut for DBI+CPC operating-fund coverage.
- **`SUM(SUMIFS(...))` wrapping** is required to make the fund-array literal
  iterate. Each SUMIFS returns one value per fund in the array; SUM collapses
  to the total.
- **Three exclusions** (OT, RPO, Temp LSP), not four — Premium stays in.
- **COUNTIF dedup** at the outer IF zeroes pool-position duplicates.

##### AZ — YTD Continuing Actuals

```excel
AZ2 = SUM(BB2:CB2)
```

Sum of the 27 continuing-fund per-PP cells (same shape as `U` for the operating
side).

##### BA — Projected Continuing Actuals

```excel
BA2 = AZ2
      + INDEX($BB2:$CB2, 1, XLOOKUP(Calendar!$H$2, Calendar!$B:$B, Calendar!$A:$A))
      * IF(Calendar!$H$2 >= Calendar!$L$2, Calendar!$K$2, Calendar!$O$2)
```

Two differences from `W2`:

- **No partial-PP normalization** — takes the current PP's value as-is rather
  than dividing by `Calendar!C`. Continuing-fund spending is bumpy (capital
  projects, grants) so the normalization noise would be larger than the signal.
- **No `U2 +` prefix** — starts from AZ2 (continuing YTD), not from U2.

Same COLA-aware mode switch via `L2`.

##### BB:CB — continuing-fund per-PP grid (excluding-operating, three exclusions)

```excel
BB2 = IF(COUNTIF($D$2:$D2, $D2) > 1, 0,
         SUMIFS(AL, AD, $D2, X, Y$1)                                              -- all funds
         - SUMIFS(AL, AD, $D2, X, Y$1, V, "Overtime - Scheduled Misc")
         - SUMIFS(AL, AD, $D2, X, Y$1, V, "Ret Payout - SP & Vac - Misc")
         - SUMIFS(AL, AD, $D2, X, Y$1, V, "Temp Misc LumpSum Payoff"))
         - Y2                                                                       -- subtract operating cell
```

Computes total regular labor for the position in this PP across **all funds**,
applies the same three exclusions, then **subtracts the operating-fund cell
(`Y2`)** to leave only the continuing-fund residual. **Note: the BB2 form does
NOT use a `F <> 10190` filter on the SUMIFS — it relies on subtracting Y2.**
The OVERTIME and PAYOUT catcher blocks use the `F <> 10190` form instead (see
below).

**The "subtract Y2" approach is correct for two-operating-funds-and-everything-else
arithmetic** because it implicitly excludes both 10190 and 10000 (which were
captured in Y2) without needing to write the complement filter. Cleaner than the
catcher-block `<>10190` form, which has the dormant double-count bug noted in
§ Cross-cutting.

#### Formulas — OVERTIME block (rows 611–628, 18 DBI dept-rows)

Per-dept catcher for OT dollars that were **excluded from the per-position rows**
(`V = "Overtime - Scheduled Misc"`). Without this block, OT would disappear
from the dept-level rollup.

| Col | Formula | Notes |
|---|---|---|
| A:Q | Hand-keyed identity per dept | A = dept-division text, B = dept-description, P = mirror of B |
| E | Literal `"OVERTIME"` | Archetype marker |
| H | Literal `"Overtime - Scheduled Misc"` | Account-description label |
| S | (empty) | No budget — OT budget lives in SPECIAL block |
| T:V | Standard pacing / sum / variance formulas | T = S/N2*M2 = 0 (no budget); U = SUM(Y:AY) = YTD OT for dept |
| **W** | `=SUMIFS(Overtime!BS:BS, Overtime!BQ:BQ, P611)` | **Direct lookup from Overtime tab's per-dept projection block** — bypasses the standard W formula |
| Y:AY | `SUMIFS(AL, I=dept, X=PP, F=10190, V="Overtime - Scheduled Misc")` | One term, fund 10190 only (operating) |
| BB:CB | Same but `F <> 10190, V="Overtime - Scheduled Misc"` | Continuing-fund OT (the dormant 10000 double-count bug — see § Cross-cutting) |

**CPC missing.** Per Alex this is an **oversight from the in-progress CPC
roll-in** — the OVERTIME block has 18 DBI dept rows but **zero CPC dept rows**.
The current Report Data therefore under-counts citywide DBI+CPC OT actuals
unless CPC OT happens to be zero (it isn't). KosPos must extend the catcher
shape to all dept-groups in the snapshot, not just DBI.

#### Formulas — PAYOUT block (rows 630–647, 18 DBI dept-rows)

Same shape as OVERTIME but the per-PP grid sums **two** accounts:

```excel
Y630 = SUMIFS(AL, I=B630, X=Y$1, F=10190, V="Ret Payout - SP & Vac - Misc")
       + SUMIFS(AL, I=B630, X=Y$1, F=10190, V="Temp Misc LumpSum Payoff")
```

So PAYOUT covers both **RTPOM (account 510210)** and **TEMPM lump-sum payoff
(account 505060)**. The W column here uses the standard COLA-aware projection
formula (not the Overtime tab passthrough).

Same CPC-missing oversight as OVERTIME. Same dormant `<>10190` double-count bug
in BB:CB.

#### Formulas — SPECIAL block (rows 649–748, 100 rows, budget-only reference)

**No per-PP grid formulas at all** — `Y:CB` is completely empty for these rows.
The block exists **solely to hold the per-(dept × special-class) budget number
in column S** for Operating Report Summary to read.

| Col | Source | Notes |
|---|---|---|
| A | Hand-keyed dept text (`"DBI ADM Payroll-Personnel"`, `"CPC Citywide Planning"`, etc.) | The CPC rows here _do_ resolve correctly — Alex hand-keyed them, not pulled from the DBI-only OBI lookup |
| E | Literal `"SPECIAL"` | Archetype marker |
| H | Special-class label: one of the 7 strings the OPS formula filters on (see below) | |
| **K** | `=LEFT(A, 3)` → `"DBI"` or `"CPC"` | **Dept-group filter for OPS SUMIFS** |
| P | Hand-keyed mirror of dept | |
| **S** | **Hand-pasted** from BFM 15.10.006 FY26 (or per Alex's prose: from BFM's special-class summary rows at the bottom of the eturn) | Negative for credits (attrition, MCCP offset, step) |
| T, U, V, W, X | Standard pacing / sum / variance — but U = SUM(empty) = 0, so V = T = S/N2*M2 and X = S - W (where W = U + INDEX(empty, ...) = 0); X = S | Net effect: SPECIAL block contributes only **budget** (S) to OPS rollup |

**100 rows distribute as** (DBI:CPC):

| Special-class label (H) | Count | Notes |
|---|---|---|
| `Attrition Savings - Miscellaneous` | 22 (19 DBI + 3 CPC) | 9993 — usually negative (credit) |
| `Retirement Payout - Miscellaneous` | 18 (15 DBI + 3 CPC) | RTPOM |
| `Premium Pay - Miscellaneous` | 16 (13 DBI + 3 CPC) | PREMM |
| `Step Adjustments, Miscellaneous` | 14 (13 DBI + 1 CPC) | STEPM — usually negative (credit) |
| `Temporary - Miscellaneous` | 22 (19 DBI + 3 CPC) | TEMPM |
| `Overtime - Miscellaneous` | 5 (5 DBI + 0 CPC) | OVERM — only depts with OT budget |
| `MCCP Offset - Misc` | 3 (3 CPC + 0 DBI) | 9994 — MCCP-only depts (CPC has MCCP positions; DBI doesn't) |

This shape **closes the loop** with [`special-class.md`](special-class.md)'s
OPS rollup formulas. The exemplar `OPS!G37 = SUMIFS('Report Data'!$S$649:$S$748,
$H$649:$H$748, "Overtime - Miscellaneous", $K$649:$K$748, "DBI")` sums all
the DBI OT rows in this block to get $380k DBI OT budget.

**Source of S values:** per Alex, hand-pasted from BFM 15.10.006 each refresh.
Same AX-vs-AZ stale-formula concern applies — the hand-paste may be coming from
AX (Technical Adjustment) rather than AZ (Board-adopted). KosPos must use Board
values.

#### Formulas — NEWP rows (rows 750–751, mid-year new positions)

When BFM budgets a new position, BFM assigns it a placeholder ID `NEWPxxxxx`
because PS HCM hasn't issued a real position number yet. When BFM interfaces with
PS HCM after budget approval, the position gets a real position number, and the
NEWP ID becomes a backward-reference to the eturn. Report Data carries both:

| Col | Source | Notes |
|---|---|---|
| D | The **issued PS HCM position number** (`1158346` in this snapshot) | Once PS HCM has issued the number |
| E | The original `NEWPxxxxx` ID (`"NEWP315641"`) | **Reference back to the eturn**; KosPos preserves this link |
| H | Hand-keyed job-class description (`"Administrative Analyst"`) | Display label |
| S | **Hand-keyed** — split into two lines: line 750 = salary ($83,095), line 751 = fringe ($34,153) | **NOT auto-pulled from BFM** — see open question about the AX/AZ mismatch Alex flagged |
| T–X | Standard formulas | Y:AY would auto-fill once the position starts being paid (D matches BI Payroll's AD) |

**One position spans two rows** (salary + fringe split). KosPos models this as
a single new position with separate `budget.salary` + `budget.fringe` fields
rather than two rows.

#### Formulas — MERGE row (row 753, $2.31M mid-year transfer)

Single hand-keyed row representing a **mid-year KK budget journal** — this FY26
DBI→CPC transfer-of-function moved positions from DBI to CPC, with corresponding
budget journal entries moving budget between the two departments. The MERGE row
captures the budget side of one such transfer ($2.31M into DBI ADM MIS — likely
a transfer back from CPC, or a transfer in from elsewhere; needs BVA confirmation).

Per Alex: Report Data **should have a dedicated "KK transfers" section** (one
row per chartfield string, sourced from the BVA report) but doesn't yet — the
MERGE row is a stop-gap. The GL row 762 is the parallel placeholder for GL
journals (post-PP actuals adjustments not running through PS HCM timesheets);
no GL journals affected labor this year, so row 762 is zeroed out.

**Critical workflow insight (KosPos requirement):** KK and GL journals **do not
carry position detail — only chartfields**. Position-aware Report Data has no
way to attribute these to positions. **The reconciliation must happen at
chartfield level**, sourced from the BVA report — see § KosPos improvements.

#### Formulas — INACTIVATED rows (rows 755–760, 6 rows in this snapshot)

Catches positions that **show payroll activity in BI Payroll but are no longer
in P&P Data** — typically temp positions whose seat got inactivated after the
incumbent separated but whose FYTD payroll still needs to roll up. Per
[Tab 13 (Inactive) § Purpose](#tab-13--inactive), these are detected by the
Inactive tab; their values are then **copied into Report Data manually**.

| Col | Source | Notes |
|---|---|---|
| A, B | Hand-keyed dept | |
| D | Hand-keyed position number | |
| E | Literal `"INACTIVATED"` | Archetype marker |
| F, I, J | Hand-keyed job code + name | |
| P | `=B755` | Just mirrors B (no P&P Data record to XLOOKUP into) |
| S | (empty) | No budget — position was inactivated |
| U | **Hand-pasted literal** ($1,543.13, $172,189, etc.) | **Copied from Inactive tab's E `Sum of Balance Amount` pivot each refresh** |
| V | `=T755 - U755` = `0 - U` = `-U` (over-budget by the YTD actuals) | |
| W | Standard projection formula | But Y:AY is empty (no per-PP grid for these), so W = U = the hand-keyed YTD value |
| X | `=S - W = 0 - U = -U` | Projected balance = -YTD actuals; full hit to the variance |

**INACTIVATED rows do double duty**: catch the YTD actuals AND make the
position visible in the dept rollup. Six rows in this snapshot, totaling
$323,865 in YTD actuals across CPC Administration (2), DBI IS Plumbing (1),
DBI PS Plan Review (1), DBI IS Electrical (2).

#### Formulas — GL row (row 762, placeholder, no FY26 activity)

Single hand-keyed row formatted to receive GL adjustments. In this snapshot
contains a real employee (Alex Sabato, position 1147953, job 931) **with all
zeros** — Y:AY = 0, U = 0, V = -U = 0, W = U = 0, AZ = -U = 0, BA = AZ = 0.
**Net contribution to any rollup: zero by design.** Placeholder for visual
formatting and as a reminder that GL adjustments would land here.

KosPos should not carry forward placeholder-only rows — surface the GL
adjustment surface as a Data Issues panel sourced from BVA delta, not as a
zero-valued spine row.

#### Formulas — HIRING rows (rows 767–790, 24 Staffing Plan additions)

Each row mirrors a Staffing Plan entry (rows 2–25 of Staffing Plan). Identity
columns split into three groups:

| Col | Source | Mechanism |
|---|---|---|
| A | `=XLOOKUP($D{row}, 'P&P Data'!$B:$B, 'P&P Data'!CH:CH)` | Dynamic XLOOKUP for Effective Employee Division |
| C | `=XLOOKUP($D{row}, 'P&P Data'!$B:$B, 'P&P Data'!CB:CB)` | Dynamic XLOOKUP for Budget Dept Code |
| P | `=XLOOKUP($D{row}, 'P&P Data'!$B:$B, 'P&P Data'!CC:CC)` | Dynamic XLOOKUP for Budget Dept Description |
| Q | `=XLOOKUP($D{row}, 'P&P Data'!$B:$B, 'P&P Data'!BE:BE)` | Dynamic XLOOKUP for Combo Dept Description |
| B, D, F, G, H, K, L, M, N, O | `='Staffing Plan'!{X}{n}` | Direct cell references into Staffing Plan |
| I, J | Literal `"NEW"` | Marks no-incumbent-yet |
| W | `='Staffing Plan'!W{n}` | **Projected Operating Actuals taken from Staffing Plan's W** — Staffing Plan is responsible for computing the hire's annual cost |
| S | (empty) | **No budget on HIRING rows** — the budget for the hired-into position already exists in the per-position rows above |
| X | `=S - W = -W` | Negative; this is the projected cost going against the dept's existing budget (which absorbs it via the 9993 attrition credit) |

**Why empty S:** the budget for these positions was already counted in the
per-position rows (e.g., HIRING row 767's position 1139882 has its S value in
the per-position row above for that same position). So HIRING rows are
**budget-neutral, projected-cost-only** — they represent the projected
*incremental* hiring cost. The position's existing dept budget absorbs the new
salary, and any uncovered shortfall surfaces as a negative dept-level projected
balance (or comes out of the dept's 9993 attrition pool).

**This is the cleanest part of the workbook** — Staffing Plan owns the projection
math; Report Data just relays it.

#### Formulas — SEPARATING rows (rows 795–798, 4 Staffing Plan separations)

Same XLOOKUP / Staffing Plan ref pattern as HIRING, plus three additional
XLOOKUPs for the separating incumbent's name:

| Extra col | Source | Notes |
|---|---|---|
| I | `=XLOOKUP($D{row}, 'P&P Data'!$B:$B, 'P&P Data'!AA:AA)` | First name (incumbent still in P&P at this snapshot) |
| J | `=XLOOKUP($D{row}, 'P&P Data'!$B:$B, 'P&P Data'!AB:AB)` | Last name |
| K | `=XLOOKUP($D{row}, 'P&P Data'!$B:$B, 'P&P Data'!Q:Q)` | Vice 1 (in case acting) |

`W` here is the **projected separation savings** from Staffing Plan (negative if
the position has remaining FY days that will go unpaid — i.e., a credit to the
dept budget).

#### How each downstream tab consumes Report Data

| Tab | Mechanism | Volume | What it pulls |
|---|---|---|---|
| **Inactive** (Tab 13) | Formulas (mostly XLOOKUP + match-checks) | 639 references | Cross-references Report Data per-position rows to identify positions paid in BI Payroll but absent from BOTH P&P Data and Report Data |
| **P&P Data** (Tab 6) | XLOOKUP from `CK Exclude` into Report Data `R` | 604 references (one per P&P row) | Pulls the auto-Exclude flag computed by Report Data!R — closes the cross-tab loop noted in [Tab 6 § Formulas — cross-tab status](#formulas--structure--derived-columns-ckeh-50-columns) |
| **Operating Report Summary** (Tab 26) | `SUMIFS('Report Data'!$S$649:$S$748, ...)` filtered by H + K | 12 references | Pulls per-special-class per-dept-group budgets from the SPECIAL block; see [`special-class.md`](special-class.md) § OPS row 36–42 |
| **Budget Summary** (Tab 25) | `INDEX/MATCH('Report Data'!$Y$2:$CB$350, ...)` for "today's PPE" column | 1 reference | Per [Tab 7 § Budget Summary](#budget-summary--by1-projection-anchor) — uses the per-PP grid as the BY+1 projection anchor |

**Pivot 17 on cache 1** sits on Report Data and is sourced from P&P Data (per
Tab 6 § How each downstream tab consumes P&P Data). This is the "position
roster" pivot view used inside Report Data's own structure; not a downstream
consumer.

#### What's manual / fragile

- **Per-position identity (A:Q) is statically pasted** from P&P Data each refresh
  — not a live XLOOKUP. A position whose dept moves in PS HCM but doesn't get
  re-pasted into Report Data will appear in its old dept's rollup until next
  refresh. KosPos: Position records are live; views derive identity at query
  time.
- **BFM!AX (Technical Adjustment) used instead of AZ (Board-adopted)** in the
  S Total Budget formula. Confirmed stale per Alex; should be AZ. NEWP rows
  show the same hand-key error against BFM!AZ1273–1274.
- **BFM `D BY HCM Position#` stored as zero-padded text** (`"00412904"`),
  Report Data `D` stored as int (`1106950`). SUMIFS works only via Excel's
  loose-type comparison. ~66 per-position rows show `S=0` partly because of
  this coercion failure on edge cases.
- **100 hand-pasted SPECIAL-block budgets** (rows 649–748) get re-pasted from
  BFM each refresh. Easy to skip one when nothing changed; easy to copy the
  wrong cells when something did.
- **6 hand-pasted INACTIVATED YTD actuals** (rows 755–760) copied from the
  Inactive tab's E pivot. No formula closure — the pivot can refresh and
  Report Data's U values silently get stale.
- **MERGE row 753 is a stop-gap, not a real "KK transfers" section.** Mid-year
  KK budget journals (e.g., the DBI→CPC transfer of function) aren't
  systematically captured. The BVA report should drive a proper per-chartfield
  KK transfers block.
- **GL row 762 is a placeholder with no FY26 activity.** Real GL journals
  (post-PP actuals adjustments not running through PS HCM timesheets) wouldn't
  have a defined home in the current workbook structure.
- **OVERTIME + PAYOUT blocks are DBI-only** (18 dept-rows each, zero CPC). Per
  Alex this is an oversight from the in-progress CPC roll-in. The current
  Report Data **under-counts citywide OT and RPO** for any CPC OT/RPO that
  posts to non-DBI funds. KosPos must extend catcher rows to every dept-group
  in scope.
- **`F<>10190` continuing-grid filter is the wrong complement.** Operating
  grid catches `{10190, 10000}`; continuing grid should exclude both. `<>10190`
  alone double-counts fund 10000 when it appears in continuing. Dormant in
  this snapshot because no CPC operating posts to 10000 mid-year; will
  activate as CPC roll-in progresses.
- **Pool-position duplicates (e.g., commissioners) zero-out via COUNTIF**, so
  the dedup works — but the user has no visibility into which positions are
  pool. The 36 duplicate rows are functional cruft; refactoring them into
  one-position-per-person would surface real identity. KosPos: flag pool
  positions with a "consider one-position-per-person" Data Issue and let the
  user decide.
- **HIRING / SEPARATING dynamic XLOOKUPs depend on the position existing in
  P&P Data.** Brand-new positions that haven't been entered in PS HCM yet will
  return `#N/A` in A/C/P/Q (and in I/J/K for SEPARATING). The 4 SEPARATING
  rows in this snapshot all resolve cleanly; the 24 HIRING rows mostly do, but
  any "new position with no PS HCM entry" would fail silently.
- **NEWP S values are hand-keyed and confirmed-to-not-match BFM!AZ1273–1274
  this snapshot.** Real authoring error that the workbook can't catch — the
  S value was probably pulled from BFM!AX instead of AZ.
- **BI Payroll text-coercion on Account Description.** Same blast-radius
  problem as Tab 7 — `"Overtime - Scheduled Misc"`, `"Ret Payout - SP & Vac
  - Misc"`, `"Temp Misc LumpSum Payoff"` appear as literal strings in 130k+
  SUMIFS. Any Controller-side rename silently drops exclusions and inflates
  per-position regular labor.
- **No reconciliation against BVA.** BI Payroll is from PS HCM; BVA is from
  PS Financials. Post-PP GL journals and KK budget journals do not flow
  through PS HCM, so payroll-derived Report Data and the actual GL truth can
  diverge significantly. Currently no in-workbook check catches this.
- **130k+ SUMIFS recalc every change.** 27 PPs × 2 grids × ~620 rows ×
  ~4 SUMIFS per cell = ~130k SUMIFS firing on every recalc. Tolerable on
  desktop with one user; will not scale.

#### KosPos improvements

##### 1. Position-level + chartfield-level reconciliation, sourced from three streams

Report Data conflates two reconciliation problems into one tab. KosPos splits
them:

- **Position-aware view** (the spine, sourced from P&P Data + BI Payroll +
  Staffing Plan): per-position YTD, projection, budget. Drives the rollup that
  matches OPS today.
- **Chartfield-aware view** (sourced from BVA + the eturn): per-chartfield
  budget vs actual; surfaces KK and GL journal adjustments that the
  position-aware view cannot attribute. Surfaces the variance as "GL/KK
  adjustments" so the user can see them at the dept level even without
  position-level attribution.

The two views reconcile to each other (within a tolerance for masking + edge
cases); KosPos surfaces the delta when it exceeds the tolerance, not the per-row
detail of every journal.

##### 2. Require BVA upload alongside BI Payroll and P&P Data each PP

`lib/importers/bva/` — new importer. Full data-source documentation in
[`../data-sources/bva.md`](../data-sources/bva.md) (68-column schema +
refresh-order timing rule + verified reconciliation examples against the
10.20.25 sample).

- BVA report comes from PS Financials via OBI. Carries chartfield-level
  budget (Original / Supplemental / Transfer & Other / Carryforwards /
  Revised) and actuals (GL Actuals + Encumbrance + Pre-Encumbrance + Reserved)
  with **no position detail**.
- **KK adjustment per chartfield** = `BVA.Revised_Budget_Pre_Close −
  BFM_eturn.FY_Board`. Verified against the sample: DBI Perm Salaries shows
  -$2.04M `Transfer & Other Budget` (the DBI→CPC transfer-of-function); CPC
  Perm Salaries shows +$1.98M.
- **GL adjustment per chartfield** = `BVA.GL_Actuals − BI_Payroll_YTD
  (excluding inactive positions)`. Verified for DBI Fund 10190 OT: BVA
  $438,678 vs OPS!E37 $438,786 — $108 delta (rounding + OBI 1-day lag).
- **Refresh-order rule:** BVA must be pulled Wednesday-or-later after a
  payday Tuesday; see [§ Cross-cutting concerns — Refresh-order timing](#refresh-order-timing--obi-1-day-lag--payroll-to-gl-gap--bva-wed-or-later).

##### 3. Replace the SPECIAL block hand-paste with a derived per-(dept × class) view

Per-(dept × class) budgets currently live as 100 hand-pasted cells in rows
649–748. KosPos derives the same view by:

- Storing the BFM eturn with per-position + per-special-class summary rows
  intact (BFM has both — the special-class summary rows live at the bottom
  of the eturn, indexed by account-description label).
- Surfacing the per-(dept × class) cube as a query result: `SUM(budget WHERE
  account_description = X AND dept_group = Y)`. No hand-paste.
- Using **BFM!AZ (Board-adopted)**, not AX (Technical Adjustment), as the
  budget source.

##### 4. Eliminate the OVERTIME / PAYOUT catcher blocks via aggregation

The catcher blocks exist only because the per-position Y:AY grid excludes OT
and RPO. KosPos's rollup cube (per Tab 7 § KosPos improvement #3) carries
per-account-description granularity, so dept-level OT and RPO can be queried
directly without the catcher rows. **Per-dept catcher rows disappear; the
DBI-only CPC oversight goes with them.**

##### 5. Live identity, not pasted snapshots

Per-position identity (A:Q) becomes a live join from the Position store to
each query. A position moved mid-year in PS HCM shows in its new dept's
rollup at the next snapshot, not after Alex re-pastes. The XLOOKUP-based
HIRING / SEPARATING rows model already does this — KosPos extends it to the
spine.

##### 6. Pool-position detector with one-position-per-person recommendation

Detect: positions in the Position store where `incumbent_count > 1` (Vice 1 +
Vice 2 + employees) or where `Max Headcount > 1`. Surface in Data Issues:

> Position 1094089 (Commissioner) has 14 incumbents sharing one position
> number. Consider splitting into one position per person for clearer
> reporting. _(Dismiss / keep as-is)._

Per Alex: best practice is one-position-per-person but the user decides.
KosPos's recommendation is non-blocking.

##### 7. Continuing-grid filter as the complement of operating

Replace `F <> 10190` with `F NOT IN (operating_funds_set)` where
`operating_funds_set` is configured per dept (DBI → {10190}; CPC → {10000};
multi-dept → union). Closes the dormant `{10190, 10000}` double-count bug.

##### 8. NEWP-to-position-number link as first-class

When BFM emits a position with a NEWPxxxxx placeholder ID and PS HCM later
issues a real position number, KosPos keeps both as fields on the Position
record: `position.id` (PS HCM) + `position.budget_eturn_id` (NEWPxxxxx).
Drill-down from any view that shows the position can navigate back to the
eturn line item. Critical for budget audit trail.

##### 9. INACTIVATED block driven by Inactive query, not hand-paste

The 6 INACTIVATED rows' U values currently come from a manual copy of Inactive's
E column. KosPos's Inactive view is a live query
(`positions paid in BI Payroll AND NOT in current P&P snapshot`); Report
Data's equivalent rollup pulls from that query directly.

##### 10. COLA-aware projection at the engine, not in each row

The two-mode `IF(today >= COLA, K2, O2)` projection becomes a library function
(`lib/calendar/project_to_year_end(ytd, current_pp, partial_pp_fraction,
cola_threshold_pp, today_pp)`) used by every projection in the app. No
per-row formula; no risk of one row using the wrong mode. Per memory
`feedback_projections_always_cola_aware.md`.

##### 11. Account-description rename guard (reinforces Tab 7 improvement #7)

`"Overtime - Scheduled Misc"`, `"Ret Payout - SP & Vac - Misc"`, `"Temp Misc
LumpSum Payoff"` appear literally 162+ times across Report Data's per-PP grid
formulas (3 exclusions × 27 PPs × 2 grids per row × 2 specific places). KosPos
sources from the chart-of-accounts map; rename detection at import time blocks
silent failures.

##### 12. Importer data-quality flags (additions to `lib/quality/`)

- **BVA reconciliation:** flag chartfield strings where `(BVA budget) ≠ (eturn
  budget)` (KK adjustment landed) or where `(BVA actuals) ≠ (BI Payroll
  actuals + masked-sick-leave bucket)` (GL adjustment landed). Exclude
  inactive positions.
- **Pool position:** `incumbents > 1 OR Max Headcount > 1` → recommend
  one-position-per-person.
- **Stale Inactive paste:** Inactive tab's E pivot row count or total differs
  from the previous run; flag for refresh.
- **BFM AX-vs-AZ drift:** the budget number in S doesn't match
  `BFM.position.budget_board_adopted` — flag the position as needing review.
- **Pre-COLA / post-COLA projection mode:** show which mode each position is
  in for the current refresh; one click to verify the COLA threshold (PP15
  in FY26) is set correctly.
- **NEWP rows with mismatched S:** the hand-keyed S value doesn't match
  BFM!AZ for the linked NEWP_id.
- **Missing CPC catcher rows:** any account_description appearing in non-DBI
  funds with no corresponding per-dept catcher row.
- **Pool dedup integrity:** verify that the COUNTIF-zeroed rows actually
  have zero downstream contribution; warn on hand-edits that bypass the dedup.
- **Position in BI Payroll, not in P&P Data, not in Inactive block:** auto-add
  to Inactive view; surface as Data Issue requiring review.
- **Catcher block vs SPECIAL block:** when SPECIAL block's per-class budget
  changes by > X%, surface as audit checkpoint.

#### KosPos UI sketch

Report Data is **the spine page** — likely the default landing page for the
Current Year workspace. Three surfaces:

1. **Position list (the spine view)** — sortable / filterable / groupable by
   dept-group / dept / fund / fill status / archetype:
   - Columns: Position #, Fill Status, Incumbent, Dept (effective; budgeted
     shown when ≠ effective), Job Class, Total Budget, YTD Budget, YTD
     Actuals, YTD Balance, Projected Actuals, Projected Balance.
   - Group-by dept-group / dept by default (mirrors how the workbook is read).
   - Filter chips: archetype (per-position / hiring / separating / inactivated
     / new), fund control (operating / continuing / both), fill status.
   - Each row clickable to Position Detail (per Tab 6 § UI sketch).
2. **Dept rollup view** — collapses per-position into per-dept summaries:
   - Columns: Dept, Total Budget (positions + special), YTD Budget, YTD
     Actuals (regular labor + OT + RPO + premium + temp), YTD Balance,
     Projected Actuals, Projected Balance.
   - Drill-down per special-class breaks out into PREMM / OVERM / RTPOM /
     STEPM / TEMPM / 9993 / 9994 lines (mirrors OPS rows 36–42).
3. **Reconciliation panel** — the BVA-driven view:
   - Per chartfield string: BVA budget vs eturn budget (KK delta); BVA actuals
     vs payroll actuals (GL delta); explanatory notes when the delta exists.
   - Surfaces the "what changed via journal entry, not via payroll" picture
     the workbook can't currently produce.
   - Filter: exclude inactive positions.
4. **Data Issues panel** (cross-cutting, per [§ KosPos improvements](#kospos-improvements-6) #12):
   - All the data-quality flags above, grouped by category.

The pool-position recommendation, the missing-CPC-catcher warnings, the BFM
AX/AZ drift, and the pre/post-COLA projection mode all surface here.

#### Excel export notes

KosPos's Excel emitter rebuilds a Report-Data-equivalent spine workbook for
round-trip parity, **without** the hand-paste fragility:

- A **`Positions` sheet** with the per-position spine. Includes Total Budget
  (from BFM.AZ, not AX), YTD Budget (paced from Calendar), YTD Actuals
  (cube-queried, multi-fund), Projected (engine-computed). One row per
  position; pool positions get a `incumbent_count` column rather than
  duplicate rows.
- A **`Per-Dept Rollup` sheet** with the dept-level summary used by OPS.
  Includes the OT / RPO / Premium / Temp / Step / Attrition / MCCP / Total
  breakdown.
- A **`Special-Class Budget` sheet** replacing the 100-row SPECIAL block.
  Sourced from BFM.AZ + special-class summary rows; one row per (dept × class),
  but as a live query, not a hand-paste.
- A **`KK / GL Adjustments` sheet** sourced from BVA. Per-chartfield
  reconciliation table; the current MERGE / GL placeholder rows go away.
- A **`Inactive Cross-Reference` sheet** automatically populated from the
  Inactive view, no hand-paste required.
- A **`Staffing Plan Linkage` sheet** showing the HIRING / SEPARATING rows
  with their Staffing Plan source row link.
- A **`Data Issues` sheet** — the live correction-list, exportable for review.
- Named ranges `POSITIONS_OPERATING`, `POSITIONS_CONTINUING`, `OT_BY_DEPT`,
  `RPO_BY_DEPT`, `SPECIAL_BUDGET` so a parity workbook can name-reference them.

#### Open questions / TODO

- [x] **BVA report example.** Get an example BVA export from Alex (he'll
      provide). Document its column shape (FY, dept, fund, account, project,
      activity, authority, budget, actuals) in a new
      [`../data-sources/bva.md`](../data-sources/bva.md) or as a section in
      [`../data-sources/bfm.md`](../data-sources/bfm.md). Phase 2.4 importer
      depends on this. **Resolved 2026-05-25 (BVA interlude + Task B this
      session):** sample `BvA - All Fields - Version 10.20.25 (42).csv`
      (68 cols × 2,710 rows) documented at
      [`../data-sources/bva.md`](../data-sources/bva.md) with verified
      reconciliation pattern; end-to-end reconciliation suite in
      [`../audits/bva-reconciliation-suite.md`](../audits/bva-reconciliation-suite.md).
- [x] **Confirm BFM!AX → AZ migration is safe.** Per Alex, the S formula
      should reference BFM!AZ (Board-adopted), not AX (Technical Adjustment).
      Verify with DBI finance team that AZ is the right column for all
      use cases; check whether any in-year Technical Adjustment rows would
      be unintentionally erased by the migration. **Resolved 2026-05-25
      (BVA interlude + Task B Test 3):** AX vs AZ migration is safe in
      this snapshot — AX == AZ for all 673 BFM class-summary rows (no
      Technical Adjustments have been applied post-Board). KosPos
      defaults to AZ and preserves AX as a variance-view layer.
- [ ] **NEWP row 750–751 budget mismatch.** Hand-keyed S values
      ($83,095 + $34,153 = $117,248) don't match BFM!AZ1273–1274. Find the
      right BFM cells for position 1158346 / NEWP315641 and correct.
- [ ] **CPC OVERTIME + PAYOUT catcher rows missing.** Add CPC dept rows to
      both blocks for the next workbook refresh. Confirm citywide OT and
      RPO totals against the Premium / Overtime / Retirement Payout tab
      pivots to verify nothing else is missing.
- [x] **Position pool-detection threshold.** Where to set the
      "consider one-position-per-person" Data Issue threshold — every pool
      position? Or only `incumbent_count > 5`? Per Alex's prose,
      commissioners (14 incumbents) are intentional; small pools (~2–3)
      might also be intentional for short-term backfills. **Partially
      resolved 2026-05-25 (Task B Test 5):** empirical pool census = 8
      pool positions / 36 dup rows: position 1094089 (14 incumbents),
      1068950 / 1125966 / 1092892 (7 each), 1158719 (3), + 3 more.
      KosPos flags every pool position with N≥2 incumbents and
      recommends one-per-row but lets the user decide per-position.
- [ ] **GL row 762 future shape.** When the first FY26 GL journal lands,
      what shape does it take in Report Data? Single row with hand-keyed
      U? Or do we wait for the BVA reconciliation feature to land before
      modeling GL?
- [x] **MERGE row 753 source detail.** The $2.31M into DBI ADM MIS — which
      specific KK journal moved this in, and from where? BVA will answer
      once uploaded. **Resolved 2026-05-25 (Task B Test 4):** the
      $2,310,727 is a **hand-keyed estimate**, not BVA-derived — it
      doesn't match any BVA Transfer & Other Budget total exactly. BVA
      shows the actual KK movement as DBI ADM MIS (Dept Code 229346)
      Perm Salaries = -$2,049,808 + Mandatory Fringe Benefits ≈ -$680k
      = -$2,728,369 total, all on fund "SR BIF Operating Project". MERGE
      row 753 will be **decommissioned in Phase 2.4** in favor of
      BVA-driven per-chartfield reconciliation.
- [x] **Dormant `<>10190` double-count bug activation point.** Track when
      CPC roll-in starts posting operating actuals to fund 10000 — KosPos
      filter fix needs to be in place before that happens. **Partially
      resolved 2026-05-25 (Task B Test 7):** confirmed STILL DORMANT in
      this snapshot — 0 BI Payroll rows have `F=10000 AND Department
      Group Code = "DBI"`. DBI posts only to funds 10190 ($51.84M YTD) +
      10230 ($213k). KosPos's complement-of-operating-fund-set design
      handles activation correctly when CPC roll-in begins.
- [ ] **Pivot 17 vs pivot caches.** Confirm during Reporting Tree (Tab 21)
      walkthrough whether pivot 17 actually sits on Report Data and what
      it visualizes; the count came from Tab 6 but the in-workbook target
      hasn't been verified.

---

### Tab 21 — Reporting Tree

**Status:** walkthrough — pending

**Purpose:** Visual org chart drawn from P&P Data — who reports to whom at each level.
Used both to **flag data errors** (broken reports-to chains, etc.) and to **communicate
system changes** to staff. Error identification is currently manual; KosPos can
automate. Precursor to the full Phase 7 org-chart module.

**Data sources:** P&P Data (Reports-To position + the derived `2RC…11RC` level codes
in cols DX:EG — pivot 18 on cache 4; see [Tab 6 § Formulas — derived
columns](#formulas--structure--derived-columns-ckeh-50-columns) and the consumer
table). The Reports-To error-vs-noise framework sketch lives in
[Tab 6 § KosPos improvements #6](#6-reports-to-validation--error-vs-noise-framework-sketch).

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
estimates, and hiring sequence. Pulls 14 fields from P&P Data via 1,844 XLOOKUPs on
Position Number / Job Code — see [Tab 6 § How each downstream tab consumes P&P
Data](#how-each-downstream-tab-consumes-pp-data).

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

**Status:** walkthrough — done 2026-05-25

**Purpose:** **The headline labor projection page** — the single screen the
department director reads when deciding whether the department is on track,
and the source of the figures that ultimately roll up into the 6-month and
9-month reports to CON / MYR. Two distinct regions on the same sheet, each
answering a different question against the same underlying data
([Tab 20 Report Data](#tab-20--report-data)):

1. **Per-dept rollup (rows 1–33)** — a live pivot of Report Data keyed by
   Effective Employee Division → Department, aggregating eight measures
   (YTD operating budget / actuals / balance + total budget + projected
   operating actuals / balance + YTD continuing / projected continuing). Two
   dept-group blocks (DBI rows 2–23, CPC rows 24–32) plus Grand Total. A
   ratio column `L` shows projected operating balance as a percent of total
   budget at the dept-group level.
2. **Per-special-class block (rows 36–42 DBI, rows 45–52 CPC)** — a
   hand-built ledger of the six (DBI) / seven (CPC) special classes
   (PREMM, OVERM, RTPOM, STEPM, ±MCCP Offset, TEMPM, 9993 Attrition) at
   the dept-group grain. **Attrition (9993) is computed as the residual** —
   the dept-group total minus the sum of named special-class lines and
   per-position lines — so the block always balances by construction.

The per-dept pivot and the special-class block are **two views of the same
universe of dollars**. The pivot rolls Report Data up by dept; the
special-class block rolls Report Data up by class. Both must reconcile to
the same totals at the dept-group level — the attrition residual is the
mathematical guarantee.

**Existing math reference:** [`special-class.md`](special-class.md) §
"Operating Report Summary — DBI section reference" already documents the
DBI special-class block in detail (rows 36–42 — PREMM, OVERM, RTPOM, STEPM,
TEMPM, 9993). This walkthrough fills in:

- The **per-dept rollup region (rows 1–33)** — pivot structure, source
  fields, the `L`-column ratio.
- The **CPC special-class block (rows 45–52)** — same shape as DBI's but
  with an extra MCCP Offset row, an undifferentiated TEMP row, and no
  prior-year attrition rate reference. The DBI/CPC asymmetry catalog
  drives several KosPos improvements.
- The **attrition rate rows (42, 52)** and the **prior-year actual
  attrition rate** (hardcoded literal at H43 for DBI; CPC equivalent
  missing).

#### Data sources

- **Primary:** [Tab 20 Report Data](#tab-20--report-data) (the spine).
  Both regions read from it:
  - The pivot at A1:K33 caches Report Data and aggregates the per-position
    + per-archetype rows (604 per-position + 18 OVERTIME + 18 PAYOUT + 100
    SPECIAL + 6 INACTIVATED + … = 798 rows) by Effective Employee Division
    / Department, summing columns S Total Budget, T YTD Operating Budget,
    U YTD Operating Actuals, V YTD Operating Balance, W Projected Operating
    Actuals, X Projected Operating Balance, AZ YTD Continuing Actuals, BA
    Projected Continuing Actuals.
  - The special-class block reads the SPECIAL sub-block of Report Data
    (rows 649–748, 100 hand-pasted budget cells from BFM 15.10.006 FY26's
    special-class summary rows). All six (DBI) / seven (CPC) `G` cells are
    `SUMIFS('Report Data'!$S$649:$S$748, …)` keyed on `H` (Account
    Description) and `K` (Dept Group).
- **Secondary (YTD actuals for the special-class block):**
  - Premium tab pivot (`Premium!$A$3`) — `GETPIVOTDATA(..., "Fund Code", 10190)` for DBI; `Fund Code, 10000` for CPC.
  - Overtime tab pivot (`Overtime!$A$3`) — same pattern.
  - Retirement Payout tab pivot (`Retirement Payout!$A$3`) — `GETPIVOTDATA(..., "Department Group Code", "DBI"/"CPC")`.
  - Step tab columns `S` (YTD) and `T` (projection) — `SUM(Step!S:S) - SUMIFS(Step!S:S, Step!A:A, "Planning")` for DBI; the reverse SUMIFS-only form for CPC.
  - BI Payroll directly (`'BI Payroll'!AL`) — DBI E40 only, filtered to `COMMN:5380` for TEMPM Interns.
- **Tertiary (projection sources for the special-class block):**
  - `Premium!P5 + Premium!P6` (DBI H36; salary + fringe rows for DBI).
  - `Premium!P8 + Premium!P9` (CPC H45).
  - `Overtime!BS15` (DBI H37 — see [special-class.md § OVERM](special-class.md#overm_e--overtime-misc--workbook-extracted-2026-05-24-autonomous-overnight)); `Overtime!BS18` (CPC H46).
  - Retirement Payout `IF(K2=0, E, MAX(G, E))` rule applied to YTD actuals.
  - Step columns `S`/`T` (filtered out / in "Planning" depending on DBI/CPC slot).
  - BFM 15.10.006 FY26 directly (`AZ1195 + AZ1197 + AZ1199 + AZ1201` for DBI G40 TEMPM total budget — **hardcoded row addresses**; cited as fragile in [special-class.md § TEMPM](special-class.md#tempm_e--temporary-misc--pending-walkthrough)).
- **Quaternary (Calendar):**
  - `Calendar!I2` (pure PPs elapsed), `Calendar!J2` (total PPs), `Calendar!K2` (remaining) — drive the YTD pacing on every D column. **All special-class pacing uses pure-PP, not COLA-weighted** (D36 = `G36/J2*I2`). This matches the workbook's existing pattern for OT/Premium/RPO but conflicts with KosPos's COLA-aware default — see [Calendar § KosPos improvements](#tab-5--calendar) and the memory entry `feedback_projections_always_cola_aware.md`.

No external file is read directly by OPS Summary — every input comes from
another workbook tab. This makes OPS Summary a **derived view**, not a data
source. **KosPos consequence:** OPS Summary doesn't need its own importer;
it's a presentation layer over the rest of the labor report.

#### Snapshot scope (this workbook, as of 2026-05-08)

| Region | Cell range | Rows | Cols | Notes |
|---|---|---|---|---|
| Per-dept pivot (live) | A1:K33 | 33 | 11 | 7 DBI dept rows + 1 DBI Total + 7 CPC dept rows + 1 CPC Total + 1 Grand Total + 3 division-subtotal rows + 1 header. Pivot cache `cacheId=935` (workbook-internal — same cache as Tab 27). |
| Ratio column (live) | L23, L32, L33 | 3 | 1 | `=GETPIVOTDATA("Sum of Projected Operating Balance", ...) / GETPIVOTDATA("Sum of Total Budget", ...)` — projected balance as a % of total budget at the dept-group level. DBI = 7.78%, CPC = 12.39%, Grand Total = 9.62% at this snapshot. |
| DBI special-class block | A36:J43 | 8 | 10 | Rows 36–41 = 6 special classes (PREMM, OVERM, RTPOM, STEPM, TEMPM, 9993). Row 42 = attrition rate. Row 43 = prior-year attrition rate (hardcoded literal). |
| CPC special-class block | A45:J53 | 9 | 10 | Rows 45–51 = 7 special classes (PREMM, OVERM, RTPOM, STEPM, MCCP Offset, TEMP, 9993). Row 52 = attrition rate. Row 53 = prior-year attrition rate label only — **value missing** (DBI/CPC asymmetry, see Manual/fragile). |

Total live rows = 33 (pivot) + 8 (DBI block) + 9 (CPC block) = 50; tab's
`max_row` is 53.

#### Formulas — per-dept rollup pivot (A1:K33)

The pivot at A1:K33 sources from Report Data via pivot cache 935 (sheet
range `'Report Data'!A1:CB1048576`). Three row fields, eight data fields:

| Pivot axis | Cache field | Report Data col | Meaning |
|---|---|---|---|
| Row Level 1 | `[80] Effective Employee Division2` | — (pivot-grouped field) | Dept-group rollup: groups `Effective Employee Division` values into `DBI` / `CPC` parent labels. **Not a Report Data column** — a user-created pivot group. |
| Row Level 2 | `[0] Effective Employee Division` | A `Effective Employee Division` | Mid-level division (e.g., `DBI AdminIstration`, `DBI Inspection Services`, `DBI Permit Services`, `Planning`). |
| Row Level 3 | `[1] Effective Employee Department` | B `Effective Employee Department` | Granular department (e.g., `DBI ADM Administration-Gen`). |
| Data field 1 (col D) | `[19] YTD Operating Budget` | T `YTD Operating Budget` | `S/N2*M2` per-row (COLA-paced YTD budget) summed by Effective Dept. |
| Data field 2 (col E) | `[20] YTD Operating Actuals` | U `YTD Operating Actuals` | `SUM(Y:AY)` per-row (operating-fund per-PP grid) summed by Effective Dept. |
| Data field 3 (col F) | `[21] YTD Operating Balance` | V `YTD Operating Balance` | `T-U` per-row, summed. |
| Data field 4 (col G) | `[18] Total Budget` | S `Total Budget` | `SUMIFS(BFM!AX, BFM!D, D2)` per-row (per-position budget) **plus** the 100 hand-pasted SPECIAL block rows (S649:S748). Summed by Effective Dept. **Read** [Tab 20 § Manual/fragile](#whats-manual--fragile-6): the `BFM!AX` Technical Adjustment reference is stale; should be `BFM!AZ` Board. |
| Data field 5 (col H) | `[22] Projected Operating Actuals` | W `Projected Operating Actuals` | COLA-aware two-mode projection per-row, summed. |
| Data field 6 (col I) | `[23] Projected Operating Balance` | X `Projected Operating Balance` | `S-W` per-row, summed. |
| Data field 7 (col J) | `[51] YTD Continuing Actuals` | AZ `YTD Continuing Actuals` | `SUM(BB:CB)` per-row (continuing-fund per-PP grid) summed. |
| Data field 8 (col K) | `[52] Projected Continuing Actuals` | BA `Projected Continuing Actuals` | Continuing-fund projection per-row, summed. |

**Key insight: this is a pivot, not a SUMIFS-array.** The eight measures are
re-computed on every refresh from the Report Data per-position rows
(including SPECIAL / OVERTIME / PAYOUT / INACTIVATED / MERGE / GL /
HIRING / SEPARATING archetypes). The dept totals at rows 9, 17, 22, 31, 23,
32 are pivot-subtotal rows, not formula cells.

**Cell `L23` — DBI projected attrition rate (as a % of total budget):**

```excel
=GETPIVOTDATA("Sum of Projected Operating Balance", $A$1, "Department Group", "DBI")
 / GETPIVOTDATA("Sum of Total Budget", $A$1, "Department Group", "DBI")
```

Resolves to `4,834,133 / 62,100,574 = 7.78%` at this snapshot. Same pattern
at L32 (CPC: `12.39%`) and L33 (Grand Total: `9.62%`). **Note:** this is
the projected-balance-as-percent-of-budget — a "how much will be left
unspent at year end" ratio, **not** the attrition rate the special-class
block computes (which is 9993 over non-9993 labor). Same conceptual
direction; different denominator. See L vs G42/H42 comparison in
Manual/fragile.

#### Formulas — DBI special-class block (rows 36–42)

Already documented in detail in
[special-class.md § Operating Report Summary — DBI section reference](special-class.md#operating-report-summary--dbi-section-reference).
Quick re-statement of the structural pattern for cross-tab readers, with
this snapshot's resolved numbers:

| Row | Class | D YTD Op Budget (pace) | E YTD Op Actuals | F YTD Op Balance | G Total Budget | H Projected Op Actuals | I Projected Op Balance |
|---|---|---|---|---|---|---|---|
| 36 | PREMM | `G36/J2*I2` = $1,022,641 | `GETPIVOTDATA(Premium, fund 10190)` = $879,090 | $143,551 | `SUMIFS(Report Data SPECIAL, "Premium Pay - Misc", "DBI")` = $1,191,559 | `Premium!P5+P6` = $1,024,297 | $167,262 |
| 37 | OVERM | $326,130 | `GETPIVOTDATA(Overtime, fund 10190)` = $438,786 | -$112,656 | $380,000 | `Overtime!BS15` = $555,485 | -$175,485 |
| 38 | RTPOM | $214,558 | `GETPIVOTDATA(RPO, dept-group DBI)` = $359,014 | -$144,456 | $249,998 | `IF(K2=0, E38, MAX(G38, E38))` = $359,014 | -$109,016 |
| 39 | STEPM | -$503,178 | `SUM(Step!S) - SUMIFS(Step!S, "Planning")` = -$884,974 | $381,796 | -$586,292 | `SUM(Step!T) - SUMIFS(Step!T, "Planning")` = -$939,939 | $353,647 |
| 40 | TEMPM | $154,853 | `SUMIFS('BI Payroll'!AL, AE, "COMMN:5380")` = $0 | $154,853 | `BFM!AZ1195+AZ1197+AZ1199+AZ1201` = $180,431 | **`0` literal** (manual override; J40 note: "No interns planned at this time") | $180,431 |
| 41 | 9993 Attrition | -$6,237,580 | -$10,007,197 (computed residual: `D41-F41`) | `GETPIVOTDATA(DBI YTD bal) - SUM(F36:F40)` = $3,769,617 | `SUMIFS(SPECIAL, "Attrition Savings - Misc", "DBI") + SUMIFS(SPECIAL, "Temporary - Misc", "DBI") - G40` = -$7,267,894 | -$11,685,189 (computed residual: `G41-I41`) | `GETPIVOTDATA(DBI proj bal) - SUM(I36:I40)` = $4,417,295 |
| 42 | Attrition Rate | — | — | — | `G41/(GETPIVOTDATA(DBI total budget) - G41)` = -10.49% | `H41/(GETPIVOTDATA(DBI total budget) - H41)` = -16.83% | — |
| 43 | Prior-Year Actual Attrition Rate | — | — | — | — | **`-0.15438` (hardcoded literal)** | — |

Key structural notes carried over from [special-class.md](special-class.md):

- **D column = COLA-unaware straight-line pacing.** All `D` cells use
  `G36/Calendar!J2*Calendar!I2` (pure-PP), not the COLA-weighted
  `M2/N2` ratio. Workbook shortcut consistent across the special-class
  block — fine for OT/Premium/RPO but wrong for STEP/PREMM in a strict
  sense (the budget side carries no COLA component, but the YTD-pace
  metaphor implicitly does). KosPos default = COLA-aware everywhere.
- **F41 + I41 = computed-as-residual.** This is the 9993 reconciliation
  closure: dept total - sum of named classes = 9993 by construction.
- **G41 = SUMIFS combined.** DBI Attrition row's Total Budget combines the
  named `"Attrition Savings - Miscellaneous"` rows from Report Data SPECIAL
  with the `"Temporary - Miscellaneous"` rows and subtracts G40 (TEMPM
  Interns). Decoded:
  - `+ SUMIFS(SPECIAL, "Attrition Savings - Misc", "DBI")` — the explicit
    9993 budget from BFM.
  - `+ SUMIFS(SPECIAL, "Temporary - Misc", "DBI")` — DBI's vacant-permanent-as-TEMP
    budget (temp work done via vacant permanent positions, not via the
    `COMMN:5380` summer intern code).
  - `− G40` — subtracts the intern total to avoid double-counting (G40
    captures the same TEMPM dollars from BFM rows 1195/1197/1199/1201).
- **H40 = literal `0`.** Alex hand-overrides the projection when no interns
  are planned. J40 note: `"No interns planned at this time"`. KosPos:
  configurable "expected interns this year" input on the TEMPM card,
  defaulting to zero with the user able to confirm/override.
- **H43 = literal `-0.15438`** (`-15.44%`). Last year's actual DBI attrition
  rate, hand-keyed for comparison. **J43 says "Calculated, Questionable"**
  — Alex's own caveat that the prior-year computation method may not match
  the current one. KosPos: derive prior-year rate from the prior-FY's saved
  end-of-year snapshot, with the methodology documented.

#### Formulas — CPC special-class block (rows 45–52)

Structurally similar to the DBI block (rows 36–42) but with three
asymmetries that matter for KosPos:

| Row | Class | D YTD Op Budget (pace) | E YTD Op Actuals | F YTD Op Balance | G Total Budget | H Projected Op Actuals | I Projected Op Balance |
|---|---|---|---|---|---|---|---|
| 45 | PREMM | `G45/J2*I2` = $5,140 | `GETPIVOTDATA(Premium, fund 10000)` = $39,017 | -$33,877 | `SUMIFS(SPECIAL, "Premium Pay - Misc", "CPC")` = $5,989 | `Premium!P8+P9` = $45,462 | -$39,473 |
| 46 | OVERM | `G46/J2*I2` = $0 | `GETPIVOTDATA(Overtime, fund 10000)` = $3,944 | -$3,944 | `SUMIFS(SPECIAL, "Overtime - Misc", "CPC")` = $0 | `Overtime!BS18` = $4,993 | -$4,993 |
| 47 | RTPOM | $0 | `GETPIVOTDATA(RPO, dept-group CPC)` = $362,514 | -$362,514 | $0 | `IF(K2=0, E47, MAX(G47, E47))` = $362,514 | -$362,514 |
| 48 | STEPM | -$373,332 | `SUMIFS(Step!S, "Planning")` = $5,247 | -$378,579 | -$434,998 | `SUMIFS(Step!T, "Planning")` = $5,247 | -$440,245 |
| **49** | **MCCP Offset** | $56,799 | _**(empty — no formula)**_ | $56,799 | `SUMIFS(SPECIAL, "MCCP Offset - Misc", "CPC")` = $66,181 | _**(empty)**_ | $66,181 |
| **50** | **TEMP** | $826,866 | _**(empty)**_ | $826,866 | `SUMIFS(SPECIAL, "Temporary - Misc", "CPC")` = $963,446 | _**(empty)**_ | $963,446 |
| 51 | 9993 Attrition | -$2,042,296 | -$6,552,167 (residual) | `GETPIVOTDATA(CPC YTD bal) - SUM(F45:F50)` = $4,509,872 | `SUMIFS(SPECIAL, "Attrition Savings - Misc", "CPC")` = -$2,379,639 | -$7,313,310 (residual) | `GETPIVOTDATA(CPC proj bal) - SUM(I45:I50)` = $4,933,671 |
| 52 | Attrition Rate | — | — | — | `G51/(GETPIVOTDATA(CPC total budget) - G51)` = -5.45% | `H51/(GETPIVOTDATA(CPC total budget) - H51)` = -16.81% | — |
| **53** | **Prior-Year Actual Attrition Rate** | — | — | — | — | _**(empty — value missing!)**_ | — |

**Three CPC asymmetries vs DBI** (catalog these for KosPos):

1. **Extra MCCP Offset row (49).** CPC has MCCP positions; DBI doesn't.
   Adds a class line and shifts the attrition residual row down by one.
   In KosPos: a special-class line list per dept-group, with classes
   driven by which positions the dept has (PCS with steps → STEPM
   visible; PCS in MCCP ranges → MCCP visible; etc.) rather than a
   fixed block of rows.
2. **TEMP row (50) is undifferentiated.** Note J50: `"TEMP not
   differentiated"`. CPC doesn't have a TEMPM-Interns equivalent of
   `COMMN:5380`; CPC's TEMP is just rolled into the regular labor
   budget via the SPECIAL block, with no separate YTD-actuals or
   projection source. The attrition residual (row 51) absorbs all of
   it. KosPos: TEMP is just another special class — surface it the same
   way as PREMM/OVERM, parameterize the YTD-actuals source per dept
   rather than hardcoding `COMMN:5380`.
3. **Row 53 prior-year actual attrition rate is empty.** Only J53 has
   the label; H53 has no value. So CPC has no historical baseline at
   all. KosPos: prior-year rates always derive from saved snapshots —
   no per-dept-group hand-keyed values to forget.

**Two structural notes on the CPC block:**

- **MCCP Offset row 49 and TEMP row 50 have NO `E` or `H` formulas.**
  Only `D`, `G`, and computed `F` / `I` (which both reduce to the
  budget side when E and H are blank). The dollars are absorbed into
  9993 Attrition (row 51) via the residual computation. This works
  arithmetically (residual = bucket of everything not explicitly
  named) but masks the dept-group's actual MCCP Offset spend pattern.
  KosPos: every named special class gets full YTD-actuals + projection
  treatment, no "absorbed into 9993" shortcuts.
- **CPC G46 OVERM = $0** because CPC has no overtime budgeted (the SPECIAL
  block has zero `"Overtime - Miscellaneous"` rows for CPC). The YTD
  actuals (E46 = $3,944) show CPC posted a tiny amount of OT anyway —
  manual reclass or one-off. Reconciled into 9993 via the residual.

#### Formulas — fund-code shortcut: DBI uses 10190, CPC uses 10000

The DBI block's E36/E37 `GETPIVOTDATA(..., "Fund Code", 10190)` and the
CPC block's E45/E46 `GETPIVOTDATA(..., "Fund Code", 10000)` are not the
same shortcut. **DBI's operating fund is 10190; CPC's is 10000.** Each
dept-group's special-class actuals only filter to its own fund-of-record:

- DBI Premium / Overtime / RPO YTD actuals = fund 10190 only.
- CPC Premium / Overtime YTD actuals = fund 10000 only. (RPO uses dept
  group code instead of fund.)

This is operationally fine while each dept-group lives entirely in one
fund. As soon as a dept-group operates across multiple funds (CPC capital
projects, DBI's BIF-Continuing, future inter-fund OT), the filter
under-counts. **The catalog of DBI shortcuts already lists "Fund 10190
filter" as a generalization target; CPC's `Fund 10000` is the mirror
shortcut.** Both belong in the
[cross-cutting concerns table](#multi-dept-generalization-caveats-dbi-shortcuts-to-undo).

#### What's manual / fragile

1. **DBI/CPC block-shape asymmetry is hand-coded.** Adding a class to one
   dept-group (e.g., MCCP for DBI, or a fire-specific row for SFFD) means
   inserting a row and shifting the residual row's offset. The attrition
   formula at F41 / F51 is `GETPIVOTDATA(dept_group total) - SUM(F36:F40)`
   — the `F36:F40` range is hardcoded to the current 5-row block layout.
   Insert a row at position 39 and the formula either picks it up
   automatically (if Excel adjusts the range, which it usually does) or
   silently breaks (if the row is added below the SUM range). KosPos:
   classes per dept-group come from a list, residual is computed over
   "every class not explicitly named," no row-position dependencies.
2. **H40 hardcoded `0` (TEMPM Interns projection).** Alex overrides when
   no interns are planned (J40 note). Easy to forget to update when interns
   are planned mid-year. KosPos: "expected interns this year" input on
   the TEMPM card with the COMMN:5380 YTD as the baseline; default to
   "match YTD" rather than zero.
3. **H43 hardcoded `-0.15438` (DBI prior-year actual attrition rate).**
   Hand-keyed annually. Methodology not documented in the workbook (J43
   says "Calculated, Questionable" — Alex's own caveat). KosPos: derives
   from saved end-of-year snapshot of the prior FY; methodology lives in
   code with the rate display.
4. **H53 empty (CPC prior-year attrition rate).** No reference baseline
   for CPC at all. KosPos: same automatic derivation eliminates the
   asymmetry.
5. **Fund-code hardcode per dept-group** (DBI=10190, CPC=10000). See
   above. Needs to come from a dept-group → operating-fund-set lookup
   sourced from BFM fund-control = `FACCT` (per [Tab 20 cross-cutting
   concerns](#cross-cutting-the-dual-per-pp-grid-yay-operating-bbcb-continuing)).
6. **CPC E49 / E50 / H49 / H50 absent.** MCCP Offset and TEMP have no
   YTD-actuals or projection. The residual at F51 / I51 absorbs them
   silently. **You won't see the MCCP Offset YTD spend pattern unless
   you drill into Step!A:A or Report Data SPECIAL rows directly.** KosPos
   surfaces every named class with full math, no implicit-residual
   absorption.
7. **G40 hardcoded BFM cell addresses** (`AZ1195+AZ1197+AZ1199+AZ1201`).
   The four BFM rows shift if BFM adds/removes rows above. Already
   flagged in [special-class.md § TEMPM](special-class.md#tempm_e--temporary-misc--pending-walkthrough). KosPos: SUMIFS by
   `(dept-group, account-description)` against the BFM eturn, not row
   indices.
8. **G36/G37/G38/G39/G45/G46/G47/G48/G49/G50/G51 hardcoded `Report
   Data!$S$649:$S$748` range.** If the SPECIAL block in Report Data is
   ever resized (e.g., DBI/CPC roll-in adds dept-groups, or new
   special-classes are added), the SUMIFS range must be widened. **Tab 20
   already lists this as a manual/fragile item;** OPS Summary inherits
   the fragility.
9. **All `D` cells use pure-PP pacing** (`G/J2*I2`), not COLA-weighted.
   Consistent across the special-class block but in tension with
   KosPos's COLA-aware default. The straight-line pacing is "close
   enough" for the special-class lines where COLA doesn't apply
   directly to the special-class total (OT and Premium dollars don't
   inherit the per-PP COLA, but the budget shadow they trace might).
10. **`L` column ratio is conceptually different from G42/H42 attrition
    rates.** L23 = `projected_balance / total_budget` = "leftover after
    spending". G42/H42 = `9993_amount / non-9993_labor` = the canonical
    attrition rate. Both are %, both look similar, easy to confuse in a
    presentation. KosPos: separate the two metrics with different visual
    treatment and tooltips explaining what each represents.
11. **CPC G46 OVERM = $0 but E46 = $3,944.** Tiny OT-without-budget event
    silently absorbed into 9993. In a department with material OT, this
    pattern would mask overspend. KosPos: flag as "actuals posted to a
    line with zero budget."
12. **Pivot range reference `$A$1` in every GETPIVOTDATA.** The DBI block
    references the dept-group rollup by `Department Group` (a pivot
    label not present in Report Data — it's the grouped field
    `Effective Employee Division2`). If the pivot is ever rebuilt with a
    different top-level grouping name, every GETPIVOTDATA in rows 41,
    42, 51, 52 breaks. KosPos: structured queries rather than pivot
    GETPIVOTDATA strings.

#### KosPos improvements

##### 1. Headline page split into dept-group cards, not two regions on one sheet

**Problem in the workbook.** OPS Summary stacks two distinct views — the
per-dept rollup pivot at the top and the per-class block at the bottom —
on one sheet. They look related (both have G = Total Budget, both end at
attrition) but they answer different questions (where is the money? vs.
which class is the money?). The pivot also doesn't show special classes
broken out; the special-class block doesn't show per-dept distribution.
A reader has to mentally cross-reference.

**KosPos design.** One **headline page per dept-group** (DBI card, CPC
card, future SFFD card, etc.), each with two side-by-side panels:

- **Left: per-dept rollup table.** One row per dept under the group,
  showing YTD budget / YTD actual / YTD balance / total budget /
  projected actual / projected balance / projected balance % of budget.
  Click any dept row to drill into [Tab 27 Operating Report Detail](#tab-27--operating-report-detail) (which becomes a side panel, not a separate page).
- **Right: per-special-class card stack.** One card per class
  (PREMM, OVERM, RTPOM, STEPM, MCCP, TEMPM, 9993). Each card shows YTD
  budget pace / YTD actual / projected total / variance, with a 1-line
  "what's driving this" callout (e.g., for OVERM: "$555k projected vs
  $380k budget — 87% of overrun from 2 depts: Building Inspection,
  Plumbing Inspection"). 9993 always shows the attrition rate
  prominently with a prior-year comparison.

Above both panels: a single dept-group attrition-rate gauge with
prior-year, current, and projected values. The "is this department on
track" answer is at the top of the page.

##### 2. Compute 9993 attrition rate consistently and document it

**Problem in the workbook.** Three different things called "attrition rate":

- **G42 / H42**: `9993_amount / (total_budget − 9993_amount)`. The
  canonical formulation. Denominator is non-9993 labor budget.
- **L23 / L32**: `projected_balance / total_budget`. Different
  numerator (full projected balance, not just 9993) and different
  denominator (total budget, not labor minus 9993).
- **H43 prior-year**: hand-keyed; methodology unclear (J43: "Calculated,
  Questionable").

A reader looking at three "rates" on the same page can't tell which is
canonical.

**KosPos design.** One canonical definition per the special-class system:

```
attrition_rate(dept_group) =
  (9993_dollars + 9994_dollars) / (total_labor − 9993_dollars − 9994_dollars)
```

Computed identically for YTD-budget-pace / YTD-actual / projection /
prior-year-actual. **Prior-year-actual derived from the saved end-of-FY
snapshot, not hand-keyed.** Methodology rendered as a tooltip on every
rate display so a new analyst doesn't have to dig.

##### 3. Drop the COLA-unaware D column; use COLA-aware pacing everywhere

**Problem in the workbook.** Every D cell in the special-class block uses
`G/Calendar!J2*Calendar!I2` (pure-PP). The per-dept pivot D column uses
Report Data's T column, which is `S/N2*M2` (COLA-weighted). Same column
header ("YTD Operating Budget"), two different math. Reader can't tell
without inspecting the formula.

**KosPos design.** All YTD-budget pacing uses the COLA-weighted ratio
universally (per [Calendar § Improvement #2](#tab-5--calendar) and memory
`feedback_projections_always_cola_aware.md`). The straight-line view is
optionally available as a "simplified pace" check, never the headline
figure. The same `project()` function used everywhere else in KosPos
returns both modes; the page displays only the COLA-aware result by
default.

##### 4. Surface every named special class with explicit YTD + projection

**Problem in the workbook.** CPC MCCP Offset (row 49) and CPC TEMP (row 50)
have no E (YTD actuals) and no H (projection). Their YTD spend pattern is
invisible — absorbed into the 9993 residual. For a dept-group running a
material MCCP population (Planning has many MCCP positions), not seeing
MCCP YTD-vs-budget is a blind spot.

**KosPos design.** For every named special class with a non-zero budget
in the dept-group, surface:
- YTD actuals (sourced from the per-class tab's pivot or Step!S range).
- Projected actuals (from the per-class tab's projection cell or formula).
- Variance to budget.

The 9993 residual still closes the math, but it closes a smaller gap
because every other class is explicitly accounted.

##### 5. Configurable fund-code-per-dept-group, not hardcoded 10190 / 10000

**Problem in the workbook.** DBI E36/E37 filter to fund 10190; CPC
E45/E46 filter to fund 10000. Both are hardcoded literals. A dept that
spends premium pay across two funds (e.g., DBI BIF-Continuing + Annual)
would have actuals scattered. Adding a third dept-group means a third
fund constant to remember.

**KosPos design.** Each dept-group carries an `operating_funds: Set<FundCode>`
attribute, sourced from BFM's `Fund Control = "FACCT"` filter (annual
fund control = operating fund). Premium / Overtime / RPO YTD-actuals
queries filter by `FundCode IN dept_group.operating_funds`. New
dept-group on-boarding fills the set from BFM, not from a hand-key. The
existing DBI shortcut catalog entry covers this; this is the
"specifically the OPS-summary GETPIVOTDATA call" application.

##### 6. Snapshot the page state; show what changed vs the prior snapshot

**Problem in the workbook.** When OPS Summary updates run-to-run (every
PP), Alex eyeballs the diffs. The big mover ("projection up $400k since
last week") is visible only if you remember last week's numbers. Early
in the FY when projections swing materially, this is where mistakes
happen.

**KosPos design.** Every page-state save records:

```ts
{
  fy: number,
  asOfDate: Date,
  snapshotId: string,
  perDeptRollup: { ...8 measures per dept }[],
  perClassBlock: { dept_group, class, ytd_budget, ytd_actual, total_budget, projected_actual, projected_balance }[],
  attritionRate: { dept_group, ytd_actual_rate, projected_rate, prior_year_rate }[],
}
```

The headline page shows a "Δ since `<prior snapshot date>`" column next
to each metric, color-coded by direction and magnitude. The first item
flagged on a fresh refresh: any line that moved >10% or >$100k. Saves
auto-pin at every report milestone (6-month, 9-month, year-end). This
is the **"what changed since the last report" feature** Alex flagged in
the initial walkthrough description; it's the obvious win KosPos
delivers over Excel. See also [Tab 27 § KosPos improvements](#kospos-improvements-8)
where the same primitive powers position-level drill-down.

##### 7. Reconcile per-dept pivot to per-class block — the closure check is automatic

**Problem in the workbook.** The two regions must reconcile (sum of per-class
9993 + named classes + per-position regular labor = dept-group total).
They do, by construction (the residual at F41/I41/F51/I51 enforces
closure). But there's no display of *that* reconciliation — a small typo
in a SPECIAL block paste or a NEWP row could change F41 silently because
the residual absorbs the difference.

**KosPos design.** Display the reconciliation explicitly:

```
DBI dept-group balance
  Total budget                $62,100,574
  Per-dept rollup (pivot)     $62,100,574  ✓ matches
  Per-class breakdown
    PREMM       $1,191,559
    OVERM         $380,000
    RTPOM         $249,998
    STEPM        -$586,292
    TEMPM         $180,431
    9993        -$7,267,894
    Per-position regular labor (residual)  $67,952,772
  Sum                         $62,100,574  ✓ matches
```

When the closure fails (a hand-paste error in SPECIAL, or a
double-counted NEWP row), the user sees a red "reconciliation off by
$X" callout instead of a silent residual absorption. This is the
quality-flag application of the closure invariant.

##### 8. Don't filter Premium / Overtime / RPO actuals by fund at all; sum across the dept-group's funds

**Problem in the workbook.** Premium and Overtime pivots are filtered by
`Fund Code = 10190` (DBI) or `10000` (CPC). Even within DBI, OT could
legitimately post to fund 11000 (BIF-Continuing) when the work was
billable. The current filter under-counts that.

**KosPos design.** Sum across all funds the dept-group operates in (per
improvement #5). Show a fund breakdown drilldown for users who need to
see "is some OT posting to the wrong fund."

#### KosPos UI sketch

The **Operating Report headline** page is the home page of the
current-year workspace. One screen per dept-group; a sidebar lists the
dept-groups the user has access to.

**Top of page** — three big numbers in a row, the dept-group health
indicators:

```
DBI · FY26 · as of PP 22 of 26.1
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Total Budget    │ │ YTD Actuals     │ │ Projected       │
│ $62.10M         │ │ $49.03M (79%)   │ │ $57.27M  (92%)  │
│  vs prior snap  │ │ vs prior snap   │ │ vs prior snap   │
│  +$120k         │ │  +$1.85M (PP+1) │ │  +$430k         │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Attrition rate
  YTD actuals   -16.83%     ← red below -10% (over budget)
  Projected     -16.83%     ← green if within ±2% of prior
  Prior year    -15.44%
```

**Middle of page** — two side-by-side panels:

- **Left panel: per-dept rollup table.** Columns = YTD Budget / Actuals
  / Balance / Total Budget / Projected Actuals / Projected Balance /
  Projected % of Budget. Rows = dept-group rollup, dept-group division
  rollup, individual dept. Sortable, filterable. Click a dept row to
  open a side panel mirroring [Tab 27 Operating Report Detail](#tab-27--operating-report-detail) filtered to that dept.
- **Right panel: per-class card stack.** One card per class with the
  six-stat header (YTD budget / actual / variance / total budget /
  projected actual / projected balance). Each card has a "what's
  driving this" callout. Click → opens the per-class tab's UI
  (Premium / Overtime / RPO / Step etc.).

**Bottom of page** — reconciliation strip (per improvement #7):

```
Reconciliation: per-dept total matches per-class total  ✓
  Total budget               $62,100,574
  Per-dept rollup            $62,100,574    ✓
  Per-class breakdown        $62,100,574    ✓
```

When the closure breaks (e.g., SPECIAL block out of sync), this strip
goes red with a "fix this" callout pointing to the Data Issues panel.

**Floating "Snapshot Δ" panel** (collapsible, top-right):

```
Δ since 2026-05-01 snapshot
  Big movers
    DBI ADM MIS YTD balance     +$120k   ⚠ (review)
    DBI projected attrition     +$430k
    DBI 9993 projected          -$430k
  All others within ±$10k
```

#### Excel export notes

The corresponding sheet in the KosPos-emitted `.xlsx` mirrors the
workbook layout for parity-checking but adds an explicit reconciliation
block:

- **Sheet `Operating Report Summary`.** A1:K33 = same per-dept pivot
  shape. Rows 36–53 = same per-special-class block shape. Plus rows
  55+ = the per-snapshot Δ table.
- **Named ranges:** `DBI_TotalBudget`, `DBI_AttritionRate`, etc., so
  downstream consumers (the report PDF generator, the CON/MYR
  submission template) reference by name rather than cell address.
- **Reconciliation strip** at row 56–60 — explicit per-dept-group
  closure with green "matches" / red "off by $X" indicator.
- **Prior-snapshot column** added to the per-dept pivot (M:T) with Δ
  values + color-coded conditional formatting.

The block-shape asymmetry (DBI 6 classes / CPC 7 classes) goes away in
the export — every dept-group gets the same 7-class block with empty
cells where a class doesn't apply. Layout consistency over compactness.

#### Open questions / TODO

- [ ] **DBI special-class block uses pure-PP pacing in D column; per-dept
      pivot D column uses COLA-weighted from Report Data T.** Two
      different YTD-pace metrics live on the same page under the same
      header. KosPos resolves by making everything COLA-weighted — but
      worth confirming with Alex that "YTD Operating Budget pace" should
      always be COLA-aware on the special-class side too. Reasonable
      default per memory `feedback_projections_always_cola_aware.md`.
- [ ] **L23/L32 ratio definition vs G42/H42 definition.** Both display as
      % at the dept-group level but use different math. Confirm which
      one Alex considers "the attrition rate that goes in the report."
      Reasonable default: G42/H42 is canonical (9993 / non-9993), L23/L32
      is "leftover after spending" and gets a different label in KosPos.
- [ ] **CPC's prior-year attrition rate (H53) is empty.** Was it ever
      computed and dropped, or did CPC just never have a baseline? KosPos
      derives from saved snapshots automatically; confirm whether the
      FY25 CPC end-of-year snapshot is preserved somewhere (probably
      the FY25 Labor Report workbook).
- [ ] **CPC MCCP Offset (row 49) and CPC TEMP (row 50) have no E or H
      formulas.** Reasonable call: these were skipped because CPC's
      MCCP-Offset YTD isn't readily available in the existing per-class
      tab structure (Step doesn't break out MCCP cleanly per Alex's
      walkthrough note). KosPos: split MCCP into its own tab (separate
      from Step) per [special-class.md § STEPM](special-class.md#stepm_c--step-adjustments-misc--pending-walkthrough).
- [ ] **"Department Group" pivot label vs Report Data column.** OPS
      Summary's GETPIVOTDATA calls use `"Department Group"` as the
      lookup label, but Report Data has no column with that exact name —
      the pivot's row-axis-grouped field `Effective Employee Division2`
      is rendered as "Department Group" in the pivot output. If the
      pivot is ever rebuilt with a different top-level grouping label,
      every GETPIVOTDATA in rows 41, 42, 51, 52 breaks. Already in
      Manual/fragile; surfacing for Alex to confirm whether the pivot
      grouping is intentional and whether to preserve the "Department
      Group" name during the KosPos rebuild for downstream-formula
      compatibility.
- [x] **TEMPM Interns G40 references BFM rows 1195/1197/1199/1201.**
      Cross-reference [Task B reconciliation suite](../audits/bva-reconciliation-suite.md) — does
      BVA see this $180k in DBI's Salaries chartfield, or has it
      already been disposed via KK? **Resolved 2026-05-25 (Task B Test
      4 / Test 1):** all 4 BFM rows have AX == AZ in this snapshot (no
      KK Technical Adjustment applied), and BVA shows zero `Transfer &
      Other Budget` on these specific TEMPM chartfields. The $180k is
      still in DBI's Salaries chartfield set as originally budgeted.
- [ ] **Reconciliation closure (improvement #7) detects SPECIAL block
      paste errors only at the dept-group total level.** Per-class
      validation needs the BFM eturn join — i.e., did the user paste
      the right `S` value for `(class, dept)` from the eturn's
      special-class summary rows? KosPos's importer can do this on
      upload; the workbook can't.

---

### Tab 27 — Operating Report Detail

**Status:** walkthrough — done 2026-05-25

**Purpose:** **Drill-down companion to OPS Summary.** Same pivot cache as
[Tab 26 OPS Summary](#tab-26--operating-report-summary) (both source from
Report Data via pivot cache `935`), but with **14 additional row fields**
extending the rollup all the way to the position level. Where OPS Summary
collapses to 33 dept-rollup rows, OPS Detail expands to 813 per-position
+ per-archetype rows.

Two operational use cases:

1. **Variance investigation.** OPS Summary shows DBI ADM MIS has a
   $2.13M YTD balance (huge underspend). OPS Detail lets you walk
   row-by-row through the dept to see which positions / archetypes
   contribute. The 18 row fields collectively pin down the line:
   "filled positions show $391k YTD actuals; the underspend is on
   vacant positions and SPECIAL-class budget that hasn't drawn down
   yet."
2. **"What changed since the last report" forensic.** Alex explicitly
   flagged this as the obvious KosPos win. Today the workflow is:
   open last week's OPS Detail in a second window, eyeball-diff
   against this week's, find the changed rows. KosPos automates this
   — see [§ KosPos improvements](#kospos-improvements-8).

#### Data sources

- **Sole source:** [Tab 20 Report Data](#tab-20--report-data) via pivot
  cache `935`. Same cache as OPS Summary — the two tabs are two views of
  the same data, at different rollup grains.
- No external file. Tab 27 is **a derived view, not a data source.**

#### Snapshot scope (this workbook, as of 2026-05-08)

| Dimension | Count |
|---|---|
| Total rows (A:Z, including header) | 813 |
| Columns | 26 (`A` Eff Div2 … `Z` Sum of Projected Continuing Actuals) |
| Pivot row fields (17 = 3 from OPS Summary + 14 added) | 17 |
| Pivot data fields (8, same as OPS Summary) | 8 |
| Distinct Position Fill Status values (incl. SPECIAL archetypes) | 14 |
| Per-position rows (FILLED / VACANT / OVER FILLED / PARTIALLY FILLED + null-status drill-down rows) | ~600 |
| SPECIAL-block rows | 23 |
| OVERTIME / PAYOUT catcher rows | 36 |
| HIRING / SEPARATING / INACTIVATED / GL / MERGE / NEWPxxxxx archetypes | 20 |
| Grand Total row | 1 (row 813) |

The 813 rows aren't 1:1 with Report Data's 798 rows — the pivot
introduces subtotal / division-rollup rows and may collapse blank
separators. Detail rows ≈ 793 + ~20 layout rows ≈ 813.

#### Formulas — pivot row-axis fields (17 of 81 cache fields)

OPS Detail extends the 3 row-axis fields used by OPS Summary with 14
more, all sourced from Report Data columns. Listed in axis order (this
is the rollup hierarchy):

| # | Pivot axis label | Cache field idx | Report Data col | Meaning |
|---|---|---|---|---|
| 1 | Effective Employee Division2 | `[80]` | — (pivot-grouped) | Dept-group (DBI/CPC). |
| 2 | Effective Employee Division | `[0]` | A | Mid-level division. |
| 3 | Effective Employee Department | `[1]` | B | Granular dept. |
| 4 | Position Fill Status | `[4]` | E | FILLED / VACANT / OVERTIME / PAYOUT / SPECIAL / HIRING / SEPARATING / INACTIVATED / OVER FILLED / PARTIALLY FILLED / MERGE / GL / NEWPxxxxx / blank (per [Tab 20 archetypes](#tab-20--report-data)). |
| 5 | Position Number | `[3]` | D | Per-position PK from PS HCM. |
| 6 | Employee Job Code | `[5]` | F | 4-digit SF job code at incumbent's class. |
| 7 | Employee Appointment Type | `[6]` | G | PCS / PEX / TEX / etc. |
| 8 | Budget Job Code | `[7]` | H | Either a job code (per-position rows) or a special-class label string (`Attrition Savings - Misc`, `Temporary - Misc`, `Premium Pay - Misc`, …) on SPECIAL rows. |
| 9 | Employee First Name | `[8]` | I | Incumbent. |
| 10 | Employee Last Name | `[9]` | J | Incumbent. |
| 11 | Employee Name Vice 1 | `[10]` | K | Acting / "in place of" linkage. |
| 12 | Manager First Name | `[11]` | L | Reports-to. |
| 13 | Manager Last Name | `[12]` | M | Reports-to. |
| 14 | Roster Code | `[13]` | N | Roster classification. |
| 15 | Roster Code Description | `[14]` | O | Human-readable roster label. |
| 16 | Budgeted Department | `[15]` | P | The dept the position is budgeted under (vs `Effective Dept` = where the employee is charging today). |
| 17 | Charge Override Department | `[16]` | Q | Combo-code-derived charge override. |
| 18 | Exclude | `[17]` | R | The COUNTIF-based dedup flag from Tab 20 — `Y` on the duplicate pool-position rows that should be zeroed. |

Same eight **data fields** as OPS Summary (cols S–Z in OPS Detail =
cache fields `[19], [20], [21], [18], [22], [23], [51], [52]`): YTD
Operating Budget / Actuals / Balance + Total Budget + Projected Operating
Actuals / Balance + YTD Continuing Actuals + Projected Continuing
Actuals.

**No formulas on this sheet.** Every cell is a pivot output. Recompute on
pivot refresh.

#### What this view reveals that OPS Summary hides

- **Per-archetype distribution within a dept.** Drill into DBI ADM MIS
  and you see: 5 FILLED positions ($391k YTD), 1 VACANT position
  ($0 YTD), 3 SPECIAL rows (PREMM / OVERM / RTPOM / STEPM / 9993
  contributions to that dept), 2 OVERTIME catcher rows (DBI ADM MIS
  OT line items), 1 PAYOUT catcher row.
- **Per-position fill-status changes.** A position that was FILLED at
  the prior snapshot and is now VACANT shows up by name when the
  diff is computed (per improvement #1 below).
- **Manager assignments.** Cols L/M (Manager First/Last) are not
  visible in OPS Summary; useful for "who's the next-level manager
  responsible for this overspend."
- **Charge-override departments (col Q).** Where a position's
  budgeted dept differs from the dept it's actually charging to (a
  combo-code reassignment), col Q surfaces the difference. OPS
  Summary aggregates by Effective Dept and loses this visibility.

#### What's manual / fragile

OPS Detail's fragility is **almost entirely inherited from
[Tab 20 Report Data](#whats-manual--fragile-6)**. The pivot adds no
formulas or hand-keyed values, so no new sources of error are
introduced here. The relevant items from Report Data that surface
prominently in OPS Detail:

1. **Pool-position duplicates** (e.g., position 1094089 with 14 rows).
   They appear as 14 separate rows in OPS Detail, all with `R Exclude
   = Y` and zeroed data. Cluttered.
2. **NEWP placeholder rows** (e.g., NEWP315641 in this snapshot — the
   one row in OPS Detail with Fill Status = `NEWPxxxxx`) display the
   placeholder as the fill-status value. Visually conspicuous; would
   distract a non-budget-expert reader.
3. **MERGE / GL / INACTIVATED rows** carry the dept group code in col K
   instead of an Effective Employee Department — they show up under a
   different rollup level than the dept they conceptually belong to.
4. **OVERTIME / PAYOUT catcher rows are DBI-only.** 18 of each, all
   under DBI divisions; CPC has no catcher rows even though it posts
   real OT actuals (per OPS Summary E46 = $3,944). Same DBI-only
   oversight noted in Tab 20.
5. **Pivot subtotals can be confused for per-position rows.** A
   subtotal row at "DBI AdminIstration Total" looks like another data
   row with no name/job/etc. Visually distinguishable in Excel by
   formatting; harder to filter against programmatically.
6. **Eight data-field cells per row are 0 / blank on archetype-zero
   rows.** A SPECIAL row with positive `Total Budget` (col V) but
   zero `YTD Operating Actuals` (col T) is normal (SPECIAL rows have
   only budget); but a FILLED position with zero YTD Actuals is a
   data issue worth surfacing. Same cell shape, different meaning —
   the discrimination logic is in the Fill Status column.

#### KosPos improvements

##### 1. Snapshot-diff is the headline feature

**Problem in the workbook.** Today's workflow: open last PP's OPS Detail
in one window, this PP's in another, eyeball-diff. Time-consuming and
error-prone — Alex flagged this explicitly as the obvious KosPos win
in the initial Tab 27 stub.

**KosPos design.** Every page-state save (per [OPS Summary improvement
#6](#kospos-improvements-7)) captures the full OPS Detail row set
keyed by `(Effective Dept, Position Number, Fill Status, Budget Job
Code)`. The Detail view renders with a default-on **"Δ since
`<prior_snapshot>`"** column toggle:

- Rows that appeared since the prior snapshot show a green `NEW` chip.
- Rows that disappeared (e.g., a SEPARATING row that posted, or an
  inactivated position) show a red `REMOVED` chip on a faint row.
- Rows whose Fill Status changed (FILLED → VACANT, VACANT → FILLED via
  hire-completion, FILLED → INACTIVATED) show a yellow `STATUS Δ` chip
  with the prior and current values side by side.
- Rows whose YTD Actuals or Projected Actuals moved by more than a
  threshold ($1k or 5%, configurable per audience) show a blue `$ Δ`
  chip with the dollar delta.

A **summary callout above the table** condenses the diff to one line
per category: "3 new HIRING rows, 1 SEPARATING completed, 2 FILLED
positions now VACANT, 17 rows with >$1k actuals movement."

##### 2. Hide pool-position duplicates by default

**Problem in the workbook.** Position 1094089 (Commissioners) shows 14
rows in OPS Detail, all zeroed via `R Exclude = Y`. The duplicates make
the dept look more populated than it is, and a non-expert reader doesn't
know they should be filtered out.

**KosPos design.** Default view shows one row per `Position Number` with
a `(N more incumbents)` badge for pool positions. Click the badge to
expand into per-incumbent rows. The dept's "position count" header
reflects unique positions, not row count.

##### 3. Catcher rows render as a dept-level summary, not as separate rows

**Problem in the workbook.** OPS Detail intersperses per-position rows
with OVERTIME / PAYOUT catcher rows for the same dept. Reader has to
mentally re-group: "the dept's overtime line is row 32, the
plumbing-position rows are 250–263." On the screen, they're not visually
linked.

**KosPos design.** Per-dept section header shows the dept's
special-class totals (OT, RPO, Premium, Step, etc.) as a small
summary band at the top of the dept's per-position list. The catcher
rows themselves still exist in the underlying data but render as part
of the section header, not as separate scrollable rows.

##### 4. Charge-override / combo-code drift gets a Data Issues flag

**Problem in the workbook.** Col Q (Charge Override Department) shows
positions whose budget dept differs from effective dept. Today it's a
column you have to look at. A material drift (e.g., 12 positions
budgeted to DBI ADM Finance but charging to DBI IS Building Inspection)
is silently a data issue — it changes who owns the spend.

**KosPos design.** Any row where `Budgeted Department ≠ Charge Override
Department ≠ Effective Department` triggers a Data Issues flag.
Resolution UI: "approve the reassignment" (updates the Position record)
or "flag for combo-code correction" (creates a change request).

##### 5. Fill-status mix as a department health vital

**Problem in the workbook.** A dept's fill-status mix (how many FILLED
vs VACANT vs OVER FILLED vs PARTIALLY FILLED) is implicit in the
per-position rows. To answer "what's the vacancy rate?" you have to
filter and count.

**KosPos design.** Each dept section header surfaces the mix as a
stacked bar:

```
DBI IS Building Inspection  |████████ 32 FILLED |▒▒ 4 VACANT |░ 1 OVER FILLED |
  Vacancy rate: 10.8%  ·  RTF coverage: 75% (3 of 4 VACANT have an active RTF)
```

The RTF-coverage cross-reference comes from P&P Data's `Latest RTF ID`
column (Tab 6).

##### 6. Cross-link every row to the position's full record

**Problem in the workbook.** OPS Detail shows 18 attributes per row. To
see the position's full record (138-column P&P Data + 80-column Report
Data formulas + per-PP BI Payroll detail), you XLOOKUP from the
position number.

**KosPos design.** Every per-position row is a hyperlink to the Position
Detail page (per [Tab 6 KosPos UI sketch](#kospos-ui-sketch)). The
side panel render shows the position's full P&P record, the per-PP
operating + continuing grid, the per-PP earnings-code breakdown, and
the projection components.

#### KosPos UI sketch

**OPS Detail is a side panel of the OPS Summary headline page**, not a
top-level navigation surface. Clicking a dept row in OPS Summary's
per-dept rollup table opens the Detail panel filtered to that dept.
Clicking outside the panel returns to the headline page.

**Default panel state** — filtered to the clicked dept, default-on
"Δ since prior snapshot" toggle, default-on "hide pool duplicates"
toggle. Sections:

```
DBI IS Building Inspection  · 32 positions · YTD $5.84M (90%) · Projected $6.89M
└─ Section header: fill-status bar + special-class summary band
└─ Per-position rows
    1059020  Murphy, Caroline   FILLED   PCS  6248  $191k YTD  $223k projected
       Δ since 2026-05-08:  +1 PP of actuals ($8.5k), no other changes
    1124821  NEW (RTF active)   VACANT   PCS  6321  $0 YTD  $19k projected (hire-cost)
       NEW since 2026-05-08:  status RTF→active 2026-05-22
    ...
    1094089  Commissioners pool ·  14 incumbents (expand)  ·  $0 YTD
```

**Filter chips above the panel:** Fill Status (multi-select), Appointment
Type, Roster Code, Budget Job Code. Search box for position
number / employee name.

**Bulk export** of the visible filtered set to CSV / XLSX with the
Excel-export naming below.

#### Excel export notes

The KosPos-emitted `.xlsx` includes both the headline and the detail in
parallel sheets:

- **Sheet `OPS Summary`** — per [Tab 26 § Excel export](#excel-export-notes-7).
- **Sheet `OPS Detail`** — 26 columns matching the workbook layout (A:Z)
  plus three more added for KosPos value:
  - `AA` Prior-snapshot YTD Operating Actuals (for at-a-glance Δ).
  - `AB` Snapshot Δ flag — `NEW` / `REMOVED` / `STATUS_Δ` / `$_Δ` / empty.
  - `AC` Data Issues — comma-separated list (`pool-duplicate`,
    `charge-override-drift`, `vacancy-no-rtf`, etc.).
- Pivot reconstruction in Excel: include a pivot definition so the user
  can re-pivot if they prefer the Excel rollup view. KosPos's emitted
  pivot grouping (Effective Employee Division2) preserves the
  DBI/CPC top-level rollup for downstream-formula compatibility.

#### Open questions / TODO

- [ ] **Snapshot-diff granularity.** Diff by `Position Number` is
      obvious. But what about a SPECIAL row whose `Total Budget` (col
      V) changes because BFM republished the eturn? The diff is
      keyed on `(Effective Dept, Position Number, Fill Status, Budget
      Job Code)`, which for SPECIAL rows means `(Eff Dept, blank,
      SPECIAL, "Attrition Savings - Misc")` — a stable key, so the
      diff would surface the dollar change. Confirm with Alex that
      this granularity is right.
- [ ] **"Δ since" reference snapshot.** Should the default reference
      be "prior PP" (every-2-weeks), "prior milestone" (6-month,
      9-month), or user-selectable? Reasonable default: prior PP,
      with a dropdown to switch to a saved milestone. Phase 2.4
      decision.
- [ ] **OVER FILLED / PARTIALLY FILLED positions** (2 + 1 in this
      snapshot). What does each status mean operationally? Tab 20
      mentions them but doesn't decode the semantics. Confirm with
      Alex during the Vacancies and TEMP walkthrough — they should
      drive Staffing Plan entries.
- [ ] **Charge-override behavior.** Col Q `Charge Override
      Department` is `(blank)` for most positions but populated for
      some. Confirm the population rule (combo-code → effective dept,
      vs. an explicit override).
- [ ] **The 14 row-axis fields in OPS Detail vs the 18 from the
      pivot config.** PivotTable22.xml lists 17 row fields, not 18.
      Cross-check: the `[2] Budget Department Code 1` field is in
      the cache (Report Data col C) but **not** in the OPS Detail
      pivot's row axis. KosPos: include it in the equivalent detail
      view since it cross-references the budgeted dept for
      reconciliation against BFM directly.

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
| OBI `P&P Data` report (position-and-personnel, 88 OBI cols, 604 rows for DBI+CPC at this snapshot) | **P&P Data** (raw stage), Report Data (XLOOKUP + pivot), Inactive (XLOOKUP), Staffing Plan (XLOOKUP), Step / Pos by Dept / Vacancies and TEMP / TEMP Limits / Reporting Tree / EE Additional Pay (pivots) | Manual OBI re-run; full snapshot replacing prior export; `Snapshot Date` recorded in col A of the data itself | Snowflake direct query when available; preserve full-replace + snapshot-history import model | `lib/importers/obi-pnp/` — header-driven fingerprint, full-replace per `(fiscal_year, snapshot_date)`, builds Position entities with three explicit dept fields (budgeted / effective / combo) and lazy hierarchy walk (see Tab 6 § KosPos improvements) |
| Citywide `Department Classification Structure` CSV (dept tree, 14,240 rows, 64 dept groups citywide) | P&P Data importer (fixes `CH Effective Employee Division` "Update Formula" placeholder); future modules that need any dept-tree-level rollup (Division / Section / Unit / Sub-Unit) | Manually downloaded from same OBI folder as the other chartfield trees; refreshed periodically as new dept codes are added | Snowflake direct query when available | `lib/reference/dept-tree/` — versioned by effective date; Position importer joins `Position Department ID` against the active tree to derive hierarchy attributes |
| Other chartfield trees in the same OBI folder (Account 16×6,723 / Account Budget Control 13×2,971 / Activity 9×81,905 / Agency Use 3×3,724 / Authority 9×14,307 / Department Budget Control 16×1,512 / Fund 16×1,951 / Project 13×43,012 / TRIO 3×3,677 / WBS 17×390,470) | _(future)_ — each becomes reference data when its consuming KosPos module surfaces. **Fund tree carries the `Annual/Continuing` flag** that powers the operating-fund-set derivation in [cross-cutting concerns](#multi-dept-generalization-caveats-dbi-shortcuts-to-undo). Full file inventory in [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md). | Manual download from OBI; refresh periodically | Snowflake direct query | `lib/reference/<tree-name>/` — same pattern as dept tree; documented per-module as walkthroughs land |
| BFM 5-report bundle (`15.10.001` non-position eturn 1,016×49 / `15.10.006` position eturn 1,931×64 / `15.15.002` benefit rates 54+1,621 rows / `15.15.014` job-class rates + COLA 1,314+5 rows / `15.15.016` FTE cost 1,174×13 — being retired) | All consumed during budget formulation; `15.10.006` is the primary current-year input. Concrete inventory in [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md). | Manual download from BFM portal; weekly during budget season, rare otherwise | Snowflake direct query (when available) | `lib/importers/bfm-*/` — one per report ID |
| PS HCM exports (`MRG_COMBO_CD_DEPT` 14×3,697 / `MRG_HR_EE_ADDL_PAY` 18×~thousands / `MRG_TL_TASK_PROFILE_BY_TASKGRP` 20×~hundreds / `MTL0170` roster approvers 9×866) | Tabs 3 (Combo), 9 (EE Additional Pay), 8 (Roster Approvers); Task Profiles for Phase 3 chartfields. Concrete inventory in [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md). | Manual PS HCM Query Manager re-run; cadence varies | Snowflake direct query when available | `lib/importers/ps-hcm-*/` |
| DHR Hourly Rates of Pay (`Hourly-Rates-of-Pay-by-Classification-and-Step-FY{NN}-{NN+1}.xlsx`) 29×17,116 (Steps) + 20×124 (Ranges) | Reference data for class × step rate lookups; underpins Step / RTPOM / OVERM math. Documented in [`../data-sources/dhr.md`](../data-sources/dhr.md). | DHR website download; annual after MOU ratification | Snowflake (if exposed) | `lib/reference/dhr-steps/` + `lib/reference/dhr-ranges/` |
| OBI Payroll Detail (older variant of BI Payroll; 38×42,949 in 11.8.23 sample) | Older schema (38 cols) preserved for backward-compat testing of the BI Payroll importer. Same source as today's BI Payroll; column count grew to 39 in current snapshot. | Manual OBI re-run | Snowflake direct query | Same path as BI Payroll (`lib/importers/obi-payroll/`) with header-driven schema detection |
| BFM 15.10.006 FY26 eturn (per-position + per-special-class summary rows; ~30 cols incl. FY26 Original / Base / Department / Mayor / Committee / Technical Adjustment / Board layers) | **Report Data** (S Total Budget SUMIFS on column `AX FY 2025-26 Technical Adjustment` — stale, should be `AZ Board`; SPECIAL block hand-paste from per-class summary rows), **Operating Report Summary** (TEMPM E40 from `AZ1195+AZ1197+AZ1199+AZ1201`), **Overtime** tab (FY26 OT budget anchor `BN6 / BN8`), Premium / Step / others as BY-anchor source | Manual download from BFM; refresh annually (Board-adopted) + periodically when Technical Adjustments hit; per-position rows + summary rows in same file | Snowflake direct query when available | `lib/importers/bfm-eturn/` — header-driven fingerprint, full-replace per `(fiscal_year, snapshot_date)`; uses Board-adopted (`AZ`) as default budget anchor with Technical-Adjustment / Department / etc. preserved for variance views; documented in [`../data-sources/bfm.md`](../data-sources/bfm.md) and ADR-004 |
| `BVA` report (Budget vs Actuals, per PS Financials via OBI) — 68 cols × 2,710 rows for DBI+CPC FY26 sample; full schema in [`../data-sources/bva.md`](../data-sources/bva.md) | _(planned)_ **Report Data** chartfield-level reconciliation (BVA budget vs eturn = KK adjustments; BVA actuals vs BI Payroll = GL adjustments — see [Tab 20 § KosPos improvements #1–#2](#kospos-improvements-6)) | _(planned)_ Manual OBI re-pull each PP, **Wednesday-or-later after payday Tuesday** (see [§ Refresh-order timing](#refresh-order-timing--obi-1-day-lag--payroll-to-gl-gap--bva-wed-or-later)); full-replace per `(fiscal_year, snapshot_date)` | Snowflake direct query when available | `lib/importers/bva/` — header-driven fingerprint; chartfield-keyed; pre-computes reconciliation cube on import; snapshot date sourced from file mtime (filename version date is the report-definition version, NOT the data snapshot) |
| Inactive tab `Sum of Balance Amount` (computed inside the workbook from BI Payroll's pivot cache; not a separate upstream file) | Report Data INACTIVATED block (rows 755–760) — **hand-pasted** each PP refresh into U column | Workbook-internal pivot; copy-paste-as-values into Report Data | Live query in KosPos: `positions WHERE in_bi_payroll AND NOT in_pnp_snapshot` → drives Inactive view directly | `lib/views/inactive/` — pure query, no separate import; INACTIVATED block in Report Data goes away |
| Staffing Plan (workbook-internal; will be its own importable surface in Phase 2) | Report Data HIRING (24 rows) + SEPARATING (4 rows) — direct cell refs into `'Staffing Plan'!{col}{n}` for B/D/F/G/H/K/L/M/N/O/W | Workbook tab; Alex edits directly | KosPos Staffing Plan workspace (Tab 24 surface) — first-class data store; Report Data view joins to it | `lib/staffing-plan/` — Phase 2.2 sub-phase enumeration target |

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
