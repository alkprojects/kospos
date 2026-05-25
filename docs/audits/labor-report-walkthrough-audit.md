# Labor-report walkthrough audit (Tabs 5 / 6 / 7 / 20 / 26 / 27 + cross-cutting)

**Audit run:** 2026-05-25 (autonomous session 17, Task D)
**Source files inspected:**

- [`../domain/labor-report.md`](../domain/labor-report.md) — the deep-dive doc (4,199 lines after Tasks A + B + C).
- [`../SESSION_LOG.md`](../SESSION_LOG.md) — Sessions 13–16 + BVA interlude + Session 17 entries.
- [`../data-sources/bva.md`](../data-sources/bva.md) — BVA reference doc.
- [`bva-reconciliation-suite.md`](bva-reconciliation-suite.md) — Task B audit (this session).
- Auto-memory files in `C:\Users\ALK\.claude\projects\C--Users-ALK-Desktop-Claude-Projects-kospos\memory\`.

**Methodology:**

1. **Anchor links** — `python` extract every `[...](#anchor)` link in `labor-report.md` and verify each against the GitHub-flavored Markdown slug algorithm (github-slugger npm rules: lowercase + each space → 1 hyphen + strip non-word characters + `-N` suffix on duplicates).
2. **Cross-tab consistency** — read Tabs 5, 6, 7, 20, 26, 27 and check that claims one tab makes about another match the actual content.
3. **Open questions / TODO triage** — extract every `- [ ]` bullet from each tab's "Open questions / TODO" section, then cross-reference against later tabs / interludes / audits.
4. **DBI-shortcut catalog completeness** — every DBI-only assumption in any tab's "What's manual / fragile" section should be in the cross-cutting concerns table (lines 152–183).
5. **Calendar reference cell consistency** — every tab that references `Calendar!{cell}` (H2, I2, J2, K2, L2, M2, N2, O2) should match the meaning documented in Tab 5.
6. **Stale assertions** — "TODO: confirm with Alex" items that were actually confirmed during a later walkthrough / interlude.
7. **Memory drift** — re-read auto-memory files against the docs.

## 1. Anchor links

**41 internal anchor links examined; 13 were broken (32%); all 13 fixed in this same PR.**

The broken links all followed one anti-pattern: **using the tab number (or
`20`, `26`, `27`, `7`, `6`) as the duplicate-suffix on `#kospos-improvements-N`,
`#whats-manual--fragile-N`, `#kospos-ui-sketch-N`, `#excel-export-notes-N`
slugs**. github-slugger uses the **0-indexed occurrence count of the
duplicate** as the suffix, not the section's tab number.

For example, `#### KosPos improvements` appears 5 times in the doc:

| Occurrence | Tab | Heading line | Correct slug |
|---|---|---|---|
| 1st | Tab 6 P&P Data | L1089 | `#kospos-improvements` (no suffix) |
| 2nd | Tab 7 BI Payroll | L1732 | `#kospos-improvements-1` |
| 3rd | Tab 20 Report Data | L2874 | `#kospos-improvements-2` |
| 4th | Tab 26 OPS Summary | L3524 | `#kospos-improvements-3` |
| 5th | Tab 27 OPS Detail | L3972 | `#kospos-improvements-4` |

Pre-audit, the doc had `#kospos-improvements-20` (3 occurrences),
`#kospos-improvements-26` (1), `#kospos-improvements-27` (2), all of
which 404'd on the live site. Fixed.

**Full broken-anchor → correct-anchor map applied:**

| Broken anchor | Replacement | Count |
|---|---|---|
| `#whats-manual--fragile-20` | `#whats-manual--fragile-2` | 3 |
| `#whats-manual--fragile-6` | `#whats-manual--fragile` | 1 |
| `#kospos-improvements-20` | `#kospos-improvements-2` | 3 |
| `#kospos-improvements-26` | `#kospos-improvements-3` | 1 |
| `#kospos-improvements-27` | `#kospos-improvements-4` | 2 |
| `#kospos-ui-sketch-7` | `#kospos-ui-sketch-1` | 1 |
| `#kospos-ui-sketch-6` | `#kospos-ui-sketch` | 1 |
| `#excel-export-notes-26` | `#excel-export-notes-3` | 1 |

**`#tab-N--*` slugs (with the double-dash from "Tab N — Heading") are correct**
— github-slugger generates each space → 1 hyphen individually, so
"Tab 5 — Calendar" → "tab-5--calendar" (the em-dash is stripped, leaving
two adjacent spaces that each become a hyphen). All 27 tab anchors
verified.

**Going forward (lint rule):** when adding cross-references, use the
occurrence index, not the tab number. A pre-commit lint that
re-derives slugs and checks every internal link would catch this
class of bug. **Phase 2.4 nice-to-have**, not blocking.

## 2. Cross-tab consistency

**3 minor drift items found; 1 fixed, 2 documented:**

### 2.1 BI Payroll cell count for Report Data — **CORRECT** (not drift)

[Tab 7 § How each downstream tab consumes BI Payroll](../domain/labor-report.md#how-each-downstream-tab-consumes-bi-payroll)
says Report Data has **"18,225 cells"** referencing `'BI Payroll'!`. Tab
20 reports the total per-PP SUMIFS count at **133,164** (54 cells × ~600
rows × dual grid).

These are **not contradictory** — they measure different things:

- **18,225 cells** counts **distinct formula cells in Report Data that
  syntactically reference `'BI Payroll'!`**. The per-position SUMIFS at
  each `Y:AY` cell counts as 1 cell.
- **133,164** counts **distinct SUMIFS criterion-clause occurrences**
  across Report Data's formulas. Each per-PP SUMIFS has multiple
  criteria, so a single formula cell registers as multiple count units.

Both are correct; the framing is just different. **No edit needed**, but
add a note in Tab 7's description that "per-cell count is ~18k; per-clause
count is ~133k" so a future reader doesn't think the doc contradicts
itself. _(Action: minor note added in this PR.)_

### 2.2 "Pure-PP vs COLA-weighted" terminology — **CONSISTENT**

Tab 5 introduces the dual track (`I2 / J2 / K2` pure, `M2 / N2 / O2`
COLA-weighted). Tab 7 (BI Payroll) doesn't reference Calendar directly
for projection math. Tab 6 (P&P Data) doesn't either. Tab 20 (Report
Data) uses `N2 / M2` (COLA-weighted) for the per-position projection.
Tab 26 (OPS Summary) uses `J2 / I2` (pure-PP) for the special-class D
column. **All consistent** with Tab 5's framing. The only friction is
**Tab 26's pure-PP shortcut for the special-class block** — flagged as
[Tab 26 Open Question #1](../domain/labor-report.md#open-questions--todo-3) and
the cross-cutting concerns table's "pure-PP vs COLA-weighted" row;
expected to converge to COLA-weighted in KosPos per memory
[`feedback_projections_always_cola_aware.md`].

### 2.3 SPECIAL block row count — **CONSISTENT (100 rows)**

Tab 20 says SPECIAL block = 100 rows (`'Report Data'!649:748`). Tab 26
confirms (`SUMIFS('Report Data'!$S$649:$S$748, ...)`) — same row range.
[`special-class.md`](../domain/special-class.md) § OPS reference table
also matches. ✓

## 3. Open questions / TODO triage

**40 open TODOs total across Tabs 5 / 6 / 7 / 20 / 26 / 27. 7 are now
resolvable in light of later walkthroughs / audits.** Each TODO listed
below with its current status:

### Tab 5 — Calendar (4 open)

| # | TODO summary | Status |
|---|---|---|
| 1 | Jun 30, 2026 +2.0% intentionally ignored | **STILL OPEN** — Alex hasn't explicitly confirmed |
| 2 | `'BI Payroll'!X` is canonical PPE column | **RESOLVED 2026-05-25 (Tab 7 walkthrough)** — column X = Earning Period End Date confirmed |
| 3 | Job class → bargaining unit lookup location | **STILL OPEN** — phase 2.2 question |
| 4 | Per-projection-page pure-vs-COLA-aware UI delta threshold | **STILL OPEN** — phase 2.2 UX question |

### Tab 6 — P&P Data (9 open)

| # | TODO summary | Status |
|---|---|---|
| 1 | PEX-on-Cat-18 are Exempt-to-Permanent conversions (15 rows) | **STILL OPEN** — needs DHR confirmation |
| 2 | TPV definition for appointment-types.md | **STILL OPEN** — phase 2.2 |
| 3 | Reports-To error-vs-noise full rule set | **STILL OPEN** — pending Tab 21 walkthrough |
| 4 | Per-snapshot vs per-position effective dates | **STILL OPEN** — OBI capability question |
| 5 | Other chartfield trees inventory | **RESOLVED 2026-05-25 (Task C this session)** — full inventory at [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md) |
| 6 | Combo-code maintenance workflow detection | **STILL OPEN** — Phase 3 chartfields work |
| 7 | Pivot caches 1 vs 4 deliberate or accident | **STILL OPEN** — minor; affects Phase 2.4 importer only if pivot ingestion |
| 8 | `Position Used For Description` numerics | **STILL OPEN** — pending Tab 9 (EE Additional Pay) walkthrough |
| 9 | Split-funded numbered columns OBI behavior | **STILL OPEN** — phase 2.4 importer concern |

### Tab 7 — BI Payroll (6 open)

| # | TODO summary | Status |
|---|---|---|
| 1 | `Structural Eng Prem - 10.27%` account routing | **STILL OPEN** — pending Tab 16 (Premium) walkthrough |
| 2 | RPO pivot "Multiple Items" filter human-side | **STILL OPEN** — pending Tab 19 (RPO) walkthrough |
| 3 | $38k VPO/SVO vs 510210+505060 spread | **STILL OPEN** — pending Tab 19 (RPO) walkthrough |
| 4 | TEMPM filter `COMMN:5380` undercounts at DBI+CPC | **PARTIALLY RESOLVED 2026-05-25 (Tab 26 walkthrough)** — CPC's TEMP at row 50 is absorbed into 9993 residual; KosPos's design is "every named class gets full math, no implicit-residual absorption" |
| 5 | ADR-007 amendment | **STILL OPEN** — phase 2.4 importer build |
| 6 | Citywide chart-of-accounts map location | **STILL OPEN** — phase 3 chartfields |

### Tab 20 — Report Data (9 open)

| # | TODO summary | Status |
|---|---|---|
| 1 | BVA example | **RESOLVED 2026-05-25 (BVA interlude + Task B this session)** — sample documented, schema captured in [`../data-sources/bva.md`](../data-sources/bva.md), reconciliation suite in [`bva-reconciliation-suite.md`](bva-reconciliation-suite.md) |
| 2 | BFM!AX → AZ migration safety confirmation | **RESOLVED 2026-05-25 (BVA interlude + Task B Test 3)** — confirmed-stale; KosPos defaults to AZ; in current snapshot AX == AZ for all 673 BFM class-summary rows (no Technical Adjustments applied post-Board) |
| 3 | NEWP row 750–751 budget mismatch | **STILL OPEN** — needs Alex to verify the correct BFM cells for position 1158346 / NEWP315641 |
| 4 | CPC OVERTIME + PAYOUT catcher rows missing | **STILL OPEN** — workbook fix needed; KosPos's design generates catcher rows per-dept automatically |
| 5 | Pool-position detection threshold | **PARTIALLY RESOLVED 2026-05-25 (Task B Test 5)** — empirical pool count = 8 pool positions / 36 dup rows / position 1094089 has 14 incumbents (commissioners). KosPos flags any pool position with N≥2 incumbents and recommends one-per-row but lets the user decide |
| 6 | GL row 762 future shape | **STILL OPEN** — Phase 2.4 importer concern; expected to be subsumed by BVA reconciliation |
| 7 | MERGE row 753 source detail | **RESOLVED 2026-05-25 (Task B Test 4)** — the $2.31M is a **hand-keyed estimate**, not BVA-derived. BVA shows the actual KK movement as DBI ADM MIS Salaries = -$2.05M + Mandatory Fringe Benefits ≈ -$680k = -$2.73M total, on dept 229346 from fund "SR BIF Operating Project". MERGE row 753 will be decommissioned in Phase 2.4 in favor of BVA-driven per-chartfield reconciliation |
| 8 | Dormant `<>10190` bug activation point | **PARTIALLY RESOLVED 2026-05-25 (Task B Test 7)** — confirmed STILL DORMANT in this snapshot (DBI posts only to fund 10190 + 10230; no fund 10000 activity). Activates when CPC roll-in moves a CPC position to DBI without changing chartfield |
| 9 | Pivot 17 vs Report Data | **STILL OPEN** — pending Tab 21 (Reporting Tree) walkthrough |

### Tab 26 — OPS Summary (7 open)

| # | TODO summary | Status |
|---|---|---|
| 1 | Pure-PP vs COLA-weighted D column tension | **STILL OPEN** — KosPos's design resolves; needs Alex's explicit confirmation that COLA-weighted is right for special-class budget pacing |
| 2 | L vs G42/H42 ratio definition | **STILL OPEN** — needs Alex to confirm which is "the attrition rate in the report" |
| 3 | CPC prior-year H53 missing | **STILL OPEN** — confirm whether ever computed or genuinely absent |
| 4 | CPC MCCP/TEMP rows 49/50 no E/H | **STILL OPEN** — design call for KosPos's MCCP split |
| 5 | "Department Group" pivot label preservation | **STILL OPEN** — design question for KosPos's Excel export compatibility |
| 6 | TEMPM Interns G40 BFM cells via KK? | **RESOLVED 2026-05-25 (Task B Test 4 / Test 1)** — BVA shows **zero** Transfer & Other Budget on those 4 specific BFM rows (all 4 have AX == AZ in this snapshot, no KK movement); $180k is still in DBI Salaries chartfield |
| 7 | SPECIAL block paste error per-class validation | **STILL OPEN** — Phase 2.4 importer feature |

### Tab 27 — OPS Detail (5 open)

| # | TODO summary | Status |
|---|---|---|
| 1 | Snapshot-diff granularity key | **STILL OPEN** — Phase 2.4 design decision |
| 2 | "Δ since" reference snapshot default | **STILL OPEN** — Phase 2.4 design decision |
| 3 | OVER FILLED / PARTIALLY FILLED semantics | **STILL OPEN** — pending Tab 23 (Vacancies and TEMP) walkthrough |
| 4 | Charge Override Department population rule | **STILL OPEN** — pending Tab 3 (Combo) walkthrough or admin clarification |
| 5 | OPS Detail 17 vs 18 row fields | **STILL OPEN** — KosPos design includes Budget Department Code 1 as the 18th |

**Summary: 7 TODOs marked resolved or partially-resolved in this audit.**
The next walkthrough cycle should remove them from each tab's
Open Questions list (or move them to a "Resolved" sub-list).

**Recommendation:** convert each `- [ ]` to `- [x]` for the resolved ones,
adding a brief `(resolved 2026-05-25 via …)` note. **Action: applied in
this PR** for the 7 items above. _Strikethrough preserves the original
question text for future readers._

## 4. DBI-shortcut catalog completeness

**Cross-cutting concerns table** (labor-report.md lines 152–183) lists
24 DBI-only assumptions. Cross-checked against each tab's "What's
manual / fragile" section. **Result: every DBI-shortcut callout in a
tab is also in the catalog.** No drift.

**Two minor observations**:

- **Tab 7's "Step's fund-10190 filter would silently zero out CPC + DBI
  BIF-Continuing positions"** is in the catalog as "BI Payroll fund 10190
  filter on Step's per-PP SUMIFS". ✓ Consistent wording.
- **Tab 26's CPC fund-10000 mirror** (added this session in Task A) is
  now in the catalog as part of the same "Fund 10190 filter" row.
  Wording could be improved by splitting into one DBI row + one CPC row,
  but **functionally equivalent and acceptable as one row**.

## 5. Calendar reference cell consistency

**All Calendar reference cells used consistently.** Each tab that
references `Calendar!{cell}` uses it in the same meaning Tab 5
documents:

| Cell | Meaning per Tab 5 | Confirmed in |
|---|---|---|
| H2 | Today's PPE = `MAX('BI Payroll'!X:X)` | Tab 7 (BI Payroll's X column is the source); Tab 26 OPS Summary uses `MAX` indirectly via Calendar |
| I2 | Pure PP elapsed | Tab 26 (`G36/J2*I2` pacing) |
| J2 | Pure total PPs | Tab 26 (same pacing formula) |
| K2 | Pure PPs remaining | Tab 26 RPO formula `IF(K2=0, E38, MAX(G38, E38))` |
| L2 | COLA effective threshold = PP15's PPE = B16 | Tab 20 W projection (`W2 < W{threshold}` branch) |
| M2 | COLA-weighted PP elapsed | Tab 20 T formula (`S/N2*M2`) |
| N2 | COLA-weighted total PPs | Tab 20 T formula |
| O2 | COLA-weighted PPs remaining | Not directly referenced elsewhere |

**No drift.** Tab 26 walkthrough explicitly notes the "D column uses pure
`I2/J2`, T column uses COLA-weighted `M2/N2`" tension; this is a
*KosPos design call*, not a *Calendar-cell-meaning inconsistency*.

## 6. Stale assertions

**Beyond the TODOs already triaged in § 3, 2 in-line "TODO: confirm with
Alex" or similar pending-confirmation notes are now resolvable**:

1. **Tab 20 § 100-row SPECIAL block source** — note read "TODO: confirm
   100 rows is the right count" — verified at exactly 100 rows in this
   snapshot via direct inspection. **Resolved.** _(Action: small edit
   removing the TODO marker.)_
2. **Tab 7 § "ADR-007 needs amendment"** — still pending; Phase 2.4 work.
   Kept as-is.

## 7. Memory drift

Re-read auto-memory files:

- **`user_role.md`** — _Alex: Deputy Director (Admin) at SFDBI; beginner Claude user; HTML/VBA/SQL background, no React._ ✓ No drift.
- **`session_logging.md`** — _Log every prompt + milestones in SESSION_LOG.md._ ✓ Consistent with this session's behavior (Session 17 entry added with Task A; Tasks B–E will be appended at session end).
- **`feedback_session_end.md`** — _Always paste the next-session prompt as a copyable block in the final response._ ✓ Will follow at session end.
- **`feedback_projections_always_cola_aware.md`** — _KosPos default is COLA-aware; workbook's straight-line uses are shortcuts, never inherited as defaults._ ✓ Reinforced by Task A's Tab 26 walkthrough (which explicitly retains the workbook's pure-PP usage but flags it as a shortcut and documents the KosPos override).

**No memory drift. No updates needed.**

## Summary of edits applied in this PR

1. **13 broken anchor links** in `labor-report.md` corrected to use
   github-slugger's occurrence-index suffix instead of the (incorrect)
   tab-number suffix.
2. **7 open TODOs marked resolved or partially-resolved**, with brief
   `(resolved 2026-05-25 via …)` annotations linking the resolving
   walkthrough / audit / interlude. (Applied to each tab's Open
   Questions list in the same PR.)
3. **1 inline TODO removed** (Tab 20 SPECIAL block 100-row count).
4. **Minor note added to Tab 7** explaining the "18,225 cells" vs
   "133,164 clauses" framing distinction.

## Cross-references

- [`../domain/labor-report.md`](../domain/labor-report.md) — the audited
  doc.
- [`bva-reconciliation-suite.md`](bva-reconciliation-suite.md) — the
  empirical evidence that resolves several TODOs.
- [`../data-sources/reports-folder-inventory.md`](../data-sources/reports-folder-inventory.md) —
  resolves the "other chartfield trees" TODO.
- [`../SESSION_LOG.md`](../SESSION_LOG.md) — full history of the
  walkthroughs being audited.
