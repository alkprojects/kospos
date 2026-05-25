# Workflow — how to build this without regressing

Most v1 issues in `orgchartbuilder` were not "AI got the code wrong." They were process issues: changes weren't isolated, fixes weren't verified, and there was no record of what had already been tried. This document is the antidote.

## The single most important rule

**One change per branch. One branch per feature. Never bundle changes.**

When AI says "I'll fix the connector bug *and* the save dialog at the same time," say no. Each change goes on its own branch, gets verified, gets merged, then the next one starts. This is slow. It is also the only way to keep regressions from accumulating.

## Daily flow

### Starting a session

1. Open the project folder in your editor / Claude.
2. Have Claude **read `docs/CLAUDE.md` first**. Always. It contains the current state and working agreements.
3. Decide what *one* thing you want to accomplish this session. Write it in plain English ("port the calculator's COLA logic into TypeScript").
4. Create a branch: `git checkout -b feat/cola-port` (or `fix/...`, `chore/...`, `docs/...`).

### During the session

5. Make the change. Run the app (`cd app && npm run dev`).
6. Look at it. Actually click around. Screenshot if possible.
7. Spot-check 2–3 features that touch the same area but weren't supposed to change. If anything is different, that's a regression — back out the change or fix it before continuing.
8. Run the tests: `cd app && npm test`. They should pass.
9. Commit with a message that explains *why*: `feat(cost): apply PP15 COLA at +1.5% so projections match spreadsheet for FY26.`

### Ending the session

10. Push the branch.
11. Open a PR (`gh pr create`). Let CI run. Once green, squash-merge to `main`
    (`gh pr merge --squash`, or `gh api -X PUT repos/<owner>/<repo>/pulls/N/merge -f merge_method=squash`
    when merging from inside a worktree where main is checked out elsewhere).
    Fast-forward the main worktree afterwards: `git -C <main-worktree> pull --ff-only origin main`.
12. Update relevant docs:
    - Meaningful technical decision → append an ADR to `docs/DECISIONS.md`.
    - Discovered something about a data source → update `docs/data-sources/`.
    - Discovered something about a domain concept → update `docs/domain/`.

### When something breaks

If a session goes off the rails (AI gets confused, fixes pile up, tests stop passing): **don't push that branch**. `git checkout main`, delete the branch, start fresh with a clearer prompt next session.

## Picking a Claude model per session

| Work | Model |
|---|---|
| Architecture decisions, hard refactors, picking a stack, debugging confusing bugs | **Opus** |
| Standard feature implementation against a clear spec, ordinary bugs, tests, docs | **Sonnet** (everyday default) |
| Mechanical edits — renames, formatting, a single-file change you already know how to phrase | **Haiku** |

For each new Phase: **kick off with Opus**, then drop to **Sonnet** for individual feature branches within the phase.

## When to use subagents

Subagents are like sending a colleague to research something while you keep working. Each gets a fresh context window. Useful when:

- **Exploring an unfamiliar part of the codebase.** Use the `Explore` agent.
- **Researching a question that needs many web fetches.** Use `general-purpose`.
- **Implementing a self-contained feature in isolation** while you do something else. Use `general-purpose`.

You usually do NOT need a subagent for: a single targeted edit, a small bug fix, a clarifying question.

Beginner rule of thumb: **try inline first**. If Claude says "this is getting big — should I spawn a subagent?", say yes. Otherwise don't worry about it.

## Visual verification protocol

AI is bad at noticing visual issues. You are good at it. Use this asymmetry.

When asking Claude to make a UI change:

1. Tell Claude exactly what you expect to see — "after this, vacant nodes should have a dashed border and a small 'V' badge in the top right." Specific.
2. After the change, **run the app yourself**. Don't trust "should work."
3. Look for: text overlapping, edges going behind nodes, things shifting that shouldn't, missing icons, broken alignment.
4. If something is wrong, **show Claude a screenshot** if possible, or describe specifically what's wrong: "the badge is on top of the title text" — not "it looks weird."

## Session pacing

Claude can't see remaining session budget from inside a conversation. To keep work from getting stranded mid-task:

1. **Estimate up front.** At the start of any non-trivial task, ask Claude to describe roughly how big the work is ("~5–8 file edits and a build verification — about a small session's worth") so you can decide whether to start now or in a fresh session.
2. **Break at natural save points.** Each phase in `ROADMAP.md` is sized to fit 1–2 sessions.
3. **If usage feels tight, stop early.** Better to land Phase N cleanly and start Phase N+1 fresh than to run out of context mid-edit.

### Audit cadence

Periodic audits keep the Claude collaboration setup (memory, canonical docs, hooks, session log, repo organization) from drifting. The rule:

- **Event-based — every phase close.** When a phase ships (e.g., Phase 2.0i, Phase 2.1, Phase 6), the next session opens with an audit before any new work. Audit doc lives at `docs/audits/internal-claude-setup-audit.md` (or a dated successor) — sectioned per area, with applied fixes vs surfaced-for-Alex.
- **Backstop — every 10 sessions.** If 10 sessions elapse without a phase close, audit anyway. Practical safeguard against long flat phases where drift can compound silently.
- **Triggered by drift.** Out-of-band: any time a rule is being repeatedly violated, file an audit-style PR for that area even if the cadence hasn't fired.

The audit doc template (per the [Session 19 audit](audits/internal-claude-setup-audit.md)): Methodology → per-area Findings / Fixes applied / Surfaced for review → Summary table → Recommendations not actioned. Bias toward applying trivial fixes in-session and surfacing non-trivial ones for the user.

Origin: Session 5 memory `session_logging.md` ("audits should run periodically and especially at the end"); concretized at Session 19 after a 11-session drift (last audit was Session 7 at Phase 3 close).

## Branch naming convention

- `feat/<short-slug>` — new feature
- `fix/<short-slug>` — bug fix
- `chore/<short-slug>` — refactor, dep bump, config change
- `docs/<short-slug>` — docs-only change
- `test/<short-slug>` — test-only change

Examples:

- `feat/calc-cost-math-port`
- `fix/pp15-cola-rounding`
- `chore/idb-wrapper-cleanup`
- `docs/special-class-9994`
