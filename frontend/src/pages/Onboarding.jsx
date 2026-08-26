import { useState, useEffect, useRef, useCallback } from "react"
import { userDoc } from "../lib/db";
import { collegeApi } from "../lib/api"
import { upsertProfileEducation } from "../lib/profileEducation"
import { PLANS, getPlansByPath, getPlansByPathWithDiscount, getDefaultPlanForPath, getInviteContext, applyDiscount } from "../config/plans"
import { useRazorpay } from "../hooks/useRazorpay"
import { getSkillModule } from "../config/skillModules"
import { ROLE_REGISTRY } from "../config/roleConfig"
import { confidenceAdjustedScore } from "../lib/skillScore"

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

// ─── CSS injected once ─────────────────────────────────────────────
const ONBOARDING_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
  * { box-sizing: border-box; }
  @keyframes ob-spin { to { transform: rotate(360deg) } }
  @keyframes ob-fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes ob-slideLeft { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ob-slideRight { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
  .ob-fade-up { animation: ob-fadeUp 0.38s ease both }
  .ob-card { transition: transform 180ms cubic-bezier(0.16,1,0.3,1), box-shadow 180ms, border-color 180ms }
  .ob-card:hover { transform: translateY(-3px) }
`

// ─── Per-path design themes ─────────────────────────────────────────
const PATH_THEME = {
  student: {
    accent:     "#6366F1",
    accentD:    "#4F46E5",
    accentBg:   "rgba(99,102,241,0.12)",
    accentBd:   "rgba(99,102,241,0.30)",
    icon:       "🎓",
    label:      "Student",
    tagline:    "Your ELO starts here.",
    heroTitle:  "Prove your skills.",
    heroSub:    "Not just claim them.",
    bg:         "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.10) 0%, transparent 50%), #FFFFFF",
    stepLabel:  "STUDENT ONBOARDING",
    steps:      ["Domain", "Assessment", "ELO Result", "Plan"],
  },
  professional: {
    accent:     "#8B5CF6",
    accentD:    "#7C3AED",
    accentBg:   "rgba(139,92,246,0.12)",
    accentBd:   "rgba(139,92,246,0.30)",
    icon:       "💼",
    label:      "Professional",
    tagline:    "Career intelligence, not a resume.",
    heroTitle:  "Your title is claimed.",
    heroSub:    "Your career is proven.",
    bg:         "radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.18) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(99,102,241,0.08) 0%, transparent 50%), #FFFFFF",
    stepLabel:  "PROFESSIONAL ONBOARDING",
    steps:      ["Upload", "AI Analysis", "Orbit Setup", "Plan"],
  },
  authority: {
    accent:     "#F59E0B",
    accentD:    "#D97706",
    accentBg:   "rgba(245,158,11,0.12)",
    accentBd:   "rgba(245,158,11,0.30)",
    icon:       "✦",
    label:      "Executive",
    tagline:    "Your authority, verified.",
    heroTitle:  "Your authority is real.",
    heroSub:    "Now monetize it.",
    bg:         "radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(161,122,0,0.08) 0%, transparent 45%), #FFFFFF",
    stepLabel:  "EXECUTIVE ONBOARDING",
    steps:      ["Profile", "Modules", "Plan"],
  },
  institution: {
    accent:     "#06B6D4",
    accentD:    "#0891B2",
    accentBg:   "rgba(6,182,212,0.12)",
    accentBd:   "rgba(6,182,212,0.30)",
    icon:       "🏛️",
    label:      "Organisation",
    tagline:    "Track talent at scale.",
    heroTitle:  "One platform.",
    heroSub:    "Two institution types.",
    bg:         "radial-gradient(ellipse at 20% 60%, rgba(6,182,212,0.15) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, rgba(16,185,129,0.08) 0%, transparent 45%), #FFFFFF",
    stepLabel:  "ORGANISATION ONBOARDING",
    steps:      ["Type", "Details", "Preview", "Plan"],
  },
}

const getPathTheme = (p) => PATH_THEME[p] || PATH_THEME.student

// ─── Design tokens (match LandingPage / theme.css) ──────────────────
const T = {
  // ── Glassmorphic Cosmos dark tokens ─────────────────────────────────────
  pageBg:   "#FFFFFF",
  surface:  "#FFFFFF",                     // raised surface
  raised:   "#FAF7F2",                     // base dark
  cardBg:   "#FFFFFF",                     // card bg
  // text
  text:     "#1A1714",                     // primary text
  muted:    "#A8A29E",                     // muted
  hint:     "#6B6560",                     // ghost
  // brand — dark-adapted indigo
  primary:  "#6366F1",
  primaryD: "#4F46E5",
  primaryBg:"rgba(99,102,241,0.12)",
  primaryBd:"rgba(99,102,241,0.30)",
  // semantic
  green:    "#10B981",
  greenBg:  "rgba(16,185,129,0.12)",
  amber:    "#F59E0B",
  amberBg:  "rgba(245,158,11,0.12)",
  purple:   "#8B5CF6",
  purpleBg: "rgba(139,92,246,0.12)",
  red:      "#F43F5E",
  border:   "rgba(0,0,0,0.05)",
  borderHi: "rgba(99,102,241,0.35)",
  // fonts
  display:  "'DM Sans', sans-serif",
  body:     "'DM Sans', system-ui, sans-serif",
  mono:     "'DM Mono', monospace",
  // radii
  radius:   "12px",
  radiusLg: "16px",
  radiusXl: "22px",
}

// ─── Shared layout helpers ──────────────────────────────────────────
const Screen = ({ children, style }) => (
  <div style={{
    minHeight: "100vh", background: T.pageBg, color: T.text,
    fontFamily: T.body, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "24px 16px", ...style,
  }}>
    {children}
  </div>
)

const Card = ({ children, style, accent = T.primaryBd }) => (
  <div className="ob-fade-up" style={{
    width: "100%",
    background: "rgba(0,0,0,0.03)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${accent}`,
    borderRadius: T.radiusXl, padding: 32,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    ...style,
  }}>
    {children}
  </div>
)

const Label = ({ children, color = T.primary }) => (
  <div style={{
    fontSize: 10, fontFamily: T.display, fontWeight: 400,
    letterSpacing: 2, color, textTransform: "uppercase",
    marginBottom: 10,
  }}>
    {children}
  </div>
)

const H2 = ({ children, style }) => (
  <h2 style={{
    margin: 0, fontSize: "clamp(22px,3vw,30px)", fontWeight: 900,
    fontFamily: T.body, color: T.text, lineHeight: 1.2,
    marginBottom: 10, ...style,
  }}>
    {children}
  </h2>
)

const Sub = ({ children }) => (
  <p style={{ margin: "0 0 24px", color: T.muted, fontSize: 14, lineHeight: 1.7, fontWeight: 300 }}>
    {children}
  </p>
)

const PrimaryBtn = ({ children, onClick, disabled, loading, color = T.primary, colorD = T.primaryD, textColor = "#fff" }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="ob-btn-hover"
    style={{
      width: "100%", padding: "14px", border: "none",
      borderRadius: T.radius, cursor: (disabled || loading) ? "not-allowed" : "pointer",
      background: (disabled || loading) ? "rgba(0,0,0,0.03)" : color,
      color: (disabled || loading) ? "rgba(0,0,0,0.25)" : textColor,
      fontSize: 14, fontWeight: 600, fontFamily: T.display, letterSpacing: "0.5px",
      boxShadow: (disabled || loading) ? "none" : `0 6px 20px ${color}40`,
      transition: "all 0.15s", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 8,
    }}
  >
    {loading
      ? <><Spinner size={14} />Please wait…</>
      : children}
  </button>
)

const FieldInput = ({ value, onChange, placeholder, type = "text", style }) => (
  <input
    value={value} onChange={onChange} type={type} placeholder={placeholder}
    style={{
      width: "100%", padding: "13px 16px", borderRadius: T.radius,
      background: "rgba(0,0,0,0.02)", border: "1px solid #E8E3DA",
      color: T.text, fontSize: 14, fontFamily: T.body, outline: "none",
      boxSizing: "border-box", transition: "border-color 0.15s", ...style,
    }}
    onFocus={e => e.target.style.borderColor = `${T.primary}60`}
    onBlur={e => e.target.style.borderColor = "#E8E3DA"}
  />
)

const FieldSelect = ({ value, onChange, children, disabled = false }) => (
  <select
    value={value} onChange={onChange} disabled={disabled}
    style={{
      width: "100%", padding: "13px 16px", borderRadius: T.radius,
      background: disabled ? "rgba(0,0,0,0.04)" : T.raised, border: "1px solid #E8E3DA",
      color: value ? T.text : T.muted, fontSize: 14,
      fontFamily: T.body, outline: "none", boxSizing: "border-box",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.8 : 1,
    }}
  >
    {children}
  </select>
)

const FieldTextarea = ({ value, onChange, placeholder, rows = 4 }) => (
  <textarea
    value={value} onChange={onChange} rows={rows} placeholder={placeholder}
    style={{
      width: "100%", padding: "13px 16px", borderRadius: T.radius,
      background: "rgba(0,0,0,0.02)", border: "1px solid #E8E3DA",
      color: T.text, fontSize: 14, fontFamily: T.body, outline: "none",
      resize: "vertical", boxSizing: "border-box",
    }}
    onFocus={e => e.target.style.borderColor = `${T.primary}60`}
    onBlur={e => e.target.style.borderColor = "#E8E3DA"}
  />
)

