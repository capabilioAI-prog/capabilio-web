import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip } from "./uiKit.jsx"

const BAR_W = 560, BAR_H = 160

/**
 * VibrationRig — the Mechanical "Machine Vibration Rig" micro-simulation.
 * A frequency-domain spectrum (discrete peaks at 1x/2x/bearing-defect
 * order) per selected operating condition — a spectrum-analyzer bar
 * chart, not a stress-strain curve.
 */
export default function VibrationRig({ simulation }) {
  const [condIndex, setCondIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const spectrum = simulation.spectra[condIndex]
  const maxAmplitude = Math.max(...simulation.spectra.flatMap((s) => s.peaks.map((p) => p.amplitudeMmS))) * 1.2

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Machine Vibration Rig" color="#B45309" background="#FDF1E7" />

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {simulation.spectra.map((s, i) => (
            <Chip key={i} label={s.label} active={i === condIndex} onClick={() => setCondIndex(i)} tone="#B45309" />
          ))}
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Vibration Spectrum — {spectrum.rpm} RPM, {spectrum.loadPct}% load
        </div>
        <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} width="100%" height={BAR_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Vibration spectrum bar chart">
          <line x1="0" y1={BAR_H - 20} x2={BAR_W} y2={BAR_H - 20} stroke={A.border} strokeWidth="1.5" />
          {spectrum.peaks.map((p, i) => {
            const barW = 60
            const gap = (BAR_W - spectrum.peaks.length * barW) / (spectrum.peaks.length + 1)
            const x = gap + i * (barW + gap)
            const h = (p.amplitudeMmS / maxAmplitude) * (BAR_H - 40)
            return (
              <g key={i}>
                <rect x={x} y={BAR_H - 20 - h} width={barW} height={h} fill="#B45309" rx="4" />
                <text x={x + barW / 2} y={BAR_H - 6} textAnchor="middle" fontSize="10" fontFamily={A.mono} fill={A.ink3}>{p.frequencyHz}Hz</text>
                <text x={x + barW / 2} y={BAR_H - 26 - h} textAnchor="middle" fontSize="10" fontFamily={A.mono} fontWeight="700" fill="#B45309">{p.amplitudeMmS}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
