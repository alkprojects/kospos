/**
 * Unit tests for `lib/probation/` — entity layer + store CRUD + guard +
 * end-date math + derived flag helpers.
 *
 * Covers:
 *   - newProbationId returns unique strings
 *   - isAllowedProbationStatusTransition rules (forward / same / backward /
 *     terminal stickiness)
 *   - rollupByStatus across the 5 status buckets
 *   - probationsForPosition with normalized-key join
 *   - computeBaseEndDate for 1040 + 2080 hour thresholds
 *   - currentEndDate fallback chain (extensions > baseEndDate > computed)
 *   - isApproachingEnd / isPastEndWithoutCompletion derived flags
 *   - Store CRUD: addProbation defaults, updateProbation field diffing,
 *     updateProbation no-op when nothing changed, deleteProbation,
 *     addExtension auto-transitions open → extended,
 *     restoreFromSession roundtrip
 *   - updateProbation override-reason logged only on status field
 *   - addProbation normalizes positionId
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  PROBATION_STATUS_ORDER,
  PROBATIONARY_PERIOD_HOURS,
  computeBaseEndDate,
  currentEndDate,
  isAllowedProbationStatusTransition,
  isApproachingEnd,
  isPastEndWithoutCompletion,
  newProbationId,
  probationsForPosition,
  rollupByStatus,
  useProbations,
} from './index';
import type { Probation } from './index';

afterEach(() => {
  // Reset the singleton store between tests so state doesn't leak.
  useProbations.getState().clearAll();
});

describe('newProbationId', () => {
  it('returns unique strings on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newProbationId());
    expect(ids.size).toBe(50);
  });
});

describe('isAllowedProbationStatusTransition', () => {
  it('allows same-status (idempotent)', () => {
    expect(isAllowedProbationStatusTransition('open', 'open')).toBe(true);
    expect(isAllowedProbationStatusTransition('extended', 'extended')).toBe(true);
    expect(isAllowedProbationStatusTransition('cleared', 'cleared')).toBe(true);
  });

  it('allows forward steps from open', () => {
    expect(isAllowedProbationStatusTransition('open', 'extended')).toBe(true);
    expect(isAllowedProbationStatusTransition('open', 'cleared')).toBe(true);
    expect(isAllowedProbationStatusTransition('open', 'failed')).toBe(true);
    expect(isAllowedProbationStatusTransition('open', 'resigned')).toBe(true);
  });

  it('allows forward steps from extended (no backward to open)', () => {
    expect(isAllowedProbationStatusTransition('extended', 'cleared')).toBe(true);
    expect(isAllowedProbationStatusTransition('extended', 'failed')).toBe(true);
    expect(isAllowedProbationStatusTransition('extended', 'resigned')).toBe(true);
    // Extended → open is backward (extension event is the reason for the
    // transition; can't "un-extend" without override).
    expect(isAllowedProbationStatusTransition('extended', 'open')).toBe(false);
  });

  it('blocks transitions out of terminal statuses', () => {
    expect(isAllowedProbationStatusTransition('cleared', 'open')).toBe(false);
    expect(isAllowedProbationStatusTransition('cleared', 'extended')).toBe(false);
    expect(isAllowedProbationStatusTransition('cleared', 'failed')).toBe(false);
    expect(isAllowedProbationStatusTransition('failed', 'cleared')).toBe(false);
    expect(isAllowedProbationStatusTransition('resigned', 'open')).toBe(false);
  });
});

describe('PROBATION_STATUS_ORDER + PROBATIONARY_PERIOD_HOURS', () => {
  it('exposes stable canonical orderings', () => {
    expect([...PROBATION_STATUS_ORDER]).toEqual([
      'open', 'extended', 'cleared', 'failed', 'resigned',
    ]);
    expect([...PROBATIONARY_PERIOD_HOURS]).toEqual([1040, 2080]);
  });
});

describe('rollupByStatus', () => {
  it('returns a 5-bucket strip for empty input', () => {
    const r = rollupByStatus([]);
    expect(r).toHaveLength(5);
    expect(r.map(b => b.status)).toEqual([...PROBATION_STATUS_ORDER]);
    expect(r.every(b => b.count === 0)).toBe(true);
  });

  it('rolls up counts per status in canonical order', () => {
    const probs: Probation[] = [
      makeProb({ status: 'open' }),
      makeProb({ status: 'open' }),
      makeProb({ status: 'cleared' }),
      makeProb({ status: 'failed' }),
    ];
    const r = rollupByStatus(probs);
    expect(r.find(b => b.status === 'open')!.count).toBe(2);
    expect(r.find(b => b.status === 'extended')!.count).toBe(0);
    expect(r.find(b => b.status === 'cleared')!.count).toBe(1);
    expect(r.find(b => b.status === 'failed')!.count).toBe(1);
    expect(r.find(b => b.status === 'resigned')!.count).toBe(0);
    // Order is stable
    expect(r.map(b => b.status)).toEqual([...PROBATION_STATUS_ORDER]);
  });
});

describe('probationsForPosition', () => {
  it('matches via normalized position key', () => {
    const probs: Probation[] = [
      makeProb({ positionId: '99001' }),
      makeProb({ positionId: '12345' }),
    ];
    // Zero-padded query should match unpadded stored id (and vice versa).
    expect(probationsForPosition(probs, '00099001')).toHaveLength(1);
    expect(probationsForPosition(probs, '99001')).toHaveLength(1);
    expect(probationsForPosition(probs, '00000')).toHaveLength(0);
  });

  it('returns empty when the key normalizes to empty', () => {
    const probs: Probation[] = [makeProb({ positionId: '99001' })];
    expect(probationsForPosition(probs, '')).toEqual([]);
    expect(probationsForPosition(probs, '   ')).toEqual([]);
  });
});

describe('computeBaseEndDate', () => {
  it('adds 364 days for 2080 hours (52 weeks × 7 — lands 1 day shy of calendar year)', () => {
    // 2080 ÷ 40 = 52 weeks exactly = 364 days. Calendar year ≈ 365.25 days,
    // so the computed date is one day short of "Jan 1 next year." CSC Rule
    // 117 completion is hours-tracked not date-tracked; the 1-day gap is
    // advisory only — see computeBaseEndDate comment.
    expect(computeBaseEndDate('2026-01-01', 2080)).toBe('2026-12-31');
  });

  it('adds 182 days for 1040 hours (~6 months)', () => {
    expect(computeBaseEndDate('2026-01-01', 1040)).toBe('2026-07-02');
  });

  it('returns empty for empty / invalid input', () => {
    expect(computeBaseEndDate('', 2080)).toBe('');
    expect(computeBaseEndDate('not-a-date', 2080)).toBe('');
  });
});

describe('currentEndDate', () => {
  it('returns the latest extension when extensions exist', () => {
    const p = makeProb({
      startWorkDate: '2026-01-01',
      probationaryPeriodHours: 2080,
      baseEndDate: '2027-01-01',
      extensions: [
        { extendedAt: '2026-12-01T00:00:00Z', newEndDate: '2027-04-01' },
        { extendedAt: '2027-03-01T00:00:00Z', newEndDate: '2027-07-01' },
      ],
    });
    expect(currentEndDate(p)).toBe('2027-07-01');
  });

  it('returns stored baseEndDate when no extensions', () => {
    const p = makeProb({
      startWorkDate: '2026-01-01',
      probationaryPeriodHours: 2080,
      baseEndDate: '2027-01-01',
      extensions: [],
    });
    expect(currentEndDate(p)).toBe('2027-01-01');
  });

  it('computes baseEndDate lazily when not stored', () => {
    const p = makeProb({
      startWorkDate: '2026-01-01',
      probationaryPeriodHours: 1040,
      baseEndDate: undefined,
      extensions: [],
    });
    expect(currentEndDate(p)).toBe('2026-07-02');
  });

  it('returns empty when neither extension nor start date is known', () => {
    const p = makeProb({
      startWorkDate: '',
      probationaryPeriodHours: 2080,
      baseEndDate: undefined,
      extensions: [],
    });
    expect(currentEndDate(p)).toBe('');
  });
});

describe('isApproachingEnd', () => {
  it('is true when end is within 30 days and status is non-terminal', () => {
    const p = makeProb({
      status: 'open',
      startWorkDate: '2026-01-01',
      probationaryPeriodHours: 2080,
      baseEndDate: '2026-06-10',
    });
    // 25 days before end
    expect(isApproachingEnd(p, '2026-05-16')).toBe(true);
  });

  it('is false when end is more than daysAhead away', () => {
    const p = makeProb({
      status: 'open',
      baseEndDate: '2027-01-01',
    });
    expect(isApproachingEnd(p, '2026-01-01')).toBe(false);
  });

  it('is false when status is terminal', () => {
    const p = makeProb({
      status: 'cleared',
      baseEndDate: '2026-06-10',
    });
    expect(isApproachingEnd(p, '2026-05-16')).toBe(false);
  });

  it('is false when end is already in the past', () => {
    const p = makeProb({
      status: 'open',
      baseEndDate: '2026-01-01',
    });
    expect(isApproachingEnd(p, '2026-05-16')).toBe(false);
  });
});

describe('isPastEndWithoutCompletion', () => {
  it('is true when end is today or past AND status is non-terminal', () => {
    const p = makeProb({
      status: 'open',
      baseEndDate: '2026-05-01',
    });
    expect(isPastEndWithoutCompletion(p, '2026-05-16')).toBe(true);
    // Same-day counts as past
    expect(isPastEndWithoutCompletion(p, '2026-05-01')).toBe(true);
  });

  it('is false when end is in the future', () => {
    const p = makeProb({
      status: 'open',
      baseEndDate: '2027-01-01',
    });
    expect(isPastEndWithoutCompletion(p, '2026-05-16')).toBe(false);
  });

  it('is false when status is terminal (even past end)', () => {
    const p = makeProb({
      status: 'cleared',
      baseEndDate: '2026-05-01',
    });
    expect(isPastEndWithoutCompletion(p, '2026-05-16')).toBe(false);
  });

  it('uses the latest extension when extensions exist', () => {
    const p = makeProb({
      status: 'extended',
      baseEndDate: '2026-01-01', // long past
      extensions: [
        { extendedAt: '2025-12-01T00:00:00Z', newEndDate: '2027-01-01' }, // future
      ],
    });
    expect(isPastEndWithoutCompletion(p, '2026-05-16')).toBe(false);
  });
});

describe('useProbations store', () => {
  it('addProbation applies sensible defaults', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Smith, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.employeeName).toBe('Smith, A.');
    expect(rec.status).toBe('open');
    expect(rec.notes).toBe('');
    expect(rec.extensions).toEqual([]);
    expect(rec.probationaryPeriodHours).toBe(2080);
    expect(rec.history).toHaveLength(1);
    expect(rec.history[0].field).toBe('__created');
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('addProbation normalizes positionId and preserves displayNumber', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Jones, B.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      positionId: '00099001', // zero-padded input
    });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.positionId).toBe('99001');           // normalized
    expect(rec.positionDisplayNumber).toBe('00099001'); // preserves original form
  });

  it('addProbation preserves all provided fields', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Doe, J.',
      employeeId: '187518',
      positionId: '50001',
      positionDisplayNumber: '50001',
      jobCode: '6278',
      probationaryPeriodHours: 1040,
      startWorkDate: '2026-01-01',
      baseEndDate: '2026-07-02',
      status: 'extended',
      supervisor: 'Carey McElroy',
      deputies: ['Park, Deputy', 'Lewis-Koskinen, Alex'],
      notes: 'Cat 16 part-time',
    });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.employeeId).toBe('187518');
    expect(rec.jobCode).toBe('6278');
    expect(rec.status).toBe('extended');
    expect(rec.probationaryPeriodHours).toBe(1040);
    expect(rec.startWorkDate).toBe('2026-01-01');
    expect(rec.baseEndDate).toBe('2026-07-02');
    expect(rec.supervisor).toBe('Carey McElroy');
    expect(rec.deputies).toEqual(['Park, Deputy', 'Lewis-Koskinen, Alex']);
    expect(rec.notes).toBe('Cat 16 part-time');
  });

  it('addProbation drops empty deputies array to undefined', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Doe, J.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      deputies: [],
    });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.deputies).toBeUndefined();
  });

  it('updateProbation logs deputies field changes in history audit', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Test, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    useProbations.getState().updateProbation(id, { deputies: ['Lee, J.', 'Park, K.'] });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.deputies).toEqual(['Lee, J.', 'Park, K.']);
    const deputyEntry = rec.history.find(h => h.field === 'deputies');
    expect(deputyEntry).toBeDefined();
    expect(deputyEntry?.after).toEqual(['Lee, J.', 'Park, K.']);
  });

  it('updateProbation appends history entries for changed fields', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Smith, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    useProbations.getState().updateProbation(id, {
      status: 'cleared',
      completionDate: '2027-01-01',
      notes: 'Passed',
    });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.status).toBe('cleared');
    expect(rec.completionDate).toBe('2027-01-01');
    expect(rec.notes).toBe('Passed');
    // 1 __created + 3 field changes = 4 entries
    expect(rec.history).toHaveLength(4);
    const changed = rec.history.slice(1).map(h => h.field).sort();
    expect(changed).toEqual(['completionDate', 'notes', 'status']);
  });

  it('updateProbation is a no-op when nothing actually changed', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Smith, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'open',
    });
    const before = useProbations.getState().probations.get(id)!;
    useProbations.getState().updateProbation(id, { status: 'open' });
    const after = useProbations.getState().probations.get(id)!;
    // No new history entry; reference unchanged.
    expect(after).toBe(before);
    expect(after.history).toHaveLength(1); // just __created
  });

  it('updateProbation logs overrideReason only on the status field', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Smith, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'cleared',
    });
    useProbations.getState().updateProbation(
      id,
      { status: 'open', notes: 'Reopened — clerical error' },
      'Wrong outcome recorded',
    );
    const rec = useProbations.getState().probations.get(id)!;
    // The status entry carries the override reason; notes does not.
    const statusEntry = rec.history.find(h => h.field === 'status')!;
    const notesEntry = rec.history.find(h => h.field === 'notes')!;
    expect(statusEntry.overrideReason).toBe('Wrong outcome recorded');
    expect(notesEntry.overrideReason).toBeUndefined();
  });

  it('updateProbation re-normalizes a patched positionId', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Smith, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    useProbations.getState().updateProbation(id, { positionId: '00099001' });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.positionId).toBe('99001');
  });

  it('updateProbation is a no-op for unknown ids', () => {
    useProbations.getState().addProbation({
      employeeName: 'Smith, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    const before = useProbations.getState().probations.size;
    useProbations.getState().updateProbation('no-such-id', { status: 'cleared' });
    expect(useProbations.getState().probations.size).toBe(before);
  });

  it('addExtension appends extension and auto-transitions open → extended', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Extending, E.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      baseEndDate: '2027-01-01',
    });
    useProbations.getState().addExtension(id, {
      newEndDate: '2027-04-01',
      reason: 'Caseload backlog — performance plan ongoing',
    });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.extensions).toHaveLength(1);
    expect(rec.extensions[0].newEndDate).toBe('2027-04-01');
    expect(rec.extensions[0].reason).toContain('Caseload');
    expect(rec.status).toBe('extended');
    // 1 __created + 1 extensions field entry + 1 auto-status transition = 3
    expect(rec.history).toHaveLength(3);
  });

  it('addExtension keeps status when already extended', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'AlreadyExtended, E.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      status: 'extended',
    });
    useProbations.getState().addExtension(id, { newEndDate: '2027-07-01' });
    useProbations.getState().addExtension(id, { newEndDate: '2027-10-01' });
    const rec = useProbations.getState().probations.get(id)!;
    expect(rec.extensions).toHaveLength(2);
    expect(rec.status).toBe('extended');
    // Status field only logged on the first auto-transition (which didn't
    // happen here because we started in extended); subsequent extensions
    // only log their own field.
    const statusEntries = rec.history.filter(h => h.field === 'status');
    expect(statusEntries).toHaveLength(0);
  });

  it('addExtension is a no-op for unknown ids', () => {
    useProbations.getState().addExtension('no-such-id', { newEndDate: '2027-01-01' });
    expect(useProbations.getState().probations.size).toBe(0);
  });

  it('deleteProbation removes the row and returns true', () => {
    const id = useProbations.getState().addProbation({
      employeeName: 'Doomed, Row',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    const removed = useProbations.getState().deleteProbation(id);
    expect(removed).toBe(true);
    expect(useProbations.getState().probations.has(id)).toBe(false);
  });

  it('deleteProbation returns false for unknown ids', () => {
    expect(useProbations.getState().deleteProbation('no-such-id')).toBe(false);
  });

  it('restoreFromSession replaces wholesale', () => {
    useProbations.getState().addProbation({
      employeeName: 'Original',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
    });
    const replacement: Probation = makeProb({
      id: 'prob-restored',
      employeeName: 'Restored, A.',
    });
    useProbations.getState().restoreFromSession([['prob-restored', replacement]]);
    expect(useProbations.getState().probations.size).toBe(1);
    expect(useProbations.getState().probations.get('prob-restored')!.employeeName)
      .toBe('Restored, A.');
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let __seqId = 0;
function makeProb(overrides: Partial<Probation>): Probation {
  __seqId += 1;
  return {
    id: `prob-${__seqId}`,
    employeeName: 'Test Employee',
    probationaryPeriodHours: 2080,
    startWorkDate: '2026-01-01',
    extensions: [],
    status: 'open',
    notes: '',
    history: [],
    createdAt: '2026-05-27T00:00:00.000Z',
    ...overrides,
  };
}
