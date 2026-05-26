/**
 * lib/budget/ tests — snapshot build + per-position cube + variance math.
 *
 * Synthetic data only. Mirrors lib/payroll/'s test shape so the patterns
 * stay parallel.
 */

import { describe, it, expect } from 'vitest';
import type { BfmPositionRow } from '../importers/types';
import {
  buildBudgetSnapshot,
  computeBudgetVsActual,
  pickLatestBudgetSnapshot,
} from './build';

function row(partial: Partial<BfmPositionRow> & {
  positionNumber: string;
}): BfmPositionRow {
  // `positionNumber` is the only required override; everything else has a
  // sensible default and the caller can spread additional overrides via `partial`.
  // We rely on the spread at the end to apply any overrides (including
  // positionNumber, which TypeScript otherwise warns about if specified twice).
  return {
    _source: 'bfm-position',
    priorPositionNumber: '',
    positionCode: '',
    priorPositionCode: '',
    formId: '',
    deptGroup: 'DBI',
    division: '',
    divisionTitle: '',
    section: '',
    sectionTitle: '',
    gfsType: 'NGFS',
    departmentCode: '229235',
    departmentName: 'DBI',
    fund: '10190',
    fundTitle: 'Special Revenue',
    authority: '2DBIA',
    authorityTitle: 'BIF Authority',
    project: '10039761',
    projectTitle: 'BIF Operating',
    activity: '0',
    activityTitle: 'Default',
    accountLvl5Title: 'Salaries & Wages',
    agencyUse: '',
    agencyUseTitle: '',
    jobCode: '6278_C',
    jobCodeDescription: 'Building Inspector',
    jobClassTier: '',
    empOrg: '21',
    empOrgTitle: 'SEIU 1021',
    retIndicator: 'C',
    positionStatus: 'A',
    action: '',
    fiscalYearStart: '2025',
    ppdStart: '',
    fiscalYearEnd: '2026',
    ppdEnd: '',
    budgetByFy: { 'FY 2025-26': { Board: { fte: 1, dollars: 110000 } } },
    defaultFiscalYear: 'FY 2025-26',
    defaultPhase: 'Board',
    fte: 1,
    budgetedSalary: 110000,
    budgetPhaseColumn: 'FY 2025-26 Board FTE',
    _row: 2,
    ...partial,
  };
}

describe('buildBudgetSnapshot — single FY lens', () => {
  it('rolls up per-position budgeted salary + FTE from the Board layer', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '10001' }),
      row({ positionNumber: '10002',
            budgetByFy: { 'FY 2025-26': { Board: { fte: 0.5, dollars: 55000 } } } }),
    ];
    const snap = buildBudgetSnapshot(rows);
    expect(snap.fiscalYear).toBe('FY 2025-26');
    expect(snap.budgetPhase).toBe('Board');
    expect(snap.rowCount).toBe(2);
    expect(snap.totalBudgetedSalary).toBe(165000);
    expect(snap.totalFte).toBe(1.5);
    expect(snap.byPosition.get('10001')!.budgetedSalary).toBe(110000);
    expect(snap.byPosition.get('10002')!.budgetedSalary).toBe(55000);
  });

  it('normalizes position keys (zero-pad collapse)', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '00010001' }),
    ];
    const snap = buildBudgetSnapshot(rows);
    expect(snap.byPosition.has('10001')).toBe(true);
    expect(snap.byPosition.get('10001')!.displayNumber).toBe('00010001');
  });

  it('exposes the full phase layer set on each position', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '10001',
            budgetByFy: { 'FY 2025-26': {
              Original:            { fte: 1, dollars: 100000 },
              Base:                { fte: 1, dollars: 102000 },
              Department:          { fte: 1, dollars: 105000 },
              Mayor:               { fte: 1, dollars: 108000 },
              Committee:           { fte: 1, dollars: 110000 },
              TechnicalAdjustment: { fte: 1, dollars: 110500 },
              Board:               { fte: 1, dollars: 112000 },
            } } }),
    ];
    const snap = buildBudgetSnapshot(rows);
    const p = snap.byPosition.get('10001')!;
    expect(p.byPhase.Mayor?.dollars).toBe(108000);
    expect(p.byPhase.Board?.dollars).toBe(112000);
    expect(p.budgetedSalary).toBe(112000); // Board lens
  });

  it('honors an explicit budgetPhase lens', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '10001',
            budgetByFy: { 'FY 2025-26': {
              Mayor: { fte: 1, dollars: 108000 },
              Board: { fte: 1, dollars: 112000 },
            } } }),
    ];
    const snap = buildBudgetSnapshot(rows, { budgetPhase: 'Mayor' });
    expect(snap.budgetPhase).toBe('Mayor');
    expect(snap.byPosition.get('10001')!.budgetedSalary).toBe(108000);
  });

  it('honors an explicit fiscalYear lens', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '10001',
            budgetByFy: {
              'FY 2025-26': { Board: { fte: 1, dollars: 110000 } },
              'FY 2026-27': { Department: { fte: 1, dollars: 115000 } },
            } }),
    ];
    const lens26 = buildBudgetSnapshot(rows, { fiscalYear: 'FY 2025-26' });
    expect(lens26.fiscalYear).toBe('FY 2025-26');
    expect(lens26.byPosition.get('10001')!.budgetedSalary).toBe(110000);
    const lens27 = buildBudgetSnapshot(rows, { fiscalYear: 'FY 2026-27' });
    expect(lens27.fiscalYear).toBe('FY 2026-27');
    // Consensus phase falls to Department (the only one with dollars in FY 2026-27).
    expect(lens27.budgetPhase).toBe('Department');
    expect(lens27.byPosition.get('10001')!.budgetedSalary).toBe(115000);
    // Force-Board returns 0 because Board isn't populated in FY 2026-27 yet.
    const lens27Board = buildBudgetSnapshot(rows, { fiscalYear: 'FY 2026-27', budgetPhase: 'Board' });
    expect(lens27Board.byPosition.get('10001')!.budgetedSalary).toBe(0);
  });

  it('attaches the asOfDate to the snapshot key', () => {
    const rows: BfmPositionRow[] = [row({ positionNumber: '10001' })];
    const snap = buildBudgetSnapshot(rows, { asOfDate: '2026-05-14' });
    expect(snap.asOfDate).toBe('2026-05-14');
  });

  it('sums layers when a position appears in multiple rows (split-funded)', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '10001',
            budgetByFy: { 'FY 2025-26': { Board: { fte: 0.5, dollars: 55000 } } } }),
      row({ positionNumber: '10001', _row: 3,
            budgetByFy: { 'FY 2025-26': { Board: { fte: 0.5, dollars: 55000 } } } }),
    ];
    const snap = buildBudgetSnapshot(rows);
    const p = snap.byPosition.get('10001')!;
    expect(p.fte).toBe(1.0);
    expect(p.budgetedSalary).toBe(110000);
    expect(p.byPhase.Board?.dollars).toBe(110000);
  });

  it('skips rows that lack the requested FY entirely', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '10001',
            budgetByFy: { 'FY 2025-26': { Board: { fte: 1, dollars: 110000 } } } }),
      row({ positionNumber: '10002',
            budgetByFy: { 'FY 2026-27': { Board: { fte: 1, dollars: 115000 } } },
            defaultFiscalYear: 'FY 2026-27' }),
    ];
    const snap = buildBudgetSnapshot(rows, { fiscalYear: 'FY 2025-26' });
    expect(snap.rowCount).toBe(1);
    expect(snap.byPosition.has('10001')).toBe(true);
    expect(snap.byPosition.has('10002')).toBe(false);
  });
});

