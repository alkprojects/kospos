/**
 * lib/payroll/ tests — snapshot grouping + 5-bucket rollup.
 *
 * Synthetic data only. The bucket math mirrors the workbook's Step / Report
 * Data exclusion logic per docs/domain/labor-report.md § Tab 7.
 */

import { describe, it, expect } from 'vitest';
import type { ObiPayrollRow } from '../importers/types';
import { buildPayrollSnapshots, pickLatestSnapshot } from './build';
import { ACCOUNT_DESCRIPTIONS } from './types';

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

describe('buildPayrollSnapshots — 5-bucket math', () => {
  it('routes each known account description into its bucket', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '10001', balanceAmount: 5000, accountDescription: 'Regular Salaries - Misc' }),
      row({ positionIdentifier: '10001', balanceAmount: 500,  accountDescription: ACCOUNT_DESCRIPTIONS.overtime }),
      row({ positionIdentifier: '10001', balanceAmount: 200,  accountDescription: ACCOUNT_DESCRIPTIONS.premium }),
      row({ positionIdentifier: '10001', balanceAmount: 300,  accountDescription: ACCOUNT_DESCRIPTIONS.rpo }),
      row({ positionIdentifier: '10001', balanceAmount: 100,  accountDescription: ACCOUNT_DESCRIPTIONS.tempLsp }),
    ];
    const snaps = buildPayrollSnapshots(rows);
    expect(snaps).toHaveLength(1);
    const p = snaps[0].byPosition.get('10001')!;
    expect(p.regular).toBe(5000);
    expect(p.overtime).toBe(500);
    expect(p.premium).toBe(200);
    expect(p.rpo).toBe(300);
    expect(p.tempLsp).toBe(100);
    expect(p.total).toBe(6100);
  });

  it('treats any unknown account description as regular labor', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '10001', balanceAmount: 1000, accountDescription: 'Vacation Pay' }),
      row({ positionIdentifier: '10001', balanceAmount: 800,  accountDescription: 'Holiday Pay' }),
    ];
    const p = buildPayrollSnapshots(rows)[0].byPosition.get('10001')!;
    expect(p.regular).toBe(1800);
    expect(p.overtime).toBe(0);
    expect(p.premium).toBe(0);
  });

  it('aggregates per-position across multiple rows', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '10001', balanceAmount: 1000, accountDescription: 'Reg' }),
      row({ positionIdentifier: '10001', balanceAmount: 500,  accountDescription: 'Reg' }),
      row({ positionIdentifier: '10002', balanceAmount: 2000, accountDescription: 'Reg' }),
    ];
    const snap = buildPayrollSnapshots(rows)[0];
    expect(snap.byPosition.get('10001')!.total).toBe(1500);
    expect(snap.byPosition.get('10002')!.total).toBe(2000);
    expect(snap.totalBalanceAmount).toBe(3500);
    expect(snap.rowCount).toBe(3);
  });

  it('normalizes position keys (strips leading zeros + whitespace)', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '00010001', balanceAmount: 1000, accountDescription: 'Reg' }),
      row({ positionIdentifier: '10001',    balanceAmount: 500,  accountDescription: 'Reg' }),
      row({ positionIdentifier: ' 10001 ',  balanceAmount: 200,  accountDescription: 'Reg' }),
    ];
    const snap = buildPayrollSnapshots(rows)[0];
    // All three rows collapse onto the same normalized key "10001".
    expect(snap.byPosition.size).toBe(1);
    expect(snap.byPosition.get('10001')!.total).toBe(1700);
  });

  it('returns [] for no rows and skips non-obi rows', () => {
    expect(buildPayrollSnapshots([])).toEqual([]);
    // A row with a different _source should be ignored.
    const bogus = { _source: 'bfm-position', positionIdentifier: '10001', balanceAmount: 999 } as unknown as ObiPayrollRow;
    expect(buildPayrollSnapshots([bogus])).toEqual([]);
  });
});

describe('buildPayrollSnapshots — snapshot grouping', () => {
  it('splits rows by (fiscalYear, asOfDate)', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '10001', balanceAmount: 1000, accountDescription: 'Reg',
            _asOfDate: '2026-04-24', fiscalYear: '2026' }),
      row({ positionIdentifier: '10001', balanceAmount: 1200, accountDescription: 'Reg',
            _asOfDate: '2026-05-08', fiscalYear: '2026' }),
    ];
    const snaps = buildPayrollSnapshots(rows);
    expect(snaps).toHaveLength(2);
    expect(snaps[0].asOfDate).toBe('2026-04-24');
    expect(snaps[0].byPosition.get('10001')!.total).toBe(1000);
    expect(snaps[1].asOfDate).toBe('2026-05-08');
    expect(snaps[1].byPosition.get('10001')!.total).toBe(1200);
  });

  it('falls back to earningPeriodEnd when _asOfDate is missing', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '10001', balanceAmount: 1000, accountDescription: 'Reg',
            _asOfDate: '', earningPeriodEnd: '2026-03-13' }),
    ];
    const snaps = buildPayrollSnapshots(rows);
    expect(snaps[0].asOfDate).toBe('2026-03-13');
  });

  it('sorts snapshots oldest → newest by asOfDate within a fiscal year', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '10001', balanceAmount: 1, accountDescription: 'Reg',
            _asOfDate: '2026-05-08' }),
      row({ positionIdentifier: '10002', balanceAmount: 1, accountDescription: 'Reg',
            _asOfDate: '2026-01-02' }),
      row({ positionIdentifier: '10003', balanceAmount: 1, accountDescription: 'Reg',
            _asOfDate: '2026-03-27' }),
    ];
    const snaps = buildPayrollSnapshots(rows);
    expect(snaps.map(s => s.asOfDate)).toEqual([
      '2026-01-02', '2026-03-27', '2026-05-08',
    ]);
  });
});

describe('pickLatestSnapshot', () => {
  it('returns null on empty input', () => {
    expect(pickLatestSnapshot([])).toBeNull();
  });

  it('returns the snapshot with the highest asOfDate', () => {
    const rows: ObiPayrollRow[] = [
      row({ positionIdentifier: '10001', balanceAmount: 1, accountDescription: 'Reg',
            _asOfDate: '2026-04-24' }),
      row({ positionIdentifier: '10001', balanceAmount: 99, accountDescription: 'Reg',
            _asOfDate: '2026-05-08' }),
    ];
    const snaps = buildPayrollSnapshots(rows);
    const latest = pickLatestSnapshot(snaps)!;
    expect(latest.asOfDate).toBe('2026-05-08');
    expect(latest.byPosition.get('10001')!.total).toBe(99);
  });
});
