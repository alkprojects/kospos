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

**Default: Opus 4.8 with fast mode (`/fast`) on.** It's the strongest model, its 1M-token context removes the old "Opus burns the window" worry, and fast mode closes most of the speed gap to Sonnet. For a project where Alex wants to be *guided* through decisions, the strongest model as the standing default beats per-session model-switching — whose main payoff was cost.

| Work | Model |
|---|---|
| Everything by default — features, refactors, debugging, architecture, docs | **Opus 4.8** (fast mode on) |
| Cost-sensitive docs-only or purely mechanical batches (bulk renames, formatting) | **Sonnet 4.6** — optional saver, not the default |
| Throwaway one-file edits you've already fully specced | **Haiku** — rarely worth the context-switch |

The only reason to drop below Opus 4.8 is cost. If that matters on your plan, use Sonnet for docs-only / mechanical sessions; otherwise stay on Opus 4.8 throughout, including each new Phase kickoff.

## When to use subagents

Subagents are like sending a colleague to research something while you keep working. Each gets a fresh context window. Useful when:

- **Exploring an unfamiliar part of the codebase.** Use the `Explore` agent.
- **Researching a question that needs many web fetches.** Use `general-purpose`.
- **Implementing a self-contained feature in isolation** while you do something else. Use `general-purpose`.

You usually do NOT need a subagent for: a single targeted edit, a small bug fix, a clarifying question.

Beginner rule of thumb: **try inline first**. If Claude says "this is getting big — should I spawn a subagent?", say yes. Otherwise don't worry about it.

## Skills and the Workflow tool

Beyond plain subagents, the harness ships **skills** (focused, reusable capabilities, invoked like `/name`) and a **Workflow** tool (deterministic multi-agent orchestration). Several map directly onto recurring KosPos work:

| Capability | Use it for |
|---|---|
| `xlsx` skill | Building synthetic example workbooks for parser tests; inspecting Alex's workbook for the "match to the dollar" parity checks |
| `code-review` skill | The PR-per-change self-review step. `code-review ultra` runs a deeper multi-agent review in the cloud (billed; Alex-triggered) |
| `security-review` skill | A security pass before merging internet-facing code (e.g. the Cloudflare publish/fetch path) |
| `verify` skill | Driving the app to confirm a change actually works (pairs with the visual-verification protocol below) |
| `consolidate-memory` skill | The memory-hygiene pass during a setup audit |
| `deep-research` skill | Multi-source research like the `docs/research/` work (Cat 17/18 rules, DHR scraping) |

The **Workflow tool** is for deterministic fan-out/verify jobs — phase-close audits, the BVA reconciliation suite, scenario-test sweeps, the eventual cross-system change reports. It can spawn many agents and use a lot of tokens, so **it only runs when you explicitly opt in** — include the word "workflow" in your message (or say "fan out agents / orchestrate this"). Claude will not start one on its own.

## Visual verification protocol

Claude can now run the app itself via the **preview tools** (`preview_start` → `preview_screenshot` / `preview_snapshot` / `preview_inspect` / `preview_click`). So the default flipped: **Claude verifies first and shows you proof; you do the final aesthetic sign-off.** Your eye is still the last gate — the asymmetry isn't gone, the legwork just moved to Claude.

When asking Claude to make a UI change:

1. Tell Claude exactly what you expect to see — "after this, vacant nodes should have a dashed border and a small 'V' badge in the top right." Specific.
2. Claude runs the app, screenshots/inspects the changed area, and **presents the evidence** (not "should work").
3. You look at the screenshot for what Claude is worst at: text overlapping, edges behind nodes, things shifting that shouldn't, missing icons, broken alignment.
4. If something's wrong, point at it specifically — "the badge is on top of the title text" — not "it looks weird."

**One dev server at a time.** `preview_start` reads the dev-server port from `.claude/launch.json` (5173). `vite.config.ts` sets `strictPort: true`, so a second concurrent `npm run dev` fails loudly ("Port 5173 is already in use") instead of silently serving on 5174 — where the preview tool, still pointed at 5173, would attach to the *wrong* worktree's app. Stop the other worktree's dev server first, then start this one.

## Session pacing

Claude still can't see remaining *usage* budget from inside a conversation, but with Opus 4.8's 1M-token context, running out of *context* mid-task is rarely the risk it used to be (the harness also auto-summarizes long sessions). So pacing is about usage limits and clean hand-offs, not context anxiety:

1. **Estimate up front.** At the start of any non-trivial task, ask Claude to describe roughly how big the work is so you can decide whether to start now or in a fresh session.
2. **Break at natural save points.** Each phase in `ROADMAP.md` is sized to fit 1–2 sessions; a single session can now comfortably carry a whole sub-phase plus its close audit.
3. **Stop clean, not early-in-a-panic.** Land the current PR, update the handoff, then stop. Better to finish a logical unit cleanly than to bail mid-edit because the transcript "feels long."

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
