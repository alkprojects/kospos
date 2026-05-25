# PS HCM — PeopleSoft Human Capital Management

System of record for employees, positions, and Time & Labor.

## Public reference

- [PeopleSoft HCM 9.2 — Manage Positions (May 2025)](https://docs.oracle.com/cd/G33001_01/psft/pdf/hcm92hhms-b052025.pdf) — canonical position-management PeopleBook (position vs. job, incumbents, budgeting). Oracle vendor docs, public.
- [PeopleSoft HCM 9.2 PeopleBooks Library](https://docs.oracle.com/cd/E40044_01/psft/html/docset.html) — full HCM module docs (Administer Workforce, Base Benefits, etc.).

## SF-internal access

- [Controller's Office Systems Division](https://www.sf.gov/information--controllers-office-systems-division) — runs SF's PS HCM instance.
- Employee portal: `prod.employee.sf.gov` — SSO-gated, not publicly fetchable.

## Reports & queries KosPos consumes

These are the named queries Alex pulls from PS HCM today. Filenames
captured from the [`example reports/Reports/` inventory](reports-folder-inventory.md#ps-hcm-exports-4-csvs).

| Query / report | Filename in folder | Cols × rows (sample) | Module that consumes it |
|---|---|---|---|
| **P&P Data** | `Active Labor - Version 8.30.24 (73).csv` (older snapshot; current is embedded in the labor-report workbook as the `P&P Data` tab) | 88 × 604 | Phase 2 importer, Phase 10 org chart. The OBI export name appears to be `Active Labor` (PS HCS source). |
| **Combo Codes** | `MRG_COMBO_CD_DEPT (5).csv` | 14 × 3,697 | Phase 3 chartfields. Workbook Tab 3. |
| **Task Profiles** | `MRG_TL_TASK_PROFILE_BY_TASKGRP.csv` | 20 × 1 (empty sample) | Phase 3 chartfields. Not in current labor report. |
| **Roster Approvers** | `MTL0170_4531347.csv` | 9 × 866 | Phase 6 hiring + cross-reference. Workbook Tab 8. PS HCM query name = `MTL0170`. |
| **EE Additional Pay** | `MRG_HR_EE_ADDL_PAY (65).csv` | 18 × 10 (tiny sample; expect ~thousands in prod) | Phase 4 special class (PREMM), data quality. Workbook Tab 9. |
| **T&L Reports** | _(not in this folder)_ | _(varies)_ | Phase 5 projections + reconciliation. Future import target. |

Concrete file shapes (including headers) live in
[`reports-folder-inventory.md` § PS HCM exports](reports-folder-inventory.md#ps-hcm-exports-4-csvs).

**TODO:** capture each query's full PS HCM Query Manager name (the `MRG_*`
and `MTL0170` prefixes suggest Standard / Tree / Public Query categories).

## Notes from the High Level Plan

- T&L sends data to Payroll, which generates journal entries to PS Financials. Data is lost at each step.
- T&L reports have the most information; sometimes don't fully match Payroll/Financials.
- Payroll matches Financials.
- Payroll loses benefit details from T&L.

## Open uncertainties

- Which queries are saved as Public Query Manager queries vs. private — affects whether other departments can replicate the workflow.
- Any plans for the HCM 9.2 → 9.3 upgrade or migration off PeopleSoft entirely? Track CON Systems Division announcements.
