# PS HCM — PeopleSoft Human Capital Management

System of record for employees, positions, and Time & Labor.

## Public reference

- [PeopleSoft HCM 9.2 — Manage Positions (May 2025)](https://docs.oracle.com/cd/G33001_01/psft/pdf/hcm92hhms-b052025.pdf) — canonical position-management PeopleBook (position vs. job, incumbents, budgeting). Oracle vendor docs, public.
- [PeopleSoft HCM 9.2 PeopleBooks Library](https://docs.oracle.com/cd/E40044_01/psft/html/docset.html) — full HCM module docs (Administer Workforce, Base Benefits, etc.).

## SF-internal access

- [Controller's Office Systems Division](https://www.sf.gov/information--controllers-office-systems-division) — runs SF's PS HCM instance.
- Employee portal: `prod.employee.sf.gov` — SSO-gated, not publicly fetchable.

## Reports & queries KosPos consumes

These are the named queries Alex pulls from PS HCM today. Add IDs/names as you confirm them.

| Query / report | Purpose | Module that consumes it |
|---|---|---|
| **P&P Data** | Position + person data (the 88-column report). Canonical input. | Phase 2 importer, Phase 10 org chart |
| **Combo Codes** | List of combo codes per department | Phase 3 chartfields |
| **Task Profiles** | List of task profiles per department | Phase 3 chartfields |
| **Roster Approvers** | Who approves which roster | Phase 6 hiring + cross-reference |
| **EE Additional Pay** | Active pay items (supervisory, acting, etc.) | Phase 4 special class (PREMM), data quality |
| **T&L Reports** | Time entry detail | Phase 5 projections + reconciliation |

**TODO:** capture each query's PS HCM Query Name as Alex confirms them.

## Notes from the High Level Plan

- T&L sends data to Payroll, which generates journal entries to PS Financials. Data is lost at each step.
- T&L reports have the most information; sometimes don't fully match Payroll/Financials.
- Payroll matches Financials.
- Payroll loses benefit details from T&L.

## Open uncertainties

- Which queries are saved as Public Query Manager queries vs. private — affects whether other departments can replicate the workflow.
- Any plans for the HCM 9.2 → 9.3 upgrade or migration off PeopleSoft entirely? Track CON Systems Division announcements.
