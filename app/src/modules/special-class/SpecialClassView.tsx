import {
  historicalActualsMean,
  ytdBudgetPace,
  projectRpoYearEnd,
} from '../../lib/special-class';

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

// FY27 budget development (next year).
const FY27_BUDGET_DEV = {
  fy: 'FY27',
  historical: [
    { year: 2018, amount: 142_944 },
    { year: 2019, amount: 93_857  },
    { year: 2020, amount: 341_022 },
    { year: 2021, amount: 146_645 },
    { year: 2022, amount: 310_700 },
    { year: 2023, amount: 88_219  },
    { year: 2024, amount: 181_295 },
    { year: 2025, amount: 299_051 },
  ],
  chosenAmount: 300_000,
  justification: 'Many retirements expected in IS',
};

// ---------------------------------------------------------------------------
// Computed values (derived from rtpom functions)
// ---------------------------------------------------------------------------

const FY26_PP_REMAINING = FY26.ppTotal - FY26.ppElapsed;
const FY26_YTD_PACE  = ytdBudgetPace(FY26.budget, FY26.ppElapsed, FY26.ppTotal);
const FY26_PROJECTED = projectRpoYearEnd(FY26.budget, FY26.ytdActual, FY26_PP_REMAINING);
const FY26_BALANCE           = FY26.budget - FY26.ytdActual;
const FY26_PROJECTED_BALANCE = FY26.budget - FY26_PROJECTED;

const FY27_HISTORICAL_MEAN = historicalActualsMean(
  FY27_BUDGET_DEV.historical.map(h => h.amount),
);
const FY27_CUSHION = FY27_BUDGET_DEV.chosenAmount - FY27_HISTORICAL_MEAN;

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
// View
// ---------------------------------------------------------------------------

export function SpecialClassView() {
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Special Class — RTPOM_E (Retirement Payout)</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
          DBI · Account 510210 (Ret Payout - SP & Vac - Misc). KosPos has three
          jobs for every labor line: report current actuals, project rest-of-year,
          and develop next year's budget. The two sections below correspond to
          the first two functions (FY26) and the third (FY27).
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
      {/* Section 2 — FY27 budget development                                  */}
      {/* -------------------------------------------------------------------- */}
      <section style={SECTION}>
        <div style={SECTION_HEADER}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            FY27 · Next Year — Budget Development
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Choose a total → allocate across chartfield strings by regular-labor share.
          </div>
        </div>
        <div style={SECTION_BODY}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Left: historical actuals table */}
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Historical Actuals (Account 510210)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {FY27_BUDGET_DEV.historical.map(h => (
                    <tr key={h.year} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 12px', color: 'var(--muted)' }}>BY {h.year}</td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(h.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--accent-soft, #eef3ff)' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 600 }}>Mean (8 yr)</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                      {fmt(FY27_HISTORICAL_MEAN)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: chosen amount + cushion */}
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Chosen Amount (Budget Master F15)
              </div>
              <div style={{
                padding: 14,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--surface)',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(FY27_BUDGET_DEV.chosenAmount)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  Cushion vs mean: <strong>{fmtSigned(FY27_CUSHION)}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, fontStyle: 'italic' }}>
                  "{FY27_BUDGET_DEV.justification}"
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                Allocation by chartfield string is not yet wired — it requires
                regular-labor totals per dept (Budget Master `I5:I23`).  Until
                then, this section reports the total only.
              </div>
            </div>
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
