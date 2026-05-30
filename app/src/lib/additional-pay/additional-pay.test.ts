import { describe, it, expect } from 'vitest';
import type { PsHcmEeAddlPayRow } from '../importers/types';
import {
  buildAdditionalPay,
  rollupByKind,
  classifyRateCode,
} from './build';

// ---------------------------------------------------------------------------
// Helper — a fully-populated row with overridable fields
// ---------------------------------------------------------------------------

function row(over: Partial<PsHcmEeAddlPayRow> = {}): PsHcmEeAddlPayRow {
  return {
    _source: 'ps-hcm-ee-addl-pay',
    departmentGroupCode: 'DBI',
    departmentTitle: 'Dept of Building Inspection',
    emplId: '187518',
    emplRecord: 0,
    effectiveDate: '2026-01-12',
    lastName: 'Smith',
    firstName: 'Jonathan',
    middleName: '',
    preferredFirstName: 'Jon',
    rosterCode: '21',
    rosterDescription: 'SEIU 1021',
    payStatus: 'A',
    jobCode: '6278',
    unionCode: '791',
    salaryPlan: '1',
    step: '5',
    additionalPayAmount: 250.5,
    rateCode: 'ACTFLT',
    _row: 2,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// classifyRateCode
// ---------------------------------------------------------------------------

describe('classifyRateCode', () => {
  it('maps ACTFLT → acting and SUPFLT → supervisory (case-insensitive)', () => {
    expect(classifyRateCode('ACTFLT')).toBe('acting');
    expect(classifyRateCode('supflt')).toBe('supervisory');
    expect(classifyRateCode(' ACTFLT ')).toBe('acting');
  });

  it('maps any other rate code to other', () => {
    expect(classifyRateCode('PREM')).toBe('other');
    expect(classifyRateCode('')).toBe('other');
  });
});

// ---------------------------------------------------------------------------
// buildAdditionalPay
// ---------------------------------------------------------------------------

describe('buildAdditionalPay', () => {
  it('maps the core fields and classifies the kind', () => {
    const [e] = buildAdditionalPay([row()]);
    expect(e.emplId).toBe('187518');
    expect(e.kind).toBe('acting');
    expect(e.rateCode).toBe('ACTFLT');
    expect(e.amount).toBe(250.5);
    expect(e.isActive).toBe(true);
    expect(e.unionCode).toBe('791');
    expect(e.sourceRow).toBe(2);
  });

  it('composes "Last, First", preferring the preferred first name', () => {
    expect(buildAdditionalPay([row()])[0].displayName).toBe('Smith, Jon');
    expect(buildAdditionalPay([row({ preferredFirstName: '' })])[0].displayName)
      .toBe('Smith, Jonathan');
  });

  it('degrades gracefully when a name part is missing', () => {
    expect(buildAdditionalPay([row({ lastName: 'Lee', firstName: '', preferredFirstName: '' })])[0].displayName)
      .toBe('Lee');
    expect(buildAdditionalPay([row({ lastName: '', firstName: 'Robin', preferredFirstName: '' })])[0].displayName)
      .toBe('Robin');
  });

  it('reflects pay status in isActive (only "A" is active)', () => {
    expect(buildAdditionalPay([row({ payStatus: 'A' })])[0].isActive).toBe(true);
    expect(buildAdditionalPay([row({ payStatus: 'I' })])[0].isActive).toBe(false);
    expect(buildAdditionalPay([row({ payStatus: '' })])[0].isActive).toBe(false);
  });

  it('gives each assignment a natural composite id', () => {
    const [e] = buildAdditionalPay([row()]);
    expect(e.id).toBe('187518·0·2026-01-12·ACTFLT');
  });

  it('keeps both an acting and a supervisory row for the same employee', () => {
    const entities = buildAdditionalPay([
      row({ rateCode: 'ACTFLT' }),
      row({ rateCode: 'SUPFLT', additionalPayAmount: 180, _row: 3 }),
    ]);
    expect(entities).toHaveLength(2);
    expect(entities.map(e => e.kind)).toEqual(['acting', 'supervisory']);
    expect(entities[0].id).not.toBe(entities[1].id);
  });
});

// ---------------------------------------------------------------------------
// rollupByKind
// ---------------------------------------------------------------------------

describe('rollupByKind', () => {
  it('counts and sums per-PP dollars by kind in stable order', () => {
    const rollup = rollupByKind(buildAdditionalPay([
      row({ rateCode: 'SUPFLT', additionalPayAmount: 600, _row: 2 }),
      row({ rateCode: 'ACTFLT', additionalPayAmount: 250, _row: 3 }),
      row({ rateCode: 'ACTFLT', additionalPayAmount: 100, _row: 4 }),
      row({ rateCode: 'PREM',   additionalPayAmount: 50,  _row: 5 }),
    ]));
    // Acting first, then supervisory, then other — regardless of input order.
    expect(rollup.map(r => r.kind)).toEqual(['acting', 'supervisory', 'other']);
    expect(rollup[0]).toMatchObject({ count: 2, totalAmount: 350 });
    expect(rollup[1]).toMatchObject({ count: 1, totalAmount: 600 });
    expect(rollup[2]).toMatchObject({ count: 1, totalAmount: 50 });
  });

  it('omits kinds with no entities', () => {
    const rollup = rollupByKind(buildAdditionalPay([row({ rateCode: 'ACTFLT' })]));
    expect(rollup).toHaveLength(1);
    expect(rollup[0].kind).toBe('acting');
  });

  it('returns [] for no entities', () => {
    expect(rollupByKind([])).toEqual([]);
  });
});
