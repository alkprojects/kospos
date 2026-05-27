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

  it('captures all 7 phase layers for FY-this when present', () => {
    // Mirror the real eturn shape: FTE + Dollars per phase. All 7 phases of
    // FY 2025-26 (Original / Base / Department / Mayor / Committee /
    // Technical Adjustment / Board) so we exercise the full ladder.
    const FULL_HEADERS = [
      'BY HCM Position#', 'Dept ID', 'Job Class', 'Status', 'Ret Indicator',
      'FY 2025-26 Original FTE', 'FY 2025-26 Original',
      'FY 2025-26 Base FTE',     'FY 2025-26 Base',
      'FY 2025-26 Department FTE', 'FY 2025-26 Department',
      'FY 2025-26 Mayor FTE',    'FY 2025-26 Mayor',
      'FY 2025-26 Committee FTE', 'FY 2025-26 Committee',
      'FY 2025-26 Technical Adjustment FTE', 'FY 2025-26 Technical Adjustment',
      'FY 2025-26 Board FTE',    'FY 2025-26 Board',
    ];
    const ws = makeSheet([
      FULL_HEADERS,
      ['10001', 'DBI', '6278_C', 'A', '1',
       1, 100000,
       1, 102000,
       1, 105000,
       1, 108000,
       1, 110000,
       1, 110500,
       1, 112000],
    ]);
    const r = importBfmPosition(ws)[0];
    expect(r.budgetByFy['FY 2025-26']).toBeDefined();
    const layers = r.budgetByFy['FY 2025-26'];
    expect(layers.Original?.dollars).toBe(100000);
    expect(layers.Base?.dollars).toBe(102000);
    expect(layers.Department?.dollars).toBe(105000);
    expect(layers.Mayor?.dollars).toBe(108000);
    expect(layers.Committee?.dollars).toBe(110000);
    expect(layers.TechnicalAdjustment?.dollars).toBe(110500);
    expect(layers.Board?.dollars).toBe(112000);
    // Default anchor picks Board (most-advanced).
    expect(r.defaultPhase).toBe('Board');
    expect(r.budgetedSalary).toBe(112000);
  });

  it('picks latest FY when both FY-this and FY-plus-one columns are populated', () => {
    // FY 2025-26 has Board (final); FY 2026-27 only has Department populated.
    // Anchor should be FY 2026-27 Department (latest year wins) — but only
    // if Department is non-zero. If FY 2026-27 is all zeros, fall back to
    // FY 2025-26 Board.
    const HEADS = [
      'BY HCM Position#', 'Dept ID', 'Job Class', 'Status', 'Ret Indicator',
      'FY 2025-26 Board FTE', 'FY 2025-26 Board',
      'FY 2026-27 Department FTE', 'FY 2026-27 Department',
      'FY 2026-27 Mayor FTE', 'FY 2026-27 Mayor',
    ];
    const populated = makeSheet([
      HEADS,
      ['10001', 'DBI', '6278_C', 'A', '1', 1, 110000, 1, 115000, 0, 0],
    ]);
    const r1 = importBfmPosition(populated)[0];
    expect(r1.defaultFiscalYear).toBe('FY 2026-27');
    expect(r1.defaultPhase).toBe('Department');
    expect(r1.budgetedSalary).toBe(115000);

    const empty27 = makeSheet([
      HEADS,
      ['10001', 'DBI', '6278_C', 'A', '1', 1, 110000, 0, 0, 0, 0],
    ]);
    const r2 = importBfmPosition(empty27)[0];
    expect(r2.defaultFiscalYear).toBe('FY 2025-26');
    expect(r2.defaultPhase).toBe('Board');
    expect(r2.budgetedSalary).toBe(110000);
  });

  it('captures prior-FY Original alongside current FY layers', () => {
    // FY 2024-25 historical band (AK:AL): only Original is present.
    const HEADS = [
      'BY HCM Position#', 'Dept ID', 'Job Class', 'Status', 'Ret Indicator',
      'FY 2024-25 Original FTE', 'FY 2024-25 Original',
      'FY 2025-26 Board FTE',    'FY 2025-26 Board',
    ];
    const ws = makeSheet([
      HEADS,
      ['10001', 'DBI', '6278_C', 'A', '1', 1, 100000, 1, 110000],
    ]);
    const r = importBfmPosition(ws)[0];
    expect(r.budgetByFy['FY 2024-25']?.Original?.dollars).toBe(100000);
    expect(r.budgetByFy['FY 2024-25']?.Board).toBeUndefined();
    expect(r.budgetByFy['FY 2025-26']?.Board?.dollars).toBe(110000);
    // Anchor picks latest FY's Board.
    expect(r.defaultFiscalYear).toBe('FY 2025-26');
    expect(r.defaultPhase).toBe('Board');
  });

  it('captures the full position-metadata column set', () => {
    // The full eturn carries identity / dept-tree / chartfield-title /
    // job-class-tier / FY-span fields we now expose.
    const HEADS = [
      'GFS Type', 'Dept Grp', 'Prior Budget HCM Position#', 'BY HCM Position#',
      'FormID', 'Division', 'Division Title', 'Section', 'Section Title',
      'Dept ID', 'Dept ID Title',
      'Fund', 'Fund Title', 'Project', 'Project Title', 'Activity', 'Activity Title',
      'Authority', 'Authority Title',
      'Account Lvl 5 Title', 'Agency Use', 'Agency Use Title',
      'Prior Budget Position Code', 'Position Code',
      'Job Class', 'Job Class Title', 'Job Class Tier',
      'Emp Org', 'Emp Org Title', 'Ret Indicator', 'Status', 'Action',
      'Fiscal Year Start', 'PPD Start', 'Fiscal Year End', 'PPD End',
      'FY 2025-26 Board FTE', 'FY 2025-26 Board',
    ];
    const ws = makeSheet([
      HEADS,
      [
        'NGFS', 'DBI', '00010001', '10001',
        'F-123', 'D-100', 'Inspections Division', 'S-110', 'Building Inspection Section',
        '229235', 'Department of Building Inspection',
        '10190', 'Special Revenue', '10039761', 'BIF Operating', '0', 'Default',
        '2DBIA', 'BIF Authority',
        'Salaries & Wages', 'AGY-1', 'Use 1',
        'BPC-1', 'PC-1',
        '6278_C', 'Building Inspector', 'A',
        '21', 'SEIU 1021', 'C', 'A', 'New',
        '2025', '2025-07-01', '2026', '2026-06-30',
        1, 110000,
      ],
    ]);
    const r = importBfmPosition(ws)[0];
    expect(r.gfsType).toBe('NGFS');
    expect(r.deptGroup).toBe('DBI');
    expect(r.priorPositionNumber).toBe('00010001');
    expect(r.positionNumber).toBe('10001');
    expect(r.formId).toBe('F-123');
    expect(r.division).toBe('D-100');
    expect(r.divisionTitle).toBe('Inspections Division');
    expect(r.section).toBe('S-110');
    expect(r.sectionTitle).toBe('Building Inspection Section');
    expect(r.departmentName).toBe('Department of Building Inspection');
    expect(r.fundTitle).toBe('Special Revenue');
    expect(r.projectTitle).toBe('BIF Operating');
    expect(r.activityTitle).toBe('Default');
    expect(r.authorityTitle).toBe('BIF Authority');
    expect(r.accountLvl5Title).toBe('Salaries & Wages');
    expect(r.agencyUse).toBe('AGY-1');
    expect(r.agencyUseTitle).toBe('Use 1');
    expect(r.priorPositionCode).toBe('BPC-1');
    expect(r.positionCode).toBe('PC-1');
    expect(r.jobClassTier).toBe('A');
    expect(r.empOrgTitle).toBe('SEIU 1021');
    expect(r.action).toBe('New');
    expect(r.ppdStart).toBe('2025-07-01');
    expect(r.fiscalYearEnd).toBe('2026');
    expect(r.ppdEnd).toBe('2026-06-30');
    // Anchor.
    expect(r.budgetByFy['FY 2025-26']?.Board?.dollars).toBe(110000);
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

  it('extracts the spine fields (Cat 17/18 + 3 dept concepts + vice + manager)', () => {
    const HEADERS_FULL = [
      'Snapshot Date', 'Position Number', 'Position Job Code', 'Position Description',
      'Position Division',
      'Position Department ID', 'Position Department Description',
      'Position Max Headcount',
      'Position Status', 'Position Fill Status',
      'Employee ID Vice 1', 'Employee Name Vice 1',
      'Previous Employee',
      'Current Employee ID', 'Employee Status', 'Person Full Name',
      'Employee Job Code', 'Employee Appointment Type',
      'EE Exempt Category Description',
      'Employee Step', 'Employee Hourly Rate', 'Employee Merit Increase Date',
      'Position Reports To', 'Manager First Name', 'Manager Last Name',
      'CAT_17_18 Appointment Date', 'CAT_17_18 Exempt Code',
      'CAT_17_18 Exempt Months', 'CAT_17_18 Exempt TX Expired Date',
      'Roster Code', 'Roster Code Description',
      'Combo Code', 'Combo CD DEPTID', 'Combo CD DEPT Description',
      'Latest RTF ID', 'RTF Submitted Date', 'RTF Status', 'RTF Expected Fill date',
      'Budget Position Total FTE', 'Budget Job Code 1',
      'Budget Department Code 1', 'Budget Department Description 1',
      'Vacant Date',
    ];
    const ws = makeSheet([
      HEADERS_FULL,
      [
        '2026-05-20', '10001', '5380', 'Planner III',
        'CPC Current Planning',
        '229235', 'CPC Current Planning',
        1,
        'Approved', 'FILLED',
        '', '',
        '',
        'E99999', 'A', 'Lopez, Maria',
        '5380', 'TEX',
        '18 Special Proj - Limited Term',
        '5', 75.20, '2026-09-01',
        '20000', 'Karen', 'Park',
        '2024-01-15', '18',
        36, '2027-01-15',
        '21', 'SEIU 1021',
        'CPCT1', '229240', 'CPC Citywide Planning',
        'RTF0120903', '2026-04-01', 'APPROVED', '2026-08-15',
        1, '5380',
        '229000', 'Department of City Planning',
        '',
      ],
    ]);
    const rows = importPsHcmPp(ws);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.departmentCode).toBe('229235');         // effective
    expect(r.budgetDepartmentCode).toBe('229000');   // budgeted
    expect(r.comboDepartmentCode).toBe('229240');    // combo
    expect(r.exemptCategory).toBe('18 Special Proj - Limited Term');
    expect(r.cat1718ExemptCode).toBe('18');
    expect(r.cat1718ExemptMonths).toBe(36);
    expect(r.cat1718TxExpiredDate).toBe('2027-01-15');
    expect(r.managerFirstName).toBe('Karen');
    expect(r.managerLastName).toBe('Park');
    expect(r.rtfId).toBe('RTF0120903');
    expect(r.budgetJobCode).toBe('5380');
    expect(r.positionDivision).toBe('CPC Current Planning');
    expect(r.positionMaxHeadcount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// importObiPayroll
// ---------------------------------------------------------------------------

describe('importObiPayroll', () => {
  // Legacy minimal-header shape kept for backward-compat checks. Real exports
  // carry 39 columns; the legacy fixture exercises the importer's fallback to
  // older "Department" / "Account" header names.
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

  it('parses the full 39-column export shape', () => {
    // Header order matches the real OBI export per labor-report.md § Tab 7
    // column inventory (A-AL; col AM is a trailing blank, ignored).
    const FULL_HEADERS = [
      'Fiscal Year', 'Department Group Code',
      'Fund Lvl 1 Code', 'Fund Lvl 1 Desc', 'Fund Control',
      'Fund Code', 'Fund Description',
      'Department Code', 'Department Description',
      'Project Code', 'Project Description',
      'Activity Code', 'Activity Description',
      'Authority Lvl 1 Code', 'Authority Lvl 1 Description',
      'Authority Code', 'Authority Description',
      'Account Lvl 2 Description', 'Account Lvl 5 Name', 'Account Lvl 3 Description',
      'Account Code', 'Account Description',
      'Earning Period Number', 'Earning Period End Date',
      'Person Number', 'Person Full Name',
      'Roster Code',
      'Earnings Code', 'Earnings Code Description',
      'Position Identifier', 'Job Code', 'Job Description',
      'Assignment Number', 'HR Assignment Appointment Type',
      'Is FTE Hours', 'Earning Hours', 'Pay Period FTE', 'Balance Amount',
    ];
    const ws = makeSheet([
      FULL_HEADERS,
      [
        '2026', 'DBI',
        '10000', 'Special Revenue', 'FACCT',
        '10190', 'SR BIF Operating Project',
        '229235', 'DBI IS Building Inspection',
        '', '',
        '', '',
        '10000', 'Operating',
        'AUTH1', 'Operating Authority',
        'Expenditures', '5010Salary', 'Salaries',
        '501010', 'Regular Salaries - Misc',
        0, '2026-05-08',
        '12345', 'Smith, Jane',
        'DBIXE',
        'WKP', 'Regular Hours - Worked',
        '10001', 'COMMN:6278', 'Building Inspector',
        0, 'PCS',
        'Y', 80, 1, 5254.40,
      ],
    ]);
    const rows = importObiPayroll(ws);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.departmentGroupCode).toBe('DBI');
    expect(r.fundLvl1Code).toBe('10000');
    expect(r.fundControl).toBe('FACCT');
    expect(r.fund).toBe('10190');
    expect(r.fundDescription).toBe('SR BIF Operating Project');
    expect(r.departmentCode).toBe('229235');
    expect(r.authorityLvl1Code).toBe('10000');
    expect(r.authority).toBe('AUTH1');
    expect(r.accountLvl5Name).toBe('5010Salary');
    expect(r.accountCode).toBe('501010');
    expect(r.accountDescription).toBe('Regular Salaries - Misc');
    expect(r.rosterCode).toBe('DBIXE');
    expect(r.jobCode).toBe('6278');
    expect(r.jobCodeSet).toBe('COMMN');
    expect(r.assignmentNumber).toBe(0);
    expect(r.isFteHours).toBe('Y');
    expect(r.earningHours).toBe(80);
    expect(r.balanceAmount).toBe(5254.40);
    expect(r._asOfDate).toBe('2026-05-08');
  });

  it('stamps _asOfDate = MAX(earningPeriodEnd) on every row in the import call', () => {
    const ws = makeSheet([
      HEADERS,
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '10190', 'AUTH1', 0, '2026-04-24', 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '10190', 'AUTH1', 0, '2026-05-08', 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
      ['FY2026', 'DBI', 'DBI', '10002', '67890', 'Doe, John', 'COMMN:6331', 'Tech',
       '501010', '10190', 'AUTH1', 0, '2026-04-10', 'WKP', 'Regular Pay', 4000.00, 1, 'PCS'],
    ]);
    const rows = importObiPayroll(ws);
    for (const r of rows) expect(r._asOfDate).toBe('2026-05-08');
  });

  it('preserves a job code that has no COMMN: prefix', () => {
    const ws = makeSheet([
      HEADERS,
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', '6278', 'Inspector',
       '501010', '10190', 'AUTH1', 0, '2026-05-08', 'WKP', 'Pay', 4846.15, 1, 'PCS'],
    ]);
    const r = importObiPayroll(ws)[0];
    expect(r.jobCode).toBe('6278');
    expect(r.jobCodeSet).toBe('');
  });

  // Bug 2a regression: the live OBI .xlsx export stores "Earning Period End
  // Date" as an Excel date serial (a number like 46150). The importer must
  // coerce that to ISO `YYYY-MM-DD` so the summary header doesn't display
  // "46150" and the PP-range filter in applyFilters compares ISO-vs-ISO.
  it('coerces a numeric Excel serial date cell to ISO YYYY-MM-DD', () => {
    // Excel serial 46150 → 2026-05-08 (the value Alex saw on the live site).
    const ws = makeSheet([
      HEADERS,
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '10190', 'AUTH1', 15, 46150, 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
    ]);
    const r = importObiPayroll(ws)[0];
    expect(r.earningPeriodEnd).toBe('2026-05-08');
    expect(r._asOfDate).toBe('2026-05-08');
  });

  it('computes MAX(_asOfDate) correctly across mixed serial + ISO rows', () => {
    // The MAX-tracker must compare ISO strings to ISO strings, not serial
    // numbers to ISO strings (the latter would yield wrong lexicographic order).
    const ws = makeSheet([
      HEADERS,
      // Row 1: ISO string, mid-FY.
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '10190', 'AUTH1', 0, '2026-04-24', 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
      // Row 2: Excel serial 46150 = 2026-05-08 (later than row 1).
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '10190', 'AUTH1', 0, 46150, 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
      // Row 3: Excel serial 46136 = 2026-04-24 (same as row 1).
      ['FY2026', 'DBI', 'DBI', '10002', '67890', 'Doe, John', 'COMMN:6331', 'Tech',
       '501010', '10190', 'AUTH1', 0, 46136, 'WKP', 'Regular Pay', 4000.00, 1, 'PCS'],
    ]);
    const rows = importObiPayroll(ws);
    expect(rows).toHaveLength(3);
    expect(rows[0].earningPeriodEnd).toBe('2026-04-24');
    expect(rows[1].earningPeriodEnd).toBe('2026-05-08');
    expect(rows[2].earningPeriodEnd).toBe('2026-04-24');
    // MAX across all rows = 2026-05-08, stamped on every row.
    for (const r of rows) expect(r._asOfDate).toBe('2026-05-08');
  });

  it('passes through an already-ISO date string (CSV / pre-formatted cells)', () => {
    // CSV exports — and .xlsx cells that were text-formatted — surface as
    // ISO-shaped strings already. The converter should not double-transform.
    const ws = makeSheet([
      HEADERS,
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '10190', 'AUTH1', 15, '2026-05-08', 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
    ]);
    const r = importObiPayroll(ws)[0];
    expect(r.earningPeriodEnd).toBe('2026-05-08');
  });

  it('handles an empty date cell as empty string (no spurious 1899 epoch)', () => {
    const ws = makeSheet([
      HEADERS,
      ['FY2026', 'DBI', 'DBI', '10001', '12345', 'Smith, Jane', 'COMMN:6278', 'Inspector',
       '501010', '10190', 'AUTH1', 15, '', 'WKP', 'Regular Pay', 4846.15, 1, 'PCS'],
    ]);
    const r = importObiPayroll(ws)[0];
    expect(r.earningPeriodEnd).toBe('');
    // MAX-tracker should not promote '' over later real dates in the same file.
    expect(r._asOfDate).toBe('');
  });
});
