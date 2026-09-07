import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, StepScrubber, Readout } from "./uiKit.jsx"

/**
 * DistributedSystemsLab — the CSE "Distributed Systems Lab" micro-
 * simulation. A cluster diagram the student steps through write-by-write,
 * watching nodes go up/down per the given outage schedule — a temporal
 * cluster-state inspection, not a static topology or a graph.
 */
export default function DistributedSystemsLab({ simulation }) {
  const [stepIndex, setStepIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const step = simulation.perStep[stepIndex]

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Distributed Systems Lab" color="#3730A3" background="#EEF0FF" />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Step through the write log
        </div>
        <StepScrubber count={simulation.perStep.length} activeIndex={stepIndex} onChange={setStepIndex} />

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
          {step.nodeStatus.map((n) => {
            const node = simulation.nodes.find((x) => x.id === n.id)
            const isLeader = n.id === simulation.leaderId
            return (
              <div key={n.id} style={{
                flex: "1 1 130px", minWidth: 120, borderRadius: 10, padding: "12px 14px", textAlign: "center",
                border: `2px solid ${n.down ? A.rose : A.emerald}`, background: n.down ? A.rose2 : A.emerald2,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: A.ink }}>{node?.label}{isLeader ? " (Leader)" : ""}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: n.down ? A.rose : A.emerald, marginTop: 4 }}>
                  {n.down ? "DOWN" : n.delivered ? "RECEIVED WRITE" : "UP"}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          <Readout label={`Step ${step.step} write`} value={step.write} />
        </div>
      </div>
    </div>
  )
}
