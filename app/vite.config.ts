import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves at `alkprojects.github.io/kospos/` (subpath, base
  // must be `/kospos/`). Cloudflare Pages serves at `kospos.pages.dev/`
  // (root, base must be `/`). Cloudflare sets `CF_PAGES=1` automatically
  // during its builds, so the same source builds correctly for both hosts
  // without manual configuration. See docs/runbooks/cloudflare-pages-setup.md.
  base: process.env.CF_PAGES ? '/' : '/kospos/',
  plugins: [react()],
  server: {
    // Pin the dev-server port and fail loudly if it's taken instead of
    // silently falling back to 5174+. The preview tooling connects to the
    // port named in .claude/launch.json (5173); a silent fallback would
    // leave it pointed at a *different* worktree's app. With strictPort, a
    // second concurrent `npm run dev` errors out clearly instead. See
    // docs/WORKFLOW.md § "Visual verification protocol".
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
