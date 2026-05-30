import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeId } from './id';

afterEach(() => vi.unstubAllGlobals());

describe('makeId', () => {
  it('uses crypto.randomUUID when available (prefix ignored)', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'fixed-uuid-1234' });
    expect(makeId('sep')).toBe('fixed-uuid-1234');
  });

  it('falls back to a prefixed millisecond+random id when randomUUID is absent', () => {
    vi.stubGlobal('crypto', {});
    expect(makeId('prob')).toMatch(/^prob-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('gives distinct ids on repeated fallback calls', () => {
    vi.stubGlobal('crypto', {});
    expect(makeId('pa')).not.toBe(makeId('pa'));
  });
});
