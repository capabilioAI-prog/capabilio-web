/**
 * arena/simulations/distributedSystemsLab.js — the CSE "Distributed
 * Systems Lab" micro-simulation. A leader-replicated write log across a
 * fixed cluster, with a given schedule of node outages (paused/
 * partitioned/restarted) — deterministic replication bookkeeping, not a
 * physics-style curve. Distinct object set (nodes, leader, replication
 * log, outage timeline) and interaction (step through the cluster's
 * event timeline, inspect per-node log state) from every other
 * registered simulation.
 */

export const SIMULATION_TYPE = "distributed_systems_lab"

/** Whether `nodeId` is down (per a given outage window) during `step`. */
function isDownAtStep(downWindows, nodeId, step) {
  return downWindows.some((w) => w.nodeId === nodeId && step >= w.fromStep && step <= w.toStep)
}

/**
 * Replays the write log against the outage schedule: the leader appends
 * one write per step and attempts to replicate it to every other node;
 * a node down during that step simply never receives that write (no
 * retroactive catch-up on restart in this model — a node that missed
 * writes stays behind until a real resync, which is exactly the
 * inconsistency the mission asks the student to find).
 */
export function computeReplicationState({ nodes, leaderId, writes, downWindows }) {
  const logs = new Map(nodes.map((n) => [n.id, []]))
  const perStep = []

  writes.forEach((write, i) => {
    const step = i + 1
    const delivered = []
    for (const node of nodes) {
      if (node.id === leaderId) { logs.get(node.id).push(write); delivered.push(node.id); continue }
      if (!isDownAtStep(downWindows, node.id, step)) { logs.get(node.id).push(write); delivered.push(node.id) }
    }
    perStep.push({
      step, write,
      nodeStatus: nodes.map((n) => ({ id: n.id, down: n.id !== leaderId && isDownAtStep(downWindows, n.id, step), delivered: delivered.includes(n.id) })),
    })
  })

  const leaderLog = logs.get(leaderId)
  const nodeResults = nodes
    .filter((n) => n.id !== leaderId)
    .map((n) => {
      const log = logs.get(n.id)
      const missedWrites = leaderLog.filter((w) => !log.includes(w))
      return { id: n.id, logLength: log.length, missedCount: missedWrites.length, consistent: missedWrites.length === 0 }
    })

  return { perStep, leaderLog, nodeResults }
}

/**
 * @param {object} recipe — { nodes: [{id,label}], leaderId, writes: string[],
 *   downWindows: [{nodeId, fromStep, toStep, reason: "paused"|"partitioned"}] }
 * @returns {object} PUBLIC simulation state: the cluster, the write count,
 *   and the full outage timeline (all legitimately public bench setup —
 *   the mission is to REASON over it, same honesty contract as rlc_lab
 *   exposing R/L/C and asking for the computed resonance point).
 */
export function generateDistributedSystemsState(recipe) {
  const { nodes, leaderId, writes, downWindows } = recipe
  const { perStep } = computeReplicationState(recipe)
  return {
    simulationType: SIMULATION_TYPE,
    nodes, leaderId, writeCount: writes.length,
    downWindows,
    perStep,
  }
}
