/**
 * Importer unit tests — synthetic data only, no real PII.
 *
 * Each test builds a minimal in-memory worksheet using SheetJS utilities,
 * runs the importer, and asserts the output shape and values.
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
      ['Department Code', 'Department Name', 'Position Number', 'Job Code',
       'Job Code Description', 'Position Status', 'FTE', 'Budgeted Salary',
       'Fund', 'Authority', 'Fiscal Year'],
      ['DBI', 'Dept of Building Inspection', '00456', '6278', 'Building Inspector', 'Filled', 1, 110000, '1GAGF', 'AUTH1', 'FY2026'],
    ]);
    expect(detect(ws).type).toBe('bfm-position');
  });

  it('identifies bfm-non-position by fingerprint columns', () => {
    const ws = makeSheet([
      ['Department Code', 'Department Name', 'Account Code', 'Account Description', 'Fund', 'Authority', 'Budget Amount', 'Fiscal Year'],
      ['DBI', 'Dept of Building Inspection', '501010', 'Regular Salaries', '1GAGF', 'AUTH1', 500000, 'FY2026'],
    ]);
    expect(detect(ws).type).toBe('bfm-non-position');
  });

  it('identifies ps-hcm-pp by fingerprint columns', () => {
    const ws = makeSheet([
      ['Position Number', 'Job Code', 'Job Code Description', 'Department Code', 'Department Name',
       'Position Status', 'Empl ID', 'Employee Name', 'Appointment Type', 'Salary Step',
       'Salary Amount', 'Reports To Position', 'RTF Status', 'RTF Expected Fill Date',
       'FTE', 'Union Code'],
      ['00456', '6278', 'Building Inspector', 'DBI', 'Dept of Building Inspection',
       'A', 'E12345', 'Smith, Jane', 'PCS', '5', 110000, '00100', '', '', 1, '21'],
    ]);
    expect(detect(ws).type).toBe('ps-hcm-pp');
  });

  it('identifies obi-payroll by fingerprint columns', () => {
    const ws = makeSheet([
      ['Department Code', 'Department Name', 'Position Number', 'Empl ID', 'Employee Name',
       'Job Code', 'Account Code', 'Fund', 'Authority', 'YTD Salary', 'YTD Benefits',
       'YTD Total', 'Fiscal Year', 'Report Period'],
      ['DBI', 'Dept of Building Inspection', '00456', 'E12345', 'Smith, Jane',
       '6278', '501010', '1GAGF', 'AUTH1', 82500, 41250, 123750, 'FY2026', 'July 2025 – March 2026'],
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
      ['BFM Position Eturn — FY2026'],  // title row
      ['Department Code', 'Department Name', 'Position Number', 'Job Code',
       'Job Code Description', 'Position Status', 'FTE', 'Budgeted Salary',
       'Fund', 'Authority', 'Fiscal Year'],
      ['DBI', 'Dept of Building Inspection', '00456', '6278', 'Building Inspector', 'Filled', 1, 110000, '1GAGF', 'AUTH1', 'FY2026'],
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
  it('parses a minimal BFM position sheet', () => {
    const ws = makeSheet([
      ['Department Code', 'Department Name', 'Position Number', 'Job Code',
       'Job Code Description', 'Position Status', 'FTE', 'Budgeted Salary',
       'Fund', 'Authority', 'Fiscal Year'],
      ['DBI', 'Dept of Building Inspection', '00456', '6278', 'Building Inspector', 'Filled', 1, 110000, '1GAGF', 'AUTH1', 'FY2026'],
      ['DBI', 'Dept of Building Inspection', '00789', '9774', 'Senior Inspector', 'Vacant', 1, 130000, '1GAGF', 'AUTH1', 'FY2026'],
    ]);
    const rows = importBfmPosition(ws);
    expect(rows).toHaveLength(2);
    expect(rows[0].positionNumber).toBe('00456');
    expect(rows[0].budgetedSalary).toBe(110000);
    expect(rows[0].positionStatus).toBe('Filled');
    expect(rows[1].positionStatus).toBe('Vacant');
    expect(rows[0]._source).toBe('bfm-position');
  });

  it('skips rows with empty position number', () => {
    const ws = makeSheet([
      ['Department Code', 'Department Name', 'Position Number', 'Job Code',
       'Job Code Description', 'Position Status', 'FTE', 'Budgeted Salary',
       'Fund', 'Authority', 'Fiscal Year'],
      ['DBI', 'DBI', '', '6278', 'Inspector', 'Filled', 1, 100000, '1GAGF', 'A', 'FY2026'],
      ['DBI', 'DBI', '00456', '6278', 'Inspector', 'Filled', 1, 100000, '1GAGF', 'A', 'FY2026'],
    ]);
    const rows = importBfmPosition(ws);
    expect(rows).toHaveLength(1);
  });

  it('returns [] for an empty or header-only sheet', () => {
    const ws = makeSheet([
      ['Department Code', 'Position Number'],
    ]);
    expect(importBfmPosition(ws)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// importBfmNonPosition
// ---------------------------------------------------------------------------

describe('importBfmNonPosition', () => {
  it('parses a minimal BFM non-position sheet', () => {
    const ws = makeSheet([
      ['Department Code', 'Department Name', 'Account Code', 'Account Description',
       'Fund', 'Authority', 'Budget Amount', 'Fiscal Year'],
      ['DBI', 'Dept of Building Inspection', '501010', 'Regular Salaries', '1GAGF', 'AUTH1', 500000, 'FY2026'],
    ]);
    const rows = importBfmNonPosition(ws);
    expect(rows).toHaveLength(1);
    expect(rows[0].accountCode).toBe('501010');
    expect(rows[0].budgetAmount).toBe(500000);
    expect(rows[0]._source).toBe('bfm-non-position');
  });
});

// ---------------------------------------------------------------------------
// importPsHcmPp
// ---------------------------------------------------------------------------

describe('importPsHcmPp', () => {
  it('parses a filled and a vacant position', () => {
    const ws = makeSheet([
      ['Position Number', 'Job Code', 'Job Code Description', 'Department Code',
       'Department Name', 'Position Status', 'Empl ID', 'Employee Name',
       'Appointment Type', 'Salary Step', 'Salary Amount', 'Reports To Position',
       'RTF Status', 'RTF Expected Fill Date', 'FTE', 'Union Code'],
      ['00456', '6278', 'Building Inspector', 'DBI', 'Dept of Building Inspection',
       'A', 'E12345', 'Smith, Jane', 'PCS', '5', 110000, '00100', '', '', 1, '21'],
      ['00789', '9774', 'Senior Inspector', 'DBI', 'Dept of Building Inspection',
       'A', '', '', '', '', 0, '00100', 'Open', '2026-09-01', 1, '21'],
    ]);
    const rows = importPsHcmPp(ws);
    expect(rows).toHaveLength(2);
    expect(rows[0].emplId).toBe('E12345');
    expect(rows[0].employeeName).toBe('Smith, Jane');
    expect(rows[1].emplId).toBe('');
    expect(rows[1].rtfExpectedFillDate).toBe('2026-09-01');
    expect(rows[0]._source).toBe('ps-hcm-pp');
  });
});

// ---------------------------------------------------------------------------
// importObiPayroll
// ---------------------------------------------------------------------------

describe('importObiPayroll', () => {
  it('parses a payroll row with YTD amounts', () => {
    const ws = makeSheet([
      ['Department Code', 'Department Name', 'Position Number', 'Empl ID',
       'Employee Name', 'Job Code', 'Account Code', 'Fund', 'Authority',
       'YTD Salary', 'YTD Benefits', 'YTD Total', 'Fiscal Year', 'Report Period'],
      ['DBI', 'Dept of Building Inspection', '00456', 'E12345', 'Smith, Jane',
       '6278', '501010', '1GAGF', 'AUTH1', 82500, 41250, 123750, 'FY2026', 'July 2025 – March 2026'],
    ]);
    const rows = importObiPayroll(ws);
    expect(rows).toHaveLength(1);
    expect(rows[0].ytdSalary).toBe(82500);
    expect(rows[0].ytdBenefits).toBe(41250);
    expect(rows[0].ytdTotal).toBe(123750);
    expect(rows[0]._source).toBe('obi-payroll');
  });

  it('skips rows with empty Empl ID', () => {
    const ws = makeSheet([
      ['Department Code', 'Department Name', 'Position Number', 'Empl ID',
       'Employee Name', 'Job Code', 'Account Code', 'Fund', 'Authority',
       'YTD Salary', 'YTD Benefits', 'YTD Total', 'Fiscal Year', 'Report Period'],
      ['DBI', 'DBI', '00456', '', 'Total', '6278', '501010', '1GAGF', 'AUTH1', 0, 0, 0, 'FY2026', ''],
    ]);
    expect(importObiPayroll(ws)).toHaveLength(0);
  });
});
