# Session Handoff

Updated at the end of every session. The next session reads this before doing anything else.

---

## Current status (end of Session 12 + roadmap pivot, 2026-05-24)

**Phase:** Pivoting into **Phase 2 — Current-Year Workspace (the Labor Report rebuild).**
**Last main commit:** _(to be filled after merge of the pivot PR — see below)_
**Tests:** 146/146 passing
**Branches in flight:** `docs/phase-2-pivot` (this PR — auto-merge after CI green)

### Recently landed

- **[PR #30](https://github.com/alkprojects/kospos/pull/30)** — `docs: SF authoritative reference (authorities + appointment-type taxonomy)`. Two new domain files (`authorities.md`, `appointment-types.md`) + extensions across `domain/` and `data-sources/`. See the Session 12 entry in `SESSION_LOG.md` for the full briefing.
- **[PR #31](https://github.com/alkprojects/kospos/pull/31)** — `docs(session-12): briefing + log entry`.
- **THIS PR (pivot)** — `docs: roadmap pivot to current-year workspace (Phase 2)`. New ROADMAP.md, new ADR-009, new `docs/domain/labor-report.md` skeleton.

## The pivot, in one paragraph

The original roadmap (Phases 0 → 10 with the org chart last) was too vague to execute and required too many parallel decisions. **New strategy: build one self-contained workspace at a time, starting with the current-year workspace** — a recreated-and-improved version of `Labor Report 5.21.26.xlsx`. UI in KosPos + improved Excel export so users keep the workbook habit while moving analysis into the app. RPO + OVERM work from Sessions 9–11 stays in the codebase but is route-guarded out of the app shell (re-exposed in Phase 6 Budget Development). See [ADR-009](DECISIONS.md) and [`docs/ROADMAP.md`](ROADMAP.md).

## Data-source strategy (confirmed by Alex)

SF is migrating to Snowflake but the timeline is long ("a ways off"). For v1, **every update is a user upload** of source files. Some enhancements (e.g., DHR class-spec lookups) may need website scraping. The data-source inventory per labor-report tab is the headline output of the next session's walkthrough — Alex will go through each source and where it comes from.

## Phase 2 sub-phases

| # | Sub-phase | Output |
|---|---|---|
| 2.0 | **Deep-dive walkthrough** — every tab of the Labor Report | `docs/domain/labor-report.md` filled in tab-by-tab; backlog of importers and UI sub-phases |
| 2.1 | Hide budget-dev UI | Route-guarded `SpecialClassView`; `?budget=1` escape hatch for dev access |
| 2.2 | Per-tab UI sub-phases | One per labor-report tab in dependency order; parity tests per tab |
| 2.3 | Excel export | KosPos-emitted improved `.xlsx` |
| 2.4 | Importer wiring | Importers built as each tab needs them |

## Blockers for Alex

None landing-related. Live site: https://alkprojects.github.io/kospos/ — please spot-check the new docs from PR #30 + #31 + this pivot PR when convenient:

- [docs/ROADMAP.md](ROADMAP.md) — the pivot
- [docs/DECISIONS.md](DECISIONS.md) — ADR-009 for the reasoning
- [docs/domain/labor-report.md](domain/labor-report.md) — the deep-dive skeleton to fill next session
- [docs/domain/authorities.md](domain/authorities.md) — from PR #30
- [docs/domain/appointment-types.md](domain/appointment-types.md) — from PR #30

## Next session prompt — Phase 2.0 (labor-report deep-dive walkthrough)

This is an **interactive walkthrough**, not autonomous. The goal is to fill in `docs/domain/labor-report.md` tab by tab with Alex's prose. No app code in this session. Output is the structured deep-dive doc plus a backlog of importer sub-phases.

Paste this verbatim to start the next session:

````
We're starting Phase 2 — the Current-Year Workspace.

Session goal: walk through every tab of `Labor Report 5.21.26.xlsx` and
fill in docs/domain/labor-report.md with what each tab does, where its
data comes from, how the formulas work, what's manual/fragile, and how
KosPos should rebuild and improve it. NO app code this session — just
the structured deep-dive doc plus a backlog of importer sub-phases.

Read first, in order:
  docs/CLAUDE.md
  docs/SESSION_HANDOFF.md (this file — pivot context)
  docs/DECISIONS.md — ADR-009 (roadmap pivot reasoning)
  docs/ROADMAP.md — new phase order
  docs/domain/labor-report.md — the skeleton you'll fill in
  docs/domain/special-class.md — math already documented for RTPOM, OVERM
    (and pending for PREMM, STEPM, etc.) — cross-reference, don't re-derive
  docs/domain/budget-process.md — three-function framework + COLA history
  docs/domain/definitions.md — Pay Period rules + Temp definitions
  docs/data-sources/*.md — source-system docs

Confirm state on main:
  git log --oneline origin/main -5

Workflow:

  1. Read the labor-report.md skeleton — note the per-tab template.
  2. Alex enumerates every tab in the workbook (in whatever order he prefers).
     For each tab, walk through the template:
       - Purpose
       - Data sources (where does the data come from — manual upload format,
         scrape source, Snowflake-future plan)
       - Formulas (decode each, plain-English what it does)
       - What's manual / fragile (hardcoded constants, copy-pasted values,
         DBI-specific shortcuts that won't generalize)
       - KosPos improvements (what we'd do differently in the rebuild)
       - KosPos UI sketch (how this becomes a page in the app)
       - Excel export notes (what the corresponding sheet in the
         KosPos-emitted .xlsx should look like)
       - Open questions / TODO
  3. As tabs are walked, build up the "Data sources inventory" table at the
     bottom of labor-report.md. For each upstream source: which tab(s) use
     it, v1 upload mechanism, v2 Snowflake plan, KosPos importer path.
  4. At the end: enumerate Phase 2.2 sub-phases in dependency order
     (Calendar must be wired before anything that uses PP%; Report Data
     before Operating Report Summary; BI Payroll before Premium/Overtime/
     Retirement Payout/Step pivots; etc.).
  5. Ship as ONE docs PR: `docs/labor-report-deep-dive`. Merge per the
     CLAUDE.md shutdown rule. Update SESSION_HANDOFF.md with Phase 2.1
     prompt (hide budget-dev UI) for the next session.

Rules:
  - This is a walkthrough — wait for Alex's prose for each tab. Don't
    generate placeholder text unless Alex explicitly defers a section.
  - Cite back to existing docs when a tab's math is already documented
    (RTPOM and OVERM are in special-class.md; don't duplicate, link).
  - Where a tab depends on a source that doesn't have a data-source doc
    yet, flag it for follow-up — don't make up the doc.
  - Budget-development tabs (Special Class tab in Budget Master) are NOT
    part of this walkthrough — Phase 6, not now.
  - Copyright respect on any verbatim quotes from the workbook: a single
    cell label is fine; don't reproduce long passages.

Hard constraints (unchanged):
  - Branch from main, single-purpose name.
  - No new npm packages.
  - npm test stays green (no app changes this session anyway).
  - One PR per logical chunk; MERGE before ending session.

Recommended model: claude-opus-4-7. Effort: high (synthesis-heavy).
````

## Recommended model

`claude-opus-4-7` — synthesis of Alex's prose into structured docs benefits from Opus's reasoning.

## Recommended effort

`high` — deep-dive walkthroughs are dense and benefit from careful interpretation.

## Notes for the next-session model

- **Wait for Alex's prose.** This is interactive, not generative. If Alex skips a tab, leave the section marked `_(walkthrough — deferred)_` rather than inventing.
- **Link, don't duplicate.** RTPOM, OVERM, and partial PREMM/STEPM math already lives in `special-class.md`. The labor-report.md sections for those tabs should *link* to the existing prose, not restate it. Add only what's new (the labor-report-tab-specific framing).
- **Build the data-source inventory as you go.** It's the single most useful artifact for Phase 2.2 planning.
- **Don't write code this session.** The temptation will be there. Resist. The deep dive is the foundation that prevents wasted Phase 2.2 work.
- **Capture improvement ideas Alex mentions.** "I wish this would..." sentences are the entire point of the rebuild. Log them in the "KosPos improvements" bullet of each tab.
- **Multi-dept extensions are Phase 3.** If Alex mentions another dept doing X differently, capture it but don't let it expand the scope of Phase 2.

## What we are explicitly NOT doing next session

- No `app/src/` code changes.
- No PREMM math (deferred to Phase 6 Budget Development).
- No budget-development UI changes (the route-guard is sub-phase 2.1, after the deep dive).
- No new web research (Session 12 covered the authoritative-rules baseline).
