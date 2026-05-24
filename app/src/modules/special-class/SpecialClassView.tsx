import { useState } from 'react';
import {
  historicalActualsMean,
  colaAdjustToYear,
  applySentiment,
  ytdBudgetPace,
  projectRpoYearEnd,
  overm,
} from '../../lib/special-class';
import type { RetirementSentiment } from '../../lib/special-class';

// ---------------------------------------------------------------------------
// Reference data — DBI RTPOM_E.
// Numbers flow through the rtpom functions so the page stays locked to the
// unit tests.  See docs/domain/special-class.md §RTPOM_E and
// docs/domain/budget-process.md (three-function model).
// ---------------------------------------------------------------------------

// Pay-period constants shared across RPO and OVERM — pulled live from the
// Labor Report `Calendar` tab in production; hardcoded here at the 5.21.26
// snapshot for v1.
const PP_ELAPSED = 22.4;       // Calendar!I2
const PP_TOTAL   = 26.1;       // Calendar!J2

// FY26 current-year reporting — RPO (sources noted per Alex's workbook trace).
const FY26 = {
  fy: 'FY26',
  ppElapsed: PP_ELAPSED,
  ppTotal:   PP_TOTAL,
  budget: 249_998,             // BFM 15.10.006 FY26 tab, DBI + RPO filter, col AZ Final Approved Budget
  ytdActual: 359_014,          // Labor Report `Retirement Payout` tab, DBI YTD rollup
};

// FY26 current-year reporting — OVERM (sources noted per Alex's workbook trace).
// BN6 and BN8 are BFM-budgeted figures; they refresh once per FY (super-admin task).
const FY26_OVERM = {
  fy: 'FY26',
  ppElapsed: PP_ELAPSED,
  ppTotal:   PP_TOTAL,
  budgetedSalary: 349_749,     // Labor Report `Overtime` tab BN6
  budgetedTotal:  380_000,     // Labor Report `Overtime` tab BN8 (matches Operating Report G37)
  ytdSalaryActual: 438_786.15, // Operating Report E37 = GETPIVOTDATA filtered to OT salary
};

// FY-prior reference (workbook Special Class!AT5 row used as a representative
// figure). When per-row imports land, this becomes a sum or per-row table.
// For DBI ADM Records Management row 5: AT5 = $1,592.62 prior-year actual.
const OVERM_PRIOR_YEAR_SALARY_ACTUAL = 1_592.62;

// FY27-28 budget development cycle (next 2 years).
// SF builds budgets in rolling 2-year cycles — see docs/domain/budget-process.md
// §"Two-year budget cycle". Current cycle = FY27-28 (BY = FY27, BY+1 = FY28).
//
// Historical actuals are the inputs for budget development.  The window is
// 9 entries: 8 settled actuals 2018-2025 plus the FY26 projection
// (Operating Report Summary H38).  Once FY26 closes the projection is
// replaced by the actual.
//
// `kind` distinguishes settled actuals from the still-open FY26 projection so
// the UI can tag it differently and a future cycle can reconcile.
const HISTORICAL = [
  { year: 2018, amount: 142_944, kind: 'actual' as const },
  { year: 2019, amount: 93_857,  kind: 'actual' as const },
  { year: 2020, amount: 341_022, kind: 'actual' as const },
  { year: 2021, amount: 146_645, kind: 'actual' as const },
  { year: 2022, amount: 310_700, kind: 'actual' as const },
  { year: 2023, amount: 88_219,  kind: 'actual' as const },
  { year: 2024, amount: 181_295, kind: 'actual' as const },
  { year: 2025, amount: 299_051, kind: 'actual' as const },
  // FY26 projection feeds in — computed below from FY26 reporting block, not
  // a duplicate constant.  Spread into the array at module load.
];

// Per-year COLA placeholder.  Real historical COLAs live on the Controller's
// website (per Alex); swap this constant for a per-year map once loaded.
// Current FY budget year being developed.
const COLA_PCT_PER_YEAR = 0.025;
const COLA_TARGET_YEAR  = 2027;  // FY27 = BY of the current cycle

