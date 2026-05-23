# DHR — Department of Human Resources

Owns job classifications, salary schedules, MOUs, eligibility lists, the pay calendar, and benefit rates.

## Classification & compensation

- [Classification and Compensation Data](https://www.sf.gov/classification-and-compensation-data) — entry hub. Comp Manual, Hourly Rates by Class & Step, Negotiated Comp by Bargaining Year, MCCP ranges, Health & Benefits. Public; annual (FY) reissue, mid-year addenda after MOU ratifications.
- [Compensation Manual FY 2024-25 (latest published)](https://www.sf.gov/sites/default/files/2024-12/Compensation-Manual-FY-2024-25.pdf) — authoritative class/step pay grid, premiums. Public; annual.
- [Classification and Compensation landing](https://www.sf.gov/classification-and-compensation) — top-level entry to job-class lookup and pay tables.
- [Past Classification and Compensation Documents](https://www.sf.gov/resource/2024/past-classification-and-compensation-documents) — historical archive.
- [Actions on Job Classifications (FY25-26)](https://www.sf.gov/actions-job-classifications) — HR Director actions (create/amend/retitle/abolish), posted 7 days per Charter §10.103. Rolling, archived annually.

## MOUs (union contracts)

- [Labor Agreements / MOUs](https://www.sf.gov/labor-agreements-city-and-county-san-francisco) — full MOU PDFs for ~30+ units. 2024-2027 cycle for most; Police/Fire on different cycles. Public. Three-year negotiation cycle with annual comp provisions.

## Hiring & eligibility

- [careers.sf.gov](https://careers.sf.gov/) — DHR / SmartRecruiters jobs portal. Class spec pages, recent hires. Public browsing; applicant login for "My Applications".
- [Classifications directory](https://careers.sf.gov/classifications/) — canonical class-code pages (e.g., `?classCode=1070`).
- [Eligibility and Eligible Lists (Knowledge Center)](https://careers.sf.gov/knowledge/process/eligible-lists/) — explains exam results / eligible-list scope. Score reports published (names redacted except public-safety). Typical 1-year list life.

## Reports & data

- [DHR Reports](https://www.sf.gov/dhr-reports) — workforce / EEO / operational reports. Public; annual.
- [Data for Labor](https://www.sf.gov/resource/2023/data-labor) — datasets supporting labor negotiations.

## Pay calendar

- `CAL2026.pdf` (downloaded from `media.api.sf.gov/documents/CAL2026.pdf`) — annual calendar listing pay periods, PPEs, paydays, holidays. Issued by DHR each calendar year.

## What lives where (for KosPos)

- Reference data: hourly rates by class & step → `app/src/data/dhr-steps.json` (versioned by effective date).
- Reference data: MCCP ranges → `app/src/data/dhr-ranges.json`.
- Reference data: COLA schedule per MOU → `app/src/data/cola.json`.
- Reference data: Benefit rates → `app/src/data/benefits.json`.
- Reference data: Pay calendar → `app/src/data/calendar.json`.
- Eligibility-list links → Phase 6 hiring module (initially manual links; scraper later).

## Open uncertainties

- DHR Comp Manual FY25-26 not yet located online (latest public is FY24-25). FY25-26 data may currently live only in the Hourly Rates spreadsheets pending full manual republication.
- Legacy `sfdhr.org` URLs may still appear; treat as backups that redirect to `sf.gov`.
