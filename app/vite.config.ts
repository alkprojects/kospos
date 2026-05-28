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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
