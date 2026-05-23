# KosPos

**Position Management for San Francisco City and County departments.**

A web app that turns the standard SF labor reports (BFM, PS HCM, OBI/Snowflake, DHR) into a unified workspace for budgeting, projections, hiring plans, separation plans, special-class calculations, audience-aware org charts, and cross-system change reports. Built first for department administrators; designed to scale to citywide use.

## 🔗 Live site

<https://alkprojects.github.io/kospos/>

Currently Phase 0 — a placeholder confirming the deploy pipeline works. Real modules ship starting Phase 1.

## Start here

1. **Read [`docs/CLAUDE.md`](docs/CLAUDE.md) first.** Single source of truth for current state and working agreements.
2. Skim [`docs/VISION.md`](docs/VISION.md) — what we're building and why.
3. Look at [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased plan, one feature per phase.
4. Read [`docs/WORKFLOW.md`](docs/WORKFLOW.md) before touching code.

## Repo layout

| Path | Purpose |
| --- | --- |
| `docs/` | Design and reference docs. **Read first.** Includes `data-sources/` (one file per upstream system) and `domain/` (SF-specific concepts). |
| `app/` | The Vite + React + TypeScript application. `cd app && npm install` once, then `npm run dev`. |
| `.github/workflows/` | `deploy.yml` builds + publishes to Pages on push to `main`. `test.yml` runs Vitest on every push. |
| `.gitignore` | Excludes all `.xlsx`/`.xlsm`, real labor data, `node_modules`, build output. |

## Tech stack (v1)

- **Vite + React + TypeScript** — fast dev server, type-safe, builds to static files
- **`@xyflow/react`** (React Flow) — Lucidchart-style nodes, edges, dragging, zoom (used starting Phase 10)
- **`dagre`** — auto-layout for hierarchical trees
- **`xlsx`** (SheetJS) — Excel/CSV parsing
- **`zustand`** — state management
- **IndexedDB via `idb`** — local persistence (single labor report exceeds localStorage's 5 MB limit)
- **`vitest`** — unit tests
- **GitHub Pages** — free static hosting, no backend in v1

See [`docs/DECISIONS.md`](docs/DECISIONS.md) for the rationale behind every choice.

## Related projects

- **[CCSF-Job-Class-Calculator](https://github.com/alkprojects/CCSF-Job-Class-Calculator)** — standalone employee-cost calculator. Math is being lifted into KosPos as the Phase 1 module.
- **[orgchartbuilder](https://github.com/alkprojects/orgchartbuilder)** — earlier React Flow org-chart prototype. Will be folded into KosPos as the Phase 10 module.

## Data privacy

Real labor reports contain employee names attached to salaries. They are **never** committed. All `.xlsx`/`.xlsm` files are gitignored. The repo contains only tiny synthetic example files.

## License

[MIT](LICENSE)
