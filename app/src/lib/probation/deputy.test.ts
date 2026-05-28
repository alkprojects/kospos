/**
 * Unit tests for `resolveDeputiesFromChain` + `isDeputyTitle` + the
 * legacy `deputy` → `deputies` session-JSON migration shim.
 */

import { describe, it, expect } from 'vitest';
import { isDeputyTitle, resolveDeputiesFromChain } from './deputy';
import { migrateLegacyDeputy } from './store';
import type { Position } from '../positions';
import type { Probation } from './types';

/**
 * Build a Position[] indexed by id with just enough fields populated to
 * exercise the chain walker. Other fields default to safe empties.
 */
function pos(partial: Partial<Position> & { id: string; displayNumber: string; jobCodeDescription: string }): Position {
  return {
    jobCode: '0000',
    positionStatus: 'A',
    fillStatus: 'FILLED',
    maxHeadcount: 1,
    effectiveDept: { code: '', name: '', node: null, hierarchy: [] },
    budgetedDept: { code: '', name: '', node: null, hierarchy: [] },
    positionDivision: '',
    fte: 1,
    budgetJobCode: '0000',
    snapshotDate: '2026-05-20',
    vacantDate: '',
    previousEmployee: '',
    userNotes: '',
    sourceRow: 1,
    roster: { code: '', description: '' },
    ...partial,
  } as Position;
}

function chainMap(positions: Position[]): Map<string, Position> {
  return new Map(positions.map(p => [p.id, p]));
}

describe('isDeputyTitle', () => {
  it('matches case-insensitive "Deputy" as a whole word', () => {
    expect(isDeputyTitle('Deputy Director')).toBe(true);
    expect(isDeputyTitle('Deputy Director Admin')).toBe(true);
    expect(isDeputyTitle('Section Deputy')).toBe(true);
    expect(isDeputyTitle('deputy probation officer')).toBe(true);
    expect(isDeputyTitle('DEPUTY CHIEF')).toBe(true);
  });

  it('does not match non-deputy titles', () => {
    expect(isDeputyTitle('Director')).toBe(false);
    expect(isDeputyTitle('Senior Manager')).toBe(false);
    expect(isDeputyTitle('Assistant Director')).toBe(false);
    expect(isDeputyTitle('Inspector III')).toBe(false);
    expect(isDeputyTitle('')).toBe(false);
  });

  it('does not match partial-word collisions', () => {
    // The word-boundary regex prevents these from matching.
    expect(isDeputyTitle('Deputies Coordinator')).toBe(false);
    expect(isDeputyTitle('Predeputy')).toBe(false);
  });
});

