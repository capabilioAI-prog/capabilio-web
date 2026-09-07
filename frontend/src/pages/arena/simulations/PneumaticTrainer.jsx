import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, StepScrubber, Readout } from "./uiKit.jsx"

const CYL_W = 320, CYL_H = 60

/**
 * PneumaticTrainer — the Mechanical "Pneumatic Trainer" micro-simulation.
 * A double-acting cylinder's piston position stepped through a valve
 * sequence (extend/retract/hold) with live chamber-pressure readouts —
 * a physical actuator diagram, not a spectrum or a curve.
 */
export default function PneumaticTrainer({ simulation }) {
  const [stepIndex, setStepIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const step = simulation.trace[stepIndex]
  const pistonFrac = step.positionMm / simulation.nominal.strokeMm
  const pistonX = 20 + pistonFrac * (CYL_W - 60)

  const VALVE_COLOR = { extend: A.emerald, retract: A.indigo, hold: A.amber }

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Pneumatic Trainer" color="#0369A1" background="#EEF6FB" />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Step through the valve sequence
        </div>
        <StepScrubber count={simulation.trace.length} activeIndex={stepIndex} onChange={setStepIndex} />

        <div style={{ margin: "16px 0 8px", fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Cylinder — valve: <span style={{ color: VALVE_COLOR[step.valveState] }}>{step.valveState.toUpperCase()}</span>
        </div>
        <svg viewBox={`0 0 ${CYL_W} ${CYL_H}`} width="100%" height={CYL_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Pneumatic cylinder">
          <rect x="20" y="15" width={CYL_W - 40} height="30" rx="6" fill="none" stroke={A.ink3} strokeWidth="2" />
          <rect x="20" y="15" width={pistonX - 20} height="30" fill="#EEF6FB" />
          <rect x={pistonX - 4} y="10" width="8" height="40" rx="2" fill={VALVE_COLOR[step.valveState]} />
        </svg>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <Readout label="Position" value={`${step.positionMm} / ${simulation.nominal.strokeMm} mm`} />
          <Readout label="Extend chamber" value={`${step.extendChamberBar} bar`} />
          <Readout label="Retract chamber" value={`${step.retractChamberBar} bar`} />
        </div>
      </div>
    </div>
  )
}
