/**
 * MarketingNav.jsx — shared header for the homepage and all 4 dedicated
 * path pages. Surfaces every signup path directly in the nav (rather than
 * burying them inside a "Choose Your Journey" grid) so a visitor who
 * already knows what they are ("I'm a professional") can jump straight to
 * that path's own page from anywhere on the marketing site.
 *
 * No shared marketing Header component existed before this — LandingPage.jsx
 * previously had its nav fully inline (confirmed via repo search). This is
 * the single implementation both it and the new path pages now use.
 */
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { T } from "../../lib/osDesignTokens"
import { PRIMARY_PATHS, PATH_URLS } from "../../lib/pathIdentity"
import { PrimaryButton, GhostButton } from "./primitives"

// activePath: "home" | "student" | "professional" | "executive" | "institution"
export default function MarketingNav({ activePath = "home", onGetStarted, onLogin }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const onHome = activePath === "home"
  const howItWorksHref = onHome ? "#how-it-works" : "/#how-it-works"

  const linkStyle = (active) => ({
    fontSize: 14, textDecoration: "none", fontWeight: active ? 700 : 500,
    color: active ? T.accent : T.ink2, whiteSpace: "nowrap",
  })

  return (
    <nav style={{ borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: T.surface, zIndex: 50 }}>
      <div className="lp-container" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img src="/capabilio-logo-dark.png" alt="Capabilio AI" style={{ height: 24, width: "auto" }} />
        </a>

        <div className="mnav-links" style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href={howItWorksHref} style={linkStyle(false)}>How it works</a>
          {PRIMARY_PATHS.map((p) => (
            <a key={p.key} href={PATH_URLS[p.key]} style={linkStyle(activePath === p.key)}>
              {p.title}
            </a>
          ))}
          <a href="#pricing" style={linkStyle(false)}>Pricing</a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="mnav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GhostButton onClick={onLogin}>Sign in</GhostButton>
            <PrimaryButton onClick={onGetStarted}>Get started</PrimaryButton>
          </div>
          <button
            className="mnav-toggle"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 6 }}
          >
            {mobileOpen ? <X size={22} color={T.ink} /> : <Menu size={22} color={T.ink} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mnav-panel" style={{ borderTop: `1px solid ${T.border}`, padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <a href={howItWorksHref} style={linkStyle(false)} onClick={() => setMobileOpen(false)}>How it works</a>
          {PRIMARY_PATHS.map((p) => (
            <a key={p.key} href={PATH_URLS[p.key]} style={linkStyle(activePath === p.key)} onClick={() => setMobileOpen(false)}>
              {p.title}
            </a>
          ))}
          <a href="#pricing" style={linkStyle(false)} onClick={() => setMobileOpen(false)}>Pricing</a>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <GhostButton onClick={onLogin}>Sign in</GhostButton>
            <PrimaryButton onClick={onGetStarted}>Get started</PrimaryButton>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .mnav-links, .mnav-actions { display: none !important; }
          .mnav-toggle { display: flex !important; align-items: center; justify-content: center; }
        }
      `}</style>
    </nav>
  )
}
