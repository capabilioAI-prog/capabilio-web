import { useState, useRef, useEffect } from "react"
import { motion, useReducedMotion, useInView } from "framer-motion"
import {
  ClipboardCheck, Network, BookOpen, Swords, FolderCheck, Search,
  ArrowRight, Check, ChevronDown,
  ShieldCheck, XCircle, Play, Loader2, TrendingUp,
} from "lucide-react"
import { T, EASE } from "../lib/osDesignTokens"
import { PRIMARY_PATHS, PATH_URLS, withAlpha, selectPath } from "../lib/pathIdentity"
import MarketingNav from "./marketing/MarketingNav"
import MarketingFooter from "./marketing/MarketingFooter"
import {
  Eyebrow, PrimaryButton, GhostButton, LiftCard, IllustrativeTag,
  useReveal, useCountUp, EloSparkline, ELO_HISTORY, JourneyProof,
} from "./marketing/primitives"

// ─── Hero workflow diagram — the "live animated workflow" ─────────────────
const FLOW_NODES = [
  { icon: ClipboardCheck, label: "Assessment" },
  { icon: Network,        label: "Skill Graph" },
  { icon: BookOpen,       label: "SkillStudio" },
  { icon: Swords,         label: "Arena" },
  { icon: FolderCheck,    label: "Portfolio" },
  { icon: Search,         label: "Recruiters" },
]

function WorkflowDiagram() {
  const reduce = useReducedMotion()
  return (
    <div style={{
      background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 20,
      padding: "40px 28px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      {FLOW_NODES.map((node, i) => {
        const Icon = node.icon
        return (
          <div key={node.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40 }}>
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.35, ease: EASE }}
                style={{
                  width: 40, height: 40, borderRadius: 10, background: T.surface,
                  border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}
              >
                <Icon size={18} color={T.accent} strokeWidth={1.75} />
              </motion.div>
              {i < FLOW_NODES.length - 1 && (
                <motion.div
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.35 + 0.25, ease: EASE }}
                  style={{ width: 1, height: 28, background: T.border, transformOrigin: "top" }}
                />
              )}
            </div>
            <motion.span
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.35 + 0.1, ease: EASE }}
              style={{ fontSize: 15, fontWeight: 600, color: T.ink, paddingBottom: i < FLOW_NODES.length - 1 ? 28 : 0 }}
            >{node.label}</motion.span>
          </div>
        )
      })}
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: reduce ? 0 : (FLOW_NODES.length - 1) * 0.35 + 0.5, ease: EASE }}
        style={{ fontSize: 12.5, color: T.ink3, margin: "12px 0 0", paddingTop: 16, borderTop: `1px solid ${T.hairline}` }}
      >Every step is logged. Nothing is self-reported.</motion.p>
    </div>
  )
}

// ─── How It Works — one line, each node expands ────────────────────────────
const HOW_IT_WORKS = [
  { icon: ClipboardCheck, label: "Assessment", detail: "A short calibration sets your starting ELO — no guessing your own level." },
  { icon: BookOpen,       label: "SkillStudio", detail: "Targeted lessons close the exact gaps your assessment found, not a generic course path." },
  { icon: Swords,         label: "Arena",       detail: "Real, scored tasks from real company scenarios. Every submission updates your ELO." },
  { icon: FolderCheck,    label: "Aura",        detail: "Your living skill graph and portfolio — every Arena task becomes verifiable proof." },
  { icon: Search,         label: "Recruiters",  detail: "Recruiters search by verified ELO and real task history, not keywords on a resume." },
]

