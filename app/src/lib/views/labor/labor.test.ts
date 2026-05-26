/**
 * lib/views/labor/ tests — filter math + aggregate math for the Tab 7
 * drill-down view. Synthetic rows only.
 */

import { describe, it, expect } from 'vitest';
import type { ObiPayrollRow } from '../../importers/types';
import { ACCOUNT_DESCRIPTIONS } from '../../payroll';
import {
  EMPTY_FILTERS, aggregate, applyFilters, bucketOf, distinctValues,
} from './aggregate';

function row(
  partial: Partial<ObiPayrollRow> & {
    positionIdentifier: string;
    balanceAmount: number;
    accountDescription: string;
  },
): ObiPayrollRow {
  return {
    _source: 'obi-payroll',
    fiscalYear: '2026',
    departmentGroupCode: 'DBI',
    fundLvl1Code: '',
    fundLvl1Description: '',
    fundControl: '',
    fund: '10190',
    fundDescription: '',
    departmentCode: '',
    departmentName: '',
    projectCode: '',
    projectDescription: '',
    activityCode: '',
    activityDescription: '',
    authorityLvl1Code: '',
    authorityLvl1Description: '',
    authority: '',
    authorityDescription: '',
    accountLvl2Description: '',
    accountLvl5Name: '',
    accountLvl3Description: '',
    accountCode: '',
    earningPeriodNumber: 0,
    earningPeriodEnd: '2026-05-08',
    personNumber: '12345',
    personFullName: 'Smith, Jane',
    rosterCode: '',
    earningsCode: 'WKP',
    earningsDescription: '',
    jobCode: '6278',
    jobCodeSet: 'COMMN',
    jobDescription: 'Building Inspector',
    assignmentNumber: 0,
    appointmentType: 'PCS',
    isFteHours: 'Y',
    earningHours: 80,
    payPeriodFTE: 1,
    _asOfDate: '2026-05-08',
    _row: 1,
    ...partial,
  };
}

describe('bucketOf', () => {
  it('routes the 4 special-class literals correctly + everything else to regular', () => {
    expect(bucketOf(ACCOUNT_DESCRIPTIONS.overtime)).toBe('overtime');
    expect(bucketOf(ACCOUNT_DESCRIPTIONS.rpo)).toBe('rpo');
    expect(bucketOf(ACCOUNT_DESCRIPTIONS.premium)).toBe('premium');
    expect(bucketOf(ACCOUNT_DESCRIPTIONS.tempLsp)).toBe('tempLsp');
    expect(bucketOf('Regular Salaries - Misc')).toBe('regular');
    expect(bucketOf('')).toBe('regular');
    // Strings that look similar but aren't an exact match still go to regular —
    // the workbook's SUMIFS is a literal-equality check.
    expect(bucketOf('Overtime')).toBe('regular');
  });
});

