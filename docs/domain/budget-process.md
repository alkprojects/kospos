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

## Cross-references

- Budget legislative phases (Base / Dept / Mayor / Committee / Technical / Board): see
  [`budget-phases.md`](budget-phases.md)
- Per-class math: see [`special-class.md`](special-class.md)
- Year-end projection methods: see [`projections.md`](projections.md)
- Term definitions that vary by context: see [`definitions.md`](definitions.md)
