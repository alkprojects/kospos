/**
 * CostInputEditor — sub-form for editing the 8 CostInput fields of a
 * PlannedAction.basis. Mirrors `CalculatorView.tsx`'s structure (same
 * reference-data lookups, same button-group affordances) but lays out for
 * embedding in the PlannedActionDetail modal rather than its own page.
 *
 * Controlled — parent owns the partial CostInput state. Renders nothing for
 * unknown job codes (caller checks via `detectSalaryType`); auto-collapses
 * the rangePos picker for step classes.
 */

import { useMemo } from 'react';
import type { CostInput, RangePos, SalaryType } from '../../cost';
import {
  ALL_CODES,
  PP_OPTIONS,
  RANGE_CODES,
  RET_CODES,
  STEP_CODES,
  detectSalaryType,
  extractCode,
  getJobTitle,
  makeCodeLabel,
} from '../../calc-opts';

/** Fiscal years we currently have reference data for. */
const FISCAL_YEARS = ['FY2026'];

interface CostInputEditorProps {
  /** Current partial basis. Mutated via onChange. */
  value: Partial<CostInput>;
  /** Replace the entire partial with a new one (parent merges into action). */
  onChange: (next: Partial<CostInput>) => void;
  /** Hidden when no job code is set yet — caller controls visibility. */
  disabled?: boolean;
}

/**
 * Small button-group control matching the CalculatorView affordance. Inline-
 * styled (no shared CSS class) so we don't add a stylesheet dependency to the
 * staffing-plan view directory.
 */
