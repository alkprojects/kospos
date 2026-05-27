/**
 * Tests for buildPeopleIndex — the cross-tab employee autocomplete source.
 *
 * Covers:
 *   - Empty positions → empty indexes (no crash, no entries)
 *   - One filled position → one PersonRef indexed both ways
 *   - Vice / acting employee → indexed (vice has its own emplId)
 *   - Dedupes by emplId across positions (first occurrence wins)
 *   - Skips positions missing appointment / vice (vacant slot)
 *   - Output list is alphabetically sorted by name
 */

import { describe, it, expect } from 'vitest';
import { buildPeopleIndex } from './people';
import type { Position } from './types';

function makePosition(overrides: Partial<Position>): Position {
  // Minimal Position shape — only the fields buildPeopleIndex reads matter.
  return {
    id: 'p1',
    displayNumber: '00001',
    jobCode: '6278',
    jobCodeDescription: 'Building Inspector',
    positionStatus: '',
    fillStatus: '',
    maxHeadcount: 1,
    effectiveDept: { code: '', name: '', node: null, hierarchy: [] },
    budgetedDept: { code: '', name: '', node: null, hierarchy: [] },
    positionDivision: '',
    fte: 1,
    budgetJobCode: '',
    snapshotDate: '',
    vacantDate: '',
    previousEmployee: '',
    roster: { code: '', description: '' },
    userNotes: '',
    sourceRow: 1,
    ...overrides,
  } as Position;
}

describe('buildPeopleIndex', () => {
  it('returns empty indexes for empty positions', () => {
    const idx = buildPeopleIndex([]);
    expect(idx.list).toEqual([]);
    expect(idx.byName.size).toBe(0);
    expect(idx.byEmplId.size).toBe(0);
  });

  it('indexes one person from a position appointment', () => {
    const positions: Position[] = [makePosition({
      id: '10001',
      displayNumber: '10001',
      jobCode: '6278',
      appointment: {
        emplId: '187518', name: 'Guaiumi, J.',
        status: 'A', type: 'PCS', exemptCategory: '',
        jobCode: '6278', salaryStep: '5', hourlyRate: 0, meritIncreaseDate: '',
      },
    })];
    const idx = buildPeopleIndex(positions);
    expect(idx.list).toHaveLength(1);
    expect(idx.list[0].emplId).toBe('187518');
    expect(idx.list[0].name).toBe('Guaiumi, J.');
    expect(idx.list[0].positionDisplayNumber).toBe('10001');
    expect(idx.list[0].jobCode).toBe('6278');
    expect(idx.byName.get('Guaiumi, J.')?.emplId).toBe('187518');
    expect(idx.byEmplId.get('187518')?.name).toBe('Guaiumi, J.');
  });

  it('indexes the vice employee separately from the appointment', () => {
    const positions: Position[] = [makePosition({
      id: '10001',
      appointment: {
        emplId: '100', name: 'Incumbent, I.',
        status: 'A', type: 'PCS', exemptCategory: '',
        jobCode: '6278', salaryStep: '5', hourlyRate: 0, meritIncreaseDate: '',
      },
      vice1: { emplId: '200', name: 'Acting, A.' },
    })];
    const idx = buildPeopleIndex(positions);
    expect(idx.list).toHaveLength(2);
    expect(idx.byEmplId.has('100')).toBe(true);
    expect(idx.byEmplId.has('200')).toBe(true);
  });

  it('dedupes by emplId across positions (first occurrence wins)', () => {
    const personA = {
      emplId: '187518', name: 'Guaiumi, J.',
      status: 'A', type: 'PCS', exemptCategory: '',
      jobCode: '6278', salaryStep: '5', hourlyRate: 0, meritIncreaseDate: '',
    };
    const positions: Position[] = [
      makePosition({ id: '10001', displayNumber: '10001', jobCode: '6278', appointment: personA }),
      makePosition({ id: '20002', displayNumber: '20002', jobCode: '9999', appointment: personA }),
    ];
    const idx = buildPeopleIndex(positions);
    expect(idx.list).toHaveLength(1);
    // First occurrence won
    expect(idx.list[0].positionDisplayNumber).toBe('10001');
    expect(idx.list[0].jobCode).toBe('6278');
  });

  it('skips vacant positions (no appointment + no vice)', () => {
    const positions: Position[] = [
      makePosition({ id: '10001' }), // no appointment, no vice
      makePosition({
        id: '20002',
        appointment: {
          emplId: '999', name: 'OnlyOne, O.',
          status: 'A', type: 'PCS', exemptCategory: '',
          jobCode: '', salaryStep: '', hourlyRate: 0, meritIncreaseDate: '',
        },
      }),
    ];
    const idx = buildPeopleIndex(positions);
    expect(idx.list).toHaveLength(1);
    expect(idx.list[0].emplId).toBe('999');
  });

  it('sorts the list alphabetically by name', () => {
    const positions: Position[] = [
      makePosition({
        id: 'p-z',
        appointment: {
          emplId: '3', name: 'Zappa, Z.',
          status: 'A', type: 'PCS', exemptCategory: '',
          jobCode: '', salaryStep: '', hourlyRate: 0, meritIncreaseDate: '',
        },
      }),
      makePosition({
        id: 'p-a',
        appointment: {
          emplId: '1', name: 'Aalto, A.',
          status: 'A', type: 'PCS', exemptCategory: '',
          jobCode: '', salaryStep: '', hourlyRate: 0, meritIncreaseDate: '',
        },
      }),
      makePosition({
        id: 'p-m',
        appointment: {
          emplId: '2', name: 'Mendelssohn, M.',
          status: 'A', type: 'PCS', exemptCategory: '',
          jobCode: '', salaryStep: '', hourlyRate: 0, meritIncreaseDate: '',
        },
      }),
    ];
    const idx = buildPeopleIndex(positions);
    expect(idx.list.map(p => p.name)).toEqual(['Aalto, A.', 'Mendelssohn, M.', 'Zappa, Z.']);
  });

  it('skips appointments/vices with missing emplId or name', () => {
    const positions: Position[] = [makePosition({
      appointment: {
        emplId: '', name: '',
        status: 'A', type: 'PCS', exemptCategory: '',
        jobCode: '', salaryStep: '', hourlyRate: 0, meritIncreaseDate: '',
      },
      vice1: { emplId: '', name: 'OrphanName, O.' }, // partial — skip
    })];
    const idx = buildPeopleIndex(positions);
    expect(idx.list).toEqual([]);
  });
});
