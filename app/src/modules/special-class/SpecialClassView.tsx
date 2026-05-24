import {
  historicalActualsMean,
  ytdBudgetPace,
  projectRpoYearEnd,
} from '../../lib/special-class';
import type { SpecialClassRecord } from '../../lib/special-class';

// ---------------------------------------------------------------------------
// Demo data — mirrors docs/domain/special-class.md §RTPOM_E walkthrough.
// Numbers are computed from the rtpom functions, not hardcoded, so the demo
// stays locked to the unit tests.
// ---------------------------------------------------------------------------

const DBI_FY27_HISTORICAL = [
  142944, 93857, 341022, 146645, 310700, 88219, 181295, 299051,
];

const PP_ELAPSED = 22.4;
const PP_TOTAL = 26.1;
const PP_REMAINING = PP_TOTAL - PP_ELAPSED;

const RPO_CHOSEN_TOTAL = 300000; // Alex's F15 input for FY27 (IS retirements)
const RPO_YTD_ACTUAL = 120_000;  // illustrative; real value from Labor Report
const RPO_CHARTFIELD = '10190 / 207834 / 17000 / — / — / 510210';

const RPO_DEMO: SpecialClassRecord = {
  code: 'RTPOM_E',
  chartfieldString: RPO_CHARTFIELD,
  fy: 'FY27',
  budget: RPO_CHOSEN_TOTAL,
  ytdActual: RPO_YTD_ACTUAL,
  ytdBudget: ytdBudgetPace(RPO_CHOSEN_TOTAL, PP_ELAPSED, PP_TOTAL),
  projectedActual: projectRpoYearEnd(RPO_CHOSEN_TOTAL, RPO_YTD_ACTUAL, PP_REMAINING),
  balance: RPO_CHOSEN_TOTAL - RPO_YTD_ACTUAL,
  projectedBalance:
    RPO_CHOSEN_TOTAL - projectRpoYearEnd(RPO_CHOSEN_TOTAL, RPO_YTD_ACTUAL, PP_REMAINING),
  source: 'manual',
  notes: 'Chosen amount — IS retirements expected',
};

const HISTORICAL_MEAN = historicalActualsMean(DBI_FY27_HISTORICAL);

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

const NUM_TD: React.CSSProperties = {
  padding: '10px 12px',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

const TH: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  textAlign: 'right',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface)',
  position: 'sticky',
  top: 0,
};

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function SpecialClassView() {
  const rows: SpecialClassRecord[] = [RPO_DEMO];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Special Class</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
          Per-chartfield × FY budget, YTD pace, year-end projection.{' '}
          See <code>docs/domain/special-class.md</code>.
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
        Attrition Savings) ship in their own PRs — each walked through individually.
      </div>

      <section
        style={{
          padding: 14,
          marginBottom: 16,
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: 'var(--surface)',
          fontSize: 13,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          RTPOM_E — Budget Development context
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Historical mean (8yr, 2018–2025)</div>
            <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(HISTORICAL_MEAN)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Chosen amount (FY27)</div>
            <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(RPO_CHOSEN_TOTAL)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Cushion vs mean</div>
            <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              +{fmt(RPO_CHOSEN_TOTAL - HISTORICAL_MEAN)}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>PP elapsed / total</div>
            <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {PP_ELAPSED} / {PP_TOTAL}
            </div>
          </div>
        </div>
      </section>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 6,
          overflow: 'auto',
          background: 'var(--surface)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: 'left' }}>Code</th>
              <th style={{ ...TH, textAlign: 'left' }}>Chartfield</th>
              <th style={{ ...TH, textAlign: 'left' }}>FY</th>
              <th style={TH}>Total Budget</th>
              <th style={TH}>YTD Actual</th>
              <th style={TH}>YTD Budget Pace</th>
              <th style={TH}>Balance</th>
              <th style={TH}>Projected Actual</th>
              <th style={TH}>Projected Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.code}-${r.chartfieldString}-${r.fy}-${i}`}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.code}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>
                  {r.chartfieldString}
                </td>
                <td style={{ padding: '10px 12px' }}>{r.fy}</td>
                <td style={NUM_TD}>{fmt(r.budget)}</td>
                <td style={NUM_TD}>{fmt(r.ytdActual)}</td>
                <td style={NUM_TD}>{fmt(r.ytdBudget)}</td>
                <td
                  style={{
                    ...NUM_TD,
                    color: r.balance < 0 ? '#c0392b' : 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {fmt(r.balance)}
                </td>
                <td style={NUM_TD}>{fmt(r.projectedActual)}</td>
                <td
                  style={{
                    ...NUM_TD,
                    color: r.projectedBalance < 0 ? '#c0392b' : 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {fmt(r.projectedBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
        Demo row computed from <code>rtpom.ts</code> with Alex's confirmed FY27 RPO
        inputs (chosen amount $300k, illustrative YTD $120k). Real per-chartfield
        rows will populate once the Budget Master + Labor Report importers feed
        actual values into this view.
      </p>
    </div>
  );
}
