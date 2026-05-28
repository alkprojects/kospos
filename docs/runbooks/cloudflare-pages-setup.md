# Cloudflare Pages + Workers KV setup — Phase 2.2.q PR 2

**Audience:** Alex. One-time setup for cross-device snapshot sharing.

The code for the Cloudflare integration shipped in [PR #126](https://github.com/alkprojects/kospos/pull/126) (Phase 2.2.q PR 2) but the deploy + verification require you to provision the Cloudflare side of the integration. Estimated time: 15-20 minutes. Free tier covers KosPos's scale by ~1000×.

Once setup is complete you'll be able to:
- Click "☁ Publish snapshot" in the Load Reports tab to push the current workspace to a shared KV namespace.
- Open KosPos on a different device / browser / private window — the published snapshot auto-loads silently (newer-wins vs whatever's in that browser's IndexedDB).

## Architecture recap

```
github.com/alkprojects/kospos          ← source repo (no change)
   ↓ push to main
Cloudflare Pages                       ← auto-deploy (you create this)
   ├── /kospos/*                       ← static SPA, same files GitHub Pages serves
   └── /api/snapshot                   ← Worker function from app/functions/api/snapshot.ts
        ├── GET  → fetch latest snapshot from KV (public)
        └── POST → write new snapshot (gated by PUBLISH_SECRET)
Workers KV namespace KOSPOS_SNAPSHOTS  ← stores snapshot JSON
```

Per the [persistence-architecture-options.md research doc](../research/persistence-architecture-options.md), this is the recommended Option α — lowest-friction shape with a clean v2 path to named workspaces.

## Step 1 — Create a Cloudflare account

1. Visit <https://dash.cloudflare.com/sign-up>.
2. Sign up with email + a strong password. Use the password manager you already use for SF DBI accounts.
3. Confirm the verification email. No payment method needed for the free tier.

(Skip this step if you already have an account.)

## Step 2 — Create a Cloudflare Pages project

1. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Authorize Cloudflare to access your GitHub. Grant access to the `alkprojects/kospos` repository (or all repositories — either works).
3. Pick `alkprojects/kospos`. Click **Begin setup**.
4. Fill in the build configuration:
   - **Project name:** `kospos` (becomes `kospos.pages.dev`; you can change it later if you grab a custom domain).
   - **Production branch:** `main`.
   - **Framework preset:** **Vite**.
   - **Build command:** `npm run build`.
   - **Build output directory:** `dist`.
   - **Root directory:** `app`. ← critical; tells Cloudflare to `cd app` before building, so it finds `app/package.json` + `app/functions/`.
   - **Environment variables:** add `NODE_VERSION` = `24` (matches `.github/workflows/deploy.yml`).
5. Click **Save and Deploy**. First build takes ~3-5 minutes.

Once the build finishes, Cloudflare gives you a URL like `https://kospos.pages.dev`. Click it — you should see the same KosPos welcome page you see on GitHub Pages.

## Step 3 — Create the KV namespace

1. Go to **Workers & Pages** → **KV**.
2. Click **Create a namespace**.
3. Name: `KOSPOS_SNAPSHOTS`. Click **Add**.
4. Note: you don't need to add any keys manually — the Worker function writes the first key on the first Publish.

## Step 4 — Bind the KV namespace to the Pages project

1. Go back to your Pages project (Workers & Pages → kospos).
2. **Settings** → **Functions** → **KV namespace bindings**.
3. Click **Add binding**.
   - **Variable name:** `KOSPOS_SNAPSHOTS` (must match the binding name the Worker function reads — this is the env var the Worker reads via `env.KOSPOS_SNAPSHOTS`).
   - **KV namespace:** select the `KOSPOS_SNAPSHOTS` namespace you created.
4. Click **Save**.
5. **IMPORTANT:** trigger a redeploy so the binding takes effect — go to **Deployments** → click the latest deployment → **Retry deployment**. (Cloudflare's binding-takes-effect-on-next-deploy quirk; the dashboard mentions it inline.)

## Step 5 — Set the publish secret

1. **Settings** → **Environment variables**.
2. Under **Production**, add a variable:
   - **Variable name:** `PUBLISH_SECRET`
   - **Value:** generate a 32-character random string. On macOS: `openssl rand -base64 32`. On Windows PowerShell: `[Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 }))`. Save the value in your password manager.
   - **Type:** Encrypt. (Cloudflare won't show it back to you after saving — only the Worker can read it at runtime.)
3. Click **Save**.
4. Redeploy as in Step 4 (env vars also take effect on next deploy).

## Step 6 — Configure KosPos to publish to your Cloudflare deployment

1. Open `https://kospos.pages.dev/?dev=1` (or your custom domain). The Welcome tab loads.
2. Click **Load Reports** in the tab bar.
3. At the top of the Load Reports tab, click **⚙ Cloudflare settings**.
4. Paste:
   - **Cloudflare Pages URL:** `https://kospos.pages.dev` (no trailing slash; KosPos trims it for you anyway).
   - **Publish secret:** the value you generated in Step 5.
5. Click **Save settings**. You should see "Cloudflare settings saved to this browser."

## Step 7 — Publish your first snapshot

1. Load some data (P&P, BFM, OBI Payroll, or refresh Eligibility) so there's something to publish.
2. Click **☁ Publish snapshot** at the top of the Load Reports tab.
3. You should see "Published snapshot (X KB). Anyone with the Cloudflare URL will load this on next open."

## Step 8 — Verify cross-device load

1. Open a private/incognito window.
2. Visit `https://kospos.pages.dev/?dev=1`.
3. The Welcome tab should show "Restored from **shared (Cloudflare)** (saved HH:MM)" instead of "Restored from this browser…".
4. Click into the Positions tab — the data you published should be there.

If you see "No data loaded yet" instead, check:
- Browser DevTools → Network — was `/api/snapshot` requested? Did it return 200?
- Worker logs in Cloudflare Pages → Functions → Logs — was the GET request received? Did it find the KV value?

## Step 9 — Cutover (your S40 pick: "redirect immediately")

Once Step 8 verifies, edit `.github/workflows/deploy.yml` to redirect GitHub Pages → Cloudflare. The simplest path:

1. Add a stub `app/public/_redirects` file containing `/* https://kospos.pages.dev/:splat 302` (Cloudflare-style; GitHub Pages doesn't honor it, but it's harmless on GH Pages and required by Cloudflare).
2. To redirect GitHub Pages itself, replace `app/index.html` content with an HTML `<meta http-equiv="refresh" content="0; url=https://kospos.pages.dev/">` page **only for the GitHub Pages build path** — or, simpler, file an issue + remove the workflow once cross-device is verified for ~1 week.

(This step intentionally not automated in this PR — your S40 pick was "redirect immediately" but the practical implementation needs a few hours of cleanup work that's better in its own PR.)

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Publish failed (HTTP 503): KV namespace not bound" | Step 4 not done or not redeployed | Bind + redeploy |
| "Publish failed (HTTP 503): PUBLISH_SECRET not configured" | Step 5 not done or not redeployed | Set env var + redeploy |
| "Publish failed (HTTP 401): Invalid or missing X-Publish-Secret header" | Local secret doesn't match the Cloudflare env var | Re-check Step 5 value vs Step 6 paste |
| GET /api/snapshot returns 404 even after publish | KV binding wasn't applied (deploy was before binding) | Redeploy |
| Build fails with "Cannot find module 'react'" | Cloudflare didn't pick up `app/` as root | Root directory must be `app` in Pages settings |

## Future work (out of scope for this PR)

- Named workspaces (`?workspace=dbi` keys instead of singleton `current`) — Phase 2.2.r+ candidate.
- Multi-user editing / conflict resolution — Phase 2.2.r+ or later (Supabase becomes more attractive when this matters).
- Custom domain on the Cloudflare Pages deployment.

## References

- Architecture decision: [persistence-architecture-options.md § Option α](../research/persistence-architecture-options.md#option-α--cloudflare-pages--workers-kv--recommended)
- Worker function source: [app/functions/api/snapshot.ts](../../app/functions/api/snapshot.ts)
- Client publish helpers: [app/src/lib/session/cloudflare-publish.ts](../../app/src/lib/session/cloudflare-publish.ts)
- Auto-load wiring: [app/src/lib/session/use-auto-persistence.ts](../../app/src/lib/session/use-auto-persistence.ts)