describe('computeBudgetVsActual', () => {
  it('returns over/under/on with signed variance', () => {
    expect(computeBudgetVsActual('10001', 100000, 110000)).toEqual({
      positionId: '10001', budget: 100000, actual: 110000,
      variance: 10000, variancePct: 0.1, direction: 'over',
    });
    expect(computeBudgetVsActual('10001', 100000, 90000)).toEqual({
      positionId: '10001', budget: 100000, actual: 90000,
      variance: -10000, variancePct: -0.1, direction: 'under',
    });
    expect(computeBudgetVsActual('10001', 100000, 100000)).toEqual({
      positionId: '10001', budget: 100000, actual: 100000,
      variance: 0, variancePct: 0, direction: 'on',
    });
  });

  it('returns null variancePct when the budget is zero (avoid /0)', () => {
    const v = computeBudgetVsActual('10001', 0, 5000);
    expect(v.variancePct).toBeNull();
    expect(v.direction).toBe('over');
  });
});

describe('pickLatestBudgetSnapshot', () => {
  it('returns null on empty input', () => {
    expect(pickLatestBudgetSnapshot([])).toBeNull();
  });

  it('returns the snapshot with the highest asOfDate', () => {
    const rows: BfmPositionRow[] = [row({ positionNumber: '10001' })];
    const a = buildBudgetSnapshot(rows, { asOfDate: '2026-05-07' });
    const b = buildBudgetSnapshot(rows, { asOfDate: '2026-05-14' });
    expect(pickLatestBudgetSnapshot([a, b])!.asOfDate).toBe('2026-05-14');
  });

  it('tiebreaks equal asOfDate by latest fiscalYear', () => {
    const rows: BfmPositionRow[] = [
      row({ positionNumber: '10001',
            budgetByFy: {
              'FY 2025-26': { Board: { fte: 1, dollars: 110000 } },
              'FY 2026-27': { Board: { fte: 1, dollars: 115000 } },
            } }),
    ];
    const a = buildBudgetSnapshot(rows, { fiscalYear: 'FY 2025-26', asOfDate: '2026-05-14' });
    const b = buildBudgetSnapshot(rows, { fiscalYear: 'FY 2026-27', asOfDate: '2026-05-14' });
    expect(pickLatestBudgetSnapshot([a, b])!.fiscalYear).toBe('FY 2026-27');
  });
});
