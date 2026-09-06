import { useState, useId } from "react"
import { A } from "../tokens"
import { visiblePoints, pointsToPolyline } from "./labDisplay.js"

const WIDTH = 560
const HEIGHT = 280

/**
 * CompressionLab — the Mechanical "Materials Lab" micro-simulation (spec
 * §9-10A). A compression test's stress-strain trace, revealed by a "load"
 * scrubber as if the student were running the test up to that load. The
 * yield/ultimate reference lines and the mission's acceptance threshold
 * are legitimate given information (spec §12); the hidden answer is the
 * student's classification of whether the specimen passes, not any value
 * shown on the chart.
 */
export default function CompressionLab({ simulation, inputs }) {
  const [loadPct, setLoadPct] = useState(100)
  const acceptanceStrainPct = inputs?.acceptanceStrainPct

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const maxStrainPct = simulation.points.at(-1).strainPct
  const maxStressMPa = Math.max(...simulation.points.map((p) => p.stressMPa)) * 1.08
  const shown = visiblePoints(simulation.points, loadPct)
  const current = shown.at(-1)
  const poly = pointsToPolyline(shown, { width: WIDTH, height: HEIGHT, maxStrainPct, maxStressMPa })
  const xFor = (strainPct) => (strainPct / maxStrainPct) * WIDTH

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <div style={{ padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.08em", background: "#FDF1E7" }}>
        Compression Test · {simulation.specimenLabel}
      </div>
      <div style={{ padding: 16 }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Stress-strain chart">
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" y1={HEIGHT * f} x2={WIDTH} y2={HEIGHT * f} stroke={A.border} strokeWidth="1" />)}
          {acceptanceStrainPct != null && (
            <line x1={xFor(acceptanceStrainPct)} y1="0" x2={xFor(acceptanceStrainPct)} y2={HEIGHT} stroke={A.rose} strokeWidth="1.4" strokeDasharray="5,4" />
          )}
          <line x1={xFor(simulation.yieldStrainPct)} y1="0" x2={xFor(simulation.yieldStrainPct)} y2={HEIGHT} stroke={A.muted} strokeWidth="1" strokeDasharray="2,4" />
          <polyline points={poly} fill="none" stroke="#B45309" strokeWidth="2.2" />
          {current && (
            <circle cx={xFor(current.strainPct)} cy={HEIGHT - (current.stressMPa / maxStressMPa) * HEIGHT} r="4.5" fill="#B45309" />
          )}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: A.ink3, marginTop: 8 }}>
          <span>Elastic limit ≈ {simulation.yieldStrainPct.toFixed(2)}% strain</span>
          {acceptanceStrainPct != null && <span style={{ color: A.rose }}>Spec threshold: {acceptanceStrainPct.toFixed(2)}% strain</span>}
        </div>
      </div>
      <div style={{ padding: "0 16px 16px" }}>
        <LoadControl value={loadPct} onChange={setLoadPct} />
        {current && (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: A.ink3, fontFamily: A.mono }}>
            At {loadPct}% load: strain {current.strainPct.toFixed(2)}% · stress {current.stressMPa.toFixed(1)} MPa
          </p>
        )}
      </div>
    </div>
  )
}

function LoadControl({ value, onChange }) {
  const id = useId()
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, color: A.ink3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Load
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input id={id} type="range" min={0} max={100} step={2} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} />
        <input
          type="number" min={0} max={100} step={2} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Load (numeric percentage)"
          style={{ width: 56, padding: "4px 6px", borderRadius: 6, border: `1px solid ${A.border}`, fontSize: 12, fontFamily: A.mono }}
        />
        <span style={{ fontSize: 11, color: A.ink3 }}>%</span>
      </div>
    </div>
  )
}
