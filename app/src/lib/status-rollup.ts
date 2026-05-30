/**
 * Generic status rollup — count items per status bucket, in a canonical order,
 * keeping empty buckets so a summary header renders a stable chip strip.
 *
 * Consolidates the byte-identical `rollupByStatus` that lived in the
 * separations and probation builders (s48 code-health L7). Each keeps a thin
 * domain-typed wrapper over this generic.
 */

export interface StatusRollup<S extends string> {
  status: S;
  count: number;
}

export function rollupByStatus<S extends string, T>(
  items: T[],
  order: readonly S[],
  getStatus: (item: T) => S,
): StatusRollup<S>[] {
  const buckets = new Map<S, StatusRollup<S>>();
  for (const s of order) buckets.set(s, { status: s, count: 0 });
  for (const item of items) {
    const b = buckets.get(getStatus(item));
    if (b) b.count += 1;
  }
  return order.map(s => buckets.get(s)!);
}
