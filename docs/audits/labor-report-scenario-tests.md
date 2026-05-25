# Labor-report scenario tests — position-level findings

**Audit run:** 2026-05-25 (autonomous session 17, Task E)
**Inputs:** `Labor Report 5.21.26.xlsx` (P&P Data 604 rows, BI Payroll 110,027 rows, Report Data 798 rows, BFM 15.10.006 FY26 eturn 2,694 rows).
**Tooling:** Python 3.14 + openpyxl `iter_rows(values_only=True)`.

**Purpose:** Per-position / per-employee scenario tests that bridge the
walkthrough docs to KosPos's `lib/quality/` Data Issue categories. Each
scenario: **hypothesis** (drawn from a walkthrough), **test** (Python
query against the workbook), **result** (numbers from the 2026-05-08
snapshot), **implication** for KosPos.

Some overlap with [`bva-reconciliation-suite.md`](bva-reconciliation-suite.md) is
intentional: Task B is **chartfield-grain** reconciliation; Task E is
**position-grain** / scenario-grain. Together they're the evidence base
for the importer's quality-flag set.

## Scenario 1 — Reports-To chain integrity

**Hypothesis** ([Tab 6 § Reports-To validation Improvement
#6](../domain/labor-report.md#6-reports-to-validation--error-vs-noise-framework-sketch)):
the P&P Data Reports-To chain may carry **dangling refs** (parent
position not in P&P), **cycles** (A→B→A or longer), **excessive depth**
(>11 levels), or **empty Reports-To** on non-Commissioner / non-DeptHead
positions (real data issues).

**Test:**

```python
# Build reports_to map; walk every position's chain to root
for pos in all_positions:
    seen = []
    cur = pos
    while cur and cur in reports_to_map:
        if cur in seen:
            cycles.append((pos, seen))
            break
        seen.append(cur)
        cur = reports_to_map[cur]
        if len(seen) > 50: break
# Classify
```

**Result:**

| Check | Count |
|---|---|
| Distinct positions in P&P Data | 568 |
| Empty Reports-To (top of dept-chain) | **7** |
| Dangling Reports-To (parent not in P&P) | **0** ✓ |
| Cycles in reports-to graph | **0** ✓ |
| Positions with depth > 11 | **0** ✓ |

**The 7 empty-Reports-To positions:**

| Position | Job Code | Description | Division | Fill Status | Incumbent | Verdict |
|---|---|---|---|---|---|---|
| 1068950 | 119 | Commissioner 16.700c, No Pay | DBI AdminIstration | PARTIALLY FILLED | Neumann,Bianca L | **OK** — commissioner reports outside dept |
| 1092892 | 116 | Brd Comm Mbr, M=$200/Mtg | CPC Administration | FILLED | Moore,Kathrin | **OK** — commissioner |
| 1094089 | 111 | BdComm Mbr, Grp2,M=$25/Mtg | DBI AdminIstration | PARTIALLY FILLED | Brown,Alyce G | **OK** — commissioner |
| 1097756 | 964 | Dept Head IV | CPC Executive Office | FILLED | Phillips,Sarah Dennis | **OK** — CPC Director reports to Mayor (outside dept) |
| 1125966 | 112 | BdComm Mbr, Grp3,M=$50/Mtg | CPC Current Planning | FILLED | Matsuda,Diane Miyeko | **OK** — commissioner |
| **1146853** | **1304** | **Customer Service Rep** | **CPC Current Planning** | **VACANT** | (Unspecified) | **⚠ DATA ISSUE — vacant non-commissioner with no Reports-To** |
| **1147953** | **1064** | **IS Prg Analyst-Principal** | **CPC Current Planning** | **VACANT** | (Unspecified) | **⚠ DATA ISSUE — vacant non-commissioner with no Reports-To** |

**Findings:**

1. **The reports-to graph is structurally sound.** No dangling refs, no
   cycles, no depth violations. This is the cleanest data-quality
   dimension of the workbook.
2. **5 of 7 empty Reports-To are legitimate** (commissioners + the CPC
   Director, all of whom report outside the dept). The other **2 are
   real data issues** — vacant CPC Current Planning positions
   (1146853 Customer Service Rep + 1147953 IS Prg Analyst-Principal)
   with no manager assigned. These were probably forgotten during
   position creation.

**KosPos surfaces this as:** _Data Issue category_ —
**`reports-to-empty-non-commissioner`**. Allow-list:
- Job codes in the Commissioner / Board Member / Dept Head ranges
  (codes 111, 112, 116, 119, 964, 965, etc., plus general "Dept Head
  N" codes).
- All others get flagged.

Per [Tab 6 Improvement
#6](../domain/labor-report.md#6-reports-to-validation--error-vs-noise-framework-sketch),
this becomes part of the "generated correction list" that
[Tab 21 Reporting Tree](../domain/labor-report.md#tab-21--reporting-tree)
will surface.

## Scenario 1b — Pool position census (extending [Task B Test 5](bva-reconciliation-suite.md))

**Hypothesis** ([Tab 20 § Pool positions](../domain/labor-report.md#multi-dept-generalization-caveats-dbi-shortcuts-to-undo)):
the 36 duplicate-row positions are dominated by commissioners (ELC
appointment type); some are temp pools (TEX) for back-to-back hires on
the same position number.

**Test:** Group Report Data per-position rows by Position Number; count
rows per position; for each pool position (2+ rows), look up the P&P
Data `Position Description` + `Position Division` + `Employee
Appointment Type`.

**Result:**

| Position | Rows | Description | Division | Appt Type | Classification |
|---|---|---|---|---|---|
| 1094089 | 14 | BdComm Mbr, Grp2,M=$25/Mtg | DBI AdminIstration | **ELC** | **Commissioner pool** |
| 1068950 | 7 | Commissioner 16.700c, No Pay | DBI AdminIstration | **ELC** | **Commissioner pool** |
| 1125966 | 7 | BdComm Mbr, Grp3,M=$50/Mtg | CPC Current Planning | **ELC** | **Commissioner pool** |
| 1092892 | 7 | Brd Comm Mbr, M=$200/Mtg | CPC Administration | **ELC** | **Commissioner pool** |
| 1158719 | 3 | Planner 1 | CPC Current Planning | **TEX** | **Back-to-back temp** |
| 1119083 | 2 | Permit Technician I | DBI Inspection Services | **TEX** | **Back-to-back temp** |
| 1120980 | 2 | Permit Technician I | DBI Inspection Services | **TEX** | **Back-to-back temp** |
| 1116244 | 2 | Pr Administrative Analyst | CPC Administration | **TEX** | **Back-to-back temp** |

**Findings:**

1. **4 pool positions are Commissioner / Board Member roles (ELC)** —
   intentional pools. Total: 35 dup rows.
2. **4 pool positions are Temp Exempt (TEX)** — back-to-back temp
   hires on the same permanent slot. Total: 9 dup rows. These are
   operationally legitimate (when one TEX expires, hire the next
   into the same slot) but each new hire could/should have its own
   position number per "one-position-per-incumbent" best practice.

**KosPos surfaces this as:** _Data Issue category_ — **`pool-position-detected`**.
Per-position recommendation:
- **ELC commissioner pools**: keep as pool; flag as "intentional pool";
  display with `(N incumbents)` badge in [OPS
  Detail](../domain/labor-report.md#tab-27--operating-report-detail).
- **TEX back-to-back temp pools**: recommend split into per-incumbent
  positions for cleaner historical attribution. User decides per-position.

## Scenario 3 — Cat 17/18 expiry warning (already-expired emphasized)

**Hypothesis** ([Tab 6 § Cat 17/18 + appointment-types.md](../domain/appointment-types.md)):
some positions have `CAT_17_18 Exempt TX Expired Date` in the **past**
(employees operating beyond their legal exempt-appointment expiry) and
some are **approaching** the 90-day expiry window.

**Test:** Walk every P&P Data row's `AY = CAT_17_18 Exempt TX Expired
Date`. Classify each populated date as already-expired, expiring within
90 days (by 2026-08-23), or future-expiring.

**Result:**

| Bucket | Count |
|---|---|
| Already-expired (`expire_date < 2026-05-25`) | **7** ⚠ |
| Expiring within 90 days (2026-05-25 to 2026-08-23) | **0** |
| Future-expiring (> 90 days out) | **22** |
| Total populated AY | **29** |

**The 7 already-expired positions:**

| Days expired | Position | Cat | Job code | Incumbent |
|---|---|---|---|---|
| 728d ago (2024-05-27) | 1153892 | 18 | 931 | Flores, Claudia |
| 658d ago (2024-08-05) | 1154621 | 18 | 1657 | Tamimi, Katherine V |
| 614d ago (2024-09-18) | 1130165 | 18 | 5277 | Mccallum, William T. |
| 245d ago (2025-09-22) | 1120980 | 17 | 6321 | Ng, Donna |
| 226d ago (2025-10-11) | 1119083 | 17 | 6321 | Carrion, Jaime |
| 86d ago (2026-02-28) | 1138888 | 18 | 933 | Mayer, Rebecca V |
| 30d ago (2026-04-25) | 1116244 | 17 | 1823 | Chen, Josephine |

**Findings:**

1. **7 positions are operating past their Cat 17/18 expiry date.** The
   oldest is 2 years past (Flores, 728 days). This is a serious
   data-quality issue — these employees should either have been
   converted to permanent (PCS) or terminated by their expiry date,
   per CSC Rule 113.5.
2. **No positions expire within the next 90 days**, so KosPos's
   90-day-horizon warning would be quiet — but the immediate "expired
   already" backlog needs attention.

**KosPos surfaces this as:**

- _Data Issue category 1_ — **`cat-17-18-expired`**. Hard red flag with
  days-past-expiry. Each row needs: convert to PCS, terminate, or
  document override.
- _Data Issue category 2_ — **`cat-17-18-expiring-soon`** (within 90
  days). Yellow warning with countdown. Currently 0 active warnings.

## Scenario 4 — Cat 16 hours-approaching-cap

**Hypothesis** ([appointment-types.md](../domain/appointment-types.md)):
Cat 16 (Temp & Seasonal) employees are capped at 1,040 hours per FY. Any
Cat 16 employee with hours > 80% of cap deserves a warning.

**Test:** Find every P&P Data row with `EE Exempt Category Description`
starting with `"16"`. For each, look up their Person Number in BI
Payroll and sum `AJ Earning Hours` for FY26.

**Result:** Only **1** Cat 16 employee in P&P Data this snapshot:

| Position | Person | Name | Appt | Job Code | FY26 hours | % of 1040 cap |
|---|---|---|---|---|---|---|
| 1159156 | 187518 | Guaiumi, Jimmy | TEX | 6333 | **1,792.0** | **172.3%** ⚠ |

**Findings:**

1. **Cat 16 employee Guaiumi is at 172% of the 1,040-hour cap.** Either:
   - **The cap rule is misunderstood** — 1,040 hours might be a
     rolling/lookback figure not an FY26 figure (e.g., per CSC Rule
     114.5 the 1,040 could be over a 2-year period; needs verification
     during Tab 12 TEMP Limits walkthrough).
   - **The employee is also working in a different appointment
     category for some hours** — the 1,792 hours mixes Cat 16 and
     non-Cat 16 work. P&P Data lists Guaiumi as "TEX" appointment,
     not "Cat 16" — possibly the `EE Exempt Category Description = 16`
     is stale and the employee has since converted to TEX, but the
     P&P Data column wasn't updated.
   - **The 1,040 cap is being violated**, with operational consequence
     CSC may impose.
2. **n=1 is a tiny sample** — KosPos's Cat 16 monitoring becomes
   significantly more important in departments that hire seasonal /
   summer-intern staff (DPW, Rec & Park, etc.).

**KosPos surfaces this as:** _Data Issue category_ — **`cat-16-hours-cap-warning`**.
- > 100% of cap = hard red flag (cap violation)
- 80-100% of cap = yellow warning
- < 80% = no flag
- Cross-check P&P Data's appointment type against the BI Payroll
  earnings codes (TEX vs Cat 16); if they disagree, flag as
  `appt-cat-mismatch`.

## Scenario 5 — Vacant-but-no-RTF

**Hypothesis** ([Tab 6 § Improvement #10](../domain/labor-report.md#kospos-improvements)):
every position with `Fill Status = VACANT` and `Latest RTF ID` blank
(and not a pool position) is a Request-To-Fill gap.

**Test:** Filter P&P Data for `Fill Status = VACANT AND Latest RTF ID IS NULL
AND Exclude != 'Y'`.

**Result:** **5 positions**:

| Position | Job Code | Description | Division |
|---|---|---|---|
| 1102940 | (TBD) | Dep Dir III | CPC Administration |
| 1122053 | (TBD) | IS Business Analyst-Senior | CPC Administration |
| 1124404 | (TBD) | Planner 4-Environmental Review | CPC Environmental Planning |
| 1149546 | (TBD) | IS Programmer Analyst-Senior | DBI AdminIstration |
| 1149556 | (TBD) | Building Inspector | DBI Permit Services |

**Findings:**

1. **5 vacant positions have no RTF on file.** None are pool positions.
   These positions exist but no one is actively recruiting for them —
   either intentional holds (budget reasons) or oversights.
2. **The 5 distribute 3 CPC + 2 DBI** — consistent with CPC's general
   higher-vacancy posture post-merger.

**KosPos surfaces this as:** _Data Issue category_ —
**`vacant-no-rtf`**. Yellow flag per position with options: (a) add
RTF, (b) mark as "intentional hold" with reason, (c) consider
de-funding (if held > 6 months without RTF).

## Scenario 6 — PEX-on-Cat-18 enumeration

**Hypothesis** ([Tab 6 § Open Question
#1](../domain/labor-report.md#open-questions--todo)): 15 PEX-on-Cat-18
rows look like Exempt-to-Permanent conversions. Verify the list and
make it actionable.

**Test:** Filter P&P Data for `Employee Appointment Type = 'PEX' AND
EE Exempt Category Description` starts with `'18'`.

**Result:** **15 rows** confirmed:

| Position | Name | Job | Title | Division |
|---|---|---|---|---|
| 1046023 | Wilkinson-Church, Mary | 933 | Manager V | DBI Permit Services |
| 1101847 | Wall Shui, Megan I | 1825 | Prnpl Admin Analyst II | CPC Current Planning |
| 1115135 | Jacobo, Marco | 5203 | Assistant Engineer | DBI Permit Services |
| 1122011 | Chen, Lisa C | 923 | Manager II | CPC Environmental Planning |
| 1131881 | Wietgrefe, Carla K | 9775 | Sr Community Dev Spec 2 | CPC Community Equity |
| 1131898 | Gluckstein, Lisa | 923 | Manager II | CPC Citywide Planning |
| 1138888 | Mayer, Rebecca V | 933 | Manager V | CPC Current Planning |
| 1139882 | Omran, Kelley F | 1312 | Public Information Officer | DBI AdminIstration |
| 1146752 | Hanna, Tate | 1824 | Pr Administrative Analyst | DBI AdminIstration |
| 1146851 | Gladney, Jacquline D | 1304 | Customer Service Rep | CPC Current Planning |
| 1146859 | Sherbin, Theodore | 1051 | IS Business Analyst-Assistant | CPC Current Planning |
| 1146860 | Pettus, Brian W | 1823 | Senior Administrative Analyst | CPC Current Planning |
| 1152343 | Butler, Stephen R | 1043 | IS Engineer-Senior | CPC Current Planning |
| 1152344 | Tek, Vigeth | 1092 | IT Operations Support Admin II | CPC Current Planning |
| 1158346 | Hankins, Ethan T | 1822 | Administrative Analyst | DBI Permit Services |

**Findings:**

1. **The PEX-on-Cat-18 count is exactly 15** as Tab 6 originally noted.
   No drift in this snapshot.
2. **CPC dominates the list (10 of 15)** — consistent with CPC's
   higher use of Cat 18 Special Project appointments (limited-term
   positions tied to specific grants / initiatives).
3. **Two interpretations**: (a) classification error in PS HCM —
   PEX appointment type doesn't fit Cat 18; (b) the `EE Exempt
   Category Description` column reflects the *position*'s exempt
   designation rather than the *appointment*, so PEX-on-Cat-18 is
   legitimate if the position is Cat 18 but the incumbent's
   appointment converted. **Alex to confirm during DHR walkthrough.**

**KosPos surfaces this as:** _Data Issue category_ —
**`appt-cat-mismatch-pex-cat18`**. Yellow flag; per-position drill-down
shows the appointment-history if available.

## Scenario 7 — Sick-leave bucket size

**Hypothesis** ([Tab 7 § Controller-side data
masking](../domain/labor-report.md#controller-side-data-masking-sick-leave-bucket)):
the `XXX = "***Unspecified***"` masked sick-leave bucket is ~4.2% of
FYTD payroll = ~$3.51M in this snapshot. Verify the constant hasn't
drifted.

**Test:** Sum `BI Payroll!AL Balance Amount` filtered to `EC = 'XXX'`.

**Result:**

| Metric | Value |
|---|---|
| Total BI Payroll YTD | $84,252,500.67 |
| XXX bucket | **$3,507,981.73** |
| XXX as % of total | **4.16%** ✓ |
| Tab 7 doc constant | $3.51M / 4.2% |
| **Match** | **YES — within $2k / 0.04%** ✓ |

**Findings:**

1. **The Controller-side sick-leave bucket constant matches** the
   workbook snapshot exactly. The Tab 7 doc's `$3.51M / 4.2%` figure
   is current.
2. **No need to update the doc** — the constant holds.

**KosPos surfaces this as:** _Data Issue category_ — **`sick-leave-bucket-size`**.
Not a flag, just a transparency note: "$X of YTD payroll is in the
Controller's masked sick-leave bucket. This is expected." Updated on
every BI Payroll snapshot.

## Scenario 8 — Negative or zero Balance Amount rows

**Hypothesis** ([Tab 7 § Improvement #8](../domain/labor-report.md#kospos-improvements-1)):
top 20 most-negative Balance Amount rows in BI Payroll surface
retroactive payroll adjustments worth flagging.

**Test:** Filter BI Payroll for `Balance Amount < 0`. Sort by amount
ascending. Take top 20.

**Result:** **20 negative-balance rows total** in the snapshot
(coincidentally exactly the top-20 cap):

| Amount | Person | Name | Earnings Code | Description | Account |
|---|---|---|---|---|---|
| -$14,442.75 | 20536 | Power, Robert | OTP | Overtime Pay 1.5 | 511010 |
| -$9,650.00 | 69704 | Lewis-Koskinen, Alex | ELP | Management Leave Pay | 501050 |
| -$9,650.00 | 69704 | Lewis-Koskinen, Alex | FHP | Floating Holiday Pay | 501050 |
| -$5,234.85 | 208411 | Gladney, Jacquline D | _(blank)_ | _(blank)_ | 515010 |
| -$2,829.20 | 37602 | Kwan, Alex | VAP | Vacation Leave Pay | 501040 |
| -$1,925.70 | 183146 | Kelly, James L | XXX | ***Unspecified*** | 501020 |
| -$1,914.00 | 37334 | Snyder, Mathew | VAP | Vacation Leave Pay | 501040 |
| -$1,560.80 | 37009 | Walls, Mark G | FHP | Floating Holiday Pay | 501050 |
| -$1,531.65 | 37334 | Snyder, Mathew | VAP | Vacation Leave Pay | 501040 |
| -$1,185.60 | 35771 | Oropeza, Edgar | JDP | Jury Duty Leave Pay | 501050 |
| -$1,063.71 | 156740 | Race, Patrick B | _(blank)_ | _(blank)_ | 515710 |
| -$765.45 | 37334 | Snyder, Mathew | VAP | Vacation Leave Pay | 501040 |
| -$499.40 | 173445 | Lamb, Benjamin I | WKP | Regular Hours - Worked | 501010 |
| -$383.10 | 37334 | Snyder, Mathew | VAP | Vacation Leave Pay | 501040 |
| -$318.69 | 20536 | Power, Robert | _(blank)_ | _(blank)_ | 514010 |
| -$298.60 | 215056 | Brooks, Heather L | JDP | Jury Duty Leave Pay | 501050 |
| -$259.65 | 37334 | Snyder, Mathew | _(blank)_ | _(blank)_ | 515710 |
| -$74.53 | 20536 | Power, Robert | _(blank)_ | _(blank)_ | 514020 |
| -$51.03 | 20536 | Power, Robert | _(blank)_ | _(blank)_ | 515030 |
| -$1.90 | 184562 | Hamidi, Masoud M | XXX | ***Unspecified*** | 501020 |

**Findings:**

1. **Power, Robert has 5 negative-amount rows totaling -$14,887** — a
   pattern that suggests a single retroactive adjustment touched
   multiple earnings codes for one person.
2. **Snyder, Mathew has 4 negative-VAP rows + 1 negative-(blank)
   row** — retroactive vacation-leave-pay corrections, suggesting a
   timekeeping error that touched multiple PPs.
3. **Lewis-Koskinen, Alex has 2 large -$9,650 rows** (ELP + FHP) —
   even-amount pair on Management Leave and Floating Holiday; likely
   one specific accrual reclassification.
4. **5 of 20 negative rows have blank Earnings Code** — these are
   payroll-system adjustments that bypass the earnings-code routing,
   posting directly to fringe-benefit accounts (515xxx). Worth a
   second look during the Tab 16 / 19 walkthroughs.

**KosPos surfaces this as:** _Data Issue category_ —
**`negative-balance-amount`**. Per-person aggregation; surface as
"$X retroactive correction for person Y, posted in PP ZZ." Not a flag
to fix — just transparency about what's happened.

## Scenario 9 — Earnings-code orphans

**Hypothesis** ([Tab 7 § Improvement #8](../domain/labor-report.md#kospos-improvements-1)):
earnings codes appearing in BI Payroll that don't map to any documented
routing rule are silently un-aggregated.

**Test:** Count distinct `(EC, EC Desc)` pairs by total Balance Amount.
Compare to documented routing (VPO/SVO=RPO, OTP=OT, XXX=sick,
L08/289=premium, etc.).

**Result:** **58 distinct earnings codes** in BI Payroll. Top 30 by
absolute dollar amount:

| EC | Description | YTD $ | Routing |
|---|---|---|---|
| WKP | Regular Hours - Worked | $49,132,034 | (regular labor) |
| _(blank)_ | _(blank)_ | $21,408,131 | **⚠ 25% of total flows through blank-EC adjustments** |
| **XXX** | ***Unspecified*** | $3,507,982 | documented (sick-leave bucket) |
| VAP | Vacation Leave Pay | $3,379,981 | (regular labor) |
| LHP | Legal Holiday Pay | $2,624,375 | (regular labor) |
| FHP | Floating Holiday Pay | $1,236,676 | (regular labor) |
| **VPO** | Vacation Pay Out | $533,930 | documented (RPO) |
| **OTP** | Overtime Pay 1.5 | $423,203 | documented (OT) |
| CTP | Comp Time Pay | $414,080 | (regular labor — comp time worked) |
| **253** | Certification Prem - 6% | $265,360 | _(no doc; should route to PREMM)_ |
| **SVO** | Severance Pay Out | $149,019 | documented (RPO) |
| **125** | Certification Prem - 4% | $132,742 | _(no doc; PREMM)_ |
| **269** | Structural Eng Prem - 10.27% | $124,496 | _(no doc; PREMM — flagged as Tab 7 open question)_ |
| ELP | Management Leave Pay | $116,788 | (regular labor — mgmt accrual) |
| PRP | Parental Leave Pay | $106,790 | (regular labor — leave) |
| JDP | Jury Duty Leave Pay | $86,428 | (regular labor — leave) |
| **113** | Certification Prem - 2% | $64,059 | _(no doc; PREMM)_ |
| **335** | Certification Prem - 2.5% | $63,834 | _(no doc; PREMM)_ |
| RRB | Retro Bonus Payout | $56,805 | (premium-like; check routing) |
| HBP | Holiday Bank -Paid | $56,318 | (regular labor — paid holiday) |
| **289** | Bilingual Pay - $60.00 | $54,240 | documented (PREMM) |
| **S48** | Standby Pay Pager - 10% | $44,720 | _(no doc; PREMM)_ |
| **318** | Certification Prem - 5.5% | $42,790 | _(no doc; PREMM)_ |
| CPO | Comp Time Pay Out | $38,579 | (RPO — comp time payout) |
| **117** | Certification Prem - 3% | $30,495 | _(no doc; PREMM)_ |
| **L08** | Lead Worker Pay - $5 | $22,410 | documented (PREMM) |
| **332** | Certification Prem – 1% | $15,162 | _(no doc; PREMM)_ |
| **600** | Architect License Prem - 5% | $14,597 | _(no doc; PREMM)_ |
| **601** | Backflow Cert Prem 5% | $14,456 | _(no doc; PREMM)_ |
| RRG | Retro Regular | $13,541 | (regular labor — retroactive) |

**Findings:**

1. **The `(blank)` earnings-code bucket carries $21.4M** = 25% of
   FYTD payroll. This is **payroll-system fringe-benefit postings**
   (retirement, health, dependent coverage, etc.) that flow through
   GL journal entries rather than per-PP earnings codes. **All 21M is
   accounted-for at the chartfield level via BVA** (per the
   Mandatory Fringe Benefits accounts in
   [`bva-reconciliation-suite.md`](bva-reconciliation-suite.md) § Test 2).
2. **20+ Premium / Certification codes are not in the documented
   routing rule.** Each posts to its own dollar amount but only those
   explicitly named in OPS Summary's PREMM filter get aggregated:
   - Documented: **L08, 289**.
   - **Not yet documented (should all route to PREMM)**: 253, 125,
     269, 113, 335, S48, 318, 117, 332, 600, 601, plus probably more
     in the long-tail. Total $1.0M+ of premium pay that could be
     under-counted by name-based filters.
3. **The Tab 7 open question about Structural Eng Prem 269 ($124k)**
   is the largest single un-documented premium. **Pending Tab 16
   walkthrough.**

**KosPos surfaces this as:**

- _Data Issue category 1_ — **`earnings-code-undocumented`**. Every EC
  not in the documented routing map gets flagged. Default route per
  pattern: `^[0-9]{3}$` codes → PREMM; codes named with "Prem" → PREMM;
  codes named with "Out" or "Payout" → RPO. The user can override per
  code.
- _Data Issue category 2_ — **`earnings-code-zero-routing`**. If a
  code is not in any documented routing AND its YTD $ is non-zero,
  it's silently absorbed into the dept-total per-position rollup.
  Surface during Phase 2.4 importer build with the actual constant
  list.

## Aggregate findings

**Cross-scenario:**

1. **Position 1138888 (Mayer, Rebecca V)** appears in **3 separate
   scenarios**: (a) Cat 18 already-expired 86d ago (Scenario 3), (b)
   PEX-on-Cat-18 row (Scenario 6), and (c) — implicitly — would have
   been on the vacant-no-RTF list once the appointment expired
   (Scenario 5) if the workbook auto-vacates expired-Cat-18 positions.
   The same position recurring across scenarios is a smell that
   **the Cat 18 expiry was missed by HR + the dept**.
2. **The 7 already-expired Cat 17/18 positions** = the **#1
   actionable finding** of this audit. Even if none are violations
   (e.g., extensions were granted but not entered into PS HCM), KosPos's
   automated flag would have caught each by its expiry date and
   prompted action.
3. **20+ un-documented premium pay codes** = the **#1 importer
   improvement** of this audit. KosPos's routing map must enumerate
   every certification / premium / standby code, not just the canonical
   handful.

**What this audit does NOT cover:**

- T&L Task Profile validation (no Task Profile data in the workbook
  yet; Phase 5+).
- Combo-code drift detection (covered partially by Tab 6 walkthrough;
  Phase 3 chartfields).
- RTF aging (how long has each open RTF been pending? — Phase 6 hiring).
- Probation date tracking (Tab 10).

## Cross-references

- [`../domain/labor-report.md`](../domain/labor-report.md) — Tabs
  5/6/7/20/26/27.
- [`bva-reconciliation-suite.md`](bva-reconciliation-suite.md) — Task B
  chartfield-grain audit.
- [`labor-report-walkthrough-audit.md`](labor-report-walkthrough-audit.md) —
  Task D's anchor + TODO triage.
- [`../domain/appointment-types.md`](../domain/appointment-types.md) —
  appointment-type taxonomy.
- [`../domain/special-class.md`](../domain/special-class.md) —
  special-class definitions.
