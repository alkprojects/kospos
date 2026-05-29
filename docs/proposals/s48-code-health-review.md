# Code-health / safe-dedup review — Session 48

**Date:** 2026-05-29 · **Status:** triage backlog — *not implemented* · **How produced:** two read-only review agents (one UI-layer, one lib-layer) swept non-overlapping areas during S48 away-time; this doc synthesizes their findings. **Nothing here is implemented** — it's a menu of **safe, behavior-neutral, no-sign-off-needed** dedup/cleanup PRs, in the same spirit as the just-shipped C-series (C1 modal primitives, C5 color tokens + Badge). Complements [s46-ui-ux-review.md](s46-ui-ux-review.md) (UX/behavior) and [s48-ui-primitives-followups.md](s48-ui-primitives-followups.md) (the aesthetic C-series tail D1/D2/D3).

Unlike D1/D2 (which move pixels and need a sign-off), **everything here is a behavior-neutral refactor** — verify with computed-style assertions + green tests, no aesthetic judgment. Ideal away-session fodder. All findings carry confirmed `file:line` + copy counts.

Severity is value-to-effort: **T1** = cheapest/safest/highest-leverage, **T2** = strong, **T3** = needs a tiny design call (still safe).

---

## Part 1 — UI layer (views / modules)

### T1 — pure functions + the `Stat` card (zero JSX risk, do first)

**U1. `Stat` summary-card — 7–8 byte-identical copies. [P1 dedup]**
`function Stat({label, value, hint?})` → column with uppercase-muted label + 20px/700 value. Copies: `PositionsView.tsx:29` (hint-less subset), `SeparationsView.tsx:87`, `ProbationsView.tsx:123`, `LaborView.tsx:214`, `JobPostingsView.tsx:27`, `EligibilityView.tsx:60`, `InactiveView.tsx:61` (+ `StaffingPlanView.tsx:81`). **Extract:** `lib/ui/Stat.tsx` (`{label, value, hint?}`). No-visual-change; low risk. (`PlannedActionDetail.tsx:513 DeltaStat` could later build on it — leave for now.)

**U2. `fmtMoney` (USD whole-dollar) — 5 byte-identical copies. [P1 dedup]**
`toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})`. Copies: `PositionDetail.tsx:22`, `StaffingPlanView.tsx:51`, `PlannedActionDetail.tsx:80`, `LaborView.tsx:184`, `InactiveView.tsx:31`. **Extract:** new `lib/format.ts → fmtMoney(n)`. Exclude `CalculatorView.tsx:24 fmt` (2-decimal, intentional) unless a `fractionDigits` arg is added.

**U3. `fmtSignedMoney` — 3 byte-identical copies. [P1 dedup]**
`sign(+/−/'') + fmtMoney(abs)` — note the real-minus `−` (U+2212) is load-bearing, don't normalize to ASCII. Copies: `PositionDetail.tsx:28`, `StaffingPlanView.tsx:57`, `PlannedActionDetail.tsx:85`. **Extract:** `lib/format.ts` alongside U2. (`SpecialClassView.tsx:184 fmtSigned` is ASCII-only + `+`-only → different output, exclude.)

**U4. Empty-state table cell — 7 byte-identical copies. [P2 dedup]**
`<td colSpan={N} style={{padding:24,textAlign:'center',color:'var(--muted)'}}>` "No X match…". Copies: SeparationsView:469, ProbationsView:1154, PositionsView:423, LaborView:632, JobPostingsView:139, InactiveView:326, EligibilityView:553. **Extract:** `lib/ui/TableEmptyRow.tsx` (`{colSpan, children}`).

### T2 — table primitives (one PR; they co-occur in the same 7–9 views)

**U5. Standard data-table header — 9 header rows, 7 byte-identical `<th>` styles. [P2 dedup]**
header `<tr background:var(--accent-soft)>` + mapped `<th>` (`padding:'7px 10px'`, 600/11px uppercase, `var(--accent)`). 7 identical (Separations:456, Inactive:265, Probations:1141, Labor:581, JobPostings:128, Eligibility:540, EligibilityDetail); `PositionsView:353` is the outlier (`8px 12px`). **Extract:** `lib/ui/TableHead.tsx` (`columns:[{label,align?}]`); Positions opts out or gets a `padding` prop.

