/**
 * arena/simulations/networkOperationsCenter.js — the IT "Network
 * Operations Center" micro-simulation. A service dependency graph (web
 * app -> database -> DNS resolver, etc.) with one crashed root-cause
 * service cascading DOWN status to everything depending on it — exact
 * transitive dependency propagation, not a link-latency fault (that's
 * cse's network_ops_lab). Distinct object set (services, dependency
 * edges, restart outcomes) and interaction (restart a service and see
 * whether the WHOLE chain recovers) — the only registered simulation
 * whose interaction actually changes system state rather than just
 * reading it.
 */

export const SIMULATION_TYPE = "network_operations_center"

/** A service is down if it itself crashed, or (transitively) any
 *  service it depends on is down — a hard dependency, not "degraded". */
export function computeHealth(services) {
  const statusMap = {}
  function isDown(id, seen) {
    if (seen.has(id)) return false // cycle guard
    seen.add(id)
    if (statusMap[id] !== undefined) return statusMap[id]
    const svc = services.find((s) => s.id === id)
    if (svc.initialStatus === "crashed") { statusMap[id] = true; return true }
    const down = (svc.dependsOn || []).some((depId) => isDown(depId, seen))
    statusMap[id] = down
    return down
  }
  for (const s of services) isDown(s.id, new Set())
  return statusMap
}

/** What the whole graph's health looks like if `restartId` is restarted
 *  (its own crash cleared) — restarting a service that ISN'T actually
 *  crashed, or whose own dependency is still down, changes nothing. */
export function simulateRestart(services, restartId) {
  const modified = services.map((s) => (s.id === restartId ? { ...s, initialStatus: "up" } : s))
  return computeHealth(modified)
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { services: [{id, label, dependsOn: string[], initialStatus: "up"|"crashed"}] }
 * @returns {object} PUBLIC simulation state: the service topology (given,
 *   public — a real dependency map), the current health of every service
 *   (a real NOC dashboard would show this), and the outcome of
 *   restarting each currently-down service one at a time — finding
 *   WHICH restart clears every downstream failure is the mission.
 */
export function generateNocState(recipe) {
  const { services } = recipe
  const baselineHealth = computeHealth(services)
  const downServiceIds = services.filter((s) => baselineHealth[s.id]).map((s) => s.id)
  const restartOutcomes = downServiceIds.map((id) => ({
    restartedServiceId: id,
    resultingHealth: simulateRestart(services, id),
  }))
  return {
    simulationType: SIMULATION_TYPE,
    services,
    baselineHealth,
    restartOutcomes,
  }
}
