/**
 * Labor view scope store — which Position the Labor (BI Payroll drill-down)
 * view is currently filtered to. Set by the "View payroll" button on Position
 * Detail; consumed by [LaborView] and watched by the App shell to switch tabs.
 *
 * Kept in its own tiny store (instead of folded into useAppStore) for the same
 * reason usePositionNotes is separate: it's a UI-state concern that doesn't
 * belong with the loaded-rows data layer.
 */

import { create } from 'zustand';

interface LaborScopeState {
  positionId: string | null;
  /**
   * Bumped every time setScope is called, so an effect in App.tsx can detect a
   * fresh request and switch the active tab even when the same positionId is
   * scoped twice in a row.
   */
  requestSeq: number;
  setScope: (positionId: string | null) => void;
  clearScope: () => void;
}

export const useLaborScope = create<LaborScopeState>(set => ({
  positionId: null,
  requestSeq: 0,
  setScope: positionId =>
    set(s => ({ positionId, requestSeq: s.requestSeq + 1 })),
  clearScope: () => set({ positionId: null }),
}));
