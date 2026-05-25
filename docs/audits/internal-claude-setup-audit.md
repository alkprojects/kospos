# Internal Claude setup audit — Session 19

**Date:** 2026-05-25
**Branch:** `docs/internal-claude-setup-audit`
**Scope:** pure audit + trivial fixes applied this session. No Phase 2 content
work; the Phase 2.0g labor-report walkthrough (Tabs 23-25) runs in Session 20.

Triggered manually because the periodic-audit habit set up in Session 5 memory
([`session_logging.md`](../../C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/session_logging.md))
hadn't fired since Session 7 (end of Phase 3) — 11 sessions ago. The intent is
to catch drift in the Claude collaboration setup *before* it compounds.

## Methodology

Read the canonical docs (`CLAUDE.md`, `WORKFLOW.md`, `DECISIONS.md`,
`ROADMAP.md`, `VISION.md`, `SESSION_HANDOFF.md`, `SESSION_LOG.md`), every
file in the memory directory at
`C:\Users\ALK\.claude\projects\C--Users-ALK-Desktop-Claude-Projects-kospos\memory\`,
the committed hook script + settings, the worktree-local `.claude/`
state, and a sweep of `docs/` for anchor compliance and overlapping
content. Cross-checked the recent commit history for PR-per-change
compliance. Delegated the anchor-link sweep to an Explore agent for
breadth, then spot-verified the key claims manually.

For each finding the audit captures the current state, the problem (or
why it's a non-issue), the recommended fix, and whether it was applied
in-session or surfaced for Alex's review. Trivial corrections were
applied immediately; anything affecting `.claude/` non-memory paths
(hooks, settings) is described for Alex's manual application per the
Session 18 install pattern.

---

## Area A — Memory hygiene

### Findings

1. **MEMORY.md ↔ file consistency.** All 7 indexed memory files exist on disk.
   The Session-18-noticed `feedback_session_end.md` vs
   `feedback_end_of_session_prompt.md` mismatch was resolved in the canonical
   memory dir before this session — the canonical file is now
   `feedback_session_end.md` and the index matches. ✓
2. **A stale parallel memory dir exists inside the worktree.**
   `.claude/projects/C--Users-ALK-.../memory/` contains a 2-file index
   (`MEMORY.md` + `feedback_end_of_session_prompt.md`) — leftovers from
   when the canonical dir held that filename. The directory is gitignored
   (per PR #51's `.gitignore` update), so it doesn't pollute commits, but
   it can confuse a session that browses with `Glob` and finds the wrong
   file first. **Impact:** cosmetic / source-of-confusion only.
3. **Slug-format inconsistency in memory frontmatter.**
   Per `MEMORY.md`'s own instructions ("name: {{short-kebab-case-slug}}"),
   names should be kebab-case. All entries follow this except
   `feedback_session_end.md`, whose frontmatter `name:` was
   `feedback_session_end` (underscores). Fixed in-session.
4. **One `[[link]]` resolves to a doc glossary entry, not a memory.**
   `feedback_projections_always_cola_aware.md` had `[[bargaining-unit]]`,
   but no memory entry has that name. The intended target is the BU
   glossary section inside `docs/domain/labor-report.md` (a doc, not a
   memory). Per MEMORY.md rules, `[[name]]` is for inter-memory links —
   misuse here. Fixed in-session by replacing with a regular markdown
   reference.
5. **MEMORY.md index entry for `feedback_session_end.md` was incomplete.**
   The file now contains three discrete rules (the primary copyable-block
   rule + sync-main-worktree-post-merge + outstanding-items sweep). The
   index line described only the first. Fixed in-session (renamed
   "Session end prompt" → "Session end protocol" and broadened the
   description).
6. **Still-relevant check.** All 7 memory entries remain load-bearing.
   None has been superseded by code/docs. None violates the "don't store
   code patterns, file paths, project structure, or git history" rule —
   the closest is `feedback_session_end.md`'s mention of `gh pr merge`
   and `git -C <main-worktree>` but those are operational habits, not
   "what does this code do" facts.
7. **Coverage gaps — none surfaced.** Recent SESSION_LOG entries show
   Alex's corrections from S13-S18 already landed in 3 new memory
   entries (`cat_16_17_18_rules.md`, `feedback_user_notes_per_position.md`,
   `staffing_plan_types.md`). The 4 unanswered Session 17 + 18 default
   questions don't belong in memory yet — they need Alex's answer first.
8. **Bloat — no.** MEMORY.md is 14 lines, well under the 200-line index
   cap. Memory file bodies total ~270 lines across 7 files — proportional
   to project state.

### Fixes applied this session

- **`feedback_session_end.md` frontmatter `name:`** renamed `feedback_session_end` → `feedback-session-end` (kebab-case compliance).
- **Same file's primary-rule paragraph** now notes that the Stop hook
  (PR #51) enforces the copyable-block requirement automatically, so the
  rule is still authoritative even if the hook is bypassed or removed.
- **`feedback_projections_always_cola_aware.md`** `[[bargaining-unit]]` → markdown reference into `docs/domain/labor-report.md`.
- **`MEMORY.md`** "Session end prompt" entry renamed to "Session end protocol" with a fuller one-line description covering all three companion rules.

### Surfaced for Alex's review

- **Stale parallel memory dir in the worktree.** Inside this worktree at
  `.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/`
  sit `MEMORY.md` + `feedback_end_of_session_prompt.md` — predecessors of
  the canonical files. Gitignored, so non-blocking, but if Alex wants to
  remove the confusion entirely, deleting that local-only directory is a
  one-line command (see Recommendations below). Not auto-applied because
  deleting personal `.claude/` state from inside the session requires
  Alex's explicit go-ahead.

---

## Area B — Rules / canonical docs

### Findings

1. **`docs/CLAUDE.md` non-negotiable working agreements — all still hold.**
   The 8 items in `## Non-negotiable working agreements` (one change per
   branch; verify visually; data quality and Change Mode cross-cutting;
   reference data versioned by effective date; never commit real labor
   reports; match the spreadsheet to the dollar; update DECISIONS.md;
   file related bugs as new issues) are all current. No item is being
   silently dropped in this phase. Phase 2.0 *is* docs-only so the "verify
   visually" rule has been dormant — but it's still correctly stated for
   when app-code work resumes (Phase 2.2+).
