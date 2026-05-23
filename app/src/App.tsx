import './App.css'

function App() {
  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">KosPos</div>
          <span className="phase-tag">Phase&nbsp;0&nbsp;·&nbsp;Foundation</span>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h1>Position Management for San Francisco City and County</h1>
          <p className="lede">
            A workspace for budgeting, projections, hiring plans, separation plans,
            special-class calculations, cross-system change reports, and an
            audience-aware org chart — built on the standard SF labor reports.
          </p>
        </section>

        <section className="card">
          <h2>Status</h2>
          <p>
            Foundation phase. This page confirms the deploy pipeline works. Real
            modules ship starting Phase 1 (Job Class Calculator).
          </p>
        </section>

        <section className="card">
          <h2>Where to start</h2>
          <ul className="link-list">
            <li>
              <a href="https://github.com/alkprojects/kospos">Repository &amp; docs</a>
              <span>— overview, roadmap, working agreements.</span>
            </li>
            <li>
              <a href="https://github.com/alkprojects/kospos/blob/main/docs/ROADMAP.md">
                Roadmap
              </a>
              <span>— phased plan, one feature per phase.</span>
            </li>
            <li>
              <a href="https://github.com/alkprojects/kospos/blob/main/docs/VISION.md">
                Vision
              </a>
              <span>— what we're building and why.</span>
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>Related projects</h2>
          <ul className="link-list">
            <li>
              <a href="https://alkprojects.github.io/CCSF-Job-Class-Calculator/">
                CCSF Job Class Calculator
              </a>
              <span>— legacy standalone calculator. Being lifted into KosPos.</span>
            </li>
            <li>
              <a href="https://alkprojects.github.io/orgchartbuilder/">Org Chart Builder</a>
              <span>— legacy React Flow prototype. Folds into KosPos in Phase&nbsp;10.</span>
            </li>
          </ul>
        </section>
      </main>

      <footer className="site-footer">
        <span>KosPos · alkprojects/kospos · MIT</span>
      </footer>
    </div>
  )
}

export default App
