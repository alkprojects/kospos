# Phase 2.2.w close audit — Session 47

**Date:** 2026-05-29 (session opened 2026-05-28, crossed midnight)
**Branches / PRs:** four single-purpose PRs, each squash-merged to main, plus this docs PR:
- [#156](https://github.com/alkprojects/kospos/pull/156) `refactor/ui-modal-overlay-frame` — **H** modal-frame lift
- [#157](https://github.com/alkprojects/kospos/pull/157) `fix/session-load-restores-scrapers` — **M** file-load scraper parity
- [#158](https://github.com/alkprojects/kospos/pull/158) `refactor/data-tab-labels` — **R** "Data"/"Load Data" rename
- [#159](https://github.com/alkprojects/kospos/pull/159) `fix/a11y-clickable-rows` — **K** keyboard-operable rows

**Scope:** Phase 2.2.w close audit. Alex's S47 input was a delegation + throughput ask — *"whatever you suggest, can you do all this session?"* — answered by shipping **all four** of the strongest S46 UI/UX proposals-backlog picks (H / M / R / K) as **four separate single-purpose PRs** (one logical change each — NOT a bundle), each verified live before merge. Alex was away for the session; the one genuine decision (the pick) was front-loaded via `AskUserQuestion`, and the popup follow-up was front-loaded in the same batch.

Last audit was the [Phase 2.2.v close audit](phase-2-2-v-close-audit.md) one session prior (S46).

## Methodology

1. Read the startup set (CLAUDE.md, SESSION_HANDOFF, S46 SESSION_LOG, memory, WORKFLOW, the 2.2.v close audit, the S46 proposals doc, the labor-report sub-phase graph).
2. Front-loaded both decisions before any work (Alex away): the 2.2.w pick (`AskUserQuestion`) + the popup confirmation. Confirmed the test baseline **861 / 861** after `npm install`.
3. **Pre-validated H before asking** — read all 6 dialog shells and confirmed the proposals-doc modal inventory is exact (Family A ×4 identical top-aligned shells; Family B ×2 centered shells lacking role/aria/Esc; LoadingOverlay separate). This let the pick question be concrete and made H ready to ship immediately.
4. Shipped H → M → R → K serially, **merging each to main and re-branching the next from the updated `origin/main`**, so squash merges stayed conflict-free (H and K both touch `LaborView.tsx`; serial merge avoided any 3-way conflict).
5. **Agent-first live verification for every PR** (the dev server ran on real IDB-restored data — 2 positions, 6,727 eligibility lists): H — both modal families render identically + Esc now closes Family B + focus enters the dialog; M — Save/Load UI healthy, round-trip restores scrapers; R — tab strip reads "… Source Tables · Load Reports", no "Load Data" anywhere; K — tab to a Positions row + Enter opens PositionDetail.
6. Re-ran `npm test` + `npm run build` per PR. **861 → 874** (+13: H +7, M +1, K +5).
7. Re-checked the S46 carry-forwards (B, C, D, F, H, I, L, M, N, O) + the popup item + scanned for new drift.

---

## Part 1 — This session's PRs

### Finding 1 — H: modal overlay-frame lifted to `lib/ui/Modal`, closing 2 P1 a11y gaps

**Status:** resolved ([#156](https://github.com/alkprojects/kospos/pull/156)).

Six dialogs had copy-pasted their overlay + card shell in two families. `lib/ui/Modal` now owns backdrop + card + `role="dialog"`/`aria-modal`/`aria-label` + Esc + backdrop-close + **focus-trap + focus-restore** (new for all six) + the `align` (top/center) reconciliation. Migrated all six; LoadingOverlay left as-is. **Deliberately did NOT unify the ✕ buttons** — they differ in style (borderless `✕` vs bordered `×`, Eligibility has a footer "Close"), so owning them would change appearance; that's the planned **C1** follow-up. z-index reconciled to 1000 (viewers were 100; none co-render; LoadingOverlay stays 2000). +7 Modal tests. Verified live on PositionDetail (Family B) + EligibilityDetail (Family A, wide): card styling identical, Esc now closes the Family B viewer, focus enters the dialog.

**Disposition:** resolved; retires carry-forward **H**.

### Finding 2 — M: file-load now restores scraper data (no more silent drop)

**Status:** resolved ([#157](https://github.com/alkprojects/kospos/pull/157)).

`loadFromFile` restored only the core stores and silently dropped the scraper data the file carried; only the IDB auto-restore path restored it. Routed `loadFromFile` through the same shared `restoreStoresFromPayload` the IDB path uses (removing 5 now-unused per-store selectors), so both paths restore all six stores identically and can't drift. +1 round-trip regression test. A dev-only React hook-order warning appeared mid-edit (HMR hot-swapping the hook's changed selector count); confirmed an artifact — **0** fresh warnings after forced re-renders on a clean mount, and the production build is unaffected.

**Disposition:** resolved; retires carry-forward **M**.

### Finding 3 — R: "Data"/"Load Data" tab collision renamed to one noun everywhere

**Status:** resolved ([#158](https://github.com/alkprojects/kospos/pull/158); proposals B1).

The adjacent tabs "Data" (view) and "Load Data" (acquire) read as synonyms, and the app's copy already called the acquire tab "Load Reports" everywhere while its label said "Load Data". Renamed "Data" → **Source Tables** and "Load Data" → **Load Reports** (aligning the label to the dominant existing copy rather than coining a third synonym), across tab labels + the landing quick-action + the empty-state copy + the module-docstring/test comments that named the old tab (so the rename leaves no stale "Load Data tab" reference). Pure text; tab ids (`'data'`/`'importer'`) + component names unchanged. Verified live.

**Disposition:** resolved.

### Finding 4 — K: clickable detail rows made keyboard-operable

**Status:** resolved ([#159](https://github.com/alkprojects/kospos/pull/159); proposals C2).

Five of six list views had detail-opening `<tr>`s with `onClick` but no `role`/`tabIndex`/key handler — keyboard + SR users could open a detail record only from Eligibility. Lifted the correct pattern into `lib/ui/rowButtonProps` (a plain function, safe in `.map()`) returning `{role:'button', tabIndex:0, onClick, onKeyDown}`, with Enter/Space guarded by `e.target === e.currentTarget` so a nested control's key event doesn't also open the row (cleaner than per-control `stopPropagation`). Applied to Positions/Labor/Separations/Probations/StaffingPlan + retrofitted the Eligibility exemplar to the same helper (one source of truth); Positions + Labor also gained the missing `aria-label`. +5 helper tests. **Composes with H** — a keyboard-opened row now moves focus into the Modal and restores it to the now-focusable row on close. Verified live: tab to a Positions row + Enter opens PositionDetail.

**Disposition:** resolved.

### Finding 5 — Agent-first verification carried every PR; serial-merge kept branches conflict-free

**Status:** stable.

Each UI change was proven in the browser before merge via `preview_eval`/`preview_screenshot` on real restored data, not reasoned-then-hoped. The hook-order false alarm (M) was run to ground with an instrumented `console.error` counter rather than hand-waved. Shipping serially (merge each, re-branch next from updated main) avoided the H/K `LaborView.tsx` overlap becoming a conflict.

**Disposition:** stable.

---

## Part 2 — Status check on carry-forward items

From the [S46 handoff carry-forward audit](phase-2-2-v-close-audit.md) (letters match that table):

| # | Item | Prior status | This session | Disposition |
|---|---|---|---|---|
| B | Trim/summarize SESSION_LOG.md | grows each session | grows with the S47 entry | **deferred-with-reason (P6)** — unchanged |
| C | Memory-citation anti-pattern in `labor-report.md` | 12 instances | unchanged | bundleable with a future labor-report pass |
| D | `labor-report.md` split | 8,518 ln | unchanged | **deferred-with-reason (P6)** — unchanged |
| F | Audit cadence | 22nd trigger (S46) | **23rd event-based trigger this session** | working as designed |
| H | Lift modal overlay-frame → `lib/ui/Modal.tsx` | leading 2.2.w candidate | **shipped ([#156](https://github.com/alkprojects/kospos/pull/156))** | **RESOLVED — retired** |
| I | Cloudflare hardening SEC-2 + SEC-3 | documented S42 | unchanged | tracked for named-workspace v2 |
| L | ADR for the evolved dev-mode/permissions model | optional; review recommends writing it | unchanged (not picked) | optional — Alex's call (proposals B3) |
| M | Session file-load doesn't restore scraper data | exact fix identified | **shipped ([#157](https://github.com/alkprojects/kospos/pull/157))** | **RESOLVED — retired** |
| N | Deep-link Data sub-tabs from the landing dashboard | optional | unchanged | minor UX, optional (proposals A2/A5) |
| O | Post-refresh IDB auto-save main-thread freeze (~5s @ 375 MB) | spawned task | unchanged | **own change (persistence)** — spawned task stands |
| — | Popup suggestion Alex saw last session | inferred = `/fewer-permission-prompts` | Alex: **"it was something else"** → held off | **new carry-forward — awaiting Alex's description** |
| — | A / E / G / J | retired / on-menu | n/a | unchanged |

### Notes
- **H and M retire** this session (both shipped). **R (B1) and K (C2)** also shipped — both were P1 items on the S46 proposals backlog.
- **New follow-up created by H: C1** — now that `Modal` exists, extract the shared `ModalFooter` / `Field` / `inputStyle` / close-button / `OverrideBox` from the detail editors (the proposals doc flagged this as the bulk of the remaining H payoff). Strong 2.2.x candidate; builds directly on H.
- **Popup item:** transcript search is blocked in unsupervised mode, so the popup couldn't be identified from logs; Alex confirmed it was NOT `/fewer-permission-prompts`. Held off on any settings change; awaiting his description. `/fewer-permission-prompts` was therefore NOT run.
- **B / D** remain deferred-with-reason (P6, S42 Opus-4.8 review). Not re-litigated.

---

## Part 3 — New drift scan

### Memory files
- **10 memory files indexed in MEMORY.md** — unchanged; all `[[link]]`s resolve. ✓
- No memory writes needed: the four sub-phases live in code + this audit + the SESSION_LOG. The away-time-autonomy + handoff-paste-inline feedback memories were applied (front-loaded questions; the copyable prompt is rendered in chat) — no new fact to capture.

### Tooling / hooks / settings / deps
- **No new dependencies.** New files: `app/src/lib/ui/Modal.tsx` (+ test), `app/src/lib/ui/rowButtonProps.ts` (+ test). Both land in the existing `lib/ui/` primitives module (alongside `CopyButton`) and are exported from its barrel. No new dirs, no new tools, no settings changes.
- `.claude/settings.local.json` allowlist untouched (the `/fewer-permission-prompts` popup was deferred pending Alex's description).

### Doc-vs-implementation
- R updated the stale "Load Data tab" references in module docstrings + test descriptions, so no comment now names a tab label that no longer exists. Internal "Data tab" references to the id/component (`DataView`, id `'data'`) were intentionally left as the tab's stable identity.
- `scrapers/store.ts` `pdfCache` "in-memory only" stale comment (noted in the 2.2.v audit) — still unaddressed; comment-only, low priority, bundleable with a future scrapers pass.

### Anchor compliance
- No `labor-report.md` heading-level edits. Anchor verifier rerun skipped per precedent.

### Tool/dir sprawl
- 4 feature PRs touched only their intended surfaces (H: 6 dialogs + Modal; M: session hook; R: labels/copy; K: 5 views + helper). Two small, well-placed shared primitives added to `lib/ui/`. Tight and on-theme.

---

## Summary table

| # | Area | Finding | Disposition |
|---|---|---|---|
| 1 | UI / a11y | H — modal overlay-frame → `lib/ui/Modal`; focus-trap/restore + Family-B role/Esc ([#156](https://github.com/alkprojects/kospos/pull/156)) | resolved (retires H) |
| 2 | Session / persistence | M — file-load restores scrapers via shared `restoreStoresFromPayload` ([#157](https://github.com/alkprojects/kospos/pull/157)) | resolved (retires M) |
| 3 | IA / naming | R — "Data"→"Source Tables", "Load Data"→"Load Reports" ([#158](https://github.com/alkprojects/kospos/pull/158)) | resolved (B1) |
| 4 | a11y | K — keyboard-operable rows via `lib/ui/rowButtonProps` ([#159](https://github.com/alkprojects/kospos/pull/159)) | resolved (C2) |
| 5 | Verification | Agent-first live proof per PR; serial-merge kept branches conflict-free | stable |
| 6 | Tests | +7 (H) +1 (M) +5 (K); **861 → 874** | stable |
| 7 | Build | `npm run build` clean on every PR | stable |
| 8 | Carry-forward F | Audit cadence — 23rd event-based trigger | working as designed |
| 9 | Carry-forward L | dev-mode/permissions ADR (proposals B3) — not picked | optional — Alex's call |
| 10 | Carry-forward O | IDB auto-save freeze — spawned task stands | tracking |
| 11 | New follow-up | C1 — extract `ModalFooter`/`Field`/✕ now that `Modal` exists | strong 2.2.x candidate |
| 12 | Popup item | Alex says it was NOT `/fewer-permission-prompts` | awaiting his description |
| 13 | New drift — memory/hooks/deps | None (2 primitives added to `lib/ui/`; 1 known stale comment carried) | stable |

**Totals:** 4 sub-phases shipped (H/M/R/K) as 4 single-purpose PRs · H + M retired · R (B1) + K (C2) shipped · 1 working-as-designed (F) · B/C/D/I/L/N/O unchanged/tracking · 1 new follow-up (C1) · 1 new carry-forward (popup, awaiting Alex) · 1 docs PR (this). Tests **861 → 874**.

---

## Recommendations not actioned

In priority order (the next-phase candidate menu lives in the S48 handoff):

1. **Phase 2.2.x pick** — strong near-term: **C1** (extract `ModalFooter`/`Field`/`inputStyle`/✕/`OverrideBox` now that `Modal` exists — the rest of the H payoff), **B2** (de-risk the dev-mode gear, P1), **B3 / L** (write the dev-mode ADR, docs-only), **A3/A4** (confirm-on-clear + auto-open paste fallback), **N / A2 / A5** (deep-link sub-tabs), **C4/C5** (shared `Button` + color tokens). Plus the standing dependency-graph menu (**O** IDB-freeze, **P** source-tables-under-Data, 2.2.19 temp-limits, 2.2.22 vacancies, Cloudflare cutover).
2. **Resolve the popup item** — Alex to say what last session's popup suggested; then handle it.
3. **Exercise the now-fast scrape + Data/Save-Load + dev toggle on real data** before promoting further view tabs (standing guardrail gate; Separations / Inactive are the first promotion candidates).
4. **SESSION_LOG trim / labor-report split (B, D)** — deferred-with-reason (P6); only if Alex asks.

None block the next session's work.

---

## Cross-references

- Previous close audit: [phase-2-2-v-close-audit.md](phase-2-2-v-close-audit.md) (Session 46).
- Audit cadence rule: [WORKFLOW.md § Audit cadence](../WORKFLOW.md).
- This session's PRs: [#156](https://github.com/alkprojects/kospos/pull/156) · [#157](https://github.com/alkprojects/kospos/pull/157) · [#158](https://github.com/alkprojects/kospos/pull/158) · [#159](https://github.com/alkprojects/kospos/pull/159).
- Source of the picks: [s46-ui-ux-review.md](../proposals/s46-ui-ux-review.md) (H = Area C, M = A1, R = B1, K = C2).
- New shared primitives: `app/src/lib/ui/Modal.tsx`, `app/src/lib/ui/rowButtonProps.ts`.
