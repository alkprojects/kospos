# Controller's Office (CON)

Owns city accounting policies, fiscal monitoring, the AAO, the citywide pay calendar, and
the source systems infrastructure (PeopleSoft HCM/FSCM/ELM, OBI, Sherpa BFM).

## Divisions

Per the [official About page](https://www.sf.gov/departments--controllers-office--about):

| Division | Scope |
|---|---|
| Accounting Operations & Suppliers | Citywide accounting records and vendor management |
| Administration & Finance | Internal office admin and finance |
| Audits | Audits and reports on City's financial / economic condition |
| Budget & Analysis | Citywide budget development, forecasting, fiscal-monitoring reports |
| City Performance | Evaluates government operations effectiveness |
| Economic Analysis | Economic conditions and trends |
| Office of the Refuse Rates Administrator | Refuse-collection rates |
| Payroll | Citywide payroll processing, **issues the pay calendar** |
| Public Finance | Bonds and debt portfolio |
| Systems | Owns PeopleSoft HCM/FSCM/ELM, OBI, Sherpa BFM, Phire, Control-M, Oracle IAM, FreshWorks |
| **Inspector General** | **NEW (2024 Prop C)** — appointed by the Controller with Mayor's approval + 2/3 BOS confirmation; [implementation status July 2025](https://media.api.sf.gov/documents/Inspector_General_Implementation_Status_Update_Report_07.17.25.pdf) |

The **Systems Division** serves 35,000 employees / 75,000 retirees / 25,000 vendors / 55
departments. Local brand names: SF Employee Portal, SF People & Pay, SF Financials, SF
Procurement, SF Learning, SF Reports & Analytics, SF Budget.

## Key resources

- [Controller's Office hub](https://www.sf.gov/departments--controllers-office--about) — top-level entry. Legacy `sfcontroller.org` URLs redirect here.
- [Annual Appropriation Ordinance (AAO) FY26 & FY27](https://media.api.sf.gov/documents/FY2026__FY2027_-_FINAL_AAO.pdf) — adopted department-level appropriations (dollars by index/character/sub-object). **Final adopted 2025-07-29.** Two-year cycle.
- [Annual Salary Ordinance (ASO) FY26 & FY27](https://www.sf.gov/documents/43115/FY2026__FY2027_-_FINAL_ASO.pdf) — authorized position counts/classes per department. **Final adopted 2025-07-29.** Two-year cycle. **Owner is Mayor's Office (proposes); BOS adopts; Controller hosts.** Listed here because the document lives on the Controller's site; canonical authority is MYR/BOS.
- [Six-Month Budget Status Report FY25-26](https://media.api.sf.gov/documents/Six-Month_Report_FY25-26_FINAL.pdf) — mid-year fiscal monitoring. Per §10.4: "authorizes the Controller to transfer funds from the Salary and Benefits Reserve" to adjust salary/benefits appropriations.
- [Nine-Month Budget Status Report FY25-26](https://media.api.sf.gov/documents/Nine-Month_Report_FY25-26_FINAL.pdf) — late-year fiscal monitoring. Cadence: twice yearly (Six-Month ~Feb, Nine-Month ~May), plus a Year-End report. Publisher: CON Budget & Analysis Division.
- [Budget Process Documents — FY26-27 hub](https://www.sf.gov/budget-process-documents-for-fiscal-years-2026-2027) — Mayor's Instructions, Five-Year/March Plans, Status Reports, Proposed Budget. Public; rolling updates through July.
- [Controller's Office Systems Division](https://www.sf.gov/information--controllers-office-systems-division) — owns PeopleSoft HCM/FSCM/ELM, OBI, Sherpa BFM, Oracle IAM, Phire, Control-M, FreshWorks. Public landing page.
- [Citywide pay calendar index](https://www.sf.gov/payroll-calendar) — Controller's Office (Payroll Division) is the issuer; per-year PDFs at `media.api.sf.gov/documents/CALYYYY.pdf` (e.g., [CAL2026](https://media.api.sf.gov/documents/CAL2026.pdf)).
- [Payroll Policies & Procedures Manual (April 2018)](https://sfcontroller.org/sites/default/files/Documents/payroll/PPPMApril2018Edition.pdf) — latest publicly indexed version. No 2019-2025 republication surfaced in research.
- [Accounting P&P Manual (August 2021 v3)](https://sfcontroller.org/sites/default/files/Documents/AOSD/CON%20Accounting%20P&P%20%E2%80%93%20August%202021%20v3.pdf) — latest publicly indexed version. The sf.gov landing page references "the January 2026 version" but no direct PDF URL is exposed (likely Portal-gated).
- [Fiscal Monitoring Resources for City Departments](https://www.sf.gov/resource--2024--fiscal-monitoring-resources-city-departments) — quarterly monitoring templates and CON guidance.
- [SFOpenBook-Budget](https://openbook-report.sfgov.org/ccsf_content/BudgetHelp/about.html) — summary of budget data from appropriation ordinances by Organization, Type, Fund.

## Internal / local

- **`CON Accounting P&P - January 2026 v1.2.pdf`** — Controller's Accounting Policies & Procedures manual. Held locally; no current canonical sf.gov landing page surfaced. Reissued roughly annually with version bumps. Drop into `docs/data-sources/reference-pdfs/`.

## What lives where (for KosPos)

- Accounting rules (combo codes vs. task profiles, default chartfield posting) → CON P&P → modeled in `docs/domain/chartfields.md` and `docs/domain/special-class.md`.
- Special-class definitions (9993, 9994, 9995, OVERM, etc.) → CON budget policy + technical instructions → modeled in `docs/domain/special-class.md`.
- Year-end projection methodology → CON guidance + Nine-Month Report → modeled in `docs/domain/projections.md`.

## Open uncertainties

- No canonical sf.gov page for the **January 2026 Accounting P&P** surfaced — the sf.gov
  departments page references it in text but doesn't expose a direct PDF link. Likely
  lives behind the SF Employee Portal. KosPos can cite the sf.gov page as canonical
  landing; the direct PDF appears to be Portal-gated. **TODO:** confirm with CON.
- Payroll P&P **April 2018 is still the latest publicly indexed version** — research did
  not surface a newer edition.
- **Snowflake migration status:** Snowflake is being adopted by **the Department of
  Technology** (16 depts engaged within the first year per Snowflake's case study), but
  the Controller's Office is **not** publicly listed as a Snowflake adopter. So
  PeopleSoft/OBI remain the Controller's reporting stack. Don't conflate "city is on
  Snowflake" (true via DT for some depts) with "Controller has migrated" (no public
  evidence). See also [`obi.md`](obi.md).

## What KosPos got wrong (and was corrected 2026-05-24)

- **ASO ownership** — KosPos previously left this ambiguous. The Mayor's Office proposes,
  BOS adopts; the Controller hosts the document. Don't credit the Controller with
  ownership.
- **Pay calendar** — issued by CON Payroll Division, not DHR. Moved canonical reference
  here from `dhr.md`.
- **Inspector General** — new Controller's Office division created by 2024 Prop C. Add
  to org-chart treatments of CON.
