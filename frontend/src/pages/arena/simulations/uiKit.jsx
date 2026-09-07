import { A } from "../tokens"

/**
 * simulations/uiKit.jsx — generic typographic CHROME shared across
 * simulation renderers (a labeled panel, a readout row, a selectable
 * chip, a header bar). Deliberately NOT a "universal control" — every
 * world's actual diagram/interaction (the thing that makes it a
 * genuinely different environment) is bespoke to that world's own file.
 * Sharing a section label's padding is not the same as sharing the
 * interaction model.
 */

export function BenchHeader({ label, color, background }) {
  return (
    <div style={{ padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.08em", background }}>
      {label}
    </div>
  )
}

export function Panel({ title, children }) {
  return (
    <div style={{ flex: "1 1 160px", minWidth: 150 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  )
}

export function Readout({ label, value, tone }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: A.mono, padding: "6px 10px", background: A.paper, borderRadius: 8, gap: 8 }}>
      <span style={{ color: A.ink3 }}>{label}</span>
      <span style={{ fontWeight: 800, color: tone || A.ink, textAlign: "right" }}>{value}</span>
    </div>
  )
}

/** A clickable chip — the shared shape for "select one of these discrete
 *  options" (a threshold, a gate setting, an operating condition). Never
 *  a range slider by default. */
export function Chip({ label, active, onClick, tone }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 999, border: `1px solid ${active ? (tone || A.indigo) : A.border}`,
        background: active ? (tone ? `${tone}1A` : A.indigo2) : A.card, color: active ? (tone || A.indigo) : A.ink3,
        fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  )
}

/** Step-scrubber: click through a numbered sequence (a PLC input
 *  sequence, a replication timeline, a valve schedule) — genuinely
 *  different from a slider since each stop is a discrete, labeled
 *  system state, not a continuous value. */
export function StepScrubber({ count, activeIndex, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{
            width: 30, height: 30, borderRadius: 8, border: `1px solid ${i === activeIndex ? A.indigo : A.border}`,
            background: i === activeIndex ? A.indigo2 : A.card, color: i === activeIndex ? A.indigo : A.ink3,
            fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: A.mono,
          }}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}
