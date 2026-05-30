import { describe, it, expect } from 'vitest';
import { rollupByStatus } from './status-rollup';

type S = 'open' | 'closed';
const ORDER = ['open', 'closed'] as const;

describe('rollupByStatus (generic)', () => {
  it('counts items per status in canonical order', () => {
    const items = [{ s: 'open' }, { s: 'closed' }, { s: 'open' }] as { s: S }[];
    const out = rollupByStatus(items, ORDER, i => i.s);
    expect(out).toEqual([
      { status: 'open', count: 2 },
      { status: 'closed', count: 1 },
    ]);
  });

  it('keeps empty buckets (count 0) so the chip strip is stable', () => {
    const out = rollupByStatus([{ s: 'open' as S }], ORDER, i => i.s);
    expect(out).toEqual([
      { status: 'open', count: 1 },
      { status: 'closed', count: 0 },
    ]);
  });

  it('returns every bucket at 0 for an empty input', () => {
    expect(rollupByStatus([] as { s: S }[], ORDER, i => i.s))
      .toEqual([{ status: 'open', count: 0 }, { status: 'closed', count: 0 }]);
  });

  it('ignores items whose status is not in the order', () => {
    const items = [{ s: 'open' }, { s: 'weird' }] as { s: string }[];
    const out = rollupByStatus(items, ORDER, i => i.s as S);
    expect(out).toEqual([{ status: 'open', count: 1 }, { status: 'closed', count: 0 }]);
  });
});
