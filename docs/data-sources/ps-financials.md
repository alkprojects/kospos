# PS Financials — PeopleSoft Financials (FSCM)

System of record for accounting transactions and chartfields.

## Public reference

See Oracle PeopleBooks library linked from [`ps-hcm.md`](ps-hcm.md). FSCM 9.2 docs include General Ledger, Commitment Control, Project Costing, etc.

## SF-internal access

- Managed by [CON Systems Division](https://www.sf.gov/information--controllers-office-systems-division).
- Reporting historically via OBI; migrating to Snowflake (see [`obi.md`](obi.md)).

## What KosPos uses from PS Financials

- **Chartfield reference data** — Fund / Dept / Project / Activity / Authority / Account hierarchies. See [`docs/domain/chartfields.md`](../domain/chartfields.md).
- **Appropriation control trees** — Account / Project / Authority controls per `docs/domain/chartfields.md`.
- **Labor actuals** — what actually posted, by chartfield, by employee, by PP.
- **BVA report (Budget vs Actuals)** — chartfield-level budget + actuals + KK transfers + GL actuals. Delivered via OBI today; the **source of truth** when reconciling position-aware payroll against chartfield-level GL. Full schema in [`bva.md`](bva.md).

## Notes

- Labor actuals always post and ignore appropriation controls.
- Default labor posting goes to the employee's budgeted chartfields. Combo codes and task profiles override this.
- Combo codes include Fund + Dept + Authority (not Project/Activity).
- Task profiles include all chartfields except Account.

## Open uncertainties

- How chartfield hierarchies are exposed for export (direct query? OBI report? Snowflake view?). **TODO** capture once known.
