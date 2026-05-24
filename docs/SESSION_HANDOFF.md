# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 12, 2026-05-24, autonomous research)

**Phase:** 4 — IN PROGRESS. RPO + OVERM math+UI shipped (Sessions 9–11). PREMM next (needs Alex's interactive walkthrough). This session was a docs-only research pass between math arcs.
**Last main commit:** `ed94165` (PR #30 — SF authoritative reference)
**Tests:** 146/146 passing (no app/src/ changes this session)
**Branches in flight:** none — PR #30 merged; PR #31 (this briefing) will be merged before shutdown.

**PR merged this session:**
- [PR #30](https://github.com/alkprojects/kospos/pull/30) — `docs: SF authoritative reference (authorities + appointment-type taxonomy)`

## Briefing — pending Alex review (Session 12)

### a) What landed

**One PR merged: [#30](https://github.com/alkprojects/kospos/pull/30).** 14 files changed, +984 / −72. Tests 146/146 green. GitHub Pages deploy confirmed successful. Live site reflects the new docs at https://alkprojects.github.io/kospos/.

**Two new domain files:**
- [`docs/domain/authorities.md`](domain/authorities.md) — Authority map (BOS, MYR, CON, CSC, DHR, dept). Reading order for KosPos contributors.
- [`docs/domain/appointment-types.md`](domain/appointment-types.md) — **Headline deliverable.** Full Charter §10.104 enumeration (19 sub-sections), Cat 16/17/18/19, Provisional, MTA Exempt (§8A.104(i)), Transfer/LTT. Plus the "exempt-class vs exempt-appointment" distinction and the Group I 2% cap.

**Existing files extended:**
- `domain/positions.md` — "External authoritative rules" section pointing at the new files
- `domain/hiring-process.md` — full appointment-type table; CS Rule 113 §113.8 calls our "RTF" a Personnel Requisition; Cat 16/17/18 hard limits; per-MOU probation duration
- `domain/budget-process.md` — Charter Art. IX + Admin Code Ch. 3 citations; ASO/AAO/MOU authority anchors
- `domain/special-class.md` — "Authoritative anchors" section
- `data-sources/{controller,dhr,civil-service,bfm,mayor,obi}.md` — corrections and additions
- `GLOSSARY.md` — full appointment-type vocabulary; Personnel Requisition; Group I cap; BOS/IG entries

### b) Top 5 findings that change KosPos's understanding

1. **Charter §10.104 has 19 sub-sections, not just 16/17/18.** Cat 19 (severely-disabled entry → PCS after 1 year satisfactory service per CS Rule 115) is the most operationally important one we missed: the class code doesn't change but the appointment-type field flips PEX(19) → PCS at the 1-year mark. Position tracking must support this in-place conversion. CSC groups all 19 into Groups I–IV with distinct caps; MTA managers under §8A.104(i) are entirely separate (2.75% MTA cap vs. citywide 2% Group I cap).

2. **"RTF" is not a Civil Service Rules term.** CS Rule 113 §113.8 calls these **Personnel Requisitions** (time-stamped in receipt order). RTF is internal SFDHR/PeopleSoft workflow vocabulary. KosPos's RTF model needs to be reframed as the operational workflow that *maps to* the Rule 113 process — when KosPos extends beyond DBI, other departments may use different internal names for the same Rule 113 workflow.

3. **Rule 117 sets no universal probation duration.** Probation length is per-MOU/per-class (typically 6 or 12 months). Hardcoding a default in the hiring-template model will be wrong for many classes. Police/Fire/MTA use parallel rules (217/317/417).

4. **Premium-pay framework lives in MOUs + ASO under Charter §A8.409, not Admin Code Chapter 16.** Our RPO walkthrough sourced premium-pay rules to "§16.7-ish" — Chapter 16 is actually vacations + retirement + workers' comp. The premium-pay codes (L08 Lead Worker, 289 Bilingual, etc.) come from per-MOU language. This will matter for PREMM math.

5. **BFM vendor identity confirmed: Sherpa Government Solutions** (selected Aug 2020, owned by GI Partners since Apr 2022). Internally branded "SF Budget" under the Controller's Systems Division. Useful for any future BFM importer technical decisions.

### c) Conflicts between primary sources and existing docs

Per session rule, the original claims were NOT edited — each affected doc has a "Conflicts to reconcile" section. Items needing Alex's call:

| Where | Conflict | Suggested resolution |
|---|---|---|
| GLOSSARY.md (Cat 16/17/18 entry) | "strict time limits. Cat 18 is the longest" — true but loses the structural distinction | Rewrite to enumerate the three distinct use cases + add Cat 19 |
| GLOSSARY.md (RTF entry) | Treats RTF as canonical | Already updated to note Personnel Requisition equivalence; review wording |
| hiring-process.md | Uses RTF and CSC Rules synonymously | Already updated; review the new "RTF terminology" callout |
| hiring-process.md | Implied global default probation | Added a "duration is per-MOU" caveat; review |
| special-class.md (RPO section) | Cites Admin Code Ch. 16 ambiguously for premium-pay-adjacent claims | Re-source via MOU when PREMM walkthrough lands |
| data-sources/dhr.md | Pay calendar attributed to DHR | Already corrected; canonical reference moved to controller.md |
| data-sources/dhr.md | DBI MOU list missing Building Inspectors Local 856 | Already added |
| data-sources/controller.md | ASO described as Controller-owned | Already corrected (MYR proposes, BOS adopts, CON hosts) |
| data-sources/obi.md | Implied OBI→Snowflake migration committed | Already corrected (Snowflake is DT-led, no Controller commitment) |

### d) Decisions Alex needs to make

1. **Cat 19 (disabled→PCS conversion) — do we model it?**
   - Option A: Add a `pending_conversion` flag on positions with EE Appointment Type PEX-19 and date-stamp 1 year out. Surface as a hiring-pipeline event.
   - Option B: Defer until KosPos has a department with active Cat 19 appointees. DBI's labor data may not contain any.
   - Recommendation: **Option A**, low-cost, important for citywide rollout. Decide before extending hiring-process model further.

2. **RTF rename / aliasing.**
   - Option A: Keep "RTF" as the UI label (Alex/DBI familiarity), document the Personnel Requisition equivalence.
   - Option B: Switch UI to "Personnel Requisition" (Rule 113 alignment).
   - Recommendation: **Option A** — the docs now make the mapping explicit; user-facing language stays in DBI vernacular.

3. **Probation modeling per-MOU.**
   - Option A: Build a `probation_months_by_mou` lookup table now (one row per MOU) and seed it during MOU import.
   - Option B: Hardcode a most-common default (6 mo) and override per class.
   - Recommendation: **Option A** — costs little, avoids the wrong-default bug.

4. **Group I 2% cap and MTA 2.75% cap surfacing.**
   - Option A: Add a per-department dashboard widget showing Group I count + % of citywide workforce.
   - Option B: Defer until citywide rollout phase.
   - Recommendation: **Option B** — meaningful only at citywide scope; DBI alone doesn't see the denominator.

5. **9993 attrition target framework.**
   - The Mayor's Budget Instructions Section IV (Technical Instructions) is the likely host but the PDF was unreadable in this research. A future session should re-fetch (via a different fetcher or local download) and reconcile against KosPos's residual-9993 model.
   - Recommendation: Add to a near-term research backlog; not blocking PREMM.

### e) Suggested follow-on prompt for the next interactive session

Most-likely-valuable next thing: the **PREMM walkthrough → math → UI arc** (same three-PR rhythm as RPO and OVERM). PREMM has the per-(job class, earnings code) lookup pattern, which is the most complex special-class math. The walkthrough is necessary first.

````
We're starting the PREMM_E (Premium Pay) arc — same three-PR rhythm as RPO
(Session 9) and OVERM (Session 11): walkthrough → math + tests → UI section.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — Session 12 briefing)
  docs/SESSION_LOG.md — Sessions 9, 11 entries for the pattern
  docs/domain/special-class.md § PREMM_E (pending walkthrough)
  docs/domain/appointment-types.md (NEW — needed because premium pay
    rules are MOU-anchored, and the MOU map is in §A8.409)
  docs/domain/authorities.md § DHR + § Mayor (NEW)
  app/src/lib/special-class/overm.ts — reference for the file shape
  app/src/lib/special-class/rtpom.ts — reference for the file shape

Confirm state on main:
  git log --oneline origin/main -5
should show PR #30 + #31 (session-12 briefing) at top.

Then: walk Alex through the PREMM Budget Master cells (U5:Z5 reference table,
AB5:AH5 should-be per-(dept,job class)) plus the Labor Report `Premium` tab
formulas (P5, P6, N5/N7, N6/N5 ratios). Open a single discussion PR with the
prose walkthrough resolutions BEFORE writing any math. Then math+tests PR.
Then UI PR. Merge each in order per the shutdown rule.

Hard reminders:
- Premium-pay codes come from per-MOU language (Charter §A8.409 →
  individual MOUs), NOT Admin Code Ch. 16. See appointment-types.md.
- Per-MOU lookups will be needed: DBI touches SEIU 1021, IFPTE 21, MEA,
  LiUNA 261, Building Inspectors Local 856 (the inspector-class signature MOU).
- Same constants as OVERM: pull PP/Calendar data live, never hardcode 15.4/26.1.

Model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — PREMM has the most lookup complexity of any special class.

## Recommended effort

`high` — per-(job class, earnings code) lookup pattern needs careful workbook tracing.

## Blockers for Alex

None landing-related. Live page: https://alkprojects.github.io/kospos/ — please spot-check the new docs when convenient:
- [docs/domain/authorities.md](https://alkprojects.github.io/kospos/docs/domain/authorities/) (or wherever Pages renders the .md)
- [docs/domain/appointment-types.md](https://alkprojects.github.io/kospos/docs/domain/appointment-types/)

## Notes for the next-session model

- Same three-PR rhythm rule applies to PREMM. Don't skip the walkthrough.
- Mirror the OVERM/RTPOM file shape until a third class lands; refactor into `common.ts` after.
- Use the new `appointment-types.md` and `authorities.md` as the authority map for any PREMM rule that touches MOU language.
- Per-MOU lookup table for premium-pay codes is a likely deliverable; design it before coding the math.
- Persistence + multi-dept remain out of scope unless Alex re-opens them.
