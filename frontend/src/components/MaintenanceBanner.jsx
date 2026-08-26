/**
 * MaintenanceBanner.jsx — thin, dismissible "heads up" bar for active
 * deploy windows. NOT the same mechanism as MaintenancePage.jsx (the
 * full-page FLAGS.maintenance_mode takeover) — this never blocks the app,
 * it just sits above it. Mounted once at the app shell level (main.jsx),
 * above <BrowserRouter>, so it shows on every route without any per-page
 * wiring and stays visible even if <App/> hits an ErrorBoundary fallback.
 *
 * Toggle without a code change: flip VITE_FF_MAINTENANCE_BANNER=true/false
 * in Vercel env vars + redeploy (same convention as every other flag in
 * featureFlags.js). Message is likewise overridable via
 * VITE_MAINTENANCE_BANNER_MESSAGE, no deploy of new copy required.
 *
 * Dismiss persistence: localStorage, not sessionStorage — a maintenance
 * window can span many browser sessions over a day or two, and re-showing
 * the same notice on every new tab would make "dismissible" hollow. Keyed
 * by the message text itself (not a boolean), so editing the message via
 * the env var above automatically re-surfaces the banner to everyone who
 * already dismissed the old wording, with no separate version field to
 * remember to bump.
 */
import { useState } from "react"
import { FLAGS, MAINTENANCE_BANNER_MESSAGE } from "../config/featureFlags"

const STORAGE_KEY = "capabilio_maintenance_banner_dismissed"
const DEFAULT_MESSAGE = "We're shipping some fixes right now — you might see things shift around for a bit. Thanks for hanging in there! 🙏"

function readDismissed(message) {
  try {
    return localStorage.getItem(STORAGE_KEY) === message
  } catch {
    return false
  }
}

export default function MaintenanceBanner() {
  // Custom messages set via VITE_MAINTENANCE_BANNER_MESSAGE are treated as
  // self-contained (the site owner writes their own heading/emoji, e.g.
  // "🔧 Scheduled Maintenance — ...") — the hardcoded "Heads up —" prefix
  // only applies to the built-in DEFAULT_MESSAGE, so a custom message never
  // ends up double-headed ("Heads up — 🔧 Scheduled Maintenance...").
  const isCustomMessage = !!MAINTENANCE_BANNER_MESSAGE
  const message = MAINTENANCE_BANNER_MESSAGE || DEFAULT_MESSAGE
  const [dismissed, setDismissed] = useState(() => readDismissed(message))

  if (!FLAGS.maintenance_banner || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(STORAGE_KEY, message) } catch { /* storage unavailable — dismiss still works for this load */ }
  }

  return (
    <div
      role="status"
      className="capabilio-maintenance-banner"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "10px 40px 10px 16px",
        background: "#FFF3EE",
        borderBottom: "1px solid #FFD8C2",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
        color: "#1A1714",
        position: "relative",
        textAlign: "center",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .capabilio-maintenance-banner { font-size: 12px !important; padding: 8px 34px 8px 12px !important; }
        }
      `}</style>
      <span style={{ maxWidth: 780 }}>
        {!isCustomMessage && <span style={{ color: "#FF5701", fontWeight: 700 }}>Heads up — </span>}
        {message}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "transparent",
          color: "#6B6560",
          fontSize: 16,
          lineHeight: 1,
          cursor: "pointer",
          borderRadius: 6,
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(26,23,20,0.06)" }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
      >
        ×
      </button>
    </div>
  )
}
