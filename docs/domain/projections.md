# Projections

Year-end projections per chartfield. KosPos Phase 5.

## Methods

| Method | Description | When to use |
|---|---|---|
| **Straight-line** | Annualize current rate based on PPs elapsed | Default, baseline |
| **Trailing-period** | Use the last N PPs as the rate | When the year started slowly |
| **Hiring-plan-aware** | Apply Phase 6 hiring plan + Phase 7 separation plan | Most accurate when plans are complete |

## Components

Projected expenditure for the year = sum of:

- **Filled positions** — projected through year-end at current step + COLAs + planned step changes.
- **Vacant positions** — projected from RTF expected fill date + new-hire's expected step.
- **Separations** — known + suspected, subtract from filled.
- **Special classes** — overtime, premium pay, retirement payouts, temp pay, step adjustments. See [`special-class.md`](special-class.md).
- **Attrition** = budget − projected actuals (the remainder).

## Reconciliation

KosPos must reconcile against:

- **BFM eturns** — what was budgeted.
- **OBI BI Payroll** — what's been paid YTD.
- **PS Financials labor actuals** — what posted.

These three don't always match (data is lost at each step from T&L → Payroll → Financials). The Data Issues panel surfaces mismatches.

## Output

The Operating Report Summary tab in Alex's spreadsheet shows budget vs. projection per chartfield, with the special-class breakdown and attrition as the remainder. KosPos Phase 5 reproduces this.

## Caveats

- Step projections require knowing each employee's merit increase date and step progression rules per MOU. Some classes have extended steps that must be granted manually — don't auto-advance into them.
- MCCP positions advance through Range A automatically; Range B / C require manual grant.
- COLAs change mid-year per MOU. Reference data versioned by effective date handles this.
