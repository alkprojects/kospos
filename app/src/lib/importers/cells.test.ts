import { describe, it, expect } from 'vitest';
import { num, str, makeColLookup, iso } from './cells';

describe('num', () => {
  it('coerces numbers and numeric strings; non-numeric / blank → 0', () => {
    expect(num(42)).toBe(42);
    expect(num('42.5')).toBe(42.5);
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
  });
});

describe('str', () => {
  it('trims and stringifies; null / undefined → empty string', () => {
    expect(str('  hi ')).toBe('hi');
    expect(str(42)).toBe('42');
    expect(str(null)).toBe('');
    expect(str(undefined)).toBe('');
  });
});

describe('makeColLookup', () => {
  it('looks up a column index case-insensitively, -1 when absent', () => {
    const col = makeColLookup(['snapshot date', 'position number', 'roster code']);
    expect(col('Position Number')).toBe(1);
    expect(col('ROSTER CODE')).toBe(2);
    expect(col('missing')).toBe(-1);
  });
});

describe('iso', () => {
  it('converts an Excel serial to ISO YYYY-MM-DD', () => {
    expect(iso(46150)).toBe('2026-05-08'); // the value Alex saw on the live site
  });
  it('passes through an already-ISO string', () => {
    expect(iso('2026-05-08')).toBe('2026-05-08');
  });
  it('handles a JS Date', () => {
    expect(iso(new Date(Date.UTC(2026, 4, 8)))).toBe('2026-05-08');
  });
  it('returns empty string for blank / non-positive serials', () => {
    expect(iso('')).toBe('');
    expect(iso(null)).toBe('');
    expect(iso(0)).toBe('');
  });
});
