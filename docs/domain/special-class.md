# Special Class

Special-class budget categories — sub-accounts within labor that aren't tied to a specific
position. KosPos must reproduce these to the dollar across all **three functions** (see
[`budget-process.md`](budget-process.md)):

1. **Budget development** — what to budget next year
2. **YTD budget vs actuals** — how the current year is tracking
3. **Year-end projection** — where actuals will land

Source workbooks (real files, gitignored, never committed):

- Budget development → `DBI FY27-28 Budget Master - Department Phase - 3.3.26.xlsx`,
  `Special Class` tab
- YTD + projection → `Labor Report 5.21.26.xlsx`, `Operating Report Summary` tab plus
  per-class detail tabs (`Premium`, `Overtime`, `Retirement Payout`, `Step`)

## Authoritative anchors

The special-class system isn't documented in a single public-facing memo. KosPos's existing
references all came out of DBI's workbooks and conversations with Alex. The downstream
authorities that bound this work:

- **Adopted AAO** — line items + administrative §10.4 (Salary & Benefits Reserve transfer
  authority). Source: [Final AAO FY26+FY27](https://media.api.sf.gov/documents/FY2026__FY2027_-_FINAL_AAO.pdf);
  authority confirmation via [Six-Month Report FY25-26](https://media.api.sf.gov/documents/Six-Month_Report_FY25-26_FINAL.pdf).
- **Adopted ASO** — authoritative count of positions / classes per department, the
  denominator for STEPM / 9994 / 9993 calculations. Source: [Final ASO FY26+FY27](https://www.sf.gov/documents/43115/FY2026__FY2027_-_FINAL_ASO.pdf).
- **Mayor's Budget Instructions** — operational rules per cycle. Likely host of the
  attrition / 9993 target framework, though the public PDF was unreadable during research.
  See [`../data-sources/mayor.md`](../data-sources/mayor.md).
- **MOUs (adopted under Charter §A8.409)** — premium pay codes & rates (PREMM), comp-time
  pay-out rules (RTPOM), wellness/vested-sick pay-out rules (RTPOM). Citations for the
  RPO walkthrough already in this file. See [`../data-sources/dhr.md`](../data-sources/dhr.md).
- **Charter §A8.440 + Admin Code §16.11–16.12** — vacation pay-out at separation (RTPOM
  base). Already cited in this file.
- **CSC Rule 121 — Layoff** ([July 2024](https://www.sf.gov/reports--july-2024--rule-121-layoff-civil-service-commission)) —
  bumping/holdover rules that bear on separation projections.

## The eight special classes

| Code | Name | Type | Account / source |
|---|---|---|---|
| **9993M_C** | Attrition Savings (Misc) | Credit | Computed remainder; not a single account |
| **9994M_C** | MCCP Offset (Misc) | Credit | Per-MCCP-position diff (Range A top vs actual) |
| **9995M_E** | Positions Not Detailed (Misc) | Expense | Lump sum, optional; some depts skip |
| **OVERM_E** | Overtime (Misc) | Expense | OBI BI Payroll earnings code "Overtime - Scheduled Misc" |
| **PREMM_E** | Premium Pay (Misc) | Expense | OBI BI Payroll earnings code "Premium Pay - Misc" and many specific codes (L08 Lead Worker, 289 Bilingual, etc.) |
| **RTPOM_E** | Retirement Payout (Misc) | Expense | Account `510210` "Ret Payout - SP & Vac - Misc"; earnings codes VPO (Vacation Pay Out), SVO (Severance Pay Out) |
| **STEPM_C** | Step Adjustments (Misc) | Credit | Per-position diff (top regular step vs actual step) |
| **TEMPM_E** | Temporary (Misc) | Expense | See [`definitions.md`](definitions.md) — multiple definitions |

## Budget formulation primer

- Position budgets are auto-built at **top regular step** for step classes and **top of
  Range A** for MCCP positions.
- Real employees usually aren't at the top. The difference is recorded as a credit in
  **STEPM** (steps) or **9994** (MCCP).
- Vacant time becomes **9993** (attrition) as a credit.
- Overtime, premium, retirement payouts, temp pay, and other misc go into their respective
  expense codes.

## Operating Report Summary — DBI section reference

Labor Report `Operating Report Summary` tab, rows 36–42 (one row per class). The key
formulas (with cell coordinates so future sessions can re-verify against the real workbook):

| Row | Class | YTD Operating Budget | YTD Operating Actuals | Total Budget | Projected Operating Actuals |
|---|---|---|---|---|---|
| 36 | PREMM | `=G36/Calendar!J2*Calendar!I2` | GETPIVOTDATA from `Premium` tab, fund 10190 | SUMIFS on `Report Data` rows 649–748 filtered by `"Premium Pay - Miscellaneous"` + `"DBI"` | `=Premium!P5+Premium!P6` |
| 37 | OVERM | (same pacing) | GETPIVOTDATA from `Overtime` tab, fund 10190 | SUMIFS filtered by `"Overtime - Miscellaneous"` | `=Overtime!BS15` |
| 38 | RTPOM | `=G38*Calendar!I2/Calendar!J2` | GETPIVOTDATA from `Retirement Payout` tab, Dept Group "DBI" | SUMIFS by `"Retirement Payout - Miscellaneous"` | `=IF(Calendar!$K$2=0, E38, MAX(G38, E38))` |
| 39 | STEPM | (same pacing) | `=SUM(Step!S:S) - SUMIFS(Step!S:S, Step!A:A, "Planning")` | SUMIFS by `"Step Adjustments, Miscellaneous"` | `=SUM(Step!T:T) - SUMIFS(Step!T:T, Step!A:A, "Planning")` |
| 40 | TEMPM | (same pacing) | `=SUMIFS('BI Payroll'!AL:AL, 'BI Payroll'!AE:AE, "COMMN:5380")` | `='BFM 15.10.006 FY26'!AZ1195+AZ1197+AZ1199+AZ1201` | (no formula — manual) |
| 41 | **9993** | (n/a) | `=GETPIVOTDATA(...DBI total) - SUM(F36:F40)` | SUMIFS by `"Attrition Savings - Misc"` + `"Temporary - Misc"` − G40 | `=GETPIVOTDATA(...projected DBI total) - SUM(I36:I40)` |
| 42 | (% attrition) | | | `=G41/(GETPIVOTDATA(total DBI) - G41)` | |

Key observation: **9993 is computed as the residual.** It's the difference between total
labor budget/actuals/projection and the sum of all per-position lines + other special
classes. This is *not* a formula on raw GL data — it's an inferred figure that absorbs
whatever doesn't post elsewhere.

The `Calendar` tab is the source of truth for time-pacing:

- `I2` = current cumulative PP% (e.g., 22.4 of 26.1)
- `J2` = total annual PPs (typically 26.1)
- `K2` = remaining PPs (`J2 - I2`)

## Per-class walkthroughs

Walked through with Alex in session order. Each section follows the same template:
**Budget development / Current-year YTD / Year-end projection / Chartfield-string allocation / Notes**.

---

### RTPOM_E — Retirement Payout (account 510210) ✓ Walked through 2026-05-23

**Type:** Expense • **Account:** 510210 "Ret Payout - SP & Vac - Misc" •
**Earnings codes:** VPO (Vacation Pay Out), SVO (Severance Pay Out), and any other payout
codes that post to 510210.

#### Budget development

Multi-year historical lookup → average → user-chosen amount → allocate by labor share.

Budget Master `Special Class` tab cell map:

| Cell | Meaning |
|---|---|
| `F5:F12` | 8 years of historical actuals for account 510210 (Budget Periods 2018–2025) |
| `F14` | `=AVERAGE(F5:F12)` — historical mean (in DBI's case, ~$200,467) |
| `F15` | **"Chosen Amount"** — user-entered (Alex picked $300,000 for FY27, justified as "many retirements expected in IS") |
| `I5:I23` | Per-dept regular-labor totals (pivot of `Sum of FY 2026-27 Department` over salary accounts) |
| `I24` | Total regular labor across all DBI depts |
| `K5` | `=ROUND(I5/$I$24 * $F$15, 0)` — each dept's share of chosen amount, by labor share |

The 8-year window isn't a hard rule — Alex picks an "approximate average, lean a bit higher
to be safe, adjusted for rumored retirements." Past actuals don't change once posted, so the
historical numbers only need to be refreshed when the data window rolls forward (annually).

#### Chartfield-string allocation

Spread evenly across chartfield strings by **regular-labor share** of each chartfield string
within its department. DBI's fund-level appropriation control makes this legal — see
[`budget-process.md`](budget-process.md) on appropriation levels.

The actual allocation per chartfield string isn't formula-driven in the Budget Master
spreadsheet at the visible cells; it's done in the pivot that feeds I5:I23 and the
chartfield-level breakdown lives further down the workbook (not yet fully traced).

#### Current-year YTD vs actuals

YTD actuals come from `Labor Report` → `Retirement Payout` tab, which is a pivot of
BI Payroll filtered by RPO earnings codes per employee × pay period. The dept-group rollup
appears at the bottom of that tab.

Operating Report Summary `E38` pulls:
```
=GETPIVOTDATA("Balance Amount", 'Retirement Payout'!$A$3, "Department Group Code", "DBI")
```

YTD budget pace is straight-line by PP elapsed:
```
D38 = G38 * Calendar!I2 / Calendar!J2
```

#### Year-end projection

```
H38 = IF(Calendar!$K$2 = 0, E38, MAX(G38, E38))
```

In words: if no PPs remain, projection = YTD actual (year is over).
Otherwise, projection = max(total budget, YTD actual).

This is **conservative**: never projects under budget, even if the spend rate is below
budget. RPO is lumpy (driven by individual retirements) so straight-line annualization would
over-react to a quiet first half. The MAX-of-budget-vs-actual approach assumes "you'll spend
at least what was budgeted" — protects against under-projecting an overrun.

#### Notes / improvement ideas (Alex's invitation)

- Surface a 3-year and 8-year trailing comparison (mean, median, min/max) so the user picks
  the chosen amount with context, not from raw judgment.
- If positions can be tagged `likelyToRetire = {yes, no, unknown}`, compute an itemized
  projection: "if all 'likely' retire by year-end, expected RPO = $X." Use as a sanity
  bound on the lump-sum estimate.
- Projection floor at budget is fine for the report, but a separate "best-estimate
  projection" (straight-line, or itemized retiree list) would inform internal planning even
  when the formal report shows the conservative number.

#### Per-employee payout math — eligibility rules

To compute itemized payouts (the Phase 4 PR #5 scenario builder), we need to know which
leave balances are cashable at separation. Researched 2026-05-23 against SF DHR, SF
Controller's Payroll Manual, Charter, Admin Code, and the SEIU 1021 + MEA MOUs.

| Category | Pays out at separation? | Notes |
|---|---|---|
| **Vacation** | **YES — citywide** | Pro-rata current-year accrual + accumulated balance. SEIU 1021 caps at 400 hrs; MEA cap differs. Anchored in Charter A8.440 + Admin Code §16.11. |
| **Vested Sick / Wellness Pay** | **YES for eligible employees, MOU-specific** | A *separately accrued* balance earned by maintaining low sick-leave use; requires minimum SFERS service or disability letter. Distinct from regular sick leave. The "SP" in account 510210's name ("Ret Payout - SP & Vac - Misc") almost certainly refers to **Sick Pay** = this vested-sick balance. **TODO: confirm with Controller's Payroll Division.** |
| **Comp time (non-Z/L)** | **MOU-dependent** | SEIU 1021 ¶431: paid in cash at termination. MEA: NOT cashed out. Confirm per MOU before computing. |
| **Comp time (Z-designated)** | NO | "Z" employees don't accrue cashable overtime — comp time off only. |
| **Regular sick leave** | **NO** | SEIU 1021 ¶771: "Sick leave shall automatically terminate on the effective date of an employee's retirement." Confirmed in MEA Separation doc. |
| **Floating holidays** | NO | Not listed as payable in any MOU reviewed. Carry forward capped at one year's accrual. |
| **Management / Executive leave** | NO | MEA Separation doc explicit: "admin./exec. leave … cannot be cashed out." 100 hrs/yr (M unit) or 5 days/yr (EM unit) use-it-or-lose-it. |

**Variance pattern:** vacation and regular sick are citywide-uniform (anchored in Charter
/ Admin Code). Variance concentrates in **comp time** and **vested sick / wellness**, both
of which the Citywide Payroll Manual §9.3.2 punts to per-MOU rules: *"Only eligible leave
balances based on employee's MOU will be paid out."* The per-employee calculator must
therefore look up MOU → comp-time-payout flag and MOU → wellness-pay formula.

**Open questions to resolve before PR #5 ships:**

1. **Vacation cap per MOU.** SEIU 1021 = 400 hrs confirmed. Need MEA, IFPTE Local 21,
   Local 261, Local 856, Local 798/Fire, POA caps.
2. **Comp time pay rate.** Does SF use FLSA's "greater of current rate or 3-year average,"
   or default to current rate? MOU language says only "paid in cash." Confirm with
   Controller's Payroll Division.
3. **Vested sick / wellness formula.** Eligibility documented (min SFERS service) but exact
   accrual + payout formula is MOU-specific. Pull at least one MOU's formula to model.
4. **Account 510210 composition.** Confirm with Budget/Controller whether **comp time**
   payouts post to 510210 or to a separate overtime/separation account. The "SP" hypothesis
   (Sick Pay = vested sick / wellness) needs confirmation too.
5. **Public safety MOUs** (SFFD, POA) not researched. The citywide lump-sum form has a
   distinct "Fire T&E" line, suggesting fire has unique terminal-pay categories.

**Sources** (all sfgov / sfdhr / mySFERS / amlegal — authoritative only):

- [MEA / Unrepresented Compensation & Benefits Upon Separation / Rehire (SFDHR, 10/30/2024)](https://media.api.sf.gov/documents/MEA-Unrepresented-Employee-Compensation-and-Benefits-Upon-Separation-Rehire_WiwjhNc.pdf)
- [SEIU 1021 Miscellaneous MOU 2022–2024](https://sfdhr.org/sites/default/files/documents/MOUs/SEIU-1021-MIscellaneous-2022-2024.pdf) — articles ¶428–435, ¶437, ¶565–569, ¶771
- [SF Controller Payroll Policies & Procedures Manual (April 2018)](https://sfcontroller.org/sites/default/files/Documents/payroll/PPPMApril2018Edition.pdf) — §3.6.3, §9.3, §9.3.1, §9.3.2
- [SFDHR — MEA Miscellaneous Benefit Summary](https://sfdhr.org/mea-miscellaneous-benefit-summary)
- [SFERS — Leaving City Service](https://mysfers.org/leaving-city-service/)
- [SF Admin Code §16.11 — Calculation of Vacations](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_admin/0-0-0-10179)
- [SF Charter §A8.440 — Annual Vacations of Employees](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-2193)
- [IFPTE Local 21 MOU 2024–2027](https://www.sf.gov/sites/default/files/2024-06/IFPTE-Local-21-2024-2027.pdf) (identified for follow-up; not yet extracted)

**Two corrections to the original domain hypothesis:**

- **Comp time is NOT universally excluded** — it's MOU-dependent. SEIU 1021 (a large unit
  at DBI) pays it out; MEA does not.
- **"Sick time" is more nuanced** — regular sick balance does not pay out, but **vested
  sick / wellness pay** (a separate balance) DOES for eligible employees. This is almost
  certainly the "SP" portion of account 510210.

---

### OVERM_E — Overtime (Misc) — workbook extracted 2026-05-24 (autonomous overnight)

**Type:** Expense • **Earnings code:** "Overtime - Scheduled Misc" •
**Source workbooks:** `DBI FY27-28 Budget Master` `Special Class` tab cols AR:BD;
`Labor Report 5.21.26` `Overtime` tab cols BN:BT and `Operating Report Summary` row 37.

#### Budget development

Per-department reference table at `Special Class!AR4:BD12`. Headers live in **row 4** only
(row 3 is blank).

| Col | Header (row 4) |
|---|---|
| AR | Account Description |
| AS | Department Description |
| AT | Sum of Balance Amount (prior-year actuals) |
| AU | FY25 with MFB (= AT × 1.0765) |
| AV | FY26 YTD |
| AW | FY26 Projected (= AV ÷ 15.4 × 26.1) |
| AX | FY27 Budget |
| AZ | Dept ID Title |
| BA | Sum of FY 2026-27 Department |
| BB | Sum of FY 2027-28 Department |
| BC | FY27 Change (= ROUND(XLOOKUP(AZ, AS, AX) − BA, 0)) |
| BD | FY28 Change (= ROUND(XLOOKUP(AZ, AS, AX) − BB, 0)) |

Per-row formulas (rows 5–12, one per dept × account combo):

```excel
AU = AT*1.0765                     # FY-prior salary actuals grossed up by 7.65% mandatory fringe (Social Security 6.20% + Medicare 1.45%)
AW = AV/15.4*26.1                  # FY26 projection: annualize YTD using the snapshot's elapsed-PP count
BC = ROUND(XLOOKUP(AZ, AS:AS, AX:AX) - BA, 0)
BD = ROUND(XLOOKUP(AZ, AS:AS, AX:AX) - BB, 0)
```

**Verbatim example values (row 5, `DBI ADM Records Management`):**

```
AR5: 'Overtime - Scheduled Misc'   (literal label)
AT5: 1592.62                       (FY-prior actual, literal)
AU5: =AT5*1.0765                   → 1714.46
AV5: (empty)                       ← no FY26 YTD activity for this row
AW5: (empty)                       ← therefore no projection
AX5: 2000                          (FY27 Budget — literal, hand-picked)
BA5: 2000  BB5: 2000               (FY26-27 / FY27-28 dept choices — literal)
BC5: 0     BD5: 0                  (no delta vs the AX reference)
```

**Critical observations from the extraction:**

1. **`AX` "FY27 Budget" is hand-entered, not formula-driven.** No formula links `AX` back to
   `AU` (grossed-up prior-year) or any other reference. This confirms Alex's verbal
   description: the cushion is a judgment call per row, not a percentage applied to history.
2. **The 7.65% fringe is hardcoded** in every `AU` formula. The `15.15.002 Benefit Rates`
   workbook does **not** carry an FY26 rate — only FY27 and FY28 (and even there, the 6.20%
   OASDI + 1.45% Medicare components must be summed manually; there is no consolidated "OT
   fringe" cell). The 7.65% derivation is mechanical (Social Security wage tax + Medicare
   tax — both unchanged in FY27/FY28; only the OASDI wage cap shifts from \$189,337 to
   \$199,265). For KosPos, treat 1.0765 as a derived constant in code with a comment
   citing OASDI+Medicare, not a lookup.
3. **Calendar pay-period constants leak into formulas.** `AW` uses literal `15.4` and
   `26.1` (PPs elapsed / PPs in year at the Budget Master's March 3 timestamp). These will
   drift workbook-to-workbook. KosPos should compute these from the Calendar tab (the same
   `I2 / J2` cells used everywhere else), not hardcode.

#### Current-year YTD (Operating Report Summary row 37)

Row label `Overtime` lives in **column C** (not A/B as RPO did).

```excel
C37: 'Overtime'
D37: =G37/Calendar!J2*Calendar!I2                                                  → 326,130.27   (YTD budget pace)
E37: =GETPIVOTDATA("Sum of Balance Amount", Overtime!$A$3, "Fund Code", 10190)    → 438,786.15   (YTD actual, fund 10190)
F37: =D37-E37                                                                      → -112,655.88  (YTD over budget)
G37: =SUMIFS('Report Data'!$S$649:$S$748,
            'Report Data'!$H$649:$H$748, "Overtime - Miscellaneous",
            'Report Data'!$K$649:$K$748, "DBI")                                    → 380,000      (FY26 total budget)
H37: =Overtime!BS15                                                                → 555,485.23   (FY26 projected)
I37: =G37-H37                                                                      → -175,485.23  (projected over budget)
```

YTD actuals are sourced via `GETPIVOTDATA` against the `Overtime` tab's pivot. The pivot
holds **OT salary actuals only** (no benefits — there is no dedicated OT benefit account
in BFM; OT benefit dollars get lumped into the general benefit accounts). Filtering to
Fund Code `10190` in the workbook is a DBI shortcut — KosPos should sum across **all
funds**, since other departments and DBI itself may eventually post OT outside the
operating fund (Building Permits special revenue, capital projects, grants). See
[`budget-process.md`](budget-process.md) for the annual-vs-continuing fund distinction.

#### Year-end projection

Per-dept rows on the `Overtime` tab (BN5:BT15). Row 5 headers:

| Col | Header |
|---|---|
| BN | Sum of FY 2025-26 Board |
| BP | Fund Code |
| BQ | Department Description |
| BR | Sum of Balance Amount (YTD actual per dept slice) |
| BS | Projected |

Two constants drive the projection formula and both are **literal values, not formulas**.
Both come from the FY26 BFM budget snapshot (sourced via a position eturn pivot in the
workbook; BFM is the system of record):

```
BN6: 349,749     ← FY26 budgeted OT salary ("FY25-26 Board" label refers to the Board-adopted budget pivot)
BN8: 380,000     ← FY26 budgeted OT total cost (salary + benefits) — matches G37 (DBI total OT budget)
```

Both numbers refresh **once per fiscal year** when BFM publishes — administered by the
super admin (see `budget-process.md` for the broader once-per-year data set).

Per-dept projection formula:

```excel
BS6 = BR6 * $BN$8 / Calendar!$I$2 * Calendar!$J$2 / $BN$6
```

Decoded into plain English: `YTD_OT_salary_actual_for_dept * (annual_PPs / YTD_PPs) * (budgeted_total / budgeted_salary)` — i.e., **annualize the YTD salary actuals, then gross
up salary→(salary+benefits) using the budget-implied ratio**.

Why the gross-up: `BR6` only captures OT salary (the payroll pivot has a dedicated OT
salary account but no OT benefit account; benefits live in pooled accounts that aren't
sliced by earnings type). To project the *true total* OT cost, the formula assumes the
actual salary-to-benefit ratio mirrors the budgeted salary-to-benefit ratio. The factor
`$BN$8 / $BN$6 = 380,000 / 349,749 ≈ 1.086` *is* that gross-up — not a "scale factor" in
the inflationary sense. (PR #23 originally decoded this as a scale factor; this section
corrects that reading.)

**Future improvement (TODO):** derive OT benefits directly from Time & Labor reports
(TRC code grouping) instead of inferring via the budgeted ratio. T&L data is not always
clean, so today's ratio approach is the conservative choice. Re-evaluate once a T&L
importer exists.

Rollup:

```excel
BS15 = SUM(BS6:BS14)         → 555,485.23   (referenced by Operating Report H37)
```

Note: in the actual `Overtime` tab the dept slices are coarse — at the workbook snapshot,
row 6 = `DBI ADM Finance` with only **\$40.24 YTD**, projecting to \$50.94. The bulk of
the projected \$555k comes from rows 7-14 (not extracted in detail; if a future session
needs them, repeat Agent B's extraction on `Overtime` rows 7-14).

#### Chartfield-string allocation

Different departments budget OT very differently — some put all OT under one
high-level chartfield (e.g., a division-level string); some break it out per
department; many produce messy strings that don't reflect actual OT spend patterns.
**Best practice is to allocate by department**, but the chartfield string for each
dept's OT is rarely fully derivable from existing labor data: the department code is
easy, but project / activity / authority may not be unique per dept, and a single
dept may have positions budgeted across multiple funds, projects, activities, and
authorities.

KosPos's OVERM UI should therefore offer two allocation modes:

1. **Use existing chartfields** — auto-populate from chartfield strings that already
   carry OT budget in the current labor report. Works for DBI (which has a dedicated
   OT chartfield string in the "correct" place); may be lossy for other departments
   with messier setups.
2. **Manually enter** — the user adds rows via a `+ Add row` control; each row
   captures fund / dept / project / activity / authority / account + dollar amount.
   This is the escape hatch for departments where the existing chartfield placement
   is wrong or insufficient.

In both modes the allocated amounts must sum to the dept-level OVERM budget
(validation surfaced inline). Authoritative pattern lives in
[`SpecialClassView.tsx`](../../app/src/modules/special-class/SpecialClassView.tsx).

#### TODO resolution status (from the original 7-question list)

| # | Question | Status |
|---|---|---|
| 1 | Cushion magnitude / per-dept variability | **Resolved (Session 11)** — default = `max(grossed-up prior, current projection)` rounded up to the nearest \$1,000; user can override per row |
| 2 | Fringe rate FY27/FY28 | **Resolved by workbook** — same 7.65% (OASDI 6.20% + Medicare 1.45%); both unchanged. Hardcode as derived constant, do not "look up" |
| 3 | Chartfield allocation method | **Resolved (Session 11)** — two modes: use existing chartfields, or manually enter rows. See § Chartfield-string allocation above |
| 4 | YTD source coverage | **Resolved (Session 11)** — pivot holds OT salary actuals only (no benefits). Workbook's 10190 fund filter is a DBI shortcut; KosPos sums across all funds |
| 5 | Projection formula meaning | **Resolved (Session 11)** — `BN8/BN6` is a salary→total gross-up using the BFM-budgeted ratio. Annualize YTD salary, then gross up to salary+benefits |
| 6 | Fire exception | **N/A for DBI** — Fire's non-standard schedule breaks PP assumptions; out of scope until KosPos extends to Fire |
| 7 | Any gotcha | Hardcoded 15.4/26.1 PP constants in workbook `AW` formula are a shortcut — KosPos always pulls live PPs from the Calendar tab (each FY is 26 / 26.1 / 26.2 PPs depending on calendar). See [`definitions.md`](definitions.md) |

---

### PREMM_E — Premium Pay (Misc) — pending walkthrough

**Type:** Expense • **Earnings codes:** "Premium Pay - Misc" and many specific codes (e.g.,
L08 Lead Worker $5, 289 Bilingual $60).

**Budget development:** Per-(job class, earnings code) historical rate, multiplied by next-FY
salary budget per job class.

**Budget Master cells:**
- `U5:Z5` — reference table: per (job class, earnings code) compute
  `Y5 = X5 / SUMIFS('FY25 BI Payroll'!AL:AL, 'FY25 BI Payroll'!AE:AE, V5)` — premium $ as
  pct of total salary for that job class.
- `Z5 = RIGHT(V5,4) & "_C"` — class key derived from job code (?).
- `AB5:AH5` — per-(dept, job class) "should be":
  `AG5 = XLOOKUP(AC5, Z:Z, Y:Y, 0) * AE5` — pct × next-FY salary budget for that job class.
- `AJ5:AN5` — dept-level change tracking.

**Current-year YTD:** `Labor Report` → `Premium` tab pivot from BI Payroll. Operating Report
`E36 = GETPIVOTDATA("Balance Amount", Premium!$A$3, "Fund Code", 10190)`.

**Year-end projection:** `Premium!P5 = GETPIVOTDATA(...) * (N5/N7) / Calendar!I2 *
Calendar!J2`. Straight-line annualized. `Premium!P6 = N6/N5 * P5` extends salary projection
to a fringe projection. Operating Report `H36 = Premium!P5 + Premium!P6`.

**Walkthrough TODO:** confirm `N5/N7` ratio, `N6/N5` ratio meaning. Confirm Alex's
"detect-headcount-change" improvement idea is wanted.

---

### TEMPM_E — Temporary (Misc) — pending walkthrough

See [`definitions.md`](definitions.md) for the four definitions of "temp." Budget side uses
job class TEMPM; CON-actuals side uses accounts 505010/020/040/050/060/070 (salaries only).

**Budget Master cells:** Not yet identified — likely a lump sum from BFM totals or a manual
entry per dept.

**Current-year YTD:** Operating Report `E40 = SUMIFS('BI Payroll'!AL:AL,
'BI Payroll'!AE:AE, "COMMN:5380")` — only counts one job code (5380, the TEMPM placeholder).
**This is a DBI shortcut, not a general rule.** At DBI the only pre-planned temp use was
5380 summer student interns; all other DBI temps were funded by vacant permanent budgeted
positions (so their pay shows up under the position's regular labor, not in TEMPM). Other
departments hire temps in different patterns — temporary provisionals while waiting for a
PCS eligibility list, etc. — and the COMMN:5380 filter would under-count their TEMPM
actuals.

**Total budget:** `G40 = 'BFM 15.10.006 FY26'!AZ1195 + AZ1197 + AZ1199 + AZ1201` — four
hardcoded BFM rows. Brittle.

**Open design question (cross-department):** how to report and project temp actuals
generally. Options to consider:

- **Definition A** — sum of payroll for any employee with appointment type ∈ {16, 17, c2}
  (catches them wherever they sit, including on permanent positions).
- **Definition B** — sum of payroll posting to accounts 505010/020/040/050/060/070
  (matches Controller's view; misses benefits).
- **Definition C** — sum of payroll for positions whose Budget Job Code = TEMPM (current
  DBI shortcut; misses temps on permanent positions).

Probably show all three side by side, default to A (most inclusive), and let the user pick
the report-facing definition per audience (Controller wants B; internal management wants A).
Benefits applicable to temp are partial — wire to `15.15.002` lookup, same pattern as OVERM.

**Walkthrough TODO:** decide cross-dept definition, confirm projection method, confirm 5380
specifically vs broader TEMPM.

---

### 9995M_E — Positions Not Detailed — pending walkthrough

Lump sum, optional per department. Some depts use it as a parking spot for budget that
doesn't tie to any position; some leave it at zero.

**Walkthrough TODO:** formula source, projection method, allocation.

---

### 9994M_C — MCCP Offset (Misc) — pending walkthrough

Same structural shape as STEPM but for MCCP positions. Budget is built at top of Range A;
actual employees are usually mid-range; the difference is the MCCP offset credit.

Alex flagged this as the area in STEPM math that needs improvement — currently STEPM tries
to handle MCCP but doesn't fully; should be split out into a clean 9994 calculation.

**Walkthrough TODO:** identify which positions are MCCP (Range A/B/C vs step), compute the
diff, allocate by chartfield string.

---

### STEPM_C — Step Adjustments (Misc) — pending walkthrough

**Per-position calculation.** Budget built at top regular step; employee actual at current
step + planned merit; STEPM = budget − projected actual (credit).

**Budget Master cells (the heart of step math, `BH5:BV5`):**

| Cell | Computes |
|---|---|
| `BH5` | BY HCM Position # |
| `BJ5` | Employee Job Class (lookup into `Active Labor`) |
| `BK5` | Class Max Regular Step (lookup into `DHR - Steps`) |
| `BL5` | Employee current step (blank if at top regular) |
| `BM5` | Employee Merit Increase Date |
| `BN5` | BY Starting Step — accounts for merit date relative to FY start |
| `BO5` | BY % of year at original step (handles merit during the year) |
| `BP5` | BY+1 Start Step |
| `BR5` | BY Position Salary Budget at top step (lookup into `Cost per FTE`) |
| `BS5` | BY Difference — the step savings for this position |
| `BT5`/`BU5` | Same for BY+1 |

Aggregation: `CB:CC:CD` — per-dept sum of BY/BY+1 differences. `CF5:CJ5` change tracking.

**Current-year YTD/projection (`Labor Report` → `Step` tab):**
- `S` = YTD STEP actual per position = `SUM(BY:CY)` of per-PP step variance
- `T` = projected STEP actual per position
- Per-PP step variance (`BY2`) = `IF(U2=0, 0, U2 − (expected_PP_share_of_top_step_budget))
  × should-include-flag / scaling_factor`

Operating Report `E39 = SUM(Step!S:S) - SUMIFS(Step!S:S, Step!A:A, "Planning")` — excludes
"Planning" rows. `H39` does the same for column T.

**Alex's flags (per his walkthrough):**
- Non-MCCP step math is correct as-is.
- MCCP handling needs improvement — move to 9994 calc.
- For budget dev, only estimates step savings for **existing** staff (not new hires) —
  under-estimates savings, which is preferable to over-estimating (under-budgeting).
- Benefits delta from dependents etc. is ignored as small noise.

**Walkthrough TODO:** confirm merit-date math edge cases (employees at top step, employees
in extended step ranges that don't auto-advance).

---

### 9993M_C — Attrition Savings — pending walkthrough

**Computed as the residual** at report time: total budget vs sum of (per-position lines +
other special classes + other accounts).

**Budget development (Alex's verbal description):** Use prior-year amount, adjust based on
year-end labor report budget-vs-actual variance. Complicated by intentional vacancies (some
positions are held vacant for known reasons, which skews any "natural" attrition rate).

**Budget Master cells:**
- `CN5:CZ5` — attrition pivot section
- `CQ5 = CO5/$CO$24` — each dept's share of total regular labor
- `CW5 = ROUND(XLOOKUP(CT5, CN:CN, CQ:CQ) * $CU$23, 0)` — dept's even-spread attrition
- `CW24 = -CW23/(GETPIVOTDATA(...total) - CW23)` — attrition as % of non-attrition labor
  (the headline figure)

**Allocation:** Even spread across chartfield strings by regular-labor share. Same mechanism
as RPO (because both are best-guess at budget time).

**Current-year YTD/projection:** Residual — see Operating Report row 41 formulas above.
`F41 = GETPIVOTDATA(DBI total balance) - SUM(F36:F40)`.

**Walkthrough TODO (when we get there):** how to incorporate intentional-vacancy mask
(positions deliberately held vacant) into the trailing-year base. Hooks into Phase 7
separations data, so this should be the last class.
