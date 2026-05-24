# Hiring Process

Different appointment types follow different hiring processes. KosPos models these as user-configurable templates (Phase 6).

## Appointment types

KosPos previously listed only PCS / PEX / TEX / Cat 16-18. The **full** SF taxonomy
(including Provisional, Cat 19, MTA Exempt, Reinstatement, Reappointment, Transfer,
Limited-Term Transfer, and the Director of Elections track) is documented in
[`appointment-types.md`](appointment-types.md). Cross-check that file when modeling any
new hiring template.

| Type | Full name | Requires exam? | Requires eligibility list? | Time limit |
|---|---|---|---|---|
| **PCS** | Permanent Civil Service | Yes | Yes | None |
| **Probationary** | Probationary | (already certified) | (already certified) | Per-MOU, not global |
| **Temp CS** | Temporary Civil Service | Yes | Yes | 1,040 hrs std / 2,080 hrs special-project |
| **Provisional** | Provisional | No | No | 3 yrs (BOS approval beyond) |
| **PEX** | Permanent Exempt (§10.104 subs 1-15+19) | No | No | None (except §19) |
| **TEX** | Temporary Exempt (§10.104 subs 16-18) | No | No | Per category |
| **Cat 16** | §10.104-16 — Temporary/seasonal | No | No | ≤1,040 hrs (half-time) per FY |
| **Cat 17** | §10.104-17 — Backfill for leave | No | No | ≤2 yrs, **non-renewable** |
| **Cat 18** | §10.104-18 — Special projects | No | No | ≤3 yrs, **non-renewable** |
| **Cat 19** | §10.104-19 — Severely disabled entry | No | No | Converts to PCS after 1 yr satisfactory service |
| **MTA Exempt** | Charter §8A.104(i) | No | No | None; 2.75% MTA cap |
| **Reinstatement** | Rule 114 Art. II | No | No | None (seniority retained) |
| **Transfer** | Rule 114.13 / 114.17 | No | No | LTT: 6 mo/yr mandatory |

Reference: [Civil Service Rules](../data-sources/civil-service.md) Vol I, Rules 101–122
govern most appointments; Charter [§10.104](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-1076)
enumerates the 19 exempt categories; Charter [§8A.104(i)](https://codelibrary.amlegal.com/codes/san_francisco/latest/sf_charter/0-0-0-682)
covers MTA. Full detail per type lives in [`appointment-types.md`](appointment-types.md).

## Typical PCS process steps

1. Position posted via Personnel Requisition (commonly called "RTF" — see note below)
2. Exam announced (CS Rule 110)
3. Exam administered (CS Rule 111)
4. Eligible list certified (CS Rule 112)
5. Department requests names — "certification of eligibles" (CS Rule 113); three rules
   used: Rule of Three Scores (§113.7.1), Rule of Three or More Scores (§113.7.3), Rule
   of the List (§113.7.4)
6. Interviews (20-business-day report-back requirement, §113.11)
7. Offer
8. Background / fingerprinting
9. Hire date — appointment becomes effective under CS Rule 114.2

KosPos lets users define their own ordered process steps per template.

### "RTF" terminology — primary-source correction

KosPos uses "RTF (Request to Fill)" because that's the SFDHR/PeopleSoft workflow label.
The Civil Service Rules call this a **Personnel Requisition** (Rule 113, Article IV,
§113.8) — time-stamped in order of receipt. KosPos's RTF model is the operational
workflow that maps to the Rule 113 Personnel Requisition + Rule 114 appointment chain.
When extending KosPos beyond DBI, other departments may use different internal naming
for the same Rule 113 workflow.

## Time-to-hire metric

Defined per template. Default: days from RTF approval → hire date.

## Eligibility lists

- DHR posts eligibility lists at [`careers.sf.gov/knowledge/process/eligible-lists/`](https://careers.sf.gov/knowledge/process/eligible-lists/).
- Each list has a typical 1-year lifespan.
- KosPos Phase 6 surfaces eligibility-list links per position; later phases may scrape automatically.

## Temp time limits

Cat 16 / 17 / 18 positions have time limits. PS HCM has the `CAT_17_18 Exempt TX Expired Date`
field. KosPos data-quality rule: flag any temp employee past their expiration date.

DHR files a **semiannual report to CSC on expired Cat 16/17/18 appointments**
([example, 3/18/24](https://media.api.sf.gov/documents/3-18-24_Item_10_DHR_Report_of_Expired_Exempt_Appointments_Cat_16-17-18.pdf)).
KosPos should treat any active appointment past its time limit as a position-control
violation, not just a data anomaly.

Hard limits to enforce per [`appointment-types.md`](appointment-types.md):

- **Cat 16:** ≤1,040 hrs per fiscal year (resets each FY).
- **Cat 17:** ≤2 years lifetime, ~4,150 hours total, non-renewable.
- **Cat 18:** ≤3 years lifetime, non-renewable.
- **Provisional:** ≤3 years; extensions require BOS approval.

## Probation tracking

CS Rule 117 governs probation but **does not set a global default duration**. Probation
length is per-class, defined in the applicable MOU (typically 6 or 12 months). KosPos
hiring templates should pull probation length from MOU lookup, not hardcode.

- **Resumed probation after break:** max 6 calendar months.
- **Extension to obtain license/certificate:** up to 12 calendar months total (Rule 117.4).
- **Release during probation:** appointing officer may release at any time with written
  notice (Rule 117.9.1).

Police uniformed ranks use Rule 217; Fire uses Rule 317; MTA service-critical uses Rule 417.

## What KosPos models (Phase 6)

- Configurable hiring-process templates per appointment type.
- Per-position hiring tracker: current step, expected fill date.
- Time-to-hire metrics rolled up across positions / templates.
- Eligibility-list links and expiration tracking.
