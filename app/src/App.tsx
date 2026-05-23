import { useState } from 'react';
import './App.css';
import { CalculatorView } from './modules/calculator/CalculatorView';
import { ImporterView } from './modules/importer/ImporterView';
import { PositionsView } from './modules/positions/PositionsView';
import { useAppStore } from './lib/store';

type Tab = 'calculator' | 'importer' | 'positions';

const TABS: { id: Tab; label: string }[] = [
  { id: 'calculator', label: 'Job Class Calculator' },
  { id: 'importer',   label: 'Load Reports' },
  { id: 'positions',  label: 'Positions' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('calculator');
  const issueCount = useAppStore(s => s.issues.length);

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">KosPos</div>
          <nav style={{ display: 'flex', gap: 4 }}>
            {TABS.map(t => (
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
        {tab === 'calculator' && <CalculatorView />}
        {tab === 'importer'   && <ImporterView />}
        {tab === 'positions'  && <PositionsView />}
      </main>

      <footer className="site-footer">
        <span>KosPos · alkprojects/kospos · MIT</span>
      </footer>
    </div>
  );
}
