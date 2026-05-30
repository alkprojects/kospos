# Session Handoff

> **Overwritten every session (ADR-008).** Three things only: current status, carry-forwards, the next-session prompt. Per-session history → `docs/SESSION_LOG.md` (Sessions 0–39 in `SESSION_LOG_ARCHIVE.md`).

The next session reads this first.

---

## Current status (end of Session 55 — EE Additional Pay shipped + projection foundation, 2026-05-30)

S55 was an autonomous away-session: Alex front-loaded one question, picked **EE Additional Pay**, and asked Claude to keep working. **13 PRs** shipped — a complete (Partial) user-facing feature + foundation + a projection proposal + four CH dedups.

**Last main commit:** the `special-class/shared.ts` dedup ([#196](https://github.com/alkprojects/kospos/pull/196), `bf9a330`) + this S55-close docs PR.
**Tests:** **954 / 954** (905 → 954, +49). **Build:** clean. **Branches in flight:** none post-merge.
**Live site:** Pages + Cloudflare deploys green; main worktree synced.

### What shipped (S55) — 13 PRs
**EE Additional Pay (Tab 9):** [#184](https://github.com/alkprojects/kospos/pull/184) importer · [#185](https://github.com/alkprojects/kospos/pull/185) entity + **Source Tables → EE Additional Pay** sub-tab · [#186](https://github.com/alkprojects/kospos/pull/186) **Position Detail** card · [#187](https://github.com/alkprojects/kospos/pull/187) **Positions-list** chip + filter · [#194](https://github.com/alkprojects/kospos/pull/194) review-hardening.
**Foundation + proposal:** [#191](https://github.com/alkprojects/kospos/pull/191) `lib/calendar/` (roadmap 2.2.1) · [#192](https://github.com/alkprojects/kospos/pull/192) **projection-engine proposal** (B1–B5 decisions for you).
**Docs + CH:** [#188](https://github.com/alkprojects/kospos/pull/188) scorecard + questions · [#189](https://github.com/alkprojects/kospos/pull/189) cells.ts · [#190](https://github.com/alkprojects/kospos/pull/190) fmtMoneyCents · [#193](https://github.com/alkprojects/kospos/pull/193) id.ts · [#195](https://github.com/alkprojects/kospos/pull/195) rollupByStatus · [#196](https://github.com/alkprojects/kospos/pull/196) special-class/shared.ts.

Full close audit: [`audits/phase-2-2-ee-additional-pay-close-audit.md`](audits/phase-2-2-ee-additional-pay-close-audit.md).

### Carry-forward
| # | Item | Status |
|---|---|---|
| **PROJ** | **Projection engine** — answer **B1–B5** in [`proposals/s55-projection-engine.md`](proposals/s55-projection-engine.md), then build (`lib/projections`; lifts tabs 16–19 Partial→Shipped, unblocks 26/27). **You said you want to be present.** | open — needs you |
| **EE/audits** | Tab 9's **acting dual-entry** + **supervisory owed-but-not-paid** audits + the expired flag — **5 questions** in [`domain/labor-report-tabs.md` § Tab 9](domain/labor-report-tabs.md#open-questions--todo-7) | open — needs you |
| CH | s48 batches **5** (table primitives), **7** (store-history), **8** (filters), **9** (dead-code) — broader surface; do **supervised** or pair with a review | open |
| SCALE/2 | Scaling **Stage 2** (index rows by dept + lazy per-dept load) — its own Phase | open |
| D1/D2 | C-series aesthetic tail (pill radius; `#b91c1c`→`--danger-strong`) — **needs your 2 answers** | open |
| TX | `temporary_exchange_tx` memory's 4 unconfirmed questions | ask when relevant |

---

## Next session prompt — Session 56

Paste this verbatim to start Session 56.

**Model:** `claude-opus-4-8` (fast mode on)

```
Session 56. S55 shipped EE Additional Pay (Tab 9) end-to-end as a Partial surface — importer + entity + Source Tables sub-tab + Position Detail panel + Positions-list filter (#184–#187, #194) — plus lib/calendar (#191), a projection-engine proposal (#192), and four CH dedups. Tests 954/954, main clean.

Read first: docs/CLAUDE.md (absolute-paths gotcha — always cd to the app dir in Bash; branch each PR from origin/main BEFORE editing), docs/SESSION_HANDOFF.md, docs/DECISIONS.md ADR-017 (milestone-only audit cadence), and the S55 SESSION_LOG + close audit (audits/phase-2-2-ee-additional-pay-close-audit.md).

Confirm state on main BEFORE trusting anything: git log --oneline origin/main -5 (tops at #196 bf9a330); then cd app && npm install && npm test → 954/954 (npm install FIRST — fresh worktree has no node_modules). Single error-proof tool calls; absolute paths only.

This session has TWO decision-gated tracks that both need your input up front — front-load the pick with me, then I run autonomously:
  A. (recommended) THE PROJECTION ENGINE. You said you want to be present for it. Read docs/proposals/s55-projection-engine.md and answer B1–B5 (COLA-weighting vs partial-period weighting; per-bucket method incl. Premium; attrition modelling; STEPM merit events; surface order). Then I build lib/projections per the staged plan — lifts tabs 16–19 (Special Class) Partial→Shipped and unblocks the headline OPS 26/27 pages. Biggest lever in the product.
  B. FINISH EE ADDITIONAL PAY. Answer the 5 questions in docs/domain/labor-report-tabs.md § Tab 9 (the acting dual-entry join — is the acting person the position's Vice 1?; the per-BU supervisory Rep-To-Pay-Above rule/%; the missing expected-end-date source; acting-overlap grain; annualization). Then I build the dual-entry + supervisory-owed audits + the 4 Data-Issues flags → Tab 9 Partial→Shipped.
  C. Another build-status gap from the scorecard (docs/domain/labor-report.md), or Scaling Stage 2 (its own Phase).
  D. CH batches 5/7/8/9 — but these are broader (table primitives / store-history / filters / dead-code); do them supervised or paired with a /code-review, not blind.

If I'm away: A and B both need my answers, so don't start them blind — do a supervised-style safe task or ask. Don't land CH batch 5/7/8/9 unsupervised (broad visual/behavioral surface).

Hard constraints: branch each PR from origin/main (before editing — S55 had one slip where a PR was committed onto a merged branch); one logical change per PR; npm test stays green (954); npm run build before any app PR; merge gh pr merge --squash (skip --delete-branch); fast-forward main + sync the main worktree after each merge. Per ADR-017: full close audit only for a milestone — but SESSION_LOG always gets at least a short entry.

End by updating SESSION_HANDOFF.md (lean) and pasting the S57 prompt verbatim in chat.
```
