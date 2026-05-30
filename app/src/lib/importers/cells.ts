/**
 * Shared cell-coercion + header-lookup helpers for the report importers.
 *
 * Every importer was carrying byte-identical copies of `num` / `str`, the
 * `headers.indexOf(name.toLowerCase())` column lookup, and (in obi-payroll +
 * ps-hcm-ee-addl-pay) the Excel-serial-date `iso()` coercer. Consolidated here
 * per the s48 code-health review (L2) so cell parsing has one source of truth.
 * Behavior is unchanged — these are the exact prior implementations.
 */

/** Coerce a cell to a number; non-numeric / blank → 0. */
export function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Coerce a cell to a trimmed string; null / undefined → ''. */
export function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

/**
 * Build a column-index lookup over an **already-lowercased** headers array.
 * Returns -1 for an absent column (callers treat -1 as "missing" and default).
 */
export function makeColLookup(lowercasedHeaders: string[]): (name: string) => number {
  return (name: string) => lowercasedHeaders.indexOf(name.toLowerCase());
}

/**
 * Coerce a date cell to ISO `YYYY-MM-DD`.
 *
 * The .xlsx export stores dates as Excel serials (a number like 46150 — days
 * since the Excel epoch), which `String(...)` would render as `"46150"`. This
 * converter handles:
 *   - numeric Excel serial (most common for .xlsx)
 *   - JS Date object (if `cellDates: true` is ever passed at `read()` time)
 *   - already-ISO string (CSV exports, or text-formatted cells)
 *   - empty / null cells (→ '')
 *
 * Returns the ISO slice of the UTC date so it sorts and compares
 * lexicographically as downstream PP-range / expiry filters expect.
 */
export function iso(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number') {
    if (!isFinite(v) || v <= 0) return '';
    // Excel epoch is 1899-12-30 (offset 25569 days to the JS 1970-01-01 epoch
    // — that offset already accounts for Excel's spurious 1900 leap day).
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (s === '') return '';
  // A string with a date separator is already date-shaped — pass through.
  if (/[-/]/.test(s)) return s;
  // Otherwise try parsing as a numeric serial.
  const n = Number(s);
  if (!isNaN(n) && isFinite(n) && n > 0) return iso(n);
  return s;
}
