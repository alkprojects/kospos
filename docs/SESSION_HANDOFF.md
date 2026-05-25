# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 18 — interactive, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** `f2b82cb` (PR #48 — Phase 2.0f per-special-class tabs)
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** `docs/session18-handoff-phase-2-0g` (this handoff PR)

### What landed this session — Phase 2.0f in one PR

[**PR #48**](https://github.com/alkprojects/kospos/pull/48) — `docs(labor-report): Phase 2.0f — Tabs 16-19 per-special-class walkthroughs` — squash-merged after CI passed.

Tabs 16 (Premium) / 17 (Overtime) / 18 (Step) / 19 (Retirement Payout) all
walked through the per-tab template. Cross-linked to special-class.md
per-class walkthroughs (PREMM + STEPM upgraded from pending stubs to
fully decoded; OVERM + RTPOM already done in prior sessions).

### Top 3 findings

1. **CPO (Comp Time Pay Out) is a third RPO earnings code** — Phase 4
   research had identified VPO + SVO; Tab 19's row 61 carries $7,209
   under CPO. KosPos importer routing rules must enumerate it. Closes
   ~$7k of the $38k snapshot reconciliation gap flagged in Tab 7.
2. **Step's per-PP variance IS COLA-aware** — the BY:CY proration uses
   Calendar!E (per-PP COLA delta) + Calendar!N2 (COLA-weighted PP total)
   as denominators. The T projection uses a clever pre/post-COLA switch
   (`IF(H2 >= L2, K2, O2)`) keeping internally consistent with the
   per-PP proration. Verified DBI = -$884,974 YTD / -$939,939 projected
   against OPS E39/H39 to the dollar.
3. **Step folds MCCP positions into STEPM** — conceptually wrong (different
   reference data: DHR MCCP-range table vs Steps table; different
   account). Tab 18 walkthrough proposes the split into a dedicated
   9994 MCCP Offset tab per Alex's flag.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a | 5 Calendar | done 2026-05-24 |
| 2.0b | 7 BI Payroll | done 2026-05-25 |
| 2.0c | 6 P&P Data | done 2026-05-25 |
| 2.0d | 20 Report Data | done 2026-05-25 |
| 2.0e | 26 OPS Summary + 27 OPS Detail | done 2026-05-25 |
| **2.0f** | **16 Premium + 17 Overtime + 18 Step + 19 Retirement Payout** | **done 2026-05-25 (this session)** |
| 2.0g | 23 Vacancies and TEMP + 24 Staffing Plan + 25 Budget Summary | **NEXT** |
| 2.0h | 1 Data, 2 Departments, 3 Combo, 4 BFM, 8 Roster Approvers, 9 EE Additional Pay, 10 Probation, 11 Eligibility Lists, 12 TEMP Limits, 13 Inactive, 14 Separations, 15 Succession, 21 Reporting Tree, 22 Pos by Dept | pending |
| 2.0i | Data Sources Inventory final + Phase 2.2 sub-phase enumeration | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR-006/007 amendments, BVA importer, lib/quality flag set per Tasks B + E + Phase 2.0f findings) | pending |

### AskUserQuestion calls deferred this session

I asked 4 questions at the start (action items from Session 17 + the 5
deferred defaults). Alex was away from his computer; he confirmed he has
answers and asked me to do as much as possible without input. **I left those
questions open for him to answer at his leisure.** The questions:

1. **Cat 17/18 expired positions** (7 names, oldest 728d past expiry) —
   status of HR review / disposition.
2. **Cat 16 cap rule for Person 187518 (Guaiumi)** — FY-only / rolling-2-yr
   / TEX-reclass / investigating.
3. **5 vacant-no-RTF positions** — RTFs to be added / mix / mostly intentional /
   need HR review.
4. **5 deferred defaults from Session 17** — confirm all correct, or flag any
   that are wrong (multi-select).

Phase 2.0f-specific defaults I made this session, ready for Alex's correction:

1. **Premium pure-PP annualization** — kept as-is for PREMM because $-amount
   premiums (e.g., $5 Lead Worker pay) don't COLA-inflate. KosPos still
   calls the COLA-aware projection function but it returns straight-line
   when COLA doesn't apply. Flagged in Tab 16 Open Questions for Alex to
   confirm any percentage-of-base premiums (`269` Struct Eng 10.27%,
   `600` Architect 5%) DO COLA-inflate.
2. **MCCP split into 9994** — re-confirmed (Alex's session prompt also
   endorsed). Tab 18 walkthrough proposes STEPM filter `is_mccp=false`;
   new 9994 MCCP Offset tab to be drafted in Phase 2.0h.
3. **RPO `MAX(budget, YTD)` rule** — kept as the headline figure;
   alternative projections (straight-line, hist-mean-anchored) render
   as planning view, not report. Flagged in Tab 19 Open Questions.
4. **Step-event awareness for per-PP variance** — proposed as Tab 18
   improvement #3 but possibly deferred to Phase 2.2 sub-phase. Default:
   surface as improvement, don't implement now.

### What didn't get done (and why)

