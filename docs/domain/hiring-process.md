# Hiring Process

Different appointment types follow different hiring processes. KosPos models these as user-configurable templates (Phase 6).

## Appointment types

| Type | Full name | Requires exam? | Requires eligibility list? |
|---|---|---|---|
| **PCS** | Permanent Civil Service | Yes | Yes |
| **PEX** | Permanent Exempt | No | No |
| **TEX** | Temporary Exempt | No | No |
| **CAT 16** | Temporary | No | No |
| **CAT 17** | Temporary | No | No |
| **CAT 18** | Temporary (longest allowed) | No | No |

Reference: [Civil Service Rules](../data-sources/civil-service.md) Vol I, Rules 101–122 govern PCS appointments.

## Typical PCS process steps

1. Position posted via RTF
2. Exam announced
3. Exam administered
4. Eligibility list certified by CSC
5. Department requests names from eligible list
6. Interviews
7. Offer
8. Background / fingerprinting
9. Hire date

KosPos lets users define their own ordered process steps per template.

## Time-to-hire metric

Defined per template. Default: days from RTF approval → hire date.

## Eligibility lists

- DHR posts eligibility lists at [`careers.sf.gov/knowledge/process/eligible-lists/`](https://careers.sf.gov/knowledge/process/eligible-lists/).
- Each list has a typical 1-year lifespan.
- KosPos Phase 6 surfaces eligibility-list links per position; later phases may scrape automatically.

## Temp time limits

Cat 16 / 17 / 18 positions have time limits. PS HCM has the `CAT_17_18 Exempt TX Expired Date` field. KosPos data-quality rule: flag any temp employee past their expiration date.

## What KosPos models (Phase 6)

- Configurable hiring-process templates per appointment type.
- Per-position hiring tracker: current step, expected fill date.
- Time-to-hire metrics rolled up across positions / templates.
- Eligibility-list links and expiration tracking.
