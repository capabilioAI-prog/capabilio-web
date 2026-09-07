import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader } from "./uiKit.jsx"

/**
 * DigitalLogicBench — the ECE "Digital Logic Bench" micro-simulation. A
 * small gate netlist diagram plus a toggle-switch input selector that
 * probes every wire's value for the chosen combination — click-to-toggle
 * and probe, never a slider.
 */
export default function DigitalLogicBench({ simulation }) {
  const [rowIndex, setRowIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const row = simulation.truthTable[rowIndex]
  const wireNames = Object.keys(row.wireValues)

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Digital Logic Bench" color="#4F46E5" background="#EEF0FF" />

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Netlist
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          {simulation.gates.map((gate) => (
            <div key={gate.id} style={{
              padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${A.indigo}`, background: A.indigo2, textAlign: "center", minWidth: 70,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: A.indigoDeep }}>{gate.type}</div>
              <div style={{ fontSize: 10, color: A.ink3, marginTop: 2, fontFamily: A.mono }}>{gate.inputs.join(",")} → {gate.output}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Switches — click a combination to probe it
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {simulation.truthTable.map((r, i) => (
            <button
              key={i}
              onClick={() => setRowIndex(i)}
              style={{
                padding: "6px 10px", borderRadius: 8, border: `1px solid ${i === rowIndex ? A.indigo : A.border}`,
                background: i === rowIndex ? A.indigo2 : A.card, color: i === rowIndex ? A.indigo : A.ink3,
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: A.mono,
              }}
            >
              {simulation.inputLabels.map((l) => `${l}=${r.inputs[l] ? 1 : 0}`).join(" ")}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Probed Wire Values
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {wireNames.map((w) => (
            <div key={w} style={{
              padding: "8px 14px", borderRadius: 8, background: A.paper, textAlign: "center", minWidth: 56,
              border: w === simulation.outputWire ? `2px solid ${A.amber}` : `1px solid ${A.border}`,
            }}>
              <div style={{ fontSize: 10, color: A.ink3, fontWeight: 700 }}>{w}{w === simulation.outputWire ? " (OUT)" : ""}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: row.wireValues[w] ? A.emerald : A.rose, fontFamily: A.mono }}>
                {row.wireValues[w] ? "1" : "0"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