**U6. Table-wrapper card — 9 byte-identical copies. [P3 dedup]**
`<div className="card" style={{padding:0,overflowX:'auto'}}>` wrapping each `<table>`. **Extract:** fold into the U5 PR (`lib/ui/table.tsx` with TableCard/TableHead/TableEmptyRow) — low value standalone, good bundled.

### T3 — needs a tiny design call (still safe, verify pixels)

**U7. Dense status/confidence/alert chip pills → `Badge` `size` variant. [= D3 in the followups doc]**
6 pill components (`SeparationsView:64/75`, `ProbationsView:99/110`, `InactiveView:50`, `LaborView:196`) are the **dense sibling of the shipped `Badge`** (10px/700/radius-8 vs Badge's 11px/600/radius-10), each reading its own per-enum `[color,bg]` table (those tables stay — domain data). **Mechanism:** add `size?:'sm'` to `lib/ui/Badge.tsx`; chips become `<Badge size="sm" color={c} bg={bg}>`. **Caveat:** it's *two* dense variants (radius 8 vs 10, padding `1px 6px` vs `1px 7px`) — pixel-check before committing. This is the same item as **D3** in [s48-ui-primitives-followups.md](s48-ui-primitives-followups.md); the detail here is the implementation mechanism.

**U8. Filter chip-group + Reset (3×), search input (4 identical + 5 near), filter-bar/stat-row wrappers. [P2/P3 dedup]**
`role="radiogroup"` filter chips (SeparationsView:405, ProbationsView:1057, InactiveView:215) + a byte-identical Reset button; `<input type="search">` with an identical style tail (Cluster A: Separations:391, Inactive:201, Probations:1043, Labor:490). **Extract:** `lib/ui/FilterChipGroup.tsx` + `lib/ui/SearchInput.tsx` (the latter can compose `Field.tsx`'s `inputStyle()` so input chrome has one source of truth). **Risk:** med — interactive, with `aria-label`/`role` contracts some tests assert (e.g. `eligibility-view.test.tsx` queries "Reset filters" by role); keep labels prop-driven + re-run the 3 views' tests.

**U9. Standalone uppercase-muted micro-label (~11 copies) + truncation footer (2 copies). [P3 dedup]**
The `fontSize:11,color:var(--muted),textTransform:uppercase,letterSpacing:0.5` label span recurs standalone (8× in `PlannedActionDetail.tsx` — those are really un-wrapped `<Field>` labels). **Extract:** export `labelStyle` from `Field.tsx`, or migrate PlannedActionDetail's labels into `<Field>`. The "Showing first 500 of N" footer (LaborView:651, InactiveView:337) → `lib/ui/TruncationNotice.tsx` + a shared `ROW_CAP`. Opportunistic / low leverage.

---

## Part 2 — lib layer (stores / importers / session / scrapers)

### T1 — comments + dead code + pure-helper lifts

**L1. Stale "lost on reload / not yet persisted" comments — 5 modules. [P1 doc-bug]**
IndexedDB auto-persistence shipped (Phase 2.2.q: `session/idb-persistence.ts` + `use-auto-persistence.ts` save/restore all six stores), but headers still say state is lost on reload "until Phase 2.2.33." The **known** `scrapers/store.ts:67-72 pdfCache` one (flagged in the 2.2.v/w/x audits) + 4 more: `separations/store.ts:6-8`, `probation/store.ts:6-8`, `staffing-plan/store.ts:5-6`, `positions/notes.ts:9-13` (+ delete its phantom "banner reminding the user notes aren't persisted" sentence — there is no such banner) + `session/snapshot.ts:5-7`. Comment-only, behavior-neutral. **Clears a 3-audit-old carry-forward.**

**L2. `num()` / `str()` cell-coercion + `col()` header-lookup — duplicated across all 4 importers. [P1 dedup]**
Byte-identical `num`/`str` in `bfm-position.ts:30,35`, `bfm-non-position.ts:13,18`, `obi-payroll.ts:19,24`, `ps-hcm-pp.ts:24,29`; the `headers.indexOf(name.toLowerCase())` lookup recurs at `bfm-position.ts:152`, `bfm-non-position.ts:63`, `obi-payroll.ts:97`, `ps-hcm-pp.ts:43`. **Extract:** `importers/cells.ts` (`num`, `str`, `makeColLookup(headers)`).

**L3. `newXxxId()` UUID-or-fallback generator — 3 copies. [P1 dedup]**
Identical but for the prefix: `separations/build.ts:23` (`sep-`), `probation/build.ts:27` (`prob-`), `staffing-plan/build.ts:40` (`pa-`). **Extract:** `lib/id.ts → makeId(prefix)`; keep named wrappers if barrels re-export.

**L4. `changes/` module is entirely dead. [P2 cleanup]**
`useChangesStore`/`ProposedChange`/… have zero consumers outside `changes/` (header: "No UI yet… Phase 8+"). **Options:** delete the dir, or leave if Phase 8 is imminent — but it's currently dead weight. Confirm no barrel re-export first. (Lower urgency than the dedup items — it's not hurting anything, just unused.)

**L5. Dead/test-only exports. [P2 cleanup]**
`separationsForPosition`/`separationsForAction` (`separations/build.ts:82,98`), `probationsForPosition` (`probation/build.ts:98`) — referenced only by their own tests; `ALL_CODE_STRINGS` (`calc-opts.ts:121`) — 0 consumers. **Fix:** wire into the Position-detail cross-link they were written for, or remove export + test. (Re-confirm no out-of-`app/src` consumer before deleting.)

### T2 — small logic consolidations

**L6. `diffField` + `updateXxx` history-audit loop — 3 stores (highest LOC leverage). [P2 dedup]**
`separations/store.ts:85-96,138-176` ≈ `probation/store.ts:102-113,158-196` (near byte-identical: same positionId-normalize + override-on-status-only rule); `staffing-plan/store.ts:95-98,131-161` is the same shape minus override/positionId-normalize. The `addXxx` positionId-normalize block is also copy-pasted (`separations:108-112` ≡ `probation:125-129`). **Extract:** generic `lib/store-history.ts → diffField` + `applyPatchWithHistory<T>(…, {overrideField?, normalizePositionId?})`. **Risk:** med — touches the audit-log write path on 3 stores; lean on the existing store tests.

**L7. `rollupByStatus` (2 copies) + `Date→"YYYY-MM-DD"(UTC)` tail (2 copies). [P3 dedup]**
`rollupByStatus`: `separations/build.ts:62` ≈ `probation/build.ts:78` → generic `rollupByStatus<S>(items, order, getStatus)` + thin wrappers. UTC ISO-date tail: `scrapers/build.ts:383` ≡ `sf-dhr-exam/parse.ts:120` → `toIsoDateUtc(d)` (could also absorb the `padStart` copies in `session/snapshot.ts:324`, `landing/build.ts:257`).

### Defer
- **`isAllowed*StatusTransition` guards** (separations/probation/staffing-plan) share a forward-only core but branch per-entity (probation uses an adjacency Set). Only `isForwardByOrder(order,from,to)` is safely extractable; **don't** force one unified guard (semantics differ → easy subtle bug). Touch only if L6 already opens these files.

---

## Recommended batches (each = one PR, behavior-neutral)

1. **`lib/format.ts`** — U2 + U3 (pure money formatters). Tiny, zero-risk.
2. **`lib/ui/Stat.tsx`** — U1 (7–8 copies). Tiny, zero-risk.
3. **`importers/cells.ts`** — L2 (`num`/`str`/`col`). Pure helpers.
4. **Stale-comment sweep** — L1 (clears the 3-audit pdfCache carry-forward + 4 siblings). Comments only.
5. **`lib/ui/table.tsx`** — U4 + U5 + U6 (table primitives; migrate the 7–9 table views once).
6. **`lib/id.ts` + `rollupByStatus`** — L3 + L7. Small builder lifts.
7. **`lib/store-history.ts`** — L6 (biggest LOC win; med risk — store tests gate it).
8. **Filters** — U8 (SearchInput + FilterChipGroup; verify the 3 views' aria/role tests).
9. **Dead-code** — L4 + L5 (after confirming no consumers).

**Best first away-session PRs:** batches 1–4 (each tiny, zero-risk, computed-style/test verifiable). The chip `Badge size` variant (U7) is the same as **D3** in the followups doc — do it when D1's Button work is already in `lib/ui`.
