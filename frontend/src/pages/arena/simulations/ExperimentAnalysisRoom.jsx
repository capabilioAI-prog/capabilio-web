import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip, Readout } from "./uiKit.jsx"

const CI_W = 300, CI_H = 60

/**
 * ExperimentAnalysisRoom — the Data Science "Experiment Analysis Room"
 * micro-simulation. A confidence-interval bar for the control/treatment
 * difference, showing whether it crosses zero — a statistical evidence
 * visual, not a group-by table (that's data_investigation_studio).
 */
export default function ExperimentAnalysisRoom({ simulation }) {
  const [expIndex, setExpIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const exp = simulation.results[expIndex]
  const range = Math.max(Math.abs(exp.confidenceIntervalLower), Math.abs(exp.confidenceIntervalUpper)) * 1.4 || 0.01
  const toX = (v) => CI_W / 2 + (v / range) * (CI_W / 2 - 20)

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Experiment Analysis Room" color="#0F766E" background="#EAF6F0" />

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {simulation.results.map((r, i) => (
            <Chip key={r.id} label={r.label} active={i === expIndex} onClick={() => setExpIndex(i)} tone="#0F766E" />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <Readout label="Control rate" value={exp.controlRate} />
          <Readout label="Treatment rate" value={exp.treatmentRate} />
          <Readout label="z-score" value={exp.zScore} />
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          95% Confidence Interval on the Difference
        </div>
        <svg viewBox={`0 0 ${CI_W} ${CI_H}`} width="100%" height={CI_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Confidence interval chart">
          <line x1={CI_W / 2} y1="0" x2={CI_W / 2} y2={CI_H} stroke={A.border} strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1={toX(exp.confidenceIntervalLower)} y1={CI_H / 2} x2={toX(exp.confidenceIntervalUpper)} y2={CI_H / 2} stroke={exp.significantAt95 ? A.emerald : A.rose} strokeWidth="4" strokeLinecap="round" />
          <circle cx={toX(exp.diff)} cy={CI_H / 2} r="5" fill={exp.significantAt95 ? A.emerald : A.rose} />
          <text x={CI_W / 2} y={CI_H - 4} textAnchor="middle" fontSize="9" fontFamily={A.mono} fill={A.ink3}>0</text>
        </svg>

        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: exp.significantAt95 ? A.emerald : A.rose }}>
          {exp.significantAt95 ? "Statistically significant at 95%" : "Not statistically significant at 95%"}
        </div>
      </div>
    </div>
  )
}
