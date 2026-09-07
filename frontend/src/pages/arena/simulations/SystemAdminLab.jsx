import { A } from "../tokens"
import { BenchHeader, Readout } from "./uiKit.jsx"

const SPARK_W = 120, SPARK_H = 32

function sparkline(series, maxValue) {
  if (series.length < 2) return ""
  return series.map((p, i) => {
    const x = (i / (series.length - 1)) * SPARK_W
    const y = SPARK_H - (p.memoryMB / maxValue) * SPARK_H
    return `${x.toFixed(1)},${Math.max(0, y).toFixed(1)}`
  }).join(" ")
}

/**
 * SystemAdminLab — the IT "System Admin Lab" micro-simulation. A
 * process table with a per-process memory sparkline and growth rate,
 * isolating a leaking process by trend rather than a single snapshot —
 * process/resource telemetry, not a service dependency graph (that's
 * network_operations_center's domain).
 */
export default function SystemAdminLab({ simulation }) {
  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const maxMemory = Math.max(...simulation.perProcess.flatMap((p) => p.series.map((s) => s.memoryMB)))
  const maxTotal = Math.max(...simulation.totalOverTime.map((t) => t.totalUsedMB))

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <BenchHeader label="System Admin Lab" color="#3730A3" background="#EEF0FF" />

      <div style={{ padding: 16 }}>
        <Readout label="Total server memory" value={`${simulation.totalMemoryMB} MB`} />

        <div style={{ margin: "16px 0 8px", fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Per-Process Memory Trend
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {simulation.perProcess.map((p) => {
            const leaking = p.growthRateMBPerMin > 5
            return (
              <div key={p.pid} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 12px", borderRadius: 8, background: leaking ? A.rose2 : A.paper }}>
                <div style={{ minWidth: 110, fontSize: 12.5, fontWeight: 700, color: A.ink }}>{p.label}</div>
                <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H} style={{ display: "block" }} role="img" aria-label={`${p.label} memory over time`}>
                  <polyline points={sparkline(p.series, maxMemory)} fill="none" stroke={leaking ? A.rose : A.emerald} strokeWidth="2" />
                </svg>
                <div style={{ marginLeft: "auto", fontSize: 12, fontFamily: A.mono, fontWeight: 800, color: leaking ? A.rose : A.emerald }}>
                  {p.growthRateMBPerMin > 0 ? "+" : ""}{p.growthRateMBPerMin} MB/min
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ margin: "16px 0 8px", fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Total Server Memory Over Time
        </div>
        <svg viewBox={`0 0 300 ${SPARK_H}`} width="100%" height={SPARK_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Total memory over time">
          <polyline
            points={simulation.totalOverTime.map((t, i) => `${(i / (simulation.totalOverTime.length - 1)) * 300},${SPARK_H - (t.totalUsedMB / maxTotal) * SPARK_H}`).join(" ")}
            fill="none" stroke={A.indigo} strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  )
}
