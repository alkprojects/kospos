/**
 * Shared types for all report importers.
 *
 * Each importer is a pure function: (worksheet: WorkSheet) => TypedRecord[]
 * No DOM, no side effects, no state.
 */

/** The string tag that identifies which report produced this row. */
export type ReportType =
  | 'bfm-position'
  | 'bfm-non-position'
  | 'ps-hcm-pp'
  | 'obi-payroll'
  | 'unknown';

/** Returned by detect() — carries the type and which header row matched. */
export interface DetectionResult {
  type: ReportType;
  /** 0-based index of the header row in the sheet (usually 0, occasionally 1). */
  headerRow: number;
}

// ---------------------------------------------------------------------------
// BFM Position eturn
// ---------------------------------------------------------------------------

export interface BfmPositionRow {
  _source: 'bfm-position';
  departmentCode: string;
  departmentName: string;
  positionNumber: string;
  jobCode: string;
  jobCodeDescription: string;
  positionStatus: string;       // "Filled" | "Vacant" | "Frozen"
  fte: number;
  budgetedSalary: number;
  fund: string;
  authority: string;
  fiscalYear: string;
  /** Raw row number in the source sheet (1-based) for audit trail. */
  _row: number;
}

// ---------------------------------------------------------------------------
// BFM Non-position eturn
// ---------------------------------------------------------------------------

export interface BfmNonPositionRow {
  _source: 'bfm-non-position';
  departmentCode: string;
  departmentName: string;
  accountCode: string;
  accountDescription: string;
  fund: string;
  authority: string;
  budgetAmount: number;
  fiscalYear: string;
  _row: number;
}

// ---------------------------------------------------------------------------
// PS HCM Position & Personnel (P&P) Data
// ---------------------------------------------------------------------------

export interface PsHcmPpRow {
  _source: 'ps-hcm-pp';
  positionNumber: string;
  jobCode: string;
  jobCodeDescription: string;
  departmentCode: string;
  departmentName: string;
  positionStatus: string;       // "A" (active) | "I" (inactive) | "F" (frozen)
  emplId: string;               // blank if vacant
  employeeName: string;         // blank if vacant
  appointmentType: string;      // PCS | PEX | TEX | etc.
  salaryStep: string;
  salaryAmount: number;
  reportsToPosition: string;
  rtfStatus: string;            // RTF tracking status; blank if filled
  rtfExpectedFillDate: string;  // ISO or blank
  fte: number;
  unionCode: string;
  _row: number;
}

// ---------------------------------------------------------------------------
// OBI BI Payroll
// ---------------------------------------------------------------------------

export interface ObiPayrollRow {
  _source: 'obi-payroll';
  departmentCode: string;
  departmentName: string;
  positionNumber: string;
  emplId: string;
  employeeName: string;
  jobCode: string;
  accountCode: string;
  fund: string;
  authority: string;
  ytdSalary: number;
  ytdBenefits: number;
  ytdTotal: number;
  fiscalYear: string;
  reportPeriod: string;         // e.g. "July 2025 – March 2026"
  _row: number;
}

export type ImportedRow =
  | BfmPositionRow
  | BfmNonPositionRow
  | PsHcmPpRow
  | ObiPayrollRow;
