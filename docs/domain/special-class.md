# Special Class

Special-class budget categories — sub-accounts within labor that aren't tied to a specific position. The Special Class tab in Alex's Budget Master spreadsheet computes each of these.

KosPos must reproduce these to the dollar in Phase 4.

## The eight special classes

| Code | Name | Type | What it represents |
|---|---|---|---|
| **9993M_C** | Attrition Savings (Misc) | Credit | Savings from a position being vacant for part of the year. |
| **9994M_C** | MCCP Offset (Misc) | Credit | Difference between MCCP employees' actual salaries and the automatic top-of-range-A budget. |
| **9995M_E** | Positions Not Detailed (Misc) | Expense | Miscellaneous need not tied to a specific position. |
| **OVERM_E** | Overtime (Misc) | Expense | Overtime budget, lump sum. |
| **PREMM_E** | Premium Pay (Misc) | Expense | Premium pay per MOU clauses (acting, bilingual, hazardous, etc.). |
| **RTPOM_E** | Retirement Payout (Misc) | Expense | Retirement payouts, lump sum, not tied to a specific job class. |
| **STEPM_C** | Step Adjustments (Misc) | Credit | Difference between step employees' actual salaries and the automatic top-regular-step budget. |
| **TEMPM_E** | Temporary (Misc) | Expense | Temporary staff budget, lump sum. |

## How they work in budget formulation

- Position budgets are auto-built at the **top regular step** for step-based classes and the **top of Range A** for MCCP positions.
- Real employees aren't always at the top. The difference is recorded in **STEPM** (steps) or **9994** (MCCP) as a credit.
- Vacant time becomes **9993** (attrition) as a credit.
- Overtime, premium pay, retirement payouts, temp pay, and miscellaneous expenses go into their respective M_E codes.

## What KosPos models (Phase 4)

For each special class:

1. Compute the budget figure from position data (step / MCCP / employee data) using the same logic as the Special Class tab.
2. Compute the actual figure from BI Payroll + EE Additional Pay queries.
3. Show budget vs. actual variance per chartfield.

## Open work for Alex

The Special Class tab in `DBI FY27-28 Budget Master.xlsx` has 300+ named columns per employee with intricate formulas. The plan-time review only sampled the structure; Phase 4 needs Alex to walk through one or two example employees so the math gets reproduced correctly the first time.

**TODO for Alex (no rush):** Translate a few representative formulas into plain English. Example format:

> **STEPM for an employee on Step 3 of a 5-step class:**
> Budget = (Top Step Hourly Rate × Hours in FY × FTE)
> Actual = (Step 3 Hourly Rate × Hours in FY × FTE)
> STEPM = Budget − Actual (credit)

Drop those into this file as you find time.