// Static metadata about each year in the cycle.  Sentiment + magnitude live
// in component state so the user can adjust them.
const CYCLE_LABEL = 'FY27-28';
const CYCLE_FYS = [
  { fy: 'FY27', cycleRole: 'BY' as const },
  { fy: 'FY28', cycleRole: 'BY+1' as const },
];

// Initial sentiment per FY.  FY27 starts at "more, 25%" with Alex's
// IS-retirements justification — this lands at ~$301k (matches his
// previously-confirmed FY27 chosen amount of $300k).  FY28 starts at "same,
// 0%" — refine each cycle as BY+1 becomes the new BY.
interface FySentimentState {
  sentiment: RetirementSentiment;
  adjustmentPct: number;
  justification: string;
}

const INITIAL_FY27: FySentimentState = {
  sentiment: 'more',
  adjustmentPct: 25,
  justification: 'Many retirements expected in IS',
};
const INITIAL_FY28: FySentimentState = {
  sentiment: 'same',
  adjustmentPct: 0,
  justification: '',
};

// ---------------------------------------------------------------------------
// Computed values — RPO (derived from rtpom functions)
// ---------------------------------------------------------------------------

const FY26_PP_REMAINING = FY26.ppTotal - FY26.ppElapsed;
const FY26_YTD_PACE  = ytdBudgetPace(FY26.budget, FY26.ppElapsed, FY26.ppTotal);
const FY26_PROJECTED = projectRpoYearEnd(FY26.budget, FY26.ytdActual, FY26_PP_REMAINING);
const FY26_BALANCE           = FY26.budget - FY26.ytdActual;
const FY26_PROJECTED_BALANCE = FY26.budget - FY26_PROJECTED;

// ---------------------------------------------------------------------------
// Computed values — OVERM (derived from overm functions)
// ---------------------------------------------------------------------------

const OVERM_FY26_YTD_PACE = ytdBudgetPace(
  FY26_OVERM.budgetedTotal,
  FY26_OVERM.ppElapsed,
  FY26_OVERM.ppTotal,
);
const OVERM_FY26_PROJECTED = overm.projectOvermYearEnd(
  FY26_OVERM.ytdSalaryActual,
  FY26_OVERM.ppElapsed,
  FY26_OVERM.ppTotal,
  FY26_OVERM.budgetedSalary,
  FY26_OVERM.budgetedTotal,
);
const OVERM_FY26_BALANCE = FY26_OVERM.budgetedTotal - FY26_OVERM.ytdSalaryActual;
const OVERM_FY26_PROJECTED_BALANCE = FY26_OVERM.budgetedTotal - OVERM_FY26_PROJECTED;
const OVERM_FY26_GROSS_UP = overm.salaryToTotalGrossUp(
  FY26_OVERM.budgetedSalary,
  FY26_OVERM.budgetedTotal,
);
const OVERM_GROSSED_UP_PRIOR = overm.grossUpFringe(OVERM_PRIOR_YEAR_SALARY_ACTUAL);

// Suggested per-FY OVERM budget = roundup($1k) of max(grossed-up prior, FY26 projection).
// Per Alex (Session 11), the user can edit each year directly.
const OVERM_FY27_SUGGESTED = overm.suggestOvermBudget(
  OVERM_GROSSED_UP_PRIOR,
  OVERM_FY26_PROJECTED,
);
// FY28 starts equal to FY27 suggested until the user adjusts.
const OVERM_FY28_SUGGESTED = OVERM_FY27_SUGGESTED;

// Append the FY26 projection to the historical window.  Using the projection
// (not just YTD) matches what gets fed into "what should we budget next year"
// thinking — the projection is the best estimate of where FY26 closes.
const HISTORICAL_FULL = [
  ...HISTORICAL,
  { year: 2026, amount: FY26_PROJECTED, kind: 'projection' as const },
];

// Adjusted to FY27 dollars at the COLA placeholder.
const HISTORICAL_ROWS = HISTORICAL_FULL.map(h => ({
  ...h,
  adjusted: colaAdjustToYear(h.amount, h.year, COLA_TARGET_YEAR, COLA_PCT_PER_YEAR),
}));

