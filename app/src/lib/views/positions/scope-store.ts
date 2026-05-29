/**
 * Positions view scope store — which Job Code the Positions view is currently
 * filtered to. Set by the "Positions →" affordance on an Eligibility summary
 * row; consumed by [PositionsView], which surfaces a "filtered to job code"
 * banner with a Clear button.
 *
 * Mirrors [useLaborScope] (../labor/scope-store.ts): a tiny dedicated UI-state
 * store, kept out of useAppStore for the same reason usePositionNotes is —
 * it's a cross-tab navigation concern, not loaded-rows data.
 *
 * No requestSeq counter here (unlike useLaborScope): the tab switch is driven
 * by the parameterless onViewPositions callback the App shell passes to
 * EligibilityView (same pattern as onViewPayroll), and the cross-nav affordance
 * only ever fires from the Eligibility tab — so switching to Positions is
 * always a real tab change. The store just carries the job code across it.
 */

import { create } from 'zustand';

interface PositionsScopeState {
  /** SF Job Code the Positions list is filtered to, or null for no filter. */
  jobCode: string | null;
  setJobCode: (jobCode: string | null) => void;
  clearScope: () => void;
}

export const usePositionsScope = create<PositionsScopeState>(set => ({
  jobCode: null,
  setJobCode: jobCode => set({ jobCode }),
  clearScope: () => set({ jobCode: null }),
}));
