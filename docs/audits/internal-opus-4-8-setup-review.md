# Internal Claude setup review — Opus 4.8 capability pass (Session 42)

**Date:** 2026-05-28
**Branch:** `docs/opus-4-8-setup-review`
**Scope:** A capability-driven review of the Claude-collaboration setup, triggered
by the release of **Opus 4.8** (1M-token context + fast mode). Distinct from a
phase-close audit: instead of scanning for drift since the last phase, this asks
*"now that the model and harness can do more, where do our docs and habits encode
assumptions that are no longer true — and what new capabilities should we adopt?"*

**Cadence note.** This is an **out-of-band, triggered** review under
[WORKFLOW.md § Audit cadence](../WORKFLOW.md) ("triggered by drift / a capability
change — doesn't wait for the cadence"). It is **not** the Phase 2.2.s close audit
— Phase 2.2.s did not ship this session (Alex chose a setup-only session). The
Phase 2.2.s close audit still fires when 2.2.s ships.

## Methodology

Read the canonical docs (`CLAUDE.md`, `WORKFLOW.md`, `DECISIONS.md`,
`SESSION_HANDOFF.md`, `SESSION_LOG.md`), the committed `.claude/` state
(`settings.json`, `launch.json`, the Stop hook), the prior
[Session 19 internal-setup audit](internal-claude-setup-audit.md) and the
intervening phase-close audits, the `memory/` index, and the app layout
(`app/src/lib/**`). Measured the three large docs (`wc -l`). Confirmed the
preview-tool mechanism by loading the `preview_*` tool schemas
(`preview_start` reads the dev-server port from `.claude/launch.json`).
Cross-checked each "new capability" claim against this session's harness
environment so nothing is documented that isn't actually available here.

For each finding: current state → what Opus 4.8 / the current harness changed →
recommendation → disposition (applied this session / deferred with reason).

---

## P1 — Model-selection guidance is stale and now arguably inverted

### Finding
[`CLAUDE.md`](../CLAUDE.md) (session-shutdown sequence) recommends
`claude-sonnet-4-6` as the default and `claude-opus-4-7` for heavy reasoning.
[`WORKFLOW.md` § "Picking a Claude model"](../WORKFLOW.md) carries the
Sonnet-default / Opus-for-hard / Haiku-for-mechanical table and "kick off each
phase with Opus, then drop to Sonnet." Both model IDs predate 4.8.

The *reason* to default to Sonnet was cost/speed. Opus 4.8 changes that calculus:
its **1M-token context** removes the "Opus burns the window faster" concern, and
**fast mode** (`/fast` — Opus quality, faster output) closes most of the speed
gap. For a project where Alex explicitly wants to be *guided* through technical
decisions, the strongest model as the standing default beats per-session
model-switching, whose main payoff was cost.

### Disposition — **applied this session**
- `CLAUDE.md` shutdown-sequence model line → `claude-opus-4-8` (fast mode) default,
  Sonnet only as a cost-saver for docs-only/mechanical sessions.
- `WORKFLOW.md` model section rewritten: Opus 4.8 (fast mode) is the everyday
  default; Sonnet/Haiku reframed as optional cost-savers, not the default.

---

## P2 — Visual verification is now agent-driven, not Alex-only

### Finding
[`WORKFLOW.md` § "Visual verification protocol"](../WORKFLOW.md) and
working-agreement #2 in `CLAUDE.md` are both built on the asymmetry "AI is bad at
visual; *you* (Alex) verify." The harness now exposes the `preview_*` MCP suite
(`preview_start` / `preview_screenshot` / `preview_snapshot` / `preview_inspect`
/ `preview_click` / `preview_fill` / `preview_resize` / `preview_console_logs` /
`preview_network`). The session can run the app, drive it, and present a
screenshot/snapshot as proof. The asymmetry isn't gone — Alex's eye is still the
final aesthetic gate — but the *legwork* moves to Claude, and the default flips
from "punt to Alex" to "prove it, then Alex confirms."

**Sub-finding — `.claude/launch.json` port hazard (S19 carry-forward, now live).**
`preview_start` reads the dev-server port directly from
[`.claude/launch.json`](../../.claude/launch.json) (currently `5173`). If a second
worktree is already serving on 5173, Vite silently falls back to 5174 and the
preview tool would connect to the **wrong app**. The S19 audit flagged this as a
"defer until app-code work resumes" item; Phase 2.2 is app-code work, so it's now
live. The real fix lives in `vite.config.ts` (`strictPort: true` → the second
`npm run dev` fails loudly instead of serving silently on the wrong port), not in
`launch.json` (which is committed and can't be made per-worktree).

### Disposition
- **Applied this session (docs):** `WORKFLOW.md` visual-verification protocol
  rewritten to agent-first + a "one dev server at a time" operational note;
  `CLAUDE.md` working-agreement #2 updated to "verify visually — agent-first."
- **Applied this session (config), separate PR:** `vite.config.ts` `strictPort:
  true` so port collisions fail loudly. (Separate chore PR because it touches app
  config and must pass `npm test` + `npm run build`.)

---

## P3 — Skills and the Workflow tool are undocumented

### Finding
[`WORKFLOW.md` § "When to use subagents"](../WORKFLOW.md) knows only about the
`Explore` and `general-purpose` subagents. The current harness also ships
**skills** and a **Workflow** orchestration tool, several of which map directly
onto recurring KosPos tasks:

| Capability | KosPos use |
|---|---|
| `xlsx` skill | Synthetic example workbooks for parser tests; inspecting Alex's workbook for "match to the dollar" parity checks |
| `code-review` (+ `ultra` cloud mode) | The PR-per-change self-review step |
| `security-review` | Pre-merge pass on internet-facing code (the Cloudflare write path) |
| `verify` | Driving the app to confirm a change works (pairs with visual verification) |
| `consolidate-memory` | The memory-hygiene pass during a setup audit |
| `deep-research` | `docs/research/` work (Cat 17/18 rules, DHR scraping, persistence options) |

The **Workflow tool** fits deterministic fan-out/verify jobs (phase-close audits,
the BVA reconciliation suite, scenario-test sweeps, the eventual cross-system
change reports) but **requires explicit per-session opt-in** (the word
"workflow"), so it must be documented as opt-in, not auto-run.

### Disposition — **applied this session**
Added a "Skills and the Workflow tool" section to `WORKFLOW.md` with the mapping
table and the opt-in note.

---

## P4 — 1M context reframes the session-sizing rules (it doesn't retire them)

### Finding
[`CLAUDE.md`](../CLAUDE.md) opens with "keep it short and dense — long context
dilutes," has an "On usage limits" section advising "size sessions to one phase
sub-step" and "if context feels long, stop," and `WORKFLOW.md` § "Session pacing"
echoes it. The whole apparatus assumes a small context window. With Opus 4.8's
1M-token window plus the harness's auto-summarization of long sessions,
*running out of context mid-task* is rarely the binding constraint anymore —
`labor-report.md` (~110K tokens) plus the full `lib/` tree fit comfortably.

What does **not** change: **cross-session continuity** (every session still
starts fresh, so the handoff/log machinery stays load-bearing) and **Alex's
review load** (brevity in `CLAUDE.md` is for his skim). The fix is to re-attribute
the "keep it short" rationale to human skim, and relax the pacing rules from
"stop when context feels long" to "stop at a clean save point."

### Disposition — **applied this session**
`CLAUDE.md` line-1 rationale, "On usage limits" section, and working agreements
re-framed; `WORKFLOW.md` § "Session pacing" rewritten. Handoff/log machinery
explicitly preserved as cross-session continuity (not a context-limit workaround).

---

## P5 — `SESSION_HANDOFF.md` has drifted into a second log (494 KB), against ADR-008

### Finding
[ADR-008](../DECISIONS.md) ("Session handoff convention") states the handoff is a
machine-updated file that each session "reads on startup and **overwrites** on
shutdown." In practice it has grown to **6,143 lines / 494 KB**, stacking full
per-session statuses + next-prompts back to Session 21 under "Pre-Session N status
archived below" headers. It exceeds the Read tool's 256 KB single-call limit. The
per-session history is already captured in `SESSION_LOG.md`, so the handoff's tail
is duplication.

1M context means this no longer threatens *Claude's* ability to read it — but it
costs prompt-cache + latency every session, buries the actual next-prompt, and
duplicates the log. (Verified the archived sessions exist in `SESSION_LOG.md`
before recommending the cut.)

### Disposition — **applied at session close**
The end-of-session handoff is rewritten lean per ADR-008: current status +
next-prompt + open carry-forwards only (~150–250 lines). The archived tail is
dropped (history stays in `SESSION_LOG.md`). The file header gains an explicit
"overwrite, don't append" reminder.

---

## P6 — `SESSION_LOG.md` (3,697 ln) and `labor-report.md` (8,518 ln) crossed S19 thresholds — **deferred, with reason**

### Finding
The [S19 audit](internal-claude-setup-audit.md) set "revisit SESSION_LOG trim at
>2,000 lines" (now 3,697) and "revisit labor-report.md split at ~7,500 lines"
(now 8,518). Both triggers have fired. But:

- **Splitting `labor-report.md`** was re-examined at the
  [Phase 2.0i close audit](phase-2-0i-close-audit.md), which concluded the split
  *only* improves human skim, not Claude ("it Greps fine across the file"). With
  1M context that conclusion is **stronger**, not weaker — the split is a large
  anchor-link migration with regression risk and near-zero current benefit.
- **Summarizing `SESSION_LOG.md`** would thin the detailed per-prompt record Alex
  reviews *like a hiring screen* (his own logging standard,
  [memory `session_logging.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/session_logging.md)).
  Saving bytes Claude no longer needs to save isn't worth destroying that detail.

### Disposition — **deferred (Alex-confirmed)**
Both held. Offer stands for a dedicated future session if Alex wants the
human-skim win; if so, log summarization should digest only the oldest pre-Phase
2.2 sessions and keep recent detail intact.

---

## P7 — The S41 Cloudflare write path is new internet-facing code with no security pass

### Finding
[ADR-016](../DECISIONS.md) shipped a public write path (Cloudflare Pages + Worker
+ KV, gzip on wire and at rest, a publish-secret, same-origin default, **no
server-side decompression**). The data being public records means confidentiality
isn't the concern — but the **write surface** is: secret handling, gzip/size
handling, the magic-byte sniff that replaced server-side validation. The
`security-review` skill exists and this is the natural moment, especially before
the GitHub-Pages → Cloudflare cutover.

### Disposition — **applied this session (separate review + doc)**
A focused security pass over `lib/session/cloudflare-*` + the Worker, captured in
its own audit doc. Findings → fixes if anything material; otherwise documented as
reviewed.

---

## What should NOT change (considered and rejected)

Opus 4.8 is **not** a reason to touch these — they're still optimal:

- **PR-per-change discipline.** The core regression-prevention rule. Unchanged.
- **Audit cadence** (event-based per phase close + 10-session backstop). Unchanged.
- **The ADR practice** and **the `memory/` system.** Both working as intended.
- **The public-records data stance** ([memory `data_sensitivity.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/data_sensitivity.md)). Unchanged.
- **Minimal hook footprint** (single Stop hook). S19's "don't add hooks
  prematurely" still holds; nothing has drifted that warrants a new hook.

Minor pre-existing observation (out of scope, not fixed here): `audits/README.md`
lists only the investigation audits and predates the Phase 2.2.* close audits, so
its index is stale relative to the folder. Worth a one-line fix in a future
audits/ PR; not an Opus-4.8 item.

---

## Summary table

| # | Finding | Disposition |
|---|---|---|
| P1 | Model guidance stale (`sonnet-4-6`/`opus-4-7`); now inverted by fast mode + 1M context | **Applied** — Opus 4.8 default in CLAUDE.md + WORKFLOW.md |
| P2 | Visual verification can be agent-driven (preview tools); launch.json port hazard live | **Applied** — docs (agent-first) + separate vite.config `strictPort` PR |
| P3 | Skills + Workflow tool undocumented | **Applied** — new WORKFLOW.md section + opt-in note |
| P4 | 1M context reframes session-sizing rules | **Applied** — CLAUDE.md + WORKFLOW.md re-framed; continuity machinery preserved |
| P5 | SESSION_HANDOFF.md 494 KB, violates ADR-008 overwrite intent | **Applied at close** — lean rewrite, history stays in SESSION_LOG |
| P6 | SESSION_LOG (3,697) + labor-report.md (8,518) past S19 size triggers | **Deferred** — human-skim only; 1M context makes split lower-value; log detail is Alex's review record |
| P7 | S41 Cloudflare write path unreviewed for security | **Applied** — focused security pass, separate doc |

**Totals:** 6 applied (P1–P5, P7) • 1 deferred with reason (P6).

---

## Recommendations not actioned (for Alex)

1. **P6 (labor-report.md split / SESSION_LOG summarize)** — deferred per above.
   Pick it up only when human-skim ergonomics start to bite; it is not blocking
   anything and 1M context reduces its value.
2. **`audits/README.md` index refresh** — add the Phase 2.2.* close audits +
   this review to the table. One-line-per-audit; bundle into the next audits/ PR.
3. **(Optional) `strictPort` follow-through.** If multi-worktree dev-serving
   becomes common, consider a per-developer port override mechanism so concurrent
   previews are possible at all (rather than just failing loudly).
