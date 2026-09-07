import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Panel, Readout, Chip } from "./uiKit.jsx"

/**
 * MotorTestBench — the EEE "Motor Test Bench" micro-simulation. A
 * nameplate rating plus operating-condition selector (discrete load
 * levels, not a slider) comparing expected vs observed RPM/current/
 * temperature/vibration — a gauge-bank readout, not a graph.
 */
export default function MotorTestBench({ simulation }) {
  const [conditionIndex, setConditionIndex] = useState(simulation?.readings?.length - 1 || 0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const reading = simulation.readings[conditionIndex]
  const deviates = (field) => Math.abs(reading.observed[field] - reading.expected[field]) > 0.01 * Math.max(1, reading.expected[field])

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Motor Test Bench" color="#B45309" background="#FFFBEB" />

      <div style={{ padding: 16 }}>
        <Panel title="Nameplate Rating">
          <Readout label="Rated RPM" value={simulation.nameplate.ratedRPM} />
          <Readout label="Rated Current" value={`${simulation.nameplate.ratedCurrentA} A`} />
          <Readout label="No-load Current" value={`${simulation.nameplate.noLoadCurrentA} A`} />
        </Panel>

        <div style={{ margin: "16px 0 10px", fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Operating Condition
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {simulation.readings.map((r, i) => (
            <Chip key={i} label={`${r.loadPct}% load`} active={i === conditionIndex} onClick={() => setConditionIndex(i)} tone="#B45309" />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {[
            { key: "rpm", label: "RPM", unit: "" },
            { key: "currentA", label: "Current", unit: "A" },
            { key: "tempC", label: "Temperature", unit: "°C" },
            { key: "vibrationMmS", label: "Vibration", unit: "mm/s" },
          ].map(({ key, label, unit }) => (
            <div key={key} style={{ padding: "10px 12px", borderRadius: 10, background: deviates(key) ? A.rose2 : A.emerald2, border: `1px solid ${deviates(key) ? A.rose : A.emerald}` }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: A.ink3, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: deviates(key) ? A.rose : A.emerald, fontFamily: A.mono }}>
                {reading.observed[key]}{unit}
              </div>
              <div style={{ fontSize: 10.5, color: A.ink3, fontFamily: A.mono }}>expected {reading.expected[key]}{unit}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
