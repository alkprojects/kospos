/**
 * lib/staffing-plan/ tests — PlannedAction entity, cost integration, rollups,
 * store CRUD + history audit trail.
 *
 * Synthetic plan data; real reference data for the cost-calculator integration
 * (class 922 / Range A / min / retCode C — same fixture lib/cost.test.ts uses).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { PlannedAction } from './types';
import {
  ACTION_TYPE_ORDER,
  actionsForPosition,
  computeDerivedActions,
  computeExpectedCost,
  computeOmittedDerivedActions,
  isAllowedStatusTransition,
  netCostImpact,
  newActionId,
  pricingDiagnostic,
  rollupByType,
} from './build';
import { useStaffingPlan } from './store';
import type { CostInput } from '../cost';
import type { Position } from '../positions';

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

/** Real-data CostInput — class 922 Range A min, retCode C, PP1 start. */
const REAL_BASIS: CostInput = {
  code: '922',
  setid: 'COMMN',
  retCode: 'C',
  ppStartDate: '2025-07-04',
  salaryType: 'range',
  stepOrRange: 'A',
  rangePos: 'min',
  fiscalYear: 'FY2026',
};

function action(partial: Partial<PlannedAction> & { positionId: string }): PlannedAction {
  return {
    id: newActionId(),
    displayNumber: partial.positionId,
    type: 'active-hire',
    status: 'not-started',
    basis: null,
    notes: '',
    plannedAt: '2026-05-26T12:00:00.000Z',
    history: [],
    ...partial,
  };
}

/**
 * Minimal Position factory for derived-action tests. Only the fields the
 * derive rules consult (`id`, `displayNumber`, `fillStatus`, `appointment.cat1718`)
 * are meaningful; the rest are stubbed with sensible defaults so the type
 * shape is satisfied.
 */
function position(partial: {
  id: string;
  displayNumber?: string;
  fillStatus?: string;
  cat1718?: { category: '17' | '18'; expiredDate?: string };
}): Position {
  const id = partial.id;
  const fillStatus = partial.fillStatus ?? 'FILLED';
  const isFilled = fillStatus !== 'VACANT';
  return {
    id,
    displayNumber: partial.displayNumber ?? id,
    jobCode: '1234',
    jobCodeDescription: 'Test',
    positionStatus: 'Approved',
    fillStatus,
    maxHeadcount: 1,
    effectiveDept: { code: '229000', name: 'DBI', node: null, hierarchy: [] },
    budgetedDept:  { code: '229000', name: 'DBI', node: null, hierarchy: [] },
    positionDivision: '',
    fte: 1,
    budgetJobCode: '1234',
    snapshotDate: '2026-05-20',
    vacantDate: isFilled ? '' : '2025-12-01',
    // Position-level cat1718 is set whenever the row has the code — filled or
    // vacant. Matches the lifted-attribute model in lib/positions/types.ts.
    cat1718: partial.cat1718
      ? {
          category: partial.cat1718.category,
          appointmentDate: '2025-01-01',
          months: 24,
          expiredDate: partial.cat1718.expiredDate ?? '2027-01-01',
        }
      : undefined,
    // Appointment-level cat1718 mirrors the incumbent's attributes — only
    // when filled. Vacant Cat 17/18 positions have position.cat1718 set but
    // no appointment.
    appointment: isFilled
      ? {
          emplId: '12345',
          name: 'Temp, Tester',
          status: 'A',
          type: partial.cat1718 ? 'TEX' : 'PCS',
          exemptCategory: partial.cat1718
            ? partial.cat1718.category === '17'
              ? '17 Special Proj - Limited Term'
              : '18 Special Proj - Limited Term'
            : '',
          jobCode: '1234',
          salaryStep: '5',
          hourlyRate: 50,
          meritIncreaseDate: '',
          cat1718: partial.cat1718
            ? {
                category: partial.cat1718.category,
                appointmentDate: '2025-01-01',
                months: 24,
                expiredDate: partial.cat1718.expiredDate ?? '2027-01-01',
              }
            : undefined,
        }
      : undefined,
    previousEmployee: '',
    userNotes: '',
    roster: { code: '', description: '' },
    sourceRow: 1,
  };
}

