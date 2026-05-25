# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 18 — interactive, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **In progress.**
**Last main commit:** `e8f5eb2` (PR #49 — session handoff) → `<this PR>` (Session 18 follow-up: Alex responses + memory)
**Tests:** passing on CI (no app-code changes this session)
**Branches in flight:** none after this PR merges

### Alex's end-of-session responses (2026-05-25, after Phase 2.0f shipped)

Alex came back to his computer late in the session and answered the 4
action items I'd re-asked. Key new context (saved to memory; will inform
Phase 2.0g and beyond):

**Cat 16 / 17 / 18 rules** (memory: `cat_16_17_18_rules.md`):
- **Cat 16:** 1,040 hrs/FY, **per position** (not per employee), resets each FY. DHR forces separation if exceeded. **The Guaiumi (187518) flag may be a labor-report data bug** — the workbook's check likely pulled hours from a *different* position the employee was previously on. KosPos's per-position cap check needs to filter by Position Number, not Employee ID.
- **Cat 17:** temp backfills for employees on leave; expires when original employee returns, not on calendar date. PS HCM Expiration Date field often = Appointment Date (meaningless). 2-year limit possibly — research TODO.
- **Cat 18:** 3-year max set by dept. Used as semi-permanent in practice. PS HCM Expiration Date sometimes wrong (< 3 years from Appointment). **KosPos should flag Cat 18s where Expiration Date ≠ Appointment Date + 3 years** for user verification.
- General: **KosPos position entity needs a free-text user-notes field** (memory: `feedback_user_notes_per_position.md`).

**Vacant-no-RTF / Staffing Plan Types** (memory: `staffing_plan_types.md`):
- Tab 24 Staffing Plan `Type` column: **Active** / **Separations** / **Pending** / **Temp** / **Unfunded**. Notes column carries the per-row context.
- **RTF fields are unreliable:** Latest RTF date can be stale; RTF Submitted is also there. "No RTF" may be a data integrity issue, not a real never-filed status. Cross-check: did the position have a previous employee ("vice")? If yes, RTF must have been filed historically.
- **Vacancy planning is a major KosPos function** — involves policy decisions, not just display. KosPos shows current status + facilitates hiring planning.
- The 5 vacant-no-RTF positions need a Tab 24 walkthrough first (Phase 2.0g) before lib/quality can classify them.

**COLA-everywhere principle reconfirmed** (memory: `feedback_projections_always_cola_aware.md` updated):
- Alex's worked example: 26 PPs, $1/PP, 100% COLA at PP13 → $39 projected (= 13 PPs × $1 + 13 PPs × $2). All projections, every tab, COLA-aware.
- **S18 #1 (PREMM pure-PP) needs correction:** percentage-of-base premiums (269 Struct Eng 10.27%, 600 Architect 5%) DO COLA-inflate because their base inflates. Tab 16 walkthrough should switch PREMM projection to COLA-aware. Fix-up PR scheduled for Phase 2.0g.

**MCCP split into 9994 confirmed:**
- Data model splits; UI shows MCCP adjacent to STEPM. My Tab 18 walkthrough already proposed adjacent tabs in the UI — consistent.

### Items still open for Alex's review

Alex asked me to restate 4 questions in plain English. They're below in the **Phase 2.0g session prompt** for him to answer at the next session start:

- **S17 #2** (G42/H42 vs L23/L32 attrition rate definitions)
- **S17 #4** ("Department Group" pivot label preservation)
- **S17 #5** (Snapshot-diff granularity key choice)
- **S18 #4** (Step-event awareness — implement now or later)

Restated in plain English in the next-session prompt.

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

## Next session prompt — Internal Claude setup audit (Session 19, BEFORE Phase 2.0g)

Per Alex's end-of-Session-18 ask: the periodic-audit habit (set up in
Session 5 memory `session_logging.md`) hasn't fired since Session 7 / end
of Phase 3 — 11 sessions ago. Audit drift is exactly what this catches.
Before any more Phase 2 content work, do a deep audit of the Claude setup.

**The Phase 2.0g prompt (the original "Next session prompt") moves to
the section below**, to be used in Session 20 after the audit ships.

Paste this verbatim to start the next session:

