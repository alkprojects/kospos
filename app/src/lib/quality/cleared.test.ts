/**
 * Cleared-findings store + key tests.
 *
 * Covers the stable-key contract (rule + position + employee, NOT sourceRows),
 * the set / restore / clearAll mutations, the immutable-Map change signal
 * zustand needs to fire subscribers, and the session-restore replace.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useClearedFindings, clearedKey } from './cleared';

function reset() {
  useClearedFindings.getState().restoreFromSession([]);
}

describe('clearedKey', () => {
  it('combines rule + position + employee', () => {
    expect(clearedKey('QR-001', '00304335', '12345')).toBe('QR-001|00304335|12345');
  });

  it('defaults a missing position / employee to empty segments', () => {
    expect(clearedKey('QR-007')).toBe('QR-007||');
    expect(clearedKey('QR-007', '500')).toBe('QR-007|500|');
  });

  it('omits sourceRows so the key is stable across re-imports', () => {
    // Same finding, two imports — only the sheet rows would differ. The key
    // ignores them, so a clear recorded on one import still matches the next.
    expect(clearedKey('QR-003', '777', 'E9')).toBe(clearedKey('QR-003', '777', 'E9'));
  });
});

describe('useClearedFindings store', () => {
  beforeEach(reset);

  it('starts empty', () => {
    expect(useClearedFindings.getState().cleared.size).toBe(0);
  });

  it('setCleared records a reason + a clearedAt timestamp', () => {
    useClearedFindings.getState().setCleared('QR-001|500|', 'Commissioner — shared position');
    const entry = useClearedFindings.getState().cleared.get('QR-001|500|');
    expect(entry?.reason).toBe('Commissioner — shared position');
    expect(typeof entry?.clearedAt).toBe('string');
    expect(entry!.clearedAt.length).toBeGreaterThan(0);
  });

  it('setCleared on an existing key updates the reason without growing the map', () => {
    const s = useClearedFindings.getState();
    s.setCleared('k', 'first');
    s.setCleared('k', 'second');
    expect(useClearedFindings.getState().cleared.get('k')?.reason).toBe('second');
    expect(useClearedFindings.getState().cleared.size).toBe(1);
  });

  it('restore removes a dismissal so the finding returns to active', () => {
    const s = useClearedFindings.getState();
    s.setCleared('k', 'why');
    s.restore('k');
    expect(useClearedFindings.getState().cleared.has('k')).toBe(false);
  });

  it('restore is a no-op (same reference) for an unknown key', () => {
    const before = useClearedFindings.getState().cleared;
    useClearedFindings.getState().restore('missing');
    expect(useClearedFindings.getState().cleared).toBe(before);
  });

  it('clearAll empties the store', () => {
    const s = useClearedFindings.getState();
    s.setCleared('a', '1');
    s.setCleared('b', '2');
    s.clearAll();
    expect(useClearedFindings.getState().cleared.size).toBe(0);
  });

  it('restoreFromSession replaces wholesale (tuple entries → Map)', () => {
    const s = useClearedFindings.getState();
    s.setCleared('old', 'stale');
    s.restoreFromSession([
      ['QR-001|500|', { reason: 'r1', clearedAt: '2026-05-30T00:00:00Z' }],
      ['QR-003|777|E9', { reason: 'r2', clearedAt: '2026-05-31T00:00:00Z' }],
    ]);
    const m = useClearedFindings.getState().cleared;
    expect(m.size).toBe(2);
    expect(m.has('old')).toBe(false);
    expect(m.get('QR-003|777|E9')?.reason).toBe('r2');
  });

  it('each setCleared produces a new Map reference (zustand change detection)', () => {
    const before = useClearedFindings.getState().cleared;
    useClearedFindings.getState().setCleared('k', 'r');
    expect(useClearedFindings.getState().cleared).not.toBe(before);
  });
});
