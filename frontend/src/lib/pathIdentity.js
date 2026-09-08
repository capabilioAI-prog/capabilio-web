/**
 * pathIdentity.js — per-path accent colors for the four signup paths.
 *
 * Deliberate, approved exception to DESIGN.md rule 9's "one accent only"
 * rule (amended 2026-08-18) — these four colors are the ONLY place on the
 * site where per-path color-coding is used, and it's identity/orientation
 * (confirming "did I pick the right path" before a signup form), not
 * decoration. Every other surface stays single-accent.
 *
 * Values are exactly the pre-rebuild LandingPage.jsx's D.orange/violet/
 * gold/amber (see FLOWS, git history prior to 2026-08-17) — not new
 * choices. AuthModal's own pre-rebuild PATH_META used a slightly
 * different violet (#7C3AED vs this file's #8B5CF6) for "professional";
 * LandingPage.jsx's value was used per explicit instruction.
 *
 * Single source of truth for BOTH LandingPage.jsx's "Choose Your Journey"
 * cards and AuthModal's in-modal path-chooser step (App.jsx) — reintroducing
 * per-file hardcoded copies is exactly the drift this file exists to
 * prevent. "path"/"instType" are what AuthModal's selectedPath vocabulary
 * actually expects (see the 2026-08-18 path-vocab bugfix) — the College
 * entry intentionally maps to path:"institution", instType:"College", not
 * a literal "college" string.
 */
import { GraduationCap, Briefcase, Sparkles, Landmark } from "lucide-react"

export const PATH_COLORS = {
  student: "#FF5701",
  professional: "#8B5CF6",
  executive: "#C9A84C",
  institution: "#D97706",
}

export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// Writes (or clears) the two localStorage keys AuthModal reads on open to
// decide whether to show its step-1 chooser or jump straight to a path's
// form (App.jsx:~368). Single place for this logic — previously duplicated
// between LandingPage.jsx's openPath() and AuthModal's handlePickPath().
// path=null clears any stale path (generic "Get started" entry points).
export function selectPath(path, instType = null) {
  try {
    if (path) localStorage.setItem("capabilio_selected_path", path)
    else localStorage.removeItem("capabilio_selected_path")
    if (instType) localStorage.setItem("capabilio_selected_inst_type", instType)
    else localStorage.removeItem("capabilio_selected_inst_type")
  } catch (_) { /* localStorage unavailable */ }
}

// URL for each path's dedicated marketing page (App.jsx early-returns on
// these under the /for/ prefix — see pages/paths/*.jsx). Institution's
// visible label is "College" everywhere in copy, but the URL and the
// underlying selectedPath both stay "institution"/"colleges" respectively.
export const PATH_URLS = {
  student: "/for/students",
  professional: "/for/professionals",
  executive: "/for/executives",
  institution: "/for/colleges",
}

export const PRIMARY_PATHS = [
  {
    key: "student", path: "student", icon: GraduationCap, title: "Student",
    color: PATH_COLORS.student,
    desc: "Prove your skills through real challenges. ELO starts at 400.",
    points: ["ELO starts at 400", "Free to start", "18+ domains"],
  },
  {
    key: "professional", path: "professional", icon: Briefcase, title: "Professional",
    color: PATH_COLORS.professional,
    desc: "Build your verified career intelligence. UAN-backed, AI-powered.",
    points: ["Auto-verified timeline", "Market intelligence", "Passive job matching"],
  },
  {
    key: "executive", path: "executive", icon: Sparkles, title: "Executive",
    color: PATH_COLORS.executive,
    desc: "Invite-only authority profile. Sell your time, verified by Capabilio.",
    points: ["Invite-only", "Verified authority profile", "Time marketplace"],
  },
  {
    key: "institution", path: "institution", instType: "College", icon: Landmark, title: "College",
    color: PATH_COLORS.institution,
    desc: "Track cohort ELO. Hire verified talent, automate placements.",
    points: ["Live cohort leaderboard", "Professor-assigned tasks", "Alumni intelligence"],
  },
]
