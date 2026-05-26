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
// Real eturn carries 64 columns (A:BL) per labor-report.md § Tab 4. Columns
// fall into four bands:
//   - Position metadata     (A:AF)  identity, chartfields, job class, status
//   - Date metadata         (AG:AJ) FY span (PPD start/end, FY end)
//   - FY-this layers        (AK:AZ) Original / Base / Department / Mayor /
//                                   Committee / Technical Adjustment / Board
//                                   plus a prior-FY Original (AK:AL)
//   - FY-plus-one layers    (BA:BL) Base / Department / Mayor / Committee /
//                                   Technical Adjustment / Board
// Each layer has two cells: FTE + Dollars.
//
// The importer preserves every layer so variance views can compare across
// budget phases (e.g. "what changed between Mayor and Board?"). The
// default-anchor `fte` / `budgetedSalary` is the most-advanced approved
// phase of the latest fiscal year present, per the precedence:
//   Board > Technical Adjustment > Committee > Mayor > Department > Base > Original
// ---------------------------------------------------------------------------

/** The seven budget phases of the SF budget cycle, ordered base → adopted. */
export type BfmBudgetPhase =
  | 'Original'
  | 'Base'
  | 'Department'
  | 'Mayor'
  | 'Committee'
  | 'TechnicalAdjustment'
  | 'Board';

/** One layer's two cells: FTE + dollar amount. */
export interface BfmBudgetLayer {
  fte: number;
  dollars: number;
}

/**
 * The set of layers present in one fiscal year on one position. Keys are
 * the seven possible phases; only the phases actually present in the eturn
 * for that FY are populated. Use `pickAdoptedPhase` (in lib/budget/) to
 * resolve to the most-advanced layer.
 */
export type BfmBudgetLayers = Partial<Record<BfmBudgetPhase, BfmBudgetLayer>>;

export interface BfmPositionRow {
  _source: 'bfm-position';

  /* ---- Identity ---- */
  /** "BY HCM Position#" — the budget-year position number */
  positionNumber: string;
  /** "Prior Budget HCM Position#" — prior year number (may differ) */
  priorPositionNumber: string;
  /** "Position Code" — may differ from HCM position number on new positions. */
  positionCode: string;
  /** "Prior Budget Position Code". */
  priorPositionCode: string;
  /** "FormID" — internal BFM form identifier. */
  formId: string;

  /* ---- Dept tree ---- */
  /** "Dept Grp" — dept-group code (DBI / CPC / etc.). */
  deptGroup: string;
  /** "Division" code. */
  division: string;
  /** "Division Title". */
  divisionTitle: string;
  /** "Section" code. */
  section: string;
  /** "Section Title". */
  sectionTitle: string;
  /** "GFS Type" (NGFS = non-General Fund). */
  gfsType: string;
  departmentCode: string;       // "Dept ID"
  departmentName: string;       // "Dept ID Title"

  /* ---- Chartfields ---- */
  fund: string;
  fundTitle: string;
  authority: string;
  authorityTitle: string;
  project: string;
  projectTitle: string;
  activity: string;
  activityTitle: string;
  /** "Account Lvl 5 Title" — e.g. "Salaries & Wages". */
  accountLvl5Title: string;
  /** "Agency Use" code (used by a handful of depts; blank for DBI). */
  agencyUse: string;
  /** "Agency Use Title". */
  agencyUseTitle: string;

  /* ---- Job class + union ---- */
  jobCode: string;              // "Job Class" e.g. "6321_C"
  jobCodeDescription: string;   // "Job Class Title"
  /** "Job Class Tier" — within-class tier (some classes have A/B/C tiers). */
  jobClassTier: string;
  empOrg: string;               // "Emp Org" — employee organization / union group
  empOrgTitle: string;          // "Emp Org Title"
  retIndicator: string;         // "Ret Indicator" — retirement code (C/U)

  /* ---- Status ---- */
  positionStatus: string;       // "Status" — "A" active, "I" inactive, "S" special
  action: string;               // "Action" — e.g. "New" / "Reclass" / "Delete"

  /* ---- FY span ---- */
  /** "Fiscal Year Start" — calendar year the FY starts (e.g. "2026" for FY26-27). */
  fiscalYearStart: string;
  /** "PPD Start" — earliest pay-period date the position is active for. */
  ppdStart: string;
  /** "Fiscal Year End" — calendar year the FY ends. */
  fiscalYearEnd: string;
  /** "PPD End" — last pay-period date the position is active for. */
  ppdEnd: string;

  /* ---- Budget layers, keyed by FY ---- */
  /**
   * Map of fiscalYearLabel → layers. The label is the "FY YYYY-YY" string
   * from the column header (e.g. "FY 2025-26", "FY 2026-27"). Multiple FYs
   * coexist on every row in the eturn (FY-this columns + FY-plus-one
   * columns are populated together).
   *
   * The prior FY (e.g. "FY 2024-25") only carries Original in the eturn and
   * shows up as a layer set with just `{ Original: {...} }`.
   */
  budgetByFy: Record<string, BfmBudgetLayers>;

