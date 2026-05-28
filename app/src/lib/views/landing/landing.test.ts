/**
 * lib/views/landing/build.ts tests — Phase 2.2.q PR 1.
 *
 * Pure-helper tests around `buildDataSummary` + `formatRefreshedAt`. The
 * React component tests live in `landing-view.test.tsx` once we wire it
 * in.
 */

import { describe, it, expect } from 'vitest';
import { buildDataSummary, formatRefreshedAt } from './build';
import type { ImportedRow } from '../../importers/types';

function ppRow(snapshotDate: string): ImportedRow {
  return {
    _source: 'ps-hcm-pp',
    _row: 1,
    snapshotDate,
    positionNumber: '10001',
    jobCode: '6278',
    jobCodeDescription: 'Building Inspector',
    positionDivision: '',
    departmentCode: '',
    departmentName: '',
    positionMaxHeadcount: 1,
    positionStatus: 'Approved',
    fillStatus: 'FILLED',
    vice1EmplId: '',
    vice1Name: '',
    previousEmployee: '',
    emplId: '12345',
    employeeName: 'Test, Person',
    employeeStatus: 'A',
    appointmentType: 'PCS',
    exemptCategory: '',
    salaryStep: '5',
    hourlyRate: 50,
    meritIncreaseDate: '',
    reportsToPosition: '',
    managerFirstName: '',
    managerLastName: '',
    cat1718AppointmentDate: '',
    cat1718ExemptCode: '',
    cat1718ExemptMonths: 0,
    cat1718TxExpiredDate: '',
    rosterCode: '',
    rosterDescription: '',
    comboCode: '',
    comboDepartmentCode: '',
    comboDepartmentName: '',
    rtfId: '',
    rtfStatus: '',
    rtfSubmittedDate: '',
    rtfExpectedFillDate: '',
    budgetDepartmentCode: '',
    budgetDepartmentName: '',
    budgetJobCode: '',
    fte: 1,
    employeeJobCode: '',
    vacantDate: '',
  } as ImportedRow;
}

function obiRow(asOfDate: string): ImportedRow {
  return {
    _source: 'obi-payroll',
    _row: 1,
    fiscalYear: '2026',
    departmentGroupCode: 'DBI',
    fundLvl1Code: '', fundLvl1Description: '', fundControl: '',
    fund: '', fundDescription: '',
    departmentCode: '', departmentName: '',
    projectCode: '', projectDescription: '',
    activityCode: '', activityDescription: '',
    authorityLvl1Code: '', authorityLvl1Description: '',
    authority: '', authorityDescription: '',
    accountLvl2Description: '', accountLvl5Name: '', accountLvl3Description: '',
    accountCode: '', accountDescription: '',
    earningPeriodNumber: 1,
    earningPeriodEnd: asOfDate,
    personNumber: '12345', personFullName: 'Test, Person',
    rosterCode: '',
    earningsCode: 'WKP', earningsDescription: '',
    positionIdentifier: '10001',
    jobCode: '6278', jobCodeSet: 'COMMN', jobDescription: '',
    assignmentNumber: 0,
    appointmentType: 'PCS',
    isFteHours: 'Y',
    earningHours: 80, payPeriodFTE: 1,
    balanceAmount: 5000,
    _asOfDate: asOfDate,
  } as ImportedRow;
}

function bfmRow(): ImportedRow {
  return {
    _source: 'bfm-position',
    _row: 1,
    positionNumber: '10001',
    priorPositionNumber: '', positionCode: '', priorPositionCode: '', formId: '',
    deptGroup: 'DBI', division: '', divisionTitle: '',
    section: '', sectionTitle: '', gfsType: '',
    departmentCode: '', departmentName: '',
    fund: '', fundTitle: '', authority: '', authorityTitle: '',
    project: '', projectTitle: '', activity: '', activityTitle: '',
    accountLvl5Title: '', agencyUse: '', agencyUseTitle: '',
    jobCode: '6278', jobCodeDescription: 'Building Inspector', jobClassTier: '',
    empOrg: '', empOrgTitle: '', retIndicator: '',
    positionStatus: 'A', action: '',
    fiscalYearStart: '2026', ppdStart: '', fiscalYearEnd: '2027', ppdEnd: '',
    budgetByFy: {},
    defaultFiscalYear: 'FY 2026-27',
    defaultPhase: 'Mayor',
    fte: 1, budgetedSalary: 100000,
    budgetPhaseColumn: 'FY 2026-27 Mayor FTE',
  } as ImportedRow;
}

