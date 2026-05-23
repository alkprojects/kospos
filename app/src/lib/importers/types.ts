/**
 * Shared types for all report importers.
 * Each importer is a pure function: (worksheet: WorkSheet) => TypedRecord[]
 */

export type ReportType =
  | 'bfm-position'
  | 'bfm-non-position'
  | 'ps-hcm-pp'
  | 'obi-payroll'
  | 'unknown';

export interface DetectionResult {
  type: ReportType;
  /** 0-based index of the header row (usually 0). */
  headerRow: number;
}

// ---------------------------------------------------------------------------
// BFM Position eturn  (15.10.006 "By Position#" sheet / "Pos" sheet in Eturns)
//
// Budget columns are named "FY YYYY-YY <Phase> FTE" / "FY YYYY-YY <Phase>".
// The importer picks the most-advanced approved phase (Board > Mayor > Committee
// > Department > Base) from the latest fiscal year present.
// ---------------------------------------------------------------------------

export interface BfmPositionRow {
  _source: 'bfm-position';
  /** "BY HCM Position#" — the budget-year position number */
  positionNumber: string;
  /** "Prior Budget HCM Position#" — prior year number (may differ) */
  priorPositionNumber: string;
  departmentCode: string;       // "Dept ID"
  departmentName: string;       // "Dept ID Title"
  jobCode: string;              // "Job Class" e.g. "6321_C"
  jobCodeDescription: string;   // "Job Class Title"
  empOrg: string;               // "Emp Org" — employee organization / union group
  retIndicator: string;         // "Ret Indicator" — retirement code
  positionStatus: string;       // "Status" — "A" active, "I" inactive, "S" special
  fund: string;
  authority: string;
  project: string;
  activity: string;
  /** FTE from the most-advanced budget phase column found */
  fte: number;
  /** Dollar amount from the same phase column */
  budgetedSalary: number;
  /** Name of the FTE column used, e.g. "FY 2026-27 Mayor FTE" */
  budgetPhaseColumn: string;
  fiscalYearStart: string;      // "Fiscal Year Start" e.g. "2027"
  _row: number;
}

// ---------------------------------------------------------------------------
// BFM Non-position eturn  (15.10.001 "Chart of Account Details" / "Nonpos" sheet)
// ---------------------------------------------------------------------------

export interface BfmNonPositionRow {
  _source: 'bfm-non-position';
  gfsType: string;
  departmentCode: string;       // "Dept ID"
  departmentName: string;       // "Dept ID Title"
  accountCode: string;          // "Account"
  accountDescription: string;   // "Account Title"
  accountCategory: string;      // "Account Lvl 5 Title"
  fund: string;
  authority: string;
  project: string;
  activity: string;
  budgetAmount: number;
  budgetPhaseColumn: string;
  _row: number;
}

// ---------------------------------------------------------------------------
// PS HCM P&P Data  ("Active Labor" CSV / "P&P Data" sheet in Labor Report)
// ---------------------------------------------------------------------------

export interface PsHcmPpRow {
  _source: 'ps-hcm-pp';
  snapshotDate: string;         // "Snapshot Date"
  positionNumber: string;
  jobCode: string;              // "Position Job Code"
  jobCodeDescription: string;   // "Position Description"
  departmentCode: string;       // "Position Department ID"
  departmentName: string;       // "Position Department Description"
  positionStatus: string;       // "Position Status" — "Approved", "Frozen", etc.
  fillStatus: string;           // "Position Fill Status" — "FILLED", "VACANT", etc.
  emplId: string;               // "Current Employee ID" — blank if vacant
  employeeName: string;         // "Person Full Name"
  appointmentType: string;      // "Employee Appointment Type" — PCS, PEX, TEX, ELC…
  salaryStep: string;           // "Employee Step"
  hourlyRate: number;           // "Employee Hourly Rate"
  reportsToPosition: string;    // "Position Reports To"
  rosterCode: string;           // "Roster Code" (replaces prior "Union Code" assumption)
  rosterDescription: string;    // "Roster Code Description"
  rtfStatus: string;
  rtfExpectedFillDate: string;  // "RTF Expected Fill date" (lowercase d in source)
  fte: number;                  // "Budget Position Total FTE"
  comboCode: string;            // "Combo Code"
  employeeJobCode: string;      // "Employee Job Code" — may differ when acting
  _row: number;
}

// ---------------------------------------------------------------------------
// OBI BI Payroll  ("Payroll Detail" CSV / "BI Payroll" sheet in Labor Report)
//
// Per-pay-period rows — NOT a YTD summary.
// Each row = one employee × one earning code × one pay period.
// ---------------------------------------------------------------------------

export interface ObiPayrollRow {
  _source: 'obi-payroll';
  fiscalYear: string;
  departmentCode: string;
  departmentName: string;
  positionIdentifier: string;   // "Position Identifier" — numeric string
  personNumber: string;         // "Person Number"
  personFullName: string;       // "Person Full Name"
  jobCode: string;              // "Job Code" — format "COMMN:XXXX"
  jobDescription: string;
  accountCode: string;
  fund: string;                 // "Fund Code"
  authority: string;            // "Authority Code"
  earningPeriodNumber: number;  // "Earning Period Number"
  earningPeriodEnd: string;     // "Earning Period End Date" — ISO date
  earningsCode: string;         // "Earnings Code" — WKP, ACTFLT, OT, etc.
  earningsDescription: string;
  balanceAmount: number;        // "Balance Amount" — dollars for this row
  payPeriodFTE: number;         // "Pay Period FTE"
  appointmentType: string;      // "HR Assignment Appointment Type"
  _row: number;
}

export type ImportedRow =
  | BfmPositionRow
  | BfmNonPositionRow
  | PsHcmPpRow
  | ObiPayrollRow;
