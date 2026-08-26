/**
 * PathNav.jsx — Sticky top path-aware navigation tab bar
 * Sits directly below the slim header (top: 52px).
 * Each path gets its own 5-item set with accent colour.
 *
 * Props:
 *   path       — "student" | "professional" | "authority" | "institution"
 *   activeItem — nav item id (controlled by App)
 *   onNavigate — (id, page, tab?) => void
 */

// ─── Nav definitions ─────────────────────────────────────────────
const NAV = {
  student: [
    { id: "home",        label: "Home",         page: "studentHome", icon: HomeIcon        },
    { id: "arena",       label: "Arena",        page: "arenaCollegeStream", icon: ArenaIcon },
    { id: "pulse",       label: "Pulse",        page: "pulse",       icon: PulseIcon       },
    { id: "skillstudio", label: "Skill Studio", page: "skillstudio", icon: SkillStudioIcon },
    { id: "arena",       label: "Arena",        page: "arenaCollegeStream", icon: ArenaIcon },
    { id: "launchpad",   label: "Launchpad",    page: "launchpad",   icon: LaunchIcon      },
    { id: "aura",        label: "Aura",         page: "aura",        icon: AuraIcon        },
  ],
  // Career OS Workstream 0 nav (docs/career-os-implementation-plan.md §A).
  // Not currently rendered (App.jsx hides PathNav for navPath==="professional"
  // — PROFESSIONAL_HEADER_NAV in App.jsx is the real, flag-aware nav) but kept
  // in sync in case the bottom bar is ever re-enabled. Career and Skills are
  // back as standalone top-level destinations as of the Career OS redesign —
  // this list does not itself read the career_os_nav/career_os_company flags
  // since it's dead code today; if this bar is ever re-enabled, wire it to
  // FLAGS the same way App.jsx's PROFESSIONAL_HEADER_NAV does first.
  professional: [
    { id: "home",       label: "Home",      page: "professionalHome", icon: HomeIcon      },
    { id: "orbit",      label: "Career",    page: "orbit",      icon: LaunchIcon    },
    { id: "skills",     label: "Skills",    page: "skills",     icon: SkillStudioIcon },
    { id: "launchpad",  label: "Launchpad", page: "launchpad",  icon: LaunchIcon    },
    { id: "pulse",      label: "Pulse",     page: "pulse",      icon: PulseIcon     },
    { id: "nexus",      label: "Connect",   page: "nexus",      icon: CommunityIcon },
    { id: "aura",       label: "Profile",   page: "aura",       icon: AuraIcon      },
  ],
  // Sprint 5 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14 / EXECUTIVE_PATH_INFORMATION_ARCHITECTURE.md.
  // This is the real bottom tab bar (BottomNav.jsx is dead code, never imported —
  // App.jsx renders <PathNav> instead). Carries the 5 highest-frequency actions;
  // the full 10-module IA lives in AUTHORITY_HEADER_NAV at the top of App.jsx.
  authority: [
    { id: "home",     label: "Home",     page: "executiveHome",    icon: HomeIcon    },
    { id: "startup",  label: "Startup",  page: "startupworkspace", icon: StartupIcon },
    { id: "funding",  label: "Funding",  page: "funding",          icon: FundingIcon },
    { id: "network",  label: "Network",  page: "execnetwork",      icon: NetworkIcon },
    { id: "profile",  label: "Profile",  page: "authority",        icon: AuraIcon    },
  ],
  institution: [
    { id: "home",     label: "Home",         page: "orgHome",     icon: HomeIcon    },
    { id: "intel",    label: "Intelligence", page: "orgIntel",    icon: IntelIcon   },
    { id: "tasks",    label: "Tasks",        page: "orgTasks",    icon: TasksIcon   },
    { id: "people",   label: "People",       page: "orgPeople",   icon: PeopleIcon  },
    { id: "settings", label: "Settings",     page: "orgSettings", icon: SettingsIcon},
  ],
}

const ACCENT = {
  student:      "#FF5701",
  professional: "#6D28D9",
  authority:    "#C9A84C",
  institution:  "#0F766E",
}

// ─── Icons ───────────────────────────────────────────────────────
function HomeIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? color : "none"} stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><polyline points="9,21 9,12 15,12 15,21"/></svg>
}
function ForgeIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
}
function PulseIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
}
function AuraIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function OrbitIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)"/></svg>
}
function LaunchIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
}
function SkillStudioIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
}
// Arena rebuild 2026-08-16 — re-added (old ArenaIcon removed with the rest
// of Arena, this is a fresh icon for the rebuilt feature).
function ArenaIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
}
function CommunityIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function TimeIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
}
function SignalIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
}
function NetworkIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/></svg>
}
function StartupIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
}
function FundingIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
}
function IntelIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function TasksIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
}
function PeopleIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function SettingsIcon({ active, color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? color : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}

// ─── Component ───────────────────────────────────────────────────
export default function PathNav({ path = "student", activeItem, onNavigate }) {
  const items  = NAV[path]  || NAV.student
  const accent = ACCENT[path] || ACCENT.student

  return (
    <nav style={{
      position: "sticky",
      top: 52,               // sits flush below the 52px slim header
      zIndex: 89,
      background: "#fff",
      borderBottom: "1px solid #E8E3DA",
      display: "flex",
      alignItems: "stretch",
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      {items.map(item => {
        const active = activeItem === item.id
        const Icon   = item.icon
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id, item.page, item.tab)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "10px 4px 8px",
              background: "none",
              border: "none",
              borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
              borderTop: "2px solid transparent",
              cursor: "pointer",
              position: "relative",
              transition: "border-color 0.15s",
              minWidth: 0,
            }}
          >
            <Icon active={active} color={accent} />
            <span style={{
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              color: active ? accent : "#A8A29E",
              letterSpacing: "0.01em",
              fontFamily: "DM Sans, sans-serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
              padding: "0 2px",
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