const UploadBox = ({ file, status, onUpload, label, hint, accept = ".pdf", color = T.primary }) => {
  const statusColor = status === "done" ? T.green : status === "reading" ? T.primary : status === "error" ? T.amber : T.muted
  const statusText = status === "done" ? "✓ Parsed successfully" : status === "reading" ? "Reading…" : status === "error" ? "Parse issue — you can still proceed" : hint
  return (
    <label style={{
      display: "block", border: `1px dashed ${color}40`, borderRadius: T.radiusLg,
      padding: "18px 20px", background: `${color}06`, cursor: "pointer",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = `${color}80`}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}40`}
    >
      <input type="file" accept={accept} onChange={onUpload} style={{ display: "none" }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>
        {file ? file.name : label}
      </div>
      <div style={{ fontSize: 11, color: statusColor, marginTop: 4 }}>{statusText}</div>
    </label>
  )
}

const Spinner = ({ size = 20, color = T.primary }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    border: `2px solid ${color}30`, borderTopColor: color,
    animation: "ob-spin 0.8s linear infinite", flexShrink: 0,
  }} />
)

const FieldRow = ({ label, children, hint }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>}
    {children}
    {hint && <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{hint}</div>}
  </div>
)

// Generic multi-select chip group — used by the company onboarding wizard's
// Hiring Intelligence (goals, domains) and AI Workspace Setup (modules) steps.
const ChipMultiSelect = ({ options, selected, onToggle, accent, accentBg }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
    {options.map(opt => {
      const isOn = selected.includes(opt)
      return (
        <button key={opt} type="button" onClick={() => onToggle(opt)}
          style={{
            padding: "6px 13px", borderRadius: 999,
            border: `1px solid ${isOn ? accent : "rgba(0,0,0,0.12)"}`,
            background: isOn ? accentBg : "transparent",
            color: isOn ? accent : T.muted,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s", fontFamily: T.body,
          }}>
          {isOn ? "✓ " : ""}{opt}
        </button>
      )
    })}
  </div>
)

// Sub-progress for the company onboarding wizard (4 data-entry steps before
// the Welcome Dashboard). Deliberately separate from PathBanner's own step
// dots (which stay "Type / Details / Preview / Plan" for both college and
// company) so this redesign never touches the college flow's banner.
const CompanyWizardDots = ({ activeIdx }) => {
  const labels = ["Workspace", "Hiring Intel", "Verification", "AI Setup"]
  const greenAccent = "#059669"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 22 }}>
      {labels.map((l, i) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: i === activeIdx ? 22 : 7, height: 7, borderRadius: 999,
            background: i === activeIdx ? greenAccent : i < activeIdx ? `${greenAccent}80` : "rgba(0,0,0,0.1)",
            transition: "all 0.3s",
          }} />
          {i === activeIdx && <span style={{ fontSize: 10, color: greenAccent, fontWeight: 700, fontFamily: T.mono, whiteSpace: "nowrap" }}>{l}</span>}
          {i < labels.length - 1 && <div style={{ width: 10, height: 1, background: "rgba(0,0,0,0.08)" }} />}
        </div>
      ))}
    </div>
  )
}

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: "transparent", border: "none", color: T.muted,
    cursor: "pointer", fontSize: 13, fontFamily: T.body, marginBottom: 20,
    display: "flex", alignItems: "center", gap: 5, padding: 0,
    transition: "color 0.15s",
  }}
    onMouseEnter={e => e.currentTarget.style.color = T.text}
    onMouseLeave={e => e.currentTarget.style.color = T.muted}
  >
    ← Back
  </button>
)

// ─── Path-specific header banner ────────────────────────────────────
const PathBanner = ({ pathKey, stepIndex = 0 }) => {
  const pt = getPathTheme(pathKey)
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: pt.accentBg, border: `1px solid ${pt.accentBd}`, borderRadius: 999, padding: "6px 14px" }}>
          <span style={{ fontSize: 14 }}>{pt.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: pt.accent, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: T.mono }}>{pt.stepLabel}</span>
        </div>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {pt.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: i === stepIndex ? 22 : 7, height: 7, borderRadius: 999, background: i === stepIndex ? pt.accent : i < stepIndex ? `${pt.accent}50` : "rgba(17,24,39,0.1)", transition: "all 0.3s" }} />
              {i === stepIndex && <span style={{ fontSize: 10, color: pt.accent, fontWeight: 700, fontFamily: T.mono, whiteSpace: "nowrap" }}>{s}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const StatPill = ({ val, label, color = T.primary }) => (
  <div style={{
    background: `${color}10`, border: `1px solid ${color}25`,
    borderRadius: T.radius, padding: "10px 14px", textAlign: "center",
  }}>
    <div style={{ fontFamily: T.display, fontSize: 18, color, lineHeight: 1 }}>{val}</div>
    <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginTop: 3, fontWeight: 600 }}>{label}</div>
  </div>
)

// ─── ELO helpers ─────────────────────────────────────────────────────
const ELO_ENABLED_PATHS = ["student", "professional"]
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const getBaseEloByPath = (p) => p === "student" ? 400 : p === "professional" ? 800 : null

// Student ELO: 400 base + 8 per correct answer (max 600 at 25/25)
// Examples: 0/25=400, 5/25=440, 10/25=480, 15/25=520, 20/25=560, 25/25=600
const ELO_PER_CORRECT = 8
const getStudentInitialElo = ({ score = 0, total = 25 }) => {
  const correct = Math.max(0, Math.round(score))
  return clamp(400 + correct * ELO_PER_CORRECT, 400, 600)
}

// NEVER use AI's suggested eloRating — always calculate from actual correct answers
// The AI has no idea how many questions the user got right, so its ELO suggestions
// are arbitrary. Only the real score determines student ELO.
const getStudentDisplayElo = ({ score, total }) =>
  getStudentInitialElo({ score, total })

// NEVER use AI's suggested eloRating for professionals either — same
// reasoning as the student rule above: the AI is guessing seniority from
// resume text, not measuring anything real. Capabilio's product rule
// (see AccountType.jsx / LandingPage.jsx marketing copy, and the
// standalone Weekly Pulse engine at backend/server/lib/professionalElo/
// eloEngine.js which already hardcodes STARTING_ELO=800) is that every
// professional starts at a flat 800 and grows their ELO through real,
// scored Weekly Pulse assessments after onboarding — not from an AI's
// one-shot resume read. suggestedElo/auraScore are kept as accepted
// params (unused) so none of this function's call sites need to change.
const getProfessionalInitialElo = () => getBaseEloByPath("professional")
const slugifyUsername = (s = "") => {
  const base = String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/--+/g, "-") || "user"
  // Append 4-char random suffix to guarantee uniqueness across same-name users
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}
const normalizeSkills = (skills) =>
  Array.from(new Set((skills || []).filter(Boolean).map(s => String(s).trim()).filter(Boolean)))
const safeNumber = (v, fb = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : fb)

// ─── Resume identity check ─────────────────────────────────────────
// Business rule: an uploaded resume must plausibly belong to the signed-in
// account, otherwise the Aura score, extracted experience, and username all
// get built from a stranger's document. Confirmed in production: an account
// uploaded a resume for a different person and both the score AND the
// generated username silently absorbed that other person's identity, with
// no warning to the user.
//
// This is intentionally a loose heuristic (token overlap, not exact string
// equality) — a legit resume with a middle name, nickname, honorific, or
// different capitalization/punctuation than the account's display name
// should still pass. It only needs to catch the case where the resume is
// for a genuinely different person, which shows up as zero shared name
// tokens against every identity signal the account has (full name, OAuth
// name, email local-part — people's emails very often contain their own
// name, so this triple-check keeps false positives low).
const normalizeNameStr = (s = "") => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
const nameTokens = (s = "") => normalizeNameStr(s).split(" ").filter(t => t.length >= 2)

function resumeNameMatchesAccount(resumeName, candidateIdentities) {
  const resumeToks = nameTokens(resumeName)
  if (resumeToks.length === 0) return true // nothing usable extracted — don't block on missing data
  const candidates = (candidateIdentities || []).filter(Boolean)
  if (candidates.length === 0) return true // no account identity to compare against either — don't block
  return candidates.some(candidate => {
    const candToks = nameTokens(candidate)
    if (candToks.length === 0) return false
    return resumeToks.some(rt => candToks.some(ct => ct === rt || ct.includes(rt) || rt.includes(ct)))
  })
}

// ─── Resume helpers (shared by payload builders) ───────────────────
const isProjectEntry = (e) => {
  const company = (e.company || "").toLowerCase().trim()
  const title   = (e.role || e.title || e.position || "").toLowerCase()
  if (!company || company === "unknown") return true
  if (/university|college|institute|school|iit|nit|iim|iiit|academy|polytechnic|campus/.test(company)) return true
  if (/\bproject\b|capstone|thesis|dissertation|final year|hackathon|intern project/.test(title)) return true
  const hasJobTitle = /engineer|developer|analyst|manager|intern|lead|head|consultant|architect|designer|officer|specialist|director|associate|executive/.test(title)
  if (!hasJobTitle && !e.duration && !e.startDate) return true
  return false
}
const buildVaultEntry = (fileObj, base64Url) => fileObj ? ({
  id: Date.now().toString(),
  name: fileObj.name,
  url: base64Url || "",
  type: fileObj.type || "application/pdf",
  category: "Resume",
  size: (fileObj.size / 1024).toFixed(0) + " KB",
  uploadedAt: new Date().toISOString(),
  _source: "onboarding",
}) : null
const buildResumeProjects = (allExperience, apiProjects, fileName) => {
  const projectEntries = allExperience.filter(isProjectEntry)
  const sources = [
    ...(apiProjects || []).map(p => ({
      title: p.title || p.name || "Project",
      description: p.description || "",
      techStack: Array.isArray(p.technologies) ? p.technologies : (Array.isArray(p.skills) ? p.skills : []),
      url: p.url || p.link || "",
      _source: "resume",
      resumeFile: fileName,
    })),
    ...projectEntries.map(e => ({
      title: e.role || e.title || e.company || "Project",
      description: Array.isArray(e.responsibilities) ? e.responsibilities.join("\n") : (e.description || e.responsibilities || ""),
      techStack: (e.skills || []).filter(Boolean),
      url: "",
      _source: "resume",
      resumeFile: fileName,
    })),
  ]
  return sources
}

// ─── Branch → career_track_slug mapping ─────────────────────────────
// Matches detectStudentStream() in Arena.jsx so Arena auto-filters correctly.
const BRANCH_TO_CAREER_SLUG = {
  CSE:        null,          // IT path — no slug needed (default DSA/SQL)
  IT:         null,
  MCA:        null,
  DevOps:     null,
  AI_DS:      "ai-ds",
  AI_ML:      "ai-ml",
  ECE:        "ece",
  EEE:        "eee",
  Mechanical: "mechanical",
  Civil:      "civil",
  IoT:        "iot",
  Pharmacy:   "pharmacy",
  MBA:        "mba",
  Other:      null,
}

// ─── Free-text department → Branch <select> code (2026-07-31) ───────
// A college's "Get Invite Link" modal takes department as free text (e.g.
// "Computer Science", InstitutionOS.jsx's linkForm.department) — not the
// fixed codes the student Branch dropdown uses. This maps common phrasings
// to a real option value so the invite-locked Branch field shows something
// real instead of a blank "Select branch". Conservative: an unrecognized
// department returns "" and the caller leaves Branch editable rather than
// force-locking it to a guess.
const DEPARTMENT_TO_BRANCH_CODE = [
  [/comp(uter)?\s*sci|^cse$/i, "CSE"],
  [/information\s*tech|^it$/i, "IT"],
  [/^mca$/i, "MCA"],
  [/data\s*sci|ai\s*&?\s*ds|ai\/ds/i, "AI_DS"],
  [/artificial\s*intell|ai\s*&?\s*ml|ai\/ml|machine\s*learn/i, "AI_ML"],
  [/electronics|^ece$/i, "ECE"],
  [/electrical|^eee$/i, "EEE"],
  [/mechanical|^mech$/i, "Mechanical"],
  [/^civil$/i, "Civil"],
  [/internet of things|^iot$/i, "IoT"],
  [/pharma/i, "Pharmacy"],
  [/^mba$|management/i, "MBA"],
]
function normalizeBranchCode(deptText) {
  const t = (deptText || "").trim()
  if (!t) return ""
  for (const [re, code] of DEPARTMENT_TO_BRANCH_CODE) if (re.test(t)) return code
  return ""
}

// ─── Payload builders ───────────────────────────────────────────────
const buildStudentSavePayload = ({ path, user, username, data }) => {
  const { keyword, college, branch, result, resumeData, resumeFileObj, resumeBase64, selectedRole, studentStage } = data
  const analysis = result?.analysis || {}
  const score = safeNumber(result?.score, 0)
  const total = safeNumber(result?.total, 25)
  const eloRating = getStudentDisplayElo({ score, total })
  const careerSlug = branch && Object.prototype.hasOwnProperty.call(BRANCH_TO_CAREER_SLUG, branch)
    ? BRANCH_TO_CAREER_SLUG[branch]
    : null

  const allExp = resumeData?.experience || []
  const professionalExps = allExp.filter(e => !isProjectEntry(e))
  const resumeExperiences = professionalExps.map((e, i) => {
    const dur = e.duration || ""
    const parts = dur.split(/\s*[-–]\s*/)
    const startDate = parts[0]?.trim() || e.startDate || e.start || e.startYear || ""
    const rawEnd = parts[1]?.trim() || e.endDate || e.end || e.endYear || ""
    const isCurrent = dur.toLowerCase().includes("present") || !!e.current || rawEnd.toLowerCase() === "present"
    const endDate = isCurrent ? "" : rawEnd
    const description = Array.isArray(e.responsibilities)
      ? e.responsibilities.join("\n")
      : (e.description || "")
    return {
      id: `resume-${i}-${Date.now()}`,
      company: e.company || "Previous Company",
      role: e.role || e.title || keyword || "Student",
      startDate, endDate, isCurrent,
      description, outcomes: "",
      location: e.location || "",
      industry: e.industry || "Technology",
      skills: normalizeSkills(e.skills || []),
      verificationStatus: "self-claimed",
      _source: "resume", resumeFile: resumeFileObj?.name || "",
    }
  })
  const resumeProjects = buildResumeProjects(allExp, resumeData?.projects, resumeFileObj?.name)
  const vaultEntry = buildVaultEntry(resumeFileObj, resumeBase64)
  const resolvedCollege = college || user.user_metadata?.college || ""

  return {
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || resumeData?.name || user.email?.split("@")[0] || "", email: user.email || resumeData?.email || "",
    username, path: "student", keyword: keyword || "", onboardingComplete: true, onboarding_complete: true,
    college: resolvedCollege,
    branch:  branch  || user.user_metadata?.branch  || "",
    // Keep profiles.education's "profile"-tagged entry in sync with
    // profiles.college from the very first save — same sync SettingsPanel.jsx
    // performs on every later edit. Fixes Aura's Education card showing
    // "No education yet" for students whose college was set at signup
    // (invite-locked or freely typed) and never touched in Settings since.
    education: upsertProfileEducation([], resolvedCollege),
    // Student/Job Seeker split (2026-08-03) — already valid snake_case, no
    // CAMEL_TO_SNAKE mapping needed (see db.js). null/undefined dropped by
    // toSnake automatically, so pre-split flows are unaffected.
    ...(studentStage ? { student_stage: studentStage } : {}),
    // Canonical role — set when student picks from the role picker (not free-text)
    ...(selectedRole ? {
      roleId:    selectedRole.id,
      roleLabel: selectedRole.label,
      roleSlug:  selectedRole.slug,
      roleStream: selectedRole.stream,
      arenaKey:  selectedRole.arenaKey,
    } : {}),
    ...(careerSlug ? { career_track_slug: careerSlug } : {}),
    eloRating, baseElo: getBaseEloByPath("student"), initialElo: eloRating,
    assessmentType: "student-mcq", assessmentScore: score, assessmentTotal: total,
    score: `${score}/${total}`,
    ...(typeof analysis?.jobReadiness === "number" ? { jobReadiness: analysis.jobReadiness } : {}),
    ...(Array.isArray(result?.radarData) ? { skillGraph: result.radarData } : {}),
    ...(Array.isArray(analysis?.strengths) ? { strengths: analysis.strengths } : {}),
    ...(Array.isArray(analysis?.weakAreas) ? { weakAreas: analysis.weakAreas } : {}),
    ...(resumeData?.summary ? { profileSummary: resumeData.summary } : {}),
    ...(resumeExperiences.length > 0 ? { experiences: resumeExperiences } : {}),
    ...(resumeProjects.length > 0 ? { resumeProjects } : {}),
    ...(vaultEntry ? { vaultFiles: [vaultEntry] } : {}),
    ...(resumeFileObj ? { resumeFileName: resumeFileObj.name, resumeUploadedAt: new Date().toISOString() } : {}),
    createdAt: new Date().toISOString(),
  }
}
const buildProfessionalSavePayload = ({ path, user, username, data }) => {
  const { auraResult, githubUsername, proResumeFileObj, proResumeBase64 } = data
  const extractedData = auraResult?.extractedData || {}
  const profileScore = auraResult?.profileScore || {}
  const analysis = auraResult?.analysis || {}
  const gh = auraResult?.githubData || null
  const eloRating = getProfessionalInitialElo({ suggestedElo: analysis?.eloRating, auraScore: profileScore?.total })

  const allExp = extractedData?.experience || []
  const professionalExps = allExp.filter(e => !isProjectEntry(e))
  const experiences = professionalExps.map((e, i) => {
    const startDate = e.startDate || e.startyear || e.startYear || e.from || ""
    const endDate   = e.endDate   || e.endyear  || e.endYear   || e.to   || ""
    const isCurrent = !!e.current || (!endDate && i === 0)
    const description = Array.isArray(e.responsibilities)
      ? e.responsibilities.join("\n")
      : (e.description || "")
    return {
      id: `exp-${i}-${Date.now()}`,
      company: e.company || "Previous Company",
      role: e.role || e.title || "Professional",
      startDate, endDate, isCurrent,
      description, outcomes: "",
      location: e.location || "",
      industry: "Technology",
      skills: normalizeSkills(e.skills || []),
      verificationStatus: "self-claimed",
      _source: "resume", resumeFile: proResumeFileObj?.name || "",
    }
  })
  const resumeProjects = buildResumeProjects(allExp, extractedData?.projects, proResumeFileObj?.name)
  const vaultEntry = buildVaultEntry(proResumeFileObj, proResumeBase64)

  return {
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || extractedData?.name || user.email?.split("@")[0] || "", email: user.email || extractedData?.email || "",
    username, path: "professional",
    keyword: analysis?.domain || extractedData?.title || extractedData?.currentTitle || extractedData?.role || "Professional",
    onboardingComplete: true, onboarding_complete: true, eloRating, baseElo: getBaseEloByPath("professional"), initialElo: eloRating,
    ...(typeof analysis?.jobReadiness === "number" ? { jobReadiness: analysis.jobReadiness } : {}),
    auraScore: safeNumber(profileScore?.total, 0), auraScoreBreakdown: profileScore,
    ...(Array.isArray(auraResult?.radarData) ? { skillGraph: auraResult.radarData } : {}),
    ...(Array.isArray(extractedData?.skills) ? { skills: normalizeSkills(extractedData.skills) } : {}),
    ...(Array.isArray(analysis?.strengths) ? { strengths: analysis.strengths } : {}),
    ...(Array.isArray(analysis?.criticalGaps) ? { weakAreas: analysis.criticalGaps } : Array.isArray(analysis?.weakAreas) ? { weakAreas: analysis.weakAreas } : {}),
    ...(Array.isArray(analysis?.recommendedTasks) ? { recommendedTasks: analysis.recommendedTasks } : {}),
    ...(extractedData?.summary ? { profileSummary: extractedData.summary } : {}),
    ...(experiences.length > 0 ? { experiences } : {}),
    ...(resumeProjects.length > 0 ? { resumeProjects } : {}),
    // ✅ Education + certifications — from LinkedIn or resume
    ...(Array.isArray(extractedData?.education) && extractedData.education.length > 0 ? { education: extractedData.education } : {}),
    ...(Array.isArray(extractedData?.certifications) && extractedData.certifications.length > 0 ? { certifications: extractedData.certifications } : {}),
    ...(extractedData?.location ? { location: extractedData.location } : {}),
    ...(vaultEntry ? { vaultFiles: [vaultEntry] } : {}),
    ...(proResumeFileObj ? { resumeFileName: proResumeFileObj.name, resumeUploadedAt: new Date().toISOString() } : {}),
    githubUsername: gh?.username || githubUsername || "",
    githubData: gh ? { topLanguage: gh.topLanguage, publicRepos: gh.publicRepos, totalStars: gh.totalStars, totalForks: gh.totalForks, followers: gh.followers, activeDays: gh.activeDays, languages: gh.languages || [], topRepos: gh.topRepos || [] } : null,
    createdAt: new Date().toISOString(),
  }
}
const buildAuthorityInstitutionSavePayload = ({ path, user, username, data }) => {
  const { authName, authRole, authType, authCompany, authDomain, authBio, authWebsite, authEmail, authLinkedIn } = data
  return {
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || authName || user.email?.split("@")[0] || "", email: user.email || "",
    username, path, accountType: path === "institution" ? "institution" : "authority",
    authorityType: authType || "", keyword: authDomain || "", role: authRole || "",
    company: authCompany || "", bio: authBio || "", website: authWebsite || "",
    authorityEmail: authEmail || "", linkedInUrl: authLinkedIn || "",
    onboardingComplete: true, onboarding_complete: true, verifiedAuthority: false, verificationStatus: "pending",
    followers: 0, following: 0, posts: 0,
    openTo: { mentorship: true, advisory: false, hiring: false, consulting: false },
    createdAt: new Date().toISOString(),
    pageVisibility: { arena: true, pulse: true, skillstudio: path !== "institution", launchpad: true },
  }
}
const buildUserSavePayload = ({ path, user, username, data }) => {
  if (path === "student") return buildStudentSavePayload({ path, user, username, data })
  if (path === "professional") return buildProfessionalSavePayload({ path, user, username, data })
  if (path === "authority" || path === "institution") return buildAuthorityInstitutionSavePayload({ path, user, username, data })
  return { displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "", email: user.email || "", username, path, onboarding_complete: true, createdAt: new Date().toISOString() }
}

// ─── Radar chart ─────────────────────────────────────────────────────
// The SVG's own box has to include room for label text beyond the polygon
// radius — relying on overflow:visible alone still clips if any ancestor
// (a modal, a grid cell) establishes its own overflow context. LABEL_PAD
// bakes that room into the viewBox itself so the chart is self-contained,
// and width/height:100%+maxWidth make it scale down (not clip) in a
// narrower container instead of a fixed px size.
function wrapRadarLabel(label, maxCharsPerLine = 11) {
  const words = String(label || "").trim().split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [words[0] || ""]
  const lines = []
  let line = ""
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w
    if (candidate.length > maxCharsPerLine && line) { lines.push(line); line = w }
    else line = candidate
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}
function RadarChart({ data, size = 260 }) {
  const LABEL_PAD = 46
  const box = size + LABEL_PAD * 2
  const cx = box / 2, cy = box / 2, r = size * 0.35
  const n = data.length, step = (2 * Math.PI) / n
  const colors = [T.primary, "#78FF9E", T.purple, T.amber, "#FF6B9D", "#06D6A0"]
  const pt = (i, val) => { const a = i * step - Math.PI / 2, d = (val / 100) * r; return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) } }
  const lp = (i) => { const a = i * step - Math.PI / 2, d = r + 28; return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) } }
  const pts = data.map((d, i) => pt(i, d.value))
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z"
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ width: "100%", height: "auto", maxWidth: box, overflow: "visible" }}>
      {[20, 40, 60, 80, 100].map(lvl => {
        const gpts = data.map((_, i) => pt(i, lvl))
        const d = gpts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z"
        return <path key={lvl} d={d} fill="none" stroke="rgba(59,130,246,0.08)" strokeWidth={1} />
      })}
      {data.map((_, i) => { const op = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={op.x} y2={op.y} stroke="rgba(59,130,246,0.1)" strokeWidth={1} /> })}
      <path d={pathD} fill="rgba(59,130,246,0.12)" stroke={T.primary} strokeWidth={2} />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors[i % colors.length]} />)}
      {data.map((d, i) => {
        const p = lp(i)
        const lines = wrapRadarLabel(d.label)
        const startDy = lines.length > 1 ? -0.3 : 0.32
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" fontSize={9} fontWeight={700} fill="#A8A29E" fontFamily={T.body}>
            {lines.map((line, li) => <tspan key={li} x={p.x} dy={li === 0 ? `${startDy}em` : "1.1em"}>{line}</tspan>)}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Timer ring ─────────────────────────────────────────────────────
function TimerRing({ total, remaining }) {
  const r = 22, circ = 2 * Math.PI * r
  const danger = remaining <= 10
  return (
    <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={28} cy={28} r={r} fill="none" stroke={`${T.primary}20`} strokeWidth={4} />
      <circle cx={28} cy={28} r={r} fill="none" stroke={danger ? T.red : T.primary} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - remaining / total)}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
      <text x={28} y={33} textAnchor="middle" fill={danger ? T.red : T.primary} fontSize={13}
        fontWeight={800} fontFamily={T.body}
        style={{ transform: "rotate(90deg)", transformOrigin: "28px 28px" }}>{remaining}</text>
    </svg>
  )
}

// ─── Progress bar ───────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  return (
    <div style={{ width: "100%", height: 3, background: `${T.primary}15`, borderRadius: 4, overflow: "hidden", margin: "12px 0" }}>
      <div style={{ height: "100%", width: `${(current / total) * 100}%`, background: T.primary, borderRadius: 4, transition: "width 0.4s ease" }} />
    </div>
  )
}

// ─── Recommendation Popup (shown after assessment result, before dashboard) ────
function RecoPopup({ weakAreas, onContinue }) {
  // Pick top 4 weak areas that have static module content
  const cards = (weakAreas || []).slice(0, 6).map(skill => {
    const mod = getSkillModule(skill)
    if (!mod) return null
    return { skill, concept: mod.concept?.slice(0, 100) + "…", resources: mod.resources || [] }
  }).filter(Boolean).slice(0, 4)

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 10000, padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 560,
        background: "#FFFFFF", borderRadius: 24,
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        overflow: "hidden", animation: "ob-fadeUp 0.35s ease both",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
          padding: "22px 24px 18px",
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>Based on your assessment</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 4 }}>📚 Recommended modules for you</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
            Study these before your first interview — each takes under 20 minutes and gives you basic knowledge on your weak areas.
          </div>
        </div>

        {/* Module cards */}
        <div style={{ padding: "16px 20px", maxHeight: 380, overflowY: "auto" }}>
          {cards.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cards.map((c, i) => (
                <div key={i} style={{
                  background: "#F8F7FE", border: "1px solid #E0E7FF",
                  borderRadius: 14, padding: "14px 16px",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "#6366F120", border: "1px solid #6366F140",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 900, color: "#6366F1", flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1A1714", marginBottom: 4 }}>{c.skill}</div>
                    <div style={{ fontSize: 11, color: "#6B6560", lineHeight: 1.55, marginBottom: 8 }}>{c.concept}</div>
                    <a href="/skill-studio" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "5px 12px",
                      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      borderRadius: 99, color: "#fff",
                      fontSize: 10, fontWeight: 800, textDecoration: "none",
                    }}>Study in Skill Studio →</a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📖</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1714", marginBottom: 6 }}>Check Skill Studio for modules</div>
              <div style={{ fontSize: 12, color: "#6B6560", lineHeight: 1.6 }}>Your personalised modules are waiting in Skill Studio — go explore what to study next.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px 20px",
          borderTop: "1px solid #F0F0F0",
          display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: "#6B6560", marginRight: "auto" }}>You can revisit these anytime in Skill Studio</span>
          <button onClick={onContinue} style={{
            padding: "10px 22px",
            background: "linear-gradient(135deg, #6366F1, #4F46E5)",
            border: "none", borderRadius: 12, color: "#fff",
            fontSize: 13, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 4px 14px #6366F140",
          }}>Continue to Dashboard →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Result Modal (Student) ─────────────────────────────────────────
function ResultModal({ result, keyword, questions, onGoToDashboard, savingResult, saveError }) {
  const [tab, setTab] = useState("overview")
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), 30); return () => clearTimeout(t) }, [])
  const toIdx = (c) => typeof c === "number" ? c : ({ A:0,B:1,C:2,D:3,a:0,b:1,c:2,d:3 })[c] ?? 0
  const { radarData, analysis, score, total, finalAnswers } = result
  const pct = Math.round((score / total) * 100)
  const colors = [T.primary, "#78FF9E", T.purple, T.amber, "#FF6B9D", "#06D6A0"]
  const correct = questions.filter((q, i) => finalAnswers[i] === toIdx(q.correct)).length
  const wrong = questions.filter((q, i) => finalAnswers[i] !== toIdx(q.correct) && finalAnswers[i] != null).length
  const timedOut = questions.filter((_, i) => finalAnswers[i] == null).length
  const elo = getStudentDisplayElo({ score, total })
  const TABS = [{ id:"overview",label:"Overview" }, { id:"skills",label:"Skills" }, { id:"feedback",label:"AI Feedback" }, { id:"answers",label:"Answers" }]
  const scoreColor = pct >= 80 ? T.green : pct >= 60 ? T.primary : pct >= 40 ? T.amber : T.red
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",opacity:vis?1:0,transition:"opacity 0.3s",padding:16 }}>
      <div style={{ width:"100%",maxWidth:620,background:T.surface,border:`1px solid ${T.primary}25`,borderRadius:24,height:"90vh",display:"flex",flexDirection:"column",boxShadow:`0 40px 80px rgba(0,0,0,0.7)`,transform:vis?"scale(1)":"scale(0.95)",transition:"transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px",background:T.raised,borderBottom:`1px solid ${T.primary}15`,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
            <span style={{ fontFamily:T.display,fontSize:15,color:T.primary,letterSpacing:1 }}>CAPABILIO</span>
            <div style={{ display:"flex",alignItems:"center",gap:7 }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:T.green,animation:"ob-pulse 2s ease infinite" }} />
              <span style={{ fontSize:10,color:T.muted,fontWeight:600,letterSpacing:2 }}>ASSESSMENT COMPLETE</span>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:20,marginBottom:16 }}>
            {/* Score ring */}
            <div style={{ flexShrink:0 }}>
              <svg width={110} height={110} viewBox="0 0 110 110">
                <circle cx={55} cy={55} r={46} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth={8} />
                <circle cx={55} cy={55} r={46} fill="none" stroke={scoreColor} strokeWidth={8}
                  strokeDasharray={`${(pct/100)*289} 289`} strokeLinecap="round"
                  transform="rotate(-90 55 55)" style={{ transition:"stroke-dasharray 1.5s ease" }} />
                <text x={55} y={51} textAnchor="middle" fill={scoreColor} fontSize={26} fontWeight={900} fontFamily={T.body}>{pct}%</text>
                <text x={55} y={68} textAnchor="middle" fill="#6B6560" fontSize={10} fontFamily={T.body}>Score</text>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18,fontWeight:900,color:T.text,marginBottom:4 }}>{pct>=80?"🏆 Excellent!":pct>=60?"🌟 Good job!":pct>=40?"📈 Keep going!":"💪 Just starting!"}</div>
              <div style={{ fontSize:12,color:T.muted,marginBottom:12 }}>{score}/{total} correct · {keyword}</div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {[
                  { label:"ELO Rating",val:elo,color:T.green },
                  ...(typeof analysis?.jobReadiness==="number"?[{label:"Job Ready",val:`${analysis.jobReadiness}%`,color:T.purple}]:[]),
                  { label:"Correct",val:correct,color:T.primary },
                  { label:"Wrong",val:wrong,color:T.red },
                ].map((s,i) => <StatPill key={i} val={s.val} label={s.label} color={s.color} />)}
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex",gap:3,background:"rgba(0,0,0,0.2)",borderRadius:10,padding:3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"8px 4px",borderRadius:8,border:"none",cursor:"pointer",background:tab===t.id?`${T.primary}18`:"transparent",color:tab===t.id?T.primary:T.muted,fontSize:11,fontWeight:600,fontFamily:T.body,transition:"all 0.2s",borderBottom:tab===t.id?`2px solid ${T.primary}`:"2px solid transparent" }}>{t.label}</button>
            ))}
          </div>
        </div>
        {/* Body */}
        <div style={{ flex:1,overflowY:"auto",padding:"20px 24px 0" }}>
          {tab==="overview" && (
            <div>
              {[{label:"Correct",count:correct,color:T.green},{label:"Wrong",count:wrong,color:T.red},{label:"Timed Out",count:timedOut,color:T.amber}].map((b,i)=>(
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}><span style={{ fontSize:12,color:T.muted }}>{b.label}</span><span style={{ fontSize:12,fontWeight:700,color:b.color }}>{b.count}/{questions.length}</span></div>
                  <div style={{ height:5,background:"rgba(0,0,0,0.03)",borderRadius:4,overflow:"hidden" }}><div style={{ height:"100%",width:`${(b.count/questions.length)*100}%`,background:b.color,borderRadius:4,transition:"width 1s ease" }} /></div>
                </div>
              ))}
              <div style={{ background:`${T.green}08`,border:`1px solid ${T.green}20`,borderRadius:T.radiusLg,padding:18,marginTop:16 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:2,marginBottom:8 }}>YOUR STARTING ELO</div>
                <div style={{ fontFamily:T.display,fontSize:44,color:T.green,lineHeight:1,marginBottom:6 }}>{elo}</div>
                <div style={{ fontSize:12,color:T.muted,lineHeight:1.6 }}>{elo>=480?"Strong beginner foundation — keep building with Arena tasks.":elo>=440?"Developing foundation — you're on the right track.":"Beginner — great starting point. Grows with daily Arena tasks."}</div>
              </div>
            </div>
          )}
          {tab==="skills" && (
            <div>
              <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}><RadarChart data={radarData} size={220} /></div>
              {radarData.map((d,i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}><span style={{ fontSize:12,color:T.muted }}>{d.label}</span><span style={{ fontSize:12,fontWeight:700,color:colors[i%colors.length] }}>{d.value}%</span></div>
                  <div style={{ height:5,background:"rgba(0,0,0,0.03)",borderRadius:4,overflow:"hidden" }}><div style={{ height:"100%",width:`${d.value}%`,background:colors[i%colors.length],borderRadius:4,transition:"width 1.2s ease" }} /></div>
                </div>
              ))}
            </div>
          )}
          {tab==="feedback" && (
            <div>
              <div style={{ background:`${T.primary}08`,border:`1px solid ${T.primary}20`,borderRadius:T.radiusLg,padding:18,marginBottom:14 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.primary,textTransform:"uppercase",letterSpacing:2,marginBottom:8 }}>AI ANALYSIS</div>
                <p style={{ fontSize:13,color:T.muted,lineHeight:1.75,margin:0 }}>{analysis.summary}</p>
              </div>
              <div style={{ background:`${T.green}06`,border:`1px solid ${T.green}18`,borderRadius:T.radiusLg,padding:16,marginBottom:12 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.green,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>STRENGTHS</div>
                {analysis.strengths?.map((s,i) => <div key={i} style={{ fontSize:13,color:T.muted,marginBottom:8,display:"flex",gap:8,lineHeight:1.5 }}><span style={{ color:T.green,fontWeight:800 }}>→</span>{s}</div>)}
              </div>
              <div style={{ background:`${T.red}06`,border:`1px solid ${T.red}18`,borderRadius:T.radiusLg,padding:16,marginBottom:12 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.red,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>AREAS TO IMPROVE</div>
                {analysis.weakAreas?.map((s,i) => <div key={i} style={{ fontSize:13,color:T.muted,marginBottom:8,display:"flex",gap:8,lineHeight:1.5 }}><span style={{ color:T.red,fontWeight:800 }}>→</span>{s}</div>)}
              </div>
            </div>
          )}
          {tab==="answers" && (
            <div>
              {questions.map((q,i) => {
                const ua = finalAnswers[i]
                const ca = toIdx(q.correct)
                const isC = ua===ca, isT = ua==null
                const bc = isC?"rgba(22,163,74,0.15)":isT?"rgba(217,119,6,0.15)":"rgba(220,38,38,0.15)"
                return (
                  <div key={i} style={{ background:"#FAFAFA",border:`1px solid ${bc}`,borderRadius:T.radius,padding:"12px 14px",marginBottom:10 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ fontSize:11,color:T.muted }}>Q{i+1} · {q.category||""}</span><span style={{ fontSize:11,fontWeight:700,color:isC?T.green:isT?T.amber:T.red }}>{isC?"✓ Correct":isT?"⏱ Timeout":"✗ Wrong"}</span></div>
                    <div style={{ fontSize:13,color:T.hint,lineHeight:1.5,marginBottom:6 }}>{q.question}</div>
                    {!isC&&!isT&&<div style={{ fontSize:12,color:T.red,marginBottom:4 }}>Your answer: {q.options?.[ua]||"—"}</div>}
                    <div style={{ fontSize:12,color:T.green,marginBottom:q.explanation?4:0 }}>✓ {q.options?.[ca]||"—"}</div>
                    {q.explanation&&<div style={{ fontSize:11,color:T.muted,lineHeight:1.5,marginTop:4,paddingTop:6,borderTop:"1px solid rgba(0,0,0,0.03)" }}>{q.explanation}</div>}
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ height:20 }} />
        </div>
        {/* Footer CTA */}
        <div style={{ padding:"16px 24px 24px",borderTop:`1px solid ${T.primary}15`,flexShrink:0 }}>
          {saveError && (
            <div style={{ marginBottom:12, padding:"12px 14px", background:"#FFF1E8", border:"1px solid rgba(255,87,1,0.25)", borderRadius:T.radius, color:T.primary, fontSize:13, fontWeight:500, lineHeight:1.5 }}>
              ⚠ {saveError}
            </div>
          )}
          <PrimaryBtn onClick={onGoToDashboard} loading={savingResult}>
            {saveError ? "↻ Try Again" : "🚀 Go to My Dashboard →"}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Resume/Account Name Mismatch Modal ─────────────────────────────
// Blocks the flow entirely — no Aura scoring call is made while this is up
// (see runProfessionalAnalysis) — until the user either uploads a matching
// resume or acknowledges and re-uploads.
function NameMismatchModal({ resumeName, accountName, onReupload, onClose }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), 20); return () => clearTimeout(t) }, [])
  return (
    <div style={{ position:"fixed",inset:0,zIndex:10000,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",opacity:vis?1:0,transition:"opacity 0.25s",padding:16 }}>
      <div style={{ width:"100%",maxWidth:420,background:T.surface,border:`1px solid ${T.red}30`,borderRadius:20,padding:"28px 26px",boxShadow:"0 40px 80px rgba(0,0,0,0.7)",transform:vis?"scale(1)":"scale(0.95)",transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ fontSize:32,marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:18,fontWeight:900,color:T.text,marginBottom:10,fontFamily:T.display }}>This resume doesn't match your profile</div>
        <div style={{ fontSize:13,color:T.muted,lineHeight:1.55,marginBottom:16 }}>
          Your account is registered as <strong style={{ color:T.text }}>{accountName}</strong>, but the resume you
          uploaded appears to belong to <strong style={{ color:T.text }}>{resumeName}</strong>. Capabilio scores are
          tied to your verified identity, so we can't score a resume that doesn't match your profile.
        </div>
        <div style={{ fontSize:12,color:T.muted,lineHeight:1.5,marginBottom:20,background:"rgba(0,0,0,0.03)",borderRadius:T.radius,padding:"10px 12px" }}>
          Please upload your own resume, or update your account name in Settings if <strong style={{ color:T.text }}>{accountName}</strong> isn't correct.
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:"11px 14px",borderRadius:T.radius,border:`1px solid ${T.muted}30`,background:"transparent",color:T.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:T.body }}>Cancel</button>
          <button onClick={onReupload} style={{ flex:1,padding:"11px 14px",borderRadius:T.radius,border:"none",background:T.primary,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:T.body }}>Upload a Different Resume</button>
        </div>
      </div>
    </div>
  )
}

// ─── Professional Result Modal ──────────────────────────────────────
function ProfessionalResultModal({ auraResult, onGoToDashboard, savingResult }) {
  const [tab, setTab] = useState("score")
  const [vis, setVis] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVis(true), 40); return () => clearTimeout(t) }, [])
  const { profileScore, radarData, analysis, githubData, extractedData } = auraResult
  const colors = [T.primary, "#78FF9E", T.purple, T.amber, "#FF6B9D", "#06D6A0"]
  const proElo = getProfessionalInitialElo({ suggestedElo: analysis?.eloRating, auraScore: profileScore?.total })
  const total = profileScore?.total || 0
  const scoreColor = total>=75?T.green:total>=55?T.primary:total>=35?T.amber:T.red
  const scoreLabel = total>=75?"Strong Profile":total>=55?"Good Foundation":total>=35?"Building Up":"Early Stage"
  const TABS = [{ id:"score",label:"Aura Score" }, { id:"gaps",label:"Gap Report" }, { id:"github",label:"GitHub" }, { id:"tasks",label:"Next Steps" }]
  const ScoreDim = ({ label, score, max, color }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}><span style={{ fontSize:13,color:T.muted }}>{label}</span><span style={{ fontSize:13,fontWeight:700,color }}>{score}<span style={{ fontSize:10,color:T.muted }}>/{max}</span></span></div>
      <div style={{ height:5,background:"rgba(0,0,0,0.03)",borderRadius:4,overflow:"hidden" }}><div style={{ height:"100%",width:`${(score/max)*100}%`,background:color,borderRadius:4,transition:"width 1.2s ease" }} /></div>
    </div>
  )
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center",opacity:vis?1:0,transition:"opacity 0.35s",padding:16 }}>
      <div style={{ width:"100%",maxWidth:620,background:T.surface,border:`1px solid ${T.green}25`,borderRadius:24,height:"90vh",display:"flex",flexDirection:"column",boxShadow:`0 40px 80px rgba(0,0,0,0.7)`,transform:vis?"scale(1)":"scale(0.94)",transition:"transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden" }}>
        <div style={{ padding:"20px 24px 16px",background:T.raised,borderBottom:`1px solid ${T.green}12`,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
            <span style={{ fontFamily:T.display,fontSize:15,color:T.primary,letterSpacing:1 }}>CAPABILIO</span>
            <div style={{ display:"flex",alignItems:"center",gap:7 }}><div style={{ width:7,height:7,borderRadius:"50%",background:T.green,animation:"ob-pulse 2s ease infinite" }} /><span style={{ fontSize:10,color:T.muted,fontWeight:600,letterSpacing:2 }}>AURA PROFILE READY</span></div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:20,marginBottom:16 }}>
            <div style={{ flexShrink:0 }}>
              <svg width={110} height={110} viewBox="0 0 110 110">
                <circle cx={55} cy={55} r={46} fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth={8} />
                <circle cx={55} cy={55} r={46} fill="none" stroke={scoreColor} strokeWidth={8} strokeDasharray={`${(total/100)*289} 289`} strokeLinecap="round" transform="rotate(-90 55 55)" style={{ transition:"stroke-dasharray 1.8s ease" }} />
                <text x={55} y={51} textAnchor="middle" fill={scoreColor} fontSize={26} fontWeight={900} fontFamily={T.body}>{total}</text>
                <text x={55} y={67} textAnchor="middle" fill="#6B6560" fontSize={9} fontFamily={T.body}>/100</text>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10,fontWeight:700,color:scoreColor,letterSpacing:2,textTransform:"uppercase",marginBottom:4 }}>{scoreLabel}</div>
              <div style={{ fontSize:18,fontWeight:900,color:T.text,lineHeight:1.2,marginBottom:8 }}>{extractedData?.name||"Your Profile"}<br/><span style={{ fontSize:12,color:T.muted,fontWeight:300 }}>{extractedData?.currentTitle||extractedData?.title||"Professional"}</span></div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {[
                  { label:"ELO Start",val:proElo,color:T.green },
                  ...(typeof analysis?.jobReadiness==="number"?[{label:"Job Ready",val:`${analysis.jobReadiness}%`,color:T.purple}]:[]),
                  { label:"Exp",val:extractedData?.yearsExperience||"—",color:T.primary },
                ].map((s,i) => <StatPill key={i} val={s.val} label={s.label} color={s.color} />)}
              </div>
            </div>
          </div>
          <div style={{ display:"flex",gap:3,background:"rgba(0,0,0,0.2)",borderRadius:10,padding:3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"7px 4px",borderRadius:8,border:"none",cursor:"pointer",background:tab===t.id?`${T.green}12`:"transparent",color:tab===t.id?"#78FF9E":T.muted,fontSize:10,fontWeight:600,fontFamily:T.body,transition:"all 0.2s",borderBottom:tab===t.id?"2px solid #78FF9E":"2px solid transparent" }}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"20px 24px 0" }}>
          {tab==="score" && (
            <div>
              <div style={{ background:"#FAFAFA",border:"1px solid #F3F4F6",borderRadius:T.radiusLg,padding:18,marginBottom:16 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:14 }}>PROFILE SCORE BREAKDOWN</div>
                <ScoreDim label="Profile Completeness" score={profileScore?.completeness||0} max={20} color={T.primary} />
                <ScoreDim label="Experience Depth" score={profileScore?.experienceDepth||0} max={25} color="#78FF9E" />
                <ScoreDim label="Technical Breadth" score={profileScore?.technicalBreadth||0} max={20} color={T.purple} />
                <ScoreDim label="Project Quality" score={profileScore?.projectQuality||0} max={20} color={T.amber} />
                <ScoreDim label="Market Readiness" score={profileScore?.marketReadiness||0} max={15} color="#FF6B9D" />
              </div>
              {extractedData?.skills?.length>0&&(
                <div style={{ background:T.primaryBg,border:`1px solid ${T.primary}15`,borderRadius:T.radiusLg,padding:16,marginBottom:16 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.primary,textTransform:"uppercase",letterSpacing:2,marginBottom:10 }}>DETECTED SKILLS</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{extractedData.skills.slice(0,20).map((sk,i)=><div key={i} style={{ background:`${T.primary}10`,border:`1px solid ${T.primary}20`,borderRadius:100,padding:"3px 10px",fontSize:11,color:T.primary,fontWeight:600 }}>{sk}</div>)}</div>
                </div>
              )}
              {analysis?.summary&&<div style={{ background:`${T.primary}06`,border:`1px solid ${T.primary}15`,borderRadius:T.radiusLg,padding:16,marginBottom:16 }}><div style={{ fontSize:10,fontWeight:700,color:T.primary,textTransform:"uppercase",letterSpacing:2,marginBottom:8 }}>AI ANALYSIS</div><p style={{ fontSize:13,color:T.muted,lineHeight:1.75,margin:0 }}>{analysis.summary}</p></div>}
            </div>
          )}
          {tab==="gaps" && (
            <div>
              <div style={{ background:`${T.green}05`,border:`1px solid ${T.green}15`,borderRadius:T.radiusLg,padding:16,marginBottom:12 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.green,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>STRENGTHS</div>
                {(analysis?.strengths||[]).map((s,i)=><div key={i} style={{ fontSize:13,color:T.muted,marginBottom:8,display:"flex",gap:8,lineHeight:1.5 }}><span style={{ color:T.green,fontWeight:800 }}>→</span>{s}</div>)}
              </div>
              <div style={{ background:`${T.red}05`,border:`1px solid ${T.red}15`,borderRadius:T.radiusLg,padding:16,marginBottom:12 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.red,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>CRITICAL GAPS</div>
                {(analysis?.criticalGaps||analysis?.weakAreas||[]).map((g,i)=><div key={i} style={{ fontSize:13,color:T.muted,marginBottom:8,display:"flex",gap:8,lineHeight:1.5 }}><span style={{ color:T.red,fontWeight:800 }}>→</span>{g}</div>)}
              </div>
              {typeof analysis?.jobReadiness==="number"&&(
                <div style={{ background:`${T.purple}05`,border:`1px solid ${T.purple}15`,borderRadius:T.radiusLg,padding:16,marginBottom:12 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.purple,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8 }}>MARKET READINESS</div>
                  <div style={{ fontFamily:T.display,fontSize:40,color:T.purple,marginBottom:8 }}>{analysis.jobReadiness}%</div>
                  <div style={{ height:6,background:"rgba(0,0,0,0.03)",borderRadius:4,overflow:"hidden" }}><div style={{ height:"100%",width:`${analysis.jobReadiness}%`,background:T.purple,borderRadius:4,transition:"width 1.2s ease" }} /></div>
                </div>
              )}
            </div>
          )}
          {tab==="github" && (
            <div>
              {githubData ? (
                <>
                  <div style={{ background:T.primaryBg,border:`1px solid ${T.primary}15`,borderRadius:T.radiusLg,padding:16,marginBottom:14 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}><div style={{ width:42,height:42,borderRadius:T.radius,background:`${T.primary}15`,border:`1px solid ${T.primary}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🐙</div><div><div style={{ fontSize:14,fontWeight:700,color:T.text }}>@{githubData.username}</div><div style={{ fontSize:11,color:T.muted,marginTop:2 }}>{githubData.publicRepos} repos · {githubData.followers} followers</div></div></div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                      {[{label:"Stars",val:githubData.totalStars||0,color:T.amber},{label:"Forks",val:githubData.totalForks||0,color:T.primary},{label:"Active Days",val:githubData.activeDays||"—",color:T.green},{label:"Top Language",val:githubData.topLanguage||"—",color:T.purple}].map((s,i)=>(
                        <div key={i} style={{ background:"#FFFFFF",border:`1px solid ${s.color}15`,borderRadius:T.radius,padding:"10px 14px" }}>
                          <div style={{ fontSize:10,color:T.muted,marginBottom:4 }}>{s.label}</div>
                          <div style={{ fontFamily:T.display,fontSize:16,color:s.color }}>{s.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {githubData.topRepos?.length>0&&<div style={{ background:`${T.green}05`,border:`1px solid ${T.green}12`,borderRadius:T.radiusLg,padding:16,marginBottom:14 }}><div style={{ fontSize:10,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:2,marginBottom:12 }}>TOP REPOSITORIES</div>{githubData.topRepos.slice(0,4).map((r,i)=><div key={i} style={{ marginBottom:12,paddingBottom:12,borderBottom:i<githubData.topRepos.length-1?"1px solid rgba(0,0,0,0.03)":"none" }}><div style={{ fontSize:13,fontWeight:700,color:T.primary }}>{r.name}</div>{r.description&&<div style={{ fontSize:11,color:T.muted,marginTop:3,lineHeight:1.5 }}>{r.description}</div>}<div style={{ display:"flex",gap:12,marginTop:6 }}><span style={{ fontSize:10,color:T.amber }}>⭐ {r.stars}</span>{r.language&&<span style={{ fontSize:10,color:T.purple }}>💻 {r.language}</span>}</div></div>)}</div>}
                </>
              ) : (
                <div style={{ textAlign:"center",padding:"48px 24px",color:T.muted }}><div style={{ fontSize:40,marginBottom:12 }}>🐙</div><div style={{ fontSize:14,fontWeight:600,marginBottom:6 }}>No GitHub connected</div><div style={{ fontSize:12,lineHeight:1.6 }}>Add your GitHub username to unlock technical profile analysis.</div></div>
              )}
            </div>
          )}
          {tab==="tasks" && (
            <div>
              <div style={{ background:`${T.primary}06`,border:`1px solid ${T.primary}15`,borderRadius:T.radiusLg,padding:16,marginBottom:14 }}><div style={{ fontSize:13,color:T.muted,lineHeight:1.7 }}>Personalised tasks based on your gap report. Complete in Arena to boost ELO.</div></div>
              {(analysis?.recommendedTasks||[]).map((task,i)=>(
                <div key={i} style={{ background:"#FAFAFA",border:"1px solid #F3F4F6",borderRadius:T.radius,padding:"14px 16px",marginBottom:10,display:"flex",gap:14 }}>
                  <div style={{ width:32,height:32,borderRadius:8,background:`${[T.green,T.primary,T.purple][i]||T.primary}15`,border:`1px solid ${[T.green,T.primary,T.purple][i]||T.primary}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>{["🥇","🥈","🥉"][i]||"🎯"}</div>
                  <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:T.text,marginBottom:4 }}>{task.title}</div><div style={{ fontSize:12,color:T.muted,lineHeight:1.5 }}>{task.description}</div>{task.eloGain&&<div style={{ fontSize:11,color:T.green,fontWeight:700,marginTop:6 }}>+{task.eloGain} ELO on completion</div>}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ height:20 }} />
        </div>
        <div style={{ padding:"16px 24px 24px",borderTop:`1px solid ${T.green}15`,flexShrink:0 }}>
          <PrimaryBtn onClick={onGoToDashboard} loading={savingResult} color="#16a34a" textColor="#020812">
            ✨ View My Aura Dashboard →
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ROLE SEARCH PICKER — typeahead over all 44 roles across all streams
// ══════════════════════════════════════════════════════════════════
// ─── Aliases: real-world job-title variations not already in keywords[] ─────
// Scoring treats these identically to keywords. Kept here (not in roleConfig.js)
// so roleConfig stays clean; can be merged into the registry in a future pass.
const ROLE_ALIASES = {
  frontend:               ["react js developer","angular js developer","vue js developer","js developer","front-end engineer","ui developer","ui/ux developer"],
  backend:                ["node developer","java backend","python backend","spring developer","flask developer","fastapi developer","server engineer"],
  fullstack:              ["mern developer","mean developer","react node developer","web application developer","full-stack engineer"],
  swe:                    ["software development engineer","sde 1","sde 2","application engineer","java engineer","python engineer","c++ developer","golang developer","rust developer"],
  data:                   ["sql analyst","excel analyst","reporting analyst","analytics specialist","business intelligence analyst"],
  data_engineer:          ["big data engineer","airflow developer","data infrastructure engineer","data platform engineer","lakehouse engineer"],
  bi_analyst:             ["reporting specialist","dashboard developer","power bi specialist","looker developer","data visualization analyst"],
  dba:                    ["sql server dba","database admin","oracle developer","postgres dba","mysql developer","db developer"],
  cyber:                  ["security analyst","infosec analyst","penetration tester","vapt engineer","ethical hacker","network security engineer","appsec engineer"],
  devops:                 ["ci/cd engineer","release engineer","build engineer","gitops engineer","cloud automation engineer"],
  sre:                    ["production engineer","cloud reliability engineer","chaos engineer","on-call engineer"],
  aws:                    ["aws developer","aws architect","aws certified developer","cloud infrastructure engineer","cloud solutions architect"],
  azure:                  ["azure architect","microsoft azure developer","azure data engineer","azure administrator","cloud engineer azure"],
  soc:                    ["siem analyst","splunk analyst","threat analyst","ioc analyst","dfir analyst","tier 1 analyst"],
  qa:                     ["software tester","test engineer","automation tester","manual tester","qe engineer","test lead"],
  ba_product:             ["business analyst it","product owner","requirements engineer","digital business analyst","it ba"],
  medical:                ["medical billing specialist","clinical coder","health information coder","aapc coder","ahima coder"],
  embedded:               ["embedded c developer","mcu developer","stm32 developer","esp32 developer","embedded linux engineer","firmware developer","bare metal developer"],
  vlsi:                   ["chip design engineer","asic design engineer","rtl design engineer","fpga developer","dv engineer","physical design engineer","digital design engineer"],
  analog_layout:          ["ic layout engineer","custom layout engineer","virtuoso layout engineer","mixed signal engineer","analog ic designer"],
  rf_engineer:            ["rf hardware engineer","antenna design engineer","microwave circuit designer","5g rf engineer","wireless hardware engineer"],
  iot_engineer:           ["iot developer","edge ai engineer","connected devices engineer","smart home engineer","iot firmware engineer"],
  telecom_engineer:       ["5g network engineer","ran engineer","lte engineer","core network engineer","telecom protocol engineer"],
  hardware_engineer:      ["pcb designer","board design engineer","schematic engineer","circuit board designer","electronics hardware engineer"],
  power_engineer:         ["electrical engineer","grid engineer","power distribution engineer","transmission engineer","protection engineer","smart grid engineer"],
  electrical_machines:    ["motor design engineer","vfd engineer","drive engineer","servo engineer","bldc engineer","ev motor engineer"],
  control_engineer:       ["plc programmer","scada developer","industrial automation engineer","process automation engineer","pid engineer"],
  power_electronics:      ["inverter engineer","ev charging engineer","battery engineer","smps design engineer","dc-dc converter engineer","ev powertrain engineer"],
  instrumentation_engineer:["field instrument engineer","calibration specialist","control and instrumentation engineer","ci engineer","process control engineer"],
  mechanical_design:      ["cad design engineer","product design engineer","solidworks designer","catia engineer","nx engineer","design draughtsman"],
  thermal_engineer:       ["hvac engineer","cfd analyst","cooling engineer","thermal analysis engineer","refrigeration engineer"],
  manufacturing_engineer: ["production planning engineer","cnc programmer","lean expert","six sigma engineer","quality manufacturing engineer"],
  fluid_mechanics_engineer:["piping engineer","hydraulic design engineer","pump engineer","turbomachinery engineer","process piping engineer"],
  structural_engineer:    ["rcc designer","steel structure engineer","building engineer","bridge designer","structural design engineer"],
  geotechnical_engineer:  ["soil investigation engineer","piling specialist","ground engineer","foundation design engineer"],
  transportation_engineer:["road design engineer","traffic planning engineer","urban mobility engineer","highway design engineer"],
  water_resources_engineer:["hydrologist","irrigation engineer","water supply engineer","drainage engineer","dam design engineer"],
  construction_engineer:  ["site manager","civil supervisor","quantity estimator","project site engineer","bq engineer"],
  civil_general:          ["civil engineering fresher","junior civil engineer","graduate civil engineer","infrastructure graduate"],
  ml_engineer:            ["ai developer","llm engineer","genai engineer","deep learning engineer","nlp developer","computer vision engineer","data scientist ai"],
  android_developer:      ["kotlin engineer","mobile app developer android","android application developer","android studio developer"],
  ios_developer:          ["swift engineer","apple ios developer","iphone app developer","swiftui developer"],
  pharmacy:               ["pharma professional","drug regulatory officer","quality assurance pharmacist","pharmaceutical analyst","pharma QA"],
  mba:                    ["mba graduate","management consultant","business development manager","operations analyst","marketing executive","finance analyst","hr executive"],
}

// ─── Arena workbench name per arenaKey ──────────────────────────────────────
const ARENA_WORKBENCH = {
  frontend: "UI / Frontend Studio", backend: "API Studio", fullstack: "Full-Stack Workbench",
  swe: "Code Arena", data: "Data Lab", data_engineer: "Pipeline Studio",
  bi_analyst: "BI Dashboard Studio", dba: "SQL Arena", cyber: "Security Lab",
  devops: "DevOps Pipeline", sre: "SRE Console", aws: "AWS Cloud Lab",
  azure: "Azure Cloud Lab", soc: "SOC Operations Center", qa: "Test Automation Studio",
  ba_product: "Product Analytics Studio", medical: "Medical Coding Suite",
  embedded: "Embedded C Workbench", vlsi: "VLSI Design Studio", analog_ic: "Analog IC Studio",
  ece: "Electronics Lab", eee: "Electrical Lab", mechanical: "Mechanical Design Studio",
  civil: "Civil Engineering Lab", ml: "ML Model Studio", android: "Android Studio",
  ios: "iOS Xcode Lab", pharmacy: "Pharmacy Practice Suite", mba: "Business Case Studio",
}

// ─── Top hiring companies per role ──────────────────────────────────────────
const ROLE_COMPANIES = {
  frontend: ["Google","Meta","Flipkart","Swiggy"], backend: ["Amazon","Microsoft","Infosys","Wipro"],
  fullstack: ["Razorpay","CRED","Zepto","Zomato"], swe: ["TCS","Infosys","Google","Amazon"],
  data: ["Accenture","Deloitte","Amazon","Mu Sigma"], data_engineer: ["Databricks","Snowflake","Amazon","Swiggy"],
  bi_analyst: ["Deloitte","Accenture","PwC","EY"], dba: ["Oracle","IBM","TCS","Infosys"],
  cyber: ["KPMG","EY","IBM Security","Palo Alto"], devops: ["Google","Microsoft","Amazon","Flipkart"],
  sre: ["Google","Meta","Netflix","Razorpay"], aws: ["Amazon","Deloitte","Wipro","HCL"],
  azure: ["Microsoft","Accenture","TCS","Infosys"], soc: ["Wipro","HCL","IBM Security","Palo Alto"],
  qa: ["Zoho","Freshworks","TCS","Capgemini"], ba_product: ["Accenture","McKinsey","Flipkart","Paytm"],
  medical: ["Optum","Cognizant","iGate","Conduent"], embedded: ["Qualcomm","NXP","STMicro","Bosch"],
  vlsi: ["Intel","Qualcomm","NVIDIA","AMD"], analog_layout: ["Texas Instruments","Qualcomm","AMD","Intel"],
  rf_engineer: ["Qualcomm","Ericsson","Nokia","Samsung"], iot_engineer: ["Bosch","Siemens","Honeywell","AWS"],
  telecom_engineer: ["Ericsson","Nokia","Samsung","BSNL"], hardware_engineer: ["Apple","Samsung","Bosch","L&T Tech"],
  power_engineer: ["BHEL","L&T Power","ABB","Siemens"], electrical_machines: ["ABB","Siemens","BHEL","Bosch"],
  control_engineer: ["Siemens","ABB","Honeywell","L&T"], power_electronics: ["Tata Power","ABB","Delta","Bosch"],
  instrumentation_engineer: ["Emerson","Honeywell","Yokogawa","ABB"], mechanical_design: ["Tata Motors","L&T","Mahindra","Bosch"],
  thermal_engineer: ["BHEL","Thermax","L&T","Voltas"], manufacturing_engineer: ["Tata Steel","Mahindra","Bosch","Honda"],
  fluid_mechanics_engineer: ["L&T Hydro","ONGC","BHEL","Tata Projects"], structural_engineer: ["L&T","Shapoorji","AECOM","WSP"],
  geotechnical_engineer: ["Arup","Mott MacDonald","RITES","NHPC"], transportation_engineer: ["L&T Infra","NHAI","AECOM","Stup"],
  water_resources_engineer: ["WAPCOS","NHPC","L&T","Jacobs"], construction_engineer: ["L&T Construction","Shapoorji","NCC","Afcons"],
  civil_general: ["L&T Construction","RITES","CPWD","NHAI"], ml_engineer: ["Google","Microsoft","Amazon","OpenAI"],
  android_developer: ["Flipkart","Swiggy","CRED","Razorpay"], ios_developer: ["Flipkart","Meesho","Apple","Goldman Sachs"],
  pharmacy: ["Sun Pharma","Dr. Reddy's","Cipla","Lupin"], mba: ["McKinsey","BCG","Deloitte","Amazon"],
}

const STREAM_BADGES = {
  IT:         { bg: "#EEF2FF", color: "#6366F1", label: "IT" },
  ECE:        { bg: "#FEF3C7", color: "#D97706", label: "ECE" },
  EEE:        { bg: "#FFF7ED", color: "#B45309", label: "EEE" },
  Mechanical: { bg: "#F0FDF4", color: "#16A34A", label: "Mech" },
  Civil:      { bg: "#FFF7ED", color: "#EA580C", label: "Civil" },
  IoT:        { bg: "#F0F9FF", color: "#0284C7", label: "IoT" },
  Pharmacy:   { bg: "#FDF4FF", color: "#9333EA", label: "Pharma" },
  MBA:        { bg: "#FFF1F2", color: "#E11D48", label: "MBA" },
  Medical:    { bg: "#F0FDF4", color: "#15803D", label: "Medical" },
}

const ROLE_SEARCH_EXAMPLES = [
  "e.g. VLSI Design Engineer",
  "e.g. Data Analyst",
  "e.g. Embedded Systems",
  "e.g. Structural Engineer",
  "e.g. Power Electronics",
  "e.g. ML Engineer",
  "e.g. IoT Developer",
  "e.g. Business Analyst",
]

function scoreRoleMatch(role, query) {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const lbl = role.label.toLowerCase()
  let best = 0
  // Label-level scoring
  if (lbl === q)               best = Math.max(best, 100)
  else if (lbl.startsWith(q)) best = Math.max(best, 88)
  else if (lbl.includes(q))   best = Math.max(best, 72)
  // Keyword-level scoring (keywords[] from registry)
  for (const kw of (role.keywords || [])) {
    const k = kw.toLowerCase()
    if (k === q)               { best = Math.max(best, 95); break }
    else if (k.startsWith(q)) best = Math.max(best, 83)
    else if (k.includes(q))   best = Math.max(best, 65)
  }
  // Alias-level scoring (same weight as keywords — avoids AI for common variants)
  for (const alias of (ROLE_ALIASES[role.id] || [])) {
    const a = alias.toLowerCase()
    if (a === q)               { best = Math.max(best, 95); break }
    else if (a.startsWith(q)) best = Math.max(best, 83)
    else if (a.includes(q))   best = Math.max(best, 65)
  }
  // Multi-token fallback: query words found in label + keywords + aliases
  if (q.length >= 4) {
    const tokens = q.split(/\s+/).filter(t => t.length >= 3)
    if (tokens.length > 0) {
      const corpus = [role.label, ...(role.keywords || []), ...(ROLE_ALIASES[role.id] || [])].join(" ").toLowerCase()
      const hit = tokens.filter(t => corpus.includes(t)).length
      if (hit > 0) best = Math.max(best, 38 + hit * 14)
    }
  }
  return best
}

// ─── College / University autocomplete ─────────────────────────────
// Typeahead against GET /api/college-directory/search (public read, no
// auth — see backend/server/routes/collegeDirectory.js). Deliberately does
// NOT force a selection: `value`/`onChange` behave exactly like a plain
// text field (same contract as the old FieldInput it replaces), so a
// student whose college isn't in the AICTE-derived dataset yet can just
// keep typing and that free text is what gets saved — no hard block.
function CollegeSearchPicker({ value, onChange, placeholder, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef(null)
  const dropRef = useRef(null)
  const debounceRef = useRef(null)
  const reqIdRef = useRef(0)

  useEffect(() => {
    const handle = e => {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  useEffect(() => {
    if (disabled) return // locked via invite link — no need to search/suggest
    const q = (value || "").trim()
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const myReqId = ++reqIdRef.current
      try {
        const res = await fetch(`${SERVER}/api/college-directory/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: AbortSignal.timeout(6000),
        })
        if (myReqId !== reqIdRef.current) return // stale response — a newer keystroke already fired
        if (res.ok) {
          const { colleges } = await res.json()
          setResults(colleges || [])
          setOpen(true)
        }
      } catch (_) {
        // Network hiccup or timeout — fail silently, free-text entry still works.
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value, disabled])

  function handleSelect(c) {
    onChange(c.name)
    setOpen(false)
    setResults([])
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return
    const max = results.length - 1
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, max)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
    if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); handleSelect(results[highlighted]) }
    if (e.key === "Escape") setOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={e => { if (!disabled) { onChange(e.target.value); setHighlighted(-1) } }}
        onKeyDown={handleKeyDown}
        onFocus={e => { if (!disabled) { e.target.style.borderColor = `${T.primary}60`; if (results.length > 0) setOpen(true) } }}
        onBlur={e => { e.target.style.borderColor = "#E8E3DA" }}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: "100%", padding: "13px 16px", borderRadius: T.radius,
          background: disabled ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.02)", border: "1px solid #E8E3DA",
          color: T.text, fontSize: 14, fontFamily: T.body, outline: "none",
          boxSizing: "border-box", transition: "border-color 0.15s",
          cursor: disabled ? "not-allowed" : "text", opacity: disabled ? 0.8 : 1,
        }}
      />
      {!disabled && open && (results.length > 0 || loading) && (
        <div
          ref={dropRef}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "#FFFFFF", border: "1px solid #E8E3DA",
            borderRadius: T.radiusLg, boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            zIndex: 1000, overflow: "hidden", maxHeight: 280, overflowY: "auto",
          }}
        >
          {results.map((c, i) => (
            <div
              key={c.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(c) }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: "10px 14px", cursor: "pointer",
                background: highlighted === i ? "#F8F7FF" : "#FFFFFF",
                borderBottom: i < results.length - 1 ? "1px solid #F5F5F5" : "none",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.name}</div>
              {(c.district || c.state) && (
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                  {[c.district, c.state].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          ))}
          {loading && results.length === 0 && (
            <div style={{ padding: "10px 14px", fontSize: 12, color: T.muted }}>Searching…</div>
          )}
          {!loading && results.length === 0 && (value || "").trim().length >= 2 && (
            <div style={{ padding: "10px 14px", fontSize: 12, color: T.muted }}>
              No match — can't find your college? Just keep typing, we'll save it as entered.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RoleSearchPicker({ value, onChange, onRoleSelect, selectedRole }) {
  const [open, setOpen]             = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [aiLoading, setAiLoading]   = useState(false)
  const [phIdx, setPhIdx]           = useState(0)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef(null)
  const dropRef  = useRef(null)
  const aiTimer  = useRef(null)

  // Rotate placeholder text so idle state feels alive
  useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i + 1) % ROLE_SEARCH_EXAMPLES.length), 2800)
    return () => clearInterval(t)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handle = e => {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target))
        setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  // Recompute suggestions on every keystroke
  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }

    const ranked = ROLE_REGISTRY
      .map(role => ({ role, score: scoreRoleMatch(role, q) }))
      .filter(({ score }) => score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ role }) => role)

    setSuggestions(ranked)
    setOpen(ranked.length > 0 || q.length >= 3) // show "Continue with..." even if no match
    setHighlighted(-1)

    // Stage 2 (AI): only fires when input > 5 chars AND local search found nothing.
    // 99% of students are served by Stage 1 (local scoring + aliases).
    // AI adds cost per call — guard it tightly.
    clearTimeout(aiTimer.current)
    if (q.length > 5 && ranked.length === 0) {
      aiTimer.current = setTimeout(() => resolveByAI(q), 700)
    }

    return () => clearTimeout(aiTimer.current)
  }, [value])

  async function resolveByAI(query) {
    setAiLoading(true)
    try {
      const res = await fetch(`${SERVER}/api/resolve-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          roles: ROLE_REGISTRY.map(r => ({ id: r.id, label: r.label, stream: r.stream, keywords: (r.keywords || []).slice(0, 6) })),
        }),
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const { roleIds } = await res.json()
        if (roleIds?.length > 0) {
          const aiRoles = roleIds.map(id => ROLE_REGISTRY.find(r => r.id === id)).filter(Boolean)
          setSuggestions(prev => {
            const seen = new Set(prev.map(r => r.id))
            return [...prev, ...aiRoles.filter(r => !seen.has(r.id))].slice(0, 6)
          })
          setOpen(true)
        }
      }
    } catch (_) { /* silent — local results are good enough */ }
    setAiLoading(false)
  }

  function handleSelect(role) {
    onChange(role.label)
    onRoleSelect(role)
    setOpen(false)
    setSuggestions([])
  }

  function handleContinueWithTyped() {
    // No canonical role match — pass null so we fall back to free-text
    onRoleSelect(null)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open) return
    const max = suggestions.length - 1
    if (e.key === "ArrowDown")  { e.preventDefault(); setHighlighted(h => Math.min(h + 1, max)) }
    if (e.key === "ArrowUp")    { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
    if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); handleSelect(suggestions[highlighted]) }
    if (e.key === "Escape")     setOpen(false)
  }

  const q = value.trim()
  const showContinue = q.length >= 3 && suggestions.length === 0 && !aiLoading
  const badge = selectedRole ? (STREAM_BADGES[selectedRole.stream] || STREAM_BADGES.IT) : null

  return (
    <div style={{ position: "relative" }}>
      {/* Input */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none", zIndex: 1 }}>
          {selectedRole ? "✅" : "🎯"}
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={e => {
            onChange(e.target.value)
            if (!e.target.value.trim()) onRoleSelect(null)
          }}
          onKeyDown={handleKeyDown}
          onFocus={e => {
            e.target.style.borderColor = "#6366F160"
            if (suggestions.length > 0 || q.length >= 3) setOpen(true)
          }}
          onBlur={e => {
            e.target.style.borderColor = selectedRole ? "#6366F1" : "#E8E3DA"
          }}
          placeholder={selectedRole ? "" : ROLE_SEARCH_EXAMPLES[phIdx]}
          style={{
            width: "100%", padding: "13px 42px 13px 44px",
            borderRadius: T.radius,
            background: T.raised,
            border: `1px solid ${selectedRole ? "#6366F1" : "#E8E3DA"}`,
            color: T.text, fontSize: 14, fontFamily: T.body,
            outline: "none", boxSizing: "border-box",
            transition: "border-color 0.15s, box-shadow 0.15s",
            boxShadow: selectedRole ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
          }}
        />
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }}>
          {aiLoading
            ? <Spinner size={16} />
            : (value.length > 0
                ? <button
                    onClick={() => { onChange(""); onRoleSelect(null); inputRef.current?.focus() }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 15, padding: 0, lineHeight: 1 }}
                  >✕</button>
                : null)
          }
        </span>
      </div>

      {/* Role preview card — shown after a canonical role is selected */}
      {selectedRole && (() => {
        const b = badge
        const workbench = ARENA_WORKBENCH[selectedRole.arenaKey] || "Arena Workbench"
        const skillCount = (selectedRole.auraSkills || []).length
        const topics = (selectedRole.interviewFocus || []).slice(0, 3).join(", ")
        const companies = ROLE_COMPANIES[selectedRole.id] || []
        return (
          <div style={{
            marginTop: 10,
            background: "rgba(99,102,241,0.05)",
            border: "1px solid rgba(99,102,241,0.20)",
            borderRadius: T.radiusLg, padding: "14px 16px",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{selectedRole.label}</span>
              <span style={{ fontSize: 10, fontWeight: 800, background: b.bg, color: b.color, padding: "2px 7px", borderRadius: 100, marginLeft: 2 }}>
                {b.label}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#6366F1", fontWeight: 600 }}>Your platform will be fully personalised</span>
            </div>
            {/* 4-column preview grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { icon: "⚔️", label: "Arena", value: workbench },
                { icon: "📊", label: "Skills tracked", value: `${skillCount} skills` },
                { icon: "🎤", label: "AI Interview", value: topics || "Role-specific questions" },
                { icon: "🏢", label: "Top hirers", value: companies.join(", ") || "Industry leaders" },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "#FFFFFF", borderRadius: T.radius,
                  border: "1px solid rgba(0,0,0,0.05)", padding: "10px 12px",
                }}>
                  <div style={{ fontSize: 11, marginBottom: 3 }}>{item.icon} <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{item.label}</span></div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Dropdown */}
      {open && (
        <div
          ref={dropRef}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: "#FFFFFF", border: "1px solid #E8E3DA",
            borderRadius: T.radiusLg, boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            zIndex: 1000, overflow: "hidden",
          }}
        >
          {suggestions.map((role, i) => {
            const b = STREAM_BADGES[role.stream] || STREAM_BADGES.IT
            return (
              <div
                key={role.id}
                onMouseDown={e => { e.preventDefault(); handleSelect(role) }}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 14px", cursor: "pointer",
                  background: highlighted === i ? "#F8F7FF" : "#FFFFFF",
                  borderBottom: i < suggestions.length - 1 ? "1px solid #F5F5F5" : "none",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, background: b.bg, color: b.color, padding: "2px 7px", borderRadius: 100, flexShrink: 0 }}>
                  {b.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{role.label}</div>
                  {role.keywords?.length > 0 && (
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {role.keywords.slice(0, 4).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* AI loading row */}
          {aiLoading && (
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, color: T.muted, fontSize: 13, borderTop: suggestions.length > 0 ? "1px solid #F5F5F5" : "none" }}>
              <Spinner size={14} />
              <span>Searching more roles…</span>
            </div>
          )}

          {/* "Continue with typed text" fallback */}
          {showContinue && !aiLoading && (
            <div
              onMouseDown={e => { e.preventDefault(); handleContinueWithTyped() }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", cursor: "pointer",
                background: "#FAFAFA",
                borderTop: suggestions.length > 0 ? "1px solid #F5F5F5" : "none",
              }}
            >
              <span style={{ fontSize: 14 }}>🔍</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Continue with "{q}"</div>
                <div style={{ fontSize: 11, color: T.muted }}>Not in our registry — we'll map to the closest available track</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN ONBOARDING COMPONENT
// KEY FIX: reads "capabilio_selected_path" (matches what LandingPage writes)
// ══════════════════════════════════════════════════════════════════
export default function Onboarding({ user, onComplete, onBack }) {
  // Keep a stable ref to onComplete so the init useEffect doesn't re-run every
  // time App.jsx re-renders (which creates a new arrow-function reference).
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  // ── All useState hooks (unconditional) ──
  const [checkingUser, setCheckingUser] = useState(true)
  const [step, setStep] = useState("path")
  const { openCheckout } = useRazorpay()
  const [path, setPath] = useState(null)
  const [planChoice, setPlanChoice] = useState(null) // set dynamically when plan screen shows
  const [savingPlan, setSavingPlan] = useState(false)
  const [animIn, setAnimIn] = useState(true)

  // Carousel (path screen)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const [carouselAnimDir, setCarouselAnimDir] = useState(null)
  const [carouselAnimating, setCarouselAnimating] = useState(false)
  const [carouselFlowStep, setCarouselFlowStep] = useState(0)

  // Student
  const [keyword, setKeyword] = useState("")
  const [selectedRole, setSelectedRole] = useState(null) // canonical {id,label,stream,arenaKey,slug,...}
  // 2026-07-31: a student who arrived via a college's /join-org/:token invite
  // link has JoinOrgPage stash {college, department, batch} into
  // sessionStorage before signup (see JoinOrgPage.jsx). Read once at mount —
  // computed with a lazy useState initializer so it's stable across
  // re-renders and doesn't re-run the sessionStorage read every render.
  const [orgJoinContext] = useState(() => {
    try {
      const raw = sessionStorage.getItem("capabilio_org_join_context")
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  // 2026-08-03: Student/Job Seeker split. Read from user_metadata (set by
  // AuthModal at signUp() time — see App.jsx) with a localStorage fallback
  // for any path that reaches here without going through signUp's metadata
  // (defensive only; the normal flow always has it in user_metadata by now).
  const [studentStage] = useState(() => {
    if (user?.user_metadata?.student_stage) return user.user_metadata.student_stage
    try { return localStorage.getItem("capabilio_student_stage") || null } catch { return null }
  })
  const collegeLocked = !!orgJoinContext?.college
  const lockedBranchCode = normalizeBranchCode(orgJoinContext?.department)
  const branchLocked = !!lockedBranchCode
  // College / branch — pre-filled from signup user_metadata OR the invite
  // link's college/department (invite takes precedence: it's the source of
  // truth for who this student actually belongs to), editable unless locked.
  const [college, setCollege] = useState(orgJoinContext?.college || user?.user_metadata?.college || "")
  const [branch,  setBranch]  = useState(lockedBranchCode || user?.user_metadata?.branch  || "")
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeText, setResumeText] = useState("")
  const [resumeStatus, setResumeStatus] = useState("idle")
  const [resumeSkills, setResumeSkills] = useState([])
  const [resumeData, setResumeData] = useState(null)

  // Authority / Institution
  const [authName, setAuthName] = useState("")
  const [authRole, setAuthRole] = useState("")
  const [authType, setAuthType] = useState("")
  const [authCompany, setAuthCompany] = useState("")
  const [authDomain, setAuthDomain] = useState("")
  const [authBio, setAuthBio] = useState("")
  const [authWebsite, setAuthWebsite] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authLinkedIn, setAuthLinkedIn] = useState("")
  const [authAnalyzing, setAuthAnalyzing] = useState(false)
  const [authError, setAuthError] = useState("")

  // Organisation-specific (institution path — new flow)
  // Pre-filled from the signup modal's user_metadata (same pattern as
  // college/branch above), since App.jsx's "Create account" modal already
  // collected institution name / admin name / city / website / org type —
  // re-asking for them here would be duplicate data entry. Still editable.
  const [orgSubType, setOrgSubType] = useState(
    (user?.user_metadata?.institution_type || "").toLowerCase() === "college" ? "college"
    : user?.user_metadata?.institution_type ? "company" : ""
  )
  const [orgInstName, setOrgInstName] = useState(user?.user_metadata?.institution_name || "")
  const [orgAdminName, setOrgAdminName] = useState(user?.user_metadata?.admin_name || user?.user_metadata?.full_name || "")
  const [orgAdminRole, setOrgAdminRole] = useState("")       // admin's job title / role
  const [orgInstType, setOrgInstType] = useState("")         // University/College/etc (college only)
  const [orgLocation, setOrgLocation] = useState(user?.user_metadata?.city || "")
  const [orgBatchSize, setOrgBatchSize] = useState("")       // annual batch size (college)
  const [orgDepts, setOrgDepts] = useState([])               // selected departments (college)
  const [orgNaacGrade, setOrgNaacGrade] = useState("")       // NAAC grade optional
  const [orgWebsite, setOrgWebsite] = useState(user?.user_metadata?.website || "")           // institution or company website
  const [orgIndustry, setOrgIndustry] = useState("")         // company industry
  const [orgCompanySize, setOrgCompanySize] = useState("")   // company headcount range
  const [orgHiringVolume, setOrgHiringVolume] = useState("") // annual hires
  const [orgCurrentATS, setOrgCurrentATS] = useState("")     // current ATS tool
  const [orgKeyRoles, setOrgKeyRoles] = useState("")         // key roles hiring for
  const [orgGstCin, setOrgGstCin] = useState("")             // GST / CIN (optional)
  const [orgSubmitting, setOrgSubmitting] = useState(false)
  const [orgError, setOrgError] = useState("")
  // Company onboarding wizard (5 steps) — additive fields, see
  // add_company_onboarding_wizard_fields migration for the matching DB columns.
  const [orgHiringGoals, setOrgHiringGoals]         = useState([]) // multi-select — Hiring Intelligence
  const [orgKeyDomains, setOrgKeyDomains]           = useState([]) // multi-select — Hiring Intelligence
  const [orgWorkEmail, setOrgWorkEmail]             = useState("") // Verification step
  const [orgSelectedModules, setOrgSelectedModules] = useState([]) // AI Workspace Setup step
  const [orgInitializing, setOrgInitializing]       = useState(false) // true while the setup checklist animates
  const [orgInitDone, setOrgInitDone]               = useState(0)     // how many setup tasks have "completed" so far
  const [orgInitError, setOrgInitError]             = useState("")

  // Quiz
  const [questions, setQuestions] = useState([])
  const [qIdx, setQIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [timeLeft, setTimeLeft] = useState(45)
  const [timedOut, setTimedOut] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState("")
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState("")
  const [savingResult, setSavingResult] = useState(false)
  // 2026-08-06: userDoc.set()/update() never throw -- they log and return a
  // boolean. This flow used to `await` them and ignore the result entirely,
  // so a total save failure (e.g. an expired/deleted auth session) was
  // completely invisible: the user sailed straight into RecoPopup and a
  // dashboard showing default/empty state, with no error anywhere. This
  // captures the real outcome so a hard failure blocks progress instead.
  const [saveError, setSaveError] = useState(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [showRecoPopup, setShowRecoPopup] = useState(false)
  const timerRef = useRef(null)

  // Professional
  const [proResumeFile, setProResumeFile] = useState(null)
  const [proResumeStatus, setProResumeStatus] = useState("idle")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [linkedinUrlStatus, setLinkedinUrlStatus] = useState("idle") // idle | fetching | done | error | limited
  const [githubUsername, setGithubUsername] = useState("")
  const [githubFetchStatus, setGithubFetchStatus] = useState("idle")
  const [githubData, setGithubData] = useState(null)
  const [proAnalyzing, setProAnalyzing] = useState(false)
  const [proAnalyzingMsg, setProAnalyzingMsg] = useState("")
  const [auraResult, setAuraResult] = useState(null)
  const [showAuraModal, setShowAuraModal] = useState(false)
  const [proError, setProError] = useState("")
  const [nameMismatch, setNameMismatch] = useState(null) // { resumeName, accountName } | null
  const [proResumeData, setProResumeData] = useState(null)
  const [linkedinData, setLinkedinData] = useState(null)

  // ── Role selection handler (student onboarding) ─────────────────
  // Maps a role's stream → the branch value expected downstream
  const STREAM_TO_BRANCH = {
    IT: "IT", ECE: "ECE", EEE: "EEE",
    Mechanical: "Mechanical", Civil: "Civil",
    IoT: "IoT", Pharmacy: "Pharmacy", MBA: "MBA",
    Medical: "Other",
  }

  const handleRoleSelect = useCallback((role) => {
    setSelectedRole(role)
    if (role) {
      setKeyword(role.label)
      // Auto-derive branch for downstream career_track_slug resolution
      const derivedBranch = STREAM_TO_BRANCH[role.stream] || branch || ""
      setBranch(prev => prev || derivedBranch) // don't override user's manual branch pick
    }
  }, [branch])

  // ── All useEffect hooks ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!user) { setCheckingUser(false); return }
      try {
        // Determine if this user has already completed onboarding.
        // Three signals checked in order of reliability:
        //   1. onboarding_complete (snake_case Supabase column)
        //   2. onboardingComplete  (camelCase — written by older code paths)
        //   3. path is set         (path is written during the save step so its presence
        //                           is the most reliable indicator — the nav system also
        //                           depends on this column so it definitely exists)
        const profile = await userDoc.get(user.id)
        // Mirror App.jsx: only trust the explicit completion flag, never path alone.
        const alreadyDone =
          profile &&
          (
            profile.onboarding_complete === true ||
            profile.onboardingComplete === true
          )
        // Use the ref so we always call the latest onComplete without making it a dep.
        if (alreadyDone) { onCompleteRef.current?.(); return }
      } catch {}

      // Check if the user already has a path from signup (stored in user_metadata).
      // If so, skip the path-selection screen and jump directly to that path's first step.
      const signupPath = user?.user_metadata?.path || null
      // Institution signups already picked College vs Company/Government/NGO
      // in the "Create account" modal (user_metadata.institution_type) — skip
      // the redundant "what type of org" screen and go straight to the
      // matching detail step, pre-filled from what they already entered.
      const signupInstType = (user?.user_metadata?.institution_type || "").toLowerCase()
      const institutionFirstStep = signupInstType === "college" ? "org-college"
        : signupInstType ? "org-company-workspace"
        : "org-type"
      const PATH_FIRST_STEP = {
        student:      "search",
        professional: "professional",
        authority:    "authority",
        institution:  institutionFirstStep,
      }
      if (signupPath && PATH_FIRST_STEP[signupPath]) {
        setPath(signupPath)
        setStep(PATH_FIRST_STEP[signupPath])
      } else {
        setStep("path")
      }
      // Clear localStorage path flags — path is now in user_metadata
      localStorage.removeItem("capabilio_selected_path")
      localStorage.removeItem("preSelectedPath")
      localStorage.removeItem("capabilio_student_stage")
      // orgJoinContext (college/branch lock) was already read into state via
      // the lazy useState initializer above — safe to clear now so a second,
      // unrelated signup later in the same browser session doesn't inherit it.
      try { sessionStorage.removeItem("capabilio_org_join_context") } catch {}
      setCheckingUser(false)
    }
    init()
    // Intentionally only depends on user?.id — onComplete is accessed via ref.
    // If onComplete were in deps, every App.jsx re-render (e.g. from a Supabase
    // real-time update) would create a new arrow-function reference and re-fire
    // this effect, resetting step→"path" while the user is mid-assessment.
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carousel auto-advance
  useEffect(() => {
    const t = setInterval(() => setCarouselFlowStep(s => (s + 1) % 5), 2000)
    return () => clearInterval(t)
  }, [])

  // Quiz timer
  const TIMER = 45
  const TARGET_Q_COUNT = 25

  useEffect(() => {
    if (step !== "quiz" || selected !== null || timedOut) return
    setTimeLeft(TIMER)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setTimedOut(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [qIdx, step, selected, timedOut])

  useEffect(() => {
    if (timedOut && step === "quiz") setTimeout(() => advanceQ(null), 900)
  }, [timedOut, step])

  // ── Transition helper ───────────────────────────────────────────
  const transition = (toStep) => {
    setAnimIn(false)
    setTimeout(() => { setStep(toStep); setAnimIn(true) }, 260)
  }
  const screen = { opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.26s ease, transform 0.26s ease" }

  const toIdx = (c) => typeof c === "number" ? c : ({ A:0,B:1,C:2,D:3,a:0,b:1,c:2,d:3 })[c] ?? 0

  // ── File upload handlers (unchanged logic) ──────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setResumeFile(file)
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        setResumeStatus("reading")
        const fd = new FormData(); fd.append("resume", file)
        const res = await fetch(`${SERVER}/api/extract-pdf`, { method: "POST", body: fd })
        const data = await res.json()
        // Accept success if: text is long enough, OR Gemini extracted name/skills/experience
        const hasContent = res.ok && (
          data.text?.length > 50 ||
          data.name?.length > 0  ||
          data.skills?.length > 0 ||
          data.experience?.length > 0
        )
        if (hasContent) {
          setResumeText(data.text || ""); setResumeSkills(data.skills || [])
          setResumeData({ name:data.name||"", email:data.email||"", title:data.title||"", summary:data.summary||"", skills:data.skills||[], experience:data.experience||[], education:data.education||[], certifications:data.certifications||[], keywords:data.keywords||[] })
          setResumeStatus("done")
        } else { setResumeText("Resume uploaded."); setResumeStatus("error") }
      } catch { setResumeText("Resume uploaded."); setResumeStatus("error") }
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => { const txt = ev.target.result; if (txt?.length > 50) { setResumeText(txt.slice(0,4000)); setResumeStatus("done") } else { setResumeText(`Uploaded: ${file.name}`); setResumeStatus("error") } }
    reader.onerror = () => { setResumeText(`Uploaded: ${file.name}`); setResumeStatus("error") }
    reader.readAsText(file)
  }

  const handleProResumeUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setProResumeFile(file); setProResumeStatus("reading")
    try {
      const fd = new FormData(); fd.append("resume", file)
      const res = await fetch(`${SERVER}/api/extract-pdf`, { method: "POST", body: fd })
      const data = await res.json()
      const hasContent = res.ok && (
        data.text?.length > 50 ||
        data.name?.length > 0  ||
        data.skills?.length > 0 ||
        data.experience?.length > 0
      )
      if (hasContent) {
        setProResumeData({ name:data.name||"", email:data.email||"", title:data.title||"", summary:data.summary||"", skills:data.skills||[], experience:data.experience||[], education:data.education||[], certifications:data.certifications||[], keywords:data.keywords||[], rawText:data.text||"" })
        setProResumeStatus("done")
      } else { setProResumeStatus("error") }
    } catch { setProResumeStatus("error") }
  }

  const fetchLinkedinFromUrl = async () => {
    const url = linkedinUrl.trim()
    if (!url) return
    // Normalise: accept full URL or just the /in/username part
    const match = url.match(/linkedin\.com\/in\/([\w%-]+)/i)
    const cleanUrl = match ? `https://www.linkedin.com/in/${match[1]}` : url
    setLinkedinUrlStatus("fetching")
    setLinkedinData(null)
    try {
      const res = await fetch(`${SERVER}/api/extract-linkedin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      })
      const data = await res.json()
      if (res.ok && (data.name || data.title || data.skills?.length)) {
        setLinkedinData({
          name:           data.name           || "",
          title:          data.title          || data.headline || "",
          summary:        data.summary        || data.about    || "",
          skills:         data.skills         || [],
          experience:     data.experience     || [],
          education:      data.education      || [],
          certifications: data.certifications || [],
          location:       data.location       || "",
          connections:    data.connections    || null,
          rawText:        data.rawText        || "",
        })
        setLinkedinUrlStatus("done")
      } else if (data.partial) {
        // Server could fetch the page but extraction was limited (LinkedIn login wall)
        setLinkedinData({ name: data.name || "", title: data.title || "", summary: "", skills: data.skills || [], experience: [], education: [], certifications: [], rawText: "" })
        setLinkedinUrlStatus("limited")
      } else {
        setLinkedinUrlStatus("error")
      }
    } catch {
      setLinkedinUrlStatus("error")
    }
  }

  const fetchGitHub = async (username) => {
    if (!username.trim()) return
    setGithubFetchStatus("fetching")
    try {
      const [ur, rr] = await Promise.all([
        fetch(`https://api.github.com/users/${username.trim()}`),
        fetch(`https://api.github.com/users/${username.trim()}/repos?sort=stars&per_page=20`),
      ])
      if (!ur.ok) { setGithubFetchStatus("error"); return }
      const ud = await ur.json(); const rd = rr.ok ? await rr.json() : []
      const lc = {}; let trl = 0
      rd.forEach(r => { if (r.language) { lc[r.language] = (lc[r.language]||0)+1; trl++ } })
      const langs = Object.entries(lc).map(([name,count])=>({ name, pct:Math.round((count/trl)*100) })).sort((a,b)=>b.pct-a.pct).slice(0,8)
      const ts = rd.reduce((s,r)=>s+(r.stargazers_count||0),0)
      const tf = rd.reduce((s,r)=>s+(r.forks_count||0),0)
      const topRepos = rd.sort((a,b)=>(b.stargazers_count||0)-(a.stargazers_count||0)).slice(0,4).map(r=>({ name:r.name, description:r.description, stars:r.stargazers_count, language:r.language, updatedAt:r.updated_at }))
      setGithubData({ username:ud.login, publicRepos:ud.public_repos, followers:ud.followers, totalStars:ts, totalForks:tf, topLanguage:langs[0]?.name||"—", languages:langs, topRepos, activeDays:rd.filter(r=>(Date.now()-new Date(r.pushed_at).getTime())<90*24*60*60*1000).length, bio:ud.bio, location:ud.location, company:ud.company })
      setGithubFetchStatus("done")
    } catch { setGithubFetchStatus("error") }
  }

  // ── Professional analysis (unchanged logic) ─────────────────────
  const runProfessionalAnalysis = async () => {
    const linkedinOk = linkedinUrlStatus==="done"||linkedinUrlStatus==="limited"
    const hasAny = proResumeStatus==="done"||linkedinOk||githubFetchStatus==="done"
    if (!hasAny) { setProError("Please provide at least one input — resume, LinkedIn URL, or GitHub username."); return }

    // Identity check: only meaningful when a resume was actually uploaded —
    // a LinkedIn-only or GitHub-only flow has no "wrong person's document"
    // risk. Runs before any AI scoring call so a mismatched resume is never
    // silently scored (see resumeNameMatchesAccount above for the rationale).
    if (proResumeData?.name) {
      const accountIdentities = [user.user_metadata?.full_name, user.user_metadata?.name, user.email?.split("@")[0]]
      if (!resumeNameMatchesAccount(proResumeData.name, accountIdentities)) {
        setNameMismatch({ resumeName: proResumeData.name, accountName: getUserDisplayName() })
        return
      }
    }

    setProError(""); setProAnalyzing(true); setProAnalyzingMsg("🔍 Merging your profile data…")
    const mergedSkills = normalizeSkills([...(proResumeData?.skills||[]),...(linkedinData?.skills||[]),...(githubData?.languages?.map(l=>l.name)||[])])
    const mergedExp = [...(proResumeData?.experience||[]),...(linkedinData?.experience||[]).filter(le=>!(proResumeData?.experience||[]).some(re=>re.company===le.company))]
    const mergedData = { name:proResumeData?.name||linkedinData?.name||user.user_metadata?.full_name||user.user_metadata?.name||"", currentTitle:proResumeData?.title||linkedinData?.title||"", summary:linkedinData?.summary||proResumeData?.summary||"", skills:mergedSkills, experience:mergedExp, education:proResumeData?.education||linkedinData?.education||[], certifications:[...(proResumeData?.certifications||[]),...(linkedinData?.certifications||[])], yearsExperience:mergedExp.length>0?`${mergedExp.length}+`:"—" }
    setProAnalyzingMsg("⚙️ Scoring your profile…")
    try {
      const res = await fetch(`${SERVER}/api/analyse-professional-profile`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ extractedData:mergedData, githubData:githubData||null, resumeText:proResumeData?.rawText?.slice(0,1500)||"", linkedinText:linkedinData?.rawText?.slice(0,1500)||"" }) })
      if (!res.ok) throw new Error("Analysis failed")
      const data = await res.json()
      setAuraResult({ profileScore:data.profileScore, radarData:data.radarData||[], analysis:{ ...(data.analysis||{}), eloRating:getProfessionalInitialElo({ suggestedElo:data?.analysis?.eloRating, auraScore:data?.profileScore?.total }) }, githubData:githubData||null, extractedData:mergedData })
      setProAnalyzing(false); setShowAuraModal(true)
    } catch {
      setProAnalyzingMsg("📊 Calculating Aura score…")
      await new Promise(r=>setTimeout(r,1200))
      const liOk = linkedinUrlStatus==="done"||linkedinUrlStatus==="limited"
      const completeness = Math.min(20,(proResumeStatus==="done"?8:0)+(liOk?7:0)+(githubFetchStatus==="done"?5:0))
      const experienceDepth = Math.min(25, mergedExp.length*5)
      const technicalBreadth = Math.min(20, Math.round(mergedSkills.length*1.2))
      const projectQuality = Math.min(20,(githubData?.totalStars||0)>10?18:(githubData?.topRepos?.length||0)*4)
      const marketReadiness = Math.min(15, Math.round((completeness+experienceDepth)/4))
      const total = completeness+experienceDepth+technicalBreadth+projectQuality+marketReadiness
      setAuraResult({
        profileScore:{ completeness,experienceDepth,technicalBreadth,projectQuality,marketReadiness,total },
        radarData:[{ label:"Completeness",value:Math.round((completeness/20)*100) },{ label:"Experience",value:Math.round((experienceDepth/25)*100) },{ label:"Tech Breadth",value:Math.round((technicalBreadth/20)*100) },{ label:"Projects",value:Math.round((projectQuality/20)*100) },{ label:"Market Fit",value:Math.round((marketReadiness/15)*100) }],
        analysis:{ eloRating:getProfessionalInitialElo({ auraScore:total }), jobReadiness:Math.min(95,total+10), summary:`Your profile shows ${mergedExp.length} experience entries and ${mergedSkills.length} detected skills. Complete Arena tasks to boost your score.`, strengths:[...(mergedExp.length>2?[`${mergedExp.length} professional experiences`]:[]),(mergedSkills.length>8?`${mergedSkills.length} detected technologies`:null),"Completed Capabilio profile setup"].filter(Boolean).slice(0,3), criticalGaps:[...(!githubFetchStatus==="done"?["No GitHub connected"]:[]),(mergedSkills.length<5?"Limited skills detected":null),(mergedExp.length<2?"Limited experience entries":null)].filter(Boolean).slice(0,3), quickWins:["Complete 3 Arena challenges this week","Add project descriptions to GitHub READMEs","Connect GitHub to show technical activity"], recommendedTasks:[{ title:"Build a REST API project",description:"Demonstrate backend skills with a documented endpoint",eloGain:45 },{ title:"System Design challenge",description:"Show architectural thinking",eloGain:60 },{ title:"DSA: Arrays & Strings",description:"Sharpen fundamentals for interviews",eloGain:30 }] },
        githubData:githubData||null, extractedData:mergedData,
      })
      setProAnalyzing(false); setShowAuraModal(true)
    }
  }

  // ── Strip any "A) " / "A. " / "1) " prefixes the model may still add ───────
  const sanitizeOptions = (opts) => {
    if (!Array.isArray(opts)) return opts
    return opts.map(o => String(o).replace(/^[A-Ea-e1-5][).:\s]+\s*/, "").trim()).filter(Boolean)
  }
  const sanitizeQuestions = (qs) => qs.map(q => ({
    ...q,
    options: sanitizeOptions(q.options),
  }))

  // ── MCQ generation ───────────────────────────────────────────────
  const fetchMCQBatch = async (count, topicsHint = "") => {
    const res = await fetch(`${SERVER}/api/generate-mcq`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ jobTitle:keyword, branch, count, difficulty:"Beginner", skills:resumeData?.skills||resumeSkills||[], resumeContext:resumeText, topicsHint, resumeTitle:resumeData?.title||"", resumeKeywords:resumeData?.keywords||[], resumeSummary:resumeData?.summary||"", resumeExp:(resumeData?.experience||[]).map(e=>e.role||e.title||"").filter(Boolean).join(", "), assessmentMode:"student-foundation", audience:"entry-level student", questionStyle:"fundamentals, beginner practical, interview basics", avoidAdvanced:true, isResumeBased:!!resumeData }) })
    if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d?.error?.message||`Server error ${res.status}`) }
    const data = await res.json()
    return sanitizeQuestions(data.questions || [])
  }

  const generateMCQs = async () => {
    if (!keyword.trim()) return
    setApiError(""); transition("loading"); setLoadingMsg("🧠 Analysing your input…")
    try {
      setLoadingMsg(`⚡ Generating ${TARGET_Q_COUNT} personalised questions…`)
      let qs = await fetchMCQBatch(TARGET_Q_COUNT)
      if (qs.length < TARGET_Q_COUNT) {
        try { const b = await fetchMCQBatch(TARGET_Q_COUNT-qs.length, "different beginner topics, core concepts"); qs = [...qs,...b] } catch {}
      }
      const seen = new Set()
      qs = qs.filter(q => { const k = q.question?.trim().toLowerCase(); if (!k||seen.has(k)) return false; seen.add(k); return true })
      if (!qs.length) throw new Error("No questions returned from AI")
      setQuestions(qs); setQIdx(0); setAnswers([]); setSelected(null); setTimedOut(false)
      transition("quiz")
    } catch (err) { setApiError(`${err.message}. Make sure your server is running.`); transition("search") }
  }

  const advanceQ = (sel) => {
    clearInterval(timerRef.current)
    const na = [...answers, sel]; setAnswers(na); setSelected(null); setTimedOut(false)
    if (qIdx+1 < questions.length) {
      setAnimIn(false); setTimeout(()=>{ setQIdx(qIdx+1); setAnimIn(true) },250)
    } else { generateResult(na) }
  }

  const handleAnswer = (i) => {
    if (selected!==null||timedOut) return
    clearInterval(timerRef.current); setSelected(i)
    setTimeout(()=>advanceQ(i),900)
  }

  const generateResult = async (finalAnswers) => {
    transition("loading"); setLoadingMsg("📊 Calculating your skill breakdown…")
    const ci = (c) => typeof c==="number"?c:({ A:0,B:1,C:2,D:3,a:0,b:1,c:2,d:3 })[c]??0
    const score = finalAnswers.filter((a,i)=>a===ci(questions[i]?.correct)).length
    const total = questions.length
    const catMap = {}
    questions.forEach((q,i)=>{ const cat = q.category&&q.category!=="undefined"?q.category:"General"; if(!catMap[cat]) catMap[cat]={correct:0,total:0}; catMap[cat].total++; if(finalAnswers[i]===ci(q.correct)) catMap[cat].correct++ })
    // Per-skill value is confidence-adjusted (not a raw correct/total%) — a
    // category with only 1-2 questions answered shouldn't render as "100%
    // mastered". See lib/skillScore.js. This value is what gets persisted
    // into profiles.skillGraph on "Go to Dashboard" below, so every later
    // consumer (Aura dashboard/skills tab, Strengths cards, Practice cards)
    // inherits the adjusted score for free — no raw count survives past here.
    const radarData = Object.entries(catMap).filter(([l])=>l&&l!=="undefined"&&l.trim()).map(([label,v])=>({ label, value:confidenceAdjustedScore(v.correct, v.total) }))
    setLoadingMsg("🤖 AI is analysing your performance…")
    try {
      const aiRes = await fetch(`${SERVER}/api/analyse-assessment`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ keyword, score, total, pct:Math.round((score/total)*100), radarData, path, resumeContext:resumeText.slice(0,500) }) })
      const aiData = await aiRes.json()
      const rawA = aiData.analysis || {}
      setResult({ radarData, analysis:{ ...rawA, eloRating:getStudentDisplayElo({ score, total }) }, score, total, finalAnswers })
      setShowResultModal(true); transition("quiz")
    } catch {
      const pct = Math.round((score/total)*100)
      const fb = { jobReadiness:pct, eloRating:getStudentDisplayElo({ score, total }), strengths:radarData.filter(d=>d.value>=60).map(d=>`Strong in ${d.label}`).slice(0,3), weakAreas:radarData.filter(d=>d.value<60).map(d=>`Improve ${d.label}`).slice(0,3), resources:[{ title:`${keyword} Official Documentation`,type:"Reference",reason:"Primary source" },{ title:"Hands-on Practice Projects",type:"Practice",reason:"Build real experience" }], summary:`You scored ${score}/${total} (${pct}%) on ${keyword}. Focus on beginner Arena tasks to build your ELO.` }
      setResult({ radarData, analysis:fb, score, total, finalAnswers })
      setShowResultModal(true); transition("quiz")
    }
  }

  // ── Save handlers ────────────────────────────────────────────────
  const fileToBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file)
  })

  // ── Helper: display name from Supabase user (works for both email + Google OAuth) ──
  const getUserDisplayName = () =>
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "user"

  const handleGoToDashboard = async () => {
    if (!result||savingResult) return
    setSavingResult(true)
    setSaveError(null)
    try {
      const username = slugifyUsername(getUserDisplayName())
      let resumeBase64 = ""
      if (resumeFile && resumeFile.size < 3 * 1024 * 1024) {
        try { resumeBase64 = await fileToBase64(resumeFile) } catch {}
      }
      const payload = buildUserSavePayload({ path:"student", user: { ...user, displayName: getUserDisplayName() }, username, data:{ keyword, college, branch, result, resumeData, resumeFileObj: resumeFile, resumeBase64, selectedRole, studentStage } })
      // ✅ Use Supabase via userDoc (user.id, not user.uid)
      // ⚠️  Do NOT set onboarding_complete here — that would fire the real-time
      // listener in App.jsx and unmount Onboarding before the plan step shows.
      // onComplete() (called after plan confirmation) stamps the flag.
      const setOk = await userDoc.set(user.id, { ...payload, onboarding_complete: false })

      // ── Guaranteed override: the handle_new_user trigger creates profiles with
      // elo_rating=800 and path='professional'. Always explicitly overwrite the
      // critical fields after the main upsert, even if it partially failed.
      const guaranteedElo = getStudentDisplayElo({ score: result?.score || 0, total: result?.total || 25 })
      const updateOk = await userDoc.update(user.id, {
        eloRating: guaranteedElo,
        path:      "student",
        keyword:   keyword || payload.keyword || "",
      })

      // Both userDoc.set() and userDoc.update() log their own errors but
      // never throw -- they return false on failure. If BOTH failed, nothing
      // at all was persisted (e.g. an expired/deleted auth session, or an
      // RLS rejection) and it would be wrong to let the user proceed into a
      // dashboard that has no real data behind it. A partial success (one
      // of the two went through) still gets the critical fields written, so
      // only a total failure blocks here.
      if (!setOk && !updateOk) {
        setSaveError("We couldn't save your assessment — your session may have expired. Please refresh the page and log in again, then retry.")
        setSavingResult(false)
        return
      }

      // College Path auto-alignment (added 2026-07-31): server-verified,
      // best-effort attempt to link this student to their college's
      // dashboard if that college is a registered Capabilio institution.
      // Fire-and-forget by design — same "fail silently, never block
      // onboarding" posture as the college-directory typeahead above. A
      // student whose college isn't registered yet (the common case) simply
      // stays unlinked; nothing about the existing save above changes.
      // 2026-08-03: skip entirely for job seekers — self-link matches
      // profile.college against a registered institution and creates a
      // pending_admin institution_students row, which only makes sense for
      // someone actually currently enrolled there.
      if (studentStage !== "job_seeker") collegeApi.selfLink().catch(() => {})
    } catch (err) {
      console.warn("Profile save failed:", err)
      setSaveError("Something went wrong saving your assessment. Please try again.")
      setSavingResult(false)
      return
    }
    setSavingResult(false)
    // Show RecoPopup only AFTER save is complete — prevents it appearing while
    // the spinner is still running (race condition fix).
    // setStep("plan") is called by RecoPopup's "Continue to Dashboard →" button.
    setShowRecoPopup(true)
  }

  const handleProGoToDashboard = async () => {
    if (!auraResult||savingResult) return
    setSavingResult(true)
    try {
      // BUG FIX: this previously preferred auraResult.extractedData.name (the
      // RESUME's claimed name, which can be a merge of resume+LinkedIn text)
      // over the actual signed-in account's own name — so a resume uploaded
      // under the wrong account minted a username off the resume's identity,
      // not the account holder's. The username must always identify the
      // account, never the uploaded document.
      const username = slugifyUsername(getUserDisplayName())
      let proResumeBase64 = ""
      if (proResumeFile && proResumeFile.size < 3 * 1024 * 1024) {
        try { proResumeBase64 = await fileToBase64(proResumeFile) } catch {}
      }
      const payload = buildUserSavePayload({ path:"professional", user: { ...user, displayName: getUserDisplayName() }, username, data:{ auraResult, githubUsername, proResumeFileObj: proResumeFile, proResumeBase64 } })
      // ✅ Use Supabase via userDoc
      // ⚠️  Do NOT set onboarding_complete here — plan step must show first.
      await userDoc.set(user.id, { ...payload, onboarding_complete: false })

      // ── Guaranteed override: ensures path='professional' and correct ELO are
      // written even if the main upsert silently failed (unknown columns, etc.).
      // Mirrors the same safety pattern used in handleGoToDashboard (student path).
      const guaranteedElo = getProfessionalInitialElo({
        suggestedElo: auraResult?.analysis?.eloRating,
        auraScore:    auraResult?.profileScore?.total,
      })
      await userDoc.update(user.id, {
        path:     "professional",
        eloRating: guaranteedElo,
        keyword:  auraResult?.analysis?.domain || auraResult?.extractedData?.title || payload.keyword || "",
      })
      // Professional's free tier is a real, currently-available plan (see
      // config/plans.js) — no pricing screen needed to grant it. Paid tiers
      // (orbit_pro/orbit_elite) remain available later via Settings/upgrade.
      await userDoc.update(user.id, {
        subscription: "free",
        subscriptionCycleStart: new Date().toISOString(),
      })
    } catch (err) { console.warn("Profile save failed:", err) }
    setSavingResult(false)
    onComplete?.("professional")
  }

  const handleAuthSubmit = async () => {
    if (!(authName.trim()&&authRole.trim()&&authType&&authDomain&&authBio.trim().length>=50)) return
    setAuthAnalyzing(true); setAuthError("")
    try {
      const username = slugifyUsername(getUserDisplayName() || authName)
      const payload = buildUserSavePayload({ path, user: { ...user, displayName: getUserDisplayName() }, username, data:{ authName,authRole,authType,authCompany,authDomain,authBio,authWebsite,authEmail,authLinkedIn } })
      // ✅ Use Supabase via userDoc
      // ⚠️  Do NOT set onboarding_complete here — plan step must show first.
      await userDoc.set(user.id, { ...payload, onboarding_complete: false })
      setAuthAnalyzing(false)
      // Route to path-specific preview before plan
      if (path === "institution") setStep("org-preview")
      else setStep("exec-preview")
    } catch { setAuthError("Failed to create profile. Please try again."); setAuthAnalyzing(false) }
  }

  const handleOrgSubmit = async () => {
    setOrgSubmitting(true); setOrgError("")
    try {
      const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || orgAdminName || user?.email?.split("@")[0] || ""
      const username = slugifyUsername(displayName || orgInstName)
      const payload = {
        displayName, email: user?.email || "", username,
        path: "institution", accountType: "institution",
        org_type: orgSubType,
        org_name: orgInstName,
        org_admin_name: orgAdminName,
        org_admin_role: orgAdminRole,
        org_inst_type: orgInstType,
        org_location: orgLocation,
        org_batch_size: orgBatchSize,
        org_departments: orgDepts,
        org_naac_grade: orgNaacGrade,
        org_website: orgWebsite,
        org_industry: orgIndustry,
        org_company_size: orgCompanySize,
        org_hiring_volume: orgHiringVolume,
        org_current_ats: orgCurrentATS,
        org_key_roles: orgKeyRoles,
        org_gst_cin: orgGstCin,
        authorityType: orgSubType === "college" ? "College" : "Company",
        verifiedAuthority: false, verificationStatus: "pending",
        followers: 0, following: 0, posts: 0,
        onboardingComplete: false, onboarding_complete: false,
        createdAt: new Date().toISOString(),
      }
      await userDoc.set(user.id, payload)
      setOrgSubmitting(false)
      transition("org-preview")
    } catch (err) {
      console.warn("Org profile save failed:", err)
      setOrgError("Failed to save profile. Please try again.")
      setOrgSubmitting(false)
    }
  }

  // Company onboarding wizard (5 steps) — separate from handleOrgSubmit
  // deliberately, so the college flow (org-college → handleOrgSubmit →
  // org-preview) is never touched by this redesign. Called from the "AI
  // Workspace Setup" step once modules are picked; does the real profile
  // write, then plays a short checklist animation before landing on the new
  // company-only Welcome Dashboard step.
  const COMPANY_SETUP_TASKS = [
    "Creating your company profile",
    "Applying your hiring domains",
    "Configuring selected modules",
    "Preparing your Talent Network access",
  ]

  const handleCompanySubmit = async () => {
    setOrgInitError(""); setOrgInitDone(0); setOrgInitializing(true)
    try {
      const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || orgAdminName || user?.email?.split("@")[0] || ""
      const username = slugifyUsername(displayName || orgInstName)
      const payload = {
        displayName, email: user?.email || "", username,
        path: "institution", accountType: "institution",
        org_type: "company",
        org_name: orgInstName,
        org_website: orgWebsite,
        org_industry: orgIndustry,
        org_company_size: orgCompanySize,
        org_hiring_goals: orgHiringGoals,
        org_hiring_volume: orgHiringVolume,
        org_key_domains: orgKeyDomains,
        org_key_roles: orgKeyRoles,
        org_work_email: orgWorkEmail.trim(),
        org_admin_name: orgAdminName,
        org_admin_role: orgAdminRole,
        org_gst_cin: orgGstCin,
        org_selected_modules: orgSelectedModules,
        authorityType: "Company",
        verifiedAuthority: false, verificationStatus: "pending",
        followers: 0, following: 0, posts: 0,
        onboardingComplete: false, onboarding_complete: false,
        createdAt: new Date().toISOString(),
      }
      // The real save happens immediately — the staged checklist below is a
      // genuine progress indicator for this one write, not a fake delay
      // pretending to be a bigger job. Each "task" completing on the screen
      // corresponds to a fraction of the same completed save.
      await userDoc.set(user.id, payload)

      for (let i = 0; i < COMPANY_SETUP_TASKS.length; i++) {
        await new Promise(r => setTimeout(r, 380))
        setOrgInitDone(i + 1)
      }
      await new Promise(r => setTimeout(r, 250))
      setOrgInitializing(false)
      transition("org-company-welcome")
    } catch (err) {
      console.warn("Company profile save failed:", err)
      setOrgInitError("Failed to save your workspace. Please try again.")
      setOrgInitializing(false)
    }
  }

  // Institution's only plan is the free "org_trial" tier (see config/plans.js —
  // no paid institution plans exist yet), so both the college (org-preview)
  // and company (Welcome Dashboard) completion buttons can finish onboarding
  // directly instead of routing through the pricing "plan" step. Shared by
  // both org sub-types since there's exactly one plan either way.
  const handleEnterInstitutionWorkspace = async () => {
    setOrgSubmitting(true)
    try {
      if (user?.id) {
        await userDoc.update(user.id, {
          subscription: "org_trial",
          subscriptionCycleStart: new Date().toISOString(),
          path: "institution",
        })
      }
    } catch (err) { console.warn("Plan save failed:", err) }
    setOrgSubmitting(false)
    onComplete?.("institution")
  }

  // Authority/Executive has no free tier (cheapest paid plan is "authority" at
  // ₹1,499/mo) — per product decision, onboarding grants that lowest tier
  // unbilled rather than showing a pricing screen up front. Real billing can
  // be introduced later via Settings when the business is ready to charge.
  const handleEnterAuthorityWorkspace = async () => {
    setSavingPlan(true)
    try {
      if (user?.id) {
        await userDoc.update(user.id, {
          subscription: "authority",
          subscriptionCycleStart: new Date().toISOString(),
          path: "authority",
        })
      }
    } catch (err) { console.warn("Plan save failed:", err) }
    setSavingPlan(false)
    onComplete?.("authority")
  }

  // ── Plan selection handler ───────────────────────────────────────
  const handlePlanConfirm = async () => {
    // Free plan — save directly and proceed
    // Free plans: "free" (student/professional) or "org_trial" (institution) or any price=0 plan
    const planIsFree = planChoice === "free" || PLANS[planChoice]?.price === 0
    if (planIsFree) {
      setSavingPlan(true)
      try {
        if (user?.id) {
          // ✅ Use Supabase userDoc.update (profile already created in previous step)
          // Also re-stamp 'path' here so onComplete()'s fresh read always finds it,
          // even if the earlier profile save partially failed.
          await userDoc.update(user.id, {
            subscription: planChoice || "free",
            subscriptionCycleStart: new Date().toISOString(),
            path: path || "student",
            // onboarding_complete is stamped by onComplete() in App.jsx AFTER this runs
          })
        }
      } catch (err) { console.warn("Plan save failed:", err) }
      setSavingPlan(false); onComplete?.(path || "student")
      return
    }

    // Paid plan — go through Razorpay
    setSavingPlan(true)
    try {
      // Check for college invite discount
      const inviteCtx       = getInviteContext()
      const basePlanPrice   = PLANS[planChoice]?.price ?? 0
      const effectiveAmount = inviteCtx?.discount_pct
        ? applyDiscount(basePlanPrice, inviteCtx.discount_pct) * 100  // Razorpay expects paise
        : null  // null = let server compute from plan (default behaviour)

      const orderRes = await fetch(`${SERVER}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId:         planChoice,
          uid:            user?.id,
          // Pass discount context so server can verify & apply it
          ...(inviteCtx ? {
            invite_code_id:    inviteCtx.invite_code_id,
            institution_id:    inviteCtx.institution_id,
            discount_pct:      inviteCtx.discount_pct,
            discounted_amount: effectiveAmount,
          } : {}),
        }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok || !order.order_id) throw new Error(order.error || "Order creation failed")

      setSavingPlan(false)
      openCheckout({
        planId:    planChoice,
        amount:    order.amount,   // server is source of truth for amount
        orderId:   order.order_id,
        currency:  order.currency,
        userEmail: user?.email || "",
        userName:  user?.user_metadata?.full_name || user?.user_metadata?.name || "",
        userPhone: user?.phone || "",
        onSuccess: async () => {
          // Re-stamp path so onComplete()'s fresh read always finds the correct value
          if (user?.id && path) {
            await userDoc.update(user.id, { path }).catch(() => {})
          }
          // Clear invite context after successful payment — one-time use
          sessionStorage.removeItem("capabilio_invite")
          onComplete?.(path || "student")
        },
        onError:   (msg) => {
          // If payment cancelled, let user stay on plan step to retry or choose free
          if (msg !== "Payment cancelled.") console.warn("Payment error:", msg)
        },
      })
    } catch (err) {
      console.warn("Plan payment failed", err)
      setSavingPlan(false)
    }
  }

  // ── Loading screen ───────────────────────────────────────────────
  if (checkingUser) {
    return (
      <Screen>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:16 }}>
          <Spinner size={32} />
          <div style={{ fontFamily:T.display,fontSize:14,color:T.primary,letterSpacing:1 }}>LOADING…</div>
        </div>
      </Screen>
    )
  }

  // ══ SCREEN: PLAN SELECTION ════════════════════════════════════════
  if (step === "plan") {
    // Read invite context — set by JoinPage when student arrived via /join/:code
    const inviteCtx  = getInviteContext()
    const pathPlans  = getPlansByPathWithDiscount(path, inviteCtx)
    const defaultId  = getDefaultPlanForPath(path)
    const activePlan = planChoice ?? defaultId
    if (!planChoice) setPlanChoice(defaultId)

    const pathHeadings = {
      student:      {
        title: inviteCtx ? `Welcome, ${inviteCtx.institution_label} student!` : "Start your career journey",
        sub:   inviteCtx ? `Exclusive college pricing active — ${inviteCtx.discount_pct}% off all paid plans.` : "Free forever — upgrade anytime as you grow.",
      },
      professional: { title: "Unlock your market value", sub: "Full Orbit intelligence. Cancel whenever you like." },
      authority:    { title: "Build your thought leadership", sub: "Signal Room, ghostwriter AI, and deep analytics." },
      institution:  { title: "You're all set.", sub: "Full access — free during the trial. No credit card required." },
    }
    const heading = pathHeadings[path] || pathHeadings.student
    const isFree  = activePlan === "free"

    return (
      <div style={{ minHeight:"100vh", background:T.pageBg, color:T.text, fontFamily:T.body }}>
        <style>{ONBOARDING_STYLES}</style>
        <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.88)", backdropFilter:"blur(12px)", borderBottom:`1px solid ${T.border}`, height:72, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px" }}>
          <div style={{ fontFamily:T.display, fontSize:22, fontWeight:800, color:T.text, letterSpacing:"-0.03em" }}>Capabilio</div>
          <div style={{ fontSize:12, color:T.hint, fontFamily:T.mono }}>Choose your plan</div>
        </nav>

        {/* College discount announcement banner */}
        {inviteCtx && path === "student" && (
          <div style={{ background:"#ECFDF5", borderBottom:"1px solid #A7F3D0", padding:"10px 24px", textAlign:"center" }}>
            <span style={{ fontSize:13, color:"#065F46", fontWeight:600 }}>
              🎓 <strong>{inviteCtx.institution_label}</strong> — College pricing active &nbsp;·&nbsp; {inviteCtx.discount_pct}% off all paid plans
            </span>
          </div>
        )}

        <div style={{ maxWidth:1080, margin:"0 auto", padding:"56px 28px 88px" }}>
          <div className="ob-fade-up" style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:T.surface, border:`1px solid ${T.border}`, borderRadius:999, padding:"8px 16px", marginBottom:20 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:inviteCtx ? "#16A34A" : T.primary }} />
              <span style={{ fontSize:11, color:T.hint, fontWeight:700, letterSpacing:"0.14em", fontFamily:T.mono, textTransform:"uppercase" }}>
                {inviteCtx ? "College Invite · Pick your plan" : "Almost done · Pick your plan"}
              </span>
            </div>
            <h1 style={{ fontFamily:T.display, fontSize:"clamp(28px,4vw,46px)", fontWeight:900, color:T.text, letterSpacing:"-0.04em", marginBottom:12, lineHeight:1.15 }}>
              {heading.title}
            </h1>
            <p style={{ fontSize:15, color:T.muted, maxWidth:500, margin:"0 auto", lineHeight:1.8 }}>{heading.sub}</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns: pathPlans.length === 1 ? "minmax(280px,480px)" : `repeat(${pathPlans.length}, minmax(260px,1fr))`, gap:20, marginBottom:40, justifyContent:"center" }}>
            {pathPlans.map(p => {
              const selected    = activePlan === p.id
              const ac          = p.color
              const hasDiscount = p.college_price !== undefined && p.college_price !== p.original_price
              const displayPrice = hasDiscount ? p.college_price : p.price

              return (
                <div key={p.id} className="ob-card" onClick={() => setPlanChoice(p.id)}
                  style={{ borderRadius:20, border:`2px solid ${selected ? ac : T.border}`, background:selected?"rgba(0,0,0,0.05)":"rgba(0,0,0,0.02)", padding:"26px 22px", boxShadow:selected?`0 0 0 4px ${ac}18, 0 8px 32px rgba(17,24,39,0.09)`:"0 2px 8px rgba(17,24,39,0.05)", cursor:"pointer", position:"relative", transition:"all 0.18s" }}>

                  {p.badge && <div style={{ position:"absolute", top:14, right:14, background:ac, color:"#fff", fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:99, letterSpacing:0.5, textTransform:"uppercase" }}>{p.badge}</div>}
                  {selected && <div style={{ position:"absolute", top:14, left:14, width:18, height:18, borderRadius:"50%", background:ac, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ color:"#fff", fontSize:11, fontWeight:900 }}>✓</span></div>}

                  {/* College discount badge — shown per card when invite context active */}
                  {hasDiscount && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#ECFDF5", color:"#065F46", borderRadius:999, padding:"4px 10px", fontSize:11, fontWeight:700, marginBottom:10 }}>
                      🎓 {p.discount_pct}% college discount
                    </div>
                  )}

                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:ac, letterSpacing:2, textTransform:"uppercase", marginBottom:6, fontFamily:T.mono }}>{p.label}</div>

                    {p.price === 0
                      ? <div style={{ fontSize:34, fontWeight:900, color:T.text }}>Free</div>
                      : <>
                          <div style={{ display:"flex", alignItems:"flex-end", gap:3 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:T.muted, alignSelf:"flex-start", marginTop:8 }}>₹</span>
                            <span style={{ fontSize:36, fontWeight:900, color:T.text, letterSpacing:-1 }}>{displayPrice.toLocaleString()}</span>
                            <span style={{ fontSize:12, color:T.muted, marginBottom:6 }}>/mo</span>
                          </div>
                          {/* Strikethrough original price when discounted */}
                          {hasDiscount && (
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                              <span style={{ fontSize:13, color:T.hint, textDecoration:"line-through" }}>₹{p.original_price.toLocaleString()}</span>
                              <span style={{ fontSize:11, color:"#16A34A", fontWeight:700, background:"#ECFDF5", padding:"1px 7px", borderRadius:99 }}>Save ₹{(p.original_price - displayPrice).toLocaleString()}</span>
                            </div>
                          )}
                          {!hasDiscount && p.yearlyPrice && (
                            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>₹{p.yearlyPrice.toLocaleString()}/yr — <span style={{ color:"#16A34A", fontWeight:600 }}>{p.yearlySaving}</span></div>
                          )}
                        </>}
                  </div>

                  <div style={{ display:"grid", gap:7 }}>
                    {p.features.map((f,i) => (
                      <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-start" }}>
                        <span style={{ color:"#16A34A", fontWeight:800, flexShrink:0, fontSize:12, marginTop:1 }}>✓</span>
                        <span style={{ fontSize:13, color:T.muted, lineHeight:1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign:"center" }}>
            <button onClick={handlePlanConfirm} disabled={savingPlan}
              style={{ padding:"15px 48px", background:T.primary, border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:800, cursor:savingPlan?"not-allowed":"pointer", fontFamily:T.mono, letterSpacing:"0.04em", display:"inline-flex", alignItems:"center", gap:10, opacity:savingPlan?0.7:1 }}>
              {savingPlan
                ? <><div style={{ width:16,height:16,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"ob-spin .7s linear infinite" }} />Saving...</>
                : `${PLANS[activePlan]?.ctaLabel || "Continue"} → Enter Dashboard`}
            </button>
            <div style={{ marginTop:16, fontSize:12, color:T.hint, fontFamily:T.mono }}>
              {path === "institution"
                ? "No credit card required · All features active · Paid plans coming soon"
                : isFree ? "No credit card required." : "Powered by Razorpay · Cancel anytime."}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══ SCREEN: PATH SELECTION ════════════════════════════════════════
  // Only shown when no path was pre-selected from LandingPage
  if (step === "path") {
    const PATHS = [
      {
        id: "student", theme: PATH_THEME.student,
        title: "Student", subtitle: "25 beginner MCQs calibrate your starting radar. ELO begins at 400 and compounds through daily Arena challenges.",
        badge: "Free forever", details: ["25-question foundation assessment", "ELO starts at 400", "Daily Arena tasks build your portfolio", "AI Skill Gap Analysis included"],
        action: () => { setPath("student"); transition("search") },
      },
      {
        id: "professional", theme: PATH_THEME.professional, popular: true,
        title: "Professional", subtitle: "Upload resume or LinkedIn PDF. AI auto-builds your verified career timeline, Skill Half-Life radar, and compensation intelligence.",
        badge: "Verified network", details: ["No MCQ assessment — direct ELO 800+", "UAN cross-match locks employment history", "Orbit: market value + Layoff Shield Score", "8 modules: Orbit, Signal, Forge, Nexus…"],
        action: () => { setPath("professional"); transition("professional") },
      },
      {
        id: "authority", theme: PATH_THEME.authority,
        title: "Executive", subtitle: "Invite-only. Sell your time through Time Market, host Signal Rooms, match privately on Venture Radar. Verified legacy profile.",
        badge: "Invite-only", details: ["Time Market: sell 1:1, group, async sessions", "Influence Index — earned, not bought", "Venture Radar + Board Seat Exchange", "9 modules including Deal Room"],
        action: () => { setPath("authority"); transition("authority") },
      },
      {
        id: "institution", theme: PATH_THEME.institution,
        title: "Organisation", subtitle: "Colleges track cohort ELO, run professor-assigned tasks, automate placements. Companies post verified profiles and build Company ELO.",
        badge: "College · Company", details: ["Professor Task Engine + Cohort Intelligence", "Placement Command Center", "Anonymous Rating System (company)", "ATS integration: Workday, Greenhouse, Keka"],
        action: () => { setPath("institution"); transition("org-type") },
      },
    ]
    return (
      <div style={{
        minHeight:"100vh",
        background:`radial-gradient(ellipse at 20% 50%, rgba(99,102,241,.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,.10) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(6,182,212,.06) 0%, transparent 40%), #FFFFFF`,
        color:T.text, fontFamily:T.body,
      }}>
        <style>{ONBOARDING_STYLES + `
          @keyframes ob-pathAtm { from{opacity:0} to{opacity:1} }
          .ob-path-card { transition: transform .28s cubic-bezier(.22,1,.36,1), border-color .22s, box-shadow .28s !important; }
          .ob-path-card:hover { transform: translateY(-4px) !important; }
        `}</style>

        {/* Subtle grid overlay */}
        <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,.025) 1px, transparent 1px)", backgroundSize:"40px 40px", pointerEvents:"none", zIndex:0 }}/>

        <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.97)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:`1px solid #E8E3DA`, height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#6366F1,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:"#fff", boxShadow:"0 4px 14px rgba(99,102,241,.4)" }}>C</div>
            <span style={{ fontSize:16, fontWeight:800, color:"#1A1714", letterSpacing:".05em" }}>CAPABILIO <span style={{ color:"#6366F1" }}>AI</span></span>
          </div>
          <div style={{ fontSize:10, color:"#6B6560", fontFamily:T.mono, letterSpacing:".12em", textTransform:"uppercase" }}>Choose Your Path</div>
          {onBack && (
            <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.06)", border:`1px solid rgba(255,255,255,.1)`, borderRadius:8, padding:"6px 14px", cursor:"pointer", color:"#A8A29E", fontSize:12, fontFamily:T.body, transition:"all .18s" }}>← Back</button>
          )}
        </nav>

        <div style={{ maxWidth:1000, margin:"0 auto", padding:"60px 24px 88px", position:"relative", zIndex:1 }}>
          <div className="ob-fade-up" style={{ textAlign:"center", marginBottom:52 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.28)", borderRadius:99, padding:"5px 16px", marginBottom:22 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#6366F1", boxShadow:"0 0 0 3px rgba(99,102,241,.25)" }}/>
              <span style={{ fontSize:11, color:"#A5B4FC", fontWeight:700, letterSpacing:".12em", fontFamily:T.mono, textTransform:"uppercase" }}>Step 1 · Choose your path</span>
            </div>
            <h1 style={{ fontSize:"clamp(30px,4.5vw,52px)", fontWeight:900, color:"#1A1714", letterSpacing:"-.04em", lineHeight:1.05, marginBottom:14 }}>
              One platform.{" "}
              <span style={{ background:"linear-gradient(135deg,#6366F1,#8B5CF6,#06B6D4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                Four different journeys.
              </span>
            </h1>
            <p style={{ fontSize:16, color:"#6B6560", lineHeight:1.8, maxWidth:540, margin:"0 auto" }}>Your path sets your onboarding flow, starting ELO, available modules, and the kind of work you'll see first.</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, maxWidth:920, margin:"0 auto 28px" }}>
            {PATHS.map((p, i) => {
              const pt = p.theme
              return (
                <div key={p.id} className="ob-card ob-path-card" onClick={p.action}
                  style={{ background:"rgba(255,255,255,.05)", border:`1.5px solid ${pt.accentBd}`, borderRadius:20, padding:"26px 24px", cursor:"pointer", position:"relative", overflow:"hidden", animation:`ob-fadeUp .4s ${i*80}ms ease both` }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=pt.accent; e.currentTarget.style.boxShadow=`0 0 40px ${pt.accent}30`; e.currentTarget.style.background="rgba(255,255,255,.08)" }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=pt.accentBd; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.background="rgba(255,255,255,.05)" }}
                >
                  {/* Glow bg on hover */}
                  <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 30% 40%, ${pt.accent}15 0%, transparent 65%)`, pointerEvents:"none", borderRadius:20 }}/>
                  {p.popular && <div style={{ position:"absolute", top:0, right:18, background:pt.accent, color:"#fff", fontSize:9, fontWeight:800, padding:"5px 10px", borderRadius:"0 0 10px 10px", letterSpacing:".12em", fontFamily:T.mono, textTransform:"uppercase" }}>Popular</div>}

                  <div style={{ position:"relative", zIndex:1 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:16 }}>
                      <div style={{ width:48, height:48, background:pt.accentBg, border:`1px solid ${pt.accentBd}`, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{pt.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:20, fontWeight:700, color:"#1A1714", marginBottom:4 }}>{p.title}</div>
                        <span style={{ display:"inline-flex", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:99, background:pt.accentBg, color:pt.accent, border:`1px solid ${pt.accentBd}`, fontFamily:T.mono }}>{p.badge}</span>
                      </div>
                      <div style={{ width:30, height:30, minWidth:30, borderRadius:"50%", background:pt.accentBg, color:pt.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0 }}>→</div>
                    </div>
                    <p style={{ fontSize:13, color:"#A8A29E", lineHeight:1.7, marginBottom:16 }}>{p.subtitle}</p>
                    <div style={{ display:"grid", gap:7 }}>
                      {p.details.map((d, di) => (
                        <div key={di} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                          <span style={{ color:pt.accent, fontWeight:800, fontSize:11, flexShrink:0, marginTop:2 }}>✦</span>
                          <span style={{ fontSize:12, color:"#6B6560", lineHeight:1.5 }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ textAlign:"center", padding:"14px 20px", background:"rgba(255,255,255,.04)", borderRadius:14, border:`1px solid rgba(255,255,255,.08)`, maxWidth:920, margin:"0 auto" }}>
            <p style={{ fontSize:11, color:"#475569", margin:0, fontFamily:T.mono, lineHeight:1.8 }}>Free forever for candidates · No credit card · Update path anytime from settings</p>
          </div>
        </div>
      </div>
    )
  }

  // ══ SCREEN: STUDENT SEARCH ════════════════════════════════════════
  if (step === "search") {
    const canGo = selectedRole !== null || keyword.trim().length > 1
    const pt = getPathTheme("student")
    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ ...screen, width:"100%", maxWidth:680 }}>
          <Card accent={pt.accentBd}>
            <BackBtn onClick={()=>{ setPath(null); transition("path") }} />
            <PathBanner pathKey="student" stepIndex={0} />
            <H2>What role are you {studentStage === "job_seeker" ? "targeting" : "preparing for"}?</H2>
            <Sub>{studentStage === "job_seeker"
              ? "We'll calibrate 25 beginner-level questions to your exact target role and get you job-ready fast. Your ELO baseline starts at 400."
              : "We'll calibrate 25 beginner-level questions to your exact target role. Your ELO baseline starts at 400."}</Sub>
            {apiError && <div style={{ background:`${T.red}10`,border:`1px solid ${T.red}30`,borderRadius:T.radius,padding:"12px 14px",color:"#F87171",fontSize:13,marginBottom:16 }}>{apiError}</div>}
            {/* Role picker — primary input. Branch auto-derives from selected role. */}
            <FieldRow label="🎯 Target role">
              <RoleSearchPicker
                value={keyword}
                onChange={setKeyword}
                onRoleSelect={handleRoleSelect}
                selectedRole={selectedRole}
              />
            </FieldRow>
            {/* College + Branch — pre-filled from signup, editable unless a
                college invite link locked them (collegeLocked/branchLocked) */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:collegeLocked ? 6 : 16 }}>
              <FieldRow label={studentStage === "job_seeker" ? "College / University (optional)" : "College / University"}>
                <CollegeSearchPicker value={college} onChange={setCollege} placeholder="e.g. VIT Vellore" disabled={collegeLocked} />
              </FieldRow>
              <FieldRow label="Branch / Stream">
                <FieldSelect value={branch} onChange={e=>setBranch(e.target.value)} disabled={branchLocked}>
                  <option value="">Select branch</option>
                  <optgroup label="IT / CS">
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="MCA">MCA</option>
                    <option value="AI_DS">AI &amp; Data Science</option>
                    <option value="AI_ML">AI &amp; ML</option>
                  </optgroup>
                  <optgroup label="Core Engineering">
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="IoT">IoT</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="MBA">MBA</option>
                    <option value="Other">Other</option>
                  </optgroup>
                </FieldSelect>
              </FieldRow>
            </div>
            {collegeLocked && (
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 16, marginTop: -6 }}>
                🔒 Set by your college's invite link{branchLocked ? "" : " — branch wasn't recognized from the link, please pick yours"}. Contact your placement cell if this is wrong.
              </div>
            )}
            <FieldRow label="Resume upload — optional" hint={resumeStatus==="done"?"✓ Resume parsed successfully.":resumeStatus==="reading"?"Reading…":resumeStatus==="error"?"Uploaded but parsing was partial.":"Optional — used to personalise questions."}>
              <UploadBox file={resumeFile} status={resumeStatus} onUpload={handleFileUpload} label="Upload resume or profile PDF" hint="Personalises beginner-level questions around your foundation areas." color={T.primary} />
            </FieldRow>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20 }}>
              {[{label:"Questions",value:TARGET_Q_COUNT},{label:"Difficulty",value:"Beginner"},{label:"Timer",value:"45s / Q"}].map((s,i)=>(
                <div key={i} style={{ background:"#FFFFFF",border:"1px solid rgba(0,0,0,0.03)",borderRadius:T.radius,padding:14,textAlign:"center" }}>
                  <div style={{ fontFamily:T.display,fontSize:20,color:T.primary,marginBottom:4 }}>{s.value}</div>
                  <div style={{ fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:1 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <PrimaryBtn onClick={generateMCQs} disabled={!canGo}>Start Student Assessment →</PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ══ SCREEN: LOADING ════════════════════════════════════════════════
  if (step === "loading") {
    const pt = getPathTheme(path || "student")
    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ ...screen, width:"100%", maxWidth:480 }}>
          <Card accent={pt.accentBd} style={{ textAlign:"center" }}>
            <div style={{ width:60, height:60, borderRadius:"50%", background:pt.accentBg, border:`1px solid ${pt.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 20px" }}>{pt.icon}</div>
            <div style={{ fontFamily:T.display,fontSize:20,color:T.text,marginBottom:10 }}>Working on it…</div>
            <div style={{ fontSize:14,color:T.muted,lineHeight:1.7,marginBottom:20 }}>{loadingMsg||proAnalyzingMsg||"Please wait…"}</div>
            <Spinner size={32} color={pt.accent} />
          </Card>
        </div>
      </Screen>
    )
  }

  // ══ SCREEN: QUIZ ═══════════════════════════════════════════════════
  if (step === "quiz") {
    const q = questions[qIdx]
    if (!q) return null
    const pt = getPathTheme("student")
    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ ...screen, width:"100%", maxWidth:800 }}>
          <div style={{ background:T.surface,border:`1px solid ${pt.accent}20`,borderRadius:T.radiusXl,overflow:"hidden",boxShadow:`0 24px 60px ${pt.accent}18` }}>
            <div style={{ padding:"22px 28px 18px",background:pt.accentBg,borderBottom:`1px solid ${pt.accent}14` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:12 }}>{pt.icon}</span>
                    <span style={{ fontSize:10, fontWeight:800, color:pt.accent, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono }}>Student Assessment · Q{qIdx+1}/{questions.length}</span>
                  </div>
                  <div style={{ fontFamily:T.mono,fontSize:10,color:T.muted,letterSpacing:1 }}>{q.category||"SKILL ASSESSMENT"}</div>
                </div>
                <TimerRing total={TIMER} remaining={timeLeft} />
              </div>
              <ProgressBar current={qIdx+1} total={questions.length} />
              <div style={{ fontSize:17,fontWeight:600,color:T.text,lineHeight:1.5,marginTop:16 }}>{q.question}</div>
              {q.code && (
                <pre style={{ marginTop:12,padding:"12px 14px",background:"rgba(0,0,0,0.35)",borderRadius:8,fontSize:13,color:"#7DD3FC",fontFamily:T.mono,overflowX:"auto",lineHeight:1.6,border:"1px solid rgba(0,0,0,0.05)",whiteSpace:"pre-wrap",wordBreak:"break-word" }}>{q.code}</pre>
              )}
            </div>
            <div style={{ padding:"20px 28px 28px", background:"#FAF7F2" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:12 }}>
                Choose the correct answer
              </div>
              {(!q.options || q.options.length === 0) && (
                <div style={{ padding:"16px 18px", background:"#FFF1E8", border:"1px solid rgba(255,87,1,0.18)", borderRadius:T.radius, color:T.primary, fontSize:13, fontWeight:500 }}>
                  ⚠ Options failed to load for this question.
                  <button onClick={()=>advanceQ(-1)} style={{ marginLeft:12, background:"none", border:"none", color:T.primary, fontWeight:700, cursor:"pointer", textDecoration:"underline", fontSize:13, fontFamily:T.body }}>Skip →</button>
                </div>
              )}
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {q.options?.map((opt,i) => {
                  const isSel = selected===i
                  const labels = ["A","B","C","D","E"]
                  return (
                    <button key={i} onClick={()=>handleAnswer(i)} disabled={selected!==null||timedOut}
                      style={{
                        textAlign:"left", padding:"13px 16px",
                        borderRadius:T.radius,
                        background: isSel ? `${T.primary}12` : "#FFFFFF",
                        border: `1.5px solid ${isSel ? T.primary : "rgba(17,24,39,0.12)"}`,
                        color: T.text,
                        fontSize:14,
                        cursor:(selected!==null||timedOut)?"default":"pointer",
                        transition:"all 0.15s",
                        fontFamily:T.body,
                        fontWeight:isSel?600:400,
                        display:"flex", alignItems:"flex-start", gap:12,
                        boxShadow: isSel ? `0 0 0 3px ${T.primary}15` : "0 1px 4px rgba(17,24,39,0.05)"
                      }}
                      onMouseEnter={e=>{ if(selected===null&&!timedOut){ e.currentTarget.style.background=`${T.primary}08`; e.currentTarget.style.borderColor=`${T.primary}60`; e.currentTarget.style.transform="translateY(-1px)" }}}
                      onMouseLeave={e=>{ if(!isSel){ e.currentTarget.style.background="#FFFFFF"; e.currentTarget.style.borderColor="rgba(17,24,39,0.12)"; e.currentTarget.style.transform="translateY(0)" }}}
                    >
                      <span style={{
                        display:"inline-flex", alignItems:"center", justifyContent:"center",
                        width:26, height:26, borderRadius:6, flexShrink:0,
                        background: isSel ? T.primary : "rgba(17,24,39,0.07)",
                        color: isSel ? "#fff" : T.muted,
                        fontSize:11, fontWeight:800, fontFamily:T.mono,
                        transition:"all 0.15s"
                      }}>{labels[i]||i+1}</span>
                      <span style={{ flex:1, paddingTop:3 }}>{opt}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        {showResultModal&&result&&<ResultModal result={result} keyword={keyword} questions={questions} onGoToDashboard={handleGoToDashboard} savingResult={savingResult} saveError={saveError} />}
        {showRecoPopup&&<RecoPopup weakAreas={result?.analysis?.weakAreas||[]} onContinue={()=>{ setShowRecoPopup(false); setStep("plan") }} />}
      </Screen>
    )
  }

  // ══ SCREEN: PROFESSIONAL ═══════════════════════════════════════════
  if (step === "professional") {
    const liOk = linkedinUrlStatus==="done"||linkedinUrlStatus==="limited"
    const hasAny = proResumeStatus==="done"||liOk||githubFetchStatus==="done"
    const pt = getPathTheme("professional")

    // LinkedIn status helpers
    const liHint = {
      idle:     "Paste your LinkedIn profile URL. We extract your title, skills, experience and education.",
      fetching: "Fetching your LinkedIn profile…",
      done:     `✓ LinkedIn profile extracted — ${linkedinData?.experience?.length||0} roles, ${linkedinData?.skills?.length||0} skills detected.`,
      limited:  "⚠ Partial extraction — LinkedIn showed limited data without login. Basic info captured.",
      error:    "❌ Could not extract profile. LinkedIn may be blocking. Try your resume instead.",
    }[linkedinUrlStatus]
    const liColor = { idle:pt.accent, fetching:pt.accent, done:T.green, limited:T.amber, error:T.red }[linkedinUrlStatus]

    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ ...screen, width:"100%", maxWidth:740 }}>
          <Card accent={pt.accentBd}>
            <BackBtn onClick={()=>{ setPath(null); transition("path") }} />
            <PathBanner pathKey="professional" stepIndex={0} />
            {/* Hero */}
            <div style={{ background:pt.accentBg, border:`1px solid ${pt.accentBd}`, borderRadius:16, padding:"16px 20px", marginBottom:20 }}>
              <div style={{ fontFamily:T.display, fontSize:22, fontWeight:700, color:T.text, marginBottom:6 }}>
                Your career is proven.<br /><span style={{ color:pt.accent, fontStyle:"italic" }}>Not just claimed.</span>
              </div>
              <div style={{ fontSize:13, color:T.muted, lineHeight:1.7, fontFamily:T.body }}>
                Connect your resume, LinkedIn profile, or GitHub. AI extracts your experience, skills, and assigns a starting ELO of 800+ with full Orbit intelligence.
              </div>
            </div>
            <H2>Build your profile</H2>
            <Sub>Provide at least one source. The more you add, the more accurate your Aura score and starting ELO.</Sub>
            {proError && <div style={{ background:`${T.red}10`,border:`1px solid ${T.red}30`,borderRadius:T.radius,padding:"12px 14px",color:"#F87171",fontSize:13,marginBottom:16 }}>{proError}</div>}

            {/* Resume upload */}
            <FieldRow label="Resume (PDF) — recommended">
              <UploadBox file={proResumeFile} status={proResumeStatus} onUpload={handleProResumeUpload} label="Upload your resume (PDF)" hint="We extract skills, experience, and your professional summary." color={pt.accent} />
            </FieldRow>

            {/* LinkedIn URL — NEW */}
            <FieldRow label="LinkedIn Profile URL — optional" hint={liHint}>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <div style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:13, color:T.muted, pointerEvents:"none", fontFamily:T.mono }}>🔗</div>
                  <input
                    value={linkedinUrl}
                    onChange={e => { setLinkedinUrl(e.target.value); if (linkedinUrlStatus !== "idle") setLinkedinUrlStatus("idle") }}
                    onKeyDown={e => e.key === "Enter" && linkedinUrl.trim() && fetchLinkedinFromUrl()}
                    placeholder="linkedin.com/in/your-profile"
                    style={{ width:"100%", padding:"13px 14px 13px 36px", borderRadius:T.radius, background:"rgba(0,0,0,0.02)", border:`1px solid ${liOk ? liColor+"60" : "rgba(255,255,255,0.1)"}`, color:T.text, fontSize:14, fontFamily:T.body, outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" }}
                    onFocus={e => e.target.style.borderColor=`${pt.accent}60`}
                    onBlur={e  => e.target.style.borderColor = liOk ? `${liColor}60` : "rgba(255,255,255,0.1)"}
                  />
                </div>
                <button
                  onClick={fetchLinkedinFromUrl}
                  disabled={!linkedinUrl.trim() || linkedinUrlStatus==="fetching"}
                  style={{ padding:"0 20px", borderRadius:T.radius, background:linkedinUrlStatus==="fetching"?"rgba(0,0,0,0.03)":`${pt.accent}`, border:"none", color:linkedinUrlStatus==="fetching"?T.muted:"#fff", fontWeight:700, fontFamily:T.body, cursor:(!linkedinUrl.trim()||linkedinUrlStatus==="fetching")?"not-allowed":"pointer", flexShrink:0, transition:"all 0.15s", opacity:!linkedinUrl.trim()?0.45:1 }}
                >
                  {linkedinUrlStatus==="fetching" ? <Spinner size={14} color="#fff" /> : liOk ? "✓ Done" : "Extract"}
                </button>
              </div>
              {/* Extracted preview */}
              {liOk && linkedinData?.name && (
                <div style={{ marginTop:10, padding:"10px 14px", background:`${pt.accent}08`, border:`1px solid ${pt.accent}25`, borderRadius:T.radiusLg, display:"flex", gap:14, alignItems:"center" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:pt.accentBg, border:`1px solid ${pt.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>💼</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{linkedinData.name}</div>
                    {linkedinData.title && <div style={{ fontSize:12, color:T.muted }}>{linkedinData.title}</div>}
                    <div style={{ fontSize:11, color:pt.accent, fontFamily:T.mono, marginTop:2 }}>
                      {[linkedinData.experience?.length > 0 && `${linkedinData.experience.length} roles`, linkedinData.skills?.length > 0 && `${linkedinData.skills.length} skills`, linkedinData.education?.length > 0 && `${linkedinData.education.length} education entries`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              )}
            </FieldRow>

            {/* GitHub */}
            <FieldRow label="GitHub Username — optional" hint={githubFetchStatus==="done"?"✓ GitHub profile fetched — technical breadth added.":githubFetchStatus==="error"?"❌ Could not fetch. Check username.":"Adding GitHub unlocks technical breadth scoring."}>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1, position:"relative" }}>
                  <div style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:13, color:T.muted, pointerEvents:"none" }}>⌥</div>
                  <input
                    value={githubUsername}
                    onChange={e => setGithubUsername(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && githubUsername.trim() && fetchGitHub(githubUsername)}
                    placeholder="github username"
                    style={{ width:"100%", padding:"13px 14px 13px 36px", borderRadius:T.radius, background:"rgba(0,0,0,0.02)", border:`1px solid ${githubFetchStatus==="done"?"rgba(22,163,74,0.4)":"rgba(255,255,255,0.1)"}`, color:T.text, fontSize:14, fontFamily:T.body, outline:"none", boxSizing:"border-box", transition:"border-color 0.15s" }}
                    onFocus={e => e.target.style.borderColor="#16A34A60"}
                    onBlur={e  => e.target.style.borderColor = githubFetchStatus==="done" ? "rgba(22,163,74,0.4)" : "rgba(255,255,255,0.1)"}
                  />
                </div>
                <button
                  onClick={() => fetchGitHub(githubUsername)}
                  disabled={!githubUsername.trim() || githubFetchStatus==="fetching"}
                  style={{ padding:"0 20px", borderRadius:T.radius, background:githubFetchStatus==="fetching"?"rgba(0,0,0,0.03)":"linear-gradient(135deg,#78FF9E,#00b87a)", border:"none", color:githubFetchStatus==="fetching"?T.muted:"#030712", fontWeight:700, fontFamily:T.body, cursor:(!githubUsername.trim()||githubFetchStatus==="fetching")?"not-allowed":"pointer", flexShrink:0, transition:"all 0.15s" }}
                >
                  {githubFetchStatus==="fetching" ? <Spinner size={14} /> : githubFetchStatus==="done" ? "✓ Done" : "Fetch"}
                </button>
              </div>
            </FieldRow>

            {/* Score preview */}
            {hasAny && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { label:"Resume",   active:proResumeStatus==="done",   icon:"📄", pts:8  },
                  { label:"LinkedIn", active:liOk,                        icon:"🔗", pts:7  },
                  { label:"GitHub",   active:githubFetchStatus==="done",  icon:"⌥", pts:5  },
                ].map((s,i) => (
                  <div key={i} style={{ padding:"10px 12px", borderRadius:T.radius, background:s.active?`${pt.accent}10`:"#FAF7F2", border:`1px solid ${s.active?pt.accent+"30":"rgba(17,24,39,0.06)"}`, textAlign:"center", transition:"all 0.2s" }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:s.active?pt.accent:T.muted, fontFamily:T.mono }}>{s.label}</div>
                    <div style={{ fontSize:10, color:s.active?T.green:T.muted, marginTop:2 }}>{s.active?`+${s.pts} pts`:"not added"}</div>
                  </div>
                ))}
              </div>
            )}

            <PrimaryBtn onClick={runProfessionalAnalysis} loading={proAnalyzing} disabled={!hasAny} color={pt.accent} textColor="#fff">
              Build My Orbit Profile →
            </PrimaryBtn>
          </Card>
        </div>
        {showAuraModal&&auraResult&&<ProfessionalResultModal auraResult={auraResult} onGoToDashboard={handleProGoToDashboard} savingResult={savingResult} />}
        {nameMismatch && (
          <NameMismatchModal
            resumeName={nameMismatch.resumeName}
            accountName={nameMismatch.accountName}
            onClose={() => setNameMismatch(null)}
            onReupload={() => {
              setNameMismatch(null)
              setProResumeFile(null); setProResumeData(null); setProResumeStatus("idle")
            }}
          />
        )}
      </Screen>
    )
  }

  // ══ SCREEN: AUTHORITY / INSTITUTION ═══════════════════════════════
  if (step === "authority") {
    const isInst = path === "institution"
    const pt = getPathTheme(isInst ? "institution" : "authority")
    const canSubmit = authName.trim()&&authRole.trim()&&authType&&authDomain&&authBio.trim().length>=50
    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ ...screen, width:"100%", maxWidth:680 }}>
          <Card accent={pt.accentBd}>
            <BackBtn onClick={()=>{ setPath(null); transition("path") }} />
            <PathBanner pathKey={isInst ? "institution" : "authority"} stepIndex={0} />
            {/* Path hero */}
            <div style={{ background:pt.accentBg, border:`1px solid ${pt.accentBd}`, borderRadius:14, padding:"14px 18px", marginBottom:20 }}>
              <div style={{ fontFamily:T.display, fontSize:20, fontWeight:700, color:T.text, marginBottom:4 }}>
                {isInst ? "Manage talent at scale." : "Your authority is real."}<br />
                <span style={{ color:pt.accent, fontStyle:"italic" }}>{isInst ? "Track cohort ELO. Automate placements." : "Now monetize it."}</span>
              </div>
              <div style={{ fontSize:12, color:T.muted, lineHeight:1.6, fontFamily:T.body }}>
                {isInst
                  ? "Colleges track cohort ELO, run professor-assigned tasks, and pipeline placements. Companies build verified profiles and build Company ELO through anonymous ratings."
                  : "Founders, CEOs, and domain authorities. Sell time through Time Market, build Peer Circles, open Signal Rooms. Every profile is invite-only and identity-verified."}
              </div>
            </div>
            <H2>{isInst?"Create your Institution profile":"Create your Authority profile"}</H2>
            <Sub>{isInst?"Universities, colleges, bootcamps, and companies can publish curriculum, post challenges, and track outcomes.":"Founders, CEOs, professors, and experts — build your presence, share knowledge, and grow your network."}</Sub>
            {authError && <div style={{ background:`${T.red}10`,border:`1px solid ${T.red}30`,borderRadius:T.radius,padding:"12px 14px",color:"#F87171",fontSize:13,marginBottom:16 }}>{authError}</div>}
            <FieldRow><FieldInput value={authName} onChange={e=>setAuthName(e.target.value)} placeholder={isInst?"Institution / Company Name":"Full Name"} /></FieldRow>
            <FieldRow><FieldInput value={authRole} onChange={e=>setAuthRole(e.target.value)} placeholder={isInst?"Your Role (e.g., Head of Placements, CTO)":"Your Title (e.g., Founder, CEO, Professor)"} /></FieldRow>
            <FieldRow>
              <FieldSelect value={authType} onChange={e=>setAuthType(e.target.value)}>
                <option value="">Select profile type</option>
                {isInst ? (<><option value="University">University</option><option value="College">College</option><option value="Bootcamp">Bootcamp / Academy</option><option value="Company">Company / Corporate</option><option value="NGO">NGO / Non-profit</option></>) : (<><option value="Founder">Founder / Co-founder</option><option value="Executive">Executive (CEO, CTO, Director)</option><option value="Professor">Professor / Academic</option><option value="Expert">Industry Expert / Consultant</option></>)}
              </FieldSelect>
            </FieldRow>
            <FieldRow><FieldInput value={authCompany} onChange={e=>setAuthCompany(e.target.value)} placeholder={isInst?"Headquarters Location":"Company / Organisation"} /></FieldRow>
            <FieldRow><FieldInput value={authDomain} onChange={e=>setAuthDomain(e.target.value)} placeholder={isInst?"Primary domain (e.g., Computer Science, Business)":"Area of expertise / domain"} /></FieldRow>
            <FieldRow hint={`${authBio.length}/50 minimum`}>
              <FieldTextarea value={authBio} onChange={e=>setAuthBio(e.target.value)} placeholder="Bio / description (minimum 50 characters)" rows={4} />
            </FieldRow>
            <FieldRow><FieldInput value={authWebsite} onChange={e=>setAuthWebsite(e.target.value)} placeholder="Website URL (optional)" /></FieldRow>
            <FieldRow style={{ marginBottom:24 }}><FieldInput value={authLinkedIn} onChange={e=>setAuthLinkedIn(e.target.value)} placeholder="LinkedIn URL (optional)" /></FieldRow>
            <PrimaryBtn onClick={handleAuthSubmit} disabled={!canSubmit} loading={authAnalyzing} color={pt.accent} textColor="#fff">
              {isInst?"Create Institution Profile →":"Create Authority Profile →"}
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ══ SCREEN: EXECUTIVE PREVIEW ════════════════════════════════════
  if (step === "exec-preview") {
    const pt = getPathTheme("authority")
    const EXEC_MODULES = [
      { icon:"📜", title:"Legacy Profile",       desc:"Verified timeline — exits, board seats, patents, keynotes. Cross-verified with news. Not self-reported." },
      { icon:"⏱",  title:"Time Market",          desc:"Sell 1:1, group sessions, workshops, async Q&A. Dynamic pricing. Capabilio takes commission per plan." },
      { icon:"🎙",  title:"Signal Rooms",         desc:"Live audio/video rooms — verified executives only. Recorded. Scheduled in advance." },
      { icon:"🃏",  title:"Insight Cards",        desc:"Structured short-form: Problem → Insight → Lesson → Role verified. Quality over volume." },
      { icon:"🔭",  title:"Venture Radar",        desc:"Private deal matching. Founders signal raising. Investors signal deal interest. Zero cold outreach." },
      { icon:"🪑",  title:"Board Seat Exchange",  desc:"Companies post openings. Capabilio verifies credentials before match is shown." },
      { icon:"👥",  title:"Peer Circle",          desc:"Private rooms of 5–15 verified executives at similar stages. Invite-only curation." },
      { icon:"📊",  title:"Influence Index",      desc:"Your executive ELO. Reach, session ratings, mentee outcomes, verified achievements." },
      { icon:"🗺",  title:"Deal Room",            desc:"Private deal-flow workspace — pitch decks, term sheets, cap tables. Encrypted." },
    ]
    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ ...screen, width:"100%", maxWidth:820 }}>
          <Card accent={pt.accentBd} style={{ padding:"28px 28px 32px" }}>
            <PathBanner pathKey="authority" stepIndex={1} />

            {/* Welcome header */}
            <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:28, paddingBottom:24, borderBottom:`1px solid ${pt.accentBd}` }}>
              <div style={{ width:56, height:56, borderRadius:16, background:pt.accentBg, border:`1px solid ${pt.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>✦</div>
              <div>
                <div style={{ fontFamily:T.display, fontSize:24, fontWeight:800, color:T.text, marginBottom:4 }}>
                  Welcome, {authName || getUserDisplayName()}.
                </div>
                <div style={{ fontSize:13, color:T.muted, fontFamily:T.body }}>
                  Your Authority profile has been created. Here's what you now have access to.
                </div>
              </div>
              <div style={{ marginLeft:"auto", flexShrink:0, padding:"8px 16px", background:pt.accentBg, border:`1.5px solid ${pt.accent}`, borderRadius:999, fontSize:11, fontWeight:800, color:pt.accent, fontFamily:T.mono, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                ✦ Invite-only
              </div>
            </div>

            {/* Time Market highlight */}
            <div style={{ background:"#FFFFFF", borderRadius:16, padding:"18px 20px", marginBottom:24 }}>
              <div style={{ fontSize:10, fontWeight:800, color:pt.accent, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:10 }}>⏱ Time Market — how you earn</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))", gap:10 }}>
                {[
                  { type:"1:1 · 30 min",   price:"₹2,500" },
                  { type:"1:1 · 60 min",   price:"₹4,800" },
                  { type:"Group · 10 pax", price:"₹800/person" },
                  { type:"Async Q&A",      price:"₹500" },
                ].map((s,i)=>(
                  <div key={i} style={{ background:"rgba(0,0,0,0.02)", border:"1px solid #F3F4F6", borderRadius:10, padding:"10px 12px" }}>
                    <div style={{ fontSize:11, color:"#A8A29E", fontFamily:T.mono, marginBottom:4 }}>{s.type}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:"#fff", fontFamily:T.mono }}>{s.price}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, color:"#6B6560", marginTop:12, fontFamily:T.body }}>
                Set your own rates. Commission: <span style={{ color:pt.accent, fontWeight:700 }}>18% (Authority) → 12% (Luminary) → 8% (Legacy)</span>. Pick your plan to lower your rate.
              </div>
            </div>

            {/* 9 modules grid */}
            <div style={{ fontSize:11, fontWeight:800, color:T.hint, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:12 }}>Your 9 modules</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
              {EXEC_MODULES.map((m,i)=>(
                <div key={i} style={{ background:"#F9F8F6", border:`1px solid ${pt.accentBd}`, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:4, fontFamily:T.display }}>{m.title}</div>
                  <div style={{ fontSize:11, color:T.muted, lineHeight:1.5, fontFamily:T.body }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div style={{ background:pt.accentBg, border:`1px solid ${pt.accentBd}`, borderRadius:12, padding:"12px 16px", marginBottom:24, fontSize:12, color:T.muted, fontFamily:T.body, lineHeight:1.7 }}>
              <span style={{ color:pt.accent, fontWeight:700 }}>Next step:</span> Your profile goes live after verification. Time Market commission starts at 18% — lower tiers with Signal Rooms and Venture Radar access are available anytime from Settings.
            </div>

            <PrimaryBtn onClick={handleEnterAuthorityWorkspace} loading={savingPlan} color={pt.accent}>
              Enter Your Workspace →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ══ SCREEN: ORGANISATION PREVIEW ═════════════════════════════════
  if (step === "org-preview") {
    const isCollege = orgSubType === "college" || (orgSubType !== "company" && (authType === "University" || authType === "College" || authType === "Bootcamp" || !["Company","Corporate"].includes(authType)))
    const pt = getPathTheme("institution")

    const COLLEGE_MODULES = [
      { icon:"🎓", title:"Campus Hub",              desc:"Verified campus social layer. Only verified college email holders. Posts, events, student groups." },
      { icon:"📋", title:"Professor Task Engine",   desc:"Assign custom Arena-style tasks to batches. AI auto-grades. Feeds directly into student ELO." },
      { icon:"📈", title:"Cohort Intelligence",     desc:"Live ELO leaderboard per batch, department, institution. Placement team sees hire-ready students." },
      { icon:"💼", title:"Placement Command Center",desc:"Real-time placement tracking. In-campus offers auto-transition students to Professional path." },
      { icon:"🔗", title:"Alumni Intelligence",     desc:"Graduates auto-transition to Pro path. Track alumni ELO over time — verifiable ranking signal." },
      { icon:"📑", title:"Academic Project Vault",  desc:"Final year projects, research auto-linked to student portfolio. Professors can endorse." },
    ]
    const COMPANY_MODULES = [
      { icon:"🏢", title:"Verified Company Profile", desc:"Logo, culture, locations. GST/CIN verified badge. Company ELO shown publicly." },
      { icon:"⭐", title:"Anonymous Rating System",  desc:"Day-30 + exit ratings. Identity stripped. 6 dimensions. Min 5 ratings before company sees data." },
      { icon:"🧬", title:"Company ELO",              desc:"From anonymous ratings + hire quality + offer acceptance + retention. Cannot be faked." },
      { icon:"👥", title:"Verified Team Page",       desc:"Real employees who consent to display. ELO, role, tenure — not self-reported headcount." },
      { icon:"🧠", title:"Culture DNA",              desc:"AI-generated fingerprint from ratings, posts, JDs, retention patterns. Glassdoor killer." },
      { icon:"🔌", title:"ATS Integration",          desc:"Sync Workday, Greenhouse, Lever, Keka, Darwinbox. Jobs auto-sync. Candidate webhooks." },
    ]
    const modules = isCollege ? COLLEGE_MODULES : COMPANY_MODULES

    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ ...screen, width:"100%", maxWidth:820 }}>
          <Card accent={pt.accentBd} style={{ padding:"28px 28px 32px" }}>
            <PathBanner pathKey="institution" stepIndex={1} />

            {/* Welcome header */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:24, paddingBottom:22, borderBottom:`1px solid ${pt.accentBd}` }}>
              <div style={{ width:52, height:52, borderRadius:14, background:pt.accentBg, border:`1px solid ${pt.accentBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🏛️</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:T.display, fontSize:22, fontWeight:800, color:T.text, marginBottom:3 }}>
                  {orgInstName || authName || "Your organisation"} is set up.
                </div>
                <div style={{ fontSize:13, color:T.muted, fontFamily:T.body }}>
                  {isCollege
                    ? "Your campus ecosystem is ready. Here's what you can do once your plan is active."
                    : "Your company profile is created. Here's what activates with your plan."}
                </div>
              </div>
              <div style={{ flexShrink:0, padding:"6px 14px", background:pt.accentBg, border:`1.5px solid ${pt.accent}`, borderRadius:999, fontSize:10, fontWeight:800, color:pt.accent, fontFamily:T.mono, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                {isCollege ? "College / University" : "Company"}
              </div>
            </div>

            {/* Key stat highlight */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:22 }}>
              {(isCollege ? [
                { val:"Professor Task Engine", sub:"AI-graded tasks → student ELO" },
                { val:"Cohort Intelligence",   sub:"Live ELO per batch, dept, campus" },
                { val:"Auto Placements",       sub:"In-campus offer → Pro path instantly" },
              ] : [
                { val:"Anonymous Ratings",    sub:"Day-30 + exit, identity never disclosed" },
                { val:"Company ELO",          sub:"Built from real data, updated quarterly" },
                { val:"ATS Integration",      sub:"Workday, Greenhouse, Lever, Keka" },
              ]).map((s,i)=>(
                <div key={i} style={{ background:"#F9F8F6", border:`1px solid ${pt.accentBd}`, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:pt.accent, fontFamily:T.display, marginBottom:4, lineHeight:1.3 }}>{s.val}</div>
                  <div style={{ fontSize:11, color:T.muted, lineHeight:1.5, fontFamily:T.body }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Modules grid */}
            <div style={{ fontSize:11, fontWeight:800, color:T.hint, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:12 }}>
              {isCollege ? "Campus modules" : "Company modules"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:22 }}>
              {modules.map((m,i)=>(
                <div key={i} style={{ background:"#F9F8F6", border:`1px solid ${pt.accentBd}`, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:3, fontFamily:T.display }}>{m.title}</div>
                  <div style={{ fontSize:11, color:T.muted, lineHeight:1.5, fontFamily:T.body }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Student lifecycle / company trust note */}
            {isCollege ? (
              <div style={{ background:"#FFFFFF", borderRadius:12, padding:"14px 18px", marginBottom:22 }}>
                <div style={{ fontSize:10, fontWeight:800, color:pt.accent, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:10 }}>Student lifecycle — automatic</div>
                <div style={{ display:"flex", alignItems:"center", gap:0, flexWrap:"wrap" }}>
                  {["Joins college", "Campus Hub + Arena", "Professor tasks", "In-campus offer", "→ Professional path"].map((s,i,arr)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:0 }}>
                      <div style={{ padding:"6px 10px", background:"rgba(0,0,0,0.03)", border:"1px solid rgba(0,0,0,0.05)", borderRadius:8, fontSize:11, color:"#D6D0C8", fontFamily:T.body, whiteSpace:"nowrap" }}>{s}</div>
                      {i < arr.length-1 && <div style={{ fontSize:12, color:"#A8A29E", margin:"0 4px" }}>→</div>}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:11, color:"#6B6560", marginTop:8, fontFamily:T.body }}>No manual transitions needed. Capabilio handles it automatically.</div>
              </div>
            ) : (
              <div style={{ background:"#FFFFFF", borderRadius:12, padding:"14px 18px", marginBottom:22 }}>
                <div style={{ fontSize:10, fontWeight:800, color:pt.accent, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:8 }}>🔒 Anonymous Rating Architecture</div>
                <div style={{ fontSize:12, color:"#D6D0C8", lineHeight:1.7, fontFamily:T.body }}>Triggered at Day 30 and exit. Reviewer identity stripped before storage. Company sees aggregated data <strong style={{color:"#fff"}}>only when 5+ ratings exist</strong> — prevents reverse-engineering. 6 dimensions: Culture, Growth, Work-Life, Management, Compensation, Inclusion.</div>
              </div>
            )}

            <div style={{ fontSize:12, color:T.muted, fontFamily:T.body, marginBottom:20, lineHeight:1.7, padding:"10px 14px", background:pt.accentBg, border:`1px solid ${pt.accentBd}`, borderRadius:10 }}>
              <span style={{ color:pt.accent, fontWeight:700 }}>Next step:</span> Full access is free during the trial — no credit card required. The Professor Task Engine, Cohort Intelligence, and Placement Command Center activate as soon as you enter your workspace.
            </div>

            <PrimaryBtn onClick={handleEnterInstitutionWorkspace} loading={orgSubmitting} color={pt.accent}>
              Enter Your Workspace →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ══ SCREEN: ORG TYPE SELECTION ═══════════════════════════════════
  if (step === "org-type") {
    const pt = getPathTheme("institution")
    return (
      <Screen style={{ background: pt.bg }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ width:"100%", maxWidth:720 }}>
          <Card accent={pt.accentBd} style={{ padding:"28px 28px 32px" }}>
            <BackBtn onClick={()=>{ setPath(null); transition("path") }} />
            <PathBanner pathKey="institution" stepIndex={0} />

            <div style={{ background:pt.accentBg, border:`1px solid ${pt.accentBd}`, borderRadius:14, padding:"14px 18px", marginBottom:24 }}>
              <div style={{ fontSize:18, fontWeight:800, color:T.text, marginBottom:4 }}>One platform, built for two types of organisations.</div>
              <div style={{ fontSize:13, color:T.muted, lineHeight:1.6 }}>Your setup, modules, and pricing differ based on what you are. Tell us first — you can change this later.</div>
            </div>

            <H2>What best describes your organisation?</H2>
            <Sub>College / University or Company / Corporate — pick the one that fits.</Sub>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
              {/* College / University card */}
              <div
                onClick={() => { setOrgSubType("college"); transition("org-college") }}
                style={{ borderRadius:16, border:"1.5px solid rgba(217,119,6,0.3)", background:"rgba(0,0,0,0.02)", padding:"22px 20px", cursor:"pointer", transition:"all 0.18s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="#D97706"; e.currentTarget.style.background="rgba(217,119,6,0.05)"; e.currentTarget.style.boxShadow="0 0 24px rgba(217,119,6,0.15)" }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(217,119,6,0.3)"; e.currentTarget.style.background="rgba(0,0,0,0.02)"; e.currentTarget.style.boxShadow="none" }}
              >
                <div style={{ fontSize:32, marginBottom:10 }}>🏛️</div>
                <div style={{ fontSize:16, fontWeight:800, color:T.text, marginBottom:6 }}>College / University</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6, marginBottom:14 }}>
                  Track cohort ELO live, run professor-assigned tasks, automate placements, generate NAAC reports in one click.
                </div>
                {["📊 Live cohort placement dashboard", "📋 NAAC-ready auto reports", "🎓 Students join via single invite link", "🏢 Recruiter portal for your verified batch"].map((f,i)=>(
                  <div key={i} style={{ fontSize:11, color:T.muted, marginBottom:5 }}>{f}</div>
                ))}
                <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", background:"rgba(217,119,6,0.1)", border:"1px solid rgba(217,119,6,0.25)", borderRadius:999, padding:"4px 12px", fontSize:10, fontWeight:700, color:"#D97706", fontFamily:T.mono }}>
                  NAAC · NBA · Placement tracking
                </div>
              </div>

              {/* Company / Organisation card */}
              <div
                onClick={() => { setOrgSubType("company"); transition("org-company-workspace") }}
                style={{ borderRadius:16, border:"1.5px solid rgba(5,150,105,0.3)", background:"rgba(0,0,0,0.02)", padding:"22px 20px", cursor:"pointer", transition:"all 0.18s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor="#059669"; e.currentTarget.style.background="rgba(5,150,105,0.05)"; e.currentTarget.style.boxShadow="0 0 24px rgba(5,150,105,0.15)" }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(5,150,105,0.3)"; e.currentTarget.style.background="rgba(0,0,0,0.02)"; e.currentTarget.style.boxShadow="none" }}
              >
                <div style={{ fontSize:32, marginBottom:10 }}>🏢</div>
                <div style={{ fontSize:16, fontWeight:800, color:T.text, marginBottom:6 }}>Company / Organisation</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6, marginBottom:14 }}>
                  Access verified talent from Launchpad, build Company ELO, run anonymous ratings, integrate your ATS.
                </div>
                {["🧬 Company ELO from verified ratings", "🔌 ATS integration (Workday, Keka…)", "👥 Verified talent pool access", "⭐ Anonymous Day-30 + exit reviews"].map((f,i)=>(
                  <div key={i} style={{ fontSize:11, color:T.muted, marginBottom:5 }}>{f}</div>
                ))}
                <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", background:"rgba(5,150,105,0.1)", border:"1px solid rgba(5,150,105,0.25)", borderRadius:999, padding:"4px 12px", fontSize:10, fontWeight:700, color:"#059669", fontFamily:T.mono }}>
                  GST/CIN verified · ATS ready
                </div>
              </div>
            </div>

            <div style={{ textAlign:"center", fontSize:11, color:T.muted, fontFamily:T.mono, padding:"10px 14px", background:"rgba(0,0,0,0.02)", borderRadius:8, border:`1px solid ${T.border}` }}>
              Both types are on the same Institution path · Pricing differs by organisation size
            </div>
          </Card>
        </div>
      </Screen>
    )
  }

  // ══ SCREEN: ORG COLLEGE PROFILE ══════════════════════════════════
  if (step === "org-college") {
    const amberAccent = "#D97706"
    const amberBg    = "rgba(217,119,6,0.10)"
    const amberBd    = "rgba(217,119,6,0.28)"
    const canSubmit  = orgInstName.trim() && orgAdminName.trim() && orgAdminRole.trim() && orgInstType && orgLocation.trim() && orgBatchSize
    const DEPTS = ["CSE","IT","ECE","EEE","Mechanical","Civil","MBA","BCA","MCA","Data Science","AI/ML","Biotech","Other"]
    const toggleDept = (d) => setOrgDepts(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])

    return (
      <Screen style={{ background:`radial-gradient(ellipse at 20% 50%, rgba(217,119,6,0.12) 0%, transparent 55%), #FFFFFF` }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ width:"100%", maxWidth:720 }}>
          <Card accent={amberBd} style={{ padding:"28px 28px 32px" }}>
            <BackBtn onClick={()=>transition("org-type")} />
            <PathBanner pathKey="institution" stepIndex={1} />

            <div style={{ background:amberBg, border:`1px solid ${amberBd}`, borderRadius:14, padding:"14px 18px", marginBottom:22, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:28, flexShrink:0 }}>🏛️</div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:T.text, marginBottom:3 }}>Set up your College / University</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>Takes 2 minutes. Students join via invite link — no IT setup needed.</div>
              </div>
            </div>

            {orgError && <div style={{ background:"rgba(244,63,94,0.08)", border:"1px solid rgba(244,63,94,0.25)", borderRadius:T.radius, padding:"12px 14px", color:"#F43F5E", fontSize:13, marginBottom:16 }}>{orgError}</div>}

            <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Institution Details</div>

            <FieldRow label="Institution Name *">
              <CollegeSearchPicker value={orgInstName} onChange={setOrgInstName} placeholder="e.g. VIT Vellore, BITS Pilani, RGIPT" />
            </FieldRow>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <FieldRow label="Institution Type *">
                <FieldSelect value={orgInstType} onChange={e=>setOrgInstType(e.target.value)}>
                  <option value="">Select type</option>
                  <option value="University">University (Deemed/Central/State)</option>
                  <option value="Engineering College">Engineering College</option>
                  <option value="Autonomous College">Autonomous College</option>
                  <option value="Affiliated College">Affiliated College</option>
                  <option value="Institute">Institute (IIT/NIT/IIIT)</option>
                  <option value="Bootcamp">Bootcamp / Academy</option>
                  <option value="Online Platform">Online Learning Platform</option>
                </FieldSelect>
              </FieldRow>
              <FieldRow label="State / City *">
                <FieldInput value={orgLocation} onChange={e=>setOrgLocation(e.target.value)} placeholder="e.g. Tamil Nadu, Vellore" />
              </FieldRow>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <FieldRow label="Annual Batch Size *" hint="Approx. students graduating per year">
                <FieldSelect value={orgBatchSize} onChange={e=>setOrgBatchSize(e.target.value)}>
                  <option value="">Select batch size</option>
                  <option value="under-100">Under 100</option>
                  <option value="100-300">100 – 300</option>
                  <option value="300-600">300 – 600</option>
                  <option value="600-1000">600 – 1,000</option>
                  <option value="1000-3000">1,000 – 3,000</option>
                  <option value="3000+">3,000+</option>
                </FieldSelect>
              </FieldRow>
              <FieldRow label="NAAC Grade" hint="Optional — shown on recruiter portal">
                <FieldSelect value={orgNaacGrade} onChange={e=>setOrgNaacGrade(e.target.value)}>
                  <option value="">Select grade (optional)</option>
                  <option value="A++">A++ (3.75 – 4.00)</option>
                  <option value="A+">A+ (3.51 – 3.75)</option>
                  <option value="A">A (3.26 – 3.50)</option>
                  <option value="B++">B++ (3.01 – 3.25)</option>
                  <option value="B+">B+ (2.76 – 3.00)</option>
                  <option value="B">B (2.51 – 2.75)</option>
                  <option value="Not accredited">Not yet accredited</option>
                </FieldSelect>
              </FieldRow>
            </div>

            <FieldRow label="Departments with active placement" hint="Select all that apply">
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
                {DEPTS.map(d => (
                  <button key={d} onClick={()=>toggleDept(d)} type="button" style={{ padding:"5px 12px", borderRadius:999, border:`1px solid ${orgDepts.includes(d)?amberAccent:"rgba(0,0,0,0.12)"}`, background:orgDepts.includes(d)?amberBg:"transparent", color:orgDepts.includes(d)?amberAccent:T.muted, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s", fontFamily:T.body }}>
                    {orgDepts.includes(d) ? "✓ " : ""}{d}
                  </button>
                ))}
              </div>
            </FieldRow>

            <div style={{ fontSize:10, fontWeight:700, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12, marginTop:4 }}>Your Details (Placement Admin)</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <FieldRow label="Your Name *">
                <FieldInput value={orgAdminName} onChange={e=>setOrgAdminName(e.target.value)} placeholder="e.g. Dr. Ramesh Kumar" />
              </FieldRow>
              <FieldRow label="Your Role *">
                <FieldInput value={orgAdminRole} onChange={e=>setOrgAdminRole(e.target.value)} placeholder="e.g. TPO, Head of Placements, Dean" />
              </FieldRow>
            </div>

            <FieldRow label="Institution Website" hint="Optional">
              <FieldInput value={orgWebsite} onChange={e=>setOrgWebsite(e.target.value)} placeholder="https://yourinstitution.ac.in" />
            </FieldRow>

            <div style={{ background:amberBg, border:`1px solid ${amberBd}`, borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:800, color:amberAccent, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:8 }}>After setup, you get:</div>
              {[
                "📧 Unique invite link for students (e.g. capabilio.online/join/vit-2025)",
                "📊 Live cohort dashboard — ELO, placement status, skill gaps per student",
                "🏢 Recruiter portal — companies filter and reach your batch directly",
                "📋 One-click NAAC report with all placement data auto-collected",
              ].map((f,i)=><div key={i} style={{ fontSize:12, color:T.muted, marginBottom:4 }}>{f}</div>)}
            </div>

            <PrimaryBtn onClick={handleOrgSubmit} disabled={!canSubmit} loading={orgSubmitting} color={amberAccent}>
              Create College Profile →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ══════════════════════════════════════════════════════════════════
  // COMPANY ONBOARDING WIZARD — 5 steps, company org_type only.
  // College flow (org-college → handleOrgSubmit → org-preview) is untouched.
  // ══════════════════════════════════════════════════════════════════
  const greenAccent = "#059669"
  const greenBg    = "rgba(5,150,105,0.10)"
  const greenBd    = "rgba(5,150,105,0.28)"

  // ── STEP 1 of 5: Create Your AI Hiring Workspace ──────────────────
  if (step === "org-company-workspace") {
    const canSubmit = orgInstName.trim() && orgIndustry && orgCompanySize

    return (
      <Screen style={{ background:`radial-gradient(ellipse at 20% 50%, rgba(5,150,105,0.10) 0%, transparent 55%), #FFFFFF` }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ width:"100%", maxWidth:720 }}>
          <Card accent={greenBd} style={{ padding:"28px 28px 32px" }}>
            <BackBtn onClick={()=>transition("org-type")} />
            <CompanyWizardDots activeIdx={0} />

            <div style={{ background:greenBg, border:`1px solid ${greenBd}`, borderRadius:14, padding:"14px 18px", marginBottom:22, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:28, flexShrink:0 }}>🏢</div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:T.text, marginBottom:3 }}>Create Your AI Hiring Workspace</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>Step 1 of 5 — tell us who you are. Takes under a minute.</div>
              </div>
            </div>

            <FieldRow label="Organisation Name *">
              <FieldInput value={orgInstName} onChange={e=>setOrgInstName(e.target.value)} placeholder="e.g. Razorpay, Infosys, Zoho" />
            </FieldRow>

            <FieldRow label="Website" hint="Optional">
              <FieldInput value={orgWebsite} onChange={e=>setOrgWebsite(e.target.value)} placeholder="https://yourcompany.com" />
            </FieldRow>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <FieldRow label="Industry *">
                <FieldSelect value={orgIndustry} onChange={e=>setOrgIndustry(e.target.value)}>
                  <option value="">Select industry</option>
                  <option value="Product / SaaS">Product / SaaS</option>
                  <option value="IT Services">IT Services / Consulting</option>
                  <option value="Banking / NBFC">Banking / NBFC</option>
                  <option value="Fintech">Fintech</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Edtech">Edtech</option>
                  <option value="Healthtech">Healthtech</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="FMCG">FMCG / Retail</option>
                  <option value="Media / Gaming">Media / Gaming</option>
                  <option value="Startup">Early-stage Startup</option>
                  <option value="PSU">PSU / Government</option>
                  <option value="Other">Other</option>
                </FieldSelect>
              </FieldRow>
              <FieldRow label="Company Size *">
                <FieldSelect value={orgCompanySize} onChange={e=>setOrgCompanySize(e.target.value)}>
                  <option value="">Select size</option>
                  <option value="1-20">1 – 20 (Seed stage)</option>
                  <option value="21-100">21 – 100 (Early)</option>
                  <option value="101-500">101 – 500 (Growth)</option>
                  <option value="501-2000">501 – 2,000 (Scale)</option>
                  <option value="2001-10000">2,001 – 10,000</option>
                  <option value="10000+">10,000+ (Enterprise)</option>
                </FieldSelect>
              </FieldRow>
            </div>

            <PrimaryBtn onClick={()=>transition("org-company-hiring")} disabled={!canSubmit} color={greenAccent}>
              Continue →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ── STEP 2 of 5: Hiring Intelligence ──────────────────────────────
  if (step === "org-company-hiring") {
    const canSubmit = orgHiringVolume && orgHiringGoals.length > 0 && orgKeyDomains.length > 0
    const GOALS   = ["Build a fresh-graduate pipeline", "Scale a specific team fast", "Reduce agency hiring costs", "Build employer brand & visibility", "Access verified, pre-vetted talent only", "Improve hiring speed & quality"]
    const DOMAINS = ["Engineering", "Product", "Design", "Data / Analytics", "Sales", "Marketing", "Operations", "Finance", "HR", "Customer Success", "Other"]
    const toggleGoal   = (g) => setOrgHiringGoals(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g])
    const toggleDomain = (d) => setOrgKeyDomains(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])

    return (
      <Screen style={{ background:`radial-gradient(ellipse at 20% 50%, rgba(5,150,105,0.10) 0%, transparent 55%), #FFFFFF` }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ width:"100%", maxWidth:720 }}>
          <Card accent={greenBd} style={{ padding:"28px 28px 32px" }}>
            <BackBtn onClick={()=>transition("org-company-workspace")} />
            <CompanyWizardDots activeIdx={1} />

            <div style={{ background:greenBg, border:`1px solid ${greenBd}`, borderRadius:14, padding:"14px 18px", marginBottom:22, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:28, flexShrink:0 }}>🎯</div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:T.text, marginBottom:3 }}>Hiring Intelligence</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>This shapes what candidates and colleges we surface for you first.</div>
              </div>
            </div>

            {orgError && <div style={{ background:"rgba(244,63,94,0.08)", border:"1px solid rgba(244,63,94,0.25)", borderRadius:T.radius, padding:"12px 14px", color:"#F43F5E", fontSize:13, marginBottom:16 }}>{orgError}</div>}

            <FieldRow label="Hiring Goals *" hint="Select all that apply">
              <ChipMultiSelect options={GOALS} selected={orgHiringGoals} onToggle={toggleGoal} accent={greenAccent} accentBg={greenBg} />
            </FieldRow>

            <FieldRow label="Annual Hiring Volume *" hint="Hires per year">
              <FieldSelect value={orgHiringVolume} onChange={e=>setOrgHiringVolume(e.target.value)}>
                <option value="">Hires per year</option>
                <option value="1-10">1 – 10</option>
                <option value="11-50">11 – 50</option>
                <option value="51-200">51 – 200</option>
                <option value="201-500">201 – 500</option>
                <option value="500+">500+</option>
              </FieldSelect>
            </FieldRow>

            <FieldRow label="Key Hiring Domains *" hint="Select all that apply">
              <ChipMultiSelect options={DOMAINS} selected={orgKeyDomains} onToggle={toggleDomain} accent={greenAccent} accentBg={greenBg} />
            </FieldRow>

            <FieldRow label="Specific roles (optional)" hint="e.g. Backend Engineer, Data Analyst, DevOps — helps surface exact-match candidates">
              <FieldInput value={orgKeyRoles} onChange={e=>setOrgKeyRoles(e.target.value)} placeholder="e.g. Backend Engineer, Data Analyst, DevOps" />
            </FieldRow>

            <FieldRow label="Current ATS" hint="Optional — we'll help integrate">
              <FieldSelect value={orgCurrentATS} onChange={e=>setOrgCurrentATS(e.target.value)}>
                <option value="">Current ATS (optional)</option>
                <option value="None">None / Manual process</option>
                <option value="Workday">Workday</option>
                <option value="Greenhouse">Greenhouse</option>
                <option value="Lever">Lever</option>
                <option value="Keka">Keka</option>
                <option value="Darwinbox">Darwinbox</option>
                <option value="Zoho Recruit">Zoho Recruit</option>
                <option value="BambooHR">BambooHR</option>
                <option value="Naukri RMS">Naukri RMS</option>
                <option value="Other">Other</option>
              </FieldSelect>
            </FieldRow>

            <PrimaryBtn onClick={()=>transition("org-company-verify")} disabled={!canSubmit} color={greenAccent}>
              Continue →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ── STEP 3 of 5: Verification ─────────────────────────────────────
  if (step === "org-company-verify") {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgWorkEmail.trim())
    const canSubmit  = emailValid && orgAdminName.trim() && orgAdminRole.trim()

    return (
      <Screen style={{ background:`radial-gradient(ellipse at 20% 50%, rgba(5,150,105,0.10) 0%, transparent 55%), #FFFFFF` }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ width:"100%", maxWidth:720 }}>
          <Card accent={greenBd} style={{ padding:"28px 28px 32px" }}>
            <BackBtn onClick={()=>transition("org-company-hiring")} />
            <CompanyWizardDots activeIdx={2} />

            <div style={{ background:greenBg, border:`1px solid ${greenBd}`, borderRadius:14, padding:"14px 18px", marginBottom:22, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:28, flexShrink:0 }}>🔒</div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:T.text, marginBottom:3 }}>Verification</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>Your work email confirms you represent this company. GST/CIN is optional but adds a Verified badge later.</div>
              </div>
            </div>

            <FieldRow label="Work Email *" hint="Your company email — not necessarily your login email">
              <FieldInput value={orgWorkEmail} onChange={e=>setOrgWorkEmail(e.target.value)} placeholder="e.g. priya@yourcompany.com" />
            </FieldRow>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <FieldRow label="Your Name *">
                <FieldInput value={orgAdminName} onChange={e=>setOrgAdminName(e.target.value)} placeholder="e.g. Priya Menon" />
              </FieldRow>
              <FieldRow label="Your Role *">
                <FieldInput value={orgAdminRole} onChange={e=>setOrgAdminRole(e.target.value)} placeholder="e.g. Head of Talent, HR Manager, CTO" />
              </FieldRow>
            </div>

            <FieldRow label="GST / CIN Number" hint="Optional — adds a Verified badge to your company profile">
              <FieldInput value={orgGstCin} onChange={e=>setOrgGstCin(e.target.value)} placeholder="e.g. 22AAAAA0000A1Z5" />
            </FieldRow>

            <div style={{ fontSize:11, color:T.muted, fontFamily:T.body, marginBottom:20, lineHeight:1.7, padding:"10px 14px", background:"#F9F8F6", border:`1px solid ${T.border}`, borderRadius:10 }}>
              We don't run an email OTP check yet — your work email is recorded as <strong>pending verification</strong> and reviewed before your Verified badge is granted.
            </div>

            <PrimaryBtn onClick={()=>transition("org-company-modules")} disabled={!canSubmit} color={greenAccent}>
              Continue →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ── STEP 4 of 5: AI Workspace Setup ───────────────────────────────
  if (step === "org-company-modules") {
    const MODULES = [
      "Talent Network (college partnerships)",
      "Verified Company Profile",
      "ATS Integration",
      "Anonymous Rating System",
      "Company ELO",
      "Culture DNA",
    ]
    const toggleModule = (m) => setOrgSelectedModules(prev => prev.includes(m) ? prev.filter(x=>x!==m) : [...prev, m])
    const canSubmit = orgSelectedModules.length > 0

    if (orgInitializing) {
      return (
        <Screen style={{ background:`radial-gradient(ellipse at 20% 50%, rgba(5,150,105,0.10) 0%, transparent 55%), #FFFFFF` }}>
          <style>{ONBOARDING_STYLES}</style>
          <div style={{ width:"100%", maxWidth:560 }}>
            <Card accent={greenBd} style={{ padding:"32px 32px 36px", textAlign:"center" }}>
              <Spinner size={30} color={greenAccent} />
              <div style={{ fontFamily:T.display, fontSize:18, fontWeight:800, color:T.text, margin:"16px 0 22px" }}>Setting up your workspace…</div>
              <div style={{ textAlign:"left", display:"flex", flexDirection:"column", gap:10 }}>
                {COMPANY_SETUP_TASKS.map((task, i) => (
                  <div key={task} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color: i < orgInitDone ? T.text : T.muted, fontFamily:T.body, transition:"color 0.2s" }}>
                    <span style={{ width:18, textAlign:"center" }}>{i < orgInitDone ? "✅" : (i === orgInitDone ? <Spinner size={13} color={greenAccent} /> : "○")}</span>
                    {task}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Screen>
      )
    }

    return (
      <Screen style={{ background:`radial-gradient(ellipse at 20% 50%, rgba(5,150,105,0.10) 0%, transparent 55%), #FFFFFF` }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ width:"100%", maxWidth:720 }}>
          <Card accent={greenBd} style={{ padding:"28px 28px 32px" }}>
            <BackBtn onClick={()=>transition("org-company-verify")} />
            <CompanyWizardDots activeIdx={3} />

            <div style={{ background:greenBg, border:`1px solid ${greenBd}`, borderRadius:14, padding:"14px 18px", marginBottom:22, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ fontSize:28, flexShrink:0 }}>⚙️</div>
              <div>
                <div style={{ fontSize:17, fontWeight:800, color:T.text, marginBottom:3 }}>AI Workspace Setup</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>Pick the modules you want active. You can turn on more later from Settings.</div>
              </div>
            </div>

            {orgInitError && <div style={{ background:"rgba(244,63,94,0.08)", border:"1px solid rgba(244,63,94,0.25)", borderRadius:T.radius, padding:"12px 14px", color:"#F43F5E", fontSize:13, marginBottom:16 }}>{orgInitError}</div>}

            <FieldRow label="Select Modules *" hint="Select all that apply">
              <ChipMultiSelect options={MODULES} selected={orgSelectedModules} onToggle={toggleModule} accent={greenAccent} accentBg={greenBg} />
            </FieldRow>

            <div style={{ background:greenBg, border:`1px solid ${greenBd}`, borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:800, color:greenAccent, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:8 }}>What each module does</div>
              {[
                "🤝 Talent Network — connect with colleges, see student ELO with their consent, never contact info",
                "🏢 Verified Company Profile — logo, culture, locations, GST/CIN verified badge",
                "🔌 ATS Integration — sync Workday, Greenhouse, Lever, Keka, Darwinbox",
                "⭐ Anonymous Rating System — Day-30 + exit ratings, identity stripped, min 5 before visible",
                "🧬 Company ELO — built from anonymous ratings + hire quality + retention",
                "🧠 Culture DNA — AI-generated fingerprint from ratings, posts, JDs, retention patterns",
              ].map((f,i)=><div key={i} style={{ fontSize:12, color:T.muted, marginBottom:4 }}>{f}</div>)}
            </div>

            <PrimaryBtn onClick={handleCompanySubmit} disabled={!canSubmit} loading={orgSubmitting} color={greenAccent}>
              Create My Workspace →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  // ── STEP 5 of 5: Welcome Dashboard ────────────────────────────────
  if (step === "org-company-welcome") {
    // Rule-based, not an LLM call — computed directly from what was captured
    // in steps 1-4. Labeled "Recommendations" rather than claiming live AI
    // analysis, since there's no real usage data yet for a brand-new account.
    const recommendations = []
    if (orgHiringGoals.includes("Build a fresh-graduate pipeline"))
      recommendations.push("You're building a fresh-graduate pipeline — start by connecting with a college through Talent Network.")
    if (orgKeyDomains.length)
      recommendations.push(`You're hiring for ${orgKeyDomains.slice(0,3).join(", ")}${orgKeyDomains.length > 3 ? " and more" : ""} — candidates matching these domains will be prioritized once a college connects with you.`)
    if (!orgCurrentATS || orgCurrentATS === "None")
      recommendations.push("You don't have an ATS connected yet — you can still track candidates manually inside Capabilio, or configure ATS Integration anytime from Settings.")
    else
      recommendations.push(`Connect your ${orgCurrentATS} account under ATS Integration to keep candidate data in sync.`)
    if (!orgGstCin.trim())
      recommendations.push("Add your GST/CIN number anytime from Settings to unlock the Verified badge on your company profile.")
    if (recommendations.length === 0)
      recommendations.push("Head into your workspace — connect a college via Talent Network to start seeing candidates.")

    const checklist = [
      { done: true,  label: "Company profile created" },
      { done: false, label: "Work email verified", note: "pending review" },
      { done: orgSelectedModules.includes("ATS Integration") && !!orgCurrentATS && orgCurrentATS !== "None", label: "ATS integration configured" },
      { done: false, label: "First college connected via Talent Network", note: "0 connected so far" },
      { done: false, label: "Invite your team", note: "coming soon" },
    ]

    return (
      <Screen style={{ background:`radial-gradient(ellipse at 20% 50%, rgba(5,150,105,0.10) 0%, transparent 55%), #FFFFFF` }}>
        <style>{ONBOARDING_STYLES}</style>
        <div style={{ width:"100%", maxWidth:820 }}>
          <Card accent={greenBd} style={{ padding:"28px 28px 32px" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:greenBg, border:`1px solid ${greenBd}`, borderRadius:999, padding:"6px 14px", marginBottom:22 }}>
              <span style={{ fontSize:12 }}>✅</span>
              <span style={{ fontSize:10, fontWeight:800, color:greenAccent, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono }}>Workspace setup complete</span>
            </div>

            <div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:24, paddingBottom:22, borderBottom:`1px solid ${greenBd}` }}>
              <div style={{ width:52, height:52, borderRadius:14, background:greenBg, border:`1px solid ${greenBd}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🏢</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:T.display, fontSize:22, fontWeight:800, color:T.text, marginBottom:3 }}>
                  Welcome, {orgInstName || "your workspace"} is live.
                </div>
                <div style={{ fontSize:13, color:T.muted, fontFamily:T.body }}>Here's where things stand today — and what to do next.</div>
              </div>
            </div>

            {/* Talent Snapshot — honest zero-state, not fabricated numbers */}
            <div style={{ fontSize:11, fontWeight:800, color:T.hint, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:12 }}>Talent Snapshot</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
              {[
                { val:"0", sub:"Colleges connected — invite one via Talent Network" },
                { val:"0", sub:"Candidates in view — unlocked once a college connects" },
                { val:"—", sub:"Avg. time-to-shortlist — needs your first ratings" },
              ].map((s,i)=>(
                <div key={i} style={{ background:"#F9F8F6", border:`1px solid ${greenBd}`, borderRadius:12, padding:"12px 14px" }}>
                  <div style={{ fontSize:20, fontWeight:800, color:greenAccent, fontFamily:T.display, marginBottom:4 }}>{s.val}</div>
                  <div style={{ fontSize:11, color:T.muted, lineHeight:1.5, fontFamily:T.body }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* AI Recommendations */}
            <div style={{ fontSize:11, fontWeight:800, color:T.hint, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:12 }}>Recommendations for you</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
              {recommendations.map((r,i)=>(
                <div key={i} style={{ display:"flex", gap:10, background:"#FFFFFF", border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:12, color:T.text, lineHeight:1.6, fontFamily:T.body }}>
                  <span>💡</span>{r}
                </div>
              ))}
            </div>

            {/* Workspace Completion Checklist */}
            <div style={{ fontSize:11, fontWeight:800, color:T.hint, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:T.mono, marginBottom:12 }}>Workspace Completion Checklist</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:24 }}>
              {checklist.map((c,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color: c.done ? T.text : T.muted, fontFamily:T.body }}>
                  <span style={{ width:18, textAlign:"center" }}>{c.done ? "✅" : "⬜"}</span>
                  {c.label}
                  {c.note && <span style={{ fontSize:11, color:T.hint, fontFamily:T.mono }}>({c.note})</span>}
                </div>
              ))}
            </div>

            <PrimaryBtn onClick={handleEnterInstitutionWorkspace} loading={orgSubmitting} color={greenAccent}>
              Enter Workspace →
            </PrimaryBtn>
          </Card>
        </div>
      </Screen>
    )
  }

  return null
}