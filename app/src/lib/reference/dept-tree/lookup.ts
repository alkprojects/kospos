/**
 * Dept-tree lookup API.
 *
 * The tree is loaded once into a `DeptTree` instance and queried by code +
 * optional `asOf` date. Lookups are O(1) on code via the internal Map;
 * hierarchy walks are bounded by tree depth (typically <= 5 levels in SF).
 *
 * Created from the seed dataset by default. Future importer work
 * (`lib/importers/dept-tree/`) will load the full citywide CSV; the API here
 * doesn't change — only the seed differs.
 */

import type { DepartmentNode } from './types';
import { SEED_DEPARTMENT_TREE } from './data';

/**
 * Date-comparison helper. Both arguments are YYYY-MM-DD strings (ISO date,
 * no time) — string ordering equals chronological ordering for that shape.
 */
function isEffective(node: DepartmentNode, asOf: string): boolean {
  if (node.effectiveDate > asOf) return false;
  if (node.endDate != null && node.endDate <= asOf) return false;
  return true;
}

export class DeptTree {
  /** code → all effective-date variants for that code (sorted by effectiveDate desc). */
  private byCode = new Map<string, DepartmentNode[]>();

  constructor(rows: DepartmentNode[]) {
    for (const row of rows) {
      const existing = this.byCode.get(row.code) ?? [];
      existing.push(row);
      this.byCode.set(row.code, existing);
    }
    for (const variants of this.byCode.values()) {
      variants.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    }
  }

  /**
   * Look up one node. `asOf` defaults to today (so callers without date
   * context get the current shape). Returns null when the code isn't in
   * the tree at all, or when no variant is effective at `asOf`.
   */
  lookup(code: string, asOf?: string): DepartmentNode | null {
    const variants = this.byCode.get(code);
    if (!variants || variants.length === 0) return null;
    const date = asOf ?? new Date().toISOString().slice(0, 10);
    return variants.find(v => isEffective(v, date)) ?? null;
  }

  /**
   * Walk from `code` up to root, returning [self, parent, ..., root]. Empty
   * array when `code` isn't in the tree. Stops on first cycle (defensive —
   * should never happen, but a bad upstream csv could create one).
   */
  hierarchy(code: string, asOf?: string): DepartmentNode[] {
    const chain: DepartmentNode[] = [];
    const seen = new Set<string>();
    let current = this.lookup(code, asOf);
    while (current && !seen.has(current.code)) {
      chain.push(current);
      seen.add(current.code);
      if (current.parentCode == null) break;
      current = this.lookup(current.parentCode, asOf);
    }
    return chain;
  }

  /**
   * The dept-group label for a code (e.g., "DBI" or "CPC"). Pre-resolved on
   * each node so this is O(1).
   */
  deptGroup(code: string, asOf?: string): string {
    return this.lookup(code, asOf)?.deptGroup ?? '';
  }

  /** All known codes, useful for tests and lookup-list UIs. */
  allCodes(): string[] {
    return [...this.byCode.keys()];
  }
}

/** Default tree built from the seed dataset. */
export const DEFAULT_DEPT_TREE = new DeptTree(SEED_DEPARTMENT_TREE);
