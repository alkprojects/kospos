# Cross-device persistence architecture — option comparison

**Status:** research / planning only — no implementation in this PR.
**Date:** 2026-05-28 (Session 39)
**Driver:** Alex's S38 + S39 directive:

> "I am not talking about one session in one browser, I am talking
> about different sessions across devices. I want to share the website
> with others and have them see the same data that was loaded in load
> reports and the same data that was loaded in the eligibility tab.
> Find a way for the data to persist across sessions until updated or
> deleted. That's why I have been asking about other hosting options
> like vercel."

Alex has raised this in two consecutive sessions, signaling it's
ready to act on. This doc compares the realistic options + recommends
a path so the implementation PR has clear scope.

---

## What "shared workspace" means here

The shape Alex described:

1. Alex loads `.xlsx` reports + scrapes Eligibility into KosPos.
2. He hits a button that "publishes" the loaded data to a known URL.
3. He shares the KosPos URL with a co-worker (or opens it on his
   own phone / a different laptop).
4. The co-worker visits the URL; their browser auto-loads the same
   data Alex published. No re-upload required.
5. When Alex re-publishes (after refreshing reports the next pay
   period, say), the next visit picks up the new snapshot.

Key properties:

- **Single-author, multi-reader.** v1 doesn't need conflict resolution
  / multi-user editing. One person (Alex, or whoever owns the
  workspace) controls the published state.
