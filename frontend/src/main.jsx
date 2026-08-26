import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './lib/analytics.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import MaintenancePage from './components/MaintenancePage.jsx'
import { FLAGS } from './config/featureFlags.js'
import MaintenanceBanner from './components/MaintenanceBanner.jsx'

const root = createRoot(document.getElementById('root'))

// Site-wide maintenance gate — checked before anything else runs. When on,
// MaintenancePage renders standalone (no BrowserRouter, no App, no
// analytics/auth/data calls) for every visitor, every route. Toggle with
// VITE_FF_MAINTENANCE_MODE=true/false in Vercel env vars + redeploy — no
// code change needed to turn the site back on.
if (FLAGS.maintenance_mode) {
  root.render(
    <StrictMode>
      <MaintenancePage />
    </StrictMode>,
  )
} else {
  initAnalytics()

  // Vite fires this specific event when a lazy-loaded chunk fails to load
  // (e.g. the browser's cached index.html points at a chunk hash that a
  // newer deploy has since replaced/purged). This is the same failure mode
  // ErrorBoundary guards against for in-tree render errors, but preload
  // failures can also surface here, outside a component's render cycle —
  // so both are handled. Guarded to reload at most once per session so a
  // genuinely broken chunk can't loop forever.
  window.addEventListener('vite:preloadError', () => {
    let alreadyTried = false
    try {
      alreadyTried = sessionStorage.getItem('capabilio_chunk_reload_attempted') === '1'
    } catch (_) { /* sessionStorage unavailable */ }

    if (!alreadyTried) {
      try { sessionStorage.setItem('capabilio_chunk_reload_attempted', '1') } catch (_) {}
      window.location.reload()
    }
  })

  root.render(
    <StrictMode>
      <ErrorBoundary>
        {/* react-router-dom was already a listed dependency but never
            actually used anywhere — App.jsx ran its own in-memory
            currentPage state machine with no real URLs for any page except
            a handful of special early-return routes (/portfolio/:username,
            /admin/*, /join/*, /career, /company-invite/*). BrowserRouter
            here + the sync logic in App.jsx (see lib/pageRoutes.js) gives
            every page a real, bookmarkable URL without changing any of the
            existing page components, nav callbacks, or render logic. */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Above ErrorBoundary, not inside it, so the banner stays visible even
        if <App/> hits ErrorBoundary's own fallback screen — a site-wide
        status notice is exactly as relevant when something's gone wrong as
        it is on a normal page. See components/MaintenanceBanner.jsx. */}
    <MaintenanceBanner />
    <ErrorBoundary>
      {/* react-router-dom was already a listed dependency but never
          actually used anywhere — App.jsx ran its own in-memory
          currentPage state machine with no real URLs for any page except
          a handful of special early-return routes (/portfolio/:username,
          /admin/*, /join/*, /career, /company-invite/*). BrowserRouter
          here + the sync logic in App.jsx (see lib/pageRoutes.js) gives
          every page a real, bookmarkable URL without changing any of the
          existing page components, nav callbacks, or render logic. */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
