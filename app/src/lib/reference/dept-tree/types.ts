/**
 * Department tree — citywide Department Classification Structure.
 *
 * Source: OBI report library, `Department Classification Structure (16).csv`
 * (14,240 rows, 64 dept groups citywide). Versioned by effective date so
 * lookups during historical snapshots resolve against the tree-shape that
 * was in effect *then*.
 *
 * See docs/domain/labor-report.md § "Companion reference dataset — citywide
 * department tree".
 */

/**
 * One row of the department tree. Codes are PS HCM 6-digit numeric strings;
 * hierarchy is resolved by walking `parentCode` toward `null`. Each row carries
 * its own `level` (1 = root / dept group; higher = deeper) so a consumer can
 * filter without re-deriving from the chain.
 */
export interface DepartmentNode {
  /** PS HCM 6-digit department code. Primary key. */
  code: string;
  /** Display name (no code prefix — pair with code at render time per Tab 6 UX rule). */
  description: string;
  /**
   * Parent code in the hierarchy. `null` for top-of-tree dept groups.
   * Walking parent → parent reaches a root with `parentCode === null`.
   */
  parentCode: string | null;
  /**
   * Convenience: the dept-group label for this node (root ancestor's
   * description). DBI Inspection Services → "DBI". Pre-resolved so consumers
   * don't have to walk the chain for the common dept-group display case.
   */
  deptGroup: string;
  /** 1 = dept group / root; 2..N = nested levels. */
  level: number;
  /**
   * Effective-date window. `null` means "current; superseded by later effective
   * rows for the same code." A lookup with `asOf` picks the row where
   * `effectiveDate <= asOf` and either `endDate` is null or `endDate > asOf`.
   * v1 starter data has every row with `effectiveDate = '2026-05-20'` (the
   * snapshot date) and `endDate = null`.
   */
  effectiveDate: string;
  endDate: string | null;
}
