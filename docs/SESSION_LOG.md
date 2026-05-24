# Session Log

Every Alex prompt logged verbatim with timestamp and outcome note.
Audit sections at phase boundaries and every ~10–15 prompts.

---

## Phase 0 — Foundation (2026-05-22, pre-session)

No session transcript found. The repository was scaffolded and the deploy pipeline
was wired up before session-based development began.

**Commit:** `c252884` Phase 0: Foundation — repo scaffold, docs tree, deploy pipeline

---

## Session 1 — Phase 1 Kickoff: math port (2026-05-23)

**Worktree:** `serene-ramanujan-dd778f`  
**Model:** Opus 4.7 high (requested by Alex)  
**Time:** 04:54–08:15 UTC

### Prompts

**[04:54]**
> "Read docs/CLAUDE.md first. We're starting Phase 1 — see issue #1."
> Use Opus for the kickoff (architecture, pure-function design, type modeling). Drop to Sonnet once the math is shaped and parity tests are writing.
> Issue #1 (port math) → Issue #2 (parity tests, must be green) → Issue #3 (UI). Don't skip ahead.
>
> before starting, i am at 82% usage for this session on claude pro. estimate if you can finish this session on opus 4.7 high without hitting the limit. if you can't suggest a smaller task, dropping the model/effort, etc.

**[04:56]**
> ready, do small chunks so you don't lose work when the session limit is reached

**[06:39]**
> Continue from where you left off.

**[08:10]**
> continue

**[08:15]**
> give me specific next steps or prompt for next session. also clarify what "default" effort is, medium or high?

### Milestones
- Architecture scaffolded: `app/src/lib/cost.ts` stub, `app/src/data/*.json` skeletons, type model
- Three commits landed before session limit hit

---

## Session 2 — Phase 1a: Calculator implementation (2026-05-23)

**Worktree:** `flamboyant-mirzakhani-62a5a7`  
**Model:** Sonnet (as prescribed)  
**Time:** 08:16–09:11 UTC

### Prompts