// ----------------------------------------------------------------------------
// newActionId
// ----------------------------------------------------------------------------

describe('newActionId', () => {
  it('produces unique ids across calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(newActionId());
    expect(ids.size).toBe(100);
  });

  it('returns a non-empty string', () => {
    expect(newActionId().length).toBeGreaterThan(0);
  });
});

// ----------------------------------------------------------------------------
// computeExpectedCost — sign convention + COLA-aware projection
// ----------------------------------------------------------------------------

describe('computeExpectedCost', () => {
  it('returns null when basis is null (unpriced)', () => {
    const a = action({ positionId: '50001', basis: null });
    expect(computeExpectedCost(a)).toBeNull();
  });

  it('positive annual cost for active-hire (class 922 Range A min)', () => {
    const a = action({ positionId: '50001', type: 'active-hire', basis: REAL_BASIS });
    const cost = computeExpectedCost(a);
    expect(cost).not.toBeNull();
    // cost.test.ts asserts salary-only is $130K-$140K; we add benefits
    // (retirement + health + payroll taxes ≈ $30K-$50K), so the
    // fully-loaded annual lands in $160K-$200K.
    expect(cost!.annual).toBeGreaterThan(160_000);
    expect(cost!.annual).toBeLessThan(200_000);
    expect(cost!.empOrg).toBeTruthy(); // calculator resolved it; exact value
                                       // depends on dhr-ranges.json unionCode
  });

  it('negates the annual for separation (savings convention)', () => {
    const hire = action({ positionId: '50001', type: 'active-hire', basis: REAL_BASIS });
    const sep  = action({ positionId: '50002', type: 'separation',  basis: REAL_BASIS });
    const hireC = computeExpectedCost(hire)!;
    const sepC  = computeExpectedCost(sep)!;
    expect(hireC.annual).toBeGreaterThan(0);
    expect(sepC.annual).toBeLessThan(0);
    // Same magnitude, opposite sign.
    expect(Math.abs(hireC.annual + sepC.annual)).toBeLessThan(0.01);
  });

  it('keeps positive sign for temp-tracking / pending / unfunded', () => {
    for (const t of ['temp-tracking', 'pending', 'unfunded'] as const) {
      const a = action({ positionId: '50001', type: t, basis: REAL_BASIS });
      const cost = computeExpectedCost(a)!;
      expect(cost.annual).toBeGreaterThan(0);
    }
  });

  it('returns null when calcEmployeeCost throws (e.g. unknown jobCode)', () => {
    const bad: CostInput = { ...REAL_BASIS, code: 'XXXX' }; // not in dhr-steps.json
    const a = action({ positionId: '50001', basis: bad });
    expect(computeExpectedCost(a)).toBeNull();
  });

  it('perPp equals annual / ppCount', () => {
    const a = action({ positionId: '50001', basis: REAL_BASIS });
    const cost = computeExpectedCost(a)!;
    expect(cost.perPp * cost.ppCount).toBeCloseTo(cost.annual, 2);
  });
});

// ----------------------------------------------------------------------------
// rollupByType
// ----------------------------------------------------------------------------

