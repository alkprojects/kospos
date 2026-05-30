# CLAUDE.md — Read this first

**Every AI session working on KosPos starts by reading this file. Keep it short and dense — this is the orientation Alex and every session re-read, so brevity is for human skim. (It's no longer about the model's window: Opus 4.8 has a 1M-token context and the harness auto-summarizes when a session runs long.)**

## Session startup sequence (mandatory)

1. Read this file (`docs/CLAUDE.md`).
2. Read `docs/SESSION_HANDOFF.md` — it contains the recommended next prompt, suggested model, and any mid-session resume point. If the file says the work is already in progress on a branch, rebase/pull that branch before touching anything.
3. Check `git log --oneline -5` on main to confirm Phase N-1 is merged before starting Phase N work.

## Session shutdown sequence (mandatory)

Before ending any session:

1. **Push every commit. Merge every open PR you own.** Alex reviews on the live site, not locally. Anything left unmerged is invisible to him until the next session. If a PR has a real blocker (failing CI, conflict, ambiguous code review needed), surface it in the handoff — don't silently leave it open.
2. **Verify the live site is in sync.** After the last merge to `main`:
   - Confirm the GitHub Pages deploy workflow completed successfully (`gh run list --branch main --limit 3`).
   - Confirm the main worktree (or whichever worktree tracks main) is at `origin/main` head (`git -C <main-worktree> log --oneline -1 origin/main` matches local).
   - The live site at https://alkprojects.github.io/kospos/ now reflects every change made this session.
3. **Update `docs/SESSION_HANDOFF.md`** with:
   - Current status (what's done, what's not).
   - The exact prompt Alex should paste to start the next session.
   - Recommended model (default: `claude-opus-4-8` with fast mode on — see WORKFLOW.md § "Picking a Claude model"). Opus 4.8's 1M context + fast mode make it the standing default; only drop to `claude-sonnet-4-6` for cost-sensitive docs-only or mechanical sessions.
   - Branch name if work is in progress (should be `none` post-merge).
   - Any blockers Alex needs to resolve.
4. **Hand off with a review-this-on-the-live-site checklist.** Final message includes: what to look at on https://alkprojects.github.io/kospos/, what's new in `docs/`, and the copyable next-session prompt.

Non-negotiable: a session that ends with unmerged code, stale local-vs-origin state, or a missing handoff has wasted context that the next session must recreate.

## On session pacing and usage limits

There is no API to check remaining *usage* from inside a session — but with Opus 4.8's 1M-token context, running out of *context* mid-task is rarely the constraint it used to be (the harness also auto-summarizes when a session runs long). Pace by natural save points and Alex's review load, not context anxiety:
- Commit after every meaningful chunk (not just at end of session). This guards against a usage cutoff and still matters.
- Keep `SESSION_HANDOFF.md` current throughout — if a session is cut off, the next session picks up from it. Cross-session continuity is a fresh-start problem 1M context does *not* solve.
- A session can now comfortably hold a whole sub-phase plus its close audit. Stop at a clean save point (PR merged, handoff updated), not the moment the transcript "feels long."

---

## Project in one sentence

KosPos is a static web app that turns the standard San Francisco labor reports into a unified workspace for budgeting, projections, hiring plans, separation plans, special-class calculations, cross-system change reports, and an audience-aware org chart — primary user is a department administrator, eventual scope is citywide.

## Who the user is

Alex Lewis-Koskinen, Deputy Director (Admin), SF Department of Building Inspection. Beginner Claude user. Comfortable with HTML, VBA, and SQL; no React or modern JS experience. Wants to be **guided** through technical decisions — describe trade-offs, recommend an option, then act unless told otherwise.

## Where things live

- `docs/VISION.md` — what we're building, who it's for, scope and non-goals
- `docs/ROADMAP.md` — phased plan (Phase 0 is foundation, Phase 10 is the org chart)
- `docs/DECISIONS.md` — append-only Architecture Decision Records
- `docs/WORKFLOW.md` — how to collaborate with Claude without regressing prior fixes
- `docs/GLOSSARY.md` — SF-specific terms (RTF, MCCP, MOU, PCS/PEX/TEX, etc.)
- `docs/data-sources/` — one file per upstream system (DHR, CON, CSC, MYR, PeopleSoft, BFM, OBI)
- `docs/domain/` — one file per domain concept (positions, chartfields, special-class, projections, hiring)
- `docs/audits/` — per-milestone close audits (hiring-screen grading lens; cadence governed by ADR-017)
- `docs/proposals/` — forward-looking proposals not yet picked (UX, code-health, citywide scaling)
- `docs/research/` — deep-dive research notes (CSC/DHR appointment rules, persistence options, scraping plan)
- `docs/runbooks/` — operational procedures (e.g. Cloudflare Pages setup)
- `docs/examples/` — placeholder for tiny synthetic parser fixtures (currently empty; no real PII)
- `app/` — the Vite + React + TypeScript application. `cd app && npm install` once, then `npm run dev` → http://localhost:5173/kospos/
- `.github/workflows/deploy.yml` — Pages deploy on push to `main`
- `.github/workflows/test.yml` — Vitest on every push and PR

