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
import { Badge, CopyButton, Modal } from '../../ui';
import type { ResolvedChartfields } from '../../chartfields/types';
import type { PositionYtdActuals } from '../../payroll';
import type { PositionBudget, BfmBudgetPhase } from '../../budget';
import { computeBudgetVsActual } from '../../budget';
import { KIND_LABEL } from '../../additional-pay';
import type { AdditionalPayKind, PositionAdditionalPay } from '../../additional-pay';
import { useLaborScope } from '../labor';
import { fmtMoney, fmtSignedMoney } from '../../format';

function fmtPercent(pct: number): string {
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return sign + (Math.abs(pct) * 100).toFixed(1) + '%';
}

/** Per-pay-period dollars with cents (additional-pay differentials are small). */
function fmtPerPP(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function fmtDate(s: string): string {
  if (!s) return '—';
  return s;
}

/** Display label for a BFM budget phase (UI-friendly). */
function phaseLabel(phase: BfmBudgetPhase): string {
  if (phase === 'TechnicalAdjustment') return 'Technical Adjustment';
  return phase;
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
            {isPast && <Badge tone="danger">Expired</Badge>}
            {!isPast && isSoon && <Badge tone="caution">Expiring soon</Badge>}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * "Budget vs Actual" mini-card. Shown when both a BFM budget row + an OBI
 * YTD actuals row are joined to this position. Renders three values
 * side-by-side (Budget / YTD actual / Variance) with the variance row
 * colored by direction. The pencil-level chartfields strip (Fund /
 * Authority / Project / Activity) shows beneath as secondary info.
 */
function BudgetVsActualCard({
  budget,
  actuals,
  budgetAsOfDate,
  ytdAsOfDate,
}: {
  budget: PositionBudget;
  actuals: PositionYtdActuals | null;
  budgetAsOfDate: string;
  ytdAsOfDate: string;
}) {
  const hasActuals = actuals !== null;
  const actualAmount = actuals?.total ?? 0;
  const v = computeBudgetVsActual(budget.positionId, budget.budgetedSalary, actualAmount);

  // Color the variance row by direction. Greens for under-budget (positive
  // remaining), yellow for on-track, red for over-budget. When there are no
  // actuals to compare against, use a neutral gray so the visual doesn't
  // mislead the eye into "this position is under budget."
  const varColor =
    !hasActuals               ? { fg: 'var(--muted)', bg: '#fafbfc' } :
    v.direction === 'over'    ? { fg: 'var(--danger)',      bg: 'var(--danger-soft)' } :
    v.direction === 'under'   ? { fg: 'var(--success)',      bg: 'var(--success-soft)' } :
                                { fg: 'var(--caution)',      bg: 'var(--caution-soft)' };

  // Arrow glyph (matches direction); used in the variance amount cell. No
  // arrow when actuals aren't available — the variance is undefined.
  const arrow = !hasActuals                ? ''  :
                v.direction === 'over'     ? '▲' :
                v.direction === 'under'    ? '▼' :
                                             '◆';

  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>
          Budget vs Actual
          <span style={{
            marginLeft: 8, fontSize: 10, fontWeight: 500, textTransform: 'none',
            letterSpacing: 0, color: 'var(--muted)',
          }}>
            {budget.resolvedPhase ? `${phaseLabel(budget.resolvedPhase)} layer` : ''}
          </span>
        </span>
        {budgetAsOfDate && (
          <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            BFM asOf {budgetAsOfDate}
          </span>
        )}
      </div>

      {/* Three-stat row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0,
        border: '1px solid var(--border)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Budget
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, marginTop: 2 }}>
            {fmtMoney(budget.budgetedSalary)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            FTE {budget.fte.toFixed(2)}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            YTD Actual
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, marginTop: 2 }}>
            {actuals ? fmtMoney(actualAmount) : '—'}
          </div>
          {ytdAsOfDate && actuals && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
              OBI asOf {ytdAsOfDate}
            </div>
          )}
        </div>
        <div style={{ padding: '10px 12px', background: varColor.bg, color: varColor.fg }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 }}>
            Variance
          </div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, marginTop: 2 }}>
            <span style={{ marginRight: 4 }}>{arrow}</span>
            {actuals ? fmtSignedMoney(v.variance) : '—'}
          </div>
          {v.variancePct !== null && actuals && (
            <div style={{ fontSize: 10, marginTop: 2, opacity: 0.85 }}>
              {fmtPercent(v.variancePct)}
            </div>
          )}
        </div>
      </div>

      {/* Chartfield strip — secondary info */}
      <div style={{
        marginTop: 8,
        padding: '6px 10px',
        background: '#fafbfc',
        border: '1px solid var(--border)',
        borderRadius: 6,
        fontSize: 11,
        color: 'var(--muted)',
        display: 'flex', flexWrap: 'wrap', gap: 14,
      }}>
        <ChartfieldChip label="Fund"      code={budget.fund}      title={budget.fundTitle} />
        <ChartfieldChip label="Authority" code={budget.authority} title={budget.authorityTitle} />
        <ChartfieldChip label="Project"   code={budget.project}   title={budget.projectTitle} />
        <ChartfieldChip label="Activity"  code={budget.activity}  title={budget.activityTitle} />
      </div>
    </section>
  );
}

function ChartfieldChip({ label, code, title }: { label: string; code: string; title?: string }) {
  if (!code) {
    return (
      <span>
        <span style={{ marginRight: 4 }}>{label}:</span>
        <span style={{ color: 'var(--muted)' }}>—</span>
      </span>
    );
  }
  return (
    <span title={title || ''}>
      <span style={{ marginRight: 4 }}>{label}:</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>{code}</span>
      {title && (
        <span style={{ marginLeft: 4, opacity: 0.7 }}>— {title}</span>
      )}
    </span>
  );
}

function ViewPayrollButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 8, fontSize: 11, padding: '4px 12px',
        border: '1px solid var(--accent)', borderRadius: 12,
        background: 'var(--accent-soft)', color: 'var(--accent)',
        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
      }}
    >
      View payroll →
    </button>
  );
}

