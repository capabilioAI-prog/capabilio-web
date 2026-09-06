import { useState, useId, useMemo } from "react"
import { A } from "../tokens"
import { computeMomentOfInertiaMm4, computeMomentAt, computeDeflectionAt, deflectionToPolyline } from "./beamMath.js"

const BEAM_W = 560
const BEAM_H = 90
const GRAPH_W = 560
const GRAPH_H = 150

/**
 * BeamLab — the Civil "Structures Lab" micro-simulation. A simply-
 * supported beam under a point load: span/section/material/design load
 * are given, public bench parameters (readouts, not secrets); load scale
 * is the student's control, letting them observe how moment, stress, and
 * deflection respond — deterministically, from the same closed-form
 * beam formulas used to grade the submission.
 */
export default function BeamLab({ simulation, inputs }) {
  const [loadScalePct, setLoadScalePct] = useState(100)

  const loadN = simulation ? (simulation.loadN * loadScalePct) / 100 : 0
  const momentOfInertiaMm4 = simulation ? computeMomentOfInertiaMm4(simulation.sectionWidthMm, simulation.sectionHeightMm) : 0
  const response = useMemo(() => {
    if (!simulation) return null
    const cfg = { spanMm: simulation.spanMm, loadN, loadPositionMm: simulation.loadPositionMm, modulusMPa: simulation.modulusMPa, momentOfInertiaMm4 }
    const maxMomentNmm = computeMomentAt(simulation.loadPositionMm, cfg)
    const deflectionAtLoadMm = computeDeflectionAt(simulation.loadPositionMm, cfg)
    const maxStressMPa = (maxMomentNmm * (simulation.sectionHeightMm / 2)) / momentOfInertiaMm4
    return { maxMomentNmm, deflectionAtLoadMm, maxStressMPa }
  }, [simulation, loadN, momentOfInertiaMm4])

  if (!simulation || !response) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const scaledPoints = simulation.points.map((p) => ({
    xMm: p.xMm,
    deflectionMm: computeDeflectionAt(p.xMm, { spanMm: simulation.spanMm, loadN, loadPositionMm: simulation.loadPositionMm, modulusMPa: simulation.modulusMPa, momentOfInertiaMm4 }),
  }))
  const maxDeflectionMm = Math.max(0.01, ...scaledPoints.map((p) => p.deflectionMm)) * 1.3
  const baselineY = 24
  const curvePoly = deflectionToPolyline(scaledPoints, { width: GRAPH_W, height: GRAPH_H, spanMm: simulation.spanMm, maxDeflectionMm, baselineY })
  const loadXFrac = simulation.loadPositionMm / simulation.spanMm

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <div style={{ padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.08em", background: "#FDF1E7" }}>
        Structures Bench
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16 }}>
        <Panel title="Beam">
          <Readout label="Span" value={`${(simulation.spanMm / 1000).toFixed(2)} m`} />
          <Readout label="Section" value={`${simulation.sectionWidthMm}×${simulation.sectionHeightMm} mm`} />
          <Readout label="Material E" value={`${(simulation.modulusMPa / 1000).toFixed(0)} GPa`} />
          <Readout label="Design Load" value={`${(simulation.loadN / 1000).toFixed(1)} kN`} />
        </Panel>

        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Beam</div>
          <svg viewBox={`0 0 ${BEAM_W} ${BEAM_H}`} width="100%" height={BEAM_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Simply supported beam with a point load">
            <line x1="20" y1="30" x2={BEAM_W - 20} y2="30" stroke={A.ink3} strokeWidth="3" />
            <polygon points={`20,30 12,46 28,46`} fill="none" stroke={A.ink3} strokeWidth="1.6" />
            <polygon points={`${BEAM_W - 20},30 ${BEAM_W - 28},46 ${BEAM_W - 12},46`} fill="none" stroke={A.ink3} strokeWidth="1.6" />
            {(() => {
              const lx = 20 + loadXFrac * (BEAM_W - 40)
              return (
                <g>
                  <line x1={lx} y1="4" x2={lx} y2="28" stroke="#B45309" strokeWidth="2.4" />
                  <polygon points={`${lx - 5},24 ${lx + 5},24 ${lx},32`} fill="#B45309" />
                  <text x={lx} y="14" textAnchor="middle" fontSize="10" fontFamily={A.font} fontWeight="700" fill="#B45309">P</text>
                </g>
              )
            })()}
          </svg>
        </div>

        <Panel title="Response">
          <Readout label="Reaction Moment" value={`${(response.maxMomentNmm / 1e6).toFixed(2)} kN·m`} />
          <Readout label="Bending Stress" value={`${response.maxStressMPa.toFixed(1)} MPa`} />
          <Readout label="Deflection" value={`${response.deflectionAtLoadMm.toFixed(2)} mm`} />
          <Readout label="Allowable" value={`${simulation.allowableStressMPa} MPa / ${simulation.allowableDeflectionMm.toFixed(1)} mm`} />
        </Panel>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Deflected Shape Along Span
        </div>
        <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} width="100%" height={GRAPH_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Beam deflection curve along the span">
          <line x1="0" y1={baselineY} x2={GRAPH_W} y2={baselineY} stroke={A.border} strokeWidth="1.5" />
          <polyline points={curvePoly} fill="none" stroke="#B45309" strokeWidth="2.2" />
        </svg>
        <LoadControl value={loadScalePct} onChange={setLoadScalePct} />
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div style={{ flex: "1 1 160px", minWidth: 150 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  )
}

function Readout({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontFamily: A.mono, padding: "6px 10px", background: A.paper, borderRadius: 8, gap: 8 }}>
      <span style={{ color: A.ink3 }}>{label}</span>
      <span style={{ fontWeight: 800, color: A.ink, textAlign: "right" }}>{value}</span>
    </div>
  )
}

function LoadControl({ value, onChange }) {
  const id = useId()
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, color: A.ink3, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 76 }}>
        Load Scale
      </label>
      <input id={id} type="range" min={0} max={150} step={5} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} />
      <input
        type="number" min={0} max={150} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Load scale (numeric percentage)"
        style={{ width: 60, padding: "4px 6px", borderRadius: 6, border: `1px solid ${A.border}`, fontSize: 12, fontFamily: A.mono }}
      />
      <span style={{ fontSize: 11, color: A.ink3 }}>%</span>
    </div>
  )
}
