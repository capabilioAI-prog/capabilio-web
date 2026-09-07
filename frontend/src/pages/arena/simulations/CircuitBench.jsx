import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Panel, Readout } from "./uiKit.jsx"

/**
 * CircuitBench — the ECE "Electronics Circuit Bench" micro-simulation.
 * A fixed R1-series/(R2 parallel R3) DC network with clickable probe
 * points that reveal their measured voltage/current only once probed —
 * a genuine "probe the node" interaction, distinct from the digital
 * logic bench's toggle-switch truth table.
 */
export default function CircuitBench({ simulation }) {
  const [probed, setProbed] = useState({})

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const probePoint = (id) => setProbed((p) => ({ ...p, [id]: true }))

  const nodes = [
    { id: "nodeA", label: "Node A", value: `${simulation.probes.nodeA} V` },
    { id: "nodeB", label: "Node B", value: `${simulation.probes.nodeB} V` },
    { id: "ground", label: "Ground", value: `${simulation.probes.ground} V` },
  ]

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Electronics Circuit Bench" color="#0369A1" background="#EEF6FB" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16 }}>
        <Panel title="Nominal Design Spec">
          <Readout label="Source" value={`${simulation.sourceVoltageV} V`} />
          <Readout label="R1" value={`${simulation.nominal.r1Ohms} Ω`} />
          <Readout label="R2" value={`${simulation.nominal.r2Ohms} Ω`} />
          <Readout label="R3" value={`${simulation.nominal.r3Ohms} Ω`} />
        </Panel>

        <div style={{ flex: "1 1 260px", minWidth: 240 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Click a probe point to measure it
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {nodes.map((n) => (
              <button
                key={n.id}
                onClick={() => probePoint(n.id)}
                style={{
                  flex: 1, padding: "16px 10px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  border: `2px solid ${probed[n.id] ? A.indigo : A.border}`, background: probed[n.id] ? A.indigo2 : A.paper,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: A.ink3 }}>{n.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: probed[n.id] ? A.indigoDeep : A.muted, fontFamily: A.mono, marginTop: 4 }}>
                  {probed[n.id] ? n.value : "?"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <Panel title="Branch Currents">
          <Readout label="I1 (source)" value={`${(simulation.branchCurrentsA.i1 * 1000).toFixed(1)} mA`} />
          <Readout label="I2 (R2)" value={`${(simulation.branchCurrentsA.i2 * 1000).toFixed(1)} mA`} />
          <Readout label="I3 (R3)" value={`${(simulation.branchCurrentsA.i3 * 1000).toFixed(1)} mA`} />
        </Panel>
      </div>
    </div>
  )
}
