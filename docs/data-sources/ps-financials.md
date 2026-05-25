# PS Financials — PeopleSoft Financials (FSCM)

System of record for accounting transactions and chartfields.

## Public reference

See Oracle PeopleBooks library linked from [`ps-hcm.md`](ps-hcm.md). FSCM 9.2 docs include General Ledger, Commitment Control, Project Costing, etc.

## SF-internal access

- Managed by [CON Systems Division](https://www.sf.gov/information--controllers-office-systems-division).
- Reporting historically via OBI; migrating to Snowflake (see [`obi.md`](obi.md)).

## What KosPos uses from PS Financials

- **Chartfield reference data** — Fund / Dept / Project / Activity / Authority / Account / Agency Use / TRIO / WBS hierarchies. See [`docs/domain/chartfields.md`](../domain/chartfields.md).
- **Appropriation control trees** — Account / Project / Authority controls per `docs/domain/chartfields.md`.
- **Labor actuals** — what actually posted, by chartfield, by employee, by PP. Sourced via OBI's `Payroll Detail` export (predecessor schema of the labor-report's BI Payroll tab — see [`reports-folder-inventory.md` § OBI labor reports](reports-folder-inventory.md#payroll-detail---version-11823-80csv)).
- **BVA report (Budget vs Actuals)** — chartfield-level budget + actuals + KK transfers + GL actuals. Delivered via OBI today; the **source of truth** when reconciling position-aware payroll against chartfield-level GL. Full schema in [`bva.md`](bva.md).

### Chartfield Classification Structure trees

All sourced via OBI, all CSV. Per Alex's `reports.txt`, **all 11 are
source-of-truth for chartfield structure** (Budget Control variants
additionally drive budget checks):

| Tree | Cols × rows | Notes |
|---|---|---|
| Account | 16 × 6,723 | 4-level hierarchy → Account Description (the readable name labor formulas key on) |
| Account Budget Control | 13 × 2,971 | Budget-control 3-level |
| Activity | 9 × 81,905 | Project-internal activities |
| Agency Use | 3 × 3,724 | Rarely populated outside Public Health / specific grants |
| Authority | 9 × 14,307 | 2-level Authority hierarchy |
| Department | 13 × 14,240 | Full citywide dept tree (the [Tab 6 § citywide dept tree](../domain/labor-report.md#companion-reference-dataset--citywide-department-tree) reference) |
| Department Budget Control | 16 × 1,512 | 4-level Dept Budget Control |
| **Fund** | 16 × 1,951 | **Carries `Annual/Continuing` flag** → drives the operating-vs-continuing fund split |
| Project | 13 × 43,012 | Project Code + Owning Dept + Owning Dept Group + Manager / Accountant / Start-End / Type + Grant flag |
| TRIO | 3 × 3,677 | Capital-project initials codes; mostly empty |
| WBS | 17 × **390,470** | 5-level Work Breakdown Structure for capital projects |

Concrete file shapes in [`reports-folder-inventory.md` § PS Financials chartfield trees](reports-folder-inventory.md#ps-financials-chartfield-trees-11-csvs).

## Notes

- Labor actuals always post and ignore appropriation controls.
- Default labor posting goes to the employee's budgeted chartfields. Combo codes and task profiles override this.
- Combo codes include Fund + Dept + Authority (not Project/Activity).
- Task profiles include all chartfields except Account.

## Open uncertainties

- How chartfield hierarchies are exposed for export (direct query? OBI report? Snowflake view?). **TODO** capture once known.
