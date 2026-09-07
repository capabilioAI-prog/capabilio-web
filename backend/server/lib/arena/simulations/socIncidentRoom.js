/**
 * arena/simulations/socIncidentRoom.js — the Cybersecurity "SOC Incident
 * Room" micro-simulation. A raw security event log (logins, connections)
 * the student pivots across host/user/source-IP to find a brute-force-
 * then-compromise pattern — exact event-sequence bookkeeping, not a
 * generic "read the log and type an answer" text mission. Distinct
 * object set (events, hosts, users, source IPs, a pivot index) and
 * interaction (pivot on an entity to filter the timeline, correlate
 * events) from every other registered simulation.
 */

export const SIMULATION_TYPE = "soc_incident_room"

/** Every event whose `field` matches `value`, in chronological order —
 *  the "pivot" primitive: select an entity, see everything it touched. */
export function pivot(events, field, value) {
  return events.filter((e) => e[field] === value).slice().sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Flags (sourceIP, userId) pairs matching the classic brute-force
 * signature: at least `thresholdFailures` consecutive failed logins
 * immediately followed by a success, evaluated in chronological order.
 */
export function detectBruteForce(events, thresholdFailures = 5) {
  const byPair = new Map()
  for (const e of events.slice().sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.eventType !== "login") continue
    const key = `${e.sourceIP}|${e.userId}`
    if (!byPair.has(key)) byPair.set(key, { sourceIP: e.sourceIP, userId: e.userId, consecutiveFailures: 0, compromised: false })
    const entry = byPair.get(key)
    if (entry.compromised) continue
    if (e.outcome === "failure") entry.consecutiveFailures += 1
    else if (e.outcome === "success" && entry.consecutiveFailures >= thresholdFailures) entry.compromised = true
    else if (e.outcome === "success") entry.consecutiveFailures = 0
  }
  return [...byPair.values()].filter((e) => e.compromised)
}

function indexBy(events, field) {
  const counts = new Map()
  for (const e of events) counts.set(e[field], (counts.get(e[field]) || 0) + 1)
  return [...counts.entries()].map(([value, eventCount]) => ({ value, eventCount }))
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { events: [{id, timestamp, hostId, userId, sourceIP, eventType, outcome}] }
 * @returns {object} PUBLIC simulation state: the full raw event log
 *   (given, public — real telemetry) plus pivot indices (distinct hosts/
 *   users/IPs with event counts) so the student can choose what to
 *   investigate. Nothing is pre-flagged — the compromise pattern is what
 *   the mission asks the student to find by pivoting.
 */
export function generateSocIncidentState(recipe) {
  const { events } = recipe
  return {
    simulationType: SIMULATION_TYPE,
    events,
    hostIndex: indexBy(events, "hostId"),
    userIndex: indexBy(events, "userId"),
    ipIndex: indexBy(events, "sourceIP"),
  }
}
