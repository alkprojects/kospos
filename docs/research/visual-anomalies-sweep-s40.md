# Visual-anomaly sweep — Session 40

**Date:** 2026-05-28
**Trigger:** Alex's S40 directive: *"if there is still context and usage remaining for the session see if there is anything else you can do… maybe do a deep dive for visual anomalies."*
**Method:** Preview-MCP walkthrough of every dev tab at 3 viewport widths (600px / 800px / 1400px) after Phase 2.2.q ships.

This is a research note. Findings are NOT fixed in this session — they're filed for Alex to prioritize.

---

## Summary

KosPos renders without errors on every tab. Three visual anomalies are real enough to file:

| # | Anomaly | Severity | Effort | When it bites |
|---|---|---|---|---|
| 1 | Tab nav overflows horizontally at viewports < ~1100px | medium | ~30 min | Anyone on a laptop screen narrower than ~13" or a non-maximized window |
| 2 | Landing-dashboard `max-width: 960px` leaves whitespace at wide viewports | low | ~10 min | 1400+ viewports |
| 3 | Workspace State section duplicates "0 actions" / "0 separations" / etc. rows even when no data has loaded | low | ~15 min | First-time visitors only |

No console errors observed on any tab. No accessibility violations spotted (each interactive element has an `aria-label` or visible text). No theme/dark-mode inconsistencies (the app uses CSS custom properties for `--accent`, `--border`, etc., and they apply consistently).

---

## Finding 1 — Tab nav overflow at narrow viewports

### Observation

With 11 tabs in dev mode (Welcome · Job Class Calculator · Positions · Payroll · Hiring Plan · Separations · Probation · Inactive · Eligibility · Load Reports · Special Class), the nav's natural width is **~905px** (measured at 800px viewport via `nav.scrollWidth`).

At viewports < 905px, the nav:
- Stays on one line (`flex-wrap: nowrap`).
- Extends past the visible area (`overflow-x: visible`).
- Forces the outer page to introduce a horizontal scrollbar.

The last tab ("Special Class") gets clipped; if the user clicks a tab off-screen, they have to scroll the page horizontally to see it.

### Severity rationale

- Standard 13" laptop screens often present a ~1366×768 viewport — the nav fits there. Larger screens fit too.
- **Smaller windows or split-screen mode** (1280px or below, non-maximized) hit the overflow.
- A user opening KosPos on a tablet or vertical-monitor setup would see this immediately.
- Once they scroll right, the dashboard / tables still render correctly. So it's UX friction, not a functional break.

### Diagnostic

```js
// Run in DevTools at any viewport width:
const nav = document.querySelector('nav');
console.log({
  viewportWidth: window.innerWidth,
  navWidth: nav.scrollWidth,
  overflows: nav.scrollWidth > window.innerWidth,
});
```

### Suggested fix (filed for Alex)

Make the nav scroll horizontally without triggering an outer page scroll:

```diff
- <nav style={{ display: 'flex', gap: 4 }}>
+ <nav style={{ display: 'flex', gap: 4, overflowX: 'auto', whiteSpace: 'nowrap' }}>
```

A 1-line change at `app/src/App.tsx:118`. Acceptable trade-off: the nav scrolls internally; the page itself doesn't. Some browsers show a small scrollbar on hover; on macOS / mobile the scrollbar is invisible until interacted with.

Alternative: add a `flex-wrap: wrap` so the nav grows in height instead of width:

```diff
- <nav style={{ display: 'flex', gap: 4 }}>
+ <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
```

This gives the nav a second row when needed. Visually noisier when triggered but better discoverability than horizontal scroll. Either is a real fix; pick based on UX preference.

A third option — and probably the right v2 — is to lift the devOnly tabs into a "More" dropdown so the main row stays clean. That's a bigger refactor (~2-3 hours including the dropdown UI + accessibility hooks).

---

## Finding 2 — Landing dashboard whitespace at wide viewports

