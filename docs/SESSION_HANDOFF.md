# Session Handoff

> **Overwritten every session (ADR-008).** Three things only: current status, carry-forwards, the next-session prompt. Per-session history → `docs/SESSION_LOG.md` (Sessions 0–39 in `SESSION_LOG_ARCHIVE.md`).

The next session reads this first.

---

## Current status (end of Session 57 — Issues expand+redesign, gzip 350 MB, Cloudflare publish cutover + DHR worker, 2026-05-30)

S57 took Alex's **five appended asks** (not the A/B/C/D menu). **7 PRs — 6 merged, 1 open for sign-off.**

**Last main commit:** the DHR proxy ([#212](https://github.com/alkprojects/kospos/pull/212)). **Tests:** **1000 / 1000** (981 → 1000). **Build:** clean. **Live site:** Pages deploys green; main worktree synced.

**⚠️ One PR OPEN — needs your sign-off:** [#210](https://github.com/alkprojects/kospos/pull/210) the **Issues / Corrections redesign** (clickable list + side detail panel). Built + browser-verified (desktop side-by-side + mobile stacked, console clean); held only for your aesthetic OK. Review the screenshots in the S57 chat, then `gh pr merge 210 --squash` (or tell me the tweaks).

### What shipped (S57)
| PR | What |
|---|---|
| [#206](https://github.com/alkprojects/kospos/pull/206) | Rule metadata (rationale / fix / citations / sourceTabs) on every rule + completeness test — foundation for the redesign |
| [#207](https://github.com/alkprojects/kospos/pull/207) | **QR-011** position dept ≠ budget dept |
| [#208](https://github.com/alkprojects/kospos/pull/208) | **QR-012** orphan payroll — OBI spend with no BFM budget line or PS HCM position |
| [#209](https://github.com/alkprojects/kospos/pull/209) | **gzip the `imported-rows` IDB record** — ~350 MB → ~25-35 MB on disk + reload-read (Q5) |
| [#211](https://github.com/alkprojects/kospos/pull/211) | **Publish fix** — github.io routes `/api/snapshot` to kospos.pages.dev (Q3) |
| [#212](https://github.com/alkprojects/kospos/pull/212) | **DHR CORS proxy** Pages Function + worker-tried-first (Q4) |
| [#210](https://github.com/alkprojects/kospos/pull/210) | **Issues redesign** — list + detail panel · **OPEN (sign-off)** |

### Your actions (no code — in the app / Cloudflare)
1. **Merge [#210]** once you've eyeballed the redesign.
2. **Publish from github.io:** load works now; publishing needs the **publish secret entered once** in ⚙ Cloudflare settings on the github.io origin (different localStorage than pages.dev).
3. **DHR proxy:** after the Cloudflare Pages project redeploys, set Load Reports → "Cloudflare-Worker URL" to `https://kospos.pages.dev/api/dhr-proxy` — then live refresh uses your proxy first. (`docs/runbooks/cloudflare-pages-setup.md`.)

### Carry-forward
| # | Item | Status |
|---|---|---|
| **SIGN-OFF** | Merge [#210] (Issues redesign) after review | open — needs you |
| **CUTOVER/finish** | Cosmetic "one canonical URL" — redirect github.io → kospos.pages.dev (runbook Step 10). Functional publish/load already works (#211). Its own small PR; needs the mechanism / custom-domain call. | open |
| **PROJ** | **Projection engine** — answer B1–B5 in [`proposals/s55-projection-engine.md`](proposals/s55-projection-engine.md), then build (`lib/projections`; lifts Special Class tabs 16–19, unblocks OPS 26/27). Biggest lever; you wanted to be present. | open — needs you |
| **EE/expired** | QR-010 `additional-pay-expired` — manual end-date store + Position-Detail input + a non-standard rule context. | open |
| **PDF/worker** | Wire the PDF cover-sheet fetch (`pdf-parse.ts`) to `dhrWorkerUrl` too (it still uses only the public proxy chain). Small. | open |
| **SCALE/2** | Scaling Stage 2 (index rows by dept + lazy per-dept load) — its own Phase. | open |
| CH | s48 batches 5/7/8/9 (table primitives / store-history / filters / dead-code) — supervised. | open |

---

## Next session prompt — Session 58

Paste this verbatim to start Session 58.

**Model:** `claude-opus-4-8` (fast mode on)

```
Session 58. S57 shipped 7 PRs for my 5 asks: rule metadata (#206), QR-011 dept-mismatch (#207), QR-012 orphan-payroll (#208), gzip the imported-rows IDB record 350MB→~30MB (#209), publish fix routing github.io→kospos.pages.dev (#211), DHR CORS proxy Pages Function + worker-first (#212). The Issues/Corrections REDESIGN (#210, clickable list + side detail panel) is OPEN awaiting my sign-off. Tests 1000/1000, main clean.

Read first: docs/CLAUDE.md (Windows-worktree gotchas — Bash cwd is the WORKTREE ROOT so npm needs `--prefix app`; absolute paths for Read/Glob/Grep; the harness cancels sibling tool calls in a batch if one errors, so keep calls error-proof; branch each PR from origin/main BEFORE editing), docs/SESSION_HANDOFF.md, docs/SESSION_LOG.md S57 entry.

Confirm state on main BEFORE trusting anything: git log --oneline origin/main -5 (tops at #212 DHR proxy); then npm --prefix app install && npm --prefix app test → 1000/1000 (install FIRST — a fresh worktree has no node_modules). Single error-proof tool calls; absolute paths only.

FIRST: decide on the OPEN Issues-redesign PR #210 — review it (gh pr diff 210, or merge then open the live Issues tab) and either merge (gh pr merge 210 --squash) or tell me the tweaks. S57 verification: desktop side-by-side + mobile stacked, clean console, row-select + source-tab nav all work.

My in-app actions still pending (no code): (a) enter the publish secret once in ⚙ Cloudflare settings on the github.io origin to publish from there; (b) set Load Reports "Cloudflare-Worker URL" to https://kospos.pages.dev/api/dhr-proxy.

Then pick the next lever:
  A. (recommended) THE PROJECTION ENGINE — answer B1–B5 in docs/proposals/s55-projection-engine.md, then build lib/projections (lifts Special Class tabs 16–19 Partial→Shipped, unblocks OPS 26/27). Biggest lever; I wanted to be present.
  B. Finish the cosmetic cutover — one canonical URL (redirect github.io → kospos.pages.dev, runbook Step 10). Small; needs my call on mechanism (kospos.pages.dev vs a custom domain; keep github.io as a mirror?).
  C. QR-010 additional-pay-expired (manual end-date store), OR wire the PDF cover-sheet fetch to the DHR worker.
  D. Scaling Stage 2 (its own Phase), or CH batches 5/7/8/9 (supervised).

Outstanding questions for me to answer (these gate the picks above):
  - #210 Issues redesign — approve as-is, or what tweaks? (sign-off)
  - Projection engine (A) — B1-B5 in docs/proposals/s55-projection-engine.md:
      B1. Does the straight-line pace become COLA-weighted (is "COLA-aware by default" satisfied by the salary path alone, or weight by partial-period)?
      B2. Default projection method per bucket — incl. Premium/PREMM (keep OT's BN8/BN6 gross-up)?
      B3. Attrition (9993) — single hand-keyed rate (v1) or prior-FY-derived; is per-dept-group granularity enough?
      B4. Step savings (STEPM) — model merit-step events, or a uniform rate? Is the trend chart worth it?
      B5. What surfaces first — special-class cards first, OPS pages second? Agreed?
  - Cutover finish (B) — canonical URL: kospos.pages.dev or a custom domain? Keep github.io as a mirror, or redirect it away?
  - QR-010 expired-pay (C) — where should the expired check run, since it needs user-input end-dates the standard runRules(records) pipeline doesn't pass?

If I'm away: #210 sign-off + A's B1-B5 + B's mechanism all need me — don't start those blind. Safe autonomous fills: C (QR-010 or PDF/worker wiring) or a supervised CH batch.

Hard constraints: branch each PR from origin/main BEFORE editing; one logical change per PR; npm test stays green (1000); npm run build before any app PR; merge gh pr merge --squash (skip --delete-branch); fast-forward main + sync the main worktree after each merge. UI changes get browser-verified + my aesthetic sign-off before merge. Per ADR-017: full close audit only for a milestone — SESSION_LOG always gets at least a short entry.

End by updating SESSION_HANDOFF.md (lean) and pasting the S59 prompt verbatim in chat.
```
