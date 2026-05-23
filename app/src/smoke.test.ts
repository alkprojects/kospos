import { describe, it, expect } from 'vitest'

// Phase 0 smoke test — proves the test runner is wired up.
// Real tests start landing in Phase 1 (calculator parity tests).
describe('smoke', () => {
  it('1 + 1 === 2', () => {
    expect(1 + 1).toBe(2)
  })
})
