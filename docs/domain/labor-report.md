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
| `'BFM 15.10.006 FY26'!AX` (Technical Adjustment) used as the budget anchor in Report Data S; should be `AZ` (Board-adopted) per [Tab 20 § Manual / fragile](labor-report-tabs.md#whats-manual--fragile-6) | Report Data S (per-position auto-SUMIFS) + NEWP rows (hand-key); inconsistent with TEMPM OPS E40 which already uses `AZ` | KosPos defaults to **Board-adopted (`AZ`)**; preserves earlier-layer columns (Original / Department / Mayor / Committee / Technical Adjustment) for variance views |
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
| Vacancies and TEMP slicer chips (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) are Excel Slicer objects with workbook-local state — two users opening separate copies and toggling differently produces divergent views silently. Categorical semantics aren't documented in the workbook either. | Vacancies and TEMP row 1 (slicer chips) | URL-encoded filter state shared between users; explicit filter definitions + tooltips per filter (see [Tab 23 § KosPos improvement #4](labor-report-tabs.md#kospos-improvements-21)) |
| Vacancies and TEMP's `CL Included In Staffing Plan` flag is one-way only — flags "Vacancies row missing from Staffing Plan" but not the reverse ("Staffing Plan row not in Vacancies"). The reverse direction lives on Staffing Plan's `V Check` column. Two half-diagnostics in two places. | P&P Data CL + Staffing Plan V | Bidirectional Coverage diagnostic on one panel (see [Tab 23 § KosPos improvement #2](labor-report-tabs.md#kospos-improvements-21)) |
| Staffing Plan 5-section block layout (Active rows 2–28, Separations 33–39, Pending 44–65, TEMP 70–85, Unfunded 90–93) is hardcoded — adding a row requires inserting at the right place AND rebasing the section's `=SUM(W2:W28)` / `=SUM(W33:W39)` / etc. rollup formula. Wrong placement silently breaks the rollup. | Staffing Plan rows 29 / 40 / 66 / 94 | PlannedAction model (per [Tab 24 § KosPos improvement #1](labor-report-tabs.md#kospos-improvements-22)) — no row-position dependencies; rollups computed from typed entities |
| Staffing Plan `W` / `X` cost cells are hand-typed snapshots from the Cost Calculator — no live link back to calculator inputs. A mid-year MOU COLA changes the calculator output but doesn't update existing rows until Alex re-runs. Same paste-value-once drift pattern. Active rows with blank cost (`Status = Not started / List / Posted`) are silently summed as zero — Budget Summary's `B5` therefore under-projects plan cost. | Staffing Plan W:X all rows | Live `expectedCost` computed from PlannedAction parameters (per [Tab 24 § KosPos improvement #2](labor-report-tabs.md#kospos-improvements-22)); blank-cost rows surfaced as "X of Y priced ⚠" diagnostic |
| Staffing Plan annualized rows (`X30`, `X41`, `X67`, `X95`) use pure-PP `Calendar!J2 = 26.1` to extrapolate per-PP cost — same workbook shortcut as elsewhere. Percentage-of-base cost components COLA-inflate; pure-PP annualization undercounts post-COLA. | Staffing Plan X30/41/67/95 | COLA-aware annualization (per [Tab 24 § KosPos improvement #9](labor-report-tabs.md#kospos-improvements-22) + memory [`feedback_projections_always_cola_aware.md`](labor-report-tabs.md#tab-24--staffing-plan)) |
| Staffing Plan position appearing across multiple sections (Active + Separation + TEMP for position 1115135) — same Position Number, three rows, no visual cue. A reader scanning each section independently can double-count. The pattern is intentional (Type encodes plan-time perspective, not a position attribute) but the workbook offers no aggregation. | Staffing Plan all sections | PlannedAction[] per Position model — one position, many actions; Position list shows "(N actions)" badge; Position Detail shows all on one timeline |
| Budget Summary excludes Pending + TEMP + Unfunded entirely from the surplus / deficit calc — only Active hires (`W29`) + Separations (`W40`) feed the rollup. Pending positions transferring to CPC, Unfunded positions, and TEMP placeholders represent real budget exposure invisible at the headline level. | Budget Summary B5 / B6 / B7 | Sensitivity ribbon: Pending-if-active / Unfunded-if-funded / DBI↔CPC transfer (per [Tab 25 § KosPos improvement #5](labor-report-tabs.md#kospos-improvements-23)) |
| Budget Summary has no BY+1 cost ladder — the "concept is right but never matured" issue. The tab's purpose hints at "what's BY+1's surplus given today's hiring plan?" but the formulas are all FY-this. Mid-year hires' full-FY cost extension into BY+1 isn't computed. | Budget Summary B2:B7 | Two-column FY+1 cost ladder (per [Tab 25 § KosPos improvement #1](labor-report-tabs.md#kospos-improvements-23)) with COLA-aware extrapolation against BY+1 BFM eturn total budget |
| Budget Summary pivot-label hardcodes (`"Sum of Total Budget"`, `"Sum of Projected Operating Actuals"`) in GETPIVOTDATA calls — same fragility pattern as OPS Summary's GETPIVOTDATA references. If the pivot field labels change in a future revision, Budget Summary silently goes empty. | Budget Summary B2 / B3 | Named refs / structured measures in KosPos's emitted pivots; importer flags renamed measures before they break aggregations |
| Tab 11 Eligibility Lists is hand-scraped from `sfdhr.org/examination-results` and inherits the `Acive` typo from the source. Citywide expansion requires scraping every class for every dept-group; today only DBI's 40 classes are tracked. | Eligibility Lists rows 2+ | `lib/reference/dhr-eligibility/` — periodic scrape keyed on job class; structured `list_status: 'active' \| 'expired' \| 'pending'` |
| Tab 9 EE Additional Pay's `Rep To Pay Above` derived column hardcodes one MOU's supervisory-differential math (SEIU 1021 Misc). Other BUs have different rules (IFPTE 21 has a 2-step differential; MEA has range-not-step). DBI's single-MOU population masks this; multi-BU depts get wrong supervisory-owed numbers. | P&P Data derived col `Rep To Pay Above` (cache 4 col 137) | Per-BU `SupervisoryDifferentialRule` table sourced from each MOU's relevant article; manager's BU drives the computation |
| Tab 22 Pos by Dept's pivot data field is `Count of 11RC` — works as a headcount proxy only because every active row has a populated 11RC. A future refresh where 11RC happens to be blank silently under-counts. The semantically-correct field is Distinct Count of Position Number. | Pos by Dept S column (pivot data) | KosPos emits `Distinct Count of Position Number` instead |
| Tab 21 Reporting Tree slicer chips (`Vacant` / `TEMP` / `Position =/= Budget (excludes TEMP)` / `Filled non-TEMP TEX` / `On Leave`) use a different vocabulary from Tab 23 Vacancies and TEMP (which has 6 chips including `Temp on Budgeted Position` and `Exclude`). Same categorical concepts, two different names. | Reporting Tree AW:BA vs Vacancies and TEMP row 1 | Unified slicer vocabulary per [Tab 21 § KosPos improvement #4](labor-report-tabs.md#kospos-improvements-19) |
| Tab 13 Inactive's `RIGHT(C2, 4)` job-code prefix-strip assumes 4-digit suffix (e.g. `COMMN:6322`). Breaks for 3- or 5-digit classes (e.g. MTA's `9123A` variants); DBI doesn't have these but citywide expansion does. | Inactive H column | Importer strips `COMMN:` prefix regex-based; preserves raw `job_code_raw` |
| Tab 13 Inactive's `D$755:$D$761` Report Data lookup hardcodes a 7-slot INACTIVATED block — if inactive count exceeds 7 in any PP, the workbook silently under-counts. | Inactive K column | Live query `positions WHERE in_bi_payroll AND NOT in_pnp_snapshot` — no cap |
| Tab 12 TEMP Limits Cat 16 hours-cap formula `V2` filters BI Payroll by `Y = Employee ID` + `AD = Position Number` — the per-position filter is correct per [memory `cat_16_17_18_rules.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/cat_16_17_18_rules.md). **The Guaiumi 172%-of-cap case is upstream BI Payroll data contamination** (hours from a prior position leaking via the employee-ID match per Alex's S20 confirmation), not a workbook bug. | TEMP Limits V column | Importer normalizes Position Identifier across transfers; strict `(position_id, fiscal_year)` filter on cap check |
| Tab 12 TEMP Limits + Tab 14 Separations + Tab 24 Staffing Plan all carry free-text Notes columns mixing structured states (`E2P`, `Pending merge`, `Confirmed`) with operational context. Same Position Number can have notes in 3 places with no cross-link. | TEMP Limits L/W/AK; Separations I; Staffing Plan Notes | Typed status enum + `userNotes` free-text per [memory `feedback_user_notes_per_position.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_user_notes_per_position.md); single Position Detail panel surfaces all notes |
| Tab 21 Reporting Tree's change-proposal cols (AI:AT) — Budget Job Code Change, Manager Position Number Change, etc. — are typed-into-the-cell, with no audit trail, no review workflow, and no automatic application. Today the workflow is "Alex fixes the source data manually in PS HCM later." | Reporting Tree AI:AT | KosPos Change Mode (per [ADR-003](../DECISIONS.md)) — every proposal becomes a typed `ProposedChange` entity with author / reviewer / status / target-field |
| Tab 1 Data lists only 2 of the 10+ upstream sources the workbook actually consumes (BI Payroll + P&P Data). Anyone reading it would conclude the workbook only ingests 2 sources. | Data sheet (rows 1, 3) | KosPos source manifest auto-generated from importer modules; rendered as the Admin → Sources page |

## Tab list — workbook order (`Labor Report 5.21.26.xlsx`)

The full enumeration. `≡` marks tabs collapsed into the same KosPos surface in the
rebuild. Tabs marked `IGNORE` are excluded from Phase 2 per Alex (cross-org planning
artifacts — not part of the current-year labor workflow).

| # | Tab | Walkthrough status | KosPos surface |
|---|---|---|---|
| 1 | Data | **done 2026-05-25** | Subsumed by built-in source manifest (Admin → Sources) |
| 2 | Departments | **done 2026-05-25** | Reference data (citywide dept tree) |
| 3 | Combo | **done 2026-05-25** | Reference data (combo codes) |
| 4 | BFM 15.10.006 FY26 | **done 2026-05-25** | Importer staging (BFM position eturn) |
| 5 | Calendar | **done 2026-05-24** | Internal reactive constants |
| 6 | P&P Data | **done 2026-05-25** | Importer staging (PS HCM P&P) + Position entity |
| 7 | BI Payroll | **done 2026-05-25** | Importer staging (OBI BI Payroll) + per-position drill-down |
| 8 | Roster Approvers | **done 2026-05-25** | Roster management feature |
| 9 | EE Additional Pay | **done 2026-05-25** | Acting-pay / supervisory-pay audit |
| 10 | Probation | **done 2026-05-25** | Probation tracker (user-input feature) |
| 11 | Eligibility Lists | **done 2026-05-25** | DHR scrape + eligibility lookup |
| 12 | TEMP Limits | **done 2026-05-25** | Temp-employee expiration tracker |
| 13 | Inactive | **done 2026-05-25** | Cross-system reconciliation (inactive positions) |
| 14 | Separations | **done 2026-05-25** | Pending-separations tracker (user-input) |
| 15 | Succession | **done 2026-05-25** | Succession planning (draft feature) |
| 16 | Premium | **done 2026-05-25** | Premium-pay YTD + projection view |
| 17 | Overtime | **done 2026-05-25** | Overtime YTD + projection view |
| 18 | Step | **done 2026-05-25** | Step-savings YTD + projection view (MCCP split to dedicated tab) |
| 19 | Retirement Payout | **done 2026-05-25** | RPO YTD + projection view |
| 20 | Report Data | **done 2026-05-25** | **Core dataset** — labor positions × budget × actuals × projection |
| 21 | Reporting Tree | **done 2026-05-25** | Org-chart preview + data-quality flags (lite Phase 7) |
| 22 | Pos by Dept | **done 2026-05-25** | Subsumed by Position list view |
| 23 | Vacancies and TEMP | **done 2026-05-25** | Vacancies + TEMP filter, feeds Staffing Plan |
| 24 | Staffing Plan | **done 2026-05-25** | **Staffing Plan workspace** — hiring plan |
| 25 | Budget Summary | **done 2026-05-25** | BY+1 cost rollup (low priority) |
| 26 | Operating Report Summary | **done 2026-05-25** | **Headline projection page** |
| 27 | Operating Report Detail | **done 2026-05-25** | Drill-down for projection variance review |
| – | New Department Org | **IGNORE** | Cross-org merger planning (out of scope) |
| – | New Department Org - Long Term | **IGNORE** | Cross-org merger planning (out of scope) |

## Build-status scorecard — refreshed Session 53 (2026-05-30)

> ⚠️ The **Walkthrough status** column in the table above means *documented during
> the Phase 2.0 walkthrough* (all marked "done 2026-05-25") — it does **not** mean
> built. This scorecard is the actual **build** status, verified against
> `app/src/lib/views/` + the live tab registry in `app/src/App.tsx` on 2026-05-30.
> The S53 audit found the older framing conflated "walkthrough done" with "shipped";
> refresh this whenever a new surface ships (cadence per [ADR-017](../DECISIONS.md)).
>
> **Legend:** *Live* = user-reachable tab · *Dev* = built but behind the dev-mode
> toggle (Phase 2.1 route guard) · *Partial* = surface exists but incomplete vs the
> workbook tab's full function · *Importer* = data ingested, no view yet · *Not
> built* = no KosPos surface.

| Status | Count | Workbook tabs |
|---|---|---|
| **Shipped · Live** | 4 | 5 Calendar · 10 Probation · 11 Eligibility · 22 Pos-by-Dept (Positions) |
| **Shipped · Dev-gated** | 4 | 7 BI Payroll (Payroll) · 13 Inactive · 14 Separations · 24 Staffing Plan (Hiring Plan) |
| **Partial** | 7 | 1 Data (source manifest only) · 9 EE Additional Pay (S55: source-data sub-tab under **Source Tables** + Position Detail panel + Positions-list indicator/filter shipped; the workbook tab's two cross-checks — acting dual-entry and supervisory owed-but-not-paid — are deferred pending Alex, see [Tab 9 § Open questions](labor-report-tabs.md#open-questions--todo-7)) · 16 Premium · 17 Overtime · 18 Step · 19 Retirement Payout — 16–19 are the **Special Class** view: reference/budget only, dev-gated, no YTD-actuals or projection · 20 Report Data (data layer + Positions; no dedicated reconciliation surface) |
| **Importer only** | 2 | 4 BFM eturn · 6 P&P Data — both feed the Position spine; no dedicated view |
| **Not built** | 10 | 2 Departments · 3 Combo · 8 Roster Approvers · 12 TEMP Limits · 15 Succession · 21 Reporting Tree · 23 Vacancies & TEMP · 25 Budget Summary · 26 OPS Summary · 27 OPS Detail |

**Headline:** **8 of 27 workbook tabs have a complete working surface** (4 live + 4 dev-gated). 7 more are partial — EE Additional Pay (9) shipped its source-data view + Positions integration in S55 (the two cross-check audits remain), the four special-class tabs (16–19) are **budget-only** (no actuals/projection), and Report Data (20) has no dedicated reconciliation surface. The four core **importers** (OBI BI Payroll, OBI P&P, BFM position eturn, BFM non-position) are working against real DBI data.

**Biggest fully-unbuilt gaps:** the **Operating Report Summary + Detail** projection pages (26 + 27 — the headline year-end surface) and the **unified COLA-aware projection engine** (`lib/projections`, sub-phase 2.2.32) — the lever that lifts tabs 16–19 from *Partial → Shipped* and unblocks 26/27. Near-term scope is DBI + CPC; citywide is the separate Phase 8+ arc (see [ADR-016](../DECISIONS.md) / [s50-citywide-scaling.md](../proposals/s50-citywide-scaling.md)).

## Per-tab detail

> **Moved to [`labor-report-tabs.md`](labor-report-tabs.md) in Session 54 (per [ADR-017](../DECISIONS.md) doc-trim).** The per-tab deep-dive for all 27 workbook tabs — data sources, structure, formulas, *What’s manual / fragile*, *KosPos improvements*, UI sketches, and open questions — was ~93% of this file. It now lives in **[`labor-report-tabs.md`](labor-report-tabs.md)**, with every heading anchor preserved, so existing links such as [`#tab-18--step`](labor-report-tabs.md#tab-18--step) still resolve (now under that file). This index keeps the how-to, cross-cutting concerns, tab list, build-status scorecard, data-sources inventory, Phase 2.2 sub-phases, and cross-references.

## Data sources inventory (built during walkthrough)

A flat list of every upstream file/query the labor report consumes. For each, capture
the v1 mechanism (manual upload? scrape?), the eventual v2 plan (Snowflake when
available), the Snowflake-availability status (where the SF data platform exposes
the source today), and the v1-readiness status (what's actually built in
`app/src/lib/` today). Finalized at Phase 2.0i close (Session 22) — 19 rows.

**v1 readiness legend** (re-derived at Phase 2.0i close from
`app/src/data/` + `app/src/lib/importers/`):

- ✅ **shipped** — visible in the production app today (calculator + pre-baked JSON).
- ⚙ **stub** — importer code lives in `app/src/lib/importers/`, vitest suite
  green (146 tests), but UI is hidden behind the Phase 2.1 dev-route gate.
- ❌ **not built** — no v1 code; lands as a Phase 2.2 sub-phase.
- **n/a** — KosPos is itself the system of record; no upstream importer needed.

**Snowflake column legend** (best knowledge as of 2026-05-25; tighten as the
SF data-platform onboarding catalogue advances):

- ✓ **available** — already exposed by SF data platform; query directly.
- ◐ **planned** — likely to land in SF; v2 plan can assume direct query.
- ✗ **not in SF** — PDF, web scrape, or local workbook source; will stay
  manual or scrape-driven in v2.
- **n/a** — no upstream (workbook-internal, KosPos-owned).

| Source | Used by tab(s) | v1 mechanism | v2 plan | KosPos importer path | Snowflake | v1 readiness |
|---|---|---|---|---|---|---|
| Controller's pay calendar (PPE dates) | Calendar | Manual rebuild of Calendar tab annually (~30 min) | Generated from published Controller calendar (JSON / scraped PDF) | `lib/calendar/` — one JSON per FY | ◐ | ✅ `app/src/data/calendar-fy2026.json` (single-FY pre-bake) |
| DHR MOU PDFs (one per bargaining unit; carry COLA schedule + step rules + premium-pay rates + work-period definitions) | Source-of-record for the per-BU MOU COLA schedule row below; also feeds future Premium / Step / per-BU work-rule modules | DHR PDF download per union; manual extraction of the relevant clauses | Indexed library of MOU PDFs keyed by `(bargaining_unit, effective_date)`; per-section parsers extract COLA / step / premium-pay tables into structured JSON | `lib/reference/dhr-mou/` — versioned by effective date; companion to `lib/cola/` (and future `lib/premium-rules/`, `lib/step-rules/`) | ✗ (PDF source) | ❌ |
| Per-BU MOU COLA schedule (derived from DHR MOU PDFs above) | Calendar (col E), implicitly Step, Report Data | Hardcoded single % in Calendar!E (DBI shortcut) | Per-bargaining-unit lookup derived from the DHR MOU PDF library | `lib/cola/` (or part of `lib/dhr/`); also referenced by [`budget-process.md`](budget-process.md) | ✗ (derived from PDF source) | ✅ `app/src/data/cola-fy2026.json` (DBI-only pre-bake; multi-BU pending) |
| OBI `BI Payroll` report (transactional, 39 cols, ~110k rows for DBI+CPC FYTD) | **BI Payroll** (raw stage), Calendar (`H2`), Premium / Overtime / Retirement Payout (pivots), Step + Report Data (per-PP SUMIFS), TEMP Limits (hours math), Inactive (cross-ref vs P&P), Budget Summary (`MAX(X)` for as-of PP), Operating Report Summary (rows 36–41) | Manual OBI re-run every payday Tuesday (every two weeks); **full FYTD re-pull** because prior-PP adjustments leak in retroactively | Snowflake direct query when SF data platform exposes it; preserve full-replace import model | `lib/importers/obi-payroll/` — header-driven fingerprint, full-replace per `(fiscal_year, as_of_date)` with snapshot history retained; rollup cube precomputed on import (see Tab 7 § KosPos improvements #3) | ◐ | ⚙ `app/src/lib/importers/obi-payroll.ts` (parsing stub; rollup cube + snapshot model not built) |
| OBI `P&P Data` report (position-and-personnel, 88 OBI cols, 604 rows for DBI+CPC at this snapshot) | **P&P Data** (raw stage), Report Data (XLOOKUP + pivot), Inactive (XLOOKUP), Staffing Plan (XLOOKUP), Step / Pos by Dept / Vacancies and TEMP / TEMP Limits / Reporting Tree / EE Additional Pay (pivots) | Manual OBI re-run; full snapshot replacing prior export; `Snapshot Date` recorded in col A of the data itself | Snowflake direct query when available; preserve full-replace + snapshot-history import model | `lib/importers/obi-pnp/` — header-driven fingerprint, full-replace per `(fiscal_year, snapshot_date)`, builds Position entities with three explicit dept fields (budgeted / effective / combo) and lazy hierarchy walk (see Tab 6 § KosPos improvements) | ◐ | ⚙ `app/src/lib/importers/ps-hcm-pp.ts` (parsing stub; Position entity + dept-tree join + userNotes field not built) |
| Citywide `Department Classification Structure` CSV (dept tree, 14,240 rows, 64 dept groups citywide) | P&P Data importer (fixes `CH Effective Employee Division` "Update Formula" placeholder); future modules that need any dept-tree-level rollup (Division / Section / Unit / Sub-Unit) | Manually downloaded from same OBI folder as the other chartfield trees; refreshed periodically as new dept codes are added | Snowflake direct query when available | `lib/reference/dept-tree/` — versioned by effective date; Position importer joins `Position Department ID` against the active tree to derive hierarchy attributes | ◐ | ❌ |
| Other chartfield trees in the same OBI folder (Account 16×6,723 / Account Budget Control 13×2,971 / Activity 9×81,905 / Agency Use 3×3,724 / Authority 9×14,307 / Department Budget Control 16×1,512 / Fund 16×1,951 / Project 13×43,012 / TRIO 3×3,677 / WBS 17×390,470) | _(future)_ — each becomes reference data when its consuming KosPos module surfaces. **Fund tree carries the `Annual/Continuing` flag** that powers the operating-fund-set derivation in [cross-cutting concerns](#multi-dept-generalization-caveats-dbi-shortcuts-to-undo). Full file inventory in [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md). | Manual download from OBI; refresh periodically | Snowflake direct query | `lib/reference/<tree-name>/` — same pattern as dept tree; documented per-module as walkthroughs land | ◐ | ❌ (Fund tree is the priority — drives operating-fund-set) |
| BFM 5-report bundle (`15.10.001` non-position eturn 1,016×49 / `15.10.006` position eturn 1,931×64 / `15.15.002` benefit rates 54+1,621 rows / `15.15.014` job-class rates + COLA 1,314+5 rows / `15.15.016` FTE cost 1,174×13 — being retired) | All consumed during budget formulation; `15.10.006` is the primary current-year input. Concrete inventory in [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md). | Manual download from BFM portal; weekly during budget season, rare otherwise | Snowflake direct query (when available) | `lib/importers/bfm-*/` — one per report ID | ◐ | ⚙ `app/src/lib/importers/bfm-non-position.ts` (15.10.001 stub); `bfm-position.ts` (15.10.006 stub) — 15.15.* not built |
| PS HCM exports (`MRG_COMBO_CD_DEPT` 14×3,697 / `MRG_HR_EE_ADDL_PAY` 18×~thousands / `MRG_TL_TASK_PROFILE_BY_TASKGRP` 20×~hundreds / `MTL0170` roster approvers 9×866) | Tabs 3 (Combo), 9 (EE Additional Pay), 8 (Roster Approvers); Task Profiles for Phase 3 chartfields. Concrete inventory in [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md). | Manual PS HCM Query Manager re-run; cadence varies | Snowflake direct query when available | `lib/importers/ps-hcm-*/` | ◐ | ❌ |
| DHR Hourly Rates of Pay (`Hourly-Rates-of-Pay-by-Classification-and-Step-FY{NN}-{NN+1}.xlsx`) 29×17,116 (Steps) + 20×124 (Ranges) | Reference data for class × step rate lookups; underpins Step / RTPOM / OVERM math. Documented in [`../data-sources/dhr.md`](../data-sources/dhr.md). | DHR website download; annual after MOU ratification | Snowflake (if exposed) | `lib/reference/dhr-steps/` + `lib/reference/dhr-ranges/` | ✗ (DHR website download) | ✅ `app/src/data/dhr-steps.json` + `app/src/data/dhr-ranges.json` (single-FY pre-bake; multi-FY versioning pending) |
| OBI Payroll Detail (older variant of BI Payroll; 38×42,949 in 11.8.23 sample) | Older schema (38 cols) preserved for backward-compat testing of the BI Payroll importer. Same source as today's BI Payroll; column count grew to 39 in current snapshot. | Manual OBI re-run | Snowflake direct query | Same path as BI Payroll (`lib/importers/obi-payroll/`) with header-driven schema detection | ◐ | ⚙ (covered by `obi-payroll.ts` header-driven schema detection) |
| BFM 15.10.006 FY26 eturn (per-position + per-special-class summary rows; ~30 cols incl. FY26 Original / Base / Department / Mayor / Committee / Technical Adjustment / Board layers) | **Report Data** (S Total Budget SUMIFS on column `AX FY 2025-26 Technical Adjustment` — stale, should be `AZ Board`; SPECIAL block hand-paste from per-class summary rows), **Operating Report Summary** (TEMPM E40 from `AZ1195+AZ1197+AZ1199+AZ1201`), **Overtime** tab (FY26 OT budget anchor `BN6 / BN8`), Premium / Step / others as BY-anchor source | Manual download from BFM; refresh annually (Board-adopted) + periodically when Technical Adjustments hit; per-position rows + summary rows in same file | Snowflake direct query when available | `lib/importers/bfm-eturn/` — header-driven fingerprint, full-replace per `(fiscal_year, snapshot_date)`; uses Board-adopted (`AZ`) as default budget anchor with Technical-Adjustment / Department / etc. preserved for variance views; documented in [`../data-sources/bfm.md`](../data-sources/bfm.md) and ADR-004 | ◐ | ⚙ `app/src/lib/importers/bfm-position.ts` (per-position rows stub; special-class summary block not split out) |
| `BVA` report (Budget vs Actuals, per PS Financials via OBI) — 68 cols × 2,710 rows for DBI+CPC FY26 sample; full schema in [`../data-sources/bva.md`](../data-sources/bva.md) | _(planned)_ **Report Data** chartfield-level reconciliation (BVA budget vs eturn = KK adjustments; BVA actuals vs BI Payroll = GL adjustments — see [Tab 20 § KosPos improvements #1–#2](labor-report-tabs.md#kospos-improvements-18)) | _(planned)_ Manual OBI re-pull each PP, **Wednesday-or-later after payday Tuesday** (see [§ Refresh-order timing](#refresh-order-timing--obi-1-day-lag--payroll-to-gl-gap--bva-wed-or-later)); full-replace per `(fiscal_year, snapshot_date)` | Snowflake direct query when available | `lib/importers/bva/` — header-driven fingerprint; chartfield-keyed; pre-computes reconciliation cube on import; snapshot date sourced from file mtime (filename version date is the report-definition version, NOT the data snapshot) | ◐ | ❌ |
| Inactive tab `Sum of Balance Amount` (computed inside the workbook from BI Payroll's pivot cache; not a separate upstream file) | Report Data INACTIVATED block (rows 755–760) — **hand-pasted** each PP refresh into U column | Workbook-internal pivot; copy-paste-as-values into Report Data | Live query in KosPos: `positions WHERE in_bi_payroll AND NOT in_pnp_snapshot` → drives Inactive view directly | `lib/views/inactive/` — pure query, no separate import; INACTIVATED block in Report Data goes away | n/a | ❌ (depends on `obi-payroll` + `obi-pnp`) |
| Staffing Plan (workbook-internal; will be its own importable surface in Phase 2) | Report Data HIRING (24 rows) + SEPARATING (4 rows) — direct cell refs into `'Staffing Plan'!{col}{n}` for B/D/F/G/H/K/L/M/N/O/W | Workbook tab; Alex edits directly | KosPos Staffing Plan workspace (Tab 24 surface) — first-class data store; Report Data view joins to it | `lib/staffing-plan/` — Phase 2.2 sub-phase enumeration target | n/a (KosPos = system of record) | ❌ |
| Probation tracker (workbook-internal Tab 10 — no PS HCM source for probation at DBI today) | Probation tab only | Hand-maintained spreadsheet (Alex's; PS HCM does not expose probation status for DBI's use case, so the workbook tab IS the source today) | KosPos = system of record (no upstream feed expected); surfaces inline on Position Detail. If PS HCM ever exposes probation, becomes a one-time backfill + ongoing reconciliation, not a continuous import. | `lib/views/probation/` — typed entity with status workflow + end-date auto-computation | n/a (KosPos = system of record; **no PS HCM source exists**) | ❌ |
| Pending-separations tracker (workbook-internal Tab 14) | Separations tab only | Hand-maintained (rumored / pending separations; not from a system) | KosPos = typed `PendingSeparation` entity, cross-linked to Staffing Plan § Separations rows | `lib/views/separations/` — typed entity with status workflow | n/a (KosPos = system of record) | ❌ |
| Succession draft (workbook-internal Tab 15) | Succession tab only | Hand-maintained draft | KosPos = `SuccessionPlan` per Position (priority TBD per Alex) | `lib/views/succession/` — typed entity | n/a (KosPos = system of record) | ❌ |
| DHR Eligibility Lists (workbook-internal Tab 11 hand-scrape) | Eligibility Lists tab; Vacancy Planning + Job Class Detail (planned) | Hand-compiled from <https://sfdhr.org/examination-results>; 40 DBI classes | Periodic scrape of `sfdhr.org/examination-results` keyed on job class; documented in [`../data-sources/dhr.md`](../data-sources/dhr.md) | `lib/reference/dhr-eligibility/` — versioned by scrape date | ✗ (DHR public web; not in SF) | ❌ |

**Sources rolled up by readiness (Phase 2.0i close):**

| v1 readiness | Count | Sources |
|---|---|---|
| ✅ shipped | 3 | Controller's pay calendar; Per-BU MOU COLA schedule (DBI-only); DHR Hourly Rates of Pay |
| ⚙ stub (covered by importer suite) | 5 | OBI BI Payroll; OBI P&P Data; OBI Payroll Detail (legacy schema, same path); BFM 5-report bundle (15.10.001 + 15.10.006 only); BFM 15.10.006 FY26 eturn (per-position rows) |
| ❌ not built | 11 | DHR MOU PDFs; Dept Classification Structure CSV; Other chartfield trees (Fund priority); PS HCM exports; BVA; Inactive Sum of Balance (derived); Staffing Plan; Probation tracker; Pending-separations; Succession draft; DHR Eligibility Lists |

**Snowflake exposure pattern:** the OBI-fed sources (BI Payroll, P&P Data,
chartfield trees, BFM, BVA, PS HCM) all land at ◐ — likely SF exposure
when the data-platform catalogue advances, currently manual OBI re-pulls.
The DHR-website sources (MOU PDFs, Hourly Rates, Eligibility Lists) sit
at ✗ — DHR doesn't push to SF, so v2 stays at scrape / PDF-parse.
Workbook-internal trackers (Probation / Separations / Succession /
Staffing Plan / Inactive) are n/a — KosPos becomes the system of record.

## Phase 2.2 sub-phases (dependency order)

_(Built incrementally during the walkthrough. Final enumeration at Phase
2.0i close — Session 22, 2026-05-25. Each sub-phase ships as one PR with
its own importer + view + tests; sub-phases depend on each other in the
order listed here. Sub-phase IDs `2.2.N` are stable referenceable handles.)_

The sub-phases divide into **five tiers** in dependency order:

1. **Tier 1 — Foundation primitives** (no upstream sub-phase deps).
2. **Tier 2 — Reference data** (depends on Tier 1).
3. **Tier 3 — Importers** (depends on Tier 1 + 2).
4. **Tier 4 — Per-tab views** (depends on Tier 3; the user-visible surfaces).
5. **Tier 5 — Reconciliation & cross-cutting projection** (sits on top of Tier 4).

**Total: 31 sub-phases** (Phase-1-shipped `lib/views/calculator/` excluded).
[Sub-phase status legend](#data-sources-inventory-built-during-walkthrough)
is the v1-readiness column from the Data Sources Inventory above:
✅ shipped · ⚙ stub built · ❌ not built.

### Tier 1 — Foundation primitives

- **`2.2.1` `lib/calendar/`** — pay-period calendar + COLA-aware
  projection primitives (per [memory
  `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md)).
  Pulls from Controller's published pay calendar JSON. **Status:** ✅
  pre-baked JSON (Phase 1); this sub-phase lifts it to a per-FY
  versioned reference module with effective-date lookup.
- **`2.2.2` `lib/quality/`** — Data Issues catalog primitive (44 flags
  enumerated below) + per-flag detection logic registry + per-position
  free-text `userNotes` field (per [memory `feedback_user_notes_per_position.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_user_notes_per_position.md)).
  Surfaces in every per-tab view. **Flag detectors land incrementally
  with each per-tab view sub-phase**, but the primitive (catalog
  registry, severity model, userNotes affordance) ships here.
  **Status:** ⚙ stub (`app/src/lib/quality/`).
- **`2.2.3` `lib/changes/`** — Change Mode primitive (per
  [ADR-003](../DECISIONS.md)). Every edit anywhere is a typed proposed
  change with author / reviewer / status / audit log.
  **Status:** ⚙ stub (`app/src/lib/changes/`).

### Tier 2 — Reference data

- **`2.2.4` `lib/reference/dept-tree/`** — citywide `Department
  Classification Structure` lookup, versioned by effective date.
  Eliminates the DBI-only `CH Effective Employee Division` "Update
  Formula" placeholder. **Status:** ❌. **Direct blocker on:** `2.2.10`
  `obi-pnp/`, `2.2.14` `views/positions/`, `2.2.18` `views/reporting-tree/`.
- **`2.2.5` `lib/reference/fund/`** — fund tree with the
  `Annual/Continuing` flag. Drives the operating-fund-set derivation
  (replaces hardcoded `Fund 10190 / 10000` DBI shortcuts).
  **Status:** ❌. **Direct blocker on:** every fund-filter consumer
  (4+ rows in cross-cutting concerns at once).
- **`2.2.6` `lib/reference/dhr-mou/`** — MOU PDF library keyed by
  `(bargaining_unit, effective_date)`. Per-section parsers extract
  COLA, step, premium-pay tables into structured JSON. **Status:** ❌.
  **Direct blocker on:** `2.2.7` `lib/cola/` (multi-BU), future
  premium-rule / step-rule modules.
- **`2.2.7` `lib/cola/`** — per-bargaining-unit COLA schedule.
  Replaces Calendar tab's DBI-only single-COLA shortcut. **Status:**
  ✅ pre-baked DBI-only JSON (Phase 1); this sub-phase expands to all
  BUs via `dhr-mou`.
- **`2.2.8` `lib/reference/dhr-steps/`** + **`lib/reference/dhr-ranges/`**
  — multi-FY versioning + scrape automation for the DHR Hourly Rates of
  Pay file. **Status:** ✅ single-FY pre-bake (Phase 1).
- **`2.2.9` `lib/reference/combo/`** — chartfield-string aliases
  (Tab 3 Combo). Full citywide combo dataset incl. Project + Activity;
  supports Combo Lookup page + autocomplete on Acting / Additional
  Pay forms. **Status:** ❌.
- **`2.2.10` `lib/reference/dhr-eligibility/`** — Tab 11 source;
  periodic scrape of `sfdhr.org/examination-results` keyed on job
  class; versioned by scrape date. **Status:** ❌.

### Tier 3 — Importers

- **`2.2.11` `lib/importers/obi-payroll/`** — Tab 7 BI Payroll.
  Foundation for every per-PP projection. Adds rollup cube + snapshot
  history model to the existing stub. **Status:** ⚙ stub
  (`app/src/lib/importers/obi-payroll.ts`). **Depends on:** `2.2.1`.
- **`2.2.12` `lib/importers/obi-pnp/`** — Tab 6 P&P Data. Builds
  Position entities with three explicit dept fields (budgeted /
  effective / combo) + lazy hierarchy walk + userNotes field.
  **Status:** ⚙ stub (`app/src/lib/importers/ps-hcm-pp.ts`). **Depends
  on:** `2.2.1`, `2.2.2`, `2.2.4`.
- **`2.2.13` `lib/importers/bfm-eturn/`** — Tab 4 BFM 15.10.006
  (per-position rows). Defaults to Board-adopted (`AZ`); preserves
  earlier-layer columns for variance views. **Status:** ⚙ stub
  (`app/src/lib/importers/bfm-position.ts`). **Depends on:** (loose)
  chartfield trees for KK reconciliation.
- **`2.2.14` `lib/importers/bfm-special-class/`** — Tab 4 BFM
  special-class summary rows (the 100-row block hand-pasted into
  Report Data S649–748). **Status:** ❌. **Depends on:** `2.2.13`.
- **`2.2.15` `lib/importers/bva/`** — BVA report (chartfield-grain
  reconciliation source). See
  [`../data-sources/bva.md`](../data-sources/bva.md). **Status:** ❌.
  **Depends on:** `2.2.5` (fund tree for chartfield resolution).

### Tier 4 — Per-tab views

(In rough dependency order — Position-spine views first, then
non-position-spine views.)

- **`2.2.16` `lib/views/positions/`** — Tab 6 P&P Data surface
  (Position Detail + list + Vacancy Planning). **The spine.** Every
  Tier-4 view in the rest of this tier joins through Position.
  **Depends on:** `2.2.2`, `2.2.3`, `2.2.4`, `2.2.12`.
- **`2.2.17` `lib/views/labor/`** — Tab 7 BI Payroll drill-down view.
  **Depends on:** `2.2.11`, `2.2.16`.
- **`2.2.18` `lib/views/reporting-tree/`** — Tab 21 Reporting Tree
  (org-chart preview + data-quality flags + change-proposal cols → KosPos
  Change Mode precursor). Feeds Phase 7 org chart. **Depends on:**
  `2.2.3`, `2.2.4`, `2.2.16`.
- **`2.2.19` `lib/views/temp-limits/`** — Tab 12 TEMP Limits (Cat
  16/17/18 expiry tracker). **Also models TX (Temporary Exchange)**
  as a typed entity per [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md)
  and [Tab 12 § KosPos improvement #2](labor-report-tabs.md#kospos-improvements-10).
  **Depends on:** `2.2.2`, `2.2.3`, `2.2.16`.
- **`2.2.20` `lib/views/inactive/`** — Tab 13 Inactive — pure query,
  no separate importer (per [DSI](#data-sources-inventory-built-during-walkthrough) row).
  **Depends on:** `2.2.11`, `2.2.12`.
- **`2.2.21` `lib/staffing-plan/`** — Tab 24 Staffing Plan workspace —
  the primary forward-looking surface. PlannedAction model with TX
  cases (per Marco Jacobo worked example), status workflow, cost
  calculator integration, multi-action-per-position pattern.
  Architecturally the most significant Tier-4 sub-phase. **Depends
  on:** `2.2.2`, `2.2.3`, `2.2.13`, `2.2.16`.
- **`2.2.22` `lib/views/vacancies/`** — Tab 23 Vacancies and TEMP
  (filtered position list with cross-check against Staffing Plan).
  **Depends on:** `2.2.16`, `2.2.21`.
- **`2.2.23` `lib/views/ops/`** — Tabs 26 + 27 Operating Report
  Summary + Detail — the headline projection page. **Depends on:**
  `2.2.11`, `2.2.13`, `2.2.16`.
- **`2.2.24` `lib/views/budget-summary/`** — Tab 25 Budget Summary —
  thin BY+1 cost ladder view consuming Staffing Plan totals + OPS
  Summary pivot. **Depends on:** `2.2.21`, `2.2.23`.
- **`2.2.25` `lib/views/probation/`** — Tab 10 Probation — typed
  entity with status workflow (Open → Approaching → Extended →
  Cleared / Failed / Resigned); end-date auto-computation; system of
  record going forward (no PS HCM source for DBI). **Depends on:**
  `2.2.2`, `2.2.16`.
- **`2.2.26` `lib/views/separations/`** — Tab 14 Separations — typed
  `PendingSeparation` entity (status: `rumored` / `confirmed` /
  `paperwork-filed` / `cleared`); cross-link to Staffing Plan
  Separations rows. **Depends on:** `2.2.16`, `2.2.21`.
- **`2.2.27` `lib/views/succession/`** — Tab 15 Succession —
  `SuccessionPlan` per Position; surfaces on Position Detail for
  leadership / strategic class set; review-cadence prompt. **(Priority
  TBD with Alex.)** **Depends on:** `2.2.16`.
- **`2.2.28` `lib/views/eligibility/`** — Tab 11 Eligibility Lists —
  DHR scrape + lookup. **Depends on:** `2.2.10`, `2.2.16`.
- **`2.2.29` `lib/views/roster-approvers/`** — Tab 8 Roster Approvers —
  typed `Roster` entity (replaces text-coerced PS HCM strings); 4
  roster Data Issues. **Depends on:** `2.2.16`, future PS HCM
  `MTL0170` importer.
- **`2.2.30` `lib/views/ee-additional-pay/`** — Tab 9 EE Additional
  Pay — acting / supervisory pay tracker. Importer runs the
  dual-entry check on every import + per-BU
  `SupervisoryDifferentialRule` table for the supervisory-owed
  computation. **Depends on:** `2.2.6` (DHR MOU PDFs for per-BU
  rules), `2.2.16`, future PS HCM `MRG_HR_EE_ADDL_PAY` importer.

### Tier 5 — Reconciliation & cross-cutting projection

- **`2.2.31` `lib/reconciliation/bva/`** — BVA-driven chartfield
  reconciliation (KK + GL). Consumes BVA + BI Payroll + BFM eturn.
  Lives in the Report Data surface. **Depends on:** `2.2.11`,
  `2.2.13`, `2.2.15`.
- **`2.2.32` `lib/projections/`** — COLA-aware projection engine.
  Unified entry point that every per-tab projection uses (PREMM /
  OVERM / RTPOM / STEPM / 9994 / TEMPM / regular labor) per
  [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md).
  **Depends on:** `2.2.1`, `2.2.7`, plus the per-tab projection
  math modules.
- **`2.2.33` `lib/snapshots/`** — snapshot history + diff primitive
  (powers Tab 27 OPS Detail's per-row Δ chips, Staffing Plan diff,
  Budget Summary trend). **Depends on:** every importer (`2.2.11–15`).

### Dependency graph (direct prerequisites only)

Read top-down — a sub-phase is unblocked when every prereq has shipped.
Transitive deps not shown; use the per-sub-phase lists above.

| Sub-phase | Direct prerequisites | Direct unblocks |
|---|---|---|
| `2.2.1` `calendar/` | — | `2.2.7`, `2.2.11`, `2.2.12`, `2.2.32` |
| `2.2.2` `quality/` | — | every Tier-4 view |
| `2.2.3` `changes/` | — | every edit-bearing Tier-4 view |
| `2.2.4` `reference/dept-tree/` | — | `2.2.12`, `2.2.16`, `2.2.18` |
| `2.2.5` `reference/fund/` | — | `2.2.15`, fund-filter consumers |
| `2.2.6` `reference/dhr-mou/` | — | `2.2.7`, `2.2.30` |
| `2.2.7` `cola/` (multi-BU) | `2.2.6` | `2.2.32` |
| `2.2.8` `reference/dhr-steps/` (multi-FY) | — | (calculator scope expansion) |
| `2.2.9` `reference/combo/` | — | chartfield-resolve, Combo Lookup page |
| `2.2.10` `reference/dhr-eligibility/` | — | `2.2.28` |
| `2.2.11` `importers/obi-payroll/` (full) | `2.2.1` | `2.2.17`, `2.2.20`, `2.2.23`, `2.2.31`, `2.2.33` |
| `2.2.12` `importers/obi-pnp/` (full) | `2.2.1`, `2.2.2`, `2.2.4` | `2.2.16`, `2.2.20`, `2.2.33` |
| `2.2.13` `importers/bfm-eturn/` (full) | (loose) `2.2.5` | `2.2.14`, `2.2.21`, `2.2.23`, `2.2.31`, `2.2.33` |
| `2.2.14` `importers/bfm-special-class/` | `2.2.13` | `2.2.23` (special-class block) |
| `2.2.15` `importers/bva/` | `2.2.5` | `2.2.31`, `2.2.33` |
| `2.2.16` `views/positions/` | `2.2.2`, `2.2.3`, `2.2.4`, `2.2.12` | every position-using Tier-4 view (`2.2.17`–`2.2.30` minus pure-query rows) |
| `2.2.17` `views/labor/` | `2.2.11`, `2.2.16` | — |
| `2.2.18` `views/reporting-tree/` | `2.2.3`, `2.2.4`, `2.2.16` | Phase 7 org chart |
| `2.2.19` `views/temp-limits/` | `2.2.2`, `2.2.3`, `2.2.16` | — |
| `2.2.20` `views/inactive/` | `2.2.11`, `2.2.12` | — |
| `2.2.21` `staffing-plan/` | `2.2.2`, `2.2.3`, `2.2.13`, `2.2.16` | `2.2.22`, `2.2.24`, `2.2.26` |
| `2.2.22` `views/vacancies/` | `2.2.16`, `2.2.21` | — |
| `2.2.23` `views/ops/` | `2.2.11`, `2.2.13`, `2.2.16` | `2.2.24`, `2.2.33` |
| `2.2.24` `views/budget-summary/` | `2.2.21`, `2.2.23` | — |
| `2.2.25` `views/probation/` | `2.2.2`, `2.2.16` | — |
| `2.2.26` `views/separations/` | `2.2.16`, `2.2.21` | — |
| `2.2.27` `views/succession/` | `2.2.16` | — |
| `2.2.28` `views/eligibility/` | `2.2.10`, `2.2.16` | (future eligibility×vacancy cross-check) |
| `2.2.29` `views/roster-approvers/` | `2.2.16`, future `ps-hcm/MTL0170` importer | — |
| `2.2.30` `views/ee-additional-pay/` | `2.2.6`, `2.2.16`, future `ps-hcm/MRG_HR_EE_ADDL_PAY` importer | — |
| `2.2.31` `reconciliation/bva/` | `2.2.11`, `2.2.13`, `2.2.15` | — |
| `2.2.32` `projections/` | `2.2.1`, `2.2.7` + per-tab math | — |
| `2.2.33` `snapshots/` | `2.2.11`–`2.2.15` | OPS Δ chips, Staffing Plan diff |

### Recommended Phase 2.2 first sub-phase (Phase 2.0i recommendation)

The first new sub-phase is the **foundation that unblocks the most
downstream work**. The cleanest choice is the **Position spine bundle**
— `2.2.4` `dept-tree/` + `2.2.12` `obi-pnp/` + `2.2.16` `views/positions/`
shipped together as one cohesive PR (Phase 2.2.a). Rationale:

- Position is the spine of every other view. Until `views/positions/`
  exists, no other Tier-4 sub-phase can show real data.
- `dept-tree` is tiny (CSV → typed reference module + effective-date
  version).
- `obi-pnp` stub already exists (`app/src/lib/importers/ps-hcm-pp.ts`);
  the work is wiring it to the dept-tree join + Position entity
  schema + userNotes field.
- A small Position list view at the end of this sub-phase yields the
  first user-visible production page since Phase 1.

**Trade-offs vs alternatives:**

| Option | Pros | Cons |
|---|---|---|
| **A. Position spine bundle** (`2.2.4` + `2.2.12` + `2.2.16`) — **recommended** | First user-visible page; unblocks the most downstream work; small individual pieces but cohesive end-to-end deliverable | Bundles 3 sub-phases into one PR (mild violation of "one change per branch" — but justified because they share an end-user surface and no individual piece is testable on its own) |
| **B. `2.2.11` `obi-payroll/` full** (rollup cube + snapshot history) | Unblocks `views/labor/`, `views/ops/`, `reconciliation/bva/`; no dependency on dept-tree | Less immediately user-visible than positions; needs `views/positions/` later anyway for any joined view |
| **C. `2.2.7` `cola/` multi-BU** | Removes a DBI shortcut; aligns with COLA-everywhere principle ([ADR-010](../DECISIONS.md)) | Requires `dhr-mou/` library upstream OR another hand-maintained per-BU JSON; doesn't unblock a user-visible view directly |
| **D. `2.2.2` `quality/` catalog primitive** | Cross-cutting infrastructure every view will consume | No flag detectors land until per-tab views exist; the primitive alone has no user-visible effect |
| **E. Strict one-PR-per-sub-phase** (ship `2.2.4` → `2.2.12` → `2.2.16` separately) | Clean PR-per-change hygiene; each piece testable in isolation | 3 PRs with no user-visible deliverable until the third; risk of intermediate-state stale code |

**My pick: A.** It's the smallest cohesive bundle that ends in a
user-visible production page. **Confirm with Alex before starting.**

### Out-of-Phase-2.2 sub-phases (where the rest land)

- **Phase 2.3** — Excel export (`labor-report-shaped .xlsx` for
  downstream consumers; per Restated Question #2 in [SESSION_HANDOFF.md](../SESSION_HANDOFF.md),
  the "Department Group" pivot label preservation question lives here).
- **Phase 2.4** — Importer wiring + ADR amendments (specifically:
  ADR-007 amendment for BVA-as-distinct-source per [Session 19 audit Area B](../audits/internal-claude-setup-audit.md#area-b--rules--canonical-docs)).
- **Phase 7** — Org chart (depends on `2.2.18` `views/reporting-tree/`).

### Data Issues catalog (`lib/quality/` scope)

The per-category flags enumerated across walkthroughs and the audit
suite:

| Category | Source | Severity |
|---|---|---|
| `reports-to-empty-non-commissioner` | [Scenario 1](../audits/labor-report-scenario-tests.md#scenario-1--reports-to-chain-integrity) | yellow |
| `reports-to-cycle` | Scenario 1 (none in snapshot) | red |
| `reports-to-dangling-ref` | Scenario 1 (none in snapshot) | red |
| `reports-to-excessive-depth` | Scenario 1 (none in snapshot) | yellow |
| `pool-position-detected` | [Scenario 1b](../audits/labor-report-scenario-tests.md#scenario-1b--pool-position-census-extending-task-b-test-5) | informational |
| `cat-17-18-expired` | [Scenario 3](../audits/labor-report-scenario-tests.md#scenario-3--cat-1718-expiry-warning-already-expired-emphasized) | red |
| `cat-17-18-expiring-soon` | Scenario 3 | yellow |
| `cat-17-expiration-date-unreliable` | Scenario 3 (revised Session 20) | informational |
| `cat-18-expiration-date-likely-wrong` | Scenario 3 (added Session 20) — `Expiration Date ≠ Appointment Date + 3 years` | yellow |
| `high-cat-18-usage` | Scenario 3 (added Session 20) — dept with many Cat 18s per Charter §10.104-18 limited-term-funding rule | informational |
| `cat-16-hours-cap-warning` | [Scenario 4](../audits/labor-report-scenario-tests.md#scenario-4--cat-16-hours-approaching-cap) (revised Session 20: **per Position Number, not per Employee ID**) | red (>100%) / yellow (80-100%) |
| `appt-cat-mismatch` | Scenario 4 (drift between P&P appointment type and BI Payroll-implied type) | yellow |
| `appt-cat-mismatch-pex-cat18` | [Scenario 6](../audits/labor-report-scenario-tests.md#scenario-6--pex-on-cat-18-enumeration) | yellow |
| ~~`vacant-no-rtf`~~ | **Dropped in [PR #68](https://github.com/alkprojects/kospos/pull/68)** — the workbook's RTF status fields are CON-sourced and not always populated for vacancies (CON data-pipeline limitation, not a missing departmental action). Position Detail now always renders an RTF section for vacant positions with either the populated RTF table or an explanatory hint. | — |
| `rtf-data-integrity-suspected` | New (Session 20) — vacant position has prior incumbent but no RTF on record | yellow |
| `sick-leave-bucket-size` | [Scenario 7](../audits/labor-report-scenario-tests.md#scenario-7--sick-leave-bucket-size) | informational |
| `negative-balance-amount` | [Scenario 8](../audits/labor-report-scenario-tests.md#scenario-8--negative-or-zero-balance-amount-rows) | informational |
| `earnings-code-undocumented` | [Scenario 9](../audits/labor-report-scenario-tests.md#scenario-9--earnings-code-orphans) | yellow |
| `earnings-code-zero-routing` | Scenario 9 | yellow |
| `premium-fringe-ratio-drift` | [Tab 16 § KosPos improvement #3](labor-report-tabs.md#kospos-improvements-14) | yellow |
| `staffing-plan-orphan` | Tab 24 § V Check column | yellow |
| `vacancy-unplanned` | Tab 23 § Coverage diagnostic | yellow |
| `position-multi-action` | Tab 24 § Cross-section position duplication | informational |
| `bva-kk-adjustment-detected` | BVA reconciliation (Task B) | informational |
| `bva-gl-adjustment-detected` | BVA reconciliation (Task B) | informational |
| `dbi-shortcut-active` | Catalog from cross-cutting concerns | informational (importer warning) |
| `roster-no-approver` | [Tab 8 § KosPos improvement #2](labor-report-tabs.md#kospos-improvements-6) — roster has zero active `ROLENAME=Approver` rows | red |
| `roster-approver-inactive` | Tab 8 — `EMPL_STATUS != A` for an approver row | yellow |
| `roster-orphan` | Tab 8 — roster code referenced by no current position | informational |
| `position-no-roster` | Tab 8 — position with blank `Roster Code` (employee can't submit time) | yellow |
| `additional-pay-orphan` | [Tab 9 § KosPos improvement #3](labor-report-tabs.md#kospos-improvements-7) — dual-entry missing on either side | yellow |
| `additional-pay-supervisory-owed` | Tab 9 — manager's `Rep To Pay Above > 0` with no SUPFLT entry | yellow |
| `additional-pay-acting-overlap` | Tab 9 — same position has multiple concurrent ACTFLT entries | red |
| `additional-pay-expired` | Tab 9 — `expected_end_date < TODAY()` but `Pay Status = A` | yellow |
| `probation-end-approaching` | Tab 10 — probation end date within 30 days | yellow |
| `probation-extension-required` | Tab 10 — probation ENDS today or past with no Completion | red |
| `class-no-active-list` | Tab 11 — vacant PCS position whose class has no active eligibility list (cannot hire PCS) | yellow |
| `temp-tx-expiration-imminent` | Tab 12 — Cat 17/18 TX expiration within 90 days | yellow |
| `temp-tx-expired` | Tab 12 — TX past expiration; CSC violation if employee still on position | red |
| `change-proposal-pending-review` | [Tab 21 § KosPos improvement #2](labor-report-tabs.md#kospos-improvements-19) — `ProposedChange` awaiting reviewer action > 7 days | informational |

Every Data Issue is paired with an inline `userNotes` affordance per
[`feedback_user_notes_per_position.md` memory](labor-report-tabs.md#tab-24--staffing-plan):
the data flag is the trigger, the human note is the context.

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

