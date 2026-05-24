# Definitions

Many SF budget terms have **multiple valid definitions depending on context**. KosPos must
pick the right one for each calculation. When a term is ambiguous, document all definitions
here so future sessions stop guessing.

## "Temp" / Temporary

The most overloaded term. Four contexts, four definitions:

| Context | Definition | Implication |
|---|---|---|
| **Budget — job class** | Anything budgeted as job class `TEMPM` | Budget side. Used in `BFM Position eturn` rows whose Budget Job Code = `TEMPM`. |
| **Employees** | Appointment categories `16`, `17`, `c2` | Person-level. From `PS HCM P&P Data` / `Active Labor` `Employee Appointment Type`. |
| **Temp actuals (department-internal)** | Expenditures (salary + benefits) for employees in categories 16/17/c2 | Requires joining payroll back to person → appointment type. |
| **Temp actuals (Controller-facing)** | Expenditures in accounts `505010`, `505020`, `505040`, `505050`, `505060`, `505070` (accounts with "temp" in description) | **Salaries only — does NOT include benefits.** There are no temp benefit accounts. To get temp benefits you'd have to do the dept-internal calc and add it back. |

**Gotcha:** Temp **budget** includes benefits. Temp **CON-actuals** does NOT (no temp benefit
accounts exist). So budget-vs-actual on temp is not apples-to-apples unless one side is
normalized. Most people don't realize this and don't include benefits in temp actuals unless
explicitly asked.

**Gotcha:** Only **some** benefits apply to temp staff (similar to overtime where only some
benefits apply — FY26: 7.65% of every OT dollar). The applicable benefit rates live in the
`15.15.002` report. KosPos's benefits calculator should source rates from there rather than
hardcoding, and cross-check against payroll actuals.

**Gotcha:** Temp employees can be placed on **permanent** budgeted positions. So position-type
(BFM `Budget Job Code = TEMPM`) and employee-type (`appt type ∈ {16,17,c2}`) don't always agree
for the same person at the same time. The Labor Report's `Step` tab has examples — see DBI ADM
Bldg Inspct Commission position 1068950, which is `TEMPM` but has multiple `ELC` (cat 17?)
employees attached.

KosPos should let the user **pick the definition per analysis**, not bake in one answer.
Default: budget side uses job class TEMPM; actuals side uses CON definition (accounts 505xxx)
unless "include benefits" is checked.

---

## Vacancy

(Stub — fill in when we hit it.)

Likely contexts:
- Position with no employee assigned
- Position with an employee on long-term leave
- Position with `Position Fill Status = VACANT` in the labor report
- Position whose authorized headcount > current filled headcount

---

## Department

(Stub — fill in when we hit it.)

Likely contexts:
- Budget department code (`Budget Department Code 1`)
- Position department ID (`Position Department ID`)
- Employee department code (`Employee Department Code`)
- "Effective Employee Department" (a derived combo in the Labor Report)
- Department group code (the rollup, e.g. `DBI`, `CPC`)

These can disagree mid-year due to transfers, splits, and combo overrides.

---

## Pay Period (PP)

- Standard SF pay period = 2 weeks = **80 hours** for the vast majority of city staff
  (Monday–Friday, 8 hours/day).
- Annual = typically 26 pay periods + a partial PP (e.g., 26.1 — `Calendar` tab tracks).
- Some job classes are on alternate schedules and DON'T fit the 80-hour PP model — the
  Fire Department is the canonical example. Math that assumes 80-hour PPs is wrong for
  these classes; either special-case them or pull actual scheduled hours from PS HCM.

The `Step!BY2` per-PP step-variance formula uses `XLOOKUP(BY1, Calendar!B, Calendar!C) * 80`
as a denominator — this is the 80-hour assumption baked in. Safe for non-Fire DBI staff;
wrong for Fire and any other alt-schedule classes.

---

## Pattern

When a future session hits an ambiguous term:
1. Add a section here with the term name.
2. List every definition in active use, with the data source for each.
3. Note which gotchas matter (which definitions disagree when, and why).
4. Recommend a default for KosPos and what should be user-toggleable.
