/**
 * marketing/primitives.jsx — the small, reusable visual/animation building
 * blocks shared by the homepage (LandingPage.jsx) and the 4 dedicated path
 * pages (pages/paths/*.jsx). Extracted verbatim out of LandingPage.jsx so
 * there is exactly one implementation of each, not five drifting copies.
 */
import { useState, useRef, useEffect } from "react"
import { motion, useReducedMotion, animate } from "framer-motion"
import { ShieldCheck } from "lucide-react"
import { T, EASE } from "../../lib/osDesignTokens"
import { withAlpha } from "../../lib/pathIdentity"

// ─── useCountUp — imperative numeric tween via framer-motion's animate().
export function useCountUp(target, { start = target, duration = 0.7, delay = 0, active = true, reduce = false } = {}) {
  const [value, setValue] = useState(reduce ? target : start)
  useEffect(() => {
    if (!active) return
    if (reduce) { setValue(target); return }
    setValue(start)
    const controls = animate(start, target, { duration, delay, ease: EASE, onUpdate: v => setValue(Math.round(v)) })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, start, duration, delay, reduce])
  return value
}

// ─── useReveal — scroll-triggered entrance, no-op under reduced motion ────
export function useReveal() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  return {
    ref,
    initial: reduce ? false : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, ease: EASE },
  }
}

// ─── Primitives ─────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, href, target }) {
  const Tag = href ? "a" : "button"
  return (
    <Tag
      href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 20px", borderRadius: 10, border: "none",
        background: T.accent, color: "#fff", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "none",
        transition: "background 150ms ease, transform 150ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.accentDark }}
      onMouseLeave={e => { e.currentTarget.style.background = T.accent }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)" }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)" }}
    >{children}</Tag>
  )
}

export function GhostButton({ children, onClick, href, target }) {
  const Tag = href ? "a" : "button"
  return (
    <Tag
      href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 20px", borderRadius: 10, border: `1px solid ${T.border}`,
        background: "transparent", color: T.ink, fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "none",
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}
    >{children}</Tag>
  )
}

export function Eyebrow({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      color: T.accent, marginBottom: 12, fontFamily: "'DM Sans',sans-serif",
    }}>{children}</div>
  )
}

// ─── IllustrativeTag — every fictional persona/company/mission on any
// marketing page carries this, consistently, so nothing reads as real user
// or platform data. Quiet by design (DESIGN.md's "quiet, not loud" rule) —
// plain text, no border/background ceremony.
export function IllustrativeTag({ style }) {
  return (
    <span style={{ fontSize: 10.5, color: T.ink3, fontWeight: 500, ...style }}>Illustrative example</span>
  )
}

// ─── Hover-lift card wrapper — the entire hover vocabulary for this site ──
// hoverColor: optional per-path accent (pathIdentity.js) for the four
// signup-path cards — every other LiftCard use stays neutral (T.borderHover).
export function LiftCard({ children, style, onClick, as = "div", hoverColor }) {
  const [hov, setHov] = useState(false)
  const Tag = as
  return (
    <Tag
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface, border: `1px solid ${hov ? (hoverColor || T.borderHover) : T.border}`,
        borderRadius: 16, transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms ease",
        cursor: onClick ? "pointer" : "default", textAlign: "left",
        fontFamily: "inherit", textDecoration: "none", color: "inherit",
        ...style,
      }}
    >{children}</Tag>
  )
}

// ─── EloSparkline — flat, no glow, no drop-shadow ─────────────────────────
export function EloSparkline({ points, width = 340, height = 64 }) {
  const reduce = useReducedMotion()
  if (!points || points.length < 2) return null
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1
  const xs = points.map((_, i) => (i / (points.length - 1)) * width)
  const ys = points.map(v => height - ((v - min) / range) * (height * 0.8) - height * 0.1)
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")
  const fill = `${path} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%" }}>
      <defs>
        <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity="0.14" />
          <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={fill} fill="url(#eloFill)"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.7, ease: EASE }}
      />
      <motion.path d={path} fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <motion.circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} fill={T.accent}
        initial={reduce ? false : { r: 0, opacity: 0 }}
        whileInView={{ r: 3.5, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.25, delay: 0.9, ease: EASE }}
      />
    </svg>
  )
}

// Illustrative growth arc — reused by the homepage's Claim vs. Proof chart
// and every path page's JourneyProof sparkline, so the "1,847" story is the
// same thread everywhere, not several different invented numbers.
export const ELO_HISTORY = [400, 420, 450, 490, 560, 640, 750, 900, 1050, 1200, 1400, 1620, 1847]

// One reused animated mechanism per path — sparkline draw, node-graph draw,
// verified-badge pop, cohort bars. No fabricated stat grids, no numbers
// presented as real — student's sparkline reuses the exact same
// illustrative ELO_HISTORY the homepage's Claim vs. Proof section uses.
export function JourneyProof({ pathKey, color }) {
  const reduce = useReducedMotion()

  if (pathKey === "student") {
    return (
      <div>
        <EloSparkline points={ELO_HISTORY} width={200} height={36} />
        <p style={{ fontSize: 11.5, color: T.ink3, margin: "6px 0 0" }}>ELO grows with every submission.</p>
      </div>
    )
  }

  if (pathKey === "professional") {
    const nodes = [{ x: 20, y: 26 }, { x: 100, y: 12 }, { x: 180, y: 30 }]
    return (
      <div>
        <svg width="200" height="40" viewBox="0 0 200 40" style={{ display: "block" }}>
          {[[0, 1], [1, 2]].map(([a, b], i) => (
            <motion.line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
              stroke={T.border} strokeWidth="1.5"
              initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: EASE }}
            />
          ))}
          {nodes.map((n, i) => (
            <motion.circle key={i} cx={n.x} cy={n.y} fill={color} stroke={color} strokeWidth="1.5"
              initial={reduce ? false : { r: 0 }} whileInView={{ r: 4.5 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.12, ease: EASE }}
            />
          ))}
        </svg>
        <p style={{ fontSize: 11.5, color: T.ink3, margin: "2px 0 0" }}>Skills stay verified automatically.</p>
      </div>
    )
  }

  if (pathKey === "executive") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <motion.div
          initial={reduce ? false : { scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{ width: 30, height: 30, borderRadius: 9, background: withAlpha(color, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <ShieldCheck size={15} color={color} strokeWidth={2} />
        </motion.div>
        <p style={{ fontSize: 11.5, color: T.ink3, margin: 0 }}>Every profile identity-verified before it goes live.</p>
      </div>
    )
  }

  // institution
  const bars = [{ label: "Cohort avg", pct: 55 }, { label: "Top scorer", pct: 90 }]
  return (
    <div>
      {bars.map((b, i) => (
        <div key={b.label} style={{ marginBottom: i === 0 ? 6 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.ink3, marginBottom: 3 }}>
            <span>{b.label}</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: T.hairline, overflow: "hidden" }}>
            <motion.div
              initial={reduce ? false : { width: 0 }} whileInView={{ width: `${b.pct}%` }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: EASE }}
              style={{ height: "100%", borderRadius: 99, background: color }}
            />
          </div>
        </div>
      ))}
      <p style={{ fontSize: 11.5, color: T.ink3, margin: "6px 0 0" }}>Every bar reflects real submitted work.</p>
    </div>
  )
}