function ButtonGroup<T extends string | number>({
  values, selected, onSelect, ariaLabel,
}: {
  values: readonly T[];
  selected: T | '';
  onSelect: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {values.map(v => {
        const sel = selected === v;
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onSelect(v)}
            aria-pressed={sel}
            style={{
              fontSize: 12, padding: '3px 10px',
              border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12,
              background: sel ? 'var(--accent)' : 'transparent',
              color: sel ? '#fff' : 'inherit',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {String(v)}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {children}
    </span>
  );
}

export function CostInputEditor({ value, onChange, disabled }: CostInputEditorProps) {
  const code = value.code ?? '';
  const setid = value.setid ?? '';
  const salaryType: SalaryType | null = value.salaryType ?? detectSalaryType(code);

  const availableSetids = useMemo<string[]>(() => {
    if (!salaryType) return [];
    if (salaryType === 'step') return STEP_CODES[code]?.setids ?? [];
    return RANGE_CODES[code]?.setids ?? [];
  }, [code, salaryType]);

  const availableSteps = useMemo<number[]>(() => {
    if (salaryType !== 'step' || !setid) return [];
    return (STEP_CODES[code]?.stepsPerSetid[setid] ?? []).map(Number);
  }, [code, salaryType, setid]);

  const availableRanges = useMemo<string[]>(() => {
    if (salaryType !== 'range' || !setid) return [];
    return RANGE_CODES[code]?.rangesPerSetid[setid] ?? [];
  }, [code, salaryType, setid]);

  // Patch helpers — preserve the parent's other fields, clobber what changes.
  function patch(next: Partial<CostInput>) {
    onChange({ ...value, ...next });
  }
  function handleCodeChange(raw: string) {
    const newCode = extractCode(raw);
    const newType = detectSalaryType(newCode);
    // Reset dependent fields when the code changes meaningfully.
    if (newCode !== code) {
      patch({
        code: newCode,
        salaryType: newType ?? undefined,
        setid: '',
        stepOrRange: '',
        rangePos: newType === 'range' ? 'min' : undefined,
      });
    } else {
      patch({ code: newCode });
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {/* Job Code */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <FieldLabel>Job code — title</FieldLabel>
        <input
          type="text"
          list="cost-input-editor-jc-list"
          value={code ? makeCodeLabel(code) : ''}
          onChange={e => handleCodeChange(e.target.value)}
          placeholder="e.g. 881 or Building Inspector"
          autoComplete="off"
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'inherit',
            background: 'var(--surface)', color: 'inherit',
          }}
        />
        <datalist id="cost-input-editor-jc-list">
          {ALL_CODES.map(c => <option key={c.code} value={c.label} />)}
        </datalist>
        {salaryType ? (
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {salaryType === 'step' ? 'Step-based class' : 'Range-based class (MCCP)'}
            {getJobTitle(code) && <> · {getJobTitle(code)}</>}
          </span>
        ) : code ? (
          <span style={{ fontSize: 11, color: '#b35a00' }}>
            Unknown class — pick one from the dropdown to enable pricing.
          </span>
        ) : null}
      </label>

      {/* SetID */}
      {availableSetids.length > 0 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <FieldLabel>SetID</FieldLabel>
          <ButtonGroup
            values={availableSetids}
            selected={setid}
            onSelect={v => patch({ setid: v, stepOrRange: '' })}
            ariaLabel="SetID"
          />
        </label>
      )}

      {/* Retirement code */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <FieldLabel>Retirement code</FieldLabel>
        <ButtonGroup
          values={RET_CODES}
          selected={value.retCode ?? ''}
          onSelect={v => patch({ retCode: v })}
          ariaLabel="Retirement code"
        />
      </label>

      {/* PP start date + Fiscal year side-by-side */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px' }}>
          <FieldLabel>PP start date</FieldLabel>
          <select
            value={value.ppStartDate ?? ''}
            onChange={e => patch({ ppStartDate: e.target.value })}
            style={{
              padding: '5px 10px',
              border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 13, fontFamily: 'inherit',
              background: 'var(--surface)', color: 'inherit',
            }}
          >
            <option value="">— select a pay period —</option>
            {PP_OPTIONS.map(p => (
              <option key={p.ppe} value={p.ppe}>{p.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 1 140px' }}>
          <FieldLabel>Fiscal year</FieldLabel>
          <select
            value={value.fiscalYear ?? 'FY2026'}
            onChange={e => patch({ fiscalYear: e.target.value })}
            style={{
              padding: '5px 10px',
              border: '1px solid var(--border)', borderRadius: 4,
              fontSize: 13, fontFamily: 'inherit',
              background: 'var(--surface)', color: 'inherit',
            }}
          >
            {FISCAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </label>
      </div>

      {/* Step picker — only for step classes */}
      {salaryType === 'step' && availableSteps.length > 0 && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <FieldLabel>Step</FieldLabel>
          <ButtonGroup
            values={availableSteps}
            selected={value.stepOrRange === '' || value.stepOrRange == null
              ? '' : Number(value.stepOrRange)}
            onSelect={v => patch({ stepOrRange: v })}
            ariaLabel="Step"
          />
        </label>
      )}

      {/* Range + rangePos — only for range classes */}
      {salaryType === 'range' && availableRanges.length > 0 && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <FieldLabel>Range</FieldLabel>
            <ButtonGroup
              values={availableRanges}
              selected={typeof value.stepOrRange === 'string' ? value.stepOrRange : ''}
              onSelect={v => patch({ stepOrRange: v })}
              ariaLabel="Range letter"
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <FieldLabel>Range position</FieldLabel>
            <ButtonGroup
              values={['min', 'max'] as const}
              selected={(value.rangePos ?? 'min') as RangePos}
              onSelect={v => patch({ rangePos: v })}
              ariaLabel="Range position"
            />
          </label>
        </div>
      )}

      {/* Cumulative calendar-year salary — mid-FY hire OASDI helper. */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <FieldLabel>Cumulative CY salary (mid-FY hires only)</FieldLabel>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value.cumulativeCalendarYearSalary ?? ''}
          onChange={e => {
            const n = e.target.value === '' ? undefined : Number(e.target.value);
            patch({
              cumulativeCalendarYearSalary: n != null && !isNaN(n) ? n : undefined,
            });
          }}
          placeholder="0"
          style={{
            padding: '5px 10px',
            border: '1px solid var(--border)', borderRadius: 4,
            fontSize: 13, fontFamily: 'monospace',
            background: 'var(--surface)', color: 'inherit',
            width: 140,
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          YTD calendar-year wages before this PP — drives OASDI cap math. Leave
          blank (= 0) for new hires.
        </span>
      </label>
    </div>
  );
}
