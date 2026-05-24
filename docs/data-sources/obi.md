# OBI / Snowflake

Reporting platform layered over PS HCM and PS Financials. **Currently OBI; migrating to Snowflake.** Timeline not publicly announced; treat any Snowflake references as forward-looking.

## OBI (current state)

- Oracle Business Intelligence Enterprise Edition.
- Managed by [CON Systems Division](https://www.sf.gov/information--controllers-office-systems-division).
- No public dashboards — access via SF SSO.
- The main labor reports Alex uses today come from OBI:
  - **BI Payroll** — All paid amounts in the fiscal YTD.
  - Various ad-hoc queries on positions, employees, chartfields.

## Snowflake (future state) — clarified 2026-05-24

- **Snowflake is a Department of Technology initiative**, not a Controller's Office
  initiative. The Controller's Office is **not** named as a Snowflake adopter in
  Snowflake's [CCSF case study](https://www.snowflake.com/en/customers/all-customers/case-study/city-and-county-of-san-francisco/).
  Some 16 city departments have engaged with the platform via DT (SFO and Parks & Rec
  named).
- **No public roadmap commits the Controller to Snowflake migration of OBI or PS HCM/FSCM**
  reporting. So treat OBI as the canonical reporting layer for KosPos's source systems
  until evidence changes.
- Don't conflate "city is on Snowflake" (true for some depts via DT) with "Controller has
  migrated" (no public evidence).
- KosPos should still design importers to be **source-agnostic** — sniff column headers,
  not file names — so any future OBI→Snowflake cutover doesn't require a rewrite.

## What KosPos imports

- **BI Payroll** report (Phase 2 importer).
- Any other OBI-built report Alex currently runs (capture each one as you confirm it).

## Open uncertainties

- Snowflake migration timeline. Authoritative source: CON Systems Division — confirm directly.
- Whether OBI/Snowflake output formats will be CSV, XLSX, or JSON post-migration.
