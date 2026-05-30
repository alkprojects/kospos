/**
 * EE Additional Pay table — a Source Tables (Data tab) sub-view.
 *
 * The flat, every-assignment view of the PS HCM `MRG_HR_EE_ADDL_PAY` import
 * (workbook Tab 9 — EE Additional Pay). Sibling of the Eligibility / Job
 * Postings / Calendar source tables. It surfaces the raw additional-pay rows
 * plus a count + summed-per-PP rollup by kind (Acting / Supervisory / Other).
 *
 * The acting dual-entry cross-check and the supervisory `Rep To Pay Above`
 * audit are deliberately NOT here yet — both need nuanced joins (P&P
 * "Position Used For" vice-direction; per-BU MOU differential rules) that are
 * open questions for Alex. This view is the source-data home; the per-position
 * surfacing lives on Position Detail.
 *
 * Source acquisition (uploading the export) is on the Load Reports tab and is
 * dev-gated; with no data loaded this view shows a guiding empty state.
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import type { PsHcmEeAddlPayRow } from '../../importers/types';
import {
  buildAdditionalPay,
  rollupByKind,
  KIND_LABEL,
} from '../../additional-pay';
import type { AdditionalPay, AdditionalPayKind } from '../../additional-pay';
import { CopyButton, Stat } from '../../ui';

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Per-pay-period dollars, with cents (differentials are small + precise). */
function fmtPerPP(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

const KIND_COLOR: Record<AdditionalPayKind, [string, string]> = {
  // [text, background]
  acting:      ['var(--accent)', 'var(--accent-soft)'],   // blue
  supervisory: ['var(--success)', 'var(--success-soft)'], // green
  other:       ['var(--neutral)', 'var(--neutral-soft)'], // grey
};

function KindChip({ kind }: { kind: AdditionalPayKind }) {
  const [color, bg] = KIND_COLOR[kind];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '1px 7px', borderRadius: 10,
      color, background: bg, whiteSpace: 'nowrap',
    }}>{KIND_LABEL[kind]}</span>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function EeAdditionalPayView() {
  const loadedRows = useAppStore(s => s.loadedRows);
  const [search, setSearch] = useState('');

  const entities = useMemo<AdditionalPay[]>(() => {
    const rows = loadedRows.filter(
      (r): r is PsHcmEeAddlPayRow => r._source === 'ps-hcm-ee-addl-pay',
    );
    return buildAdditionalPay(rows);
  }, [loadedRows]);

  const rollups = useMemo(() => rollupByKind(entities), [entities]);
  const distinctEmployees = useMemo(
    () => new Set(entities.map(e => e.emplId)).size,
    [entities],
  );

  const filtered = useMemo<AdditionalPay[]>(() => {
    const q = search.trim().toLowerCase();
    const rows = q === ''
      ? entities
      : entities.filter(e =>
          e.displayName.toLowerCase().includes(q) ||
          e.emplId.toLowerCase().includes(q) ||
          e.jobCode.toLowerCase().includes(q) ||
          e.rateCode.toLowerCase().includes(q) ||
          KIND_LABEL[e.kind].toLowerCase().includes(q) ||
          e.unionCode.toLowerCase().includes(q));
    // Acting before supervisory before other, then highest per-PP amount first.
    const kindRank: Record<AdditionalPayKind, number> = { acting: 0, supervisory: 1, other: 2 };
    return [...rows].sort((a, b) =>
      kindRank[a.kind] - kindRank[b.kind] || b.amount - a.amount);
  }, [entities, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary header */}
      <div className="card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Stat label="Assignments" value={entities.length.toLocaleString('en-US')} />
        <Stat label="Employees" value={distinctEmployees.toLocaleString('en-US')} />
        {rollups.map(r => (
          <Stat
            key={r.kind}
            label={`${r.label} · ${r.count}`}
            value={fmtPerPP(r.totalAmount)}
            hint="per pay period"
          />
        ))}
      </div>

      {/* Search */}
      <div className="card">
        <input
          type="search"
          placeholder="Search by name, employee #, job code, rate code, kind, or union…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search additional pay"
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 12, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--accent-soft)', borderBottom: '2px solid var(--border)' }}>
              {['Employee', 'Kind', 'Rate', 'Per PP', 'Status', 'Job', 'Union', 'Effective'].map(h => (
                <th key={h} style={{
                  padding: '7px 10px', textAlign: h === 'Per PP' ? 'right' : 'left',
                  fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                  color: 'var(--accent)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                  {entities.length === 0
                    ? 'No EE Additional Pay loaded — upload the PS HCM MRG_HR_EE_ADDL_PAY export on the Load Reports tab (dev mode).'
                    : 'No additional-pay assignments match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map(e => (
                <tr key={e.sourceRow} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>
                    {e.displayName || <span style={{ color: 'var(--muted)' }}>—</span>}
                    <span style={{ marginLeft: 6, color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                      {e.emplId}
                    </span>
                    <CopyButton value={e.emplId} label="Employee #" />
                  </td>
                  <td style={{ padding: '6px 10px' }}><KindChip kind={e.kind} /></td>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {e.rateCode || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {fmtPerPP(e.amount)}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                    {e.isActive
                      ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>Active</span>
                      : <span style={{ color: 'var(--muted)' }}>{e.payStatus || 'Inactive'}</span>}
                  </td>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {e.jobCode || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {e.unionCode || <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {e.effectiveDate || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Every additional-pay assignment from the PS HCM <code>MRG_HR_EE_ADDL_PAY</code>{' '}
        export. <strong>Acting</strong> (ACTFLT) and <strong>Supervisory</strong>{' '}
        (SUPFLT) are the two the labor report audits; other rate codes list as{' '}
        <strong>Other</strong>. Amounts are the per-pay-period differential (not
        annualized). The acting dual-entry check and the supervisory
        “owed-but-not-paid” audit are coming once the P&amp;P join and per-union
        rules are confirmed; an employee’s additional pay also shows on their
        Position Detail.
      </div>
    </div>
  );
}
