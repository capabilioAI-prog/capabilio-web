import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, StepScrubber } from "./uiKit.jsx"

/**
 * PlcPanel — the EEE "PLC / Industrial Automation Panel" micro-
 * simulation. Sensor lamps and actuator/machine indicators stepped
 * through a fixed input sequence, showing the latched (seal-in) memory
 * a real relay-logic panel has — a stateful step-through, not a
 * combinational truth table.
 */
export default function PlcPanel({ simulation }) {
  const [stepIndex, setStepIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const step = simulation.perStep[stepIndex]

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="PLC / Industrial Automation Panel" color="#B45309" background="#FFFBEB" />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Step through the input sequence
        </div>
        <StepScrubber count={simulation.perStep.length} activeIndex={stepIndex} onChange={setStepIndex} />

        <div style={{ display: "flex", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Sensors</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {simulation.sensorLabels.map((label) => (
                <div key={label} style={{
                  padding: "8px 12px", borderRadius: 8, minWidth: 80, textAlign: "center",
                  background: step.inputs[label] ? "#FFF3C4" : A.paper, border: `1.5px solid ${step.inputs[label] ? "#C08A1E" : A.border}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: A.ink3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: step.inputs[label] ? "#C08A1E" : A.muted }}>{step.inputs[label] ? "● ON" : "○ off"}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Actuators</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {simulation.actuatorLabels.map((a) => (
                <div key={a.id} style={{
                  padding: "8px 12px", borderRadius: 8, minWidth: 100, textAlign: "center",
                  background: step.actuators[a.id] ? A.emerald2 : A.rose2, border: `1.5px solid ${step.actuators[a.id] ? A.emerald : A.rose}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: A.ink3 }}>{a.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: step.actuators[a.id] ? A.emerald : A.rose }}>{step.actuators[a.id] ? "RUNNING" : "STOPPED"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
