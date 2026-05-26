# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 22 — Phase 2.0i DSI final + audit, 2026-05-25)

**Phase:** Phase 2.0 — Labor Report deep-dive walkthrough. **COMPLETE end-to-end** (Phase 2.0a–i shipped). **Phase 2.1 next.**
**Last main commit (pre-merge):** `17b4fad` (PR #57 — Phase 2.0h) → `<this PR>` (Session 22 Phase 2.0i)
**Tests:** 146 / 146 passing (no app-code changes this session)
**Branches in flight:** none after this PR merges

### What landed this session — Phase 2.0i

[**PR #_TBD_**](https://github.com/alkprojects/kospos/pulls) — `docs(labor-report): Phase 2.0i — DSI final (Snowflake + v1 readiness cols, +1 DHR MOU row) + Phase 2.2 sub-phase enumeration final (33 sub-phases in 5 tiers + dependency graph + first-sub-phase recommendation) + Phase 2.0 close audit`. Three deliverables:

1. **Data Sources Inventory final** — added 2 columns (Snowflake availability ✓/◐/✗/n/a; v1 readiness ✅/⚙/❌/n/a) and 1 new row (DHR MOU PDFs, splitting them from the derived per-BU COLA schedule). Roll-up table at the bottom: **3 shipped / 5 stub / 11 not built**. 19 sources total.
2. **Phase 2.2 sub-phase enumeration final** — re-structured into 5 tiers (Foundation primitives / Reference data / Importers / Per-tab views / Reconciliation & cross-cutting) with stable `2.2.N` IDs (`2.2.1` through `2.2.33`; Phase-1-shipped `lib/views/calculator/` excluded). Dependency graph as a markdown table showing direct prerequisites + direct unblockers per sub-phase. **First-sub-phase recommendation: Position spine bundle** = `2.2.4` `dept-tree/` + `2.2.12` `obi-pnp/` + `2.2.16` `views/positions/` shipped together as one cohesive PR. Presented with 5 options + trade-offs per Alex's preference.
3. **Phase 2.0 close audit** ([`docs/audits/phase-2-0i-close-audit.md`](audits/phase-2-0i-close-audit.md)) — combined refresh of the Session 19 internal-setup audit Areas A–G + the Session 17 walkthrough audit (anchor verifier, cross-doc consistency, Data Issues catalog drift). Anchor verifier rebuilt in `.scratch/verify_anchors.py` + `.scratch/verify_anchors_full.py`; **261/267 anchor refs OK** across `labor-report.md` + every doc that references it, 6 broken are all pre-existing patterns (none introduced by 2.0i). Audit doc added to [`docs/audits/README.md`](audits/README.md) index.

Cumulative file size: `labor-report.md` grew from 8,350 → 8,518 lines (~170 lines added by 2.0i; the DSI + sub-phase refresh + anchor migration). `SESSION_LOG.md` will land at ~2,160 lines after the Session 22 entry.

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

1. **Phase 2.0 is fully closed.** All 27 walkable tabs walked + DSI finalized + sub-phase enumeration final + audit complete. The labor-report walkthrough is a stable reference document going forward. **Next phase: Phase 2.1 = hide budget-dev UI behind a route guard** (small focused PR), then Phase 2.2.1 = Position spine bundle.

2. **Phase 2.2 first sub-phase recommendation is up to Alex.** I recommended the **Position spine bundle** (`2.2.4` + `2.2.12` + `2.2.16` = dept-tree + full obi-pnp importer + views/positions/) because Position is the spine every Tier-4 view joins through, and the bundle ends in the first user-visible production page since Phase 1. 4 alternatives documented with trade-offs. **Awaiting Alex's pick.**

3. **The Phase 2.0i close audit surfaced 6 items, none blocking.** Worktree sweep (30 sec), SESSION_LOG trim (~1 hour cleanup PR), memory-file citation anti-pattern migration (~30 min cleanup PR), labor-report.md split decision (defer to Phase 2.4), Phase 2.2 first sub-phase pick (Alex), continued audit cadence (works as designed). All non-blocking; the cleanup PRs can land in any order before Phase 2.1.

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
| 2.0i | **DSI final + Phase 2.2 sub-phase enumeration final + Phase 2.0 close audit** | **done 2026-05-25** |
| **2.1** | **Hide budget-dev UI (route guard)** | **NEXT** |
| 2.2 | Per-tab UI sub-phases (33 sub-phases enumerated in 5 tiers; first sub-phase = Position spine bundle, recommended) | pending |
| 2.3 | Excel export | pending |
| 2.4 | Importer wiring (incl. ADR amendments per the 6 proposed ADRs — though 5 of 6 landed in PR #54 ADRs 010-015; only ADR-007 amendment for BVA-as-distinct-source remains) | pending |

## Blockers for Alex

None landing-related. Live site:
<https://alkprojects.github.io/kospos/>. Spot-check the new sections
on the live site when convenient:

- [docs/domain/labor-report.md § Data sources inventory](domain/labor-report.md#data-sources-inventory-built-during-walkthrough) — 19-row final inventory with Snowflake + v1 readiness columns and roll-up.
- [docs/domain/labor-report.md § Phase 2.2 sub-phases](domain/labor-report.md#phase-22-sub-phases-dependency-order) — 33 sub-phases in 5 tiers + dependency graph + first-sub-phase recommendation.
- [docs/audits/phase-2-0i-close-audit.md](audits/phase-2-0i-close-audit.md) — Phase 2.0 close audit with 6 items surfaced.

## Next session prompt — Phase 2.1 (hide budget-dev UI behind a route guard)

Paste this verbatim to start Session 23:

````
This session starts Phase 2.1 — the small focused task that hides the
budget-dev / importer UI behind a route guard before any Phase 2.2
sub-phase ships a real user-visible page. Phase 2.0 is fully closed
(27 walkable tabs walked + DSI finalized + Phase 2.2 sub-phase
enumeration final + Phase 2.0 close audit complete).

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file)
  docs/SESSION_LOG.md (Session 22 entry — Phase 2.0i closeout)
  memory/MEMORY.md + the 9 memory files
  docs/audits/phase-2-0i-close-audit.md — the close audit
  docs/ROADMAP.md (re-confirm Phase 2.1 scope)
  app/src/lib/importers/ + app/src/App.tsx (current entry points)

Confirm state on main:
  git log --oneline origin/main -5

==============================================================================
TASK — Phase 2.1: route guard for budget-dev / importer UI
==============================================================================
Branch: feat/budget-dev-route-guard
Scope: Hide the budget-dev / importer UI behind a route guard so the
       production app surface is clean before Phase 2.2 sub-phases
       start landing user-visible pages.

  1. **Inventory the current dev-only surfaces.** Walk through
     `app/src/` and identify everything that's currently exposed at
     `/kospos/...` that's intended only for budget-dev use (importer
     UI, calculator dev panel, etc.). Document the inventory in the
     PR description.

  2. **Decide the gate mechanism.** Options to present with trade-offs:
     - **(a) URL prefix** (`/kospos/dev/...`) — clean, unbookmarkable
       by accident, but visible in routing.
     - **(b) Query-string flag** (`?dev=1`) — bookmarkable, dismissable.
     - **(c) localStorage / IDB flag** + admin toggle — most robust,
       most code to maintain.
     - **(d) Env-var build-time gate** — strongest hide (dev surfaces
       not in the bundle at all), but requires separate build configs.
     Recommendation: (a) URL prefix, paired with a tiny "Dev mode"
     banner when the prefix is active. **Confirm with Alex before
     implementing.**

  3. **Implement the chosen gate.** One PR, scoped to the route guard.
     No new pages, no new importers, no other changes.

  4. **Verify visually.** Run `npm run dev`, confirm:
     - Production `/kospos/` shows only the user-facing surface.
     - `/kospos/dev/` (or chosen path) still exposes the budget-dev
       UI for ongoing work.
     - Screenshot before/after for the PR description.

  5. **Test pass.** `npm test` stays green.

  6. **Update SESSION_HANDOFF.md** with Phase 2.2.1 next-session prompt
     (the Position spine bundle, or whichever option Alex picked from
     audit item E).

==============================================================================
Hard constraints
==============================================================================

  - Branch from main, single-purpose name.
  - **One PR only.** No bundling the route guard with the Position
    spine bundle even if both are small.
  - **`npm test` stays green.**
  - One PR; merge after CI passes; fast-forward main:
    `git -C "C:\Users\ALK\Desktop\Claude Projects\kospos" pull --ff-only origin main`
  - Commit message ends with the Co-Authored-By line per CLAUDE.md.

==============================================================================
What we are NOT doing
==============================================================================

  - **No Phase 2.2 sub-phase work this session.** Route guard is a
    Phase 2.1 prerequisite; sub-phases land after.
  - **No tab walkthroughs.** Phase 2.0 is closed.
  - **No new audit.** Next audit fires at Phase 2.1 close.
  - **No ADR amendments.** Phase 2.4.
  - **No tool / setting / hook changes** (cleanup PRs from audit
    items A/B/C are separate single-purpose PRs that can land before
    or after Phase 2.1).

==============================================================================
Session-end checklist
==============================================================================

Before ending, update SESSION_HANDOFF.md with:
  - Phase 2.1 status (gate landed; production surface clean).
  - Phase 2.2.1 next-session prompt (Position spine bundle or
    Alex-chosen alternative).
  - Re-ask the 5 restated questions + 12 reasonable-default calls (#5-16)
    + 1 open action item (#17). DROP the 4 items Alex acknowledged
    in S21 (per [memory `feedback_dont_reremind.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/feedback_dont_reremind.md)).

If the route guard reveals architectural questions that need ADR
treatment (unlikely — it's a small focused change), elevate during
the session rather than carrying forward.

Recommended model: claude-sonnet-4-6 (small focused app-code change;
no deep synthesis required). Fallback to claude-opus-4-7 only if the
gate mechanism decision turns out to be architecturally significant.
Effort: small to medium.
````

### Recommended model (Phase 2.1)

`claude-sonnet-4-6` — focused app-code change; no synthesis required.

### Recommended effort (Phase 2.1)

`small to medium` — one PR, scoped tightly.

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