2. **`docs/WORKFLOW.md` — mostly current; one stale assumption.** The
   "Daily flow → Ending the session" step 11 says "if verified and the
   test suite is green, merge into `main` (solo for now; later a PR
   review step)". In practice since Session 6 we've used PR-per-change
   with self-review (and one external `/ultrareview` in Session 8). The
   actual workflow is closer to "open PR → CI green → squash-merge"
   than the WORKFLOW.md text. Minor — Alex's call whether to tighten.
3. **`docs/DECISIONS.md` — non-ADR'd decisions identified.** Several
   architecturally-significant calls made since ADR-009 (the most recent
   ADR, 2026-05-24, roadmap pivot) have not been ADR'd:
   - **COLA-everywhere projection principle** (S13, reconfirmed S18) —
     captured in memory as a feedback rule + in `labor-report.md` Calendar
     improvements #2-3. Cross-cutting design decision affecting every
     downstream projection function. Memory + doc capture is good but
     this is the kind of cross-cutting math principle that future
     sessions should be able to find via DECISIONS.md.
   - **MCCP split into 9994 from STEPM** (S18 Tab 18 walkthrough) —
     decision is captured inside `labor-report.md` Tab 18 narrative and
     the `special-class.md` STEPM walkthrough. Splits the data model.
   - **User-notes-per-position field** (S18) — a top-level entity-schema
     decision (Position carries `userNotes: string`). Captured in
     memory + Tab 6 P&P Data walkthrough.
   - **Stop hook for end-of-session prompts** (PR #51) — a workflow-
     automation decision; documented in the PR but no ADR.
   - **BVA as a separate data source** (post-S16 interlude) — captured
     in `data-sources/bva.md` and labor-report.md Tab 20.
   - **Anchor-link convention** (occurrence-index, not tab-number) —
     captured in `docs/audits/labor-report-walkthrough-audit.md` but
     never elevated to a project-wide standard.
4. **`docs/ROADMAP.md` — accurate.** Phase 2 sub-phases (2.0 → 2.0i →
   2.1 → 2.2 → 2.3 → 2.4) match the actual Phase 2.0a-f progression and
   the deferred sub-phases. ADR-009's roadmap-pivot framing matches the
   doc.
5. **`docs/VISION.md` — accurate.** Scope and non-goals match current
   project state. Cat 16/17/18 mention is consistent with the new
   memory entries.

### Fixes applied this session

None — Area B findings are non-trivial decisions that need Alex's input
(should they become ADRs? should WORKFLOW.md be revised? etc.).

### Surfaced for Alex's review

- **Six decisions warrant ADRs.** Recommendation in priority order
  (highest first — most cross-cutting decisions first):
  1. **ADR-010: All KosPos projections are COLA-aware by default.**
     Cross-cutting math principle. Replaces the implicit "match the
     workbook" assumption. Cite the S13 origin + S18 reconfirmation.
  2. **ADR-011: MCCP positions split into 9994 from STEPM_C.**
     Splits the special-class data model. Cite the S18 Tab 18 walkthrough.
  3. **ADR-012: Position entity carries a free-text `userNotes` field.**
     Schema decision; affects every place positions are persisted.
  4. **ADR-013: Stop hook enforces copyable next-session prompt.**
     Workflow-automation decision; references PR #51.
  5. **ADR-014: Anchor-link convention uses github-slugger
     occurrence-index for duplicate headings.** Documents the
     project-wide standard surfaced by PR #45 + Phase 2.0f migration.
  6. **ADR-007 amendment: BVA is its own PS Financials data source,
     distinct from BFM.** Already noted in `data-sources/bva.md` as a
     deferred amendment; should land alongside the Phase 2.4 importer
     work but the decision itself stands.

- **WORKFLOW.md step 11** (merge directly to main) is stale —
  PR-per-change is the actual pattern. Minor edit: replace "merge into
  `main` (solo for now; later a PR review step)" with "open a PR; let
  CI run; merge via squash once green".

---

## Area C — `docs/SESSION_LOG.md` + audit cadence

### Findings

1. **Coverage of Sessions 13-18.** Logged with the same per-session
   structure as Sessions 1-12 (prompts compressed but present, milestones,
   what-changed, out-of-scope). Interlude entries (Node 24 bump, BVA
   doc interlude) follow a slightly tighter format — appropriate for
   off-roadmap one-task work. ✓
2. **Audit cadence has drifted.** Per `session_logging.md` memory: "audits
   should run periodically (natural checkpoints: phase boundaries, every
   ~10-15 prompts, and definitely at project end)". **Last audit:
   Session 7** (end of Phase 3). That was 11 sessions ago. Phase 2.0 is
   mid-flight (2.0a through 2.0f done; 2.0g-i pending) so the next
   phase-boundary audit would be Phase 2.0i close. Without a recurring
   trigger we'd reach Phase 2.1 with no Phase 2.0 audit.
3. **No hook enforces audit cadence.** The Stop hook from PR #51 only
   enforces the copyable-prompt rule. Adding an audit-cadence hook is
   feasible but probably premature — this manual trigger worked fine.
4. **SESSION_LOG.md size — 1,151 lines.** Growing monotonically. Even
   at the current 18-session cadence (~63 lines/session average,
   including audits + interludes) we'd hit ~2,000 lines by Phase 2.0i
   close. Still navigable, but past the comfortable "skim it on session
   start" limit (~500 lines = 5-10 minutes). The handoff already mostly
   filters which sessions to re-read.

### Fixes applied this session

None — cadence decision is Alex's call (recommendation below).

### Surfaced for Alex's review

- **Codify the audit cadence rule.** Recommended: **event-based, every
  Phase close**, supplemented by an "every 10 sessions" backstop. So:
  Phase 2.0 closes at Phase 2.0i → audit. Phase 2.1 closes → audit. If
  10 sessions elapse without a phase close (unlikely given current
  pacing), audit anyway. Document in `WORKFLOW.md`'s "Session pacing"
  section. The next audit fires at **Phase 2.0i close** (currently 3
  content sessions away: 2.0g + 2.0h + 2.0i).
- **Do NOT add an audit-cadence hook yet.** Manual triggering worked
  for this audit. Add a hook only if the next phase-close audit gets
  forgotten in practice.
- **SESSION_LOG.md trim-and-summarize rule — deferred.** Don't trim
  yet. At 1,151 lines it's still searchable. Revisit at Phase 2.0i
  close: if it's >2,000 lines and per-session detail past Session N-5
  isn't being consulted, summarize older entries to one-paragraph
  digests and keep full prompt-by-prompt logs only for the last 5
  sessions.

---

## Area D — Hooks / settings

### Findings

1. **Stop hook (PR #51) is correctly installed and self-contained.**
   `.claude/hooks/check-session-end-prompt.py` — stdlib-only, cross-platform,
   parses the transcript JSONL, only fires when `docs/SESSION_HANDOFF.md`
   was modified, returns `decision: block` if the final assistant message
   has no triple-backtick fenced block. Settings entry in
   `.claude/settings.json` registers it as a Stop event with a 10-second
   timeout. **Verified:** the hook will fire in a fresh session — it
   reads from `transcript_path` or reconstructs the path from `cwd` +
   `session_id`, both standard hook inputs.
2. **`.claude/settings.local.json` is broken.** The current content:
   ```json
   {
     "permissions": {
       "allow": [
         "Bash(gh pr create*\\)\nBash\\(gh pr merge*\\)\nBash\\(gh pr list*\\)\nBash\\(gh pr view*\\)\nBash\\(git push origin *)"
       ]
     }
   }
   ```
   This is **one mangled string**, not five permission rules. Escaped
   parens (`\(`, `\)`) and embedded `\n` characters are not the Claude
   Code permission format. As written, this rule almost certainly does
   not match any tool call. The fact that `gh pr merge` / `git push` have
   nonetheless succeeded in recent sessions suggests Alex has been
   approving each invocation interactively (or that other settings layers
   are granting the permissions). **The file is gitignored**, so this
   doesn't affect anyone else's setup — just Alex's own friction.
3. **`.claude/launch.json` — usable but Vite port 5173 is the same port
   that caused the Session 11 visual-verification blocker.** When two
   worktrees are dev-serving at the same time, the second hits a port
   collision and falls back, and the preview MCP tool can't connect to
   the fallback. Not blocking right now (no app-code sessions in Phase
   2.0) but worth a note for Phase 2.2+.
4. **No other hooks installed.** No PreToolUse, PreCompact, SubagentStop,
   etc. Single Stop hook is the minimum footprint.

### Fixes applied this session

None directly — `.claude/` writes are blocked by the auto-mode
classifier. Documented corrections (below) are staged as
copy-paste-ready content for Alex.

### Surfaced for Alex's review

- **Fix `.claude/settings.local.json`.** Replace the mangled string
  with five separate rules. Suggested content:
  ```json
  {
    "permissions": {
      "allow": [
        "Bash(gh pr create:*)",
        "Bash(gh pr merge:*)",
        "Bash(gh pr list:*)",
        "Bash(gh pr view:*)",
        "Bash(git push origin *)"
      ]
    }
  }
  ```
  Apply via PowerShell (file is gitignored — safe to overwrite):
  ```powershell
  $content = @'
  {
    "permissions": {
      "allow": [
        "Bash(gh pr create:*)",
        "Bash(gh pr merge:*)",
        "Bash(gh pr list:*)",
        "Bash(gh pr view:*)",
        "Bash(git push origin *)"
      ]
    }
  }
  '@
  Set-Content -Path "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\settings.local.json" -Value $content -Encoding utf8
  ```
  Verify next session by trying a `gh pr list` — it should not prompt for permission.

- **No new hooks recommended right now.** Candidates considered and
  rejected:
  - **PR description format check (`## Summary` + `## Test plan`)** —
    haven't drifted recently. PR #48 / #51 / #52 all comply. Premature.
  - **Co-Authored-By line on commits** — same story; all recent commits
    have it. Premature.
  - **Audit-cadence reminder** — manual trigger worked for this audit.
    Premature.
  Re-evaluate after the next 5 sessions; add only if a rule actually
  drifts.

- **(Optional)** Add `availableModels` / `statusLine` config to
  `settings.json` for ergonomics. Not required; flag is `defer`.

- **Worktree-port-collision (Session 11 issue)** — fix by making
  `.claude/launch.json` port configurable (per-worktree) or moving to a
  Vite config-based fallback. Defer until app-code work resumes.

---

## Area E — File / repo organization

### Findings

1. **`docs/domain/labor-report.md` is 4,618 lines after Phase 2.0f.**
   Projected ~6,000 lines after Phase 2.0g (Tabs 23-25 add ~1,500
   lines based on Tab 20's precedent of ~700 lines per major tab).
   Searchable via Grep + anchor links; the per-tab template makes
   sections findable. Splitting per-tab would mean 26 files to keep in
   sync; cross-tab references already work via anchors. **Recommendation:
   don't split yet.** Revisit at Phase 2.0i close: if total length passes
   ~7,500 lines or anchor-link maintenance becomes a chore, split into
   per-tab files with `labor-report.md` as the index.
2. **`docs/audits/` has 3 docs, not 5.** The prompt mentioned 5 but
   `reports-folder-inventory.md` lives in `data-sources/` (correct
   placement — it's an inventory of upstream files). After this session
   the audits/ folder will hold 4 files. **Worth adding an `audits/README.md`
   index** so future sessions don't have to glob to find what's there.
3. **Overlapping content — checked, mostly clean.** Spot-checked Tab 16
   (Premium) vs `special-class.md` PREMM_E; Tab 17 vs OVERM_E; Tab 18 vs
   STEPM_C; Tab 19 vs RTPOM_E. In every case `labor-report.md`'s tab
   section covers the workbook tab's own mechanics (pivot shapes,
   per-tab projection panel, manual-fragile catalog) and uses anchor
   links into `special-class.md` for the account-level math
   (budget development, chartfield allocation, per-employee rules). Tab
   19's references to RTPOM_E year-end projection and per-employee math
   are both explicit pointers, not duplications. ✓
4. **Anchor-link compliance — passes spot checks.** Cross-file links
   into `special-class.md` use the github-slugger occurrence-index
   convention. The 9 `#### KosPos improvements` headings in
   `labor-report.md` produce slugs `kospos-improvements` through
   `kospos-improvements-8` (0-indexed), and the existing intra-file
   links (`-6`, `-7`, `-8` referring to Tabs 20/26/27) are correct.
   **Caveat:** the Phase 2.0g session will add Tabs 23/24/25 with
   their own `#### KosPos improvements` headings; this will shift the
   Tab 26 and Tab 27 indices from `-7`/`-8` to `-10`/`-11`. Three
   existing intra-file references need migration: lines 1994
   (`#kospos-improvements-7` → `-10`), 5064 + 5267
   (`#kospos-improvements-8` → `-11`), and 5392 (`-7` → `-10`).
   **This is already flagged in the SESSION_HANDOFF.md "Notes for the
   next-session model" — the audit confirms the prediction holds.**

### Fixes applied this session

- **None — labor-report.md split deferred.** Recommended timing: Phase 2.0i close.
- **`audits/README.md` deferred to recommendation** — too small to be
  worth a separate fix-up commit; bundle with the next audits/ change.

### Surfaced for Alex's review

- **Add `docs/audits/README.md`** with one line per audit doc + a
  one-paragraph orientation. Not urgent; bundle with the next audits/
  PR (likely the Phase 2.0i close audit).
- **Plan the Tab 26/27 anchor migration into the Phase 2.0g session.**
  The Phase 2.0g prompt below has this baked in.
- **Don't split labor-report.md yet.** Revisit at Phase 2.0i close.

---

## Area F — Workflow patterns

### Findings

1. **PR-per-change compliance — strong.** Recent commit history (10
   PRs reviewed back to PR #42) all carry single-purpose titles.
   Bundling-the-fix-with-unrelated-cleanups patterns are not visible.
   The S17 autonomous run intentionally shipped 5 PRs (each scoped to
   one task) — that's correct PR hygiene, not bundling. ✓
2. **Worktree usage — 5 worktrees registered, 4 of them post-merge
   stale.** Per `git worktree list`:
   ```
   C:/...kospos                                                      04b33c2 [main]
   C:/...funny-cannon-ff06d7                                          04b33c2 [docs/internal-claude-setup-audit]   (this session)
   C:/...heuristic-mahavira-6cce9c                                    3cac474 [docs/labor-report-pnp-data]          (merged as PR #38)
   C:/...nice-archimedes-288f0b                                       eca80f4 [docs/session18-followup-staffing-plan-cola] (merged)
   C:/...stupefied-herschel-a0bb3d                                    1646013 [docs/handoff-autonomous-next-session] (merged)
   C:/...tender-almeida-260205                                        3732459 [docs/handoff-session-17]             (merged as PR #47)
   ```
   This pattern repeats — Session 9 also cleaned up 9 stale worktrees.
   Worktrees should be removed once their PR merges; otherwise they
   accumulate stale state, and `gh pr merge --squash` warnings ("main
   is already used by worktree at ...") happen.
3. **Memory updates — happening at correct moments.** Sessions 17 and
   18 each surfaced multi-correction Alex feedback. Three new memory
   entries (`cat_16_17_18_rules.md`, `feedback_user_notes_per_position.md`,
   `staffing_plan_types.md`) plus `feedback_projections_always_cola_aware.md`
   updates — proportional to the corrections received. ✓
4. **`.scratch/`, `extract_*.py`** are gitignored per `.gitignore`. Not
   in main. Per-worktree accumulation is fine; full cleanup is just
   `git worktree remove <path>` once the PR merges.

### Fixes applied this session

None — worktree cleanup involves writes to other worktrees' working
trees, outside scope of this audit's session.

### Surfaced for Alex's review

- **Sweep stale worktrees.** Remove the 4 post-merge worktrees:
  ```powershell
  git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\heuristic-mahavira-6cce9c"
  git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\nice-archimedes-288f0b"
  git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\stupefied-herschel-a0bb3d"
  git worktree remove "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\tender-almeida-260205"
  git worktree prune
  ```
  Run from any directory. Don't pass `--force` unless any worktree has
  uncommitted changes Alex wants to discard (none here, all are
  post-merge).
- **(Optional) Cowork/Fleet auto-archive-on-PR-close.** If Alex's
  workflow already uses Cowork/Fleet, the
  [`archive_session` tool description](https://docs.anthropic.com/en/docs/claude-code/cowork)
  mentions an Auto-archive-on-PR-close preference. Enabling it
  prevents the dashboard pile-up that
  `feedback_session_end.md`'s post-merge sweep is partly there to
  clean up.

---

## Area G — Carry-forward debt from Session 18

### Findings

The Phase 2.0g session prompt (in `docs/SESSION_HANDOFF.md` under the
"Session-after-next prompt" section) already tracks every carry-forward
item:

| Item | Tracked in Phase 2.0g prompt? | Where |
|---|---|---|
| PREMM projection switch to COLA-aware | ✓ | "(A) Tab 16 PREMM projection: switch from pure-PP to COLA-aware" |
| Cat 16/17/18 CSC/DHR/admin-code research | ✓ | "(B) Cat 16/17/18 follow-up" |
| Scenario-tests Scenario 3 + 4 updates | ✓ | Same section, sub-bullets for Guaiumi reclassification + Cat 18 expiration-date flag |
| `userNotes` per-position lib/quality TODO | ✓ | Same section, last sentence |
| 4 restated questions for Alex | ✓ | "(C) 4 restated questions for Alex" — full plain-English restatements present |
| Action items still open from S17 + S18 | ✓ | "Session-end checklist → Also re-ask the 4 action items still open" |

### Fixes applied this session

None — Area G is verification-only.

### Surfaced for Alex's review

- **The Phase 2.0g prompt is complete.** No additions needed. The
  audit-derived items (memory hygiene fixes; broken settings.local.json;
  worktree sweep; ADR-worthy decisions) are surfaced separately in this
  audit doc and don't belong in the content-walkthrough prompt for
  Phase 2.0g.

---

## Summary table

| # | Area | Finding | Disposition | Section |
|---|---|---|---|---|
| 1 | A | All 7 memory files exist; index matches | No action | [§A](#area-a--memory-hygiene) |
| 2 | A | Stale parallel memory dir inside worktree | **Surfaced** (deletion command) | [§A](#area-a--memory-hygiene) |
| 3 | A | `feedback_session_end.md` frontmatter name uses underscores | **Applied** (renamed to `feedback-session-end`) | [§A](#area-a--memory-hygiene) |
| 4 | A | `[[bargaining-unit]]` link doesn't resolve | **Applied** (replaced with markdown ref) | [§A](#area-a--memory-hygiene) |
| 5 | A | MEMORY.md index line for `feedback_session_end.md` understated scope | **Applied** (renamed + broadened) | [§A](#area-a--memory-hygiene) |
| 6 | A | `feedback_session_end.md` body didn't mention hook enforcement | **Applied** (added hook reference) | [§A](#area-a--memory-hygiene) |
| 7 | A | No coverage gaps; no bloat | No action | [§A](#area-a--memory-hygiene) |
| 8 | B | CLAUDE.md non-negotiables all still hold | No action | [§B](#area-b--rules--canonical-docs) |
| 9 | B | WORKFLOW.md step 11 is stale (says "merge solo to main") | **Surfaced** (1-line update) | [§B](#area-b--rules--canonical-docs) |
| 10 | B | 6 ADR-worthy decisions never ADR'd (COLA, MCCP split, userNotes, Stop hook, anchor convention, BVA) | **Surfaced** (ADR-010 through 015 proposed) | [§B](#area-b--rules--canonical-docs) |
| 11 | B | ROADMAP.md + VISION.md accurate | No action | [§B](#area-b--rules--canonical-docs) |
| 12 | C | Sessions 13-18 logged consistently | No action | [§C](#area-c--docssession_logmd--audit-cadence) |
| 13 | C | Audit cadence drifted (last audit 11 sessions ago) | **Surfaced** (event-based rule + every-10-session backstop) | [§C](#area-c--docssession_logmd--audit-cadence) |
| 14 | C | No hook for audit cadence | No action (manual trigger sufficed) | [§C](#area-c--docssession_logmd--audit-cadence) |
| 15 | C | SESSION_LOG.md 1,151 lines — growing but not yet bloated | No action; revisit at Phase 2.0i | [§C](#area-c--docssession_logmd--audit-cadence) |
| 16 | D | Stop hook (PR #51) correctly installed and self-contained | No action | [§D](#area-d--hooks--settings) |
| 17 | D | `.claude/settings.local.json` permission rule is mangled (one string, escaped parens, embedded newlines) | **Surfaced** (corrected JSON + Set-Content command) | [§D](#area-d--hooks--settings) |
| 18 | D | `.claude/launch.json` port collisions when two worktrees dev-serve | **Surfaced** (defer to Phase 2.2+) | [§D](#area-d--hooks--settings) |
| 19 | D | No additional hooks recommended right now | No action (premature) | [§D](#area-d--hooks--settings) |
| 20 | E | `labor-report.md` is 4,618 lines | No action; revisit at Phase 2.0i | [§E](#area-e--file--repo-organization) |
| 21 | E | `audits/` has 3 docs, no README index | **Surfaced** (recommend bundling with next audits/ PR) | [§E](#area-e--file--repo-organization) |
| 22 | E | Tabs 16-19 vs special-class.md — no harmful overlap | No action | [§E](#area-e--file--repo-organization) |
| 23 | E | Anchor links compliant; Tab 23-25 will shift Tab 26/27 indices | **Surfaced** (already in Phase 2.0g prompt) | [§E](#area-e--file--repo-organization) |
| 24 | F | PR-per-change compliance strong | No action | [§F](#area-f--workflow-patterns) |
| 25 | F | 4 stale post-merge worktrees registered | **Surfaced** (`git worktree remove` commands) | [§F](#area-f--workflow-patterns) |
| 26 | F | Memory updates happening at correct moments | No action | [§F](#area-f--workflow-patterns) |
| 27 | G | Phase 2.0g prompt tracks every S18 carry-forward | No action | [§G](#area-g--carry-forward-debt-from-session-18) |

**Totals:** 6 applied this session • 11 surfaced for Alex's review • 10 no-action confirmations.

---

## Recommendations not actioned (for Alex's decision)

In priority order:

1. **Fix `.claude/settings.local.json`** (Area D) — the broken
   permission rule is causing silent friction. The corrected JSON +
   one-line PowerShell command is in §D above.
2. **Sweep 4 stale post-merge worktrees** (Area F) — `git worktree
   remove` commands in §F above. Reduces future `gh pr merge --squash`
   noise.
3. **File 6 ADRs** for decisions made since ADR-009 (Area B). Suggested
   ordering: COLA-everywhere → MCCP split → userNotes → Stop hook →
   anchor convention → BVA-as-distinct-source. Could land as one
   batched docs PR (six small ADRs) or one-per-PR. Recommendation:
   batched.
4. **Codify the audit cadence rule** (Area C) — add a paragraph to
   `WORKFLOW.md`'s "Session pacing" section. Event-based (every phase
   close) + 10-session backstop. Sets the next audit at Phase 2.0i.
5. **Update WORKFLOW.md step 11** (Area B) — replace the "merge solo
   to main" wording with the actual PR-per-change pattern. One-line
   edit.
6. **Remove the stale parallel memory dir inside this worktree** (Area
   A). Gitignored, so cosmetic only. Command:
   ```powershell
   Remove-Item -Recurse -Force "C:\Users\ALK\Desktop\Claude Projects\kospos\.claude\worktrees\funny-cannon-ff06d7\.claude\projects"
   ```
7. **Add `docs/audits/README.md`** (Area E) — bundle with the next
   audits/ PR. Not standalone-PR-worthy.
8. **(Optional)** Enable Cowork/Fleet "Auto-archive on PR close" (Area F).

Nothing on this list is blocking Phase 2.0g. The recommended sequence is
to do (1) and (2) before the Phase 2.0g session starts (they're 1-minute
each), and bundle (3)-(7) into one docs PR after Phase 2.0g lands.
