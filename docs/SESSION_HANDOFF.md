# Session Handoff

> **Overwritten every session (ADR-008).** Three things only: current status, carry-forwards, the next-session prompt. Per-session history → `docs/SESSION_LOG.md` (Sessions 0–39 in `SESSION_LOG_ARCHIVE.md`).

The next session reads this first.

---

## Current status (end of Session 58 — quality-rule audit + Issues grouped redesign, 2026-05-30)

S58 was a **data-quality rule audit** ("many flagged issues aren't real — go through them one by one") plus a deep dive on the workbook's `Reporting Tree` manual-correction tab. **8 PRs merged.** Tests **1000 → 1010**, build clean, live site synced. **Branch: `none`.**

Root cause of the false positives: BFM **zero-pads** 8-digit position numbers (`00304335`); PS HCM/OBI store them numeric (`304335`). The cross-system rules compared raw strings. The app already had `normalizePositionKey` — the quality rules just hadn't used it.

### What shipped
| PR | What |
|---|---|
| [#210](https://github.com/alkprojects/kospos/pull/210) | Issues redesign (S57 carry) merged |
| [#215](https://github.com/alkprojects/kospos/pull/215) | normalize position-number join keys (QR-001/003/004/005/012) — kills the zero-padding false positives |
| [#216](https://github.com/alkprojects/kospos/pull/216) | remove QR-004 (FTE mismatch — not a real class) |
| [#217](https://github.com/alkprojects/kospos/pull/217) | QR-009 — distinct employee records, not effective-dated rows |
| [#218](https://github.com/alkprojects/kospos/pull/218) | QR-003 — base salary (WKP) only |
| [#219](https://github.com/alkprojects/kospos/pull/219) | QR-006 — EE Additional Pay = source of truth |
| [#220](https://github.com/alkprojects/kospos/pull/220) | QR-012 — latest-pay-period only (option B) |
| [#221](https://github.com/alkprojects/kospos/pull/221) | Issues grouped (Phase A1) — type → terse findings → detail |

### Build queue (Alex confirmed the specs)
- **Phase A2 (next):** Issues **select / clear-with-reason** + a **"cleared" section above** the errors; persist browser-local (like position notes). Makes the noisy new rules usable.
- **Phase B rules:** QR-011 redefine — (1) ERROR dept ≠ budget dept, (2) POSSIBLE ERROR combo dept = position dept (no exclusions); new **multiple-incumbents-per-position** flag (commissioners/interns — cleared once); **budget-eliminated-next-FY** (filled + 0 FTE next FY; only fires once Dec budget reports load); QR-008 verify step-class excludes extended steps; import `Budget Position Number` (future-proofing).

### Carry-forward
| Item | Status |
|---|---|
| Phase A2 (clear/dismiss) → Phase B rules | queued — specs confirmed |
| "Filled non-TEMP TEX" / "On Leave" as KosPos rules? | **needs Alex** (yes/no) |
| reassigned-in-budget (~30 Reporting-Tree rows) | deferred → budget-development module |
| In-app (no code): publish secret on github.io origin; Load Reports "Cloudflare-Worker URL" = `https://kospos.pages.dev/api/dhr-proxy` | open — needs Alex |
| QR-010 expired-pay; projection engine (B1–B5 in `proposals/s55-projection-engine.md`); Scaling Stage 2; CH 5/7/8/9 | open |

---

## Next session prompt — Session 59

Paste verbatim to start Session 59.

**Model:** `claude-opus-4-8` (fast mode on)

```
Session 59. S58 merged 8 PRs from a data-quality rule audit + a Reporting Tree deep dive: #210 Issues redesign, #215 zero-padding join fix (QR-001/003/004/005/012), #216 removed QR-004, #217 QR-009 effdt-dedup, #218 QR-003 base-pay (WKP), #219 QR-006 guidance, #220 QR-012 latest-PP, #221 Issues grouped (Phase A1). Tests 1010/1010, main clean.

Read first: docs/CLAUDE.md (Windows gotchas — Bash cwd is the REPO ROOT now, the worktree was deleted mid-S58; npm needs `--prefix app`; absolute paths for Read/Glob/Grep; branch each PR from origin/main BEFORE editing; `npm run build | tail` masks tsc's exit — capture ${PIPESTATUS[0]}), docs/SESSION_HANDOFF.md, docs/SESSION_LOG.md S58 entry. Confirm state: git log --oneline origin/main -5 (tops at #221) then npm --prefix app install && npm --prefix app test → 1010 (install FIRST).

BUILD NEXT (specs confirmed S58), each its own PR:

A2 — Issues clear/dismiss: select findings, mark cleared / not-an-error with an explanation, show cleared in a section ABOVE the active errors. Persist browser-local like position notes (usePositionNotes pattern + wire into lib/session/snapshot.ts so a clear survives reload + a published snapshot). Key the cleared state on ruleId+positionNumber+emplId (stable; NOT sourceRows, which shift on re-import). Browser-verify + my live aesthetic review. This is the foundation that makes the noisy Phase-B rules usable.

Then Phase B rules:
  - QR-011 redefine: (1) ERROR when position dept != budget dept; (2) POSSIBLE ERROR (warning) when combo code dept = position dept. No exclusions (commissioners/temp included). Memory: combo-code-task-profile. Fields in ps-hcm-pp: departmentCode (position dept) vs budgetDepartmentCode vs comboDepartmentCode.
  - NEW rule: multiple current incumbents on one position -> flag (commissioners on shared positions + temp interns are legit, cleared once via A2). Detect: group ps-hcm-pp by positionNumber, 2+ distinct non-blank current emplIds.
  - NEW rule: budget-eliminated-next-FY -> a FILLED position whose NEXT-FY budget FTE is 0 (next FY = FY2026-27 for current FY 2025-26). Uses BFM budgetByFy; only surfaces once Dec budget-development reports are loaded (expect zero until then).
  - QR-008: verify the step reference excludes extended/longevity steps (grade = top non-extended step / MCCP Range A, per DHR grade-to-grade); restrict topClassBiweekly if it includes extended steps.
  - Import "Budget Position Number" (P&P col BO) into ps-hcm-pp — future-proofing; always = Position # today.

Answer for me when you get there:
  - "Filled non-TEMP TEX" and "On Leave" (my Reporting-Tree detector columns) — want these as KosPos rules too?
  - reassigned-in-budget (~30 rows) — confirmed deferred to the budget-development module?

My in-app actions still pending (no code): enter the publish secret once in the Cloudflare settings on the github.io origin; set Load Reports "Cloudflare-Worker URL" = https://kospos.pages.dev/api/dhr-proxy.

Hard constraints: branch each PR from origin/main BEFORE editing; one logical change per PR; npm test stays green (1010); npm run build before any app PR; merge gh pr merge --squash (skip --delete-branch); fast-forward main after each merge. UI changes browser-verified + my live aesthetic review. Per ADR-017 SESSION_LOG always gets at least a short entry.

End by updating SESSION_HANDOFF.md (lean) and pasting the S60 prompt verbatim in chat.
```
