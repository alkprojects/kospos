/**
 * Derived option lists for the calculator UI, computed once at module load
 * from the static JSON imports. Nothing here changes the math — this is
 * purely for driving dropdowns and button groups.
 */

import stepsFileRaw from '../data/dhr-steps.json'
import rangesFileRaw from '../data/dhr-ranges.json'
import retirementFileRaw from '../data/retirement.json'
import calendarFy2026Raw from '../data/calendar-fy2026.json'

// Cast through unknown to match the same pattern as cost.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stepsSnap = (stepsFileRaw as any).snapshots[0] as {
  rates: Record<string, Record<string, Record<string, number>>>
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rangesSnap = (rangesFileRaw as any).snapshots[0] as {
  entries: Record<string, Record<string, { unionCode: string; ranges: Record<string, { min: number | null; max: number | null }> }>>
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const retSnap = (retirementFileRaw as any).snapshots[0] as {
  byCode: Record<string, Record<string, unknown[]>>
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const calendar = calendarFy2026Raw as any as {
  payPeriods: { pp: number; ppe: string; pct: number }[]
}

// ---------------------------------------------------------------------------
// Step-class options
// code → { setids: string[], stepsPerSetid: Record<setid, string[]> }
// ---------------------------------------------------------------------------

export interface StepCodeOpts {
  setids: string[]
  stepsPerSetid: Record<string, string[]>
}

export const STEP_CODES: Record<string, StepCodeOpts> = {}

for (const [code, setidMap] of Object.entries(stepsSnap.rates)) {
  const setids = Object.keys(setidMap)
  const stepsPerSetid: Record<string, string[]> = {}
  for (const [setid, stepMap] of Object.entries(setidMap)) {
    stepsPerSetid[setid] = Object.keys(stepMap).sort((a, b) => Number(a) - Number(b))
  }
  STEP_CODES[code] = { setids, stepsPerSetid }
}

// ---------------------------------------------------------------------------
// Range-class options
// code → { setids: string[], rangesPerSetid: Record<setid, string[]> }
// ---------------------------------------------------------------------------

export interface RangeCodeOpts {
  setids: string[]
  rangesPerSetid: Record<string, string[]>
}

export const RANGE_CODES: Record<string, RangeCodeOpts> = {}

for (const [code, setidMap] of Object.entries(rangesSnap.entries)) {
  const setids = Object.keys(setidMap)
  const rangesPerSetid: Record<string, string[]> = {}
  for (const [setid, entry] of Object.entries(setidMap)) {
    // Only include range letters that have non-null min values
    rangesPerSetid[setid] = Object.entries(entry.ranges)
      .filter(([, v]) => v.min !== null)
      .map(([k]) => k)
  }
  RANGE_CODES[code] = { setids, rangesPerSetid }
}

// ---------------------------------------------------------------------------
// Unified code list for autocomplete (sorted numerically then alpha)
// ---------------------------------------------------------------------------

export interface CodeEntry {
  code: string
  type: 'step' | 'range'
}

function numericCodeSort(a: string, b: string): number {
  const na = parseInt(a, 10)
  const nb = parseInt(b, 10)
  if (!isNaN(na) && !isNaN(nb)) return na - nb
  return a.localeCompare(b)
}

const stepEntries: CodeEntry[] = Object.keys(STEP_CODES).map(c => ({ code: c, type: 'step' }))
const rangeEntries: CodeEntry[] = Object.keys(RANGE_CODES).map(c => ({ code: c, type: 'range' }))

export const ALL_CODES: CodeEntry[] = [
  ...stepEntries,
  ...rangeEntries,
].sort((a, b) => numericCodeSort(a.code, b.code))

export const ALL_CODE_STRINGS: string[] = ALL_CODES.map(e => e.code)

// ---------------------------------------------------------------------------
// Retirement codes
// ---------------------------------------------------------------------------

export const RET_CODES: string[] = Object.keys(retSnap.byCode).sort()

// ---------------------------------------------------------------------------
// Pay periods (FY2026 only for now)
// ---------------------------------------------------------------------------

export interface PPOption {
  pp: number
  ppe: string
  label: string
}

export const PP_OPTIONS: PPOption[] = calendar.payPeriods.map(p => ({
  pp: p.pp,
  ppe: p.ppe,
  label: `PP${p.pp} — ${p.ppe}`,
}))

// ---------------------------------------------------------------------------
// Helper: detect salaryType for a given code
// ---------------------------------------------------------------------------

export function detectSalaryType(code: string): 'step' | 'range' | null {
  if (STEP_CODES[code]) return 'step'
  if (RANGE_CODES[code]) return 'range'
  return null
}
