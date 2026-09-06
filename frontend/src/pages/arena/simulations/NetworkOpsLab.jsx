import { useMemo, useState } from "react"
import { A } from "../tokens"

const DIAGRAM_W = 560
const DIAGRAM_H = 260
const NODE_R = 22

/** Visual-only severity read off observed-vs-rated — a hint for the
 *  topology diagram's line color, never the graded answer (the student
 *  still submits their own classification in the response panel). */
function linkSeverity(link) {
  if (link.observedLatencyMs === null) return "down"
  if (link.observedPacketLossPct > 0) return "congested"
  if (link.observedLatencyMs > link.ratedLatencyMs * 1.5) return "degraded"
  return "healthy"
}

const SEVERITY_COLOR = { healthy: "#0369A1", degraded: "#B45309", congested: "#B45309", down: "#BE123C" }

/** Fixed radial layout: `centerId` (the bench's core node) in the middle,
 *  every other node placed evenly around it — legible for the hub-and-
 *  spoke topologies this bench models. */
function layoutNodes(nodes, centerId) {
  const others = nodes.filter((n) => n.id !== centerId)
  const cx = DIAGRAM_W / 2, cy = DIAGRAM_H / 2
  const radius = Math.min(DIAGRAM_W, DIAGRAM_H) / 2 - 50
  const positions = { [centerId]: { x: cx, y: cy } }
  others.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2
    positions[n.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  })
  return positions
}

/**
 * NetworkOpsLab — the CSE "Network Operations Lab" micro-simulation. No
 * slider: the student inspects a topology diagram, reads per-link observed
 * metrics against their rated baseline, and traces routes outward from the
 * core node — a network-operations interaction primitive, not a physics
 * control panel.
 */
export default function NetworkOpsLab({ simulation }) {
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const [traceToId, setTraceToId] = useState(null)

  const positions = useMemo(
    () => (simulation ? layoutNodes(simulation.nodes, simulation.traceFromId) : {}),
    [simulation]
  )

  if (!simulation) {
    return <div style={{ padding: 20, color: A.ink3, fontSize: 13 }}>Simulation unavailable — try reloading this mission.</div>
  }

  const destinations = simulation.nodes.filter((n) => n.id !== simulation.traceFromId)
  const activeTraceId = traceToId || destinations[0]?.id
  const route = activeTraceId ? simulation.routes[activeTraceId] : null
  const nodeById = new Map(simulation.nodes.map((n) => [n.id, n]))

  return (
    <div style={{ borderRadius: A.radiusSm, border: `1px solid ${A.border}`, overflow: "hidden", background: A.card }}>
      <div style={{ padding: "10px 16px", fontSize: 10.5, fontWeight: 800, color: "#3730A3", textTransform: "uppercase", letterSpacing: "0.08em", background: "#EEF0FF" }}>
        Network Operations Lab
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          Topology — click a link to inspect it
        </div>
        <svg viewBox={`0 0 ${DIAGRAM_W} ${DIAGRAM_H}`} width="100%" height={DIAGRAM_H} style={{ display: "block", background: A.paper, borderRadius: 8 }} role="img" aria-label="Network topology diagram">
          {simulation.links.map((link) => {
            const from = positions[link.from], to = positions[link.to]
            if (!from || !to) return null
            const severity = linkSeverity(link)
            const isSelected = selectedLinkId === link.id
            return (
              <line
                key={link.id}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={SEVERITY_COLOR[severity]}
                strokeWidth={isSelected ? 4 : 2}
                strokeDasharray={severity === "down" ? "6 4" : undefined}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedLinkId(link.id)}
              />
            )
          })}
          {simulation.nodes.map((node) => {
            const pos = positions[node.id]
            if (!pos) return null
            return (
              <g key={node.id}>
                <circle cx={pos.x} cy={pos.y} r={NODE_R} fill="#fff" stroke={A.ink3} strokeWidth="1.6" />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="9" fontFamily={A.mono} fontWeight="700" fill={A.ink}>
                  {node.role?.slice(0, 3).toUpperCase() || "?"}
                </text>
                <text x={pos.x} y={pos.y + NODE_R + 14} textAnchor="middle" fontSize="10" fontFamily={A.font} fill={A.ink3}>
                  {node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "0 16px 16px" }}>
        <div style={{ flex: "1 1 300px", minWidth: 260 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Link Metrics
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {simulation.links.map((link) => (
              <div
                key={link.id}
                onClick={() => setSelectedLinkId(link.id)}
                style={{
                  display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, fontFamily: A.mono,
                  padding: "7px 10px", background: selectedLinkId === link.id ? "#EEF0FF" : A.paper,
                  border: `1px solid ${selectedLinkId === link.id ? "#3730A3" : A.border}`, borderRadius: 8, cursor: "pointer",
                }}
              >
                <span style={{ color: A.ink3 }}>{nodeById.get(link.from)?.label} → {nodeById.get(link.to)?.label}</span>
                <span style={{ fontWeight: 800, color: A.ink, textAlign: "right" }}>
                  {link.observedLatencyMs === null ? "unreachable" : `${link.observedLatencyMs}ms`}
                  {link.observedPacketLossPct > 0 ? ` · ${link.observedPacketLossPct}% loss` : ""}
                  <span style={{ color: A.ink3, fontWeight: 600 }}> (rated {link.ratedLatencyMs}ms)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: A.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Trace Route from {nodeById.get(simulation.traceFromId)?.label}
          </div>
          <select
            value={activeTraceId || ""}
            onChange={(e) => setTraceToId(e.target.value)}
            style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: `1px solid ${A.border}`, fontSize: 12.5, marginBottom: 8, fontFamily: A.font }}
          >
            {destinations.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          {route && (
            <div style={{ fontSize: 12, fontFamily: A.mono, padding: "8px 10px", background: A.paper, borderRadius: 8, color: A.ink }}>
              {route.reachable
                ? <>Reachable via {route.hops.length} hop{route.hops.length === 1 ? "" : "s"} — total {route.totalLatencyMs}ms{route.totalPacketLossPct > 0 ? `, ${route.totalPacketLossPct}% cumulative loss` : ""}</>
                : <span style={{ color: A.rose }}>Unreachable — no working path</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
