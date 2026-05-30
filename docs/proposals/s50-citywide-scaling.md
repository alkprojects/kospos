# Citywide scaling — can KosPos hold all ~45,000 SF employees?

**Date:** 2026-05-29 (Session 50) · **Status:** proposal / analysis — *not implemented* · **Author:** S50 run, at Alex's request

> **Bottom line.** The current architecture holds **all data in one in-memory array** and **re-saves the entire dataset on every change**. Both are `O(total data)`, so the realistic ceiling is **a few thousand people / a handful of departments** — roughly 2–4× today's DBI+CPC load. **It will not reach citywide (~45,000) without a different data layer.** That's a dedicated Phase, not a sub-phase — and Alex pre-authorized deferring it ("if that's too big for now it can be left for later; testing with DBI/CPC is fine near-term"). This doc says *where* the walls are, *what* citywide actually needs, and a **staged roadmap** whose **Stage 0 is the carry-forward O freeze fix done the scaling-aligned way** — so the immediate win and the long-term direction are the same work.

---

## The question (Alex, Session 50)

> "The current sample data is for two departments, DBI and CPC — ~500 people each. The entire city is ~45,000 people. It would probably be best to architect for that. If that's too big a change for now it can be left for later; testing functionality with just DBI/CPC is fine for the near future."

So: **architect for 45,000 if feasible, defer if too big, near-term DBI/CPC is fine.** This is the grounded answer.

## Where the data volume actually comes from

The ~375 MB snapshot Alex sees today (DBI+CPC ≈ ~1,000 people) is **almost entirely `loadedRows`** — the raw imported rows held in one zustand array ([`store.ts:12`](../../app/src/lib/store.ts)). The other persisted state is small by comparison:

- **`pdfCache`** stores only extracted cover-sheet *text* (`certRule`, `listDepartment`, … — see [`scrapers/types.ts § PdfExtract`](../../app/src/lib/scrapers/types.ts)), **no PDF binaries**. Bounded by exam *classes*, not headcount → negligible at any scale.
- Staffing-plan / separations / probations / notes are per-event maps — kilobytes.

The driver is **OBI payroll**, whose importer header states it plainly: *"each row = one position × one earning code × one pay period"* ([`obi-payroll.ts:4`](../../app/src/lib/importers/obi-payroll.ts)). One employee is **not** one row — they're ~100–500 rows (earning codes × 26 pay periods/yr × however many years/FYs are loaded). So `loadedRows` scales **~linearly with headcount × pay-periods × report-coverage**.

**45× the headcount → ~45× the rows → order of 10–20 GB of raw rows** for the whole city (dominated by how many years of OBI are loaded — the single biggest lever; see Stage 2).

## Three walls the current architecture hits

