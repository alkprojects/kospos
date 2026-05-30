/**
 * Shared number formatters.
 *
 * Extracted (S49 code-health batch 1 — U2 + U3 in
 * docs/proposals/s48-code-health-review.md) from the 5 byte-identical
 * `fmtMoney` + 3 byte-identical `fmtSignedMoney` copies that had accumulated
 * across the views, so currency rendering has one source of truth.
 *
 * Intentionally NOT folded in here: `SpecialClassView`'s `fmt`/`fmtSigned`
 * (2-decimal, ASCII `+`-only) and `CalculatorView`'s `fmt` (2-decimal) —
 * different output, left in place.
 */

/** Whole-dollar USD, no cents — e.g. `12345` → `"$12,345"`. */
export function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });
}

/**
 * `fmtMoney` with an explicit leading sign. The minus is the real U+2212
 * MINUS SIGN (`−`), not an ASCII hyphen — load-bearing for column alignment
 * and to match the existing rendered output; do not normalize it. `0` gets
 * no sign.
 */
export function fmtSignedMoney(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return sign + fmtMoney(Math.abs(n));
}
