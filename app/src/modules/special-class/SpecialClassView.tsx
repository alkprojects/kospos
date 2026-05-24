import {
  historicalActualsMean,
  colaAdjustToYear,
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

// One chosen amount per year in the cycle. FY28 starts equal to FY27 — Alex
// will set sentiment / scenario adjustments per year in PR #4. Editable inputs
// arrive in PR #4; for now both are constants.
const CYCLE_BUDGET_DEV = {
  cycleLabel: 'FY27-28',
  years: [
    {
      fy: 'FY27',
      cycleRole: 'BY' as const,
      chosenAmount: 300_000,
      justification: 'Many retirements expected in IS',
    },
    {
      fy: 'FY28',
      cycleRole: 'BY+1' as const,
      chosenAmount: 300_000,
      justification: 'Starting equal to FY27 — refine each cycle as BY+1 becomes BY',
    },
  ],
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

// Cushion is measured against the COLA-adjusted mean (the FY27-$ baseline).
const CYCLE_YEARS = CYCLE_BUDGET_DEV.years.map(y => ({
  ...y,
  cushion: y.chosenAmount - HISTORICAL_MEAN_ADJ,
}));

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
            {CYCLE_BUDGET_DEV.cycleLabel} · Budget Cycle — Budget Development
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            SF builds budgets in rolling 2-year cycles (BY + BY+1). Pick a chosen
            amount per year; allocate across chartfield strings by regular-labor share.
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

          {/* Two-year cycle: side-by-side cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {CYCLE_YEARS.map(y => (
              <div
                key={y.fy}
                style={{
                  padding: 14,
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {y.fy} · {y.cycleRole}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Chosen amount</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(y.chosenAmount)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  Cushion vs mean: <strong>{fmtSigned(y.cushion)}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, fontStyle: 'italic' }}>
                  "{y.justification}"
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
            Editable inputs (sentiment ±%, per-employee scenarios, COLA-aware
            payouts) arrive in subsequent PRs. Allocation by chartfield string
            also pending — needs regular-labor totals per dept (Budget Master
            <code> I5:I23</code>).
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
