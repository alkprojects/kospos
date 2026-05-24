# Civil Service Commission (CSC)

Owns Civil Service Rules (Vol I–IV) governing classification, exams, eligibility lists, appointments, probation.

## Rule volumes (all four confirmed 2026-05-24)

- **Vol I (most City employees, Rules 101–122)** — [sf.gov/resource--2022--rules-apply-most-city-employees](https://www.sf.gov/resource--2022--rules-apply-most-city-employees-civil-service-commission-vol-i)
- **Vol II (Police uniformed ranks, 2xx series)** — [sfgov.org/civilservice/node/254](https://www.sfgov.org/civilservice/node/254)
- **Vol III (Fire uniformed ranks, 3xx series)** — [sf.gov/resource--2022--rules-uniformed-ranks-fire-department](https://www.sf.gov/resource--2022--rules-uniformed-ranks-fire-department-civil-service-commission-vol-iii)
- **Vol IV (MTA service-critical employees, 4xx series)** — [sf.gov/resource--2022--rules-mta-service-critical-employees](https://www.sf.gov/resource--2022--rules-mta-service-critical-employees-civil-service-commission-vol-iv) — Vol IV URL now confirmed (previously marked TODO).

Vol I has **no Rule 108**. Vol II/III/IV mirror Vol I numbering with +100/+200/+300
offsets (e.g., Rule 109 ↔ 209 ↔ 309 ↔ 409 for classification). KosPos should use a
composite `<volume, rule_number>` key when modeling rule references.

## Key rules (latest reissues)

| Rule | Subject | Reissued | URL |
|---|---|---|---|
| 102 | Definitions | July 2024 | [sf.gov](https://www.sf.gov/reports--july-2024--rule-102-definitions-civil-service-commission) |
| 109 | Position Classification (Vol I) | July 2024 | [sf.gov](https://www.sf.gov/reports--july-2024--rule-109-position-classification-civil-service-commission) |
| 113 | Certification of Eligibles | July 2024 | [sf.gov](https://www.sf.gov/reports--july-2024--rule-113-certification-eligibles-civil-service-commission) |
| 114 | Appointments (all types) | July 2024 | [sf.gov](https://www.sf.gov/reports--july-2024--rule-114-appointments-civil-service-commission) |
| 117 | Probationary Period | July 2000 | [sf.gov](https://www.sf.gov/reports--july-2000--rule-117-probationary-period-civil-service-commission) |
| 120 | Leaves of Absence | October 2024 | [sf.gov](https://www.sf.gov/reports--october-2024--rule-120-leaves-absence-civil-service-commission) |
| 121 | Layoff | July 2024 | [sf.gov](https://www.sf.gov/reports--july-2024--rule-121-layoff-civil-service-commission) |
| 209 | Position Classification (Vol II Police) | July 2024 | [sf.gov](https://www.sf.gov/reports--july-2024--rule-209-position-classification-and-related-rules-civil-service-commission) |
| 309 | Position Classification (Vol III Fire) | July 2024 | [sf.gov](https://www.sf.gov/reports--july-2024--rule-309-position-classification-and-related-rules-civil-service-commission) |

## Civil Service Advisers

Index: [sf.gov/resource--2022--civil-service-advisers](https://www.sf.gov/resource--2022--civil-service-advisers).
KosPos previously cited only Adviser #8. Selected advisers especially relevant to
position management:

| # | Title | Why it matters |
|---|---|---|
| 3 | Appeals to the Civil Service Commission | How HR Director actions reach CSC |
| 6 | Release from Probationary Period | Probationary release procedure |
| 8 | Selection from Civil Service Eligible Lists | Cert-and-select rules |
| 11 | Certification of Eligibles | Certification mechanics |
| 13 | Appointments | Appointment-type primer |
| 14 | Special Assistants | Charter §10.104 special assistant exemption |
| 15 | Civil Service Seniority | Seniority computation (refreshed 2025 as Adviser 16/25) |
| 17 | Personal Services Contracts | PSC oversight role of CSC |
| 18 | Reinstatement | Post-separation reinstatement rights |
| 22-24 | Probationary Periods | Probation primer + updates |
| 26 | Out of Class Assignments | OOC pay/assignment (refreshed 2025 as 26/25) |
| 27-29 | Classification | Classification overview, procedures, class/budget interplay |
| 33 | Reinstatement, Reappointment, Reversion and Transfer | Mobility mechanisms |
| **34** | **Exempt Appointments — Know Your Status** | **Authoritative grouping of Charter §10.104 categories into Groups I–IV** |
| 35 | Minimum Qualifications Verification | MQ verification (refreshed 2025 as 35/25) |

Numbers 4 and 9 are listed as omitted/outdated.

## Recent CSC decisions / memos (last 2-3 years)

- **2025-03-17** — *CSC Rule Changes Closeout Memo.* Vol I + Vol IV amendments creating
  **expedited PCS pathways** for current City employees promoting/transitioning into
  permanent positions; DHR/MTA pilot. [PDF](https://media.api.sf.gov/documents/3-17-25_Item_10_and_11_CSC_Rule_Changes_Closeout_Memo_to_CSC.pdf).
- **2025-08** — CSC Memo 2025-08: Proposed Amendments to Rules 212 and 213 Article II
  (Police eligible lists / certification). [PDF](https://media.api.sf.gov/documents/CSC_Memo_2025-08_Proposed_Amendments_to_Rules_212_and_213_Article_II.pdf).
- **2024-07** — Rules 102, 113, 114, 120, 121, 314, 321 reissued.
- **2024-03-18** — DHR semiannual Report of Expired Exempt Appointments Cat 16/17/18.
  [PDF](https://media.api.sf.gov/documents/3-18-24_Item_10_DHR_Report_of_Expired_Exempt_Appointments_Cat_16-17-18.pdf).
- **2023-10-16** — Item 9: Proposed Changes to Rules 02/09/14/20/21 to modernize.
  [PDF](https://media.api.sf.gov/documents/10-16-23_Item_9_Proposed_Changes_to_Rules_02_09_14_20_and_21_to_Modernize_and__dMSoocm.pdf).

## What lives where (for KosPos)

- PCS / PEX / TEX / Cat 16-19 / MTA appointment-type rules → [`../domain/appointment-types.md`](../domain/appointment-types.md).
- Hiring template (Personnel Requisition → cert → appointment) → [`../domain/hiring-process.md`](../domain/hiring-process.md).
- Eligibility-list expiration logic (Rule 112: 6-mo min, 48-mo max, 12-mo extension) → Phase 6 hiring module.
- Probation tracking — **duration is per-MOU, not global** (Rule 117) → Phase 6/7.
- Layoff / bumping / holdover (Rule 121) → Phase 7 separations.

## What KosPos got wrong (and was corrected 2026-05-24)

- **Vol IV URL** is now confirmed (above) — removed `[unverified]`.
- **"RTF" is not a Civil Service Rules term.** Rule 113 §113.8 calls these **"Personnel
  Requisitions"** — RTF is internal SFDHR/PeopleSoft workflow vocabulary, not a primary
  statutory entity.
- **Rule 117 sets no universal probation length** — duration is per-MOU/per-class.
- **Holdover preference is reportedly 5 years** (Rule 121.14.6) — KosPos should treat
  holdover rights as a dated resource with expiry, not indefinite.
