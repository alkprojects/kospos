# Chartfields

The accounting dimensions on every transaction. Reports come from PS Financials or OBI.

## The chartfields

| Field | Description | Hierarchy? | Notes |
|---|---|---|---|
| **Fund** | Where money comes from | Yes | Has rules for use |
| **Department** | Group of people the money is for | Yes | Used inconsistently between departments |
| **Project** | Scope of work | No | Used inconsistently |
| **Activity** | Child of project. Ad hoc reporting need | No | Used inconsistently |
| **Authority** | Reflects budget owner | Yes | Used inconsistently |
| **Account** | "What" — kind of expense | Yes | 5xxx salaries, 6xxx benefits, etc. |
| **TRIO** | Transfer in / out | — | |
| **Agency Use** | Used only by select departments | — | |

## Shortcuts

- **Combo Code** — bundles Fund + Dept + Authority. Does NOT include Project / Activity.
- **Task Profile** — bundles all chartfields except Account.

## Default labor posting

- By default, labor posts to the **employee's budgeted chartfields**.
- Combo codes and task profiles **override** these defaults.

## Appropriation control

How PS Financials determines available budget. Three trees:

- **Account tree** — Department (department group), Fund (Level 1), Account (Level 3/5)
- **Project tree** — Department (department group), Fund (Level 1), Project
- **Authority tree** — Department (department group), Fund (Level 1), Authority (Level 1)

Certain accounts (work orders, reserves) are always by themselves.

**Labor actuals always post and ignore appropriation controls.**

## What KosPos models (Phase 3)

- Chartfield reference tree (Fund / Dept / Project / Activity / Authority / Account hierarchies).
- Combo code lookup and task profile lookup.
- For each position: compute default chartfield string + any combo/task overrides → "Where would this position's labor post?"
- Appropriation control tree visualization (which accounts are controlled at which level).

## Open questions

- How are chartfield hierarchies exposed for export? (PS Financials query? OBI report? Snowflake view?) — captured in [`docs/data-sources/ps-financials.md`](../data-sources/ps-financials.md).
