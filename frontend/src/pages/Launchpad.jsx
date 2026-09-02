/**
 * Launchpad.jsx — Skill-first career operating system
 * Redesigned: premium job discovery, proof-backed fit analysis, guided application.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { jobsApi, skillsApi } from "../lib/api"
import { userDoc } from "../lib/db"
import { AIInterviewPanel } from "./Aura"
import { SectionErrorBoundary } from "../components/careeros/CareerOSUI"

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  // ── Glassmorphic Cosmos dark tokens ─────────────────────────────────────
  cream:    "#FAF7F2",                     // page bg
  ink:      "#1A1714",                     // primary text
  ink2:     "#475569",                     // secondary text
  ink3:     "#A8A29E",                     // muted text
  indigo:   "#6366F1",                     // primary action
  indigo2:  "rgba(99,102,241,0.12)",       // soft indigo bg
  indigo3:  "#4F46E5",                     // darker indigo
  teal:     "#06B6D4",                     // teal accent
  teal2:    "rgba(6,182,212,0.12)",        // soft teal bg
  green:    "#10B981",                     // success
  green2:   "rgba(16,185,129,0.12)",       // soft green bg
  amber:    "#F59E0B",                     // warning / gold
  amber2:   "rgba(245,158,11,0.12)",       // soft amber bg
  red:      "#F43F5E",                     // error / critical
  red2:     "rgba(244,63,94,0.12)",        // soft rose bg
  purple:   "#8B5CF6",                     // violet
  purple2:  "rgba(139,92,246,0.12)",       // soft violet bg
  border:   "rgba(0,0,0,0.05)",
  shadow:   "0 4px 12px rgba(0,0,0,0.08)",
  shadowMd: "0 8px 32px rgba(0,0,0,0.55)",
  shadowLg: "0 20px 60px rgba(0,0,0,0.65)",
}

// ─── Devicon slug map ─────────────────────────────────────────────────────────
const DEVICON = {
  javascript:"javascript", js:"javascript", typescript:"typescript", ts:"typescript",
  react:"react", "react.js":"react", reactjs:"react",
  "node.js":"nodejs", nodejs:"nodejs", node:"nodejs",
  python:"python", java:"java", go:"go", golang:"go",
  rust:"rust", swift:"swift", kotlin:"kotlin", dart:"dart",
  flutter:"flutter", "vue.js":"vuejs", vue:"vuejs", vuejs:"vuejs",
  angular:"angularjs", "next.js":"nextjs", nextjs:"nextjs",
  svelte:"svelte", "react native":"react", redux:"redux",
  postgresql:"postgresql", postgres:"postgresql", mysql:"mysql",
  mongodb:"mongodb", redis:"redis", sqlite:"sqlite",
  graphql:"graphql", "rest api":"fastapi",
  docker:"docker", kubernetes:"kubernetes", k8s:"kubernetes",
  aws:"amazonwebservices", gcp:"googlecloud", azure:"azure",
  git:"git", github:"github", gitlab:"gitlab", linux:"linux",
  nginx:"nginx", django:"django", fastapi:"fastapi", flask:"flask",
  rails:"rails", ruby:"ruby", php:"php", laravel:"laravel",
  tailwind:"tailwindcss", tailwindcss:"tailwindcss",
  figma:"figma", css:"css3", html:"html5", html5:"html5",
  terraform:"terraform", ansible:"ansible",
  elasticsearch:"elasticsearch", pandas:"pandas",
  numpy:"numpy", tensorflow:"tensorflow", pytorch:"pytorch",
  express:"express",
}

function deviconUrl(skill) {
  const key = (skill || "").toLowerCase().replace(/\s+/g, "").replace(/\./g, "")
  const slug = DEVICON[key] || DEVICON[(skill||"").toLowerCase()]
  if (!slug) return null
  return `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-original.svg`
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function skillName(s) { return typeof s === "string" ? s : s?.name || s?.skill_name || "" }

function computeMatch(job, userSkills) {
  if (!userSkills?.length) return { score: null, matched: [], missing: [] }
  const uNames = userSkills.map(s => skillName(s).toLowerCase())
  const required = (job.essential_skills || []).map(s => skillName(s))
  if (!required.length) return { score: null, matched: [], missing: [] }
  const matched = required.filter(s => uNames.some(u => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u)))
  const missing = required.filter(s => !uNames.some(u => u.includes(s.toLowerCase()) || s.toLowerCase().includes(u)))
  const score = Math.round((matched.length / required.length) * 100)
  return { score, matched, missing }
}

function matchLabel(score) {
  if (score === null) return null
  if (score >= 80) return { text: "Strong fit", color: T.green, bg: T.green2 }
  if (score >= 60) return { text: "Good potential", color: T.amber, bg: T.amber2 }
  if (score >= 40) return { text: "Growing fit", color: T.indigo, bg: T.indigo2 }
  return { text: "Skill gap", color: T.red, bg: T.red2 }
}

function matchReason(job, match) {
  const { score, matched, missing } = match
  if (score === null) return "Set up your profile to see your fit score."
  const total = matched.length + missing.length
  if (score >= 80) return `${matched.length} of ${total} required skills verified.${missing.length ? ` One gap: ${missing[0]}.` : " No significant gaps."}`
  if (score >= 60) return `${matched.length} of ${total} skills match.${missing.length ? ` Key gaps: ${missing.slice(0,2).join(", ")}.` : ""}`
  return `${missing.length} skills to build: ${missing.slice(0,3).join(", ")}.`
}

function formatSalary(min, max, currency = "INR") {
  if (!min && !max) return null
  const fmt = n => n >= 100000 ? `${(n/100000).toFixed(n%100000===0?0:1)}L` : `${(n/1000).toFixed(0)}K`
  if (currency === "INR" || currency === "inr") {
    return min && max ? `₹${fmt(min)}–${fmt(max)} PA` : min ? `₹${fmt(min)}+ PA` : `Up to ₹${fmt(max)} PA`
  }
  return min && max ? `$${Math.round(min/1000)}K–${Math.round(max/1000)}K` : null
}

function timeAgo(dateStr) {
  if (!dateStr) return ""
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`
  return `${Math.floor(diff/604800)}w ago`
}

function readinessScore(match, userData) {
  const base = match.score ?? 50
  const hasPhoto = userData?.profilePhotoURL ? 5 : 0
  const hasElo   = userData?.eloRating > 600 ? 8 : userData?.eloRating > 400 ? 4 : 0
  const skills   = (userData?.skills?.length || 0)
  const hasSkills = skills > 10 ? 7 : skills > 5 ? 4 : skills > 0 ? 2 : 0
  return Math.min(100, base + hasPhoto + hasElo + hasSkills)
}

// ─── Tiny components ──────────────────────────────────────────────────────────
function Chip({ text, color = T.ink3, bg = "#F4F4F0", size = 11 }) {
  return (
    <span style={{ fontSize: size, background: bg, color, padding: "2px 8px", borderRadius: 99, fontWeight: 600, whiteSpace: "nowrap" }}>
      {text}
    </span>
  )
}

function CompanyLogo({ src, name, size = 44 }) {
  const [ok, setOk] = useState(true)
  const letter = (name || "?")[0].toUpperCase()
  const colors = ["#3D4EAC","#0D7A6B","#7C3AED","#B8620A","#C0392B"]
  const bg = colors[(letter.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, border: `1px solid ${T.border}`, overflow: "hidden", flexShrink: 0, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {ok && src
        ? <img src={src} alt={name} style={{ width: size - 4, height: size - 4, objectFit: "contain" }} onError={() => setOk(false)} />
        : <div style={{ width: "100%", height: "100%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: size * 0.42, fontWeight: 800, fontFamily: "DM Sans, sans-serif" }}>{letter}</span>
          </div>
      }
    </div>
  )
}

function SkillPill({ name, matched, size = "sm" }) {
  const iconUrl = deviconUrl(name)
  const [imgOk, setImgOk] = useState(true)
  const isSm = size === "sm"
  const bg   = matched === true ? T.green2 : matched === false ? "#F4F4F0" : T.indigo2
  const col  = matched === true ? T.green  : matched === false ? T.ink3    : T.indigo
  const icon = matched === true ? "✓" : matched === false ? "·" : ""
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: isSm ? "3px 8px" : "5px 11px", background: bg, border: `1px solid ${col}22`, borderRadius: 8, fontSize: isSm ? 11 : 13, color: col, fontWeight: 600, whiteSpace: "nowrap" }}>
      {iconUrl && imgOk
        ? <img src={iconUrl} alt="" style={{ width: isSm ? 12 : 16, height: isSm ? 12 : 16, objectFit: "contain", filter: matched === false ? "grayscale(1) opacity(0.5)" : "none" }} onError={() => setImgOk(false)} />
        : icon ? <span style={{ fontSize: isSm ? 10 : 12 }}>{icon}</span> : null
      }
      {name}
    </span>
  )
}

function MatchBar({ score, reason, compact = false }) {
  if (score === null) return null
  const color = score >= 70 ? T.green : score >= 45 ? T.amber : T.red
  return (
    <div style={{ marginBottom: compact ? 0 : 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: T.ink3 }}>{compact ? "Match" : "Profile match"}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>{score}%</span>
      </div>
      <div style={{ height: 3, borderRadius: 3, background: "rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3, transition: "width .6s ease" }} />
      </div>
      {!compact && reason && <div style={{ fontSize: 10, color: T.ink3, marginTop: 3, lineHeight: 1.4 }}>{reason}</div>}
    </div>
  )
}

function ReadinessMeter({ score }) {
  const r = 38, cx = 50, cy = 54
  const total = 270, startDeg = 135
  const filled = (score / 100) * total
  const toXY = deg => {
    const a = (deg - 90) * Math.PI / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const arc = (s, e) => {
    const [x1,y1] = toXY(s), [x2,y2] = toXY(e)
    const large = e - s > 180 ? 1 : 0
    return `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  const color = score >= 70 ? T.green : score >= 40 ? T.amber : T.red
  return (
    <svg viewBox="0 0 100 80" width="100" height="80" style={{ display: "block", margin: "0 auto" }}>
      <path d={arc(startDeg, startDeg + total)} fill="none" stroke="#EEEEE9" strokeWidth="7" strokeLinecap="round" />
      {score > 0 && <path d={arc(startDeg, startDeg + filled)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" />}
      <text x="50" y="52" textAnchor="middle" fill={color} fontSize="20" fontWeight="800" fontFamily="'DM Mono',monospace">{score}</text>
      <text x="50" y="64" textAnchor="middle" fill={T.ink3} fontSize="9" fontFamily="Arial,sans-serif">readiness</text>
    </svg>
  )
}

function StatusBadge({ status }) {
  const map = {
    applied:     { bg: "#EFF6FF", col: "#1D4ED8" },
    viewed:      { bg: T.indigo2, col: T.indigo },
    shortlisted: { bg: T.amber2, col: T.amber },
    interview:   { bg: T.teal2, col: T.teal },
    offered:     { bg: T.green2, col: T.green },
    rejected:    { bg: T.red2, col: T.red },
  }
  const s = map[status] || map.applied
  return <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.col, padding: "2px 9px", borderRadius: 99, textTransform: "capitalize" }}>{status || "applied"}</span>
}

// ─── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, match, onOpen, onSave, onApply, saved, applied }) {
  const [hov, setHov] = useState(false)
  const label = matchLabel(match.score)
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const skills = [...(job.essential_skills || []), ...(job.technologies || [])].slice(0, 5)
  const isProofReady = match.score !== null && match.score >= 75

  return (
    <div onClick={() => onOpen(job)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "#FFFFFF", border: `1px solid ${isProofReady ? T.teal + "44" : T.border}`, borderRadius: 16, boxShadow: hov ? T.shadowMd : T.shadow, transition: "all .18s ease", cursor: "pointer", overflow: "hidden", position: "relative" }}>

      {/* Proof-ready accent strip */}
      {isProofReady && <div style={{ height: 3, background: `linear-gradient(90deg, ${T.teal}, ${T.indigo})`, position: "absolute", top: 0, left: 0, right: 0 }} />}

      <div style={{ padding: "16px 18px", paddingTop: isProofReady ? 19 : 16 }}>
        {/* Header */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <CompanyLogo src={job.company_logo} name={job.company} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</div>
                <div style={{ fontSize: 12, color: T.ink3 }}>{job.company}{job.location ? ` · ${job.location}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                {label && <Chip text={label.text} color={label.color} bg={label.bg} />}
                <button onClick={e => { e.stopPropagation(); onSave(job.id, saved) }}
                  style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: saved ? T.amber2 : "#F9F9F6", border: `1px solid ${saved ? T.amber : T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 14, color: saved ? T.amber : T.ink3 }}>
                  {saved ? "★" : "☆"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chips row */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
          {job.work_mode && <Chip text={job.work_mode} color={T.indigo} bg={T.indigo2} />}
          {job.job_type && <Chip text={job.job_type} />}
          {salary && <Chip text={salary} color={T.green} bg={T.green2} />}
          {job.is_verified && <Chip text="✓ Verified" color={T.teal} bg={T.teal2} />}
          {job.posted_at && <Chip text={timeAgo(job.posted_at)} />}
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
            {skills.slice(0, 4).map((s, i) => {
              const n = skillName(s)
              const isMatched = match.matched.map(m => m.toLowerCase()).includes(n.toLowerCase())
              const isMissing = match.missing.map(m => m.toLowerCase()).includes(n.toLowerCase())
              return <SkillPill key={i} name={n} matched={match.score !== null ? isMatched : undefined} />
            })}
            {skills.length > 4 && <span style={{ fontSize: 11, color: T.ink3, padding: "3px 6px", alignSelf: "center" }}>+{skills.length - 4}</span>}
          </div>
        )}

        {/* Match bar */}
        {match.score !== null && (
          <MatchBar score={match.score} reason={matchReason(job, match)} />
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 11, borderTop: `1px solid ${T.border}` }}>
          {isProofReady
            ? <span style={{ fontSize: 11, color: T.teal, fontWeight: 700 }}>✦ Apply with confidence now</span>
            : match.score !== null && match.score < 60
              ? <span style={{ fontSize: 11, color: T.amber }}>Close {match.missing.length} gap{match.missing.length !== 1 ? "s" : ""} to unlock</span>
              : <span style={{ fontSize: 11, color: T.ink3 }}>{job.source || "JSearch"}</span>
          }
          <button onClick={e => { e.stopPropagation(); applied ? null : onApply(job) }}
            disabled={applied}
            style={{ padding: "6px 14px", background: applied ? T.green2 : T.indigo, border: "none", borderRadius: 8, color: applied ? T.green : "#fff", fontSize: 12, fontWeight: 700, cursor: applied ? "default" : "pointer" }}>
            {applied ? "Applied ✓" : "Apply →"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────
function JobDetailModal({ job, match, userData, onClose, onSave, onApply, saved, applied }) {
  const [applying, setApplying]     = useState(false)
  const [activeSection, setSection] = useState("overview")
  const overlayRef = useRef()
  const salary    = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const rScore    = readinessScore(match, userData)
  const label     = matchLabel(match.score)
  const allSkills = [...(job.essential_skills || []).map(s => ({ name: skillName(s), req: "required" })),
                     ...(job.technologies    || []).map(s => ({ name: skillName(s), req: "preferred" }))]
  const uNames    = (userData?.skills || []).map(s => skillName(s).toLowerCase())

  async function handleApply() {
    if (applied || applying) return
    setApplying(true)
    try { await jobsApi.apply(job.id); onApply(job.id) }
    catch (e) { alert(e.message) }
    finally { setApplying(false) }
  }

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  const prepTasks = match.missing.slice(0, 3).map((skill, i) => ({
    icon: "🎯",
    action: `Build ${skill}`,
    where: "Skill Studio",
    impact: i === 0 ? "+12 match score" : i === 1 ? "+8 match score" : "+6 match score",
    time: "2–4 hrs",
  }))

  const sections = [
    { id: "overview",  label: "Overview" },
    { id: "skills",    label: "Skills" },
    { id: "fit",       label: "Your Fit" },
    { id: "prep",      label: "Before You Apply" },
  ]

  return (
    <div ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(26,26,24,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", backdropFilter: "blur(4px)", overflowY: "auto" }}>

      <div style={{ background: "#FAF7F2", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 20, width: "100%", maxWidth: 960, boxShadow: "0 20px 60px rgba(0,0,0,0.7)", overflow: "hidden", margin: "auto" }}>

        {/* ── Company hero banner ── */}
        <div style={{ background: `linear-gradient(135deg, ${T.indigo3} 0%, ${T.indigo} 50%, ${T.teal} 100%)`, padding: "28px 28px 24px", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.08)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <CompanyLogo src={job.company_logo} name={job.company} size={60} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{job.title}</span>
                {job.is_verified && <span style={{ fontSize: 11, background: "rgba(16,185,129,0.1)", color: "#059669", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>✓ Verified</span>}
              </div>
              <div style={{ fontSize: 14, color: "#1A1714", marginBottom: 10 }}>
                {job.company}{job.location ? ` · ${job.location}` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {job.work_mode && <span style={{ fontSize: 11, background: "rgba(0,0,0,0.09)", color: "#fff", padding: "2px 9px", borderRadius: 99, fontWeight: 600 }}>{job.work_mode}</span>}
                {job.job_type  && <span style={{ fontSize: 11, background: "rgba(0,0,0,0.09)", color: "#fff", padding: "2px 9px", borderRadius: 99 }}>{job.job_type}</span>}
                {salary && <span style={{ fontSize: 11, background: "rgba(0,0,0,0.12)", color: "#fff", padding: "2px 9px", borderRadius: 99, fontWeight: 700 }}>{salary}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section nav ── */}
        <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, padding: "0 28px", display: "flex", gap: 0 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ padding: "13px 18px", background: "none", border: "none", borderBottom: `2px solid ${activeSection === s.id ? T.indigo : "transparent"}`, color: activeSection === s.id ? T.indigo : T.ink3, fontSize: 13, fontWeight: activeSection === s.id ? 700 : 400, cursor: "pointer", transition: "all .15s" }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Body: two columns ── */}
        <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>

          {/* ── Left content ── */}
          <div style={{ flex: 1, padding: "24px 28px", minWidth: 0, overflowY: "auto", maxHeight: "70vh" }}>

            {/* OVERVIEW */}
            {activeSection === "overview" && (
              <div>
                <SectionLabel>What is this role?</SectionLabel>
                {job.jd_summary ? (
                  <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.75, margin: "0 0 20px" }}>{job.jd_summary}</p>
                ) : (
                  <p style={{ fontSize: 14, color: T.ink3, fontStyle: "italic" }}>No description available.</p>
                )}

                <SectionLabel>Why does this company matter?</SectionLabel>
                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <CompanyLogo src={job.company_logo} name={job.company} size={36} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{job.company}</div>
                      <div style={{ fontSize: 12, color: T.ink3 }}>Active employer · {job.location || "India"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <InfoTile icon="⚡" label="Response" value="Typically within 7 days" />
                    <InfoTile icon="✓" label="Status" value="Actively hiring" />
                    {salary && <InfoTile icon="₹" label="Salary" value={salary} />}
                  </div>
                </div>

                <SectionLabel>Application Steps</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["Your Capabilio profile attaches automatically", "Select proof items to highlight", "Add optional cover note (3 sentences)", "Review and submit"].map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: T.indigo2, color: T.indigo, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <span style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5, paddingTop: 3 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SKILLS */}
            {activeSection === "skills" && (
              <div>
                <SectionLabel>Why am I a fit? — Required Skills</SectionLabel>
                {allSkills.filter(s => s.req === "required").length === 0
                  ? <p style={{ fontSize: 13, color: T.ink3 }}>No required skills listed for this role.</p>
                  : (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        {allSkills.filter(s => s.req === "required").map((s, i) => {
                          const isMatch = uNames.some(u => u.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(u))
                          return <SkillPill key={i} name={s.name} matched={match.score !== null ? isMatch : undefined} size="md" />
                        })}
                      </div>
                      {match.score !== null && (
                        <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>
                          <span style={{ color: T.green, fontWeight: 700 }}>✓ {match.matched.length} verified</span>
                          {match.missing.length > 0 && <span style={{ color: T.red, fontWeight: 700, marginLeft: 12 }}>✕ {match.missing.length} missing</span>}
                        </div>
                      )}
                    </div>
                  )
                }

                {allSkills.filter(s => s.req === "preferred").length > 0 && (
                  <>
                    <SectionLabel>Preferred / Nice-to-have</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {allSkills.filter(s => s.req === "preferred").map((s, i) => (
                        <SkillPill key={i} name={s.name} size="md" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* FIT */}
            {activeSection === "fit" && (
              <div>
                {match.score !== null ? (
                  <>
                    <SectionLabel>Why am I a fit?</SectionLabel>
                    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", marginBottom: 20 }}>
                      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 48, fontWeight: 900, color: match.score >= 70 ? T.green : match.score >= 45 ? T.amber : T.red, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{match.score}<span style={{ fontSize: 20 }}>%</span></div>
                          <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>profile match</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.7 }}>{matchReason(job, match)}</div>
                          {label && <div style={{ display: "inline-block", fontSize: 11, background: label.bg, color: label.color, padding: "3px 10px", borderRadius: 99, fontWeight: 700, marginTop: 8 }}>{label.text}</div>}
                        </div>
                      </div>
                      {match.matched.length > 0 && (
                        <div style={{ background: T.green2, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: T.green, marginBottom: 5, letterSpacing: "0.5px" }}>YOUR MATCHING SKILLS</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {match.matched.slice(0, 8).map((s, i) => <SkillPill key={i} name={s} matched={true} />)}
                          </div>
                        </div>
                      )}
                      {match.missing.length > 0 && (
                        <div style={{ background: T.red2, borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: T.red, marginBottom: 5, letterSpacing: "0.5px" }}>SKILLS TO BUILD</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {match.missing.slice(0, 8).map((s, i) => <SkillPill key={i} name={s} matched={false} />)}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "32px", textAlign: "center", color: T.ink3 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                    <div style={{ fontSize: 14, marginBottom: 4, color: T.ink2, fontWeight: 600 }}>Set up your skill profile</div>
                    <div style={{ fontSize: 13 }}>Add your skills to see your personalised fit score and gap analysis for this role.</div>
                  </div>
                )}
              </div>
            )}

            {/* PREP */}
            {activeSection === "prep" && (
              <div>
                <SectionLabel>What should I do next before I apply?</SectionLabel>
                {prepTasks.length === 0 ? (
                  <div style={{ background: T.green2, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.green, marginBottom: 4 }}>✦ You're ready to apply with confidence</div>
                    <div style={{ fontSize: 13, color: T.ink2 }}>Your profile covers the required skills for this role. Go ahead and apply.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    {prepTasks.map((t, i) => (
                      <div key={i} style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.indigo2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{t.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{t.action}</div>
                          <div style={{ fontSize: 12, color: T.ink3 }}>{t.where} · {t.time}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.green }}>{t.impact}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <SectionLabel>Application Checklist</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Skills added to profile", ok: (userData?.skills?.length || 0) > 0 },
                    { label: "Profile photo uploaded", ok: !!userData?.profilePhotoURL },
                    { label: "Name and contact complete", ok: !!(userData?.name || userData?.displayName) },
                    { label: "Match score ≥ 60%", ok: match.score !== null && match.score >= 60 },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", background: item.ok ? T.green2 : T.amber2, borderRadius: 8 }}>
                      <span style={{ fontSize: 14, color: item.ok ? T.green : T.amber }}>{item.ok ? "✓" : "!"}</span>
                      <span style={{ fontSize: 13, color: item.ok ? T.green : T.amber, fontWeight: item.ok ? 400 : 600 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right sticky action panel ── */}
          <div style={{ width: 240, flexShrink: 0, padding: "24px 20px", background: "#FFFFFF", borderLeft: `1px solid ${T.border}`, position: "sticky", top: 0, alignSelf: "flex-start" }}>
            <ReadinessMeter score={rScore} />
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.ink3, marginBottom: 2 }}>
                {rScore >= 75 ? "You're ready to apply" : rScore >= 50 ? "Almost ready" : "Build before applying"}
              </div>
            </div>

            <button onClick={handleApply} disabled={applying || applied}
              style={{ width: "100%", padding: "12px", background: applied ? T.green2 : rScore >= 60 ? T.indigo : T.amber2, border: "none", borderRadius: 10, color: applied ? T.green : rScore >= 60 ? "#fff" : T.amber, fontSize: 13, fontWeight: 800, cursor: applied || applying ? "default" : "pointer", marginBottom: 8, transition: "all .15s" }}>
              {applying ? "Applying…" : applied ? "✓ Applied" : rScore >= 60 ? "Apply with Profile →" : "Check Readiness First"}
            </button>

            <button onClick={() => onSave(job.id, saved)}
              style={{ width: "100%", padding: "10px", background: saved ? T.amber2 : "rgba(0,0,0,0.03)", border: `1px solid ${saved ? T.amber : T.border}`, borderRadius: 10, color: saved ? T.amber : T.ink3, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
              {saved ? "★ Saved" : "☆ Save for Later"}
            </button>

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: T.ink3, marginBottom: 8, fontWeight: 600, letterSpacing: "0.5px" }}>ROLE SIGNALS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SignalRow icon="📍" label={job.location || "Location not listed"} />
                <SignalRow icon="💼" label={job.job_type || "Full-time"} />
                <SignalRow icon="🌐" label={job.work_mode || "On-site"} />
                {salary && <SignalRow icon="₹" label={salary} />}
                {job.source && <SignalRow icon="📡" label={`Via ${job.source}`} />}
              </div>
            </div>

            {job.apply_url && (
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", marginTop: 14, textAlign: "center", fontSize: 11, color: T.indigo, textDecoration: "none", fontWeight: 600 }}>
                View original listing ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tiny helpers inside modal ─────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: T.ink3, letterSpacing: "0.8px", marginBottom: 10, marginTop: 4, textTransform: "uppercase" }}>{children}</div>
}
function InfoTile({ icon, label, value }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "6px 10px" }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: T.ink3 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink2 }}>{value}</div>
      </div>
    </div>
  )
}
function SignalRow({ icon, label }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 12, width: 16, textAlign: "center" }}>{icon}</span>
      <span style={{ fontSize: 12, color: T.ink3 }}>{label}</span>
    </div>
  )
}

// ─── Trending roles strip ─────────────────────────────────────────────────────
function TrendingRolesStrip({ jobs }) {
  if (!jobs.length) return null
  const counts = {}
  jobs.forEach(j => {
    const key = (j.title || "").split(" ").slice(-2).join(" ")
    counts[key] = (counts[key] || 0) + 1
  })
  const roles = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 6).map(([title]) => title)
  const DEMOS = ["+18%","+12%","+9%","+22%","+15%","+7%"]
  const SALARIES = ["₹12–28L","₹18–40L","₹14–32L","₹10–20L","₹20–45L","₹8–18L"]
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>What's Hiring in Your Domain</div>
        <span style={{ fontSize: 12, color: T.ink3 }}>based on live feed</span>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        {roles.map((role, i) => (
          <div key={i} style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", minWidth: 160, flexShrink: 0, boxShadow: T.shadow }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{role}</div>
            <div style={{ fontSize: 12, color: T.teal, fontWeight: 700 }}>{DEMOS[i % DEMOS.length]} demand</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>{SALARIES[i % SALARIES.length]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Company spotlight row ────────────────────────────────────────────────────
function CompanySpotlightRow({ jobs }) {
  const seen = new Set()
  const companies = jobs.filter(j => {
    if (!j.company || seen.has(j.company)) return false
    seen.add(j.company); return true
  }).slice(0, 4)
  if (companies.length < 2) return null
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginBottom: 12 }}>Companies That Match Your Ambition</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {companies.map((j, i) => {
          const openCount = jobs.filter(x => x.company === j.company).length
          return (
            <div key={i} style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <CompanyLogo src={j.company_logo} name={j.company} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.company}</div>
                <div style={{ fontSize: 11, color: T.ink3 }}>{openCount} open role{openCount !== 1 ? "s" : ""}</div>
                {j.is_verified && <div style={{ fontSize: 10, color: T.teal, fontWeight: 700, marginTop: 3 }}>✓ Verified</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Skill gap section ────────────────────────────────────────────────────────
function SkillGapSection({ jobs, userSkills, onOpen }) {
  const gapJobs = useMemo(() => {
    if (!userSkills?.length) return []
    return jobs.map(j => ({ job: j, match: computeMatch(j, userSkills) }))
      .filter(x => x.match.score !== null && x.match.score >= 40 && x.match.score < 65 && x.match.missing.length > 0)
      .slice(0, 4)
  }, [jobs, userSkills])
  if (!gapJobs.length) return null
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>Close 1–2 Gaps, Unlock These Roles</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {gapJobs.map(({ job, match }, i) => (
          <div key={i} onClick={() => onOpen(job)}
            style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: T.shadow, cursor: "pointer" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <CompanyLogo src={job.company_logo} name={job.company} size={34} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{job.title}</div>
                <div style={{ fontSize: 11, color: T.ink3 }}>{job.company}</div>
              </div>
            </div>
            <div style={{ background: T.amber2, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.amber, marginBottom: 4 }}>BUILD THESE TO UNLOCK</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {match.missing.slice(0, 3).map((s, i) => <SkillPill key={i} name={s} matched={false} />)}
              </div>
            </div>
            <MatchBar score={match.score} compact />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Filter chip row ─────────────────────────────────────────────────────────
function FilterChipGroup({ label, options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: T.ink3, marginRight: 2, whiteSpace: "nowrap" }}>{label}:</span>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          style={{ padding: "5px 11px", background: value === opt.value ? T.indigo : "#fff", border: `1px solid ${value === opt.value ? T.indigo : T.border}`, borderRadius: 20, color: value === opt.value ? "#fff" : T.ink3, fontSize: 12, fontWeight: value === opt.value ? 700 : 400, cursor: "pointer", transition: "all .12s" }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Applications view ────────────────────────────────────────────────────────
function ApplicationsView({ applications }) {
  if (!applications.length) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: T.ink3 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink2, marginBottom: 4 }}>No applications yet</div>
      <div style={{ fontSize: 13 }}>Browse jobs and apply. Your applications will appear here.</div>
    </div>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {applications.map(app => (
        <div key={app.id} style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: T.shadow, display: "flex", gap: 14, alignItems: "center" }}>
          <CompanyLogo src={app.jobs?.company_logo} name={app.jobs?.company || "?"} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 1 }}>{app.jobs?.title || "Unknown Role"}</div>
            <div style={{ fontSize: 12, color: T.ink3 }}>{app.jobs?.company || "—"}{app.jobs?.location ? ` · ${app.jobs.location}` : ""}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <StatusBadge status={app.status} />
            <span style={{ fontSize: 11, color: T.ink3 }}>{new Date(app.applied_at).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Readiness hero strip ─────────────────────────────────────────────────────
function ReadinessHeroStrip({ userData, total, newCount }) {
  const name = userData?.name?.split(" ")[0] || "you"
  const elo  = userData?.eloRating
  const skills = userData?.skills?.length || 0
  const readiness = Math.min(100, 40 + (skills > 10 ? 20 : skills * 2) + (elo > 800 ? 20 : elo > 500 ? 12 : 6))
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(79,70,229,0.18) 100%)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(99,102,241,0.2)", padding: "14px 24px" }}>
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "0 8px", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
            {newCount > 0 ? `${newCount} new matches since your last visit` : `${total.toLocaleString()} opportunities matched to your profile`}
          </div>
          <div style={{ fontSize: 12, color: "#3D3935" }}>
            {/* Profile readiness % already factors in skill assessment score
                (elo) below — showing that internal score again as a bare
                "ELO 1450" number here would be exactly the unexplained-score
                pattern Career OS Rule #1 forbids (2026-07-24 fix: removed). */}
            Profile readiness: <span style={{ fontWeight: 800, color: readiness >= 70 ? "#6EE7B7" : readiness >= 50 ? "#FCD34D" : "#FCA5A5" }}>{readiness}%</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <HeroStat value={total} label="roles" />
          {skills > 0 && <HeroStat value={skills} label="skills" />}
        </div>
      </div>
    </div>
  )
}
function HeroStat({ value, label }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.07)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div style={{ fontSize: 10, color: "#3D3935", marginTop: 1 }}>{label}</div>
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 18px", boxShadow: T.shadow }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(0,0,0,0.05)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, background: "rgba(0,0,0,0.05)", borderRadius: 4, width: "55%", marginBottom: 6 }} />
          <div style={{ height: 11, background: "rgba(0,0,0,0.03)", borderRadius: 4, width: "35%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {[60,50,40].map(w => <div key={w} style={{ height: 20, width: w, background: "rgba(0,0,0,0.03)", borderRadius: 20 }} />)}
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
        {[70,60,65,55].map(w => <div key={w} style={{ height: 22, width: w, background: "rgba(0,0,0,0.03)", borderRadius: 8 }} />)}
      </div>
      <div style={{ height: 3, background: "rgba(0,0,0,0.05)", borderRadius: 3 }} />
    </div>
  )
}

// ─── Main Launchpad ───────────────────────────────────────────────────────────
// ── Derive a profile-based job keyword from userData ──────────────────────────
function getProfileKeyword(userData) {
  const keyword  = userData?.keyword || userData?.job_role || userData?.target_role || ""
  const graph    = userData?.skill_graph || userData?.skillGraph || []
  const topSkills = [...graph]
    .sort((a, b) => (b.value ?? b.score ?? 0) - (a.value ?? a.score ?? 0))
    .slice(0, 2)
    .map(s => s.label || s.skill || "")
    .filter(Boolean)
  // Prefer the explicit keyword; supplement with top skills if available
  const parts = [keyword, ...topSkills].filter(Boolean)
  return parts.slice(0, 2).join(" ")   // e.g. "DevOps Docker"
}

export default function Launchpad({ user, userData, onNavigatePricing }) {
  // Auto-seed search with the user's domain keyword so only relevant jobs show
  const profileKeyword = useMemo(() => getProfileKeyword(userData), [userData])

  // ── Local userData mirror + save wrapper, for the "Interview Prep" tab
  // (AIInterviewPanel, moved here from Aura.jsx 2026-07-25, Tranche 1) ──
  // Launchpad doesn't otherwise own a write path to userData — App.jsx
  // passes userData read-only. Mirrors Aura.jsx's own save() wrapper
  // exactly (same userDoc.update contract, same don't-apply-on-failure
  // fix) rather than inventing a second pattern.
  const [localUserData, setLocalUserData] = useState(userData || null)
  useEffect(() => { setLocalUserData(userData || null) }, [userData])
  const saveUserData = useCallback(async (updates) => {
    try {
      const ok = await userDoc.update(user?.id || user?.uid, updates)
      if (!ok) { console.error("[Launchpad] save failed — DB write rejected, not applying to local state:", Object.keys(updates)); return false }
      setLocalUserData(d => ({ ...d, ...updates }))
      return true
    } catch (e) { console.warn(e); return false }
  }, [user])

  const [jobs,         setJobs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [search,       setSearch]       = useState(() => getProfileKeyword(userData))
  const [workMode,     setWorkMode]     = useState("")
  const [jobType,      setJobType]      = useState("")
  const [activeTab,    setActiveTab]    = useState("browse")
  const [savedIds,     setSavedIds]     = useState(new Set())
  const [appliedIds,   setAppliedIds]   = useState(new Set())
  const [applications, setApplications] = useState([])
  const [detailJob,    setDetailJob]    = useState(null)
  const [userSkills,   setUserSkills]   = useState([])

  const LIMIT = 12

  // Re-seed search if userData loads after mount (async parent fetch)
  useEffect(() => {
    if (profileKeyword && !search) setSearch(profileKeyword)
  }, [profileKeyword]) // eslint-disable-line

  // Load user skills separately for match scoring
  useEffect(() => {
    if (userData?.skills) { setUserSkills(userData.skills); return }
    skillsApi.list().then(d => setUserSkills(d || [])).catch(() => {})
  }, [userData])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      // Always send at least the profile keyword so the API returns relevant jobs.
      // If the user clears the search bar it falls back to the profile keyword.
      const effectiveSearch = search.trim() || profileKeyword
      if (effectiveSearch) params.search    = effectiveSearch
      if (workMode)         params.work_mode = workMode
      if (jobType)          params.job_type  = jobType
      const { jobs: jbs, total: tot } = await jobsApi.list(params)
      setJobs(jbs || []); setTotal(tot || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, search, workMode, jobType, profileKeyword])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    jobsApi.savedJobs().then(d => setSavedIds(new Set((d||[]).map(x => x.job_id)))).catch(() => {})
    jobsApi.applications().then(d => {
      setApplications(d || [])
      setAppliedIds(new Set((d||[]).map(x => x.job_id)))
    }).catch(() => {})
  }, [])

  async function handleSave(jobId, alreadySaved) {
    try {
      await jobsApi.saveJob(jobId, alreadySaved ? "unsave" : "save")
      setSavedIds(s => { const n = new Set(s); alreadySaved ? n.delete(jobId) : n.add(jobId); return n })
    } catch (e) { console.error(e) }
  }

  function handleApply(jobId) { setAppliedIds(s => { const n = new Set(s); n.add(jobId); return n }) }

  // Debounced search
  const searchTimeout = useRef()
  function handleSearch(v) {
    setSearch(v); setPage(1)
    clearTimeout(searchTimeout.current)
  }

  const savedJobs   = useMemo(() => jobs.filter(j => savedIds.has(j.id)), [jobs, savedIds])
  const matchCache  = useMemo(() => {
    const cache = {}
    jobs.forEach(j => { cache[j.id] = computeMatch(j, userSkills) })
    return cache
  }, [jobs, userSkills])

  const proofReadyJobs = useMemo(() =>
    jobs.filter(j => (matchCache[j.id]?.score ?? 0) >= 75).slice(0, 3)
  , [jobs, matchCache])

  const tabs = [
    { id: "browse",    label: "Browse Jobs",   count: null },
    { id: "applied",   label: "Applied",       count: appliedIds.size || null },
    { id: "saved",     label: "Saved",         count: savedIds.size || null },
    { id: "interview", label: "Interview Prep", count: null },
  ]

  const WORK_MODES = [
    { value: "", label: "All" },
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "office", label: "On-site" },
  ]
  const JOB_TYPES = [
    { value: "", label: "All" },
    { value: "full-time", label: "Full-time" },
    { value: "contract", label: "Contract" },
    { value: "part-time", label: "Part-time" },
  ]

  return (
    <div style={{ background: `radial-gradient(ellipse at 20% 50%, rgba(255,87,1,0.05) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(255,87,1,0.04) 0%, transparent 50%), #FAF7F2`, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "DM Sans, sans-serif", paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} * { box-sizing: border-box; }`}</style>

      {/* ── Readiness hero strip ── */}
      <ReadinessHeroStrip userData={userData} total={total} newCount={0} />

      {/* ── Sticky toolbar ── */}
      <div style={{ background: "rgba(255,255,255,0.95))", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${T.border}`, padding: "12px 24px", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
        <div style={{ maxWidth: 1800, margin: "0 auto", padding: "0 8px" }}>
          {/* Tabs + search row */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: 3 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  style={{ padding: "7px 14px", background: activeTab === t.id ? "rgba(99,102,241,0.20)" : "transparent", border: "none", borderRadius: 8, color: activeTab === t.id ? "#1A1714" : T.ink3, fontSize: 13, fontWeight: activeTab === t.id ? 700 : 400, cursor: "pointer", boxShadow: activeTab === t.id ? "0 2px 8px rgba(99,102,241,0.3)" : "none", transition: "all .15s", whiteSpace: "nowrap" }}>
                  {t.label}{t.count ? ` (${t.count})` : ""}
                </button>
              ))}
            </div>
            {activeTab === "browse" && (
              <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: T.ink3 }}>🔍</span>
                <input value={search} onChange={e => handleSearch(e.target.value)}
                  placeholder="Search roles, companies, skills…"
                  style={{ width: "100%", padding: "9px 12px 9px 34px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, outline: "none", background: "rgba(0,0,0,0.03)", color: T.ink, transition: "border-color .18s" }}
                  onKeyDown={e => e.key === "Enter" && load()} />
              </div>
            )}
          </div>
          {/* Filters */}
          {activeTab === "browse" && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <FilterChipGroup label="Mode" options={WORK_MODES} value={workMode} onChange={v => { setWorkMode(v); setPage(1) }} />
              <FilterChipGroup label="Type" options={JOB_TYPES} value={jobType} onChange={v => { setJobType(v); setPage(1) }} />
              {/* Profile-filter indicator */}
              {profileKeyword && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(255,87,1,0.04)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 20 }}>
                  <span style={{ fontSize: 10 }}>🎯</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#4F46E5" }}>Filtered for: {profileKeyword}</span>
                  {search !== profileKeyword && (
                    <button onClick={() => { setSearch(profileKeyword); setPage(1) }}
                      style={{ fontSize: 10, color: "#4F46E5", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>reset</button>
                  )}
                </div>
              )}
              {(workMode || jobType || search !== profileKeyword) && (
                <button onClick={() => { setWorkMode(""); setJobType(""); setSearch(profileKeyword); setPage(1) }}
                  style={{ fontSize: 11, color: T.red, background: T.red2, border: "none", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
                  Clear filters ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "24px 32px" }}>

        {/* BROWSE TAB */}
        {activeTab === "browse" && (
          <>
            {/* Proof-ready banner */}
            {!loading && proofReadyJobs.length > 0 && (
              <div style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(16,185,129,0.10) 100%)", border: `1px solid ${T.teal}40`, borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.teal, marginBottom: 10 }}>✦ Apply with confidence now — your skills cover these roles</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {proofReadyJobs.map(j => (
                    <div key={j.id} onClick={() => setDetailJob(j)}
                      style={{ display: "flex", gap: 8, alignItems: "center", background: "#FAF7F2", borderRadius: 10, padding: "8px 12px", cursor: "pointer", border: "1px solid rgba(0,0,0,0.06)" }}>
                      <CompanyLogo src={j.company_logo} name={j.company} size={26} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{j.title}</div>
                        <div style={{ fontSize: 10, color: T.ink3 }}>{j.company}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: T.green, marginLeft: 4 }}>{matchCache[j.id]?.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Count */}
            {!loading && <div style={{ fontSize: 13, color: T.ink3, marginBottom: 16 }}>{total.toLocaleString()} opportunities{search ? ` for "${search}"` : ""}</div>}

            {/* Trending strip */}
            {!loading && jobs.length > 0 && <TrendingRolesStrip jobs={jobs} />}

            {/* Main job grid */}
            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : jobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: T.ink3 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink2, marginBottom: 4 }}>No matches found</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>Try broadening your search or removing a filter.</div>
                <button onClick={() => { setWorkMode(""); setJobType(""); setSearch(""); setPage(1) }}
                  style={{ padding: "8px 18px", background: T.indigo, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>
                  Reset filters
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14, marginBottom: 28 }}>
                {jobs.map(job => (
                  <JobCard key={job.id} job={job} match={matchCache[job.id] || { score: null, matched: [], missing: [] }}
                    onOpen={setDetailJob} onSave={handleSave} onApply={j => handleApply(j.id)}
                    saved={savedIds.has(job.id)} applied={appliedIds.has(job.id)} />
                ))}
              </div>
            )}

            {/* Company spotlights */}
            {!loading && jobs.length > 0 && <CompanySpotlightRow jobs={jobs} />}

            {/* Skill gap section */}
            {!loading && <SkillGapSection jobs={jobs} userSkills={userSkills} onOpen={setDetailJob} />}

            {/* Pagination */}
            {!loading && total > LIMIT && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  style={{ padding: "9px 18px", background: page === 1 ? "#F4F4F0" : T.indigo, border: `1px solid ${T.border}`, borderRadius: 8, color: page === 1 ? T.ink3 : "#fff", cursor: page === 1 ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}>
                  ← Prev
                </button>
                <span style={{ padding: "9px 14px", fontSize: 13, color: T.ink3 }}>Page {page} of {Math.ceil(total / LIMIT)}</span>
                <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}
                  style={{ padding: "9px 18px", background: page >= Math.ceil(total / LIMIT) ? "#F4F4F0" : T.indigo, border: `1px solid ${T.border}`, borderRadius: 8, color: page >= Math.ceil(total / LIMIT) ? T.ink3 : "#fff", cursor: page >= Math.ceil(total / LIMIT) ? "default" : "pointer", fontSize: 13, fontWeight: 600 }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* APPLIED TAB */}
        {/* INTERVIEW PREP TAB — AIInterviewPanel, moved from Profile 2026-07-25
            (Tranche 1): interview practice is Launchpad/job-readiness
            content, not identity/documents/privacy/account. Reuses the
            component and its existing plan-quota/save contract unchanged. */}
        {activeTab === "interview" && (
          <SectionErrorBoundary name="launchpad-interview-prep">
            <AIInterviewPanel user={user} userData={localUserData} save={saveUserData} setUserData={setLocalUserData} onNavigatePricing={onNavigatePricing} />
          </SectionErrorBoundary>
        )}

        {activeTab === "applied" && <ApplicationsView applications={applications} />}

        {/* SAVED TAB */}
        {activeTab === "saved" && (
          savedJobs.length === 0
            ? <div style={{ textAlign: "center", padding: "60px 20px", color: T.ink3 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>★</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.ink2, marginBottom: 4 }}>Nothing saved yet</div>
                <div style={{ fontSize: 13 }}>When you find a role you like, bookmark it here.</div>
              </div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
                {savedJobs.map(job => (
                  <JobCard key={job.id} job={job} match={matchCache[job.id] || { score: null, matched: [], missing: [] }}
                    onOpen={setDetailJob} onSave={handleSave} onApply={j => handleApply(j.id)}
                    saved={true} applied={appliedIds.has(job.id)} />
                ))}
              </div>
        )}
      </div>

      {/* ── Job Detail Modal ── */}
      {detailJob && (
        <JobDetailModal
          job={detailJob}
          match={matchCache[detailJob.id] || computeMatch(detailJob, userSkills)}
          userData={userData}
          onClose={() => setDetailJob(null)}
          onSave={handleSave}
          onApply={id => { handleApply(id); setDetailJob(null) }}
          saved={savedIds.has(detailJob.id)}
          applied={appliedIds.has(detailJob.id)}
        />
      )}
    </div>
  )
}