describe('rollupByType', () => {
  it('returns one row per ACTION_TYPE_ORDER (empty buckets included)', () => {
    const rolled = rollupByType([]);
    expect(rolled).toHaveLength(ACTION_TYPE_ORDER.length);
    expect(rolled.map(r => r.type)).toEqual([...ACTION_TYPE_ORDER]);
    for (const r of rolled) {
      expect(r.count).toBe(0);
      expect(r.annualCost).toBe(0);
    }
  });

  it('counts priced vs unpriced per bucket', () => {
    const rolled = rollupByType([
      action({ positionId: '50001', type: 'active-hire', basis: REAL_BASIS }),
      action({ positionId: '50002', type: 'active-hire', basis: null }),
      action({ positionId: '50003', type: 'separation',  basis: REAL_BASIS }),
      action({ positionId: '50004', type: 'pending',     basis: null }),
    ]);
    const active = rolled.find(r => r.type === 'active-hire')!;
    expect(active.count).toBe(2);
    expect(active.pricedCount).toBe(1);
    expect(active.unpriced).toBe(1);
    expect(active.annualCost).toBeGreaterThan(0);

    const sep = rolled.find(r => r.type === 'separation')!;
    expect(sep.annualCost).toBeLessThan(0); // savings

    const pending = rolled.find(r => r.type === 'pending')!;
    expect(pending.count).toBe(1);
    expect(pending.pricedCount).toBe(0);
    expect(pending.unpriced).toBe(1);
    expect(pending.annualCost).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// actionsForPosition — the multi-action-per-position pattern
// ----------------------------------------------------------------------------

describe('actionsForPosition (multi-action / Marco Jacobo TX pattern)', () => {
  it('returns all actions tied to one position, regardless of type', () => {
    const all = [
      action({ positionId: '1115135', type: 'active-hire', notes: '5207 recruit pending CSC' }),
      action({ positionId: '1115135', type: 'separation',   notes: '5203 promotion expected' }),
      action({ positionId: '1115135', type: 'temp-tracking', notes: 'TX placeholder during CSC processing' }),
      action({ positionId: '50001',    type: 'active-hire' }),
    ];
    const slice = actionsForPosition(all, '1115135');
    expect(slice).toHaveLength(3);
    expect(slice.map(a => a.type).sort())
      .toEqual(['active-hire', 'separation', 'temp-tracking']);
  });

  it('normalizes the lookup key (zero-stripped trim) on both sides', () => {
    const all = [action({ positionId: '50001', notes: 'plain' })];
    expect(actionsForPosition(all, '00050001')).toHaveLength(1);
    expect(actionsForPosition(all, '  50001  ')).toHaveLength(1);
  });

  it('returns empty array on blank or no-match', () => {
    expect(actionsForPosition([], '50001')).toHaveLength(0);
    expect(actionsForPosition([action({ positionId: '50001' })], '99999')).toHaveLength(0);
    expect(actionsForPosition([action({ positionId: '50001' })], '')).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// pricingDiagnostic + netCostImpact
// ----------------------------------------------------------------------------

describe('pricingDiagnostic', () => {
  it('counts priced vs unpriced across all types', () => {
    const d = pricingDiagnostic([
      action({ positionId: '50001', basis: REAL_BASIS }),
      action({ positionId: '50002', basis: null }),
      action({ positionId: '50003', basis: null }),
    ]);
    expect(d.total).toBe(3);
    expect(d.priced).toBe(1);
    expect(d.unpriced).toBe(2);
  });
});

describe('netCostImpact', () => {
  it('respects sign convention: hires + separations net out partially', () => {
    const net = netCostImpact([
      action({ positionId: '50001', type: 'active-hire', basis: REAL_BASIS }),
      action({ positionId: '50002', type: 'separation',  basis: REAL_BASIS }),
    ]);
    // Same |annual| → net ≈ 0.
    expect(Math.abs(net.annual)).toBeLessThan(0.01);
  });

  it('ignores unpriced actions', () => {
    const net = netCostImpact([
      action({ positionId: '50001', type: 'active-hire', basis: REAL_BASIS }),
      action({ positionId: '50002', type: 'active-hire', basis: null }),
    ]);
    // Only one priced — net equals that one's annual (salary + benefits).
    expect(net.annual).toBeGreaterThan(160_000);
    expect(net.annual).toBeLessThan(200_000);
  });
});

// ----------------------------------------------------------------------------
// Store CRUD + history audit
// ----------------------------------------------------------------------------

describe('useStaffingPlan store', () => {
  beforeEach(() => {
    useStaffingPlan.getState().clearAll();
  });

  it('addAction returns an id and inserts the action with defaults', () => {
    const id = useStaffingPlan.getState().addAction({
      positionId: '50001', type: 'active-hire',
    });
    const a = useStaffingPlan.getState().actions.get(id);
    expect(a).toBeDefined();
    expect(a!.positionId).toBe('50001');
    expect(a!.status).toBe('not-started'); // default for active-hire
    expect(a!.basis).toBeNull();
    expect(a!.history).toHaveLength(1); // __created entry
    expect(a!.history[0].field).toBe('__created');
  });

  it('defaults status to null when type is not active-hire', () => {
    const id = useStaffingPlan.getState().addAction({
      positionId: '50002', type: 'separation',
    });
    expect(useStaffingPlan.getState().actions.get(id)!.status).toBeNull();
  });

  it('normalizes positionId on add', () => {
    const id = useStaffingPlan.getState().addAction({
      positionId: '00050001', type: 'active-hire',
    });
    expect(useStaffingPlan.getState().actions.get(id)!.positionId).toBe('50001');
    // displayNumber preserves the raw input for UI.
    expect(useStaffingPlan.getState().actions.get(id)!.displayNumber).toBe('00050001');
  });

  it('updateAction patches changed fields and appends history entries', () => {
    const id = useStaffingPlan.getState().addAction({
      positionId: '50001', type: 'active-hire',
    });
    useStaffingPlan.getState().updateAction(id, { status: 'posted', notes: 'Posted on DHR site' });
    const a = useStaffingPlan.getState().actions.get(id)!;
    expect(a.status).toBe('posted');
    expect(a.notes).toBe('Posted on DHR site');
    expect(a.history).toHaveLength(3); // __created + status + notes
    expect(a.history[1].field).toBe('status');
    expect(a.history[1].before).toBe('not-started');
    expect(a.history[1].after).toBe('posted');
  });

  it('updateAction no-ops on equal values (no new history)', () => {
    const id = useStaffingPlan.getState().addAction({
      positionId: '50001', type: 'active-hire',
    });
    useStaffingPlan.getState().updateAction(id, { status: 'not-started' }); // same value
    const a = useStaffingPlan.getState().actions.get(id)!;
    expect(a.history).toHaveLength(1); // only __created
  });

  it('updateAction is a no-op for unknown id', () => {
    const before = useStaffingPlan.getState().actions.size;
    useStaffingPlan.getState().updateAction('not-a-real-id', { status: 'final' });
    expect(useStaffingPlan.getState().actions.size).toBe(before);
  });

  it('deleteAction removes the entry and returns true', () => {
    const id = useStaffingPlan.getState().addAction({
      positionId: '50001', type: 'active-hire',
    });
    expect(useStaffingPlan.getState().deleteAction(id)).toBe(true);
    expect(useStaffingPlan.getState().actions.has(id)).toBe(false);
  });

  it('deleteAction returns false on unknown id', () => {
    expect(useStaffingPlan.getState().deleteAction('nope')).toBe(false);
  });

  it('toArray returns all actions in the map', () => {
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    useStaffingPlan.getState().addAction({ positionId: '50002', type: 'separation' });
    expect(useStaffingPlan.getState().toArray()).toHaveLength(2);
  });

  it('clearAll wipes the map', () => {
    useStaffingPlan.getState().addAction({ positionId: '50001', type: 'active-hire' });
    useStaffingPlan.getState().clearAll();
    expect(useStaffingPlan.getState().actions.size).toBe(0);
  });

  it('Marco Jacobo TX pattern: 3 actions on one position coexist + filter cleanly', () => {
    const store = useStaffingPlan.getState();
    store.addAction({ positionId: '1115135', type: 'active-hire',  notes: '5207 recruit pending CSC' });
    store.addAction({ positionId: '1115135', type: 'separation',    notes: '5203 promotion expected' });
    store.addAction({ positionId: '1115135', type: 'temp-tracking', notes: 'TX placeholder' });
    store.addAction({ positionId: '50001',    type: 'active-hire' });
    const all = store.toArray();
    expect(all).toHaveLength(4);
    expect(actionsForPosition(all, '1115135')).toHaveLength(3);
    expect(actionsForPosition(all, '50001')).toHaveLength(1);
  });

  it('hideDerivedAction adds to derivedRemoved; restore removes it', () => {
    const store = useStaffingPlan.getState();
    store.hideDerivedAction('50001');
    expect(useStaffingPlan.getState().derivedRemoved.has('50001')).toBe(true);
    store.restoreDerivedAction('50001');
    expect(useStaffingPlan.getState().derivedRemoved.has('50001')).toBe(false);
  });

  it('hideDerivedAction normalizes the position key (leading zeros stripped)', () => {
    const store = useStaffingPlan.getState();
    store.hideDerivedAction('0050001');
    expect(useStaffingPlan.getState().derivedRemoved.has('50001')).toBe(true);
  });

  it('hideDerivedAction is a no-op when the position is already hidden (no rerender)', () => {
    const store = useStaffingPlan.getState();
    store.hideDerivedAction('50001');
    const setRef = useStaffingPlan.getState().derivedRemoved;
    store.hideDerivedAction('50001'); // no-op
    expect(useStaffingPlan.getState().derivedRemoved).toBe(setRef);
  });

  it('clearAll clears derivedRemoved too', () => {
    const store = useStaffingPlan.getState();
    store.hideDerivedAction('50001');
    store.clearAll();
    expect(useStaffingPlan.getState().derivedRemoved.size).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// computeDerivedActions — Bug 3 (S29 Alex) derived-from-data defaults
// ----------------------------------------------------------------------------

describe('computeDerivedActions', () => {
  it('derives Pending for vacant positions with no manual action', () => {
    const positions = [position({ id: '50001', fillStatus: 'VACANT' })];
    const derived = computeDerivedActions(positions, new Set(), new Set());
    expect(derived).toHaveLength(1);
    expect(derived[0].type).toBe('pending');
    expect(derived[0].derivedReason).toBe('Vacant, no plan');
    expect(derived[0].positionId).toBe('50001');
    expect(derived[0].id).toBe('derived-50001');
    expect(derived[0].source).toBe('derived');
    expect(derived[0].basis).toBeNull();
  });

  it('derives TEMP for Cat 17/18 positions (carries the category in the reason)', () => {
    const positions = [
      position({ id: '60001', cat1718: { category: '17' } }),
      position({ id: '60002', cat1718: { category: '18' } }),
    ];
    const derived = computeDerivedActions(positions, new Set(), new Set());
    expect(derived).toHaveLength(2);
    expect(derived.find(d => d.positionId === '60001')!.type).toBe('temp-tracking');
    expect(derived.find(d => d.positionId === '60001')!.derivedReason).toBe('Cat 17 temp');
    expect(derived.find(d => d.positionId === '60002')!.derivedReason).toBe('Cat 18 temp');
  });

  it('precedence: TEMP wins over Pending when position is both vacant AND Cat 17/18', () => {
    const positions = [
      position({ id: '70001', fillStatus: 'VACANT', cat1718: { category: '17' } }),
    ];
    const derived = computeDerivedActions(positions, new Set(), new Set());
    expect(derived).toHaveLength(1);
    expect(derived[0].type).toBe('temp-tracking');
  });

  it('skips positions that have ANY manual action (per-position manual-wins)', () => {
    const positions = [
      position({ id: '50001', fillStatus: 'VACANT' }),
      position({ id: '50002', fillStatus: 'VACANT' }),
    ];
    const derived = computeDerivedActions(positions, new Set(['50001']), new Set());
    expect(derived).toHaveLength(1);
    expect(derived[0].positionId).toBe('50002');
  });

  it('skips positions in the derivedRemoved set', () => {
    const positions = [
      position({ id: '50001', fillStatus: 'VACANT' }),
      position({ id: '50002', fillStatus: 'VACANT' }),
    ];
    const derived = computeDerivedActions(positions, new Set(), new Set(['50001']));
    expect(derived).toHaveLength(1);
    expect(derived[0].positionId).toBe('50002');
  });

  it('omits filled non-Cat-17/18 positions entirely (no rule fires)', () => {
    const positions = [position({ id: '50001', fillStatus: 'FILLED' })];
    expect(computeDerivedActions(positions, new Set(), new Set())).toEqual([]);
  });

  it('sorts results alphabetically by displayNumber for stable rendering', () => {
    const positions = [
      position({ id: '50003', displayNumber: '50003', fillStatus: 'VACANT' }),
      position({ id: '50001', displayNumber: '50001', fillStatus: 'VACANT' }),
      position({ id: '50002', displayNumber: '50002', fillStatus: 'VACANT' }),
    ];
    const derived = computeDerivedActions(positions, new Set(), new Set());
    expect(derived.map(d => d.displayNumber)).toEqual(['50001', '50002', '50003']);
  });
});

// ----------------------------------------------------------------------------
// computeOmittedDerivedActions — "Manual user changes" section content
// ----------------------------------------------------------------------------

describe('computeOmittedDerivedActions', () => {
  it('surfaces a hidden derived row when the rule still applies', () => {
    const positions = [position({ id: '50001', fillStatus: 'VACANT' })];
    const omitted = computeOmittedDerivedActions(positions, new Set(), new Set(['50001']));
    expect(omitted).toHaveLength(1);
    expect(omitted[0].type).toBe('pending');
  });

  it('auto-prunes a hidden row when the rule no longer fires (e.g. position got filled)', () => {
    // User previously hid 50001 when it was vacant. Snapshot now shows FILLED.
    // Omission stays in the store (derivedRemoved still has 50001) but the
    // section auto-hides it since no derive rule applies.
    const positions = [position({ id: '50001', fillStatus: 'FILLED' })];
    const omitted = computeOmittedDerivedActions(positions, new Set(), new Set(['50001']));
    expect(omitted).toHaveLength(0);
  });

  it('auto-prunes when the user added a manual action (manual-wins; omission moot)', () => {
    const positions = [position({ id: '50001', fillStatus: 'VACANT' })];
    const omitted = computeOmittedDerivedActions(
      positions,
      new Set(['50001']),
      new Set(['50001']),
    );
    expect(omitted).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// isAllowedStatusTransition — S29 Alex pick: guarded forward-only + csc-hold
// branches
// ----------------------------------------------------------------------------

describe('isAllowedStatusTransition', () => {
  it('allows the forward pipeline: not-started → posted → ... → finished', () => {
    expect(isAllowedStatusTransition('not-started', 'posted')).toBe(true);
    expect(isAllowedStatusTransition('posted', 'list')).toBe(true);
    expect(isAllowedStatusTransition('list', 'exam')).toBe(true);
    expect(isAllowedStatusTransition('exam', 'interviews')).toBe(true);
    expect(isAllowedStatusTransition('interviews', 'offer')).toBe(true);
    expect(isAllowedStatusTransition('offer', 'final')).toBe(true);
    expect(isAllowedStatusTransition('final', 'finished')).toBe(true);
  });

  it('allows skipping forward (e.g. not-started → final)', () => {
    expect(isAllowedStatusTransition('not-started', 'final')).toBe(true);
  });

  it('rejects backward transitions in the linear pipeline', () => {
    expect(isAllowedStatusTransition('finished', 'final')).toBe(false);
    expect(isAllowedStatusTransition('offer', 'posted')).toBe(false);
    expect(isAllowedStatusTransition('exam', 'not-started')).toBe(false);
  });

  it('allows same-state (idempotent)', () => {
    expect(isAllowedStatusTransition('posted', 'posted')).toBe(true);
    expect(isAllowedStatusTransition('finished', 'finished')).toBe(true);
  });

  it('allows csc-hold from any state', () => {
    expect(isAllowedStatusTransition('not-started', 'csc-hold')).toBe(true);
    expect(isAllowedStatusTransition('offer', 'csc-hold')).toBe(true);
    expect(isAllowedStatusTransition('finished', 'csc-hold')).toBe(true);
  });

  it('allows clearing csc-hold to any state (the hold resolves to wherever)', () => {
    expect(isAllowedStatusTransition('csc-hold', 'posted')).toBe(true);
    expect(isAllowedStatusTransition('csc-hold', 'interviews')).toBe(true);
    expect(isAllowedStatusTransition('csc-hold', 'finished')).toBe(true);
  });

  it('treats null status (separation / pending / unfunded types) as unconstrained', () => {
    expect(isAllowedStatusTransition(null, 'posted')).toBe(true);
    expect(isAllowedStatusTransition('offer', null)).toBe(true);
    expect(isAllowedStatusTransition(null, null)).toBe(true);
  });
});