describe('resolveDeputiesFromChain', () => {
  it('returns empty when positionId is empty', () => {
    expect(resolveDeputiesFromChain('', new Map())).toEqual([]);
  });

  it('returns empty when positionsById is empty', () => {
    expect(resolveDeputiesFromChain('50001', new Map())).toEqual([]);
  });

  it('returns empty when the chain has no Deputy ancestors', () => {
    const positions = [
      pos({
        id: '50001', displayNumber: '50001',
        jobCodeDescription: 'Inspector III',
        reportsTo: { positionNumber: '40001', managerFirstName: 'John', managerLastName: 'Smith' },
      }),
      pos({
        id: '40001', displayNumber: '40001',
        jobCodeDescription: 'Senior Manager',
        reportsTo: { positionNumber: '30001', managerFirstName: 'Jane', managerLastName: 'Doe' },
      }),
      pos({
        id: '30001', displayNumber: '30001',
        jobCodeDescription: 'Director',
      }),
    ];
    expect(resolveDeputiesFromChain('50001', chainMap(positions))).toEqual([]);
  });

  it('finds a single Deputy in the chain — uses the child reportsTo names', () => {
    // The Deputy's name lives on the child's reportsTo (denormalized).
    // child(50001) → parent(40001 "Deputy Director", incumbent=Carey McElroy)
    const positions = [
      pos({
        id: '50001', displayNumber: '50001',
        jobCodeDescription: 'Inspector III',
        reportsTo: { positionNumber: '40001', managerFirstName: 'Carey', managerLastName: 'McElroy' },
      }),
      pos({
        id: '40001', displayNumber: '40001',
        jobCodeDescription: 'Deputy Director',
      }),
    ];
    expect(resolveDeputiesFromChain('50001', chainMap(positions))).toEqual(['Carey McElroy']);
  });

  it('finds multiple Deputies up the chain in walk order (closest first)', () => {
    // child(60001) → 50001 Section Deputy (Park, A.)
    //              → 40001 Deputy Director Admin (Lewis-Koskinen, Alex)
    //              → 30001 Director (Top, Big)
    const positions = [
      pos({
        id: '60001', displayNumber: '60001',
        jobCodeDescription: 'Inspector III',
        reportsTo: { positionNumber: '50001', managerFirstName: 'A.', managerLastName: 'Park' },
      }),
      pos({
        id: '50001', displayNumber: '50001',
        jobCodeDescription: 'Section Deputy',
        reportsTo: { positionNumber: '40001', managerFirstName: 'Alex', managerLastName: 'Lewis-Koskinen' },
      }),
      pos({
        id: '40001', displayNumber: '40001',
        jobCodeDescription: 'Deputy Director Admin',
        reportsTo: { positionNumber: '30001', managerFirstName: 'Big', managerLastName: 'Top' },
      }),
      pos({
        id: '30001', displayNumber: '30001',
        jobCodeDescription: 'Director',
      }),
    ];
    expect(resolveDeputiesFromChain('60001', chainMap(positions))).toEqual([
      'A. Park',           // 50001 Section Deputy (closest)
      'Alex Lewis-Koskinen', // 40001 Deputy Director Admin
    ]);
  });

  it('deduplicates by name when the same person heads multiple deputy ancestors', () => {
    const positions = [
      pos({
        id: '60001', displayNumber: '60001',
        jobCodeDescription: 'Inspector III',
        reportsTo: { positionNumber: '50001', managerFirstName: 'Alex', managerLastName: 'Lewis-Koskinen' },
      }),
      pos({
        id: '50001', displayNumber: '50001',
        jobCodeDescription: 'Deputy A',
        reportsTo: { positionNumber: '40001', managerFirstName: 'Alex', managerLastName: 'Lewis-Koskinen' },
      }),
      pos({
        id: '40001', displayNumber: '40001',
        jobCodeDescription: 'Deputy B',
      }),
    ];
    expect(resolveDeputiesFromChain('60001', chainMap(positions))).toEqual([
      'Alex Lewis-Koskinen',
    ]);
  });

  it('skips a Deputy ancestor with a blank incumbent name (vacant position)', () => {
    const positions = [
      pos({
        id: '60001', displayNumber: '60001',
        jobCodeDescription: 'Inspector III',
        reportsTo: { positionNumber: '50001', managerFirstName: '', managerLastName: '' },
      }),
      pos({
        id: '50001', displayNumber: '50001',
        jobCodeDescription: 'Deputy Director',
        reportsTo: { positionNumber: '40001', managerFirstName: 'Alex', managerLastName: 'L.' },
      }),
      pos({
        id: '40001', displayNumber: '40001',
        jobCodeDescription: 'Deputy Admin',
      }),
    ];
    // Section deputy at 50001 is vacant → skipped. Admin deputy at 40001 →
    // its name lives on 50001's reportsTo (Alex L.) — that one is included.
    expect(resolveDeputiesFromChain('60001', chainMap(positions))).toEqual(['Alex L.']);
  });

  it('terminates safely on a cycle without infinite-looping', () => {
    // A → B → A (malformed P&P data; cycle-detection halts the walk)
    const positions = [
      pos({
        id: 'A', displayNumber: 'A',
        jobCodeDescription: 'Deputy Director',
        reportsTo: { positionNumber: 'B', managerFirstName: 'Bee', managerLastName: 'Person' },
      }),
      pos({
        id: 'B', displayNumber: 'B',
        jobCodeDescription: 'Deputy Director',
        reportsTo: { positionNumber: 'A', managerFirstName: 'Aye', managerLastName: 'Person' },
      }),
    ];
    const result = resolveDeputiesFromChain('A', chainMap(positions));
    // Walk: visit A → look at parent B (Deputy) → add A.reportsTo "Bee Person"
    //       visit B → look at parent A (Deputy) → add B.reportsTo "Aye Person"
    //       try to visit A again → seen → break (would otherwise infinite-loop)
    expect(result).toEqual(['Bee Person', 'Aye Person']);
  });

  it('halts when the parent reference is missing from the snapshot', () => {
    const positions = [
      pos({
        id: '60001', displayNumber: '60001',
        jobCodeDescription: 'Inspector III',
        reportsTo: { positionNumber: '50001', managerFirstName: 'Foo', managerLastName: 'Bar' },
      }),
      // 50001 not in the map → walk terminates without finding any deputy.
    ];
    expect(resolveDeputiesFromChain('60001', chainMap(positions))).toEqual([]);
  });

  it('normalizes the parent positionNumber (handles zero-padded keys)', () => {
    const positions = [
      pos({
        id: '60001', displayNumber: '60001',
        jobCodeDescription: 'Inspector III',
        // reportsTo carries the raw zero-padded form; walker normalizes.
        reportsTo: { positionNumber: '00050001', managerFirstName: 'Carey', managerLastName: 'McElroy' },
      }),
      pos({
        id: '50001', displayNumber: '00050001',
        jobCodeDescription: 'Deputy Director',
      }),
    ];
    expect(resolveDeputiesFromChain('60001', chainMap(positions))).toEqual(['Carey McElroy']);
  });
});

