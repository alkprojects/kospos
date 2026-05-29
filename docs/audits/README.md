# Audits

This folder holds **audit and investigation docs** — point-in-time evidence
that supports KosPos design decisions and quality logic. They're distinct from
the per-tab walkthroughs in `docs/domain/` (which describe *what the workbook
does*) and from the data-source references in `docs/data-sources/` (which
describe *upstream file shapes*). Audits answer *"what does the real data
actually look like, and what do the cross-tab references in our docs actually
resolve to?"*

## Current audits

| File | Scope | Feeds |
|---|---|---|
| [`internal-opus-4-8-setup-review.md`](internal-opus-4-8-setup-review.md) | Session 42 — Opus 4.8 capability review of the Claude-collaboration setup (model guidance, agent-driven visual verification, skills/Workflow tool, 1M-context session-sizing, SESSION_HANDOFF.md bloat vs ADR-008, Cloudflare write-path security). | Out-of-band capability trigger (not a phase close); refreshed CLAUDE.md + WORKFLOW.md; `vite.config.ts` strictPort; Cloudflare security review |
| [`cloudflare-write-path-security-review.md`](cloudflare-write-path-security-review.md) | Session 42 — security review of the S41 Cloudflare snapshot publish/fetch path (Worker + client). Threat model, 7 findings (1 fixed, 2 tracked, 4 info/by-design). | Opus 4.8 review P7; constant-time secret comparison fix in `functions/api/snapshot.ts` |
| [`phase-2-1-close-audit.md`](phase-2-1-close-audit.md) | Session 24 — Phase 2.1 close audit. Small scope (route-guard PR #59 spot-check + Phase 2.0i carry-forward status + new-drift scan). | Second phase-close trigger under audit cadence; in-PR docs sync (ROADMAP `?budget=1` → `?dev=1`); 2 drifted-further carry-forwards (worktrees 3 → 5; SESSION_LOG.md past trim trigger) |
| [`phase-2-0i-close-audit.md`](phase-2-0i-close-audit.md) | Session 22 — Phase 2.0 close audit. Refresh of (a) Session 19 internal-setup audit Areas A–G and (b) Session 17 Task D walkthrough audit (anchor verifier, cross-doc consistency, Data Issues catalog drift). | First phase-close trigger under the [WORKFLOW.md § Audit cadence](../WORKFLOW.md) rule; 6 items surfaced for Alex |
| [`internal-claude-setup-audit.md`](internal-claude-setup-audit.md) | Session 19 audit of memory, canonical docs, hooks/settings, session log, repo organization, workflow patterns | Periodic-audit cadence (per WORKFLOW.md § Audit cadence); ADR-010 through ADR-015 surfaced from this audit's Area B (landed in PR #54) |
| [`labor-report-walkthrough-audit.md`](labor-report-walkthrough-audit.md) | Session 17 Task D — anchor-link compliance across labor-report.md, open-question triage, cross-tab consistency | github-slugger anchor convention (ADR-014); 13 broken anchors fixed in PR #45 |
| [`labor-report-scenario-tests.md`](labor-report-scenario-tests.md) | Session 17 Task E — 9 position-grain scenarios run against the real workbook (Reports-To chains, Cat 17/18 expiry, Cat 16 hours, vacant-no-RTF, pool positions, earnings-code orphans, …) | `lib/quality/` flag catalog for Phase 2.4; 4 open Alex-action items (7 expired Cat 17/18 positions; Guaiumi Cat 16; 5 vacant-no-RTF; CPO posting) |
| [`bva-reconciliation-suite.md`](bva-reconciliation-suite.md) | Session 17 Task B — 7 chartfield-grain reconciliation tests (KK budget journals, GL actuals journals, AX vs AZ, MERGE/INACTIVATED placeholders, pool-position dedup, text-vs-numeric joins, dormant `<>10190` bug) | KosPos reconciliation surface (ADR-015); BVA importer (Phase 2.4) |

## When to write a new audit

Audits should be written, not bundled into walkthroughs, when:

- The work is **empirical** (running scripts against real workbook / data files to verify claims made elsewhere).
- The output is **cross-cutting evidence**, not a single tab's documentation.
- Future sessions will need to **re-run or refresh** the investigation (e.g., after a new snapshot lands).

Audits do NOT replace walkthroughs in `domain/`. A tab walkthrough describes the tab; an audit verifies cross-tab claims about that tab.

## Naming convention

- Lowercase, kebab-case: `labor-report-walkthrough-audit.md`, not `LaborReportAudit.md`.
- Prefix by subject when one major source dominates: `labor-report-*` for workbook investigations, `bva-*` for BVA investigations, `internal-*` for Claude-collaboration audits.

## Cadence

See [`docs/WORKFLOW.md` § Audit cadence](../WORKFLOW.md) for the audit-cadence rule (event-based per phase close + every-10-session backstop). Out-of-band audits — triggered by visible drift in a specific area — don't have to wait for the cadence.
