import { A } from "../tokens"
import { BenchHeader } from "./uiKit.jsx"

const MAP_W = 400, MAP_H = 320, PAD = 40

/**
 * SurveyingStation — the Civil "Surveying Station" micro-simulation. A
 * plotted traverse site map (points connected in sighted order) plus the
 * sighted leg readings — a top-down site plot, not a structural bench or
 * an oscilloscope trace.
 */
export default function SurveyingStation({ simulation }) {
  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const xs = simulation.points.map((p) => p.xM), ys = simulation.points.map((p) => p.yM)
  const minX = Math.min(0, ...xs), maxX = Math.max(0, ...xs)
  const minY = Math.min(0, ...ys), maxY = Math.max(0, ...ys)
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY)
  const scale = Math.min((MAP_W - 2 * PAD) / spanX, (MAP_H - 2 * PAD) / spanY)
  const toSvg = (xM, yM) => ({ x: PAD + (xM - minX) * scale, y: MAP_H - PAD - (yM - minY) * scale })

  const polyPoints = simulation.points.map((p) => { const s = toSvg(p.xM, p.yM); return `${s.x},${s.y}` }).join(" ")

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Surveying Station" color="#059669" background="#ECFDF5" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16 }}>
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Site Plot
          </div>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" height={MAP_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Surveyed traverse site plot">
            <polyline points={polyPoints} fill="none" stroke={A.emerald} strokeWidth="2" strokeDasharray="5 3" />
            {simulation.points.map((p) => {
              const s = toSvg(p.xM, p.yM)
              return (
                <g key={p.id}>
                  <circle cx={s.x} cy={s.y} r="6" fill="#fff" stroke={A.emerald} strokeWidth="2" />
                  <text x={s.x} y={s.y - 10} textAnchor="middle" fontSize="10" fontFamily={A.mono} fontWeight="700" fill={A.ink}>{p.id}</text>
                </g>
              )
            })}
          </svg>
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Sighted Legs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {simulation.legs.map((leg) => (
              <div key={leg.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: A.mono, padding: "6px 10px", background: A.paper, borderRadius: 8 }}>
                <span style={{ color: A.ink3 }}>{leg.id}</span>
                <span style={{ fontWeight: 800, color: A.ink }}>{leg.bearingDeg}° / {leg.distanceM}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