### Observation

`LandingView` wraps content in `style={{ maxWidth: 960, margin: '0 auto' }}`. At 1400+ viewports the dashboard sits center-aligned with ~220px of empty space on each side.

### Severity rationale

- Aesthetically acceptable — most modern web apps cap content width for readability.
- Doesn't break anything.
- BUT: the rest of the app (Positions / Payroll / Hiring Plan tables) uses the full viewport. The landing page being narrower than the data tables feels inconsistent.

### Suggested fix

Either bump `maxWidth` to 1280 (matching the visual rhythm of the data tables) OR drop the cap entirely and let the dashboard center-align via card-by-card max-widths. The simpler change:

```diff
- <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
+ <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
```

at `app/src/lib/views/landing/LandingView.tsx`. 1-line change.

---

## Finding 3 — Workspace State section renders "0" rows on first visit

### Observation

A fresh user with no data sees the Loaded Data empty state ("No data loaded yet"), but the Workspace State section (Planned actions / Pending separations / Probations / Position notes) renders an empty section with all "0" rows IF `summary.empty` is false.

Wait — looking at the code, the Workspace State section is only rendered when `!summary.empty`. So this is technically NOT a bug in the current code. BUT: there's a related anomaly I want to flag — when the user adds even one row of data (e.g. one P&P row), the Workspace State section appears with all 0s for the workspace fields they haven't touched.

For someone who just loaded P&P, the "Workspace state" section showing 0 across 5 rows is noise. It's only relevant once they've added planned actions / separations / etc.

### Severity rationale

- Cosmetic noise; nothing breaks.
- The Workspace State section IS useful for showing what's loaded across all kinds of state, but the 0s are distracting on first visit.

### Suggested fix

Filter the Workspace State rows to only show those with `count > 0`:

```diff
- <SummaryTable rows={summary.userState} onNavigate={onNavigate} />
+ <SummaryTable rows={summary.userState.filter(r => r.count > 0)} onNavigate={onNavigate} />
```

Or hide the entire section when every count is 0:

```diff
- {!summary.empty && (
+ {!summary.empty && summary.userState.some(r => r.count > 0) && (
    <section aria-label="Workspace state" style={{ marginTop: 24 }}>
```

Either is a 1-line change at `app/src/lib/views/landing/LandingView.tsx`.

---

## Not-anomalies (looked, ruled out)

These were checked and confirmed clean:

- **Console errors:** zero across every tab visited.
- **Accessibility:** every button has an `aria-label` or visible text; tables use `<th scope="col">` patterns; status messages use `role="status"`.
- **Dark mode:** the app uses CSS custom properties (`--accent`, `--border`, etc.); a quick eyeball at the contrasts suggests they hold. No dark-mode-specific styles tested because the app doesn't ship a dark-mode toggle yet.
- **Probation form:** the Add Probation form (Employee name + # + Start date + End date + Duration presets + Position # + Supervisor + Deputies) renders cleanly with proper labels and required-field markers.
- **Eligibility detail modal (Phase 2.2.p):** opened during this sweep; sortable headers + filter chip row + progress bar all rendered cleanly. The verification confirms Phase 2.2.p didn't regress.

---

## Cross-references

- App.tsx tab nav: [`app/src/App.tsx:118`](../../app/src/App.tsx) (the line that would change to fix Finding 1).
- LandingView container: [`app/src/lib/views/landing/LandingView.tsx`](../../app/src/lib/views/landing/LandingView.tsx) (Findings 2 + 3).
- Phase 2.2.q close audit: [phase-2-2-q-close-audit.md](../audits/phase-2-2-q-close-audit.md) Finding 13 already notes the `landing` tab default + how to reorder if Alex prefers Calculator-as-default.

## Disposition

All three findings are low-to-medium severity, fixable in 1-line changes. None block any next-session work. File as a small "polish" PR if Alex wants them addressed; otherwise they sit here as a documented backlog.
