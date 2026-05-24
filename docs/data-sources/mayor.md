# Mayor's Office (MYR)

Issues budget instructions, the Proposed Budget, and the Annual Salary Ordinance (ASO).

## Resources

- [Mayor's Budget Office](https://www.sf.gov/information--mayors-budget-office) — office landing, budget calendar, contacts.
- [Mayor's Budget Instructions — Dec 2025 update (FY26-27 & FY27-28)](https://www.sf.gov/documents/48491/Dec2025_Budget_Instructions_Update.pdf) — base instructions, targets, CODB, position-control guidance. Issued Dec 12, 2025.
- [January 8, 2026 Mayor's Budget Instructions update (FY27-28)](https://sfhss.org/resource/january-8-2026-mayors-budget-instructions-fye-2027-2028-and-opportunity-public-input/download) — refresh of position-control + attrition framework for the next cycle. Mirrored via SFHSS.
- [Mayor's Budget Documents (sfmayor.org)](https://sfmayor.org/budget-documents) — Proposed Budget May 1 / June 1 books. Annual.
- [Annual Salary Ordinance (ASO) FY26 & FY27 — Final (adopted 2025-07-29)](https://www.sf.gov/documents/43115/FY2026__FY2027_-_FINAL_ASO.pdf) — authoritative position-count / class roster by department; companion to the AAO. Two-year cycle with mid-year amendments (after MOU ratifications and supplemental appropriations).
- [BOS Budget Hearing Calendar FY26-27 & FY27-28](https://sfbos.archive.sf.gov/sites/default/files/2026_Budget_Hearing_Calendar.pdf) — Board/Mayor budget hearing calendar.

## Budget Instructions structure (verified)

Per agent research 2026-05-24, the Budget Instructions PDF has five sections:

| § | Section | Scope |
|---|---|---|
| I | New Instructions | Cycle-specific changes vs. prior year |
| II | Mayor's Policy Instructions | CODB, FTE/attrition targets, programmatic priorities |
| III | Submission Forms & Instructions | What departments must submit and in what format |
| IV | Technical Instructions | Form 3B Position Changes, BFM mechanics, account-mapping rules |
| V | Appendices | Reference tables, etc. |

**Verified specifics:**

- **Submission deadline:** Departments submit to Mayor, Controller, BOS by **March 1**
  (corroborated by Charter §9.101).
- **Equipment threshold:** unit cost ≥ $10,000 and useful life ≥ 3 years.

**Unverified (PDF body unreadable in 2026-05-24 research):** position-control rules on
when departments may add/move/abolish positions without Mayor's Office approval; precise
9993-attrition target framework. KosPos should re-fetch the readable PDF body in a future
session before encoding either rule.

## What lives where (for KosPos)

- Budget cycle phases (Base / Department / Mayor / Committee / Technical / Board) → `docs/domain/budget-phases.md`.
- ASO position counts → Phase 8 budget edits (reconcile against PS HCM position counts).
- Mayor's Instructions → Phase 8 reference for what changes are allowed in the Department-phase budget.

## Open uncertainties

- The Mayor's Instructions PDF is reissued each budget cycle. URL above is FY26-27 /
  FY27-28; future cycles will publish under different filenames. Plan to re-fetch
  annually.
- **Mayor's Instructions PDF text** has been unreadable via WebFetch in recent research
  (binary extraction failure). The position-control rule body and any 9993-attrition
  framework live in Section IV Technical Instructions but couldn't be extracted; future
  sessions should try a different fetcher or read locally.

## ASO ownership clarification

The ASO is **proposed by the Mayor's Office** (via the Budget Instructions cycle), then
**adopted by the Board of Supervisors** alongside the AAO, then **hosted on the
Controller's site** (the Controller administers it post-adoption). Per Admin Code §3.10.

KosPos's prior treatment of the ASO as a Controller-owned document was incorrect —
authority chain is MYR → BOS, with CON as host/administrator.
