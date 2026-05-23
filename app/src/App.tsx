import './App.css'
import { CalculatorView } from './modules/calculator/CalculatorView'

function App() {
  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">KosPos</div>
          <span className="phase-tag">Phase&nbsp;1&nbsp;·&nbsp;Job Class Calculator</span>
        </div>
      </header>

      <main className="main" style={{ padding: 0 }}>
        <CalculatorView />
      </main>

      <footer className="site-footer">
        <span>KosPos · alkprojects/kospos · MIT</span>
      </footer>
    </div>
  )
}

export default App
