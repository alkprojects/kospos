import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { CalculatorView } from './modules/calculator/CalculatorView';
import { ImporterView } from './modules/importer/ImporterView';
import { PositionsView } from './lib/views/positions';
import { LaborView } from './lib/views/labor';
import { StaffingPlanView } from './lib/views/staffing-plan';
import { SeparationsView } from './lib/views/separations';
import { ProbationsView } from './lib/views/probation';
import { InactiveView } from './lib/views/inactive';
import { EligibilityView } from './lib/views/eligibility';
import { LandingView } from './lib/views/landing';
import { SpecialClassView } from './modules/special-class/SpecialClassView';
import { useAppStore } from './lib/store';
import { resolveDevMode, disableDevMode } from './lib/dev-mode';
import { useAutoSessionPersistence } from './lib/session/use-auto-persistence';

type Tab =
  | 'landing'
  | 'calculator'
  | 'importer'
  | 'positions'
  | 'labor'
  | 'staffing-plan'
  | 'separations'
  | 'probation'
  | 'inactive'
  | 'eligibility'
  | 'special-class';

type TabDef = { id: Tab; label: string; devOnly?: boolean };

const ALL_TABS: TabDef[] = [
  { id: 'landing',       label: 'Welcome' },
  { id: 'calculator',    label: 'Job Class Calculator' },
  { id: 'positions',     label: 'Positions' },
  { id: 'labor',         label: 'Payroll',               devOnly: true },
  { id: 'staffing-plan', label: 'Hiring Plan',           devOnly: true },
  { id: 'separations',   label: 'Separations',           devOnly: true },
  { id: 'probation',     label: 'Probation',             devOnly: true },
  { id: 'inactive',      label: 'Inactive',              devOnly: true },
  { id: 'eligibility',   label: 'Eligibility',           devOnly: true },
  { id: 'importer',      label: 'Load Reports',          devOnly: true },
  { id: 'special-class', label: 'Special Class',         devOnly: true },
];

// Dev-only escape hatch — exposes the Zustand store on `window.__kospos`
// when dev mode is on. Used by preview-MCP test harnesses + ad-hoc browser
// console debugging. NEVER referenced from runtime code; treat as removable.
declare global {
  interface Window {
    __kospos?: {
      store: typeof useAppStore;
      addRows: (rows: unknown[]) => void;
      clearAll: () => void;
    };
  }
}

export default function App() {
  const [devMode, setDevMode] = useState<boolean>(() => resolveDevMode());
  const visibleTabs = useMemo(
    () => (devMode ? ALL_TABS : ALL_TABS.filter(t => !t.devOnly)),
    [devMode],
  );
  const [tab, setTab] = useState<Tab>(visibleTabs[0].id);
  const issueCount = useAppStore(s => s.issues.length);
  // Wire IndexedDB auto-persistence. Runs once on mount; subscribes to
  // all six Zustand stores; debounces saves to coalesce bulk imports.
  // Status flows into LandingView so the user knows when a snapshot
  // restored vs. saved.
  const persistence = useAutoSessionPersistence();

  // Expose / unexpose the dev hook in lockstep with devMode.
  useEffect(() => {
    if (devMode) {
      window.__kospos = {
        store: useAppStore,
        addRows: (rows) => useAppStore.getState().addRows(rows as never),
        clearAll: () => useAppStore.getState().clearAll(),
      };
    } else {
      delete window.__kospos;
    }
    return () => { delete window.__kospos; };
  }, [devMode]);

  function handleDisableDevMode(): void {
    disableDevMode();
    setDevMode(false);
    setTab('calculator');
  }

  const devOnlyCount = ALL_TABS.filter(t => t.devOnly).length;

  return (
    <div className="app">
      {devMode && (
        <div
          role="status"
          style={{
            background: '#fff8e1',
            borderBottom: '1px solid #f0c020',
            color: '#5b4500',
            fontSize: 12,
            padding: '6px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <span>
            <strong>Dev mode</strong> — {devOnlyCount} extra tabs visible
          </span>
          <button
            onClick={handleDisableDevMode}
            style={{
              fontSize: 11,
              padding: '2px 10px',
              border: '1px solid #d4a017',
              borderRadius: 12,
              background: '#fff',
              color: '#5b4500',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Disable dev mode
          </button>
        </div>
      )}

      <header className="site-header">
        <div className="header-inner">
          <div className="logo">KosPos</div>
          <nav style={{ display: 'flex', gap: 4 }}>
            {visibleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '4px 14px',
                  border: '1px solid',
                  borderColor: tab === t.id ? 'var(--accent)' : 'var(--border)',
                  borderRadius: 20,
                  background: tab === t.id ? 'var(--accent-soft)' : 'transparent',
                  color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: tab === t.id ? 600 : 400,
                  fontFamily: 'inherit',
                  position: 'relative',
                }}
              >
                {t.label}
                {t.id === 'importer' && issueCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#c0392b',
                    color: '#fff',
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {issueCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main" style={{ padding: 0 }}>
        {tab === 'landing'       && (
          <LandingView persistence={persistence} onNavigate={setTab} />
        )}
        {tab === 'calculator'    && <CalculatorView />}
        {tab === 'importer'      && <ImporterView />}
        {tab === 'positions'     && (
          <PositionsView onViewPayroll={() => setTab('labor')} />
        )}
        {tab === 'labor'         && <LaborView />}
        {tab === 'staffing-plan' && <StaffingPlanView />}
        {tab === 'separations'   && <SeparationsView />}
        {tab === 'probation'     && <ProbationsView />}
        {tab === 'inactive'      && <InactiveView />}
        {tab === 'eligibility'   && <EligibilityView />}
        {tab === 'special-class' && <SpecialClassView />}
      </main>

      <footer className="site-footer">
        <span>KosPos · alkprojects/kospos · MIT</span>
      </footer>
    </div>
  );
}
