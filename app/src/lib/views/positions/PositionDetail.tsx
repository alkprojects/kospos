/**
 * Position Detail — the spine modal.
 *
 * Surfaces the three department concepts explicitly (the workbook hides them
 * by conflating col G and col CB in different downstream tabs); shows Cat
 * 17/18 expiry status; renders the inline userNotes editor per [memory
 * feedback_user_notes_per_position.md]; shows YTD payroll actuals in 5
 * special-class buckets when BI Payroll is loaded; falls back to "load BFM
 * to see chartfields" when BFM data isn't loaded.
 */

import { useEffect, useState } from 'react';
import type { Position } from '../../positions';
import { hasDeptMismatch, usePositionNotes } from '../../positions';
import type { ResolvedChartfields } from '../../chartfields/types';
import type { PositionYtdActuals } from '../../payroll';
import { useLaborScope } from '../labor';

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });
}

function fmtDate(s: string): string {
  if (!s) return '—';
  return s;
}

function badge(label: string, color: string, bg: string) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 10,
      color,
      background: bg,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function DeptRow({ label, code, name, asOfDate }: {
  label: string;
  code: string;
  name: string;
  asOfDate?: string;
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '5px 0', color: 'var(--muted)', width: 100, verticalAlign: 'top' }}>
        {label}
      </td>
      <td style={{ padding: '5px 0' }}>
        {code ? (
          <div>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{code}</span>
            <span style={{ marginLeft: 8 }}>— {name || '—'}</span>
          </div>
        ) : (
          <span style={{ color: 'var(--muted)' }}>—</span>
        )}
        {asOfDate && code && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            asOf {asOfDate}
          </div>
        )}
      </td>
    </tr>
  );
}

