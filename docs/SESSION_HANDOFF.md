# Session Handoff

> **Overwritten every session (ADR-008).** Three things only: current status, carry-forwards, the next-session prompt. Per-session history → `docs/SESSION_LOG.md` (Sessions 0–39 in `SESSION_LOG_ARCHIVE.md`).

The next session reads this first.

---

## Current status (end of Session 59 — Issues clear/dismiss + Phase B rules, 2026-05-31)

S58's confirmed queue, shipped as **5 single-purpose PRs**. Tests **1010 → 1047**, build clean, live site synced. **Branch: `none`.**

### What shipped
| PR | What |
|---|---|
| [#223](https://github.com/alkprojects/kospos/pull/223) | **A2 — Issues clear/dismiss + persistence** (the foundation that makes the noisy rules usable) |
| [#224](https://github.com/alkprojects/kospos/pull/224) | **QR-011 redefine** — ERROR dept≠budget; WARNING combo dept = position dept |
| [#225](https://github.com/alkprojects/kospos/pull/225) | **QR-013 (new)** — position with 2+ distinct current incumbents |
| [#226](https://github.com/alkprojects/kospos/pull/226) | **QR-014 (new)** — FILLED position eliminated in next-FY budget (0 FTE) |
| [#227](https://github.com/alkprojects/kospos/pull/227) | **Import Budget Position Number** (P&P col BO) into ps-hcm-pp |

### Decisions waiting on Alex (front-loaded for S60)
1. **QR-008 step grade-top.** Verified: `topClassBiweekly` (used only by QR-008, advisory) already uses **Range A** for MCCP, but the step path takes the **literal top step**. 261/1702 class-setIDs have a max-rate step >5; only 87 have a `disc.json` boundary, 174 (IT broad-band 1041-43) have none — no clean marker for "extended/longevity." **What should the grade-top be for >5-step classes?** Options: (a) keep literal top step, (b) exclude discretionary steps (fixes only the 87), (c) a per-class grade reference, (d) leave QR-008 as-is.
2. **"Filled non-TEMP TEX" + "On Leave" as rules?** Recommend yes (cheap ps-hcm-pp scans, now clearable via A2). Need exact semantics: non-TEMP TEX = `appointmentType==='TEX'` + non-temp `exemptCategory`? On Leave = `employeeStatus==='L'`?
3. **A2 propagation?** Cleared findings currently still show in the inline **Data Issues** badge + per-position flags. Propagate the suppression there too? (Small, makes the feature coherent — recommended first PR.)

### Carry-forward
| Item | Status |
|---|---|
| A2 propagation to inline panel + per-position flags | recommended next (no decision needed) |
| QR-008 grade-top; "Filled non-TEMP TEX" / "On Leave" rules | **needs Alex** (see Decisions above) |
| reassigned-in-budget (~30 rows) | confirmed deferred → budget-development module |
| In-app (no code): publish secret on github.io origin; Load Reports "Cloudflare-Worker URL" = `https://kospos.pages.dev/api/dhr-proxy` | open — needs Alex |
| QR-010 expired-pay; projection engine (B1–B5 in `proposals/s55-projection-engine.md`); Scaling Stage 2 (index by dept + lazy per-dept load); CH 5/7/8/9 | open — candidate larger builds |

---

## Next session prompt — Session 60

Paste verbatim to start Session 60.

**Model:** `claude-opus-4-8` (fast mode on)

```
Session 60. S59 shipped 5 PRs: #223 A2 Issues clear/dismiss + persistence, #224 QR-011 redefine (dept≠budget ERROR / combo=position WARNING), #225 QR-013 multiple-incumbents, #226 QR-014 budget-eliminated-next-FY, #227 import Budget Position Number. Tests 1047, main clean.

Read first: docs/CLAUDE.md (Windows gotchas — absolute paths for Read/Glob/Grep; Bash cwd is the worktree root, npm needs `--prefix app`; branch each PR from origin/main BEFORE editing; `npm run build | tail` masks tsc's exit — capture ${PIPESTATUS[0]}); docs/SESSION_HANDOFF.md; docs/SESSION_LOG.md S59 entry. Confirm state: git log --oneline origin/main -6 then npm --prefix app install && npm --prefix app test → 1047 (install FIRST).

Answer up front (these gate the rule work):
  - QR-008 step grade-top for classes with >5 steps: (a) keep literal top step, (b) exclude discretionary (disc.json — covers 87 of 261), (c) per-class grade reference, (d) leave as-is. (Range/MCCP path already correctly uses Range A.)
  - "Filled non-TEMP TEX" rule semantics: appointmentType==='TEX' AND a non-temp exemptCategory? And "On Leave" = employeeStatus==='L'? Want both as rules?

DEFAULT BUILD (no decision needed) — start here unless you redirect me:
  - A2 follow-up: propagate cleared-finding suppression to the inline Data Issues panel + the per-position quality flags, so a cleared finding disappears everywhere (not just the Issues view). Expose a shared `useActiveIssues()`-style selector over useAppStore.issues + useClearedFindings. Browser-verify + your live aesthetic review.

Then, per your answers: the two new detector rules (Filled non-TEMP TEX, On Leave), and/or the QR-008 step restriction.

Bigger builds also open if you'd rather pivot: projection engine (B1–B5 in proposals/s55-projection-engine.md); Scaling Stage 2 (index ps-hcm by dept + lazy per-dept load — north-star citywide, see memory citywide-scaling); QR-010 expired-pay; CH 5/7/8/9.

Hard constraints: branch each PR from origin/main BEFORE editing; one logical change per PR; npm test stays green (1047+); npm run build before any app PR; merge gh pr merge --squash (skip --delete-branch); fast-forward main after each merge. UI changes browser-verified + your live aesthetic review. Per ADR-017 SESSION_LOG always gets at least a short entry.

End by updating SESSION_HANDOFF.md (lean) and pasting the S61 prompt verbatim in chat.
```
