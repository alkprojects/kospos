# Positions

The unit of the org chart is a **Position**, not an Employee. Positions persist whether filled or vacant. An employee fills a position; an employee may also be acting in another position (Vice).

## Core fields (from PS HCM P&P Data)

The canonical labor report has ~88 columns on the `P&P Data` sheet. Key fields for KosPos:

### Identity
| Field | Purpose |
|---|---|
| `Position Number` | Primary key |
| `Position Reports To` | Parent edge — the supervising position |
| `Position Job Code` | Classification |
| `Position Description` | Job title |
| `Position Fill Status` | FILLED / VACANT |
| `Position Status` | Approved / pending |
| `Position Regular or Temporary` | R / T |

### Person (when filled)
| Field | Purpose |
|---|---|
| `Person Full Name` | Name |
| `Preferred Name` | Display name override |
| `Employee Status` | Active, on leave, etc. |
| `Employee Appointment Type` | PCS / PEX / TEX / etc. |
| `EE Exempt Category Description` | Used for audience filtering |
| `IAM Email Address` | Could enable mailto links |

### Department / rollup
| Field | Purpose |
|---|---|
| `Effective Employee Department` | Where the person actually works |
| `Position Department Description` | Where the position is budgeted |
| `Effective Employee Division`, `Position Division` | Same fields one level up |

The hierarchy is **computed at import time** by walking `Position Reports To` pointers from each position up to a root. Don't depend on pre-computed `Level 1`…`Level 11` columns — they aren't in the canonical report.

### Vice / acting
| Field | Purpose |
|---|---|
| `Employee ID Vice 1`, `Employee Name Vice 1` | Person acting in this position (primary) |
| `Employee ID Vice 2`, `Employee Name Vice 2` | Secondary |
| `Previous Employee` | Who held it previously |

When `Vice 1` is populated and ≠ `Current Employee`, the node should indicate "acting."

### Budget
| Field | Purpose |
|---|---|
| `Budget Position Number`, `Budget Position Primary Job Code` | What the position is budgeted as |
| `Budget Position Total FTE`, `Budget FTE 1` | FTE allocation |
| `Budget Department Code 1`, `Budget Department Description 1` | Budgeted department |
| `Split Funded` | Yes/No |

### FTE & substitution (why a position is at most 1.0 FTE)

A budgeted position is **at most 1.0 FTE** — you cannot place multiple PCS employees on one position, so a position's FTE is 1.0 (or its budgeted fraction) on both the PS HCM and BFM sides by construction. An HCM-vs-BFM FTE *mismatch* is therefore not a meaningful data-quality signal; the old **QR-004** "FTE mismatch" rule was removed (S58).

A person on **leave still occupies their position.** While they are out, a **Category 17 Temporary Exempt** substitute can be placed on the **same** position until the original employee returns (see Cat 16/17/18 rules and Temporary Exchange). Employees on leave are *usually* moved to a special "on leave" roster managed by HR — but **not always**, so the roster alone does not reliably detect a leave.

### Compensation (Internal Management audience only)
| Field | Notes |
|---|---|
| `Employee Step` | Sensitive |
| `Employee Hourly Rate` | Sensitive |
| `Employee Merit Increase Date` | Used for step projection |

### RTF (Request to Fill) — vacant positions
| Field | Purpose |
|---|---|
| `Latest RTF ID` | Reference number |
| `RTF Request Action` | What the request is for |
| `RTF Status`, `RTF Approval Step` | Where it is in process |
| `RTF Expected Fill date` | When it'll be filled |
| `Vacant Date` | When the position became vacant |

### Temp / exempt expirations
| Field | Purpose |
|---|---|
| `CAT_17_18 Appointment Date` | When temp appointment started |
| `CAT_17_18 Exempt TX Expired Date` | When it expires |
| `CAT_17_18 Exempt Months` | Months allowed |

## External authoritative rules

The position model in KosPos lives downstream of several SF authorities. When a question
arises about what a field *should* contain or how it *should* be interpreted, follow the
authority map:

- **What classes can exist, and at what pay rate?** → DHR Classification Plan +
  Compensation Manual. See [`authorities.md`](authorities.md) § DHR.
- **What appointment types can fill a position?** → [`appointment-types.md`](appointment-types.md)
  — full Charter §10.104 + CS Rule 114 taxonomy.
- **Who has authority to allocate a position to a class?** → HR Director under Charter
  §10.103. Appeal pathway: CSC Rule 109.
- **What is the position's authorized count?** → Annual Salary Ordinance (ASO), adopted
  by the Board of Supervisors. See [`../data-sources/controller.md`](../data-sources/controller.md).
- **Probation duration for a position's class?** → The applicable MOU (CS Rule 117 does
  *not* set a global default).
- **Time-limit enforcement on Cat 16/17/18 / Provisional?** → Cat 16: 1,040 hrs/FY half-time.
  Cat 17: 2 yrs non-renewable. Cat 18: 3 yrs non-renewable. Provisional: 3 yrs (BOS approval
  beyond). See [`appointment-types.md`](appointment-types.md).
- **Group I 2% workforce cap (§10.104 subs 1-12)?** → Charter §10.104. Citywide tracking;
  MTA has a separate 2.75% cap under §8A.104(i).

KosPos's `Employee Appointment Type` field should map to the codes in
[`appointment-types.md`](appointment-types.md) Quick Reference table. The
`EE Exempt Category Description` field corresponds to the Charter §10.104 sub-section that
authorized the exemption (e.g., "10.104-16" for a Cat 16 appointment, "10.104-14 Inspector
General" for the new IG position).

## Audience visibility matrix (org chart, Phase 10)

| Field group | Internal Mgmt | Internal All Staff | External |
|---|---|---|---|
| Position #, job code, title | ✓ | ✓ | ✓ |
| Person name | ✓ | ✓ | ✓ (filled only) |
| Vacant positions shown | ✓ | ✓ | ✗ |
| Exempt positions shown | ✓ | ✓ | ✗ |
| Acting / Vice info | ✓ | ✓ | ✗ |
| Department / Division | ✓ | ✓ | ✓ |
| Email | ✓ | ✓ | ✗ |
| FTE | ✓ | ✗ | ✗ |
| Salary step / hourly rate | ✓ | ✗ | ✗ |
| RTF status | ✓ | ✗ | ✗ |
| Temp expiration dates | ✓ | ✗ | ✗ |
| Budget mismatch flags | ✓ | ✗ | ✗ |
| Data issue badges | ✓ | ✗ | ✗ |
