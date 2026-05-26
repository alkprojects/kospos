/**
 * Starter dept-tree data — DBI and CPC departments observed in the
 * 2026-05-20 P&P snapshot (per labor-report.md § Tab 6 P&P Data "Department
 * spread" + the citywide dept tree's parent-of-DBI / parent-of-CPC structure).
 *
 * Hand-curated from the snapshot — covers every department-code Alex's
 * current workbook touches. The full citywide 14,240-row tree gets loaded
 * via a future `lib/importers/dept-tree/` CSV importer (Phase 2.4 importer
 * wiring); for now this seed lets the spine view + parity tests work without
 * requiring the user to upload a separate dept-tree file.
 *
 * Code structure (6-digit PS HCM):
 *   - 22xxxx = CPC (City Planning)
 *   - 23xxxx = DBI (Building Inspection)
 *
 * To add a department: append a row here. Effective date defaults to the
 * snapshot date so historical lookups keep working unchanged.
 */

import type { DepartmentNode } from './types';

const SNAPSHOT_DATE = '2026-05-20';

export const SEED_DEPARTMENT_TREE: DepartmentNode[] = [
  // ---- DBI dept group + divisions ------------------------------------------
  { code: '230000', description: 'Department of Building Inspection', parentCode: null,
    deptGroup: 'DBI', level: 1, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '232000', description: 'DBI Inspection Services', parentCode: '230000',
    deptGroup: 'DBI', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '233000', description: 'DBI Permit Services', parentCode: '230000',
    deptGroup: 'DBI', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '231000', description: 'DBI Administration', parentCode: '230000',
    deptGroup: 'DBI', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },

  // ---- CPC dept group + divisions ------------------------------------------
  { code: '229000', description: 'Department of City Planning', parentCode: null,
    deptGroup: 'CPC', level: 1, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '229235', description: 'CPC Current Planning', parentCode: '229000',
    deptGroup: 'CPC', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '229240', description: 'CPC Citywide Planning', parentCode: '229000',
    deptGroup: 'CPC', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '229245', description: 'CPC Environmental Planning', parentCode: '229000',
    deptGroup: 'CPC', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '229250', description: 'CPC Zoning Administration', parentCode: '229000',
    deptGroup: 'CPC', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '229255', description: 'CPC Administration', parentCode: '229000',
    deptGroup: 'CPC', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '229260', description: 'CPC Information & Analysis', parentCode: '229000',
    deptGroup: 'CPC', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
  { code: '229265', description: 'CPC Historic Preservation', parentCode: '229000',
    deptGroup: 'CPC', level: 2, effectiveDate: SNAPSHOT_DATE, endDate: null },
];