function NotesEditor({ position }: { position: Position }) {
  const setNote = usePositionNotes(s => s.setNote);
  const stored = usePositionNotes(s => s.notes.get(position.id) ?? position.userNotes);
  const [draft, setDraft] = useState(stored);
  const [editing, setEditing] = useState(false);

  // Sync external changes (e.g., snapshot reload).
  useEffect(() => { setDraft(stored); }, [stored]);

  function save() {
    setNote(position.id, draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(stored);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div>
        <div style={{
          minHeight: 24,
          padding: '8px 10px',
          fontSize: 13,
          background: stored ? '#fafbfc' : 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 4,
          color: stored ? 'inherit' : 'var(--muted)',
          fontStyle: stored ? 'normal' : 'italic',
          whiteSpace: 'pre-wrap',
        }}>
          {stored || 'No notes yet. Click Edit to add HR context the data can’t capture.'}
        </div>
        <button
          onClick={() => setEditing(true)}
          style={{
            marginTop: 6, fontSize: 11, padding: '3px 10px',
            border: '1px solid var(--border)', borderRadius: 10,
            background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {stored ? 'Edit' : 'Add note'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={4}
        style={{
          width: '100%', padding: '8px 10px',
          border: '1px solid var(--accent)', borderRadius: 4,
          fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
          background: 'var(--surface)', color: 'inherit',
        }}
        autoFocus
      />
      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        <button
          onClick={save}
          style={{
            fontSize: 12, padding: '4px 12px',
            border: '1px solid var(--accent)', borderRadius: 12,
            background: 'var(--accent)', color: '#fff', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          Save
        </button>
        <button
          onClick={cancel}
          style={{
            fontSize: 12, padding: '4px 12px',
            border: '1px solid var(--border)', borderRadius: 12,
            background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <span style={{ fontSize: 10, color: 'var(--muted)', alignSelf: 'center' }}>
          Notes persist only in this browser session (IndexedDB persistence: TODO).
        </span>
      </div>
    </div>
  );
}

function Cat1718Card({ position }: { position: Position }) {
  const c = position.appointment?.cat1718;
  if (!c) return null;
  const expiry = c.expiredDate;
  const isPast = expiry && expiry < new Date().toISOString().slice(0, 10);
  const isSoon = expiry && !isPast &&
    expiry < new Date(Date.now() + 90 * 86400 * 1000).toISOString().slice(0, 10);

  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
      }}>
        Cat {c.category} Tracking
      </div>
      <div style={{
        background: isPast ? '#fef2f2' : isSoon ? '#fffbea' : '#fafbfc',
        border: `1px solid ${isPast ? '#dc2626' : isSoon ? '#f0c020' : 'var(--border)'}`,
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 13,
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Appointed</div>
            <div style={{ fontFamily: 'monospace' }}>{fmtDate(c.appointmentDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Months</div>
            <div style={{ fontFamily: 'monospace' }}>{c.months || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>TX expires</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {fmtDate(c.expiredDate)}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {isPast && badge('Expired', '#7f1d1d', '#fecaca')}
            {!isPast && isSoon && badge('Expiring soon', '#7a4b1a', '#fde68a')}
          </div>
        </div>
      </div>
    </section>
  );
}

function YtdPayrollCard({ actuals, asOfDate, onViewPayroll }: {
  actuals: PositionYtdActuals;
  asOfDate: string;
  /** When omitted (e.g. Labor tab not yet promoted to non-dev), the
   *  "View payroll →" button is hidden so a user can't end up navigating
   *  to a tab that isn't currently visible. */
  onViewPayroll?: () => void;
}) {
  const rows: Array<[string, number]> = [
    ['Regular labor',    actuals.regular],
    ['Overtime',         actuals.overtime],
    ['Retirement Payout', actuals.rpo],
    ['Premium',          actuals.premium],
    ['Temp Lump-Sum',    actuals.tempLsp],
  ];
  // Hide bucket rows with $0 to keep the modal tight — total still shown.
  const nonZero = rows.filter(([, v]) => v !== 0);
  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>YTD Payroll</span>
        {asOfDate && (
          <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            asOf {asOfDate}
          </span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {nonZero.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 0', color: 'var(--muted)', width: 180 }}>{label}</td>
              <td style={{ padding: '5px 0', fontFamily: 'monospace', textAlign: 'right' }}>
                {fmtMoney(value)}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid var(--border)' }}>
            <td style={{ padding: '7px 0', fontWeight: 700 }}>Total</td>
            <td style={{ padding: '7px 0', fontFamily: 'monospace', fontWeight: 700, textAlign: 'right' }}>
              {fmtMoney(actuals.total)}
            </td>
          </tr>
        </tbody>
      </table>
      {onViewPayroll && (
        <button
          onClick={onViewPayroll}
          style={{
            marginTop: 8, fontSize: 11, padding: '4px 12px',
            border: '1px solid var(--accent)', borderRadius: 12,
            background: 'var(--accent-soft)', color: 'var(--accent)',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          View payroll →
        </button>
      )}
    </section>
  );
}

export function PositionDetail({
  position,
  chartfields,
  ytdActuals,
  ytdAsOfDate,
  onClose,
  onViewPayroll,
}: {
  position: Position;
  chartfields?: ResolvedChartfields | null;
  ytdActuals?: PositionYtdActuals | null;
  ytdAsOfDate?: string;
  onClose: () => void;
  onViewPayroll?: () => void;
}) {
  const setLaborScope = useLaborScope(s => s.setScope);
  const mismatch = hasDeptMismatch(position);

  function viewPayroll(): void {
    setLaborScope(position.id);
    onViewPayroll?.();
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 28,
          maxWidth: 640,
          width: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>
              Position {position.displayNumber}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {position.jobCodeDescription || position.jobCode}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {position.effectiveDept.name || position.effectiveDept.code || '—'}
            </div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--muted)', padding: '0 4px',
          }}>✕</button>
        </div>

        {/* Departments — the 3-way model */}
        <section style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            Departments
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <DeptRow label="Effective"
                code={position.effectiveDept.code}
                name={position.effectiveDept.name} />
              <DeptRow label="Budgeted"
                code={position.budgetedDept.code}
                name={position.budgetedDept.name} />
              {position.comboOverride && (
                <DeptRow label="Combo"
                  code={position.comboOverride.department.code}
                  name={position.comboOverride.department.name} />
              )}
            </tbody>
          </table>
          {mismatch && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: '#fffbea', border: '1px solid #f0c020',
              borderRadius: 6, fontSize: 12,
            }}>
              <strong>Department mismatch:</strong> effective and budgeted differ with no combo
              override. Payroll still charges the budgeted dept — confirm with HR whether a combo
              code is needed.
            </div>
          )}
          {position.comboOverride && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: '#f3e8ff', border: '1px solid #c084fc',
              borderRadius: 6, fontSize: 12,
            }}>
              <strong>Combo Code override:</strong>{' '}
              <span style={{ fontFamily: 'monospace' }}>{position.comboOverride.code}</span> —
              payroll posts to the combo dept above instead of the budgeted defaults.
            </div>
          )}
        </section>

        {/* Position info */}
        <section style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            Position Info
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                ['Job Code',         `${position.jobCode}${position.jobCodeDescription ? ` — ${position.jobCodeDescription}` : ''}`],
                ['Budget Job Code',  position.budgetJobCode || '—'],
                ['FTE',              position.fte.toFixed(2)],
                ['Status',           position.positionStatus || '—'],
                ['Fill',             position.fillStatus || '—'],
                ['Max headcount',    String(position.maxHeadcount || 1)],
                ['Snapshot date',    position.snapshotDate || '—'],
                ['Vacant date',      fmtDate(position.vacantDate)],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 0', color: 'var(--muted)', width: 140 }}>{label}</td>
                  <td style={{ padding: '5px 0' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Appointment */}
        {position.appointment && (
          <section style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            }}>
              Incumbent
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Name',            position.appointment.name],
                  ['Empl ID',         position.appointment.emplId],
                  ['Status',          position.appointment.status === 'L' ? 'On leave' : position.appointment.status || '—'],
                  ['Appointment',     position.appointment.type || '—'],
                  ['Exempt category', position.appointment.exemptCategory || '—'],
                  ['Step / rate',     `${position.appointment.salaryStep || '—'} / ${position.appointment.hourlyRate ? fmtMoney(position.appointment.hourlyRate) : '—'}/hr`],
                  ['Job code (emp)',  position.appointment.jobCode || '—'],
                  ['Merit increase',  fmtDate(position.appointment.meritIncreaseDate)],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--muted)', width: 140 }}>{label}</td>
                    <td style={{ padding: '5px 0' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Cat 17/18 */}
        <Cat1718Card position={position} />

        {/* Reports To */}
        {position.reportsTo && (
          <section style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            }}>
              Reports To
            </div>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {position.reportsTo.positionNumber}
              </span>
              {(position.reportsTo.managerFirstName || position.reportsTo.managerLastName) && (
                <span style={{ marginLeft: 8 }}>
                  — {position.reportsTo.managerFirstName} {position.reportsTo.managerLastName}
                </span>
              )}
            </div>
          </section>
        )}

        {/* RTF — render for vacant positions (so a missing RTF is visibly
            noted) and for filled positions only when RTF data is present. */}
        {(position.fillStatus === 'VACANT' || (position.rtf && (position.rtf.id || position.rtf.status))) && (
          <section style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            }}>
              Request to Fill
            </div>
            {position.rtf && (position.rtf.id || position.rtf.status ||
              position.rtf.submittedDate || position.rtf.expectedFillDate) ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    ['RTF ID',          position.rtf.id || '—'],
                    ['Status',          position.rtf.status || '—'],
                    ['Submitted',       fmtDate(position.rtf.submittedDate)],
                    ['Expected fill',   fmtDate(position.rtf.expectedFillDate)],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 0', color: 'var(--muted)', width: 140 }}>{label}</td>
                      <td style={{ padding: '5px 0' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                No RTF data on this position in the snapshot. The Controller's source
                doesn't always carry RTF status for vacancies — this is a CON data
                limitation, not a missing departmental action.
              </div>
            )}
          </section>
        )}

        {/* Posting chartfields (only if BFM is loaded) */}
        <section style={{ marginBottom: 18 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            Posting Chartfields
          </div>
          {chartfields && chartfields.dataSources.includes('bfm') ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {[
                  ['Fund',      chartfields.fund],
                  ['Authority', chartfields.authority],
                  ['Project',   chartfields.project],
                  ['Activity',  chartfields.activity],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--muted)', width: 100 }}>{label}</td>
                    <td style={{ padding: '5px 0', fontFamily: 'monospace', fontWeight: 600 }}>
                      {value || <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
              Load a BFM Position eturn to see posting Fund / Authority / Project / Activity.
            </div>
          )}
        </section>

        {/* YTD Payroll — only if BI Payroll is loaded for this position */}
        {ytdActuals ? (
          <YtdPayrollCard
            actuals={ytdActuals}
            asOfDate={ytdAsOfDate ?? ''}
            onViewPayroll={onViewPayroll ? viewPayroll : undefined}
          />
        ) : (
          <section style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            }}>
              YTD Payroll
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
              Load a BI Payroll export to see YTD actuals split into regular labor,
              overtime, retirement payout, premium, and temp lump-sum.
            </div>
          </section>
        )}

        {/* User notes */}
        <section style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
          }}>
            User notes
          </div>
          <NotesEditor position={position} />
        </section>

        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>
          Sources: P&amp;P snapshot {position.snapshotDate || '—'}
          {chartfields && (
            <> · joined with {chartfields.dataSources.join(' + ')}</>
          )}
        </div>
      </div>
    </div>
  );
}
