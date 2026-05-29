# UI/UX review + proposals — Session 46

**Date:** 2026-05-28 · **Status:** triage backlog (not committed work) · **How produced:** Alex's standing S46 directive ("use my sleep time — spin up agents, review the UI/UX, come up with proposals"). Three read-only review agents swept non-overlapping areas; this doc synthesizes their findings into a single triage list. **Nothing here is implemented** — it's a menu for Alex to pick from (and it feeds the Phase 2.2.w candidate list in the handoff).

Severity key: **P1** = confusing/risky for a non-technical admin, fix soon · **P2** = worth doing · **P3** = nice-to-have / cosmetic. Carry-forward letters (H/L/M/N/O) tie back to the close-audit table.

---

## Area A — Data tab + eligibility / job-postings + live-scrape acquisition

**A1. File-load doesn't restore scraper data — and leaves stale scrapes in place (carry-forward M).** `lib/session/use-session-snapshot.ts:128-159` — **P1.** `buildCurrentSnapshot` serializes all five scraper fields, but `loadFromFile` restores app/staffing/notes/separations/probations and **skips scrapers** (explicit "tracked for follow-up" note at 153-157). So loading a saved file silently drops the eligibility/job-posting/pdfCache data it contains *and* doesn't reset them — the result is file-restored core data mixed with whatever stale scrape was in memory. The IDB auto-restore path does it correctly (`use-auto-persistence.ts:113-119` `restoreStoresFromPayload`). **Fix:** mirror that call in `loadFromFile` (exact block given by the reviewer) — and factor the shared restore into one helper both paths call, so they can't drift again. Small, high-value, exact site known.

**A2. Landing "Open →" lands on the wrong Data sub-tab (carry-forward N).** `lib/views/data/DataView.tsx:37`, `App.tsx:223`, `landing/build.ts:171,181` — **P2.** Both job-postings and eligibility-lists rows carry `tabHint: 'data'`, but navigation is a bare `setTab` with no sub-tab payload, and `DataView`'s sub-tab is private `useState` defaulting to `'eligibility'`. So "Open →" on the Job postings row always shows Eligibility Lists. **Fix:** use the existing `usePositionsScope` precedent — a tiny `useDataSubTab` store carrying the intended sub-tab across the tab switch; tag each landing row with its target sub-tab.

**A3. "Clear scraped data" wipes the expensive PDF cache with no confirm.** `modules/importer/ScrapeSourcesPanel.tsx:379-392` → `store.ts:222-228` — **P2.** One misclick clears postings + lists + the 100+ PDF-extract cache (slow to rebuild through the proxy chain). **Fix:** two-click confirm ("Clear scraped data" → "Click again to confirm") or a small inline confirm.

**A4. All-proxies-failed message points "below" to a collapsed, possibly-off-screen fallback.** `ScrapeSourcesPanel.tsx:130, 252-256` — **P2.** The error says "use the manual-paste fallback below," but `PasteDhrPanel` is a `<details>` collapsed by default and rendered after the worker-URL panel. **Fix:** auto-`open` the manual-paste `<details>` (and scroll it into view) when the eligibility fetch hard-fails.

**A5. "Load Data" (acquire) vs "Data" (view) round-trip has no shortcut; empty states say "refresh from Load Data" but nothing's clickable.** `EligibilityView.tsx:554-584`, `JobPostingsView.tsx:139-190` — **P2.** (Overlaps B1 — the label collision is the root cause.) **Fix:** pass an `onLoadData={() => setTab('importer')}` down to the Data sub-views so empty states + the "never refreshed" header offer a one-click jump.

