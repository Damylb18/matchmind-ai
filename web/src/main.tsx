import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ExplanationProvider } from './lib/explanation'

const root = createRoot(document.getElementById('root')!)

// DEV-ONLY: `npm run dev` + `?insight-fixtures` opens the insight personalisation harness.
// import.meta.env.DEV is false in production builds, so the harness is not bundled there.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('insight-fixtures')) {
  void import('./dev/InsightFixtureHarness').then(({ InsightFixtureHarness }) =>
    root.render(
      <StrictMode>
        <ExplanationProvider>
          <InsightFixtureHarness />
        </ExplanationProvider>
      </StrictMode>,
    ),
  )
} else {
  root.render(
    <StrictMode>
      <ExplanationProvider>
        <App />
      </ExplanationProvider>
    </StrictMode>,
  )
}