describe('buildDataSummary', () => {
  it('returns empty=true with zero counts when nothing loaded', () => {
    const summary = buildDataSummary({
      loadedRows: [],
      lastBfmImportAt: '',
      jobPostingsCount: 0, jobPostingsRefreshedAt: '',
      eligibilityListsCount: 0, eligibilityListsRefreshedAt: '',
      pdfCacheCount: 0,
      staffingActionsCount: 0, staffingDerivedRemovedCount: 0,
      pendingSeparationsCount: 0, probationsCount: 0,
      positionNotesCount: 0,
    });
    expect(summary.empty).toBe(true);
    expect(summary.sources.every(r => r.count === 0)).toBe(true);
    expect(summary.userState.every(r => r.count === 0)).toBe(true);
  });

  it('counts P&P rows + surfaces latest snapshotDate', () => {
    const summary = buildDataSummary({
      loadedRows: [ppRow('2026-05-01'), ppRow('2026-05-15'), ppRow('2026-05-08')],
      lastBfmImportAt: '',
      jobPostingsCount: 0, jobPostingsRefreshedAt: '',
      eligibilityListsCount: 0, eligibilityListsRefreshedAt: '',
      pdfCacheCount: 0,
      staffingActionsCount: 0, staffingDerivedRemovedCount: 0,
      pendingSeparationsCount: 0, probationsCount: 0,
      positionNotesCount: 0,
    });
    const pp = summary.sources.find(r => r.source === 'ps-hcm-pp')!;
    expect(pp.count).toBe(3);
    expect(pp.latestLabel).toBe('snapshot 2026-05-15');
    expect(summary.empty).toBe(false);
  });

  it('counts OBI rows + uses _asOfDate (falls back to earningPeriodEnd)', () => {
    const summary = buildDataSummary({
      loadedRows: [obiRow('2026-04-24'), obiRow('2026-05-08'), obiRow('2026-04-10')],
      lastBfmImportAt: '',
      jobPostingsCount: 0, jobPostingsRefreshedAt: '',
      eligibilityListsCount: 0, eligibilityListsRefreshedAt: '',
      pdfCacheCount: 0,
      staffingActionsCount: 0, staffingDerivedRemovedCount: 0,
      pendingSeparationsCount: 0, probationsCount: 0,
      positionNotesCount: 0,
    });
    const obi = summary.sources.find(r => r.source === 'obi-payroll')!;
    expect(obi.count).toBe(3);
    expect(obi.latestLabel).toBe('latest PP 2026-05-08');
  });

  it('uses lastBfmImportAt for BFM rows', () => {
    const summary = buildDataSummary({
      loadedRows: [bfmRow(), bfmRow()],
      lastBfmImportAt: '2026-05-25',
      jobPostingsCount: 0, jobPostingsRefreshedAt: '',
      eligibilityListsCount: 0, eligibilityListsRefreshedAt: '',
      pdfCacheCount: 0,
      staffingActionsCount: 0, staffingDerivedRemovedCount: 0,
      pendingSeparationsCount: 0, probationsCount: 0,
      positionNotesCount: 0,
    });
    const bfm = summary.sources.find(r => r.source === 'bfm-position')!;
    expect(bfm.count).toBe(2);
    expect(bfm.latestLabel).toBe('imported 2026-05-25');
  });

  it('hides BFM lastBfmImportAt when no BFM rows present', () => {
    const summary = buildDataSummary({
      loadedRows: [ppRow('2026-05-15')],
      lastBfmImportAt: '2026-05-25', // dangling timestamp from earlier session
      jobPostingsCount: 0, jobPostingsRefreshedAt: '',
      eligibilityListsCount: 0, eligibilityListsRefreshedAt: '',
      pdfCacheCount: 0,
      staffingActionsCount: 0, staffingDerivedRemovedCount: 0,
      pendingSeparationsCount: 0, probationsCount: 0,
      positionNotesCount: 0,
    });
    const bfm = summary.sources.find(r => r.source === 'bfm-position')!;
    expect(bfm.count).toBe(0);
    // Don't show "imported 2026-05-25" when count=0 even if timestamp lingers.
    expect(bfm.latestLabel).toBe('');
  });

  it('surfaces eligibility + job-posting counts with refreshedAt timestamps', () => {
    const summary = buildDataSummary({
      loadedRows: [],
      lastBfmImportAt: '',
      jobPostingsCount: 137,
      jobPostingsRefreshedAt: '2026-05-28T14:30:00Z',
      eligibilityListsCount: 6732,
      eligibilityListsRefreshedAt: '2026-05-28T14:31:00Z',
      pdfCacheCount: 113,
      staffingActionsCount: 0, staffingDerivedRemovedCount: 0,
      pendingSeparationsCount: 0, probationsCount: 0,
      positionNotesCount: 0,
    });
    const postings = summary.sources.find(r => r.source === 'job-postings')!;
    const lists = summary.sources.find(r => r.source === 'eligibility-lists')!;
    const pdf = summary.sources.find(r => r.source === 'pdf-extracts')!;
    expect(postings.count).toBe(137);
    expect(postings.latestLabel).toMatch(/^refreshed /);
    expect(lists.count).toBe(6732);
    expect(lists.latestLabel).toMatch(/^refreshed /);
    expect(pdf.count).toBe(113);
    expect(pdf.latestLabel).toBe('lazy — populated on modal open');
    expect(summary.empty).toBe(false);
  });

  it('populates userState rows for each kind of manual state', () => {
    const summary = buildDataSummary({
      loadedRows: [],
      lastBfmImportAt: '',
      jobPostingsCount: 0, jobPostingsRefreshedAt: '',
      eligibilityListsCount: 0, eligibilityListsRefreshedAt: '',
      pdfCacheCount: 0,
      staffingActionsCount: 12, staffingDerivedRemovedCount: 3,
      pendingSeparationsCount: 5, probationsCount: 4,
      positionNotesCount: 8,
    });
    const userIds = summary.userState.map(r => r.source).sort();
    expect(userIds).toEqual([
      'pending-separations',
      'planned-actions',
      'planned-actions-hidden',
      'position-notes',
      'probations',
    ].sort());
    expect(summary.userState.find(r => r.source === 'planned-actions')!.count).toBe(12);
    expect(summary.userState.find(r => r.source === 'position-notes')!.count).toBe(8);
    // Non-data-loaded but has workspace state → empty is false.
    expect(summary.empty).toBe(false);
  });
});

describe('formatRefreshedAt', () => {
  it('returns empty string for empty input', () => {
    expect(formatRefreshedAt('')).toBe('');
  });

  it('returns the raw input when parsing fails', () => {
    expect(formatRefreshedAt('not-a-date')).toBe('not-a-date');
  });

  it('returns HH:MM when the timestamp is today', () => {
    const now = new Date(2026, 4, 28, 16, 0);
    const iso = new Date(2026, 4, 28, 14, 31).toISOString();
    expect(formatRefreshedAt(iso, now)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns YYYY-MM-DD HH:MM when the timestamp is a different day', () => {
    const now = new Date(2026, 4, 28, 16, 0);
    const iso = new Date(2026, 4, 25, 9, 5).toISOString();
    expect(formatRefreshedAt(iso, now)).toMatch(/^2026-05-25 \d{2}:\d{2}$/);
  });
});
