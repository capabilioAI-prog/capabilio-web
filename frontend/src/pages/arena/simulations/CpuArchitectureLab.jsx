import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip, Readout } from "./uiKit.jsx"

const STAGE_COLOR = { IF: "#EEF0FF", ID: "#EAF6F0", EX: "#FDF1E7", MEM: "#F3EEFB", WB: "#EEF6FB" }

/**
 * CpuArchitectureLab — the CSE "CPU / Architecture Lab" micro-simulation.
 * A pipeline stage-occupancy grid (not a graph, not a slider) the student
 * reads directly, toggling forwarding on/off to see stalls appear or
 * vanish, plus a separate direct-mapped cache access trace.
 */
export default function CpuArchitectureLab({ simulation }) {
  const [forwarding, setForwarding] = useState(false)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const timeline = forwarding ? simulation.timelineForwarding : simulation.timelineNoForwarding
  const totalStalls = forwarding ? simulation.totalStallsForwarding : simulation.totalStallsNoForwarding
  const maxCycle = Math.max(...timeline.flatMap((row) => row.stages.map((s) => s.cycle)))

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="CPU / Architecture Lab" color="#3730A3" background="#EEF0FF" />

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Pipeline Timeline — {totalStalls} stall cycle{totalStalls === 1 ? "" : "s"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Chip label="No forwarding" active={!forwarding} onClick={() => setForwarding(false)} />
            <Chip label="Forwarding" active={forwarding} onClick={() => setForwarding(true)} />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontFamily: A.mono, fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ padding: "4px 8px", textAlign: "left", color: A.ink3 }}>Instr</th>
                {Array.from({ length: maxCycle }, (_, i) => (
                  <th key={i} style={{ padding: "4px 6px", color: A.ink3, fontWeight: 600 }}>{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeline.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: "4px 8px", fontWeight: 800, color: A.ink }}>{row.op}</td>
                  {Array.from({ length: maxCycle }, (_, cycle) => {
                    const stage = row.stages.find((s) => s.cycle === cycle + 1)
                    return (
                      <td key={cycle} style={{ padding: "4px 6px", textAlign: "center", background: stage ? STAGE_COLOR[stage.stage] : "transparent", borderRadius: 4 }}>
                        {stage ? stage.stage : ""}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Cache Access Trace ({simulation.cache.hitRatePct}% hit rate)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {simulation.cache.trace.map((t, i) => (
            <div key={i} title={`address ${t.address}`} style={{
              width: 44, padding: "4px 0", textAlign: "center", borderRadius: 6, fontSize: 10.5, fontFamily: A.mono, fontWeight: 800,
              background: t.hit ? A.emerald2 : A.rose2, color: t.hit ? A.emerald : A.rose,
            }}>
              {t.hit ? "HIT" : "MISS"}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
