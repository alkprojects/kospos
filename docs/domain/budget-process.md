# Budget Process

The framework Alex uses for every labor budget item. Every special class, every position
line, every projection follows the same three-function model. Sessions writing math should
remember which function they're implementing.

## Three functions

| # | Function | Audience | Cadence | Source |
|---|---|---|---|---|
| 1 | **Budget development** | Dept → CON → Mayor → Board | Annual (Aug–May) | Budget Master workbook (current = `DBI FY27-28 Budget Master - Department Phase`) |
| 2 | **YTD budget vs actuals** | Dept internal, CON, MYR | Continuous + 6mo/9mo formal reports | Labor Report (current = `Labor Report 5.21.26.xlsx`) |
| 3 | **Year-end actuals projection** | Same as #2 | Same as #2 | Same source as #2 |

Functions 2 and 3 live in the **same** workbook (Labor Report). Function 1 lives in a
separate workbook (Budget Master). KosPos must support all three for every special class,
position, and chartfield string.

## Two-year budget cycle

SF builds budgets in **rolling two-year cycles**: each cycle covers a Budget Year (BY) and
BY+1. In the next cycle, what was BY+1 becomes the new BY (and opens for edits), and a new
BY+1 is added.

| Cycle | BY | BY+1 | Workbook name pattern |
|---|---|---|---|
| Current | FY27 | FY28 | `DBI FY27-28 Budget Master` |
| Next | FY28 | FY29 | `DBI FY28-29 Budget Master` |
| After that | FY29 | FY30 | `DBI FY29-30 Budget Master` |

Implications for KosPos:

- The budget-development UI must show **both years side by side**, not just BY. A user
  picking RPO numbers picks one for FY27 and one for FY28.
