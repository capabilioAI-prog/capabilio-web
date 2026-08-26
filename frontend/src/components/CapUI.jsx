/**
 * CAPABILIO — SHARED COMPONENT LIBRARY (Agentic Design System)
 * src/components/CapUI.jsx
 *
 * Parchment surfaces, DM Sans headings, #FF5701 orange primary.
 * All inner app pages use these — consistent with landing page.
 */

import { useState, useEffect, useRef } from "react"

// ─── LAYOUT WRAPPERS ─────────────────────────────────────────────────────────

/** Root page shell — white/cream background, correct top offset */
export function PageShell({ children, aura = false }) {
  return (
    <div style={{
      background: "var(--cap-bg-page)",
      minHeight: "100vh",
      paddingTop: aura ? 108 : 64,
      fontFamily: "var(--cap-font-body)",
      color: "var(--cap-text-primary)",
    }}>
      {children}
    </div>
  )
}

/** Centered content container — matches landing page max-width/padding */
export function PageInner({ children, style }) {
  return (
    <div style={{
      maxWidth: "var(--cap-page-max)",
      margin: "0 auto",
      padding: "40px var(--cap-page-pad)",
      ...style,
    }}>
      {children}
    </div>
  )
}

/** Cream background section (matches hero/CTA bg) */
export function SectionCream({ children, style, id }) {
  return (
    <section id={id} className="cap-section cap-section-cream" style={style}>
      <div className="cap-container">{children}</div>
    </section>
  )
}

/** White background section */
export function SectionWhite({ children, style, id }) {
  return (
    <section id={id} className="cap-section cap-section-white" style={style}>
      <div className="cap-container">{children}</div>
    </section>
  )
}

/** Dark section — ONLY for feature showcases */
export function SectionDark({ children, style, id }) {
  return (
    <section id={id} className="cap-section cap-section-dark" style={style}>
      <div className="cap-container">{children}</div>
    </section>
  )
}

export function Divider() {
  return <div className="cap-divider" />
}

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────

export function Overline({ children, style }) {
  return <p className="cap-overline" style={{ marginBottom: 14, ...style }}>{children}</p>
}

export function SectionHeader({ overline, title, body, center = false, style }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", maxWidth: center ? 640 : "none", margin: center ? "0 auto 40px" : "0 0 40px", ...style }}>
      {overline && <Overline>{overline}</Overline>}
      <h2 className="cap-h2" style={{ marginBottom: 14 }} dangerouslySetInnerHTML={{ __html: title }} />
      {body && <p className="cap-body-lg" style={{ margin: center ? "0 auto" : 0 }}>{body}</p>}
    </div>
  )
}

export function EyebrowBadge({ children }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--cap-bg-surface)", border: "1px solid var(--cap-border)", borderRadius: "var(--cap-radius-pill)", padding: "5px 14px", marginBottom: 28 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cap-primary)" }} />
      <span style={{ fontSize: 12, color: "var(--cap-text-muted)", fontWeight: 500, letterSpacing: "0.5px" }}>{children}</span>
    </div>
  )
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