| # | Wall | Where | Hard limit |
|---|---|---|---|
| 1 | **Everything resident in memory** — `loadedRows: ImportedRow[]`, and `addRows` does `[...loadedRows, ...newRows]` (a full copy) + `runRules(loadedRows)` over *all* rows on every change | [`store.ts:41-59`](../../app/src/lib/store.ts) | A browser tab's renderer is OOM-killed around **2–4 GB**. ~16 GB of rows can't be held at all. **This is the hardest wall** — it's not about persistence, it's about holding the data. |
| 2 | **Monolithic re-serialization on every change** — `captureCurrentSnapshot()` reads all six stores; `saveSnapshotToIdb()` does `db.put(file, 'current')`, structured-cloning the *entire* dataset (incl. all of `loadedRows`) on a 500 ms debounce after **any** edit | [`use-auto-persistence.ts:127-148, 340-363`](../../app/src/lib/session/use-auto-persistence.ts) · [`idb-persistence.ts:95-98`](../../app/src/lib/session/idb-persistence.ts) | `O(total)` per save. **This is carry-forward O** — the ~5 s freeze today; **minutes** at 5×, and structured-clone of a multi-GB graph becomes unreliable. Editing one note re-clones all 375 MB. |
| 3 | **JSON-string paths** — the Cloudflare publish + file export + the legacy load path `JSON.stringify`/`parse` the whole envelope | [`snapshot.ts`](../../app/src/lib/session/snapshot.ts), [`use-auto-persistence.ts:165-172`](../../app/src/lib/session/use-auto-persistence.ts) (note the S41 comment: a 375 MB envelope already trips Chrome's "page unresponsive") | V8 caps a single string at **~512 MB** → `Invalid string length` thrown well before citywide. Already near the edge today. |

**Practical ceiling of the current design: ~2,000–4,000 people** (a few departments) before wall 1 or 2 bites. Band-aids (a Web Worker for the save, "only serialize on explicit save") push wall 2 out ~2× but do nothing for wall 1. **None of them reach 45,000.**

## What citywide actually requires (the target shape)

This is a different class of app, not a tweak:

1. **Raw rows live in IndexedDB, indexed** (by department / emplId / report type), **queried on demand** — not all-resident in a JS array. IDB is built for this (GBs, indexed, incremental).
2. **Incremental persistence** — write only the records that changed, never the whole snapshot.
3. **Lazy, per-department loading** — the UI materializes the department(s) in view; a citywide rollup is a **derived aggregate**, computed incrementally, not "hold every row."
4. **Aggregate-on-import (the biggest lever)** — open question: does KosPos need raw payroll *rows* resident, or only **per-position / per-employee aggregates**? The Labor view already builds payroll *snapshots* from rows ([`payroll`](../../app/src/lib/payroll)); if the raw rows can be reduced to aggregates at import and the few row-level views (the Labor trace modal) page from IDB on demand, the resident set shrinks by orders of magnitude.
5. **Revisit the no-backend decision (ADR-001)** — shipping 10+ GB to every browser is untenable; citywide multi-department likely needs shared/server storage. This is exactly where **carry-forward I (named workspaces / R2 migration)** stops being optional. *Data sensitivity is not a blocker here — the data is SF public records (see [CLAUDE.md](../CLAUDE.md) § non-negotiables #5), so the choice is engineering + cost, not confidentiality.*

## Staged roadmap (recommended)

Each stage delivers value on its own and de-risks the next. **Stages 0–1 keep KosPos browser-local;** Stage 3 is the big fork.

- **Stage 0 — split the IDB snapshot into per-store records** *(this is carry-forward O, done scaling-aligned).* Today a note edit re-serializes all of `loadedRows`. Split the single `'current'` record into per-store records (heavy `loadedRows`/scraper data vs. light planning data) so a planning edit only rewrites its small record. **Kills the freeze at current scale AND is the first concrete step toward incremental persistence.** Needs a one-time migration (read the old single record, split it) + careful load/merge + the existing auto-persistence tests. *Recommended as the next sub-phase (2.2.aa).*
- **Stage 1 — move `loadedRows` out of the monolithic snapshot** into its own IDB object store, written only on import (rows don't change between imports). Removes wall 2 for the biggest term and shrinks the publish/export envelope (wall 3).
- **Stage 2 — index rows by department + lazy-load per department; aggregate-on-import.** Resolve the "raw rows vs. aggregates resident" question (item 4). This is what actually beats wall 1. Largest design effort; its own Phase.
- **Stage 3 — shared/server storage** (revisit ADR-001): named workspaces + R2/Workers KV for citywide multi-user. The architectural fork; gated on Stages 0–2 proving the incremental browser-local model first.

## Recommendation

1. **Defer the full re-architecture (Stages 2–3).** It's a dedicated Phase; DBI/CPC testing is fine near-term — agreeing with Alex's read.
2. **Do Stage 0 next** (the O freeze fix, done as the per-store split) — immediate felt win *and* the first scaling step, same work.
3. **Record the chosen direction as an ADR** in `DECISIONS.md` once Alex picks (this doc is the menu; the decision becomes the ADR).
4. **Cheap thing that helps regardless of any of the above:** the payroll multiplier is the driver, so **don't load more years/FYs of OBI than a task needs** — loading 3 FYs is 3× the rows of 1. Worth a UI note when import-by-FY lands.

## What I am explicitly NOT recommending

- **Holding 45k in memory and "optimizing" the array** — the renderer OOM wall (#1) is hard; that's a dead end.
- **Jumping to a backend / R2 before Stages 0–1** — prove the incremental browser-local model first; a premature server migration carries the most risk (auth, sync, cost) for the least certainty.
- **Band-aiding O with a Web Worker alone** — it relieves the freeze but throws away work and still dies at citywide; the per-store split (Stage 0) relieves the freeze *and* moves toward the target.

---

## Cross-references

- Carry-forward **O** (post-refresh IDB freeze) and **I** (named workspaces / R2) — [SESSION_HANDOFF.md](../SESSION_HANDOFF.md).
- The persistence path traced here: [`use-auto-persistence.ts`](../../app/src/lib/session/use-auto-persistence.ts), [`idb-persistence.ts`](../../app/src/lib/session/idb-persistence.ts), [`snapshot.ts`](../../app/src/lib/session/snapshot.ts).
- The volume driver: [`obi-payroll.ts`](../../app/src/lib/importers/obi-payroll.ts), [`store.ts`](../../app/src/lib/store.ts).
- ADR-001 (no backend in v1) — [DECISIONS.md](../DECISIONS.md); citywide is the trigger to revisit it.
