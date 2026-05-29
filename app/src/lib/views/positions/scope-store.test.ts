/**
 * Unit tests for usePositionsScope — the cross-tab job-code filter store set
 * from the Eligibility tab and consumed by PositionsView.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePositionsScope } from './scope-store';

beforeEach(() => {
  usePositionsScope.getState().clearScope();
});

describe('usePositionsScope', () => {
  it('starts with no job code scoped', () => {
    expect(usePositionsScope.getState().jobCode).toBeNull();
  });

  it('setJobCode scopes to a job code', () => {
    usePositionsScope.getState().setJobCode('1820');
    expect(usePositionsScope.getState().jobCode).toBe('1820');
  });

  it('setJobCode replaces a prior scope (clicking a second Eligibility row)', () => {
    usePositionsScope.getState().setJobCode('1820');
    usePositionsScope.getState().setJobCode('0922');
    expect(usePositionsScope.getState().jobCode).toBe('0922');
  });

  it('clearScope resets to null', () => {
    usePositionsScope.getState().setJobCode('1820');
    usePositionsScope.getState().clearScope();
    expect(usePositionsScope.getState().jobCode).toBeNull();
  });

  it('setJobCode(null) also clears the scope', () => {
    usePositionsScope.getState().setJobCode('1820');
    usePositionsScope.getState().setJobCode(null);
    expect(usePositionsScope.getState().jobCode).toBeNull();
  });
});
