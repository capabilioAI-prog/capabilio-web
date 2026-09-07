/**
 * arena/simulations/systemAdminLab.js — the IT "System Admin Lab" micro-
 * simulation. A server's per-process memory usage sampled over time,
 * used to isolate which process is leaking — exact linear-growth-rate
 * arithmetic over real telemetry, not a service dependency graph (that's
 * network_operations_center's domain). Distinct object set (processes,
 * a memory time series, server capacity) and interaction (inspect each
 * process's own usage trend, restart the offending process) from every
 * other registered simulation.
 */

export const SIMULATION_TYPE = "system_admin_lab"

function round(v, decimals = 3) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Average MB/min growth across the full observed window — a flat
 *  process reads ~0; a leaking one reads a clearly positive, sustained
 *  rate. */
export function computeGrowthRate(series) {
  if (series.length < 2) return 0
  const first = series[0], last = series[series.length - 1]
  const minutes = last.timestampMin - first.timestampMin
  return minutes > 0 ? round((last.memoryMB - first.memoryMB) / minutes) : 0
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { processes: [{pid, label}], totalMemoryMB,
 *     metrics: [{timestampMin, perProcessMemoryMB: {pid: mb}}] }
 * @returns {object} PUBLIC simulation state: every process's own memory
 *   time series and computed growth rate (given, public — real
 *   monitoring telemetry, exactly what a real ops dashboard shows) plus
 *   the server's total memory usage over time.
 */
export function generateSystemAdminState(recipe) {
  const { processes, totalMemoryMB, metrics } = recipe

  const perProcess = processes.map((p) => {
    const series = metrics.map((m) => ({ timestampMin: m.timestampMin, memoryMB: m.perProcessMemoryMB[p.pid] || 0 }))
    return { pid: p.pid, label: p.label, series, growthRateMBPerMin: computeGrowthRate(series) }
  })

  const totalOverTime = metrics.map((m) => ({
    timestampMin: m.timestampMin,
    totalUsedMB: round(Object.values(m.perProcessMemoryMB).reduce((a, b) => a + b, 0)),
  }))

  return {
    simulationType: SIMULATION_TYPE,
    totalMemoryMB,
    perProcess,
    totalOverTime,
  }
}