function HowItWorksLine() {
  const [openIdx, setOpenIdx] = useState(null)
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 0, alignItems: "flex-start" }}>
      {HOW_IT_WORKS.map((step, i) => {
        const Icon = step.icon
        const open = openIdx === i
        return (
          <div key={step.label} style={{ display: "flex", alignItems: "flex-start", flex: "1 1 180px", minWidth: 160 }}>
            <button
              onClick={() => setOpenIdx(open ? null : i)}
              style={{
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
                padding: 0, fontFamily: "inherit", width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: open ? T.accentDim : T.surfaceRaised,
                  border: `1px solid ${open ? T.accent : T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 150ms ease, border-color 150ms ease",
                }}>
                  <Icon size={16} color={open ? T.accent : T.ink2} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{step.label}</span>
              </div>
              <motion.div
                initial={false}
                animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                style={{ overflow: "hidden" }}
              >
                <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, margin: "0 24px 4px 0" }}>{step.detail}</p>
              </motion.div>
            </button>
            {i < HOW_IT_WORKS.length - 1 && (
              <div style={{ height: 1, background: T.border, flex: 1, marginTop: 18, minWidth: 16 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Arena preview — Company → Mission → Notebook → Output → AI Eval → Verified
// Illustrative only — fictional student, fictional company, matching every
// other demo figure on this page (never presented as live platform data).
// -3 ELO on the fail path is the real medium-difficulty fail penalty from
// CAPABILIO_ARCHITECTURE.md §8.4, not an invented number.
const ARENA_SCRIPTS = {
  pass: {
    code: [
      'cancelled = orders[orders.status == "cancelled"]',
      'late = cancelled[(cancelled.day.isin(["Sat","Sun"])) & (cancelled.hour >= 21)]',
      'late.groupby("reason").order_id.count().sort_values(ascending=False).head(3)',
    ],
    output: [
      ["delivery_partner_unavailable", 342],
      ["restaurant_closed", 198],
      ["payment_failed", 87],
    ],
    passed: true, score: 88, eloDelta: 16,
    feedback: "Correct filter logic and a clean groupby — you identified delivery-partner availability as the dominant driver.",
  },
  fail: {
    code: [
      'cancelled = orders[orders.status == "cancelled"]',
      'late = cancelled[(cancelled.day.isin(["Sat","Sun"])) & (cancelled.hour >= 12)]',
      'late.groupby("reason").order_id.count().sort_values(ascending=False).head(3)',
    ],
    output: [
      ["restaurant_closed", 511],
      ["delivery_partner_unavailable", 289],
      ["payment_failed", 140],
    ],
    passed: false, score: 34, eloDelta: -3,
    feedback: "Your filter used hour ≥ 12, not hour ≥ 21 — this captures afternoon cancellations, not the weekend-night spike the mission asked about. This didn't pass.",
  },
}
const ARENA_ELO_BASE = 1324

// Three-state Run/Submit beat (idle → running → executed) — a small,
// self-contained timer distinct from the ELO tween above; skipped entirely
// under reduced motion (renders straight to "executed").
function ArenaRunBeat({ reduce }) {
  const [phase, setPhase] = useState(reduce ? "done" : "idle")
  useEffect(() => {
    if (reduce) return
    const t1 = setTimeout(() => setPhase("running"), 700)
    const t2 = setTimeout(() => setPhase("done"), 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [reduce])
  const Icon = phase === "running" ? Loader2 : phase === "done" ? Check : Play
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: phase === "done" ? T.success : T.ink2, margin: "2px 0 14px" }}>
      <Icon size={13} strokeWidth={2.5} style={phase === "running" ? { animation: "arenaSpin 0.6s linear infinite" } : undefined} />
      {phase === "idle" ? "Run notebook" : phase === "running" ? "Running…" : "Executed"}
    </div>
  )
}

function ArenaPreview() {
  const [outcome, setOutcome] = useState("pass")
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const script = ARENA_SCRIPTS[outcome]
  const eloTarget = ARENA_ELO_BASE + script.eloDelta
  const eloValue = useCountUp(eloTarget, { start: ARENA_ELO_BASE, duration: 0.7, delay: 2.7, active: inView, reduce })
  const VerdictIcon = script.passed ? ShieldCheck : XCircle
  const verdictColor = script.passed ? T.success : T.error
  const verdictDim = script.passed ? T.successDim : T.errorDim

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["pass", "Passing attempt"], ["fail", "Failing attempt"]].map(([key, label]) => (
          <button key={key} onClick={() => setOutcome(key)} style={{
            padding: "5px 11px", borderRadius: 999, border: `1px solid ${outcome === key ? T.accent : T.border}`,
            background: outcome === key ? T.accentDim : "transparent",
            color: outcome === key ? T.accent : T.ink3, fontSize: 11.5, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>
      <div ref={ref} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.hairline}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.surfaceRaised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.ink2 }}>S</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Swiggy — Data Analyst mission</div>
            <IllustrativeTag />
          </div>
        </div>
        <div key={outcome + String(inView)} style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 6 }}>Mission</div>
          <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, margin: "0 0 16px" }}>
            Weekend order cancellations spike after 9 PM. Find the dominant cause in the last 30 days of order data.
          </p>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 6 }}>Notebook</div>
          <div style={{
            background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 10,
            padding: "12px 14px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.ink,
            lineHeight: 1.7, marginBottom: 4, overflowX: "auto",
          }}>
            {script.code.map((line, i) => (
              <motion.div key={i}
                initial={reduce || !inView ? false : { opacity: 0, x: -6 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.15 }}
                style={{ whiteSpace: "pre" }}
              >{line}</motion.div>
            ))}
          </div>

          <ArenaRunBeat reduce={reduce || !inView} />

          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 6 }}>Output</div>
          <div style={{
            background: T.ink, borderRadius: 10, padding: "12px 14px",
            fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#D4F5DE", lineHeight: 1.7, marginBottom: 16,
          }}>
            {script.output.map(([label, count], i) => (
              <motion.div key={label}
                initial={reduce || !inView ? false : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.2, delay: reduce ? 0 : 1.15 + i * 0.12 }}
                style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
              >
                <span>{label}</span><span>{count}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={reduce || !inView ? false : { opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.25, delay: reduce ? 0 : 1.9 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: verdictDim, border: `1px solid ${verdictColor}30`, borderRadius: 10, marginBottom: 10 }}
          >
            <VerdictIcon size={16} color={verdictColor} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 700, color: verdictColor }}>{script.passed ? "Verified" : "Not verified"}</span>
            <span style={{ fontSize: 12, color: T.ink3, marginLeft: "auto" }}>Score {script.score}</span>
          </motion.div>

          <motion.div
            initial={reduce || !inView ? false : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.25, delay: reduce ? 0 : 2.35 }}
            style={{ padding: "12px 14px", background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 10, marginBottom: 14 }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 4 }}>Feedback</div>
            <p style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.55, margin: 0 }}>{script.feedback}</p>
          </motion.div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{eloValue.toLocaleString()}</div>
              <span style={{ fontSize: 10, color: T.ink3, letterSpacing: "0.05em", textTransform: "uppercase" }}>ELO</span>
              <motion.span
                initial={reduce || !inView ? false : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.2, delay: reduce ? 0 : 3.1 }}
                style={{ fontSize: 12, fontWeight: 600, color: script.passed ? T.success : T.error }}
              >{script.passed ? `+${script.eloDelta}` : script.eloDelta}</motion.span>
            </div>
            <motion.div
              initial={reduce || !inView ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.2, delay: reduce ? 0 : 3.5 }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <motion.div
                initial={reduce || !inView ? false : { scale: 0.85 }}
                animate={inView && script.passed ? { scale: [0.85, 1.15, 1] } : {}}
                transition={{ duration: 0.4, delay: reduce ? 0 : 3.6 }}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: script.passed ? T.accent : "transparent",
                  border: `1.5px solid ${script.passed ? T.accent : T.border}`,
                }}
              />
              <span style={{ fontSize: 11, color: T.ink3 }}>SQL skill</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SkillStudio preview — an original animated skill graph ───────────────
function SkillStudioPreview() {
  const reveal = useReveal()
  const reduce = useReducedMotion()
  const nodes = [
    { id: "py",  label: "Python",         x: 40,  y: 40,  mastered: true },
    { id: "sql", label: "SQL",            x: 200, y: 24,  mastered: true },
    { id: "api", label: "APIs",           x: 320, y: 70,  mastered: false },
    { id: "sd",  label: "System Design",  x: 150, y: 120, mastered: false },
  ]
  const edges = [["py", "sql"], ["sql", "api"], ["py", "sd"], ["sd", "api"]]
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  return (
    <motion.div ref={reveal.ref} {...reveal}
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Your skill graph</div>
      <p style={{ fontSize: 12.5, color: T.ink3, margin: "0 0 4px" }}>Grows with every SkillStudio lesson and Arena mission.</p>
      <IllustrativeTag style={{ display: "block", marginBottom: 12 }} />
      <svg width="100%" height="160" viewBox="0 0 360 160" style={{ display: "block" }}>
        {edges.map(([a, b], i) => {
          const n1 = byId[a], n2 = byId[b]
          return (
            <motion.line
              key={i} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke={T.border} strokeWidth="1.5"
              initial={reduce ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: EASE }}
            />
          )
        })}
        {nodes.map((n, i) => (
          <g key={n.id}>
            <motion.circle
              cx={n.x} cy={n.y} r={n.mastered ? 7 : 6}
              fill={n.mastered ? T.accent : T.surface}
              stroke={n.mastered ? T.accent : T.ink3} strokeWidth="1.5"
              initial={reduce ? false : { scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.5 + i * 0.12, ease: EASE }}
            />
            <text x={n.x} y={n.y - 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={T.ink2} fontFamily="'DM Sans',sans-serif">{n.label}</text>
          </g>
        ))}
      </svg>
    </motion.div>
  )
}

// ─── Recruiter preview — what a recruiter actually receives ───────────────
function RecruiterPreview() {
  const reveal = useReveal()
  return (
    <motion.div ref={reveal.ref} {...reveal}
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Ananya Rao</div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 3 }}>Data Analyst · Verified</div>
          <IllustrativeTag />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 600, color: T.accent, lineHeight: 1 }}>1,340</div>
          <div style={{ fontSize: 10, color: T.ink3, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 3 }}>ELO</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { t: "Swiggy — cancellation root-cause", s: 88 },
          { t: "Razorpay — payment failure analysis", s: 92 },
          { t: "BigBasket — inventory SQL audit", s: 79 },
        ].map(row => (
          <div key={row.t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 8 }}>
            <span style={{ fontSize: 12.5, color: T.ink2 }}>{row.t}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12.5, fontWeight: 600, color: T.ink }}>{row.s}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, color: T.success, fontSize: 12, fontWeight: 600 }}>
        <ShieldCheck size={14} strokeWidth={2} /> Every score links back to the real submission — nothing self-reported.
      </div>
    </motion.div>
  )
}

// ─── Claim vs. proof section — ELO number ticks up, sparkline draws itself,
// claim/reality rows stagger in after, all keyed off one scroll-into-view
// trigger so the eye lands on the number first, then the supporting rows.
function ClaimVsProofSection({ problemRows, eloHistory }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const eloTarget = eloHistory[eloHistory.length - 1]
  const eloValue = useCountUp(eloTarget, { start: eloHistory[0], duration: 0.9, active: inView, reduce })

  return (
    <section ref={ref} style={{ padding: "96px 0" }}>
      <div className="lp-container lp-grid-2" style={{ alignItems: "center", gap: 64 }}>
        <div>
          <Eyebrow>Claim vs. proof</Eyebrow>
          <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 16px" }}>A number that can&apos;t be faked.</h2>
          <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.65, marginBottom: 24 }}>
            Like chess.com — ELO is earned through real performance. It rises when you solve hard problems, and it cannot be self-reported or inflated.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {problemRows.map((r, i) => (
              <motion.div key={r.claim}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, delay: reduce ? 0 : 0.9 + i * 0.12, ease: EASE }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}
              >
                <div style={{ padding: "12px 14px", fontSize: 13, color: T.ink3, fontStyle: "italic", borderRight: `1px solid ${T.hairline}` }}>{r.claim}</div>
                <div style={{ padding: "12px 14px", fontSize: 13, color: T.error }}>{r.reality}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <TrendingUp size={16} color={T.accent} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.ink3, letterSpacing: "0.04em", textTransform: "uppercase" }}>ELO growth</span>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 42, fontWeight: 600, color: T.ink, margin: "8px 0 6px", fontVariantNumeric: "tabular-nums" }}>{eloValue.toLocaleString()}</div>
          <p style={{ fontSize: 12.5, color: T.ink3, margin: "0 0 16px" }}>Every point on this line is a real submission.</p>
          <EloSparkline points={eloHistory} />
        </div>
      </div>
    </section>
  )
}

// ─── Journey cards ─────────────────────────────────────────────────────────
// Sourced from pathIdentity.js's PRIMARY_PATHS (shared with AuthModal's
// in-modal chooser step) — see that file for why "path"/"instType" are
// kept separate from each card's own "key"/"title".

// Persona per card — kept local to this page (not pathIdentity.js) since
// AuthModal's compact step-1 chooser doesn't need personas, only these
// marketing cards do. Checked against every other name on this page
// (RecruiterPreview's Ananya Rao; the Network section's Rohan Mehta, Dr.
// Priya Singh, Arjun Kapoor, BITS Pilani) — all four below are distinct,
// each used exactly once.
const JOURNEY_PERSONAS = {
  student: { name: "Meera Iyer", role: "Student · Computer Science" },
  professional: { name: "Vikram Nair", role: "Professional · Full Stack Developer" },
  executive: { name: "Devika Shah", role: "Executive · Founder" },
  institution: { name: "VIT Vellore", role: "College" },
}

function JourneyCard({ item }) {
  const Icon = item.icon
  const persona = JOURNEY_PERSONAS[item.key]
  return (
    <LiftCard
      onClick={() => { window.location.href = PATH_URLS[item.key] }}
      style={{ padding: 28 }}
      hoverColor={withAlpha(item.color, 0.5)}
    >
      <div style={{ width: 44, height: 44, borderRadius: 11, background: withAlpha(item.color, 0.12), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Icon size={20} color={item.color} strokeWidth={1.75} />
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{item.title}</div>
      <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, margin: "0 0 16px" }}>{item.desc}</p>

      {persona && (
        <div style={{ padding: "14px 14px", background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{persona.name}</div>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 3 }}>{persona.role}</div>
          <IllustrativeTag style={{ display: "block", marginBottom: 10 }} />
          <JourneyProof pathKey={item.key} color={item.color} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
        {item.points.map(p => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: T.ink3 }}>
            <Check size={13} color={item.color} strokeWidth={2.5} /> {p}
          </div>
        ))}
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: item.color }}>
        Get started <ArrowRight size={13} />
      </span>
    </LiftCard>
  )
}

// ─── Network card (verified authority network) ─────────────────────────────
function NetworkCard({ item }) {
  return (
    <LiftCard style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.surfaceRaised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.ink2, flexShrink: 0 }}>{item.name[0]}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{item.role} · {item.co}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.success, fontWeight: 600 }}>
        <ShieldCheck size={13} strokeWidth={2} /> Verified
      </div>
    </LiftCard>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", textAlign: "left", padding: "16px 18px", background: "none", border: "none",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontFamily: "inherit",
      }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>{q}</span>
        <ChevronDown size={16} color={T.ink3} strokeWidth={2} style={{ flexShrink: 0, transition: "transform 200ms ease", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && <div style={{ padding: "0 18px 18px" }}><p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.7, margin: 0 }}>{a}</p></div>}
    </div>
  )
}

// ─── Heritage motif icons — hand-drawn line art, single-stroke, same
// weight as the lucide icons used elsewhere on this page (never a filled
// illustration, never a second color — DESIGN.md's one-accent rule).
// WheelIcon uses 8 spokes deliberately (not 24), a generic temple-wheel
// abstraction rather than a rendering of the national emblem.
function LotusIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20c-4-2-4-6-4-9 1 2 2 3 4 4 2-1 3-2 4-4 0 3 0 7-4 9Z" />
      <path d="M6.5 15.5c-2-2-2.2-5-1.2-7.8 1 1.1 2 1.9 3 2.3" />
      <path d="M17.5 15.5c2-2 2.2-5 1.2-7.8-1 1.1-2 1.9-3 2.3" />
    </svg>
  )
}

function WheelIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="5.64" y1="5.64" x2="18.36" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="5.64" y2="18.36" />
    </svg>
  )
}

function BanyanIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c-3 2-5 5-5 8 0 2 1 3 2 3" />
      <path d="M12 3c3 2 5 5 5 8 0 2-1 3-2 3" />
      <path d="M12 3v8" />
      <path d="M9 14v6M12 14v6M15 14v6" />
      <path d="M6 20h12" />
    </svg>
  )
}

// ─── Heritage timeline — real, dated, independently verifiable milestones
// only (no invented stats), framed as the longer lineage Capabilio's
// verification model sits inside.
const INDIA_MILESTONES = [
  { year: "499 CE", title: "Zero, formalized", detail: "Aryabhata's Aryabhatiya lays out the place-value system the entire numeric world still runs on." },
  { year: "1951", title: "IIT Kharagpur opens", detail: "The first Indian Institute of Technology — the start of an engineering pipeline that now runs much of the world's software." },
  { year: "1975", title: "Aryabhata launches", detail: "India's first satellite, built and launched by ISRO — a space programme that still runs on a fraction of a typical mission budget." },
  { year: "2009", title: "Aadhaar begins", detail: "The world's largest biometric identity system — over a billion people, one verifiable ID each." },
  { year: "2016", title: "UPI goes live", detail: "India's real-time payments rail now clears more transactions than any other country on Earth." },
  { year: "2023", title: "Chandrayaan-3 lands", detail: "First spacecraft from any nation to reach the Moon's south pole region — on a fraction of a typical mission's cost." },
]

function MilestoneCard({ item, index }) {
  const reveal = useReveal()
  return (
    <motion.div ref={reveal.ref} {...reveal} transition={{ ...reveal.transition, delay: (index % 3) * 0.08 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, marginBottom: 10 }} />
      <div style={{ width: 1, height: 20, background: T.border, marginBottom: 10 }} />
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 6 }}>{item.year}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 6 }}>{item.title}</div>
      <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, margin: 0 }}>{item.detail}</p>
    </motion.div>
  )
}

// ─── Cultural pillars — each motif maps to an actual product truth, not
// decoration for its own sake (Konark's wheel → verification precision;
// the lotus → ELO's no-starting-line design; the banyan → one skill graph
// branching across a whole career). Cards reuse LiftCard exactly as every
// other card on this page does — no new color, no gradient.
const CULTURAL_PILLARS = [
  { icon: LotusIcon, title: "Growth has no starting line", body: "A lotus rises clean through mud that would hold anything else back. ELO works the same way — it measures where you're going, never where you started." },
  { icon: WheelIcon, title: "Precision, carved in stone", body: "The 13th-century Sun Temple at Konark carries a stone wheel precise enough to tell time. Every Arena score is held to that same standard — exact, and impossible to fake." },
  { icon: BanyanIcon, title: "One root, an entire canopy", body: "A banyan grows new trunks from its own branches until a single tree becomes a forest. One verified skill graph, branching into every stage of your career." },
]

// ═══════════════════════════════════════════════════════════════════════
export default function LandingPage({ onGetStarted, onLogin }) {
  // Generic nav/hero "Get started" — path=null clears any stale selection
  // so AuthModal opens fresh at its step-1 chooser, rather than inheriting
  // a path from an earlier, unrelated visit. Journey cards no longer call
  // this — they navigate to that path's own dedicated page instead (see
  // JourneyCard below), whose own "Get started" locks the path directly.
  const openPath = (source = "landing") => {
    selectPath(null)
    if (typeof onGetStarted === "function") onGetStarted({ path: null, source })
  }

  const PROBLEM_ROWS = [
    { claim: "“5 years Python experience”", reality: "Can't explain list comprehensions" },
    { claim: "“Machine Learning Expert”", reality: "Never trained an end-to-end model" },
    { claim: "“AWS Certified”", reality: "Watched 3 YouTube videos" },
  ]

  const FAQ_ITEMS = [
    { q: "What actually is ELO here, and how is it different from a resume claim?", a: "The same rating-system idea as chess.com — a number that only moves when you complete real, scored Arena tasks. Students start at 400. It rises when you solve harder problems well, and can drop if you're inactive. Nobody can type in a higher number." },
    { q: "Is Capabilio free to start?", a: "Yes. Student, Professional, and College all have a free tier with no card required. Paid plans unlock more daily Arena tasks and AI interview sessions — they're not required to build a verified profile." },
    { q: "How does verification work for professionals?", a: "You upload a resume or LinkedIn URL and AI extracts your career timeline. Employment history is then cross-matched against UAN/EPFO records. Anything that can't be verified this way is shown as “self-claimed,” not presented as fact." },
    { q: "What happens if I stop doing Arena tasks for a while?", a: "Your ELO can decay after 7+ days of inactivity, the same way a chess rating drifts without play — it reflects current skill, not a score you can bank and coast on." },
  ]

  return (
    <div style={{ minHeight: "100vh", background: T.surface, color: T.ink, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        .lp-container { max-width: 1120px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
        .lp-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; }
        .lp-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
        .lp-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
        .lp-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; }
        @media (max-width: 960px) { .lp-hero-grid, .lp-grid-2, .lp-grid-3, .lp-grid-4 { grid-template-columns: 1fr; } }
        @keyframes arenaSpin { to { transform: rotate(360deg) } }
        @media (prefers-reduced-motion: reduce) { .lp-hero-grid *, .lp-grid-2 *, .lp-grid-3 *, .lp-grid-4 * { animation: none !important; } }
      `}</style>

      <MarketingNav activePath="home" onGetStarted={() => openPath("nav")} onLogin={onLogin} />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ padding: "88px 0 96px" }}>
        <div className="lp-container lp-hero-grid">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <Eyebrow>India&apos;s Verified Skill Platform</Eyebrow>
            <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)", lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 20px" }}>
              Your Career Needs More Than A Resume.<br />Build. Practice. Prove. Get Hired.
            </h1>
            <p style={{ fontSize: 17, color: T.ink2, lineHeight: 1.6, maxWidth: 480, margin: "0 0 32px" }}>
              Capabilio is an AI Career Operating System that continuously builds, verifies, and showcases your professional skills.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryButton onClick={() => openPath("hero")}>Get started <ArrowRight size={15} /></PrimaryButton>
              <GhostButton href="#how-it-works">See how it works</GhostButton>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }}>
            <WorkflowDiagram />
          </motion.div>
        </div>
      </section>

      {/* ── HERITAGE TIMELINE ───────────────────────────────────────── */}
      <section style={{ padding: "80px 0 96px", background: T.surfaceRaised, borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}` }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <Eyebrow>Built on a longer track record</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 12px" }}>India has been engineering for scale since before &ldquo;scale&rdquo; was a word.</h2>
            <p style={{ fontSize: 15, color: T.ink2, maxWidth: 620, margin: "0 auto" }}>Capabilio&apos;s verification model — real work, checked against reality — sits inside a longer Indian tradition of building things that have to actually work, for everyone.</p>
          </div>
          <div className="lp-grid-3" style={{ rowGap: 32 }}>
            {INDIA_MILESTONES.map((item, i) => <MilestoneCard key={item.year} item={item} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── CHOOSE YOUR JOURNEY ─────────────────────────────────────── */}
      <section style={{ padding: "96px 0" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>Choose your journey</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 12px" }}>One platform. Four journeys.</h2>
            <p style={{ fontSize: 15, color: T.ink2, maxWidth: 560, margin: "0 auto" }}>Students prove readiness. Professionals stay verified. Executives monetize authority. Colleges measure cohort health.</p>
          </div>
          <div className="lp-grid-4">
            {PRIMARY_PATHS.map(item => <JourneyCard key={item.key} item={item} />)}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a href="/for/colleges?type=company" style={{ fontSize: 13, color: T.ink3, textDecoration: "none" }}>
              Building a company profile instead? <span style={{ color: T.accent, fontWeight: 600 }}>&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── CULTURAL PILLARS ────────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>Ideas we build on</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>Three old ideas, one verified platform.</h2>
          </div>
          <div className="lp-grid-3">
            {CULTURAL_PILLARS.map((p) => (
              <LiftCard key={p.title} style={{ padding: 28 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: T.accentDim, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <p.icon size={20} color={T.accent} />
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{p.title}</div>
                <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </LiftCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>How it works</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>Five steps. One verified career.</h2>
          </div>
          <HowItWorksLine />
        </div>
      </section>

      {/* ── SHOW, DON'T EXPLAIN ─────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px", background: T.surfaceRaised, borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}` }}>
        <div className="lp-container" style={{ paddingTop: 80, paddingBottom: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <Eyebrow>See it, don&apos;t read about it</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>What actually happens on Capabilio.</h2>
          </div>
          <div className="lp-grid-3">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 12 }}>Arena</div>
              <ArenaPreview />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 12 }}>SkillStudio</div>
              <SkillStudioPreview />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 12 }}>Recruiter view</div>
              <RecruiterPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST / PROOF ───────────────────────────────────────────── */}
      <ClaimVsProofSection problemRows={PROBLEM_ROWS} eloHistory={ELO_HISTORY} />

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      {/* Each path's real pricing now lives on its own dedicated page
          (sourced from config/plans.js — the same data the post-login
          Pricing.jsx uses) so no path's plans are ever shown next to
          another's. This is a teaser linking into each, not a duplicate
          plan grid. */}
      <section id="pricing" style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Eyebrow>Pricing</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 12px" }}>Pricing, by path.</h2>
            <p style={{ fontSize: 15, color: T.ink2, maxWidth: 560, margin: "0 auto" }}>Every path has its own plans — see the one that&apos;s actually yours.</p>
          </div>
          <div className="lp-grid-4">
            {PRIMARY_PATHS.map((item) => {
              const Icon = item.icon
              return (
                <LiftCard key={item.key} as="a" href={`${PATH_URLS[item.key]}#pricing`} style={{ padding: 22 }} hoverColor={withAlpha(item.color, 0.5)}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: withAlpha(item.color, 0.12), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={17} color={item.color} strokeWidth={1.75} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{item.title} pricing</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: item.color }}>
                    View plans <ArrowRight size={13} />
                  </span>
                </LiftCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── NETWORK ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Eyebrow>Verified network</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>Learn from people who proved it.</h2>
          </div>
          <div className="lp-grid-4">
            {[
              { name: "Rohan Mehta", role: "Founder & CEO", co: "PayStack India" },
              { name: "Dr. Priya Singh", role: "Professor", co: "IIT Hyderabad" },
              { name: "Arjun Kapoor", role: "CTO", co: "Razorpay" },
              { name: "BITS Pilani", role: "Premier Institution", co: "Est. 1964" },
            ].map(n => <NetworkCard key={n.name} item={n} />)}
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="https://recruiter.capabilio.online" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: T.ink3, textDecoration: "none" }}>
              Hiring? Search verified talent at <span style={{ color: T.accent, fontWeight: 600 }}>recruiter.capabilio.online &rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: "0 0 96px" }}>
        <div className="lp-container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Eyebrow>Frequently asked</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,36px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>Questions people actually ask.</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ_ITEMS.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
