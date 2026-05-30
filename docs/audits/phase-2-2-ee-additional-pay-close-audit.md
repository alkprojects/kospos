# Close audit — EE Additional Pay (workbook Tab 9) · Session 55

**Date:** 2026-05-30 · **Lens:** hiring-screen grading (per memory `session-logging`).
**Trigger (ADR-017):** a new **user-facing feature surface** shipped (the
Source Tables → EE Additional Pay sub-tab + the Position Detail Additional Pay
panel + the Positions-list indicator/filter). Milestone → full close audit.

## What shipped (13 PRs, all squash-merged + main fast-forwarded)

**The feature — EE Additional Pay (4 PRs):**

| PR | What |
|---|---|
| [#184](https://github.com/alkprojects/kospos/pull/184) | **Importer.** `ps-hcm-ee-addl-pay` ReportType + `PsHcmEeAddlPayRow` (18 cols A:R, headers verified against `reports-folder-inventory.md`), a detection fingerprint, Excel-serial `Eff Date` → ISO, + FilePicker dispatch. +6 tests. |
| [#185](https://github.com/alkprojects/kospos/pull/185) | **Entity + source-data tab.** `lib/additional-pay/` (`buildAdditionalPay`, `classifyRateCode`, `rollupByKind`) + a **Source Tables → EE Additional Pay** sub-tab (rollup chips, search, per-assignment table). +16 tests. Browser-verified. |
| [#186](https://github.com/alkprojects/kospos/pull/186) | **Position Detail panel.** `indexByEmplId` + an Additional Pay card on Position Detail (incumbent + vice, joined by emplId, role-labeled). +4 tests. Browser-verified. |
| [#187](https://github.com/alkprojects/kospos/pull/187) | **Positions-list surfacing.** At-a-glance kind chip + "Add'l pay only" filter + an "Add'l pay" stat (all shown only when the source is loaded). +3 tests. Browser-verified. |

**Surrounding work (9 PRs):**

| PR | What |
|---|---|
| [#188](https://github.com/alkprojects/kospos/pull/188) | Docs: scorecard tab 9 Not built → **Partial**; **5 saved questions for Alex** (the deferred audits). |
| [#189](https://github.com/alkprojects/kospos/pull/189) | CH **batch 3** — `importers/cells.ts` (num/str/makeColLookup/iso across 5 importers). +7 tests. |
| [#190](https://github.com/alkprojects/kospos/pull/190) | CH — `fmtMoneyCents` (the per-PP formatter I introduced, deduped into `lib/format.ts`). |
| [#191](https://github.com/alkprojects/kospos/pull/191) | **`lib/calendar/`** (roadmap 2.2.1) — `payPeriodElapsed` lifted out of CalendarView. +5 tests. Browser-verified. |
| [#192](https://github.com/alkprojects/kospos/pull/192) | **Projection-engine proposal** (`docs/proposals/s55-projection-engine.md`) — Part A scaffolding + B1–B5 decisions for Alex. |
| [#193](https://github.com/alkprojects/kospos/pull/193) | CH **batch 6 (L3)** — `lib/id.ts:makeId`. +3 tests. |
| [#194](https://github.com/alkprojects/kospos/pull/194) | **Hardening** — the 2 Low findings from the adversarial review (de-dupe incumbent==vice; stable-id keys). +1 test. |
| [#195](https://github.com/alkprojects/kospos/pull/195) | CH **batch 6 (L7)** — generic `rollupByStatus`. +4 tests. |
| [#196](https://github.com/alkprojects/kospos/pull/196) | CH — `special-class/shared.ts` (4 byte-identical RTPOM/OVERM helpers hoisted). |

**Tests:** 905 → **954** (+49). **Build:** clean every PR. **Live site:** Pages + Cloudflare deploys green; main worktree synced (`bf9a330`).

## Brief audit (grading lens)

**Strengths.**
- **Front-loaded the one blocking decision.** A single `AskUserQuestion` (main task + secondary fillers) before Alex slept; everything after ran autonomously against his answers. No mid-session stalls.
- **Respected "be present for the projection engine."** Built only the *uncontroversial* projection foundation (the calendar primitive — a pure extraction the roadmap already named 2.2.1) and wrote a decisions-and-questions **proposal** for the nuanced parts, rather than guessing the COLA-weighting / attrition / per-bucket-method calls.
- **Didn't guess domain nuance.** The 18-col source has no expected-end-date and no position-acted-in column; rather than invent a dual-entry/supervisory-owed audit, the 5 specific blockers were written up as questions ([#188](https://github.com/alkprojects/kospos/pull/188)) — exactly Alex's "save questions for any uncertainty."
- **Adversarial self-review of the headline feature** before relying on it. Verdict: no High/Med correctness bugs; the 2 Low React-key edges were fixed ([#194](https://github.com/alkprojects/kospos/pull/194)).
- **One logical change per PR, every PR test-green + build-clean + (for UI) browser-verified**, squash-merged, main fast-forwarded, main worktree synced — the full discipline held across 13 PRs.
- **CH dedups were directly earned by the feature.** The 5th importer re-introduced the num/str/iso duplication → batch 3 was the natural, in-context cleanup.

**Could improve / watch.**
- **One process slip, self-caught:** PR 3 was first committed onto the already-merged PR 2 branch instead of a fresh `origin/main` branch. Caught immediately, fixed cleanly (cherry-picked to a proper branch; restored the merged branch via `--force-with-lease`). No bad history reached `main`, but the lapse is logged. Lesson: branch from `origin/main` *first*, before editing.
- **EE Additional Pay is Partial, not Shipped.** The two cross-check audits (acting dual-entry, supervisory owed-but-not-paid) — the workbook tab's actual *purpose* — are deferred pending Alex. The shipped surface is the source view + position surfacing, which is genuinely useful but not the full tab. Scorecard reflects this honestly.
- **Wall-clock under the 6-hour ask.** The high-value, low-risk work was done in ~1h50m. Rather than fill to 6h with broad refactors (s48 batches 5/7/8/9 — table primitives, store-history, filters, dead-code: all broad visual/behavioral surface) that Alex couldn't review while asleep, I stopped at the safe boundary. Trade-off chosen deliberately: "doesn't cause any issues" (hard constraint) over "6 hours if possible" (soft). Those batches are teed up.

## Lessons

1. **A proposal is the right artifact when the user wants to own a nuanced design.** Doing the analysis + laying out options→recommendation→questions advances the work without pre-empting the decision. Reusable whenever a task is "complex with nuance — be present."
2. **Adversarial review pays even on a well-tested feature.** The review found two real (if Low) React-key edge cases the 70 feature tests didn't cover — both shipped before the user could hit them.
3. **Branch from `origin/main` before touching files.** The PR-3-on-merged-branch slip is the recurring worktree footgun; the fix-up is cheap but avoidable.

## Carry-forward

| # | Item | Status |
|---|---|---|
| EE/audits | Tab 9's **dual-entry + supervisory-owed audits** + the expired flag — 5 questions in [labor-report-tabs.md § Tab 9](../domain/labor-report-tabs.md#open-questions--todo-7) | **open — needs Alex** |
| PROJ | Projection engine — answer **B1–B5** in [s55-projection-engine.md](../proposals/s55-projection-engine.md), then the staged build (`lib/projections`, lifts tabs 16–19, unblocks 26/27) | **open — needs Alex (he wants to be present)** |
| CH | s48 batches **5** (table primitives), **7** (store-history), **8** (filters), **9** (dead-code) | open (broader surface — pair with a review or do supervised) |
| SCALE/2 | Scaling **Stage 2** (index rows by dept + lazy per-dept load) | open — its own Phase |
| D1/D2 | C-series aesthetic tail (pill radius; `#b91c1c`→`--danger-strong`) | needs Alex's 2 answers |
| TX | `temporary_exchange_tx` memory's 4 unconfirmed questions | ask when relevant |

**See also:** [s55-projection-engine.md](../proposals/s55-projection-engine.md), [labor-report.md scorecard](../domain/labor-report.md#build-status-scorecard--refreshed-session-53-2026-05-30), the S55 SESSION_LOG entry.