````
This is an **internal Claude setup audit** session for the kospos project.
No Phase 2 content work this session — Phase 2.0g (Staffing Plan + Vacancies
+ Budget Summary) is scheduled for the session AFTER this one. The goal is
to make sure everything in the Claude collaboration setup is working,
non-bloated, and aligned with Alex's preferences before we resume content
work.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — full context + the Phase 2.0g
    prompt that comes after)
  docs/SESSION_LOG.md (Sessions 1-18 + all interlude entries — the
    audit cadence + what's been logged vs missed lives here)
  docs/WORKFLOW.md (the collaboration rules)
  docs/DECISIONS.md (every ADR + see if any non-ADR decisions slipped in)
  docs/ROADMAP.md + docs/VISION.md (still accurate?)
  C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/MEMORY.md
    + every file it indexes (audit them in detail)
  C:/Users/ALK/Desktop/Claude Projects/kospos/.claude/settings.json
    (the Stop hook config landed in PR #51)
  C:/Users/ALK/Desktop/Claude Projects/kospos/.claude/hooks/check-session-end-prompt.py
    (the hook script)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
TASK — Session 19: Internal Claude setup audit
==============================================================================
Branch: docs/internal-claude-setup-audit
Scope: pure audit + applied fixes. No content work on labor-report tabs.
Deliverable: a new `docs/audits/internal-claude-setup-audit.md` documenting
findings + a log of fixes applied this session + a list of suggestions for
Alex to consider (not yet applied).

Work through these areas systematically. For EACH finding, state:
  - What's the current state
  - Why it's a problem (or not)
  - Recommended fix
  - Whether you applied the fix this session or it needs Alex's input

=== Area A: Memory hygiene ===

The memory directory:
  C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/

Audit each entry for:
  1. **Index ↔ files consistency.** MEMORY.md links to filenames; do they
     all exist? (Session 18 noticed `feedback_session_end.md` was indexed
     but actual filename is `feedback_end_of_session_prompt.md` — that's a
     stale index reference. Find others like it.)
  2. **Still relevant?** Has any entry been superseded by code/docs?
     Memory should NOT duplicate things that are derivable from current
     project state. Per MEMORY.md instructions: code patterns, file
     paths, project structure, git history — none of these belong in
     memory.
  3. **Still accurate?** Verify each `[[link]]` resolves to a real
     memory entry. Verify any cited file paths exist. Verify any cited
     commit hashes / PR numbers are still valid.
  4. **Appropriately scoped?** Some entries may be too narrow ("X happened
     once in session N") or too broad ("always do Y"). Tighten where
     useful.
  5. **Duplicates / overlaps?** Two entries saying the same thing in
     different words should merge.
  6. **Coverage gaps?** Anything Alex has corrected me on multiple times
     that isn't yet in memory? (Re-read recent SESSION_LOG entries for
     correction patterns.)
  7. **Bloat?** Is MEMORY.md becoming a long list that dilutes? Per the
     index rules: lines after 200 truncate. Currently well under, but
     watch the trajectory.

Apply trivial fixes immediately (rename stale indexes, fix broken
[[links]], merge obvious duplicates). Surface non-trivial proposals
(e.g., "this memory entry should be promoted to a CLAUDE.md non-negotiable
rule because it keeps being violated") for Alex's decision.

=== Area B: Rules / canonical docs ===

  1. **CLAUDE.md** — does every "non-negotiable working agreement" still
     hold? Have any been silently dropped? Are any being violated this
     phase? Check the Session 6 + Session 7 audit notes for past
     drift patterns.
  2. **WORKFLOW.md** — is it still followed? Is anything in it stale
     (e.g., refers to phases that have shipped)?
  3. **DECISIONS.md** — every architectural decision since the last
     ADR. Are there decisions that SHOULD have been ADRs but weren't?
     (E.g., the MCCP split into 9994 — Session 18 — is that ADR-worthy?
     The COLA-everywhere principle? The user-notes-per-position
     requirement? The Stop hook?)
  4. **ROADMAP.md / VISION.md** — still accurate vs the Phase 2 reality?
     Phase scope didn't shift in a way the roadmap doesn't reflect?

=== Area C: SESSION_LOG.md + audit cadence ===

  1. **Coverage.** Are Sessions 13-18 logged consistently with Sessions
     1-12? Format, prompt-by-prompt detail, milestones?
  2. **Audit cadence.** Session 5 memory `session_logging.md` says
     audits should run "periodically and especially at the end" — last
     audit was Session 7 (end of Phase 3). Decide: should audits be
     time-based (every N sessions), event-based (every phase close), or
     both? Document the decision. If event-based, when should the next
     content-phase-audit fire? (Phase 2.0 hasn't closed yet — it'll
     close at Phase 2.0i.)
  3. **Could a hook enforce this?** The Stop hook now enforces the
     copyable-next-session-prompt rule. Could a similar Stop or
     SessionStart hook nudge for audits every N sessions? Consider but
     don't necessarily implement; the audit was triggered manually this
     time, which worked fine.
  4. **Format.** Is SESSION_LOG.md becoming bloated? It's the kind of
     file that grows monotonically. Worth a "trim to top 5 most-recent
     sessions in detail, summarize older ones" rule?

=== Area D: Hooks / settings ===

  1. **Stop hook** (PR #51) — is it working? It's installed but didn't
     fire in this exact session (the watcher only picks up hooks
     present at session start). Confirm a fresh session sees it.
  2. **Are there other places where hooks could replace memory-only
     enforcement?** Pattern from this session: rules in memory keep
     getting violated → hook them. Candidates:
       - "PR description must have ## Summary + ## Test plan" — could be
         a PreToolUse hook on `Bash` matching `gh pr create`?
       - "Use Co-Authored-By line in commits" — PreToolUse on Bash
         matching `git commit`?
       - Don't go hook-crazy — only add hooks for rules that have
         actually drifted, not preemptively.
  3. **settings.json sanity** — any config you'd recommend?
     spinnerVerbs? statusLine? availableModels? Or leave alone?
  4. **`.claude/launch.json`** — tracked but I've never inspected it.
     What's in it? Is it being used?

=== Area E: File / repo organization ===

  1. **labor-report.md size.** It's ~5,600 lines after Phase 2.0f.
     Worth splitting per-tab? Trade-off: split = more navigable but
     more files to keep in sync. Recommend, don't necessarily apply
     this session.
  2. **docs/audits/ proliferation.** There are now 5 audit docs
     (bva-reconciliation-suite, labor-report-scenario-tests,
     labor-report-walkthrough-audit, reports-folder-inventory…). Is
     that the right grouping? Should there be an audits/README.md
     index?
  3. **Overlapping content.** Is anything documented in 2+ places
     (e.g., overm formulas in both labor-report.md Tab 17 AND
     special-class.md OVERM_E)? When that happens, decide which is
     canonical and either remove the duplicate or convert it to a
     pointer.
  4. **Anchor link convention compliance.** Audit any new cross-refs
     since the Task D audit landed. Per Phase 2.0f migration:
     occurrence-index, NOT tab-number. Re-run the verifier script
     style I used in PR #48 over the full docs/ tree.

=== Area F: Workflow patterns ===

  1. **PR-per-change followed?** Recent commit history — any commits
     that bundled multiple unrelated changes?
  2. **Worktree usage smooth?** This worktree
     (nice-archimedes-288f0b) has accumulated `.scratch/`,
     `extract_*.py` files, etc. Should worktrees be ephemerally
     destroyed between sessions, or do they persist?
  3. **Memory updates happening when they should?** Re-read recent
     sessions for "Alex corrected X" or "Alex confirmed unusual
     approach Y" — were those captured as memory?

=== Area G: Carry-forward debt from Session 18 ===

These items don't get DONE in this audit session — they're scheduled for
Phase 2.0g (Session 20). But the audit should confirm they're tracked:

  - PREMM projection switch to COLA-aware (Tab 16 fix-up)
  - Cat 16/17/18 research from CSC + DHR + admin code; scenario-tests
    Scenario 3 + 4 updates; user-notes-per-position lib/quality TODO
  - 4 restated questions for Alex (Sessions 17 + 18 deferred defaults)
  - 4 action items still open (Cat 17/18 expired positions, Guaiumi
    Cat 16, 5 vacant-no-RTF, 9 reasonable-default calls)

If any of these are MISSING from the Phase 2.0g prompt section below,
add them. If they're there but unclear, sharpen the wording.

=== Deliverable structure ===

Single new doc: `docs/audits/internal-claude-setup-audit.md`.

Sections:
  - `## Methodology` (1-2 paragraphs)
  - `## Area A: Memory hygiene` ... through `## Area G: Carry-forward debt`
    — each with `### Findings` + `### Fixes applied this session` +
    `### Surfaced for Alex's review` subsections
  - `## Summary table` — every finding × {applied / surfaced /
    no-action} disposition × link to where it lives in the audit doc
  - `## Recommendations not actioned` — Alex-decision items

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name (`docs/internal-claude-setup-audit`).
  - **No app code.** No labor-report walkthrough work.
  - **No new npm packages.**
  - **`npm test` stays green.**
  - One PR; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit message ends with the Co-Authored-By line per CLAUDE.md.
  - Hooks/settings changes ARE in scope this session (audit may recommend
    new hooks). If you add or modify a hook, follow the install pattern from
    PR #51: I'll be asked to do the actual write since the auto-mode
    classifier blocks me from .claude/ writes. Make the write self-contained
    (script + one-liner Copy-Item PowerShell command).

==============================================================================
What we are NOT doing
==============================================================================

  - No app/src/ code changes.
  - No labor-report walkthrough content work (no Tab 23/24/25; no PREMM
    fix-up; no Cat research). Those are Phase 2.0g (Session 20).
  - No ADR-006 / ADR-007 amendments.
  - No new external research that isn't directly part of the audit.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Audit doc landed (link + summary findings).
  - Fixes applied this session (with PR link).
  - Items surfaced for Alex's review.
  - Updated next-session prompt for Phase 2.0g (Session 20). If the audit
    surfaced anything that affects how Phase 2.0g should be approached
    (e.g., new memory entries to read, a rule that changes the
    walkthrough pattern), bake that into the Phase 2.0g prompt.

Re-ask the action items still open (the 4 + 9 carry-forwards).

Recommended model: claude-opus-4-7. Effort: high.
````

## Recommended model

`claude-opus-4-7` — audit is reasoning-heavy.

## Recommended effort

`high` — multi-area audit + applied fixes + careful reading across many files.

---

## Session-after-next prompt — Phase 2.0g (Staffing Plan + Vacancies + Budget Summary)

For Session 20, AFTER the audit ships. Use this prompt verbatim:

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
  memory/MEMORY.md + the three new entries from Session 18:
    cat_16_17_18_rules.md, staffing_plan_types.md, feedback_user_notes_per_position.md
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
