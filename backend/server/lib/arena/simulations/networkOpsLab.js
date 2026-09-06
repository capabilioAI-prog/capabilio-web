/**
 * arena/simulations/networkOpsLab.js — the CSE "Network Operations Lab"
 * micro-simulation. A small routed topology (routers/switches/hosts) with
 * exactly one failing link. Deterministic per-link observed metrics, not a
 * physics engine — same "closed-form response, not a solver" contract as
 * the other labs (beamLab.js, rlcLab.js).
 *
 * The interaction primitive here is deliberately NOT a slider: the student
 * inspects a topology, reads per-link observed latency/loss against its
 * rated baseline, and traces routes from the core router outward — the
 * "system/network manipulation" primitive this stream's Arena product rule
 * calls for, distinct from ECE's probing or Civil's load placement.
 */

export const SIMULATION_TYPE = "network_ops_lab"

function round(v, decimals = 2) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** One link's observed metrics given its rated baseline and whether it is
 *  the recipe's single injected fault. Three distinguishable signatures —
 *  a student reads observed-vs-rated to classify which, exactly as
 *  beam_lab's stress/deflection are read against an allowable. */
function observeLink(link, recipe) {
  const rated = link.ratedLatencyMs
  if (link.id !== recipe.faultLinkId) {
    return { latencyMs: rated, packetLossPct: 0 }
  }
  const severity = recipe.faultSeverity ?? 4
  switch (recipe.faultType) {
    case "down":
      return { latencyMs: null, packetLossPct: 100 }
    case "congested":
      return { latencyMs: round(rated * 1.3), packetLossPct: round(severity) }
    case "degraded":
    default:
      return { latencyMs: round(rated * severity), packetLossPct: 0 }
  }
}

/** Dijkstra from `fromId` to every reachable node, using observed latency
 *  as edge weight (a null/"down" link is impassable). Small, undirected
 *  graph — this is a lookup table for the trace-route interaction, not a
 *  general routing engine. */
function shortestPathsFrom(fromId, nodes, observedLinks) {
  const adjacency = new Map(nodes.map((n) => [n.id, []]))
  for (const link of observedLinks) {
    if (link.latencyMs === null) continue // down — impassable
    adjacency.get(link.from)?.push({ to: link.to, link })
    adjacency.get(link.to)?.push({ to: link.from, link })
  }

  const dist = new Map(nodes.map((n) => [n.id, Infinity]))
  const prevLink = new Map()
  const prevNode = new Map()
  dist.set(fromId, 0)
  const unvisited = new Set(nodes.map((n) => n.id))

  while (unvisited.size > 0) {
    let current = null
    let currentDist = Infinity
    for (const id of unvisited) {
      if (dist.get(id) < currentDist) { current = id; currentDist = dist.get(id) }
    }
    if (current === null) break
    unvisited.delete(current)
    for (const { to, link } of adjacency.get(current) || []) {
      const alt = dist.get(current) + link.latencyMs
      if (alt < dist.get(to)) {
        dist.set(to, alt)
        prevNode.set(to, current)
        prevLink.set(to, link)
      }
    }
  }

  const routes = {}
  for (const node of nodes) {
    if (node.id === fromId) continue
    if (dist.get(node.id) === Infinity) {
      routes[node.id] = { reachable: false, hops: [], totalLatencyMs: null, totalPacketLossPct: null }
      continue
    }
    const hops = []
    let cursor = node.id
    while (cursor !== fromId) {
      hops.unshift(prevLink.get(cursor))
      cursor = prevNode.get(cursor)
    }
    const totalPacketLossPct = round(100 * (1 - hops.reduce((acc, h) => acc * (1 - h.packetLossPct / 100), 1)))
    routes[node.id] = { reachable: true, hops: hops.map((h) => h.id), totalLatencyMs: round(dist.get(node.id)), totalPacketLossPct }
  }
  return routes
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { nodes: [{id,label,role}], links: [{id,from,to,ratedLatencyMs,ratedCapacityMbps}],
 *     faultLinkId, faultType: "down"|"degraded"|"congested", faultSeverity?, traceFromId? }
 * @returns {object} PUBLIC simulation state: the topology, every link's
 *   observed metrics (never a labeled "status" — the student classifies
 *   from observed-vs-rated, same honesty contract as beam_lab exposing raw
 *   stress/deflection rather than a "safe"/"unsafe" label), and precomputed
 *   routes from the bench's core node for the trace-route interaction.
 */
export function generateNetworkOpsState(recipe) {
  const nodes = recipe.nodes
  const observedLinks = recipe.links.map((link) => ({ ...link, ...observeLink(link, recipe) }))
  const traceFromId = recipe.traceFromId || nodes[0]?.id
  const routes = shortestPathsFrom(traceFromId, nodes, observedLinks)

  return {
    simulationType: SIMULATION_TYPE,
    nodes,
    links: observedLinks.map((l) => ({
      id: l.id, from: l.from, to: l.to,
      ratedLatencyMs: l.ratedLatencyMs, ratedCapacityMbps: l.ratedCapacityMbps,
      observedLatencyMs: l.latencyMs, observedPacketLossPct: l.packetLossPct,
    })),
    traceFromId,
    routes,
  }
}
