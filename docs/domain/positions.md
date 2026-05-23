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