- **No PII gate.** KosPos data is SF public-employee public records
  (see [memory `data_sensitivity.md`](file:///C:/Users/ALK/.claude/projects/C--Users-ALK-Desktop-Claude-Projects-kospos/memory/data_sensitivity.md)
  + non-negotiable #5 in `CLAUDE.md`). The decision is engineering +
  cost, not data-confidentiality policy.
- **Anyone-with-the-link is acceptable for v1.** Named workspaces
  + auth can come later.
- **GitHub Pages can't do this alone.** It's static-only — no
  per-user mutable state. Some other surface has to hold the
  snapshot.

---

## Constraint — what KosPos has today

The session JSON file ([snapshot.ts](../../app/src/lib/session/snapshot.ts))
already serializes the entire workspace state (loaded rows + staffing
plan actions + per-position notes + pending separations + probations).
It currently lives in:

- **In-memory Zustand stores** — lost on reload.
- **IndexedDB** (via `idb`) — survives reload on the same browser
  only. Same browser session = same data.
- **A user-initiated download/upload UI** — the user clicks "Save
  session" → file lands in their Downloads folder. Re-upload on a
  different device works but is manual.

What needs to land: an automated step that puts a snapshot
**somewhere a different device can fetch on load**. Plus a way to
fetch + auto-restore on app open.

---

## Option α — Cloudflare Pages + Workers KV ★ recommended

**Idea:** Move the site host from GitHub Pages to Cloudflare Pages
(behaviorally identical: deploys from GitHub on push to main). Add
a tiny Cloudflare Worker function that writes a published snapshot
to **Workers KV** (a key-value store). The KosPos app fetches the
latest published snapshot on load.

**Architecture:**

```
github.com/alkprojects/kospos       — source + GitHub repo (no change)
↓ push to main
Cloudflare Pages                    — auto-deploy
  ├── /kospos/*                     — static SPA (replaces GitHub Pages)
  └── /api/snapshot                 — Worker function
        ├── GET → return current snapshot (from KV)
        └── POST → write snapshot (gated by a shared secret)
Workers KV                          — { workspace-id → snapshot JSON }
```

**Cost:** Free tier covers KosPos by ~1000×. Cloudflare Pages:
unlimited bandwidth, 500 builds/month, 100 deploys/day. Workers KV
free tier: 100,000 reads/day, 1,000 writes/day, 1 GB storage,
100,000 list operations/day.

**Migration risk:** Low. Cloudflare Pages can be set up alongside
GitHub Pages; both run from the same repo until verified. Cut over
by changing the URL Alex shares.

**Auth model v1:** A "publish secret" in `.env` — Alex sets it once
in Cloudflare Pages settings; the Publish button uses it. Reads
are public.

**Auth model v2 (later):** Named workspaces — Alex publishes to
`workspace-id=dbi`; co-workers visit `?workspace=dbi`. Easy add
once v1 is in place.

**Implementation outline:**

1. Add Cloudflare Pages project pointing at the GitHub repo.
2. Add a Worker function `app/functions/api/snapshot.ts` reading + writing KV.
3. Add a Publish button in the SessionExportImport UI (existing
   surface) that POSTs `snapshot.json` to `/api/snapshot`.
4. Add an on-load fetch in `App.tsx` (or `main.tsx`) that calls
   `GET /api/snapshot` and dispatches the snapshot to the stores via
   the existing import-session helpers.
5. Switch the URL Alex shares to the Cloudflare Pages URL once
   verified (GitHub Pages stays alive as a fallback).

**Estimated effort:** 2 PRs, ~3 hours each.
  - PR 1: Cloudflare Pages deploy + parallel-running (verify-only).
  - PR 2: Publish button + auto-load + UI affordances.

**Why this is recommended:**

- Free for KosPos's scale.
- Drop-in deploy-from-GitHub workflow.
- Workers KV is the easiest backend "key-value lookup" on the
  market — single API call to read, single call to write.
- Clear v2 path (named workspaces) without re-architecting.
- Cloudflare is enterprise-grade infra — won't disappear like
  niche services have.

---

## Option β — Vercel + KV

**Idea:** Same shape as Option α but on Vercel + Vercel KV.

**Cost:** Free tier: 30,000 KV reads/day, 3,000 writes/day, 256 MB
storage. Tighter limits than Cloudflare KV for the same use case.
100 GB bandwidth/month.

**Migration risk:** Low (same shape as α).

**Why not the recommendation:**

- Tighter KV free-tier limits. Still fits KosPos but with less
  headroom.
- Vercel's free tier has been narrowed multiple times (most recently
  Spring 2025); Cloudflare's free tier has been stable longer.
- Both deploy from GitHub identically; no UX advantage either way.

Vercel is fine; Cloudflare is just better for this specific
workload.

---

## Option γ — Stay on GitHub Pages, commit snapshot to a `data/` branch

**Idea:** No new host. Add a "Publish snapshot" button that uses
the GitHub API to commit `snapshot.json` to a `data` orphan branch
of the existing repo. The app fetches `https://raw.githubusercontent.com/alkprojects/kospos/data/snapshot.json`
on load.

**Cost:** Free; no new infra.

**Auth model:** The Publish button needs a GitHub Personal Access
Token (PAT) with `contents:write` scope, scoped to the kospos repo.
The PAT is pasted into KosPos by Alex once + saved in IndexedDB
(or localStorage). The token is what gates "who can publish."

**Why not the recommendation:**

- **Latency:** publishing = git commit + Pages deploy = ~30–60s
  before the snapshot is visible. Cloudflare KV is ~50ms.
- **PAT UX:** Alex has to manage a token. Token rotation is a
  hassle. Co-workers who want to publish would each need their own
  token + collaborator access.
- **Commit-blob churn:** every publish adds ~5–50 MB to git history
  (the JSON snapshot). After 100 publishes the `data` branch is
  multi-GB. GitHub LFS solves this but adds friction.
- **Cross-user trust:** anyone with the PAT can publish — there's no
  per-publish audit beyond commit author.

**One legitimate reason to pick γ anyway:** if Alex is allergic to
"yet another host" and is okay with the 60s publish latency.

---

## Option δ — Supabase (real DB + auth)

**Idea:** A full backend — Postgres + auth + Row Level Security.
Snapshots stored as rows; readers query by workspace id; writers
authenticate via Supabase Auth.

**Cost:** Free tier: 500 MB DB, 2 GB bandwidth, 50,000 monthly
active users. Plenty for KosPos.

**Why not now:**

- Overkill for v1 (no multi-user editing yet).
- Schema migration / auth wiring is significantly more code than
  the KV approach.
- Real DB pays off when KosPos starts treating snapshots as
  queryable records (vs. opaque blobs) — that's Phase 7+
  territory, not Phase 2.2.

**One reason to revisit later:** when KosPos wants
per-row-level editing audited across users, Supabase's RLS + auth
beats hand-rolling on KV.

---

## Comparison table

| Aspect | α Cloudflare Pages + KV ★ | β Vercel + KV | γ GitHub Pages + data branch | δ Supabase |
|---|---|---|---|---|
| **Free-tier headroom** | Vast (100K reads/day) | Comfortable (30K reads/day) | N/A (uses GitHub) | Comfortable |
| **Publish latency** | ~100ms | ~100ms | 30–60s | ~100ms |
| **Implementation effort** | 2 PRs / ~6 hours | 2 PRs / ~6 hours | 1 PR / ~4 hours | 4+ PRs / ~15 hours |
| **Deploy-from-GitHub flow** | ✅ identical to Pages | ✅ identical | ✅ (already there) | N/A (DB separate) |
| **Migration risk** | Low (parallel run) | Low (parallel run) | None | Medium |
| **Auth UX** | Shared secret (env var) | Shared secret (env var) | Personal Access Token | Real login |
| **Named-workspace v2 path** | Trivial (KV key) | Trivial (KV key) | New `data/{workspace}` branch | First-class |
| **Multi-user editing v3 path** | Adds Worker logic | Adds API logic | Hard (commit conflicts) | First-class |
| **Risk of free tier removal** | Lower (stable since 2017) | Higher (narrowed 2025) | None | Medium |

---

## Recommendation

**Pick Option α (Cloudflare Pages + Workers KV).**

It's the cheapest, lowest-friction option that satisfies the v1
shape Alex described AND has a clean upgrade path to named
workspaces + multi-user editing without re-architecting.

GitHub Pages stays as a free static fallback during the migration
period (parallel-run the Cloudflare site until verified). The
GitHub repo stays the source of truth — Cloudflare deploys from it.

---

## Proposed Phase 2.2.q scope (next session)

**One PR — Cloudflare Pages parallel-run + snapshot publish/fetch:**

1. Create the Cloudflare Pages project pointing at the existing
   GitHub repo. Confirm `https://kospos.pages.dev/` (or a custom
   subdomain) builds + serves the same SPA as GitHub Pages.
2. Add `app/functions/api/snapshot.ts` — Worker function that
   reads/writes KV. POST gates on a shared secret in env;
   GET is public.
3. Bind a KV namespace `KOSPOS_SNAPSHOTS` in the Pages project
   settings.
4. Add a **Publish snapshot** button in the SessionExportImport UI
   that POSTs the current snapshot to `/api/snapshot`.
5. Add an **on-load** fetch in `main.tsx` (or App's first useEffect)
   that calls `GET /api/snapshot` + if a snapshot exists, prompts
   "Load published snapshot from {published-date}?" with
   accept/dismiss.
6. Documentation: add an entry to `DECISIONS.md` (ADR style) capturing
   the architectural decision once it ships.

**Out of scope for Phase 2.2.q:**

- Named workspaces (v2 — separate phase).
- Multi-user editing / conflict resolution (v3).
- Cutting over the publicly-shared URL away from GitHub Pages —
  both run in parallel; the cutover is a separate decision once
  Alex has confidence in the Cloudflare site.

**Estimated effort:** 3-4 hours including a preview-MCP walkthrough
that confirms cross-device behavior (publish from one browser, load
from another).

---

## Questions for Alex before Phase 2.2.q starts

1. **Cloudflare account.** Do you have a Cloudflare account already,
   or should the first step be account creation? (Free; only requires
   an email.)
2. **Publish-secret distribution.** v1 uses a single shared secret
   to gate publishing. Where do you want it stored — in your
   password manager, a 1Password vault you'd share with delegates,
   or in `.env` on your laptop only (then nobody else can publish
   v1)?
3. **Cutover preference.** Once the Cloudflare site is verified,
   should the GitHub Pages site (1) redirect users to the
   Cloudflare URL, (2) stay alive in parallel as a fallback, or
   (3) be deprecated entirely? Recommend (2) for the first month
   then (1) once stable.
4. **First-load UX.** When a user visits and a snapshot is
   published, should the app (a) auto-load it silently,
   (b) prompt "Load published snapshot from 2026-05-28?", or
   (c) show a banner with a "Load now" button? Recommend (b) so
   the user knows what's being loaded; auto-load can confuse if
   the snapshot is older than what they expect.
