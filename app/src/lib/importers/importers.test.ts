/**
 * Importer unit tests — synthetic data only, no real PII.
 *
 * Each test builds a minimal in-memory worksheet using SheetJS utilities,
 * runs the importer, and asserts the output shape and values.
 * Column names match real DBI exports (May 2026).
 */

import { describe, it, expect } from 'vitest';
import { utils } from 'xlsx';
import type { WorkSheet } from 'xlsx';
import { detect } from './detect';
import { importBfmPosition } from './bfm-position';
import { importBfmNonPosition } from './bfm-non-position';
import { importPsHcmPp } from './ps-hcm-pp';
import { importObiPayroll } from './obi-payroll';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSheet(rows: unknown[][]): WorkSheet {
  return utils.aoa_to_sheet(rows);
}

// ---------------------------------------------------------------------------
// detect()
// ---------------------------------------------------------------------------

describe('detect', () => {
  it('identifies bfm-position by fingerprint columns', () => {
    const ws = makeSheet([
      ['BY HCM Position#', 'Job Class', 'Status', 'Dept ID', 'Ret Indicator',
       'Dept ID Title', 'Job Class Title', 'Emp Org', 'Fund', 'FY 2026-27 Mayor FTE', 'FY 2026-27 Mayor'],
      ['10001', '6278_C', 'A', 'DBI', '1', 'Dept of Building Inspection', 'Building Inspector', '21', '1GAGF', 1, 120000],
    ]);
    expect(detect(ws).type).toBe('bfm-position');
  });

  it('identifies bfm-non-position by fingerprint columns', () => {
    const ws = makeSheet([
      ['GFS Type', 'Dept ID', 'Account', 'Account Title', 'Account Lvl 5 Title', 'Change Type',
       'Dept ID Title', 'Fund', 'Authority', 'FY 2026-27 Mayor'],
      ['Labor', 'DBI', '501010', 'Regular Salaries', 'Salaries & Wages', 'Ongoing', 'DBI', '1GAGF', 'AUTH1', 500000],
    ]);
    expect(detect(ws).type).toBe('bfm-non-position');
  });

  it('identifies ps-hcm-pp by fingerprint columns', () => {
    const ws = makeSheet([
      ['Snapshot Date', 'Position Number', 'Position Job Code', 'Position Description',
       'Position Department ID', 'Position Department Description', 'Position Status',
       'Position Fill Status', 'Current Employee ID', 'Person Full Name',
       'Employee Appointment Type', 'Employee Step', 'Employee Hourly Rate',
       'Position Reports To', 'Roster Code', 'Roster Code Description',
       'RTF Status', 'RTF Expected Fill date', 'Budget Position Total FTE',
       'Combo Code', 'Employee Job Code'],
      ['2024-08-30', '10001', '6278', 'Building Inspector', 'DBI', 'Dept of Building Inspection',
       'Approved', 'FILLED', 'E12345', 'Smith, Jane', 'PCS', '5', 63.46,
       '09000', '21', 'SEIU 1021', '', '', 1, 'C1234', '6278'],
    ]);
    expect(detect(ws).type).toBe('ps-hcm-pp');
  });

  it('identifies obi-payroll by fingerprint columns', () => {
    const ws = makeSheet([
      ['Fiscal Year', 'Department', 'Department Description', 'Position Identifier',
       'Person Number', 'Person Full Name', 'Job Code', 'Job Description',
       'Account', 'Fund Code', 'Authority Code', 'Earning Period Number',
       'Earning Period End Date', 'Earnings Code', 'Earnings Code Description',
       'Balance Amount', 'Pay Period FTE', 'HR Assignment Appointment Type'],
      ['FY2024', 'DBI', 'Dept of Building Inspection', '10001',
       '12345', 'Smith, Jane', 'COMMN:6278', 'Building Inspector',
       '501010', '1GAGF', 'AUTH1', 15,
       '2024-01-26', 'WKP', 'Regular Biweekly Pay',
       4846.15, 1, 'PCS'],
    ]);
    expect(detect(ws).type).toBe('obi-payroll');
  });

  it('returns unknown for an unrecognized sheet', () => {
    const ws = makeSheet([
      ['Foo', 'Bar', 'Baz'],
      [1, 2, 3],
    ]);
    expect(detect(ws).type).toBe('unknown');
  });

  it('detects when headers are on row 1 (title row above)', () => {
    const ws = makeSheet([
      ['BFM Position Eturn — FY2026-27'],
      ['BY HCM Position#', 'Job Class', 'Status', 'Dept ID', 'Ret Indicator'],
      ['10001', '6278_C', 'A', 'DBI', '1'],
    ]);
    const result = detect(ws);
    expect(result.type).toBe('bfm-position');
    expect(result.headerRow).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// importBfmPosition
// ---------------------------------------------------------------------------

describe('importBfmPosition', () => {
  const HEADERS = [
    'BY HCM Position#', 'Prior Budget HCM Position#', 'Dept ID', 'Dept ID Title',
    'Job Class', 'Job Class Title', 'Emp Org', 'Ret Indicator', 'Status',
    'Fund', 'Authority', 'Project', 'Activity', 'Fiscal Year Start',
    'FY 2026-27 Mayor FTE', 'FY 2026-27 Mayor',
  ];

  it('parses a minimal BFM position sheet and picks the phase column', () => {
    const ws = makeSheet([
      HEADERS,
      ['10001', '10001', 'DBI', 'Dept of Building Inspection',
       '6278_C', 'Building Inspector', '21', '1', 'A',
       '1GAGF', 'AUTH1', '', '', '2027',
       1, 120000],
      ['10002', '10002', 'DBI', 'Dept of Building Inspection',
       '9774_C', 'Senior Inspector', '21', '1', 'I',
       '1GAGF', 'AUTH1', '', '', '2027',
       1, 150000],
    ]);
    const rows = importBfmPosition(ws);
    expect(rows).toHaveLength(2);
    expect(rows[0].positionNumber).toBe('10001');
    expect(rows[0].budgetedSalary).toBe(120000);
    expect(rows[0].fte).toBe(1);
    expect(rows[0].budgetPhaseColumn).toBe('FY 2026-27 Mayor FTE');
    expect(rows[0].positionStatus).toBe('A');
    expect(rows[0]._source).toBe('bfm-position');
  });

  it('prefers Board over Mayor when both are present', () => {
    const ws = makeSheet([
      [...HEADERS, 'FY 2026-27 Board FTE', 'FY 2026-27 Board'],
      ['10001', '10001', 'DBI', 'DBI', '6278_C', 'Inspector', '21', '1', 'A',
       '1GAGF', 'A', '', '', '2027', 0, 0, 1, 130000],
    ]);
    const rows = importBfmPosition(ws);
    expect(rows[0].budgetPhaseColumn).toBe('FY 2026-27 Board FTE');
    expect(rows[0].budgetedSalary).toBe(130000);
  });

  it('skips rows with empty position number', () => {
    const ws = makeSheet([
      HEADERS,
      ['', '10001', 'DBI', 'DBI', '6278_C', 'Inspector', '21', '1', 'A',
       '1GAGF', 'A', '', '', '2027', 1, 120000],
      ['10001', '10001', 'DBI', 'DBI', '6278_C', 'Inspector', '21', '1', 'A',
       '1GAGF', 'A', '', '', '2027', 1, 120000],
    ]);
    expect(importBfmPosition(ws)).toHaveLength(1);
  });

  it('returns [] for a header-only sheet', () => {
    const ws = makeSheet([HEADERS]);
    expect(importBfmPosition(ws)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// importBfmNonPosition
// ---------------------------------------------------------------------------

describe('importBfmNonPosition', () => {
  const HEADERS = [
    'GFS Type', 'Dept ID', 'Dept ID Title', 'Account', 'Account Title',
    'Account Lvl 5 Title', 'Fund', 'Authority', 'Project', 'Activity',
    'Change Type', 'FY 2026-27 Mayor',
  ];

  it('parses a minimal BFM non-position sheet', () => {
    const ws = makeSheet([
      HEADERS,
      ['Labor', 'DBI', 'Dept of Building Inspection', '501010', 'Regular Salaries',
       'Salaries & Wages', '1GAGF', 'AUTH1', '', '', 'Ongoing', 500000],
    ]);
    const rows = importBfmNonPosition(ws);
    expect(rows).toHaveLength(1);
    expect(rows[0].accountCode).toBe('501010');
    expect(rows[0].budgetAmount).toBe(500000);
    expect(rows[0].budgetPhaseColumn).toBe('FY 2026-27 Mayor');
    expect(rows[0].accountCategory).toBe('Salaries & Wages');
    expect(rows[0]._source).toBe('bfm-non-position');
  });

  it('skips rows with empty account code', () => {
    const ws = makeSheet([
      HEADERS,
      ['Labor', 'DBI', 'DBI', '', 'Total', 'Total', '1GAGF', 'A', '', '', '', 1000000],
      ['Labor', 'DBI', 'DBI', '501010', 'Regular Salaries', 'Salaries', '1GAGF', 'A', '', '', 'Ongoing', 500000],
    ]);
    expect(importBfmNonPosition(ws)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// importPsHcmPp
// ---------------------------------------------------------------------------

describe('importPsHcmPp', () => {
  const HEADERS = [
    'Snapshot Date', 'Position Number', 'Position Job Code', 'Position Description',
    'Position Department ID', 'Position Department Description', 'Position Status',
    'Position Fill Status', 'Current Employee ID', 'Person Full Name',
    'Employee Appointment Type', 'Employee Step', 'Employee Hourly Rate',
    'Position Reports To', 'Roster Code', 'Roster Code Description',
    'RTF Status', 'RTF Expected Fill date', 'Budget Position Total FTE',
    'Combo Code', 'Employee Job Code',
  ];

  it('parses a filled and a vacant position', () => {
    const ws = makeSheet([
      HEADERS,
      ['2024-08-30', '10001', '6278', 'Building Inspector', 'DBI',
       'Dept of Building Inspection', 'Approved', 'FILLED', 'E12345', 'Smith, Jane',
       'PCS', '5', 63.46, '09000', '21', 'SEIU 1021',
       '', '', 1, 'C1234', '6278'],
      ['2024-08-30', '10002', '9774', 'Senior Inspector', 'DBI',
       'Dept of Building Inspection', 'Approved', 'VACANT', '', '',
       '', '', 0, '09000', '21', 'SEIU 1021',
       'Open', '2026-09-01', 1, '', ''],
    ]);
    const rows = importPsHcmPp(ws);
    expect(rows).toHaveLength(2);
    expect(rows[0].emplId).toBe('E12345');
    expect(rows[0].employeeName).toBe('Smith, Jane');
    expect(rows[0].hourlyRate).toBe(63.46);
    expect(rows[0].fillStatus).toBe('FILLED');
    expect(rows[1].emplId).toBe('');
    expect(rows[1].fillStatus).toBe('VACANT');
    expect(rows[1].rtfExpectedFillDate).toBe('2026-09-01');
    expect(rows[0]._source).toBe('ps-hcm-pp');
  });

  it('skips rows with empty position number', () => {
    const ws = makeSheet([
      HEADERS,
      ['2024-08-30', '', '6278', 'Inspector', 'DBI', 'DBI', 'Approved', 'VACANT',
       '', '', '', '', 0, '', '21', 'SEIU', '', '', 1, '', ''],
      ['2024-08-30', '10001', '6278', 'Inspector', 'DBI', 'DBI', 'Approved', 'FILLED',
       'E12345', 'Smith, Jane', 'PCS', '5', 63.46, '', '21', 'SEIU', '', '', 1, '', '6278'],
    ]);
    expect(importPsHcmPp(ws)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// importObiPayroll
// ---------------------------------------------------------------------------

describe('importObiPayroll', () => {
  const HEADERS = [
    'Fiscal Year', 'Department', 'Department Description', 'Position Identifier',
    'Person Number', 'Person Full Name', 'Job Code', 'Job Description',
    'Account', 'Fund Code', 'Authority Code', 'Earning Period Number',
    'Earning Period End Date', 'Earnings Code', 'Earnings Code Description',
    'Balance Amount', 'Pay Period FTE', 'HR Assignment Appointment Type',
  ];

  it('parses a per-period payroll row', () => {
    const ws = makeSheet([
      HEADERS,
      ['FY2024', 'DBI', 'Dept of Building Inspection', '10001',
       '12345', 'Smith, Jane', 'COMMN:6278', 'Building Inspector',
       '501010', '1GAGF', 'AUTH1', 15,
       '2024-01-26', 'WKP', 'Regular Biweekly Pay',
       4846.15, 1, 'PCS'],
    ]);
    const rows = importObiPayroll(ws);
    expect(rows).toHaveLength(1);
    expect(rows[0].positionIdentifier).toBe('10001');
    expect(rows[0].personNumber).toBe('12345');
    expect(rows[0].balanceAmount).toBe(4846.15);
    expect(rows[0].earningsCode).toBe('WKP');
    expect(rows[0].payPeriodFTE).toBe(1);
    expect(rows[0]._source).toBe('obi-payroll');
  });

  it('skips rows with empty position identifier', () => {
    const ws = makeSheet([
      HEADERS,
      ['FY2024', 'DBI', 'DBI', '', '12345', 'Subtotal', 'COMMN:6278', 'Inspector',
       '501010', '1GAGF', 'AUTH1', 0, '', '', '', 0, 0, ''],
      ['FY2024', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '1GAGF', 'AUTH1', 15, '2024-01-26', 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
    ]);
    expect(importObiPayroll(ws)).toHaveLength(1);
  });

  it('accumulates multiple earning codes for the same position', () => {
    const ws = makeSheet([
      HEADERS,
      ['FY2024', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '1GAGF', 'AUTH1', 15, '2024-01-26', 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
      ['FY2024', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '1GAGF', 'AUTH1', 15, '2024-01-26', 'OT', 'Overtime', 500, 0, 'PCS'],
    ]);
    const rows = importObiPayroll(ws);
    expect(rows).toHaveLength(2);
    expect(rows[1].earningsCode).toBe('OT');
  });
});
