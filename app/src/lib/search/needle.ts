/**
 * Global "needle" search — case-insensitive substring match against ALL
 * string-typed fields on a row + numeric fields rendered via toString.
 *
 * Shared across the Positions / Payroll / Hiring Plan tabs so all three
 * surfaces honor the same matching rules. Per S30 Alex pick, this is the
 * "simple needle" v1; field-qualified syntax (`name:Smith jobCode:6278`)
 * is queued as a follow-up.
 *
 * Matching rules:
 *   - Empty needle → match everything (return true).
 *   - Whitespace-trimmed needle is split on whitespace into terms; every
 *     term must match SOMEWHERE on the row (AND across terms, OR across
 *     fields within a term). This lets the user type "smith 6278" and
 *     find rows where one field contains "smith" + another contains
 *     "6278" — without forcing field qualifiers.
 *   - Strings match via case-insensitive substring.
 *   - Numbers match via `String(value).toLowerCase()` substring — so
 *     typing "5000" finds rows with balanceAmount of 5000 (or 25000,
 *     500004, etc — substring, not exact).
 *   - Booleans + nullish values are skipped.
 *   - Nested objects (e.g. Position.appointment) are walked recursively;
 *     internal Symbol keys + Map/Set values are skipped (don't appear
 *     in JSON; not useful to search anyway).
 *   - Arrays are walked element-by-element with the same rules.
 *   - Cycle detection: a WeakSet tracks already-visited objects to
 *     avoid infinite recursion if a row ever carries a cycle (none do
 *     today, but defensive).
 *
 * Pure — no DOM, no React, no IO. Same input → same output.
 */

/**
 * Returns true iff every whitespace-separated term in `needle` appears
 * somewhere in `row`'s string/numeric leaf values (case-insensitive
 * substring per term).
 */
export function matchesNeedle(row: unknown, needle: string): boolean {
  const trimmed = needle.trim();
  if (trimmed === '') return true;
  const terms = trimmed.toLowerCase().split(/\s+/);
  // Hot-path: serialize once, lowercase once, then look for each term.
  const haystack = serializeRow(row).toLowerCase();
  for (const t of terms) {
    if (!haystack.includes(t)) return false;
  }
  return true;
}

/** Convenience filter using `matchesNeedle`. */
export function filterByNeedle<T>(rows: readonly T[], needle: string): T[] {
  if (needle.trim() === '') return rows.slice();
  return rows.filter(r => matchesNeedle(r, needle));
}

/**
 * Walk a value's string + numeric leaves into one flat space-separated
 * string. Returns lowercase-ready text (caller still lowercases since
 * we want one allocation, not per-leaf).
 *
 * Excluded:
 *   - undefined / null / boolean (not useful to search)
 *   - functions (shouldn't appear in row data anyway)
 *   - Map / Set (not appearing in plain row data; if added later, the
 *     same pattern would apply — open up here when needed)
 */
function serializeRow(v: unknown, seen?: WeakSet<object>): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (typeof v === 'boolean') return '';
  if (typeof v === 'function' || typeof v === 'symbol') return '';
  if (Array.isArray(v)) {
    const next = seen ?? new WeakSet<object>();
    if (next.has(v)) return '';
    next.add(v);
    return v.map(x => serializeRow(x, next)).join(' ');
  }
  if (typeof v === 'object') {
    const next = seen ?? new WeakSet<object>();
    if (next.has(v as object)) return '';
    next.add(v as object);
    // Dates serialize via toISOString for stable matching (a Date object
    // in a row should still be searchable by its ISO form).
    if (v instanceof Date) return v.toISOString();
    const out: string[] = [];
    for (const k of Object.keys(v as Record<string, unknown>)) {
      out.push(serializeRow((v as Record<string, unknown>)[k], next));
    }
    return out.join(' ');
  }
  return '';
}
