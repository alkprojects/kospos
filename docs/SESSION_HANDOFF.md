# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 23 — Phase 2.1 route guard, 2026-05-25)

**Phase:** Phase 2.1 — Hide budget-dev UI behind a route guard. **COMPLETE.** Production `/kospos/` now shows only Job Class Calculator. **Phase 2.2.1 (first sub-phase) next, gated on Alex's pick for audit item E.**
**Last main commit:** `94b844e` ([PR #59](https://github.com/alkprojects/kospos/pull/59) — Phase 2.1) → previous: `1773ee2` (PR #58 — Phase 2.0i)
**Tests:** 152 / 152 passing (146 + 6 new dev-mode tests)
**Branches in flight:** none after this PR merges

### What landed this session — Phase 2.1

[**PR #59**](https://github.com/alkprojects/kospos/pull/59) — `feat(app): Phase 2.1 — hide budget-dev tabs behind ?dev=1 route guard`. Three files changed, ~165 lines added net.

**Inventory of dev-only surfaces (now gated):**

| Tab | Visible at `/kospos/`? | Reason |
|---|---|---|
| Job Class Calculator | **yes** | Phase 1 finished — the one production-ready user-facing surface |
| Load Reports (importer + DataIssuesPanel) | hidden behind `?dev=1` | Budget-dev workflow only until Phase 2.2 sub-phases consume the data |
| Positions (pre-spine half-built view) | hidden behind `?dev=1` | Superseded by Phase 2.2.1 Position spine bundle |
| Special Class (RPO + OVERM) | hidden behind `?dev=1` | Explicit roadmap call: code preserved, UI hidden until Phase 6 |

**Gate mechanism — `?dev=1` query flag + localStorage persistence**

- `/?dev=1` → turns on; stores `localStorage['kospos:dev-mode'] = '1'`
- `/?dev=0` → turns off; clears storage
- no flag → falls back to localStorage (so gate survives reloads once enabled)
- In-app "Disable dev mode" banner button → clears storage AND strips `?dev=` from the URL

**Why this over URL prefix:** the app has no router today, so a URL prefix would require either `react-router-dom` or a `404.html` SPA-redirect trick for GitHub Pages — heavier than a single-purpose gate justifies. The query-string approach also matches the original `?budget=1` intent in [ROADMAP.md § Phase 2.1](ROADMAP.md). Confirmed with Alex via AskUserQuestion before implementing.

**New code:** `app/src/lib/dev-mode.ts` + `app/src/lib/dev-mode.test.ts` (6 tests) + `app/src/App.tsx` (devOnly tab flag + banner). Verified 5 gate paths in `npm run dev` via preview MCP (production, URL-on, persistence, Disable button, URL-off explicit) — no console errors.

### Items surfaced for Alex's review (carry forward)

Per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md): the 4 items Alex acknowledged in S21 stay DROPPED (the 7 expired Cat 17/18 positions; Cat 17/18 Charter cite reminders; Guaiumi data bug; CPO=510210). The 6 items the [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md) surfaced for Alex's decision are listed under "Audit-surfaced items" below.

Per Alex's "restate everything in plain English" preference, every carry-forward below is plain-English restated — no file pointers required.

#### Restated questions for Alex (5)

These were drafted as reasonable-default calls deferred for Alex's confirmation. Items 1-4 are repeated from prior sessions; **item 5 is new from Session 21** (TX rules — 4 TODOs in [memory `temporary_exchange_tx.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/temporary_exchange_tx.md)).

1. **Attribution rate on Operating Report Summary.** Three different things on the Operating Report Summary page look like they're called "attrition rate" at the DBI / CPC dept-group level:
   - **G42 / H42** = (9993 ÷ non-9993 labor) — the spread between the budgeted 9993 attrition savings line and total labor, expressed as a %
   - **L23 / L32** = (projected balance ÷ total budget) — what % of the total budget is projected to remain unspent
   - **H43** = a hand-keyed prior-year number with a tooltip-note "Calculated, Questionable"

   All three display as percentages on the same page, look similar, but mean different things. Which one is "the attrition rate" you'd put in the report sent to CON / MYR? **My current default:** G42 / H42 is canonical (9993 ÷ non-9993); L23 / L32 gets renamed to "leftover %" in KosPos. **Confirm or correct?**

2. **`Department Group` pivot label.** The Operating Report Summary's GETPIVOTDATA calls reference a pivot label called `Department Group` — but Report Data doesn't have a column with that exact name. It's a workbook-internal pivot grouping. When KosPos emits the labor-report-shaped .xlsx for downstream consumers, do we need to preserve that `Department Group` label so other people's GETPIVOTDATA formulas still work? **My current default:** yes, preserve it (cosmetic, but breaks downstream Excel formulas if we rename).

3. **OPS Detail snapshot-diff key.** The OPS Detail "what changed since the last report" panel needs a key to identify each row across snapshots. Options:
   - **(a)** Position Number alone — simplest, but doesn't differentiate vacant-then-filled (same position number, different occupant)
   - **(b)** `(Effective Dept, Position Number, Fill Status, Budget Job Code)` — captures dept moves + reclassifications
   - **(c)** Position Number + a separate tracker for "who occupied it when"

   **My current default:** option (b). **Confirm or correct?**

4. **Step variance merit-event aware.** The Step (Tab 18) walkthrough proposed making per-PP step variance "merit-event aware" — instead of uniform per-PP proration, the formula would understand "this employee advanced a step on PP15, so pre-PP15 PPs used Step 4 budget and post-PP15 PPs use Step 5 budget." Adds modeling complexity (per-employee step history) but makes per-PP variance numbers meaningful (currently they drift pre/post-merit even though the FY total is correct). Implement now in Phase 2.4 importer, or defer to a Phase 2.2 sub-phase? **Default: defer.**

5. **TX (Temporary Exchange) rules.** Session 21 surfaced the TX concept via Alex's Marco Jacobo worked example, but four follow-up rules need confirmation before the `lib/views/temp-limits/` sub-phase can model TX as a typed entity:

   **5a.** Is the TX `expired_date` (the date in the workbook col J that says when a TX arrangement ends) set by **CSC in fixed increments** (per CSC Rule 114's 1,040-hour blocks for Cat 17, or 6-month rolls), or is it **negotiated independently** between DHR and the originating dept on a case-by-case basis? My current default: CSC-set in increments, but the workbook doesn't make this distinction clear.

   **5b.** Can a TX be **Cat 16** as well, or only Cat 17/18? (The workbook column is named `CAT_17_18 Exempt TX Expired Date`, suggesting Cat 17/18 only, but I want to be sure Cat 16 doesn't have a TX-like mechanism.)

   **5c.** Is "TX" the same concept as a **"limited duration appointment"** in DHR/PS HCM terminology, or is it a distinct PS HCM construct? They feel related but I haven't confirmed.

   **5d.** How does **TX renewal** work? Charter §10.104-17 + §10.104-18 say Cat 17/18 "shall not be renewable" (which would mean a TX dies when its expired_date hits and you can't extend), but CSC Rule 114 implies up-to-1,040-hour increments are allowed for Cat 17 (which would mean some form of extension IS possible). Reconcile?

#### Reasonable-default calls deferred (12 — restated in plain English per Alex's preference)

**8 from Session 20 (Tab 23-25 walkthroughs):**

5. **(Tab 23)** I reverse-engineered the 6 slicer-chip definitions (`Vacant`, `TEMP`, `Position =/= Budget`, `Temp on Budgeted Position`, `On Leave`, `Exclude`) from the pivot's field bindings. Best-guess semantics in Tab 23 § "Explicit categorical slicer semantics" table. **Do those definitions match your working semantics, or are any wrong?** (Most important: `Position =/= Budget` — does it mean "employee's effective job code differs from position's budgeted job code", or something else?)

6. **(Tab 23)** Where does `Vacant Date` come from? — Possibilities: computed from a P&P Data column natively, hand-entered per snapshot, or derived from the vacancy-history snapshot chain. I haven't inspected the CI formula yet to confirm.

7. **(Tab 23)** `Previous Employee2` (P&P Data col Q) vs `Previous Employee` (cache field 19) — I'm guessing one is second-to-last incumbent, the other is most-recent. **Which is which?**

8. **(Tab 24)** `V Check` semantics for TEMPM-budgeted rows — the formula `IF(P="TEMPM", "", ...)` skips the check, so a temp planned for "E2P" (convert to PCS) on a TEMPM-budgeted position wouldn't appear in Vacancies. **Should it still appear there?**

9. **(Tab 24)** Cost-basis for blank `W` cells — when an Active row has Status = "Not started / List / Posted", the cost cell is blank and gets summed as zero. **Default I picked:** KosPos always computes the expected cost (don't leave blank); let user toggle a "show planned-only" view that hides un-priced rows. **Confirm?**

10. **(Tab 24)** PlannedAction history retention — when a planned action is completed (hire happens, separation files), should KosPos keep the diff records indefinitely or roll up older than 18 months? **Default:** 18 months with summary roll-up.

11. **(Tab 24)** DBI→CPC transfer-of-function propagation — when a position transfers from DBI to CPC mid-year, does it stay on DBI's Staffing Plan until end-of-year or jump to CPC's immediately? Tied to BVA chartfield reconciliation. **Default:** stays on originating dept until EOY for reporting; flagged as "transferring."

12. **(Tab 24 + Tab 25)** Active-row blank-`W` under-count surfaced as "X of Y priced ⚠" diagnostic chip with one-click jump-to-fix; annualized rows switched from pure-PP to COLA-aware per [memory `feedback_projections_always_cola_aware.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_projections_always_cola_aware.md). **Confirm both?**

**4 new from Session 21 (Tab 1-22 walkthroughs):**

13. **(Tab 12)** `E2P` = "Eligible to Promote" — does that mean (a) the employee has met the time-in-class minimum, (b) DHR has placed them on a promotion list, or (c) something else? Belongs in `appointment-types.md`.

14. **(Tab 21)** `PARTIALLY FILLED` semantics — used for pool positions (commissioners). KosPos plans to map this directly to `is_pool_position = true`. **Confirm this 1:1 mapping or describe other states.**

15. **(Tab 21)** Reporting Tree change-proposal cols (AI:AT — Budget Job Code Change / Manager Position Number Change / etc.) — when you fill these in today, what's the workflow? Does someone review, or do you just edit PS HCM directly later? KosPos's Change Mode design assumes a review step.

16. **(Tab 15)** Succession plan scope priority — Phase 2 (current-year workspace) or Phase 7 (people/talent management)? Currently positioned as draft. What class set counts as "leadership/strategic" — MCCP + selected senior PCS, or broader?

#### Open action items (1 — remaining after S21 acknowledgments)

17. **The 5 vacant-no-RTF positions.** Restated in plain English: there are 5 positions in the current snapshot that show **Fill Status = VACANT** and **Latest RTF Submitted Date = blank/null** — meaning the workbook claims no Request to Fill has ever been filed. **But** per [memory `staffing_plan_types.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/staffing_plan_types.md), you flagged that "no RTF" is not always accurate in practice — the position may have had an incumbent in the past (i.e., a "vice" history), which would mean an RTF *must* have been filed at some point. The action: for each of these 5 positions, look at the prior-incumbent history. If there's a "vice" (prior employee on the position), the "no RTF" is a data integrity issue (the RTF was filed but didn't get tracked here), not a real "we've never tried to fill this." If there's no vice history, "no RTF" is likely real and the position is truly an intentional hold or unfunded slot. **Disposition needed per position: data bug vs intentional hold.** Surfaced in [scenario-tests § Scenario 5](audits/labor-report-scenario-tests.md#scenario-5--vacant-but-no-rtf).

#### Audit-surfaced items (6 from Phase 2.0i close audit)

From [`docs/audits/phase-2-0i-close-audit.md`](audits/phase-2-0i-close-audit.md):

A. **Sweep 3 stale post-merge worktrees.** 30-second cleanup; powershell commands in audit § Area F. Worktrees:
   - `funny-cannon-ff06d7` (PR #55 merged)
   - `nervous-noether-2e2f42` (PR #56 merged)
   - `nostalgic-chaplygin-08a313` (PR #57 merged)

   ```powershell
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\funny-cannon-ff06d7"
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\nervous-noether-2e2f42"
   git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\nostalgic-chaplygin-08a313"
   git worktree prune
   ```

B. **Trim `SESSION_LOG.md` Sessions 1–16 to one-paragraph digests.** File is 1,977 lines and growing. Sessions 1–16 are pre-Phase-2; their per-prompt detail isn't actively consulted any more. Estimate ~1,000 lines removed, leaving ~1,000 lines for the actively-cited Sessions 17+. Single-purpose docs PR; ~1 hour.

C. **Migrate the 25× memory-file citation anti-pattern in `labor-report.md`.** Pattern (shown in a fenced block to avoid this handoff triggering the verifier):

   ```text
   [`memory file.md` ...](#tab-24--staffing-plan)
   ```

   Should become:

   ```text
   [memory `file.md`](file:///C:/Users/ALK/.claude/projects/.../memory/file.md)
   ```

   per the S21 SESSION_LOG lesson. Single-purpose cleanup PR; ~30 min. Bundleable with item B.

D. **Defer the `labor-report.md` split until Phase 2.4.** File is 8,518 lines (past S19's 7,500-line splitting threshold), but splitting costs the model nothing on Grep and only marginally helps the human-skim experience. Re-evaluate at Phase 2.4 importer build (a natural junction if per-tab walkthroughs need cross-importer reference). No action this audit cycle.

E. **Confirm or override the Phase 2.2 first sub-phase recommendation.** I recommend the Position spine bundle (`2.2.4` `dept-tree/` + `2.2.12` `obi-pnp/` + `2.2.16` `views/positions/`) as one PR. Four alternatives with trade-offs are documented in `labor-report.md` § "Recommended Phase 2.2 first sub-phase". **Your call before starting Phase 2.2.**

F. **Continue audit cadence at every phase close.** Phase 2.1 close fires the next audit (likely small — Phase 2.1 is a focused route-guard task).

### Top 3 findings to surface for Alex this session

1. **Phase 2.1 shipped.** [PR #59](https://github.com/alkprojects/kospos/pull/59) — production `/kospos/` now shows only Job Class Calculator. The three budget-dev tabs (Load Reports, Positions, Special Class) are gated behind `?dev=1`. Banner + Disable button per Alex's confirmation. **Next: Phase 2.2.1 = Position spine bundle** (recommended; audit item E is the gating decision).

2. **Gate mechanism flipped from URL prefix to query-string.** The S22 handoff recommended (a) URL prefix. After inventorying the app, I flipped the recommendation to (b) query-string because the app has no router today — adding routing for a single-purpose gate would have been heavier than the task justified. Confirmed with Alex via AskUserQuestion before implementing. Also matches the original `?budget=1` intent in [ROADMAP.md § Phase 2.1](ROADMAP.md).

3. **Phase 2.1 close fires the next audit per cadence rule.** Session 24 opens with a small Phase 2.1 close audit before any Phase 2.2 work. Should be quick — Phase 2.1 is 3 files + a query-string gate. After the audit, Phase 2.2 starts with audit item E (first-sub-phase pick), then Phase 2.2.1.

### Cumulative state of the labor-report walkthrough

| Phase | Tab | Status |
|---|---|---|
| 2.0a | 5 Calendar | done 2026-05-24 |
| 2.0b | 7 BI Payroll | done 2026-05-25 |
| 2.0c | 6 P&P Data | done 2026-05-25 |
| 2.0d | 20 Report Data | done 2026-05-25 |
| 2.0e | 26 OPS Summary + 27 OPS Detail | done 2026-05-25 |
| 2.0f | 16 Premium + 17 Overtime + 18 Step + 19 Retirement Payout | done 2026-05-25 |
| 2.0g | 23 Vacancies and TEMP + 24 Staffing Plan + 25 Budget Summary | done 2026-05-25 |
| 2.0h | 14 tabs: 1 Data, 2 Departments, 3 Combo, 4 BFM, 8 Roster Approvers, 9 EE Additional Pay, 10 Probation, 11 Eligibility Lists, 12 TEMP Limits, 13 Inactive, 14 Separations, 15 Succession, 21 Reporting Tree, 22 Pos by Dept | done 2026-05-25 |
| 2.0i | DSI final + Phase 2.2 sub-phase enumeration final + Phase 2.0 close audit | done 2026-05-25 |
| 2.1 | Hide budget-dev UI (route guard) — `?dev=1` + localStorage + banner | **done 2026-05-25** |
| **2.2** | **Per-tab UI sub-phases** (33 sub-phases enumerated in 5 tiers; first sub-phase = Position spine bundle, recommended — **pending Alex's pick on audit item E**) | **NEXT** |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR amendments per the 6 proposed ADRs — though 5 of 6 landed in PR #54 ADRs 010-015; only ADR-007 amendment for BVA-as-distinct-source remains) | pending |

## Blockers for Alex

None landing-related. Live site:
<https://alkprojects.github.io/kospos/>. Spot-check on the live site
when convenient:

- The production `/kospos/` surface should now show only **Job Class Calculator**. If you see Load Reports / Positions / Special Class, the deploy hasn't finished yet.
- `/kospos/?dev=1` brings them back + shows a yellow dev-mode banner with a "Disable dev mode" button.
- `/kospos/?dev=0` (or the Disable button) returns to the production surface and clears the persisted flag.

**One decision pending: audit item E** — which Phase 2.2 sub-phase to start with. Recommended option: the Position spine bundle (`2.2.4` + `2.2.12` + `2.2.16`). Four alternatives documented in [labor-report.md § Recommended Phase 2.2 first sub-phase](domain/labor-report.md#phase-22-sub-phases-dependency-order). Session 24 opens with the Phase 2.1 close audit, then asks Alex to pick before starting code work.

## Next session prompt — Phase 2.1 close audit + Phase 2.2 first sub-phase pick

Paste this verbatim to start Session 24:

````
This session opens with the Phase 2.1 close audit (per WORKFLOW.md
§ Audit cadence), then asks Alex to pick the Phase 2.2 first
sub-phase (audit item E from the Phase 2.0i close audit), then
starts the picked sub-phase. Phase 2.1 is closed — `/kospos/` shows
only Job Class Calculator; budget-dev tabs gated behind `?dev=1`
(PR #59, merged `94b844e`).

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/SESSION_LOG.md (Session 23 entry — Phase 2.1 closeout)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-0i-close-audit.md — has item E + audit cadence rule
  docs/domain/labor-report.md § "Phase 2.2 sub-phases" — 33 sub-phases,
    5 tiers, dependency graph, first-sub-phase recommendation with 5
    options and trade-offs
  docs/ROADMAP.md (re-confirm Phase 2.2 scope)
  app/src/App.tsx + app/src/lib/dev-mode.ts (Phase 2.1 landed code)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
STEP 1 — Phase 2.1 close audit (small)
==============================================================================
Per the audit-cadence rule (every phase close → audit before any new
work). Phase 2.1 was tiny (3 files, +165 lines net, 6 new tests).
Expect this audit to also be tiny.

Write `docs/audits/phase-2-1-close-audit.md` covering:

  - Anything in the Phase 2.1 PR (#59) that warrants a workflow / docs
    follow-up. Spot-check: dev-mode docs in ROADMAP.md Phase 2.1 say
    "?budget=1 query escape hatch" — the actual gate uses `?dev=1`.
    Either reconcile ROADMAP.md to match the implementation, or note
    the discrepancy for Alex to choose. (Recommend reconciling — it's
    a docs sync, ~5 min.)
  - Status of the 6 items A-F from the Phase 2.0i close audit. Most
    likely unchanged (A/B/C cleanup PRs deferred, D = defer to 2.4,
    E pending Alex's pick this session, F = fired correctly this
    cycle). Brief status update only.
  - Any new drift surfaced (memory file freshness, tool sprawl, etc.).
    Likely none — only 1 session elapsed since the last audit.
  - Add the new audit doc to `docs/audits/README.md` index.

Single-purpose docs PR: `docs(audits): Phase 2.1 close audit`.

==============================================================================
STEP 2 — Ask Alex to pick the Phase 2.2 first sub-phase
==============================================================================
Audit item E from the Phase 2.0i close audit is the gating decision.
Use AskUserQuestion. The recommended option:

  **Position spine bundle** = `2.2.4` `dept-tree/` + `2.2.12` `obi-pnp/`
  + `2.2.16` `views/positions/` shipped as one cohesive PR.

The 4 alternatives are documented in `docs/domain/labor-report.md`
§ "Recommended Phase 2.2 first sub-phase". Present them with the
trade-offs from that section.

==============================================================================
STEP 3 — Start Phase 2.2.<N> (the picked sub-phase)
==============================================================================
Branch + scope depend on the pick. If Position spine bundle:
  Branch: feat/position-spine-bundle
  Scope:
    - Build `lib/dept-tree/` (Tier 1 foundation primitive)
    - Build `lib/importers/obi-pnp/` (Tier 3 importer — full version,
      not the current stub)
    - Build `lib/views/positions/` (Tier 4 per-tab view) — promote
      to a non-dev tab once it's ready
    - Remove the `devOnly` flag from the Positions tab in App.tsx
      once the spine view is the real user-facing surface
    - Parity tests against the source workbook for the dept(s) Alex
      confirms

If a different option is picked, scope adjusts accordingly per the
labor-report.md § first-sub-phase doc.

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose names.
  - **Audit PR and sub-phase PR are separate.** Don't bundle.
  - **`npm test` stays green** (currently 152 / 152).
  - One PR per logical change; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit messages end with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - **No mixing the audit PR with the sub-phase PR.** Two separate PRs.
  - **No tab walkthroughs.** Phase 2.0 is closed.
  - **No ADR amendments.** Phase 2.4.
  - **No removing the dev gate.** Phase 2.1 is good; selective
    promotion of individual tabs happens as the sub-phase ships
    each one.
  - **No tool / setting / hook changes** unless surfaced by the audit.

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.1 close audit status + new audit doc link.
  - Phase 2.2.<N> status (which sub-phase Alex picked + progress).
  - Phase 2.2.<N+1> next-session prompt (or continuation of the
    bundle if Alex picked the Position spine bundle and it took the
    whole session).
  - Re-ask the 5 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17). DROP the 4 items Alex acknowledged
    in S21 (per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md)).
  - Carry-forward update on the 6 audit-surfaced items A-F.

If a Phase 2.2 sub-phase reveals an architectural question that needs
ADR treatment, elevate during the session rather than carrying forward
(per CLAUDE.md non-negotiable #7).

Recommended model: claude-opus-4-7 — the Position spine bundle is the
largest Phase 2 sub-phase by code volume + cross-source joins (BFM + OBI
+ PS HCM) and the audit step adds synthesis. Fallback to claude-sonnet-4-6
if Alex picks a smaller sub-phase.
Effort: large for Position spine bundle; medium for a smaller pick.
````

### Recommended model (Phase 2.2.<N>)

`claude-opus-4-7` if Position spine bundle (large, cross-source joins,
synthesis-heavy). `claude-sonnet-4-6` if a smaller single-source
sub-phase like `2.2.2` `pay-period-calendar/` or `2.2.3` `bi-payroll/`.

### Recommended effort (Phase 2.2.<N>)

`large` for Position spine bundle (3 packages); `medium` for a single
package sub-phase.

---

## Notes for the next-session model

- **The workbook path:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\Labor Report 5.21.26.xlsx` (gitignored — never commit).
  openpyxl `read_only=True` mode if needed (read_only=False chokes on
  pivot caches under Python 3.14 + openpyxl 3.1.5).
- **Example reports folder:** `C:\Users\ALK\Desktop\Claude Projects\Position
  Management\example reports\Reports\` — full inventory in
  [`data-sources/reports-folder-inventory.md`](data-sources/reports-folder-inventory.md).
- **The local main worktree is at** `C:\Users\ALK\Desktop\Claude Projects\kospos`.
  After each merge: `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos"
  pull --ff-only origin main`.
- **Anchor-link convention** (per [ADR-014](DECISIONS.md) +
  [Session 19 audit](audits/internal-claude-setup-audit.md) +
  Phase 2.0h migration + [Phase 2.0i close audit](audits/phase-2-0i-close-audit.md)):
  github-slugger uses lowercase + strip-non-(word|space|hyphen|underscore)
  + per-space-replaced-with-hyphen (NOT collapse multi-space runs) +
  0-indexed occurrence-count suffix on dupes. Phase 2.0i added the
  Phase 2.2 tier rename — direct refs to old `#1-cross-cutting-infrastructure`
  / `#2-per-tab-modules` were migrated to the parent section
  `#phase-22-sub-phases-dependency-order` for stability against future
  tier renumbering.
- **Memory-file citation convention** — use the file:// URL pattern.
  AVOID the `(#tab-24--staffing-plan)` anti-pattern (semantically
  misleading even when it "works" inside labor-report.md). The audit's
  item C surfaces this for batch cleanup.
- **Make the reasonable call, document it, keep going** when
  Alex-level prose details aren't blocking. Flag in the relevant
  tab's Open Questions list. **But: don't re-ask items Alex
  already acknowledged** per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md).
- **`gh pr merge --squash` fails from a worktree** when local main is
  checked out elsewhere. Use `gh api -X PUT repos/alkprojects/kospos/pulls/N/merge
  -f merge_method=squash` instead — pure server-side merge, no local
  branch switch.
- **Audit cadence** (per [WORKFLOW.md § Audit cadence](WORKFLOW.md)):
  the Phase 2.0i close audit was the first event-based trigger to
  fire under the rule. Next audit fires at Phase 2.1 close.
- **Anchor verifier** is at `.scratch/verify_anchors.py` (intra-file)
  + `.scratch/verify_anchors_full.py` (intra + cross-doc). `.scratch/`
  is gitignored. Run with `python .scratch/verify_anchors_full.py`
  from the worktree root after any heading-level edit.

---

## Pre-Session 22 status archived below

Original content from end-of-Session-21 handoff retained for reference.

---

## Current status (end of Session 21 — Phase 2.0h Reference + tracking tabs, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **COMPLETE — all 27 walkable tabs walked.**
**Last main commit (pre-merge):** `b523ad4` (PR #56 — Phase 2.0g) → `17b4fad` (PR #57 — Session 21 Phase 2.0h)
**Tests:** 146 / 146 passing (no app-code changes this session)
**Branches in flight:** none after this PR merges

### What landed in Session 21 — Phase 2.0h

[**PR #57**](https://github.com/alkprojects/kospos/pull/57) — Phase 2.0h shipped 14 walkthroughs (Tabs 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 21, 22) + 14 KosPos improvement headings + 16 new Data Issue flag categories + 9 new Phase 2.2 sub-phases + 2 new memory files (TX entity, don't-re-remind). ~1,700 lines added to `labor-report.md`. 23 anchor migrations clean (Tab 26: -10 → -24; Tab 27: -11 → -25).

### Top findings (S21)

1. **Phase 2.0 walkthrough COMPLETE** — every tab in the workbook now has a walkthrough.
2. **TX (Temporary Exchange) modeled provisionally** — typed entity with `(original_position, original_employee, temp_employee, start_date, expired_date, source_appointment_type)` schema; 4 TODOs for Alex confirmation (now surfaced as Restated Question #5 above).
3. **Reporting Tree change-proposal columns are the Change Mode precursor** — Tab 21 has 13 user-input change-proposal columns that map 1:1 to KosPos's `ProposedChange` entity per ADR-003.

(See full Session 21 closeout in `docs/SESSION_LOG.md` § Session 21.)
