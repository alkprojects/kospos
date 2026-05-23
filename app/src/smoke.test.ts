import { describe, it, expect } from 'vitest'
import { calcEmployeeCost, CostCalcError } from './lib/cost'

// Phase 0 smoke test — proves the test runner is wired up.
describe('smoke', () => {
  it('1 + 1 === 2', () => {
    expect(1 + 1).toBe(2)
  })
})

// Phase 1a smoke test — confirms calcEmployeeCost executes end-to-end and
// returns a CostResult for a known-good input. Math parity verified in issue #2.
describe('calcEmployeeCost', () => {
  it('returns a CostResult for a basic step-class input', () => {
    const result = calcEmployeeCost({
      code: '881',
      setid: 'COMMN',
      retCode: 'C',
      ppStartDate: '2025-07-04',
      salaryType: 'step',
      stepOrRange: 1,
      fiscalYear: 'FY2026',
    })
    expect(result).toBeDefined()
    expect(result.ppRows.length).toBeGreaterThan(0)
    expect(result.empOrg).toBe('002')
    expect(result.preBiweekly).toBeCloseTo(27.3375 * 80, 2)
    expect(result.postBiweekly).toBeCloseTo(27.75 * 80, 2)
    expect(result.totalSalary).toBeGreaterThan(0)
    expect(result.totalBen).toBeGreaterThan(0)
  })

  it('throws CostCalcError for unknown fiscal year', () => {
    expect(() => calcEmployeeCost({
      code: '881',
      setid: 'COMMN',
      retCode: 'C',
      ppStartDate: '2025-07-04',
      salaryType: 'step',
      stepOrRange: 1,
      fiscalYear: 'FY1999',
    })).toThrow(CostCalcError)
  })

  it('throws CostCalcError for unknown job code', () => {
    expect(() => calcEmployeeCost({
      code: '9999',
      setid: 'COMMN',
      retCode: 'C',
      ppStartDate: '2025-07-04',
      salaryType: 'step',
      stepOrRange: 1,
      fiscalYear: 'FY2026',
    })).toThrow(CostCalcError)
  })

  it('OASDI drops to $0 once the CY wage base is exhausted, then restarts Jan 1', () => {
    // code=881 step=1: biwBase = 27.3375 × 80 = $2,187.00
    // PP1 salary = $2,187 × 0.4 = $874.80
    // With priorWages=$175,500: remaining room = $176,100 - $175,500 = $600
    //   PP1: taxable=min($2,187,$600)=$600 → SS=$37.20 → scaled ×0.4 = $14.88
    //   After PP1: cyWages = $175,500 + $874.80 = $176,374.80  (over $176,100 cap)
    //   PP2+: remaining=0 → SS=$0
    // At PP15 (ppe=2026-01-16): ppeYear=2026 > fyStartYear=2025 → cyWages resets to 0,
    //   cap switches to CY2026 ($185,407) → OASDI restarts at full rate
    const result = calcEmployeeCost({
      code: '881',
      setid: 'COMMN',
      retCode: 'C',
      ppStartDate: '2025-07-04',
      salaryType: 'step',
      stepOrRange: 1,
      fiscalYear: 'FY2026',
      cumulativeCalendarYearSalary: 175500,
    })
    const pp1 = result.ppRows[0]
    expect(pp1.pp).toBe(1)
    expect(pp1.breakdown['Social Security']).toBeGreaterThan(0)

    const pp2 = result.ppRows[1]
    expect(pp2.breakdown['Social Security'] ?? 0).toBe(0)  // cap exhausted
    expect(pp2.breakdown['Medicare']).toBeGreaterThan(0)   // Medicare continues (no cap)

    // PP15 is the first PP whose ppe is in 2026 → calendar year resets
    const pp15 = result.ppRows.find(r => r.pp === 15)!
    expect(pp15.breakdown['Social Security']).toBeGreaterThan(0)  // OASDI restarts
  })

  it('handles PP27-start: pp26Found=false but pp26 reference row is still populated', () => {
    // PP27 ppe for FY2026 is 2026-06-30
    const result = calcEmployeeCost({
      code: '881',
      setid: 'COMMN',
      retCode: 'C',
      ppStartDate: '2026-06-30',
      salaryType: 'step',
      stepOrRange: 1,
      fiscalYear: 'FY2026',
    })
    expect(result.ppRows).toHaveLength(1)
    expect(result.ppRows[0].pp).toBe(27)
    expect(result.pp26Found).toBe(false)
    // Even though the run only covers PP27, the reference row should be synthesized
    expect(result.pp26Salary).toBeCloseTo(27.75 * 80, 2)  // post-COLA rate
    expect(result.pp26Ben).toBeGreaterThan(0)
  })
})