**A6. Progress ticker text was written for the old sequential loop.** `ScrapeSourcesPanel.tsx:119-121` — **P3 (cosmetic side-effect of #154).** "Fetched N rows from M pages (via PROXY)" — counts stay monotonic under the new waves (we increment in page order), but `proxyUsed` can vary per page so the "via …" label may flicker. **Fix:** simplify to a wave-oriented message ("Fetching DHR lists… M of ~66 pages") and keep per-proxy detail to the error path.

**A7. Stale `pdfCache` "in-memory only" comment.** `lib/scrapers/store.ts:67-72` — **P3.** Says pdfCache is "in-memory only (lost on reload); a follow-up may wire this into the snapshot" — but that follow-up shipped (#125): pdfCache is captured, IDB-saved, and published (the store header right above even says so). Same stale-comment class that #152 fixed elsewhere; this instance was missed. Comment-only.

---

## Area B — Information architecture, navigation, dev-mode / permissions

**B1. "Data" vs "Load Data" label collision is the headline IA problem.** `App.tsx:43-44` — **P1.** The two tabs sit adjacent and read as synonyms; the only signal that one views and one acquires is in code comments, not labels. A non-technical admin can't predict which holds the eligibility tables vs the file uploads. **Fix (pure rename, zero logic):** e.g. "Load Data" → **"Import / Refresh"** (or "Sources") and "Data" → **"Source Tables"** (or "Browse Data"). Also reconcile the landing Quick action "Load Reports" vs the tab "Load Data" — pick one noun everywhere.

**B2. Dev-mode gear is a one-click, no-confirm, accidental-toggle risk right next to Save/Load.** `App.tsx:190-216` — **P1.** A bare ⚙ immediately right of the always-used Save/Load buttons; one mis-click reshuffles the whole tab strip (5 tabs appear) with no explanation. The "on" state is well-signaled (accent fill + banner); the risk is the accidental flip. **Fix (low-cost, pre-Phase-8):** (a) visually separate the gear from Save/Load; (b) confirm on *enable* only ("Turn on dev mode? Shows advanced data-management tabs."); or (c) hide the gear behind the existing `?dev=1` URL hatch until tiers land (cleanest if no discoverable toggle is wanted for regular users yet).

**B3. Write the dev-mode / permissions ADR now (carry-forward L).** `dev-mode.ts:1-12`, `ROADMAP.md:165-177` — **P2.** The model has changed shape three times (tab-hiding → in-tab gating → in-app localStorage toggle) and Phase 8+ will replace it wholesale with SSO tiers; the rationale is scattered across four file headers + a roadmap bullet. That's exactly the "future sessions won't understand why" case ADRs exist for (working agreement #7), and it's cheap because the prose already exists. **Contents:** decision (dev mode is an intentionally auth-free client-side toggle, *not* a security boundary); the three-step history + why; the current gated/promoted split + its principle; explicit non-goal (no real access control until Phase 8+ SSO); forward pointer to the regular/dev/super-dev tiers.

**B4. Tab order interleaves gated + ungated, so enabling dev mode reshuffles mid-row.** `App.tsx:34-46` — **P2.** Probation (visible) sits between Separations and Inactive (both dev-only), so toggling dev mode pops tabs in mid-strip rather than appending. **Fix:** order so always-visible tabs lead and dev-only tabs cluster at the end, so dev mode visibly *extends* the strip. Suggested grouping: Overview → Tools → Workforce (+dev siblings) → Data → dev: Special Class.

**B5. Save/Load (header) vs Publish (Load Data tab) never cross-reference; 3 persistence surfaces with no unifying explanation.** `SessionSaveLoad.tsx`, `SessionExportImport.tsx`, landing — **P2.** Header Save/Load (file), silent IDB auto-save, and Cloudflare Publish coexist with no in-UI explanation of how they relate. **Fix:** a one-line cross-reference near Save ("To share across devices, use Publish on the Import tab") + a short "How your data is saved" note on Welcome.

**B6. Flat tab strip already overflow-scrolls (11 tabs) and won't scale.** `App.tsx:146` — **P2 (defer).** Data already solved its own crowding with a sub-tab strip; the top level needs the same eventually (grouping or a "More" overflow) — the right home for the future reporting-tree / org-chart tabs. Not urgent.

**B7. Promotion candidates to note (respecting the "don't promote yet" hold).** `App.tsx:38-45` — **P3 (record only).** Separations is split from its sibling Probation (Probation visible, Separations dev-only) — the strongest first promotion candidate for parity once Data + Save/Load + dev toggle are exercised on real data; Inactive (read-only roster) likely next. Payroll/Hiring Plan/Special Class stay gated until their math is user-validated.

---

## Area C — Cross-view consistency, the modal-frame lift (H), accessibility, responsive

### Modal inventory (carry-forward H) — 6 dialogs subsumable by `lib/ui/Modal.tsx`, in 2 families

**Family A — detail editors (4, near-identical shell: `fixed inset:0`, `rgba(0,0,0,0.4)`, `zIndex:1000`, top-aligned + backdrop-scroll, role=dialog + aria-modal, Esc + backdrop + ✕):**
`SeparationDetail.tsx:171` · `ProbationDetail.tsx:259` · `PlannedActionDetail.tsx:277` · `EligibilityDetail.tsx:667` (maxWidth 1040; others 720).

**Family B — read-only viewers (2, different shell: `rgba(0,0,0,0.45)`, `zIndex:100`, centered + card-scroll `maxHeight:90vh`, ✕ + backdrop — but NO `role="dialog"`, NO `aria-modal`, NO Esc):**
`PositionDetail.tsx:500` · `LaborView.tsx:275`.

**Family C — intentional non-dialog (leave as-is):** `LoadingOverlay.tsx:60` (`role="status"`, deliberately non-dismissable during synchronous parse).

Inconsistencies a shared `Modal` must reconcile (without behavior change): Esc (A yes / B no), `role`+`aria-modal` (A yes / B no), z-index scale (1000 / 100 / 2000), alignment (top-scroll vs center-scroll → `align` prop), and **none of the 6 trap or restore focus**. Proposed API: `<Modal onClose ariaLabel maxWidth align='top'|'center' closeOnEsc=true closeOnBackdrop=true zIndex>` owning backdrop + card + ✕ + `role="dialog"` + focus-trap/restore. Migrate Family A first (already a11y-attributed, nearly identical), then Family B (which *gains* Esc + dialog role as a net a11y win).

### Findings

**C1. `SeparationDetail` and `ProbationDetail` are near-verbatim twins.** `SeparationDetail.tsx` / `ProbationDetail.tsx` — **P1.** Beyond the modal shell they duplicate the `inputStyle()` helper, the `Field` component, the Delete/Cancel/Save footer (a third copy in `PlannedActionDetail.tsx:558`), and the amber status-override box. **Fix:** once `Modal` lands, extract `Field`, `<TextInput>`, `<ModalFooter onDelete onCancel onSave>`, `<OverrideBox>` into `lib/ui/` — the bulk of the H payoff; the three editors collapse to their field schemas.

**C2. Clickable table rows are not keyboard-operable.** `PositionsView.tsx:386`, `LaborView.tsx:617`, `SeparationsView.tsx:479`, `ProbationsView.tsx:1162`, `StaffingPlanView.tsx:141` — **P1 (a11y).** Each detail-opening `<tr>` has `onClick` + `aria-label` + `cursor:pointer` but no `role="button"`, `tabIndex`, or Enter/Space handler — keyboard + screen-reader users can't open detail records anywhere except Eligibility. **Fix:** replicate the correct exemplar `EligibilityView.tsx:342-352` (extract `<ClickableRow>` / `useRowButton`) across the five tables.

**C3. No modal focus-trap or focus-restore anywhere.** All of Family A + B — **P1 (a11y).** No dialog moves focus in on open, traps Tab, or restores focus to the trigger on close. **Fix:** implement once inside the shared `Modal` — fixes all six at a stroke.

**C4. No shared Button primitive; ~84 ad-hoc button styles across 14 files.** — **P2.** Radii inconsistent with no rationale (pills 8-10, secondary 12, modal-footer 14, inputs 3-4). **Fix:** `lib/ui/Button.tsx` (`variant: primary|secondary|danger`, `size`) + `--radius-*` tokens. `CopyButton.tsx` already proves the shared-primitive convention.

**C5. Status/confidence palette duplicated across 5 sites; ~109 hardcoded hex literals across 15 view files.** `SeparationsView.tsx:50`, `ProbationsView.tsx:90`, `EligibilityDetail.tsx:163` — **P2.** Same semantic colors recur as literals (incl. `--accent`/`--accent-soft` re-hardcoded). **Fix:** semantic tokens (`--success(-soft)`, `--warn(-soft)`, `--danger(-soft)`, `--neutral(-soft)`) in `App.css` + one `lib/ui/Badge.tsx` (`tone`) replacing the 4 chip/pill components.

**C6. Family B lacks `role="dialog"`/`aria-modal` (C2/C7 of agent) + doesn't close on Esc.** `PositionDetail.tsx:500`, `LaborView.tsx:275` — **P2 (a11y/consistency).** Both auto-fixed by adopting the shared `Modal` (`closeOnEsc` default true — recommend treating Esc parity as a fix, not a regression).

**C7. `--muted` text at 10-11px on soft backgrounds dips below AA contrast.** e.g. `SeparationDetail.tsx:548`, pill text at 10px — **P3 (a11y).** `--muted` on `--surface` ≈4.7:1 (passes), but on `--accent-soft` / soft pill bgs it drops below 4.5:1. **Fix:** darken `--muted` slightly or bump the smallest labels to ≥11px / 500-weight (pairs with C5).

**C8. Detail modals scroll the backdrop, not the body — long records push Save/Cancel below the fold.** Family A (no `maxHeight`) — **P3 (responsive).** Family B correctly caps at `maxHeight:90vh`. **Fix:** give Family A an optional `maxHeight:90vh` + scroll-the-body + sticky footer when building `Modal`.

**Responsive (not a defect):** wide tables are consistently wrapped in `overflowX:auto` and the shell caps at `max-width:880px`; the only fixed-pixel widths are intentional column/input sizes inside scrollable containers. No real overflow breakage.

---

## Consolidated recommendation

By value-to-effort across all three areas. The standout is that **H (the modal lift) now also closes three P1/P2 a11y gaps** — it's no longer just a cleanliness refactor, which strengthens it as the Phase 2.2.w pick.

1. **H — `lib/ui/Modal.tsx` + migrate the 6 dialogs (Area C inventory + C1/C3/C6).** Highest leverage: removes the largest duplicated-code block (Family A shells + footers + `Field`/`inputStyle` twins) *and* fixes focus-trap/restore (C3, P1), Family-B dialog role (C6), and Esc parity in one place. Fully inventoried above — ready to scope as a PR. **Leading 2.2.w candidate.**
2. **A1 — file-load scraper parity (M, P1).** Exact one-block fix at a known site; current behavior silently corrupts a loaded session. Smallest high-value win.
3. **C2 — keyboard-operable rows (P1 a11y).** Five of six list views can't open a detail record without a mouse; mechanical fix replicating the Eligibility exemplar.
4. **B1 — disambiguate "Data" vs "Load Data" labels (P1).** Pure rename; removes the worst IA collision.
5. **B2 — de-risk the dev-mode gear (P1).** Separate from Save/Load + enable-only confirm (or hide behind the URL hatch).
6. **B3 — write the dev-mode/permissions ADR (L, P2).** Docs-only; consolidate before a 4th drift.
7. **A3 + A4 — confirm on "Clear scraped data" + auto-open paste-on-failure (P2).**
8. **C4 + C5 — shared `Button` + semantic color tokens + `Badge` (P2).** Pairs with H (the extracted `ModalFooter` consumes `Button`).
9. **A2 / A5 — deep-link the right Data sub-tab (N) + clickable "go to Load Data" affordances (P2).**
10. **O — the IDB auto-save freeze.** Already a spawned task (per-slice IDB writes or a worker).

(The standing dependency-graph menu also remains: **P** source-tables-under-Data, 2.2.19 temp-limits, 2.2.22 vacancies, the Cloudflare cutover.)

---

## Consolidated recommendation (to be finalized with Area C)

The cleanest near-term picks emerging from Areas A + B, by value-to-effort:

1. **A1 — file-load scraper parity (M, P1).** Exact one-block fix at a known site; current behavior silently corrupts a loaded session. Highest value-to-effort.
2. **B1 — disambiguate "Data" vs "Load Data" labels (P1).** Pure rename, no logic, removes the single most confusing IA collision.
3. **B2 — de-risk the dev-mode gear (P1).** Separate from Save/Load + enable-only confirm (or hide behind the URL hatch). Small `App.tsx` change.
4. **B3 — write the dev-mode/permissions ADR (L, P2).** Docs-only; consolidate before a 4th drift.
5. **A3 + A4 — confirm on "Clear scraped data" + auto-open paste-on-failure (P2).** Hardens the two moments a user is most stuck or most likely to lose expensive state.
6. **A2 / A5 — deep-link the right Data sub-tab (N) + clickable "go to Load Data" affordances (P2).**

(The Phase 2.2.w handoff menu also still carries the standing dependency-graph items: **H** modal-lift — see Area C for the full instance inventory — plus **O** the IDB-freeze (already a spawned task), **P** source-tables-under-Data, 2.2.19 temp-limits, 2.2.22 vacancies, and the Cloudflare cutover.)