  /* ---- Default anchor (back-compat) ---- */
  /**
   * The "default-pick" FY label (latest present in the eturn). FY-plus-one
   * usually beats FY-this once BY+1 columns appear. Empty when no budget
   * columns are present.
   */
  defaultFiscalYear: string;
  /**
   * The "default-pick" phase for `defaultFiscalYear`. Most-advanced approved
   * phase per `BfmBudgetPhase` order. Empty when no budget columns are
   * present.
   */
  defaultPhase: BfmBudgetPhase | '';
  /** FTE from `(defaultFiscalYear, defaultPhase)`. 0 when unresolved. */
  fte: number;
  /** Dollar amount from the same `(defaultFiscalYear, defaultPhase)`. */
  budgetedSalary: number;
  /**
   * Display label of the FTE column used (e.g. "FY 2026-27 Mayor FTE").
   * Kept for back-compat with code that reports which phase was chosen.
   */
  budgetPhaseColumn: string;

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
// 39 columns in the real OBI export (col AM is a trailing blank, ignored).
// See docs/domain/labor-report.md § Tab 7 — BI Payroll for full column inventory.
// ---------------------------------------------------------------------------

export interface ObiPayrollRow {
  _source: 'obi-payroll';

  // Fiscal year + department-group identity
  fiscalYear: string;                 // A  "Fiscal Year"
  departmentGroupCode: string;        // B  "Department Group Code" — DBI/CPC etc.

  // Fund hierarchy
  fundLvl1Code: string;               // C  "Fund Lvl 1 Code"
  fundLvl1Description: string;        // D  "Fund Lvl 1 Desc"
  fundControl: string;                // E  "Fund Control" — FACCT/FCNT
  fund: string;                       // F  "Fund Code" — 6-digit
  fundDescription: string;            // G  "Fund Description"

  // Department
  departmentCode: string;             // H  "Department Code"
  departmentName: string;             // I  "Department Description"

  // Project / Activity / Authority
  projectCode: string;                // J  "Project Code"
  projectDescription: string;         // K  "Project Description"
  activityCode: string;               // L  "Activity Code"
  activityDescription: string;        // M  "Activity Description"
  authorityLvl1Code: string;          // N  "Authority Lvl 1 Code"
  authorityLvl1Description: string;   // O  "Authority Lvl 1 Description"
  authority: string;                  // P  "Authority Code"
  authorityDescription: string;       // Q  "Authority Description"

  // Account
  accountLvl2Description: string;     // R  "Account Lvl 2 Description"
  accountLvl5Name: string;            // S  "Account Lvl 5 Name"
  accountLvl3Description: string;     // T  "Account Lvl 3 Description"
  accountCode: string;                // U  "Account Code"
  /**
   * "Account Description" (col V) — the text used by every Step / Report Data
   * exclusion SUMIFS. The 4 special-class bucket strings are:
   *   "Overtime - Scheduled Misc"
   *   "Ret Payout - SP & Vac - Misc"
   *   "Premium Pay - Misc"
   *   "Temp Misc LumpSum Payoff"
   * Anything else = regular labor. See lib/payroll/types.ts ACCOUNT_DESCRIPTIONS.
   */
  accountDescription: string;

  // Earning period
  earningPeriodNumber: number;        // W  "Earning Period Number" — all-zero in current exports; PP is derived from X
  earningPeriodEnd: string;           // X  "Earning Period End Date" — the PPE

  // Person
  personNumber: string;               // Y  "Person Number"
  personFullName: string;             // Z  "Person Full Name"

  // Roster
  rosterCode: string;                 // AA "Roster Code"

  // Earnings
  earningsCode: string;               // AB "Earnings Code" — WKP, OTP, VPO, etc. Null for benefit lines.
  earningsDescription: string;        // AC "Earnings Code Description"

  // Position + Job
  positionIdentifier: string;         // AD "Position Identifier" — the per-position key
  /**
   * AE "Job Code" — the 4-digit SF job code, stripped of the `COMMN:` prefix.
   * The original source value (e.g. `"COMMN:5380"`) is split into:
   *   jobCode      = "5380"
   *   jobCodeSet   = "COMMN"
   * See labor-report.md § Tab 7 KosPos improvement #5.
   */
  jobCode: string;
  jobCodeSet: string;                 // "COMMN" or department-specific prefix; "" if raw value had no prefix
  jobDescription: string;             // AF "Job Description"

  // Assignment
  assignmentNumber: number;           // AG "Assignment Number" — 0 = primary, >0 = acting/additional
  appointmentType: string;            // AH "HR Assignment Appointment Type" — PCS/PEX/TEX/etc.

  // Hours / FTE / Amount
  isFteHours: string;                 // AI "Is FTE Hours" — "Y"/"N"
  earningHours: number;               // AJ "Earning Hours"
  payPeriodFTE: number;               // AK "Pay Period FTE"
  balanceAmount: number;              // AL "Balance Amount" — the dollar amount

  /**
   * MAX(earningPeriodEnd) across all rows in the same import call. Lets the
   * payroll cube group rows from different uploads into separate snapshots
   * without an explicit upload-batch tracker on the store. Stamped by the
   * importer.
   */
  _asOfDate: string;

  _row: number;
}

export type ImportedRow =
  | BfmPositionRow
  | BfmNonPositionRow
  | PsHcmPpRow
  | ObiPayrollRow;