describe('applyFilters', () => {
  const rows: ObiPayrollRow[] = [
    row({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc', earningsCode: 'WKP', earningPeriodEnd: '2026-04-24' }),
    row({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc', earningsCode: 'WKP', earningPeriodEnd: '2026-05-08' }),
    row({ positionIdentifier: '10001', balanceAmount: 500,  accountDescription: ACCOUNT_DESCRIPTIONS.overtime, earningsCode: 'OTP', earningPeriodEnd: '2026-05-08' }),
    row({ positionIdentifier: '10002', balanceAmount: 4500, accountDescription: 'Regular Salaries - Misc', earningsCode: 'WKP', earningPeriodEnd: '2026-05-08' }),
    row({ positionIdentifier: '10003', balanceAmount: 1200, accountDescription: ACCOUNT_DESCRIPTIONS.premium, earningsCode: 'PRP', earningPeriodEnd: '2026-04-24' }),
  ];

  it('returns all rows with empty filters', () => {
    expect(applyFilters(rows, EMPTY_FILTERS)).toHaveLength(5);
  });

  it('filters by positionId (normalized)', () => {
    const out = applyFilters(rows, { ...EMPTY_FILTERS, positionId: '10001' });
    expect(out).toHaveLength(3);
    expect(out.every(r => r.positionIdentifier === '10001')).toBe(true);
  });

  it('filters by earningsCode', () => {
    const out = applyFilters(rows, { ...EMPTY_FILTERS, earningsCode: 'OTP' });
    expect(out).toHaveLength(1);
    expect(out[0].accountDescription).toBe(ACCOUNT_DESCRIPTIONS.overtime);
  });

  it('filters by accountDescription', () => {
    const out = applyFilters(rows, { ...EMPTY_FILTERS, accountDescription: ACCOUNT_DESCRIPTIONS.premium });
    expect(out).toHaveLength(1);
    expect(out[0].positionIdentifier).toBe('10003');
  });

  it('filters by PPE range (inclusive bounds)', () => {
    const out = applyFilters(rows, {
      ...EMPTY_FILTERS, pperStart: '2026-05-01', pperEnd: '2026-05-15',
    });
    expect(out).toHaveLength(3);
    expect(out.every(r => r.earningPeriodEnd === '2026-05-08')).toBe(true);
  });

  it('combines filters — position + earnings + PPE range', () => {
    const out = applyFilters(rows, {
      positionId: '10001', earningsCode: 'WKP',
      accountDescription: '',
      pperStart: '2026-05-01', pperEnd: '2026-05-15',
    });
    expect(out).toHaveLength(1);
    expect(out[0].balanceAmount).toBe(5000);
    expect(out[0].earningPeriodEnd).toBe('2026-05-08');
  });

  it('matches positionIdentifier after zero-strip normalization', () => {
    // The normalized form drops leading zeros — so a scope of "10001" should
    // match a row whose raw positionIdentifier is "0010001".
    const padded: ObiPayrollRow[] = [
      row({ positionIdentifier: '0010001', balanceAmount: 1234, accountDescription: 'Regular Salaries - Misc' }),
    ];
    const out = applyFilters(padded, { ...EMPTY_FILTERS, positionId: '10001' });
    expect(out).toHaveLength(1);
  });
});

describe('aggregate', () => {
  const rows: ObiPayrollRow[] = [
    row({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc', earningHours: 80 }),
    row({ positionIdentifier: '10001', balanceAmount: 500,  accountDescription: ACCOUNT_DESCRIPTIONS.overtime, earningHours: 5 }),
    row({ positionIdentifier: '10001', balanceAmount: 200,  accountDescription: ACCOUNT_DESCRIPTIONS.premium,  earningHours: 0 }),
    row({ positionIdentifier: '10001', balanceAmount: 300,  accountDescription: ACCOUNT_DESCRIPTIONS.rpo,      earningHours: 0 }),
    row({ positionIdentifier: '10001', balanceAmount: 100,  accountDescription: ACCOUNT_DESCRIPTIONS.tempLsp,  earningHours: 0 }),
  ];

  it('routes amounts into the 5 buckets and sums total + hours', () => {
    const out = aggregate(rows);
    expect(out.rowCount).toBe(5);
    expect(out.regular).toBe(5000);
    expect(out.overtime).toBe(500);
    expect(out.premium).toBe(200);
    expect(out.rpo).toBe(300);
    expect(out.tempLsp).toBe(100);
    expect(out.total).toBe(6100);
    expect(out.totalHours).toBe(85);
  });

  it('returns zeros for an empty row list', () => {
    const out = aggregate([]);
    expect(out.rowCount).toBe(0);
    expect(out.total).toBe(0);
    expect(out.regular).toBe(0);
    expect(out.totalHours).toBe(0);
  });
});

describe('distinctValues', () => {
  const rows: ObiPayrollRow[] = [
    row({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc', earningsCode: 'WKP' }),
    row({ positionIdentifier: '10001', balanceAmount: 500,  accountDescription: ACCOUNT_DESCRIPTIONS.overtime, earningsCode: 'OTP' }),
    row({ positionIdentifier: '10002', balanceAmount: 4500, accountDescription: 'Regular Salaries - Misc', earningsCode: 'WKP' }),
    row({ positionIdentifier: '10003', balanceAmount: 0,    accountDescription: '', earningsCode: '' }),
  ];

  it('returns the distinct non-empty values, sorted', () => {
    expect(distinctValues(rows, 'earningsCode')).toEqual(['OTP', 'WKP']);
    expect(distinctValues(rows, 'accountDescription')).toEqual([
      ACCOUNT_DESCRIPTIONS.overtime,
      'Regular Salaries - Misc',
    ]);
  });
});
