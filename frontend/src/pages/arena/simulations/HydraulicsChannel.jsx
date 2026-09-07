import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader, Chip, Readout } from "./uiKit.jsx"

const CH_W = 360, CH_H = 120

/**
 * HydraulicsChannel — the Civil "Hydraulics Channel" micro-simulation.
 * A sluice gate diagram whose opening the student selects from discrete
 * settings, reading off flow rate/velocity — a channel/gate diagram, not
 * a structural bench or a survey plot.
 */
export default function HydraulicsChannel({ simulation }) {
  const [settingIndex, setSettingIndex] = useState(0)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const resp = simulation.responses[settingIndex]
  const maxOpening = Math.max(...simulation.responses.map((r) => r.gateOpeningM))
  const gateHeight = 20 + (resp.gateOpeningM / maxOpening) * 60

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Hydraulics Channel" color="#0369A1" background="#EEF6FB" />

      <div style={{ padding: 16 }}>
        <svg viewBox={`0 0 ${CH_W} ${CH_H}`} width="100%" height={CH_H} style={{ display: "block", background: A.paper, borderRadius: 8, marginBottom: 14 }} role="img" aria-label="Sluice gate channel diagram">
          <rect x="0" y="90" width={CH_W} height="10" fill={A.borderStrong} />
          <rect x="0" y="20" width={150} height="70" fill="#BFE3F2" opacity="0.6" />
          <rect x="150" y={90 - gateHeight} width="14" height={gateHeight} fill="#0369A1" />
          <rect x="164" y="60" width={CH_W - 164} height="30" fill="#BFE3F2" opacity="0.3" />
          <text x="75" y="15" textAnchor="middle" fontSize="11" fontFamily={A.mono} fill={A.ink3}>upstream head {simulation.upstreamHeadM}m</text>
          <text x="157" y="108" textAnchor="middle" fontSize="10" fontFamily={A.mono} fill={A.ink3}>gate</text>
        </svg>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {simulation.responses.map((r, i) => (
            <Chip key={i} label={r.label} active={i === settingIndex} onClick={() => setSettingIndex(i)} tone="#0369A1" />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Readout label="Gate opening" value={`${resp.gateOpeningM} m`} />
          <Readout label="Flow rate" value={`${resp.flowRateM3S} m³/s`} />
          <Readout label="Velocity at gate" value={`${resp.velocityAtGateMS} m/s`} />
        </div>
      </div>
    </div>
  )
}
