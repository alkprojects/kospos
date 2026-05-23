import type { ImportedRow, BfmPositionRow, PsHcmPpRow, ObiPayrollRow } from '../importers/types';
import type { ResolvedChartfields } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPostingString(fund: string, dept: string, authority: string, project: string, activity: string): string {
  const parts = [fund, dept, authority, project, activity].map(s => s || '—');
  return parts.join(' / ');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Joins all loaded rows across BFM Position, HCM P&P, and OBI Payroll and
 * returns one ResolvedChartfields entry per unique position number.
 *
 * Join key: positionNumber (BFM + HCM) / positionIdentifier (OBI).
 *
 * Precedence:
 *   - Fund / Authority / Project / Activity come from BFM Position (budgeted defaults).
 *   - If HCM has a comboCode set, hasComboOverride = true.  The combo code string is
 *     preserved so the UI can display it; full expansion to Fund/Dept/Authority requires
 *     a ComboCode reference table (not yet imported — Phase 3.5).
 *   - FTE comes from BFM when available, otherwise HCM.
 *   - YTD actuals summed from matching OBI Payroll rows.
 */
export function resolvePositionChartfields(rows: ImportedRow[]): ResolvedChartfields[] {
  const bfmMap = new Map<string, BfmPositionRow>();
  const hcmMap = new Map<string, PsHcmPpRow>();
  const obiActuals = new Map<string, number>();

  for (const row of rows) {
    if (row._source === 'bfm-position') {
      // Keep the first occurrence per position (or you could prefer most-recent)
      if (!bfmMap.has(row.positionNumber)) {
        bfmMap.set(row.positionNumber, row);
      }
    } else if (row._source === 'ps-hcm-pp') {
      if (!hcmMap.has(row.positionNumber)) {
        hcmMap.set(row.positionNumber, row);
      }
    } else if (row._source === 'obi-payroll') {
      const key = (row as ObiPayrollRow).positionIdentifier;
      obiActuals.set(key, (obiActuals.get(key) ?? 0) + (row as ObiPayrollRow).balanceAmount);
    }
  }

  // Union of all known position numbers
  const allKeys = new Set<string>([...bfmMap.keys(), ...hcmMap.keys()]);

  const results: ResolvedChartfields[] = [];

  for (const posNum of allKeys) {
    const bfm = bfmMap.get(posNum);
    const hcm = hcmMap.get(posNum);
    const ytd = obiActuals.get(posNum) ?? 0;

    const dataSources: Array<'bfm' | 'hcm' | 'obi'> = [];
    if (bfm) dataSources.push('bfm');
    if (hcm) dataSources.push('hcm');
    if (ytd !== 0) dataSources.push('obi');

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
      positionNumber:    posNum,
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

  // Sort by position number
  results.sort((a, b) => a.positionNumber.localeCompare(b.positionNumber));
  return results;
}
