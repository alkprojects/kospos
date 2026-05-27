/**
 * Unit tests for `lib/separations/` — entity layer + store CRUD + guard.
 *
 * Covers:
 *   - newSeparationId returns unique strings
 *   - isAllowedSeparationStatusTransition rules (forward / same / backward / skip-forward)
 *   - rollupByStatus across the 4 status buckets
 *   - separationsForPosition with normalized-key join
 *   - separationsForAction
 *   - Store CRUD: addSeparation defaults, updateSeparation field diffing,
 *     updateSeparation no-op when nothing changed, deleteSeparation,
 *     restoreFromSession roundtrip
 *   - updateSeparation override-reason logged only on status field
 *   - addSeparation normalizes positionId
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  CONFIDENCE_LEVEL_ORDER,
  SEPARATION_STATUS_ORDER,
  isAllowedSeparationStatusTransition,
  newSeparationId,
  rollupByStatus,
  separationsForAction,
  separationsForPosition,
  useSeparations,
} from './index';
import type { PendingSeparation } from './index';

afterEach(() => {
  // Reset the singleton store between tests so state doesn't leak.
  useSeparations.getState().clearAll();
});

describe('newSeparationId', () => {
  it('returns unique strings on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newSeparationId());
    expect(ids.size).toBe(50);
  });
});

describe('isAllowedSeparationStatusTransition', () => {
  it('allows same-status (idempotent)', () => {
    expect(isAllowedSeparationStatusTransition('rumored', 'rumored')).toBe(true);
    expect(isAllowedSeparationStatusTransition('cleared', 'cleared')).toBe(true);
  });

  it('allows single forward steps', () => {
    expect(isAllowedSeparationStatusTransition('rumored', 'confirmed')).toBe(true);
    expect(isAllowedSeparationStatusTransition('confirmed', 'paperwork-filed')).toBe(true);
    expect(isAllowedSeparationStatusTransition('paperwork-filed', 'cleared')).toBe(true);
  });

  it('allows skip-forward (rumored → cleared)', () => {
    // Still forward — the user may have learned the final state in one update.
    expect(isAllowedSeparationStatusTransition('rumored', 'cleared')).toBe(true);
    expect(isAllowedSeparationStatusTransition('rumored', 'paperwork-filed')).toBe(true);
  });

  it('blocks backward transitions', () => {
    expect(isAllowedSeparationStatusTransition('confirmed', 'rumored')).toBe(false);
    expect(isAllowedSeparationStatusTransition('paperwork-filed', 'confirmed')).toBe(false);
    expect(isAllowedSeparationStatusTransition('cleared', 'paperwork-filed')).toBe(false);
    expect(isAllowedSeparationStatusTransition('cleared', 'rumored')).toBe(false);
  });
});

describe('SEPARATION_STATUS_ORDER + CONFIDENCE_LEVEL_ORDER', () => {
  it('exposes stable canonical orderings', () => {
    expect([...SEPARATION_STATUS_ORDER]).toEqual([
      'rumored', 'confirmed', 'paperwork-filed', 'cleared',
    ]);
    expect([...CONFIDENCE_LEVEL_ORDER]).toEqual(['low', 'medium', 'high']);
  });
});

describe('rollupByStatus', () => {
  it('returns a 4-bucket strip for empty input', () => {
    const r = rollupByStatus([]);
    expect(r).toHaveLength(4);
    expect(r.map(b => b.status)).toEqual([...SEPARATION_STATUS_ORDER]);
    expect(r.every(b => b.count === 0)).toBe(true);
  });

  it('rolls up counts per status in canonical order', () => {
    const seps: PendingSeparation[] = [
      makeSep({ status: 'rumored' }),
      makeSep({ status: 'rumored' }),
      makeSep({ status: 'paperwork-filed' }),
      makeSep({ status: 'cleared' }),
    ];
    const r = rollupByStatus(seps);
    expect(r.find(b => b.status === 'rumored')!.count).toBe(2);
    expect(r.find(b => b.status === 'confirmed')!.count).toBe(0);
    expect(r.find(b => b.status === 'paperwork-filed')!.count).toBe(1);
    expect(r.find(b => b.status === 'cleared')!.count).toBe(1);
    // Order is stable
    expect(r.map(b => b.status)).toEqual([...SEPARATION_STATUS_ORDER]);
  });
});

describe('separationsForPosition', () => {
  it('matches via normalized position key', () => {
    const seps: PendingSeparation[] = [
      makeSep({ positionId: '99001' }),
      makeSep({ positionId: '12345' }),
    ];
    // Zero-padded query should match unpadded stored id (and vice versa).
    expect(separationsForPosition(seps, '00099001')).toHaveLength(1);
    expect(separationsForPosition(seps, '99001')).toHaveLength(1);
    expect(separationsForPosition(seps, '00000')).toHaveLength(0);
  });

  it('returns empty when the key normalizes to empty', () => {
    const seps: PendingSeparation[] = [makeSep({ positionId: '99001' })];
    expect(separationsForPosition(seps, '')).toEqual([]);
    expect(separationsForPosition(seps, '   ')).toEqual([]);
  });
});

describe('separationsForAction', () => {
  it('matches by linkedActionId', () => {
    const seps: PendingSeparation[] = [
      makeSep({ linkedActionId: 'pa-abc' }),
      makeSep({ linkedActionId: 'pa-xyz' }),
      makeSep({}), // no link
    ];
    expect(separationsForAction(seps, 'pa-abc')).toHaveLength(1);
    expect(separationsForAction(seps, 'pa-xyz')).toHaveLength(1);
    expect(separationsForAction(seps, 'pa-missing')).toEqual([]);
  });

  it('returns empty when actionId is empty', () => {
    const seps: PendingSeparation[] = [makeSep({ linkedActionId: 'pa-abc' })];
    expect(separationsForAction(seps, '')).toEqual([]);
  });
});

describe('useSeparations store', () => {
  it('addSeparation applies sensible defaults', () => {
    const id = useSeparations.getState().addSeparation({ employeeName: 'Smith, A.' });
    const rec = useSeparations.getState().separations.get(id)!;
    expect(rec.employeeName).toBe('Smith, A.');
    expect(rec.status).toBe('rumored');
    expect(rec.confidence).toBe('medium');
    expect(rec.notes).toBe('');
    expect(rec.history).toHaveLength(1);
    expect(rec.history[0].field).toBe('__created');
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('addSeparation normalizes positionId and preserves displayNumber', () => {
    const id = useSeparations.getState().addSeparation({
      employeeName: 'Jones, B.',
      positionId: '00099001', // zero-padded input
    });
    const rec = useSeparations.getState().separations.get(id)!;
    expect(rec.positionId).toBe('99001');           // normalized
    expect(rec.positionDisplayNumber).toBe('00099001'); // preserves original form
  });

  it('addSeparation preserves all provided fields', () => {
    const id = useSeparations.getState().addSeparation({
      employeeName: 'Doe, J.',
      employeeId: '187518',
      positionId: '50001',
      positionDisplayNumber: '50001',
      jobCode: '6278',
      status: 'confirmed',
      confidence: 'high',
      expectedSeparationDate: '2026-06-30',
      separationReason: 'Retirement',
      notes: 'Told me at lunch',
      linkedActionId: 'pa-xyz',
    });
    const rec = useSeparations.getState().separations.get(id)!;
    expect(rec.employeeId).toBe('187518');
    expect(rec.jobCode).toBe('6278');
    expect(rec.status).toBe('confirmed');
    expect(rec.confidence).toBe('high');
    expect(rec.expectedSeparationDate).toBe('2026-06-30');
    expect(rec.separationReason).toBe('Retirement');
    expect(rec.notes).toBe('Told me at lunch');
    expect(rec.linkedActionId).toBe('pa-xyz');
  });

  it('updateSeparation appends history entries for changed fields', () => {
    const id = useSeparations.getState().addSeparation({ employeeName: 'Smith, A.' });
    useSeparations.getState().updateSeparation(id, {
      status: 'confirmed',
      confidence: 'high',
      notes: 'Filed PERS app',
    });
    const rec = useSeparations.getState().separations.get(id)!;
    expect(rec.status).toBe('confirmed');
    expect(rec.confidence).toBe('high');
    expect(rec.notes).toBe('Filed PERS app');
    // 1 __created + 3 field changes = 4 entries
    expect(rec.history).toHaveLength(4);
    const changed = rec.history.slice(1).map(h => h.field).sort();
    expect(changed).toEqual(['confidence', 'notes', 'status']);
  });

  it('updateSeparation is a no-op when nothing actually changed', () => {
    const id = useSeparations.getState().addSeparation({
      employeeName: 'Smith, A.',
      status: 'confirmed',
    });
    const before = useSeparations.getState().separations.get(id)!;
    useSeparations.getState().updateSeparation(id, { status: 'confirmed' });
    const after = useSeparations.getState().separations.get(id)!;
    // No new history entry; reference unchanged.
    expect(after).toBe(before);
    expect(after.history).toHaveLength(1); // just __created
  });

  it('updateSeparation logs overrideReason only on the status field', () => {
    const id = useSeparations.getState().addSeparation({
      employeeName: 'Smith, A.',
      status: 'confirmed',
    });
    useSeparations.getState().updateSeparation(
      id,
      { status: 'rumored', notes: 'Walked it back' },
      'Employee changed mind',
    );
    const rec = useSeparations.getState().separations.get(id)!;
    // The status entry carries the override reason; notes does not.
    const statusEntry = rec.history.find(h => h.field === 'status')!;
    const notesEntry = rec.history.find(h => h.field === 'notes')!;
    expect(statusEntry.overrideReason).toBe('Employee changed mind');
    expect(notesEntry.overrideReason).toBeUndefined();
  });

  it('updateSeparation re-normalizes a patched positionId', () => {
    const id = useSeparations.getState().addSeparation({ employeeName: 'Smith, A.' });
    useSeparations.getState().updateSeparation(id, { positionId: '00099001' });
    const rec = useSeparations.getState().separations.get(id)!;
    expect(rec.positionId).toBe('99001');
  });

  it('updateSeparation is a no-op for unknown ids', () => {
    useSeparations.getState().addSeparation({ employeeName: 'Smith, A.' });
    const before = useSeparations.getState().separations.size;
    useSeparations.getState().updateSeparation('no-such-id', { status: 'cleared' });
    expect(useSeparations.getState().separations.size).toBe(before);
  });

  it('deleteSeparation removes the row and returns true', () => {
    const id = useSeparations.getState().addSeparation({ employeeName: 'Smith, A.' });
    const removed = useSeparations.getState().deleteSeparation(id);
    expect(removed).toBe(true);
    expect(useSeparations.getState().separations.has(id)).toBe(false);
  });

  it('deleteSeparation returns false for unknown ids', () => {
    expect(useSeparations.getState().deleteSeparation('no-such-id')).toBe(false);
  });

  it('restoreFromSession replaces wholesale', () => {
    useSeparations.getState().addSeparation({ employeeName: 'Original' });
    const replacement: PendingSeparation = makeSep({
      id: 'sep-restored',
      employeeName: 'Restored, A.',
    });
    useSeparations.getState().restoreFromSession([['sep-restored', replacement]]);
    expect(useSeparations.getState().separations.size).toBe(1);
    expect(useSeparations.getState().separations.get('sep-restored')!.employeeName)
      .toBe('Restored, A.');
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let __seqId = 0;
function makeSep(overrides: Partial<PendingSeparation>): PendingSeparation {
  __seqId += 1;
  return {
    id: `sep-${__seqId}`,
    employeeName: 'Test Employee',
    status: 'rumored',
    confidence: 'medium',
    notes: '',
    history: [],
    createdAt: '2026-05-27T00:00:00.000Z',
    ...overrides,
  };
}