**Nothing was blocked.** Phase 2.0f scope fully shipped in one PR. The
following are out of scope per the original prompt and remain for future
sessions:

- **Phase 2.0g (Staffing Plan + Vacancies + Budget Summary)** — out of
  scope per "no tabs beyond 16-19." The Phase 2.0g prompt is below.
- **No app code, no importer build, no ADR amendments** — per the
  session's hard constraints.
- **The 4 action items at the start of the session** — Alex is away;
  he'll respond when convenient.

## Blockers for Alex

None landing-related. Live site:
<https://alkprojects.github.io/kospos/>. Spot-check on the live site
when convenient:

- [docs/domain/labor-report.md § Tab 16 (Premium)](domain/labor-report.md#tab-16--premium) — per-(dept × Account Lvl 5) projection panel decoded
- [docs/domain/labor-report.md § Tab 17 (Overtime)](domain/labor-report.md#tab-17--overtime) — BS18 CPC rollup + BN6/BN8 budget literals
- [docs/domain/labor-report.md § Tab 18 (Step)](domain/labor-report.md#tab-18--step) — per-PP variance math + pre/post-COLA T projection + MCCP split proposal
- [docs/domain/labor-report.md § Tab 19 (Retirement Payout)](domain/labor-report.md#tab-19--retirement-payout) — pivot + CPO third earnings code
- [docs/domain/special-class.md § PREMM_E](domain/special-class.md) — full cell map verified
- [docs/domain/special-class.md § STEPM_C](domain/special-class.md) — projection + per-PP variance fully decoded

### Action items for Alex (still open from Session 17 + this session)

1. **The 7 already-expired Cat 17/18 positions** ([scenario-tests § Scenario 3](audits/labor-report-scenario-tests.md#scenario-3--cat-1718-expiry-warning-already-expired-emphasized)) — review with HR; each row needs convert-to-PCS / terminate / document override.
2. **Person 187518 (Guaiumi, Jimmy)** at 172% of Cat 16 hours cap — either confirm the cap rule (rolling vs FY-only) or take action. ([scenario-tests § Scenario 4](audits/labor-report-scenario-tests.md#scenario-4--cat-16-hours-approaching-cap))
3. **The 5 vacant-no-RTF positions** ([scenario-tests § Scenario 5](audits/labor-report-scenario-tests.md#scenario-5--vacant-but-no-rtf)) — add RTF or document intentional hold.
4. **Session 17 + 18 reasonable-default calls** (9 total: 5 from Session 17 + 4 from Session 18 above) — review the calls; correct if any are wrong.
5. **Confirm CPO posting account** — Tab 19 found CPO (Comp Time Pay Out) posting to 510210 alongside VPO/SVO. Confirm with Controller that CPO always posts to 510210 (not a separate comp-time account).

## Next session prompt — Phase 2.0g (Staffing Plan + Vacancies + Budget Summary)

Paste this verbatim to start the next session:

````
This session continues Phase 2 of the labor-report deep-dive. Phase 2.0g
covers three tabs that together form the **forward-looking planning surface**:
Vacancies and TEMP (Tab 23), Staffing Plan (Tab 24), Budget Summary (Tab 25).

- **Vacancies and TEMP** (Tab 23) is a filtered view of the current-year
  data feeding the Staffing Plan workspace.
- **Staffing Plan** (Tab 24) is the **hiring plan workspace** — where
  Alex models which positions to fill, when, and at what cost. Already
  cross-referenced from Tab 20 (Report Data HIRING + SEPARATING blocks
  pull from Staffing Plan). Probably the highest-complexity tab in this
  phase.
- **Budget Summary** (Tab 25) is the BY+1 cost rollup — a smaller tab
  but the consumer of Staffing Plan's projections.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — full context)
  docs/SESSION_LOG.md (Sessions 13–18 — gives walkthrough pattern + prior
    decisions; Session 18 in particular covers the four per-special-class
    tabs and the MCCP split decision)
  docs/domain/labor-report.md (Tabs 5/6/7/16-19/20/26/27 are the per-tab
    template; cross-cutting concerns table is the DBI-shortcut catalog;
    each tab's Open Questions list captures pending items)
  docs/domain/special-class.md (RTPOM + OVERM + PREMM + STEPM done;
    9993 + 9994 + 9995 + TEMPM pending — TEMPM walkthrough especially
    relevant for Tab 23 Vacancies and TEMP)
  docs/audits/bva-reconciliation-suite.md
  docs/audits/labor-report-scenario-tests.md
  docs/audits/labor-report-walkthrough-audit.md (anchor + cross-tab
    cleanup; convention: occurrence-index, NOT tab-number)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
TASK — Phase 2.0g: Staffing Plan + Vacancies + Budget Summary (Tabs 23-25)
==============================================================================
Branch: docs/labor-report-staffing-plan-and-friends
Scope: ALL THREE tabs in this one PR. They form a related cluster: Staffing
Plan reads Vacancies and TEMP; Budget Summary reads Staffing Plan.

  1. Open `C:\Users\ALK\Desktop\Claude Projects\Position Management\Labor
     Report 5.21.26.xlsx` (gitignored; never commit). Use openpyxl
     read-only.
  2. For each of Tabs 23 (Vacancies and TEMP), 24 (Staffing Plan),
     25 (Budget Summary):
       - Inventory every column + sample formula
       - Decode any pivot sources via xl/pivotTables/pivotTable*.xml
       - Decode the hiring/separation calc shape — Staffing Plan is the
         major math in this group:
         * Per-row position metadata (Position Number, Class, Start
           Date, Separation Date, Expected Step, etc.)
         * Per-PP cost projection: salary + benefits + special-class
         * Roll-up to dept-group totals + BY+1 totals
       - Trace consumers: Report Data HIRING rows 767-790 + SEPARATING
         rows 795-798 already pull from Staffing Plan (per Tab 20
         walkthrough); confirm the per-cell ref pattern
       - Note DBI vs CPC asymmetries (likely fewer here since Staffing
         Plan is per-dept-group anyway)
  3. Walk each tab through the per-tab template (Status / Purpose /
     Data sources / Formulas / Manual-fragile / KosPos improvements /
     UI sketch / Excel export / Open questions). Cross-link to
     special-class.md TEMPM walkthrough (still pending — may need to
     draft it during this session if Tab 23's TEMPM section requires
     it).
  4. For Staffing Plan specifically — this is the **most important
     forward-looking surface for KosPos**. Get Alex's verbal walkthrough
     (or make reasonable-default calls per his prior preferences) on:
       - How the hiring plan integrates with budget development
         (Phase 4 work already started on this, see budget-process.md)
       - Per-position cost projection methodology (use existing
         `app/src/lib/cost.ts` + the COLA-aware projection function)
       - "Backfill" vs "new growth" distinction
       - Separation projection — is it always "this person on this date"
         or sometimes "expect 1-2 retirements in division X by FY-end"
  5. For Budget Summary — confirm Alex's low-priority designation
     (cross-referenced in Tab 5 walkthrough). May be a thin walkthrough
     if it's mostly a Staffing Plan derivative.
  6. Cross-cutting concerns updates: add per-tab DBI shortcuts. Anchor
     suffix convention: occurrence-index, NOT tab number (per Task D
     audit + Phase 2.0f migration).
  7. Update Data Sources Inventory + tab-list status (pending → done).
  8. Update SESSION_HANDOFF.md to point at Phase 2.0h (the remaining
     14 unwalked tabs) as next.

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **No app code.** Phase 2 is docs only.
  - **No new npm packages.**
  - **`npm test` stays green.**
  - One PR; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit message ends with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - No app/src/ code changes.
  - No Staffing Plan math rewrite (Phase 6).
  - No budget-development UI changes (Phase 2.1 route guard).
  - No new web research.
  - No tabs beyond 23-25.
  - No BVA importer build (Phase 2.4).
  - No ADR-006 / ADR-007 amendments (Phase 2.4).
  - No tool / setting / hook changes.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Which tabs walked (status updated).
  - What didn't get done (and why).
  - Top 3 findings the user needs to know.
  - Next-session prompt for Phase 2.0h (the remaining 14 unwalked tabs).
  - Any reasonable-default calls deferred (so Alex can correct).

Also re-ask the 4 action items still open from Session 17 + 18:
  - The 7 already-expired Cat 17/18 positions — HR review status
  - Person 187518 (Guaiumi) Cat 16 cap — rolling vs FY-only
  - 5 vacant-no-RTF positions — disposition
  - 9 reasonable-default calls (5 from Session 17 + 4 from Session 18) —
    confirm correct

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — Staffing Plan is synthesis-heavy.

## Recommended effort

`high` — multi-tab walkthrough; Staffing Plan is the most complex per-cell
math in the planning-surface cluster.

## Notes for the next-session model

- **The workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\Labor Report 5.21.26.xlsx` (gitignored — never commit).
  openpyxl read-only mode.
- **Example reports folder:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\example reports\Reports\` — full inventory in
  [`data-sources/reports-folder-inventory.md`](data-sources/reports-folder-inventory.md).
- **The local main worktree is at** `C:\Users\ALK\Desktop\Claude Projects\kospos`.
  After each merge: `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos"
  pull --ff-only origin main`.
- **Anchor-link convention** (per Task D audit + Phase 2.0f migration):
  GitHub uses github-slugger. Duplicate-heading suffix = 0-indexed
  occurrence-count, NOT tab number. **After Phase 2.0f, the 5th
  `#### KosPos improvements` heading is Tab 18 (slug `kospos-improvements-4`);
  Tab 26's is `-7`; Tab 27's is `-8`. Tabs 23-25 added in Phase 2.0g
  will shift Tab 26/27 indices again by +3 — plan to migrate references.**
- **Make the reasonable call, document it, keep going** when
  Alex-level prose details aren't blocking. Flag in the relevant
  tab's Open Questions list.
- **`gh pr merge --squash` fails from a worktree** when local main is
  checked out elsewhere. Use `gh api -X PUT repos/alkprojects/kospos/pulls/N/merge
  -f merge_method=squash` instead — pure server-side merge, no local
  branch switch.
