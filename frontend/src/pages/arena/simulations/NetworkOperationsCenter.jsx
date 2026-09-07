import { useState } from "react"
import { A } from "../tokens"
import { BenchHeader } from "./uiKit.jsx"

/**
 * NetworkOperationsCenter — the IT "Network Operations Center" micro-
 * simulation. A service dependency diagram with a real "restart" action
 * per service — clicking recomputes and shows whether the whole chain
 * recovers. The only registered simulation whose interaction actually
 * changes system state rather than just reading it.
 */
export default function NetworkOperationsCenter({ simulation }) {
  const [restartedId, setRestartedId] = useState(null)

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const health = restartedId
    ? simulation.restartOutcomes.find((o) => o.restartedServiceId === restartedId)?.resultingHealth || simulation.baselineHealth
    : simulation.baselineHealth
  const downIds = simulation.services.filter((s) => simulation.baselineHealth[s.id]).map((s) => s.id)

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="Network Operations Center" color="#3730A3" background="#EEF0FF" />

      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {simulation.services.map((s) => {
            const down = health[s.id]
            return (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "10px 14px", borderRadius: 10, border: `2px solid ${down ? A.rose : A.emerald}`, background: down ? A.rose2 : A.emerald2,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: A.ink }}>{s.label}</div>
                  {s.dependsOn?.length > 0 && (
                    <div style={{ fontSize: 10.5, color: A.ink3, fontFamily: A.mono }}>depends on: {s.dependsOn.map((id) => simulation.services.find((x) => x.id === id)?.label).join(", ")}</div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: down ? A.rose : A.emerald }}>{down ? "DOWN" : "UP"}</span>
                  {downIds.includes(s.id) && (
                    <button
                      onClick={() => setRestartedId(s.id)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: `1px solid ${restartedId === s.id ? A.indigo : A.border}`,
                        background: restartedId === s.id ? A.indigo2 : A.card, color: restartedId === s.id ? A.indigo : A.ink3,
                        fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      Restart
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {restartedId && (
          <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: Object.values(health).every((d) => !d) ? A.emerald : A.rose }}>
            {Object.values(health).every((d) => !d) ? "All services recovered." : "Some services are still down — this wasn't the root cause."}
          </div>
        )}
      </div>
    </div>
  )
}
