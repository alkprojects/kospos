# UI-primitives follow-ups — the C-series tail that needs an aesthetic sign-off

**Date:** 2026-05-29 (Session 48) · **Status:** proposal / menu — *not implemented* · **Author:** S48 autonomous run

Session 48 shipped the **safe, no-visual-change** core of the C-series UI-primitives arc Alex picked (C1+C4+C5):

- **C1** ([#161](https://github.com/alkprojects/kospos/pull/161)) — `ModalFooter` / `Field` / `OverrideBox` / `CloseButton` + `inputStyle` extracted to `lib/ui/`.
- **C5 part 1** ([#162](https://github.com/alkprojects/kospos/pull/162)) — semantic status-palette **color tokens** (`--success` / `--warn` / `--caution` / `--danger` / `--neutral` + `-soft`), replacing ~108 exact-match hex literals. Zero value change.
- **C5 part 2** ([#163](https://github.com/alkprojects/kospos/pull/163)) — `lib/ui/Badge` deduping the 3 copied `badge()` helpers.

What's left of C4/C5 is **not** no-visual-change — it's genuine *consolidation* that moves pixels and so needs Alex's aesthetic sign-off (the project rule: "Claude verifies and shows proof; Alex does the final aesthetic sign-off"). It was deliberately **deferred** rather than shipped blind while Alex was away. This doc is the menu to approve from — each item below is a short reply away from being mechanically executable.

---

## D1 — `lib/ui/Button` + a radius scale (the rest of C4)

**The sprawl:** ~84 `<button>` tags across 26 files, with inline radii at **2, 3, 4, 6, 8, 10, 11, 12, 14, 16, 20** (counts: `4`×58, `12`×40, `14`×18, `6`×16, `10`×16, `8`×11, …). The variant *logic* is consistent though — three recurring shapes:

| Variant | Pattern | Today's radius (varies) |
|---|---|---|
| primary | `border:1px solid var(--accent)` + accent fill + white text (→ surface/muted when disabled) | 12 / 14 |
| secondary | `border:1px solid var(--border)` + transparent + inherit | 12 / 14 |
| danger | `border:1px solid <red>` + transparent + red text | 14 |
| pill / filter | small radius pills | 8 / 10 / 12 |

**Why it needs sign-off:** a real `Button` standardizes the radius (and padding) — which *changes* the buttons that currently use an off-scale value. That's an aesthetic call, not a dedup.

**Proposed radius scale** (pick one for the canonical pill — this is the only real decision):
- `--radius-input: 4` (text inputs / selects — already dominant at 58 uses)
- `--radius-pill: 10` *or* `12` *or* `14` (buttons / chips — **needs the call**; 12 is the plurality at 40, 14 is the modal-footer convention from C1's `ModalFooter`)
- `--radius-card: 8` (already the `.card` value)

**Then:** `lib/ui/Button` (`variant: primary|secondary|danger`, `size: sm|md`) consuming the scale; migrate the 84 buttons. `ModalFooter` (from C1) becomes its first consumer. ~1 PR once the pill radius is chosen.

**Recommendation:** `--radius-pill: 12` (least total movement — it's already the plurality). Reply with a radius and this becomes mechanical.

---

## D2 — Consolidate the near-duplicate color families (the rest of C5)

C5 part 1 tokenized the **coherent** status palette. A **second, near-duplicate palette** is still hard-coded, mostly in the importer panels / landing / special-class:

| Role | Canonical token (C5) | Near-duplicate still-literal shades | Where |
|---|---|---|---|
| blue / accent | `--accent` `#1f5fbf` | `#2563eb`, `#1e40af`, `#dbeafe`, `#93c5fd`, `#eef3ff` | LandingView, SessionExportImport, SpecialClassView |
| green / success | `--success` `#1a7a3c` | `#27ae60`, `#1e6b3c` | FilePicker, DataIssuesPanel, SpecialClassView |
| red / danger | `--danger` `#7f1d1d` (text) | `#dc2626`, `#c0392b`, `#b91c1c` (interactive/button red) | App.tsx, FilePicker, SessionSaveLoad, ProbationsView, the `lib/ui` Delete/asterisk |
| orange / warn | `--warn` `#b35a00` | `#e67e22` | FilePicker, DataIssuesPanel |

**Why it needs sign-off:** unifying `#2563eb` → `--accent` (etc.) *changes the shade* at those sites. Small, but a visible decision — and the "interactive red" (`#b91c1c`, used by buttons + the `Field` required-asterisk + `ModalFooter` Delete) is arguably a *distinct* role from the status "danger text" (`#7f1d1d`), so it may warrant its own `--danger-strong` token rather than being merged.

**Proposed approach:** introduce `--danger-strong: #b91c1c` (the interactive red) as a sibling token, then map each near-duplicate to its canonical token, verifying surfaces before/after. ~1 PR; pairs naturally with D1 (the Button's danger variant uses `--danger-strong`).

---

## D3 — Minor leftovers (no sign-off needed; bundle when convenient)

- **Unify the remaining chip shapes.** C5 part 2 left `StatusChip` / `ConfidenceChip` / `AlertChip` (Probations + Separations) and EligibilityDetail's label+value `Chip` as-is — they're 10px / 700-weight / different padding+radius, so a shared `Badge` would need size/weight/uppercase props. Worth doing once `Badge` gains a `size` prop (and that prop arrives naturally with D1's scale).
- **The other close buttons.** C1's `CloseButton` covered only the 3 detail-editors' borderless `✕`. EligibilityDetail's bordered pill `×` ("Close detail") + close-only footer, and the Family-B viewers' (`PositionDetail` / `LaborView`) borderless variants, were left — unifying them changes their look, so it's a D2-adjacent aesthetic call.

---

## Suggested order

1. **D1** (Button + radius scale) — biggest dedup (84 buttons); needs one decision (the pill radius).
2. **D2** (color consolidation + `--danger-strong`) — pairs with D1's danger variant.
3. **D3** (chip-shape unification, other close buttons) — cleanup once `Badge`/`Button` have size props.

All three are one PR each. The only blockers are the two aesthetic decisions: **the canonical pill radius** (D1) and **whether `#b91c1c` becomes `--danger-strong`** (D2).
