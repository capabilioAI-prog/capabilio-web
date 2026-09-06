import { useState, useId, useMemo } from "react"
import { A } from "../tokens"
import { computeOperatingPoint, sweepToPolyline, frequencyToX } from "./rlcMath.js"

const CIRCUIT_W = 300
const CIRCUIT_H = 120
const GRAPH_W = 560
const GRAPH_H = 160

/**
 * RlcLab — the EEE "Electrical Circuit Lab" micro-simulation (spec §21-26).
 * A series R-L-C test bench: source/R/L/C are given, public bench
 * components (readouts, not sliders — real values a lab bench displays);
 * frequency is the student's control. Current/impedance/phase update live
 * and deterministically as the student sweeps frequency, letting them
 * locate the resonance condition by observation.
 */
export default function RlcLab({ simulation }) {
  const [frequencyHz, setFrequencyHz] = useState(null)

  const freq = frequencyHz ?? (simulation ? Math.round((simulation.freqMinHz + simulation.freqMaxHz) / 2) : 0)
  const point = useMemo(() => (simulation ? computeOperatingPoint({ ...simulation, frequencyHz: freq }) : null), [simulation, freq])

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const maxCurrent = Math.max(...simulation.points.map((p) => p.currentA)) * 1.1
  const curvePoly = sweepToPolyline(simulation.points, { width: GRAPH_W, height: GRAPH_H, field: "currentA", freqMinHz: simulation.freqMinHz, freqMaxHz: simulation.freqMaxHz, maxValue: maxCurrent })
  const markerX = frequencyToX(freq, { width: GRAPH_W, freqMinHz: simulation.freqMinHz, freqMaxHz: simulation.freqMaxHz })
  const markerY = GRAPH_H - (point.currentA / maxCurrent) * GRAPH_H

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <div style={{ padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color: "#0369A1", textTransform: "uppercase", letterSpacing: "0.08em", background: "#EEF6FB" }}>
        Electrical Test Bench
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16 }}>
        <ComponentsPanel simulation={simulation} />
        <CircuitDiagram />
        <MeasurementsPanel point={point} />
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Response Graph · Current vs Frequency
        </div>
        <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} width="100%" height={GRAPH_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Current versus frequency response graph">
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" y1={GRAPH_H * f} x2={GRAPH_W} y2={GRAPH_H * f} stroke={A.border} strokeWidth="1" />)}
          <polyline points={curvePoly} fill="none" stroke="#0369A1" strokeWidth="2.2" />
          <line x1={markerX} y1="0" x2={markerX} y2={GRAPH_H} stroke="#0369A1" strokeWidth="1" strokeDasharray="3,3" opacity={0.5} />
          <circle cx={markerX} cy={markerY} r="4.5" fill="#0369A1" />
        </svg>
        <FrequencyControl value={freq} min={simulation.freqMinHz} max={simulation.freqMaxHz} onChange={setFrequencyHz} />
      </div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 140 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  )
}

function Readout({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: A.mono, padding: "6px 10px", background: A.paper, borderRadius: 8 }}>
      <span style={{ color: A.ink3 }}>{label}</span>
      <span style={{ fontWeight: 800, color: A.ink }}>{value}</span>
    </div>
  )
}

function ComponentsPanel({ simulation }) {
  return (
    <Panel title="Components">
      <Readout label="R" value={`${simulation.resistanceOhms} Ω`} />
      <Readout label="L" value={`${(simulation.inductanceH * 1000).toFixed(1)} mH`} />
      <Readout label="C" value={`${(simulation.capacitanceF * 1e6).toFixed(1)} µF`} />
      <Readout label="Source" value={`${simulation.sourceVoltageV} V`} />
    </Panel>
  )
}

function MeasurementsPanel({ point }) {
  return (
    <Panel title="Measurements">
      <Readout label="V" value={`${point.currentA && point.impedanceOhms ? (point.currentA * point.impedanceOhms).toFixed(2) : "0.00"} V`} />
      <Readout label="I" value={`${point.currentA.toFixed(3)} A`} />
      <Readout label="Z" value={`${point.impedanceOhms.toFixed(1)} Ω`} />
      <Readout label="φ" value={`${point.phaseDeg.toFixed(1)}°`} />
    </Panel>
  )
}

function CircuitDiagram() {
  const y1 = 24, y2 = 96
  return (
    <div style={{ flex: "1 1 240px", minWidth: 220 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Circuit</div>
      <svg viewBox={`0 0 ${CIRCUIT_W} ${CIRCUIT_H}`} width="100%" height={CIRCUIT_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Series R L C circuit diagram with an AC source">
        {/* Loop wires */}
        <path d={`M 20 ${y1} H 280 V ${y2} H 20 Z`} fill="none" stroke={A.ink3} strokeWidth="1.6" />
        {/* AC source, bottom-left node */}
        <circle cx="20" cy={y2} r="13" fill={A.card} stroke={A.ink3} strokeWidth="1.6" />
        <path d={`M 12 ${y2} Q 16 ${y2 - 6} 20 ${y2} Q 24 ${y2 + 6} 28 ${y2}`} fill="none" stroke="#0369A1" strokeWidth="1.6" />
        <text x="20" y={y2 + 24} textAnchor="middle" fontSize="10" fontFamily={A.font} fontWeight="700" fill={A.ink3}>V</text>

        {/* Resistor — zigzag, top edge */}
        <path d="M 70 24 l 6 -8 l 8 16 l 8 -16 l 8 16 l 8 -16 l 6 8" fill="none" stroke="#B45309" strokeWidth="1.8" />
        <text x="97" y="14" textAnchor="middle" fontSize="10" fontFamily={A.font} fontWeight="700" fill="#B45309">R</text>

        {/* Inductor — coil bumps, top edge */}
        <path d="M 140 24 a 5 6 0 0 1 10 0 a 5 6 0 0 1 10 0 a 5 6 0 0 1 10 0" fill="none" stroke="#4338CA" strokeWidth="1.8" />
        <text x="155" y="14" textAnchor="middle" fontSize="10" fontFamily={A.font} fontWeight="700" fill="#4338CA">L</text>

        {/* Capacitor — parallel plates, top edge */}
        <line x1="205" y1="16" x2="205" y2="32" stroke="#0F766E" strokeWidth="2" />
        <line x1="213" y1="16" x2="213" y2="32" stroke="#0F766E" strokeWidth="2" />
        <text x="209" y="14" textAnchor="middle" fontSize="10" fontFamily={A.font} fontWeight="700" fill="#0F766E">C</text>

        {/* Measurement node marker */}
        <circle cx="280" cy={y1} r="3" fill={A.indigo} />
        <text x="280" y="16" textAnchor="middle" fontSize="9" fontFamily={A.font} fontWeight="700" fill={A.indigo}>Vout</text>
      </svg>
    </div>
  )
}

function FrequencyControl({ value, min, max, onChange }) {
  const id = useId()
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 700, color: A.ink3, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 76 }}>
        Frequency
      </label>
      <input id={id} type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} />
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Frequency (numeric, Hz)"
        style={{ width: 64, padding: "4px 6px", borderRadius: 6, border: `1px solid ${A.border}`, fontSize: 12, fontFamily: A.mono }}
      />
      <span style={{ fontSize: 11, color: A.ink3 }}>Hz</span>
    </div>
  )
}