describe('migrateLegacyDeputy', () => {
  function baseProbation(overrides: Partial<Probation> & { id: string }): Probation {
    return {
      employeeName: 'Test, A.',
      probationaryPeriodHours: 2080,
      startWorkDate: '2026-01-01',
      extensions: [],
      status: 'open',
      notes: '',
      history: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('promotes a legacy `deputy: "..."` field into `deputies: [...]`', () => {
    const legacy = baseProbation({
      id: 'p1',
      ...({ deputy: 'Park, K.' } as Partial<Probation>),
    });
    const migrated = migrateLegacyDeputy(legacy);
    expect(migrated.deputies).toEqual(['Park, K.']);
    expect((migrated as unknown as { deputy?: string }).deputy).toBeUndefined();
  });

  it('drops an empty legacy `deputy: ""` (no chip added)', () => {
    const legacy = baseProbation({
      id: 'p1',
      ...({ deputy: '   ' } as Partial<Probation>),
    });
    const migrated = migrateLegacyDeputy(legacy);
    expect(migrated.deputies).toBeUndefined();
    expect((migrated as unknown as { deputy?: string }).deputy).toBeUndefined();
  });

  it('keeps the new `deputies` field when both are set (forward-shape wins)', () => {
    const legacy = baseProbation({
      id: 'p1',
      deputies: ['Forward, F.'],
      ...({ deputy: 'Legacy, L.' } as Partial<Probation>),
    });
    const migrated = migrateLegacyDeputy(legacy);
    expect(migrated.deputies).toEqual(['Forward, F.']);
    expect((migrated as unknown as { deputy?: string }).deputy).toBeUndefined();
  });

  it('is a no-op when no legacy field is present', () => {
    const fresh = baseProbation({ id: 'p1', deputies: ['Already, A.'] });
    const migrated = migrateLegacyDeputy(fresh);
    expect(migrated.deputies).toEqual(['Already, A.']);
  });
});
