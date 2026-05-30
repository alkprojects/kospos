/**
 * Stable-id generator shared by the user-input entity builders.
 *
 * Prefers a standard UUID v4 via `crypto.randomUUID`; falls back to a
 * millisecond + random suffix in environments that don't expose it (Vitest's
 * happy-dom). Consolidates the three byte-identical-but-prefix copies that
 * lived in the separations / probation / staffing-plan builders (s48 CH L3).
 *
 * `prefix` only appears in the fallback id (production browsers return a bare
 * UUID), so it's effectively a test-environment label — keep it short.
 */
export function makeId(prefix: string): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