const HISTORICAL_MEAN_RAW = historicalActualsMean(HISTORICAL_ROWS.map(r => r.amount));
const HISTORICAL_MEAN_ADJ = historicalActualsMean(HISTORICAL_ROWS.map(r => r.adjusted));

// The baseline for sentiment adjustment is the COLA-adjusted mean (FY27 $).
const BASELINE = HISTORICAL_MEAN_ADJ;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function fmtSigned(n: number): string {
  if (n > 0) return `+${fmt(n)}`;
  return fmt(n);
}

const SECTION: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--surface)',
  marginBottom: 16,
  overflow: 'hidden',
};

const SECTION_HEADER: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface)',
};

const SECTION_BODY: React.CSSProperties = { padding: 14 };

const LABEL_TD: React.CSSProperties = {
  padding: '7px 12px',
  color: 'var(--muted)',
  fontSize: 12,
  width: 300,
  verticalAlign: 'top',
};
const VALUE_TD: React.CSSProperties = {
  padding: '7px 12px',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const OVER_BUDGET: React.CSSProperties = { color: '#c0392b' };

const INPUT_BASE: React.CSSProperties = {
  padding: '4px 6px',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

// ---------------------------------------------------------------------------
// OVERM FY card — direct-edit dollar input (Alex Session 11: cushion is
// per-row judgment; default rounded up to nearest $1k; user edits freely).
// ---------------------------------------------------------------------------

interface OvermFyState {
  amount: number;
  justification: string;
}

interface OvermFyCardProps {
  fy: string;
  cycleRole: string;
  suggested: number;
  state: OvermFyState;
  onChange: (next: OvermFyState) => void;
}

function OvermFyCard({ fy, cycleRole, suggested, state, onChange }: OvermFyCardProps) {
  const delta = state.amount - suggested;
  return (
    <div
      style={{
        padding: 14,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {fy} · {cycleRole}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          Suggested {fmt(suggested)}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Budget amount</div>
        <input
          type="number"
          min={0}
          step={1000}
          value={state.amount}
          onChange={e => onChange({ ...state, amount: Number(e.target.value) || 0 })}
          style={{
            ...INPUT_BASE,
            width: '100%',
            fontSize: 24,
            fontWeight: 700,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          vs suggested:{' '}
          <strong style={{ color: delta < 0 ? '#c0392b' : delta > 0 ? '#1e6b3c' : 'inherit' }}>
            {fmtSigned(delta)}
          </strong>
          {delta === 0 && ' (= suggested)'}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Justification</div>
        <textarea
          value={state.justification}
          onChange={e => onChange({ ...state, justification: e.target.value })}
          rows={2}
          placeholder="Why this amount?"
          style={{
            ...INPUT_BASE,
            width: '100%',
            fontSize: 12,
            resize: 'vertical',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chartfield allocation — two modes (existing vs manual) with a row table.
// Per Alex Session 11: best practice is per-department, but other depts'
// chartfield setups are messy. KosPos offers (1) auto-populated from labor
// report, (2) manual entry with + add row.
// ---------------------------------------------------------------------------

interface ChartfieldRow {
  id: string;
  fund: string;
  dept: string;
  project: string;
  activity: string;
  authority: string;
  account: string;
  amount: number;
}

type ChartfieldMode = 'existing' | 'manual';

// DBI's single OT chartfield — Alex flagged this as the "correct" placement.
// Other depts won't have this; stub will be replaced when labor-report import
// surfaces chartfield strings carrying OT budget.
function makeExistingDbiOtRow(amount: number): ChartfieldRow {
  return {
    id: 'dbi-ot',
    fund: '10190',
    dept: 'DBI',
    project: '10000000',
    activity: '0001',
    authority: '00000',
    account: '511000', // OT Salaries - Misc
    amount,
  };
}

let chartfieldRowSeq = 0;
function makeBlankRow(amount = 0): ChartfieldRow {
  chartfieldRowSeq += 1;
  return {
    id: `cf-${chartfieldRowSeq}-${Date.now()}`,
    fund: '',
    dept: '',
    project: '',
    activity: '',
    authority: '',
    account: '511000',
    amount,
  };
}

interface ChartfieldAllocatorProps {
  totalBudget: number;
  mode: ChartfieldMode;
  rows: ChartfieldRow[];
  onModeChange: (mode: ChartfieldMode) => void;
  onRowsChange: (rows: ChartfieldRow[]) => void;
}

const CF_HEADER_TD: React.CSSProperties = {
  padding: '5px 8px',
  textAlign: 'left',
  fontSize: 11,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  fontWeight: 600,
};

function ChartfieldAllocator({
  totalBudget,
  mode,
  rows,
  onModeChange,
  onRowsChange,
}: ChartfieldAllocatorProps) {
  const allocated = rows.reduce((sum, r) => sum + r.amount, 0);
  const remainder = totalBudget - allocated;
  const balanced = Math.abs(remainder) < 0.5;
  const editingDisabled = mode === 'existing';

  const updateRow = (id: string, patch: Partial<ChartfieldRow>) => {
    onRowsChange(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };
  const deleteRow = (id: string) => onRowsChange(rows.filter(r => r.id !== id));
  const addRow = () => onRowsChange([...rows, makeBlankRow(Math.max(0, remainder))]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Allocation mode</span>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {(['existing', 'manual'] as ChartfieldMode[]).map(m => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                style={{
                  padding: '4px 12px',
                  border: 'none',
                  background: active ? 'var(--accent-soft, #eef3ff)' : 'transparent',
                  color: active ? 'var(--accent, #2563eb)' : 'var(--text)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {m === 'existing' ? 'Use existing chartfields' : 'Manually enter'}
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'existing' && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
          For DBI, one OT chartfield carries the full budget. Other departments will
          populate from the labor report once chartfield-string import lands.
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={CF_HEADER_TD}>Fund</th>
            <th style={CF_HEADER_TD}>Dept</th>
            <th style={CF_HEADER_TD}>Project</th>
            <th style={CF_HEADER_TD}>Activity</th>
            <th style={CF_HEADER_TD}>Authority</th>
            <th style={CF_HEADER_TD}>Account</th>
            <th style={{ ...CF_HEADER_TD, textAlign: 'right' }}>Amount</th>
            <th style={{ ...CF_HEADER_TD, width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} style={{ padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                No allocation rows yet. {mode === 'manual' ? 'Click + Add row below.' : 'Switch to "Manually enter" to add rows.'}
              </td>
            </tr>
          )}
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '4px 8px' }}>
                <input
                  value={r.fund}
                  onChange={e => updateRow(r.id, { fund: e.target.value })}
                  disabled={editingDisabled}
                  style={{ ...INPUT_BASE, width: 64 }}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  value={r.dept}
                  onChange={e => updateRow(r.id, { dept: e.target.value })}
                  disabled={editingDisabled}
                  style={{ ...INPUT_BASE, width: 64 }}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  value={r.project}
                  onChange={e => updateRow(r.id, { project: e.target.value })}
                  disabled={editingDisabled}
                  style={{ ...INPUT_BASE, width: 90 }}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  value={r.activity}
                  onChange={e => updateRow(r.id, { activity: e.target.value })}
                  disabled={editingDisabled}
                  style={{ ...INPUT_BASE, width: 64 }}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  value={r.authority}
                  onChange={e => updateRow(r.id, { authority: e.target.value })}
                  disabled={editingDisabled}
                  style={{ ...INPUT_BASE, width: 64 }}
                />
              </td>
              <td style={{ padding: '4px 8px' }}>
                <input
                  value={r.account}
                  onChange={e => updateRow(r.id, { account: e.target.value })}
                  disabled={editingDisabled}
                  style={{ ...INPUT_BASE, width: 72 }}
                />
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={r.amount}
                  onChange={e => updateRow(r.id, { amount: Number(e.target.value) || 0 })}
                  disabled={editingDisabled}
                  style={{ ...INPUT_BASE, width: 110, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                />
              </td>
              <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                {mode === 'manual' && (
                  <button
                    onClick={() => deleteRow(r.id)}
                    title="Delete row"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#c0392b',
                      fontSize: 16,
                      cursor: 'pointer',
                      padding: '0 4px',
                      fontFamily: 'inherit',
                    }}
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
          <tr style={{ background: balanced ? 'var(--accent-soft, #eef3ff)' : '#fff5f5' }}>
            <td colSpan={6} style={{ padding: '6px 8px', fontWeight: 600, fontSize: 12 }}>
              Allocated · Budget · Remainder
            </td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {fmt(allocated)} / {fmt(totalBudget)}{' '}
              <span style={{ color: balanced ? '#1e6b3c' : '#c0392b' }}>
                ({fmtSigned(remainder)})
              </span>
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      {mode === 'manual' && (
        <button
          onClick={addRow}
          style={{
            marginTop: 8,
            padding: '5px 12px',
            border: '1px dashed var(--border)',
            background: 'transparent',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
            color: 'var(--accent, #2563eb)',
            fontFamily: 'inherit',
          }}
        >
          + Add row
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentiment card — per-FY inputs + computed chosen amount
// ---------------------------------------------------------------------------

const SENTIMENT_BUTTONS: { value: RetirementSentiment; label: string }[] = [
  { value: 'less', label: 'Less' },
  { value: 'same', label: 'Same' },
  { value: 'more', label: 'More' },
];

interface FyCardProps {
  fy: string;
  cycleRole: string;
  baseline: number;
  state: FySentimentState;
  onChange: (next: FySentimentState) => void;
}

function FyCard({ fy, cycleRole, baseline, state, onChange }: FyCardProps) {
  const chosen = applySentiment(baseline, state.sentiment, state.adjustmentPct);
  const cushion = chosen - baseline;
  const pctDisabled = state.sentiment === 'same';

  return (
    <div
      style={{
        padding: 14,
        border: '1px solid var(--border)',
        borderRadius: 6,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {fy} · {cycleRole}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          Baseline {fmt(baseline)}
        </div>
      </div>

      {/* Sentiment + pct row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Expect</span>
        <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {SENTIMENT_BUTTONS.map(b => {
            const active = state.sentiment === b.value;
            return (
              <button
                key={b.value}
                onClick={() => onChange({ ...state, sentiment: b.value })}
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  background: active ? 'var(--accent-soft, #eef3ff)' : 'transparent',
                  color: active ? 'var(--accent, #2563eb)' : 'var(--text)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: pctDisabled ? 'var(--muted)' : 'var(--text)' }}>retirements by</span>
        <input
          type="number"
          min={0}
          step={1}
          value={state.adjustmentPct}
          disabled={pctDisabled}
          onChange={e => onChange({ ...state, adjustmentPct: Number(e.target.value) || 0 })}
          style={{
            width: 64,
            padding: '4px 6px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 13,
            fontFamily: 'inherit',
            textAlign: 'right',
            opacity: pctDisabled ? 0.5 : 1,
          }}
        />
        <span style={{ fontSize: 12, color: pctDisabled ? 'var(--muted)' : 'var(--text)' }}>%</span>
      </div>

      {/* Computed chosen amount */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Chosen amount</div>
        <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(chosen)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Cushion vs baseline: <strong style={{ color: cushion < 0 ? '#c0392b' : 'inherit' }}>{fmtSigned(cushion)}</strong>
        </div>
      </div>

      {/* Justification */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Justification</div>
        <textarea
          value={state.justification}
          onChange={e => onChange({ ...state, justification: e.target.value })}
          rows={2}
          placeholder="Why did you pick this amount?"
          style={{
            width: '100%',
            padding: 6,
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function SpecialClassView() {
  const [fy27, setFy27] = useState<FySentimentState>(INITIAL_FY27);
  const [fy28, setFy28] = useState<FySentimentState>(INITIAL_FY28);
  const fyStateByName: Record<string, [FySentimentState, (s: FySentimentState) => void]> = {
    FY27: [fy27, setFy27],
    FY28: [fy28, setFy28],
  };

  // OVERM state — per-FY budget amount + chartfield allocation
  const [overmFy27, setOvermFy27] = useState<OvermFyState>({
    amount: OVERM_FY27_SUGGESTED,
    justification: '',
  });
  const [overmFy28, setOvermFy28] = useState<OvermFyState>({
    amount: OVERM_FY28_SUGGESTED,
    justification: '',
  });
  const [cfYear, setCfYear] = useState<'FY27' | 'FY28'>('FY27');
  const [cfMode, setCfMode] = useState<ChartfieldMode>('existing');
  const [cfRows, setCfRows] = useState<ChartfieldRow[]>([
    makeExistingDbiOtRow(OVERM_FY27_SUGGESTED),
  ]);
  const overmTotalForYear = cfYear === 'FY27' ? overmFy27.amount : overmFy28.amount;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Special Class</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
          DBI. KosPos has three jobs for every labor line: report current actuals,
          project rest-of-year, and develop next two years' budget (SF runs rolling
          2-year cycles). Sections below: <strong>RTPOM_E</strong> (Retirement Payout,
          account 510210) and <strong>OVERM_E</strong> (Overtime). Each runs the
          three-function model independently. See{' '}
          <code>docs/domain/special-class.md</code>.
        </p>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Section 1 — FY26 current year                                        */}
      {/* -------------------------------------------------------------------- */}
      <section style={SECTION}>
        <div style={SECTION_HEADER}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            FY26 · Current Year — Actuals & Projection
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            FY26 PP elapsed / total: <strong style={{ color: 'var(--text)' }}>{FY26.ppElapsed} / {FY26.ppTotal}</strong>
          </div>
        </div>
        <div style={SECTION_BODY}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  Total Budget
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    BFM 15.10.006 FY26 · DBI · RPO · col AZ Final Approved
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(FY26.budget)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  YTD Actual
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Labor Report · Retirement Payout tab · DBI YTD rollup
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(FY26.ytdActual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  YTD Budget Pace (straight-line)
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Budget × PP elapsed / PP total
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(FY26_YTD_PACE)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>Balance (Budget − YTD Actual)</td>
                <td style={{ ...VALUE_TD, ...(FY26_BALANCE < 0 ? OVER_BUDGET : {}) }}>
                  {fmtSigned(FY26_BALANCE)}
                  {FY26_BALANCE < 0 && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600 }}>(OVER BUDGET)</span>}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  Projected Year-End Actual
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Operating Report Summary H38 = MAX(Budget, YTD Actual)
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(FY26_PROJECTED)}</td>
              </tr>
              <tr>
                <td style={LABEL_TD}>Projected Balance</td>
                <td style={{ ...VALUE_TD, ...(FY26_PROJECTED_BALANCE < 0 ? OVER_BUDGET : {}) }}>
                  {fmtSigned(FY26_PROJECTED_BALANCE)}
                  {FY26_PROJECTED_BALANCE < 0 && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600 }}>(OVER BUDGET)</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* Section 2 — FY27-28 budget development cycle                         */}
      {/* -------------------------------------------------------------------- */}
      <section style={SECTION}>
        <div style={SECTION_HEADER}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {CYCLE_LABEL} · Budget Cycle — Budget Development
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            SF builds budgets in rolling 2-year cycles (BY + BY+1). For each year,
            pick a sentiment (same / more / less) and a magnitude — the chosen
            amount is computed from the COLA-adjusted historical baseline.
          </div>
        </div>
        <div style={SECTION_BODY}>
          {/* Historical actuals — shared across both years in the cycle */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Historical Actuals (Account 510210) — shared baseline
            </div>
            <table style={{ width: '100%', maxWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '5px 12px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Year</th>
                  <th style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Actual ($ of year)</th>
                  <th style={{ padding: '5px 12px', textAlign: 'right', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>FY{COLA_TARGET_YEAR - 2000} $ (COLA-adj)</th>
                </tr>
              </thead>
              <tbody>
                {HISTORICAL_ROWS.map(h => (
                  <tr key={h.year} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 12px', color: 'var(--muted)' }}>
                      BY {h.year}
                      {h.kind === 'projection' && (
                        <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 8, background: '#fff8e1', color: '#7a5a00', fontWeight: 600 }}>
                          PROJ
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '5px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(h.amount)}
                    </td>
                    <td style={{ padding: '5px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: h.year === COLA_TARGET_YEAR ? 'var(--muted)' : 'inherit' }}>
                      {fmt(Math.round(h.adjusted))}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--accent-soft, #eef3ff)' }}>
                  <td style={{ padding: '7px 12px', fontWeight: 600 }}>Mean ({HISTORICAL_ROWS.length} yr)</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {fmt(HISTORICAL_MEAN_RAW)}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {fmt(HISTORICAL_MEAN_ADJ)}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              FY26 is the in-progress projection (Operating Report Summary H38),
              included so the baseline reflects the latest expectation, not just
              settled actuals. COLA placeholder = {(COLA_PCT_PER_YEAR * 100).toFixed(1)}%/yr;
              swap for actual SF COLAs from the Controller's site when available.
              Cushion on each year-card below is measured against the COLA-adjusted mean.
            </div>
          </div>

          {/* Two-year cycle: side-by-side stateful cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {CYCLE_FYS.map(({ fy, cycleRole }) => {
              const [state, setState] = fyStateByName[fy];
              return (
                <FyCard
                  key={fy}
                  fy={fy}
                  cycleRole={cycleRole}
                  baseline={BASELINE}
                  state={state}
                  onChange={setState}
                />
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
            Per-employee payout scenarios (PR #6) will let you add specific
            retirement candidates to refine the chosen amount. Allocation by
            chartfield string also pending — needs regular-labor totals per
            dept (Budget Master <code>I5:I23</code>). Multi-dept controls
            arrive when other depts are loaded; today everything shown is DBI.
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* OVERM_E — Overtime (Misc)                                            */}
      {/* ==================================================================== */}
      <div style={{ marginTop: 28, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>OVERM_E — Overtime</h3>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
          DBI. Payroll OT salary actuals (no dedicated benefit account; OT benefits
          pool with other benefit accounts). Projection annualizes YTD salary and
          grosses up to total cost using the BFM-budgeted salary→total ratio. See{' '}
          <code>docs/domain/special-class.md</code> §OVERM_E.
        </p>
      </div>

      {/* OVERM Section 1 — FY26 current year ---------------------------------- */}
      <section style={SECTION}>
        <div style={SECTION_HEADER}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            FY26 · Current Year — Actuals & Projection
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            FY26 PP elapsed / total:{' '}
            <strong style={{ color: 'var(--text)' }}>
              {FY26_OVERM.ppElapsed} / {FY26_OVERM.ppTotal}
            </strong>
            {' · '}Salary→total gross-up:{' '}
            <strong style={{ color: 'var(--text)' }}>{OVERM_FY26_GROSS_UP.toFixed(4)}×</strong>{' '}
            (BN8 / BN6)
          </div>
        </div>
        <div style={SECTION_BODY}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  Budgeted Total (salary + benefits)
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Overtime!BN8 / matches Operating Report G37
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(FY26_OVERM.budgetedTotal)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  Budgeted Salary (BFM)
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Overtime!BN6 — pivot from BFM position eturn (super-admin refreshes annually)
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(FY26_OVERM.budgetedSalary)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  YTD Salary Actual
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Operating Report E37 — payroll pivot, OT salary account only (no benefits)
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(FY26_OVERM.ytdSalaryActual)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  YTD Budget Pace (straight-line)
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Operating Report D37 = Budget × PP elapsed / PP total
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(OVERM_FY26_YTD_PACE)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>Balance (Budget − YTD Salary Actual)</td>
                <td style={{ ...VALUE_TD, ...(OVERM_FY26_BALANCE < 0 ? OVER_BUDGET : {}) }}>
                  {fmtSigned(OVERM_FY26_BALANCE)}
                  {OVERM_FY26_BALANCE < 0 && (
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600 }}>(OVER BUDGET)</span>
                  )}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={LABEL_TD}>
                  Projected Year-End (salary + benefits)
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                    Operating Report H37 = Overtime!BS15 — annualized salary × salary→total grossup
                  </div>
                </td>
                <td style={VALUE_TD}>{fmt(OVERM_FY26_PROJECTED)}</td>
              </tr>
              <tr>
                <td style={LABEL_TD}>Projected Balance</td>
                <td style={{ ...VALUE_TD, ...(OVERM_FY26_PROJECTED_BALANCE < 0 ? OVER_BUDGET : {}) }}>
                  {fmtSigned(OVERM_FY26_PROJECTED_BALANCE)}
                  {OVERM_FY26_PROJECTED_BALANCE < 0 && (
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600 }}>(OVER BUDGET)</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* OVERM Section 2 — FY27-28 budget development ------------------------- */}
      <section style={SECTION}>
        <div style={SECTION_HEADER}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            FY27-28 · Budget Cycle — Budget Development
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Default for each year = max(grossed-up FY-prior actual, FY26 projection),
            rounded up to the nearest \$1,000. Editable per Alex's Session 11
            walkthrough — cushion magnitude is judgment, not formula.
          </div>
        </div>
        <div style={SECTION_BODY}>
          {/* Reference baseline */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Reference baseline (shared)
            </div>
            <table style={{ width: '100%', maxWidth: 560, borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={LABEL_TD}>
                    FY-prior salary actual
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                      Special Class!AT5 (DBI ADM Records Management row, representative)
                    </div>
                  </td>
                  <td style={VALUE_TD}>{fmt(OVERM_PRIOR_YEAR_SALARY_ACTUAL)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={LABEL_TD}>
                    Grossed-up FY-prior (× 1.0765)
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                      Special Class!AU5 — OASDI 6.20% + Medicare 1.45%
                    </div>
                  </td>
                  <td style={VALUE_TD}>{fmt(OVERM_GROSSED_UP_PRIOR)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={LABEL_TD}>FY26 projection</td>
                  <td style={VALUE_TD}>{fmt(OVERM_FY26_PROJECTED)}</td>
                </tr>
                <tr style={{ background: 'var(--accent-soft, #eef3ff)' }}>
                  <td style={LABEL_TD}>
                    Suggested default
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                      max(grossed-up prior, projection) rounded up to nearest \$1k
                    </div>
                  </td>
                  <td style={{ ...VALUE_TD, fontWeight: 700 }}>{fmt(OVERM_FY27_SUGGESTED)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              When per-row imports land, this collapses to a per-dept × earnings-code
              table mirroring <code>Special Class!AR4:BD12</code>.
            </div>
          </div>

          {/* Two-year cycle: editable amount + justification per FY */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 }}>
            <OvermFyCard
              fy="FY27"
              cycleRole="BY"
              suggested={OVERM_FY27_SUGGESTED}
              state={overmFy27}
              onChange={setOvermFy27}
            />
            <OvermFyCard
              fy="FY28"
              cycleRole="BY+1"
              suggested={OVERM_FY28_SUGGESTED}
              state={overmFy28}
              onChange={setOvermFy28}
            />
          </div>

          {/* Chartfield allocation */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Chartfield Allocation
              </div>
              <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                {(['FY27', 'FY28'] as const).map(y => {
                  const active = cfYear === y;
                  return (
                    <button
                      key={y}
                      onClick={() => setCfYear(y)}
                      style={{
                        padding: '4px 12px',
                        border: 'none',
                        background: active ? 'var(--accent-soft, #eef3ff)' : 'transparent',
                        color: active ? 'var(--accent, #2563eb)' : 'var(--text)',
                        fontWeight: active ? 600 : 400,
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Allocating <strong style={{ color: 'var(--text)' }}>{fmt(overmTotalForYear)}</strong>{' '}
                across chartfield strings for {cfYear}.
              </span>
            </div>
            <ChartfieldAllocator
              totalBudget={overmTotalForYear}
              mode={cfMode}
              rows={cfRows}
              onModeChange={setCfMode}
              onRowsChange={setCfRows}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              "Use existing chartfields" auto-populates from chartfield strings that already
              carry OT budget in the labor report. For DBI a single string holds all OT; other
              departments are messier. "Manually enter" is the escape hatch for
              non-standard placements. Per Alex's Session 11 walkthrough.
            </div>
          </div>
        </div>
      </section>

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        RPO numbers flow through <code>rtpom.ts</code>; OVERM numbers flow through{' '}
        <code>overm.ts</code>. Values traced from{' '}
        <code>Labor Report 5.21.26.xlsx</code> and{' '}
        <code>DBI FY27-28 Budget Master</code>. Real per-chartfield rows will
        populate once the importers feed actual values into this view.
      </p>
    </div>
  );
}
