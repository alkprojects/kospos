# Cloudflare Pages + Workers KV setup — Phase 2.2.q PR 2 (refreshed S41)

**Audience:** Alex. One-time setup for cross-device snapshot sharing.

The code for the Cloudflare integration shipped in [PR #126](https://github.com/alkprojects/kospos/pull/126) (Phase 2.2.q PR 2); Session 41 verified it end-to-end on real 331,893-row data and shipped 7 follow-up PRs hardening the publish/load path. This runbook is the current canonical procedure — incorporates every gotcha encountered during the S41 verification walkthrough. Estimated time: **20-30 minutes** start to finish (was 15-20 in the original draft; the dashboard reorg added a few minutes).

Once setup is complete you'll be able to:
- Click "☁ Publish snapshot" in the Load Reports tab to push the current workspace to a shared KV namespace.
- Open KosPos on a different device / browser / private window — the published snapshot auto-loads silently with an animated spinner + "Restored from shared (Cloudflare)" banner (newer-wins vs whatever's in that browser's IndexedDB).

## Architecture recap

```
github.com/alkprojects/kospos          ← source repo (no change)
   ↓ push to main
Cloudflare Pages                       ← auto-deploy (you create this)
   ├── /kospos/*                       ← static SPA, same files GitHub Pages serves
   └── /api/snapshot                   ← Worker function from app/functions/api/snapshot.ts
        ├── GET  → fetch latest snapshot from KV (public, returns gzipped bytes
        │          with Content-Encoding: gzip — browsers auto-decompress)
        └── POST → write new snapshot (gated by PUBLISH_SECRET, accepts
                   gzipped body + X-Snapshot-SavedAt header)
Workers KV namespace KOSPOS_SNAPSHOTS  ← stores gzipped snapshot bytes (~5-20 MB
                                          even for 300K-row real data)
```

Per the [persistence-architecture-options.md research doc](../research/persistence-architecture-options.md), this is the recommended Option α — lowest-friction shape with a clean v2 path to named workspaces. [ADR-016](../DECISIONS.md#adr-016--cross-device-persistence-via-cloudflare-pages--workers-kv-gzipped-same-origin-default) codifies the as-shipped decision.

### Key architectural details (S41 hardening)

- **`vite.config.ts` `base` is conditional** on `CF_PAGES`. Cloudflare sets `CF_PAGES=1` automatically during its builds, so `base` flips to `/` (root) for Cloudflare and stays `/kospos/` for GitHub Pages. Without this the bundle 404s on Cloudflare. Landed in [PR #130](https://github.com/alkprojects/kospos/pull/130).
- **gzip on the wire AND in storage.** Cloudflare's edge has a 100 MB inbound body cap; Workers KV caps values at 25 MB; real-data snapshots (300K+ rows × labor fields × scraper PDFs) serialize to 100-400 MB JSON. The client gzips (`CompressionStream`) before POST, the Worker stores the bytes verbatim — no server-side decompression because Workers' 128 MB memory cap can't hold the decompressed payload. JSON gzips 8-15× on this dataset (375 MB → 8.4 MB observed). [PR #132](https://github.com/alkprojects/kospos/pull/132) + [PR #133](https://github.com/alkprojects/kospos/pull/133).
- **Same-origin URL default.** When `localStorage` is empty (incognito, fresh browser), the client falls back to relative `/api/snapshot` — any visitor to `kospos.pages.dev` auto-loads the published snapshot with zero per-device config. Explicit `pagesUrl` still works for cross-origin cases (localhost dev pointing at production). [PR #135](https://github.com/alkprojects/kospos/pull/135).
- **In-place validation on load.** `parseSessionFileFromValue` skips a wasteful `JSON.stringify` → `JSON.parse` round-trip on the auto-load path — saves several seconds on the 375 MB envelope. [PR #136](https://github.com/alkprojects/kospos/pull/136).
- **Animated loading spinner + stage progress.** SMIL-animated SVG (no CSS keyframes) signals to the user that work is progressing even when the main thread is briefly blocked. Banner text: "Restoring saved session… (checking this browser + any shared snapshot)" — accurate about the parallel work, no premature source claim. [PR #134](https://github.com/alkprojects/kospos/pull/134) + [PR #136](https://github.com/alkprojects/kospos/pull/136).

## Step 1 — Create a Cloudflare account

1. Visit <https://dash.cloudflare.com/sign-up>.
2. Sign up with email + a strong password. Use the password manager you already use for SF DBI accounts.
3. Confirm the verification email. No payment method needed for the free tier.

(Skip this step if you already have an account.)

## Step 2 — Create a Cloudflare Pages project — USE THE DIRECT URL

> **🛑 Dashboard reorg gotcha (discovered S41):** Cloudflare consolidated "Workers" and "Pages" under one **"Workers & Pages"** sidebar entry. The "Create application" button on that page steers you into the **Workers** create flow by default — NOT what we want. Pages Functions (which is what `app/functions/api/snapshot.ts` is) only get picked up correctly by a Pages project, not a Workers project.

**Use this direct URL** (replace `{account-id}` with yours; you'll find it in the URL after you log in):

```
https://dash.cloudflare.com/{account-id}/pages/new/provider/github
```

You can also get your account ID from **Account home** → bottom-right "Account ID" field, or from the URL fragment on any dashboard page.

When the page loads correctly you should see:
- Page title: **"Set up builds and deployments"** (NOT "Create a Worker")
- Progress bar at top: **Select repository ✓ → Set up builds and deployments → Deploy site** (three steps, Pages-specific flow)
- URL contains `/pages/new/provider/github`

If you get redirected to the Workers flow or hit a 404, screenshot the page and ping the next session.

### Build settings

After picking the `alkprojects/kospos` repo, fill in:

| Field | Value |
|---|---|
| **Project name** | `kospos` (becomes `kospos.pages.dev`) |
| **Production branch** | `main` |
| **Framework preset** | **"React (Vite)"** — Cloudflare's dropdown calls it that, not just "Vite" |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` (the UI shows it as `/dist`; just type `dist`) |
| **Root directory** | `app` (under the **"Root directory (advanced)"** expandable section — click it to reveal) |
| **Environment variables** | `NODE_VERSION` = `24` (under the **"Environment variables (advanced)"** expandable section) |

> **Gotcha:** Both **Root directory** and **Environment variables** are under `(advanced)` expandable sections that are collapsed by default. Easy to miss. The Root directory is **critical** — without it the build fails with "Cannot find module 'react'" because Cloudflare doesn't `cd app` before running `npm install`.

Click **Save and Deploy**. First build takes ~3-5 minutes. Once it finishes, Cloudflare gives you a URL like `https://kospos.pages.dev` and the welcome page should load.

> **First-time gotcha (S41):** the welcome page may load BLANK because the bundle references `/kospos/assets/...` (GitHub Pages base) instead of `/assets/...` (Cloudflare root). This is fixed in [PR #130](https://github.com/alkprojects/kospos/pull/130) — the `vite.config.ts` `base` is conditional on `CF_PAGES=1`. If you're setting up against a fresh checkout, make sure that PR is in main first. If `main` has it (which it does as of S41), the next deploy after the build settings save will render correctly.

## Step 3 — Create the KV namespace

1. Go to **Storage & Databases** → **KV** (or use **Quick search** at the top — type "KV").
2. Click **Create a namespace**.
3. Name: `KOSPOS_SNAPSHOTS`. Click **Add**.
4. Note: you don't need to add any keys manually — the Worker function writes the first key on the first Publish.

## Step 4 — Bind the KV namespace to the Pages project

1. **Workers & Pages → kospos** (your Pages project).
2. **Settings** tab → scroll to **Functions** section → **KV namespace bindings**.
3. Click **Add binding**.
   - **Variable name:** `KOSPOS_SNAPSHOTS` (must match the namespace name — the Worker reads `env.KOSPOS_SNAPSHOTS`)
   - **KV namespace:** select `KOSPOS_SNAPSHOTS` from the dropdown
4. Click **Save**.

## Step 5 — Set the publish secret

1. Still in **Settings** for the kospos Pages project → scroll to **Environment variables**.
2. Under **Production**, add a variable:
   - **Variable name:** `PUBLISH_SECRET`
   - **Type:** **Encrypt** — critical. Once saved, Cloudflare won't show you the value again; only the Worker can read it at runtime.
   - **Value:** generate a 32-character random string. PowerShell one-liner:
     ```powershell
     [Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 }))
     ```
     On macOS: `openssl rand -base64 32`. **Copy the output and paste it into your password manager FIRST**, then paste it into Cloudflare's Value field. If you skip the password-manager step you'll have to delete + recreate the secret later when KosPos asks for it.
3. Click **Save**.

## Step 6 — Trigger a redeploy (both Step 4 + Step 5 take effect together)

1. **Deployments** tab on the kospos Pages project.
2. Click the latest deployment (likely the one from the build settings save).
3. **Retry deployment** (or "Redeploy" depending on label).
4. Wait ~3-5 minutes for the new build to complete.

> **Why one redeploy after BOTH config changes:** the original runbook had two redeploys (one after Step 4, one after Step 5). The S41 walkthrough verified they batch correctly — set both, redeploy once, both take effect. Saves ~5 minutes.

## Step 7 — Configure KosPos to publish (secret only — URL is automatic)

1. Open `https://kospos.pages.dev/?dev=1`. The Welcome tab loads.
2. Click **Load Reports** in the tab bar.
3. At the top of the Load Reports tab, click **⚙ Cloudflare settings**.
4. Paste:
   - **Cloudflare Pages URL:** *leave blank* — the client defaults to the current origin (relative URL `/api/snapshot`), which IS `kospos.pages.dev` when you're on the deployed site. Only fill this in if you're publishing from a different origin (localhost dev pointing at production, etc.).
   - **Publish secret:** the value you generated in Step 5.
5. Click **Save settings**. You should see "Cloudflare settings saved to this browser."

> **Step 7 note (S41 fix):** the original runbook required you to paste the Cloudflare Pages URL. [PR #135](https://github.com/alkprojects/kospos/pull/135) made that field optional when you're on the deployed site itself. The settings panel still shows the field; leaving it blank is the right call when you're using the project's own `pages.dev` URL.

## Step 8 — Publish your first snapshot

1. Load some data (P&P, BFM, OBI Payroll, or refresh Eligibility) so there's something to publish.
2. Click **☁ Publish snapshot** at the top of the Load Reports tab.
3. Expected progression: banner shows "Building snapshot from in-memory state…" → "Compressing snapshot for upload…" → "Uploading to Cloudflare…" each with an animated spinner. Then flips to "Published snapshot (X KB). Anyone with the Cloudflare URL will load this on next open."

For a real 300K+ row dataset the publish takes 10-30 seconds depending on machine speed (the JSON.stringify + gzip pass is sync and CPU-bound). The reported KB is the **compressed** size — on Alex's S41 data, 375 MB of JSON gzipped to 8.4 MB.

If you see "Publish failed":
- **HTTP 413** → snapshot exceeds 25 MB compressed. KosPos has crossed a real architectural threshold — next session needs to migrate from KV to R2 (Cloudflare's S3-style object storage; 5 TB per object).
- **HTTP 401** → local secret doesn't match Cloudflare's PUBLISH_SECRET. Re-check Step 5 + Step 7.
- **HTTP 503** → KV not bound or env var not set. Re-check Step 4 + Step 5 + redeploy.

## Step 9 — Verify cross-device load

1. Open a private/incognito window — do NOT copy any localStorage from your main browser. The whole point is to verify the same-origin default works for a fresh visitor.
2. Visit `https://kospos.pages.dev/?dev=1`.
3. Expected: animated spinner with banner "Restoring saved session… (checking this browser + any shared snapshot)" for a few seconds. Then banner flips to **"Restored from shared (Cloudflare) (saved HH:MM)"** and the Loaded data table populates with the data you published.
4. Click into the **Positions** tab — the data you published should be there.

If you see "No data loaded yet" instead:
- Check DevTools → Network — was `/api/snapshot` requested? Did it return 200?
- If the Network tab is **empty**, the request never fired — likely a localStorage issue (shouldn't happen with the same-origin default in [PR #135](https://github.com/alkprojects/kospos/pull/135), but if it does, run `localStorage.getItem('kospos.cloudflare.pagesUrl')` in DevTools Console — should return `null` for the fallback to kick in).
- If the request returned but the page didn't restore, the JSON parse may be silently failing or running slow. Open DevTools Memory tab + watch tab memory; large snapshots may need a Web Worker for the initial parse (future PR).

## Step 10 — Cutover (deferred to a separate PR)

Once Step 9 verifies, the original S40 design pick was "redirect immediately" — point `alkprojects.github.io/kospos/` at `kospos.pages.dev` so there's only one canonical URL. This work is filed as a Phase 2.2.s+ follow-up. The simplest path:

1. Add a stub `app/public/_redirects` file containing `/* https://kospos.pages.dev/:splat 302`.
2. Replace the GitHub Pages `index.html` with an HTML `<meta http-equiv="refresh">` page targeting `kospos.pages.dev`.

(Not automated in this PR — the practical implementation needs a few hours of cleanup work that's better in its own scoped PR.)

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank page on `kospos.pages.dev` first load | `vite.config.ts` `base` is hardcoded to `/kospos/` (pre-PR-130) | Make sure main has [PR #130](https://github.com/alkprojects/kospos/pull/130); rebuild. |
| Build fails with "Cannot find module 'react'" | Root directory not set to `app` in Pages settings | Step 2 — expand the "Root directory (advanced)" section, set to `app`, redeploy. |
| "Publish failed (HTTP 503): KV namespace not bound" | Step 4 not done or not redeployed | Bind + redeploy (Step 6). |
| "Publish failed (HTTP 503): PUBLISH_SECRET not configured" | Step 5 not done or not redeployed | Set env var + redeploy. |
| "Publish failed (HTTP 401): Invalid or missing X-Publish-Secret header" | Local secret doesn't match the Cloudflare env var | Re-check Step 5 value vs Step 7 paste. |
| "Publish failed (HTTP 413)" | Compressed snapshot exceeds 25 MB KV cap | File a follow-up PR to migrate to R2. |
| "Publish failed (HTTP 400): Body declared Content-Encoding: gzip but does not begin with the gzip magic bytes" | Client didn't actually gzip the body | Almost certainly a browser bug or extension interference; check DevTools Network → Request → Payload to confirm bytes start with `1f 8b`. |
| GET /api/snapshot returns 404 even after publish | KV binding wasn't applied (deploy was before binding) | Redeploy. |
| Incognito window shows "No data loaded yet" with empty Network panel | localStorage doesn't have `pagesUrl` AND the same-origin default isn't kicking in (shouldn't happen post-PR-135) | Confirm main has [PR #135](https://github.com/alkprojects/kospos/pull/135). |
| Page becomes unresponsive during load for many seconds | Real-data JSON parse on 375 MB envelope | Mitigations shipped in [PR #136](https://github.com/alkprojects/kospos/pull/136); if still bad, the next architectural step is a Web Worker for `JSON.parse`. |

## Appendix A — Optional: enable autonomous Cloudflare setup via API token

For sessions where you'd like Claude to drive the Cloudflare setup steps directly (instead of walking you through the dashboard), you can create a scoped API token + paste it into a local gitignored file. The S41 session used this — it cut the dashboard-clicking time from ~20 minutes to a few API calls.

### Create the token

1. Cloudflare → top-right profile menu → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**.
2. Permissions to add:
   - **Account** → **Workers KV Storage** → **Edit**
   - **Account** → **Cloudflare Pages** → **Edit**
3. **Account resources:** Include → your account.
4. **TTL:** today only (auto-expires after the session).
5. Click **Create Token**, copy the value.

### Store the token

Paste the token value into `.cloudflare-token\claudecftoken.txt` at the repo root. The `.cloudflare-token/` directory is gitignored (added in [PR #131](https://github.com/alkprojects/kospos/pull/131)) so the token never reaches the repo.

### Tell Claude

When you start a Cloudflare-related session, mention: "Token is saved at `.cloudflare-token/claudecftoken.txt`" and Claude can:

- Create the KV namespace: `POST /accounts/{id}/storage/kv/namespaces`
- PATCH the Pages project to add the KV binding + `PUBLISH_SECRET` env var
- Trigger the redeploy
- Run end-to-end API tests (POST gzipped envelope, GET it back, verify Content-Encoding)
- Clean up test envelopes from KV before handoff

### Revoke when done

After the session completes, revoke the token at Cloudflare → My Profile → API Tokens. Future sessions generate a new one as needed.

## Future work (out of scope for the current PR)

- **Named workspaces** (`?workspace=dbi` keys instead of singleton `current`) — Phase 2.2.s+ candidate.
- **Multi-user editing / conflict resolution** — Phase 2.2.s+ or later (Supabase becomes more attractive when this matters).
- **Custom domain** on the Cloudflare Pages deployment.
- **R2 migration** — required if snapshot size ever exceeds 25 MB compressed.
- **GitHub Pages → Cloudflare redirect** — Step 10 above; filed as Phase 2.2.s+ follow-up.
- **Web Worker for JSON.parse** — would eliminate the 5-15 second main-thread block on real-data restore.

## References

- Architecture decision: [ADR-016](../DECISIONS.md#adr-016--cross-device-persistence-via-cloudflare-pages--workers-kv-gzipped-same-origin-default) — codifies the as-shipped decision.
- Architecture research: [persistence-architecture-options.md § Option α](../research/persistence-architecture-options.md#option-α--cloudflare-pages--workers-kv--recommended)
- Worker function source: [app/functions/api/snapshot.ts](../../app/functions/api/snapshot.ts)
- Client publish helpers: [app/src/lib/session/cloudflare-publish.ts](../../app/src/lib/session/cloudflare-publish.ts)
- Auto-load wiring: [app/src/lib/session/use-auto-persistence.ts](../../app/src/lib/session/use-auto-persistence.ts)
- Phase 2.2.r close audit: [phase-2-2-r-close-audit.md](../audits/phase-2-2-r-close-audit.md) — full account of the 7 PRs landed in S41 verification.
