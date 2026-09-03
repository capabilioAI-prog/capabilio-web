import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { userDoc } from "../lib/db"
import { supabase } from "../lib/supabase"
import { getTier, getNextTier } from "../theme"

// PC-5: /api/verify/* now requires auth — attach the Supabase bearer token.
async function vHeaders() {
  const h = { "Content-Type": "application/json" }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`
  } catch { /* no session */ }
  return h
}
import { getPlan, interviewsUsedThisMonth, reportsUsedThisMonth } from "../config/plans"
import { getDomainChallenges } from "../config/domainChallenges"
import { getRoleConfig, resolveRoleLabel, resolveAuraSkills } from "../config/roleConfig"
import CareerVideoGenerator from "./CareerVideoGenerator"
import EchoPitchHero from "./EchoPitchHero"
// Portfolio themes removed — single universal design
// ── Professional Path: API-connected components ───────────────────────────────
import CareerTimelinePro from "../components/CareerTimeline"
import GithubCodeDnaCard from "../components/GithubCodeDnaCard"
import { interviewApi, skillsApi, profileApi, professionalEloApi, weeklyCheckApi }  from "../lib/api"
import SettingsPanel from "./SettingsPanel"
import { namesLikelyMismatch, mismatchWarning } from "../lib/nameMatch"

// ─── DESIGN TOKENS — Glassmorphic Cosmos dark theme ─────────────────────────
const T = {
  // surfaces (dark)
  cream:   "#FAF7F2",                    // page bg → dark base
  cream2:  "#FFFFFF",                    // raised surface
  cream3:  "rgba(0,0,0,0.05)",     // dividers / progress tracks
  // text (light on dark)
  ink:     "#1A1714",                    // primary text
  ink2:    "#475569",                    // secondary text
  ink3:    "#A8A29E",                    // muted text
  ink4:    "#6B6560",                    // ghost / placeholder
  // brand
  indigo:  "#6366F1",                    // primary action
  indigo2: "#818CF8",                    // lighter indigo
  indigo3: "rgba(99,102,241,0.12)",      // soft indigo bg
  // semantic
  green:   "#10B981",                    // success / emerald
  green2:  "rgba(16,185,129,0.12)",      // soft emerald bg
  amber:   "#F59E0B",                    // warning / gold
  amber2:  "rgba(245,158,11,0.12)",      // soft amber bg
  red:     "#F43F5E",                    // error / critical
  red2:    "rgba(244,63,94,0.12)",       // soft rose bg
  blue:    "#3B82F6",                    // blue
  blue2:   "rgba(59,130,246,0.12)",      // soft blue bg
  // structural
  border:  "rgba(0,0,0,0.05)",
  shadow:  "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
  shadow2: "0 8px 24px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.4)",
}

const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

const CERT_PROVIDERS = [
  { id:"aws",        label:"AWS",           icon:"☁️",  color:"#F59E0B", placeholder:"AWS Certification ID (e.g. AWS-SAA-123456)" },
  { id:"gcp",        label:"Google Cloud",  icon:"🔵",  color:"#4285F4", placeholder:"Google Credential ID" },
  { id:"microsoft",  label:"Microsoft",     icon:"🪟",  color:"#00A4EF", placeholder:"Microsoft Certification Number" },
  { id:"salesforce", label:"Salesforce",    icon:"☁️",  color:"#00A1E0", placeholder:"Salesforce Credential ID" },
  { id:"comptia",    label:"CompTIA",       icon:"🔐",  color:"#C8102E", placeholder:"CompTIA Certificate Number" },
]

// ─── UTILITY COMPONENTS ──────────────────────────────────────────────────────

function Badge({ children, color = T.indigo, bg = T.indigo3 }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", background:bg,
      color, fontSize:11, fontWeight:700, borderRadius:99, letterSpacing:0.3 }}>
      {children}
    </span>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background:"#FFFFFF", border:`1px solid ${T.border}`, borderRadius:16,
      boxShadow:T.shadow, padding:"22px 24px", ...style }}>
      {children}
    </div>
  )
}

function SectionLabel({ children, color = T.indigo }) {
  return (
    <div style={{ fontSize:10, fontWeight:800, letterSpacing:2.5, color, textTransform:"uppercase",
      marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
      {children}
    </div>
  )
}

// ─── Profile Summary (2026-07-26; generalized to the student path and
// given a real manual-vs-AI distinction 2026-08-17) ───────────────────────
// Auto-generates a recruiter-facing summary from the user's real profile
// data (POST /api/pro/profile/summary/generate — Groq; grounded in real
// skills/experience for professionals, real Arena performance for
// students), with a manual edit option that always wins until the user
// explicitly asks to regenerate again. profiles.profile_summary_source
// ('ai' | 'manual') records which kind of write produced the current
// value — Regenerate confirms before overwriting a manual edit; it never
// needs to confirm before overwriting a PREVIOUS ai-generated one, since
// there's no hand-written work to lose in that case.
function ProfileSummaryCard({ userData, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(userData?.profileSummary || "")
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const handleGenerate = async () => {
    if (userData?.profileSummary && userData?.profileSummarySource === "manual") {
      const proceed = window.confirm("This will replace the summary you wrote by hand with a new AI-generated one. Continue?")
      if (!proceed) return
    }
    setGenerating(true); setErrorMsg("")
    try {
      const res = await profileApi.generateSummary()
      setDraft(res.summary)
      await onSave({ profileSummary: res.summary, profileSummarySource: "ai" })
      setEditing(false)
    } catch (e) {
      setErrorMsg(e.message || "Couldn't generate a summary right now.")
    } finally { setGenerating(false) }
  }

  const handleSaveManual = async () => {
    setSaving(true); setErrorMsg("")
    try {
      await profileApi.saveSummary(draft)
      await onSave({ profileSummary: draft, profileSummarySource: "manual" })
      setEditing(false)
    } catch (e) {
      setErrorMsg(e.message || "Couldn't save your summary right now.")
    } finally { setSaving(false) }
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <SectionLabel color={T.indigo}>Profile Summary</SectionLabel>
          <div style={{ fontSize: 13, color: T.ink3, marginTop: 4, lineHeight: 1.5 }}>
            What recruiters read first — auto-written from your real skills and experience, or write your own.
          </div>
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={handleGenerate} disabled={generating} style={{
              padding: "7px 14px", background: T.indigo, border: "none", borderRadius: 9,
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: generating ? "default" : "pointer", opacity: generating ? 0.6 : 1,
            }}>
              {generating ? "Generating…" : userData?.profileSummary ? "Regenerate" : "Auto-generate"}
            </button>
            <button onClick={() => { setDraft(userData?.profileSummary || ""); setEditing(true) }} style={{
              padding: "7px 14px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 9,
              color: T.ink2, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              Edit
            </button>
          </div>
        )}
      </div>

      {errorMsg && <div style={{ fontSize: 12, color: T.red, marginTop: 10 }}>{errorMsg}</div>}

      {editing ? (
        <div style={{ marginTop: 14 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={1000}
            rows={4}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.ink, lineHeight: 1.6, fontFamily: "inherit", resize: "vertical" }}
            placeholder="Write a short summary of your experience and skills..."
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleSaveManual} disabled={saving} style={{
              padding: "7px 16px", background: T.indigo, border: "none", borderRadius: 9,
              color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} style={{
              padding: "7px 16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: 9,
              color: T.ink3, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14, fontSize: 13.5, color: T.ink2, lineHeight: 1.7 }}>
          {userData?.profileSummary || <span style={{ color: T.ink4, fontStyle: "italic" }}>No summary yet — auto-generate one from your profile, or write your own.</span>}
        </div>
      )}
    </Card>
  )
}

// ─── Skill Rating History (2026-07-26) ───────────────────────────────────────
// Real, backend-persisted history: professional_elo_events (via GET
// /api/pro/elo/professional's `history`) combined with the more detailed
// per-test breakdown from GET /api/pro/weekly/history (score, skill areas,
// suspicious flags). Honest empty/error states, no placeholder rows.
function SkillRatingHistoryCard() {
  const [eloData, setEloData] = useState(null)
  const [testHistory, setTestHistory] = useState({ state: "loading", history: [] })

  useEffect(() => {
    let cancelled = false
    professionalEloApi.status().then(res => { if (!cancelled) setEloData(res) }).catch(() => {})
    weeklyCheckApi.history(15)
      .then(res => { if (!cancelled) setTestHistory({ state: "ready", history: res?.history || [] }) })
      .catch(() => { if (!cancelled) setTestHistory({ state: "error", history: [] }) })
    return () => { cancelled = true }
  }, [])

  return (
    <Card style={{ marginBottom: 20 }}>
      <SectionLabel color={T.indigo}>Skill Rating History</SectionLabel>
      <div style={{ fontSize: 13, color: T.ink3, marginTop: 4, marginBottom: 14, lineHeight: 1.5 }}>
        Every real Weekly Skill Pulse result and how it moved your Skill Rating.
      </div>

      {eloData && (
        <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12, color: T.ink3, flexWrap: "wrap" }}>
          <span>Assessment <strong style={{ color: T.ink }}>{eloData.elo}</strong></span>
          {eloData.experience_bonus_elo > 0 && <span style={{ color: T.green }}>+{eloData.experience_bonus_elo} verified experience</span>}
          {eloData.cert_bonus_elo > 0 && <span style={{ color: T.green }}>+{eloData.cert_bonus_elo} verified certs</span>}
        </div>
      )}

      {testHistory.state === "error" && <div style={{ fontSize: 12, color: T.red }}>Couldn't load your history right now.</div>}
      {testHistory.state === "ready" && testHistory.history.length === 0 && (
        <div style={{ fontSize: 12, color: T.ink4 }}>No completed Skill Pulse check-ins yet.</div>
      )}
      {testHistory.state === "ready" && testHistory.history.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {testHistory.history.map(h => {
            const pct = h.score.total > 0 ? Math.round((h.score.correct / h.score.total) * 100) : 0
            const eloColor = h.elo_delta > 0 ? T.green : h.elo_delta < 0 ? T.red : T.ink4
            return (
              <div key={h.pulse_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 12px", borderRadius: 10, background: "#FAF9F7", flexWrap: "wrap" }}>
                <div style={{ minWidth: 130 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: T.ink }}>
                    {h.completed_at ? new Date(h.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink4 }}>{h.skill_areas.slice(0, 2).join(", ") || "General"}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{h.score.correct}/{h.score.total} <span style={{ color: T.ink4, fontWeight: 500 }}>({pct}%)</span></div>
                {h.elo_delta !== null && <div style={{ fontSize: 12, fontWeight: 800, color: eloColor }}>{h.elo_delta > 0 ? "+" : ""}{h.elo_delta}</div>}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function Spinner({ color = T.indigo, size = 14 }) {
  return <div style={{width:size,height:size,border:`2px solid ${color}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",flexShrink:0,display:"inline-block"}}/>
}

// ─── DOMAIN → SKILLS MAP ──────────────────────────────────────────────────────
// MIGRATED: Skills now live in roleConfig.js → role.auraSkills
// Legacy map kept for backwards compat with any skill stored on profiles.skillGraph
// that was written before roleConfig migration. New lookups use resolveAuraSkills().
const domainSkillsMap = {
  // ── IT / CS DOMAINS ───────────────────────────────────────────────────────
  "Data Analyst":      ["SQL Basics","Python (pandas)","Data Cleaning","Charts & Graphs","Descriptive Statistics","Excel / Sheets","Data Filtering & Sorting","Basic Dashboard (Power BI/Tableau)","Reading Business Requirements","KPI Definitions","Data Storytelling","Problem Framing"],
  "Full-Stack":        ["HTML & CSS","JavaScript Basics","React Fundamentals","REST API Calls","SQL Queries","Git & GitHub","Form Handling","Basic Authentication","Responsive Design","Debugging in Browser","Deploying to Vercel/Netlify","Reading API Docs"],
  "Software Developer":["Data Structures Basics","Sorting & Searching","OOP Concepts","Problem Solving","Version Control (Git)","Basic Database Queries","Reading Code","Writing Functions","Testing Basics","Time & Space Complexity","Debugging","Writing Clean Code"],
  "Frontend":          ["HTML5 & CSS3","JavaScript (ES6)","React Basics","Flexbox & Grid","Component Thinking","Props & State","Event Handling","Fetching APIs","Responsive Layouts","Browser Dev Tools","Basic Accessibility","Git Workflow"],
  "Backend":           ["REST API Basics","HTTP Methods (GET/POST/PUT/DELETE)","Node.js / Express Basics","Database CRUD","Environment Variables","Basic Authentication","Error Handling","Postman / API Testing","JSON Data Handling","Git Workflow","Basic SQL","Reading Documentation"],
  "DevOps":            ["Linux Command Line","Bash Scripting Basics","Git & Version Control","Docker Basics","CI/CD Concepts","Cloud Basics (AWS/GCP/Azure)","SSH & Remote Access","Environment Setup","Log Reading","YAML Configuration","Basic Networking","Process Monitoring"],
  "DBA":               ["SQL Basics (SELECT, JOIN, WHERE)","Database Design Basics","Primary & Foreign Keys","Index Concepts","CRUD Operations","Stored Procedure Basics","Query Writing","ER Diagrams","Data Integrity Rules","Backup Basics","Performance Basics","Reading Query Plans"],
  "Machine Learning":  ["Python Basics","NumPy & Pandas","Data Cleaning","Train/Test Split","Linear Regression","Logistic Regression","Confusion Matrix","Feature Selection","Scikit-learn Basics","Plotting Results (Matplotlib)","Overfitting Concepts","Reading ML Papers"],
  "Cyber Security":    ["Networking Fundamentals (TCP/IP)","Basic Linux Commands","HTTP & HTTPS Concepts","Password & Auth Security","Common Vulnerabilities (OWASP Top 10)","Firewall Basics","Log Reading","Phishing Awareness","Encryption Concepts","Basic Penetration Testing","Incident Reporting","Security Best Practices"],

  // ── ECE ROLES — split by first job title ──────────────────────────────────
  // Embedded / Firmware engineer — most common ECE first job
  "Embedded Engineer":  ["Embedded C Programming","GPIO & Register Control","UART / SPI / I2C Protocols","Microcontroller Basics (ARM/AVR)","Interrupt Handling","Digital Logic (Gates, Flip-Flops)","Bit Manipulation","Basic Sensor Interfacing","Reading Datasheets","Serial Debugging","Memory Layout Basics","RTOS Fundamentals"],
  // VLSI / IC design engineer
  "VLSI Engineer":      ["Digital Logic Design","Verilog Basics","Combinational Circuits","Sequential Circuits (FSM)","FPGA Flow Basics","RTL Design Concepts","Simulation & Testbench","Boolean Algebra","CMOS Basics","Timing Concepts","Logic Synthesis Overview","EDA Tools Basics"],
  // Hardware / PCB design engineer
  "Hardware Engineer":  ["Circuit Reading (Schematics)","Ohm's Law & KVL/KCL","Basic Op-Amp Circuits","Voltage Dividers","PCB Layout Concepts","Multimeter & Oscilloscope Use","Power Supply Basics","Signal Integrity Basics","Component Selection","Connector & Interface Types","Soldering Basics","Design-for-Manufacture"],
  // RF / Antenna engineer
  "RF Engineer":        ["Transmission Line Basics","Antenna Concepts (Gain, Radiation)","Frequency Bands (2.4GHz, 5GHz, Sub-GHz)","Signal Propagation Basics","dB & dBm Units","S-Parameters Basics","Link Budget Calculation","RF Interference Concepts","Modulation Basics (AM/FM/BPSK)","Spectrum Analyzer Basics","Filter Types (LPF/BPF)","Impedance Matching Basics"],
  // IoT engineer
  "IoT Engineer":       ["Embedded C Basics","Arduino / Raspberry Pi","MQTT Protocol","Wi-Fi & Bluetooth Basics","Sensor Reading (Temp, Humidity, Gas)","Serial Communication (UART)","Cloud Publish Basics","JSON Data Formatting","Basic Circuit Connections","Power Management Basics","Microcontroller GPIO","Reading Component Datasheets"],
  // Broad ECE fallback (if role is just "ECE")
  "ECE":                ["Digital Electronics","Embedded C Basics","Microcontroller Overview","Serial Protocols (UART/SPI/I2C)","Basic Analog Circuits","Signals & Systems","Sensor Interfacing","Circuit Analysis (KVL/KCL)","Interrupts & Timers","Communication Basics","Reading Datasheets","Problem Solving with Electronics"],

  // ── EEE ROLES — entry-level power / electrical ────────────────────────────
  "Power Engineer":     ["AC Circuit Analysis","3-Phase System Basics","Transformer Working Principle","Electrical Machines (DC/AC Motors)","Power Factor & Efficiency","Protection Devices (Fuses, Relays, MCBs)","Single-Line Diagram Reading","Power Electronics Basics (Rectifiers)","Earthing & Safety Standards","Switchgear Basics","Load Calculation","Energy Meter Reading"],
  "Electrical Engineer":["Ohm's Law & Kirchhoff's Laws","AC/DC Circuits","Transformers Basics","Electrical Machines Overview","Control Systems Introduction","Reading Electrical Drawings","Basic PLC Concepts","Wiring & Cable Standards","Power Distribution Basics","Instrumentation Basics","Safety & Lockout-Tagout","Motor Starter Types"],
  "EEE":                ["Circuit Analysis","Electrical Machines Basics","Power Systems Overview","AC/DC Circuits","Transformer Principles","3-Phase Power","Control Systems Basics","Protection Devices","PLC Introduction","Instrumentation Basics","Safety Standards","Single-Line Diagrams"],

  // ── MECHANICAL ROLES — entry-level ────────────────────────────────────────
  "Mechanical Engineer":["Engineering Drawing Basics","AutoCAD / SolidWorks Basics","Statics (Forces & Moments)","Strength of Materials","Thermodynamics Fundamentals","Manufacturing Processes Overview","Material Properties (Steel, Aluminium)","Fasteners & Joints","GD&T Basics","Fluid Mechanics Intro","Quality Inspection Tools","Workshop Safety"],
  "Design Engineer":    ["CAD Modeling (SolidWorks/CATIA)","Engineering Drawing","Tolerancing & GD&T","Material Selection Basics","Static & Dynamic Loading","Mechanical Fasteners","Stress & Strain Basics","Design for Manufacturing","Bill of Materials","Failure Mode Basics","Prototyping Concepts","Technical Documentation"],
  "Manufacturing Engineer":["Manufacturing Processes (Casting, Machining, Welding)","Quality Control Basics","Measurement Tools (Vernier, Micrometer)","Production Planning Basics","Lean Manufacturing Intro","5S Methodology","GD&T & Tolerances","CNC Basics","Process Flow Documentation","Safety (PPE, SOP)","Material Handling","Defect Detection"],
  "Mechanical":         ["Engineering Drawing","Strength of Materials","Thermodynamics Basics","Manufacturing Processes","Material Science","Fluid Mechanics Intro","CAD Basics","Machine Elements","Quality Control","Statics & Dynamics","Workshop Practice","Problem Solving"],

  // ── CIVIL ROLES — entry-level ─────────────────────────────────────────────
  "Civil Engineer":     ["AutoCAD Basics (2D Drawings)","Reading Structural Drawings","Concrete Mix Basics","Rebar & Reinforcement Concepts","Load Types (Dead/Live/Wind)","Basic Structural Analysis","Soil Types & Testing Basics","Surveying Basics (Leveling, Theodolite)","Construction Materials (Cement, Steel, Bricks)","Site Safety & PPE","Quantity Estimation Basics","Construction Sequence"],
  "Structural Engineer":["Statics (Free Body Diagrams)","Bending Moment & Shear Force","RCC Design Basics","Steel Connection Basics","Load Path Concepts","Structural Drawing Reading","Basic Beam & Column Design","Deflection Concepts","IS Code Basics","Foundation Types","Software Tools (STAAD/ETABS basics)","Report Writing"],
  "Site Engineer":      ["Site Layout & Setting Out","Construction Drawing Reading","Concrete Mixing & Curing","Rebar Placement Basics","Quality Checks on Site","Daily Progress Reporting","Labour Coordination Basics","Site Safety Protocols","Equipment Operation Basics","Material Consumption Tracking","Measurement for Payment","Surveying Basics"],
  "Civil":              ["Structural Analysis Basics","Concrete Technology","Soil Testing","Surveying Fundamentals","Construction Materials","AutoCAD Basics","Load Calculations","Site Safety","Reading Drawings","Water Supply Basics","Estimation Basics","Report Writing"],

  // ── OTHER DOMAINS ─────────────────────────────────────────────────────────
  "IoT":        ["Embedded C Basics","Arduino & Raspberry Pi","MQTT Protocol","Sensor Integration","Wi-Fi & BLE Basics","Microcontroller GPIO","Serial Communication","Cloud Data Basics","JSON & REST Basics","Power Management","Circuit Connections","Reading Datasheets"],
  "Pharmacy":   ["Dosage Forms & Routes of Administration","Drug Names (Generic vs Brand)","Basic Pharmacology","Drug Storage & Handling","Prescription Reading","Patient Counselling Basics","Pharmaceutical Calculations","Over-the-Counter Medicines","Drug Interactions Basics","Hospital Pharmacy Workflow","Inventory Management","Regulatory Basics (FDA/CDSCO)"],
  "MBA":        ["Business Communication","Financial Statements (P&L, Balance Sheet)","Marketing Basics (4Ps)","Operations Concepts","Management Styles","Business Problem Framing","Data for Business Decisions","Team Dynamics","Customer & Market Basics","Business Ethics","Project Planning Basics","Excel for Business"],
}

// ── Unified role resolution — delegates to roleConfig.js ─────────────────────
// normalizeDomain() is now a thin wrapper returning the role label.
// All keyword matching logic lives in getRoleConfig().
function normalizeDomain(keyword) {
  return resolveRoleLabel(keyword)
}

function getSkillsForDomain(keyword) {
  // 1. Try roleConfig auraSkills (comprehensive, always up-to-date)
  const rcSkills = resolveAuraSkills(keyword)
  if (rcSkills && rcSkills.length > 0) return rcSkills
  // 2. Fallback to legacy domainSkillsMap (only for old profile data)
  const domain = resolveRoleLabel(keyword)
  return domainSkillsMap[domain] || domainSkillsMap["Software Developer"]
}

// ─── ELO SPARKLINE ───────────────────────────────────────────────────────────
// ELO_TIERS/getTier/getNextTier imported from ../theme (single source of truth)

function EloHistoryCard({ history, currentElo, eloDecayToday }) {
  const tier = getTier(currentElo)
  const nextTier = getNextTier(currentElo)
  const progressToNext = nextTier ? Math.round(((currentElo - getTier(currentElo).min) / (getTier(currentElo).max - getTier(currentElo).min)) * 100) : 100
  const startElo = history.length >= 2 ? (history[0]?.elo || currentElo) : currentElo
  const totalDelta = currentElo - startElo
  const peakElo = history.length > 0 ? Math.max(...history.filter(h=>h.elo!=null).map(h=>h.elo), currentElo) : currentElo
  const isPeak = currentElo >= peakElo

  // Build event list with computed deltas, most-recent first
  const events = history.map((h, i) => {
    const delta = h.delta != null ? h.delta : (i === 0 ? 0 : h.elo - history[i - 1].elo)
    return { ...h, delta }
  }).reverse()

  // Sparkline SVG data
  const sparkVals = history.filter(h => h.elo != null).map(h => h.elo)
  const renderSparkline = () => {
    if (sparkVals.length < 2) return null
    const W = 400, H = 52
    const min = Math.min(...sparkVals), max = Math.max(...sparkVals)
    const range = max - min || 1
    const n = sparkVals.length
    const pts = sparkVals.map((v, i) => [
      (i / (n - 1)) * W,
      H - 6 - ((v - min) / range) * (H - 12)
    ])
    const linePath = pts.map((p, i) => `${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
    const areaPath = `${linePath} L${W},${H} L0,${H} Z`
    const peakIdx = sparkVals.indexOf(Math.max(...sparkVals))
    const [lx, ly] = pts[pts.length - 1]
    const [px, py] = pts[peakIdx]
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%",height:H,display:"block"}}>
        <defs>
          <linearGradient id={`sg_${tier.label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tier.color} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={tier.color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#sg_${tier.label})`}/>
        <path d={linePath} fill="none" stroke={tier.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {peakIdx !== n - 1 && <circle cx={px} cy={py} r="3.5" fill="#F59E0B" stroke="#fff" strokeWidth="1.5"/>}
        <circle cx={lx} cy={ly} r="4.5" fill={tier.color} stroke="#fff" strokeWidth="2"/>
      </svg>
    )
  }

  const gainCount = events.filter(e => e.delta > 0).length
  const lossCount = events.filter(e => e.delta < 0).length

  return (
    <div>
      {/* ── Top stat row ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{fontSize:38,fontWeight:900,color:T.ink,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{currentElo}</div>
            {totalDelta !== 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                <span style={{fontSize:12,fontWeight:800,color:totalDelta>=0?T.green:T.red,background:totalDelta>=0?"#DCFCE7":"#FEE2E2",padding:"2px 7px",borderRadius:99}}>
                  {totalDelta>=0?"▲ +":"▼ "}{totalDelta} pts
                </span>
                <span style={{fontSize:9,color:T.ink4,textAlign:"center"}}>vs start</span>
              </div>
            )}
          </div>
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:tier.color+"15",border:`1.5px solid ${tier.color}30`,borderRadius:99,padding:"4px 10px"}}>
            <span style={{fontSize:13}}>{tier.icon}</span>
            <span style={{fontSize:11,fontWeight:800,color:tier.color}}>{tier.label}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:T.ink4,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>All-Time Peak</div>
          <div style={{fontSize:26,fontWeight:900,color:"#F59E0B",fontFamily:"'DM Mono',monospace"}}>{peakElo}</div>
          {isPeak && <div style={{fontSize:9,color:"#F59E0B",fontWeight:700}}>🏆 Current best!</div>}
        </div>
      </div>

      {/* ── Progress to next tier ── */}
      {nextTier && (
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,color:T.ink3,fontWeight:600}}>Progress to <strong style={{color:nextTier.color}}>{nextTier.icon} {nextTier.label}</strong></span>
            <span style={{fontSize:10,fontWeight:800,color:nextTier.color}}>{progressToNext}% · {nextTier.min - currentElo} ELO to go</span>
          </div>
          <div style={{height:6,background:T.cream3,borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:progressToNext+"%",background:`linear-gradient(90deg,${tier.color},${nextTier.color})`,borderRadius:99,transition:"width 1s ease"}}/>
          </div>
        </div>
      )}

      {/* ── Sparkline trend overview ── */}
      {sparkVals.length >= 2 && (
        <div style={{background:"#FAFAFA",borderRadius:12,padding:"10px 12px 6px",border:"1px solid #E8E3DA",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:9,fontWeight:700,color:"#A8A29E",letterSpacing:"0.1em",textTransform:"uppercase"}}>Rating Trend</span>
            <div style={{display:"flex",gap:8}}>
              <span style={{fontSize:9,fontWeight:700,color:"#22C55E",background:"#F0FDF4",padding:"1px 7px",borderRadius:99}}>▲ {gainCount} gains</span>
              <span style={{fontSize:9,fontWeight:700,color:"#EF4444",background:"#FFF1F2",padding:"1px 7px",borderRadius:99}}>▼ {lossCount} losses</span>
            </div>
          </div>
          {renderSparkline()}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontSize:8,color:"#A8A29E"}}>{history[0]?.date ? new Date(history[0].date).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "Start"}</span>
            <span style={{fontSize:8,color:"#A8A29E",fontWeight:600}}>{peakElo > currentElo ? `Peak: ${peakElo}` : "📈 At peak"}</span>
            <span style={{fontSize:8,color:"#A8A29E"}}>Now</span>
          </div>
        </div>
      )}

      {/* ── ELO event timeline feed ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10,fontWeight:700,color:T.ink4,textTransform:"uppercase",letterSpacing:"0.1em"}}>
          History {events.length > 0 && `· ${events.length} events`}
        </span>
        {events.length > 4 && <span style={{fontSize:9,color:T.ink4}}>scroll for more ↓</span>}
      </div>

      {events.length === 0 ? (
        <div style={{textAlign:"center",padding:"28px 0 20px",color:T.ink4}}>
          <div style={{fontSize:32,marginBottom:8}}>⚔️</div>
          <div style={{fontSize:13,fontWeight:700,color:T.ink3,marginBottom:4}}>No arena events yet</div>
          <div style={{fontSize:10,color:T.ink4}}>Complete Arena challenges to build your ELO history</div>
        </div>
      ) : (
        <div style={{maxHeight:228,overflowY:"auto",paddingRight:2,scrollbarWidth:"thin"}}>
          <div style={{position:"relative",paddingLeft:22}}>
            {/* Vertical connecting line */}
            <div style={{
              position:"absolute",left:7,top:8,bottom:8,width:2,
              background:`linear-gradient(180deg,${tier.color}55,${tier.color}11)`,
              borderRadius:2
            }}/>

            {events.map((ev, i) => {
              const d = ev.delta ?? 0
              const isGain = d > 0
              const isNeutral = d === 0
              const dateStr = ev.date
                ? new Date(ev.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})
                : "—"
              const dotColor = isGain ? "#22C55E" : isNeutral ? "#A8A29E" : "#EF4444"
              const cardBg  = isGain ? "#F0FDF4" : isNeutral ? "#F9F9F9" : "#FFF1F2"
              const cardBdr = isGain ? "#BBF7D0" : isNeutral ? "#E5E5E5" : "#FECDD3"
              const deltaColor = isGain ? "#16A34A" : isNeutral ? "#A8A29E" : "#DC2626"
              const source = ev.title || ev.source || ev.reason || (isGain ? "Arena Challenge" : d < 0 ? "ELO Decay" : "Rating Update")
              const typeBadge = ev.type === "academic" ? { label: "Academic", color: "#4F46E5" }
                : ev.type === "domain" ? { label: "Domain", color: "#0F766E" } : null
              const isLatest = i === 0

              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7,position:"relative"}}>
                  {/* Timeline dot */}
                  <div style={{
                    position:"absolute",left:-16,top:"50%",transform:"translateY(-50%)",
                    width:isLatest?12:9,height:isLatest?12:9,borderRadius:"50%",
                    background:dotColor,
                    border:`2px solid #fff`,
                    boxShadow:isLatest?`0 0 0 2px ${dotColor}44`:`0 0 0 1px ${dotColor}33`,
                    flexShrink:0,zIndex:1
                  }}/>

                  {/* Event card */}
                  <div style={{
                    flex:1,
                    background:isLatest?`linear-gradient(135deg,${cardBg},#fff)`:cardBg,
                    border:`1px solid ${cardBdr}`,
                    borderRadius:10,
                    padding:"8px 11px",
                    display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,
                    boxShadow:isLatest?"0 1px 4px rgba(0,0,0,0.06)":"none"
                  }}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{
                        fontSize:11,fontWeight:700,color:T.ink2,marginBottom:1,
                        whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"
                      }}>
                        {isLatest && <span style={{fontSize:8,fontWeight:800,color:tier.color,background:tier.color+"15",padding:"1px 5px",borderRadius:4,marginRight:5,verticalAlign:"middle"}}>NOW</span>}
                        {typeBadge && <span style={{fontSize:8,fontWeight:800,color:typeBadge.color,background:typeBadge.color+"15",padding:"1px 5px",borderRadius:4,marginRight:5,verticalAlign:"middle"}}>{typeBadge.label}</span>}
                        {source}
                      </div>
                      <div style={{fontSize:9,color:T.ink4}}>{dateStr}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                      <div style={{
                        fontSize:13,fontWeight:900,color:deltaColor,
                        fontFamily:"'DM Mono',monospace",
                        background:deltaColor+"14",
                        padding:"2px 9px",borderRadius:99,
                        minWidth:54,textAlign:"center",
                        letterSpacing:"-0.01em"
                      }}>
                        {d > 0 ? `+${d}` : d < 0 ? `${d}` : "±0"}
                      </div>
                      {ev.elo != null && (
                        <div style={{fontSize:9,color:T.ink4,fontFamily:"'DM Mono',monospace",fontWeight:600}}>
                          → {ev.elo}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Bottom legend + decay warning ── */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:12,paddingTop:10,borderTop:`1px solid ${T.cream3}`}}>
        {[{l:"Easy",v:"+15",c:"#22C55E"},{l:"Medium",v:"+30",c:"#F59E0B"},{l:"Hard",v:"+55",c:"#EF4444"}].map((t,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:7,height:7,borderRadius:2,background:t.c}}/>
            <span style={{fontSize:10,color:T.ink3,fontWeight:600}}>{t.l}</span>
            <span style={{fontSize:10,fontWeight:800,color:t.c}}>{t.v}</span>
          </div>
        ))}
        {eloDecayToday > 0 && (
          <span style={{marginLeft:"auto",fontSize:10,fontWeight:700,color:T.red,background:"#FEE2E2",padding:"2px 8px",borderRadius:99}}>
            ⚠️ −{eloDecayToday} decay today
          </span>
        )}
      </div>
    </div>
  )
}

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
// LABEL_PAD bakes label-text room into the viewBox itself (rather than relying
// on overflow:visible alone, which still clips under a parent that establishes
// its own overflow/containment context, e.g. a grid cell) and width:100% +
// maxWidth make it scale down instead of clip in a narrower container.
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
function RadarChart({ data, size = 280 }) {
  if (!data || data.length === 0) return null
  const clean = data.filter(d => d && (d.label||d.skill) && (d.label||d.skill) !== "undefined")
  if (clean.length === 0) return null
  const LABEL_PAD = 54
  const box = size + LABEL_PAD*2
  const cx = box/2, cy = box/2, r = size*0.32
  const n = clean.length, step = (2*Math.PI)/n
  const C = [T.indigo,T.green,"#E67E22","#8E44AD","#E74C3C","#16A085","#2980B9","#C0392B"]
  const pt = (i,v) => { const a=i*step-Math.PI/2, d=(v/100)*r; return {x:cx+d*Math.cos(a),y:cy+d*Math.sin(a)} }
  const lp = (i) => { const a=i*step-Math.PI/2, d=r+36; return {x:cx+d*Math.cos(a),y:cy+d*Math.sin(a)} }
  const pts = clean.map((d,i) => pt(i, d.value||d.score||0))
  const poly = pts.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z"
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{width:"100%",height:"auto",maxWidth:box,overflow:"visible"}}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%">
          <stop offset="0%" stopColor={T.indigo} stopOpacity="0.12"/>
          <stop offset="100%" stopColor={T.indigo} stopOpacity="0.03"/>
        </radialGradient>
      </defs>
      {[20,40,60,80,100].map(v => {
        const g = clean.map((_,i) => pt(i,v))
        const d = g.map((p,i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z"
        return <path key={v} d={d} fill="none" stroke={v===100?"rgba(61,78,172,0.2)":"rgba(61,78,172,0.08)"} strokeWidth={v===100?1.5:1}/>
      })}
      {clean.map((_,i) => { const o=pt(i,100); return <line key={i} x1={cx} y1={cy} x2={o.x.toFixed(1)} y2={o.y.toFixed(1)} stroke="rgba(61,78,172,0.1)" strokeWidth={1}/> })}
      <path d={poly} fill="url(#radarFill)" stroke={T.indigo} strokeWidth={2.5} strokeLinejoin="round"/>
      {pts.map((p,i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={5} fill="#fff" stroke={C[i%C.length]} strokeWidth={2}/>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={2.5} fill={C[i%C.length]}/>
        </g>
      ))}
      {clean.map((d,i) => {
        const l = lp(i), lbl = String(d.label||d.skill||"Skill "+(i+1))
        const score = d.value||d.score||0
        const lines = wrapRadarLabel(lbl)
        const labelYs = lines.length>1 ? [l.y-13,l.y-2] : [l.y-6]
        const scoreY = lines.length>1 ? l.y+11 : l.y+7
        return (
          <g key={i}>
            {lines.map((line,li) => (
              <text key={li} x={l.x.toFixed(1)} y={labelYs[li].toFixed(1)} textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight={700} fill={T.ink2} fontFamily="DM Sans,sans-serif">
                {line}
              </text>
            ))}
            <text x={l.x.toFixed(1)} y={scoreY.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fontWeight={600} fill={C[i%C.length]} fontFamily="DM Sans,sans-serif">
              {score}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── SKILL BAR ────────────────────────────────────────────────────────────────
function SkillBar({ label, value, color }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:13, color:T.ink2, fontWeight:600 }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:800, color }}>{value}%</span>
      </div>
      <div style={{ height:6, background:T.cream3, borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${value}%`, background:color, borderRadius:99, transition:"width 1s ease" }}/>
      </div>
    </div>
  )
}

// ─── ADD EXPERIENCE MODAL ─────────────────────────────────────────────────────
function AddExperienceModal({ onSave, onClose, existing }) {
  const [form, setForm] = useState(existing || {
    company:"", industry:"", location:"", verificationStatus:"self-claimed",
    roles:[{ title:"", startDate:"", endDate:"", current:false, responsibilities:"", skills:"" }]
  })
  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const setRole = (i,k,v) => setForm(f => { const roles=[...f.roles]; roles[i]={...roles[i],[k]:v}; return {...f,roles} })
  const inp = { width:"100%", padding:"10px 14px", background:T.cream, border:`1.5px solid ${T.border}`,
    borderRadius:10, color:T.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }
  const lbl = { fontSize:10, color:T.ink3, fontWeight:700, display:"block", marginBottom:5, letterSpacing:1, textTransform:"uppercase" }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,26,24,0.4)", backdropFilter:"blur(8px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#FFFFFF", border:`1px solid ${T.border}`, borderRadius:20, width:"100%",
        maxWidth:580, maxHeight:"90vh", overflowY:"auto", padding:"28px", boxShadow:T.shadow2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <h3 style={{ fontSize:18, fontWeight:800, color:T.ink, margin:0 }}>{existing?"Edit":"Add"} Experience</h3>
          <button onClick={onClose} style={{ background:T.cream2, border:`1px solid ${T.border}`,
            borderRadius:8, padding:"6px 12px", color:T.ink3, cursor:"pointer", fontSize:13 }}>✕</button>
        </div>
        <div style={{ background:T.amber2, border:`1.5px solid rgba(184,98,10,0.2)`, borderRadius:10,
          padding:"10px 14px", marginBottom:18, fontSize:12, color:T.amber, lineHeight:1.5 }}>
          ⚠️ Manually added = <strong>Self-Claimed</strong>. Capabilio placements get <strong style={{color:T.green}}>✅ Verified</strong>.
        </div>
        <div style={{ background:T.cream, border:`1.5px solid ${T.border}`, borderRadius:14, padding:"16px", marginBottom:18 }}>
          <div style={{ fontSize:10, fontWeight:700, color:T.indigo, letterSpacing:2, textTransform:"uppercase", marginBottom:14 }}>Company Details</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{gridColumn:"1/-1"}}><label style={lbl}>Company Name *</label><input value={form.company} onChange={e=>set("company",e.target.value)} placeholder="e.g. Google, TCS" style={inp}/></div>
            <div><label style={lbl}>Industry</label><input value={form.industry} onChange={e=>set("industry",e.target.value)} placeholder="e.g. Technology" style={inp}/></div>
            <div><label style={lbl}>Location</label><input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="e.g. Hyderabad / Remote" style={inp}/></div>
          </div>
        </div>
        {form.roles.map((role,i) => (
          <div key={i} style={{ background:T.cream, border:`1.5px solid rgba(26,122,74,0.15)`, borderRadius:14, padding:"16px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.green, letterSpacing:2, textTransform:"uppercase" }}>
                {i===0?"Current / Latest Role":"Earlier Role "+i}
              </div>
              {i>0&&<button onClick={()=>setForm(f=>({...f,roles:f.roles.filter((_,idx)=>idx!==i)}))}
                style={{ background:T.red2, border:`1px solid rgba(192,57,43,0.2)`, borderRadius:6,
                  padding:"4px 10px", color:T.red, fontSize:11, cursor:"pointer" }}>Remove</button>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{gridColumn:"1/-1"}}><label style={lbl}>Job Title *</label><input value={role.title} onChange={e=>setRole(i,"title",e.target.value)} placeholder="e.g. Senior Data Analyst" style={inp}/></div>
              <div><label style={lbl}>Start Date</label><input type="month" value={role.startDate} onChange={e=>setRole(i,"startDate",e.target.value)} style={{...inp,colorScheme:"light"}}/></div>
              <div><label style={lbl}>End Date</label>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {!role.current&&<input type="month" value={role.endDate} onChange={e=>setRole(i,"endDate",e.target.value)} style={{...inp,flex:1,colorScheme:"light"}}/>}
                  <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.ink3,cursor:"pointer",whiteSpace:"nowrap"}}>
                    <input type="checkbox" checked={role.current} onChange={e=>setRole(i,"current",e.target.checked)} style={{accentColor:T.green}}/>Present
                  </label>
                </div>
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={lbl}>Responsibilities</label>
                <textarea value={role.responsibilities} onChange={e=>setRole(i,"responsibilities",e.target.value)} placeholder={"• Led a team of 5\n• Built dashboards\n• Reduced time by 40%"} rows={4} style={{...inp,resize:"vertical",lineHeight:1.6}}/>
              </div>
              <div style={{gridColumn:"1/-1"}}><label style={lbl}>Skills Used</label>
                <input value={role.skills} onChange={e=>setRole(i,"skills",e.target.value)} placeholder="Python, SQL, Power BI" style={inp}/>
              </div>
            </div>
          </div>
        ))}
        <button onClick={()=>setForm(f=>({...f,roles:[...f.roles,{title:"",startDate:"",endDate:"",current:false,responsibilities:"",skills:""}]}))}
          style={{ width:"100%", padding:"11px", background:T.cream2, border:`1.5px dashed rgba(26,122,74,0.3)`,
            borderRadius:10, color:T.green, fontSize:13, fontWeight:700, cursor:"pointer", marginBottom:18 }}>
          + Add Promotion / Earlier Role
        </button>
        <button onClick={()=>onSave(form)} style={{ width:"100%", padding:"14px", background:T.indigo,
          border:"none", borderRadius:12, color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer" }}>
          Save Experience
        </button>
      </div>
    </div>
  )
}

// ─── CAREER TIMELINE ─────────────────────────────────────────────────────────
function CareerTimeline({ experiences, onAdd, onEdit, onDelete }) {
  // fmtDate: handles "YYYY-MM", "YYYY", free-text "Jan 2021", "January 2021", etc.
  const fmtDate = d => {
    if (!d) return ""
    const s = String(d).trim()
    // Already formatted "Mon YYYY" — pass through
    if (/^[A-Za-z]{3,9}\s+\d{4}$/.test(s)) return s
    // "YYYY-MM" → "Jan 2021"
    const p = s.split("-")
    if (p.length >= 2 && /^\d{4}$/.test(p[0]) && /^\d{1,2}$/.test(p[1])) {
      try { return new Date(+p[0], +p[1]-1).toLocaleDateString("en-US",{month:"short",year:"numeric"}) } catch { return s }
    }
    // "YYYY" alone
    if (/^\d{4}$/.test(s)) return s
    // Any other text — return as-is
    return s
  }
  const getDuration = (start, end, current) => {
    if (!start) return ""
    try {
      const parseD = v => { const p=String(v).split("-"); return new Date(+p[0], +(p[1]||1)-1) }
      const s = parseD(start)
      const e = current ? new Date() : (end ? parseD(end) : new Date())
      const months = (e.getFullYear()-s.getFullYear())*12 + (e.getMonth()-s.getMonth())
      if (months <= 0) return ""
      const y = Math.floor(months/12), mo = months%12
      return (y > 0 ? y+"yr " : "") + (mo > 0 ? mo+"mo" : "")
    } catch { return "" }
  }

  // Compat shim — normalise legacy roles[] format to flat structure
  // Always run normalisation (even flat entries may have old date field names)
  const exps = (experiences||[]).map(e => {
    const r0 = e.roles?.[0] || {}
    const skillsRaw = r0.skills || ""
    return {
      ...e,
      role:        e.role || r0.title || "",
      startDate:   e.startDate || e.startYear || r0.startDate || "",
      endDate:     e.endDate   || e.endYear   || r0.endDate   || "",
      isCurrent:   !!(e.isCurrent ?? e.current ?? r0.current ?? false),
      description: e.description || (Array.isArray(r0.responsibilities) ? r0.responsibilities.join("\n") : (r0.responsibilities || "")),
      skills:      e.skills?.length ? e.skills : (typeof skillsRaw === "string" ? skillsRaw.split(",").map(s=>s.trim()).filter(Boolean) : (Array.isArray(skillsRaw) ? skillsRaw : [])),
      location:    e.location || "",
    }
  })

  if (exps.length === 0) return (
    <div style={{ textAlign:"center", padding:"52px 24px" }}>
      <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#EEF0FB 0%,#F4F0FF 100%)", border:"1.5px solid rgba(61,78,172,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 18px" }}>💼</div>
      <div style={{ fontFamily:"'DM Sans',serif", fontSize:20, fontWeight:700, color:T.ink, marginBottom:8 }}>No experience yet</div>
      <div style={{ fontSize:13, color:T.ink4, lineHeight:1.7, maxWidth:360, margin:"0 auto 20px" }}>
        Upload a <strong style={{color:T.ink2}}>text-based PDF resume</strong> to auto-extract your timeline, or add entries manually.
      </div>
      <button onClick={onAdd} style={{ padding:"10px 24px", background:T.indigo, border:"none", borderRadius:10, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" }}>+ ADD EXPERIENCE</button>
    </div>
  )

  return (
    <div style={{ paddingTop:4 }}>
      {exps.map((e, ei) => {
        const startLabel = fmtDate(e.startDate)
        const endLabel   = e.isCurrent ? "Present" : fmtDate(e.endDate)
        const dateStr    = startLabel && endLabel ? `${startLabel} — ${endLabel}` : startLabel ? `${startLabel} — Present` : endLabel || null
        const dur        = getDuration(e.startDate, e.endDate, e.isCurrent)
        const skillList  = (Array.isArray(e.skills) ? e.skills.filter(Boolean) : (e.skills ? String(e.skills).split(",").map(s=>s.trim()).filter(Boolean) : [])).slice(0, 6)
        const descLines  = (e.description||"").split("\n").filter(Boolean)
        return (
          <div key={ei} style={{ display:"flex", gap:0 }}>
            {/* Left: avatar + connector */}
            <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", width:56, paddingTop:2 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#EEF0FB 0%,#F4F0FF 100%)", border:"1.5px solid rgba(61,78,172,0.18)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:900, color:T.indigo, flexShrink:0, fontFamily:"'DM Sans',serif", boxShadow:"0 2px 8px rgba(61,78,172,0.10)" }}>
                {e.company?.charAt(0)?.toUpperCase()||"C"}
              </div>
              {ei < exps.length - 1 && <div style={{ width:2, flex:1, background:"linear-gradient(to bottom, rgba(61,78,172,0.18) 0%, rgba(61,78,172,0.04) 100%)", marginTop:6, minHeight:32, borderRadius:2 }}/>}
            </div>

            {/* Right: content */}
            <div style={{ flex:1, paddingLeft:16, paddingBottom: ei < exps.length - 1 ? 32 : 0 }}>
              {/* Company row + edit/del */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                    <span style={{ fontFamily:"'DM Sans',serif", fontSize:17, fontWeight:700, color:T.ink }}>{e.company}</span>
                    {e.verificationStatus==="verified"
                      ? <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 9px", borderRadius:100, background:T.green2, color:T.green, fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>✓ VERIFIED · UAN/EPFO</span>
                      : <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 9px", borderRadius:100, background:T.amber2, color:T.amber, fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>SELF-CLAIMED · {e.verificationSource||"Resume"}</span>}
                    {e.isCurrent && <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:100, background:T.green2, color:T.green, fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em" }}>● CURRENT</span>}
                  </div>
                  {/* Two-name model: legal entity line shown only after EPFO verification */}
                  {e.legalName && e.legalName !== e.company && (
                    <div style={{ fontSize:11, color:T.ink3, fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em", marginBottom:3, display:"flex", alignItems:"center", gap:4 }}>
                      <span style={{ color:T.green, fontSize:10 }}>⚖</span>
                      <span>Legal entity: <span style={{ color:T.ink2, fontWeight:600 }}>{e.legalName}</span></span>
                      {e.matchConfidence && <span style={{ color:T.ink4 }}>· {e.matchConfidence}% match</span>}
                    </div>
                  )}
                  <div style={{ fontSize:11, color:T.ink4, display:"flex", gap:6, flexWrap:"wrap", fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" }}>
                    {e.industry&&<span>{e.industry}</span>}
                    {e.location&&<><span>·</span><span>📍 {e.location}</span></>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>onEdit(ei)} style={{ background:T.indigo3, border:`1px solid rgba(61,78,172,0.18)`, borderRadius:8, padding:"5px 13px", color:T.indigo, fontSize:11, cursor:"pointer", fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" }}>EDIT</button>
                  <button onClick={()=>onDelete(ei)} style={{ background:T.red2, border:`1px solid rgba(192,57,43,0.15)`, borderRadius:8, padding:"5px 13px", color:T.red, fontSize:11, cursor:"pointer", fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" }}>DEL</button>
                </div>
              </div>

              {/* Role card */}
              <div style={{ background:"#FAFAFE", border:"1.5px solid rgba(61,78,172,0.12)", borderRadius:14, padding:"14px 16px", boxShadow:"0 2px 12px rgba(61,78,172,0.06)" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'DM Sans',serif", fontSize:15, fontWeight:700, color:T.ink }}>{e.role||"Job Title"}</span>
                </div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color: dateStr ? T.ink4 : T.ink3, letterSpacing:"0.04em", marginBottom:8, fontStyle: dateStr ? "normal" : "italic" }}>
                  {dateStr
                    ? <>{dateStr}{dur&&<span style={{ marginLeft:8, color:T.indigo, fontWeight:600 }}>{dur}</span>}</>
                    : "Date not set · click EDIT to add dates"
                  }
                </div>
                {descLines.length > 0 && (
                  <div style={{ marginBottom:skillList.length>0?10:0 }}>
                    {descLines.map((line,li) => (
                      <div key={li} style={{ fontSize:13, color:T.ink2, lineHeight:1.7, display:"flex", gap:8, marginBottom:2 }}>
                        <span style={{ color:T.indigo, flexShrink:0, marginTop:1, fontSize:10 }}>▸</span>
                        <span>{line.replace(/^[•\-▸]\s*/,"")}</span>
                      </div>
                    ))}
                  </div>
                )}
                {skillList.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
                    {skillList.map((sk,si) => (
                      <span key={si} style={{ background:T.indigo3, border:`1px solid rgba(61,78,172,0.15)`, borderRadius:100, padding:"3px 10px", fontSize:11, color:T.indigo, fontWeight:600, fontFamily:"'DM Mono',monospace", letterSpacing:"0.03em" }}>{sk}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── VERIFICATION SECTION ────────────────────────────────────────────────────
function VerificationSection({ userData, user, onUpdate }) {
  const [modal, setModal]       = useState(null)
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [digiId, setDigiId]     = useState("")
  const [otp, setOtp]           = useState("")
  const [txnId, setTxnId]       = useState("")
  // EPFO (2026-08-05): AuthBridge company-search + confirm flow, replacing
  // the old UAN+OTP stub — see routes/verify.js's /epfo/search-company and
  // /epfo/confirm.
  const experiences              = userData?.experiences || []
  const [epfoExpIndex, setEpfoExpIndex] = useState(null)
  const [companyQuery, setCompanyQuery] = useState("")
  const [companyCandidates, setCompanyCandidates] = useState([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [personName, setPersonName] = useState(userData?.displayName || userData?.display_name || "")
  const [epfoResult, setEpfoResult] = useState(null)
  const [certProvider, setCertProvider] = useState(CERT_PROVIDERS[0])
  const [certId, setCertId]     = useState("")
  const [certs, setCerts]       = useState(userData?.certifications || [])
  // Re-sync when the shared certifications array changes elsewhere (e.g. StudentCertificatesPanel
  // adds/edits a manual or resume-sourced cert) — this array is shared with `certificates` (same
  // DB column, see db.js), so staying in sync here avoids clobbering entries added by the other panel.
  useEffect(()=>setCerts(userData?.certifications || []),[userData?.certifications])
  const educationDone = userData?.educationVerified
  // 2026-08-05 bug fix: userData.epfoVerified was never actually backed by a
  // real DB column (db.js's CAMEL_TO_SNAKE map explicitly no-ops writes for
  // it, and nothing maps it on read either — confirmed live: profiles only
  // has uan_verified/uan_verified_at/epfo_raw, no epfo_verified at all). It
  // only ever reflected transient client-session state from the moment of
  // the old stub's fake "verification", never anything persisted. Compute
  // the real signal directly from the experiences array instead, which IS
  // what /epfo/confirm actually persists and immediately applies here.
  const epfoDone      = experiences.some(e => e.verificationStatus === "verified" && e.verificationSource === "AuthBridge/EPFO")
  const close = () => {
    setModal(null); setStep(1); setError(""); setOtp(""); setDigiId(""); setTxnId("")
    setEpfoExpIndex(null); setCompanyQuery(""); setCompanyCandidates([]); setSelectedCompany(""); setEpfoResult(null)
  }
  const inp = { width:"100%", padding:"10px 14px", background:T.cream, border:`1.5px solid ${T.border}`,
    borderRadius:10, color:T.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }
  const initDigiLocker = async () => {
    if (!digiId.trim()) { setError("Enter your DigiLocker mobile number"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/verify/digilocker/init`,{method:"POST",headers:await vHeaders(),body:JSON.stringify({mobile:digiId})}).then(r=>r.json())
      if (res.txnId||res.success) { setTxnId(res.txnId||"mock-txn"); setStep(2) }
      else setError(res.error||"Failed to send OTP.")
    } catch { setError("Server error. Try again.") }
    setLoading(false)
  }
  const confirmDigiLocker = async () => {
    if (!otp.trim()) { setError("Enter OTP"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/verify/digilocker/confirm`,{method:"POST",headers:await vHeaders(),body:JSON.stringify({otp,txnId})}).then(r=>r.json())
      if (res.verified) { await onUpdate({educationVerified:true,educationData:res.data||{}}); setStep(3) }
      else setError(res.error||"Invalid OTP.")
    } catch { setError("Server error.") }
    setLoading(false)
  }
  // Picking an experience prefills the company search with its claimed name
  // and auto-searches — the user rarely needs to type anything.
  const pickEpfoExperience = async (idx) => {
    setEpfoExpIndex(idx); setSelectedCompany(""); setCompanyCandidates([]); setError("")
    const exp = experiences[idx]
    const q = exp?.company || exp?.displayCompany || ""
    setCompanyQuery(q)
    if (q.trim()) await searchEpfoCompany(q)
  }
  const searchEpfoCompany = async (qOverride) => {
    const q = (qOverride ?? companyQuery).trim()
    if (!q) { setError("Enter a company name to search"); return }
    setLoading(true); setError(""); setCompanyCandidates([])
    try {
      const res = await fetch(`${API}/api/verify/epfo/search-company`,{method:"POST",headers:await vHeaders(),body:JSON.stringify({companyName:q})}).then(r=>r.json())
      if (res.companies) {
        setCompanyCandidates(res.companies)
        if (res.companies.length === 0) setError("No EPFO-registered companies found matching that name — try a shorter or different spelling.")
      } else setError(res.error || "Company search failed.")
    } catch { setError("Server error.") }
    setLoading(false)
  }
  const confirmEPFO = async () => {
    if (epfoExpIndex === null) { setError("Pick which job to verify"); return }
    if (!selectedCompany) { setError("Pick the matching company from the list"); return }
    if (!personName.trim()) { setError("Enter your name as it appears on EPFO records"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/verify/epfo/confirm`,{method:"POST",headers:await vHeaders(),body:JSON.stringify({
        expIndex: epfoExpIndex, companyName: selectedCompany, personName: personName.trim(),
      })}).then(r=>r.json())
      if (res.verified) {
        setEpfoResult(res.data)
        if (res.data?.updatedExperiences?.length) {
          await onUpdate({ experiences: res.data.updatedExperiences })
        }
        setStep(3)
      }
      else setError(res.reason || res.error || "Couldn't confirm this employment — check the name and company, or try a different job entry.")
    } catch { setError("Server error.") }
    setLoading(false)
  }
  const verifyCert = async () => {
    if (!certId.trim()) { setError("Enter certificate ID"); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/verify/certification`,{method:"POST",headers:await vHeaders(),body:JSON.stringify({provider:certProvider.id,certId:certId.trim()})}).then(r=>r.json())
      if (res.verified) {
        const nc = [...certs,{
          name:certProvider.label, provider:certProvider.id, label:certProvider.label,
          certId:certId.trim(), credentialId:certId.trim(), verifiedAt:new Date().toISOString(),
          verificationStatus:"verified", verificationSource:certProvider.label, _source:"id-verification",
        }]
        setCerts(nc); await onUpdate({certifications:nc}); setStep(3)
      } else setError(res.error||"Certificate not found.")
    } catch { setError("Server error.") }
    setLoading(false)
  }
  const verItems = [
    {key:"education",icon:"🎓",label:"Education",sub:"DigiLocker / NAD",color:T.amber,bg:T.amber2,desc:"Degree verified by Govt of India",done:educationDone,onClick:()=>{setModal("education");setStep(1)}},
    {key:"epfo",icon:"🏢",label:"Employment",sub:"EPFO UAN",color:T.green,bg:T.green2,desc:"Work history from EPFO",done:epfoDone,onClick:()=>{setModal("epfo");setStep(1)}},
  ]
  return (
    <>
      <Card style={{marginBottom:16}}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <SectionLabel color={T.green}>🛡️ Profile Verification</SectionLabel>
            <div style={{ fontSize:12, color:T.ink3 }}>Verified profiles get 3× more recruiter views</div>
          </div>
          {educationDone&&epfoDone&&certs.length>0&&<Badge color={T.green} bg={T.green2}>✅ Fully Verified</Badge>}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          {verItems.map((v,i) => (
            <div key={i} style={{ background:v.done?v.bg:T.cream, border:`1.5px solid ${v.done?"rgba(26,122,74,0.2)":T.border}`,
              borderRadius:12, padding:"16px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:22 }}>{v.icon}</span>
                {v.done
                  ? <Badge color={v.color} bg={v.bg}>✓ VERIFIED</Badge>
                  : <Badge color={T.ink4} bg={T.cream2}>PENDING</Badge>}
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:2 }}>{v.label}</div>
              <div style={{ fontSize:11, color:v.color, fontWeight:600, marginBottom:4 }}>{v.sub}</div>
              <div style={{ fontSize:11, color:T.ink4, marginBottom:v.done?0:10 }}>{v.desc}</div>
              {!v.done&&<button onClick={v.onClick} style={{ width:"100%", padding:"7px", background:v.bg,
                border:`1px solid ${v.color}40`, borderRadius:7, color:v.color, fontSize:11,
                fontWeight:700, cursor:"pointer" }}>Verify Now →</button>}
            </div>
          ))}
        </div>
        <div style={{ background:T.cream, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:T.ink, marginBottom:2 }}>🏆 Professional Certifications</div>
              <div style={{ fontSize:11, color:T.ink4 }}>AWS · Google Cloud · Microsoft · Salesforce · CompTIA</div>
            </div>
            <button onClick={()=>{setModal("cert");setStep(1);setCertId("")}} style={{ padding:"6px 14px",
              background:T.indigo3, border:`1px solid rgba(61,78,172,0.25)`, borderRadius:8, color:T.indigo,
              fontSize:11, fontWeight:700, cursor:"pointer" }}>+ Add Cert</button>
          </div>
          {certs.length>0
            ? <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {certs.map((c,i) => {
                  const p = CERT_PROVIDERS.find(x=>x.id===c.provider)||CERT_PROVIDERS[0]
                  return <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 12px",
                    background:"#FFFFFF", border:`1.5px solid rgba(0,0,0,0.08)`, borderRadius:99, fontSize:11,
                    fontWeight:600, color:T.ink2 }}>
                    <span>{p.icon}</span>{p.label}<span style={{color:T.green,fontSize:10}}>✓</span>
                  </div>
                })}
              </div>
            : <div style={{ fontSize:11, color:T.ink4 }}>No certifications verified yet.</div>}
        </div>
      </Card>
      {modal&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(26,26,24,0.5)",backdropFilter:"blur(6px)",
          zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={close}>
          <div style={{ background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:20,padding:"28px",
            width:"100%",maxWidth:400,position:"relative",boxShadow:T.shadow2 }} onClick={e=>e.stopPropagation()}>
            <button onClick={close} style={{ position:"absolute",top:16,right:16,background:T.cream,
              border:`1px solid ${T.border}`,borderRadius:"50%",width:28,height:28,color:T.ink3,
              cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            {modal==="education"&&(<>
              {step===1&&(<>
                <div style={{fontSize:24,marginBottom:10}}>🎓</div>
                <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>Verify Education</div>
                <div style={{fontSize:12,color:T.ink3,marginBottom:20}}>Enter your DigiLocker registered mobile.</div>
                <label style={{fontSize:11,color:T.ink3,fontWeight:600,display:"block",marginBottom:6}}>Mobile Number</label>
                <input value={digiId} onChange={e=>setDigiId(e.target.value)} placeholder="10-digit mobile" style={inp} maxLength={10}/>
                {error&&<div style={{fontSize:11,color:T.red,marginTop:8}}>{error}</div>}
                <button onClick={initDigiLocker} disabled={loading} style={{width:"100%",padding:"11px",background:T.amber,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:16}}>{loading?"Sending OTP...":"Send OTP →"}</button>
              </>)}
              {step===2&&(<>
                <div style={{fontSize:24,marginBottom:10}}>📱</div>
                <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>Enter OTP</div>
                <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="6-digit OTP" style={inp} maxLength={6}/>
                {error&&<div style={{fontSize:11,color:T.red,marginTop:8}}>{error}</div>}
                <button onClick={confirmDigiLocker} disabled={loading} style={{width:"100%",padding:"11px",background:T.amber,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:16}}>{loading?"Verifying...":"Verify →"}</button>
                <button onClick={()=>setStep(1)} style={{width:"100%",padding:"8px",background:"transparent",border:"none",color:T.ink4,fontSize:12,cursor:"pointer",marginTop:8}}>← Back</button>
              </>)}
              {step===3&&(<div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:48,marginBottom:14}}>🎉</div>
                <div style={{fontSize:18,fontWeight:700,color:T.green,marginBottom:8}}>Education Verified!</div>
                <button onClick={close} style={{width:"100%",padding:"11px",background:T.green,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Done ✓</button>
              </div>)}
            </>)}
            {modal==="epfo"&&(<>
              {step===1&&(<>
                <div style={{fontSize:24,marginBottom:10}}>🏢</div>
                <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>Verify Employment</div>
                <div style={{fontSize:12,color:T.ink3,marginBottom:16}}>Pick a job from your timeline, then confirm the matching EPFO-registered company.</div>
                {experiences.length===0
                  ? <div style={{fontSize:12,color:T.ink4}}>Add a job to your Career Timeline first — EPFO verification checks against a specific employer.</div>
                  : <>
                    <label style={{fontSize:11,color:T.ink3,fontWeight:600,display:"block",marginBottom:6}}>Which job?</label>
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                      {experiences.map((e,i)=>(
                        <button key={i} onClick={()=>pickEpfoExperience(i)}
                          style={{textAlign:"left",padding:"9px 12px",borderRadius:8,cursor:"pointer",
                            background:epfoExpIndex===i?T.green2:T.cream,
                            border:`1.5px solid ${epfoExpIndex===i?T.green:T.border}`,
                            fontSize:12,color:T.ink,fontWeight:epfoExpIndex===i?700:500}}>
                          {e.company||e.displayCompany||"Company"}{e.role?` — ${e.role}`:""}
                          {e.verificationStatus==="verified"&&<span style={{marginLeft:6,color:T.green,fontSize:10}}>✓ verified</span>}
                        </button>
                      ))}
                    </div>
                    {epfoExpIndex!==null&&<>
                      <label style={{fontSize:11,color:T.ink3,fontWeight:600,display:"block",marginBottom:6}}>Search EPFO-registered company name</label>
                      <div style={{display:"flex",gap:6,marginBottom:10}}>
                        <input value={companyQuery} onChange={e=>setCompanyQuery(e.target.value)} placeholder="e.g. Capabilio" style={{...inp,flex:1}}/>
                        <button onClick={()=>searchEpfoCompany()} disabled={loading} style={{padding:"0 16px",background:T.green,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{loading?"…":"Search"}</button>
                      </div>
                      {companyCandidates.length>0&&(
                        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10,maxHeight:180,overflowY:"auto"}}>
                          {companyCandidates.map((c,i)=>(
                            <button key={i} onClick={()=>{setSelectedCompany(c);setStep(2)}}
                              style={{textAlign:"left",padding:"8px 12px",borderRadius:8,cursor:"pointer",
                                background:T.cream,border:`1.5px solid ${T.border}`,fontSize:11,color:T.ink2}}>
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </>}
                    {error&&<div style={{fontSize:11,color:T.red,marginTop:4}}>{error}</div>}
                  </>}
              </>)}
              {step===2&&(<>
                <div style={{fontSize:24,marginBottom:10}}>👤</div>
                <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>Confirm your name</div>
                <div style={{fontSize:12,color:T.ink3,marginBottom:14}}>Matching against <strong>{selectedCompany}</strong>. Use the name your EPFO records are under (may differ slightly from your profile name).</div>
                <input value={personName} onChange={e=>setPersonName(e.target.value)} placeholder="Full name" style={inp}/>
                {error&&<div style={{fontSize:11,color:T.red,marginTop:8}}>{error}</div>}
                <button onClick={confirmEPFO} disabled={loading} style={{width:"100%",padding:"11px",background:T.green,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:16}}>{loading?"Verifying...":"Verify →"}</button>
                <button onClick={()=>{setStep(1);setSelectedCompany("")}} style={{width:"100%",padding:"8px",background:"transparent",border:"none",color:T.ink4,fontSize:12,cursor:"pointer",marginTop:8}}>← Back</button>
              </>)}
              {step===3&&(<div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:48,marginBottom:14}}>🎉</div>
                <div style={{fontSize:18,fontWeight:700,color:T.green,marginBottom:8}}>Employment Verified!</div>
                {epfoResult?.employerName&&<div style={{fontSize:12,color:T.ink3,marginBottom:12}}>Confirmed at {epfoResult.employerName}</div>}
                <button onClick={close} style={{width:"100%",padding:"11px",background:T.green,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Done ✓</button>
              </div>)}
            </>)}
            {modal==="cert"&&(<>
              {step===1&&(<>
                <div style={{fontSize:24,marginBottom:10}}>🏆</div>
                <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>Add Certification</div>
                <div style={{fontSize:12,color:T.ink3,marginBottom:16}}>Select provider and enter credential ID.</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:16}}>
                  {CERT_PROVIDERS.map(p=>(
                    <button key={p.id} onClick={()=>setCertProvider(p)} style={{padding:"8px 6px",background:certProvider.id===p.id?`${p.color}15`:T.cream,border:`1.5px solid ${certProvider.id===p.id?p.color+"60":T.border}`,borderRadius:8,color:certProvider.id===p.id?p.color:T.ink3,fontSize:11,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
                <input value={certId} onChange={e=>setCertId(e.target.value)} placeholder={certProvider.placeholder} style={inp}/>
                {error&&<div style={{fontSize:11,color:T.red,marginTop:8}}>{error}</div>}
                <button onClick={verifyCert} disabled={loading} style={{width:"100%",padding:"11px",background:certProvider.color,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:16}}>{loading?"Verifying...":` Verify ${certProvider.label} →`}</button>
              </>)}
              {step===3&&(<div style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{fontSize:48,marginBottom:14}}>🏆</div>
                <div style={{fontSize:18,fontWeight:700,color:T.green,marginBottom:8}}>{certProvider.label} Verified!</div>
                <button onClick={close} style={{width:"100%",padding:"11px",background:T.green,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Done ✓</button>
              </div>)}
            </>)}
          </div>
        </div>
      )}
    </>
  )
}

// ─── SKILL VOUCHER PANEL ─────────────────────────────────────────────────────
function SkillVoucherPanel({ user, userData }) {
  const [voucherData, setVoucherData] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState("")
  const [copied, setCopied]           = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  useEffect(() => {
    if (!user?.id && !user?.uid) return
    const _uid = user.id || user.uid
    const eloFloor = userData?.path==='professional'||userData?.path==='authority' ? 800 : 400
    // Step 1: show UI immediately with locally-derived data (no spinner wait)
    const localCode = (_uid.slice(0,8)).toUpperCase().replace(/[^A-Z0-9]/g,"X")
    setVoucherData({ code: localCode, eloRating: userData?.eloRating||eloFloor, domain: userData?.keyword||"Tech", completedReferrals:0, pendingReferrals:0, monthsEarned:0, skillChain:[] })
    setLoading(false)
    // Step 2: silently try to fetch real data from API with 5-second timeout
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    Promise.all([
      fetch(API+"/api/referral/profile/"+_uid, { signal: ctrl.signal }),
      fetch(API+"/api/referral/leaderboard",   { signal: ctrl.signal }),
    ]).then(async ([vRes, lRes]) => {
      clearTimeout(timer)
      const vType = vRes.headers.get("content-type") || ""
      const lType = lRes.headers.get("content-type") || ""
      if (vType.includes("json")) {
        const v = await vRes.json()
        if (v && v.code) setVoucherData(v)
      }
      if (lType.includes("json")) {
        const l = await lRes.json()
        setLeaderboard(Array.isArray(l) ? l : [])
      }
    }).catch(() => {
      clearTimeout(timer)
      // Silently ignore — local data already shown
    })
  },[user?.uid])
  const copyCode = () => {
    navigator.clipboard.writeText("Join Capabilio — India's first skill-verified platform. Use my code: "+(voucherData?.code||"")+" → https://capabilio.online")
    setCopied(true); setTimeout(()=>setCopied(false),2500)
  }
  if (loading) return <div style={{padding:60,color:T.ink4,display:"flex",alignItems:"center",gap:10}}><div style={{width:14,height:14,border:`2px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Loading...</div>
  const myRank = leaderboard.findIndex(l=>l.uid===(user?.id||user?.uid))
  return (
    <div>
      <div style={{marginBottom:24}}>
        <SectionLabel color={T.indigo}>Skill Voucher</SectionLabel>
        <h2 style={{fontSize:24,fontWeight:800,color:T.ink,margin:"0 0 4px 0"}}>Your Skill Voucher</h2>
        <p style={{fontSize:13,color:T.ink3,margin:0}}>Share your ELO credibility. Friends who complete 1 task = 1 month Pro free for you.</p>
      </div>
      <Card style={{marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(61,78,172,0.07),transparent)",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:T.indigo,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Your Skill Voucher Code</div>
            <div style={{fontSize:38,fontWeight:900,color:T.ink,fontFamily:"'DM Mono',monospace",letterSpacing:6,marginBottom:10}}>
              {voucherData?.code||"LOADING"}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              <Badge color={T.indigo} bg={T.indigo3}>ELO {voucherData?.eloRating||userData?.eloRating||400}</Badge>
              <Badge color={T.blue} bg={T.blue2}>{voucherData?.domain||userData?.keyword||"Tech"}</Badge>
              <Badge color={T.green} bg={T.green2}>{(voucherData?.completedReferrals||0)+" completed"}</Badge>
            </div>
            <div style={{fontSize:11,color:T.ink3,lineHeight:1.6}}>
              When your referral completes their first Arena task, <strong style={{color:T.green}}>you get 1 month Elite</strong> + <strong style={{color:T.indigo}}>+50 ELO points</strong>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:150}}>
            {[
              {label:"Pending",value:voucherData?.pendingReferrals||0,color:T.amber,icon:"⏳"},
              {label:"Completed",value:voucherData?.completedReferrals||0,color:T.green,icon:"✅"},
              {label:"Months earned",value:voucherData?.monthsEarned||0,color:T.indigo,icon:"🎁"},
            ].map((s,i)=>(
              <div key={i} style={{padding:"10px 14px",background:T.cream,border:`1px solid ${T.border}`,borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>{s.icon}</span>
                <div><div style={{fontSize:18,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div><div style={{fontSize:9,color:T.ink4,textTransform:"uppercase",letterSpacing:1}}>{s.label}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16,flexWrap:"wrap"}}>
          <button onClick={copyCode} style={{padding:"9px 18px",background:copied?T.green2:T.indigo3,border:`1px solid ${copied?"rgba(26,122,74,0.3)":"rgba(61,78,172,0.3)"}`,borderRadius:10,color:copied?T.green:T.indigo,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            {copied?"Copied!":"Copy Message"}
          </button>
          <button onClick={()=>window.open("https://wa.me/?text="+encodeURIComponent("Join Capabilio! Code: "+(voucherData?.code||"")+" https://capabilio.online"),"_blank")} style={{padding:"9px 18px",background:"rgba(37,211,102,0.08)",border:"1px solid rgba(37,211,102,0.25)",borderRadius:10,color:"#25D366",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Share on WhatsApp
          </button>
          <button onClick={()=>window.open("https://www.linkedin.com/sharing/share-offsite/?url="+encodeURIComponent("https://capabilio.online"),"_blank")} style={{padding:"9px 18px",background:T.blue2,border:`1px solid rgba(21,101,192,0.25)`,borderRadius:10,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>
            Share on LinkedIn
          </button>
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card>
          <SectionLabel color={T.indigo}>Skill Chain</SectionLabel>
          {(voucherData?.skillChain||[]).length===0
            ? <div style={{textAlign:"center",padding:"24px 0",color:T.ink4}}><div style={{fontSize:24,marginBottom:8}}>🔗</div><div style={{fontSize:12}}>Share your code to build your skill chain.</div></div>
            : (voucherData.skillChain||[]).slice(0,5).map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.cream,border:`1px solid ${T.border}`,borderRadius:8,marginBottom:6}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:c.direction==="referee"?T.green2:T.indigo3,border:`1px solid ${c.direction==="referee"?"rgba(26,122,74,0.3)":"rgba(61,78,172,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:c.direction==="referee"?T.green:T.indigo}}>
                  {(c.name||"?")[0].toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.ink}}>{c.name}</div>
                  <div style={{fontSize:10,color:T.ink4}}>{c.direction==="referee"?"You referred":"Referred you"} · ELO {c.elo}</div>
                </div>
                <Badge color={c.direction==="referee"?T.green:T.indigo} bg={c.direction==="referee"?T.green2:T.indigo3}>{c.direction==="referee"?"Vouched":"Voucher"}</Badge>
              </div>
            ))}
        </Card>
        <Card>
          <SectionLabel color={T.indigo}>Top Vouchers</SectionLabel>
          {leaderboard.length===0
            ? <div style={{textAlign:"center",padding:"24px 0",color:T.ink4}}><div style={{fontSize:24,marginBottom:8}}>🏆</div><div style={{fontSize:12}}>Be the first on the leaderboard</div></div>
            : leaderboard.slice(0,5).map((l,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:l.uid===user?.uid?T.indigo3:T.cream,border:`1px solid ${l.uid===user?.uid?"rgba(61,78,172,0.25)":T.border}`,borderRadius:8,marginBottom:6}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:i===0?"rgba(255,215,0,0.15)":i===1?"rgba(192,192,192,0.15)":T.cream2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:i===0?"#DAA520":i===1?"#888":"#CD7F32"}}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":"#"+(i+1)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:l.uid===user?.uid?T.indigo:T.ink}}>{l.name}{l.uid===user?.uid?" (you)":""}</div>
                  <div style={{fontSize:10,color:T.ink4}}>{l.domain} · ELO {l.elo}</div>
                </div>
                <span style={{fontSize:11,fontWeight:800,color:T.green}}>{l.count}</span>
              </div>
            ))}
        </Card>
      </div>
    </div>
  )
}

// ─── AI INTERVIEW PANEL ───────────────────────────────────────────────────────
export function AIInterviewPanel({ user, userData, save, setUserData, onNavigate, onNavigatePricing }) {
  const [phase, setPhase] = useState("intro")
  const [stream, setStream] = useState(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [mediaError, setMediaError] = useState("")
  const [recognition, setRecognition] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [transcript, setTranscript] = useState(null)
  const [evalLoading, setEvalLoading] = useState(false)
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const videoRef = useRef()

  const keyword = userData?.keyword || getRoleConfig(userData).label
  // ── Plan quota ──
  const plan         = getPlan(userData)
  const interviewQuota = plan.interviewSessions          // 0 = no access, 3 = pro, 5 = elite
  const interviewsUsed = interviewsUsedThisMonth(userData)
  const interviewsLeft = Math.max(0, interviewQuota - interviewsUsed)
  const interviewLocked = interviewQuota === 0             // free plan
  const interviewExhausted = interviewQuota > 0 && interviewsLeft === 0

  useEffect(()=>()=>{ if(stream) stream.getTracks().forEach(t=>t.stop()); if(recognition) try{recognition.stop()}catch(e){} },[stream,recognition])

  const startMedia = async () => {
    setMediaError("")
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video:true, audio:true })
      setStream(s); setCameraOn(true); setMicOn(true)
      if(videoRef.current){ videoRef.current.srcObject=s; videoRef.current.muted=true }
      const SR = window.SpeechRecognition||window.webkitSpeechRecognition
      if(SR){
        const rec=new SR(); rec.continuous=true; rec.interimResults=true; rec.lang="en-US"
        rec.onresult=e=>{
          let final=""
          for(let i=e.resultIndex;i<e.results.length;i++) if(e.results[i].isFinal) final+=e.results[i][0].transcript
          if(final) setCurrentAnswer(prev=>prev+final)
        }
        rec.onerror=e=>console.warn("Speech error:",e.error)
        setRecognition(rec)
      }
    } catch(err){
      setMediaError(err.name==="NotAllowedError"?"Camera/microphone access denied. Please allow permissions in your browser settings and try again.":"Could not access camera/microphone: "+err.message)
    }
  }

  const stopMedia = () => {
    if(stream) stream.getTracks().forEach(t=>t.stop())
    setStream(null); setCameraOn(false); setMicOn(false)
    if(recognition) try{recognition.stop()}catch(e){}
  }

  const generateQuestions = async () => {
    setInterviewLoading(true)
    const skills=(userData?.skillGraph||[]).map(s=>s.label||s.skill).join(", ")||keyword
    const weak=(userData?.weakAreas||[]).join(", ")||"general concepts"
    const prompt=`Generate exactly 5 technical interview questions for a ${keyword} candidate.\nSkills to test: ${skills}. Focus on weak areas: ${weak}.\nReturn ONLY valid JSON array with no markdown:\n[{"id":1,"question":"...","type":"technical","difficulty":"medium","hint":"..."},{"id":2,"question":"...","type":"behavioral","difficulty":"medium","hint":"..."},{"id":3,"question":"...","type":"technical","difficulty":"hard","hint":"..."},{"id":4,"question":"...","type":"technical","difficulty":"medium","hint":"..."},{"id":5,"question":"...","type":"behavioral","difficulty":"easy","hint":"..."}]`
    try {
      const d=await fetch(`${API}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})}).then(r=>r.json())
      const txt=(d.text||"").replace(/```json|```/g,"").trim()
      const s=txt.indexOf("["),e=txt.lastIndexOf("]")+1
      setQuestions(JSON.parse(txt.slice(s,e)))
    } catch {
      setQuestions([
        {id:1,question:`Explain the difference between synchronous and asynchronous programming in ${keyword}.`,type:"technical",difficulty:"medium",hint:"Think about event loops and callbacks"},
        {id:2,question:"Describe a challenging technical problem you solved. What was your approach?",type:"behavioral",difficulty:"medium",hint:"Use STAR method: Situation → Task → Action → Result"},
        {id:3,question:"How do you ensure code quality in a team environment?",type:"behavioral",difficulty:"easy",hint:"Testing, code reviews, documentation"},
        {id:4,question:`What are the key performance optimization techniques in ${keyword}?`,type:"technical",difficulty:"hard",hint:"Think about caching, lazy loading, profiling"},
        {id:5,question:"Where do you see yourself in 3 years and how does this role fit?",type:"behavioral",difficulty:"easy",hint:"Show alignment with growth goals"},
      ])
    }
    setPhase("interview"); setCurrentQ(0); setAnswers([])
    setInterviewLoading(false)
  }

  const toggleRecording = () => {
    if(!recognition){alert("Speech recognition not supported. Please type your answer.");return}
    if(isRecording){recognition.stop();setIsRecording(false)}
    else{setCurrentAnswer("");recognition.start();setIsRecording(true)}
  }

  const submitAnswer = () => {
    if(!currentAnswer.trim()) return
    const newAnswers=[...answers,{questionId:questions[currentQ].id,question:questions[currentQ].question,answer:currentAnswer.trim(),timestamp:new Date().toISOString()}]
    setAnswers(newAnswers); setCurrentAnswer("")
    if(isRecording&&recognition){try{recognition.stop()}catch(e){}; setIsRecording(false)}
    if(currentQ<questions.length-1) setCurrentQ(c=>c+1)
    else evaluateInterview(newAnswers)
  }

  const evaluateInterview = async (allAnswers) => {
    setEvalLoading(true); setPhase("transcript")
    const qa=allAnswers.map((a,i)=>`Q${i+1}: ${a.question}\nAnswer: ${a.answer}`).join("\n\n")
    const prompt=`You are a senior technical interviewer evaluating a ${keyword} candidate.\n\n${qa}\n\nReturn ONLY valid JSON with no markdown:\n{"overallScore":75,"grade":"B+","summary":"2 sentence overall assessment","strengths":["strength1","strength2","strength3"],"improvements":["area1","area2","area3"],"questionFeedback":[{"questionId":1,"score":70,"feedback":"specific feedback","suggestion":"how to improve"},{"questionId":2,"score":65,"feedback":"feedback","suggestion":"suggestion"},{"questionId":3,"score":80,"feedback":"feedback","suggestion":"suggestion"},{"questionId":4,"score":70,"feedback":"feedback","suggestion":"suggestion"},{"questionId":5,"score":75,"feedback":"feedback","suggestion":"suggestion"}],"recommendation":"Recommend / Needs Work / Strong Hire","nextSteps":["action1","action2","action3"]}`
    try {
      const d=await fetch(`${API}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})}).then(r=>r.json())
      const txt=(d.text||"").replace(/```json|```/g,"").trim()
      const s=txt.indexOf("{"),e=txt.lastIndexOf("}")+1
      const result=JSON.parse(txt.slice(s,e))
      const finalTranscript={...result,answers:allAnswers,keyword,date:new Date().toISOString()}
      setTranscript(finalTranscript)
      if(save){
        const transcripts=[...(userData?.interviewTranscripts||[]),{...finalTranscript,id:Date.now().toString()}]

        // ── Update skill graph from interview question feedback ──────────────
        // Each question targets a skill — use its score to update the skill graph.
        const qFeedback = result.questionFeedback || []
        const questions = Array.isArray(window._interviewQuestions) ? window._interviewQuestions : []
        const existingGraph = userData?.skillGraph || userData?.skill_graph || []
        const updatedGraph = [...existingGraph]

        // Map question scores to domain skills
        const domainSkill = keyword || "General"
        // Use overall score to update the domain-level skill
        const overallPct = result.overallScore || 65
        const dsIdx = updatedGraph.findIndex(s =>
          (s.label||s.skill||"").toLowerCase() === domainSkill.toLowerCase()
        )
        if(dsIdx >= 0) {
          const prev = updatedGraph[dsIdx].value || updatedGraph[dsIdx].score || 0
          updatedGraph[dsIdx] = { ...updatedGraph[dsIdx],
            value: Math.round(prev * 0.5 + overallPct * 0.5),
            score: Math.round(prev * 0.5 + overallPct * 0.5),
          }
        } else {
          updatedGraph.push({ label: domainSkill, skill: domainSkill,
            value: overallPct, score: overallPct })
        }

        // Per-question skills from questionFeedback (if questions had skill tags)
        qFeedback.forEach((qf, qi) => {
          const q = questions[qi]
          const skillName = q?.skill || q?.topic || null
          if(!skillName || !qf?.score) return
          const idx = updatedGraph.findIndex(s =>
            (s.label||s.skill||"").toLowerCase() === skillName.toLowerCase()
          )
          if(idx >= 0) {
            const prev = updatedGraph[idx].value || 0
            updatedGraph[idx] = { ...updatedGraph[idx],
              value: Math.round(prev * 0.6 + qf.score * 0.4),
              score: Math.round(prev * 0.6 + qf.score * 0.4),
            }
          } else {
            updatedGraph.push({ label: skillName, skill: skillName,
              value: qf.score, score: qf.score })
          }
        })

        // Derive weakAreas and strengths from the interview
        const sortedByScore = [...updatedGraph]
          .filter(s => s.value != null)
          .sort((a,b) => (b.value||0) - (a.value||0))
        const topStrengths = sortedByScore.slice(0,3).map(s => s.label||s.skill).filter(Boolean)
        const weakAreas    = sortedByScore.slice(-3).reverse().map(s => s.label||s.skill).filter(Boolean)

        save({
          interviewTranscripts: transcripts,
          lastInterviewDate:    new Date().toISOString(),
          skillGraph:           updatedGraph,
          ...(topStrengths.length > 0 ? { strengths: topStrengths } : {}),
          ...(weakAreas.length   > 0 ? { weakAreas }               : {}),
        })
      }
    } catch {
      setTranscript({overallScore:65,grade:"B",summary:"Interview completed. AI evaluation temporarily unavailable — your transcript has been saved.",strengths:["Completed all questions","Showed willingness to engage"],improvements:["Provide more specific examples","Elaborate on technical depth"],answers:allAnswers,keyword,date:new Date().toISOString(),recommendation:"Needs Work",nextSteps:["Review your weak area topics","Practice STAR method","Schedule another mock interview"]})
    }
    stopMedia(); setEvalLoading(false)
  }

  const downloadTranscript = () => {
    if(!transcript) return
    const lines=[`CAPABILIO AI INTERVIEW TRANSCRIPT`,"=".repeat(50),`Role: ${transcript.keyword}`,`Date: ${new Date(transcript.date).toLocaleString()}`,`Score: ${transcript.overallScore}/100 (${transcript.grade})`,`Recommendation: ${transcript.recommendation}`,"","SUMMARY","=".repeat(50),transcript.summary,"","STRENGTHS","=".repeat(50),...(transcript.strengths||[]).map((s,i)=>`${i+1}. ${s}`),"","AREAS TO IMPROVE","=".repeat(50),...(transcript.improvements||[]).map((s,i)=>`${i+1}. ${s}`),"","Q&A TRANSCRIPT","=".repeat(50),...(transcript.answers||[]).flatMap((a,i)=>[`\nQ${i+1}: ${a.question}`,`\nYour Answer: ${a.answer}`,transcript.questionFeedback?.[i]?`\nFeedback: ${transcript.questionFeedback[i].feedback}`:"",transcript.questionFeedback?.[i]?`Score: ${transcript.questionFeedback[i].score}/100`:"","-".repeat(40)]),"","NEXT STEPS","=".repeat(50),...(transcript.nextSteps||[]).map((s,i)=>`${i+1}. ${s}`)]
    const blob=new Blob([lines.join("\n")],{type:"text/plain"})
    const url=URL.createObjectURL(blob)
    const a=document.createElement("a"); a.href=url; a.download=`capabilio-interview-${Date.now()}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const sc=s=>s>=80?T.green:s>=65?T.amber:T.red

  return (
    <div style={{animation:"fadeUp 0.3s ease both"}}>
      {/* INTRO */}
      {phase==="intro"&&(
        <div>
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:6}}>
              <div><SectionLabel color={T.indigo}>🤖 Starter Interview Pack</SectionLabel><h2 style={{fontSize:26,fontWeight:800,color:T.ink,margin:"0 0 6px 0"}}>AI Mock Interview</h2><p style={{fontSize:13,color:T.ink3,margin:0}}>Voice + camera interview practice tailored to your <strong>{keyword}</strong> profile</p></div>
              {!interviewLocked&&(
                <div style={{padding:"8px 16px",borderRadius:10,background:plan.colorBg,border:`1px solid ${plan.color}40`,textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:11,color:plan.color,fontWeight:700}}>{plan.label} Plan</div>
                  <div style={{fontSize:13,fontWeight:800,color:interviewsLeft>0?T.green:T.red}}>{interviewsLeft}/{interviewQuota} sessions left</div>
                  <div style={{fontSize:10,color:T.ink4,marginTop:2}}>Resets monthly</div>
                </div>
              )}
            </div>
          </div>
          {/* Plan gate */}
          {(interviewLocked||interviewExhausted)&&(
            <div style={{borderRadius:16,padding:"24px",background:T.cream2,border:`1.5px solid ${T.border}`,marginBottom:20,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>{interviewLocked?"🔒":"⏳"}</div>
              <div style={{fontSize:16,fontWeight:800,color:T.ink,marginBottom:8}}>
                {interviewLocked?"AI Interviews require a paid plan":"Monthly session limit reached"}
              </div>
              <div style={{fontSize:13,color:T.ink3,marginBottom:20,lineHeight:1.6}}>
                {(()=>{
                  const isPro=userData?.path==="professional"
                  if(interviewLocked){
                    return isPro
                      ?"Free Orbit plan does not include AI interview sessions. Upgrade to Capabilio Elite (₹999/mo) for 5 AI mock interview sessions per month."
                      :"Free plan does not include AI interview sessions. Upgrade to Pro (₹299/mo) for 3 Starter Interview Pack sessions per month."
                  }
                  return isPro
                    ?`You've used all ${interviewQuota} interview sessions this month. Upgrade to Capabilio Elite for 5 sessions/month.`
                    :`You've used all ${interviewQuota} sessions this month. Upgrade to ${plan.id==="pro"?"Elite (₹599/mo) for 5":"Elite"} sessions/month.`
                })()}
              </div>
              <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <div style={{padding:"12px 20px",background:plan.colorBg,borderRadius:12,fontSize:13,color:plan.color,fontWeight:700}}>Current: {plan.label} · {interviewQuota} sessions/mo</div>
                {(()=>{
                  const isPro=userData?.path==="professional"
                  if(isPro){
                    return(<>
                      <div style={{padding:"12px 20px",background:"#F5F3FF",borderRadius:12,fontSize:13,color:"#6D28D9",fontWeight:700}}>Capabilio Pro: ₹499/mo · 0 sessions</div>
                      <div style={{padding:"12px 20px",background:T.amber2,borderRadius:12,fontSize:13,color:T.amber,fontWeight:700}}>Capabilio Elite: ₹999/mo · 5 sessions/mo</div>
                    </>)
                  }
                  return(<>
                    {interviewLocked&&<div style={{padding:"12px 20px",background:T.indigo3,borderRadius:12,fontSize:13,color:T.indigo,fontWeight:700}}>Pro: ₹299/mo · 3 sessions/mo</div>}
                    <div style={{padding:"12px 20px",background:T.amber2,borderRadius:12,fontSize:13,color:T.amber,fontWeight:700}}>Elite: ₹599/mo · 5 sessions/mo</div>
                  </>)
                })()}
              </div>
              {onNavigatePricing&&(
                <button onClick={onNavigatePricing} style={{marginTop:16,padding:"11px 28px",background:T.indigo,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  View Plans & Upgrade →
                </button>
              )}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <Card style={{borderTop:`3px solid ${T.indigo}`}}>
              <div style={{fontSize:28,marginBottom:12}}>🎯</div>
              <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:8}}>What to expect</div>
              {["5 AI-generated questions tailored to your skill gaps","Voice recording — speak your answers naturally","Real-time speech-to-text transcription","AI scores and feedback per question","Downloadable transcript after the interview"].map((f,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:12,color:T.ink2}}><span style={{color:T.green,fontWeight:800,flexShrink:0}}>✓</span>{f}</div>)}
            </Card>
            <Card style={{borderTop:`3px solid ${T.green}`}}>
              <div style={{fontSize:28,marginBottom:12}}>💡</div>
              <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:8}}>Tips for best results</div>
              {["Find a quiet environment with good lighting","Speak clearly at a moderate pace","Use specific examples from your experience","Structure answers: Situation → Task → Action → Result","Take your time — there is no time pressure"].map((f,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:12,color:T.ink2}}><span style={{color:T.indigo,fontWeight:800,flexShrink:0}}>→</span>{f}</div>)}
            </Card>
          </div>
          <Card style={{marginBottom:20,background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.2)`}}>
            <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:T.indigo,marginBottom:6}}>📷 Camera & Microphone Required</div><div style={{fontSize:12,color:T.ink3,lineHeight:1.6}}>This interview uses your camera and microphone. Video is processed locally and not stored. Speech-to-text converts your spoken answers to text for AI evaluation.</div></div>
              {(!interviewLocked&&!interviewExhausted)&&(
                <button onClick={()=>setPhase("setup")} style={{padding:"12px 28px",background:T.indigo,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}}>Start Interview →</button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* SETUP */}
      {phase==="setup"&&(
        <div>
          <div style={{marginBottom:24}}><SectionLabel color={T.indigo}>Setup</SectionLabel><h2 style={{fontSize:22,fontWeight:800,color:T.ink,margin:0}}>Camera & Microphone Check</h2></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div>
              <div style={{background:"#000",borderRadius:16,overflow:"hidden",aspectRatio:"16/9",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,position:"relative"}}>
                <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",display:cameraOn?"block":"none"}}/>
                {!cameraOn&&<div style={{textAlign:"center",color:"#6B6560"}}><div style={{fontSize:40,marginBottom:8}}>📷</div><div style={{fontSize:13}}>Camera off</div></div>}
                {cameraOn&&<div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.6)",borderRadius:8,padding:"4px 10px",fontSize:11,color:"#4ade80",fontWeight:600}}>● LIVE</div>}
              </div>
              {mediaError&&<div style={{background:T.red2,border:`1.5px solid rgba(192,57,43,0.2)`,borderRadius:10,padding:"12px 16px",marginBottom:12,fontSize:12,color:T.red,lineHeight:1.5}}>⚠️ {mediaError}</div>}
              {!cameraOn
                ?<button onClick={startMedia} style={{width:"100%",padding:"12px",background:T.indigo,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>📷 Enable Camera & Microphone</button>
                :<button onClick={stopMedia} style={{width:"100%",padding:"12px",background:T.red2,border:`1px solid rgba(192,57,43,0.2)`,borderRadius:12,color:T.red,fontSize:14,fontWeight:700,cursor:"pointer"}}>⏹ Disable Camera</button>}
            </div>
            <Card>
              <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:16}}>Device Status</div>
              {[{label:"Camera",on:cameraOn,icon:"📷"},{label:"Microphone",on:micOn,icon:"🎙️"},{label:"Speech Recognition",on:!!(window.SpeechRecognition||window.webkitSpeechRecognition),icon:"🗣️"}].map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px",background:T.cream,borderRadius:10,marginBottom:8}}>
                  <span style={{fontSize:20}}>{d.icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{d.label}</div><div style={{fontSize:11,color:d.on?T.green:T.ink4}}>{d.on?"Ready":"Not connected"}</div></div>
                  <div style={{width:10,height:10,borderRadius:"50%",background:d.on?T.green:T.cream3,border:`2px solid ${d.on?"rgba(26,122,74,0.4)":T.border}`}}/>
                </div>
              ))}
              <div style={{marginTop:10,padding:"10px 12px",background:T.amber2,border:`1px solid rgba(184,98,10,0.15)`,borderRadius:9,fontSize:11,color:T.amber,lineHeight:1.6}}>💡 If speech recognition is unavailable you can still type your answers manually.</div>
              {cameraOn&&<button onClick={generateQuestions} disabled={interviewLoading} style={{width:"100%",padding:"14px",background:interviewLoading?T.cream2:T.green,border:"none",borderRadius:12,color:interviewLoading?T.ink4:"#fff",fontSize:14,fontWeight:700,cursor:interviewLoading?"not-allowed":"pointer",marginTop:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>{interviewLoading?<><Spinner color={T.ink4}/>Generating questions...</>:"🚀 Begin Interview"}</button>}
            </Card>
          </div>
        </div>
      )}

      {/* INTERVIEW */}
      {phase==="interview"&&questions.length>0&&(
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <div style={{flex:1,height:6,background:T.cream3,borderRadius:99}}><div style={{height:"100%",width:`${((currentQ+1)/questions.length)*100}%`,background:T.indigo,borderRadius:99,transition:"width .5s ease"}}/></div>
            <span style={{fontSize:12,fontWeight:700,color:T.ink3,flexShrink:0}}>Q{currentQ+1} of {questions.length}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
            <div>
              <Card style={{marginBottom:16,borderLeft:`4px solid ${T.indigo}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Badge color={T.indigo} bg={T.indigo3}>Q{currentQ+1}</Badge><Badge color={T.ink3} bg={T.cream2}>{questions[currentQ].difficulty}</Badge><Badge color={T.ink3} bg={T.cream2}>{questions[currentQ].type}</Badge></div>
                  <span style={{fontSize:11,color:T.ink4}}>{currentQ+1}/{questions.length}</span>
                </div>
                <div style={{fontSize:17,fontWeight:700,color:T.ink,lineHeight:1.55,marginBottom:12}}>{questions[currentQ].question}</div>
                <div style={{fontSize:12,color:T.ink4,display:"flex",gap:6}}><span>💡</span><span>{questions[currentQ].hint}</span></div>
              </Card>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.ink}}>Your Answer</div>
                  <button onClick={toggleRecording} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:isRecording?T.red2:T.green2,border:`1.5px solid ${isRecording?"rgba(192,57,43,0.3)":"rgba(26,122,74,0.3)"}`,borderRadius:9,color:isRecording?T.red:T.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {isRecording?<><Spinner color={T.red} size={10}/>Stop Recording</>:"🎙️ Record Voice"}
                  </button>
                </div>
                {isRecording&&<div style={{marginBottom:10,padding:"8px 12px",background:T.red2,borderRadius:8,fontSize:11,color:T.red,display:"flex",alignItems:"center",gap:6}}><Spinner color={T.red} size={8}/>Recording — speak clearly</div>}
                <textarea value={currentAnswer} onChange={e=>setCurrentAnswer(e.target.value)} placeholder="Type your answer here, or use voice recording above..." rows={6} style={{width:"100%",padding:"12px 14px",background:T.cream,border:`1.5px solid ${T.border}`,borderRadius:12,color:T.ink,fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",resize:"vertical",lineHeight:1.7,boxSizing:"border-box"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
                  <span style={{fontSize:11,color:T.ink4}}>{currentAnswer.length} characters</span>
                  <button onClick={submitAnswer} disabled={!currentAnswer.trim()} style={{padding:"10px 24px",background:currentAnswer.trim()?T.indigo:T.cream2,border:"none",borderRadius:10,color:currentAnswer.trim()?"#fff":T.ink4,fontSize:13,fontWeight:700,cursor:currentAnswer.trim()?"pointer":"not-allowed"}}>
                    {currentQ===questions.length-1?"Submit & Finish →":"Next Question →"}
                  </button>
                </div>
              </Card>
            </div>
            <div>
              <div style={{background:"#000",borderRadius:14,overflow:"hidden",aspectRatio:"4/3",marginBottom:12}}>
                <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              </div>
              <Card>
                <div style={{fontSize:11,fontWeight:700,color:T.ink3,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Questions</div>
                {questions.map((q,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,background:i===currentQ?T.indigo3:i<currentQ?T.green2:T.cream,marginBottom:4}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:i<currentQ?T.green:i===currentQ?T.indigo:T.cream3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:i<=currentQ?"#fff":T.ink4,flexShrink:0}}>{i<currentQ?"✓":i+1}</div>
                    <div style={{fontSize:11,color:i===currentQ?T.indigo:i<currentQ?T.green:T.ink4,fontWeight:i===currentQ?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{q.question.slice(0,32)}...</div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* EVALUATING */}
      {phase==="transcript"&&evalLoading&&(
        <div style={{textAlign:"center",padding:"80px 20px"}}>
          <div style={{width:48,height:48,border:`3px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 20px"}}/>
          <div style={{fontSize:18,fontWeight:700,color:T.ink,marginBottom:8}}>Evaluating your interview...</div>
          <div style={{fontSize:13,color:T.ink3}}>AI is analysing your answers and generating detailed feedback</div>
        </div>
      )}

      {/* TRANSCRIPT */}
      {phase==="transcript"&&!evalLoading&&transcript&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:16}}>
            <div><SectionLabel color={T.green}>✅ Interview Complete</SectionLabel><h2 style={{fontSize:26,fontWeight:800,color:T.ink,margin:0}}>Your Interview Results</h2></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={downloadTranscript} style={{padding:"10px 20px",background:T.cream2,border:`1px solid ${T.border}`,borderRadius:10,color:T.ink2,fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇️ Download Transcript</button>
              <button onClick={()=>{setPhase("intro");setTranscript(null);setAnswers([]);setCurrentQ(0);setCameraOn(false);setStream(null)}} style={{padding:"10px 20px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>🔄 New Interview</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
            <Card style={{textAlign:"center",borderTop:`3px solid ${sc(transcript.overallScore)}`}}><div style={{fontSize:10,fontWeight:800,color:sc(transcript.overallScore),letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Overall Score</div><div style={{fontSize:48,fontWeight:900,color:sc(transcript.overallScore),fontFamily:"'DM Mono',monospace",lineHeight:1}}>{transcript.overallScore}</div><div style={{fontSize:22,fontWeight:800,color:T.ink3,marginTop:4}}>{transcript.grade}</div></Card>
            <Card style={{textAlign:"center",borderTop:`3px solid ${T.indigo}`}}><div style={{fontSize:10,fontWeight:800,color:T.indigo,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Recommendation</div><div style={{fontSize:17,fontWeight:800,color:T.ink,marginTop:12,lineHeight:1.3}}>{transcript.recommendation}</div></Card>
            <Card style={{textAlign:"center",borderTop:`3px solid ${T.green}`}}><div style={{fontSize:10,fontWeight:800,color:T.green,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Questions</div><div style={{fontSize:48,fontWeight:900,color:T.green,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{transcript.answers?.length||0}</div><div style={{fontSize:12,color:T.ink4,marginTop:4}}>answered</div></Card>
          </div>
          <Card style={{marginBottom:16,background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.2)`}}>
            <SectionLabel color={T.indigo}>Summary</SectionLabel>
            <p style={{fontSize:14,color:T.ink2,lineHeight:1.7,margin:"8px 0 0"}}>{transcript.summary}</p>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <Card style={{borderTop:`3px solid ${T.green}`}}>
              <SectionLabel color={T.green}>💪 Strengths</SectionLabel>
              {(transcript.strengths||[]).map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:8,fontSize:13,color:T.ink2,marginTop:i===0?8:0}}><span style={{color:T.green,fontWeight:800,flexShrink:0}}>✓</span>{s}</div>)}
            </Card>
            <Card style={{borderTop:`3px solid ${T.amber}`}}>
              <SectionLabel color={T.amber}>📈 Areas to Improve</SectionLabel>
              {(transcript.improvements||[]).map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:8,fontSize:13,color:T.ink2,marginTop:i===0?8:0}}><span style={{color:T.amber,fontWeight:800,flexShrink:0}}>→</span>{s}</div>)}
            </Card>
          </div>
          <Card style={{marginBottom:16}}>
            <SectionLabel>📋 Q&A Breakdown</SectionLabel>
            {(transcript.answers||[]).map((a,i)=>(
              <div key={i} style={{marginTop:16,paddingTop:16,borderTop:i>0?`1px solid ${T.border}`:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.ink,flex:1,marginRight:12}}>{i+1}. {a.question}</div>
                  {transcript.questionFeedback?.[i]&&<Badge color={sc(transcript.questionFeedback[i].score)} bg={sc(transcript.questionFeedback[i].score)+"15"}>{transcript.questionFeedback[i].score}/100</Badge>}
                </div>
                <div style={{fontSize:12,color:T.ink3,background:T.cream,borderRadius:10,padding:"10px 14px",marginBottom:8,lineHeight:1.6}}>{a.answer}</div>
                {transcript.questionFeedback?.[i]&&<><div style={{fontSize:12,color:T.ink2,marginBottom:4}}><strong style={{color:T.indigo}}>Feedback:</strong> {transcript.questionFeedback[i].feedback}</div><div style={{fontSize:12,color:T.ink3}}><strong style={{color:T.green}}>Suggestion:</strong> {transcript.questionFeedback[i].suggestion}</div></>}
              </div>
            ))}
          </Card>
          <Card style={{background:T.green2,border:`1.5px solid rgba(26,122,74,0.2)`}}>
            <SectionLabel color={T.green}>🎯 Next Steps</SectionLabel>
            {(transcript.nextSteps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:8,fontSize:13,color:T.ink2,marginTop:i===0?8:0}}><span style={{width:22,height:22,borderRadius:"50%",background:T.green,color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</span>{s}</div>)}
          </Card>
          <Card style={{marginTop:16,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",background:"#FFFFFF",border:`1.5px solid rgba(61,78,172,0.2)`}}>
            <div style={{width:44,height:44,borderRadius:12,background:T.indigo3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📊</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:4}}>✅ Saved to Your Portfolio</div>
              <div style={{fontSize:12,color:T.ink3,lineHeight:1.6}}>This interview result — score <strong style={{color:sc(transcript.overallScore)}}>{transcript.overallScore}/100</strong> ({transcript.grade}), recommendation: <strong>{transcript.recommendation}</strong> — has been saved. Recruiters viewing your public portfolio can see your interview history.</div>
            </div>
            <button onClick={()=>onNavigate&&onNavigate("aura")} style={{padding:"9px 18px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>View Portfolio →</button>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── MONTHLY REPORT PANEL ────────────────────────────────────────────────────
const MARKET_BENCHMARKS = {
  "data science":    { growth:"31%", marketAvg:72, topSkills:["Python","SQL","Machine Learning","Statistics","Data Visualization"], benchmarks:{Python:85,SQL:78,Statistics:74,Machine_Learning:68,Data_Visualization:65,Feature_Engineering:60,Model_Evaluation:58,AB_Testing:55} },
  "data scientist":  { growth:"31%", marketAvg:72, topSkills:["Python","SQL","Machine Learning","Statistics","Data Visualization"], benchmarks:{Python:85,SQL:78,Statistics:74,Machine_Learning:68,Data_Visualization:65,Feature_Engineering:60,Model_Evaluation:58,AB_Testing:55} },
  "data analyst":    { growth:"18%", marketAvg:68, topSkills:["SQL","Python","Data Visualization","Statistics","Business Intelligence"], benchmarks:{SQL:82,Python:71,Data_Visualization:68,Statistics:65,Business_Intelligence:60,Dashboard_Design:58,Reporting:55,AB_Testing:52} },
  "data engineer":   { growth:"26%", marketAvg:74, topSkills:["SQL","Python","Apache Spark","Kafka","dbt"], benchmarks:{SQL:82,Python:78,Apache_Spark:72,Kafka:65,dbt:70,ETL_ELT:68,Data_Modeling:65,Orchestration:58} },
  "ml engineer":     { growth:"28%", marketAvg:76, topSkills:["Python","Machine Learning","MLOps","Deep Learning","Statistics"], benchmarks:{Python:88,Machine_Learning:80,MLOps:75,Deep_Learning:70,Statistics:68,NLP:62,Computer_Vision:60,Model_Deployment:72} },
  "full-stack":      { growth:"19%", marketAvg:71, topSkills:["React","Node.js","TypeScript","SQL","REST APIs"], benchmarks:{React:82,Node_js:76,TypeScript:74,SQL:68,REST_APIs:72,Authentication:65,Testing:62,System_Design:60} },
  "frontend":        { growth:"14%", marketAvg:70, topSkills:["React","TypeScript","CSS","JavaScript","Testing"], benchmarks:{React:84,TypeScript:76,CSS:72,JavaScript:80,Testing:65,Performance:62,Accessibility:60,Design_Systems:58} },
  "devops":          { growth:"22%", marketAvg:73, topSkills:["Docker","Kubernetes","CI/CD","Linux","Cloud Platforms"], benchmarks:{Docker:80,Kubernetes:75,CI_CD:78,Linux:74,Cloud_Platforms:72,Monitoring:68,Security:65,Bash_Scripting:62} },
  "cybersecurity":   { growth:"25%", marketAvg:72, topSkills:["Network Security","Penetration Testing","SIEM","Incident Response","Compliance"], benchmarks:{Network_Security:80,Penetration_Testing:74,SIEM:70,Incident_Response:76,Compliance:68,Digital_Forensics:62,AppSec:65,Threat_Analysis:72} },
  "default":         { growth:"13%", marketAvg:65, topSkills:["System Design","Cloud Architecture","Data Literacy","Testing","APIs"], benchmarks:{System_Design:75,Cloud_Architecture:72,Data_Literacy:68,Testing:65,APIs:70,Clean_Code:62,Git:80,OOP:68} },
}

function getMarketData(keyword) {
  if (!keyword) return MARKET_BENCHMARKS.default
  const k = keyword.toLowerCase()
  for (const [key, data] of Object.entries(MARKET_BENCHMARKS)) {
    if (k.includes(key) || key.includes(k)) return data
  }
  return MARKET_BENCHMARKS.default
}

function MonthlyReportPanel({ userData, skillGraph, eloHistory, eloRating, keyword, arenaCompleted, user }) {
  const now       = new Date()
  const monthName = now.toLocaleString("en-US",{month:"long",year:"numeric"})
  const market    = getMarketData(keyword)

  // Monthly ELO delta: compare entries from last 30 days vs 30-60 days ago
  const cutoff30  = new Date(Date.now()-30*86400000).toISOString().slice(0,10)
  const cutoff60  = new Date(Date.now()-60*86400000).toISOString().slice(0,10)
  const thisMonth = eloHistory.filter(h=>h.date>=cutoff30)
  const lastMonth = eloHistory.filter(h=>h.date>=cutoff60&&h.date<cutoff30)
  const eloStartOfMonth = thisMonth.length>0 ? (thisMonth[0].elo||eloRating) : eloRating
  const eloEndOfMonth   = eloRating
  const eloMonthDelta   = eloEndOfMonth - eloStartOfMonth
  const lastMonthElo    = lastMonth.length>0 ? lastMonth[lastMonth.length-1].elo||eloRating : eloRating-eloMonthDelta
  const lastMonthDelta  = eloStartOfMonth - lastMonthElo

  // Tasks this month
  const tasksThisMonth  = (userData?.arenaHistory||[]).filter(h=>(h.completedAt||"")>=cutoff30).length
  const tasksLastMonth  = (userData?.arenaHistory||[]).filter(h=>(h.completedAt||"")>=cutoff60&&(h.completedAt||"")<cutoff30).length
  const avgScoreThisMonth = (() => {
    const recent = (userData?.arenaHistory||[]).filter(h=>(h.completedAt||"")>=cutoff30&&h.score)
    return recent.length ? Math.round(recent.reduce((a,h)=>a+(h.score||0),0)/recent.length) : (userData?.avgScore||0)
  })()

  // Skills: user scores mapped to market benchmarks
  const skillRows = skillGraph.slice(0,10).map(s => {
    const skillKey = (s.label||s.skill||"").replace(/[&\/\s]+/g,"_")
    const marketPct = market.benchmarks[skillKey] || market.benchmarks[(s.label||s.skill||"").split(" ")[0]] || market.marketAvg
    const userPct   = Math.round(s.value||s.score||0)
    const gap       = marketPct - userPct
    return { skill:s.label||s.skill, userPct, marketPct, gap, status: gap<=0?"ahead":gap<=15?"close":"behind" }
  })

  // Overall readiness: how many skills meet market bar
  const skillsMeetingMarket = skillRows.filter(s=>s.status==="ahead").length
  const readinessPct = skillGraph.length ? Math.round((skillsMeetingMarket/skillRows.length)*100) : 0
  const userAvgSkill = skillGraph.length ? Math.round(skillGraph.reduce((a,s)=>a+(s.value||s.score||0),0)/skillGraph.length) : 0

  // Percentile estimate: linear mapping of userAvg vs marketAvg
  const percentile = Math.min(99, Math.round((userAvgSkill / (market.marketAvg*1.4))*100))

  // Top improving skill this month
  const topSkillName = skillGraph[0]?.label||skillGraph[0]?.skill||"—"
  const topSkillScore = Math.round(skillGraph[0]?.value||skillGraph[0]?.score||0)

  // Tier — theme.js is the single source of truth now
  const tier = getTier(eloRating)

  // Recommended actions
  const actions = [
    ...skillRows.filter(s=>s.status==="behind").slice(0,2).map(s=>`Close the ${s.skill} gap: you're at ${s.userPct}%, market expects ${s.marketPct}% — ${Math.ceil((s.marketPct-s.userPct)/8)} Arena tasks will bridge this`),
    arenaCompleted<3 ? "Complete at least 3 Arena tasks this month to maintain skill momentum" : "Maintain your Arena streak — consistency compounds ELO faster than burst sessions",
    `Focus on ${market.topSkills[0]} and ${market.topSkills[1]} — these are the most-mentioned skills in ${keyword} job postings right now`,
  ].slice(0,4)

  const C = T  // reuse design tokens

  const statCards = [
    { icon:"⚡", label:"ELO Rating", value:eloRating, sub:`${eloMonthDelta>=0?"+":""}${eloMonthDelta} this month`, color:C.indigo, bg:"linear-gradient(135deg,#EEF0FB,#fff)" },
    { icon:"✅", label:"Tasks Completed", value:tasksThisMonth, sub:`${tasksLastMonth} last month`, color:C.green, bg:"linear-gradient(135deg,#E8F7EF,#fff)" },
    { icon:"📊", label:"Avg Score", value:avgScoreThisMonth+"%", sub:"30-day window", color:C.amber, bg:"linear-gradient(135deg,#FDF3E7,#fff)" },
    { icon:"🎯", label:"Skills Assessed", value:skillGraph.length, sub:`Top: ${topSkillName} (${topSkillScore}%)`, color:C.purple, bg:"linear-gradient(135deg,#EDE9FE,#fff)" },
  ]

  return (
    <div style={{animation:"fadeUp .3s ease both"}}>
      {/* ── Report Header ── */}
      <div style={{background:"linear-gradient(135deg,#1A1A2E,#16213E,#0F3460)",borderRadius:20,padding:"32px 36px",marginBottom:24,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-60,right:-60,width:240,height:240,borderRadius:"50%",background:"rgba(61,78,172,0.15)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-40,left:200,width:160,height:160,borderRadius:"50%",background:"rgba(34,197,94,0.08)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(61,78,172,0.4)",border:"1px solid rgba(0,0,0,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📊</div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#A8A29E",letterSpacing:2,textTransform:"uppercase"}}>Capabilio Intelligence Report</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",marginTop:2}}>{monthName} · {keyword}</div>
            </div>
            <div style={{marginLeft:"auto",padding:"6px 14px",background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",borderRadius:99,fontSize:11,fontWeight:700,color:"#4ade80"}}>● Live Data</div>
          </div>
          <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,fontWeight:900,color:"#fff",lineHeight:1}}>{eloRating}</div>
              <div style={{fontSize:10,color:"#A8A29E",fontWeight:600,textTransform:"uppercase",marginTop:3}}>ELO</div>
            </div>
            <div style={{width:1,background:"rgba(0,0,0,0.05)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,fontWeight:900,color:tier.color,lineHeight:1}}>{tier.label}</div>
              <div style={{fontSize:10,color:"#A8A29E",fontWeight:600,textTransform:"uppercase",marginTop:3}}>Tier</div>
            </div>
            <div style={{width:1,background:"rgba(0,0,0,0.05)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{percentile}<span style={{fontSize:16}}>%ile</span></div>
              <div style={{fontSize:10,color:"#A8A29E",fontWeight:600,textTransform:"uppercase",marginTop:3}}>Market Rank</div>
            </div>
            <div style={{width:1,background:"rgba(0,0,0,0.05)"}}/>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:32,fontWeight:900,color:"#f59e0b",lineHeight:1}}>{market.growth}</div>
              <div style={{fontSize:10,color:"#A8A29E",fontWeight:600,textTransform:"uppercase",marginTop:3}}>Market Growth</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14,marginBottom:24}}>
        {statCards.map((c,i)=>(
          <div key={i} style={{background:c.bg,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 22px",boxShadow:C.shadow}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{fontSize:22}}>{c.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:C.ink4,textTransform:"uppercase",letterSpacing:0.5}}>{c.label}</div>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:c.color,lineHeight:1}}>{c.value}</div>
            <div style={{fontSize:11,color:C.ink4,marginTop:6}}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        {/* ── User vs Market Skill Comparison ── */}
        <div style={{background:"#FFFFFF",border:`1px solid ${C.border}`,borderRadius:18,padding:"24px 26px",boxShadow:C.shadow,gridColumn:"1/-1"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.indigo,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>🎯 Skill Intelligence</div>
              <h3 style={{margin:0,fontSize:18,fontWeight:800,color:C.ink}}>You vs. Market Benchmark</h3>
              <p style={{margin:"4px 0 0",fontSize:12,color:C.ink3}}>Your assessed skill scores compared to what the {keyword} market requires in 2025-26</p>
            </div>
            <div style={{display:"flex",gap:16,flexShrink:0}}>
              {[{color:C.indigo,label:"Your Score"},{color:"#A8A29E",label:"Market Avg"}].map((l,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:10,height:10,borderRadius:2,background:l.color}}/>
                  <span style={{fontSize:11,color:C.ink3,fontWeight:600}}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {skillRows.length===0 ? (
            <div style={{padding:"32px",textAlign:"center",color:C.ink4,fontSize:13}}>Complete Arena tasks to populate your skill scores and see the comparison.</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {skillRows.map((row,i)=>(
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{row.skill}</span>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:12,fontWeight:800,color:row.status==="ahead"?C.green:row.status==="close"?C.amber:C.red}}>{row.userPct}%</span>
                      <span style={{fontSize:11,color:C.ink4}}>vs</span>
                      <span style={{fontSize:12,color:C.ink3}}>{row.marketPct}%</span>
                      <span style={{padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:700,
                        background:row.status==="ahead"?C.green2:row.status==="close"?C.amber2:C.red2,
                        color:row.status==="ahead"?C.green:row.status==="close"?C.amber:C.red}}>
                        {row.status==="ahead"?"✓ Ahead":row.status==="close"?"~ Close":`-${row.gap}%`}
                      </span>
                    </div>
                  </div>
                  <div style={{position:"relative",height:10,background:C.cream3,borderRadius:99,overflow:"hidden"}}>
                    {/* Market bar */}
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${row.marketPct}%`,background:"rgba(148,163,184,0.4)",borderRadius:99}}/>
                    {/* User bar */}
                    <div style={{position:"absolute",left:0,top:"15%",height:"70%",width:`${row.userPct}%`,
                      background:row.status==="ahead"?`linear-gradient(90deg,${C.green},#86efac)`:row.status==="close"?`linear-gradient(90deg,${C.amber},#fcd34d)`:`linear-gradient(90deg,${C.indigo},${C.indigo2})`,
                      borderRadius:99,transition:"width 1s ease"}}/>
                    {/* Market marker line */}
                    <div style={{position:"absolute",top:0,left:`${row.marketPct}%`,width:2,height:"100%",background:"#A8A29E",transform:"translateX(-50%)"}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        {/* ── Market Positioning ── */}
        <div style={{background:"#FFFFFF",border:`1px solid ${C.border}`,borderRadius:18,padding:"24px 26px",boxShadow:C.shadow}}>
          <div style={{fontSize:11,fontWeight:700,color:C.indigo,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>📍 Market Position</div>
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:800,color:C.ink}}>Competitive Standing</h3>
          {/* Gauge */}
          <div style={{position:"relative",marginBottom:20}}>
            <svg viewBox="0 0 200 110" style={{width:"100%",maxWidth:240,display:"block",margin:"0 auto"}}>
              {/* Track segments */}
              {[{from:0,to:25,color:"#FEE2E2"},{from:25,to:50,color:"#FEF9C3"},{from:50,to:75,color:"#DBEAFE"},{from:75,to:100,color:"#DCFCE7"}].map((seg,si)=>{
                const toRad=pct=>((pct/100)*Math.PI)+Math.PI
                const x1=100+85*Math.cos(toRad(seg.from)), y1=100+85*Math.sin(toRad(seg.from))
                const x2=100+85*Math.cos(toRad(seg.to)),   y2=100+85*Math.sin(toRad(seg.to))
                const laf=seg.to-seg.from>50?1:0
                return <path key={si} d={`M ${x1} ${y1} A 85 85 0 ${laf} 1 ${x2} ${y2}`} fill="none" stroke={seg.color} strokeWidth="18" strokeLinecap="round"/>
              })}
              {/* Filled arc */}
              {(()=>{
                const toRad=pct=>((pct/100)*Math.PI)+Math.PI
                const x2=100+85*Math.cos(toRad(percentile)), y2=100+85*Math.sin(toRad(percentile))
                const laf=percentile>50?1:0
                const gradColor=percentile>75?C.green:percentile>50?C.blue:percentile>25?C.amber:C.red
                return <path d={`M ${100+85*Math.cos(Math.PI)} ${100+85*Math.sin(Math.PI)} A 85 85 0 ${laf} 1 ${x2} ${y2}`} fill="none" stroke={gradColor} strokeWidth="14" strokeLinecap="round"/>
              })()}
              {/* Needle */}
              {(()=>{
                const angle=((percentile/100)*Math.PI)+Math.PI
                const nx=100+68*Math.cos(angle), ny=100+68*Math.sin(angle)
                return <line x1="100" y1="100" x2={nx} y2={ny} stroke="#1A1714" strokeWidth="2.5" strokeLinecap="round"/>
              })()}
              <circle cx="100" cy="100" r="6" fill="#1A1714"/>
              <text x="100" y="92" textAnchor="middle" fontSize="22" fontWeight="900" fill={percentile>75?C.green:percentile>50?C.blue:percentile>25?C.amber:C.red}>{percentile}</text>
              <text x="100" y="106" textAnchor="middle" fontSize="9" fill="#A8A29E">PERCENTILE</text>
            </svg>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {label:"Your Avg Skill",value:userAvgSkill+"%",color:C.indigo},
              {label:"Market Avg",value:market.marketAvg+"%",color:C.ink3},
              {label:"Skills Ahead",value:`${skillsMeetingMarket}/${skillRows.length}`,color:C.green},
              {label:"Market Growth",value:market.growth,color:C.amber},
            ].map((m,i)=>(
              <div key={i} style={{padding:"10px 12px",background:C.cream2,borderRadius:10}}>
                <div style={{fontSize:16,fontWeight:800,color:m.color}}>{m.value}</div>
                <div style={{fontSize:10,color:C.ink4,fontWeight:600,marginTop:2}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ELO Monthly Trajectory ── */}
        <div style={{background:"#FFFFFF",border:`1px solid ${C.border}`,borderRadius:18,padding:"24px 26px",boxShadow:C.shadow}}>
          <div style={{fontSize:11,fontWeight:700,color:C.indigo,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>📈 ELO Trajectory</div>
          <h3 style={{margin:"0 0 4px",fontSize:16,fontWeight:800,color:C.ink}}>30-Day ELO Movement</h3>
          <div style={{fontSize:12,color:C.ink3,marginBottom:16}}>
            <span style={{fontWeight:700,color:eloMonthDelta>=0?C.green:C.red,fontSize:18}}>{eloMonthDelta>=0?"+":""}{eloMonthDelta}</span> ELO this month
            {lastMonthDelta!==0&&<span style={{color:C.ink4,fontSize:11}}> · last month: {lastMonthDelta>=0?"+":""}{lastMonthDelta}</span>}
          </div>
          {/* Mini sparkline */}
          <svg viewBox={`0 0 260 80`} style={{width:"100%",overflow:"visible"}}>
            {eloHistory.slice(-12).length>1 ? (()=>{
              const pts=eloHistory.slice(-12)
              const elos=pts.map(h=>h.elo||eloRating)
              const mn=Math.min(...elos)-20, mx=Math.max(...elos)+20
              const toX=(i,len)=>20+(i/(len-1))*220
              const toY=v=>70-((v-mn)/(mx-mn))*60
              const path=elos.map((e,i)=>`${i===0?"M":"L"}${toX(i,elos.length)},${toY(e)}`).join(" ")
              const gradId="eloGrad_"+Math.random().toString(36).slice(2)
              return <>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.indigo} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={C.indigo} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d={path+" L"+toX(elos.length-1,elos.length)+",75 L20,75 Z"} fill={`url(#${gradId})`}/>
                <path d={path} fill="none" stroke={C.indigo} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                {elos.map((e,i)=>(
                  <circle key={i} cx={toX(i,elos.length)} cy={toY(e)} r={i===elos.length-1?5:2.5}
                    fill={i===elos.length-1?C.indigo:"#fff"} stroke={C.indigo} strokeWidth="1.5"/>
                ))}
              </>
            })() : (
              <text x="130" y="45" textAnchor="middle" fontSize="11" fill="#A8A29E">Complete Arena tasks to grow ELO</text>
            )}
          </svg>
          {/* Month over month comparison */}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            {[{label:"This Month",val:eloMonthDelta,col:eloMonthDelta>=0?C.green:C.red},{label:"Last Month",val:lastMonthDelta,col:lastMonthDelta>=0?C.green:C.red}].map((b,i)=>(
              <div key={i} style={{flex:1,padding:"8px 12px",background:C.cream2,borderRadius:10,textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:800,color:b.col}}>{b.val>=0?"+":""}{b.val}</div>
                <div style={{fontSize:10,color:C.ink4,fontWeight:600}}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recommended Actions ── */}
      <div style={{background:"linear-gradient(135deg,#1A1714,#1A1714)",border:`1px solid rgba(0,0,0,0.03)`,borderRadius:18,padding:"24px 28px",marginBottom:24,boxShadow:C.shadow2}}>
        <div style={{fontSize:11,fontWeight:700,color:"rgba(96,165,250,0.8)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>🚀 Next 30 Days</div>
        <h3 style={{margin:"0 0 18px",fontSize:18,fontWeight:800,color:"#fff"}}>Recommended Actions for {now.toLocaleString("en-US",{month:"long"})}</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {actions.map((action,i)=>(
            <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",padding:"14px 16px",background:"rgba(0,0,0,0.02)",border:"1px solid #E8E3DA",borderRadius:12}}>
              <div style={{width:26,height:26,borderRadius:8,background:`rgba(61,78,172,0.4)`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#93c5fd"}}>
                {i+1}
              </div>
              <div style={{fontSize:13,color:"#3D3935",lineHeight:1.6}}>{action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Market Snapshot ── */}
      <div style={{background:"#FFFFFF",border:`1px solid ${C.border}`,borderRadius:18,padding:"24px 26px",boxShadow:C.shadow}}>
        <div style={{fontSize:11,fontWeight:700,color:C.amber,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>💼 Market Intelligence</div>
        <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:800,color:C.ink}}>Top {keyword} Skills in Demand (2025-26)</h3>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
          {market.topSkills.map((s,i)=>(
            <div key={i} style={{padding:"6px 14px",background:i<2?C.indigo3:C.cream2,border:`1px solid ${i<2?"rgba(61,78,172,0.2)":C.border}`,borderRadius:99,fontSize:12,fontWeight:700,color:i<2?C.indigo:C.ink2}}>
              {i<2&&"🔥 "}{s}
            </div>
          ))}
        </div>
        <div style={{padding:"16px 18px",background:`linear-gradient(135deg,${C.amber2},#fffbeb)`,border:`1px solid rgba(184,98,10,0.15)`,borderRadius:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:6}}>💡 Your Strategic Advantage</div>
          <div style={{fontSize:13,color:C.ink2,lineHeight:1.7}}>
            The {keyword} market is growing <strong>{market.growth}</strong> YoY.
            {skillsMeetingMarket>0 ? ` You're already meeting market bar in ${skillsMeetingMarket} skill${skillsMeetingMarket>1?"s":""} — that's your hiring hook.` : " Build your Arena score now — each task closes the gap and adds recruiter-visible proof."}
            {" "}Your current ELO of <strong>{eloRating}</strong> places you in the <strong>{tier.label}</strong> tier.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EXECUTIVE AURA DASHBOARD ────────────────────────────────────────────────
// Completely different experience for Founders, CEOs, Directors, Advisors, etc.
// No ELO, no skill graph, no Arena, no portfolio. Pure executive presence dashboard.
function ExecutiveAura({ user, userData, onNavigate, onNavigatePricing }) {
  const name = user?.displayName || userData?.name || "Executive"
  const keyword = userData?.keyword || "Executive"
  const joined = userData?.createdAt ? new Date(userData.createdAt.toDate ? userData.createdAt.toDate() : userData.createdAt) : new Date()
  const joinedStr = joined.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

  const Ex = {
    dark:   "#0D0D1A",
    dark2:  "#161628",
    dark3:  "#1E1E35",
    dark4:  "#252540",
    gold:   "#C9A84C",
    gold2:  "#E8C96A",
    gold3:  "#F5EDD0",
    cream:  "#F8F6F0",
    ink:    "#1A1A2E",
    ink2:   "#2C2C4A",
    ink3:   "#5A5A7A",
    ink4:   "#8A8AAA",
    border: "rgba(201,168,76,0.15)",
    card:   "#FFFFFF",
    shadow: "0 2px 16px rgba(13,13,26,0.08), 0 1px 4px rgba(13,13,26,0.04)",
    shadow2:"0 8px 40px rgba(13,13,26,0.12), 0 2px 10px rgba(13,13,26,0.06)",
  }

  // ── Local state (mirrors Firestore, updates optimistically) ──────────────────
  const [localPhotoURL, setLocalPhotoURL]           = useState(userData?.profilePhotoURL || null)
  const [photoUploading, setPhotoUploading]         = useState(false)
  const [localLinkedin, setLocalLinkedin]           = useState(userData?.personalInfo?.linkedinUrl || userData?.linkedinUrl || "")
  const [localWebsite, setLocalWebsite]             = useState(userData?.personalInfo?.portfolioUrl || userData?.websiteUrl || "")
  const [localExps, setLocalExps]                   = useState(userData?.experiences || [])
  const [localVault, setLocalVault]                 = useState(userData?.vaultFiles || [])

  // Modals
  const [showLinkedInModal, setShowLinkedInModal]   = useState(false)
  const [showWebsiteModal, setShowWebsiteModal]     = useState(false)
  const [showRoleModal, setShowRoleModal]           = useState(false)
  const [linkedInInput, setLinkedInInput]           = useState(userData?.personalInfo?.linkedinUrl || userData?.linkedinUrl || "")
  const [websiteInput, setWebsiteInput]             = useState(userData?.personalInfo?.portfolioUrl || userData?.websiteUrl || "")
  const [roleForm, setRoleForm]                     = useState({ title:"", company:"", startYear:"", endYear:"", description:"" })
  const [vaultUploading, setVaultUploading]         = useState(false)
  const [savingLinkedIn, setSavingLinkedIn]         = useState(false)
  const [savingWebsite, setSavingWebsite]           = useState(false)
  const [savingRole, setSavingRole]                 = useState(false)
  const [editExpIdx, setEditExpIdx]                 = useState(null)

  const photoInputRef = useRef(null)
  const bioInputRef   = useRef(null)

  // ── Supabase save helper ──────────────────────────────────────────────────────
  const saveFS = async (updates) => {
    const uid = user?.id || user?.uid
    if (!uid) return
    try { await userDoc.update(uid, updates) } catch(e) { console.error(e) }
  }

  // ── Photo upload ─────────────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5 MB. Please use a smaller image and try again."); return }
    setPhotoUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const b64 = ev.target.result
      setLocalPhotoURL(b64)
      await saveFS({ profilePhotoURL: b64 })
      setPhotoUploading(false)
    }
    reader.onerror = () => setPhotoUploading(false)
    reader.readAsDataURL(file)
    if (e.target) e.target.value = ""
  }

  // ── LinkedIn save ────────────────────────────────────────────────────────────
  const saveLinkedIn = async () => {
    const url = linkedInInput.trim()
    setSavingLinkedIn(true)
    setLocalLinkedin(url)
    await saveFS({ "personalInfo.linkedinUrl": url, linkedinUrl: url })
    setSavingLinkedIn(false)
    setShowLinkedInModal(false)
  }

  // ── Website save ─────────────────────────────────────────────────────────────
  const saveWebsite = async () => {
    const url = websiteInput.trim()
    setSavingWebsite(true)
    setLocalWebsite(url)
    await saveFS({ "personalInfo.portfolioUrl": url, websiteUrl: url })
    setSavingWebsite(false)
    setShowWebsiteModal(false)
  }

  // ── Add / Edit Role ──────────────────────────────────────────────────────────
  const saveRole = async () => {
    if (!roleForm.title || !roleForm.company) return
    setSavingRole(true)
    let updated
    if (editExpIdx !== null) {
      updated = localExps.map((e, i) => i === editExpIdx ? { ...e, ...roleForm } : e)
    } else {
      updated = [...localExps, { ...roleForm, id: Date.now().toString() }]
    }
    setLocalExps(updated)
    await saveFS({ experiences: updated })
    setSavingRole(false)
    setShowRoleModal(false)
    setRoleForm({ title:"", company:"", startYear:"", endYear:"", description:"" })
    setEditExpIdx(null)
  }

  const openEditRole = (i) => {
    setEditExpIdx(i)
    setRoleForm({ title: localExps[i].title||localExps[i].role||"", company: localExps[i].company||"", startYear: localExps[i].startYear||"", endYear: localExps[i].endYear||"", description: localExps[i].description||"" })
    setShowRoleModal(true)
  }

  const deleteRole = async (i) => {
    const updated = localExps.filter((_, idx) => idx !== i)
    setLocalExps(updated)
    await saveFS({ experiences: updated })
  }

  // ── Vault / Bio upload ───────────────────────────────────────────────────────
  const handleBioUpload = (e) => {
    const file = e.target.files[0]; if (!file) return
    setVaultUploading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const nf = { id: Date.now().toString(), name: file.name, url: ev.target.result, type: file.type, category: "Bio", size: (file.size/1024).toFixed(0)+" KB", uploadedAt: new Date().toISOString() }
      const updated = [...localVault, nf]
      setLocalVault(updated)
      await saveFS({ vaultFiles: updated })
      setVaultUploading(false)
    }
    reader.onerror = () => setVaultUploading(false)
    reader.readAsDataURL(file)
    if (e.target) e.target.value = ""
  }

  const deleteVaultFile = async (i) => {
    const updated = localVault.filter((_, idx) => idx !== i)
    setLocalVault(updated)
    await saveFS({ vaultFiles: updated })
  }

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const speakingEngagements = (userData?.speakingEngagements || []).length

  const influenceScore = Math.min(100, Math.round(
    (userData?.onboardingComplete ? 20 : 0) +
    (localExps.length >= 2 ? 25 : localExps.length * 10) +
    (localVault.length >= 1 ? 15 : 0) +
    (localLinkedin ? 20 : 0) +
    (localWebsite ? 10 : 0) +
    (speakingEngagements > 0 ? 10 : 0)
  ))
  const visibilityScore = Math.min(100, influenceScore + (localLinkedin ? 15 : 0) + (localWebsite ? 10 : 0))

  const metrics = [
    { label: "Influence Score", value: influenceScore, suffix: "/100", icon: "◈", color: Ex.gold, desc: "Profile completeness & network presence" },
    { label: "Experience", value: localExps.length, suffix: " roles", icon: "🏛", color: "#3D6CB5", desc: "Verified career milestones" },
    { label: "Documents", value: localVault.length, suffix: " files", icon: "◫", color: "#4A7C59", desc: "Vault documents & credentials" },
    { label: "Visibility", value: visibilityScore, suffix: "%", icon: "◉", color: "#8B5CF6", desc: "Market presence index" },
  ]

  const actions = [
    { id:"linkedin", icon: "🔗", label: "Complete LinkedIn Profile", desc: "Add your LinkedIn to boost visibility score by +20", cta: "Connect", done: !!localLinkedin, color: "#0A66C2", onClick: () => { setLinkedInInput(localLinkedin); setShowLinkedInModal(true) } },
    { id:"website",  icon: "🌐", label: "Add Personal Website / Portfolio", desc: "Your personal URL surfaces you in 3× more searches", cta: "Add URL", done: !!localWebsite, color: Ex.gold, onClick: () => { setWebsiteInput(localWebsite); setShowWebsiteModal(true) } },
    { id:"role",     icon: "🏛", label: "Add Career Experience", desc: "Verified roles build recruiter and board trust", cta: "Add Role", done: localExps.length >= 1, color: "#3D6CB5", onClick: () => { setEditExpIdx(null); setRoleForm({ title:"",company:"",startYear:"",endYear:"",description:"" }); setShowRoleModal(true) } },
    { id:"bio",      icon: "📄", label: "Upload Executive Bio", desc: "A polished bio is required for speaking & board opportunities", cta: vaultUploading ? "Uploading…" : "Upload", done: localVault.some(f => f.name?.toLowerCase().includes("bio") || f.category === "Bio"), color: "#4A7C59", onClick: () => bioInputRef.current?.click() },
  ]

  const pendingActions = actions.filter(a => !a.done)
  const completedActions = actions.filter(a => a.done)

  const execTitles = ["Founder","Co-Founder","CEO","Director","VP","CTO","CMO","CFO","COO","Managing Director","Board Member","Advisor","Mentor","Speaker","Partner","President","Chairman"]
  const execLabel = execTitles.find(t => keyword.toLowerCase().includes(t.toLowerCase())) || "Executive"

  const initial = name.charAt(0).toUpperCase()

  // ── Modal helper style ───────────────────────────────────────────────────────
  const modalOverlay = { position:"fixed",inset:0,background:"rgba(13,13,26,0.6)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }
  const modalBox     = { background:"#FFFFFF",borderRadius:20,padding:"28px 28px 24px",width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(13,13,26,0.25)" }
  const inputStyle   = { width:"100%",padding:"10px 14px",border:`1.5px solid rgba(13,13,26,0.15)`,borderRadius:10,fontSize:14,color:Ex.ink,background:"#fafafa",outline:"none",fontFamily:"inherit",marginTop:6,boxSizing:"border-box" }
  const labelStyle   = { fontSize:12,fontWeight:700,color:Ex.ink3,display:"block" }
  const btnGold      = { padding:"10px 20px",background:`linear-gradient(135deg,${Ex.gold},${Ex.gold2})`,border:"none",borderRadius:10,color:Ex.dark,fontSize:13,fontWeight:800,cursor:"pointer",width:"100%" }
  const btnGhost     = { padding:"10px 20px",background:"transparent",border:`1px solid rgba(13,13,26,0.12)`,borderRadius:10,color:Ex.ink3,fontSize:13,fontWeight:600,cursor:"pointer",width:"100%" }

  return (
    <div style={{ background: Ex.cream, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "'DM Sans', sans-serif", color: Ex.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .exec-card{transition:transform 0.2s,box-shadow 0.2s}
        .exec-card:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(13,13,26,0.12),0 3px 12px rgba(13,13,26,0.06)!important}
        .ex-input:focus{border-color:#C9A84C!important;box-shadow:0 0 0 3px rgba(201,168,76,0.12)}
      `}</style>

      {/* ── LinkedIn Modal ── */}
      {showLinkedInModal && (
        <div style={modalOverlay} onClick={e => e.target===e.currentTarget&&setShowLinkedInModal(false)}>
          <div style={modalBox}>
            <div style={{ fontFamily:"'DM Sans',serif", fontSize:20, fontWeight:800, color:Ex.ink, marginBottom:4 }}>LinkedIn Profile</div>
            <div style={{ fontSize:13, color:Ex.ink3, marginBottom:20 }}>Paste your LinkedIn URL to verify your professional presence.</div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input className="ex-input" style={inputStyle} value={linkedInInput} onChange={e=>setLinkedInInput(e.target.value)}
              placeholder="https://linkedin.com/in/your-profile" autoFocus/>
            <div style={{ display:"flex",gap:10,marginTop:20 }}>
              <button style={btnGhost} onClick={()=>setShowLinkedInModal(false)}>Cancel</button>
              <button style={btnGold} disabled={savingLinkedIn} onClick={saveLinkedIn}>
                {savingLinkedIn ? "Saving…" : "🔗 Save LinkedIn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Website Modal ── */}
      {showWebsiteModal && (
        <div style={modalOverlay} onClick={e => e.target===e.currentTarget&&setShowWebsiteModal(false)}>
          <div style={modalBox}>
            <div style={{ fontFamily:"'DM Sans',serif", fontSize:20, fontWeight:800, color:Ex.ink, marginBottom:4 }}>Personal Website</div>
            <div style={{ fontSize:13, color:Ex.ink3, marginBottom:20 }}>Your personal URL or portfolio surfaces you in 3× more searches.</div>
            <label style={labelStyle}>Website URL</label>
            <input className="ex-input" style={inputStyle} value={websiteInput} onChange={e=>setWebsiteInput(e.target.value)}
              placeholder="https://yourname.com" autoFocus/>
            <div style={{ display:"flex",gap:10,marginTop:20 }}>
              <button style={btnGhost} onClick={()=>setShowWebsiteModal(false)}>Cancel</button>
              <button style={btnGold} disabled={savingWebsite} onClick={saveWebsite}>
                {savingWebsite ? "Saving…" : "🌐 Save Website"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Role Modal ── */}
      {showRoleModal && (
        <div style={modalOverlay} onClick={e => e.target===e.currentTarget&&setShowRoleModal(false)}>
          <div style={{ ...modalBox, maxWidth: 520 }}>
            <div style={{ fontFamily:"'DM Sans',serif", fontSize:20, fontWeight:800, color:Ex.ink, marginBottom:4 }}>
              {editExpIdx !== null ? "Edit Role" : "Add Career Experience"}
            </div>
            <div style={{ fontSize:13, color:Ex.ink3, marginBottom:20 }}>Verified roles build recruiter and board trust.</div>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={labelStyle}>Job Title *</label>
                  <input className="ex-input" style={inputStyle} value={roleForm.title} onChange={e=>setRoleForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Co-Founder & CEO" autoFocus/>
                </div>
                <div>
                  <label style={labelStyle}>Company / Organisation *</label>
                  <input className="ex-input" style={inputStyle} value={roleForm.company} onChange={e=>setRoleForm(p=>({...p,company:e.target.value}))} placeholder="e.g. TechVentures Pvt Ltd"/>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div>
                  <label style={labelStyle}>Start Year</label>
                  <input className="ex-input" style={inputStyle} value={roleForm.startYear} onChange={e=>setRoleForm(p=>({...p,startYear:e.target.value}))} placeholder="e.g. 2018" type="number" min="1970" max="2030"/>
                </div>
                <div>
                  <label style={labelStyle}>End Year (blank = Present)</label>
                  <input className="ex-input" style={inputStyle} value={roleForm.endYear} onChange={e=>setRoleForm(p=>({...p,endYear:e.target.value}))} placeholder="e.g. 2022 or leave blank" type="number" min="1970" max="2030"/>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description (optional)</label>
                <textarea className="ex-input" style={{ ...inputStyle, minHeight:80, resize:"vertical" }} value={roleForm.description} onChange={e=>setRoleForm(p=>({...p,description:e.target.value}))} placeholder="Key responsibilities, achievements, or context…"/>
              </div>
            </div>
            <div style={{ display:"flex",gap:10,marginTop:20 }}>
              <button style={btnGhost} onClick={()=>{ setShowRoleModal(false); setEditExpIdx(null) }}>Cancel</button>
              <button style={{ ...btnGold, opacity: (!roleForm.title||!roleForm.company)?0.5:1 }} disabled={savingRole||!roleForm.title||!roleForm.company} onClick={saveRole}>
                {savingRole ? "Saving…" : editExpIdx !== null ? "Update Role" : "🏛 Add Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={photoInputRef} type="file" style={{ display:"none" }} onChange={handlePhotoUpload} accept="image/*"/>
      <input ref={bioInputRef}   type="file" style={{ display:"none" }} onChange={handleBioUpload} accept=".pdf,.doc,.docx,.txt"/>

      <div style={{ maxWidth: 1800, margin: "0 auto", padding: "80px 40px 80px" }}>

        {/* ── Hero Header ── */}
        <div style={{ background: `linear-gradient(135deg, ${Ex.dark} 0%, ${Ex.dark2} 50%, #1a1a35 100%)`, borderRadius: 20, padding: "40px 40px 36px", marginBottom: 28, position: "relative", overflow: "hidden", animation: "fadeUp 0.3s ease both", boxShadow: "0 20px 60px rgba(13,13,26,0.22)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${Ex.gold}, transparent)` }}/>
          <div style={{ position: "absolute", right: -60, top: -60, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${Ex.gold}08 0%, transparent 70%)`, pointerEvents: "none" }}/>
          <div style={{ position: "absolute", right: 40, bottom: -40, width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)`, pointerEvents: "none" }}/>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, position: "relative", zIndex: 1 }}>
            {/* Clickable Avatar */}
            <div
              onClick={() => !photoUploading && photoInputRef.current?.click()}
              title="Click to change profile photo"
              style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg, ${Ex.gold}33, ${Ex.gold}11)`, border: `2px solid ${Ex.gold}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", position: "relative", overflow: "hidden" }}>
              {photoUploading ? (
                <div style={{ width:24,height:24,border:`3px solid ${Ex.gold}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
              ) : (localPhotoURL || userData?.profilePhotoURL) ? (
                <img src={localPhotoURL || userData.profilePhotoURL} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
              ) : (
                <span style={{ fontFamily:"'DM Sans',serif", fontSize:28, fontWeight:800, color:Ex.gold }}>{initial}</span>
              )}
              {/* Camera overlay on hover */}
              <div style={{ position:"absolute",bottom:0,left:0,right:0,height:28,background:"rgba(13,13,26,0.65)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#1A1714",fontWeight:600,transition:"opacity 0.2s" }}>
                📷
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 800, color: "#F5F0EB", letterSpacing: "-0.3px" }}>{name}</h1>
                <span style={{ padding: "3px 12px", background: `${Ex.gold}22`, border: `1px solid ${Ex.gold}44`, borderRadius: 100, fontSize: 11, fontWeight: 700, color: Ex.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>{execLabel}</span>
              </div>
              <div style={{ fontSize: 14, color: "rgba(245,240,235,0.6)", marginBottom: 10, fontWeight: 500 }}>{keyword}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 10px", background: "rgba(0,0,0,0.03)", borderRadius: 100, fontSize: 11, color: "rgba(245,240,235,0.55)", fontWeight: 500 }}>◈ Capabilio Executive</span>
                <span style={{ padding: "3px 10px", background: "rgba(0,0,0,0.03)", borderRadius: 100, fontSize: 11, color: "rgba(245,240,235,0.55)", fontWeight: 500 }}>Joined {joinedStr}</span>
                {localLinkedin && <a href={localLinkedin} target="_blank" rel="noreferrer" style={{ padding: "3px 10px", background: "rgba(10,102,194,0.2)", border: "1px solid rgba(10,102,194,0.35)", borderRadius: 100, fontSize: 11, color: "#6BA3DC", fontWeight: 600, textDecoration: "none" }}>🔗 LinkedIn</a>}
                {localWebsite && <a href={localWebsite} target="_blank" rel="noreferrer" style={{ padding: "3px 10px", background: `${Ex.gold}18`, border: `1px solid ${Ex.gold}35`, borderRadius: 100, fontSize: 11, color: Ex.gold2, fontWeight: 600, textDecoration: "none" }}>🌐 Website</a>}
              </div>
              <div style={{ marginTop: 12, display:"flex", gap:8, flexWrap:"wrap" }}>
                <button onClick={()=>{ setLinkedInInput(localLinkedin); setShowLinkedInModal(true) }} style={{ padding:"5px 12px",background:"rgba(10,102,194,0.15)",border:"1px solid rgba(10,102,194,0.3)",borderRadius:8,color:"#6BA3DC",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                  {localLinkedin ? "✏️ Edit LinkedIn" : "+ Add LinkedIn"}
                </button>
                <button onClick={()=>{ setWebsiteInput(localWebsite); setShowWebsiteModal(true) }} style={{ padding:"5px 12px",background:`${Ex.gold}15`,border:`1px solid ${Ex.gold}30`,borderRadius:8,color:Ex.gold2,fontSize:11,fontWeight:700,cursor:"pointer" }}>
                  {localWebsite ? "✏️ Edit Website" : "+ Add Website"}
                </button>
                <button onClick={()=>photoInputRef.current?.click()} style={{ padding:"5px 12px",background:"rgba(0,0,0,0.05)",border:"1px solid rgba(0,0,0,0.08)",borderRadius:8,color:"rgba(245,240,235,0.7)",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                  📷 Change Photo
                </button>
              </div>
            </div>

            {/* Influence score */}
            <div style={{ flexShrink: 0, textAlign: "center", background: "rgba(0,0,0,0.02)", border: `1px solid ${Ex.gold}22`, borderRadius: 14, padding: "14px 20px" }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 36, fontWeight: 800, color: Ex.gold, lineHeight: 1 }}>{influenceScore}</div>
              <div style={{ fontSize: 10, color: "rgba(245,240,235,0.45)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>Influence</div>
              <div style={{ height: 3, width: 60, background: `rgba(201,168,76,0.15)`, borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${influenceScore}%`, background: `linear-gradient(90deg, ${Ex.gold}, ${Ex.gold2})`, borderRadius: 99 }}/>
              </div>
            </div>
          </div>
        </div>

        {/* ── Metrics row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28, animation: "fadeUp 0.35s 0.05s ease both", opacity: 0, animationFillMode: "forwards" }}>
          {metrics.map((m, i) => (
            <div key={i} className="exec-card" style={{ background: Ex.card, border: `1px solid rgba(13,13,26,0.08)`, borderRadius: 14, padding: "18px 20px", boxShadow: Ex.shadow }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }}/>
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 800, color: Ex.ink, lineHeight: 1 }}>{m.value}<span style={{ fontSize: 14, fontWeight: 500, color: Ex.ink3 }}>{m.suffix}</span></div>
              <div style={{ fontSize: 12, fontWeight: 700, color: Ex.ink2, marginTop: 4 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: Ex.ink4, marginTop: 3, lineHeight: 1.4 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Main body: 2 columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, animation: "fadeUp 0.4s 0.1s ease both", opacity: 0, animationFillMode: "forwards" }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Profile completion actions */}
            {pendingActions.length > 0 && (
              <div style={{ background: Ex.card, border: `1px solid ${Ex.gold}22`, borderRadius: 16, padding: "20px 24px", boxShadow: Ex.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: Ex.gold }}/>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: Ex.ink3, textTransform: "uppercase" }}>Complete Your Executive Profile</span>
                  <span style={{ marginLeft:"auto", fontSize:11, color:Ex.ink4 }}>{completedActions.length}/{actions.length} done</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingActions.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: `${a.color}07`, border: `1px solid ${a.color}18`, borderRadius: 11 }}>
                      <span style={{ fontSize: 20 }}>{a.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: Ex.ink }}>{a.label}</div>
                        <div style={{ fontSize: 11, color: Ex.ink3, marginTop: 2 }}>{a.desc}</div>
                      </div>
                      <button onClick={a.onClick} style={{ padding: "6px 14px", background: a.color, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>{a.cta}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Career Timeline */}
            <div style={{ background: Ex.card, border: `1px solid rgba(13,13,26,0.08)`, borderRadius: 16, padding: "20px 24px", boxShadow: Ex.shadow }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3D6CB5" }}/>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: Ex.ink3, textTransform: "uppercase" }}>Career Timeline</span>
                </div>
                <button onClick={() => { setEditExpIdx(null); setRoleForm({title:"",company:"",startYear:"",endYear:"",description:""}); setShowRoleModal(true) }}
                  style={{ padding:"5px 12px",background:"rgba(61,108,181,0.1)",border:"1px solid rgba(61,108,181,0.2)",borderRadius:8,color:"#3D6CB5",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                  + Add Role
                </button>
              </div>
              {localExps.length === 0 ? (
                <div style={{ padding: "28px 20px", textAlign: "center", background: "rgba(13,13,26,0.02)", borderRadius: 10, border: `1px dashed rgba(13,13,26,0.1)` }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🏛</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: Ex.ink2 }}>No experience added yet</div>
                  <div style={{ fontSize: 12, color: Ex.ink4, marginTop: 4 }}>Add your roles to build recruiter and board trust</div>
                  <button onClick={() => { setEditExpIdx(null); setRoleForm({title:"",company:"",startYear:"",endYear:"",description:""}); setShowRoleModal(true) }}
                    style={{ marginTop:14, padding:"8px 20px", background:"#3D6CB5", border:"none", borderRadius:9, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    Add First Role
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {localExps.map((exp, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, padding: "12px 14px", background: "rgba(61,108,181,0.04)", borderRadius: 10, border: "1px solid rgba(61,108,181,0.1)" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(61,108,181,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏛</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: Ex.ink }}>{exp.title || exp.role}</div>
                        <div style={{ fontSize: 12, color: Ex.ink3, marginTop: 2 }}>{exp.company} {exp.startYear ? `· ${exp.startYear}–${exp.endYear || "Present"}` : ""}</div>
                        {exp.description && <div style={{ fontSize: 11, color: Ex.ink4, marginTop: 4, lineHeight: 1.5 }}>{exp.description.slice(0, 100)}{exp.description.length > 100 ? "…" : ""}</div>}
                      </div>
                      <div style={{ display:"flex",gap:4,flexShrink:0 }}>
                        <button onClick={() => openEditRole(i)} style={{ width:28,height:28,borderRadius:7,border:`1px solid rgba(61,108,181,0.2)`,background:"transparent",color:"#3D6CB5",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} title="Edit">✏️</button>
                        <button onClick={() => deleteRole(i)} style={{ width:28,height:28,borderRadius:7,border:"1px solid rgba(200,50,50,0.2)",background:"transparent",color:"#C83232",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} title="Delete">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Executive Vault */}
            <div style={{ background: Ex.card, border: `1px solid rgba(13,13,26,0.08)`, borderRadius: 16, padding: "20px 24px", boxShadow: Ex.shadow }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4A7C59" }}/>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: Ex.ink3, textTransform: "uppercase" }}>Executive Vault</span>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <span style={{ fontSize: 11, color: Ex.ink4 }}>{localVault.length} file{localVault.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => bioInputRef.current?.click()} disabled={vaultUploading}
                    style={{ padding:"4px 10px",background:"rgba(74,124,89,0.1)",border:"1px solid rgba(74,124,89,0.2)",borderRadius:7,color:"#4A7C59",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                    {vaultUploading ? "Uploading…" : "+ Upload"}
                  </button>
                </div>
              </div>
              {localVault.length === 0 ? (
                <div style={{ padding: "28px 20px", textAlign: "center", background: "rgba(13,13,26,0.02)", borderRadius: 10, border: `1px dashed rgba(13,13,26,0.1)` }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
                  <div style={{ fontSize: 12, color: Ex.ink4, marginBottom:12 }}>Upload your executive bio, board deck, or media kit</div>
                  <button onClick={() => bioInputRef.current?.click()} style={{ padding:"8px 20px",background:"#4A7C59",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                    Upload First Document
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {localVault.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(74,124,89,0.05)", borderRadius: 9, border: "1px solid rgba(74,124,89,0.12)" }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: Ex.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name || f.fileName}</div>
                        <div style={{ fontSize: 10, color: Ex.ink4 }}>{f.category || "Document"} · {f.size || ""}</div>
                      </div>
                      {f.url && <a href={f.url} download={f.name} style={{ fontSize:11,color:"#4A7C59",fontWeight:600,textDecoration:"none",padding:"3px 8px",background:"rgba(74,124,89,0.1)",borderRadius:6,flexShrink:0 }}>⬇️</a>}
                      <button onClick={() => deleteVaultFile(i)} style={{ width:24,height:24,borderRadius:6,border:"1px solid rgba(200,50,50,0.2)",background:"transparent",color:"#C83232",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Completed actions */}
            {completedActions.length > 0 && (
              <div style={{ background: Ex.card, border: `1px solid rgba(74,124,89,0.15)`, borderRadius: 14, padding: "16px 18px", boxShadow: Ex.shadow }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#4A7C59", textTransform: "uppercase", marginBottom: 10 }}>✓ Profile Milestones</div>
                {completedActions.map((a, i) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < completedActions.length - 1 ? "1px solid rgba(13,13,26,0.05)" : "none" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(74,124,89,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#4A7C59", flexShrink: 0 }}>✓</div>
                    <span style={{ fontSize: 12, color: Ex.ink2, flex:1 }}>{a.label}</span>
                    <button onClick={a.onClick} style={{ fontSize:10,color:Ex.ink4,background:"transparent",border:"none",cursor:"pointer",padding:"2px 6px" }}>Edit</button>
                  </div>
                ))}
              </div>
            )}

            {/* Intel Hub promo */}
            <div style={{ background: `linear-gradient(135deg, ${Ex.dark} 0%, ${Ex.dark3} 100%)`, borderRadius: 16, padding: "20px 20px", boxShadow: "0 8px 32px rgba(13,13,26,0.18)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: `linear-gradient(90deg, transparent, ${Ex.gold}60, transparent)` }}/>
              <div style={{ fontSize: 22, marginBottom: 8 }}>◈</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 800, color: "#F5F0EB", marginBottom: 6 }}>Intel Hub</div>
              <div style={{ fontSize: 12, color: "rgba(245,240,235,0.55)", lineHeight: 1.6, marginBottom: 14 }}>AI-curated industry intelligence, deal flow, board opportunities, and thought leadership tools — built for executives.</div>
              <button onClick={() => onNavigate?.("launchpad")} style={{ padding: "9px 18px", background: `linear-gradient(135deg, ${Ex.gold}, ${Ex.gold2})`, border: "none", borderRadius: 9, color: Ex.dark, fontSize: 12, fontWeight: 800, cursor: "pointer", width: "100%" }}>Open Intel Hub →</button>
            </div>

            {/* Executive presence tips */}
            <div style={{ background: Ex.card, border: `1px solid rgba(13,13,26,0.08)`, borderRadius: 14, padding: "16px 18px", boxShadow: Ex.shadow }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: Ex.ink3, textTransform: "uppercase", marginBottom: 12 }}>Executive Presence Tips</div>
              {[
                { icon: "📝", tip: "Post one thought leadership piece per week — consistency compounds visibility." },
                { icon: "🔗", tip: "Optimize your LinkedIn headline. It's the first signal board committees see." },
                { icon: "🎤", tip: "Accept 2–3 speaking invitations per quarter to stay top of mind in your domain." },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(13,13,26,0.05)" : "none" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, color: Ex.ink2, lineHeight: 1.6 }}>{item.tip}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MISSION TICKER ──────────────────────────────────────────────────────────
// Scrolling bar in the Aura dashboard showing today's Arena mission.
// Hides once the user completes a task today; reappears the next day with a new mission.
function MissionTicker({ userData, keyword, onNavigate }) {
  const todayStr = new Date().toISOString().slice(0, 10)

  // Detect if user already completed a mission today
  const lastActive    = userData?.arenaLastActive || userData?.arena_last_active || ""
  const doneToday     = lastActive.slice(0, 10) === todayStr

  // Pick today's mission deterministically (day-of-year rotates through challenges)
  const challenges    = getDomainChallenges(keyword)
  const dayOfYear     = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const todayMission  = challenges.length > 0 ? challenges[dayOfYear % challenges.length] : null

  if (doneToday || !todayMission) return null

  const diffColor = { easy: "#10B981", medium: "#F59E0B", hard: "#EF4444", expert: "#8B5CF6" }
  const dc = diffColor[(todayMission.difficulty || "medium").toLowerCase()] || "#F59E0B"

  const tickerText = `🎯  Today's Mission  ·  ${todayMission.title}  ·  ${(todayMission.difficulty||"Medium").toUpperCase()}  ·  +${todayMission.eloGain||20} ELO  ·  ${todayMission.tools?.[0]||""}  ·  ⏱ ${todayMission.timeLimit||"30 min"}  ·  Go to Arena →          `
  // Repeat text so the scroll feels seamless
  const repeated = tickerText.repeat(4)

  return (
    <div
      onClick={() => onNavigate && onNavigate("arenaCollegeStream")}
      style={{
        marginBottom: 16,
        borderRadius: 12,
        border: `1.5px solid ${dc}35`,
        background: `linear-gradient(90deg, ${dc}10 0%, ${dc}06 100%)`,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      `}</style>
      {/* Left fade */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:40, background:`linear-gradient(90deg, ${dc}15, transparent)`, zIndex:1, pointerEvents:"none" }} />
      {/* Right fade */}
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:40, background:`linear-gradient(270deg, ${dc}15, transparent)`, zIndex:1, pointerEvents:"none" }} />

      <div style={{
        display: "flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        padding: "10px 0",
        animation: "ticker 28s linear infinite",
        willChange: "transform",
      }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 12,
          fontWeight: 600,
          color: dc,
          letterSpacing: "0.03em",
          paddingRight: 0,
        }}>
          {repeated}
        </span>
      </div>
    </div>
  )
}

// ─── Student Profile Link Form ────────────────────────────────────────────────
function ProfileLinksForm({ userData, save, setUserData }) {
  const [linkedin, setLinkedin] = useState(userData?.linkedInUrl||userData?.personalInfo?.linkedinUrl||"")
  const [github,   setGithub]   = useState(userData?.githubUrl||userData?.personalInfo?.githubUrl||"")
  const [portfolio, setPortfolio] = useState(userData?.portfolioUrl||userData?.personalInfo?.portfolioUrl||"")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // BUG FIX (2026-08-04): this used to also send "personalInfo.linkedinUrl"-style
    // dotted-string keys, which are not valid Postgres column names — db.js's
    // toSnake() has no dot-path handling, so those keys passed through literally
    // and (per db.js's own documented "unknown column kills the ENTIRE update"
    // behavior) likely made every save from this form fail outright. githubUrl/
    // linkedInUrl/portfolioUrl are now properly mapped in db.js's CAMEL_TO_SNAKE,
    // so the flat keys alone are sufficient — Aura's Code DNA tab and
    // fetchGithubFingerprint both already read the flat githubUrl, not the
    // personalInfo.* nested path.
    const updates = {
      linkedInUrl: linkedin.trim(),
      githubUrl:   github.trim(),
      portfolioUrl: portfolio.trim(),
    }
    await save(updates)
    if (setUserData) setUserData(p => ({...p,...updates}))
    setSaving(false)
  }

  const inp = { width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:9,
    background:"#FAF7F2", color:T.ink, fontSize:13, outline:"none", boxSizing:"border-box" }
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {[
        {label:"LinkedIn URL", icon:"🔗", val:linkedin, set:setLinkedin, ph:"https://linkedin.com/in/username"},
        {label:"GitHub URL",   icon:"⌥", val:github,   set:setGithub,   ph:"https://github.com/username"},
        {label:"Portfolio / Website", icon:"🌐", val:portfolio, set:setPortfolio, ph:"https://yoursite.com"},
      ].map(({label,icon,val,set,ph})=>(
        <div key={label}>
          <div style={{fontSize:11,fontWeight:700,color:T.ink3,marginBottom:5}}>{icon} {label}</div>
          <input style={inp} value={val} onChange={e=>set(e.target.value)} placeholder={ph}/>
        </div>
      ))}
      <button onClick={handleSave} disabled={saving}
        style={{alignSelf:"flex-start",padding:"8px 20px",background:T.brand||"#FF5701",color:"#fff",border:"none",
          borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",opacity:saving?0.6:1}}>
        {saving?"Saving…":"Save Links"}
      </button>
    </div>
  )
}

// ─── Student Projects Panel ───────────────────────────────────────────────────
function StudentProjectsPanel({ projects, onSave }) {
  const [items, setItems] = useState(projects||[])
  const [editing, setEditing] = useState(null) // null | index | "new"
  const [form, setForm] = useState({})

  useEffect(()=>setItems(projects||[]),[projects])

  const openNew = () => { setForm({ emoji:"🔧", name:"", role:"", description:"", problem:"", outcome:"", technologies:[], githubUrl:"", liveUrl:"", status:"" }); setEditing("new") }
  // 2026-08-05 bug fix: resume-extracted projects (Aura.jsx's resume parser,
  // ~line 3496) are stored with a different field naming scheme —
  // {title, techStack, url} — than this form's own fields —
  // {name, technologies, githubUrl}. openEdit used to spread the raw item
  // straight into `form`, so editing a resume-sourced project showed a
  // blank Project Name, blank Technologies, and blank GitHub URL even
  // though the data existed under the other names. Normalize on open so
  // every field the form actually binds to is populated regardless of
  // which naming scheme the item was saved with; unrecognized/extra keys
  // (_source, resumeFile, url) are preserved via the spread so save()
  // doesn't lose provenance data.
  const openEdit = i => {
    const raw = items[i]
    setForm({
      ...raw,
      name: raw.name || raw.title || "",
      technologies: Array.isArray(raw.technologies) && raw.technologies.length ? raw.technologies : (raw.techStack || []),
      githubUrl: raw.githubUrl || (raw.url && /github\.com/i.test(raw.url) ? raw.url : "") || "",
      liveUrl: raw.liveUrl || raw.demoUrl || (raw.url && !/github\.com/i.test(raw.url) ? raw.url : "") || "",
    })
    setEditing(i)
  }
  const del = async i => { const next=[...items]; next.splice(i,1); setItems(next); await onSave(next) }

  const save = async () => {
    const tech = typeof form.technologies==="string"
      ? form.technologies.split(",").map(s=>s.trim()).filter(Boolean)
      : (form.technologies||[])
    const next = editing==="new" ? [...items,{...form,technologies:tech}] : items.map((x,i)=>i===editing?{...form,technologies:tech}:x)
    setItems(next); setEditing(null); await onSave(next)
  }

  const inp = {width:"100%",padding:"8px 11px",border:`1px solid ${T.border}`,borderRadius:8,background:"#FAF7F2",color:T.ink,fontSize:13,outline:"none",boxSizing:"border-box",marginTop:4}

  return (
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <SectionLabel color={T.indigo}>📂 My Projects</SectionLabel>
        <button onClick={openNew} style={{padding:"6px 14px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Project</button>
      </div>
      <p style={{fontSize:12,color:T.ink3,margin:"0 0 14px"}}>Add your builds, hackathon projects, coursework, and side projects — they show as rich cards on your public portfolio.</p>

      {editing!==null&&(
        <div style={{background:"#FAF7F2",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"18px 16px",marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"48px 1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3,marginTop:4}}>Icon</div>
              <input style={{...inp,textAlign:"center",fontSize:20,padding:"6px 4px"}} value={form.emoji||"🔧"} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3,marginTop:4}}>Project Name *</div>
              <input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Sales Dashboard"/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3,marginTop:4}}>Your Role</div>
              <input style={inp} value={form.role||""} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="e.g. Solo / Lead / Backend"/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Description (what you built)</div>
            <textarea style={{...inp,resize:"vertical",minHeight:56}} value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Brief summary of what the project does"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Problem it solves</div>
              <textarea style={{...inp,resize:"vertical",minHeight:52}} value={form.problem||""} onChange={e=>setForm(f=>({...f,problem:e.target.value}))} placeholder="What pain point or challenge did this address?"/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Impact / Outcome</div>
              <textarea style={{...inp,resize:"vertical",minHeight:52}} value={form.outcome||""} onChange={e=>setForm(f=>({...f,outcome:e.target.value}))} placeholder="e.g. Reduced report time by 60%, 200 users"/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Technologies</div>
              <input style={inp} value={Array.isArray(form.technologies)?form.technologies.join(", "):(form.technologies||"")} onChange={e=>setForm(f=>({...f,technologies:e.target.value}))} placeholder="Python, SQL, Pandas"/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3}}>GitHub URL</div>
              <input style={inp} value={form.githubUrl||""} onChange={e=>setForm(f=>({...f,githubUrl:e.target.value}))} placeholder="https://github.com/..."/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Live / Demo URL</div>
              <input style={inp} value={form.liveUrl||""} onChange={e=>setForm(f=>({...f,liveUrl:e.target.value}))} placeholder="https://..."/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={save} style={{padding:"7px 18px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save Project</button>
            <button onClick={()=>setEditing(null)} style={{padding:"7px 14px",background:"transparent",color:T.ink3,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {items.length===0&&editing===null&&(
        <div style={{textAlign:"center",padding:"24px 16px",color:T.ink4,fontSize:13,border:`1.5px dashed ${T.border}`,borderRadius:10}}>
          No projects yet — click <strong>+ Add Project</strong> to add your first build
        </div>
      )}
      {items.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<items.length-1?`1px solid ${T.border}`:"none"}}>
          <span style={{fontSize:20}}>{p.emoji||"🔧"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{p.name||p.title||"Project"}</div>
            <div style={{fontSize:11,color:T.ink4}}>{p.role&&<span style={{marginRight:8}}>◈ {p.role}</span>}{(p.technologies?.length?p.technologies:(p.techStack||[])).slice(0,3).join(", ")}</div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>openEdit(i)} style={{padding:"4px 10px",fontSize:11,border:`1px solid ${T.border}`,borderRadius:6,background:"transparent",color:T.ink3,cursor:"pointer"}}>Edit</button>
            <button onClick={()=>del(i)} style={{padding:"4px 10px",fontSize:11,border:"none",background:"rgba(220,38,38,0.07)",color:"#DC2626",borderRadius:6,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      ))}
    </Card>
  )
}

// ─── Student Certificates Panel ───────────────────────────────────────────────
function StudentCertificatesPanel({ certs, onSave }) {
  const [items, setItems] = useState(certs||[])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [verifyingIdx, setVerifyingIdx] = useState(null)
  const [verifyMsg, setVerifyMsg] = useState({})
  const verifyFileRef = useRef(null)
  const [pendingVerifyIdx, setPendingVerifyIdx] = useState(null)

  useEffect(()=>setItems(certs||[]),[certs])

  const openNew = () => { setForm({name:"",issuer:"",date:"",credentialId:"",url:"",skills:[]}); setEditing("new") }
  const openEdit = i => { setForm({...items[i]}); setEditing(i) }
  const del = async i => { const next=[...items]; next.splice(i,1); setItems(next); await onSave(next) }
  const save = async () => {
    const skills = typeof form.skills==="string" ? form.skills.split(",").map(s=>s.trim()).filter(Boolean) : (form.skills||[])
    const next = editing==="new" ? [...items,{...form,skills}] : items.map((x,i)=>i===editing?{...form,skills}:x)
    setItems(next); setEditing(null); await onSave(next)
  }

  // Uploads the actual certificate file so the backend can check it against the
  // claimed name/issuer and — only if it genuinely matches — flip this entry to
  // "verified". The client never sets verificationStatus itself; it just reflects
  // whatever the server (which owns this decision) returns.
  const requestVerify = i => { setPendingVerifyIdx(i); verifyFileRef.current?.click() }
  const onVerifyFileChosen = async e => {
    const file = e.target.files[0]; const i = pendingVerifyIdx
    if (!file || i === null) return
    setVerifyingIdx(i); setVerifyMsg(m=>({...m,[i]:""}))
    try {
      const fd = new FormData(); fd.append("certificate", file); fd.append("certIndex", String(i))
      const res = await fetch(`${API}/api/verify/certification-file`, { method:"POST", headers:await vHeaders(), body:fd }).then(r=>r.json())
      if (res.verified && res.certifications) {
        setItems(res.certifications)
        await onSave(res.certifications)
        setVerifyMsg(m=>({...m,[i]:"✅ Verified"}))
      } else {
        setVerifyMsg(m=>({...m,[i]:`❌ ${res.reason || res.error || "Could not verify — try a clearer file."}`}))
      }
    } catch { setVerifyMsg(m=>({...m,[i]:"❌ Server error — try again."}))}
    setVerifyingIdx(null)
    if (verifyFileRef.current) verifyFileRef.current.value = ""
  }

  const inp = {width:"100%",padding:"8px 11px",border:`1px solid ${T.border}`,borderRadius:8,background:"#FAF7F2",color:T.ink,fontSize:13,outline:"none",boxSizing:"border-box",marginTop:4}

  return (
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <SectionLabel color="#D97706">🏅 Certificates & Training</SectionLabel>
        <button onClick={openNew} style={{padding:"6px 14px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Certificate</button>
      </div>
      <p style={{fontSize:12,color:T.ink3,margin:"0 0 14px"}}>Courses, certifications, and training programs you've completed.</p>

      {editing!==null&&(
        <div style={{background:"#FAF7F2",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"16px",marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Certificate Name *</div><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Google Data Analytics"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Issuing Organization</div><input style={inp} value={form.issuer||""} onChange={e=>setForm(f=>({...f,issuer:e.target.value}))} placeholder="e.g. Coursera / AWS / Google"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Issue Date</div><input style={inp} value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))} placeholder="e.g. Jan 2025"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Credential ID</div><input style={inp} value={form.credentialId||""} onChange={e=>setForm(f=>({...f,credentialId:e.target.value}))} placeholder="Optional"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Verify URL</div><input style={inp} value={form.url||""} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://..."/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Skills Covered</div><input style={inp} value={Array.isArray(form.skills)?form.skills.join(", "):(form.skills||"")} onChange={e=>setForm(f=>({...f,skills:e.target.value}))} placeholder="SQL, Python, Tableau"/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{padding:"7px 18px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
            <button onClick={()=>setEditing(null)} style={{padding:"7px 14px",background:"transparent",color:T.ink3,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {items.length===0&&editing===null&&(
        <div style={{textAlign:"center",padding:"20px 16px",color:T.ink4,fontSize:13,border:`1.5px dashed ${T.border}`,borderRadius:10}}>
          No certificates yet — add any course or credential you've completed
        </div>
      )}
      {items.map((c,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<items.length-1?`1px solid ${T.border}`:"none"}}>
          <span style={{fontSize:20}}>🏅</span>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{c.name||c.label||"Certificate"}</div>
              <CertBadge c={c}/>
            </div>
            <div style={{fontSize:11,color:T.ink4}}>{c.issuer||c.provider}{c.date?` · ${c.date}`:""}{c.credentialId||c.certId?` · ID: ${c.credentialId||c.certId}`:""}</div>
            {verifyMsg[i]&&<div style={{fontSize:11,marginTop:3,color:verifyMsg[i].startsWith("✅")?T.green:T.red}}>{verifyMsg[i]}</div>}
          </div>
          <div style={{display:"flex",gap:6}}>
            {c.verificationStatus!=="verified"&&(
              <button onClick={()=>requestVerify(i)} disabled={verifyingIdx===i}
                style={{padding:"4px 10px",fontSize:11,border:`1px solid ${T.green}40`,borderRadius:6,background:T.green2,color:T.green,cursor:verifyingIdx===i?"not-allowed":"pointer",fontWeight:600}}>
                {verifyingIdx===i?"Checking…":"⬆ Verify"}
              </button>
            )}
            <button onClick={()=>openEdit(i)} style={{padding:"4px 10px",fontSize:11,border:`1px solid ${T.border}`,borderRadius:6,background:"transparent",color:T.ink3,cursor:"pointer"}}>Edit</button>
            <button onClick={()=>del(i)} style={{padding:"4px 10px",fontSize:11,border:"none",background:"rgba(220,38,38,0.07)",color:"#DC2626",borderRadius:6,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      ))}
      <input ref={verifyFileRef} type="file" accept=".pdf,image/*" onChange={onVerifyFileChosen} style={{display:"none"}}/>
    </Card>
  )
}

// ─── Certificate verification badge — same visual language as CareerTimeline ──
function CertBadge({ c }) {
  const isVerified = c.verificationStatus === "verified"
  return isVerified
    ? <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 9px", borderRadius:100, background:T.green2, color:T.green, fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>✓ VERIFIED{c.verificationSource?` · ${c.verificationSource}`:""}</span>
    : <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 9px", borderRadius:100, background:T.amber2, color:T.amber, fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textTransform:"uppercase" }}>SELF-CLAIMED{c.verificationSource?` · ${c.verificationSource}`:(c._source==="resume"?" · Resume":"")}</span>
}

// ─── Education Panel ───────────────────────────────────────────────────────────
// Redesigned 2026-08-03 as a genuine vertical timeline (matching the visual
// grammar CareerTimeline already established — gradient node + connecting
// line + shadowed card — but in an emerald palette so Education and Career
// stay visually distinct from each other, not a copy). The entry tagged
// _source==="profile" is the one SettingsPanel.jsx's ProfileSection keeps in
// sync with profiles.college whenever the student edits their college name
// there — shown with a distinct "🏫 Current College" pill so it reads as
// the authoritative, always-up-to-date entry rather than one more manual row.
function EducationPanel({ education, onSave }) {
  const [items, setItems] = useState(education||[])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  // 2026-08-05: mirrors StudentCertificatesPanel's verify flow exactly, now
  // pointed at /api/verify/education-file — degrees sat as permanently
  // "self-claimed" with no way to strengthen them even though the identical
  // OCR-verification mechanism already existed for certificates.
  const [verifyingIdx, setVerifyingIdx] = useState(null)
  const [verifyMsg, setVerifyMsg] = useState({})
  const verifyFileRef = useRef(null)
  const [pendingVerifyIdx, setPendingVerifyIdx] = useState(null)

  useEffect(()=>setItems(education||[]),[education])

  const openNew = () => { setForm({institution:"",degree:"",field:"",year:""}); setEditing("new") }
  const openEdit = i => { setForm({...items[i]}); setEditing(i) }
  const del = async i => { const next=[...items]; next.splice(i,1); setItems(next); await onSave(next) }
  const save = async () => {
    const entry = editing==="new" ? {...form,_source:"manual"} : {...items[editing],...form}
    const next = editing==="new" ? [...items,entry] : items.map((x,i)=>i===editing?entry:x)
    setItems(next); setEditing(null); await onSave(next)
  }

  // The client never sets verificationStatus itself — same rule as
  // certificates. It just reflects whatever the server (which owns this
  // decision) returns after a real OCR/text-match check.
  const requestVerify = i => { setPendingVerifyIdx(i); verifyFileRef.current?.click() }
  const onVerifyFileChosen = async e => {
    const file = e.target.files[0]; const i = pendingVerifyIdx
    if (!file || i === null) return
    setVerifyingIdx(i); setVerifyMsg(m=>({...m,[i]:""}))
    try {
      const fd = new FormData(); fd.append("document", file); fd.append("eduIndex", String(i))
      const res = await fetch(`${API}/api/verify/education-file`, { method:"POST", headers:await vHeaders(), body:fd }).then(r=>r.json())
      if (res.verified && res.education) {
        setItems(res.education)
        await onSave(res.education)
        setVerifyMsg(m=>({...m,[i]:"✅ Verified"}))
      } else {
        setVerifyMsg(m=>({...m,[i]:`❌ ${res.reason || res.error || "Could not verify — try a clearer file."}`}))
      }
    } catch { setVerifyMsg(m=>({...m,[i]:"❌ Server error — try again."}))}
    setVerifyingIdx(null)
    if (verifyFileRef.current) verifyFileRef.current.value = ""
  }

  const inp = {width:"100%",padding:"8px 11px",border:`1px solid ${T.border}`,borderRadius:8,background:"#FAF7F2",color:T.ink,fontSize:13,outline:"none",boxSizing:"border-box",marginTop:4}
  // Most-recent-first isn't meaningful without real dates on every entry, but
  // the profile-synced "current college" entry should always lead the
  // timeline — it's the one thing guaranteed to be live and accurate.
  const ordered = [...items].sort((a,b)=>(a?._source==="profile"?-1:0)-(b?._source==="profile"?-1:0))

  return (
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <SectionLabel color="#1A7A4A">🎓 Education</SectionLabel>
        <button onClick={openNew} style={{padding:"6px 14px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Education</button>
      </div>
      <p style={{fontSize:12,color:T.ink3,margin:"0 0 14px"}}>Your college auto-syncs here from Settings — add other degrees, diplomas, or schooling manually.</p>

      {editing!==null&&(
        <div style={{background:"#FAF7F2",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"16px",marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Institution *</div><input style={inp} value={form.institution||""} onChange={e=>setForm(f=>({...f,institution:e.target.value}))} placeholder="e.g. VIT University"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Degree</div><input style={inp} value={form.degree||""} onChange={e=>setForm(f=>({...f,degree:e.target.value}))} placeholder="e.g. B.Tech"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Field of Study</div><input style={inp} value={form.field||""} onChange={e=>setForm(f=>({...f,field:e.target.value}))} placeholder="e.g. Electronics & Communication"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Year</div><input style={inp} value={form.year||""} onChange={e=>setForm(f=>({...f,year:e.target.value}))} placeholder="e.g. 2025"/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{padding:"7px 18px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
            <button onClick={()=>setEditing(null)} style={{padding:"7px 14px",background:"transparent",color:T.ink3,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {ordered.length===0&&editing===null&&(
        <div style={{textAlign:"center",padding:"36px 20px"}}>
          <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#E9FBF3 0%,#F0FFF8 100%)",border:"1.5px solid rgba(16,185,129,0.16)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 14px"}}>🎓</div>
          <div style={{fontSize:13,color:T.ink4}}>No education yet — set your college in Settings, or add a degree manually</div>
        </div>
      )}
      {ordered.map((ed,i)=>{
        const isCurrent = ed._source==="profile"
        const initial = (ed.institution||"?").charAt(0).toUpperCase()
        const realIdx = items.indexOf(ed)
        return (
          <div key={i} style={{display:"flex",gap:0}}>
            {/* Left: gradient node + connecting line */}
            <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",width:56,paddingTop:2}}>
              <div style={{
                width:44,height:44,borderRadius:12,
                background:isCurrent
                  ? "linear-gradient(135deg,#10B981 0%,#34D399 100%)"
                  : "linear-gradient(135deg,#E9FBF3 0%,#F0FFF8 100%)",
                border:isCurrent ? "none" : "1.5px solid rgba(16,185,129,0.18)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16,fontWeight:900,
                color:isCurrent ? "#fff" : T.green,
                fontFamily:"'DM Sans',serif",
                boxShadow:isCurrent ? "0 3px 12px rgba(16,185,129,0.35)" : "0 2px 8px rgba(16,185,129,0.10)",
                flexShrink:0,
              }}>
                {isCurrent ? "🏫" : initial}
              </div>
              {i<ordered.length-1&&<div style={{width:2,flex:1,background:"linear-gradient(to bottom, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.04) 100%)",marginTop:6,minHeight:28,borderRadius:2}}/>}
            </div>

            {/* Right: card */}
            <div style={{flex:1,paddingLeft:16,paddingBottom:i<ordered.length-1?24:4}}>
              <div style={{
                background:isCurrent ? "linear-gradient(135deg,#F0FFF8 0%,#FAFFFC 100%)" : "#FAFAFE",
                border:`1.5px solid ${isCurrent ? "rgba(16,185,129,0.22)" : "rgba(16,185,129,0.12)"}`,
                borderRadius:14,padding:"14px 16px",
                boxShadow:isCurrent ? "0 3px 14px rgba(16,185,129,0.10)" : "0 2px 12px rgba(16,185,129,0.05)",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                      <span style={{fontFamily:"'DM Sans',serif",fontSize:15,fontWeight:700,color:T.ink}}>{ed.institution||"Institution"}</span>
                      {isCurrent && <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 9px",borderRadius:100,background:T.green2,color:T.green,fontSize:10,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:"0.06em",textTransform:"uppercase"}}>● CURRENT COLLEGE</span>}
                      {/* 2026-08-05: shown unconditionally now (was resume-only) so
                          verified/self-claimed status is always visible, matching
                          StudentCertificatesPanel's behavior. */}
                      <CertBadge c={ed}/>
                    </div>
                    <div style={{fontSize:11,color:T.ink4,fontFamily:"'DM Mono',monospace",letterSpacing:"0.02em"}}>
                      {[ed.degree,ed.field].filter(Boolean).join(" · ")}{ed.year?` · ${ed.year}`:""}
                      {!ed.degree && !ed.field && !ed.year && isCurrent && "Synced from Settings — add degree details anytime"}
                    </div>
                    {verifyMsg[realIdx]&&<div style={{fontSize:11,marginTop:3,color:verifyMsg[realIdx].startsWith("✅")?T.green:T.red}}>{verifyMsg[realIdx]}</div>}
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    {ed.verificationStatus!=="verified"&&ed.institution&&(
                      <button onClick={()=>requestVerify(realIdx)} disabled={verifyingIdx===realIdx}
                        style={{padding:"4px 10px",fontSize:11,border:`1px solid ${T.green}40`,borderRadius:6,background:T.green2,color:T.green,cursor:verifyingIdx===realIdx?"not-allowed":"pointer",fontWeight:600}}>
                        {verifyingIdx===realIdx?"Checking…":"⬆ Verify"}
                      </button>
                    )}
                    <button onClick={()=>openEdit(realIdx)} style={{padding:"4px 10px",fontSize:11,border:"1px solid rgba(16,185,129,0.18)",borderRadius:6,background:"rgba(16,185,129,0.06)",color:T.green,cursor:"pointer",fontWeight:700}}>Edit</button>
                    {!isCurrent && <button onClick={()=>del(realIdx)} style={{padding:"4px 10px",fontSize:11,border:"none",background:"rgba(220,38,38,0.07)",color:"#DC2626",borderRadius:6,cursor:"pointer"}}>✕</button>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <input ref={verifyFileRef} type="file" accept=".pdf,image/*" onChange={onVerifyFileChosen} style={{display:"none"}}/>
    </Card>
  )
}

// ─── Student Testimonials Panel ───────────────────────────────────────────────
function StudentTestimonialsPanel({ testimonials, onSave }) {
  const [items, setItems] = useState(testimonials||[])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  useEffect(()=>setItems(testimonials||[]),[testimonials])

  const openNew = () => { setForm({text:"",name:"",role:"",company:"",relationship:""}); setEditing("new") }
  const openEdit = i => { setForm({...items[i]}); setEditing(i) }
  const del = async i => { const next=[...items]; next.splice(i,1); setItems(next); await onSave(next) }
  const save = async () => {
    const next = editing==="new" ? [...items,{...form}] : items.map((x,i)=>i===editing?{...form}:x)
    setItems(next); setEditing(null); await onSave(next)
  }

  const inp = {width:"100%",padding:"8px 11px",border:`1px solid ${T.border}`,borderRadius:8,background:"#FAF7F2",color:T.ink,fontSize:13,outline:"none",boxSizing:"border-box",marginTop:4}

  return (
    <Card style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <SectionLabel color="#7C3AED">💬 Recommendations</SectionLabel>
        <button onClick={openNew} style={{padding:"6px 14px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Recommendation</button>
      </div>
      <p style={{fontSize:12,color:T.ink3,margin:"0 0 14px"}}>Feedback from mentors, faculty, supervisors, or collaborators — shown as testimonials on your portfolio.</p>

      {editing!==null&&(
        <div style={{background:"#FAF7F2",border:`1.5px solid ${T.border}`,borderRadius:12,padding:"16px",marginBottom:14}}>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:T.ink3}}>What they said *</div>
            <textarea style={{...inp,resize:"vertical",minHeight:72}} value={form.text||""} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Paste their recommendation or quote here…"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Reviewer Name *</div><input style={inp} value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Dr. Sharma / Prof. Anita"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Their Role / Title</div><input style={inp} value={form.role||""} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Professor / Senior Engineer"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Organization</div><input style={inp} value={form.company||""} onChange={e=>setForm(f=>({...f,company:e.target.value}))} placeholder="IIT Delhi / TCS"/></div>
            <div><div style={{fontSize:11,fontWeight:700,color:T.ink3}}>Relationship</div><input style={inp} value={form.relationship||""} onChange={e=>setForm(f=>({...f,relationship:e.target.value}))} placeholder="e.g. Thesis Supervisor / Mentor"/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{padding:"7px 18px",background:"#FF5701",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
            <button onClick={()=>setEditing(null)} style={{padding:"7px 14px",background:"transparent",color:T.ink3,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {items.length===0&&editing===null&&(
        <div style={{textAlign:"center",padding:"20px 16px",color:T.ink4,fontSize:13,border:`1.5px dashed ${T.border}`,borderRadius:10}}>
          No recommendations yet — ask a mentor or supervisor to write one for you
        </div>
      )}
      {items.map((t,i)=>(
        <div key={i} style={{padding:"10px 0",borderBottom:i<items.length-1?`1px solid ${T.border}`:"none"}}>
          <div style={{fontSize:12,color:T.ink2,fontStyle:"italic",marginBottom:6,lineHeight:1.55}}>"{(t.text||"").slice(0,120)}{(t.text||"").length>120?"…":""}"</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:12,fontWeight:600,color:T.ink}}>{t.name} {t.role?<span style={{color:T.ink4,fontWeight:400}}>· {t.role}</span>:null}</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>openEdit(i)} style={{padding:"4px 10px",fontSize:11,border:`1px solid ${T.border}`,borderRadius:6,background:"transparent",color:T.ink3,cursor:"pointer"}}>Edit</button>
              <button onClick={()=>del(i)} style={{padding:"4px 10px",fontSize:11,border:"none",background:"rgba(220,38,38,0.07)",color:"#DC2626",borderRadius:6,cursor:"pointer"}}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

// ─── MAIN AURA COMPONENT ─────────────────────────────────────────────────────
// Career OS Workstream 0 (docs/career-os-implementation-plan.md §B): Aura now
// owns its tab state fully locally, same fix applied to Orbit.jsx. A single
// global activeTab used to live in App.jsx, shared across every page that
// accepted activeTab/setActiveTab — that's what caused student-only
// "dashboard" content (ELO Rating History, Arena Activity) to leak onto the
// professional Profile page, and is the same class of bug that would blank
// Career's body if a stale tab id from Profile arrived there instead. The
// activeTab/setActiveTab props are now a one-shot deep-link *request* only.
// "settings" and "monthreport" are included even though neither has a visible
// tab-bar button. "settings" is reached via a one-shot deep link — App.jsx's
// profile-menu "Settings" entry sets initialTabProp="settings" before
// switching currentPage to Aura. It was missing from these sets, which
// silently broke that deep link: Aura's initial-tab guard rejected "settings"
// as invalid and fell back to the default tab instead (2026-07-24 fix).
// "monthreport" has no live entry point anywhere in the app right now (its
// only references are an unused Header.jsx component) — kept in
// STUDENT_TAB_IDS for the same reason (so the deep-link guard doesn't
// silently fall back if it's ever wired up for students).
//
// REMOVED from PROFESSIONAL_TAB_IDS (2026-07-25, Professional Path re-scope
// pass): MonthlyReportPanel (below) renders raw eloRating, an ELO tier
// ("Rookie"..."Elite"), and "Complete Arena tasks" copy sourced from
// arenaHistory/eloHistory — entirely student/Arena-coupled content that
// directly violates the "no raw ELO on professional-facing surfaces" rule.
// It was unreachable in practice (no professional nav entry points to it —
// see Header.jsx comment), but leaving it in PROFESSIONAL_TAB_IDS meant any
// future deep link to "monthreport" for a professional user would have
// rendered raw ELO. Profile is also being re-scoped to
// identity/documents/privacy/account-only content, and a monthly
// ELO/Arena report doesn't belong there regardless of the ELO issue.
// REMOVED "interview" from PROFESSIONAL_TAB_IDS (2026-07-25, Tranche 1 nav
// boundary pass): AIInterviewPanel is skill-practice/interview-prep content,
// not identity/documents/privacy/account — it doesn't belong in a Profile
// that's being narrowed to that scope. It's now exported from this file and
// mounted as Launchpad's "Interview Prep" tab instead (see Launchpad.jsx),
// reusing the exact same component/props contract rather than duplicating
// it. Left in STUDENT_TAB_IDS/the student tab bar below — untouched, out of
// scope for the professional-path re-scope.
const STUDENT_TAB_IDS      = new Set(["dashboard", "vault", "skillgraph", "interview", "skillgap", "resilience", "fingerprint", "voucher", "monthreport", "settings"])
// "echopitch" added 2026-07-29 — the AI video generator (EchoPitchHero) was
// only reachable via the student "dashboard" tab, which isn't in this set at
// all, so it was structurally unreachable for professional-path users even
// though the underlying data (skillGraph/echoPitchCompletedTasks/experiences,
// all proof_objects/user_skills-sourced, not Arena-specific) already works
// for any path.
const PROFESSIONAL_TAB_IDS = new Set(["vault", "echopitch", "settings"])

export default function Aura({ user, activeTab: initialTabProp, setActiveTab: setActiveTabProp, onNavigate, onNavigatePricing, userData: propUserData, setUserData }) {
  const validTabIds = propUserData?.path === "professional" ? PROFESSIONAL_TAB_IDS : STUDENT_TAB_IDS
  const defaultTab  = propUserData?.path === "professional" ? "vault" : "dashboard"
  const [activeTab, setActiveTab] = useState(
    (initialTabProp && validTabIds.has(initialTabProp)) ? initialTabProp : defaultTab
  )

  // "View Code DNA →" links inside GithubCodeDnaCard (rendered from
  // multiple tabs — Career & Vault, Settings) need to switch Aura's own tab
  // state, but that component has no direct access to setActiveTab. A
  // custom DOM event is the simplest bridge that doesn't require threading
  // a callback prop through every place the card is used.
  useEffect(() => {
    const onNavigateTab = (e) => { if (validTabIds.has(e.detail)) setActiveTab(e.detail) }
    document.addEventListener("capabilio:navigate-tab", onNavigateTab)
    return () => document.removeEventListener("capabilio:navigate-tab", onNavigateTab)
  }, [])

  // Consume a fresh one-shot deep-link request without re-subscribing to the
  // shared prop afterward (so it can't stomp on the user's own tab clicks).
  const consumedInitialTab = useRef(initialTabProp)
  useEffect(() => {
    if (initialTabProp && initialTabProp !== consumedInitialTab.current && validTabIds.has(initialTabProp)) {
      setActiveTab(initialTabProp)
    }
    consumedInitialTab.current = initialTabProp
  }, [initialTabProp])

  // Self-heal: if the path changes mid-session (rare, but cheap to guard) and
  // the current tab isn't valid for the new path, land on that path's default
  // instead of rendering blank.
  useEffect(() => {
    if (!validTabIds.has(activeTab)) setActiveTab(defaultTab)
  }, [propUserData?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  const [userData, setLocalUserData]    = useState(propUserData||null)
  const [loading, setLoading]           = useState(!propUserData)
  const [vaultFiles, setVaultFiles]     = useState(propUserData?.vaultFiles||[])
  const [experiences, setExperiences]   = useState(propUserData?.experiences||[])
  const [showExpModal, setShowExpModal]         = useState(false)
  const [showVideoGenerator, setShowVideoGenerator] = useState(false)
  const [editingIdx, setEditingIdx]             = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadCategory, setUploadCategory] = useState("Resume")
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeStatus, setResumeStatus] = useState("")
  const [showResumeUpload, setShowResumeUpload] = useState(false)
  const [skillGapData, setSkillGapData] = useState(null)
  const [skillGapLoading, setSkillGapLoading] = useState(false)
  const [skillGapError, setSkillGapError] = useState("")
  // 2026-07-27: live per-skill data from the `skill_graph` TABLE (written by
  // grading-worker.js on every scored Arena submission — see arena.js's new
  // GET /api/arena/skill-graph route for why this exists: profiles.skill_graph
  // stopped updating from Arena missions once the 2026-07-18 fix correctly
  // removed the client's double-ELO-writing applySkillUpdates() call, and
  // nothing replaced it as a read source for this dashboard. This is a
  // read-only fetch — it cannot reintroduce that bug.
  const [liveArenaSkillGraph, setLiveArenaSkillGraph] = useState([])
  // EchoPitch evidence source (2026-07-28): the same class of bug as
  // liveArenaSkillGraph above — userData.arenaHistory is a legacy Firestore-
  // era field (see lib/db.js comment "replaces users/{uid}/arenaHistory
  // subcollection") that Arena V2's proof_objects pipeline never writes to.
  // A student who completes real Arena V2 missions (proof_objects rows) was
  // showing "0 Arena tasks" in EchoPitch even with real completions on
  // record. Fix: read the same public, already-shipped GET /api/proofs/:userId
  // endpoint that powers the Portfolio "Engineering Proofs" tab — real,
  // AI-graded proof rows, not a re-derivation of anything.
  const [echoPitchProofs, setEchoPitchProofs] = useState([])
  const [resilienceData, setResilienceData] = useState(null)
  const [resilienceLoading, setResLoading] = useState(false)
  const [githubData, setGithubData]     = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError]   = useState("")
  const [portfolioCopied, setPortfolioCopied] = useState(false)
  const [coverUploading, setCoverUploading]   = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverAdjust, setCoverAdjust]         = useState(false)
  const [coverPosition, setCoverPosition]     = useState({x:50,y:50})
  const [isDraggingCover, setIsDraggingCover] = useState(false)
  const [dragStart, setDragStart]             = useState({x:0,y:0})
  const [decayDropdownOpen, setDecayDropdownOpen]     = useState(false)
  const [selectedDecaySkills, setSelectedDecaySkills] = useState([])
  const [practiceSkill, setPracticeSkill]             = useState("")
  const [githubUrl, setGithubUrl]             = useState("")
  const [githubVerifying, setGithubVerifying] = useState(false)
  const [githubVerifyMsg, setGithubVerifyMsg] = useState(null) // {verified, code, message}
  // Canonical GitHub connection/verification status (2026-09-03) — fetched
  // from GET /api/github/verification-code, which now reads
  // github_connections (the one canonical identity table) rather than
  // anything derived from this component's own local githubUrl state. This
  // is what makes "which account is being verified" unambiguous: it's
  // always whatever Settings' "Connect GitHub" (or a first-time direct
  // analyze) established, never whatever happens to be typed in the box
  // above right now.
  const [ghVerification, setGhVerification]   = useState(null) // {code, connected, username, profileUrl, verified}
  const [codeCopied, setCodeCopied]           = useState(false)
  // AI Repository Interview (2026-08-04) — text-based, grounded in the real
  // analyzed repo. repoInterview holds a COMPLETED result (from a past run,
  // loaded lazily, or just-submitted); riQuestions/riAnswers/riStep drive an
  // in-progress session before it's submitted.
  const [repoInterview, setRepoInterview]     = useState(null)   // {repoName, transcript, evaluation, completedAt}
  const [riQuestions, setRiQuestions]         = useState(null)   // [{id,question,testsSignal}] while in progress
  const [riAnswers, setRiAnswers]             = useState({})     // {questionId: answerText}
  const [riStep, setRiStep]                   = useState(0)
  const [riGenerating, setRiGenerating]       = useState(false)
  const [riSubmitting, setRiSubmitting]       = useState(false)
  const [riError, setRiError]                 = useState("")
  const [riLoadedFor, setRiLoadedFor]         = useState(null)   // username we've already fetched past results for
  // Cross-Verification (2026-08-05) — compares Code DNA's detected tech
  // signals against user_skills (Arena/SkillStudio/resume/manual). Purely
  // informational, lazy-loaded once per analyzed username.
  const [crossVerify, setCrossVerify]         = useState(null)   // {corroborated:[], newSignals:[]}
  const [cvLoadedFor, setCvLoadedFor]         = useState(null)

  // ── Arena history loaded from Supabase arena_history table ──────────────
  // This replaces all reads from userData.arenaSubmissions (Firebase-era field
  // that no longer exists in Supabase profiles).
  const [arenaHistRows, setArenaHistRows] = useState([])

  const fileInputRef        = useRef()
  const resumeFileInputRef  = useRef()
  const coverInputRef       = useRef()
  const avatarInputRef      = useRef()

  useEffect(() => {
    if (propUserData) {
      setLocalUserData(propUserData)
      setVaultFiles(propUserData.vaultFiles||[])
      // Guard: only overwrite if incoming data has experiences; keep existing state if not
      setExperiences(prev => (propUserData.experiences?.length > 0) ? propUserData.experiences : (prev.length > 0 ? prev : []))
      setLoading(false)

      // Auto-fix username if it doesn't match displayName (wrong extraction during onboarding)
      const correctSlug = (propUserData.displayName || user?.user_metadata?.full_name || "")
        .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      const storedSlug = propUserData.username || ""
      // If stored username contains no part of the display name → it came from wrong extraction
      const displayParts = correctSlug.split("-").filter(p => p.length > 2)
      const slugMatchesDisplay = displayParts.some(part => storedSlug.includes(part))
      // Only auto-fix if username is missing entirely (never set) — don't overwrite valid slugs
      // Wrap in try/catch: a duplicate username unique-constraint error is non-fatal
      if (correctSlug && !storedSlug && (user?.id||user?.uid)) {
        // Add suffix to guarantee uniqueness — same-name users must never share a slug
        const suffix = Math.random().toString(36).slice(2, 6)
        const uniqueSlug = `${correctSlug}-${suffix}`
        userDoc.update(user.id||user.uid, { username: uniqueSlug })
          .then(() => {
            if(setUserData) setUserData(d => ({...d, username: uniqueSlug}))
            setLocalUserData(d => ({...d, username: uniqueSlug}))
          })
          .catch(() => {}) // silent — username is cosmetic, not blocking
      }
    }
  }, [propUserData])

  useEffect(() => {
    // user.id is the Supabase UUID — user.uid is undefined for Supabase auth
    const uid = user.id || user.uid
    if (!uid) return
    const unsub = userDoc.subscribe(uid, (d) => {
      setLocalUserData(d)
      setVaultFiles(d.vaultFiles||[])
      // Only overwrite local experiences if DB has data — prevents subscription from
      // clearing in-memory state when experiences column is empty in DB
      setExperiences(prev => (d.experiences?.length > 0) ? d.experiences : (prev.length > 0 ? prev : []))
      if(d.coverPosition) setCoverPosition(d.coverPosition)
      if(setUserData) setUserData(d)
      // Auto-update strengths and weakAreas from skillGraph if arena tasks have run
      const sg=d.skillGraph||[]
      if(sg.length>=3) {
        const sorted=[...sg].sort((a,b)=>(b.value||b.score||0)-(a.value||a.score||0))
        const topSkills=sorted.slice(0,3).map(s=>s.label||s.skill)
        const weakSkills=sorted.slice(-3).map(s=>s.label||s.skill)
        const autoStrengths=topSkills.map(s=>`Strong ${s} skills demonstrated through Arena tasks`)
        const autoWeak=weakSkills.map(s=>`${s} — needs more practice (complete Arena tasks to improve)`)
        const existingStrengths=d.strengths||[]
        const existingWeak=d.weakAreas||[]
        if(existingStrengths.length<3&&d.arenaCompleted>0&&autoStrengths.length>0) {
          userDoc.update(user.id||user.uid,{strengths:[...autoStrengths,...existingStrengths.filter(s=>!s.includes("Arena"))].slice(0,5),weakAreas:[...autoWeak,...existingWeak.filter(w=>!w.includes("Arena"))].slice(0,5)}).catch(()=>{})
        }
      }
      setLoading(false)
    })
    return ()=>unsub()
  },[user.id])

  // ── Load arena_history from Supabase whenever the user changes ────────────
  useEffect(() => {
    const uid = user?.id || user?.uid
    if (!uid) return
    supabase
      .from("arena_history")
      .select("task_id,title,difficulty,domain,type,score,elo_delta,completed_at,feedback,scenario")
      .eq("user_id", uid)
      .order("completed_at", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (data?.length) setArenaHistRows(data)
      })
  }, [user?.id])

  // ── Live skill radar: pull real per-skill progress from the `skill_graph`
  // table (written server-side by grading-worker.js on every scored Arena
  // submission) so the Aura radar updates dynamically as missions/assessments
  // are completed, instead of only reflecting the stale onboarding-time
  // profiles.skill_graph blob. Read-only fetch — see arena.js's
  // GET /api/arena/skill-graph for the full rationale.
  useEffect(() => {
    const uid = user?.id || user?.uid
    if (!uid) return
    let cancelled = false
    ;(async () => {
      try {
        const headers = await vHeaders()
        const res = await fetch(`${API}/api/arena/skill-graph?userId=${uid}`, { headers })
        if (!res.ok) return
        const { skills } = await res.json()
        if (!cancelled && Array.isArray(skills)) setLiveArenaSkillGraph(skills)
      } catch { /* non-fatal — radar falls back to profiles.skill_graph */ }
    })()
    return () => { cancelled = true }
  }, [user?.id, arenaHistRows.length])

  // EchoPitch evidence — see echoPitchProofs declaration above for why this
  // reads proof_objects instead of userData.arenaHistory. Public endpoint,
  // no auth header needed (same as EngineeringProofsPanel.jsx).
  useEffect(() => {
    const uid = user?.id || user?.uid
    if (!uid) return
    let cancelled = false
    fetch(`${API}/api/proofs/${uid}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || d.error) return
        const flat = (d.domains || []).flatMap(g => g.proofs || [])
        flat.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        setEchoPitchProofs(flat)
      })
      .catch(() => { /* non-fatal — EchoPitch falls back to 0 real evidence, never fake */ })
    return () => { cancelled = true }
  }, [user?.id])

  // Maps real proof_objects rows into the {task,submission} shape
  // CareerVideoGenerator/EchoPitchHero already expect (same shape the old
  // arenaHistory mapping produced) — swap-in fix, no consumer changes needed.
  const echoPitchCompletedTasks = useMemo(() => {
    if (echoPitchProofs.length > 0) {
      return echoPitchProofs.slice(0, 10).map(p => ({
        task: { title: p.title, difficulty: p.difficulty, category: p.domain, skill: p.skill, scenario: p.challengeType },
        submission: { score: p.score, eloGained: p.eloDelta, summary: (p.skillsDemonstrated || []).join(", ") },
      }))
    }
    // Fallback for any pre-proof_objects-era account that only has the old
    // arenaHistory field populated — kept so this fix can't regress anyone,
    // not a claim that this path is commonly hit today.
    return (userData?.arenaHistory || []).slice(0, 10).map(h => ({
      task: { title: h.taskTitle || h.title, difficulty: h.difficulty, category: h.category, skill: h.skill, scenario: h.scenario },
      submission: { score: h.score, eloGained: h.eloGained || h.eloDelta, summary: h.feedback || h.summary },
    }))
  }, [echoPitchProofs, userData?.arenaHistory])

  // Returns true/false so callers that need to know (e.g. resume upload) can
  // show an accurate result instead of assuming success. BUG FIX (2026-07-20):
  // this previously always optimistically applied `updates` to local state
  // even when userDoc.update()'s DB write failed (it returns false on error,
  // it doesn't throw) — so the UI would show "saved" for a write that never
  // actually landed. On the next refresh/login, the fresh Supabase fetch would
  // overwrite local state with the real (unsaved) row, making data that was
  // "there a moment ago" appear to vanish. Root cause of the "resume disappears
  // after refresh/logout" report — a real DB write failure was being silently
  // treated as success.
  const save = async (updates) => {
    try {
      const ok = await userDoc.update(user.id || user.uid, updates)
      if (!ok) { console.error('[Aura] save failed — DB write rejected, not applying to local state:', Object.keys(updates)); return false }
      const merged = {...userData,...updates}
      setLocalUserData(merged)
      if (setUserData) setUserData(merged)
      return true
    } catch(e) { console.warn(e); return false }
  }

  // ELO history logger — records today's ELO snapshot for the trend chart.
  // Decay is NOT applied here; Arena.jsx is the single authoritative decay engine.
  // Aura's job is only to: (1) log history, (2) rehydrate ELO=0, (3) read decay state.
  useEffect(()=>{
    if(!userData||!user) return
    const todayStr=new Date().toISOString().slice(0,10)

    // ── Guard: if Arena already applied decay today, don't touch eloRating ──
    // arena_decay_applied_at is normalised to eloDecayDate in toCompat() (db.js)
    const decayAlreadyApplied = (userData.eloDecayDate||userData.arenaDecayAppliedAt||'').slice(0,10) === todayStr

    // Role-based ELO floor
    const defaultElo=userData?.path==='professional'||userData?.path==='authority'?800:400
    const currentElo=(userData.eloRating!=null&&userData.eloRating>0)?userData.eloRating:defaultElo

    const history=userData.eloHistory||[]
    const alreadyLogged=history.some(h=>h.date===todayStr)
    const onboardedToday=userData.createdAt&&new Date(userData.createdAt).toISOString().slice(0,10)===todayStr

    let updates={}
    // Log today's ELO into history if not already done
    if(!alreadyLogged&&!onboardedToday){
      const trimmed=[...history.slice(-29),{date:todayStr,elo:currentElo}]
      updates.eloHistory=trimmed
    }
    // Rehydrate: if ELO was zeroed by an old bug, restore to floor
    if(userData.eloRating==null||userData.eloRating===0) updates.eloRating=defaultElo

    // DECAY is intentionally skipped here — Arena handles it via arena_decay_applied_at.
    // Keeping decay in one place prevents double-application and ELO drift between pages.
    if(!decayAlreadyApplied){
      // Safety: if user has never visited Arena (no decay cursor) and is badly overdue,
      // Arena will handle it on their next visit. Aura just updates history here.
    }

    if(Object.keys(updates).length>0){ save(updates); if(setUserData) setUserData(d=>({...d,...updates})) }
  },[user?.uid])

  // Handle cover photo upload
  // Convert file to base64 for persistent storage in Firestore
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })

  const handleCoverUpload = async (e) => {
    const file=e.target.files[0]; if(!file) return
    if(file.size > 5*1024*1024) { alert("Cover photo must be under 5MB. Please use a smaller image and try again."); return }
    setCoverUploading(true)
    try {
      const base64=await fileToBase64(file)
      await save({ coverPhotoUrl:base64, coverPosition:{x:50,y:50} })
      setCoverPosition({x:50,y:50})
      setCoverAdjust(false)
    } catch(err) { console.error("Cover upload failed:",err) }
    setCoverUploading(false)
  }

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file=e.target.files[0]; if(!file) return
    if(file.size > 5*1024*1024) { alert("Profile photo must be under 5MB. Please use a smaller image and try again."); return }
    setAvatarUploading(true)
    try {
      const base64=await fileToBase64(file)
      await save({ avatarUrl:base64 })
    } catch(err) {
      console.error("Avatar upload failed:",err)
      alert("Couldn't save your profile photo. Please try again.")
    }
    setAvatarUploading(false)
  }

  const handleUpload = async (e) => {
    const file=e.target.files[0]; if(!file) return
    setUploading(true)
    const url=URL.createObjectURL(file)
    const nf={id:Date.now().toString(),name:file.name,url,type:file.type,category:uploadCategory,size:(file.size/1024).toFixed(0)+" KB",uploadedAt:new Date().toISOString()}
    const updated=[...vaultFiles,nf]; setVaultFiles(updated); await save({vaultFiles:updated}); setUploading(false)
    if(fileInputRef.current) fileInputRef.current.value=""
  }

  // Classify whether a resume experience entry is actually a project (not professional employment)
  const isProjectEntry = (e) => {
    const company = (e.company||"").toLowerCase().trim()
    const title   = (e.role||e.title||e.position||"").toLowerCase()
    // No company → personal/academic project
    if (!company || company === "unknown" || company === "self" || company === "personal" || company === "n/a") return true
    // University / college / school → project
    if (/university|college|institute|school|iit|nit|iim|iiit|academy|polytechnic|campus|dept\.|department/.test(company)) return true
    // Company name is itself a project label
    if (/\bproject\b|mini[\s-]?project|main[\s-]?project|college[\s-]?project|academic/.test(company)) return true
    // Title explicitly describes a project type
    if (/\bproject\b|mini[\s-]?project|main[\s-]?project|college[\s-]?project|academic[\s-]?project|personal[\s-]?project|side[\s-]?project|capstone|thesis|dissertation|final[\s-]?year|hackathon|open[\s-]?source|freelance[\s-]?project/.test(title)) return true
    // No duration and no recognisable professional job title
    const hasJobTitle = /engineer|developer|analyst|manager|intern|lead|head|consultant|architect|designer|officer|specialist|director|associate|executive|trainee|apprentice|researcher|scientist/.test(title)
    if (!hasJobTitle && !e.duration && !e.startDate) return true
    return false
  }

  const handleResumeUpload = async (e) => {
    const file=e.target.files[0]; if(!file) return
    setResumeUploading(true); setResumeStatus("Extracting resume…")
    try {
      const formData=new FormData(); formData.append("resume",file)
      // Use /professional/parse-resume — richer schema with responsibilities[], roleSkills[], projects[]
      const extractData=await fetch(`${API}/api/professional/parse-resume`,{method:"POST",body:formData}).then(r=>r.json())

      // 2026-08-05: identity-mismatch check — a resume for a different
      // person was previously silently parsed and applied to the account.
      // Deterministic token-overlap check (lib/nameMatch.js), not an AI
      // judgment — either the extracted name shares a token with the
      // account name or it doesn't. Only blocks when both names are
      // present and genuinely unrelated; never blocks on a missing/
      // unparseable name (can't accuse without two real names to compare).
      const accountName = userData?.displayName || userData?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || ""
      if (extractData?.name && accountName && namesLikelyMismatch(accountName, extractData.name)) {
        const proceed = window.confirm(mismatchWarning("resume", accountName, extractData.name))
        if (!proceed) {
          setResumeUploading(false); setResumeStatus("")
          if (resumeFileInputRef?.current) resumeFileInputRef.current.value = ""
          return
        }
      }
      setResumeStatus("Parsing career history with AI…")

      // /professional/parse-resume returns { experiences:[], skills:[], projects:[], certifications:[], summary:"" }
      // Each experience is already flat: { company, role, startDate, endDate, isCurrent, description, skills[], verificationStatus, _source }
      const newExps = (extractData.experiences || []).map(e => ({
        ...e,
        industry: e.industry || "Technology",
        verificationStatus: "self-claimed",
        _source: "resume",
        resumeFile: file.name,
        // Ensure skills is always an array
        skills: Array.isArray(e.skills) ? e.skills.filter(Boolean) : [],
      }))

      // Parse projects — from dedicated projects section
      const newProjects = (extractData.projects || []).map(p => ({
        title: p.title || p.name || "Project",
        description: p.description || "",
        techStack: Array.isArray(p.techStack) ? p.techStack : (Array.isArray(p.technologies) ? p.technologies : (Array.isArray(p.skills) ? p.skills : [])),
        url: p.url || p.link || "",
        _source: "resume",
        resumeFile: file.name,
      }))

      // Parse education — resume already has this in the schema, just wasn't being read
      const newEducation = (extractData.education || []).filter(e => e && (e.institution || e.degree)).map(e => ({
        institution: e.institution || "",
        degree: e.degree || "",
        field: e.field || "",
        year: e.year || "",
        _source: "resume",
        resumeFile: file.name,
      }))

      // Parse certifications — resume returns plain strings; normalise into cert records,
      // tagged self-claimed since only the resume text was seen, not an actual certificate file.
      // Dedupe against existing certs by name (case-insensitive) so re-uploading the same resume doesn't duplicate.
      const existingCerts = userData?.certificates || []
      const existingCertNames = new Set(existingCerts.map(c => (c.name||"").toLowerCase().trim()).filter(Boolean))
      const newCerts = (extractData.certifications || [])
        .filter(Boolean)
        .map(c => (typeof c === "string" ? { name: c } : c))
        .filter(c => c.name && !existingCertNames.has(c.name.toLowerCase().trim()))
        .map(c => ({
          name: c.name, issuer: c.issuer || "", date: c.date || "", credentialId: c.credentialId || "",
          url: c.url || "", skills: [],
          verificationStatus: "self-claimed", verificationSource: "Resume",
          _source: "resume", resumeFile: file.name,
        }))
      const mergedCerts = [...existingCerts, ...newCerts]

      // Build/update skill graph from resume skills
      const resumeSkillsList=(extractData.skills||[]).filter(Boolean)
      let updatedSkillGraph=userData?.skillGraph||[]
      if(resumeSkillsList.length>0&&updatedSkillGraph.length===0) {
        // Create initial skill graph from resume — each skill starts at 30
        updatedSkillGraph=resumeSkillsList.slice(0,8).map(s=>({label:s,skill:s,value:30,score:30,source:"resume"}))
      }

      // ACCUMULATE vault entries — keep all resumes, don't replace
      // Use base64 for PDFs under 3MB so the card persists across sessions
      let resumeUrl = ""
      try {
        if (file.size < 3 * 1024 * 1024) {
          resumeUrl = await fileToBase64(file)
        }
      } catch {}
      const vaultEntry={id:Date.now().toString(),name:file.name,url:resumeUrl,type:file.type,category:"Resume",size:(file.size/1024).toFixed(0)+" KB",uploadedAt:new Date().toISOString()}
      const updatedVault=[vaultEntry,...vaultFiles.filter(f=>!(f.category==="Resume"&&f.name===file.name))]  // replace same-name resume

      // ACCUMULATE experiences — new ones from this resume + keep existing from other resumes and manual
      const existingOtherResumes=experiences.filter(ex=>ex._source==="resume"&&ex.resumeFile!==file.name)
      const existingManual=experiences.filter(ex=>ex._source==="manual")
      const mergedExperiences=[...newExps,...existingOtherResumes,...existingManual]

      // Save all data
      // NOTE: resumeSkills has no DB column — omit it or Supabase rejects the entire update
      const updates={
        experiences:mergedExperiences,
        vaultFiles:updatedVault,
        resumeFileName:file.name,
        resumeUploadedAt:new Date().toISOString(),
      }
      // Always write resumeProjects — replace same-file projects, keep others
      const otherResumeProjects = (userData?.resumeProjects||[]).filter(p => p.resumeFile !== file.name && p._source !== "manual_project")
      updates.resumeProjects = [...newProjects, ...otherResumeProjects]
      if(updatedSkillGraph.length>0&&(userData?.skillGraph||[]).length===0) updates.skillGraph=updatedSkillGraph

      // Education — accumulate like experiences: keep entries from other resumes/manual, replace this resume's
      const otherEducation = (userData?.education||[]).filter(ed => ed.resumeFile !== file.name)
      updates.education = [...newEducation, ...otherEducation]

      // Certificates — merged (existing + new resume-sourced, deduped above)
      updates.certificates = mergedCerts

      // BUG FIX: extractData.title (the resume's professional title) was parsed
      // but never saved anywhere from this upload path either — same gap as the
      // Career page's resume importer. `headline` is a real profiles column read
      // by Home and Pulse; only set it if empty so we never overwrite something
      // the user typed by hand.
      if (extractData.title && !userData?.headline) updates.headline = extractData.title
      // Auto-derive target role from the resume — same reasoning as headline
      // above: the user already told us what they do, Skill Gap Analysis and
      // the weekly Career Check shouldn't make them type it again separately.
      if (extractData.title && !userData?.targetRole) updates.targetRole = extractData.title

      // save() now returns whether the DB write actually succeeded — only reflect
      // "done" (and only close the upload panel) if it really landed. Previously
      // this always proceeded to show ✅ and update local React state regardless
      // of the write outcome, which is exactly how an upload could look successful
      // in the moment but be gone on the next refresh/login.
      const saved = await save(updates)
      if (!saved) {
        setResumeStatus("❌ Extracted your resume, but saving it failed — check your connection and try again. (Your previous data is unchanged.)")
        setResumeUploading(false)
        if(resumeFileInputRef.current) resumeFileInputRef.current.value=""
        return
      }
      // BUG FIX: this upload path built `resumeSkillsList` and only ever fed it
      // into the legacy profiles.skill_graph JSONB blob (guarded to first-import
      // only, see updatedSkillGraph above) — never into user_skills, the table
      // the real Skill Graph/Skills-page radar reads. Bulk-upsert is additive and
      // idempotent (upserts on user_id+slug), so this is safe to fire on every
      // resume upload, not just the first. Non-fatal: the profile save already
      // succeeded above, so a sync failure here shouldn't roll that back.
      if (resumeSkillsList.length > 0) {
        skillsApi.bulkUpsert(resumeSkillsList, "resume")
          .catch(err => console.error("[resume] skill graph sync failed:", err.message))
      }

      setExperiences(mergedExperiences)
      setVaultFiles(updatedVault)
      const count=newExps.length+(newProjects.length>0?newProjects.length:0)
      const extras=[]
      if(newEducation.length>0) extras.push(`${newEducation.length} education`)
      if(newCerts.length>0) extras.push(`${newCerts.length} certification${newCerts.length!==1?"s":""}`)
      setResumeStatus(`✅ Done — ${newExps.length} experience${newExps.length!==1?"s":""}${newProjects.length>0?` + ${newProjects.length} project${newProjects.length!==1?"s":""}`:""}${extras.length?` + ${extras.join(" + ")}`:""} extracted`)
      setShowResumeUpload(false)
    } catch(err) { console.error(err); setResumeStatus("❌ Failed to parse resume. Check your file format.") }
    setResumeUploading(false)
    if(resumeFileInputRef.current) resumeFileInputRef.current.value=""
  }

  const deleteFile = async (id) => { const u=vaultFiles.filter(f=>f.id!==id); setVaultFiles(u); await save({vaultFiles:u}) }
  const saveExperience = async (data) => {
    const tagged={...data,_source:"manual"}
    const u=editingIdx!==null?experiences.map((e,i)=>i===editingIdx?tagged:e):[...experiences,tagged]
    setExperiences(u); await save({experiences:u}); setShowExpModal(false); setEditingIdx(null)
  }
  const deleteExperience = async (i) => { const u=experiences.filter((_,idx)=>idx!==i); setExperiences(u); await save({experiences:u}) }

  // ========== SKILL GAP: role-aware, auto-triggers on tab open ==========
  const fetchSkillGap = async () => {
    if(skillGapLoading) return
    setSkillGapLoading(true); setSkillGapError("")
    const rawSG=(userData?.skillGraph||[]).filter(d=>d&&(d.label||d.skill))
    const mySkills=rawSG.map(s=>`${s.label||s.skill}(${s.value||s.score||0}%)`).join(", ")||"No skills assessed yet"
    const role=userData?.keyword||getRoleConfig(userData).label
    const weak=(userData?.weakAreas||[]).join(", ")||"general concepts"

    // Role-aware market data — each domain has real skill demand benchmarks
    const generateMockSkillGap = () => {
      const roleMap = {
        // exact domain coverage matching DOMAIN_MAP keys
        "data analyst":      {growth:"18%",gaps:[{skill:"Advanced SQL",demand:"High",weeks:3,surge:true,pct:42,reason:"Companies require complex window functions, CTEs, and query optimization — 81% of DA job postings list this as required"},{skill:"dbt (Data Build Tool)",demand:"High",weeks:4,surge:true,pct:67,reason:"dbt has become the industry standard for analytics engineering; postings up 67% YoY"},{skill:"Python (Pandas/Polars)",demand:"High",weeks:5,surge:true,pct:38,reason:"Excel alone is no longer sufficient — 78% of senior DA roles require Python for automation"}],emerging:[{skill:"Apache Airflow",demand:"Medium",weeks:6,reason:"Pipeline orchestration moving from engineering to analysts at growth-stage companies",surge:false,pct:0},{skill:"Looker/Metabase",demand:"Medium",weeks:3,reason:"BI tool proliferation — recruiters filter by tool familiarity, not just SQL",surge:false,pct:0}]},
        "software engineer": {growth:"15%",gaps:[{skill:"System Design",demand:"High",weeks:6,surge:true,pct:45,reason:"Every senior SWE interview includes system design — it's the #1 screener at FAANG and mid-market companies"},{skill:"Distributed Systems",demand:"High",weeks:8,surge:true,pct:37,reason:"Microservices at scale require knowledge of CAP theorem, eventual consistency, and fault tolerance"},{skill:"Cloud (AWS/GCP)",demand:"High",weeks:5,surge:true,pct:52,reason:"Cloud-native development is now baseline expectation; 71% of job postings list at least one cloud provider"}],emerging:[{skill:"Observability (OpenTelemetry)",demand:"Medium",weeks:4,reason:"Production reliability skills are increasingly expected of senior engineers, not just SREs",surge:false,pct:0},{skill:"LLM API Integration",demand:"Medium",weeks:3,reason:"AI-assisted features now appear on 44% of product roadmaps — engineers who can build them are valued higher",surge:false,pct:0}]},
        "frontend developer":{growth:"14%",gaps:[{skill:"Performance Optimization",demand:"High",weeks:4,surge:true,pct:39,reason:"Core Web Vitals are now a Google ranking factor — companies hiring senior frontend engineers require LCP < 2.5s expertise"},{skill:"Accessibility (WCAG 2.1)",demand:"High",weeks:3,surge:true,pct:55,reason:"Legal compliance requirements (ADA, EAA) are forcing every product team to prioritize a11y — demand up 55%"},{skill:"React Server Components",demand:"High",weeks:4,surge:true,pct:71,reason:"Next.js 14+ with RSC is now standard for new projects; hiring managers filter resumes by this directly"}],emerging:[{skill:"Web Components",demand:"Medium",weeks:5,reason:"Framework-agnostic UI patterns gaining traction in enterprise frontend architecture",surge:false,pct:0},{skill:"Edge Functions / Cloudflare Workers",demand:"Medium",weeks:3,reason:"Sub-50ms global latency is a product expectation; frontend devs owning edge logic are rare and valued",surge:false,pct:0}]},
        "devops":            {growth:"22%",gaps:[{skill:"Kubernetes (CKA level)",demand:"High",weeks:6,surge:true,pct:58,reason:"Container orchestration is table stakes — job postings requiring K8s up 58% YoY, yet supply of certified engineers is low"},{skill:"Platform Engineering",demand:"High",weeks:8,surge:true,pct:83,reason:"Internal Developer Platforms (IDPs) are the #1 DevOps investment in 2026 — demand for IDP builders is growing fastest in the market"},{skill:"OpenTelemetry / SLOs",demand:"High",weeks:4,surge:true,pct:44,reason:"Observability-first teams reduce MTTR by 40% — companies are hiring engineers who own SLO definitions"}],emerging:[{skill:"FinOps",demand:"Medium",weeks:3,reason:"Cloud cost optimization now sits under DevOps remit at 62% of mid-market companies",surge:false,pct:0},{skill:"Wasm / Serverless Edge",demand:"Medium",weeks:5,reason:"Next deployment boundary after containers — early expertise gives significant lead time",surge:false,pct:0}]},
        "machine learning":  {growth:"28%",gaps:[{skill:"MLOps / Model Deployment",demand:"High",weeks:6,surge:true,pct:74,reason:"93% of ML models never reach production — companies are urgently hiring for deployment and monitoring expertise"},{skill:"LLM Fine-tuning / PEFT",demand:"High",weeks:5,surge:true,pct:120,reason:"Demand for LLM engineers has grown 120% in 12 months; LoRA and QLoRA knowledge is a hard differentiator"},{skill:"Vector Databases",demand:"High",weeks:3,surge:true,pct:89,reason:"RAG architectures require Pinecone/Weaviate/pgvector expertise — now listed in 47% of ML job postings"}],emerging:[{skill:"Multimodal AI",demand:"Medium",weeks:7,reason:"Vision-language models moving from research to product — gap in practitioners who can deploy them",surge:false,pct:0},{skill:"AI Evaluation / Red-teaming",demand:"Medium",weeks:4,reason:"Safety and evaluation engineering is a fast-growing specialty as enterprises adopt LLMs in critical workflows",surge:false,pct:0}]},
        "cybersecurity":     {growth:"25%",gaps:[{skill:"Cloud Security (AWS/GCP)",demand:"High",weeks:5,surge:true,pct:62,reason:"Cloud misconfigurations are responsible for 82% of breaches — every security team is hiring for cloud-native defense"},{skill:"Threat Intelligence",demand:"High",weeks:6,surge:true,pct:48,reason:"SOC teams are moving from reactive to proactive — TI analysts command 30% salary premium over general analysts"},{skill:"AppSec / SAST/DAST",demand:"High",weeks:5,surge:true,pct:55,reason:"Shift-left security means developers need AppSec skills — security engineers who can code are the most in-demand"}],emerging:[{skill:"AI Security",demand:"Medium",weeks:4,reason:"LLM prompt injection and adversarial attacks are a new attack surface that few practitioners understand",surge:false,pct:0},{skill:"Zero Trust Architecture",demand:"Medium",weeks:5,reason:"Enterprise network perimeter is dead — ZTA design is now a standard requirement for senior security architects",surge:false,pct:0}]},
        "full stack developer":{growth:"18%",gaps:[{skill:"System Design & Architecture",demand:"High",weeks:6,surge:true,pct:52,reason:"Full-stack engineers are expected to own end-to-end architecture decisions — this is the #1 screener at growth companies"},{skill:"CI/CD & DevOps Basics",demand:"High",weeks:4,surge:true,pct:47,reason:"Full-stack roles now expect engineers to ship independently — teams filter for candidates who can manage deployments"},{skill:"Database Optimization",demand:"High",weeks:5,surge:true,pct:41,reason:"N+1 query problems and slow APIs are traced back to full-stack engineers — DB tuning is a hard expectation at senior level"}],emerging:[{skill:"Edge Functions / Serverless",demand:"Medium",weeks:3,reason:"Vercel and Cloudflare workers are becoming standard for full-stack apps — early expertise is a competitive moat",surge:false,pct:0},{skill:"WebSockets / Real-time",demand:"Medium",weeks:4,reason:"Product teams building collaborative or live-update features need full-stack engineers who own the real-time layer",surge:false,pct:0}]},
        "aws cloud":          {growth:"31%",gaps:[{skill:"AWS Solutions Architecture",demand:"High",weeks:7,surge:true,pct:84,reason:"AWS SA certifications correlate directly with a 35% salary premium — demand far outpaces certified supply"},{skill:"Infrastructure as Code (CDK/Terraform)",demand:"High",weeks:5,surge:true,pct:69,reason:"Manual console deployments are rejected at enterprise teams — IaC is table stakes for AWS engineers in 2026"},{skill:"Cost Optimization & FinOps",demand:"High",weeks:4,surge:true,pct:58,reason:"AWS spend is the #1 engineering budget concern — engineers who reduce cloud costs are directly tied to business impact"}],emerging:[{skill:"Serverless at Scale (Lambda/EventBridge)",demand:"Medium",weeks:4,reason:"Event-driven architectures are replacing monolithic APIs — AWS engineers who own the async layer are in high demand",surge:false,pct:0},{skill:"Amazon Bedrock / GenAI on AWS",demand:"Medium",weeks:5,reason:"AWS GenAI services are being adopted at scale — engineers who can deploy RAG pipelines on Bedrock are rare",surge:false,pct:0}]},
        "azure cloud":        {growth:"28%",gaps:[{skill:"Azure Architecture & AZ-305",demand:"High",weeks:7,surge:true,pct:71,reason:"AZ-305 certified architects earn 40% more — demand is growing faster than Microsoft can certify new engineers"},{skill:"Azure Kubernetes Service (AKS)",demand:"High",weeks:6,surge:true,pct:63,reason:"Enterprise containerization on Azure is accelerating — AKS expertise is listed in 58% of Azure engineer job postings"},{skill:"Azure DevOps & Pipelines",demand:"High",weeks:4,surge:true,pct:55,reason:"Microsoft shops standardize on Azure DevOps for CI/CD — engineers who own pipeline design are promoted faster"}],emerging:[{skill:"Azure OpenAI Service",demand:"Medium",weeks:4,reason:"Enterprise LLM deployments on Azure are growing 300% YoY — early expertise commands significant salary premium",surge:false,pct:0},{skill:"Azure Data Factory & Synapse",demand:"Medium",weeks:5,reason:"Cloud-native ETL is replacing on-prem pipelines in Microsoft-aligned enterprises",surge:false,pct:0}]},
        "medical coding":     {growth:"14%",gaps:[{skill:"ICD-10-CM Specificity",demand:"High",weeks:5,surge:true,pct:58,reason:"Specificity errors are the #1 audit finding — payers are increasingly auditing for under-coded diagnoses costing providers millions"},{skill:"HCC Coding for Risk Adjustment",demand:"High",weeks:6,surge:true,pct:72,reason:"Value-based care contracts make HCC accuracy directly tied to revenue — demand for HCC specialists has grown 72% in 3 years"},{skill:"CPT Procedure Coding Accuracy",demand:"High",weeks:4,surge:true,pct:43,reason:"Procedure code errors trigger payer audits and clawbacks — certified coders with high CPT accuracy are hard to find"}],emerging:[{skill:"AI-Assisted Coding (CAC Tools)",demand:"Medium",weeks:3,reason:"Computer-assisted coding is being adopted in 65% of health systems — coders who can validate AI outputs earn more",surge:false,pct:0},{skill:"Telehealth Coding",demand:"Medium",weeks:2,reason:"Telehealth encounters require distinct modifier knowledge — post-pandemic demand is permanently elevated",surge:false,pct:0}]},
        "embedded engineer":  {growth:"16%",gaps:[{skill:"RTOS & Real-Time Design",demand:"High",weeks:6,surge:true,pct:61,reason:"FreeRTOS and Zephyr expertise is required in 67% of embedded job postings — most candidates lack formal RTOS training"},{skill:"Low-Level C & Memory Management",demand:"High",weeks:7,surge:true,pct:54,reason:"Memory leaks and undefined behavior in embedded C are the root cause of most field failures — depth here directly signals seniority"},{skill:"Communication Protocols (I2C/SPI/CAN)",demand:"High",weeks:5,surge:true,pct:48,reason:"Multi-peripheral designs require protocol fluency — embedded engineers who can debug at the bit level are rare and valued"}],emerging:[{skill:"RISC-V Architecture",demand:"Medium",weeks:5,reason:"RISC-V adoption in commercial SoCs is accelerating — early expertise is a 3-5 year competitive advantage",surge:false,pct:0},{skill:"Embedded Security (TrustZone/ATECC)",demand:"Medium",weeks:6,reason:"IoT security requirements are tightening globally — secure boot and hardware attestation expertise is increasingly required",surge:false,pct:0}]},
        "data engineer":     {growth:"26%",gaps:[{skill:"Apache Spark (PySpark)",demand:"High",weeks:6,surge:true,pct:41,reason:"Large-scale data transformation is impossible without distributed compute — Spark remains the industry standard"},{skill:"dbt + Modern Data Stack",demand:"High",weeks:4,surge:true,pct:78,reason:"dbt has redefined the DE/Analytics Engineer boundary — job postings requiring dbt up 78% in 2025"},{skill:"Real-time Pipelines (Kafka/Flink)",demand:"High",weeks:7,surge:true,pct:53,reason:"Batch-first architectures are being retired — companies building event-driven systems need streaming expertise urgently"}],emerging:[{skill:"Iceberg / Delta Lake",demand:"Medium",weeks:5,reason:"Open table formats are replacing proprietary data warehouses — early expertise is a competitive moat",surge:false,pct:0},{skill:"Data Contracts",demand:"Medium",weeks:3,reason:"Data quality is now an ownership problem — engineers who can define and enforce contracts across teams are valued",surge:false,pct:0}]},
        "dba":               {growth:"20%",gaps:[{skill:"Query Optimisation & EXPLAIN Plans",demand:"High",weeks:5,surge:true,pct:61,reason:"Slow query diagnosis is the #1 DBA interview screener — companies report 80% of candidates cannot interpret EXPLAIN output correctly"},{skill:"High Availability & Replication",demand:"High",weeks:6,surge:true,pct:74,reason:"Zero-downtime architecture is a baseline enterprise requirement — DBA job postings requiring HA/DR expertise up 74% in 2025"},{skill:"Performance Tuning & Index Strategy",demand:"High",weeks:4,surge:true,pct:48,reason:"Poorly indexed tables cost companies millions in cloud costs — DBA candidates who can reduce query time by >70% are rare and valued"}],emerging:[{skill:"Cloud-Native Databases (Aurora/Spanner)",demand:"Medium",weeks:5,reason:"On-prem DBA roles are declining while cloud DB roles grow — AWS Aurora and Google Spanner expertise commands 40% salary premium",surge:false,pct:0},{skill:"Database DevOps / GitOps Migrations",demand:"Medium",weeks:4,reason:"Liquibase and Flyway-based schema migration is now table-stakes at companies with CI/CD pipelines — DBAs who own this are promoted faster",surge:false,pct:0}]},
        "vlsi engineer":      {growth:"19%",gaps:[{skill:"SystemVerilog & UVM Verification",demand:"High",weeks:7,surge:true,pct:68,reason:"Verification engineers are the scarcest talent in semiconductor — 78% of VLSI job postings require SystemVerilog+UVM"},{skill:"Static Timing Analysis (STA)",demand:"High",weeks:5,surge:true,pct:54,reason:"Timing closure is the bottleneck in every tape-out schedule — STA expertise directly determines job offer speed"},{skill:"Physical Design (Floorplan/P&R)",demand:"High",weeks:8,surge:true,pct:61,reason:"Backend VLSI engineers who own full physical design flow are 3× harder to find than front-end RTL designers"}],emerging:[{skill:"RISC-V Custom Extensions",demand:"Medium",weeks:6,reason:"Fabless startups are betting on RISC-V — engineers who can add domain-specific ISA extensions are valued highly",surge:false,pct:0},{skill:"AI Chip Architecture",demand:"Medium",weeks:8,reason:"NPU and systolic array design experience is the fastest-growing sub-specialty in semiconductor hiring",surge:false,pct:0}]},
        "eee engineer":       {growth:"17%",gaps:[{skill:"Power Electronics (Inverters/Converters)",demand:"High",weeks:6,surge:true,pct:57,reason:"EV and renewable energy growth is driving massive demand for power electronics engineers — postings up 57% in 3 years"},{skill:"PLC & SCADA Programming",demand:"High",weeks:5,surge:true,pct:49,reason:"Industrial automation hiring is accelerating globally — 71% of electrical engineer roles in manufacturing require PLC skills"},{skill:"Protection Relay Coordination",demand:"High",weeks:6,surge:true,pct:44,reason:"Grid modernization projects require engineers who can design protection schemes — a shrinking talent pool commands salary premiums"}],emerging:[{skill:"Battery Management Systems (BMS)",demand:"Medium",weeks:5,reason:"EV and energy storage expansion is creating a shortage of BMS engineers — a 5-year growth trajectory",surge:false,pct:0},{skill:"Smart Grid & AMI",demand:"Medium",weeks:6,reason:"Utility digital transformation is creating demand for engineers who can integrate metering, SCADA, and communication systems",surge:false,pct:0}]},
        "mechanical engineer": {growth:"14%",gaps:[{skill:"FEA / FEM Simulation (ANSYS/Abaqus)",demand:"High",weeks:6,surge:true,pct:52,reason:"Simulation-driven design is now the standard — mechanical engineers who rely only on hand calculations are passed over for design roles"},{skill:"GD&T & DFM Principles",demand:"High",weeks:4,surge:true,pct:46,reason:"Manufacturing tolerance stack-up errors are the #1 cause of cost overruns — GD&T fluency is the top screener in product company interviews"},{skill:"CFD Basics (Fluent/OpenFOAM)",demand:"High",weeks:7,surge:true,pct:38,reason:"Thermal and fluid simulation roles are growing in EV, aerospace, and HVAC — a significant skill gap exists in fresh graduates"}],emerging:[{skill:"Topology Optimization & Generative Design",demand:"Medium",weeks:5,reason:"Additive manufacturing is enabling designs that were impossible before — engineers who can optimize for 3D printing are rare and valued",surge:false,pct:0},{skill:"Digital Twin Development",demand:"Medium",weeks:7,reason:"IoT-connected product monitoring is requiring mechanical engineers to collaborate on real-time simulation models",surge:false,pct:0}]},
        "civil engineer":     {growth:"12%",gaps:[{skill:"Structural Analysis Software (ETABS/STAAD)",demand:"High",weeks:6,surge:true,pct:58,reason:"Manual calculation alone doesn't scale to complex structures — 82% of structural engineer job postings require software proficiency"},{skill:"BIM (Revit / Navisworks)",demand:"High",weeks:5,surge:true,pct:64,reason:"BIM adoption in construction is mandatory on all government projects above ₹50Cr — Revit fluency is the #1 hiring filter in infrastructure firms"},{skill:"AutoCAD Civil 3D / GIS Basics",demand:"High",weeks:4,surge:true,pct:41,reason:"Site design, grading, and drainage calculations are now done in Civil 3D — candidates who only know 2D AutoCAD are filtered out"}],emerging:[{skill:"Drone Surveying & Photogrammetry",demand:"Medium",weeks:3,reason:"UAV-based site surveys are 5× faster and cheaper than traditional methods — civil engineers who can process drone data are increasingly hired",surge:false,pct:0},{skill:"Sustainability & Green Building (LEED/GRIHA)",demand:"Medium",weeks:4,reason:"Green certification is a contractual requirement in new commercial projects — LEED credential adds 18-25% to civil engineer salaries",surge:false,pct:0}]},
        "pharmacy":           {growth:"11%",gaps:[{skill:"Clinical Pharmacology & Drug Interactions",demand:"High",weeks:6,surge:true,pct:43,reason:"Hospital pharmacists who can independently review prescriptions for interactions prevent adverse events — the most valued clinical skill"},{skill:"Regulatory Affairs (CDSCO/US FDA)",demand:"High",weeks:7,surge:true,pct:56,reason:"Pharmaceutical companies are hiring regulatory specialists urgently as global submission volumes grow — a rare skill set"},{skill:"Pharmacovigilance & ADR Reporting",demand:"High",weeks:5,surge:true,pct:48,reason:"Post-market surveillance requirements have tightened globally — pharmacovigilance roles have grown 48% in 4 years"}],emerging:[{skill:"Clinical Data Management (CDM)",demand:"Medium",weeks:6,reason:"CROs and pharma companies are digitizing clinical trials — pharmacists who cross-train in CDM are hired at premium",surge:false,pct:0},{skill:"Medical Writing (CTD/Dossier)",demand:"Medium",weeks:5,reason:"Regulatory dossier preparation is a bottleneck in drug approvals — medical writers with pharmacy backgrounds command 35% salary premium",surge:false,pct:0}]},
        "mba":                {growth:"15%",gaps:[{skill:"Financial Modelling (DCF/LBO)",demand:"High",weeks:6,surge:true,pct:62,reason:"Consulting and IB firms screen MBA candidates with modelling tests — candidates who cannot build a 3-statement model are rejected early"},{skill:"Data Analysis (SQL/Power BI)",demand:"High",weeks:5,surge:true,pct:74,reason:"Business decisions now require data fluency — MBAs who cannot pull and visualize their own data are at a significant disadvantage in the 2026 job market"},{skill:"Strategy Frameworks (Porter/BCG/McKinsey)",demand:"High",weeks:4,surge:true,pct:55,reason:"Case interview preparation is mandatory for consulting, PE, and corporate strategy roles — structural frameworks are the language of the profession"}],emerging:[{skill:"AI Strategy & Prompt Engineering",demand:"Medium",weeks:3,reason:"C-suite teams are hiring MBAs who can lead AI adoption — understanding LLM capabilities and limitations is a new leadership competency",surge:false,pct:0},{skill:"ESG & Sustainability Reporting",demand:"Medium",weeks:4,reason:"SEBI and EU mandates are making ESG reporting mandatory for listed companies — MBAs with sustainability expertise are in short supply",surge:false,pct:0}]},
        "default":           {growth:"13%",gaps:[{skill:"System Design",demand:"High",weeks:6,surge:true,pct:45,reason:"Cross-functional system thinking is the #1 gap in mid-level candidates across all technical roles"},{skill:"Cloud Architecture",demand:"High",weeks:5,surge:true,pct:52,reason:"Cloud-first is the default in 2026 — professionals without cloud knowledge face a hard ceiling"},{skill:"Data Literacy",demand:"High",weeks:4,surge:true,pct:38,reason:"Decision-making roles require proficiency with data — SQL and BI tools are baseline expectations across all domains"}],emerging:[{skill:"AI Tool Proficiency",demand:"Medium",weeks:3,reason:"Professionals who use AI to multiply output are hired and promoted faster — now a differentiation signal",surge:false,pct:0},{skill:"Technical Writing",demand:"Medium",weeks:4,reason:"Documentation and RFC writing correlate strongly with senior IC and staff-level promotion criteria",surge:false,pct:0}]},
      }
      // ── FIXED keyword matching — use normalizeDomain so same logic as radar ──
      const canonicalDomain = normalizeDomain(role)  // "Data Analyst", "Frontend", etc.
      const domainKey = {
        "Data Analyst":  "data analyst",
        "Full-Stack":    "full stack developer",
        "Frontend":      "frontend developer",
        "Backend":       "software engineer",
        "DevOps":        "devops",
        "DBA":           "dba",
      }[canonicalDomain] || (() => {
        // Extended keyword matching — covers all 35+ roles from roleConfig
        const rl2 = role.toLowerCase()
        if (rl2.includes("machine learn")||rl2.includes("ml ")||rl2.includes("ml_")||rl2.includes("data scien")||rl2.includes("ai engineer")) return "machine learning"
        if (rl2.includes("cyber")||rl2.includes("security")||rl2.includes("soc")||rl2.includes("appsec")) return "cybersecurity"
        if (rl2.includes("data eng")||rl2.includes("etl")||rl2.includes("pipeline")||rl2.includes("spark")) return "data engineer"
        if ((rl2.includes("aws")||rl2.includes("cloud eng")||rl2.includes("cloud arch"))&&!rl2.includes("azure")) return "aws cloud"
        if (rl2.includes("azure")) return "azure cloud"
        if (rl2.includes("medical cod")||rl2.includes("icd")||rl2.includes("cpt")||rl2.includes("medical billing")) return "medical coding"
        if (rl2.includes("vlsi")||rl2.includes("asic")||rl2.includes("analog")||rl2.includes("layout")||rl2.includes("rtl")||rl2.includes("physical design")) return "vlsi engineer"
        if (rl2.includes("embedded")||rl2.includes("firmware")||rl2.includes("fpga")||rl2.includes("rtos")||rl2.includes("microcontroller")) return "embedded engineer"
        if (rl2.includes("power eng")||rl2.includes("electrical")||rl2.includes("eee")||rl2.includes("power electron")||rl2.includes("control eng")||rl2.includes("instrumentation")) return "eee engineer"
        if (rl2.includes("mechanical")||rl2.includes("thermal")||rl2.includes("manufacturing eng")||rl2.includes("fluid mech")||rl2.includes("cad")||rl2.includes("design eng")) return "mechanical engineer"
        if (rl2.includes("civil")||rl2.includes("structural")||rl2.includes("geotechnical")||rl2.includes("water resource")||rl2.includes("transportation eng")||rl2.includes("construction eng")||rl2.includes("site eng")) return "civil engineer"
        if (rl2.includes("pharma")||rl2.includes("clinical pharm")||rl2.includes("drug")) return "pharmacy"
        if (rl2.includes("mba")||rl2.includes("business analyst")||rl2.includes("management")||rl2.includes("strategy")||rl2.includes("consultant")) return "mba"
        if (rl2.includes("android")||rl2.includes("ios")||rl2.includes("mobile dev")||rl2.includes("flutter")||rl2.includes("react native")) return "full stack developer"
        if (rl2.includes("iot")||rl2.includes("hardware")||rl2.includes("rf eng")||rl2.includes("ece")) return "embedded engineer"
        return "default"
      })()
      const d = roleMap[domainKey] || roleMap["default"]

      // ── Build user skill map from actual skillGraph (case-insensitive) ──
      const userSkillMap = {}
      rawSG.forEach(s => {
        const key = (s.label || s.skill || "").toLowerCase().replace(/[^a-z0-9 ]/g, "")
        userSkillMap[key] = s.value || s.score || 0
      })

      // Helper: look up user score for a gap skill by fuzzy match
      const getUserScore = (skillName) => {
        const key = skillName.toLowerCase().replace(/[^a-z0-9 ]/g, "")
        const words = key.split(/\s+/).filter(w => w.length >= 3)
        // Exact match first
        if (userSkillMap[key] != null) return userSkillMap[key]
        // Substring / partial match
        for (const [uk, uv] of Object.entries(userSkillMap)) {
          if (words.some(w => uk.includes(w) || w.includes(uk.split(/\s+/)[0]))) return uv
        }
        return 0
      }

      // ── Compute urgentGaps: inject real user score into each gap ──
      const MARKET_NEED = 81   // market threshold for all "High" demand skills
      const urgentGaps = d.gaps
        .map(g => {
          const userScore = getUserScore(g.skill)
          return { ...g, weeksToLearn: g.weeks, surgePercent: g.pct, userScore }
        })
        .filter(g => g.userScore < 70)   // skip already-mastered skills
        .sort((a, b) => (b.pct || 0) - (a.pct || 0))   // highest surge first

      const emerging = d.emerging.map(g => ({
        ...g,
        weeksToLearn: g.weeks,
        surgePercent: g.pct || 0,
        userScore: getUserScore(g.skill),
      }))

      // ── "You Have" = domain skills where user score > 40 ──
      // Use roleConfig.resolveAuraSkills for accurate, role-specific skill list
      const domainSkillsForGap = resolveAuraSkills(role).length > 0
        ? resolveAuraSkills(role)
        : (domainSkillsMap[canonicalDomain] || [])
      const youHave = domainSkillsForGap
        .map(skill => ({ skill, score: getUserScore(skill) }))
        .filter(s => s.score > 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(s => ({
          skill: s.skill,
          demand: "High",
          userScore: s.score,
          reason: `Your ${s.skill} score is ${s.score}% — above the 40% entry threshold for ${role} roles`,
        }))
      if (youHave.length === 0) {
        youHave.push({ skill: "Profile Completeness", demand: "High", userScore: 40,
          reason: "Profile completeness is itself a recruiter signal — fill out your Aura profile to get found" })
      }

      // ── Overall market readiness from domain skills only (not full skillGraph) ──
      const domainScores = domainSkillsForGap.map(s => getUserScore(typeof s === "string" ? s : s.skill || s))
      const avgScore = domainScores.length
        ? Math.round(domainScores.reduce((a, b) => a + b, 0) / domainScores.length)
        : (rawSG.length ? Math.round(rawSG.reduce((a, s) => a + (s.value || s.score || 0), 0) / rawSG.length) : 0)
      const marketAvg = 63
      const topGap = urgentGaps[0] || d.gaps[0]
      const topGapUserScore = urgentGaps[0]?.userScore ?? getUserScore(d.gaps[0]?.skill || "")
      const competitiveIn = urgentGaps.length > 0
        ? urgentGaps[0].weeksToLearn + urgentGaps.length * 2 : 4

      return {
        marketDemand: `The ${role} market is growing ${d.growth} YoY. Hiring managers list ${d.gaps[0]?.skill} and ${d.gaps[1]?.skill} as the #1 unmet skills in candidates. Your profile has ${rawSG.length} assessed skills — here is exactly where you stand vs what the market needs.`,
        urgentGaps,
        emerging,
        youHave,
        competitiveIn,
        topAction: `Bridge your biggest gap first: ${topGap?.skill} — you're at ${topGapUserScore}% but the market needs ${MARKET_NEED}%. That's a ${MARKET_NEED - topGapUserScore}-point gap closable in ${topGap?.weeks || 4} weeks.`,
        _meta: { yourAvg: avgScore, marketAvg, role },
      }
    }

    // ── Try live API first (Gemini + Google Search) ──────────────────────────
    try {
      const res = await fetch(`${API}/api/skill-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: role,
          keyword: role,
          elo: userData?.eloRating || (userData?.path==='professional'||userData?.path==='authority' ? 800 : 400),
          path: userData?.path || "student",
        }),
      })
      if (res.ok) {
        const liveData = await res.json()

        // ── Validate: strip "Not provided" / empty placeholders from Gemini/Groq ──
        const isValidSkill = (g) => {
          const s = (g?.skill || "").trim()
          return s.length > 1 && s !== "Not provided" && !s.startsWith("<") && s !== "string"
        }
        const validGaps     = (liveData.gaps     || []).filter(isValidSkill)
        const validEmerging = (liveData.emerging  || []).filter(isValidSkill)

        if (validGaps.length) {
          // ── Always generate localBase — it owns youHave, _meta, domain skills ──
          const localBase = generateMockSkillGap()
          const MARKET_NEED = 81

          // ── Build getUserScore directly from skillGraph (case-insensitive fuzzy) ──
          // NEVER use localBase.urgentGaps for score lookup — localBase only keeps
          // skills the user is already WEAK at (< 70), so strong skills are absent.
          const sgMap = {}
          rawSG.forEach(s => {
            const key = (s.label || s.skill || "").toLowerCase().replace(/[^a-z0-9 ]/g, "")
            if (key) sgMap[key] = s.value || s.score || 0
          })
          const getScore = (skillName) => {
            const key = (skillName || "").toLowerCase().replace(/[^a-z0-9 ]/g, "")
            const words = key.split(/\s+/).filter(w => w.length >= 3)
            if (sgMap[key] != null) return sgMap[key]
            for (const [uk, uv] of Object.entries(sgMap)) {
              if (words.some(w => uk.includes(w) || w.includes(uk.split(/\s+/)[0]))) return uv
            }
            return 0
          }

          // ── Build urgentGaps: live skill metadata + real user scores ──
          const urgentGaps = validGaps
            .map(g => ({ ...g, weeksToLearn: g.weeks || 4, surgePercent: g.pct || 0, userScore: getScore(g.skill) }))
            .filter(g => g.userScore < 70)          // only show actual gaps
            .sort((a, b) => (b.surgePercent || 0) - (a.surgePercent || 0))

          // ── Build emerging: live metadata + real user scores ──
          const emerging = validEmerging.map(g => ({
            ...g, weeksToLearn: g.weeks || 4, surgePercent: g.pct || 0, userScore: getScore(g.skill),
          }))

          // ── Recompute topAction and competitiveIn from actual final urgentGaps ──
          const finalUrgent = urgentGaps.length ? urgentGaps : localBase.urgentGaps
          const topGap = finalUrgent[0]
          const competitiveIn = finalUrgent.length > 0
            ? (finalUrgent[0].weeksToLearn || 4) + finalUrgent.length * 2 : 4
          const topAction = topGap
            ? `Bridge your biggest gap first: ${topGap.skill} — you're at ${topGap.userScore}% but the market needs ${MARKET_NEED}%. That's a ${MARKET_NEED - topGap.userScore}-point gap closable in ${topGap.weeksToLearn || 4} weeks.`
            : localBase.topAction

          // ── Build marketDemand string from live data ──
          const marketDemandStr = liveData.marketDemand && liveData.marketDemand.length > 20
            ? `Live market data (Google Search): ${liveData.marketDemand} ${liveData.cached ? "(cached 6h)" : "(live)"} — your profile has ${rawSG.length} assessed skills.`
            : `Live market data (Google Search): ${role} roles growing ${liveData.growth || "~15%"} YoY. ${liveData.marketSignals?.[0] || ""} ${liveData.cached ? "(cached 6h)" : "(live)"} — your profile has ${rawSG.length} assessed skills.`

          setSkillGapData({
            ...localBase,                               // youHave, _meta from local (user-profile-aware)
            urgentGaps: finalUrgent,
            emerging:   emerging.length ? emerging : localBase.emerging,
            competitiveIn,
            topAction,
            marketDemand: marketDemandStr,
            _meta: { ...localBase._meta, live: true, cached: liveData.cached },
          })
          setSkillGapLoading(false)
          return
        }
      }
    } catch (liveErr) {
      console.warn("[skill-gap] Live API failed, using local data:", liveErr.message)
    }

    // ── Fallback: use accurate local domain data ──────────────────────────────
    setSkillGapData(generateMockSkillGap())
    setSkillGapLoading(false)
  }

  // Auto-trigger skill gap analysis when tab opens — always re-run so it picks up latest skillGraph
  useEffect(()=>{
    if(activeTab==="skillgap"&&!skillGapLoading) {
      fetchSkillGap()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[activeTab])

  // ========== GITHUB CODE DNA ==========
  // BUG FIX (2026-08-04): this used to silently swap in fabricated per-username
  // stats (generateExampleGithubData below) on ANY failure — network error, 404,
  // rate limit, even a genuine parse bug — and cleared githubError so the fake
  // card looked identical to a real one. That's a real trust problem: a user
  // could believe their own fabricated-looking "authenticity score" was real.
  // Now: real failures show a real error. The example generator still exists,
  // but only fires when the user explicitly clicks "Show me an example" — and
  // the resulting card is visibly marked as example data (isExampleData flag,
  // rendered as a banner in the Code DNA tab), never silently substituted.
  const generateExampleGithubData=(username)=>{
    const hash=(str)=>{let h=0;for(let i=0;i<str.length;i++) h=((h<<5)-h)+str.charCodeAt(i);return Math.abs(h)}
    const seed=hash(username)
    const langOptions=["JavaScript","TypeScript","Python","Java","Go","Rust","C#","Swift"]
    const topLangs=[...new Set(Array(4).fill().map((_,i)=>langOptions[(seed+i*3)%langOptions.length]))]
    const langPcts=topLangs.map((lang,i)=>{const pct=i===0?Math.floor(35+(seed%25)):i===1?Math.floor(25+(seed%15)):i===2?Math.floor(15+(seed%10)):10;return {lang,pct}})
    const authScore=Math.floor(65+(seed%35))
    return {
      isExampleData:true,
      username,
      avatar:`https://github.com/${username}.png`,
      bio:`${topLangs[0]} developer focused on clean architecture and open source`,
      publicRepos:Math.floor(12+(seed%60)),
      followers:Math.floor(3+(seed%250)),
      totalCommits:Math.floor(150+(seed%1000)),
      languages:langPcts,
      topRepos:[
        {name:`${username}/main-project`,stars:Math.floor(8+(seed%80)),forks:Math.floor(3+(seed%25)),url:`https://github.com/${username}`,desc:`Core ${topLangs[0]} project with clean architecture`,lang:topLangs[0],updated:"3 days ago"},
        {name:`${username}/utils-lib`,stars:Math.floor(4+(seed%40)),forks:Math.floor(1+(seed%15)),url:`https://github.com/${username}`,desc:`Utility library for ${topLangs[1]} projects`,lang:topLangs[1],updated:"last week"},
        {name:`${username}/experiments`,stars:Math.floor(2+(seed%20)),forks:Math.floor(1+(seed%8)),url:`https://github.com/${username}`,desc:"Experimental code and learning exercises",lang:topLangs[2]||topLangs[0],updated:"2 weeks ago"},
      ],
      fingerprint:{
        authenticityScore:authScore,
        fingerprintTitle:authScore>=80?`${topLangs[0]} Architect`:authScore>=65?`${topLangs[0]} Practitioner`:`${topLangs[0]} Developer`,
        dna:`Example only — not your real data. A profile like this would show a consistent focus on ${topLangs[0]} with growing expertise in ${topLangs[1]}.`,
        patterns:["Regular commit cadence","Meaningful commit messages","Diverse project portfolio"],
        specialization:`${topLangs[0]} / ${topLangs[1]} specialist`,
        codingStyle:"Modular, well-structured code",
        verificationStatus:"Example data (unverified)",
        standoutFact:`Has ${Math.floor(5+(seed%15))} repositories with meaningful documentation.`
      }
    }
  }

  const showGithubExample = (urlOverride) => {
    const ghUrl=(urlOverride||githubUrl||"").trim()
    const username=ghUrl.split("github.com/").pop()?.split("/")[0]?.replace(/[^a-zA-Z0-9-_]/g,"")||"example-user"
    setGithubError("")
    setGithubData(generateExampleGithubData(username))
  }

  // Basic caching: a real GitHub fetch persists into profiles.github_data
  // (see success branch below). If we already have a cached result for the
  // SAME username less than 12h old, reuse it instead of spending another
  // call against GitHub's unauthenticated 60-req/hr limit (shared across
  // every Capabilio user hitting this route unless GITHUB_TOKEN is set on
  // the server). forceRefresh bypasses this for the explicit Refresh action.
  const CACHE_TTL_MS = 12*60*60*1000
  const fetchGithubFingerprint = async (urlOverride, forceRefresh=false) => {
    const ghUrl=(urlOverride||githubUrl||userData?.githubUrl||userData?.personalInfo?.githubUrl||"").trim()
    if(!ghUrl){setGithubError("Please enter a GitHub profile URL"); return}
    if(!ghUrl.includes("github.com")){setGithubError("Please enter a valid GitHub profile URL (e.g. https://github.com/username)"); return}
    const username=ghUrl.replace(/.*github\.com\//,"").replace(/\/.*/,"").trim()

    if(!forceRefresh){
      const cached=userData?.githubData
      if(cached?.username?.toLowerCase()===username.toLowerCase() && cached?.analyzedAt){
        const age=Date.now()-new Date(cached.analyzedAt).getTime()
        if(age>=0 && age<CACHE_TTL_MS){ setGithubData(cached); setGithubError(""); return }
      }
    }

    setGithubLoading(true); setGithubError(""); setGithubVerifyMsg(null)
    try {
      const res=await fetch(`${API}/api/github/analyze`,{method:"POST",headers:await vHeaders(),body:JSON.stringify({githubUrl:ghUrl,keyword:userData?.keyword||"Developer"})})
      const ct=res.headers.get("content-type")||""
      const data=ct.includes("application/json") ? await res.json() : null
      if(!res.ok || !data || data.error){
        // 2026-09-03: this used to include the raw HTTP status code in the
        // message shown to the user (e.g. "server responded 502") — not a
        // secret, but exactly the kind of internal implementation detail
        // the design report's language rules say a normal user should
        // never see. The server's own `data.error` (when present) is
        // already written in plain, safe language — see routes/github.js.
        throw new Error(data?.error || "Unable to analyze GitHub right now. Please try again later.")
      }
      // 2026-08-05: same identity-mismatch check as resume upload, using
      // GitHub's own profile "name" field (added server-side above). Many
      // GitHub users legitimately leave this blank or use a handle/company
      // name — data.name is null in those cases and namesLikelyMismatch
      // never flags a missing name, so this only triggers when GitHub DOES
      // have a real name set and it shares no token with the account name.
      const accountNameGh = userData?.displayName || userData?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || ""
      if (data.name && accountNameGh && namesLikelyMismatch(accountNameGh, data.name)) {
        const proceed = window.confirm(mismatchWarning("GitHub profile", accountNameGh, data.name))
        if (!proceed) { setGithubLoading(false); return }
      }
      const withMeta = { ...data, analyzedAt:new Date().toISOString() }
      setGithubData(withMeta)
      save({ githubUrl: ghUrl, githubData: withMeta })
    } catch(e) {
      console.error("[Code DNA] GitHub analysis failed:", e.message)
      setGithubError(e.message || "Something went wrong analysing this profile. Please try again.")
      setGithubData(null)
    }
    setGithubLoading(false)
  }

  // Loads the canonical connection/verification status proactively — shown
  // BEFORE the user ever clicks Verify, so the code and instructions are
  // never something they only discover by accident after a first "failed"
  // attempt. Re-fetched after every verify attempt so the displayed status
  // (connected/verified/username) always reflects the canonical source.
  const loadGhVerification = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/github/verification-code`, { headers: await vHeaders() })
      const data = await res.json().catch(() => null)
      if (res.ok && data) setGhVerification(data)
    } catch { /* non-fatal — instructions just stay hidden until it loads */ }
  }, [])
  useEffect(() => { loadGhVerification() }, [loadGhVerification])

  // Ownership verification: the user adds a deterministic code to their
  // GitHub bio, then we confirm it's there via the public API. The account
  // checked is ALWAYS the canonical github_connections identity — this
  // never sends a client-supplied githubUrl, and never depends on this
  // component's own local `githubUrl` (analyze-box) state, so it can never
  // be ambiguous about which account is being verified. On success the
  // backend updates github_connections (canonical) and best-effort syncs
  // proof_objects — the local `verified` flag below is just so the UI can
  // show "Verified" immediately without a full re-analyze.
  const verifyGithubOwnership = async () => {
    if (githubVerifying) return // belt-and-suspenders — the button is also disabled while true
    if (!ghVerification?.connected) { setGithubVerifyMsg({verified:false,message:"Connect your GitHub account first."}); return }
    setGithubVerifying(true)
    try {
      const res=await fetch(`${API}/api/github/verify-ownership`,{method:"POST",headers:await vHeaders()})
      const data=await res.json().catch(()=>({}))
      if(!res.ok) throw new Error(data?.error||"We couldn't verify GitHub ownership right now. Please try again.")
      setGithubVerifyMsg(data)
      if(data.verified) setGithubData(prev => prev ? {...prev, verified:true} : prev)
      await loadGhVerification()
    } catch(e) {
      setGithubVerifyMsg({verified:false, message:e.message})
    }
    setGithubVerifying(false)
  }

  // AI Repository Interview — lazily load a past result once we know which
  // GitHub profile is analyzed (real data only, never for example data).
  useEffect(() => {
    const uname = githubData?.username
    if (!uname || githubData?.isExampleData || riLoadedFor === uname) return
    setRiLoadedFor(uname)
    ;(async () => {
      try {
        const res = await fetch(`${API}/api/github/repo-interview`, { headers: await vHeaders() })
        const data = await res.json().catch(()=>({}))
        if (res.ok && data?.repoInterview) setRepoInterview(data.repoInterview)
      } catch (e) { console.error("[repo-interview] load failed:", e.message) }
    })()
  }, [githubData?.username, githubData?.isExampleData, riLoadedFor])

  // Cross-Verification — same lazy-load-once-per-username pattern as the
  // repo interview above.
  useEffect(() => {
    const uname = githubData?.username
    if (!uname || githubData?.isExampleData || cvLoadedFor === uname) return
    setCvLoadedFor(uname)
    ;(async () => {
      try {
        const res = await fetch(`${API}/api/github/cross-verify`, { headers: await vHeaders() })
        const data = await res.json().catch(()=>({}))
        if (res.ok) setCrossVerify(data)
      } catch (e) { console.error("[cross-verify] load failed:", e.message) }
    })()
  }, [githubData?.username, githubData?.isExampleData, cvLoadedFor])

  const startRepoInterview = async () => {
    setRiError(""); setRiGenerating(true); setRepoInterview(null)
    try {
      const res = await fetch(`${API}/api/github/repo-interview/generate`, { method:"POST", headers: await vHeaders() })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(data?.error || `Could not generate questions (${res.status})`)
      setRiQuestions(data.questions || [])
      setRiAnswers({}); setRiStep(0)
    } catch (e) { setRiError(e.message) }
    setRiGenerating(false)
  }

  const submitRepoInterview = async () => {
    if (!riQuestions?.length) return
    setRiSubmitting(true); setRiError("")
    try {
      const answers = riQuestions.map(q => ({ questionId: q.id, answer: riAnswers[q.id] || "" }))
      const repoName = githubData?.topRepos?.[0]?.name || ""
      const res = await fetch(`${API}/api/github/repo-interview/submit`, { method:"POST", headers: await vHeaders(), body: JSON.stringify({ repoName, questions: riQuestions, answers }) })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) throw new Error(data?.error || `Could not submit interview (${res.status})`)
      setRepoInterview(data.repoInterview)
      setRiQuestions(null); setRiAnswers({}); setRiStep(0)
    } catch (e) { setRiError(e.message) }
    setRiSubmitting(false)
  }

  // Derived data — resumeSkills must be declared before skillGraph uses it
  const resumeSkills=userData?.resumeSkills||[]
  const profileSkillGraph=(userData?.skillGraph||[]).filter(d=>d&&(d.label||d.skill)&&(d.label||d.skill)!=="undefined")
  // Merge in live, dynamically-updating per-skill data from completed Arena
  // missions (liveArenaSkillGraph, see the fetch effect above) — this is what
  // makes the radar move after a mission/assessment instead of staying frozen
  // at onboarding-time values. Live arena data wins per-skill (by label,
  // case-insensitive) since it's proof-backed and more recent; any skill only
  // present in the profile blob (e.g. resume-derived, never yet practiced in
  // Arena) is kept as-is.
  const rawSkillGraph = (() => {
    if (!liveArenaSkillGraph.length) return profileSkillGraph
    const liveByLabel = new Map(liveArenaSkillGraph.map(s => [(s.label || s.skill || "").toLowerCase(), s]))
    const merged = profileSkillGraph.map(s => {
      const key = (s.label || s.skill || "").toLowerCase()
      return liveByLabel.has(key) ? { ...s, ...liveByLabel.get(key) } : s
    })
    const mergedKeys = new Set(merged.map(s => (s.label || s.skill || "").toLowerCase()))
    liveArenaSkillGraph.forEach(s => {
      const key = (s.label || s.skill || "").toLowerCase()
      if (!mergedKeys.has(key)) merged.push(s)
    })
    return merged
  })()
  // If all scores are 0 (onboarding analysis fallback), derive initial scores from:
  // - years of experience (more exp → higher base)
  // - whether the skill appears in userData.skills list (present = practised)
  // - position in skills list (earlier = stronger)
  const allZero = rawSkillGraph.length > 0 && rawSkillGraph.every(s=>(s.value||s.score||0)===0)
  const skillGraph = (() => {
    if (rawSkillGraph.length > 0 && !allZero) return rawSkillGraph
    // Build from skills list if skillGraph is absent or all-zero
    const skillsList = userData?.skills || resumeSkills || []
    const expCount = (userData?.experiences||[]).length
    const baseScore = Math.min(65, 30 + expCount * 8) // more exp → higher starting score
    if (skillsList.length > 0) {
      return skillsList.slice(0, 10).map((s, i) => {
        // Earlier skills in list assumed stronger, decay slightly with index
        const score = Math.max(20, Math.round(baseScore - i * 4))
        return { label: s, skill: s, value: score, score }
      })
    }
    if (rawSkillGraph.length > 0) return rawSkillGraph // all-zero but nothing else to show
    return []
  })()
  const rawHistory=userData?.eloHistory||[]
  // ── Subscription plan ──
  const auraPlan        = getPlan(userData)
  const reportQuota     = auraPlan.marketReports        // free monthly reports included
  const reportPrice     = auraPlan.reportPrice          // ₹49 per extra
  const reportsUsed     = reportsUsedThisMonth(userData)
  const reportsLeft     = Math.max(0, reportQuota - reportsUsed)
  const reportFreeLeft  = reportsLeft > 0               // has an included report remaining
  // Role-based ELO floor: professional/authority → 800, student → 400
  const eloFloorDefault=(userData?.path==='professional'||userData?.path==='authority')?800:400
  // Treat stored 0 same as null — show role floor instead of zero on the dashboard
  const eloRating=(userData?.eloRating!=null&&userData.eloRating>0)?userData.eloRating:eloFloorDefault
  const eloHistory=rawHistory.filter(h=>h.elo!=null||h.delta!=null).map(h=>h.elo!=null?{...h,elo:Math.max(h.elo,eloFloorDefault)}:{...h,elo:eloRating,date:h.date||(h.ts||"").slice(0,10)})
  const keyword=userData?.keyword||userData?.job_role||userData?.target_role||""
  const path=userData?.path||"student"
  const personalInfo=userData?.personalInfo||{}

  // ── Dynamic strengths from skillGraph (top scored, >60%) ─────────────────
  // Falls back to stored userData.strengths if no arena history yet
  // Uses the already-merged rawSkillGraph (profile blob + live skill_graph
  // table) so Strengths/Areas-to-improve update from completed missions too,
  // not just the radar.
  const rawSkillGraphForStrengths = rawSkillGraph.filter(s=>s&&(s.label||s.skill))
  const dynamicStrengths = rawSkillGraphForStrengths
    .filter(s => (s.value||s.score||0) >= 60)
    .sort((a,b) => (b.value||b.score||0) - (a.value||a.score||0))
    .slice(0, 4)
    .map(s => `${s.label||s.skill} (${Math.round(s.value||s.score||0)}% proficiency)`)
  const strengths = dynamicStrengths.length > 0 ? dynamicStrengths : (userData?.strengths||[])

  // ── Dynamic weakAreas from skillGraph (bottom scored, <55%) + stored gaps ─
  const dynamicWeakAreas = rawSkillGraphForStrengths
    .filter(s => (s.value||s.score||0) > 0 && (s.value||s.score||0) < 55)
    .sort((a,b) => (a.value||a.score||0) - (b.value||b.score||0))
    .slice(0, 4)
    .map(s => s.label||s.skill)
  const weakAreas = dynamicWeakAreas.length > 0
    ? dynamicWeakAreas
    : (userData?.weakAreas||userData?.weaknesses||userData?.weak_areas||[])
  // Read both camelCase (onboarding write) and snake_case (arena update write)
  const arenaStreak=userData?.arenaStreak||userData?.arena_streak||0
  const arenaCompleted=userData?.arenaCompleted||userData?.arena_completed||arenaHistRows.length||0
  const jobReadiness=userData?.jobReadiness||0
  const score=userData?.score||"0/25"
  const resumeProjects=userData?.resumeProjects||[]
  const eloDecayToday=userData?.eloDecayToday||0
  const createdAt=userData?.createdAt?new Date(userData.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Today"
  const getEloTier=e=>e>=1400?{tier:"Expert",color:"#C0392B"}:e>=1200?{tier:"Advanced",color:T.green}:e>=1000?{tier:"Intermediate",color:T.blue}:{tier:"Beginner",color:T.indigo}
  const eloTier=getEloTier(eloRating)

  // ── Derive all analytics from Supabase arena_history rows ─────────────────
  // arenaHistRows: loaded from arena_history table, ordered ascending by completed_at.
  // This replaces userData.arenaSubmissions which was a Firebase-era in-profile field.
  const allSubsArr = arenaHistRows.map(h => ({
    taskId:      h.task_id,
    title:       h.title || "Challenge",
    score:       h.score       ?? 0,
    eloDelta:    h.elo_delta   ?? 0,
    eloGained:   h.elo_delta   ?? 0,
    submittedAt: h.completed_at || "",
    completedAt: h.completed_at || "",
    domain:         h.domain         || "",
    challenge_type: h.challenge_type || h.type || "",
    difficulty:  h.difficulty  || "Medium",
    feedback:    h.feedback    || "",
    scenario:    h.scenario    || "",
  }))
  const failedTasks=allSubsArr.filter(s=>(s.score||0)<60).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt))
  const passedTasks=allSubsArr.filter(s=>(s.score||0)>=60)
  const totalAttempts=allSubsArr.length
  const failRate=totalAttempts>0?Math.round((failedTasks.length/totalAttempts)*100):0
  const recoveryCount=passedTasks.filter(p=>{const pDate=new Date(p.submittedAt);return failedTasks.some(f=>new Date(f.submittedAt)<pDate)}).length
  const resilienceScore=Math.min(100,Math.round(((1-(failRate/100))*40)+(Math.min(recoveryCount,5)*10)+(Math.min(arenaStreak,5)*4)+(totalAttempts>0?Math.min(totalAttempts*3,20):0)))
  const resilienceLabel=resilienceScore>=80?"Iron Will":resilienceScore>=60?"Resilient":resilienceScore>=40?"Building Grit":resilienceScore>=20?"Early Stage":"No Data Yet"
  const resilienceColor=resilienceScore>=80?T.green:resilienceScore>=60?T.blue:resilienceScore>=40?T.amber:resilienceScore>=20?"#E67E22":T.ink4
  const cutoff30=new Date(Date.now()-30*24*60*60*1000).toISOString()
  const recentTasks=allSubsArr.filter(s=>s.submittedAt&&s.submittedAt>=cutoff30)
  const avgRecentScore=recentTasks.length?Math.round(recentTasks.reduce((a,s)=>a+(s.score||0),0)/recentTasks.length):0
  // Last active: use most recent submission date, fall back to arenaLastActive profile field
  const lastActiveStr=allSubsArr.length?allSubsArr[allSubsArr.length-1].completedAt:(userData?.arenaLastActive||userData?.arena_last_active||"")
  const daysSinceActive=lastActiveStr?Math.min(60,Math.floor((new Date()-new Date(lastActiveStr))/(1000*60*60*24))):14
  const streakBonus=Math.min(arenaStreak*5,30)
  const activityScore=Math.max(0,40-daysSinceActive*3)
  const momentumScore=Math.min(100,Math.round((avgRecentScore*0.4)+activityScore+streakBonus+(recentTasks.length*3)))
  const momentumForm=momentumScore>=80?{label:"Peak Form",color:T.green,icon:"🔥"}:momentumScore>=55?{label:"Active",color:T.indigo,icon:"⚡"}:momentumScore>=30?{label:"Cooling Down",color:T.amber,icon:"📉"}:{label:"Dormant",color:T.red,icon:"💤"}
  const _uid = user?.id || user?.uid || ""
  // Use UID as the URL slug — it always resolves via direct ID lookup in Portfolio.jsx.
  // Display a human-readable slug in the UI, but navigate to the reliable UID URL.
  const _mkSlug = s => (s||"").toLowerCase().trim()
    .replace(/[^a-z0-9]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")
  const _readableSlug = userData?.username
    || _mkSlug(userData?.display_name||userData?.displayName||"")
    || _uid
  // Actual link uses UID when no username set — guaranteed to work
  const portfolioSlug    = userData?.username || _uid
  const portfolioDisplay = _readableSlug   // shown in the UI URL bar
  // Use current origin so it works on localhost AND production
  const _portfolioBase   = window.location.origin + "/portfolio/"
  const portfolioUrl     = window.location.host + "/portfolio/" + portfolioDisplay
  const portfolioFullUrl = _portfolioBase + portfolioSlug
  const getCatIcon=c=>({Resume:"📄",Certification:"🏆",Badge:"🎖️",Project:"💻",Other:"📎"}[c]||"📎")
  const getCatColor=c=>({Resume:T.indigo,Certification:T.amber,Badge:T.green,Project:"#8E44AD",Other:T.ink4}[c]||T.indigo)
  const C=[T.indigo,T.green,"#E67E22","#8E44AD","#E74C3C","#16A085","#2980B9","#C0392B"]
  // Use keyword or fall back to "Software Developer" so skills are always role-specific
  const resolvedKeyword = keyword || userData?.job_role || userData?.target_role || getRoleConfig(userData).label
  const domainSkills = getSkillsForDomain(resolvedKeyword)

  // Build an augmented skill score map: skillGraph + Arena history scores
  // Arena submissions have tags/category — use their scores to fill in gaps
  const arenaScoreBySkill = {}
  arenaHistRows.forEach(h => {
    const tags = [...(h.skill_tags||[]), h.category].filter(Boolean)
    const score = h.score || 0
    if (score <= 0) return
    tags.forEach(tag => {
      const k = tag.toLowerCase()
      if (!arenaScoreBySkill[k]) arenaScoreBySkill[k] = { total: 0, count: 0 }
      arenaScoreBySkill[k].total += score
      arenaScoreBySkill[k].count += 1
    })
  })

  // User's actual skills from resume (or profile) — used in the Arena Practice Skills card
  const userActualSkills = (() => {
    const fromProfile = (userData?.skills || []).filter(Boolean)
    // Also pull skills from experiences (skills field on each exp)
    const fromExps = (userData?.experiences || []).flatMap(e =>
      Array.isArray(e.skills) ? e.skills : (e.skills ? String(e.skills).split(",").map(s=>s.trim()) : [])
    ).filter(Boolean)
    // Merge, deduplicate (case-insensitive), cap at 24
    const seen = new Set()
    return [...fromProfile, ...fromExps].filter(s => {
      const k = s.toLowerCase().trim()
      if (seen.has(k)) return false
      seen.add(k); return true
    }).slice(0, 24)
  })()

  // Domain-filtered radar: each axis is a real domain skill.
  // Score priority: skillGraph > Arena history avg > 0
  const domainSkillGraph = domainSkills.map(skill => {
    const dl = skill.toLowerCase().replace(/[^a-z0-9 ]/g, "")
    const dlWords = dl.split(/\s+/).filter(w => w.length >= 2)
    const match = rawSkillGraph.find(s => {
      const sl = (s.label || s.skill || "").toLowerCase().replace(/[^a-z0-9 ]/g, "")
      return sl === dl || dlWords.some(w => sl.includes(w) || w.includes(sl)) || dl.split(/\s+/)[0] === sl.split(/\s+/)[0]
    })
    // Also check Arena history scores for this skill
    const arenaEntry = dlWords.reduce((best, w) => {
      const found = Object.entries(arenaScoreBySkill).find(([k]) => k.includes(w) || w.includes(k))
      if (found) { const avg = Math.round(found[1].total / found[1].count); return avg > best ? avg : best }
      return best
    }, 0)
    const skillGraphScore = match ? Math.round(match.value || match.score || 0) : 0
    // Use whichever is higher — skillGraph updates from arena anyway, but this catches
    // cases where arena tags don't exactly match skill names
    return { label: skill, value: Math.max(skillGraphScore, arenaEntry) }
  })

  // Practice skill graph — uses ACTUAL user skills from resume/profile as the source list.
  // Falls back to domainSkillGraph when user has no extracted skills.
  const practiceSkillGraph = (() => {
    const sourceSkills = userActualSkills.length >= 3 ? userActualSkills : domainSkills
    return sourceSkills.map(skill => {
      const dl = skill.toLowerCase().replace(/[^a-z0-9 ]/g, "")
      const dlWords = dl.split(/\s+/).filter(w => w.length >= 2)
      const match = rawSkillGraph.find(s => {
        const sl = (s.label||s.skill||"").toLowerCase().replace(/[^a-z0-9 ]/g, "")
        return sl === dl || dlWords.some(w => sl.includes(w) || w.includes(sl))
      })
      const arenaEntry = dlWords.reduce((best, w) => {
        const found = Object.entries(arenaScoreBySkill).find(([k]) => k.includes(w) || w.includes(k))
        if (found) { const avg = Math.round(found[1].total / found[1].count); return avg > best ? avg : best }
        return best
      }, 0)
      const skillGraphScore = match ? Math.round(match.value || match.score || 0) : 0
      return { label: skill, value: Math.max(skillGraphScore, arenaEntry), _fromResume: userActualSkills.length >= 3 }
    })
  })()

  // Synthesize ELO history from arena_history rows (Supabase) when eloHistory is sparse.
  // One point PER EVENT (not collapsed by date) — carries title/type/domain
  // through so the timeline feed below can show the actual task name and an
  // Academic/Domain badge instead of a generic "Arena Challenge" fallback.
  // The sparkline still renders fine with multiple same-day points; this is
  // strictly more information than the old date-collapsed version.
  const eloHistoryDisplay = (() => {
    if (eloHistory.length >= 2) return eloHistory
    // arenaHistRows is ordered ASC by completed_at — use it to reconstruct trajectory
    const subs = arenaHistRows.filter(h => h.completed_at && h.elo_delta != null)
    if (subs.length === 0) return eloHistory
    // Reconstruct: work backwards from current ELO
    let runningElo = eloRating
    const points = []
    const rev = [...subs].reverse()
    rev.forEach(s => {
      points.unshift({
        date: (s.completed_at || "").slice(0, 10),
        elo: Math.max(runningElo, eloFloorDefault),
        delta: s.elo_delta,
        title: s.title,
        type: s.type,
        domain: s.domain,
      })
      runningElo = Math.max(runningElo - (s.elo_delta || 0), eloFloorDefault)
    })
    points.unshift({ date: (subs[0].completed_at || "").slice(0, 10), elo: Math.max(runningElo, eloFloorDefault) })
    if (points.length >= 2) return points
    // Fall through to baseline synthesis below
  })() || (() => {
    // Final fallback: user has ELO > floor but no reconstructable history.
    // Show a 2-point line: start date (or 14d ago) → today.
    if (eloRating <= eloFloorDefault) return []
    const todayStr = new Date().toISOString().slice(0, 10)
    const startStr = userData?.createdAt
      ? new Date(userData.createdAt).toISOString().slice(0, 10)
      : new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
    // If lastArenaDate exists use it as the actual task date
    const taskDateStr = userData?.lastArenaDate || todayStr
    const points = [
      { date: startStr, elo: eloFloorDefault },
      { date: taskDateStr, elo: eloRating },
    ]
    // If start and task date are the same, spread them a day apart visually
    if (points[0].date === points[1].date) {
      const prev = new Date(new Date(points[0].date).getTime() - 86400000)
      points[0].date = prev.toISOString().slice(0, 10)
    }
    return points.sort((a, b) => a.date.localeCompare(b.date))
  })()

  const fetchResilienceInsights = async () => {
    if(resilienceLoading||failedTasks.length===0) return
    setResLoading(true)
    const failSummary=failedTasks.slice(0,5).map(f=>`Task: ${f.taskTitle||"Arena Task"}, Score: ${f.score}%`).join("\n")
    const prompt=`Career coach analyzing failure patterns. Failures:\n${failSummary}\nResilience: ${resilienceScore}/100.\nReturn ONLY JSON:\n{"patterns":["p1","p2","p3"],"strengths":["s1","s2"],"coachAdvice":"2 sentence advice","weeklyChallenge":"one specific task","growthMindsetScore":${resilienceScore}}`
    try {
      const d=await fetch("https://capabilio-web.onrender.com/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})}).then(r=>r.json())
      const txt=(d.text||"").replace(/```json|```/g,"").trim()
      const s=txt.indexOf("{"),e=txt.lastIndexOf("}")+1
      setResilienceData(JSON.parse(txt.slice(s,e)))
    } catch(e) { console.warn(e) }
    setResLoading(false)
  }

  if (loading) return (
    <div style={{background:T.cream,flex:1,minHeight:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{display:"flex",gap:10,alignItems:"center",color:T.indigo,fontSize:15}}>
        <div style={{width:16,height:16,border:`2px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        Loading Aura...
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ─── COVER PHOTO & PROFILE HEADER (shared across dashboard) ────────────────
  const ProfileHeader = () => (
    <div style={{marginBottom:24,position:"relative"}}>
      {/* Cover Photo */}
      <div
        onMouseDown={e=>{if(!coverAdjust)return;setIsDraggingCover(true);setDragStart({x:e.clientX-coverPosition.x*3,y:e.clientY-coverPosition.y*1.5})}}
        onMouseMove={e=>{if(!isDraggingCover)return;const nx=Math.max(0,Math.min(100,(e.clientX-dragStart.x)/3));const ny=Math.max(0,Math.min(100,(e.clientY-dragStart.y)/1.5));setCoverPosition({x:nx,y:ny})}}
        onMouseUp={()=>{if(isDraggingCover){setIsDraggingCover(false);save({coverPosition})}}}
        onMouseLeave={()=>{if(isDraggingCover){setIsDraggingCover(false);save({coverPosition})}}}
        style={{height:180,borderRadius:20,overflow:"hidden",position:"relative",
          cursor:coverAdjust?"grab":"default",
          background:userData?.coverPhotoUrl?"transparent":"linear-gradient(135deg,#FAF7F2 0%,#F5F5F5 40%,#2D3A5A 70%,#3D4EAC 100%)",
          border:`1px solid ${T.border}`,boxShadow:'0 4px 20px rgba(0,0,0,0.5)',userSelect:"none"}}>
        {userData?.coverPhotoUrl&&<img src={userData.coverPhotoUrl} alt="Cover" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:`${coverPosition.x}% ${coverPosition.y}%`,transition:isDraggingCover?"none":"object-position .3s",pointerEvents:"none"}}/>}
        {/* Pattern overlay */}
        {!userData?.coverPhotoUrl&&(
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.1}} viewBox="0 0 600 180">
            {[...Array(10)].map((_,i)=><circle key={i} cx={i*70+20} cy={90} r={40+i*5} fill="none" stroke="#fff" strokeWidth="0.5"/>)}
          </svg>
        )}
        {coverAdjust&&<div style={{position:"absolute",inset:0,background:"rgba(61,78,172,0.15)",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><div style={{background:"rgba(255,255,255,0.9)",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,color:T.indigo}}>↔️ Drag to reposition</div></div>}
        {/* Cover controls */}
        <div style={{position:"absolute",bottom:12,right:12,display:"flex",gap:8}}>
          {userData?.coverPhotoUrl&&(
            <button onClick={()=>setCoverAdjust(p=>!p)}
              style={{background:coverAdjust?"rgba(61,78,172,0.9)":"rgba(255,255,255,0.95)",border:`1px solid ${T.border}`,borderRadius:9,padding:"6px 12px",color:coverAdjust?"#fff":T.ink,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
              {coverAdjust?"✅ Save Position":"↔️ Adjust"}
            </button>
          )}
          <button onClick={()=>coverInputRef.current?.click()}
            style={{background:"rgba(255,255,255,0.95)",border:`1px solid ${T.border}`,borderRadius:9,padding:"6px 12px",color:T.ink,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
            {coverUploading?<><Spinner size={10}/>Uploading...</>:"📷 Change Cover"}
          </button>
        </div>
        <input ref={coverInputRef} type="file" style={{display:"none"}} onChange={handleCoverUpload} accept="image/*"/>
      </div>

      {/* Avatar */}
      <div style={{position:"absolute",left:28,top:130,zIndex:10}}>
        <div style={{position:"relative",width:76,height:76}}>
          <div style={{width:76,height:76,borderRadius:"50%",border:"3px solid #fff",overflow:"hidden",
            background:T.indigo,display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 4px 16px rgba(0,0,0,0.12)",cursor:"pointer"}}
            onClick={()=>avatarInputRef.current?.click()}>
            {userData?.avatarUrl
              ? <img src={userData.avatarUrl} alt="Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : <span style={{fontSize:30,color:"#fff",fontWeight:800}}>{(user.displayName||"U").charAt(0).toUpperCase()}</span>}
            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",transition:"background 0.2s",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.3)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"}>
              <span style={{fontSize:16,opacity:0}}>📷</span>
            </div>
          </div>
          <input ref={avatarInputRef} type="file" style={{display:"none"}} onChange={handleAvatarUpload} accept="image/*"/>
        </div>
      </div>

      {/* Info row */}
      <div style={{background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:16,padding:"16px 20px 16px 120px",
        marginTop:-20,boxShadow:T.shadow,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
            <h1 style={{fontSize:22,fontWeight:800,color:T.ink,margin:0}}>{userData?.displayName||userData?.display_name||user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split("@")[0]||"Your Name"}</h1>
            <Badge color={eloTier.color} bg={eloTier.color+"15"}>{eloTier.tier}</Badge>
            {/* BUG FIX: this whole header was never gated by path, so
                Arena-specific badges/stats ("No Arena challenges yet", "0
                Tasks") showed for professional users who have no reason to
                ever touch Arena. Gated to path!=="professional" like the rest
                of the Arena-coupled content removed earlier. */}
            {path!=="professional"&&arenaStreak>0&&<Badge color="#E67E22" bg="#FDF3E7">🔥 {arenaStreak}d</Badge>}
          </div>
          <div style={{fontSize:12,color:T.ink3,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {keyword
              ? <span style={{fontWeight:700,color:T.ink2,background:T.indigo+"12",padding:"2px 8px",borderRadius:6,border:`1px solid ${T.indigo}20`}}>{keyword}</span>
              : <span style={{fontWeight:600,color:T.amber,cursor:"pointer"}} onClick={()=>setActiveTab("settings")}>⚠ Set your role in Settings</span>
            }
            {keyword && <span style={{color:T.ink4}}>·</span>}
            {path!=="professional"&&(arenaCompleted > 0
              ? <span style={{color:T.green,fontWeight:600}}>{arenaCompleted} challenge{arenaCompleted>1?"s":""} completed</span>
              : <span style={{color:T.ink4}}>No Arena challenges yet</span>
            )}
            {path!=="professional"&&<span style={{color:T.ink4}}>·</span>}
            <span>Joined {createdAt}</span>
          </div>
        </div>
        {/* Stats row */}
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {(path==="professional" ? [
            {label:"Career Entries",value:experiences.length,color:T.indigo},
            {label:"Vault Docs",value:vaultFiles.length,color:T.amber},
            {label:"Certifications",value:(userData?.certifications||[]).length,color:T.green},
          ] : [
            {label:"ELO",value:eloRating,color:T.indigo},
            {label:"Tasks",value:arenaCompleted,color:T.green},
            {label:"Job Ready",value:jobReadiness+"%",color:T.amber},
          ]).map((s,i)=>(
            <div key={i} style={{textAlign:"center",minWidth:56}}>
              <div style={{fontSize:20,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:10,color:T.ink4,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Executive path: completely separate dashboard ──
  const isExecutive = userData?.path === "authority" || userData?.path === "institution" ||
    userData?.accountType === "authority" || userData?.accountType === "institution"

  if (isExecutive) {
    return <ExecutiveAura user={user} userData={userData} onNavigate={onNavigate} onNavigatePricing={onNavigatePricing} />
  }

  return (
    <div style={{
      background:`radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.12) 0%, transparent 55%), radial-gradient(ellipse at 75% 15%, rgba(99,102,241,0.08) 0%, transparent 50%), #FFFFFF`,
      flex:1, minHeight:0, overflowY:"auto", fontFamily:"'DM Sans',sans-serif", color:T.ink,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.07);border-radius:10px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .hover-card{transition:transform 0.25s cubic-bezier(.22,1,.36,1),box-shadow 0.25s!important}
        .hover-card:hover{transform:translateY(-3px)!important;box-shadow:0 8px 24px rgba(0,0,0,0.08),0 4px 12px rgba(0,0,0,0.3)!important}
      `}</style>

      {showExpModal&&<AddExperienceModal onSave={saveExperience} onClose={()=>{setShowExpModal(false);setEditingIdx(null)}} existing={editingIdx!==null?experiences[editingIdx]:null}/>}
      {showVideoGenerator&&<CareerVideoGenerator userData={userData} skillGraph={skillGraph} completedTasks={echoPitchCompletedTasks} experiences={experiences} onClose={()=>setShowVideoGenerator(false)}/>}
      <input ref={fileInputRef} type="file" style={{display:"none"}} onChange={handleUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip,.txt"/>
      <input ref={resumeFileInputRef} type="file" style={{display:"none"}} onChange={handleResumeUpload} accept=".pdf,.doc,.docx"/>

      {/* ── Internal Aura tab bar ─────────────────────────────── */}
      <div style={{position:"sticky",top:0,zIndex:80,background:"rgba(255,255,255,0.97)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,0.05)",overflowX:"auto",display:"flex",alignItems:"stretch",boxShadow:"0 4px 16px rgba(0,0,0,0.4)",scrollbarWidth:"none"}}>
        {(path === "professional" ? [
          // Professionals: profile management only — Career and Skills
          // intelligence live in their own standalone modules (Orbit.jsx /
          // Skills.jsx, both reachable from top-level nav).
          // REDESIGNED (2026-07-24): this used to be 6 tabs with real duplication —
          // "Vault" (pro-vault) was a bare VaultManagerPro that Career & Vault
          // already renders inline (upload, files grid, EPFO, certs, education);
          // "Skills" (the old skillgraph tab) and "Skill Gaps" (skillgap) were both
          // Arena-coupled ("Complete Forge & Arena tasks to earn verified scores",
          // arena-derived gap scoring) and duplicated what "Skill Graph Pro"
          // already does on the real user_skills table, Arena-free, with its own
          // built-in gap analysis. Removing all three leaves one clean set with
          // no dead ends for a user who has never touched Arena.
          // FOLLOW-UP (2026-07-24): the remaining "Career & Vault" and "Skills"
          // (pro-skills) tabs were themselves still duplicated — Orbit.jsx now
          // owns Career Timeline/verification-signal content and Skills.jsx
          // wraps the exact same SkillGraphView component this tab rendered
          // (previously imported here as SkillGraphPro). "Skills" is removed outright;
          // this tab is renamed "Vault" and scoped to documents/verification
          // only, which has no home in Orbit or Skills yet.
          // "AI Interview" removed from this bar 2026-07-25 (Tranche 1) —
          // moved to Launchpad ("Interview Prep" tab), see PROFESSIONAL_TAB_IDS
          // comment above.
          {id:"vault",        label:"Vault",             icon:"◫"},
          // 2026-07-29: AI Video (EchoPitch) — real evidence (proof_objects),
          // no Arena dependency, was previously student-dashboard-only.
          {id:"echopitch",    label:"AI Video",          icon:"🎬"},
        ] : [
          // Students + others: full tab set
          {id:"dashboard",  label:"Dashboard",    icon:"▦"},
          {id:"vault",      label:"Career & Vault",icon:"◫"},
          {id:"skillgraph", label:"Skills",        icon:"↗"},
          {id:"interview",  label:"AI Interview",  icon:"□"},
          {id:"skillgap",   label:"Skill Gaps",    icon:"⚡"},
          {id:"resilience", label:"Resilience",    icon:"💪"},
          {id:"fingerprint",label:"Code DNA",      icon:"🧬"},
          {id:"voucher",    label:"Voucher",        icon:"🎫"},
        ]).map(tab=>{
          const active=activeTab===tab.id
          return(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"10px 14px",border:"none",borderBottom:active?"2px solid #6366F1":"2px solid transparent",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:active?700:500,color:active?"#6366F1":"#6B6560",background:"transparent",transition:"all 0.15s",whiteSpace:"nowrap",flexShrink:0}}>
              <span style={{fontSize:12}}>{tab.icon}</span>{tab.label}
              {tab.id==="vault"&&vaultFiles.length>0&&<span style={{background:"#FF5701",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:100}}>{vaultFiles.length}</span>}
            </button>
          )
        })}
      </div>

      <div style={{maxWidth:1800,margin:"0 auto",padding:"32px 40px 60px",position:"relative",zIndex:1}}>

        {/* ═══════════ DASHBOARD TAB ═══════════ */}
        {activeTab==="dashboard"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>

            <ProfileHeader/>

            {/* Links row */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
              {personalInfo.linkedinUrl&&<a href={personalInfo.linkedinUrl} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:T.blue2,border:`1px solid rgba(21,101,192,0.2)`,borderRadius:8,color:T.blue,fontSize:11,fontWeight:600,textDecoration:"none"}}>🔗 LinkedIn</a>}
              {personalInfo.githubUrl&&<a href={personalInfo.githubUrl} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:T.cream2,border:`1px solid ${T.border}`,borderRadius:8,color:T.ink2,fontSize:11,fontWeight:600,textDecoration:"none"}}>🐙 GitHub</a>}
              {personalInfo.portfolioUrl&&<a href={personalInfo.portfolioUrl} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"rgba(142,68,173,0.08)",border:"1px solid rgba(142,68,173,0.2)",borderRadius:8,color:"#8E44AD",fontSize:11,fontWeight:600,textDecoration:"none"}}>🌐 Portfolio</a>}
            </div>

            {/* Subscription plan banner — path-aware, no hardcoded Arena references for professionals */}
            {(()=>{
              const isPro=path==="professional"
              const planLabel=auraPlan.label
              const planSub=isPro
                ? auraPlan.id==="free"
                  ? "1 Forge challenge/week · Skill Gap (basic) · No AI interviews"
                  : auraPlan.id==="orbit_pro"
                    ? `Unlimited Forge · ${auraPlan.marketReports} Skill Gap reports/mo · No AI interviews`
                    : `Unlimited Forge · Unlimited Skill Gap · ${auraPlan.interviewSessions} AI interviews/mo`
                : auraPlan.id==="free"
                  ? "1 daily mission · Basic ELO tracking · Community access"
                  : auraPlan.id==="pro"
                    ? `3 daily missions · ${auraPlan.interviewSessions} AI interview sessions/mo · ${auraPlan.marketReports} market report/mo`
                    : `6 daily missions · ${auraPlan.interviewSessions} AI interview sessions/mo · ${auraPlan.marketReports} market reports/mo`
              const isMaxPlan=auraPlan.id==="orbit_elite"||auraPlan.id==="elite"||auraPlan.id==="legacy"||auraPlan.id==="university"
              return(
                <div style={{marginBottom:16,borderRadius:14,padding:"14px 18px",background:auraPlan.colorBg,border:`1.5px solid ${auraPlan.color}30`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:10,background:auraPlan.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,fontWeight:900,flexShrink:0}}>
                      {isMaxPlan?"★":auraPlan.id==="free"?"○":"▲"}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:auraPlan.color}}>{planLabel} Plan</div>
                      <div style={{fontSize:11,color:T.ink3,marginTop:1}}>{planSub}</div>
                    </div>
                  </div>
                  {!isMaxPlan&&onNavigatePricing&&(
                    <button onClick={onNavigatePricing} style={{padding:"7px 16px",background:auraPlan.id==="free"?T.indigo:T.amber,border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                      {isPro
                        ? auraPlan.id==="free"?"Upgrade to Capabilio Pro →":"Upgrade to Capabilio Elite →"
                        : auraPlan.id==="free"?"Upgrade to Pro →":"Upgrade to Elite →"}
                    </button>
                  )}
                </div>
              )
            })()}

            {/* ── Today's Mission ticker — hides when user completes task today ── */}
            {path !== "professional" && (
              <MissionTicker userData={userData} keyword={keyword} onNavigate={onNavigate} />
            )}

            {/* ── First-time user onboarding card — hides after first Arena completion ── */}
            {arenaCompleted === 0 && path !== "professional" && (()=>{
              const role = getRoleConfig(userData)
              const workbenchName = role?.label ? `${role.label} Arena` : "Arena"
              const steps = [
                { n:"1", icon:"⚔️", title:`Complete your first ${workbenchName} challenge`, sub:"Solve a real coding challenge to earn your first ELO points and unlock your skill graph.", cta:"Go to Arena →", action:()=>onNavigate("arenaCollegeStream"), color:T.indigo, bg:T.indigo+"10", border:T.indigo+"30" },
                { n:"2", icon:"📄", title:"Upload your resume", sub:"We'll extract your skills, projects, and experience to populate your Aura profile automatically.", cta:"Upload Resume", action:()=>resumeFileInputRef.current?.click(), color:T.green, bg:T.green+"10", border:T.green+"30" },
                { n:"3", icon:"🔗", title:"Add your LinkedIn & GitHub", sub:"Connect your profiles so recruiters can verify your work and reach you directly.", cta:"Edit Profile →", action:()=>setActiveTab("vault"), color:"#E67E22", bg:"rgba(230,126,34,0.08)", border:"rgba(230,126,34,0.25)" },
              ]
              return (
                <div style={{marginBottom:20,borderRadius:16,border:`1.5px solid rgba(99,102,241,0.20)`,background:"linear-gradient(135deg,rgba(99,102,241,0.04),rgba(139,92,246,0.04))",overflow:"hidden"}}>
                  <div style={{padding:"16px 20px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid rgba(99,102,241,0.10)`}}>
                    <div style={{fontSize:18}}>🚀</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:T.ink,marginBottom:1}}>Welcome — here's what to do first</div>
                      <div style={{fontSize:11,color:T.ink3}}>3 quick steps to activate your Aura profile and start building your career record.</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0}}>
                    {steps.map((s,i)=>(
                      <div key={i} style={{padding:"14px 16px",borderRight:i<2?`1px solid rgba(99,102,241,0.10)`:"none",display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:22,height:22,borderRadius:"50%",background:s.color,color:"#fff",fontSize:10,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.n}</div>
                          <span style={{fontSize:16}}>{s.icon}</span>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:T.ink,lineHeight:1.35}}>{s.title}</div>
                        <div style={{fontSize:11,color:T.ink3,lineHeight:1.55,flex:1}}>{s.sub}</div>
                        <button onClick={s.action} style={{marginTop:4,padding:"6px 12px",background:s.bg,border:`1px solid ${s.border}`,borderRadius:8,color:s.color,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"left",width:"fit-content"}}>
                          {s.cta}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ELO + Momentum */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              {/* ELO History — redesigned */}
              <Card style={{background:"linear-gradient(145deg,#FAFBFF,#F0F4FF)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <SectionLabel color={T.indigo} style={{marginBottom:0}}>📈 ELO Rating History</SectionLabel>
                  <div style={{position:"relative",display:"inline-block"}} className="elo-tooltip-wrap">
                    <span style={{fontSize:10,color:T.indigo,fontWeight:700,cursor:"help",borderBottom:`1px dashed ${T.indigo}`,paddingBottom:1}}>What is ELO? ℹ</span>
                    <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",width:220,background:"#1A1A2E",color:"#E8E3DA",fontSize:11,lineHeight:1.6,padding:"10px 12px",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",zIndex:200,pointerEvents:"none",opacity:0,transition:"opacity 0.2s"}} className="elo-tooltip">
                      <strong style={{color:"#A5B4FC"}}>ELO</strong> is a skill rating system (borrowed from chess) that adjusts your score based on challenge difficulty and your performance.<br/><br/>
                      <span style={{color:"#86EFAC"}}>Higher score</span> = harder challenges mastered.<br/>
                      Starting ELO: <strong style={{color:"#FCD34D"}}>{eloRating} pts</strong> (derived from your baseline assessment).
                    </div>
                  </div>
                </div>
                <style>{`.elo-tooltip-wrap:hover .elo-tooltip{opacity:1!important}`}</style>
                <EloHistoryCard history={eloHistoryDisplay} currentElo={eloRating} eloDecayToday={eloDecayToday}/>
              </Card>

              {/* Career Momentum — redesigned with arc gauge */}
              <Card style={{position:"relative",overflow:"hidden",background:`linear-gradient(145deg,#FAFFFE,${momentumForm.color}08)`}}>
                {/* Decorative blobs */}
                <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:`radial-gradient(circle,${momentumForm.color}20,transparent)`,pointerEvents:"none"}}/>
                <div style={{position:"absolute",bottom:-30,left:-30,width:100,height:100,borderRadius:"50%",background:`radial-gradient(circle,${momentumForm.color}10,transparent)`,pointerEvents:"none"}}/>

                <SectionLabel color={momentumForm.color}>⚡ Career Momentum</SectionLabel>

                {/* Arc gauge + score */}
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                  {/* SVG Arc Gauge */}
                  <div style={{position:"relative",flexShrink:0}}>
                    {(()=>{
                      const R=52, cx=60, cy=64, sw=10
                      const startA = Math.PI * 0.75
                      const endA = Math.PI * 2.25
                      const total = endA - startA
                      const filled = total * (momentumScore/100)
                      // segments: 0-30 red, 30-55 amber, 55-80 blue, 80-100 green
                      const segs = [
                        {from:0,to:30,color:"#EF4444"},
                        {from:30,to:55,color:"#F59E0B"},
                        {from:55,to:80,color:"#3B82F6"},
                        {from:80,to:100,color:"#22C55E"},
                      ]
                      const arc = (pct1,pct2,color,isActive) => {
                        const a1 = startA + total*(pct1/100)
                        const a2 = startA + total*(pct2/100)
                        const x1=cx+R*Math.cos(a1),y1=cy+R*Math.sin(a1)
                        const x2=cx+R*Math.cos(a2),y2=cy+R*Math.sin(a2)
                        const large=a2-a1>Math.PI?1:0
                        return `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R},0,${large},1,${x2.toFixed(2)},${y2.toFixed(2)}`
                      }
                      const needle = startA + total*(momentumScore/100)
                      const nx=cx+(R-8)*Math.cos(needle), ny=cy+(R-8)*Math.sin(needle)
                      return (
                        <svg width={120} height={80} viewBox="0 0 120 80">
                          {/* Track */}
                          {segs.map((s,i)=>(
                            <path key={i} d={arc(s.from,s.to,s.color,false)}
                              fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round" opacity={0.15}/>
                          ))}
                          {/* Filled arc */}
                          {segs.map((s,i)=>{
                            const clampFrom = Math.min(s.from, momentumScore)
                            const clampTo = Math.min(s.to, momentumScore)
                            if(clampTo<=clampFrom) return null
                            return <path key={"f"+i} d={arc(clampFrom,clampTo,s.color,true)}
                              fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round"/>
                          })}
                          {/* Needle dot */}
                          {momentumScore>0&&<circle cx={nx.toFixed(2)} cy={ny.toFixed(2)} r={5} fill={momentumForm.color} stroke="#fff" strokeWidth={2}/>}
                          {/* Center score */}
                          <text x={cx} y={cy-6} textAnchor="middle" fontSize={22} fontWeight={900} fill={momentumForm.color} fontFamily="'DM Mono',monospace">{momentumScore}</text>
                          <text x={cx} y={cy+10} textAnchor="middle" fontSize={8} fill="#A8A29E" fontWeight={600}>/100</text>
                        </svg>
                      )
                    })()}
                  </div>
                  {/* Status + insight */}
                  <div style={{flex:1}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,background:`${momentumForm.color}18`,border:`1.5px solid ${momentumForm.color}35`,borderRadius:99,padding:"5px 12px",marginBottom:8}}>
                      <span style={{fontSize:14}}>{momentumForm.icon}</span>
                      <span style={{fontSize:12,fontWeight:800,color:momentumForm.color}}>{momentumForm.label}</span>
                    </div>
                    <div style={{fontSize:11,color:T.ink3,lineHeight:1.5}}>
                      {momentumScore>=80?"You're in peak form. Keep the streak alive — recruiters notice consistency."
                      :momentumScore>=55?"Good momentum. Push harder this week to unlock Peak Form."
                      :momentumScore>=30?"Momentum is cooling. Even 1 task today resets the trend."
                      :"No recent activity detected. Your ELO is at decay risk."}
                    </div>
                  </div>
                </div>

                {/* Signal bars: 3 contributing factors */}
                <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
                  {[
                    {label:"Activity Score",value:Math.max(0,40-daysSinceActive*3),max:40,icon:"📅",hint:daysSinceActive===0?"Active today":daysSinceActive+"d since last task"},
                    {label:"Avg Performance",value:Math.round(avgRecentScore*0.4),max:40,icon:"📊",hint:avgRecentScore+"% avg score (30d)"},
                    {label:"Streak Bonus",value:streakBonus,max:30,icon:"🔥",hint:arenaStreak+" day streak"},
                  ].map((f,i)=>(
                    <div key={i}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:10,color:T.ink3,fontWeight:600}}>{f.icon} {f.label}</span>
                        <span style={{fontSize:10,fontWeight:800,color:T.ink2}}>{f.value}<span style={{color:T.ink4,fontWeight:500}}>/{f.max}</span> · <span style={{color:T.ink4}}>{f.hint}</span></span>
                      </div>
                      <div style={{height:4,background:T.cream3,borderRadius:99}}>
                        <div style={{height:"100%",width:((f.value/f.max)*100)+"%",background:f.value/f.max>=0.75?T.green:f.value/f.max>=0.4?T.amber:T.red,borderRadius:99,transition:"width 1s ease"}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Compact stats row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    {label:"Tasks (30d)",value:recentTasks.length,icon:"✅"},
                    {label:"Avg Score",value:avgRecentScore+"%",icon:"📊"},
                    {label:"Last Active",value:!lastActiveStr?"—":daysSinceActive===0?"Today":daysSinceActive+"d ago",icon:"📅"},
                  ].map((s,i)=>(
                    <div key={i} style={{background:"rgba(255,255,255,0.7)",backdropFilter:"blur(4px)",borderRadius:10,padding:"9px",textAlign:"center",border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:13,marginBottom:2}}>{s.icon}</div>
                      <div style={{fontSize:15,fontWeight:900,color:T.ink}}>{s.value}</div>
                      <div style={{fontSize:9,color:T.ink4,marginTop:1,textTransform:"uppercase",fontWeight:600}}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Skill Health panel ── always visible ── */}
                {(()=>{
                  // Build skill health rows: weakest skills from skill graph, or fall back to weakAreas strings
                  const graphSkills = rawSkillGraphForStrengths
                    .filter(s => (s.value||s.score||0) > 0)
                    .sort((a,b)=>(a.value||a.score||0)-(b.value||b.score||0))
                    .slice(0,3)

                  // Colors by score bracket
                  const hColor = v => v < 40 ? "#EF4444" : v < 65 ? "#F59E0B" : "#22C55E"
                  const hLabel = v => v < 40 ? "Needs Work" : v < 65 ? "Improving" : "Strong"

                  // Fallback: show weak area strings if no graph data
                  const fallbackSkills = weakAreas.slice(0,3).map(s=>({label:s,score:null}))
                  const hasGraph = graphSkills.length > 0

                  // Days since each skill was last practiced (approximate via recentTasks domain match)
                  const recentDomains = new Set(recentTasks.map(t=>(t.domain||"").toLowerCase()))

                  return (
                    <div style={{marginTop:12,background:"rgba(255,255,255,0.6)",backdropFilter:"blur(4px)",border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                        <span style={{fontSize:10,fontWeight:700,color:T.ink3,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                          🧠 Skill Health
                        </span>
                        {hasGraph && (
                          <span style={{fontSize:9,color:T.ink4}}>from your skill graph</span>
                        )}
                      </div>

                      {hasGraph ? (
                        <div style={{display:"flex",flexDirection:"column",gap:7}}>
                          {graphSkills.map((s,i)=>{
                            const val = Math.round(s.value||s.score||0)
                            const col = hColor(val)
                            const lbl = hLabel(val)
                            const skillName = s.label||s.skill||"Skill"
                            const isPracticed = recentDomains.has(skillName.toLowerCase())
                            return (
                              <div key={i}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                                    <span style={{fontSize:10,fontWeight:700,color:T.ink2}}>{skillName}</span>
                                    {isPracticed && <span style={{fontSize:8,color:T.green,background:"#F0FDF4",padding:"1px 5px",borderRadius:4,fontWeight:700}}>practiced</span>}
                                  </div>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <span style={{fontSize:9,fontWeight:800,color:col}}>{val}%</span>
                                    <span style={{fontSize:8,color:col,background:col+"15",padding:"1px 6px",borderRadius:4,fontWeight:700}}>{lbl}</span>
                                  </div>
                                </div>
                                <div style={{height:5,background:T.cream3,borderRadius:99,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:val+"%",background:col,borderRadius:99,transition:"width 1s ease",opacity:0.85}}/>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : fallbackSkills.length > 0 ? (
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:2}}>
                          {fallbackSkills.map((s,i)=>(
                            <span key={i} style={{fontSize:10,fontWeight:600,color:"#EF4444",background:"#FFF1F2",border:"1px solid #FECDD3",padding:"3px 9px",borderRadius:99}}>
                              ⚠️ {s.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{fontSize:10,color:T.ink4,textAlign:"center",padding:"6px 0"}}>
                          Complete Arena tasks to track your skill health
                        </div>
                      )}

                      {/* CTA */}
                      <button
                        onClick={()=>onNavigate("arenaCollegeStream")}
                        style={{marginTop:10,width:"100%",padding:"7px",background:`linear-gradient(135deg,${momentumForm.color},${momentumForm.color}BB)`,border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.02em"}}
                      >
                        {graphSkills.length > 0 && graphSkills[0] ? `Practice ${graphSkills[0].label||graphSkills[0].skill} in Arena →` : "Practice in Arena →"}
                      </button>
                    </div>
                  )
                })()}

                {daysSinceActive>=15&&(
                  <div style={{marginTop:12,background:T.red2,border:`1.5px solid rgba(192,57,43,0.2)`,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span>🚨</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.red}}>ELO Decay Active — {daysSinceActive}d inactive</div>
                        <div style={{fontSize:10,color:T.ink3}}>Decay starts after 15 days: −5 ELO/day, goes to 0. Complete Arena tasks to stop it.</div>
                      </div>
                      <button onClick={()=>onNavigate("arenaCollegeStream")} style={{padding:"5px 12px",background:T.red,border:"none",borderRadius:7,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>Go →</button>
                    </div>
                    <button onClick={()=>setDecayDropdownOpen(p=>!p)} style={{width:"100%",padding:"7px 12px",background:"rgba(192,57,43,0.08)",border:`1px solid rgba(192,57,43,0.2)`,borderRadius:8,color:T.red,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>⚠️ View which {keyword} skills are decaying</span>
                      <span style={{transform:decayDropdownOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▼</span>
                    </button>
                    {decayDropdownOpen&&(
                      <div style={{marginTop:8,background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:10,padding:"12px",boxShadow:T.shadow}}>
                        <div style={{fontSize:10,fontWeight:700,color:T.ink3,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Select skills to track decay — {keyword} domain:</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,maxHeight:240,overflowY:"auto"}}>
                          {getSkillsForDomain(keyword).map((skill,i)=>{
                            const checked=selectedDecaySkills.includes(skill)
                            const decayDays=Math.max(0,daysSinceActive-15)
                            const decayPct=Math.min(50,Math.round(decayDays*2.5))
                            return(
                              <label key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 8px",background:checked?T.red2:T.cream,border:`1px solid ${checked?"rgba(192,57,43,0.2)":T.border}`,borderRadius:7,cursor:"pointer",fontSize:11,color:T.ink2,fontWeight:checked?700:400}}>
                                <input type="checkbox" checked={checked} onChange={()=>setSelectedDecaySkills(prev=>prev.includes(skill)?prev.filter(x=>x!==skill):[...prev,skill])} style={{accentColor:T.red,flexShrink:0}}/>
                                <span style={{flex:1}}>{skill}</span>
                                {checked&&<span style={{color:T.red,fontWeight:800,fontSize:10,flexShrink:0}}>-{decayPct}%</span>}
                              </label>
                            )
                          })}
                        </div>
                        {selectedDecaySkills.length>0&&(
                          <div style={{marginTop:10,padding:"8px 12px",background:T.red2,border:`1px solid rgba(192,57,43,0.15)`,borderRadius:8,fontSize:11,color:T.red,lineHeight:1.5}}>
                            <strong>{selectedDecaySkills.length} skill{selectedDecaySkills.length>1?"s":""} at risk:</strong> {selectedDecaySkills.join(", ")}.<br/>
                            Complete Arena tasks for these skills to restore their ELO contribution.
                          </div>
                        )}
                        <button onClick={()=>onNavigate("arenaCollegeStream")} style={{marginTop:8,width:"100%",padding:"8px",background:T.red,border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>🎯 Go to Arena to stop decay →</button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Skill Radar + AI Analysis */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              {/* Skill Radar */}
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div>
                    <SectionLabel color={T.indigo}>🎯 Skill Radar</SectionLabel>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{resolvedKeyword} · {domainSkills.length} skills</div>
                  </div>
                  <button onClick={()=>setActiveTab("skillgraph")} style={{padding:"5px 12px",background:T.indigo3,border:`1px solid rgba(61,78,172,0.2)`,borderRadius:8,color:T.indigo,fontSize:11,fontWeight:700,cursor:"pointer"}}>Full View →</button>
                </div>
                <div style={{display:"flex",justifyContent:"center",marginBottom:14,position:"relative"}}>
                  <RadarChart data={domainSkillGraph} size={240}/>
                  {domainSkillGraph.every(d=>d.value===0) && (
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                      <div style={{background:"rgba(255,255,255,0.92)",borderRadius:10,padding:"8px 14px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
                        <div style={{fontSize:20,marginBottom:4}}>🎯</div>
                        <div style={{fontSize:11,fontWeight:700,color:T.ink2}}>Take the assessment</div>
                        <div style={{fontSize:10,color:T.muted,marginTop:2}}>to calibrate your radar</div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center"}}>
                  {domainSkillGraph.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.ink3,
                      padding:"2px 7px",background:d.value>0?C[i%C.length]+"10":T.cream2,
                      borderRadius:99,border:`1px solid ${d.value>0?C[i%C.length]+"30":T.border}`}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:d.value>0?C[i%C.length]:"#475569"}}/>
                      <span style={{fontWeight:d.value>0?700:400}}>{d.label}</span>
                      {d.value>0&&<strong style={{color:C[i%C.length]}}>{d.value}%</strong>}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Strengths + Weak Areas */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* Strengths */}
                <Card style={{flex:1,background:"linear-gradient(135deg,rgba(16,185,129,0.08) 0%,#FFFFFF 100%)",borderTop:`3px solid ${T.green}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <div style={{width:32,height:32,borderRadius:10,background:T.green2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💪</div>
                    <div>
                      <SectionLabel color={T.green}>Strengths</SectionLabel>
                      <div style={{fontSize:11,color:T.ink4,marginTop:1}}>What you excel at</div>
                    </div>
                  </div>
                  {strengths.length>0
                    ? strengths.map((s,i)=>(
                      <div key={i} style={{
                        display:"flex",gap:10,alignItems:"flex-start",marginBottom:8,
                        padding:"8px 12px",borderRadius:10,
                        background:["rgba(26,122,74,0.06)","rgba(26,122,74,0.04)","rgba(26,122,74,0.07)","rgba(26,122,74,0.05)"][i%4],
                        border:"1px solid rgba(26,122,74,0.12)"
                      }}>
                        <div style={{width:22,height:22,borderRadius:7,background:T.green2,border:`1.5px solid rgba(26,122,74,0.25)`,
                          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:T.green}}>
                          {i+1}
                        </div>
                        <span style={{fontSize:12,color:T.ink2,lineHeight:1.55,fontWeight:500}}>{s}</span>
                      </div>
                    ))
                    : <div style={{fontSize:12,color:T.ink4,padding:"16px",textAlign:"center",background:T.cream,borderRadius:10}}>
                        Complete an Arena mission to unlock strengths
                      </div>}
                </Card>

                {/* Areas to Improve */}
                <Card style={{flex:1,background:"linear-gradient(135deg,rgba(245,158,11,0.08) 0%,#FFFFFF 100%)",borderTop:`3px solid ${T.amber}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                    <div style={{width:32,height:32,borderRadius:10,background:T.amber2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎯</div>
                    <div>
                      <SectionLabel color={T.amber}>Areas to Improve</SectionLabel>
                      <div style={{fontSize:11,color:T.ink4,marginTop:1}}>Growth opportunities</div>
                    </div>
                  </div>
                  {weakAreas.length>0
                    ? weakAreas.slice(0,3).map((w,i)=>(
                      <div key={i} style={{
                        display:"flex",gap:10,alignItems:"flex-start",marginBottom:8,
                        padding:"8px 12px",borderRadius:10,
                        background:["rgba(184,98,10,0.05)","rgba(184,98,10,0.04)","rgba(184,98,10,0.06)"][i%3],
                        border:"1px solid rgba(184,98,10,0.12)"
                      }}>
                        <div style={{width:22,height:22,borderRadius:7,background:T.amber2,border:`1.5px solid rgba(184,98,10,0.25)`,
                          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:T.amber}}>
                          {i+1}
                        </div>
                        <span style={{fontSize:12,color:T.ink2,lineHeight:1.55,fontWeight:500}}>{w}</span>
                      </div>
                    ))
                    : <div style={{fontSize:12,color:T.ink4,padding:"16px",textAlign:"center",background:T.cream,borderRadius:10}}>
                        Complete Arena missions to surface gaps
                      </div>}
                  <button onClick={()=>{ setActiveTab("skillgap"); setTimeout(()=>fetchSkillGap(),100) }} disabled={skillGapLoading}
                    style={{marginTop:10,width:"100%",padding:"9px",
                      background:skillGapLoading?"rgba(61,78,172,0.07)":T.indigo,
                      border:`1px solid rgba(61,78,172,0.2)`,borderRadius:9,
                      color:skillGapLoading?T.ink4:"#fff",fontSize:12,fontWeight:700,
                      cursor:skillGapLoading?"not-allowed":"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                      transition:"all 0.15s"}}>
                    {skillGapLoading?<><Spinner color={T.ink4}/>Analyzing...</>:<>⚡ Analyze Skill Gaps →</>}
                  </button>
                </Card>
              </div>
            </div>

            {/* Domain Skill Practice Picker */}
            <Card style={{marginBottom:20,borderTop:`3px solid ${T.indigo}`,background:"linear-gradient(135deg,#FAFAF8 0%,#F0F0F8 100%)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <SectionLabel color={T.indigo}>🎮 Practice a Skill</SectionLabel>
                  <div style={{fontSize:15,fontWeight:800,color:T.ink}}>
                    {userActualSkills.length >= 3 ? "Your Resume Skills" : resolvedKeyword}
                    <span style={{fontSize:12,fontWeight:500,color:T.ink4,marginLeft:8}}>· {practiceSkillGraph.length} skills</span>
                  </div>
                </div>
                {practiceSkill&&(
                  <button onClick={()=>onNavigate("arenaCollegeStream")}
                    style={{padding:"9px 20px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(61,78,172,0.25)"}}>
                    ⚔️ Practice in Arena →
                  </button>
                )}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,marginBottom:14}}>
                {practiceSkillGraph.map((entry,i)=>{
                  const skill = entry.label
                  const active = practiceSkill === skill
                  const score = entry.value || 0
                  const scoreCol = score >= 70 ? T.green : score >= 40 ? T.amber : score > 0 ? T.indigo : T.ink4
                  return (
                    <button key={i} onClick={()=>setPracticeSkill(active?"":skill)} style={{
                      padding:"10px 12px",borderRadius:12,textAlign:"left",
                      border:`1.5px solid ${active?T.indigo:score>0?"rgba(61,78,172,0.15)":T.border}`,
                      background:active?T.indigo:score>0?"#fff":T.cream,
                      cursor:"pointer",transition:"all 0.15s",
                      boxShadow:active?"0 4px 14px rgba(61,78,172,0.2)":score>0?"0 1px 4px rgba(0,0,0,0.05)":"none",
                    }}>
                      <div style={{fontSize:12,fontWeight:active?700:600,color:active?"#fff":T.ink,marginBottom:5,lineHeight:1.3}}>{skill}</div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        {score > 0 ? (
                          <>
                            <div style={{flex:1,height:3,background:active?"rgba(0,0,0,0.12)":"rgba(0,0,0,0.06)",borderRadius:99,marginRight:6}}>
                              <div style={{height:"100%",width:`${score}%`,background:active?"#fff":scoreCol,borderRadius:99}}/>
                            </div>
                            <span style={{fontSize:10,fontWeight:800,color:active?"rgba(255,255,255,0.9)":scoreCol,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{score}%</span>
                          </>
                        ) : (
                          <span style={{fontSize:10,color:active?"rgba(255,255,255,0.6)":T.ink4,fontStyle:"italic"}}>Not assessed</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {practiceSkill ? (
                <div style={{background:T.indigo,borderRadius:12,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 4px 20px rgba(61,78,172,0.2)"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>⚔️ Selected: {practiceSkill}</div>
                    <div style={{fontSize:11,color:"#3D3935",marginTop:3}}>
                      Arena will generate a <strong style={{color:"#fff"}}>{practiceSkill}</strong> challenge tailored to your level
                    </div>
                  </div>
                  <button onClick={()=>onNavigate("arenaCollegeStream")} style={{padding:"10px 22px",background:"#FFFFFF",border:"none",borderRadius:10,color:T.indigo,fontSize:12,fontWeight:800,cursor:"pointer",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.12)"}}>
                    Go Practice →
                  </button>
                </div>
              ) : (
                <div style={{textAlign:"center",padding:"10px 0",color:T.ink4,fontSize:12}}>
                  Select a skill above to focus your Arena practice session
                </div>
              )}
            </Card>

            {/* ══ PORTFOLIO COMMAND CENTER ══ */}
            {(()=>{
              // Derive challenge counts for the preview. arena_history.type
              // is stamped reliably by the backend now — 'academic' (College
              // Stream) or 'domain' (Domain Role), see arenaCollegeStream.js
              // / arenaDomainRole.js — preferred over challenge_type/domain
              // heuristics, which only exist for legacy or third-party rows.
              const isCommon = h => {
                if (h.type === "academic") return true
                if (h.type === "domain") return false
                const ct = (h.challenge_type || "").toLowerCase()
                if (ct === "dsa" || ct === "common" || ct === "common_challenge") return true
                if (ct === "domain") return false
                return ["dsa","algorithm","common_challenge"].includes((h.domain||"").toLowerCase())
              }
              const commonChs = arenaHistRows.filter(isCommon)
              const domainChs = arenaHistRows.filter(h => !isCommon(h))
              const topSkills = (skillGraph||[]).filter(s=>{const l=s.label||s.skill||"";return l&&l!=="undefined"&&l.trim()}).sort((a,b)=>(b.value||b.score||0)-(a.value||a.score||0)).slice(0,4)
              const avgScore  = arenaHistRows.length ? Math.round(arenaHistRows.reduce((s,h)=>s+(h.score||0),0)/arenaHistRows.length) : 0
              return (
            <Card style={{
              position:"relative",overflow:"hidden",marginBottom:16,
              border:`1px solid rgba(61,78,172,0.15)`,
              background:"#FFFFFF",
              boxShadow:"0 2px 24px rgba(61,78,172,0.08)"
            }} className="hover-card">
              {/* Gradient header band */}
              <div style={{position:"absolute",top:0,left:0,right:0,height:4,
                background:`linear-gradient(90deg,${T.indigo},#6366F1,#0F766E)`}}/>
              <div style={{position:"absolute",top:-80,right:-80,width:240,height:240,borderRadius:"50%",
                background:`radial-gradient(circle,${T.indigo3},transparent)`,pointerEvents:"none",opacity:0.5}}/>

              {/* ── Header ── */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12,position:"relative"}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:46,height:46,borderRadius:13,
                    background:`linear-gradient(135deg,${T.indigo},#6366F1)`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,
                    boxShadow:`0 4px 14px rgba(61,78,172,0.28)`,flexShrink:0}}>🌐</div>
                  <div>
                    <div style={{fontSize:10,fontWeight:800,color:T.indigo,textTransform:"uppercase",letterSpacing:1.5,fontFamily:"'DM Mono',monospace",marginBottom:2}}>Portfolio · Command Center</div>
                    <h3 style={{fontSize:17,fontWeight:800,color:T.ink,margin:0,lineHeight:1.2}}>Your Live Public Profile</h3>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",
                    background:"rgba(22,163,74,0.07)",border:"1px solid rgba(22,163,74,0.18)",borderRadius:99}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:T.green,
                      boxShadow:`0 0 6px ${T.green}`,animation:"pulse 2s infinite"}}/>
                    <span style={{fontSize:10,fontWeight:800,color:T.green,fontFamily:"'DM Mono',monospace"}}>LIVE</span>
                  </div>
                  <div style={{padding:"5px 11px",background:T.indigo3,border:`1px solid rgba(61,78,172,0.18)`,
                    borderRadius:99,fontSize:10,fontWeight:800,color:T.indigo,fontFamily:"'DM Mono',monospace"}}>
                    ✓ VERIFIED
                  </div>
                </div>
              </div>

              {/* ── URL bar ── */}
              <div style={{background:"#F8FAFF",border:`1.5px solid rgba(61,78,172,0.16)`,borderRadius:12,
                padding:"10px 14px",marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:13}}>🔗</span>
                <span style={{fontSize:12,color:T.indigo,fontFamily:"'DM Mono',monospace",fontWeight:600,
                  flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {portfolioUrl}
                </span>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>{navigator.clipboard.writeText(portfolioFullUrl);setPortfolioCopied(true);setTimeout(()=>setPortfolioCopied(false),2500)}}
                    style={{padding:"6px 12px",background:portfolioCopied?"rgba(22,163,74,0.08)":T.indigo3,
                      border:`1px solid ${portfolioCopied?"rgba(22,163,74,0.25)":"rgba(61,78,172,0.2)"}`,
                      borderRadius:8,color:portfolioCopied?T.green:T.indigo,fontSize:11,fontWeight:700,
                      cursor:"pointer",transition:"all 0.2s",fontFamily:"inherit"}}>
                    {portfolioCopied?"✅ Copied":"📋 Copy"}
                  </button>
                  <a href={portfolioFullUrl} target="_blank" rel="noreferrer"
                    style={{padding:"6px 14px",background:`linear-gradient(135deg,${T.indigo},#6366F1)`,
                      borderRadius:8,color:"#fff",fontSize:11,fontWeight:700,textDecoration:"none",
                      display:"flex",alignItems:"center",gap:5,boxShadow:`0 2px 8px rgba(61,78,172,0.3)`}}>
                    ↗ Open
                  </a>
                </div>
              </div>

              {/* ── Live portfolio data preview ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>

                {/* Left: Arena activity breakdown */}
                <div style={{background:"#F8FAFF",borderRadius:14,padding:"16px 18px",
                  border:`1px solid rgba(61,78,172,0.1)`}}>
                  <div style={{fontSize:10,fontWeight:800,color:T.indigo,textTransform:"uppercase",
                    letterSpacing:1.2,marginBottom:14,fontFamily:"'DM Mono',monospace"}}>
                    ⚔️ Arena Activity — Live in Portfolio
                  </div>

                  {/* Common challenges */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"8px 12px",background:"#FFFFFF",borderRadius:10,marginBottom:8,
                    border:"1px solid rgba(61,78,172,0.08)"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:T.ink}}>Academic Tasks</div>
                      <div style={{fontSize:10,color:T.ink4}}>DSA · Algorithms · Foundations</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:18,fontWeight:900,color:T.indigo,fontFamily:"'DM Mono',monospace"}}>{commonChs.length}</div>
                      {commonChs.length>0&&<div style={{fontSize:10,color:T.ink4}}>solved</div>}
                    </div>
                  </div>

                  {/* Domain challenges */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"8px 12px",background:"#FFFFFF",borderRadius:10,marginBottom:8,
                    border:"1px solid rgba(61,78,172,0.08)"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:T.ink}}>Domain Tasks</div>
                      <div style={{fontSize:10,color:T.ink4}}>Industry · Applied skills</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:18,fontWeight:900,color:"#0F766E",fontFamily:"'DM Mono',monospace"}}>{domainChs.length}</div>
                      {domainChs.length>0&&<div style={{fontSize:10,color:T.ink4}}>solved</div>}
                    </div>
                  </div>

                  {/* Difficulty breakdown chips */}
                  {arenaHistRows.length>0&&(
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
                      {["Easy","Medium","Hard"].map(d=>{
                        const n=arenaHistRows.filter(h=>h.difficulty===d).length
                        if(!n) return null
                        const col=d==="Easy"?"#16A34A":d==="Medium"?"#D97706":"#DC2626"
                        const bg=d==="Easy"?"#DCFCE7":d==="Medium"?"#FEF9C3":"#FEE2E2"
                        return <span key={d} style={{fontSize:10,fontWeight:700,color:col,background:bg,padding:"3px 9px",borderRadius:99}}>{n} {d}</span>
                      })}
                      {avgScore>0&&<span style={{fontSize:10,fontWeight:700,color:T.indigo,background:T.indigo3,padding:"3px 9px",borderRadius:99}}>avg {avgScore}/100</span>}
                    </div>
                  )}
                  {arenaHistRows.length===0&&(
                    <div style={{fontSize:11,color:T.ink4,textAlign:"center",padding:"8px 0"}}>
                      Complete Arena challenges to populate this section
                    </div>
                  )}
                </div>

                {/* Right: Skills + export */}
                <div style={{display:"flex",flexDirection:"column",gap:12}}>

                  {/* Skills preview */}
                  <div style={{background:"#F0FDFA",borderRadius:14,padding:"14px 16px",
                    border:"1px solid rgba(15,118,110,0.12)",flex:1}}>
                    <div style={{fontSize:10,fontWeight:800,color:"#0F766E",textTransform:"uppercase",
                      letterSpacing:1.2,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>
                      🧠 Skills — Live in Portfolio
                    </div>
                    {topSkills.length>0 ? (
                      <>
                        {topSkills.map((s,i)=>{
                          const pct=s.value||s.percentage||s.score||0
                          return (
                            <div key={i} style={{marginBottom:7}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                                <span style={{fontSize:11,fontWeight:600,color:T.ink2}}>{s.label||s.skill||"Skill"}</span>
                                <span style={{fontSize:10,fontWeight:700,color:"#0F766E",fontFamily:"monospace"}}>{pct}%</span>
                              </div>
                              <div style={{height:4,background:"rgba(15,118,110,0.12)",borderRadius:99}}>
                                <div style={{height:"100%",width:`${Math.min(pct,100)}%`,
                                  background:"#14B8A6",borderRadius:99}}/>
                              </div>
                            </div>
                          )
                        })}
                        {(skillGraph||[]).length>4&&(
                          <div style={{fontSize:10,color:T.ink4,marginTop:4}}>+{(skillGraph||[]).length-4} more skills</div>
                        )}
                      </>
                    ):(
                      <div style={{fontSize:11,color:T.ink4}}>Skills tracked as you complete Arena challenges</div>
                    )}
                  </div>

                  {/* Export actions */}
                  <div style={{background:"#FFFFFF",borderRadius:14,padding:"14px 16px",
                    border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{fontSize:10,fontWeight:800,color:T.ink3,textTransform:"uppercase",letterSpacing:1.2,fontFamily:"'DM Mono',monospace"}}>Export</div>
                    <a href={portfolioFullUrl+"?pdf=1"} target="_blank" rel="noreferrer"
                      style={{padding:"9px 14px",background:`linear-gradient(135deg,${T.indigo},#6366F1)`,
                        borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,textDecoration:"none",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                        boxShadow:`0 3px 10px rgba(61,78,172,0.28)`}}>
                      📄 Download as PDF
                    </a>
                    <div style={{fontSize:10,color:T.ink4,textAlign:"center",fontFamily:"'DM Mono',monospace"}}>
                      Opens portfolio → Ctrl+P / ⌘P to save
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Live stats strip ── */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                {[
                  {icon:"⚡",label:"ELO",val:eloRating,color:T.indigo},
                  {icon:"✅",label:"Total Solved",val:arenaHistRows.length,color:"#16A34A"},
                  {icon:"🧩",label:"Common",val:commonChs.length,color:T.indigo},
                  {icon:"🎯",label:"Domain",val:domainChs.length,color:"#0F766E"},
                  {icon:"🔥",label:"Streak",val:arenaStreak,color:"#DC2626"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#F8FAFF",borderRadius:12,padding:"10px 8px",
                    border:`1px solid rgba(61,78,172,0.08)`,textAlign:"center"}}>
                    <div style={{fontSize:16,marginBottom:3}}>{s.icon}</div>
                    <div style={{fontSize:17,fontWeight:900,color:s.color,fontFamily:"'DM Mono',monospace",lineHeight:1}}>
                      {s.val}
                    </div>
                    <div style={{fontSize:9,color:T.ink4,fontWeight:700,marginTop:3,textTransform:"uppercase",letterSpacing:0.5}}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
              )
            })()}

            {/* EchoPitch */}
            <EchoPitchHero
              userData={userData}
              skillGraph={skillGraph}
              completedTasks={echoPitchCompletedTasks}
              experiences={experiences}
              isElite={auraPlan.id==="elite"}
              onGenerate={()=>setShowVideoGenerator(true)}
              onNavigatePricing={onNavigatePricing}
            />

            {/* Skill Gap Alert */}
            {skillGapData&&(
              <Card style={{marginBottom:16,borderLeft:`4px solid ${T.red}`,background:T.red2}}>
                <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                  <span style={{fontSize:20}}>⚡</span>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{fontSize:12,fontWeight:800,color:T.red,marginBottom:2}}>Skill Gap Alert · {skillGapData.urgentGaps?.length||0} critical gaps</div>
                    <div style={{fontSize:11,color:T.ink3}}>{skillGapData.topAction}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {skillGapData.urgentGaps?.slice(0,3).map((g,i)=><Badge key={i} color={T.red} bg="#fff">{g.surge&&"🔺 "}{g.skill}</Badge>)}
                  </div>
                  <button onClick={()=>setActiveTab("skillgap")} style={{padding:"7px 16px",background:T.red,border:"none",borderRadius:9,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>Analyze →</button>
                </div>
              </Card>
            )}

            {/* Career Timeline */}
            <Card style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
                <div>
                  <SectionLabel>💼 Experience</SectionLabel>
                  <div style={{fontSize:16,fontWeight:800,color:T.ink}}>Career Timeline</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>setShowResumeUpload(p=>!p)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:T.indigo3,border:`1px solid rgba(61,78,172,0.2)`,borderRadius:9,color:T.indigo,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    📄 Upload Resume
                  </button>
                  <button onClick={()=>{setEditingIdx(null);setShowExpModal(true)}} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:T.indigo,border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    + Add Experience
                  </button>
                </div>
              </div>
              {showResumeUpload&&(
                <div style={{background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.2)`,borderRadius:12,padding:"16px",marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.indigo,marginBottom:10}}>📄 Auto-Extract Experience from Resume</div>
                  <button onClick={()=>resumeFileInputRef.current?.click()} disabled={resumeUploading}
                    style={{padding:"10px 20px",background:resumeUploading?T.cream2:T.indigo,border:"none",borderRadius:9,color:resumeUploading?T.ink4:"#fff",fontSize:13,fontWeight:700,cursor:resumeUploading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8}}>
                    {resumeUploading?<><div style={{width:12,height:12,border:`2px solid ${T.ink4}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>Parsing…</>:"Choose PDF / DOCX"}
                  </button>
                  {resumeStatus&&<div style={{fontSize:11,marginTop:8,color:resumeStatus.startsWith("✅")?T.green:resumeStatus.startsWith("❌")?T.red:T.ink3,fontWeight:500}}>{resumeStatus}</div>}
                </div>
              )}
              <CareerTimeline experiences={experiences} onAdd={()=>{setEditingIdx(null);setShowExpModal(true)}} onEdit={(idx)=>{setEditingIdx(idx);setShowExpModal(true)}} onDelete={deleteExperience}/>
            </Card>

            {/* Resume Projects */}
            {resumeProjects.length>0&&(
              <Card style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
                  <div>
                    <SectionLabel color="#8E44AD">💻 Projects</SectionLabel>
                    <div style={{fontSize:16,fontWeight:800,color:T.ink}}>From Your Resume</div>
                  </div>
                  <Badge color="#8E44AD" bg="rgba(142,68,173,0.08)">{resumeProjects.length} project{resumeProjects.length!==1?"s":""}</Badge>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                  {resumeProjects.map((p,i)=>(
                    <div key={i} style={{background:T.cream,border:`1px solid rgba(142,68,173,0.15)`,borderRadius:12,padding:"14px 16px"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                        <div style={{fontSize:14,fontWeight:700,color:T.ink}}>{p.title}</div>
                        {p.url&&<a href={p.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#8E44AD",fontWeight:600,textDecoration:"none",flexShrink:0}}>View →</a>}
                      </div>
                      {p.description&&<div style={{fontSize:12,color:T.ink3,lineHeight:1.65,marginBottom:8}}>{p.description}</div>}
                      {p.techStack?.length>0&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                          {(Array.isArray(p.techStack)?p.techStack:p.techStack.split(",")).map((t,ti)=>(
                            <span key={ti} style={{background:"rgba(142,68,173,0.08)",border:"1px solid rgba(142,68,173,0.15)",borderRadius:99,padding:"2px 8px",fontSize:10,color:"#8E44AD",fontWeight:500}}>{String(t).trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Learning Progress */}
            {(userData?.skillStudioXP>0||userData?.completedTopics?.length>0)&&(
              <Card style={{marginBottom:16}}>
                <SectionLabel color={T.blue}>🎓 Learning Progress</SectionLabel>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
                  {[
                    {label:"XP Earned",value:userData?.skillStudioXP||0,icon:"⚡",color:T.amber},
                    {label:"Topics Done",value:userData?.completedTopics?.length||0,icon:"✅",color:T.green},
                    {label:"Day Streak",value:userData?.skillStudioStreak||0,icon:"🔥",color:T.red},
                  ].map((s,i)=>(
                    <div key={i} style={{background:T.cream,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",textAlign:"center"}}>
                      <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
                      <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
                      <div style={{fontSize:10,color:T.ink4,fontWeight:600}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {userData?.completedTopics?.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {(userData.completedTopics||[]).slice(0,8).map((t,i)=>(
                      <Badge key={i} color={T.green} bg={T.green2}>✓ {t}</Badge>
                    ))}
                    {userData.completedTopics.length>8&&<Badge color={T.blue} bg={T.blue2}>+{userData.completedTopics.length-8} more</Badge>}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ═══════════ SKILL GRAPH TAB ═══════════ */}
        {activeTab==="skillgraph"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            {/* Header */}
            <div style={{marginBottom:24}}>
              <SectionLabel color={T.indigo}>Skill Graph</SectionLabel>
              <h2 style={{fontSize:26,fontWeight:800,color:T.ink,margin:"0 0 4px 0"}}>Your Full Skill Breakdown</h2>
              <p style={{fontSize:13,color:T.ink3,margin:0}}>
                {skillGraph.length>0
                  ? <>From your resume & profile · <strong>{skillGraph.length} skills tracked</strong> · Scores grow with Arena and Forge completions</>
                  : <>No skills tracked yet — upload your resume in Career &amp; Vault to auto-extract</>}
              </p>
            </div>

            {/* Radar + skill scores. The radar always reads domainSkillGraph — the
                exact same variable the Dashboard tab's radar uses — so the two
                tabs can never drift apart (previously this fell back to the raw,
                resume-derived `skillGraph` sliced to 8 entries whenever the user
                had any resume skills at all, which showed a different skill set,
                a different shape, and silently dropped whichever of the role's
                skills didn't survive the slice). */}
            <div style={{display:"grid",gridTemplateColumns:skillGraph.length>0?"1fr 1fr":"1fr",gap:16,marginBottom:20}}>
              {/* Radar of the role's full skill set */}
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <SectionLabel color={T.indigo}>Your Skill Radar</SectionLabel>
                  <div style={{fontSize:10,color:T.ink4,fontFamily:"'DM Mono',monospace"}}>{resolvedKeyword} · {domainSkillGraph.length} skills</div>
                </div>
                <div style={{display:"flex",justifyContent:"center",padding:"12px 0",position:"relative"}}>
                  <RadarChart data={domainSkillGraph} size={280}/>
                  {domainSkillGraph.every(d=>(d.value||d.score||0)===0) && (
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                      <div style={{background:"rgba(255,255,255,0.92)",borderRadius:10,padding:"10px 16px",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
                        <div style={{fontSize:24,marginBottom:4}}>🎯</div>
                        <div style={{fontSize:12,fontWeight:700,color:T.ink2}}>No assessment data yet</div>
                        <div style={{fontSize:11,color:T.muted,marginTop:3}}>Complete the assessment to calibrate your radar</div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",marginTop:10}}>
                  {domainSkillGraph.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.ink3,
                      padding:"2px 8px",borderRadius:99,background:C[i%C.length]+"10",border:`1px solid ${C[i%C.length]}30`}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:C[i%C.length]}}/>
                      <span style={{fontWeight:600}}>{d.label||d.skill}</span>
                      {(d.value||d.score||0)>0&&<strong style={{color:C[i%C.length]}}>{d.value||d.score}%</strong>}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Actual skill scores — from resume/LinkedIn, a separate personal
                  list (not role-scoped), so it stays gated on having any */}
              {skillGraph.length > 0 && (
                <Card>
                  <SectionLabel color={T.indigo}>Skill Scores</SectionLabel>
                  <p style={{fontSize:11,color:T.ink4,margin:"0 0 12px"}}>
                    Initial scores derived from your resume. Complete Forge &amp; Arena tasks to earn verified scores.
                  </p>
                  <div style={{marginTop:4}}>
                    {skillGraph.slice(0,12).map((s,i)=>{
                      const v=s.value||s.score||0
                      const col=v>=70?T.green:v>=40?T.amber:v>0?C[i%C.length]:T.ink4
                      const isVerified=s._source==="arena"||s._source==="forge"
                      return (
                        <div key={i} style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:12,color:T.ink2,fontWeight:600}}>{s.label||s.skill}</span>
                              {isVerified&&<span style={{fontSize:9,padding:"1px 6px",background:T.green2,color:T.green,borderRadius:99,fontWeight:700}}>VERIFIED</span>}
                            </div>
                            {v>0
                              ? <span style={{fontSize:12,fontWeight:800,color:col,fontFamily:"'DM Mono',monospace"}}>{v}%</span>
                              : <span style={{fontSize:10,color:T.ink4,fontStyle:"italic"}}>Resume only</span>}
                          </div>
                          <div style={{height:5,background:T.cream3,borderRadius:99,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${v}%`,background:v>0?`linear-gradient(90deg,${col}99,${col})`:"transparent",borderRadius:99,transition:"width 1s ease"}}/>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>

            {/* Practice Skills — sourced from user's actual resume skills, with Arena scores */}
            <Card style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <SectionLabel color={T.indigo}>
                    {userActualSkills.length >= 3 ? "Your Skills — from resume & profile" : `Arena Practice Skills — ${normalizeDomain(keyword)}`}
                  </SectionLabel>
                  <p style={{fontSize:11,color:T.ink4,margin:0}}>
                    {userActualSkills.length >= 3
                      ? `${userActualSkills.length} skills extracted from your resume. Complete Arena tasks to earn verified scores.`
                      : "These are the skills Arena will test you on. Complete tasks to earn verified scores."}
                  </p>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8}}>
                {practiceSkillGraph.map((s,i)=>{
                  const col=s.value>=70?T.green:s.value>=40?T.amber:s.value>0?C[i%C.length]:T.ink4
                  return(
                    <div key={i} style={{background:s.value>0?`${col}08`:T.cream2,border:`1px solid ${s.value>0?col+"25":T.border}`,borderRadius:10,padding:"10px 12px"}}>
                      <div style={{fontSize:12,fontWeight:600,color:s.value>0?T.ink2:T.ink4,marginBottom:4}}>{s.label}</div>
                      {s.value>0
                        ? <div style={{fontSize:13,fontWeight:800,color:col,fontFamily:"'DM Mono',monospace"}}>{s.value}%</div>
                        : <div style={{fontSize:10,color:T.ink4,fontStyle:"italic"}}>Not tested yet</div>}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Performance summary */}
            <Card>
              <SectionLabel>Performance Summary</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:12}}>
                {[
                  {l:"ELO Rating",v:eloRating,c:T.indigo,ic:"⚡"},
                  {l:"Arena Tasks",v:arenaCompleted||0,c:T.green,ic:"⚔️"},
                  {l:"Skills Assessed",v:`${domainSkillGraph.filter(d=>d.value>0).length}/${domainSkills.length}`,c:"#8E44AD",ic:"🎯"},
                ].map((s,i)=>(
                  <div key={i} style={{background:s.c+"10",border:`1px solid ${s.c}20`,borderRadius:14,padding:"20px",textAlign:"center"}}>
                    <div style={{fontSize:26,marginBottom:8}}>{s.ic}</div>
                    <div style={{fontSize:26,fontWeight:900,color:s.c,marginBottom:3,fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                    <div style={{fontSize:10,color:T.ink4,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14,padding:"12px 14px",borderRadius:10,background:T.indigo3,border:`1px solid rgba(61,78,172,0.15)`}}>
                <div style={{fontSize:11,color:T.indigo,fontWeight:700,marginBottom:4}}>💡 Skill graph updates automatically</div>
                <div style={{fontSize:12,color:T.ink3,lineHeight:1.6}}>
                  Your radar tracks exactly the <strong>{domainSkills.length} skills</strong> in the <strong>{normalizeDomain(keyword)}</strong> domain.
                  Each Arena mission updates the relevant skill scores in real time.
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════ SKILL GAP TAB ═══════════ */}
        {activeTab==="skillgap"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:16}}>
              <div>
                <SectionLabel color={T.red}>⚡ Real-Time Intelligence</SectionLabel>
                <h2 style={{fontSize:26,fontWeight:800,color:T.ink,margin:"0 0 6px 0"}}>Skill Gap Analysis</h2>
                <p style={{fontSize:13,color:T.ink3,margin:0}}>
                  Your profile vs live market demand for <strong>{keyword}</strong>
                  {userData?.skills?.length>0&&<> · <span style={{color:T.indigo}}>{userData.skills.length} skills tracked</span></>}
                </p>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{padding:"5px 12px",borderRadius:99,background:auraPlan.colorBg,border:`1px solid ${auraPlan.color}40`,fontSize:11,fontWeight:700,color:auraPlan.color}}>
                  {auraPlan.label}
                </div>
                <button onClick={fetchSkillGap} disabled={skillGapLoading}
                  style={{padding:"10px 22px",background:skillGapLoading?T.cream2:T.indigo,border:"none",borderRadius:12,color:skillGapLoading?T.ink4:"#fff",fontSize:13,fontWeight:700,cursor:skillGapLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8}}>
                  {skillGapLoading
                    ?<><div style={{width:12,height:12,border:`2px solid ${T.ink4}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>Analyzing...</>
                    :skillGapData?"🔄 Refresh":"⚡ Analyze Gaps"}
                </button>
              </div>
            </div>

            {/* Profile context card — shows what we're analysing */}
            {(userData?.skills?.length>0||userData?.experiences?.length>0)&&(
              <div style={{background:T.indigo3,border:`1px solid rgba(61,78,172,0.18)`,borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:T.indigo,fontFamily:T.mono,textTransform:"uppercase",letterSpacing:"0.08em"}}>Analysing your profile:</span>
                {userData?.skills?.slice(0,8).map((s,i)=>(
                  <span key={i} style={{padding:"2px 8px",background:"#FFFFFF",border:`1px solid rgba(61,78,172,0.2)`,borderRadius:100,fontSize:11,color:T.indigo,fontWeight:600}}>{s}</span>
                ))}
                {(userData?.experiences?.length||0)>0&&(
                  <span style={{fontSize:11,color:T.ink3}}>+ {userData.experiences.length} experience{userData.experiences.length>1?"s":""}</span>
                )}
              </div>
            )}
            {skillGapError&&<div style={{background:T.red2,border:`1.5px solid rgba(192,57,43,0.2)`,borderRadius:12,padding:"14px 18px",marginBottom:20,color:T.red,fontSize:13}}>⚠️ {skillGapError}</div>}
            {!skillGapData&&!skillGapLoading&&!skillGapError&&(
              <div style={{textAlign:"center",padding:"80px 20px"}}>
                <div style={{fontSize:48,marginBottom:16}}>⚡</div>
                <div style={{fontSize:18,fontWeight:700,color:T.ink,marginBottom:8}}>Run Your First Skill Gap Analysis</div>
                <p style={{fontSize:13,color:T.ink3,marginBottom:24}}>AI-powered analysis of what the job market needs vs what you have</p>
                <button onClick={fetchSkillGap} style={{padding:"14px 32px",background:T.indigo,border:"none",borderRadius:12,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>⚡ Analyze My Skill Gaps</button>
              </div>
            )}
            {skillGapLoading&&(
              <div style={{textAlign:"center",padding:"80px 20px"}}>
                <div style={{width:40,height:40,border:`3px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
                <div style={{fontSize:15,fontWeight:600,color:T.indigo}}>Scanning Job Market...</div>
              </div>
            )}
            {skillGapData&&!skillGapLoading&&(
              <div>
                <Card style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,flexWrap:"wrap",gap:8}}>
                    <SectionLabel color={T.indigo}>📡 Market Overview — {(skillGapData._meta?.role||keyword||"").toUpperCase()}</SectionLabel>
                  </div>
                  <p style={{margin:"0 0 16px",fontSize:14,color:T.ink2,lineHeight:1.7}}>{skillGapData.marketDemand}</p>
                  {/* Overall Market Readiness bar */}
                  {skillGapData._meta&&(()=>{
                    const yourAvg=skillGapData._meta.yourAvg||20
                    const marketAvg=skillGapData._meta.marketAvg||63
                    const threshold=81
                    const belowThreshold=(skillGapData.urgentGaps||[]).length
                    return (
                      <div style={{marginBottom:16,padding:"14px 16px",borderRadius:12,background:T.cream2,border:`1px solid ${T.border}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
                          <div style={{fontSize:12,fontWeight:800,color:T.ink}}>Overall Market Readiness</div>
                          <div style={{display:"flex",gap:12}}>
                            <span style={{fontSize:11,color:T.ink3}}>Your avg: <strong style={{color:T.red}}>{yourAvg}%</strong></span>
                            <span style={{fontSize:11,color:T.ink3}}>Market avg: <strong style={{color:T.green}}>{marketAvg}%</strong></span>
                          </div>
                        </div>
                        <div style={{position:"relative",height:8,background:T.cream3,borderRadius:99,overflow:"visible",marginBottom:8}}>
                          <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${yourAvg}%`,background:T.red,borderRadius:99}}/>
                          {/* Market threshold marker */}
                          <div style={{position:"absolute",top:-4,left:`${threshold}%`,width:2,height:16,background:T.ink2,borderRadius:1}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:11,color:T.red,fontWeight:700}}>{yourAvg}% market-ready · {belowThreshold} skill{belowThreshold!==1?"s":""} below market threshold</span>
                          <span style={{fontSize:10,color:T.ink3}}>▎ Market threshold ({threshold}%)</span>
                        </div>
                      </div>
                    )
                  })()}
                  <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                    <div style={{background:T.indigo3,border:`1px solid rgba(61,78,172,0.2)`,borderRadius:12,padding:"12px 20px",textAlign:"center"}}>
                      <div style={{fontSize:24,fontWeight:900,color:T.indigo,fontFamily:"'DM Mono',monospace"}}>{skillGapData.competitiveIn}w</div>
                      <div style={{fontSize:10,color:T.ink4,marginTop:2,textTransform:"uppercase",letterSpacing:"0.08em"}}>To be competitive</div>
                    </div>
                    <div style={{flex:1,background:T.amber2,border:`1px solid rgba(184,98,10,0.15)`,borderRadius:12,padding:"14px 18px"}}>
                      <div style={{fontSize:10,fontWeight:800,color:T.amber,marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>🎯 Top Action This Week</div>
                      <div style={{fontSize:13,color:T.ink2,lineHeight:1.5}}>{skillGapData.topAction}</div>
                    </div>
                  </div>
                </Card>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20}}>
                  {[
                    {title:"🔴 Critical Gaps",items:skillGapData.urgentGaps||[],col:T.red,bg:T.red2},
                    {title:"🟡 Learn Soon",items:skillGapData.emerging||[],col:T.amber,bg:T.amber2},
                    {title:"🟢 You Have",items:skillGapData.youHave||[],col:T.green,bg:T.green2},
                  ].map((section,si)=>(
                    <Card key={si} style={{borderTop:`3px solid ${section.col}`}}>
                      <SectionLabel color={section.col}>{section.title}</SectionLabel>
                      {section.items.map((g,i)=>(
                        <div key={i} style={{marginBottom:14,paddingBottom:14,borderBottom:i<section.items.length-1?`1px solid ${T.border}`:"none"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                            <div>
                              {g.surge&&<div style={{marginBottom:3}}><Badge color={section.col} bg={section.col+"15"}>🔺 +{g.surgePercent}% SURGE</Badge></div>}
                              <div style={{fontSize:14,fontWeight:800,color:T.ink}}>{g.skill}</div>
                            </div>
                            <Badge color={section.col} bg={section.col+"10"}>{g.demand}</Badge>
                          </div>
                          <div style={{fontSize:11,color:T.ink3,lineHeight:1.5,marginBottom:8}}>{g.reason}</div>
                          {/* You vs Market bars — use precomputed userScore for accuracy */}
                          {(g.weeksToLearn||g.demand==="High")&&(()=>{
                            // Use precomputed userScore if available (set in generateMockSkillGap)
                            // Otherwise fall back to direct lookup
                            const userVal = g.userScore != null ? g.userScore : (() => {
                              const sg2=(userData?.skillGraph||[]).filter(d=>d&&(d.label||d.skill))
                              const m={}; sg2.forEach(s=>{m[(s.label||s.skill||"").toLowerCase()]=s.value||s.score||0})
                              const key=(g.skill||"").toLowerCase().replace(/[^a-z0-9 ]/g,"")
                              if(m[key]!=null) return m[key]
                              const words=key.split(/\s+/).filter(w=>w.length>=3)
                              for(const [uk,uv] of Object.entries(m)){if(words.some(w=>uk.includes(w))) return uv}
                              return 0
                            })()
                            const marketNeeds = g.weeksToLearn ? 81 : Math.min(100,(userVal||0)+15)
                            const gap=Math.max(0,marketNeeds-userVal)
                            return (
                              <div>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                                  <span style={{fontSize:10,color:T.ink4}}>You</span>
                                  <span style={{fontSize:10,fontWeight:700,color:section.col}}>{userVal}%</span>
                                </div>
                                <div style={{height:5,background:T.cream3,borderRadius:99,marginBottom:4,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${userVal}%`,background:section.col,borderRadius:99,transition:"width 0.8s ease"}}/>
                                </div>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                                  <span style={{fontSize:10,color:T.ink4}}>Market needs</span>
                                  <span style={{fontSize:10,fontWeight:700,color:T.ink2}}>{marketNeeds}%</span>
                                </div>
                                <div style={{height:5,background:T.cream3,borderRadius:99,marginBottom:4,overflow:"hidden"}}>
                                  <div style={{height:"100%",width:`${marketNeeds}%`,background:T.ink3,borderRadius:99}}/>
                                </div>
                                {gap>0&&<div style={{fontSize:10,color:section.col,fontWeight:700}}>Gap: {gap} pts{g.weeksToLearn?` · −${g.weeksToLearn}w to close`:""}</div>}
                              </div>
                            )
                          })()}
                        </div>
                      ))}
                    </Card>
                  ))}
                </div>
                <Card style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.2)`}}>
                  <div style={{fontSize:28}}>🎓</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.indigo,marginBottom:3}}>Ready to close these gaps?</div>
                    <div style={{fontSize:12,color:T.ink3}}>Skill Studio has AI-generated learning paths for your exact gaps</div>
                  </div>
                  <button onClick={()=>onNavigate("skillstudio")} style={{padding:"10px 22px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Go to Skill Studio →</button>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ RESILIENCE TAB ═══════════ */}
        {activeTab==="resilience"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            <div style={{marginBottom:28}}>
              <SectionLabel color={T.amber}>💪 Growth Intelligence</SectionLabel>
              <h2 style={{fontSize:26,fontWeight:800,color:T.ink,margin:"0 0 6px 0"}}>Failure Resume & Resilience Score</h2>
              <p style={{fontSize:13,color:T.ink3,margin:0}}>Radical transparency — your failures, your recovery, your growth</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
              {[
                {label:"Resilience",value:resilienceScore,suffix:"/100",col:resilienceColor,icon:"💪",sub:resilienceLabel},
                {label:"Attempted",value:totalAttempts,suffix:"",col:T.indigo,icon:"🎯",sub:"total tasks"},
                {label:"Failed",value:failedTasks.length,suffix:"",col:T.red,icon:"❌",sub:failRate+"% fail rate"},
                {label:"Recoveries",value:recoveryCount,suffix:"",col:T.green,icon:"🔄",sub:"bounced back"},
              ].map((s,i)=>(
                <Card key={i} style={{borderTop:`3px solid ${s.col}`,textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:9,fontWeight:800,color:s.col,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{s.label}</div>
                  <div style={{fontSize:32,fontWeight:900,color:s.col,fontFamily:"'DM Mono',monospace",lineHeight:1}}>{s.value}<span style={{fontSize:14}}>{s.suffix}</span></div>
                  <div style={{fontSize:11,color:T.ink4,marginTop:4}}>{s.sub}</div>
                </Card>
              ))}
            </div>
            <Card style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:T.ink}}>Overall Resilience</div>
                <Badge color={resilienceColor} bg={resilienceColor+"15"}>{resilienceScore>=80?"🔥":resilienceScore>=60?"⚡":resilienceScore>=40?"📈":"🌱"} {resilienceLabel}</Badge>
              </div>
              <div style={{height:8,background:T.cream3,borderRadius:99,marginBottom:8}}>
                <div style={{height:"100%",width:resilienceScore+"%",borderRadius:99,background:resilienceColor,transition:"width 1.2s ease"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.ink4}}>
                {["No Data","Early Stage","Building Grit","Resilient","Iron Will"].map((l,i)=>(
                  <span key={i} style={{color:resilienceScore>=(i*25)?resilienceColor:T.ink4,fontWeight:resilienceScore>=(i*25)?700:400}}>{l}</span>
                ))}
              </div>
            </Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
              <Card>
                <SectionLabel color={T.red}>❌ Failure Timeline</SectionLabel>
                {failedTasks.length===0
                  ? <div style={{textAlign:"center",padding:"30px 0"}}>
                      <div style={{fontSize:32,marginBottom:8}}>🎉</div>
                      <div style={{fontSize:13,fontWeight:700,color:T.green,marginBottom:4}}>No failures yet!</div>
                      <div style={{fontSize:11,color:T.ink4}}>Complete harder tasks to build resilience record</div>
                    </div>
                  : failedTasks.slice(0,6).map((f,i)=>(
                    <div key={i} style={{display:"flex",gap:12,marginBottom:i<5?16:0,paddingBottom:i<5?16:0,borderBottom:i<5?`1px solid ${T.border}`:"none"}}>
                      <div style={{flexShrink:0,width:38,height:38,borderRadius:10,background:T.red2,border:`1px solid rgba(192,57,43,0.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:T.red,fontFamily:"'DM Mono',monospace"}}>{f.score}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.ink,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.taskTitle||"Arena Task"}</div>
                        <div style={{fontSize:11,color:T.ink3,lineHeight:1.4}}>{f.feedback||"Keep practicing"}</div>
                        <div style={{fontSize:10,color:T.ink4,marginTop:3}}>{f.submittedAt?new Date(f.submittedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}</div>
                      </div>
                    </div>
                  ))}
              </Card>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <SectionLabel color={T.green}>🤖 AI Coach Insights</SectionLabel>
                  {failedTasks.length>0&&(
                    <button onClick={fetchResilienceInsights} disabled={resilienceLoading}
                      style={{padding:"5px 12px",background:T.green2,border:`1px solid rgba(26,122,74,0.2)`,borderRadius:8,color:T.green,fontSize:10,fontWeight:700,cursor:resilienceLoading?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
                      {resilienceLoading?<><div style={{width:10,height:10,border:`2px solid ${T.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>Loading...</>:"✨ Generate"}
                    </button>
                  )}
                </div>
                {failedTasks.length===0
                  ? <div style={{textAlign:"center",padding:"30px 0",fontSize:12,color:T.ink4}}>Complete some tasks first</div>
                  : !resilienceData&&!resilienceLoading
                  ? <div style={{textAlign:"center",padding:"30px 0"}}>
                      <div style={{fontSize:28,marginBottom:8}}>🧠</div>
                      <div style={{fontSize:13,color:T.ink3,marginBottom:16}}>Get AI analysis of your failure patterns</div>
                      <button onClick={fetchResilienceInsights} style={{padding:"10px 20px",background:T.green2,border:`1px solid rgba(26,122,74,0.2)`,borderRadius:10,color:T.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>Generate Insights</button>
                    </div>
                  : resilienceLoading
                  ? <div style={{textAlign:"center",padding:"30px 0"}}><div style={{width:28,height:28,border:`3px solid ${T.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/><div style={{fontSize:12,color:T.ink3}}>Analyzing patterns...</div></div>
                  : <div>
                      <div style={{background:T.green2,border:`1px solid rgba(26,122,74,0.15)`,borderRadius:10,padding:"12px 14px",marginBottom:14}}>
                        <div style={{fontSize:10,fontWeight:800,color:T.green,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Coach Says</div>
                        <p style={{margin:0,fontSize:12,color:T.ink2,lineHeight:1.7}}>{resilienceData.coachAdvice}</p>
                      </div>
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:10,fontWeight:800,color:T.amber,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Failure Patterns</div>
                        {(resilienceData.patterns||[]).map((p,i)=>(
                          <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:12,color:T.ink2,lineHeight:1.4}}>
                            <span style={{color:T.red,flexShrink:0}}>→</span>{p}
                          </div>
                        ))}
                      </div>
                      <div style={{background:T.amber2,border:`1px solid rgba(184,98,10,0.15)`,borderRadius:10,padding:"10px 14px"}}>
                        <div style={{fontSize:10,fontWeight:800,color:T.amber,marginBottom:4}}>🎯 THIS WEEK&apos;S CHALLENGE</div>
                        <div style={{fontSize:12,color:T.ink2,lineHeight:1.5}}>{resilienceData.weeklyChallenge}</div>
                      </div>
                    </div>}
              </Card>
            </div>
          </div>
        )}

        {/* ═══════════ CODE DNA TAB ═══════════ */}
        {activeTab==="fingerprint"&&(
          <div style={{animation:"fadeUp .3s ease both"}}>
            <div style={{marginBottom:20}}>
              <SectionLabel color={T.green}>🧬 Contribution Intelligence</SectionLabel>
              <h2 style={{fontSize:26,fontWeight:800,color:T.ink,margin:"0 0 6px 0"}}>Code DNA & Fingerprint</h2>
              <p style={{fontSize:13,color:T.ink3,margin:0}}>AI-verified proof of your coding identity and contribution patterns</p>
            </div>
            {/* Always-visible GitHub URL input */}
            <Card style={{marginBottom:20,borderTop:`3px solid ${T.green}`}}>
              <SectionLabel color={T.green}>🐙 GitHub Profile URL</SectionLabel>
              <div style={{fontSize:12,color:T.ink3,marginBottom:14,marginTop:4}}>Paste your GitHub profile URL to analyze your repos, languages, commit patterns and generate your Code DNA.</div>
              {/* 2026-08-05: heads-up before the first-ever analysis — Code
                  DNA becomes visible on the public Portfolio by default the
                  moment analysis succeeds (is_portfolio_visible/
                  is_recruiter_visible default true). Shown as long as no
                  analysis has been saved yet; disappears once one exists,
                  since the toggle in Settings → Proof & Portfolio takes over
                  from there. */}
              {!userData?.githubData && (
                <div style={{background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.18)`,borderRadius:10,padding:"9px 13px",marginBottom:14,fontSize:11,color:T.indigo,lineHeight:1.5}}>
                  ℹ️ Analyzing your GitHub makes Code DNA visible on your public portfolio by default. You can hide it anytime in Settings → Proof & Portfolio.
                </div>
              )}
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <input
                  value={githubUrl||(userData?.personalInfo?.githubUrl||"")}
                  onChange={e=>setGithubUrl(e.target.value)}
                  placeholder="https://github.com/your-username"
                  style={{flex:1,minWidth:240,padding:"10px 14px",background:T.cream,border:`1.5px solid ${T.border}`,borderRadius:10,color:T.ink,fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none"}}
                  onKeyDown={e=>e.key==="Enter"&&fetchGithubFingerprint()}
                />
                <button
                  onClick={()=>fetchGithubFingerprint()}
                  disabled={githubLoading||!(githubUrl||userData?.personalInfo?.githubUrl)}
                  style={{padding:"10px 24px",background:githubLoading||!(githubUrl||userData?.personalInfo?.githubUrl)?T.cream2:T.green,border:"none",borderRadius:10,color:githubLoading||!(githubUrl||userData?.personalInfo?.githubUrl)?T.ink4:"#fff",fontSize:13,fontWeight:700,cursor:githubLoading||!(githubUrl||userData?.personalInfo?.githubUrl)?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  {githubLoading?<><Spinner color={T.ink4}/>Analyzing...</>:"🧬 Analyze GitHub"}
                </button>
              </div>
              <div style={{marginTop:10,fontSize:11,color:T.ink4,display:"flex",gap:10,flexWrap:"wrap"}}>
                <span>Try:</span>
                {["https://github.com/torvalds","https://github.com/gaearon"].map((ex,i)=><button key={i} onClick={()=>setGithubUrl(ex)} style={{background:"transparent",border:"none",color:T.indigo,fontSize:11,cursor:"pointer",textDecoration:"underline",padding:0}}>{ex}</button>)}
              </div>
            </Card>
            {githubError&&(
              <div style={{background:T.red2,border:`1.5px solid rgba(192,57,43,0.2)`,borderRadius:12,padding:"14px 18px",marginBottom:20,color:T.red,fontSize:13}}>
                ⚠️ {githubError}
                <div style={{marginTop:8}}>
                  <button onClick={()=>showGithubExample()} style={{background:"transparent",border:"none",color:T.indigo,fontSize:12,cursor:"pointer",textDecoration:"underline",padding:0,fontWeight:600}}>See what a Code DNA card looks like (example data) →</button>
                </div>
              </div>
            )}
            {!githubData&&!githubLoading&&!githubError&&(
              <div style={{textAlign:"center",padding:"50px 20px"}}>
                <div style={{fontSize:52,marginBottom:16}}>🧬</div>
                <div style={{fontSize:15,fontWeight:600,color:T.ink3,marginBottom:8}}>Enter your GitHub URL above to get started</div>
                <div style={{fontSize:13,color:T.ink4,marginBottom:14}}>We&apos;ll scan your public repos and generate your unique Code DNA fingerprint</div>
                <button onClick={()=>showGithubExample("https://github.com/example-user")} style={{background:"transparent",border:"none",color:T.indigo,fontSize:12,cursor:"pointer",textDecoration:"underline",padding:0,fontWeight:600}}>See what a Code DNA card looks like (example data) →</button>
              </div>
            )}
            {githubLoading&&(
              <div style={{textAlign:"center",padding:"80px 20px"}}>
                <div style={{width:40,height:40,border:`3px solid ${T.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
                <div style={{fontSize:15,fontWeight:600,color:T.green}}>Scanning GitHub Profile...</div>
                <div style={{fontSize:12,color:T.ink3,marginTop:6}}>Fetching repos, commits and generating AI fingerprint</div>
              </div>
            )}
            {githubData&&!githubLoading&&(()=>{
              const fp=githubData.fingerprint||{}
              const LCOLS={"JavaScript":"#f7df1e","TypeScript":"#3178c6","Python":"#3776ab","Java":"#f89820","Go":"#00ADD8","Rust":"#dea584","C++":"#f34b7d","C#":"#9b4f96","Ruby":"#cc342d","PHP":"#777bb4","Swift":"#fa7343","Kotlin":"#7F52FF","HTML":"#e34c26","CSS":"#563d7c","Shell":"#89e051"}
              const authCol=fp.authenticityScore>=80?T.green:fp.authenticityScore>=60?T.amber:T.red
              const cacheAgeMs=githubData.analyzedAt?Date.now()-new Date(githubData.analyzedAt).getTime():null
              const cacheAgeLabel=cacheAgeMs==null?null:cacheAgeMs<3600000?"just now":cacheAgeMs<86400000?`${Math.floor(cacheAgeMs/3600000)}h ago`:`${Math.floor(cacheAgeMs/86400000)}d ago`
              return (
                <div>
                  {githubData.isExampleData ? (
                    <div style={{background:T.amber2,border:`1.5px solid rgba(184,98,10,0.25)`,borderRadius:12,padding:"10px 16px",marginBottom:16,color:T.amber,fontSize:12,fontWeight:700}}>
                      🧪 Example data — not a real fetch. Paste your own GitHub URL above to analyze your real profile.
                    </div>
                  ) : cacheAgeLabel && (
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,fontSize:11,color:T.ink4}}>
                      <span>Last analyzed {cacheAgeLabel}</span>
                      <button onClick={()=>fetchGithubFingerprint(null,true)} disabled={githubLoading} style={{background:"transparent",border:"none",color:T.indigo,fontSize:11,cursor:githubLoading?"default":"pointer",textDecoration:"underline",padding:0,fontWeight:600}}>Refresh</button>
                    </div>
                  )}
                  {!githubData.isExampleData && githubData.anyDetectionSkipped && (
                    <div style={{background:T.amber2,border:`1.5px solid rgba(184,98,10,0.25)`,borderRadius:12,padding:"10px 16px",marginBottom:16,color:T.amber,fontSize:12,fontWeight:700,lineHeight:1.6}}>
                      ⏳ GitHub couldn't be fully checked this time (rate limit or a temporary API issue) — commit counts, language mix, and tech detection below are estimates, not verified numbers. Try Refresh in a few minutes for the real data.
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
                    <Card style={{borderLeft:`4px solid ${T.green}`}}>
                      <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:16}}>
                        <img src={githubData.avatar} alt="" style={{width:56,height:56,borderRadius:"50%",border:`2px solid ${T.border}`}}/>
                        <div>
                          <div style={{fontSize:18,fontWeight:900,color:T.ink,display:"flex",alignItems:"center",gap:8}}>
                            {githubData.username}
                            {githubData.verified&&<span title="GitHub ownership verified" style={{fontSize:11,fontWeight:800,color:T.green,background:T.green2,borderRadius:999,padding:"2px 8px"}}>✓ Verified</span>}
                          </div>
                          <Badge color={T.green} bg={T.green2}>{fp.fingerprintTitle}</Badge>
                          <div style={{fontSize:11,color:T.ink3,marginTop:4}}>{githubData.bio||fp.specialization}</div>
                        </div>
                      </div>
                      <p style={{fontSize:12,color:T.ink2,lineHeight:1.7,margin:"0 0 16px"}}>{fp.dna}</p>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                        {(fp.patterns||[]).map((p,i)=><Badge key={i} color={T.green} bg={T.green2}>{p}</Badge>)}
                      </div>
                      {fp.standoutFact&&<div style={{background:T.amber2,border:`1px solid rgba(184,98,10,0.15)`,borderRadius:10,padding:"10px 14px",fontSize:12,color:T.amber,lineHeight:1.5,marginBottom:githubData.isExampleData||githubData.verified?0:12}}>⭐ {fp.standoutFact}</div>}
                      {!githubData.isExampleData && (() => {
                        // Canonical source (github_connections, via
                        // ghVerification) decides whether to show "verified"
                        // — not githubData.verified, which was only ever a
                        // same-session React state flag that never survived
                        // a page refresh (it was never persisted). Falling
                        // back to a just-completed githubVerifyMsg covers
                        // the brief moment before the post-verify refetch
                        // resolves.
                        const isVerified = ghVerification?.verified || githubVerifyMsg?.verified
                        if (isVerified) {
                          return (
                            <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`,fontSize:11,color:T.green,fontWeight:700}}>
                              ✓ GitHub ownership confirmed{ghVerification?.username?` for @${ghVerification.username}`:""}.
                            </div>
                          )
                        }
                        if (!ghVerification?.connected) return null // nothing canonical to verify yet
                        return (
                          <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                            <div style={{fontSize:11,color:T.ink3,marginBottom:8,lineHeight:1.6}}>
                              Verifying <strong style={{color:T.ink}}>@{ghVerification.username}</strong>. Add this verification code to your GitHub profile bio, save it on GitHub, then click Verify.
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                              <code style={{background:T.bgInner||"rgba(0,0,0,0.04)",border:`1px solid ${T.border}`,borderRadius:6,padding:"6px 10px",fontSize:11,color:T.ink,fontFamily:"monospace"}}>{ghVerification.code}</code>
                              <button
                                onClick={()=>{navigator.clipboard?.writeText(ghVerification.code); setCodeCopied(true); setTimeout(()=>setCodeCopied(false),2000)}}
                                style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:6,padding:"5px 10px",fontSize:10,fontWeight:700,color:T.ink3,cursor:"pointer"}}
                              >
                                {codeCopied?"Copied ✓":"Copy"}
                              </button>
                            </div>
                            <button onClick={verifyGithubOwnership} disabled={githubVerifying} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 12px",fontSize:11,fontWeight:700,color:T.ink2,cursor:githubVerifying?"default":"pointer"}}>
                              {githubVerifying?"Checking…":"🔒 Verify GitHub ownership"}
                            </button>
                            {githubVerifyMsg&&!githubVerifyMsg.verified&&(
                              <div style={{fontSize:11,color:T.ink3,marginTop:8,lineHeight:1.6}}>
                                {githubVerifyMsg.message}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </Card>
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      <Card style={{borderTop:`3px solid ${authCol}`}}>
                        <SectionLabel color={authCol}>🔐 Authenticity Score</SectionLabel>
                        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
                          <div style={{fontSize:44,fontWeight:900,color:authCol,fontFamily:"'DM Mono',monospace"}}>{fp.authenticityScore}</div>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:3}}>{fp.verificationStatus}</div>
                            <div style={{fontSize:11,color:T.ink3}}>{fp.codingStyle}</div>
                          </div>
                        </div>
                        <div style={{height:6,background:T.cream3,borderRadius:99}}>
                          <div style={{height:"100%",width:fp.authenticityScore+"%",borderRadius:99,background:authCol,transition:"width 1s ease"}}/>
                        </div>
                      </Card>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                        {[{label:"Repos",value:githubData.publicRepos,icon:"📦"},{label:"Followers",value:githubData.followers,icon:"👥"},{label:githubData.commitsAreExact?"Commits":"Commits (est.)",value:githubData.totalCommits,icon:"⚡"}].map((s,i)=>(
                          <Card key={i} style={{textAlign:"center",padding:"14px"}}>
                            <div style={{fontSize:16,marginBottom:4}}>{s.icon}</div>
                            <div style={{fontSize:20,fontWeight:900,color:T.ink,fontFamily:"'DM Mono',monospace"}}>{s.value}</div>
                            <div style={{fontSize:9,color:T.ink4,textTransform:"uppercase",letterSpacing:"0.08em",marginTop:2}}>{s.label}</div>
                          </Card>
                        ))}
                      </div>
                      {githubData.scores&&(
                        <>
                          <div style={{fontSize:9,color:T.ink4,marginTop:2}}>Estimates from public repo data — not verified measurements</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                            {[{label:"Builder",value:githubData.scores.builder,icon:"🏗️"},{label:"Documentation",value:githubData.scores.documentation,icon:"📝"},{label:"Consistency",value:githubData.scores.consistency,icon:"📈"},{label:"Tech Breadth",value:githubData.scores.techBreadth,icon:"🧩"},{label:"Tooling",value:githubData.scores.tooling,icon:"🛠️"}].filter(s=>s.value!=null).map((s,i)=>{
                              const col=s.value>=70?T.green:s.value>=40?T.amber:T.ink4
                              return (
                                <Card key={i} style={{textAlign:"center",padding:"12px"}}>
                                  <div style={{fontSize:14,marginBottom:3}}>{s.icon}</div>
                                  <div style={{fontSize:17,fontWeight:900,color:col,fontFamily:"'DM Mono',monospace"}}>{s.value}</div>
                                  <div style={{fontSize:8.5,color:T.ink4,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2}}>{s.label}</div>
                                </Card>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <Card style={{marginBottom:16}}>
                    <SectionLabel color="rgba(142,68,173,1)">🧬 Language DNA{githubData.languagesAreExact===false?" (estimated)":""}</SectionLabel>
                    <div style={{display:"flex",height:14,borderRadius:99,overflow:"hidden",margin:"12px 0",gap:2}}>
                      {(githubData.languages||[]).map((l,i)=><div key={i} style={{flex:l.pct,background:LCOLS[l.lang]||T.ink4,minWidth:l.pct>3?2:0}}/>)}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
                      {(githubData.languages||[]).map((l,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:LCOLS[l.lang]||T.ink4}}/>
                          <span style={{fontSize:12,color:T.ink2}}>{l.lang}</span>
                          <span style={{fontSize:11,color:T.ink4}}>{l.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <SectionLabel color={T.blue}>📦 Top Repositories</SectionLabel>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginTop:12}}>
                      {(githubData.topRepos||[]).map((r,i)=>(
                        <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{background:T.cream,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px",textDecoration:"none",display:"block",transition:"all 0.2s"}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.indigo+"50";e.currentTarget.style.background="#fff"}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.cream}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{r.name}</div>
                            <div style={{display:"flex",gap:8,fontSize:11,color:T.ink4}}><span>⭐{r.stars}</span><span>🍴{r.forks}</span></div>
                          </div>
                          {r.desc&&<div style={{fontSize:11,color:T.ink3,lineHeight:1.5,marginBottom:8}}>{r.desc.slice(0,80)}{r.desc.length>80?"...":""}</div>}
                          {((r.techStack&&r.techStack.length>0)||r.hasReadme||(r.topics&&r.topics.length>0)||r.detectionSkipped)&&(
                            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                              {r.hasReadme&&<span style={{fontSize:9.5,fontWeight:700,color:T.green,background:T.green2,borderRadius:6,padding:"2px 6px"}}>📄 README</span>}
                              {(r.techStack||[]).map((t,ti)=><span key={`t${ti}`} style={{fontSize:9.5,fontWeight:700,color:T.indigo,background:"rgba(61,78,172,0.08)",border:"1px solid rgba(61,78,172,0.16)",borderRadius:6,padding:"2px 6px"}}>{t}</span>)}
                              {(r.topics||[]).map((t,ti)=><span key={`tp${ti}`} style={{fontSize:9.5,fontWeight:700,color:T.ink3,background:T.cream2,borderRadius:6,padding:"2px 6px"}}>#{t}</span>)}
                              {r.detectionSkipped&&<span style={{fontSize:9.5,fontWeight:700,color:T.amber,background:T.amber2,borderRadius:6,padding:"2px 6px"}}>⏳ Detection skipped (rate limited)</span>}
                            </div>
                          )}
                          {/* Ownership/originality evidence (2026-09-03) —
                              deliberately evidence-graded language only
                              ("Strong ownership evidence", "Substantial
                              contributor", ...) — see classifyOwnership in
                              routes/github.js. Never "verified owner" or
                              "not copied"; a fork is named when we know its
                              real parent, never invented. */}
                          {r.ownership&&(
                            <div
                              title={r.ownership.detail}
                              style={{
                                fontSize:10.5, fontWeight:700, borderRadius:6, padding:"3px 8px", marginBottom:8,
                                display:"inline-block",
                                color: r.ownership.tone==="positive"?T.green : r.ownership.tone==="caution"?T.amber : T.ink4,
                                background: r.ownership.tone==="positive"?T.green2 : r.ownership.tone==="caution"?T.amber2 : T.cream2,
                              }}
                            >
                              {r.isFork ? "🍴 " : ""}{r.ownership.label}{r.isFork && r.parentFullName ? ` (of ${r.parentFullName})` : ""}
                            </div>
                          )}
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            {r.lang&&<><div style={{width:8,height:8,borderRadius:"50%",background:LCOLS[r.lang]||T.ink4}}/><span style={{fontSize:11,color:T.ink3}}>{r.lang}</span></>}
                            <span style={{fontSize:10,color:T.ink4,marginLeft:"auto"}}>{r.updated}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </Card>
                  {!githubData.isExampleData && (githubData.topRepos||[]).length>0 && (() => {
                    // overallVerdict is the long-form string the model returns
                    // ("Genuine understanding" | "Partial understanding" |
                    // "Vague or generic" | "Doesn't match stated project");
                    // per-question feedback uses short codes ("Genuine" |
                    // "Partial" | "Vague" | "Mismatch") — two small mapping
                    // helpers instead of overloading one function for both.
                    const verdictCol = v => v==="Genuine understanding"?T.green : v==="Doesn't match stated project"?T.red : T.amber
                    const verdictBg  = v => v==="Genuine understanding"?T.green2 : v==="Doesn't match stated project"?T.red2 : T.amber2
                    const qCol = v => v==="Genuine"?T.green : v==="Mismatch"?T.red : T.amber
                    const q = riQuestions?.[riStep]
                    return (
                      <Card style={{marginTop:16}}>
                        <SectionLabel color={T.blue}>🎤 AI Repository Interview</SectionLabel>
                        <div style={{fontSize:11,color:T.ink4,marginTop:2,marginBottom:12,lineHeight:1.6}}>
                          AI-generated questions about your real analyzed repo — a comprehension check for recruiters, not a coding test or an authoritative score.
                        </div>
                        {riError && <div style={{fontSize:11,color:T.red,marginBottom:10}}>{riError}</div>}

                        {!riQuestions && !repoInterview && (
                          <button onClick={startRepoInterview} disabled={riGenerating} style={{background:T.indigo,color:"#fff",border:"none",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:riGenerating?"default":"pointer"}}>
                            {riGenerating?"Generating questions…":"Start Interview"}
                          </button>
                        )}

                        {riQuestions && q && (
                          <div>
                            <div style={{fontSize:10,color:T.ink4,marginBottom:6}}>Question {riStep+1} of {riQuestions.length}{q.testsSignal?` · tests: ${q.testsSignal}`:""}</div>
                            <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:10,lineHeight:1.6}}>{q.question}</div>
                            <textarea
                              value={riAnswers[q.id]||""}
                              onChange={e=>setRiAnswers(prev=>({...prev,[q.id]:e.target.value}))}
                              placeholder="Type your answer…"
                              rows={4}
                              style={{width:"100%",boxSizing:"border-box",border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:T.ink,fontFamily:"inherit",resize:"vertical",marginBottom:10}}
                            />
                            <div style={{display:"flex",gap:8}}>
                              {riStep>0 && (
                                <button onClick={()=>setRiStep(s=>s-1)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,color:T.ink2,cursor:"pointer"}}>Back</button>
                              )}
                              {riStep<riQuestions.length-1 ? (
                                <button onClick={()=>setRiStep(s=>s+1)} style={{background:T.indigo,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Next</button>
                              ) : (
                                <button onClick={submitRepoInterview} disabled={riSubmitting} style={{background:T.green,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:riSubmitting?"default":"pointer"}}>
                                  {riSubmitting?"Submitting…":"Submit Interview"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {repoInterview && !riQuestions && (
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                              <Badge color={verdictCol(repoInterview.evaluation?.overallVerdict)} bg={verdictBg(repoInterview.evaluation?.overallVerdict)}>{repoInterview.evaluation?.overallVerdict||"Assessed"}</Badge>
                              <span style={{fontSize:10,color:T.ink4}}>AI-assessed, not a verified fact</span>
                            </div>
                            {repoInterview.evaluation?.summary && <p style={{fontSize:12,color:T.ink2,lineHeight:1.7,margin:"0 0 14px"}}>{repoInterview.evaluation.summary}</p>}
                            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
                              {(repoInterview.transcript||[]).map((t,i) => {
                                const fb = (repoInterview.evaluation?.questionFeedback||[]).find(f=>f.questionId===t.questionId)
                                return (
                                  <div key={i} style={{background:T.cream,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px"}}>
                                    <div style={{fontSize:12,fontWeight:700,color:T.ink,marginBottom:4}}>{t.question}</div>
                                    <div style={{fontSize:11.5,color:T.ink3,lineHeight:1.6,marginBottom:fb?6:0}}>{t.answer||<em>No answer given</em>}</div>
                                    {fb && <div style={{fontSize:10.5,color:qCol(fb.verdict)}}>{fb.verdict}{fb.note?` — ${fb.note}`:""}</div>}
                                  </div>
                                )
                              })}
                            </div>
                            <button onClick={startRepoInterview} disabled={riGenerating} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,color:T.ink2,cursor:riGenerating?"default":"pointer"}}>
                              {riGenerating?"Generating…":"Retake Interview"}
                            </button>
                          </div>
                        )}
                      </Card>
                    )
                  })()}
                  {!githubData.isExampleData && crossVerify && ((crossVerify.corroborated?.length||0) + (crossVerify.newSignals?.length||0) > 0) && (
                    <Card style={{marginTop:16}}>
                      <SectionLabel color={T.green}>🔗 Cross-Verification</SectionLabel>
                      <div style={{fontSize:11,color:T.ink4,marginTop:2,marginBottom:12,lineHeight:1.6}}>
                        Comparing Code DNA's detected tech against your Skills (built from Arena, Skill Studio, resume, and manual entries). Informational only — a tech signal with no match here just means it isn't reflected in your Skills yet, not that you lack it.
                      </div>
                      {crossVerify.corroborated?.length>0 && (
                        <div style={{marginBottom:crossVerify.newSignals?.length?14:0}}>
                          <div style={{fontSize:9.5,fontWeight:800,color:T.ink4,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Corroborated by your Skills</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                            {crossVerify.corroborated.map((c,i)=>(
                              <div key={i} title={c.verified?"Verified skill":undefined} style={{display:"flex",alignItems:"center",gap:6,background:T.green2,border:"1px solid rgba(26,122,74,0.15)",borderRadius:8,padding:"6px 10px",fontSize:11}}>
                                <span style={{fontWeight:700,color:T.ink}}>{c.signal}</span>
                                <span style={{color:T.ink4}}>↔ {c.matchedSkill}</span>
                                {c.verified && <span style={{color:T.green,fontWeight:700}}>✓</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {crossVerify.newSignals?.length>0 && (
                        <div>
                          <div style={{fontSize:9.5,fontWeight:800,color:T.ink4,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Seen in code, not yet in your Skills</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                            {crossVerify.newSignals.map((s,i)=>(
                              <span key={i} style={{background:T.cream,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:700,color:T.ink2}}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                  {!githubData.isExampleData && ((githubData.repoTimeline?.length||0)>0 || githubData.accountCreatedAt) && (() => {
                    const fmtDate = iso => { if(!iso) return ""; try { return new Date(iso).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) } catch { return "" } }
                    const events = [
                      ...(githubData.accountCreatedAt ? [{date:githubData.accountCreatedAt, label:"GitHub account created", type:"account"}] : []),
                      ...(githubData.repoTimeline||[]).filter(r=>r.createdAt).map(r=>({date:r.createdAt, label:`Started ${r.name}`, type:"repo", sub:r.language})),
                    ].sort((a,b)=>new Date(b.date)-new Date(a.date))
                    const shown = events.slice(0,10)
                    const history = (githubData.scoreHistory||[]).slice(-6)
                    return (
                      <Card style={{marginTop:16}}>
                        <SectionLabel color={T.indigo}>🕓 Developer Identity Timeline</SectionLabel>
                        <div style={{fontSize:11,color:T.ink4,marginTop:2,marginBottom:12,lineHeight:1.6}}>
                          Real dates from GitHub — account creation and when each project started. No commit-by-commit history is shown here, since only a total commit count is verified, not a real per-period breakdown.
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:0}}>
                          {shown.map((e,i)=>(
                            <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<shown.length-1?`1px solid ${T.border}`:"none"}}>
                              <div style={{width:8,height:8,borderRadius:"50%",marginTop:5,flexShrink:0,background:e.type==="account"?T.indigo:T.blue}}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:12,fontWeight:700,color:T.ink}}>{e.label}</div>
                                <div style={{fontSize:10.5,color:T.ink4,marginTop:1}}>{fmtDate(e.date)}{e.sub?` · ${e.sub}`:""}</div>
                              </div>
                            </div>
                          ))}
                          {events.length>shown.length && <div style={{fontSize:10.5,color:T.ink4,marginTop:6}}>+ {events.length-shown.length} earlier event(s)</div>}
                        </div>
                        {history.length>1 && (
                          <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
                            <div style={{fontSize:9.5,fontWeight:800,color:T.ink4,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Analysis history (this account, over time)</div>
                            <div style={{display:"flex",flexDirection:"column",gap:6}}>
                              {history.slice().reverse().map((h,i)=>(
                                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.ink3}}>
                                  <span>{fmtDate(h.analyzedAt)}</span>
                                  <span>{h.totalCommits}{h.commitsAreExact?"":"~"} commits · Builder {h.scores?.builder ?? "—"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })()}
                </div>
              )
            })()}
          </div>
        )}

        {/* ═══════════ VAULT TAB ═══════════ */}
        {activeTab==="vault"&&path!=="professional"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            {/* ── Student Vault: Summary + Verification + EPFO + Upload ── */}
            <div style={{marginBottom:24}}>
              <SectionLabel color={T.indigo}>🗄️ Career & Vault</SectionLabel>
              <h2 style={{fontSize:22,fontWeight:800,color:T.ink,margin:"4px 0 0"}}>Your Documents & Verification</h2>
              <p style={{fontSize:13,color:T.ink3,margin:"6px 0 0"}}>Verify your identity, upload your resume and documents — everything syncs to your portfolio.</p>
            </div>

            {/* ── Profile Summary (2026-08-17) — same on-demand Groq
                generator the professional path already has, grounded in
                real Arena performance instead of work experience. ── */}
            <ProfileSummaryCard
              userData={userData}
              onSave={async(updates)=>{
                await save(updates)
                if(setUserData) setUserData(p=>({...p,...updates}))
              }}
            />

            {/* Profile Verification */}
            <VerificationSection
              userData={userData}
              user={user}
              onUpdate={async(updates)=>{
                await save(updates)
                if(setUserData) setUserData(p=>({...p,...updates}))
              }}
            />

            {/* Upload section */}
            <Card style={{marginBottom:20,background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.15)`}}>
              <SectionLabel color={T.indigo}>⬆️ Upload File</SectionLabel>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,marginTop:10}}>
                {["Resume","Certification","Badge","Project","Other"].map(cat=>(
                  <button key={cat} onClick={()=>setUploadCategory(cat)}
                    style={{padding:"6px 14px",borderRadius:99,border:`1.5px solid ${uploadCategory===cat?"rgba(61,78,172,0.4)":T.border}`,
                      background:uploadCategory===cat?T.indigo:"#fff",color:uploadCategory===cat?"#fff":T.ink3,
                      fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                    {getCatIcon(cat)} {cat}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                <button onClick={()=>{if(uploadCategory==="Resume"){resumeFileInputRef.current?.click()}else{fileInputRef.current?.click()}}}
                  disabled={uploading||resumeUploading}
                  style={{padding:"10px 20px",background:uploading||resumeUploading?T.cream2:T.indigo,border:"none",borderRadius:10,
                    color:uploading||resumeUploading?T.ink4:"#fff",fontSize:13,fontWeight:700,cursor:uploading||resumeUploading?"not-allowed":"pointer",
                    display:"flex",alignItems:"center",gap:7}}>
                  {uploading||resumeUploading?<><div style={{width:12,height:12,border:`2px solid ${T.ink4}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>{resumeUploading?"Parsing resume…":"Uploading…"}</>:"⬆️ Upload File"}
                </button>
                {uploadCategory==="Resume"&&resumeStatus&&(
                  <div style={{fontSize:11,color:resumeStatus.startsWith("✅")?T.green:resumeStatus.startsWith("❌")?T.red:T.ink3,fontWeight:500}}>{resumeStatus}</div>
                )}
              </div>
              {vaultFiles.length>0&&(
                <div style={{marginTop:20}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:T.ink4,textTransform:"uppercase",marginBottom:12}}>Uploaded Files ({vaultFiles.length})</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                    {vaultFiles.map((file,i)=>{
                      const c=getCatColor(file.category), isImg=file.type?.startsWith("image/")
                      return (
                        <div key={file.id||i} style={{background:"#FFFFFF",border:`1px solid ${c}20`,borderRadius:12,padding:"12px",display:"flex",flexDirection:"column",gap:6,boxShadow:T.shadow}}>
                          <div style={{height:48,background:c+"10",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                            {isImg?<img src={file.url} alt={file.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8}}/>:<span style={{fontSize:22}}>{getCatIcon(file.category)}</span>}
                          </div>
                          <div style={{fontSize:11,fontWeight:600,color:T.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
                          <div style={{display:"flex",gap:4}}>
                            {file.url&&<a href={file.url} target="_blank" rel="noreferrer" style={{flex:1,padding:"5px",background:c+"10",border:`1px solid ${c}20`,borderRadius:6,color:c,fontSize:10,fontWeight:600,textDecoration:"none",textAlign:"center"}}>👁️ View</a>}
                            <button onClick={()=>deleteFile(file.id||i.toString())} style={{padding:"5px 8px",background:T.red2,border:`1px solid rgba(192,57,43,0.15)`,borderRadius:6,color:T.red,fontSize:10,cursor:"pointer",fontWeight:600}}>🗑️</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* ── My Projects ───────────────────────────────────────────── */}
            <StudentProjectsPanel
              projects={userData?.resumeProjects||[]}
              onSave={async(projects)=>{ await save({resumeProjects:projects}); if(setUserData) setUserData(p=>({...p,resumeProjects:projects})) }}
            />

            {/* ── Certificates & Training ───────────────────────────────── */}
            <StudentCertificatesPanel
              // Normalise legacy resume-imported certs that were saved as plain
              // strings (pre-fix Career-page uploads) into proper objects so
              // they show their real name instead of falling back to a generic
              // "Certificate" label, and so verificationStatus exists to check.
              certs={(userData?.certificates||[]).map(c=>typeof c==="string"?{name:c,verificationStatus:"self-claimed",_source:"resume"}:c)}
              onSave={async(certs)=>{ await save({certificates:certs}); if(setUserData) setUserData(p=>({...p,certificates:certs})) }}
            />

            {/* ── Education ──────────────────────────────────────────────── */}
            <EducationPanel
              education={userData?.education||[]}
              onSave={async(education)=>{ await save({education}); if(setUserData) setUserData(p=>({...p,education})) }}
            />

            {/* ── Recommendations ───────────────────────────────────────── */}
            <StudentTestimonialsPanel
              testimonials={userData?.testimonials||[]}
              onSave={async(t)=>{ await save({testimonials:t}); if(setUserData) setUserData(p=>({...p,testimonials:t})) }}
            />

            {/* ── Profile Links ─────────────────────────────────────────── */}
            <Card style={{marginTop:0,marginBottom:20}}>
              <SectionLabel color={T.indigo}>🔗 Profile Links</SectionLabel>
              <p style={{fontSize:12,color:T.ink3,margin:"0 0 14px"}}>These appear as buttons on your public portfolio page.</p>
              <ProfileLinksForm userData={userData} save={save} setUserData={setUserData}/>
            </Card>

            {/* ── GitHub & Code DNA status (2026-09-03) ───────────────────
                Career & Vault stays a professional portfolio/career screen,
                not a developer dashboard (per the design report) — this is
                the compact variant: status + "Updated Xh ago" + a link out
                to the real Code DNA tab, never the full analysis inline. */}
            <div style={{marginBottom:20}}>
              <GithubCodeDnaCard variant="compact" />
            </div>
          </div>
        )}

        {/* ═══════════ VAULT TAB (PROFESSIONAL) ═══════════ */}
        {activeTab==="vault"&&path==="professional"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>

            {/* ── Profile header: photo, cover, name, portfolio link ── */}
            <ProfileHeader/>

            {/* ── Profile Summary (2026-07-26) — auto-generated from real
                skills/experience, editable, never silently overwritten. ── */}
            <ProfileSummaryCard userData={userData} onSave={save}/>

            {/* ── Skill Rating History (2026-07-26) — real Weekly Skill
                Pulse results + ELO impact, not a static/fabricated log. ── */}
            <SkillRatingHistoryCard/>

            {/* ── Recruiter Readiness Score — new (2026-07-24), replaces the
                Arena-coupled dashboard/resilience content professionals never
                had a reason to see. Composite of real, already-present profile
                signals only — no ELO, no Arena, nothing fabricated. */}
            {(() => {
              const checks = [
                { label: "Resume uploaded",     done: !!(userData?.resumeFileName || vaultFiles.some(f=>f.category==="Resume")), weight: 20 },
                { label: "Career timeline",     done: experiences.length > 0,                    weight: 20 },
                { label: "Target role set",     done: !!userData?.targetRole,                    weight: 15 },
                { label: "Skills mapped",       done: (userData?.skills||[]).length > 0,         weight: 15 },
                { label: "Profile summary",     done: !!userData?.profileSummary,                weight: 10 },
                { label: "Certifications",      done: (userData?.certifications||[]).length > 0, weight: 10 },
                { label: "Employment verified", done: !!userData?.epfoVerified,                  weight: 10 },
              ]
              const score = checks.reduce((sum,c)=>sum+(c.done?c.weight:0),0)
              const missing = checks.filter(c=>!c.done)
              return (
                <Card style={{marginBottom:20, background:"linear-gradient(135deg,#FAF7F2,#fff)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
                    <div style={{flex:1,minWidth:220}}>
                      <SectionLabel color={T.indigo}>Recruiter Readiness</SectionLabel>
                      <div style={{fontSize:13,color:T.ink3,marginTop:4,lineHeight:1.5}}>
                        How complete your profile looks to a recruiter viewing your portfolio — based on what's actually filled in.
                      </div>
                    </div>
                    <div style={{textAlign:"center",flexShrink:0}}>
                      <div style={{fontFamily:"'DM Mono',monospace",fontSize:34,fontWeight:800,color:score>=80?T.green:score>=50?T.amber:T.red}}>
                        {score}<span style={{fontSize:14,color:T.ink4}}>/100</span>
                      </div>
                    </div>
                  </div>
                  {missing.length>0 && (
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
                      {missing.map((c,i)=>(
                        <span key={i} style={{fontSize:11,padding:"5px 10px",borderRadius:99,background:T.amber2,color:T.amber,fontWeight:600}}>+{c.weight} · {c.label}</span>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })()}

            {/* Portfolio link + share */}
            <Card style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                <div>
                  <SectionLabel color={T.indigo}>Your Portfolio URL</SectionLabel>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                    <span style={{fontSize:13,color:T.indigo,fontFamily:T.mono,fontWeight:600}}>
                      {window.location.host}/portfolio/{portfolioDisplay}
                    </span>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{
                    navigator.clipboard.writeText(`${window.location.origin}/portfolio/${portfolioSlug}`)
                  }} style={{padding:"8px 16px",background:T.indigo3,border:`1px solid rgba(61,78,172,0.2)`,
                    borderRadius:9,color:T.indigo,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    Copy Link
                  </button>
                  <a href={`/portfolio/${portfolioSlug}`} target="_blank" rel="noreferrer"
                    style={{padding:"8px 16px",background:T.indigo,border:"none",borderRadius:9,
                      color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",textDecoration:"none",
                      display:"inline-flex",alignItems:"center"}}>
                    Open →
                  </a>
                </div>
              </div>
            </Card>

            {/* Career Timeline (add/edit work history) was removed from here
                (2026-07-24, Career OS Workstream 0 follow-up) — it duplicated
                Orbit's own "Career Timeline" tab (Orbit.jsx TimelineTab), which
                edits this exact same userData.experiences field. Career history
                management now lives only in Orbit → Career Timeline; this tab
                stays scoped to genuinely Profile content (documents, vault
                files, verification) that has no home in Orbit or Skills. */}

            {/* ── Verification & Documents below ── */}
            <div style={{marginBottom:24}}>
              <SectionLabel color={T.indigo}>Vault</SectionLabel>
              <h2 style={{fontSize:22,fontWeight:800,color:T.ink,margin:"0 0 4px 0"}}>Documents & Verification</h2>
              <p style={{fontSize:13,color:T.ink3,margin:0}}>Resumes, certs, EPFO verification — all synced to your portfolio</p>
            </div>

            {/* Profile Verification */}
            <VerificationSection
              userData={userData}
              user={user}
              onUpdate={async(updates)=>{
                await save(updates)
                if(setUserData) setUserData(p=>({...p,...updates}))
              }}
            />

            {/* Upload section */}
            <Card style={{marginBottom:20,background:T.indigo3,border:`1.5px solid rgba(61,78,172,0.15)`}}>
              <SectionLabel color={T.indigo}>Upload New File</SectionLabel>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,marginTop:10}}>
                {["Resume","Certification","Badge","Project","Other"].map(cat=>(
                  <button key={cat} onClick={()=>setUploadCategory(cat)}
                    style={{padding:"6px 14px",borderRadius:99,border:`1.5px solid ${uploadCategory===cat?"rgba(61,78,172,0.4)":T.border}`,
                      background:uploadCategory===cat?T.indigo:"#fff",color:uploadCategory===cat?"#fff":T.ink3,
                      fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                    {getCatIcon(cat)} {cat}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                <button onClick={()=>{if(uploadCategory==="Resume"){resumeFileInputRef.current?.click()}else{fileInputRef.current?.click()}}}
                  disabled={uploading||resumeUploading}
                  style={{padding:"10px 20px",background:uploading||resumeUploading?T.cream2:T.indigo,border:"none",borderRadius:10,
                    color:uploading||resumeUploading?T.ink4:"#fff",fontSize:13,fontWeight:700,cursor:uploading||resumeUploading?"not-allowed":"pointer",
                    display:"flex",alignItems:"center",gap:7}}>
                  {uploading||resumeUploading?<><div style={{width:12,height:12,border:`2px solid ${T.ink4}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>{resumeUploading?"Parsing resume…":"Uploading…"}</>:"⬆️ Upload File"}
                </button>
                {uploadCategory==="Resume"&&resumeStatus&&(
                  <div style={{fontSize:11,marginTop:12,color:resumeStatus.startsWith("✅")?T.green:resumeStatus.startsWith("❌")?T.red:T.ink3,fontWeight:500}}>{resumeStatus}</div>
                )}
              </div>
            </Card>

            {/* ── Certificates & Training ───────────────────────────────── */}
            <StudentCertificatesPanel
              // Normalise legacy resume-imported certs that were saved as plain
              // strings (pre-fix Career-page uploads) into proper objects so
              // they show their real name instead of falling back to a generic
              // "Certificate" label, and so verificationStatus exists to check.
              certs={(userData?.certificates||[]).map(c=>typeof c==="string"?{name:c,verificationStatus:"self-claimed",_source:"resume"}:c)}
              onSave={async(certs)=>{ await save({certificates:certs}); if(setUserData) setUserData(p=>({...p,certificates:certs})) }}
            />

            {/* ── Education ──────────────────────────────────────────────── */}
            <EducationPanel
              education={userData?.education||[]}
              onSave={async(education)=>{ await save({education}); if(setUserData) setUserData(p=>({...p,education})) }}
            />

            {/* EPFO Verification in Vault */}
            <Card style={{marginBottom:20,border:`1.5px solid rgba(26,122,74,0.15)`}}>
              <SectionLabel color={T.green}>🛡️ Identity & Employment Verification</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:12}}>
                {(() => {
                  // BUG FIX: this used to treat "any certification record exists"
                  // as "verified" — showing "✓ Verified" here even for certs
                  // literally tagged "SELF-CLAIMED" in the list right above.
                  // verificationStatus only ever becomes "verified" server-side,
                  // via the real /api/verify/certification-file check — count only that.
                  const allCerts = userData?.certifications || []
                  const verifiedCerts = allCerts.filter(c => (typeof c === "object" ? c?.verificationStatus : null) === "verified")
                  return [
                    {icon:"🏢",label:"EPFO",sub:"Employment via UAN",done:userData?.epfoVerified,color:T.green,bg:T.green2},
                    {icon:"🎓",label:"DigiLocker",sub:"Education certificates",done:userData?.educationVerified,color:T.amber,bg:T.amber2},
                    {icon:"🏆",label:"Certs",sub:verifiedCerts.length>0?`${verifiedCerts.length} of ${allCerts.length} verified`:(allCerts.length>0?`${allCerts.length} pending verification`:"None added"),done:verifiedCerts.length>0,color:T.indigo,bg:T.indigo3},
                  ]
                })().map((v,i)=>(
                  <div key={i} style={{background:v.done?v.bg:T.cream,border:`1.5px solid ${v.done?v.color+"30":T.border}`,borderRadius:12,padding:"14px",textAlign:"center"}}>
                    <div style={{fontSize:22,marginBottom:8}}>{v.icon}</div>
                    <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:3}}>{v.label}</div>
                    <div style={{fontSize:11,color:T.ink4,marginBottom:8}}>{v.sub}</div>
                    {v.done
                      ? <Badge color={v.color} bg={v.bg}>✓ Verified</Badge>
                      : <Badge color={T.ink4} bg={T.cream2}>Pending</Badge>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
              {["Resume","Certification","Badge","Project","Other"].map(cat=>{
                const n=vaultFiles.filter(f=>f.category===cat).length
                const c=getCatColor(cat)
                return (
                  <div key={cat} style={{background:"#FFFFFF",border:`1.5px solid ${c}25`,borderRadius:12,padding:"12px",textAlign:"center",boxShadow:T.shadow}}>
                    <div style={{fontSize:18,marginBottom:4}}>{getCatIcon(cat)}</div>
                    <div style={{fontSize:20,fontWeight:800,color:c}}>{n}</div>
                    <div style={{fontSize:9,color:T.ink4,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>{cat}</div>
                  </div>
                )
              })}
            </div>

            {/* Files grid */}
            {vaultFiles.length>0?(
              <>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:T.ink4,textTransform:"uppercase",marginBottom:14}}>Your Files ({vaultFiles.length})</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {vaultFiles.map((file,i)=>{
                    const c=getCatColor(file.category), isImg=file.type?.startsWith("image/")
                    return (
                      <div key={file.id||i} className="hover-card" style={{background:"#FFFFFF",border:`1px solid ${c}20`,borderRadius:14,padding:"14px",display:"flex",flexDirection:"column",gap:8,boxShadow:T.shadow}}>
                        <div style={{height:64,background:c+"10",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                          {isImg?<img src={file.url} alt={file.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:10}}/>:<span style={{fontSize:28}}>{getCatIcon(file.category)}</span>}
                        </div>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:T.ink,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                            <Badge color={c} bg={c+"10"}>{file.category}</Badge>
                            {file.size&&<span style={{fontSize:9,color:T.ink4}}>{file.size}</span>}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6,marginTop:"auto"}}>
                          {file.url&&<a href={file.url} target="_blank" rel="noreferrer" style={{flex:1,padding:"6px",background:c+"10",border:`1px solid ${c}20`,borderRadius:7,color:c,fontSize:11,fontWeight:600,textDecoration:"none",textAlign:"center"}}>👁️ View</a>}
                          <button onClick={()=>deleteFile(file.id||i.toString())} style={{padding:"6px 9px",background:T.red2,border:`1px solid rgba(192,57,43,0.15)`,borderRadius:7,color:T.red,fontSize:11,cursor:"pointer",fontWeight:600}}>🗑️</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ):(
              <div style={{textAlign:"center",padding:"50px 0",color:T.ink4}}>
                <div style={{fontSize:40,marginBottom:14}}>📂</div>
                <div style={{fontSize:14,fontWeight:600,color:T.ink3,marginBottom:5}}>Vault is empty</div>
                <div style={{fontSize:12}}>Upload your resume, certifications, or badges above</div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ VOUCHER TAB ═══════════ */}
        {activeTab==="voucher"&&<SkillVoucherPanel user={user} userData={userData}/>}

        {/* "pro-skills" (Skill Graph) tab removed 2026-07-24 — it rendered the
            exact same SkillGraphView component (previously imported above as
            SkillGraphPro) that Skills.jsx, the standalone Skills module, now
            owns as a top-level nav destination. Full duplication, no unique
            content lost. */}

        {/* student-only — professionals reach the same component via
            Launchpad's "Interview Prep" tab now (see PROFESSIONAL_TAB_IDS
            comment above); "interview" is no longer in PROFESSIONAL_TAB_IDS
            so this can't be reached for path==="professional" via deep link
            either, but the explicit guard documents the intent. */}
        {activeTab==="interview"&&path!=="professional"&&(
          <AIInterviewPanel user={user} userData={userData} onNavigate={onNavigate} onNavigatePricing={onNavigatePricing} save={save} setUserData={setUserData}/>
        )}

        {/* ═══════════ MONTH REPORT TAB (student only — see PROFESSIONAL_TAB_IDS
            comment above; MonthlyReportPanel is raw-ELO/Arena content) ═══════ */}
        {activeTab==="monthreport"&&path!=="professional"&&(
          <MonthlyReportPanel userData={userData} skillGraph={skillGraph} eloHistory={eloHistory} eloRating={eloRating} keyword={keyword} arenaCompleted={arenaCompleted} user={user}/>
        )}

        {/* ═══════════ AI VIDEO (EchoPitch) TAB — professional only ═══════════
            Same component/props the student dashboard tab uses — skillGraph,
            echoPitchCompletedTasks and experiences are all path-neutral
            (proof_objects/user_skills-sourced, not Arena-specific), so no
            data adaptation was needed, just making the tab reachable. */}
        {activeTab==="echopitch"&&path==="professional"&&(
          <div style={{animation:"fadeUp 0.3s ease both"}}>
            <EchoPitchHero
              userData={userData}
              skillGraph={skillGraph}
              completedTasks={echoPitchCompletedTasks}
              experiences={experiences}
              isElite={auraPlan.id==="elite"}
              onGenerate={()=>setShowVideoGenerator(true)}
              onNavigatePricing={onNavigatePricing}
            />
          </div>
        )}

        {/* ═══════════ SETTINGS TAB ═══════════ */}
        {activeTab==="settings"&&(
          <SettingsPanel
            userData={userData}
            user={user}
            save={save}
            setUserData={setUserData || setLocalUserData}
            path={path}
          />
        )}

      </div>
    </div>
  )
}