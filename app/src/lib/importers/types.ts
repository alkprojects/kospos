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
  snapshotDate: string;         // A  "Snapshot Date"
  positionNumber: string;       // B  primary key
  jobCode: string;              // C  "Position Job Code"
  jobCodeDescription: string;   // D  "Position Description"
  positionDivision: string;     // F  "Position Division" (DBI-only text label)
  /**
   * Effective department code (from P&P col G "Position Department ID"). This
   * is the *effective* / where-the-employee-works dept, distinct from the
   * budgeted dept (`budgetDepartmentCode`) and the combo dept
   * (`comboDepartmentCode`). See labor-report.md § Department-code semantics.
   */
  departmentCode: string;
  departmentName: string;       // H  "Position Department Description"
  positionMaxHeadcount: number; // I  >1 means a pool position
  positionStatus: string;       // E  "Approved" / "Proposed" / "Frozen"
  fillStatus: string;           // N  "FILLED" / "VACANT" / "PARTIALLY FILLED" / "OVER FILLED"
  vice1EmplId: string;          // P
  vice1Name: string;            // Q
  previousEmployee: string;     // T  "Previous Employee" — last known incumbent
  emplId: string;               // W  "Current Employee ID" — blank if vacant
  employeeName: string;         // Z  "Person Full Name"
  employeeStatus: string;       // Y  "A" / "L" leave / blank
  appointmentType: string;      // AF "Employee Appointment Type" — PCS, PEX, TEX, ELC, TPV
  exemptCategory: string;       // AG "EE Exempt Category Description" — Charter §10.104 subsection
  salaryStep: string;           // AH "Employee Step"
  hourlyRate: number;           // AI "Employee Hourly Rate"
  meritIncreaseDate: string;    // AJ "Employee Merit Increase Date"
  reportsToPosition: string;    // AK "Position Reports To" (position number, not name)
  managerFirstName: string;     // AL
  managerLastName: string;      // AM
  cat1718AppointmentDate: string; // AV "CAT_17_18 Appointment Date"
  cat1718ExemptCode: string;    // AW "CAT_17_18 Exempt Code" — "17" / "18" / blank
  cat1718ExemptMonths: number;  // AX "CAT_17_18 Exempt Months"
  cat1718TxExpiredDate: string; // AY "CAT_17_18 Exempt TX Expired Date"
  rosterCode: string;           // AZ "Roster Code"
  rosterDescription: string;    // BA "Roster Code Description"
  /** Combo Code from col BB. When set, redirects payroll posting. */
  comboCode: string;
  /** Combo-code department (col BD). */
  comboDepartmentCode: string;
  comboDepartmentName: string;  // BE
  rtfId: string;                // BI "Latest RTF ID"
  rtfStatus: string;            // BL
  rtfSubmittedDate: string;     // BK
  rtfExpectedFillDate: string;  // BN "RTF Expected Fill date" (lowercase d in source)
  /**
   * Budgeted department code (col CB "Budget Department Code 1"). Locked at
   * budget adoption; cannot change mid-year. See labor-report.md §
   * Department-code semantics.
   */
  budgetDepartmentCode: string;
  budgetDepartmentName: string; // CC
  budgetJobCode: string;        // BU "Budget Job Code 1"
  fte: number;                  // BR "Budget Position Total FTE"
  employeeJobCode: string;      // AD "Employee Job Code" — may differ when acting
  vacantDate: string;           // CI "Vacant Date"
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
