/**
 * SkillStudio.jsx — Capabilio AI-Native Skill Mastery Workspace
 * Role-specific · Gap-driven · Proof-centric
 * Design: Glassmorphic Cosmos
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { supabase } from "../lib/supabase"
import { getSkillModule } from "../config/skillModules"
import { resolveArenaKey, getRoleConfig } from "../config/roleConfig"

const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const D = {
  void:    "#FFFFFF",
  base:    "#FAF7F2",
  raised:  "#FFFFFF",
  float:   "#F5F5F5",
  glass:   "rgba(0,0,0,0.03)",
  glassH:  "rgba(0,0,0,0.06)",
  border:  "rgba(0,0,0,0.05)",
  borderH: "rgba(0,0,0,0.08)",
  indigo:  "#6366F1",
  gold:    "#F59E0B",
  emerald: "#10B981",
  rose:    "#F43F5E",
  violet:  "#8B5CF6",
  cyan:    "#06B6D4",
  amber:   "#F59E0B",
  text1:   "#1A1714",
  text2:   "#475569",
  muted:   "#6B6560",
}

const DOMAIN_COLOR = {
  // IT
  cyber:"#F43F5E", frontend:"#6366F1", backend:"#8B5CF6",
  fullstack:"#06B6D4", data:"#10B981", dba:"#06B6D4",
  devops:"#F59E0B", aws:"#F59E0B", azure:"#06B6D4",
  swe:"#6366F1",
  // ECE
  embedded:"#8B5CF6", vlsi:"#7C3AED", hardware:"#6D28D9", rf:"#A78BFA", iot:"#06B6D4", ece:"#8B5CF6",
  // EEE
  power:"#F59E0B", electrical:"#D97706", eee:"#F59E0B",
  // Mechanical
  mechanical:"#10B981", design:"#059669", manufacturing:"#047857",
  // Civil
  civil:"#6366F1", structural:"#4F46E5", site:"#4338CA",
  // Others
  pharmacy:"#EC4899", mba:"#0EA5E9",
  medical:"#10B981",
  default:"#6366F1",
}
const DOMAIN_ICON = {
  // IT
  cyber:"🔐", frontend:"🎨", backend:"⚙️", fullstack:"🧩",
  data:"📊", dba:"🗄️", devops:"🚀", aws:"☁️", azure:"💠", swe:"💻",
  // ECE
  embedded:"🔧", vlsi:"🔲", hardware:"🖥️", rf:"📡", iot:"🌐", ece:"🔌",
  // EEE
  power:"⚡", electrical:"🔌", eee:"⚡",
  // Mechanical
  mechanical:"⚙️", design:"📐", manufacturing:"🏭",
  // Civil
  civil:"🏗️", structural:"🏛️", site:"🦺",
  // Others
  pharmacy:"💊", mba:"📈",
  medical:"🏥",
  default:"⚡",
}

const apiPost = async (path, body) => {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// resolveDomainKey now delegates to the centralized roleConfig
function resolveDomainKey(keyword = "") {
  return resolveArenaKey(keyword)
}

function buildGaps(skillGraph, weakAreas) {
  const seen = new Set()
  const gaps = []
  ;(skillGraph || []).sort((a, b) => (a.value || 0) - (b.value || 0)).forEach((s) => {
    const name = s.label || s.skill
    if (!name || seen.has(name)) return
    seen.add(name)
    const score = Math.round(s.value || s.score || 0)
    gaps.push({ name, score, target: 75, gap: Math.max(0, 75 - score), isCritical: score < 50 })
  })
  ;(weakAreas || []).forEach((w, i) => {
    if (!w || seen.has(w)) return
    seen.add(w)
    const score = 35 + i * 8
    gaps.push({ name: w, score, target: 75, gap: 75 - score, isCritical: i < 2 })
  })
  return gaps.slice(0, 8)
}

function computeDecay(skillGraph, arenaHistory) {
  const recentSkills = new Set(
    (arenaHistory || [])
      .filter((h) => { const d = h.completedAt || h.submitted_at; return d && Date.now() - new Date(d).getTime() < 15 * 86400000 })
      .flatMap((h) => [h.skill, h.category, h.domain].filter(Boolean))
  )
  return (skillGraph || [])
    .filter((s) => (s.value || 0) > 55 && !recentSkills.has(s.label || s.skill))
    .slice(0, 3)
    .map((s) => {
      const last = (arenaHistory || []).filter((h) => h.skill === s.label || h.category === s.label)
        .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))[0]
      const daysAgo = last ? Math.floor((Date.now() - new Date(last.completedAt || last.submitted_at).getTime()) / 86400000) : 30
      return { name: s.label || s.skill, score: Math.round(s.value || 0), daysAgo, severity: daysAgo > 25 ? "high" : "medium" }
    })
}

function buildRecommendations(learningPath, weakAreas, skillGraph, arenaHistory, jobTitle, eloRating) {
  const recs = []
  const seen = new Set()
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

  const arenaFails = (arenaHistory || []).filter((h) => (h.review?.score || h.score || 0) < 70)
  const failSkills = [...new Set(arenaFails.map((h) => h.skill || h.category).filter(Boolean))].slice(0, 3)
  failSkills.forEach((skill, i) => {
    if (seen.has(skill)) return
    seen.add(skill)
    recs.push({ id: `af-${i}`, type: "practice", skill, priorityScore: 95 - i * 3,
      title: `Fix ${skill} — Arena gap detected`,
      why: `You failed ${arenaFails.filter((h) => (h.skill || h.category) === skill).length} Arena ${skill} challenges. This is directly blocking your ELO.`,
      proof: "Arena performance record", eloGain: 15 + i * 3, duration: "15 min",
      difficulty: "Intermediate", recruiterDemand: "High", preScore: 28, postScore: 72 })
  })

  ;(weakAreas || []).slice(0, 4).forEach((skill, i) => {
    if (seen.has(skill)) return
    seen.add(skill)
    recs.push({ id: `wa-${i}`, type: i < 2 ? "learn" : "practice", skill, priorityScore: 88 - i * 5,
      title: `${i < 2 ? "Learn" : "Practice"} ${skill}`,
      why: `Your assessment flagged ${skill} below market target. ${i === 0 ? "3 open JDs in your domain list this as required." : "Practice closes the gap faster than reading."}`,
      proof: i < 2 ? "Skill badge" : "Practice record", eloGain: 10 + i * 2, duration: i < 2 ? "18 min" : "12 min",
      difficulty: "Intermediate", recruiterDemand: i === 0 ? "High" : "Medium", preScore: 35 + i * 8, postScore: 70 + i * 2 })
  })

  const phases = learningPath?.phases || []
  phases.forEach((phase, pi) => {
    ;(phase.actions || phase.topics || []).slice(0, 3).forEach((item, ti) => {
      const skill = item.skill || item
      if (!skill || seen.has(skill)) return
      seen.add(skill)
      recs.push({ id: `lp-${pi}-${ti}`, type: item.type || "learn", skill, priorityScore: Math.max(50, 80 - pi * 10 - ti * 4),
        title: item.title || `${cap(item.type || "learn")} ${skill}`,
        why: `Part of Phase ${phase.phase || pi + 1} (${phase.title || "Foundation"}) in your roadmap. Unlocks the next phase on completion.`,
        proof: "Module completion badge", eloGain: item.xp ? Math.round(item.xp * 0.2) : 8, duration: "20 min",
        difficulty: item.level || "Intermediate", recruiterDemand: "Medium", preScore: 40 + ti * 6, postScore: 72 + ti * 2 })
    })
  })

  return recs.slice(0, 12)
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function Chip({ children, color = D.indigo, bg, style: extraStyle = {} }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color,
      background: bg || color + "20", border: `1px solid ${color}30`, ...extraStyle }}>
      {children}
    </span>
  )
}

function Spinner({ size = 18, color = D.indigo }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}30`, borderTopColor: color, borderRadius: "50%", animation: "ss-spin 0.7s linear infinite", flexShrink: 0 }} />
}

function SkeletonBar({ width = "100%", height = 10, radius = 4, style: s = {} }) {
  return <div style={{ width, height, borderRadius: radius, background: "rgba(0,0,0,0.03)", animation: "ss-pulse 1.5s ease-in-out infinite", ...s }} />
}

function ScoreBar({ score, target = 75, height = 5 }) {
  const pct = Math.max(3, Math.min(100, score))
  const tPct = Math.min(100, target)
  const barColor = score < 50 ? D.rose : score < 65 ? D.gold : D.emerald
  return (
    <div style={{ position: "relative", height, background: "rgba(0,0,0,0.05)", borderRadius: 99 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 0.6s ease", boxShadow: `0 0 8px ${barColor}60` }} />
      <div style={{ position: "absolute", top: -3, left: `${tPct}%`, width: 2, height: height + 6, background: D.muted, borderRadius: 1, transform: "translateX(-50%)" }} />
    </div>
  )
}

// ─── ROLE DNA MAP ─────────────────────────────────────────────────────────────
function RoleDNAMap({ skillGraph, weakAreas, domainColor, onSkillClick, activeSkill }) {
  const skills = useMemo(() => {
    const s = []
    ;(skillGraph || []).slice(0, 8).forEach((sk) => s.push({ name: sk.label || sk.skill, score: Math.round(sk.value || sk.score || 0) }))
    ;(weakAreas || []).slice(0, Math.max(0, 5 - s.length)).forEach((w) => { if (!s.find((x) => x.name === w)) s.push({ name: w, score: 35 }) })
    if (!s.length) s.push({ name: "Core Skills", score: 50 }, { name: "Domain", score: 55 }, { name: "Practice", score: 45 }, { name: "Theory", score: 60 })
    return s.slice(0, 8)
  }, [skillGraph, weakAreas])

  const cx = 110, cy = 110, r = 78
  const n = skills.length
  const pts = skills.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    const ratio = (s.score / 100) * r
    return { x: cx + ratio * Math.cos(angle), y: cy + ratio * Math.sin(angle), lx: cx + (r + 20) * Math.cos(angle), ly: cy + (r + 20) * Math.sin(angle), angle, skill: s }
  })

  const tiers = [0.33, 0.66, 1]
  return (
    <div>
      <svg width={220} height={220} viewBox="0 0 220 220" style={{ display: "block", margin: "0 auto" }}>
        {tiers.map((t, ti) => (
          <polygon key={ti} points={skills.map((_, i) => { const a = (i / n) * 2 * Math.PI - Math.PI / 2; return `${cx + t * r * Math.cos(a)},${cy + t * r * Math.sin(a)}` }).join(" ")}
            fill="none" stroke={D.border} strokeWidth={1} strokeDasharray={ti < 2 ? "3,3" : "none"} />
        ))}
        {skills.map((_, i) => { const a = (i / n) * 2 * Math.PI - Math.PI / 2; return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke={D.border} strokeWidth={1} /> })}
        <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill={domainColor + "18"} stroke={domainColor} strokeWidth={1.5} />
        {pts.map((p, i) => {
          const nc = p.skill.score < 50 ? D.rose : p.skill.score < 65 ? D.gold : D.emerald
          const active = activeSkill === p.skill.name
          const isLeft = p.lx < cx - 5
          const short = p.skill.name.length > 10 ? p.skill.name.slice(0, 9) + "…" : p.skill.name
          return (
            <g key={i} onClick={() => onSkillClick(p.skill.name)} style={{ cursor: "pointer" }}>
              <circle cx={p.x} cy={p.y} r={active ? 7 : 5} fill={nc} stroke={D.void} strokeWidth={2} />
              {active && <circle cx={p.x} cy={p.y} r={11} fill="none" stroke={nc} strokeWidth={1.5} opacity={0.5} />}
              <text x={p.lx} y={p.ly - 4} textAnchor={isLeft ? "end" : "start"} fontSize={8} fontWeight={active ? 800 : 600} fill={active ? nc : D.muted}>{short}</text>
              <text x={p.lx} y={p.ly + 7} textAnchor={isLeft ? "end" : "start"} fontSize={8} fill={D.muted}>{p.skill.score}%</text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r={18} fill={domainColor + "20"} stroke={domainColor} strokeWidth={1.5} />
        <text x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle" fontSize={8} fontWeight={800} fill={domainColor}>ROLE</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 6 }}>
        {[{ c: D.rose, l: "<50%" }, { c: D.gold, l: "50-65%" }, { c: D.emerald, l: ">65%" }].map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.c }} />
            <span style={{ fontSize: 9, color: D.muted }}>{d.l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── NBA QUEUE ────────────────────────────────────────────────────────────────
function NBAQueue({ recs, completedSet, onStart, loading }) {
  const queue = (recs || []).filter((r) => !completedSet.has(r.id)).slice(0, 3)
  const DOT = { learn: D.indigo, practice: D.gold, prove: D.rose, interview: D.violet }
  const ICON = { learn: "📚", practice: "🏋", prove: "⚔", interview: "🎤" }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ padding: "12px 14px", background: D.glass, borderRadius: 12, border: `1px solid ${D.border}` }}>
          <SkeletonBar width="55%" height={8} style={{ marginBottom: 6 }} />
          <SkeletonBar width="85%" height={7} />
        </div>
      ))}
    </div>
  )

  if (!queue.length) return (
    <div style={{ padding: "18px 14px", textAlign: "center", background: D.glass, borderRadius: 12, border: `1px solid ${D.border}` }}>
      <div style={{ fontSize: 20, marginBottom: 5 }}>🏆</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: D.emerald, marginBottom: 4 }}>All caught up!</div>
      <div style={{ fontSize: 10, color: D.muted, lineHeight: 1.5 }}>Complete an Arena session to surface new gaps.</div>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {queue.map((r, i) => {
        const dot = DOT[r.type] || D.indigo
        return (
          <div key={r.id} onClick={() => onStart(r)}
            style={{ padding: "12px 14px", background: D.glass, border: `1px solid ${D.border}`, borderRadius: 12, cursor: "pointer", transition: "all 0.18s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = dot; e.currentTarget.style.background = dot + "15" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.background = D.glass }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, boxShadow: `0 0 6px ${dot}` }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: dot, letterSpacing: 0.8, textTransform: "uppercase" }}>{ICON[r.type]} {r.type}</span>
              {i === 0 && <span style={{ marginLeft: "auto", fontSize: 8, fontWeight: 800, color: D.rose, background: D.rose + "20", padding: "1px 6px", borderRadius: 99, border: `1px solid ${D.rose}30` }}>DO FIRST</span>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.text1, marginBottom: 3, lineHeight: 1.3 }}>{r.title}</div>
            <div style={{ fontSize: 10, color: D.muted, lineHeight: 1.4, marginBottom: 6 }}>{r.why.slice(0, 70)}{r.why.length > 70 ? "…" : ""}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: D.muted }}>{r.duration} · +{r.eloGain} ELO</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: dot }}>Start →</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── DIAGNOSE TAB ─────────────────────────────────────────────────────────────
function DiagnoseTab({ gaps, decayAlerts, jobTitle, domainColor, onSkillFocus }) {
  const critical   = gaps.filter((g) => g.isCritical)
  const developing = gaps.filter((g) => !g.isCritical && g.gap > 0)
  const healthy    = gaps.filter((g) => g.score >= 75)

  const GapRow = ({ g }) => (
    <div style={{ padding: "13px 0", borderBottom: `1px solid ${D.border}`, cursor: "pointer" }} onClick={() => onSkillFocus(g.name)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: D.text1 }}>{g.name}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Chip color={g.score < 50 ? D.rose : g.score < 65 ? D.gold : D.emerald}>{g.score < 50 ? "CRITICAL" : g.score < 65 ? "DEVELOPING" : "OK"}</Chip>
          <span style={{ fontSize: 12, fontWeight: 800, color: D.text2, fontFamily: "'DM Mono',monospace" }}>{g.score}<span style={{ color: D.muted, fontWeight: 400 }}>/100</span></span>
        </div>
      </div>
      <ScoreBar score={g.score} target={g.target} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10, color: D.muted }}>Current: {g.score}%</span>
        <span style={{ fontSize: 10, color: D.muted }}>Target: {g.target}% · Gap: {g.gap}pts → click to study</span>
      </div>
    </div>
  )

  return (
    <div style={{ animation: "ss-fade 0.25s ease" }}>
      <div style={{ background: `linear-gradient(135deg, ${domainColor}15, ${domainColor}05)`, border: `1px solid ${domainColor}30`, borderRadius: 16, padding: "20px 24px", marginBottom: 18, backdropFilter: "blur(12px)" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: domainColor, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>Role Gap Analysis</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: D.text1, marginBottom: 5 }}>What you're weak at for <span style={{ color: domainColor }}>{jobTitle}</span></div>
        <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.6 }}>Based on your assessment, Arena history, and market benchmarks. Click any skill to filter modules.</div>
      </div>

      {critical.length > 0 && (
        <div style={{ background: D.raised, border: `1px solid ${D.rose}25`, borderRadius: 16, padding: "20px 24px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: D.rose, boxShadow: `0 0 8px ${D.rose}` }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: D.rose, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Critical gaps — blocking your readiness</span>
          </div>
          <div style={{ fontSize: 11, color: D.muted, marginBottom: 4 }}>Fix these first. They're the highest priority for {jobTitle} roles.</div>
          {critical.map((g, i) => <GapRow key={i} g={g} />)}
        </div>
      )}

      {developing.length > 0 && (
        <div style={{ background: D.raised, border: `1px solid ${D.gold}20`, borderRadius: 16, padding: "20px 24px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: D.gold, boxShadow: `0 0 8px ${D.gold}` }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: D.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Developing — needed for mid/senior roles</span>
          </div>
          <div style={{ fontSize: 11, color: D.muted, marginBottom: 4 }}>Not urgent yet, but required for promotion-level positions.</div>
          {developing.map((g, i) => <GapRow key={i} g={g} />)}
        </div>
      )}

      {healthy.length > 0 && (
        <div style={{ background: D.raised, border: `1px solid ${D.emerald}20`, borderRadius: 16, padding: "18px 24px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: D.emerald, boxShadow: `0 0 8px ${D.emerald}` }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: D.emerald, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Strengths — recruiters can verify these</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {healthy.map((g, i) => (
              <div key={i} style={{ padding: "5px 12px", background: D.emerald + "15", border: `1px solid ${D.emerald}30`, borderRadius: 99, fontSize: 11, fontWeight: 600, color: D.emerald }}>✓ {g.name} {g.score}%</div>
            ))}
          </div>
        </div>
      )}

      {decayAlerts.length > 0 && (
        <div style={{ background: D.raised, border: `1px solid ${D.gold}25`, borderRadius: 16, padding: "18px 24px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <span>⏳</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: D.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Concept decay alerts</span>
          </div>
          <div style={{ fontSize: 11, color: D.muted, marginBottom: 12 }}>Skills you know but haven't practiced recently. They may be weakening.</div>
          {decayAlerts.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < decayAlerts.length - 1 ? `1px solid ${D.border}` : "none" }}>
              <span style={{ fontSize: 14 }}>{d.severity === "high" ? "🔴" : "🟡"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: D.text1 }}>{d.name} — {d.score}%</div>
                <div style={{ fontSize: 10, color: D.gold, marginTop: 2 }}>Last practiced {d.daysAgo} days ago</div>
              </div>
              <Chip color={D.gold}>Refresh</Chip>
            </div>
          ))}
        </div>
      )}

      {!gaps.length && (
        <div style={{ textAlign: "center", padding: "60px 24px", background: D.raised, border: `1px solid ${D.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧭</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: D.text1, marginBottom: 8 }}>No diagnosis data yet</div>
          <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.6 }}>Complete your assessment and at least one Arena challenge to generate a gap analysis.</div>
        </div>
      )}
    </div>
  )
}

// ─── ROADMAP TAB ──────────────────────────────────────────────────────────────
function RoadmapTab({ learningPath, loading, eloRating, domainColor, jobTitle, onStartAction }) {
  const phases = learningPath?.phases || []
  const eloTiers = [800, 900, 1050, 1200]
  const currentPhase = Math.max(0, eloTiers.findIndex((t) => eloRating < t) - 1)

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ padding: "20px 24px", background: D.raised, border: `1px solid ${D.border}`, borderRadius: 16 }}>
          <SkeletonBar width="35%" height={11} style={{ marginBottom: 10 }} />
          <SkeletonBar width="65%" height={8} style={{ marginBottom: 7 }} />
          <SkeletonBar width="50%" height={8} />
        </div>
      ))}
    </div>
  )

  if (!phases.length) return (
    <div style={{ textAlign: "center", padding: "60px 24px", background: D.raised, border: `1px solid ${D.border}`, borderRadius: 16 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: D.text1, marginBottom: 8 }}>Building your roadmap…</div>
      <div style={{ fontSize: 12, color: D.muted }}>Generating a personalised phase plan for <strong style={{ color: D.text2 }}>{jobTitle}</strong>.</div>
    </div>
  )

  return (
    <div style={{ animation: "ss-fade 0.25s ease" }}>
      <div style={{ background: `linear-gradient(135deg, ${domainColor}14, ${domainColor}04)`, border: `1px solid ${domainColor}25`, borderRadius: 16, padding: "20px 24px", marginBottom: 18, backdropFilter: "blur(12px)" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: domainColor, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>Your Learning Roadmap</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: D.text1, marginBottom: 4 }}>Phase-by-phase path to <span style={{ color: domainColor }}>{jobTitle}</span> mastery</div>
        <div style={{ fontSize: 12, color: D.muted }}>ELO {eloRating} · {learningPath?.totalDuration || "8–12 weeks total"} · Expected gain: +{learningPath?.expectedEloGain || 200} ELO</div>
      </div>

      {phases.map((phase, pi) => {
        const isActive = pi === currentPhase
        const isDone   = pi < currentPhase
        const isLocked = pi > currentPhase + 1
        const eloTarget = eloTiers[pi + 1] || eloTiers[eloTiers.length - 1] + 150

        return (
          <div key={pi} style={{ position: "relative", marginBottom: 10 }}>
            {pi < phases.length - 1 && <div style={{ position: "absolute", left: 29, top: "100%", width: 2, height: 10, background: isDone ? D.emerald : D.border, zIndex: 0 }} />}
            <div style={{
              background: isLocked ? D.glass : D.raised,
              border: `1px solid ${isActive ? domainColor + "55" : isDone ? D.emerald + "35" : D.border}`,
              borderRadius: 16, padding: "18px 22px", opacity: isLocked ? 0.5 : 1,
              boxShadow: isActive ? `0 0 0 2px ${domainColor}20, 0 8px 32px ${domainColor}10` : "none",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: isDone ? D.emerald : isActive ? domainColor : "rgba(0,0,0,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  boxShadow: (isDone || isActive) ? `0 0 12px ${isDone ? D.emerald : domainColor}60` : "none",
                }}>
                  <span style={{ fontSize: 14, color: isDone || isActive ? "#fff" : D.muted }}>{isDone ? "✓" : isLocked ? "🔒" : pi + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: D.muted, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Phase {phase.phase || pi + 1}</span>
                    {isActive && <Chip color={domainColor}>YOU ARE HERE</Chip>}
                    {isDone && <Chip color={D.emerald}>COMPLETED</Chip>}
                    {isLocked && <Chip color={D.muted}>LOCKED</Chip>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: D.text1 }}>{phase.title || `Phase ${pi + 1}`}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>ELO Target</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: isActive ? domainColor : D.text2, fontFamily: "'DM Mono',monospace" }}>{eloTarget}</div>
                  {phase.duration && <div style={{ fontSize: 10, color: D.muted, marginTop: 1 }}>{phase.duration}</div>}
                </div>
              </div>

              {phase.focus && <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.6, marginBottom: 12, paddingLeft: 46 }}>{phase.focus}</div>}

              {!isLocked && (phase.actions || []).length > 0 && (
                <div style={{ paddingLeft: 46, display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {(phase.actions || []).slice(0, 6).map((action, ai) => {
                    const tc = action.type === "learn" ? D.indigo : action.type === "practice" ? D.gold : action.type === "prove" ? D.rose : D.violet
                    const ti = action.type === "learn" ? "📚" : action.type === "practice" ? "🏋" : "⚔"
                    return (
                      <div key={ai} onClick={() => isActive && onStartAction({ id: `r-${pi}-${ai}`, type: action.type || "learn", title: action.title, skill: action.skill, why: `Phase ${pi + 1} roadmap: ${phase.title}`, duration: "15 min", eloGain: Math.round((action.xp || 50) * 0.2) })}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: tc + "15", border: `1px solid ${tc}30`, borderRadius: 99, cursor: isActive ? "pointer" : "default", transition: "all 0.15s" }}>
                        <span style={{ fontSize: 10 }}>{ti}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: tc }}>{action.skill || action.title}</span>
                        {action.xp && <span style={{ fontSize: 9, color: D.muted }}>+{action.xp}xp</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── MODULES TAB ──────────────────────────────────────────────────────────────
function ModulesTab({ recs, completedSet, domainColor, onStart, onComplete }) {
  const [filter, setFilter]     = useState("all")
  const [expandedId, setExpanded] = useState(null)

  const ACCENT = { learn: D.indigo, practice: D.gold, prove: D.rose, interview: D.violet }
  const ICON   = { learn: "📚", practice: "🏋", prove: "⚔", interview: "🎤" }
  const DEMAND_COLOR = { High: D.rose, Medium: D.gold, Low: D.emerald }
  const displayed = recs.filter((r) => filter === "all" || r.type === filter)

  return (
    <div style={{ animation: "ss-fade 0.25s ease" }}>
      <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {[{ id: "all", label: "All" }, { id: "learn", label: "📚 Learn" }, { id: "practice", label: "🏋 Practice" }, { id: "interview", label: "🎤 Interview" }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "6px 14px", borderRadius: 99,
            border: `1.5px solid ${filter === f.id ? domainColor : D.border}`,
            background: filter === f.id ? domainColor + "20" : "transparent",
            color: filter === f.id ? domainColor : D.muted,
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: D.muted }}>{displayed.filter((r) => !completedSet.has(r.id)).length} remaining</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayed.map((r) => {
          const done    = completedSet.has(r.id)
          const accent  = ACCENT[r.type] || D.indigo
          const isOpen  = expandedId === r.id
          const prePct  = Math.round((r.preScore / 100) * 100)
          const postPct = Math.round((r.postScore / 100) * 100)

          return (
            <div key={r.id} style={{
              background: D.raised,
              border: `1px solid ${done ? D.emerald + "35" : isOpen ? accent + "45" : D.border}`,
              borderRadius: 16, overflow: "hidden", opacity: done ? 0.6 : 1,
              boxShadow: isOpen ? `0 4px 24px ${accent}15` : "none",
            }}>
              <div style={{ padding: "16px 20px", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : r.id)}>
                <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7 }}>
                      <Chip color={accent}>{ICON[r.type] || "📚"} {(r.type || "LEARN").toUpperCase()}</Chip>
                      {r.recruiterDemand && <Chip color={DEMAND_COLOR[r.recruiterDemand] || D.indigo}>Recruiter demand: {r.recruiterDemand}</Chip>}
                      {done && <Chip color={D.emerald}>✓ Done</Chip>}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 3, fontFamily: "'DM Mono',monospace" }}>Why this now</div>
                    <div style={{ fontSize: 11, color: D.muted, lineHeight: 1.5, marginBottom: 7 }}>{r.why}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: D.text1, lineHeight: 1.3 }}>{r.title}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: D.gold, fontFamily: "'DM Mono',monospace" }}>+{r.eloGain} ELO</div>
                    <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{r.duration}</div>
                    <div style={{ fontSize: 14, color: D.muted, marginTop: 6 }}>{isOpen ? "▲" : "▼"}</div>
                  </div>
                </div>
              </div>

              {isOpen && (() => {
                const mod = getSkillModule(r.skill)
                const RES_ICON = { video: "▶️", docs: "📄", article: "📰", interactive: "🎮" }
                const RES_COLOR = { video: "#F43F5E", docs: D.indigo, article: D.emerald, interactive: D.violet }
                return (
                  <div style={{ padding: "0 20px 18px", borderTop: `1px solid ${D.border}` }}>

                    {/* ── W3Schools-style content panel ── */}
                    {mod ? (
                      <div style={{ marginTop: 14 }}>
                        {/* Concept */}
                        <div style={{ background: accent + "08", border: `1px solid ${accent}20`, borderRadius: 12, padding: "13px 16px", marginBottom: 10 }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>📖 What is {r.skill}?</div>
                          <div style={{ fontSize: 12, color: D.text2, lineHeight: 1.75 }}>{mod.concept}</div>
                        </div>

                        {/* Key points */}
                        <div style={{ background: D.glass, border: `1px solid ${D.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 10 }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: D.indigo, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>🔑 Key points</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                            {(mod.keyPoints || []).map((pt, ki) => (
                              <div key={ki} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: D.indigo + "18", color: D.indigo, fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontFamily: "'DM Mono',monospace" }}>{ki + 1}</div>
                                <div style={{ fontSize: 11, color: D.text2, lineHeight: 1.6, fontFamily: "'DM Mono',monospace" }}>{pt}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Try this */}
                        {mod.tryThis && (
                          <div style={{ background: D.gold + "10", border: `1px solid ${D.gold}25`, borderRadius: 12, padding: "11px 15px", marginBottom: 10 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: D.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>✋ Try this right now</div>
                            <div style={{ fontSize: 11, color: D.text2, lineHeight: 1.65 }}>{mod.tryThis}</div>
                          </div>
                        )}

                        {/* Resources */}
                        {(mod.resources || []).length > 0 && (
                          <div style={{ background: D.raised, border: `1px solid ${D.border}`, borderRadius: 12, padding: "11px 15px", marginBottom: 14 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>🔗 Free resources</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {(mod.resources || []).map((res, ri) => {
                                const ic = RES_ICON[res.type] || "🔗"
                                const tc = RES_COLOR[res.type] || D.indigo
                                return (
                                  <a key={ri} href={res.url} target="_blank" rel="noreferrer"
                                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", background: tc + "10", border: `1px solid ${tc}22`, borderRadius: 9, textDecoration: "none" }}>
                                    <span style={{ fontSize: 13 }}>{ic}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: tc, flex: 1 }}>{res.title}</span>
                                    <span style={{ fontSize: 10, color: D.muted }}>↗</span>
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* No static content: show resource links pointing to YouTube/freeCodeCamp */
                      <div style={{ marginTop: 14, background: D.glass, border: `1px solid ${D.border}`, borderRadius: 12, padding: "12px 15px", marginBottom: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>📖 Before you start — study the basics</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[
                            { i: "▶️", l: `YouTube: ${r.skill} basics`, c: "#F43F5E", url: `https://youtube.com/results?search_query=${encodeURIComponent(r.skill + " explained beginner")}` },
                            { i: "📄", l: `W3Schools: ${r.skill}`, c: D.indigo, url: `https://www.w3schools.com/` },
                            { i: "💻", l: `freeCodeCamp: ${r.skill}`, c: D.emerald, url: `https://freecodecamp.org/news/search/?query=${encodeURIComponent(r.skill)}` },
                          ].map((res, ri) => (
                            <a key={ri} href={res.url} target="_blank" rel="noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", background: res.c + "10", border: `1px solid ${res.c}22`, borderRadius: 9, textDecoration: "none" }}>
                              <span style={{ fontSize: 13 }}>{res.i}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: res.c, flex: 1 }}>{res.l}</span>
                              <span style={{ fontSize: 10, color: D.muted }}>↗</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Confidence forecast ── */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Mono',monospace" }}>Confidence Forecast</span>
                        <span style={{ fontSize: 10, color: D.muted }}>{r.preScore}% → <strong style={{ color: D.emerald }}>{r.postScore}%</strong></span>
                      </div>
                      <div style={{ position: "relative", height: 5, background: "rgba(0,0,0,0.05)", borderRadius: 99 }}>
                        <div style={{ width: `${prePct}%`, height: "100%", background: D.gold, borderRadius: 99 }} />
                        <div style={{ position: "absolute", top: 0, left: `${prePct}%`, width: `${postPct - prePct}%`, height: "100%", background: D.emerald + "50", borderRadius: "0 99px 99px 0", borderLeft: `2px dashed ${D.emerald}` }} />
                      </div>
                      <div style={{ fontSize: 9, color: D.muted, marginTop: 3 }}>Expected +{r.postScore - r.preScore}pt improvement after completing</div>
                    </div>

                    {/* ── CTA buttons ── */}
                    <div style={{ display: "flex", gap: 8 }}>
                      {!done && <button onClick={() => onStart(r)} style={{ flex: 1, padding: "10px 14px", background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, border: "none", borderRadius: 11, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 14px ${accent}40` }}>
                        {r.type === "learn" ? "Take practice quiz →" : r.type === "practice" ? "Start Practice →" : "Start Drill →"}
                      </button>}
                      {!done && <button onClick={() => onComplete(r)} style={{ padding: "10px 14px", background: D.glass, border: `1px solid ${D.border}`, borderRadius: 11, color: D.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Mark done</button>}
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}

        {!displayed.length && (
          <div style={{ textAlign: "center", padding: "48px 24px", background: D.raised, border: `1px solid ${D.border}`, borderRadius: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: D.text1, marginBottom: 6 }}>No modules yet</div>
            <div style={{ fontSize: 12, color: D.muted }}>Complete your assessment or Arena sessions to generate personalised modules.</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PRACTICE TAB ─────────────────────────────────────────────────────────────
function PracticeTab({ arenaHistory, gaps, domainColor, jobTitle }) {
  const recent = (arenaHistory || []).slice(0, 5)
  const practiceRecs = gaps.filter((g) => g.isCritical || g.gap > 15).slice(0, 4)

  return (
    <div style={{ animation: "ss-fade 0.25s ease" }}>
      <div style={{ background: D.raised, border: `1px solid ${D.gold}25`, borderRadius: 16, padding: "20px 24px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: D.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>⚡ Arena-Linked Practice</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: D.text1, marginBottom: 4 }}>Challenges mapped to your gaps</div>
        <div style={{ fontSize: 12, color: D.muted, marginBottom: 16 }}>Complete these in Arena to convert learning into verified performance records.</div>

        {practiceRecs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {practiceRecs.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: D.gold + "10", border: `1px solid ${D.gold}20`, borderRadius: 12 }}>
                <span style={{ fontSize: 18 }}>🎯</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: D.text1, marginBottom: 2 }}>{g.name} Challenge</div>
                  <div style={{ fontSize: 11, color: D.muted }}>Gap: {g.gap}pts · Medium · +15 ELO</div>
                  <div style={{ fontSize: 10, color: D.gold, marginTop: 2 }}>Generates an Arena performance proof artifact</div>
                </div>
                <a href="/arena" style={{ padding: "7px 13px", background: `linear-gradient(135deg, ${D.gold}, ${D.gold}cc)`, borderRadius: 9, color: D.void, fontSize: 11, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>Go to Arena →</a>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px", background: D.glass, borderRadius: 12, border: `1px solid ${D.border}` }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>🏟️</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: D.text1, marginBottom: 4 }}>No practice recs yet</div>
            <div style={{ fontSize: 11, color: D.muted }}>Complete your assessment to generate Arena-linked practice missions.</div>
          </div>
        )}
      </div>

      <div style={{ background: D.raised, border: `1px solid ${D.border}`, borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: D.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, fontFamily: "'DM Mono',monospace" }}>Recent Arena Missions</div>
        {recent.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((h, i) => {
              const score = h.review?.score || h.score || 0
              const sc    = score >= 80 ? D.emerald : score >= 60 ? D.gold : D.rose
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: D.glass, borderRadius: 11, border: `1px solid ${D.border}` }}>
                  <span style={{ fontSize: 18 }}>{score >= 80 ? "🏆" : score >= 60 ? "⚡" : "💪"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: D.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title || "Arena Mission"}</div>
                    <div style={{ fontSize: 10, color: D.muted, marginTop: 1 }}>{h.difficulty || "Medium"} · {h.domain || h.category || jobTitle}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: sc, fontFamily: "'DM Mono',monospace" }}>{score}<span style={{ fontSize: 9, color: D.muted }}>/100</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px", color: D.muted, fontSize: 12 }}>
            No Arena missions yet. <a href="/arena" style={{ color: domainColor, fontWeight: 700 }}>Start in Arena →</a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PROOF TAB ────────────────────────────────────────────────────────────────
function ProofTab({ completedActions, recs, arenaHistory, gaps, domainColor }) {
  const completedSet = new Set(completedActions)
  const doneRecs     = recs.filter((r) => completedSet.has(r.id))
  const arenaProofs  = (arenaHistory || []).filter((h) => (h.review?.score || h.score || 0) >= 70)
  const proofGaps    = gaps.filter((g) => g.score >= 55 && !doneRecs.find((r) => r.skill === g.name))

  return (
    <div style={{ animation: "ss-fade 0.25s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {[
          { l: "Verified", v: doneRecs.length + arenaProofs.length, i: "⚡", c: D.emerald },
          { l: "Pending",  v: recs.filter((r) => !completedSet.has(r.id)).length, i: "⏳", c: D.gold },
          { l: "Naked Skills", v: proofGaps.length, i: "⚠️", c: D.rose },
        ].map((s, i) => (
          <div key={i} style={{ padding: "14px 16px", background: D.raised, border: `1px solid ${s.c}20`, borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.i}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.c, fontFamily: "'DM Mono',monospace" }}>{s.v}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: D.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {(doneRecs.length > 0 || arenaProofs.length > 0) && (
        <div style={{ background: D.raised, border: `1px solid ${D.emerald}20`, borderRadius: 16, padding: "18px 22px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 12 }}>
            <span>✅</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: D.emerald, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Verified skills — visible on recruiter profile</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {doneRecs.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: D.emerald + "10", border: `1px solid ${D.emerald}25`, borderRadius: 11 }}>
                <span style={{ fontSize: 16 }}>🏅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: D.text1 }}>{r.skill} — {r.proof}</div>
                  <div style={{ fontSize: 10, color: D.emerald, marginTop: 1 }}>Completed · Added to profile</div>
                </div>
                <Chip color={D.emerald}>Verified</Chip>
              </div>
            ))}
            {arenaProofs.slice(0, 3).map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: D.emerald + "10", border: `1px solid ${D.emerald}25`, borderRadius: 11 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: D.text1 }}>{h.title || "Arena Mission"} — Performance Record</div>
                  <div style={{ fontSize: 10, color: D.emerald, marginTop: 1 }}>Score: {h.review?.score || h.score || 70}/100</div>
                </div>
                <Chip color={D.emerald}>Arena proof</Chip>
              </div>
            ))}
          </div>
        </div>
      )}

      {proofGaps.length > 0 && (
        <div style={{ background: D.raised, border: `1px solid ${D.rose}25`, borderRadius: 16, padding: "18px 22px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 8 }}>
            <span>⚠️</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: D.rose, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Naked skills — recruiters can't verify these</span>
          </div>
          <div style={{ fontSize: 11, color: D.muted, lineHeight: 1.5, marginBottom: 12 }}>You know these skills but have no proof. Recruiters can't trust what they can't verify.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {proofGaps.map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: D.rose + "10", border: `1px solid ${D.rose}25`, borderRadius: 99 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: D.text1 }}>{g.name} {g.score}%</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: D.rose }}>Prove →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {doneRecs.length === 0 && arenaProofs.length === 0 && proofGaps.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px", background: D.raised, border: `1px solid ${D.border}`, borderRadius: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏗️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: D.text1, marginBottom: 8 }}>No proof artifacts yet</div>
          <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.6 }}>Complete a module or Arena challenge to generate recruiter-visible evidence.</div>
        </div>
      )}
    </div>
  )
}

// ─── LEARN PANEL (W3Schools-style static content from skillModules.js) ─────────
function LearnPanel({ module: mod, skillName, accent, onProceed }) {
  const TYPE_ICON = { video: "▶️", docs: "📄", article: "📰", interactive: "🎮" }
  const TYPE_COLOR = { video: "#F43F5E", docs: D.indigo, article: D.emerald, interactive: D.violet }

  return (
    <div style={{ animation: "ss-fade 0.2s ease" }}>
      {/* Concept card */}
      <div style={{ background: accent + "10", border: `1px solid ${accent}25`, borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7, fontFamily: "'DM Mono',monospace" }}>What is {skillName}?</div>
        <div style={{ fontSize: 13, color: D.text2, lineHeight: 1.75 }}>{mod.concept}</div>
      </div>

      {/* Key points */}
      <div style={{ background: D.raised, border: `1px solid ${D.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: D.indigo, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, fontFamily: "'DM Mono',monospace" }}>Key points</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {(mod.keyPoints || []).map((pt, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: D.indigo + "20", border: `1px solid ${D.indigo}30`, color: D.indigo, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontFamily: "'DM Mono',monospace" }}>{i + 1}</div>
              <div style={{ fontSize: 12, color: D.text2, lineHeight: 1.6, fontFamily: "'DM Mono',monospace" }}>{pt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Try this */}
      {mod.tryThis && (
        <div style={{ background: D.gold + "10", border: `1px solid ${D.gold}25`, borderRadius: 14, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: D.gold, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>✋ Try this right now</div>
          <div style={{ fontSize: 12, color: D.text2, lineHeight: 1.7 }}>{mod.tryThis}</div>
        </div>
      )}

      {/* Free resources */}
      {(mod.resources || []).length > 0 && (
        <div style={{ background: D.raised, border: `1px solid ${D.border}`, borderRadius: 14, padding: "14px 18px", marginBottom: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, fontFamily: "'DM Mono',monospace" }}>Free resources</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(mod.resources || []).map((res, i) => {
              const ic = TYPE_ICON[res.type] || "🔗"
              const tc = TYPE_COLOR[res.type] || D.indigo
              return (
                <a key={i} href={res.url} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: tc + "10", border: `1px solid ${tc}25`, borderRadius: 10, textDecoration: "none" }}>
                  <span style={{ fontSize: 16 }}>{ic}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tc }}>{res.title}</div>
                    <div style={{ fontSize: 9, color: D.muted, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>{res.type}</div>
                  </div>
                  <span style={{ fontSize: 11, color: D.muted }}>↗</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Proceed button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onProceed}
          style={{ padding: "11px 22px", background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 16px ${accent}40` }}>
          Start Practice Quiz →
        </button>
      </div>
    </div>
  )
}

// ─── ACTION MODAL ─────────────────────────────────────────────────────────────
function ActionModal({ action, jobTitle, eloRating, onClose, onComplete }) {
  const staticMod = action ? getSkillModule(action.skill) : null
  // If we have static content and it's a learn module, show static first
  const initialPhase = (staticMod && action?.type === "learn") ? "static_learn" : "loading"

  const [phase, setPhase]       = useState(initialPhase)
  const [lesson, setLesson]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [quizIdx, setQuizIdx]   = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [answer, setAnswer]     = useState("")
  const [review, setReview]     = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const accent = { learn: D.indigo, practice: D.gold, interview: D.violet, prove: D.rose }[action?.type] || D.indigo

  // loadLesson is called either immediately (non-static) or when user clicks "Start Practice →"
  const [lessonLoading, setLessonLoading] = useState(false)
  const loadLesson = useCallback(async () => {
    if (lesson || lessonLoading) return
    setLessonLoading(true)
    setPhase("loading")
    try {
      const data = await apiPost("/api/skill-studio/lesson", {
        topic: action.skill, jobTitle,
        skillLevel: action.difficulty || "Intermediate",
        duration: action.type === "practice" || action.type === "interview" ? 12 : 18,
      })
      setLesson(data)
      setPhase(action.type === "learn" ? "learn" : "quiz")
    } catch {
      setPhase("fallback")
    }
    setLessonLoading(false)
  }, [action, jobTitle, lesson, lessonLoading])

  useEffect(() => {
    // Only auto-load if we didn't start in static_learn mode
    if (!action) return
    if (initialPhase === "static_learn") return // wait for user to click "Start Practice Quiz →"
    loadLesson()
  }, []) // eslint-disable-line

  if (!action) return null
  const curQ = lesson?.quiz?.[quizIdx]

  const handleAnswer = (idx) => {
    if (selected !== null) return
    setSelected(idx)
    const cIdx = typeof curQ.correct === "number" ? curQ.correct : ["A","B","C","D"].indexOf(curQ.correct)
    if (idx === cIdx) setQuizScore((s) => s + 1)
    setTimeout(() => {
      if (quizIdx + 1 < (lesson?.quiz?.length || 0)) { setQuizIdx((q) => q + 1); setSelected(null) }
      else setPhase(action.type === "learn" ? "done" : "task")
    }, 700)
  }

  const submitTask = async () => {
    setSubmitting(true)
    try {
      const res = await apiPost("/api/arena/review", { challenge: { title: action.title, difficulty: action.difficulty || "Intermediate", category: action.skill, objective: action.why }, answer, keyword: jobTitle, eloRating })
      setReview(res)
    } catch {
      setReview({ score: 72, summary: "Good attempt. Add concrete examples and measurable outcomes for a stronger answer.", grade: "B" })
    }
    setSubmitting(false); setPhase("done")
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.95))", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 800, maxHeight: "90vh", background: D.base, border: `1px solid ${D.border}`, borderRadius: 24, boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${accent}20`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${D.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: accent, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{action.type?.toUpperCase()} · {action.skill}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: D.text1 }}>{action.title}</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${D.border}`, background: D.glass, color: D.muted, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {phase === "static_learn" && staticMod && (
            <LearnPanel module={staticMod} skillName={action.skill} accent={accent}
              onProceed={() => loadLesson()} />
          )}

          {phase === "loading" && (
            <div style={{ textAlign: "center", padding: "48px 16px" }}>
              <Spinner size={40} color={accent} />
              <div style={{ fontSize: 17, fontWeight: 800, color: D.text1, marginTop: 18, marginBottom: 7 }}>Preparing your lesson</div>
              <div style={{ fontSize: 12, color: D.muted }}>Building a personalised {action.skill} module for {jobTitle}…</div>
            </div>
          )}

          {phase === "learn" && lesson && (
            <div>
              <div style={{ background: accent + "10", border: `1px solid ${accent}22`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: accent, fontWeight: 800, textTransform: "uppercase", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>Learning objective</div>
                <div style={{ fontSize: 12, color: D.text2, lineHeight: 1.6 }}>{lesson.objective || `Master the fundamentals of ${action.skill}.`}</div>
              </div>
              {(lesson.sections || []).map((s, i) => (
                <div key={i} style={{ background: D.raised, border: `1px solid ${D.border}`, borderRadius: 13, padding: "14px 17px", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: D.text1, marginBottom: 7 }}>{s.heading || s.title}</div>
                  <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.75 }}>{s.content}</div>
                  {s.codeExample && (
                    <pre style={{ background: D.void, color: "#A5B4FC", padding: "13px 15px", borderRadius: 9, fontSize: 11, overflow: "auto", marginTop: 10, lineHeight: 1.6, fontFamily: "'DM Mono',monospace", borderLeft: `3px solid ${D.indigo}` }}>
                      {s.codeExample}
                    </pre>
                  )}
                </div>
              ))}
              {lesson.practiceTask && <div style={{ background: D.gold + "10", border: `1px solid ${D.gold}22`, borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}><div style={{ fontSize: 9, color: D.gold, fontWeight: 800, textTransform: "uppercase", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>Practice task</div><div style={{ fontSize: 12, color: D.text2, lineHeight: 1.6 }}>{lesson.practiceTask}</div></div>}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {lesson.quiz?.length > 0
                  ? <button onClick={() => setPhase("quiz")} style={{ padding: "10px 18px", background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, border: "none", borderRadius: 11, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 14px ${accent}40` }}>Take quiz →</button>
                  : <button onClick={() => onComplete(action)} style={{ padding: "10px 18px", background: `linear-gradient(135deg, ${D.emerald}, ${D.emerald}cc)`, border: "none", borderRadius: 11, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Mark complete ✓</button>}
              </div>
            </div>
          )}

          {phase === "quiz" && curQ && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <Chip color={accent}>Q{quizIdx + 1} / {lesson.quiz.length}</Chip>
                <Chip color={D.emerald}>Score: {quizScore}</Chip>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: D.text1, lineHeight: 1.6, marginBottom: 16 }}>{curQ.question}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {(curQ.options || []).map((opt, i) => {
                  const cIdx = typeof curQ.correct === "number" ? curQ.correct : ["A","B","C","D"].indexOf(curQ.correct)
                  let bg = D.glass, border = D.border, color = D.text2
                  if (selected !== null && i === cIdx) { bg = D.emerald + "15"; border = D.emerald; color = D.emerald }
                  else if (selected !== null && i === selected) { bg = D.rose + "15"; border = D.rose; color = D.rose }
                  return <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null} style={{ textAlign: "left", padding: "12px 15px", borderRadius: 11, border: `1px solid ${border}`, background: bg, color, cursor: selected !== null ? "default" : "pointer", fontSize: 12, fontFamily: "inherit" }}>
                    <strong style={{ marginRight: 7 }}>{String.fromCharCode(65 + i)}.</strong>{opt}
                  </button>
                })}
              </div>
              {selected !== null && curQ.explanation && <div style={{ marginTop: 12, padding: "11px 14px", background: D.indigo + "15", border: `1px solid ${D.indigo}30`, borderRadius: 10, fontSize: 11, color: D.text2, lineHeight: 1.6 }}>💡 {curQ.explanation}</div>}
            </div>
          )}

          {phase === "task" && (
            <div>
              <div style={{ background: D.raised, border: `1px solid ${D.border}`, borderRadius: 13, padding: "14px 17px", marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: accent, fontWeight: 800, textTransform: "uppercase", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>Task brief</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: D.text1, marginBottom: 5 }}>{action.title}</div>
                <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.7 }}>{lesson?.practiceTask || action.why}</div>
              </div>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
                placeholder={`Demonstrate your ${action.skill} knowledge. Use a real ${jobTitle} context and concrete examples…`}
                style={{ width: "100%", minHeight: 180, background: D.raised, border: `1px solid ${D.border}`, borderRadius: 12, padding: "13px 15px", fontSize: 12, color: D.text2, lineHeight: 1.7, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button onClick={() => onComplete(action)} style={{ padding: "9px 14px", background: D.glass, border: `1px solid ${D.border}`, borderRadius: 10, color: D.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Skip</button>
                <button onClick={submitTask} disabled={!answer.trim() || submitting} style={{ padding: "10px 18px", background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, border: "none", borderRadius: 11, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", opacity: !answer.trim() || submitting ? 0.5 : 1 }}>{submitting ? "Reviewing…" : "Get AI feedback →"}</button>
              </div>
            </div>
          )}

          {phase === "fallback" && (
            <div>
              <div style={{ background: D.raised, border: `1px solid ${D.border}`, borderRadius: 13, padding: "14px 17px", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: D.text1, marginBottom: 5 }}>{action.title}</div>
                <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.7 }}>{action.why}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.text2, marginBottom: 10 }}>📚 Learn {action.skill} from these resources:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { i: "▶️", l: "YouTube", c: "#F43F5E", url: `https://youtube.com/results?search_query=${encodeURIComponent(action.skill + " " + jobTitle)}` },
                  { i: "🎓", l: "Coursera", c: D.indigo, url: `https://coursera.org/search?query=${encodeURIComponent(action.skill)}` },
                  { i: "💻", l: "freeCodeCamp", c: D.emerald, url: `https://freecodecamp.org/news/search/?query=${encodeURIComponent(action.skill)}` },
                ].map((r, ri) => (
                  <a key={ri} href={r.url} target="_blank" rel="noreferrer" style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 14px", background: r.c + "10", border: `1px solid ${r.c}25`, borderRadius: 11, textDecoration: "none" }}>
                    <span style={{ fontSize: 18 }}>{r.i}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.c }}>{r.l}: {action.skill}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: D.muted }}>↗</span>
                  </a>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={() => onComplete(action)} style={{ padding: "10px 18px", background: `linear-gradient(135deg, ${D.emerald}, ${D.emerald}cc)`, border: "none", borderRadius: 11, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Mark as done ✓</button>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div>
              <div style={{ textAlign: "center", padding: "22px 0 14px" }}>
                <div style={{ fontSize: 44, marginBottom: 9 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: D.text1, marginBottom: 5 }}>Module complete!</div>
                <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.6 }}>{action.skill} progress saved. Proof artifact queued for your profile.</div>
              </div>
              {review && (
                <div style={{ background: review.score >= 70 ? D.emerald + "10" : D.gold + "10", border: `1px solid ${review.score >= 70 ? D.emerald : D.gold}28`, borderRadius: 13, padding: "14px 17px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: review.score >= 70 ? D.emerald : D.gold, textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>AI Feedback</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: review.score >= 70 ? D.emerald : D.gold, marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>{review.score}/100 <span style={{ fontSize: 12, color: D.muted }}>· {review.grade || "B"}</span></div>
                  <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.7 }}>{review.summary}</div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => onComplete(action, review)} style={{ padding: "10px 22px", background: `linear-gradient(135deg, ${D.emerald}, ${D.emerald}cc)`, border: "none", borderRadius: 11, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Save & continue ✓</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SkillStudio({ user, userData }) {
  const [activeTab, setActiveTab]       = useState("diagnose")
  const [loading, setLoading]           = useState(true)
  const [learningPath, setLearningPath] = useState(null)
  const [recs, setRecs]                 = useState([])
  const [activeAction, setActiveAction] = useState(null)
  const [completedActions, setCompleted] = useState([])
  const [studioXP, setXP]               = useState(0)
  const [activeSkill, setActiveSkill]   = useState(null)
  const fetchedRef = useRef(null)

  const jobTitle    = getRoleConfig(userData).label
  const domainKey   = resolveDomainKey(jobTitle)
  const domainColor = DOMAIN_COLOR[domainKey] || DOMAIN_COLOR.default
  const domainIcon  = DOMAIN_ICON[domainKey]  || DOMAIN_ICON.default
  const weakAreas   = userData?.weak_areas   || userData?.weakAreas   || []
  const skillGraph  = userData?.skill_graph  || userData?.skillGraph  || []
  const eloRating   = userData?.elo_rating   || userData?.eloRating   || 800
  const arenaHistory = userData?.arena_history || userData?.arenaHistory || []
  const readiness   = Math.max(42, Math.min(95, Math.round(eloRating / 14)))

  const gaps         = useMemo(() => buildGaps(skillGraph, weakAreas), [skillGraph, weakAreas])
  const decayAlerts  = useMemo(() => computeDecay(skillGraph, arenaHistory), [skillGraph, arenaHistory])
  const completedSet = useMemo(() => new Set(completedActions), [completedActions])

  useEffect(() => {
    if (!user?.id) return
    supabase.from("profiles").select("skillStudioCompletedActions,skillStudioXP").eq("id", user.id).single()
      .then(({ data }) => { if (data) { setCompleted(data.skillStudioCompletedActions || []); setXP(data.skillStudioXP || 0) } })
  }, [user?.id])

  const loadStudio = useCallback(async () => {
    const key = `${user?.id}|${jobTitle}`
    if (fetchedRef.current === key) return
    fetchedRef.current = key
    setLoading(true)
    try {
      const lp = await apiPost("/api/skill-studio/learning-path", { jobTitle, skillGraph, weakAreas, eloRating })
      setLearningPath(lp)
      setRecs(buildRecommendations(lp, weakAreas, skillGraph, arenaHistory, jobTitle, eloRating))
    } catch {
      setRecs(buildRecommendations(null, weakAreas, skillGraph, arenaHistory, jobTitle, eloRating))
    }
    setLoading(false)
  }, [user?.id, jobTitle]) // eslint-disable-line

  useEffect(() => { if (user?.id) loadStudio() }, [user?.id, loadStudio])

  const handleComplete = useCallback(async (action, reviewResult) => {
    const updated = [...new Set([...completedActions, action.id])]
    const newXP   = studioXP + (reviewResult?.score ? Math.round(reviewResult.score / 10) * 3 : 20)
    setCompleted(updated); setXP(newXP); setActiveAction(null)
    if (user?.id) await supabase.from("profiles").update({ skillStudioCompletedActions: updated, skillStudioXP: newXP }).eq("id", user.id)
  }, [completedActions, studioXP, user?.id])

  const criticalCount = gaps.filter((g) => g.isCritical).length
  const pendingProof  = recs.filter((r) => !completedSet.has(r.id) && r.proof).length

  const TABS = [
    { id: "diagnose", label: "Diagnose",  icon: "🔬" },
    { id: "roadmap",  label: "Roadmap",   icon: "🗺️" },
    { id: "modules",  label: "Modules",   icon: "📚" },
    { id: "practice", label: "Practice",  icon: "⚡" },
    { id: "proof",    label: "Proof",     icon: "🏅" },
  ]

  const filteredRecs = activeSkill
    ? recs.filter((r) => r.skill === activeSkill || r.title?.toLowerCase().includes(activeSkill.toLowerCase()))
    : recs

  // Progress ring for sidebar
  const ringR = 28, ringC = 34
  const ringCirc = 2 * Math.PI * ringR
  const ringOffset = ringCirc * (1 - readiness / 100)

  return (
    <div style={{
      background: `radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.12), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(99,102,241,0.08), transparent 50%), ${D.void}`,
      minHeight: "100%",
      height: "100%",
      overflowY: "auto",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        @keyframes ss-spin  { to { transform: rotate(360deg) } }
        @keyframes ss-fade  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes ss-pulse { 0%,100%{ opacity:0.4 } 50%{ opacity:0.9 } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.07); border-radius: 99px; }
      `}</style>

      {/* COMMAND BAR */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${D.border}`,
      }}>
        <div style={{ maxWidth: 1800, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", gap: 14, height: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: domainColor + "20", border: `1px solid ${domainColor}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{domainIcon}</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "'DM Mono',monospace" }}>Skill Studio</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: D.text1 }}>{jobTitle}</div>
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: D.border, flexShrink: 0 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Readiness</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: D.text1, fontFamily: "'DM Mono',monospace" }}>{readiness}%</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: D.emerald }}>+3% this week</span>
              </div>
            </div>
            <div style={{ width: 72, height: 4, background: "rgba(0,0,0,0.05)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${readiness}%`, height: "100%", background: `linear-gradient(90deg, ${domainColor}, ${domainColor}bb)`, borderRadius: 99, boxShadow: `0 0 8px ${domainColor}60` }} />
            </div>
          </div>
          <div style={{ width: 1, height: 26, background: D.border, flexShrink: 0 }} />
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: D.muted, fontWeight: 700, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>ELO</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: D.gold, fontFamily: "'DM Mono',monospace" }}>{eloRating}</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
            {criticalCount > 0 && <button onClick={() => setActiveTab("diagnose")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: D.rose + "15", border: `1px solid ${D.rose}30`, borderRadius: 99, fontSize: 10, fontWeight: 700, color: D.rose, cursor: "pointer", fontFamily: "inherit" }}>🔴 {criticalCount} critical</button>}
            {decayAlerts.length > 0 && <button onClick={() => setActiveTab("diagnose")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: D.gold + "15", border: `1px solid ${D.gold}30`, borderRadius: 99, fontSize: 10, fontWeight: 700, color: D.gold, cursor: "pointer", fontFamily: "inherit" }}>⏳ {decayAlerts.length} decaying</button>}
            {pendingProof > 0 && <button onClick={() => setActiveTab("proof")} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: D.indigo + "15", border: `1px solid ${D.indigo}30`, borderRadius: 99, fontSize: 10, fontWeight: 700, color: D.indigo, cursor: "pointer", fontFamily: "inherit" }}>⚡ {pendingProof} proof pending</button>}
            <div style={{ padding: "4px 10px", background: D.gold + "15", border: `1px solid ${D.gold}30`, borderRadius: 99, fontSize: 10, fontWeight: 700, color: D.gold, fontFamily: "'DM Mono',monospace" }}>⚡ {studioXP} XP</div>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "24px 32px 60px", display: "grid", gridTemplateColumns: "minmax(240px,280px) minmax(0,1fr)", gap: 22, alignItems: "start" }}>

        {/* LEFT SIDEBAR */}
        <div style={{ position: "sticky", top: 78 }}>
          <div style={{
            background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)",
            borderRight: `1px solid ${D.border}`,
            borderRadius: 20, overflow: "hidden",
          }}>
            {/* Learning Path Header */}
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${D.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: D.indigo, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, fontFamily: "'DM Mono',monospace" }}>Learning Path</div>
              {/* Phase list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {TABS.map((tab, i) => {
                  const isActive = activeTab === tab.id
                  const isDone = i < TABS.findIndex(t => t.id === activeTab)
                  return (
                    <div key={tab.id} onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                        borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                        background: isActive ? "rgba(99,102,241,0.10)" : "transparent",
                        borderLeft: `3px solid ${isActive ? D.indigo : "transparent"}`,
                      }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isDone ? D.emerald : isActive ? D.indigo : "rgba(0,0,0,0.03)",
                        fontSize: 10, fontWeight: 800, color: isDone || isActive ? "#fff" : D.muted,
                        boxShadow: (isDone || isActive) ? `0 0 8px ${isDone ? D.emerald : D.indigo}60` : "none",
                      }}>
                        {isDone ? "✓" : i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? D.text1 : D.muted }}>{tab.label}</div>
                        <div style={{ height: 3, background: "rgba(0,0,0,0.03)", borderRadius: 99, marginTop: 4, overflow: "hidden" }}>
                          <div style={{ width: isDone ? "100%" : isActive ? "50%" : "0%", height: "100%", background: isDone ? D.emerald : D.indigo, borderRadius: 99, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* DNA Map */}
            <div style={{ padding: "16px 14px", borderBottom: `1px solid ${D.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Mono',monospace" }}>Role DNA</div>
                {activeSkill && <button onClick={() => setActiveSkill(null)} style={{ fontSize: 9, color: D.muted, background: D.glass, border: `1px solid ${D.border}`, borderRadius: 6, padding: "2px 7px", cursor: "pointer", fontFamily: "inherit" }}>× Clear</button>}
              </div>
              <RoleDNAMap skillGraph={skillGraph} weakAreas={weakAreas} domainColor={domainColor}
                onSkillClick={(name) => { setActiveSkill((s) => s === name ? null : name); setActiveTab("modules") }}
                activeSkill={activeSkill} />
            </div>

            {/* NBA Queue */}
            <div style={{ padding: "16px 14px" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: D.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12, fontFamily: "'DM Mono',monospace" }}>Next Best Action</div>
              <NBAQueue recs={filteredRecs} completedSet={completedSet} onStart={(r) => setActiveAction(r)} loading={loading} />
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div>
          {/* Tab bar */}
          <div style={{
            display: "flex", gap: 4, background: "rgba(17,24,39,0.8)", backdropFilter: "blur(12px)",
            border: `1px solid ${D.border}`, borderRadius: 14, padding: 4, marginBottom: 18,
          }}>
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: "8px 10px", borderRadius: 10, border: "none",
                background: activeTab === tab.id ? domainColor + "25" : "transparent",
                color: activeTab === tab.id ? domainColor : D.muted,
                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.18s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                borderBottom: activeTab === tab.id ? `2px solid ${domainColor}` : "2px solid transparent",
              }}>
                <span style={{ fontSize: 13 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "diagnose" && <DiagnoseTab gaps={gaps} decayAlerts={decayAlerts} jobTitle={jobTitle} domainColor={domainColor} onSkillFocus={(name) => { setActiveSkill(name); setActiveTab("modules") }} />}
          {activeTab === "roadmap"  && <RoadmapTab learningPath={learningPath} loading={loading} eloRating={eloRating} domainColor={domainColor} jobTitle={jobTitle} onStartAction={(r) => setActiveAction(r)} />}
          {activeTab === "modules"  && <ModulesTab recs={filteredRecs} completedSet={completedSet} domainColor={domainColor} onStart={(r) => setActiveAction(r)} onComplete={(r) => handleComplete(r)} />}
          {activeTab === "practice" && <PracticeTab arenaHistory={arenaHistory} gaps={gaps} domainColor={domainColor} jobTitle={jobTitle} />}
          {activeTab === "proof"    && <ProofTab completedActions={completedActions} recs={recs} arenaHistory={arenaHistory} gaps={gaps} domainColor={domainColor} />}
        </div>
      </div>

      {activeAction && <ActionModal action={activeAction} jobTitle={jobTitle} eloRating={eloRating} onClose={() => setActiveAction(null)} onComplete={handleComplete} />}
    </div>
  )
}
