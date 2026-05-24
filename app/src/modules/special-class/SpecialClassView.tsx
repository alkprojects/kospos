import { useState } from 'react';
import {
  historicalActualsMean,
  colaAdjustToYear,
  applySentiment,
  ytdBudgetPace,
  projectRpoYearEnd,
} from '../../lib/special-class';
import type { RetirementSentiment } from '../../lib/special-class';

// ---------------------------------------------------------------------------
// Reference data — DBI RTPOM_E.
// Numbers flow through the rtpom functions so the page stays locked to the
// unit tests.  See docs/domain/special-class.md §RTPOM_E and
// docs/domain/budget-process.md (three-function model).
// ---------------------------------------------------------------------------

// FY26 current-year reporting (sources noted per Alex's workbook trace).
const FY26 = {
  fy: 'FY26',
  ppElapsed: 22.4,             // Labor Report `Calendar` tab I2
  ppTotal: 26.1,               // Labor Report `Calendar` tab J2
  budget: 249_998,             // BFM 15.10.006 FY26 tab, DBI + RPO filter, col AZ Final Approved Budget
  ytdActual: 359_014,          // Labor Report `Retirement Payout` tab, DBI YTD rollup
};

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
// Computed values (derived from rtpom functions)
// ---------------------------------------------------------------------------

const FY26_PP_REMAINING = FY26.ppTotal - FY26.ppElapsed;
const FY26_YTD_PACE  = ytdBudgetPace(FY26.budget, FY26.ppElapsed, FY26.ppTotal);
const FY26_PROJECTED = projectRpoYearEnd(FY26.budget, FY26.ytdActual, FY26_PP_REMAINING);
const FY26_BALANCE           = FY26.budget - FY26.ytdActual;
const FY26_PROJECTED_BALANCE = FY26.budget - FY26_PROJECTED;

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
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Special Class — RTPOM_E (Retirement Payout)</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
          DBI · Account 510210 (Ret Payout - SP & Vac - Misc). KosPos has three
          jobs for every labor line: report current actuals, project rest-of-year,
          and develop next two years' budget (SF runs rolling 2-year cycles).
          The two sections below correspond to the first two functions (FY26)
          and the third (FY27-28 cycle).
          See <code>docs/domain/special-class.md</code> §RTPOM_E.
        </p>
      </div>

      <div
        style={{
          padding: '10px 14px',
          marginBottom: 16,
          border: '1px solid #d4a017',
          background: '#fff8e1',
          borderRadius: 6,
          fontSize: 13,
          color: '#7a5a00',
        }}
      >
        <strong>Phase 4 PR #2: RPO only.</strong> The other seven special classes
        (Overtime, Premium, Step, MCCP Offset, Temporary, Positions Not Detailed,
        Attrition Savings) ship in their own PRs.
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

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        Numbers above flow through <code>rtpom.ts</code> with values traced from
        Alex's <code>Labor Report 5.21.26.xlsx</code> and{' '}
        <code>DBI FY27-28 Budget Master</code>. Real per-chartfield rows will
        populate once the importers feed actual values into this view.
      </p>
    </div>
  );
}
