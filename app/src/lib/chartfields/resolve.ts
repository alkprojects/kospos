import type { ImportedRow, BfmPositionRow, PsHcmPpRow, ObiPayrollRow } from '../importers/types';
import type { ResolvedChartfields } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPostingString(fund: string, dept: string, authority: string, project: string, activity: string): string {
  const parts = [fund, dept, authority, project, activity].map(s => s || '—');
  return parts.join(' / ');
}

/**
 * Normalize a position-number key so the same logical position from different
 * source systems joins correctly.
 *
 * Real-world differences seen across SF exports:
 *   - Leading/trailing whitespace
 *   - Zero-padding ("00001001" in BFM vs "1001" in OBI)
 *
 * Strategy: trim, then strip leading zeros (but keep at least one digit).
 * Non-numeric position numbers (if they exist) pass through unchanged after trim.
 * Empty input returns empty string — callers should skip empty keys.
 */
export function normalizePositionKey(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  // Strip leading zeros only when followed by another digit (so "0" stays "0").
  return trimmed.replace(/^0+(?=\d)/, '');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Joins all loaded rows across BFM Position, HCM P&P, and OBI Payroll and
 * returns one ResolvedChartfields entry per unique position number.
 *
 * Join key: positionNumber (BFM + HCM) / positionIdentifier (OBI), normalized
 * via normalizePositionKey() so zero-padding differences don't break joins.
 *
 * Precedence:
 *   - Fund / Authority / Project / Activity come from BFM Position (budgeted defaults).
 *   - departmentCode / departmentName come from BFM, falling back to HCM if BFM
 *     has no row for this position (and similarly jobCode / jobCodeDescription).
 *   - positionStatus comes from BFM, falling back to HCM.
 *   - fillStatus only exists in HCM (blank when no HCM row).
 *   - If HCM has a comboCode set, hasComboOverride = true. The combo code string is
 *     preserved so the UI can display it; full expansion to Fund/Dept/Authority requires
 *     a ComboCode reference table (not yet imported — Phase 3.5).
 *   - FTE comes from BFM when available, otherwise HCM.
 *   - YTD actuals summed from matching OBI Payroll rows. Positions that appear
 *     only in OBI (e.g. terminated employees with backpay) still get a result
 *     row so their actuals are visible, with dataSources: ['obi'].
 */
export function resolvePositionChartfields(rows: ImportedRow[]): ResolvedChartfields[] {
  const bfmMap = new Map<string, BfmPositionRow>();
  const hcmMap = new Map<string, PsHcmPpRow>();
  const obiActuals = new Map<string, number>();
  // First original (un-normalized) form we see for each key, in source-precedence
  // order (BFM > HCM > OBI). Preserves the user's expected display format
  // (e.g. "00001001" stays padded even though the join key is "1001").
  const displayKey = new Map<string, string>();

  for (const row of rows) {
    if (row._source === 'bfm-position') {
      const key = normalizePositionKey(row.positionNumber);
      if (!key) continue;
      if (!bfmMap.has(key)) {
        bfmMap.set(key, row);
        if (!displayKey.has(key)) displayKey.set(key, row.positionNumber);
      }
    } else if (row._source === 'ps-hcm-pp') {
      const key = normalizePositionKey(row.positionNumber);
      if (!key) continue;
      if (!hcmMap.has(key)) {
        hcmMap.set(key, row);
        if (!displayKey.has(key)) displayKey.set(key, row.positionNumber);
      }
    } else if (row._source === 'obi-payroll') {
      const obiRow = row as ObiPayrollRow;
      const key = normalizePositionKey(obiRow.positionIdentifier);
      if (!key) continue;
      obiActuals.set(key, (obiActuals.get(key) ?? 0) + obiRow.balanceAmount);
      if (!displayKey.has(key)) displayKey.set(key, obiRow.positionIdentifier);
    }
  }

  // Union of all known position keys across all three sources, so positions
  // that appear only in OBI are not silently dropped.
  const allKeys = new Set<string>([...bfmMap.keys(), ...hcmMap.keys(), ...obiActuals.keys()]);

  const results: ResolvedChartfields[] = [];

  for (const key of allKeys) {
    const bfm = bfmMap.get(key);
    const hcm = hcmMap.get(key);
    const ytd = obiActuals.get(key) ?? 0;
    const hasObi = obiActuals.has(key);

    const dataSources: Array<'bfm' | 'hcm' | 'obi'> = [];
    if (bfm) dataSources.push('bfm');
    if (hcm) dataSources.push('hcm');
    if (hasObi) dataSources.push('obi');

    // Chartfield defaults come from BFM; fall back to blanks if no BFM row
    const fund      = bfm?.fund      ?? '';
    const authority = bfm?.authority ?? '';
    const project   = bfm?.project   ?? '';
    const activity  = bfm?.activity  ?? '';
    const deptCode  = bfm?.departmentCode  ?? hcm?.departmentCode  ?? '';
    const deptName  = bfm?.departmentName  ?? hcm?.departmentName  ?? '';

    const comboCode = hcm?.comboCode?.trim() || null;
    const hasComboOverride = comboCode != null && comboCode !== '';

    results.push({
      positionNumber:    displayKey.get(key) ?? key,
      jobCode:           bfm?.jobCode           ?? hcm?.jobCode           ?? '',
      jobCodeDescription: bfm?.jobCodeDescription ?? hcm?.jobCodeDescription ?? '',
      departmentCode:    deptCode,
      departmentName:    deptName,
      fund,
      authority,
      project,
      activity,
      comboCodeOverride: comboCode,
      hasComboOverride,
      positionStatus:    bfm?.positionStatus  ?? hcm?.positionStatus  ?? '',
      fillStatus:        hcm?.fillStatus ?? '',
      fte:               bfm?.fte ?? hcm?.fte ?? 0,
      ytdActuals:        ytd,
      dataSources,
      postingString:     buildPostingString(fund, deptCode, authority, project, activity),
    });
  }

  // Sort by position number, numerically when possible so "1001" sorts before
  // "10001" even after zero-padding has been stripped during normalization.
  results.sort((a, b) =>
    a.positionNumber.localeCompare(b.positionNumber, undefined, { numeric: true }),
  );
  return results;
}