**Tooling gotcha (Windows worktree):** use **absolute paths** with Read / Glob / Grep / Bash. The Bash tool's cwd is `app/` (not the worktree root) and Glob resolves relative patterns off-worktree, so relative paths like `docs/*.md` silently return **empty** — which produced phantom "file not found" reads in S52 and S53. Reference the full absolute path (`…/worktrees/<name>/docs/…`); for git ops that take path args, use `git -C "<worktree-root>"`.

## Stack (decided Phase 0 — see DECISIONS.md ADR-001)

- **Vite + React + TypeScript** — static build, fast HMR, type-safe
- **`@xyflow/react`** (React Flow) — used starting Phase 10 (org chart)
- **`dagre`** — auto-layout for hierarchical trees
- **`xlsx`** (SheetJS) — Excel parsing — see ADR-002 about the npm-published version's audit warnings
- **`zustand`** — state management
- **`idb`** — IndexedDB wrapper for persistence. NOT localStorage (single labor report exceeds the 5 MB limit)
- **`vitest`** — unit tests
- **GitHub Pages** — free static hosting, no backend in v1

## Non-negotiable working agreements

These exist because beginner Claude users + bundled changes is how v1 of orgchartbuilder collapsed. Future AI sessions: enforce these even if the user doesn't ask.

1. **One change per branch. One branch per feature. Never bundle.**
2. **Verify visually — agent-first.** When a UI change is made, the session runs the app via the preview tools, screenshots/inspects the rendered output, and presents that proof. Alex does the final aesthetic sign-off. "It should look right" is not done. (See WORKFLOW.md § "Visual verification protocol".)
3. **Data quality and Change Mode are cross-cutting.** Every module surfaces likely errors (`lib/quality/`) and records edits as proposed changes (`lib/changes/`). See ADR-003.
4. **Reference data is versioned by effective date.** Never hardcode "FY 2025-26" — look up by date.
5. **Real labor reports are never committed.** All `.xlsx`/`.xlsm` files are gitignored. **Rationale:** the workbook is Alex's active working file (commits would create binary-blob churn + obscure diffs). The data *itself* is **SF public-employee public records** (names, IDs, classifications, salaries) and NOT confidential per the Sunshine Ordinance + state law — see [memory `data_sensitivity.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/data_sensitivity.md). Hosting / sharing decisions (Vercel, shared state, cloud storage) should be made on engineering + cost grounds, not data-confidentiality grounds.
6. **Match the spreadsheet to the dollar.** Phase 1 / 4 / 5 each ship with parity tests against Alex's existing workbook.
7. **Update DECISIONS.md when changing direction.** Future sessions will not understand why something is the way it is otherwise.
8. **If a fix unblocks a related bug, file the related bug as a new issue.** Do not fold it into the current PR.

## What "done" looks like for any chunk of work

- [ ] Branch from `main`, single-purpose name (`feat/calc-cost-math`, `fix/cola-pp15-rounding`)
- [ ] App runs (`npm run dev`) without console errors
- [ ] The specific user-visible behavior changed is verified by clicking through it
- [ ] No previously-working feature is regressed (spot-check 2–3 adjacent flows)
- [ ] Tests pass (`npm test`)
- [ ] Commit message explains *why* not just *what*
- [ ] PR description includes a before/after screenshot for UI changes (when applicable)

## Domain quick reference

- **Position** = a budgeted slot (has a Position Number, Job Code, Department, Reports-To). Lives whether filled or vacant.
- **Employee** = a person occupying a position. May be acting in a different position (Vice 1 / Vice 2).
- **Reporting line** = `Position.Reports-To` → Position Number (always position-to-position).
- **Audience modes (org chart)** — Internal Management / Internal All Staff / External. See `docs/domain/positions.md`.
- **Special class** — sub-account categories like 9993 (attrition savings), STEPM (step adjustments), PREMM (premium pay). See `docs/domain/special-class.md`.
- **Chartfields** — Fund / Dept / Project / Activity / Authority / Account. See `docs/domain/chartfields.md`.

## Mini-glossary (for non-technical readers)

- **React Flow** — the diagramming library doing the heavy lifting in Phase 10 (org chart).
- **TypeScript** — JavaScript plus types. Catches a lot of "AI made up a function name" errors at compile time.
- **Vite** — what bundles the app. `npm run dev` starts a dev server; `npm run build` produces files for GitHub Pages.
- **IndexedDB** — browser-local database. Persists across reloads but lives only on one device. We wrap it with the `idb` library.
- **Schema version** — a number embedded in saved data. When we change the shape of saved state, we bump this number; old saves are discarded with a notice.
- **HMR (Hot Module Reload)** — Vite reloads your changes in the browser without a full refresh.
- **RTF (Request to Fill)** — SF process for filling a vacant position; the labor report tracks its status and expected fill date.
- **MOU** — Memorandum of Understanding (union contract). Defines premium pay, step rules, etc.
- **MCCP** — Management Classification and Compensation Plan. Range-based instead of step-based.
- **PCS / PEX / TEX** — Permanent Civil Service / Permanent Exempt / Temporary Exempt appointment types.