/** Landing page nav */
export function NavBar({ onLogin, onGetStarted }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", fn)
    return () => window.removeEventListener("scroll", fn)
  }, [])
  const scrollTo = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth" }) }

  return (
    <nav style={{ background: "var(--cap-bg-surface)", borderBottom: `1px solid ${scrolled ? "var(--cap-border)" : "transparent"}`, height: 64, display: "flex", alignItems: "center", padding: "0 var(--cap-page-pad)", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <span style={{ fontFamily: "var(--cap-font-display)", fontSize: 22, fontWeight: 700, color: "var(--cap-text-primary)", letterSpacing: "-0.5px" }}>Capabilio</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ label: "How it works", id: "how-it-works" }, { label: "Portfolio", id: "portfolio-section" }, { label: "Executive", id: "executive-section" }, { label: "Pricing", id: "pricing-section" }].map(l => (
            <span key={l.id} className="cap-nav-link" onClick={() => scrollTo(l.id)}>{l.label}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="cap-btn cap-btn-ghost" onClick={onLogin}>Log in</button>
        <button className="cap-btn cap-btn-primary" style={{ padding: "10px 22px", fontSize: 14 }} onClick={onGetStarted}>Get started</button>
      </div>
    </nav>
  )
}

/** App nav (post-login) — white, matches landing */
export function AppNavBar({ user, currentPage, onNavigate, onTabChange, onSignOut, userData, pageVisibility = {} }) {
  const isExecutive = userData?.path === "authority" || userData?.path === "institution" ||
    userData?.accountType === "authority" || userData?.accountType === "institution"

  const ALL_PAGES = [
    { id: "aura",        label: "Aura",        icon: "✦", hideForExec: false },
    { id: "arenaCollegeStream", label: "Arena", icon: "⚔", hideForExec: true  },
    { id: "pulse",       label: "Pulse",        icon: "📡", hideForExec: true  },
    { id: "skillstudio", label: "Skill Studio", icon: "🎓", hideForExec: true  },
    { id: "launchpad",   label: isExecutive ? "Intel Hub" : "Launchpad", icon: isExecutive ? "◈" : "🚀", hideForExec: false },
  ]

  const PAGES = ALL_PAGES.filter(p => {
    if (isExecutive && p.hideForExec) return false
    if (pageVisibility[p.id] === false) return false
    return true
  })

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || "U"
  const avatarUrl = userData?.profilePhotoURL || null
  const keyword = userData?.keyword || ""

  // Executive title badge
  const execTitles = ["Founder","Co-Founder","CEO","Director","VP","CTO","CMO","CFO","COO","Managing Director","Board Member","Advisor","Mentor","Speaker","Partner"]
  const execLabel = execTitles.find(t => keyword.toLowerCase().includes(t.toLowerCase())) || keyword || "Executive"

  return (
    <nav style={{ background: "#FFFFFF", borderBottom: "1px solid rgba(17,24,39,0.08)", height: 64, display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 12px rgba(17,24,39,0.05)" }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>
          Capabilio <span style={{ color: "#FF5701", fontStyle: "italic" }}>AI</span>
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {PAGES.map(p => {
            const active = currentPage === p.id
            return (
              <button key={p.id}
                onClick={() => { onNavigate(p.id); if (onTabChange && p.id === "aura") onTabChange("dashboard") }}
                style={{ padding: "6px 14px", borderRadius: 10, background: "transparent", border: "none", borderBottom: active ? "2px solid #FF5701" : "2px solid transparent", color: active ? "#FF5701" : "#6B6560", fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6, paddingBottom: 4 }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#FFFFFF" }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#6B6560" }}}
              >
                <span style={{ fontSize: 13 }}>{p.icon}</span>{p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* ELO badge — standard users only */}
        {!isExecutive && userData?.eloRating ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#FFF1E8", border: "1px solid rgba(255,87,1,0.18)", borderRadius: 100 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: "#FF5701" }}>ELO {userData.eloRating.toLocaleString()}</span>
          </div>
        ) : null}
        {/* Avatar + Username */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", border: isExecutive ? "2px solid rgba(201,168,76,0.5)" : "2px solid rgba(255,87,1,0.22)", flexShrink: 0, background: isExecutive ? "#1a1a2e" : "#FFF1E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: isExecutive ? "#C9A84C" : "#FF5701" }}>{initial}</span>
            }
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.displayName || userData?.name || "User"}
          </span>
        </div>
        <button style={{ padding: "7px 16px", background: "#FFFFFF", border: "1px solid rgba(17,24,39,0.12)", borderRadius: 10, color: "#3D3935", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,87,1,0.22)"; e.currentTarget.style.color = "#FF5701" }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(17,24,39,0.12)"; e.currentTarget.style.color = "#3D3935" }}
          onClick={onSignOut}
        >Sign out</button>
      </div>
    </nav>
  )
}

/** Aura sub-tab bar */
export function AuraTabBar({ activeTab, onTabChange, vaultFiles = [] }) {
  const TABS = [
    { id: "dashboard",   label: "Dashboard",    icon: "▦" },
    { id: "voucher",     label: "Skill Voucher", icon: "🎫" },
    { id: "skillgraph",  label: "Skills",       icon: "↗" },
    { id: "interview",   label: "AI Interview", icon: "□" },
    { id: "vault",       label: "Vault",        icon: "◫" },
    { id: "skillgap",    label: "Skill Gaps",   icon: "⚡" },
    { id: "resilience",  label: "Resilience",   icon: "💪" },
    { id: "fingerprint", label: "Code DNA",     icon: "🧬" },
    { id: "settings",    label: "Settings",     icon: "⚙️" },
  ]
  return (
    <div style={{ background: "#FFFFFF", borderBottom: "1px solid rgba(17,24,39,0.08)", padding: "0 28px", display: "flex", alignItems: "center", position: "sticky", top: 64, zIndex: 99, overflowX: "auto", boxShadow: "0 1px 8px rgba(17,24,39,0.04)" }}>
      <div style={{ marginRight: 20, paddingRight: 20, paddingTop: 8, paddingBottom: 8, borderRight: "1px solid var(--cap-border)", flexShrink: 0 }}>
        <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>Aura</div>
        <div style={{ fontSize: 10, color: "#A8A29E" }}>Career profile</div>
      </div>
      {TABS.map(tab => {
        const active = activeTab === tab.id
        return (
          <button key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "10px 12px", border: "none", borderBottom: active ? "2px solid var(--cap-primary)" : "2px solid transparent", borderTop: "2px solid transparent", cursor: "pointer", fontFamily: "var(--cap-font-body)", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#FF5701" : "#6B6560", background: "transparent", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--cap-text-primary)" }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--cap-text-muted)" }}
          >
            <span style={{ fontSize: 12 }}>{tab.icon}</span>
            {tab.label}
            {tab.id === "vault" && vaultFiles.length > 0 && (
              <span style={{ background: "var(--cap-primary)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 100 }}>{vaultFiles.length}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── BUTTONS ─────────────────────────────────────────────────────────────────

export function Btn({ children, variant = "primary", size = "md", onClick, disabled, loading, style, className }) {
  const variants = {
    primary:   { background: "var(--cap-primary)", color: "#fff", border: "none", fontFamily: "var(--cap-font-display)", fontWeight: 700 },
    secondary: { background: "var(--cap-bg-surface)", color: "var(--cap-text-primary)", border: "1.5px solid var(--cap-border)" },
    ghost:     { background: "transparent", color: "var(--cap-text-muted)", border: "none" },
    danger:    { background: "#DC2626", color: "#fff", border: "none" },
    success:   { background: "#16A34A", color: "#fff", border: "none" },
  }
  const sizes = {
    sm: { padding: "7px 14px", fontSize: 13 },
    md: { padding: "11px 24px", fontSize: 14 },
    lg: { padding: "14px 32px", fontSize: 16 },
  }
  const v = variants[variant] || variants.primary
  const s = sizes[size] || sizes.md

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: "var(--cap-radius-md)", cursor: disabled || loading ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", whiteSpace: "nowrap", fontFamily: "var(--cap-font-body)", fontWeight: 500, ...v, ...s, ...style }}
    >
      {loading ? (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "capSpin 0.7s linear infinite", display: "inline-block" }} />
          Please wait…
        </span>
      ) : children}
    </button>
  )
}

// ─── BADGES / TAGS ────────────────────────────────────────────────────────────

export function Badge({ children, color = "orange", style }) {
  const colors = {
    orange: "cap-tag-orange",
    gray:   "cap-tag-gray",
    green:  "cap-tag-green",
    amber:  "cap-tag-amber",
    red:    "cap-tag-red",
    dark:   "cap-tag-dark",
  }
  return <span className={`cap-tag ${colors[color] || "cap-tag-gray"}`} style={style}>{children}</span>
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────

export function MetricCard({ label, value, color, style }) {
  return (
    <div className="cap-metric" style={style}>
      <div className="cap-metric-val" style={color ? { color } : {}}>{value}</div>
      <div className="cap-metric-lbl">{label}</div>
    </div>
  )
}

// ─── FEATURE CARD (light version for app pages) ───────────────────────────────

export function FeatureCard({ icon, title, desc, onClick, style, dark = false }) {
  const [hovered, setHovered] = useState(false)
  if (dark) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
        style={{ background: "var(--cap-dark-card)", border: `1px solid ${hovered ? "var(--cap-primary)" : "var(--cap-dark-border)"}`, borderRadius: "var(--cap-radius-lg)", padding: 24, cursor: onClick ? "pointer" : "default", transition: "border-color 0.15s", ...style }}
      >
        <div style={{ width: 38, height: 38, background: "rgba(255,87,1,0.12)", border: "1px solid rgba(255,87,1,0.25)", borderRadius: "var(--cap-radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginBottom: 14 }}>{icon}</div>
        <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 15, fontWeight: 700, color: "#FAF7F2", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#6B6560", lineHeight: 1.6 }}>{desc}</div>
      </div>
    )
  }
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ background: "var(--cap-bg-surface)", border: `1.5px solid ${hovered ? "var(--cap-primary)" : "var(--cap-border)"}`, borderRadius: "var(--cap-radius-lg)", padding: 24, cursor: onClick ? "pointer" : "default", transition: "all 0.15s", boxShadow: hovered ? "0 0 0 3px rgba(255,87,1,0.08)" : "none", ...style }}
    >
      <div style={{ width: 40, height: 40, background: "var(--cap-primary-bg)", border: "1px solid var(--cap-primary-border)", borderRadius: "var(--cap-radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 15, fontWeight: 700, color: "var(--cap-text-primary)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--cap-text-muted)", lineHeight: 1.65 }}>{desc}</div>
    </div>
  )
}

// ─── SKILL BAR ────────────────────────────────────────────────────────────────

export function SkillBar({ label, value, color }) {
  const c = color || "var(--cap-primary)"
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "var(--cap-text-muted)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "var(--cap-font-mono)", fontSize: 12, color: c, fontWeight: 700 }}>{value}%</span>
      </div>
      <div className="cap-skill-track">
        <div style={{ height: "100%", width: `${value}%`, background: c, borderRadius: 2, transition: "width 0.8s ease" }} />
      </div>
    </div>
  )
}

// ─── AURA PANEL (hero preview) ────────────────────────────────────────────────

export function AuraPanel({ name, role, eloRating = 0, stats = [], skills = [], style }) {
  return (
    <div style={{ background: "var(--cap-bg-surface)", border: "1px solid var(--cap-border)", borderRadius: "var(--cap-radius-xl)", padding: 24, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--cap-border-light)" }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--cap-text-hint)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Aura Dashboard</div>
          <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 16, fontWeight: 700, color: "var(--cap-text-primary)" }}>{name || "Your Profile"}</div>
          <div style={{ fontSize: 12, color: "var(--cap-text-muted)", marginTop: 2 }}>{role}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 40, fontWeight: 800, color: "var(--cap-primary)", lineHeight: 1 }}>{eloRating.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: "var(--cap-text-hint)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>ELO Rating</div>
        </div>
      </div>
      {stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 8, marginBottom: 20 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: "var(--cap-bg-raised)", border: "1px solid var(--cap-border-light)", borderRadius: "var(--cap-radius-md)", padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--cap-font-mono)", fontSize: 16, fontWeight: 700, color: s.color || "var(--cap-text-primary)" }}>{s.value}</div>
              <div style={{ fontSize: 9, color: "var(--cap-text-hint)", textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {skills.map((sk, i) => <SkillBar key={i} label={sk.label} value={sk.value} color={sk.color} />)}
    </div>
  )
}

// ─── PATH CARD ────────────────────────────────────────────────────────────────

export function PathCard({ icon, title, desc, badge, badgeColor = "orange", featured, onClick }) {
  const [hovered, setHovered] = useState(false)
  const isActive = featured || hovered
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ background: "var(--cap-bg-surface)", border: `${isActive ? "1.5px" : "1.5px"} solid ${isActive ? "var(--cap-primary)" : "var(--cap-border)"}`, borderRadius: "var(--cap-radius-lg)", padding: 24, cursor: "pointer", transition: "all 0.15s", boxShadow: isActive ? "0 0 0 3px rgba(255,87,1,0.08)" : "none", position: "relative" }}
    >
      {featured && (
        <div style={{ position: "absolute", top: -1, right: 14, background: "var(--cap-primary)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: "0 0 var(--cap-radius-sm) var(--cap-radius-sm)", letterSpacing: "0.5px" }}>Most popular</div>
      )}
      <div style={{ width: 42, height: 42, background: "var(--cap-primary-bg)", border: "1px solid var(--cap-primary-border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 17, fontWeight: 700, color: "var(--cap-text-primary)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--cap-text-muted)", lineHeight: 1.6, marginBottom: 12 }}>{desc}</div>
      <Badge color={badgeColor}>{badge}</Badge>
    </div>
  )
}

// ─── VERSUS TABLE ─────────────────────────────────────────────────────────────

export function VersusTable({ rows = [] }) {
  return (
    <div className="cap-versus">
      <div className="cap-versus-hdr">
        <div className="cap-versus-hdr-cell left">Resume says</div>
        <div className="cap-versus-hdr-cell right">ELO says</div>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="cap-versus-row">
          <div className="cap-versus-cell old">{row.old}</div>
          <div className="cap-versus-cell new">{row.new}</div>
        </div>
      ))}
    </div>
  )
}

// ─── ELO TIER CHIP ────────────────────────────────────────────────────────────

export function EloTierChip({ label, active }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: "var(--cap-radius-pill)", border: `1.5px solid ${active ? "var(--cap-primary)" : "var(--cap-border)"}`, background: active ? "var(--cap-primary-bg)" : "transparent", color: active ? "var(--cap-primary)" : "var(--cap-text-hint)", fontFamily: "var(--cap-font-mono)" }}>
      {label}
    </span>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

export function EmptyState({ icon = "📊", title, desc, action }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 18, fontWeight: 700, color: "var(--cap-text-primary)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--cap-text-muted)", marginBottom: action ? 24 : 0, lineHeight: 1.6 }}>{desc}</div>
      {action}
    </div>
  )
}

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────

export function LoadingSpinner({ text = "Loading…" }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0", color: "var(--cap-primary)", gap: 10, fontSize: 14 }}>
      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,87,1,0.2)", borderTopColor: "var(--cap-primary)", borderRadius: "50%", animation: "capSpin 0.8s linear infinite" }} />
      {text}
    </div>
  )
}

// ─── PAGE LOADER ──────────────────────────────────────────────────────────────

export function PageLoader() {
  return (
    <div style={{ background: "var(--cap-bg-page)", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <span style={{ fontFamily: "var(--cap-font-display)", fontSize: 28, fontWeight: 800, color: "var(--cap-text-primary)", letterSpacing: "-0.5px" }}>Capabilio</span>
      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,87,1,0.2)", borderTopColor: "var(--cap-primary)", borderRadius: "50%", animation: "capSpin 0.8s linear infinite" }} />
    </div>
  )
}

// ─── ERROR CARD ───────────────────────────────────────────────────────────────

export function ErrorCard({ message, onRetry }) {
  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--cap-radius-lg)", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{message}</div>
      {onRetry && <button onClick={onRetry} style={{ padding: "7px 18px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "var(--cap-radius-md)", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--cap-font-body)" }}>Try again</button>}
    </div>
  )
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer style={{ background: "var(--cap-dark)", borderTop: "1px solid #1F2937", padding: "24px var(--cap-page-pad)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--cap-font-display)", fontSize: 16, color: "#FAF7F2", fontWeight: 700 }}>Capabilio</span>
        <span style={{ fontSize: 12, color: "#6B6560" }}>· Amravati, Andhra Pradesh ❤️ from India</span>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {["Privacy", "Terms", "careers@capabilioai.com"].map(l => (
          <span key={l} style={{ fontSize: 12, color: "#6B6560", cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#A8A29E"}
            onMouseLeave={e => e.currentTarget.style.color = "#6B6560"}
          >{l}</span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#3D3935" }}>© 2026 Capabilio</div>
    </footer>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ─── ANIMATED COMPONENTS (Design System v2) ──────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ─── Animated FeatureCard ────────────────────────────────────────────────────
export function AnimatedFeatureCard({ icon, title, desc, onClick, style, color = "#FF5701", delay = 0 }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: "#FFFFFF",
        border: `1.5px solid ${hovered ? color : "rgba(17,24,39,0.08)"}`,
        borderRadius: 20,
        padding: 24,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.09)` : "0 2px 12px rgba(0,0,0,0.04)",
        animation: `capFadeUp 0.5s cubic-bezier(0,0,0.2,1) ${delay}ms both`,
        ...style,
      }}
    >
      <div style={{
        width: 44, height: 44,
        background: `${color}12`,
        border: `1px solid ${color}22`,
        borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, marginBottom: 14,
        transition: "background 0.2s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "scale(1.1) rotate(-4deg)" : "scale(1)",
      }}>{icon}</div>
      <div style={{ fontFamily: "var(--cap-font-display)", fontSize: 15, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#6B6560", lineHeight: 1.65 }}>{desc}</div>
    </div>
  )
}

// ─── Animated Progress Bar ────────────────────────────────────────────────────
export function AnimatedProgressBar({ value, color = "#FF5701", label, showValue = true, height = 8 }) {
  const ref     = useRef(null)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect() } }, { threshold: 0.4 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ marginBottom: 12 }}>
      {(label || showValue) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          {label && <span style={{ fontSize: 13, color: "#3D3935", fontWeight: 500 }}>{label}</span>}
          {showValue && <span style={{ fontSize: 12, color, fontWeight: 800, fontFamily: "var(--cap-font-mono)" }}>{value}%</span>}
        </div>
      )}
      <div style={{ height, borderRadius: 999, background: "#E8E3DA", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: started ? `${value}%` : "0%",
          borderRadius: 999,
          background: color,
          transition: "width 1s cubic-bezier(0,0,0.2,1)",
          boxShadow: `0 0 8px ${color}40`,
        }} />
      </div>
    </div>
  )
}

// ─── Animated Metric Card ─────────────────────────────────────────────────────
export function AnimatedMetricCard({ label, value, icon, color = "#FF5701", sub, delay = 0, style }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E8E3DA",
      borderRadius: 16, padding: "18px 14px",
      textAlign: "center",
      boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
      animation: `capFadeUp 0.5s cubic-bezier(0,0,0.2,1) ${delay}ms both`,
      transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease",
      ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.09)" }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 8px rgba(0,0,0,0.04)" }}
    >
      {icon && <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>}
      <div style={{ fontFamily: "var(--cap-font-mono)", fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#A8A29E", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#6B6560", marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────
export function ShimmerSkeleton({ width = "100%", height = 16, style }) {
  return (
    <div style={{
      width, height, borderRadius: 10,
      background: "linear-gradient(90deg, #f0ede8 25%, #e8e4de 37%, #f0ede8 63%)",
      backgroundSize: "1200px 100%",
      animation: "capShimmer 1.4s ease-in-out infinite",
      ...style,
    }} />
  )
}

// ─── Toast notification ───────────────────────────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const colors = { success: "#16A34A", error: "#DC2626", info: "#1D4ED8", warn: "#D97706" }
  const icons  = { success: "✓", error: "✕", info: "ℹ", warn: "⚠" }
  const color  = colors[type] || colors.info

  useEffect(() => {
    const t = setTimeout(() => onClose?.(), 3500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 10,
      background: "#FFFFFF", border: `1px solid ${color}30`,
      borderRadius: 14, padding: "12px 18px",
      boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px ${color}15`,
      fontFamily: "var(--cap-font-body)", fontSize: 13, color: "#3D3935", fontWeight: 500,
      animation: "capToastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
      whiteSpace: "nowrap", maxWidth: "90vw",
    }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color, fontWeight: 800, flexShrink: 0 }}>{icons[type]}</div>
      <span>{message}</span>
      <button onClick={onClose} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#A8A29E", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
      <style>{`
        @keyframes capToastIn {
          from { opacity:0; transform:translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes capShimmer {
          0%{background-position:-600px 0} 100%{background-position:600px 0}
        }
        @keyframes capFadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ─── Animated Skill Bar ───────────────────────────────────────────────────────
export function AnimatedSkillBar({ label, value, color = "#FF5701", delay = 0 }) {
  const ref     = useRef(null)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect() } }, { threshold: 0.4 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#3D3935", fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "var(--cap-font-mono)", fontSize: 12, color, fontWeight: 800 }}>{value}%</span>
      </div>
      <div style={{ height: 7, background: "#F3F4F6", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: started ? `${value}%` : "0%",
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 8px ${color}35`,
          transition: `width 1.1s cubic-bezier(0,0,0.2,1) ${delay}ms`,
        }} />
      </div>
    </div>
  )
}

// ─── Enhanced PageLoader ──────────────────────────────────────────────────────
export function AnimatedPageLoader() {
  return (
    <div style={{ background: "var(--cap-bg-page)", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <div style={{ position: "relative", width: 60, height: 60 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg, #FF5701, #FF8C42)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--cap-font-display)", fontSize: 24, fontWeight: 800, color: "#fff", boxShadow: "0 8px 24px rgba(255,87,1,0.35)", animation: "capLogoPulse 2s ease-in-out infinite" }}>C</div>
      </div>
      <span style={{ fontFamily: "var(--cap-font-display)", fontSize: 26, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px" }}>Capabilio</span>
      <div style={{ width: 32, height: 3, background: "#E8E3DA", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "#FF5701", borderRadius: 999, animation: "capLoadBar 1.5s ease-in-out infinite" }} />
      </div>
      <style>{`
        @keyframes capLogoPulse {
          0%,100%{box-shadow:0 8px 24px rgba(255,87,1,0.35)}
          50%{box-shadow:0 8px 40px rgba(255,87,1,0.6)}
        }
        @keyframes capLoadBar {
          0%{width:0%;margin-left:0}
          50%{width:100%;margin-left:0}
          100%{width:0%;margin-left:100%}
        }
        @keyframes capSpin {
          from{transform:rotate(0deg)}
          to{transform:rotate(360deg)}
        }
      `}</style>
    </div>
  )
}