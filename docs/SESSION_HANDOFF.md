# Session Handoff

> **Overwritten every session (ADR-008).** Three things only: current status, carry-forwards, the next-session prompt. Per-session history → `docs/SESSION_LOG.md` (Sessions 0–39 in `SESSION_LOG_ARCHIVE.md`).

The next session reads this first.

---

## Current status (end of Session 56 — EE Additional Pay audits + Issues/Corrections tab, 2026-05-30)

S56 finished **Track B (EE Additional Pay)**: the four cross-check audits + a dedicated **Issues / Corrections** tab. **7 PRs** shipped, all merged.

**Last main commit:** the Issues/Corrections tab ([#204](https://github.com/alkprojects/kospos/pull/204)) + this S56-close docs PR.
**Tests:** **981 / 981** (954 → 981, +27). **Build:** clean. **Branches in flight:** none post-merge.
**Live site:** Pages deploy green; main worktree synced.

### What shipped (S56) — 7 PRs
- [#198](https://github.com/alkprojects/kospos/pull/198) docs: correct the **Vice-vs-Acting** conflation.
- [#199](https://github.com/alkprojects/kospos/pull/199) capture **Position Used For (cols U/V)** on P&P rows.
- [#200](https://github.com/alkprojects/kospos/pull/200) **QR-006** acting-pay dual-entry orphan.
- [#201](https://github.com/alkprojects/kospos/pull/201) **QR-007** acting+supervisory conflict (error).
- [#202](https://github.com/alkprojects/kospos/pull/202) **QR-008** supervisory-differential-owed (+ `cost.ts:topClassBiweekly`).
- [#203](https://github.com/alkprojects/kospos/pull/203) **QR-009** acting-overlap.
- [#204](https://github.com/alkprojects/kospos/pull/204) **Issues / Corrections** tab.

Confirmed the supervisory 5%-of-grade rule + acting/supervisory mutual-exclusivity against SF DHR before building (saved to memory `dhr-acting-supervisory-pay`, `vice-vs-acting`).

**Review on the live site:** open the new **Issues / Corrections** tab (between Positions and the dev tabs). With reports loaded, it lists everything the audits flagged — missing supervisory pay (QR-008), acting/supervisory conflicts (QR-007), unreconciled acting pay (QR-006), and acting overlaps (QR-009) — grouped by severity with filter chips.

### Carry-forward
| # | Item | Status |
|---|---|---|
| **PROJ** | **Projection engine** — answer **B1–B5** in [`proposals/s55-projection-engine.md`](proposals/s55-projection-engine.md), then build (`lib/projections`; lifts Special Class tabs 16–19 Partial→Shipped, unblocks OPS 26/27). **You said you want to be present.** Biggest lever. | open — needs you |
| **EE/expired** | The last EE Additional Pay flag: **`additional-pay-expired` (QR-010)** — needs a manual user-input expected-end-date store + a Position-Detail input + a decision on where the expired check runs (it needs user-input data the standard `runRules` pipeline doesn't pass). | open |
| CH | s48 batches **5** (table primitives), **7** (store-history), **8** (filters), **9** (dead-code) — broader surface; supervised or paired with a review. | open |
| SCALE/2 | Scaling **Stage 2** (index rows by dept + lazy per-dept load) — its own Phase. | open |
| D1/D2 | C-series aesthetic tail (pill radius; `#b91c1c`→`--danger-strong`) — needs your 2 answers. | open |

---

## Next session prompt — Session 57

Paste this verbatim to start Session 57.

**Model:** `claude-opus-4-8` (fast mode on)

```
Session 57. S56 finished EE Additional Pay (Tab 9 → Shipped): four cross-check audits — QR-006 acting dual-entry orphan, QR-007 acting+supervisory conflict, QR-008 supervisory-differential-owed (grade-to-grade via cost.ts:topClassBiweekly), QR-009 acting-overlap — plus a dedicated Issues / Corrections tab (#198–#204). Confirmed the supervisory 5%-of-grade rule + acting/supervisory mutual-exclusivity against SF DHR. Tests 981/981, main clean.

Read first: docs/CLAUDE.md (Windows-worktree gotchas — Bash cwd is the WORKTREE ROOT, not app/, so npm needs `--prefix app`; absolute paths for Read/Glob/Grep; the harness cancels sibling tool calls in a batch if one errors, so keep calls error-proof; branch each PR from origin/main BEFORE editing), docs/SESSION_HANDOFF.md, docs/DECISIONS.md ADR-017 (milestone-only audit cadence), memory dhr-acting-supervisory-pay + vice-vs-acting.

Confirm state on main BEFORE trusting anything: git log --oneline origin/main -5 (tops at the S56-close docs PR); then npm --prefix app install && npm --prefix app test → 981/981 (install FIRST — a fresh worktree has no node_modules). Single error-proof tool calls; absolute paths only.

This session is decision-gated — front-load the pick with me, then I run autonomously:
  A. (recommended) THE PROJECTION ENGINE. You wanted to be present for it. Read docs/proposals/s55-projection-engine.md and answer B1–B5 (COLA-weighting vs partial-period weighting; per-bucket method incl. Premium; attrition modelling; STEPM merit events; surface order). Then I build lib/projections per the staged plan — lifts Special Class tabs 16–19 Partial→Shipped and unblocks the headline OPS 26/27 pages. Biggest lever in the product.
  B. FINISH the last EE Additional Pay flag — additional-pay-expired (QR-010): a manual user-input expected-end-date (entity field + Position-Detail input + persistence, like lib/positions/notes.ts), then flag active acting pay past its end date. One decision needed: where the expired check runs, since it needs user-input data the standard runRules(records) pipeline doesn't pass.
  C. Another build-status gap from the scorecard (docs/domain/labor-report.md), or Scaling Stage 2 (its own Phase).
  D. CH batches 5/7/8/9 — broader (table primitives / store-history / filters / dead-code); supervised or paired with /code-review, not blind.

If I'm away: A needs my B1–B5 and B needs the one expired-check decision, so don't start either blind — ask, or do a supervised-style safe task.

Hard constraints: branch each PR from origin/main BEFORE editing; one logical change per PR; npm test stays green (981); npm run build before any app PR; merge gh pr merge --squash (skip --delete-branch); fast-forward main + sync the main worktree after each merge. Per ADR-017: full close audit only for a milestone — but SESSION_LOG always gets at least a short entry.

End by updating SESSION_HANDOFF.md (lean) and pasting the S58 prompt verbatim in chat.
```