- BY+1 amounts can carry COLA differences vs BY when the budget item is rate-driven (per-
  employee payouts, salary lines). RPO is currently a chosen lump-sum, so COLA enters
  only if/when we switch to itemized per-employee payouts (Phase 4 PR #5 territory).
- When the cycle rolls, BY+1's chosen amounts and assumptions should be preserved as
  starting values for the new BY (not reset to zero).

## Reporting cycle

- **6-month report**: departments submit projected year-end to CON and MYR.
- **9-month report**: same, with more accuracy because more of the year is observed.
- These are formal accountability moments. If projected year-end exceeds budget materially,
  CON or MYR may intervene (reduce hiring authority, freeze classifications, take direct
  control of a fund).
- The Labor Report's `Operating Report Summary` tab → `Sum of Projected Operating Balance`
  is the number that gets reported.

## Budget philosophy

**Conservative bias is correct.** The trade-off:

| Direction | Risk |
|---|---|
| Over-budget | CON/MYR consequences (intervention, takeover, reputational hit) |
| Under-spent | BLA (Budget & Legislative Analyst) recommends cut next year |

Alex's target variance band: **1–5%** of total labor. Smaller is better; larger is dangerous.
Scale-dependent — a $50M variance on a $1B labor budget (e.g., SF General Hospital)
materially exceeds tolerance even though the percentage looks small.

KosPos should:

- Show the variance band as a visual cue (green/yellow/red), not hide it
- Surface a **recommended budget** with a documented cushion, never a hidden fudge factor
- Let the user toggle the cushion (or override per chartfield) and see the unaugmented
  number alongside

## Department data-quality caveat

**Not every department maintains a clean budget.** Some departments don't adjust special-class
budgets year-over-year and the recorded amounts don't reflect anything real or expected.

| Department | Special-class budget reliability |
|---|---|
| DBI (Alex's current dept, past few years) | **Reliable** — actively maintained to match expected reality |
| Other SF departments | **Variable** — may be stale, may not track real expectations |

Implication for KosPos: when we add citywide support, we cannot assume the prior-year budget
is a meaningful starting point for non-DBI departments. The historical actuals (account
510210 etc.) ARE meaningful for any department; the budgeted amounts may not be. A future
"budget-quality score per department" is worth surfacing.

## Appropriation control levels

Reminder (see [`chartfields.md`](chartfields.md) for the model):

- **Account-level**: budget is enforced per (account code) — granular
- **Project-level**: enforced per (project code)
- **Authority-level**: enforced per (authority code)
- **Fund-level**: enforced only at (fund code) — coarsest

DBI's operating budget is **fund-level** controlled. That means budget for a position in
Plumbing Inspection can legally cover an overrun in Permit Processing. Practical consequence:
attrition and other allocations can be "evenly spread by labor share" at chartfield-string
granularity without violating appropriation rules.

Other departments may have account-level or project-level control. Spreading must respect the
actual control level — that requires the appropriation-control reference table (a Phase 5
dependency; until it's loaded, `categorizeAccount` defaults non-labor numeric accounts to
`'account'` as the conservative fallback rather than distinguishing project- vs
authority-level control).

## Benefits

Benefit rates that apply to labor — including the partial sets that apply to overtime and
temp pay — live in the **`15.15.002`** report. KosPos's benefits calculator should source
rates from there, not hardcode them. Confirm against payroll actuals when in doubt.

Examples:
- **OVERM (overtime)**: only some benefits apply. FY26 rate = 7.65% of each OT salary dollar.
- **TEMPM (temporary)**: only some benefits apply. There are no temp-specific benefit
  accounts, so temp benefits don't appear in the Controller's view of temp actuals
  (accounts 505xxx). See [`definitions.md`](definitions.md).

## SF historical COLAs (Miscellaneous bargaining units)

Source-of-truth: SF DHR Memoranda of Understanding PDFs (SEIU Local 1021 Miscellaneous is
the canonical "Misc" unit; other Misc units — MEA, IFPTE Local 21, Locals 261/856 —
generally track the same effective rates with minor offsets). Rates below are the **wage
increases stated verbatim in the ratified MOUs**, indexed to the fiscal year in which they
take effect.

Important caveat — these are *calendar-effective* increases within an FY, not flat annual
COLAs. An increase landing on June 30 only moves the dial for one payroll day of that FY,
so the annualized payroll impact differs from the headline %. The "Modeling % per FY"
column below collapses each FY's increases into a single number suitable for
historical-actuals inflation in projection math; precision-critical work (per-position
salary modeling) should use the per-effective-date increments instead.

| FY | Effective dates within FY | Modeling % per FY | Confidence | Source |
|---|---|---|---|---|
| FY18 | Jul 1, 2017 (3.0%) | 3.0% | HIGH | 2014-2019 MOU §255 [1] |
| FY19 | Jul 1, 2018 (3.0% scheduled, deficit-trigger not invoked) | 3.0% | HIGH | 2014-2019 MOU §255 [1] |
| FY20 | Jul 1, 2019 (3.0%) + Dec 28, 2019 (1.0%) | 3.5% | HIGH | 2019-2022 MOU §254 [2] |
| FY21 | Jul 1, 2020 (3.0%) + Dec 26, 2020 (0.5%) | 3.5% scheduled (COVID deferral delayed 3.0% to ~Jan 2021 via amendment) | HIGH/MED | 2019-2022 MOU §254 [2] |
| FY22 | Jul 1, 2021 (3.0%) + Jan 8, 2022 (0.5%) | 3.25% | HIGH | 2019-2022 MOU §254 [2] |
| FY23 | Jul 1, 2022 (5.25%) | 5.25% | HIGH | 2022-2024 MOU §267 [3] |
| FY24 | Jul 1, 2023 (2.50%) + Jan 6, 2024 (2.25%) | 3.6% | HIGH (scheduled) / MED (realized) | 2022-2024 MOU §267 [3] |
| FY25 | Jul 1, 2024 (1.5%) + Jan 4, 2025 (1.5%) + Jun 30, 2025 (1.0%) | 3.0% | HIGH | 2024-2027 MOU Wages [4] |
| FY26 | Jul 1, 2025 (1.0%) + Jan 3, 2026 (1.5%) + Jun 30, 2026 (2.0%) | 2.5% | HIGH | 2024-2027 MOU Wages [4] |
| FY27 | Jan 2, 2027 (2.0%) + Jun 30, 2027 (2.5%) | 2.0% | HIGH | 2024-2027 MOU Wages [4] |
| FY28 | none ratified | **placeholder 2.5%** | UNRESOLVED | no MOU yet (current contract expires 6/30/2027) |

The "Modeling % per FY" column is a recommendation, not a fact in any MOU. Rationale: for
each FY, sum the increases that take effect early enough to materially affect the year (the
first two increases in a three-increase FY year; the late-June increase is essentially
prospective). Final numbers are author judgment — adjust the column when the modeling lens
changes (e.g., a per-pay-period accrual model would prefer per-effective-date).

**Until a successor MOU lands, FY28 should fall back to the 2.5% placeholder** (the
existing default in `COLA_PCT_PER_YEAR`). When the 2027-2030 MOU is ratified, refresh this
table and the code constant.

**Sources:**

1. [SEIU Local 1021 MOU 2014-2019 (Amendment 2)](https://sfdhr.org/sites/default/files/documents/MOUs/SEIU-1021-MOU-2014-2019-Amendment-2.pdf) — sfdhr.org, p. 41, §255
2. [SEIU Local 1021 MOU 2019-2022](https://sfdhr.org/sites/default/files/documents/MOUs/SEIU-Local-1021-MOU-2019-2022.pdf) — sfdhr.org, p. 41, §254
3. [SEIU 1021 Miscellaneous MOU 2022-2024 (Revised per Amendment #4)](https://sfdhr.org/sites/default/files/documents/MOUs/SEIU-1021-MIscellaneous-2022-2024.pdf) — sfdhr.org, p. 44, §267
4. [SEIU 1021 Miscellaneous MOU 2024-2027](https://www.sf.gov/sites/default/files/2024-06/SEIU-1021-MIscellaneous-2024-2027.pdf) — sf.gov, p. 47, Wages Article
5. [SF DHR — Memoranda of Understanding index](https://sfdhr.org/memoranda-understanding)

**Public-safety units (POA / Fire / Sheriff) have separate MOUs and different COLA
schedules** — do not use this table for any class that rolls up to a public-safety unit.

## Cross-references

- Budget legislative phases (Base / Dept / Mayor / Committee / Technical / Board): see
  [`budget-phases.md`](budget-phases.md)
- Per-class math: see [`special-class.md`](special-class.md)
- Year-end projection methods: see [`projections.md`](projections.md)
- Term definitions that vary by context: see [`definitions.md`](definitions.md)
