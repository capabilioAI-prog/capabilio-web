/**
 * CAPABILIO — BottomNav.jsx (Animated Redesign)
 * Spring-physics active states, ripple on tap, animated icon scale, smooth indicator pill
 */

import { useState, useCallback } from "react"

const NAV_BY_PATH = {
  student: [
    { id: "home",      label: "Home",      page: "studentHome",      icon: HomeIcon      },
    { id: "arena",     label: "Arena",     page: "arenaCollegeStream", icon: ArenaIcon   },
    { id: "pulse",     label: "Pulse",     page: "pulse",            icon: PulseIcon     },
    { id: "aura",      label: "Aura",      page: "aura",             icon: AuraIcon      },
    { id: "community", label: "Community", page: "nexus",            icon: CommunityIcon },
  ],
  professional: [
    { id: "home",      label: "Home",      page: "professionalHome", icon: HomeIcon      },
    { id: "forge",     label: "Forge",     page: "forge",            icon: ForgeIcon     },
    { id: "pulse",     label: "Pulse",     page: "pulse",            icon: PulseIcon     },
    { id: "orbit",     label: "Orbit",     page: "orbit",            icon: OrbitIcon     },
    { id: "community", label: "Community", page: "nexus",            icon: CommunityIcon },
  ],
  // Sprint 5 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14 / EXECUTIVE_PATH_INFORMATION_ARCHITECTURE.md:
  // bottom nav only fits ~5 thumb-reach items, so it carries the 5 highest-frequency
  // actions. The full 10-item Founder OS IA (Home/Startup/Funding/Growth/Network/
  // Communities/Events/Marketplace/Analytics/AI Copilot) lives in the scrollable
  // AUTHORITY_HEADER_NAV at the top of the screen (App.jsx) — same split already
  // used for the student path (STUDENT_HEADER_NAV top + a different BottomNav set).
  authority: [
    { id: "home",     label: "Home",     page: "executiveHome",   icon: HomeIcon     },
    { id: "startup",  label: "Startup",  page: "startupworkspace", icon: StartupIcon },
    { id: "funding",  label: "Funding",  page: "funding",          icon: FundingIcon },
    { id: "network",  label: "Network",  page: "execnetwork",      icon: NetworkIcon },
    { id: "copilot",  label: "Copilot",  page: "aicopilot",        icon: CopilotIcon },
  ],
  institution: [
    { id: "home",     label: "Home",         page: "orgHome",     icon: HomeIcon    },
    { id: "intel",    label: "Intelligence", page: "orgIntel",    icon: IntelIcon   },
    { id: "tasks",    label: "Tasks",        page: "orgTasks",    icon: TasksIcon   },
    { id: "people",   label: "People",       page: "orgPeople",   icon: PeopleIcon  },
    { id: "settings", label: "Settings",     page: "orgSettings", icon: SettingsIcon},
  ],
}

const PATH_COLOR = {
  student:      "#FF5701",
  professional: "#4F46E5",
  authority:    "#2563EB",
  institution:  "#0891B2",
}

function HomeIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : "none"} stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <polyline points="9,21 9,12 15,12 15,21"/>
    </svg>
  )
}
function ArenaIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
    </svg>
  )
}
function ForgeIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}
function PulseIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  )
}
function AuraIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function CommunityIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}
function OrbitIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)"/>
    </svg>
  )
}
function TimeIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12,6 12,12 16,14"/>
    </svg>
  )
}
function SignalIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  )
}
function NetworkIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5"  r="2"/>
      <circle cx="5"  cy="19" r="2"/>
      <circle cx="19" cy="19" r="2"/>
      <line x1="12" y1="7" x2="5"  y2="17"/>
      <line x1="12" y1="7" x2="19" y2="17"/>
    </svg>
  )
}
function StartupIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/>
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  )
}
function FundingIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
}
function CopilotIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : "none"} stroke={active ? color : "#A8A29E"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"/>
      <path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15z"/>
    </svg>
  )
}
function IntelIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
    </svg>
  )
}
function TasksIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,11 12,14 22,4"/>
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  )
}
function PeopleIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}
function SettingsIcon({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}

// ── Ripple hook ────────────────────────────────────────────────────────────
function useRipple() {
  const [ripples, setRipples] = useState([])
  const addRipple = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id   = Date.now()
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600)
  }, [])
  return [ripples, addRipple]
}

// ── Single nav item ────────────────────────────────────────────────────────
function NavItem({ item, active, accent, onNavigate }) {
  const [pressed, setPressed] = useState(false)
  const [ripples, addRipple]  = useRipple()
  const Icon = item.icon

  const handleClick = (e) => {
    addRipple(e)
    setPressed(true)
    setTimeout(() => setPressed(false), 280)
    onNavigate(item.id, item.page, item.tab)
  }

  return (
    <button onClick={handleClick} style={{
      flex: 1,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 3, background: "none", border: "none",
      cursor: "pointer", padding: "6px 4px",
      position: "relative", overflow: "hidden",
      WebkitTapHighlightColor: "transparent",
    }}>
      {/* Ripples */}
      {ripples.map(rp => (
        <span key={rp.id} style={{
          position: "absolute",
          left: rp.x - 20, top: rp.y - 20,
          width: 40, height: 40, borderRadius: "50%",
          background: active ? `${accent}28` : "rgba(26,23,20,0.06)",
          animation: "bnRipple 0.55s linear forwards",
          pointerEvents: "none",
        }} />
      ))}

      {/* Top indicator pill */}
      <div style={{
        position: "absolute", top: 0, left: "50%",
        transform: `translateX(-50%) scaleX(${active ? 1 : 0})`,
        width: 28, height: 3,
        borderRadius: "0 0 4px 4px",
        background: accent,
        transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)",
      }} />

      {/* Icon */}
      <div style={{
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: pressed
          ? "scale(0.82) translateY(2px)"
          : active
            ? "scale(1.14) translateY(-2px)"
            : "scale(1)",
        transition: pressed
          ? "transform 0.1s ease"
          : "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {active && (
          <div style={{
            position: "absolute", inset: -7,
            borderRadius: "50%",
            background: `${accent}12`,
            animation: "bnGlowPulse 2.2s ease-in-out infinite",
          }} />
        )}
        <Icon active={active} color={accent} />
      </div>

      {/* Label */}
      <span style={{
        fontSize: 10,
        fontWeight: active ? 700 : 500,
        color: active ? accent : "#A8A29E",
        letterSpacing: "0.02em",
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "nowrap",
        transition: "all 0.22s ease",
        transform: active ? "scale(1.06)" : "scale(1)",
        display: "inline-block",
      }}>{item.label}</span>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BottomNav({ path = "student", activeItem, onNavigate }) {
  const items  = NAV_BY_PATH[path] || NAV_BY_PATH.student
  const accent = PATH_COLOR[path]  || PATH_COLOR.student

  return (
    <>
      <style>{`
        @keyframes bnRipple {
          from { transform: scale(0); opacity: 0.7; }
          to   { transform: scale(4); opacity: 0; }
        }
        @keyframes bnGlowPulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(1.4); opacity: 0.4; }
        }
        @keyframes bnSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .cap-bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: rgba(250,247,242,0.97);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid #E8E3DA;
          display: flex; align-items: stretch;
          height: 64px;
          box-shadow: 0 -4px 32px rgba(26,23,20,0.07);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          animation: bnSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
        }
      `}</style>

      <div style={{ height: 72 }} />

      <nav className="cap-bottom-nav">
        {items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            active={activeItem === item.id}
            accent={accent}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  )
}
