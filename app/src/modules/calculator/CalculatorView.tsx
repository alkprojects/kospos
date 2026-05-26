/**
 * CalculatorView — the Phase 1 job-class cost calculator UI.
 *
 * Lives in its own module directory to keep App.tsx clean. Drives
 * calcEmployeeCost (app/src/lib/cost.ts) through a form and surfaces the
 * full CostResult in a results panel.
 */

import { useState, useMemo, useId } from 'react'
import { calcEmployeeCost, CostCalcError } from '../../lib/cost'
import type { CostResult } from '../../lib/cost'
import {
  STEP_CODES, RANGE_CODES, ALL_CODES, RET_CODES, PP_OPTIONS,
  detectSalaryType, extractCode, makeCodeLabel, getJobTitle,
} from '../../lib/calc-opts'
import './CalculatorView.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FISCAL_YEARS = ['FY2026']

function fmt(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function pctLabel(pct: number): string | null {
  if (pct === 1) return null
  return `×${pct}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalculatorView() {
  // Form state
  const [code, setCode] = useState('')
  /** The raw text in the job-code input — may be "code" or "code — title". */
  const [codeInput, setCodeInput] = useState('')
  const [setid, setSetid] = useState('')
  const [retCode, setRetCode] = useState('')
  const [ppStartDate, setPpStartDate] = useState('')
  const [fiscalYear, setFiscalYear] = useState('FY2026')
  const [stepOrRange, setStepOrRange] = useState<number | string>('')
  const [rangePos, setRangePos] = useState<'min' | 'max'>('min')

  // Results state
  const [result, setResult] = useState<CostResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPpTable, setShowPpTable] = useState(false)

  const datalistId = useId()

  // ---------------------------------------------------------------------------
  // Derived: salaryType + available options
  // ---------------------------------------------------------------------------

  const salaryType = useMemo(() => detectSalaryType(code), [code])

  const availableSetids = useMemo((): string[] => {
    if (!salaryType) return []
    if (salaryType === 'step') return STEP_CODES[code]?.setids ?? []
    return RANGE_CODES[code]?.setids ?? []
  }, [code, salaryType])

  // Auto-select setid when only one exists. Computed BEFORE the
  // step/range memos so they can depend on it — without this, a class
  // with only one setid (most MCCP classes) would render the setId
  // button as highlighted but the Step/Range section would stay hidden
  // until the user clicked the already-highlighted button.
  const effectiveSetid = useMemo(() => {
    if (setid && availableSetids.includes(setid)) return setid
    if (availableSetids.length === 1) return availableSetids[0]
    return ''
  }, [setid, availableSetids])

  const availableSteps = useMemo((): string[] => {
    if (salaryType !== 'step' || !effectiveSetid) return []
    return STEP_CODES[code]?.stepsPerSetid[effectiveSetid] ?? []
  }, [code, salaryType, effectiveSetid])

  const availableRanges = useMemo((): string[] => {
    if (salaryType !== 'range' || !effectiveSetid) return []
    return RANGE_CODES[code]?.rangesPerSetid[effectiveSetid] ?? []
  }, [code, salaryType, effectiveSetid])

  // Form readiness
  const canSubmit = useMemo(() => {
    if (!salaryType) return false
    if (!effectiveSetid) return false
    if (!retCode) return false
    if (!ppStartDate) return false
    if (stepOrRange === '' || stepOrRange === null) return false
    if (salaryType === 'range' && !rangePos) return false
    return true
  }, [salaryType, effectiveSetid, retCode, ppStartDate, stepOrRange, rangePos])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCodeChange(val: string) {
    setCodeInput(val)
    setCode(extractCode(val))
    setSetid('')
    setStepOrRange('')
    setResult(null)
    setError(null)
  }

  /**
   * On blur, normalize the input text to the canonical "code — title" form
   * if the extracted code is a known class. Lets users type just "881" and
   * have the field tidy up to "881 — Mayoral Staff I" when they leave it.
   */
  function handleCodeBlur() {
    const c = extractCode(codeInput)
    if (c && detectSalaryType(c)) setCodeInput(makeCodeLabel(c))
  }

  function handleSetidChange(val: string) {
    setSetid(val)
    setStepOrRange('')
    setResult(null)
    setError(null)
  }

  function handleCalculate() {
    setError(null)
    setResult(null)
    try {
      const res = calcEmployeeCost({
        code,
        setid: effectiveSetid,
        retCode,
        ppStartDate,
        salaryType: salaryType!,
        stepOrRange: salaryType === 'step' ? Number(stepOrRange) : String(stepOrRange),
        rangePos: salaryType === 'range' ? rangePos : undefined,
        fiscalYear,
      })
      setResult(res)
      setShowPpTable(false)
    } catch (e) {
      if (e instanceof CostCalcError) {
        setError(`[${e.code}] ${e.message}`)
      } else {
        setError(String(e))
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function ButtonGroup<T extends string | number>({
    values, selected, onSelect, disabled,
  }: {
    values: T[]
    selected: T | ''
    onSelect: (v: T) => void
    disabled?: boolean
  }) {
    return (
      <div className="btn-group">
        {values.map(v => (
          <button
            key={String(v)}
            type="button"
            className={selected === v ? 'selected' : ''}
            disabled={disabled}
            onClick={() => onSelect(v)}
          >
            {String(v)}
          </button>
        ))}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const displaySetid = effectiveSetid || setid

  return (
    <div className="calc-root">

      {/* ====== LEFT: Form ====== */}
      <form
        className="calc-form"
        onSubmit={e => { e.preventDefault(); handleCalculate() }}
      >
        {/* Job Code */}
        <div className="form-section">
          <label className="form-label" htmlFor="input-code">Job Code &mdash; Title</label>
          <input
            id="input-code"
            className="form-input"
            type="text"
            list={datalistId}
            value={codeInput}
            onChange={e => handleCodeChange(e.target.value)}
            onBlur={handleCodeBlur}
            placeholder="e.g. 881 or Inspector"
            autoComplete="off"
          />
          {/* Each option's `value` is the full "code — title" so datalist
              matches on either substring. The math layer extracts the
              leading code via extractCode(). */}
          <datalist id={datalistId}>
            {ALL_CODES.map(c => <option key={c.code} value={c.label} />)}
          </datalist>
          {salaryType ? (
            <span style={{ fontSize: '0.78rem', color: '#666', marginTop: '2px' }}>
              {salaryType === 'step' ? 'Step-based class' : 'Range-based class (MCCP)'}
              {getJobTitle(code) && (
                <> &middot; {getJobTitle(code)}</>
              )}
            </span>
          ) : codeInput && (
            <span style={{ fontSize: '0.78rem', color: '#b35a00', marginTop: '2px' }}>
              Unknown class &mdash; check the spelling, or pick one from the dropdown.
            </span>
          )}
        </div>

        {/* SetID */}
        {availableSetids.length > 0 && (
          <div className="form-section">
            <span className="form-label">SetID</span>
            <ButtonGroup
              values={availableSetids}
              selected={displaySetid}
              onSelect={handleSetidChange}
            />
          </div>
        )}

        {/* Retirement Code */}
        <div className="form-section">
          <span className="form-label">Retirement Code</span>
          <ButtonGroup
            values={RET_CODES}
            selected={retCode}
            onSelect={v => { setRetCode(v); setResult(null); setError(null) }}
          />
        </div>

        {/* Pay Period */}
        <div className="form-section">
          <label className="form-label" htmlFor="input-pp">PP Start Date</label>
          <select
            id="input-pp"
            className="form-select"
            value={ppStartDate}
            onChange={e => { setPpStartDate(e.target.value); setResult(null); setError(null) }}
          >
            <option value="">— select a pay period —</option>
            {PP_OPTIONS.map(p => (
              <option key={p.ppe} value={p.ppe}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Fiscal Year */}
        <div className="form-section">
          <label className="form-label" htmlFor="input-fy">Fiscal Year</label>
          <select
            id="input-fy"
            className="form-select"
            value={fiscalYear}
            onChange={e => { setFiscalYear(e.target.value); setResult(null); setError(null) }}
          >
            {FISCAL_YEARS.map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>

        {/* Step or Range selector */}
        {salaryType === 'step' && displaySetid && availableSteps.length > 0 && (
          <div className="form-section">
            <span className="form-label">Step</span>
            <ButtonGroup
              values={availableSteps.map(Number)}
              selected={stepOrRange === '' ? '' : Number(stepOrRange)}
              onSelect={v => { setStepOrRange(v); setResult(null); setError(null) }}
            />
          </div>
        )}

        {salaryType === 'range' && displaySetid && availableRanges.length > 0 && (
          <div className="form-section">
            <span className="form-label">Range</span>
            <div className="range-row">
              <div>
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Class</span>
                <div className="range-letters">
                  <ButtonGroup
                    values={availableRanges}
                    selected={String(stepOrRange)}
                    onSelect={v => { setStepOrRange(v); setResult(null); setError(null) }}
                  />
                </div>
              </div>
              <div className="range-pos-group">
                <span className="form-label" style={{ fontSize: '0.7rem' }}>Position</span>
                <div className="btn-group">
                  {(['min', 'max'] as const).map(pos => (
                    <button
                      key={pos}
                      type="button"
                      className={rangePos === pos ? 'selected' : ''}
                      onClick={() => { setRangePos(pos); setResult(null); setError(null) }}
                    >
                      {pos === 'min' ? 'Min' : 'Max'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="calc-btn" disabled={!canSubmit}>
          Calculate
        </button>
      </form>

      {/* ====== RIGHT: Results ====== */}
      <div className="calc-results">

        {/* Error */}
        {error && (
          <div className="calc-error">
            <strong>Error: </strong>{error}
          </div>
        )}

        {/* Empty state */}
        {!result && !error && (
          <div className="calc-empty">
            Fill in the form and click Calculate to see results.
          </div>
        )}

        {result && (
          <>
            {/* Annual totals */}
            <div className="result-card">
              <h3>Annual Totals</h3>
              <div className="totals-grid">
                <div className="total-cell">
                  <span className="tc-label">Salary</span>
                  <span className="tc-value">{fmt(result.totalSalary)}</span>
                </div>
                <div className="total-cell">
                  <span className="tc-label">Benefits</span>
                  <span className="tc-value">{fmt(result.totalBen)}</span>
                </div>
                <div className="total-cell combined">
                  <span className="tc-label">Combined</span>
                  <span className="tc-value">{fmt(result.totalSalary + result.totalBen)}</span>
                </div>
              </div>
            </div>

            {/* PP26 reference row */}
            <div className="result-card">
              <h3>
                PP26 Reference
                {!result.pp26Found && (
                  <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#888', marginLeft: '0.5rem' }}>
                    (synthesized — run starts after PP26)
                  </span>
                )}
              </h3>
              <table className="result-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Salary</td>
                    <td className="num">{fmt(result.pp26Salary)}</td>
                  </tr>
                  {Object.entries(result.pp26Breakdown).map(([name, val]) => (
                    <tr key={name}>
                      <td>
                        {name}
                        {name === 'Social Security' && (
                          <span style={{ fontSize: '0.72rem', color: '#888', marginLeft: '4px' }}>*</span>
                        )}
                      </td>
                      <td className="num">{fmt(val)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total (salary + ben)</td>
                    <td className="num">{fmt(result.pp26Salary + result.pp26Ben)}</td>
                  </tr>
                </tbody>
              </table>
              {Object.keys(result.pp26Breakdown).includes('Social Security') && (
                <p className="footnote">* Social Security shown at full biweekly rate (cumulative tracking pending).</p>
              )}
            </div>

            {/* Per-PP table (collapsible) */}
            <div className="result-card">
              <button
                className={`pp-toggle ${showPpTable ? 'open' : ''}`}
                type="button"
                onClick={() => setShowPpTable(v => !v)}
              >
                Per-Pay-Period Detail ({result.ppRows.length} pay periods)
              </button>

              {showPpTable && (
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>PP</th>
                      <th>PPE</th>
                      <th className="num">Salary</th>
                      <th className="num">Benefits</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ppRows.map(row => {
                      const flag = pctLabel(row.pct)
                      return (
                        <tr key={row.pp}>
                          <td>
                            {row.pp}
                            {row.postCOLA && (
                              <span style={{ fontSize: '0.7rem', color: '#005fcc', marginLeft: 3 }}>COLA</span>
                            )}
                          </td>
                          <td>
                            {row.ppe}
                            {flag && <span className="pct-flag">{flag}</span>}
                          </td>
                          <td className="num">{fmt(row.salary)}</td>
                          <td className="num">{fmt(row.benefits)}</td>
                          <td className="num">{fmt(row.total)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Reference row */}
            <div className="result-card">
              <h3>Reference</h3>
              <div className="ref-grid">
                <div className="ref-item">
                  <span className="ri-label">EmpOrg</span>
                  <span className="ri-value">{result.empOrg}</span>
                </div>
                <div className="ref-item">
                  <span className="ri-label">Pre-COLA Biweekly</span>
                  <span className="ri-value">{fmt(result.preBiweekly)}</span>
                </div>
                <div className="ref-item">
                  <span className="ri-label">Post-COLA Biweekly</span>
                  <span className="ri-value">{fmt(result.postBiweekly)}</span>
                </div>
                <div className="ref-item">
                  <span className="ri-label">Steps Snapshot</span>
                  <span className="ri-value">
                    {result.snapshotsUsed.steps
                      ? `${result.snapshotsUsed.steps.from} → ${result.snapshotsUsed.steps.to ?? 'open'}`
                      : '—'}
                  </span>
                </div>
                <div className="ref-item">
                  <span className="ri-label">Retirement Snapshot</span>
                  <span className="ri-value">
                    {result.snapshotsUsed.retirement.from} → {result.snapshotsUsed.retirement.to ?? 'open'}
                  </span>
                </div>
                <div className="ref-item">
                  <span className="ri-label">Health Snapshot</span>
                  <span className="ri-value">
                    {result.snapshotsUsed.health.from} → {result.snapshotsUsed.health.to ?? 'open'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