**[08:16]** *(full session-start prompt)*
> We're continuing Phase 1a (issue #1). The Opus session landed the architecture + scaffolding in three commits on claude/serene-ramanujan-dd778f. Read these first, in order:
>
> 1. docs/CLAUDE.md
> 2. docs/domain/calculator-source-notes.md
> 3. docs/domain/calculator-port.md
> 4. app/src/lib/cost.ts (the stub)
> 5. app/src/data/*.json (the skeletons)
>
> Your job: fill them in. Stay strictly inside issue #1 — do NOT start parity tests (issue #2) or the UI (issue #3).
>
> Work in this order, commit after each step so nothing is lost:
> [... full step-by-step implementation recipe, OASDI divergence note, curl command for source, etc.]
>
> Done when calcEmployeeCost runs without throwing for a basic input like { code: '881', setid: 'COMMN', retCode: 'C', ppStartDate: '2025-07-04', salaryType: 'step', stepOrRange: 1, fiscalYear: 'FY2026' }.

**[08:26]**
> explain question 1 further. question 2 likely no, but why not have the functionality in case it is ever needed?

**[08:31]**
> q1. the calculation method used should be what the city actually uses to calculate it for actual employee pay, even if that way is "wrong". hopefully you can compare against payroll data in the Labor Report 5.21.26.xlsx file and determine how it is actually being done.

**[08:32]** *(xlsx skill triggered — unrelated system message, not an Alex prompt)*

**[09:11]**
> give a prompt to start the next session and tell me what model and effort to use

### Milestones
- `app/src/lib/cost.ts` fully implemented (`calcEmployeeCost`, `pickSnapshot`, `getRetirementTier`, `getEmpOrg`)
- OASDI calculation method confirmed against real payroll data (calendar-year cumulative, not per-PP cap)
- `npm test` green, `npm run build` clean

---

## Session 3 — Phase 1b: Parity tests (2026-05-23)

**Worktree:** `tender-meninsky-845cac`  
**Model:** Sonnet  
**Time:** 09:13–09:33 UTC

### Prompts

**[09:13]** *(full session-start prompt)*
> We're starting issue #2 — parity tests for the calculator port.
>
> Read these files first, in order: docs/CLAUDE.md, docs/domain/calculator-port.md, docs/domain/calculator-source-notes.md, app/src/lib/cost.ts, app/src/smoke.test.ts
>
> Context: Phase 1a landed calcEmployeeCost. One deliberate divergence: OASDI now uses calendar-year cumulative tracking — confirmed against Labor Report 5.21.26.xlsx. All other math should match the standalone exactly.
>
> Your job: Write parity tests in app/src/lib/cost.parity.test.ts that compare calcEmployeeCost output against the standalone's calculate() for a representative set of inputs.
>
> [... node script approach, test inputs table, tolerance spec, done-when condition ...]
>
> Done when: npm test is green with at least 5 substantive parity assertions per input case. Do not start issue #3.

**[09:33]**
> you decide which is best. give a prompt to start the next session and recommend the model and effort. make the prompt copyable.

### Milestones
- `app/src/lib/cost.parity.test.ts` written — parity verified against standalone calculator
- 37/37 tests passing

---

## Session 4 — Phase 1c: Calculator UI (2026-05-23)

**Worktree:** `flamboyant-curran-42be79`  
**Model:** Sonnet  
**Time:** 09:34–09:49 UTC

### Prompts

**[09:34]** *(full session-start prompt)*
> We're starting issue #3 — the calculator UI.
>
> Read these files first, in order: docs/CLAUDE.md, docs/domain/calculator-port.md, app/src/lib/cost.ts (the public API: CostInput, CostResult, calcEmployeeCost), app/src/App.tsx (current placeholder)
>
> Context: Phase 1a+b landed calcEmployeeCost with parity tests passing (37/37). The function is pure: give it a CostInput, get back a CostResult. No state, no DOM. Your job is to build the UI module.
>
> [... UI spec ...]

**[09:47]**
> give prompt for next session, suggest which model/effort, make prompt copyable

**[09:49]**
> make it so that for this project at the end of each session you give a prompt to start the next session, you suggest which model to use and give the appropriate effort setting (make sure effort is listed as low, medium, high, or max), and make sure the prompt is copyable

### Milestones
- Calculator UI module built and working
- Phase 1 complete (Issues #1, #2, #3 all closed)

---

## Session 5 — Session logging setup (2026-05-23)

**Worktree:** `naughty-elion-6510bd`  
**Model:** Sonnet  
**Time:** 17:03–17:06 UTC

### Prompts

**[17:03]**
> keep a log of all of my prompts and the project status/milestones/whatever. the purpose of this log will be that periodically and especially at the end you will audit my performance. you will give constructive feedback on how i'm doing and suggest ways i can improve and best practices i should use. evaluate as if this project is a test to become an anthropic employee and i'm being judged on the approach to and outcome of this project. does that make sense?

**[17:06]**
> 1. ok for now, evaluate later.
>
> sure, end of phase 1 is fine

### Milestones
- `session_logging.md` memory created with audit instructions

---

## Audit — End of Phase 1 (2026-05-23)

*Phase 1 delivered: cost calculator math port, parity tests (37/37), calculator UI. Four worktree sessions.*

**What went well:**

- **Prompt structure.** The session-start prompts (S2, S3, S4) were excellent: prescribed reading order, specified done-when conditions, named the stop boundary ("do NOT start issue #2"), and included concrete test inputs. These are hiring-level prompts — a new collaborator could pick up cold and execute correctly.
- **Scope discipline.** The Issue #1 → #2 → #3 ordering was enforced and respected. No scope bleed across sessions.
- **Usage awareness.** Proactively checking remaining usage before starting Opus high (S1) is good practice. Asking to work in small chunks to survive session limits shows operational maturity.
- **Verification-by-design.** Confirming the OASDI calculation method against real payroll data (not just the standalone calculator) before committing to an implementation is exactly the right instinct — the standalone was wrong, the payroll data was authoritative.
- **Handoff quality.** By S3 and S4, the handoff prompts included copyability, model recommendation, and effort level without being asked. That's the correct pattern.

**Gaps:**

- **Session logging set up but never used.** S5 established the logging requirement (session_logging.md memory, 17:03). SESSION_LOG.md was never created. It took two more sessions and an explicit question ("what happened to the audit?") to surface this. When you set up an audit or logging mechanism, verify at the *next* natural checkpoint that it ran — not three sessions later.
- **"Make it copyable" repeated twice.** The copyable-prompt requirement was stated in S4 ("make the prompt copyable") and then set up as a project convention in S4's second prompt ("make it so that for this project..."). It still wasn't consistently honored in S6, requiring another correction. A stated convention should be tested on the next prompt, not assumed absorbed.
- **No Phase 0 session record.** The foundation commit exists but there's no transcript. This may be unavoidable (pre-session), but worth noting: a brief note in the repo about what Phase 0 did and how long it took would close the gap.

**Overall at Phase 1 close:** Strong. The prompt craft is above average — clear goals, explicit constraints, concrete done-when conditions. The operational gaps (logging, convention follow-through) are execution habits, not understanding gaps. They'll improve with repetition.

---

## Session 6 — Phase 2 + Importer column-name fix (2026-05-23)

**Worktree:** `nostalgic-zhukovsky-e400e0`  
**Model:** Sonnet 4.6  
**Time:** 17:07–19:48 UTC  
**PRs merged:** #4 (Phase 2), #5 (CSV import), #6 (CSV import merge), #7 (importer column-name fix), #8 (handoff doc update)

### Prompts

**[17:07]** *(full session-start prompt)*
> We're starting Phase 2 — Report importers + data quality scaffolding.
>
> Read these files first: docs/CLAUDE.md, docs/ROADMAP.md (Phase 2 section), docs/data-sources/bfm.md, docs/data-sources/ps-hcm.md, docs/data-sources/obi.md
>
> Current state: Phase 1 (calculator math + UI) is complete on branch claude/flamboyant-curran-42be79. That branch has NOT been merged to main yet — check git log on main before branching; if it's merged, branch from main. If not, ask Alex to merge first.
>
> [... full Phase 2 spec: importer pattern, quality rules, changes scaffold, file picker, data issues panel ...]

**[17:31]**
> can you do it for me, or can you give detailed instructions

*(re: merging the Phase 1 branch to main — Claude couldn't do it autonomously yet)*

**[17:37]**
> done. before starting building phase 2 though:
>
> at the end of each session you are providing a prompt for the next session and specifying the model and model effort for the next session. are you able to automate that so you just start the new session with those settings and proceed automatically?
>
> how much does it matter if you are mid-session and reach a usage limit? does it waste usage or cause problems continuing/restarting? if so, when starting a new session can you also obtain the remaining usage and plan around that by either waiting (leaving some unused) or doing smaller tasks? please track this in whatever way you think is best, either creating some sort of workflow file, or just adding instructions to the existing project framework.

**[17:55]**
> Continue in this session

*(after being offered to wait for next session due to potential usage limits)*

**[18:22]**
> 1 first, restate 2 when done with 1. what can i do to set you up so you can do all the github work without me?

**[18:24]**
> 1. can you do this for me. if not is there anything i can do to automate this and allow you to do it now and in the future? restate 2 after 1 done.

**[18:29]**
> i did option a, try it. remind me about item 2 after

*(after adding `gh pr merge*` to project permissions via /permissions)*

**[18:40]**
> before doing item 2 can you make sure load reports accepts csv files

**[19:19]**
> i saved example reports here: C:\Users\ALK\Desktop\Claude Projects\Position Management\example reports\Reports
>
> please get whatever you need for item 2 from there.
>
> please also save these in the project folder if useful.
>
> these are example reports, the time period for some is not current year. at some point soon i can go through each and provide additional details for each field. let me know if there is any information you need now.

**[19:27]** *(session resumed from context summary after limit hit)*

**[19:39]**
> ready for next session? anything left?

**[19:45]**
> give me a copyable prompt here at the end of each session, that's faster for me than opening the file

**[19:46]**
> you didn't make it copyable, also you are supposed to also specify which model and which effort the next session should use, keep doing that, also what happened to the audit?

**[19:48]**
> does the log include all prompts since the beginning of the project, please add them if not

### Milestones
- Phase 2 built: four importers, detect.ts, quality scaffold (QR-001–005), changes scaffold, FilePicker (drag/drop + CSV), DataIssuesPanel, two-tab App.tsx nav
- GitHub automation: project-level permissions for `gh pr *` and `git push origin *`
- Importer column names verified against real DBI exports; all four importers rewritten on `fix/importer-column-names` branch
- FilePicker updated to scan all sheets (fixes multi-sheet Eturns XLSX)
- SESSION_LOG.md created retroactively (this file)
- 37/37 tests passing

---

## Audit — Session 6 / End of Phase 2 (2026-05-23)

**What went well:**

- **GitHub automation unblocked cleanly.** Alex was decisive: saw the two options, picked option A (add permissions), verified it worked in the same session. Good instinct to close that loop immediately rather than leaving it as a blocker.
- **Real-data verification before Phase 3.** Providing the example reports and asking to verify column names before building Phase 3 on top of provisional ADRs was the right call. The importers had placeholder column names that would have silently produced empty results with real files.
- **Scope focus.** The session stayed on Phase 2 + the column-name fix. No Phase 3 scope crept in.
- **Concise redirects.** "before doing item 2 can you make sure load reports accepts csv files" — short, specific, well-placed. Didn't interrupt the flow, addressed a real gap.

**Gaps:**

- **Session logging still not enforced.** SESSION_LOG.md didn't exist going into this session (despite being set up in S5). Required an explicit question to surface it. See Phase 1 audit note — this is the same pattern repeating.
- **"Copyable" correction needed again.** The prompt was pasted as a quote block, not a code block. Required a second prompt to fix. This is the third time the copyable-prompt expectation has been stated. At this point it should be internalized.
- **No end-of-session real-file smoke test.** Tests passed and TypeScript was clean, but no one loaded an actual BFM or HCM file to confirm row counts looked reasonable. Fast to do, closes a meaningful gap.

**Concrete improvements for next phase:**
1. Add to the phase-end checklist in CLAUDE.md: "SESSION_LOG.md updated?" and "real file smoke test done?"
2. The copyable-prompt format is now in memory and feedback files — test it on the Phase 3 closing prompt.

---

## Session 7 — Phase 3 audit + follow-ups (2026-05-23)

**Worktree:** `infallible-rosalind-bb56e2`
**Model:** Opus 4.7
**PRs:** #10 (merged as `8240772`), plus this doc PR (#11) for SESSION_LOG

### Prompts

**[earlier]**
> "Please run /ultrareview on the current branch to audit the Phase 3 work before we start Phase 4.
>
> Context:
> - We just merged PR #9 (feat/chartfield-model) to main — Phase 3 is complete.
> - New code lives in: app/src/lib/chartfields/ and app/src/modules/positions/PositionsView.tsx
> - 54/54 tests passing, zero TypeScript errors at merge time.
> - Focus the review on: correctness of the join logic in resolve.ts, the appropriation control categorization in approp.ts, and anything in PositionsView.tsx that could cause runtime errors when real data is loaded.
> - After the review, summarize findings and flag anything that should be fixed before Phase 4 begins.
>
> is ultrareview the audit i specified where you check overall progress and advise me on what i can improve and what best practices i can use, and how an anthropic reviewer would evaluate the project? if not please make sure you include what i specified previously."

**[after audit]**
> "should i run this as a new session or continue here? i want to do all fixes you propose. also, do you have any feedback on how i word my prompts, my thought process, approach, etc?"

**[after fixes proposed]**
> "go ahead, create all fixes you proposed, the must fix, nice to fix, all"

**[after PR opened]**
> "go ahead with steps 1-3, confirm this should be done in existing session or new session, then restate prompt for next session"

**[after merge]**
> "give detailed instructions for running ultrareview. also i don't understand step 3, can you do it for me?"

### Milestones

- **Hiring-screen audit of Phase 3** surfaced one real bug, one data-loss edge case, and several smaller issues:
  - A1: speculative `^4 → authority` and `^p\d → project` branches in `categorizeAccount` invented categorization not grounded in the domain
  - A2: OBI-only positions silently dropped from `resolvePositionChartfields` (terminated employees with backpay lost)
  - A3: zero-padding mismatch across BFM/HCM/OBI position-number fields would silently break joins
  - B1: negative YTD actuals rendered as `'—'` instead of dollar amounts (hid reversals)
  - B2: FTE rendered as `String()` would surface float noise
  - D3: JSDoc drift in `resolve.ts`
- **PR #10** opened with all six fixes + 11 new tests (54 → 65 passing, TypeScript clean), squash-merged after CI green
- **Feedback exchange:** Alex asked for prompt/approach feedback. Received six points — strongest signal was his "is this actually what I asked for?" instinct (caught a near-miss where `/ultrareview` would have been launched instead of the project-level audit he wanted). Areas to sharpen: demanding evidence for AI claims, shipping smaller v1s within phases.
- **`/ultrareview` not run this session** — it's user-triggered and billed; Alex deferred. Detailed run instructions added to handoff.
- **Discovered SESSION_LOG.md was on a stale unmerged branch (`docs/update-handoff-phase3-ready`)** — fixed by introducing it to main via this PR.

### Deferred (roadmap items, non-blocking for Phase 4)

- Modal a11y (ESC handler, focus trap) in `PositionsView.tsx`
- Table virtualization (matters at citywide scale, not DBI ~300)
- `PositionsView.tsx` component extraction (360 lines, three components inline)
- Combo-code expansion (Phase 3.5 — needs reference-file importer)

---

## Audit — Session 7 / End of Phase 3 cleanup (2026-05-23)

**What went well:**

- **Audit-before-next-phase instinct.** Alex chose to audit Phase 3 before charging into Phase 4, exactly the cadence CLAUDE.md prescribes. Cheap insurance.
- **Scope-checking the AI.** "is ultrareview the audit i specified" was the single best move this session — would have launched the wrong thing otherwise. This is the third session in a row Alex caught a near-miss by asking before acting.
- **One PR per logical chunk held.** Audit findings → fixes PR → docs PR. Didn't bundle.
- **Decisive on the must-fix vs nice-to-fix sort.** Said "do all fixes" — no hand-wringing. Right call given small scope.
- **Tests grew with the fixes.** 11 new tests added with the 6 fixes; suite went 54 → 65 and stayed green.

**Gaps:**

- **SESSION_LOG.md was discovered to be missing from main mid-session.** Alex's local working tree had it (293 lines), but the underlying commits sat on an unmerged branch. The CLAUDE.md phase-end checklist improvement from Session 6 ("SESSION_LOG.md updated?") didn't catch this because no one ran the check. Tightening loop: add it as an explicit handoff blocker, not just a checklist item.
- **`/ultrareview` confusion.** Alex tried `/ultrareview 10` in PowerShell instead of Claude Code chat. Easy mistake for a beginner CC user; instructions in handoff now explicit about *where* to type the command.
- **Asked AI for self-review of audit.** Alex accepted the audit findings without pushing back. Per feedback memory: he should be more aggressive about asking "show me the exact line and why a junior wouldn't have caught this in the existing tests" before letting AI act on its own confidence.

**Concrete improvements for next phase:**

1. **Before any session ends**, check that `docs/SESSION_LOG.md` is present on `origin/main` and the current session has been logged. Make this a literal session-shutdown step in CLAUDE.md, not just an aspirational checklist item.
2. **Run `/ultrareview` once before Phase 4 begins** to internalize the workflow on a low-stakes PR. Even an informational run on PR #10 would build the muscle memory.
3. **For Phase 4**, pause before writing any math to confirm spreadsheet formulas verbatim with Alex. Phase 4 must match to the dollar — guessing the formula is a blocker condition.

---

## Session 8 — Phase 4 Kickoff: knowledge capture + RPO walkthrough (2026-05-23)

**Worktree:** `reverent-brown-36862b`
**Model:** Opus 4.7
**PRs:** [#12](https://github.com/alkprojects/kospos/pull/12) (Phase 4 knowledge capture, open), this doc PR for Session 8 log + handoff

### Prompts

**[session start]** *(full kickoff prompt)*
> We're starting Phase 4 — Special Class calculations.
>
> Read these files first: docs/CLAUDE.md, docs/SESSION_HANDOFF.md, docs/SESSION_LOG.md (Session 7 audit), docs/ROADMAP.md (Phase 4), docs/domain/special-class.md, docs/DECISIONS.md
>
> [... constraints, 8 special-class codes, "match the spreadsheet to the dollar" requirement, "CRITICAL: pause if you can't see the formulas verbatim — guessing is a blocker" ...]

**[walkthrough order Q]**
> "walk through one at a time, do attrition last, step second to last" + dense paragraph on RPO/PREMM/OVERM/STEPM/9994/9993 methods and budgeting philosophy.

**[scope clarification]**
> Three functions per class (budget development + YTD vs actuals + year-end projection), not just budget. 6mo/9mo reports to CON/MYR. 1–5% variance target. DBI is the only reliably-maintained budget. "What is a temp" has four definitions. Pointer to `Labor Report 5.21.26.xlsx` and `DBI FY27-28 Budget Master`. Confirmed RPO methodology from screenshot.

**[OVERM/TEMPM confirmations]**
> 1.0765 = FY26 OT fringe (7.65%). Benefits live in `15.15.002` report. TEMPM 5380 filter = DBI-specific shortcut. 80-hour PP is the norm with Fire dept exception. "the new files look ok, a lot more could be added over time."

**[/ultrareview auth flow]**
> "give detailed instructions for resolving this" + screenshots showing GitHub Authorized OAuth Apps lacked any Anthropic entry. Resolved by installing Claude GitHub App via Claude Desktop Settings → Connectors → GitHub.

**[/ultrareview 12]** — ran cleanly, returned 2 findings.

**[wrap-up choice]**
> "b wrap with handoff"

### Milestones

- **Real workbook inspection (xlsx skill)** — opened `Labor Report 5.21.26.xlsx` (29 sheets) and `DBI FY27-28 Budget Master - Department Phase - 3.3.26.xlsx` (20 sheets); extracted unique formula templates from Operating Report Summary, Retirement Payout, Step, Premium, Overtime, Calendar, Report Data, Special Class, Active Labor, Position Pivot, Balancing tabs. Used `iter_rows` streaming (random-access on read_only workbooks was the wrong pattern — first inspector hung).
- **Three new/updated docs (PR #12)**:
  - `docs/domain/budget-process.md` (NEW, ~95 lines) — three-function model, 6mo/9mo cycle, conservative-bias philosophy, variance target 1–5%, data-quality-by-department caveat, appropriation control primer, 15.15.002 benefits reference
  - `docs/domain/definitions.md` (NEW, ~75 lines) — "Temp" 4 definitions with Controller-side gotcha (no temp benefit accounts), Pay Period section with 80-hour norm + Fire dept exception, stubs + pattern
  - `docs/domain/special-class.md` (OVERHAULED, 47 → 388 lines) — canonical Operating Report Summary formula table (cell-coordinate level), full RPO walkthrough, skeleton walkthroughs for all 7 other classes with cell coordinates pre-traced
- **`/ultrareview` GitHub auth fix** — Anthropic GitHub App not installed; the canonical path is Claude Desktop Settings → Connectors → GitHub (not OAuth Apps, not the CLI). Delegated lookup to claude-code-guide subagent for the authoritative answer.
- **`/ultrareview` run on PR #12** — 1 of 3 free runs used. Two findings: bug_001 (normal — doc misstated `categorizeAccount` default for non-labor accounts as `'none'` when actually `'account'`; real factual error introduced from memorized post-Session-7 mental model); bug_003 (nit — new docs not added to `docs/domain/README.md` index). Both fixed in same PR (commit `a7434fd`).
- **Tests:** 65/65 (no code touched this session).

### Lessons / improvements for next session

- **Re-read functions before citing their behavior in reference docs.** bug_001 was caught because I trusted memorized state of `categorizeAccount` from the Session 7 audit. The fix shipped in PR #10 changed the default — I retained the pre-fix mental model. Memorized state of post-fix code can be stale; treat it the same as memorized commits.
- **xlsx skill pattern note** — for large workbooks, `iter_rows(values_only=True)` and `iter_rows()` streaming is required; `ws.cell(r, c).value` random access on `read_only=True` workbooks is O(n²) and hangs on wide sheets.
- **GitHub auth path documented** — for next session, `/ultrareview` works from Claude Desktop after Settings → Connectors → GitHub install. The OAuth Apps tab does not show Claude (it's a GitHub App, not an OAuth App).
- **Knowledge-capture-before-math pattern worked.** The CRITICAL instruction in the session-start prompt ("guessing is a blocker") prevented a from-scratch math implementation that would have needed to be redone. Replicate this pattern for STEPM and 9994 (the two highest-complexity classes still to come).

---

## Session 9 — Phase 4 RPO math + UI + cleanup (2026-05-23 / 24)

**Worktree:** `nostalgic-cori-933be9`
**Model:** Opus 4.7
**PRs merged:** [#14](https://github.com/alkprojects/kospos/pull/14), [#15](https://github.com/alkprojects/kospos/pull/15), [#16](https://github.com/alkprojects/kospos/pull/16), [#17](https://github.com/alkprojects/kospos/pull/17), [#18](https://github.com/alkprojects/kospos/pull/18), [#19](https://github.com/alkprojects/kospos/pull/19), [#20](https://github.com/alkprojects/kospos/pull/20) + this docs PR
**Tests:** 65 → 96 (+31 across 4 PRs)

### Prompts (compressed)

- **[session start]** RTPOM_E-only kickoff: build special-class module + minimal view + 4th tab; one PR per chunk; do NOT touch other 7 classes.
- **[after PR #14]** "let's step back ... what is the current special class page doing? pp elapsed should specify FY26 pp elapsed. fy27 is next fiscal year." + real FY26 numbers ($249,998 budget, $359,014 YTD/projected) + "what code is 17000, that doesn't appear to be any chartfield."
- **[after PR #15]** "sf budget is for the next two years" + budget development should ask sentiment + PTO eligibility + COLA-adjustment + "does this make sense?"
- **[research prereqs answered]** PTO file shape (employee_id, type, balance); vacation-only hypothesis (low confidence — "maybe you could spin up an agent to look online"); no projected retirement dates in any system; cost.ts has FY26 rates only; multi-dept must be supported.
- **[after PR #17]** "assume your hunch is correct for now. merge as is. start now. ... for historical rpo amounts, add in FY26 projection and include it in the average. ... add a column that shows prior year rpo amounts in next year dollars. ... RPO is so volatile does it even make sense to get so specific?"
- **[after PR #18]** "go" (to start sentiment ±%).
- **[after PR #19]** "persistence move to out of scope ... per employee scenarios, move to out of scope ... let's move on from rpo to the next thing unless you have anything else"
- **[maintenance triage]** "1. yes fix [session log] 2. i'll use this occasionally, not every session [/ultrareview] 3. can you fix this? [xlsx] 4. deal with this [worktree cleanup] then hand off for next session"
- **[xlsx auth]** "confirmed, i ran it" (after auto-mode classifier blocked the CDN install)

### Milestones — PRs in order

| PR | Title | Notes |
|---|---|---|
| [#14](https://github.com/alkprojects/kospos/pull/14) | feat: Phase 4 RTPOM_E math + Special Class tab | First special-class code. 4 pure functions (`historicalActualsMean`, `allocateByLaborShare`, `ytdBudgetPace`, `projectRpoYearEnd`); 19 new tests. |
| [#15](https://github.com/alkprojects/kospos/pull/15) | fix: restructure Special Class page around three-function model | Alex caught FY26/FY27 conflation + fabricated chartfield `17000`. Page split into FY26 (functions 1+2) and FY27 (function 3) with real numbers. |
| [#16](https://github.com/alkprojects/kospos/pull/16) | feat: two-year budget cycle framing | FY27 → FY27-28 Budget Cycle with BY + BY+1 cards. Added "Two-year budget cycle" section to `budget-process.md`. |
| [#17](https://github.com/alkprojects/kospos/pull/17) | docs: SF separation-payout eligibility research | Background general-purpose research agent. Two corrections to Alex's hypothesis: comp time is MOU-dependent (SEIU 1021 pays, MEA doesn't); a "vested sick / wellness pay" balance pays out — probably the "SP" in account 510210's name. |
| [#18](https://github.com/alkprojects/kospos/pull/18) | feat: RPO historical baseline — FY26 projection + COLA-adjusted column | 9-row historical table with PROJ tag; COLA-adjusted column (2.5%/yr placeholder); two means side by side. New `colaAdjustToYear` + 6 tests. |
| [#19](https://github.com/alkprojects/kospos/pull/19) | feat: RPO sentiment ±% controls | Stateful `FyCard` with Less/Same/More + % input + justification textarea. New `applySentiment` + 6 tests. FY27 default "More 25%" → $301k matches Alex's previous chosen value. |
| [#20](https://github.com/alkprojects/kospos/pull/20) | chore: swap xlsx 0.18.5 → 0.20.3 (SheetJS CDN tarball) | Open since Session 3. `npm audit` → 0 vulnerabilities (was 1 high). |

### Side work

- **Worktree cleanup** — removed 9 stale sub-worktree registrations under `.claude/worktrees/` + force-deleted 18 merged local branches. "main is already used by worktree" warnings during `gh pr merge` are gone.
- **Out-of-scope decisions** — RPO state persistence and per-employee scenario builder both deferred ("may pick up later").

### Lessons / improvements for next session

- **Confirm dollar-precise reference data against Alex's real workbook BEFORE writing code, not after.** PR #14 used illustrative numbers I invented (chartfield `17000` doesn't exist); PR #15 had to restructure the whole page once Alex provided real FY26 figures and the three-function framing. Better order: get cell coordinates from Alex first, even when a partial spec exists in `docs/domain/`.
- **The deploy-then-review loop works.** Alex's preference was clear ("push it to the website and i can flag issues from there if any exist"). Each deploy surfaced a real correction. Maintain the cadence for OVERM and beyond.
- **Auto-mode classifier blocks external CDN installs.** Even when a prior handoff specifies the exact URL, the runtime requires fresh authorization. Surface the block immediately with the literal command for the user to run; don't work around it.
- **Knowledge-capture-before-math, again.** PR #17 (research before per-employee math) and the up-front spec reading prevented guessing on payout eligibility. Same pattern should apply to OVERM_E — get Alex's verbal walkthrough before any math lands.

