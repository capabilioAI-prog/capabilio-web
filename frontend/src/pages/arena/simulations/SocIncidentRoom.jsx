import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader } from "./uiKit.jsx"

const OUTCOME_COLOR = { success: A.emerald, failure: A.rose }

/**
 * SocIncidentRoom — the Cybersecurity "SOC Incident Room" micro-
 * simulation. Clickable host/user/IP chips pivot the event timeline down
 * to just that entity — the "pivot and correlate" investigative
 * primitive, not a static log dump.
 */
export default function SocIncidentRoom({ simulation }) {
  const [pivot, setPivot] = useState(null) // {field, value}

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const events = pivot ? simulation.events.filter((e) => e[pivot.field] === pivot.value).sort((a, b) => a.timestamp - b.timestamp) : simulation.events.slice().sort((a, b) => a.timestamp - b.timestamp)

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="SOC Incident Room" color="#BE123C" background="#FEF2F2" />

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <PivotGroup title="Hosts" index={simulation.hostIndex} field="hostId" pivot={pivot} setPivot={setPivot} />
          <PivotGroup title="Users" index={simulation.userIndex} field="userId" pivot={pivot} setPivot={setPivot} />
          <PivotGroup title="Source IPs" index={simulation.ipIndex} field="sourceIP" pivot={pivot} setPivot={setPivot} />
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          {pivot ? `Timeline — pivoted on ${pivot.value}` : "Full Timeline"} ({events.length} events)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
          {events.map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 10, fontSize: 11.5, fontFamily: A.mono, padding: "5px 10px", background: A.paper, borderRadius: 6 }}>
              <span style={{ color: A.ink3, minWidth: 30 }}>t={e.timestamp}</span>
              <span style={{ fontWeight: 700 }}>{e.eventType}</span>
              <span style={{ color: A.ink3 }}>{e.userId}@{e.sourceIP} → {e.hostId}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, color: OUTCOME_COLOR[e.outcome] || A.ink3 }}>{e.outcome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PivotGroup({ title, index, field, pivot, setPivot }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {index.map((entry) => {
          const active = pivot?.field === field && pivot?.value === entry.value
          return (
            <button
              key={entry.value}
              onClick={() => setPivot(active ? null : { field, value: entry.value })}
              style={{
                padding: "5px 10px", borderRadius: 999, border: `1px solid ${active ? "#BE123C" : A.border}`,
                background: active ? "#FEF2F2" : A.card, color: active ? "#BE123C" : A.ink3,
                fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: A.mono,
              }}
            >
              {entry.value} ({entry.eventCount})
            </button>
          )
        })}
      </div>
    </div>
  )
}
