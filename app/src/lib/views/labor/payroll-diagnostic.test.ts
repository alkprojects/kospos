/**
 * Unit tests for `payroll-diagnostic.ts` — fuzzy-match + coverage-stat
 * helpers. Pure data; no React.
 */

import { describe, it, expect } from 'vitest';
import { findNearbyPositions, coverageStats } from './payroll-diagnostic';

describe('findNearbyPositions', () => {
  it('returns same-4-digit-prefix matches when enough are available', () => {
    const snapshot = ['1106101', '1106202', '1106303', '1106404', '9999999'];
    const res = findNearbyPositions('1106950', snapshot);
    expect(res.prefix).toBe('1106');
    expect(res.matches).toEqual(['1106101', '1106202', '1106303', '1106404']);
  });

  it('falls back to 3-digit prefix when 4-digit yields too few matches', () => {
    // The Alex S28 case in miniature: only one 4-digit-prefix neighbor in
    // the snapshot (1106348). The widened net should fall back to "110"
    // and surface 110xxx candidates.
    const snapshot = ['1106348', '1109210', '1107555', '9999999'];
    const res = findNearbyPositions('1106950', snapshot);
    expect(res.prefix).toBe('110');
    // 1106348 + 1109210 + 1107555 all start with "110".
    expect(res.matches).toEqual(['1106348', '1109210', '1107555']);
  });

  it('falls back to 2-digit prefix as the floor when 3-digit still yields too few', () => {
    // Snapshot shares only the 2-digit '11' prefix with 1106950 — '1234567'
    // starts with '12' and so doesn't qualify even at 2-digit.
    const snapshot = ['1199999', '1134567', '9999999'];
    const res = findNearbyPositions('1106950', snapshot);
    expect(res.prefix).toBe('11');
    expect(res.matches).toEqual(['1199999', '1134567']);
  });

  it('returns empty matches when nothing in the snapshot shares any prefix at all', () => {
    const snapshot = ['9999999', '8888888'];
    const res = findNearbyPositions('1106950', snapshot);
    // Falls back to 2-digit prefix "11", finds no matches; returns empty.
    expect(res.prefix).toBe('11');
    expect(res.matches).toEqual([]);
  });

  it('excludes the scoped position itself from results', () => {
    const snapshot = ['1106950', '1106101'];
    const res = findNearbyPositions('1106950', snapshot);
    expect(res.matches).not.toContain('1106950');
    expect(res.matches).toEqual(['1106101']);
  });

  it('respects maxResults cap', () => {
    const snapshot = Array.from({ length: 20 }, (_, i) => `1106${String(i).padStart(3, '0')}`);
    const res = findNearbyPositions('1106999', snapshot, { maxResults: 5 });
    expect(res.matches).toHaveLength(5);
  });

  it('honors minMatches in the fallback decision', () => {
    // 4-digit yields 2 matches; minMatches=3 forces fallback to 3-digit
    // where there are more.
    const snapshot = ['1106111', '1106222', '1109333', '1109444'];
    const res = findNearbyPositions('1106950', snapshot, { minMatches: 3 });
    expect(res.prefix).toBe('110');
    expect(res.matches.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty matches when the scoped id is too short', () => {
    const res = findNearbyPositions('1', ['12', '13']);
    expect(res.matches).toEqual([]);
    expect(res.prefix).toBe('');
  });
});

describe('coverageStats', () => {
  it('reports inBoth + p-and-p-only + obi-only counts correctly', () => {
    const pAndP = ['1000', '1001', '1002', '1003'];
    const obi   = ['1000', '1001', '9999'];
    const stats = coverageStats('1002', pAndP, obi);

    expect(stats.totalPAndP).toBe(4);
    expect(stats.totalObi).toBe(3);
    expect(stats.inBoth).toBe(2);     // 1000, 1001
    expect(stats.pAndPOnly).toBe(2);  // 1002, 1003
    expect(stats.obiOnly).toBe(1);    // 9999
    expect(stats.scopedStatus).toBe('p-and-p-only');
  });

  it('classifies a position present in both snapshots as `in-both`', () => {
    const stats = coverageStats('1000', ['1000'], ['1000']);
    expect(stats.scopedStatus).toBe('in-both');
  });

  it('classifies a position present only in OBI as `obi-only`', () => {
    // Unusual case — payroll rows exist for a position not in the P&P
    // export. Surfaces as a data-quality flag (orphan payroll).
    const stats = coverageStats('1000', [], ['1000']);
    expect(stats.scopedStatus).toBe('obi-only');
  });

  it('classifies a position present in neither snapshot as `orphan`', () => {
    const stats = coverageStats('1000', ['9999'], ['8888']);
    expect(stats.scopedStatus).toBe('orphan');
  });

  it('handles empty inputs without crashing', () => {
    const stats = coverageStats('1000', [], []);
    expect(stats.totalPAndP).toBe(0);
    expect(stats.totalObi).toBe(0);
    expect(stats.inBoth).toBe(0);
    expect(stats.pAndPOnly).toBe(0);
    expect(stats.obiOnly).toBe(0);
    expect(stats.scopedStatus).toBe('orphan');
  });
});
