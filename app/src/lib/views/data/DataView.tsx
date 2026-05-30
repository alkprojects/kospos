/**
 * Data tab — the home for the individual data-source tables (Phase 2.2.u).
 *
 * Alex's S45 ask: "a main 'Data' tab with sub-tabs for the various individual
 * data source tables … eligibility lists and job postings as separate tables."
 *
 * A thin container that renders a secondary sub-tab strip and the selected
 * source table:
 *   - **Eligibility Lists** — the existing EligibilityView (per-job-code rollup
 *     of postings + DHR lists, with its filter toolbar + detail modal).
 *   - **Job Postings** — the flat SF Careers postings table.
 *   - **Calendar** — the FY pay-period calendar + COLA constants reference
 *     table (Phase 2.2.ab; Alex's S52 ask).
 *
 * Acquisition / refresh stays on the **Load Reports** tab (a separate top-level
 * tab) — this tab is for *viewing* the loaded tables. Room to add the imported
 * source tables (P&P / BFM / OBI) as further sub-tabs later.
 *
 * Defaults to Eligibility Lists (the established, richer view); the sub-tab is
 * self-managed local state — navigation into the Data tab lands here.
 */

import { useState } from 'react';
import { EligibilityView } from '../eligibility';
import { JobPostingsView } from '../job-postings';
import { CalendarView } from '../calendar';

export type DataSubTab = 'eligibility' | 'job-postings' | 'calendar';

const SUB_TABS: Array<{ id: DataSubTab; label: string }> = [
  { id: 'eligibility', label: 'Eligibility Lists' },
  { id: 'job-postings', label: 'Job Postings' },
  { id: 'calendar', label: 'Calendar' },
];

export function DataView({ onViewPositions }: {
  /** Passed through to the Eligibility Lists sub-view for its per-row
   *  "Positions →" cross-tab nav. */
  onViewPositions?: () => void;
} = {}) {
  const [sub, setSub] = useState<DataSubTab>('eligibility');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        role="tablist"
        aria-label="Data source tables"
        style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}
      >
        {SUB_TABS.map(t => {
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSub(t.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                background: 'transparent',
                color: active ? 'var(--accent)' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                fontFamily: 'inherit',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === 'eligibility' && <EligibilityView onViewPositions={onViewPositions} />}
      {sub === 'job-postings' && <JobPostingsView />}
      {sub === 'calendar' && <CalendarView />}
    </div>
  );
}
