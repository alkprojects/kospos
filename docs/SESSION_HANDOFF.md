# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 19 — internal Claude setup audit, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** `04b33c2` (PR #52 — handoff: Session 19 prerequisite) → `<this PR>` (Session 19 audit landed)
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after this PR merges

### What landed this session — internal Claude setup audit

[**PR #_TBD_**](https://github.com/alkprojects/kospos/pulls) — `docs(audits):
internal Claude setup audit — Session 19` — a new
[`docs/audits/internal-claude-setup-audit.md`](audits/internal-claude-setup-audit.md)
covering 7 audit areas + a summary table of 27 findings + 8
recommendations for Alex's review.

**6 trivial fixes applied in-session** (memory hygiene): `feedback_session_end.md`
frontmatter renamed to kebab-case, hook-enforcement note added, broken
`[[bargaining-unit]]` link replaced with markdown ref, MEMORY.md
"Session end prompt" entry renamed to "Session end protocol" with
broader description covering the file's three companion rules. See
audit doc § Area A for details.

### Items surfaced for Alex's review (audit findings, in priority order)

1. **Fix the broken `.claude/settings.local.json`.** The file's
   permission rule is one mangled string with escaped parens and
   embedded newlines, not five rules. Causes silent friction. Corrected
   JSON + a Set-Content one-liner are in
   [audit § Area D](audits/internal-claude-setup-audit.md#area-d--hooks--settings).
2. **Sweep 4 stale post-merge worktrees.** `git worktree remove`
   commands in
   [audit § Area F](audits/internal-claude-setup-audit.md#area-f--workflow-patterns).
3. **File 6 ADRs** for decisions made since ADR-009 (COLA-everywhere,
   MCCP split, userNotes per position, Stop hook, anchor-link
   convention, BVA-as-distinct-source). Bundle as one docs PR. See
   [audit § Area B](audits/internal-claude-setup-audit.md#area-b--rules--canonical-docs).
4. **Codify the audit cadence rule** (event-based per phase + every-10-
   session backstop) in `WORKFLOW.md`. Next audit fires at Phase 2.0i close.
5. **Update WORKFLOW.md step 11** to reflect the actual PR-per-change pattern.
6. **Remove stale parallel memory dir** at
   `<this-worktree>/.claude/projects/`. Cosmetic only; gitignored.
7. **Add `docs/audits/README.md`** — bundle with the next audits/ PR.

Nothing on this list blocks Phase 2.0g. Recommendation: do (1) and (2)
before starting Phase 2.0g (they're 1-minute each); bundle (3)-(7) into
one docs PR after Phase 2.0g lands.

### Carry-forward from Session 18 (still pending, will be handled in Phase 2.0g)

The Phase 2.0g session prompt below already tracks every Session 18
carry-forward item:

- PREMM projection switch to COLA-aware (Tab 16 fix-up)
- Cat 16/17/18 research from CSC + DHR + admin code; scenario-tests
  Scenario 3 + 4 updates; user-notes-per-position lib/quality TODO
- 4 restated questions for Alex (Sessions 17 + 18 deferred defaults)
- 4 action items still open (Cat 17/18 expired positions, Guaiumi
  Cat 16, 5 vacant-no-RTF, 9 reasonable-default calls)

### Top 3 audit findings worth highlighting

1. **`settings.local.json` is broken** — the JSON parses but the
   permission glob inside is mangled into one string with embedded
   `\n` and `\\(`. Almost certainly fails to match any tool call. Quick
   fix above.
2. **6 significant decisions never became ADRs.** The COLA-everywhere
   principle, the MCCP-into-9994 split, the userNotes-per-position
   schema field, the Stop hook, the anchor-link convention, and the
   BVA-as-distinct-source decision are all currently captured only in
   memory + the relevant doc section. Phase 2.0g+ sessions will
   benefit from one batched ADR-PR codifying all 6.
3. **Audit cadence had drifted 11 sessions** between the Phase 3 close
   audit (S7) and this one (S19). Event-based (per phase close)
   cadence rule + 10-session backstop recommended.

### Cumulative state of the labor-report walkthrough (unchanged from S18)

| Phase | Tab | Status |
|---|---|---|
| 2.0a | 5 Calendar | done 2026-05-24 |
| 2.0b | 7 BI Payroll | done 2026-05-25 |
| 2.0c | 6 P&P Data | done 2026-05-25 |
| 2.0d | 20 Report Data | done 2026-05-25 |
| 2.0e | 26 OPS Summary + 27 OPS Detail | done 2026-05-25 |
| 2.0f | 16 Premium + 17 Overtime + 18 Step + 19 Retirement Payout | done 2026-05-25 |
| **2.0g** | **23 Vacancies and TEMP + 24 Staffing Plan + 25 Budget Summary** | **NEXT** |
| 2.0h | 14 other tabs (1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22) | pending |
| 2.0i | Data Sources Inventory final + Phase 2.2 sub-phase enumeration + **next audit** | pending |
| 2.1 | Hide budget-dev UI (route guard) | pending |
| 2.2 | Per-tab UI sub-phases | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR amendments per the 6 proposed ADRs) | pending |

### Action items for Alex (still open from Session 17 + Session 18, re-asked at end of session)

1. **The 7 already-expired Cat 17/18 positions**
   ([scenario-tests § Scenario 3](audits/labor-report-scenario-tests.md#scenario-3--cat-1718-expiry-warning-already-expired-emphasized))
   — review with HR; each row needs convert-to-PCS / terminate / document override.
2. **Person 187518 (Guaiumi, Jimmy)** at 172% of Cat 16 hours cap — Session 18
   memory now suggests this may be a *labor-report data bug* (workbook
   pulling hours from a previous position). Per the per-position cap
   rule in [memory `cat_16_17_18_rules.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/cat_16_17_18_rules.md),
   confirm or correct.
3. **The 5 vacant-no-RTF positions**
   ([scenario-tests § Scenario 5](audits/labor-report-scenario-tests.md#scenario-5--vacant-but-no-rtf))
   — Session 18 memory now flags these as needing
   cross-check against the position's previous-employee (vice) history
   before classifying as "missing RTF" vs "intentional hold." Phase 2.0g
   Tab 24 walkthrough will surface this.
4. **9 reasonable-default calls** (5 from Session 17 + 4 from Session 18) —
   review the calls; correct if any are wrong. Restated in plain English
   in the Phase 2.0g prompt section below.
5. **Confirm CPO posting account** — Tab 19 found CPO (Comp Time Pay Out)
   posting to 510210 alongside VPO/SVO. Confirm with Controller that CPO
   always posts to 510210 (not a separate comp-time account).

## Blockers for Alex

None landing-related. Live site:
<https://alkprojects.github.io/kospos/>. Spot-check the new audit doc on
the live site when convenient:

- [docs/audits/internal-claude-setup-audit.md](audits/internal-claude-setup-audit.md) — Session 19 audit with 27 findings + 8 recommendations.

## Next session prompt — Phase 2.0g (Staffing Plan + Vacancies + Budget Summary)

Paste this verbatim to start Session 20:

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
  docs/audits/internal-claude-setup-audit.md (Session 19 findings;
    relevant subsets: §A memory updates affecting this session;
    §E anchor-link Tab 26/27 migration noted below)
  memory/MEMORY.md + the three new entries from Session 18:
    cat_16_17_18_rules.md, staffing_plan_types.md, feedback_user_notes_per_position.md
  docs/SESSION_LOG.md (Sessions 13–18 + the Session 19 audit entry —
    gives walkthrough pattern + prior decisions; Session 18 in particular
    covers the four per-special-class tabs and the MCCP split decision)
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
  7. **Anchor migration carry-forward from Session 19 audit (Area E.4).**
     Adding Tabs 23/24/25 adds three new `#### KosPos improvements`
     headings, shifting the Tab 26/27 occurrence indices from -7/-8 to
     -10/-11. Three existing intra-file references must be migrated:
       - line ~1994: `#kospos-improvements-7` → `-10` (Tab 26)
       - line ~5064, ~5267: `#kospos-improvements-8` → `-11` (Tab 27)
       - line ~5392: `#kospos-improvements-7` → `-10` (Tab 26)
     Run the verifier script style from PR #45 over the full
     labor-report.md after the walkthrough adds Tabs 23-25.
  8. Update Data Sources Inventory + tab-list status (pending → done).
  9. Update SESSION_HANDOFF.md to point at Phase 2.0h (the remaining
     14 unwalked tabs) as next.

  ALSO IN THIS SESSION: 3 small fix-ups carried forward from Session 18:

  (A) **Tab 16 PREMM projection: switch from pure-PP to COLA-aware.** Alex
      reconfirmed the COLA-everywhere principle. Percentage-of-base premiums
      (269 Struct Eng 10.27%, 600 Architect 5%) DO COLA-inflate. Update the
      Tab 16 Premium walkthrough's `P5/P8` projection narrative to show
      COLA-aware as the primary projection (function returns same number
      when COLA doesn't apply to specific $-amount premiums like L08 Lead
      Worker Pay $5).

  (B) **Cat 16/17/18 follow-up.** Research Cat 17 and Cat 18 limits in
      CSC Rules + DHR site + admin code (websites — use WebFetch). Update
      the scenario-tests doc:
        - Scenario 4 (Cat 16 cap): re-classify Guaiumi case as
          "labor-report data bug suspected — workbook may be pulling hours
          from a previous position" instead of "172% of cap CSC violation."
          KosPos's lib/quality cap check must filter by Position Number, not
          Employee ID.
        - Scenario 3 (Cat 17/18 expiry): add the Cat 18-specific check
          "Expiration Date ≠ Appointment Date + 3 years" as a flag for user
          review. Add Cat 17 caveats about PS HCM Expiration Date being
          unreliable.
      Add the user-notes-per-position requirement to the lib/quality TODO
      list and Phase 2.2 sub-phase enumeration.

  (C) **4 restated questions for Alex** (from Sessions 17 + 18 deferred
      defaults — Alex asked these to be restated in plain English):

      - **Restate #1 (was S17 #2):** "On the Operating Report Summary, three
        different things look like they're called 'attrition rate' at the
        DBI / CPC dept-group level: G42/H42 = (9993 ÷ non-9993 labor),
        L23/L32 = (projected balance ÷ total budget), and H43 = a hand-keyed
        prior-year number with a 'Calculated, Questionable' note. They display
        as percentages on the same page, look similar, but mean different
        things. Which one is 'the attrition rate' that goes in the report you
        send to CON/MYR? My current default: G42/H42 is canonical (9993 ÷
        non-9993); L23/L32 gets renamed to 'leftover %' in KosPos. Confirm or
        correct?"

      - **Restate #2 (was S17 #4):** "The Operating Report Summary's
        GETPIVOTDATA calls reference a pivot label called 'Department Group'
        — but Report Data doesn't have a column with that exact name. It's
        a workbook-internal pivot grouping. When KosPos emits the
        labor-report-shaped .xlsx for downstream consumers, do we need to
        preserve that 'Department Group' label so other people's GETPIVOTDATA
        formulas still work? My current default: yes, preserve it. (Slightly
        more cosmetic, but breaks downstream Excel formulas if we rename.)"

      - **Restate #3 (was S17 #5):** "The OPS Detail snapshot-diff feature
        (the 'what changed since the last report' panel) needs a key to
        identify each row across snapshots. Options:
          (a) Position Number alone (simplest, but doesn't differentiate
              vacant-then-filled — same position number, different occupant)
          (b) (Eff Dept, Position Number, Fill Status, Budget Job Code)
              (current default — captures dept moves + reclassifications)
          (c) Position Number + a separate tracker for 'who occupied it when'
        My current default: option (b). Confirm or correct?"

      - **Restate #4 (was S18 #4):** "The Step (Tab 18) walkthrough's
        improvement #3 proposes making per-PP step variance 'merit-event
        aware' — instead of uniform per-PP proration, the formula would
        understand 'this employee advanced a step on PP15, so pre-PP15 PPs
        used Step 4 budget and post-PP15 PPs use Step 5 budget.' Adds
        modeling complexity (per-employee step history) but makes per-PP
        variance numbers meaningful (currently they drift pre/post-merit
        even though the FY total is correct). Implement now in Phase 2.4
        importer, or defer to a Phase 2.2 sub-phase? Default: defer."

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
  - No new web research outside the Cat 17/18 follow-up in (B) above.
  - No tabs beyond 23-25.
  - No BVA importer build (Phase 2.4).
  - No ADR-006 / ADR-007 amendments (Phase 2.4).
  - No tool / setting / hook changes (those land in the post-2.0g ADR-batch PR).

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
  - Person 187518 (Guaiumi) Cat 16 cap — confirmed labor-report data
    bug or real CSC violation?
  - 5 vacant-no-RTF positions — disposition after Tab 24 walkthrough
    cross-checks "vice" history
  - 9 reasonable-default calls (5 from Session 17 + 4 from Session 18) —
    confirm correct
  - CPO posting account — confirm 510210 with Controller

Recommended model: claude-opus-4-7. Effort: high.
````

### Recommended model (Phase 2.0g)

`claude-opus-4-7` — Staffing Plan is synthesis-heavy.

### Recommended effort (Phase 2.0g)

`high` — multi-tab walkthrough; Staffing Plan is the most complex per-cell
math in the planning-surface cluster.

---

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
- **Anchor-link convention** (per Task D audit + Phase 2.0f migration +
  Session 19 audit § E.4): GitHub uses github-slugger. Duplicate-heading
  suffix = 0-indexed occurrence-count, NOT tab number. After Phase 2.0g,
  Tab 26's `#### KosPos improvements` slug becomes `kospos-improvements-10`
  and Tab 27's becomes `kospos-improvements-11`. The migration list is
  baked into the prompt above.
- **Make the reasonable call, document it, keep going** when
  Alex-level prose details aren't blocking. Flag in the relevant
  tab's Open Questions list.
- **`gh pr merge --squash` fails from a worktree** when local main is
  checked out elsewhere. Use `gh api -X PUT repos/alkprojects/kospos/pulls/N/merge
  -f merge_method=squash` instead — pure server-side merge, no local
  branch switch.
- **Audit cadence** (per Session 19 audit § C): next audit fires at
  Phase 2.0i close. Don't audit again before then unless a rule is
  visibly drifting.
