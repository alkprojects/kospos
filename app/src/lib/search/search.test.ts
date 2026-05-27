/**
 * lib/search/ tests — needle matching rules + edge cases.
 */

import { describe, it, expect } from 'vitest';
import { filterByNeedle, matchesNeedle } from './needle';

describe('matchesNeedle', () => {
  const row = {
    positionNumber: '50001',
    jobCode: '6278',
    jobCodeDescription: 'Building Inspector',
    appointment: {
      name: 'Smith, Jane',
      salaryStep: '5',
      hourlyRate: 50.25,
    },
    balanceAmount: 5000,
    notes: 'Cat 18 set up for 5-year IS project per DHR override',
  };

  it('empty needle matches everything', () => {
    expect(matchesNeedle(row, '')).toBe(true);
    expect(matchesNeedle(row, '   ')).toBe(true);
  });

  it('substring matches a top-level string field', () => {
    expect(matchesNeedle(row, '50001')).toBe(true);
    expect(matchesNeedle(row, 'Building')).toBe(true);
    expect(matchesNeedle(row, 'inspector')).toBe(true);  // case-insensitive
  });

  it('substring matches a nested field', () => {
    expect(matchesNeedle(row, 'Smith')).toBe(true);
    expect(matchesNeedle(row, 'smith, jane')).toBe(true);
  });

  it('matches a numeric field via stringification', () => {
    expect(matchesNeedle(row, '5000')).toBe(true);
    expect(matchesNeedle(row, '50.25')).toBe(true);
  });

  it('non-match returns false', () => {
    expect(matchesNeedle(row, 'zzz')).toBe(false);
    expect(matchesNeedle(row, '99999')).toBe(false);
  });

  it('multi-term needle ANDs across the row (terms can be in different fields)', () => {
    // "Smith 6278" — name in appointment + jobCode at top level.
    expect(matchesNeedle(row, 'Smith 6278')).toBe(true);
    // Both terms present → match.
    expect(matchesNeedle(row, 'building inspector')).toBe(true);
    // One present, one absent → no match.
    expect(matchesNeedle(row, 'Smith zzz')).toBe(false);
  });

  it('ignores boolean and null leaves', () => {
    const r = { a: 'real', b: true, c: null, d: undefined };
    expect(matchesNeedle(r, 'real')).toBe(true);
    expect(matchesNeedle(r, 'true')).toBe(false);   // booleans skipped
  });

  it('survives arrays and Date objects', () => {
    const r = {
      tags: ['foo', 'bar'],
      ts: new Date('2026-05-08T00:00:00Z'),
    };
    expect(matchesNeedle(r, 'bar')).toBe(true);
    expect(matchesNeedle(r, '2026-05-08')).toBe(true);
  });

  it('handles cycles without infinite recursion', () => {
    const a: Record<string, unknown> = { name: 'cyclic' };
    a.self = a;
    expect(matchesNeedle(a, 'cyclic')).toBe(true);
    expect(matchesNeedle(a, 'zzz')).toBe(false);
  });

  it('walks deeply nested objects', () => {
    const r = { x: { y: { z: { w: 'deep' } } } };
    expect(matchesNeedle(r, 'deep')).toBe(true);
  });
});

describe('filterByNeedle', () => {
  const rows = [
    { id: 1, name: 'Alice', dept: 'DBI' },
    { id: 2, name: 'Bob', dept: 'CPC' },
    { id: 3, name: 'Carol', dept: 'DBI' },
  ];

  it('returns a copy when needle is empty', () => {
    const out = filterByNeedle(rows, '');
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);  // copy, not reference
  });

  it('filters by single-term needle', () => {
    expect(filterByNeedle(rows, 'DBI')).toHaveLength(2);
    expect(filterByNeedle(rows, 'Bob')).toEqual([{ id: 2, name: 'Bob', dept: 'CPC' }]);
  });

  it('multi-term AND filter', () => {
    expect(filterByNeedle(rows, 'DBI Alice')).toHaveLength(1);
    expect(filterByNeedle(rows, 'DBI Bob')).toHaveLength(0);   // Bob is CPC
  });
});