function YtdPayrollCard({ actuals, asOfDate, onViewPayroll }: {
  actuals: PositionYtdActuals;
  asOfDate: string;
  /** When omitted (e.g. Payroll tab not yet promoted to non-dev), the
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
      {onViewPayroll && <ViewPayrollButton onClick={onViewPayroll} />}
    </section>
  );
}

const ADDL_PAY_KIND_COLOR: Record<AdditionalPayKind, [string, string]> = {
  acting:      ['var(--accent)', 'var(--accent-soft)'],
  supervisory: ['var(--success)', 'var(--success-soft)'],
  other:       ['var(--neutral)', 'var(--neutral-soft)'],
};

/**
 * Additional Pay — acting / supervisory differentials carried by the people
 * on this position (the incumbent and any vice). Shown only when the EE
 * Additional Pay source is loaded and at least one assignment joins by emplId.
 *
 * Each row's role says *whose* pay it is, not that the pay is for this exact
 * position — the acting-target dual-entry check is a deferred follow-up.
 */
function AdditionalPayCard({ items }: { items: PositionAdditionalPay[] }) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
      }}>
        Additional Pay
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {items.map(({ role, personName, item }) => {
            const [color, bg] = ADDL_PAY_KIND_COLOR[item.kind];
            return (
              <tr key={item.sourceRow} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 0' }}>
                  <span style={{ fontWeight: 600 }}>{personName || item.displayName || '—'}</span>
                  <span style={{
                    marginLeft: 6, fontSize: 10, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: 0.3,
                  }}>{role}</span>
                </td>
                <td style={{ padding: '5px 0' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px',
                    borderRadius: 10, color, background: bg, whiteSpace: 'nowrap',
                  }}>{KIND_LABEL[item.kind]}</span>
                  <span style={{ marginLeft: 6, fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>
                    {item.rateCode}
                  </span>
                </td>
                <td style={{ padding: '5px 0', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {fmtPerPP(item.amount)}
                  <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--muted)' }}>/PP</span>
                </td>
                <td style={{ padding: '5px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {item.isActive
                    ? <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 12 }}>Active</span>
                    : <span style={{ color: 'var(--muted)', fontSize: 12 }}>{item.payStatus || 'Inactive'}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
        Acting / supervisory differentials carried by the people on this position
        (per pay period). Full list on <strong>Source Tables → EE Additional Pay</strong>.
      </div>
    </section>
  );
}

export function PositionDetail({
  position,
  additionalPay = [],
  chartfields,
  ytdActuals,
  ytdAsOfDate,
  budget,
  budgetAsOfDate,
  obiLoaded,
  bfmLoaded,
  onClose,
  onViewPayroll,
}: {
  position: Position;
  /** Additional-pay assignments joined to this position's incumbent / vice by
   *  emplId. Empty when the EE Additional Pay source isn't loaded or nothing
   *  matched. */
  additionalPay?: PositionAdditionalPay[];
  chartfields?: ResolvedChartfields | null;
  ytdActuals?: PositionYtdActuals | null;
  ytdAsOfDate?: string;
  /** Per-position budget detail (FTE + budget + chartfields + phase set)
   *  from the latest BudgetSnapshot. When omitted but `bfmLoaded` is true,
   *  the Budget vs Actual section shows a "no row matched this position"
   *  hint instead of "Load BFM…". */
  budget?: PositionBudget | null;
  /** asOfDate stamped on the BudgetSnapshot at import time. */
  budgetAsOfDate?: string;
  /** Global "is BI Payroll loaded anywhere?" flag. When true but ytdActuals
   *  is null, the hint should say "no rows for this position" instead of
   *  "Load a BI Payroll export…". */
  obiLoaded?: boolean;
  /** Global "is a BFM Position eturn loaded anywhere?" flag. Same logic
   *  as obiLoaded but for the Budget vs Actual panel. */
  bfmLoaded?: boolean;
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
    <Modal onClose={onClose} ariaLabel="Position detail" align="center" maxWidth={640}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>
              Position <span style={{ fontFamily: 'monospace' }}>{position.displayNumber}</span>
              <CopyButton value={position.displayNumber} label="Position number" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {position.jobCodeDescription || position.jobCode}
              <CopyButton
                value={position.jobCode}
                label="Job code"
              />
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
                {([
                  ['Name', (
                    <>
                      {position.appointment.name}
                      <CopyButton value={position.appointment.name} label="Employee name" />
                    </>
                  )],
                  ['Empl ID', (
                    <>
                      <span style={{ fontFamily: 'monospace' }}>{position.appointment.emplId}</span>
                      <CopyButton value={position.appointment.emplId} label="Employee ID" />
                    </>
                  )],
                  ['Status',          position.appointment.status === 'L' ? 'On leave' : position.appointment.status || '—'],
                  ['Appointment',     position.appointment.type || '—'],
                  ['Exempt category', position.appointment.exemptCategory || '—'],
                  ['Step / rate',     `${position.appointment.salaryStep || '—'} / ${position.appointment.hourlyRate ? fmtMoney(position.appointment.hourlyRate) : '—'}/hr`],
                  ['Job code (emp)',  position.appointment.jobCode || '—'],
                  ['Merit increase',  fmtDate(position.appointment.meritIncreaseDate)],
                ] as Array<[string, React.ReactNode]>).map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 0', color: 'var(--muted)', width: 140 }}>{label}</td>
                    <td style={{ padding: '5px 0' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Additional Pay — acting / supervisory differentials on the people
            attached to this position (incumbent + vice). Renders only when the
            EE Additional Pay source is loaded and something joined. */}
        <AdditionalPayCard items={additionalPay} />

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
              {position.reportsTo.positionNumber && (
                <CopyButton value={position.reportsTo.positionNumber} label="Reports-to position number" />
              )}
              {(position.reportsTo.managerFirstName || position.reportsTo.managerLastName) && (
                <>
                  <span style={{ marginLeft: 8 }}>
                    — {position.reportsTo.managerFirstName} {position.reportsTo.managerLastName}
                  </span>
                  <CopyButton
                    value={`${position.reportsTo.managerFirstName} ${position.reportsTo.managerLastName}`.trim()}
                    label="Manager name"
                  />
                </>
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
                    ['RTF ID',          position.rtf.id || '—',         'RTF ID'],
                    ['Status',          position.rtf.status || '—',     'RTF status'],
                    ['Submitted',       fmtDate(position.rtf.submittedDate), 'Submitted date'],
                    ['Expected fill',   fmtDate(position.rtf.expectedFillDate), 'Expected fill date'],
                  ].map(([label, value, copyLabel]) => (
                    <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 0', color: 'var(--muted)', width: 140 }}>{label}</td>
                      <td style={{ padding: '5px 0' }}>
                        {value}
                        {value && value !== '—' && <CopyButton value={value} label={copyLabel} />}
                      </td>
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

        {/* Budget vs Actual — three states:
            (a) BFM joined to this position → show variance card + chartfield strip;
            (b) BFM loaded but no row for this position → "no row matched" hint;
            (c) BFM not loaded → "Load BFM…" hint. */}
        {budget ? (
          <BudgetVsActualCard
            budget={budget}
            actuals={ytdActuals ?? null}
            budgetAsOfDate={budgetAsOfDate ?? ''}
            ytdAsOfDate={ytdAsOfDate ?? ''}
          />
        ) : (
          <section style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
            }}>
              Budget vs Actual
            </div>
            {bfmLoaded ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                No BFM Position eturn row matched position{' '}
                <span style={{ fontFamily: 'monospace' }}>{position.displayNumber}</span> in
                the loaded snapshot. Either the position was added after the eturn was
                generated, or the position number changed between the BFM and HCM snapshots.
                Posting chartfields and budget anchor will reappear once a matching eturn
                loads.
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                Load a BFM Position eturn to see budgeted FTE / salary,
                YTD variance, and posting Fund / Authority / Project / Activity.
              </div>
            )}
          </section>
        )}

        {/* YTD Payroll — three states: (a) actuals present → breakdown card;
            (b) BI Payroll loaded but no rows for this position → explanatory
            hint; (c) BI Payroll not loaded at all → "load one" hint.
            "View payroll →" appears in (a) and (b) — in (b) the user can
            still drill into the Payroll tab scoped to this position to
            confirm there really are no matching rows (or surface a data-
            identifier mismatch). */}
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
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>YTD Payroll</span>
              {obiLoaded && ytdAsOfDate && (
                <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  asOf {ytdAsOfDate}
                </span>
              )}
            </div>
            {obiLoaded ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                  No BI Payroll activity recorded for position{' '}
                  <span style={{ fontFamily: 'monospace' }}>{position.displayNumber}</span> in
                  the loaded snapshot. Vacant positions, brand-new positions, and positions
                  that haven't paid any earnings in FY-to-date will show this — it's not
                  always a data bug, but "View payroll →" will scope the Payroll tab to
                  this position so you can confirm.
                </div>
                {onViewPayroll && <ViewPayrollButton onClick={viewPayroll} />}
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                Load a BI Payroll export to see YTD actuals split into regular labor,
                overtime, retirement payout, premium, and temp lump-sum.
              </div>
            )}
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
          {(() => {
            // Combine chartfields-side joins + OBI when loaded. Lets the
            // footer honestly reflect "what data is loaded in the app"
            // separately from "what joined to this specific position".
            const joined = chartfields ? [...chartfields.dataSources] : [];
            if (obiLoaded && !joined.includes('obi')) joined.push('obi');
            return joined.length > 0
              ? <> · joined with {joined.join(' + ')}</>
              : null;
          })()}
        </div>
    </Modal>
  );
}
