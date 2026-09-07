/**
 * arena/simulations/circuitBench.js — the ECE "Electronics Circuit Bench"
 * micro-simulation. A fixed DC topology (R1 in series with R2 parallel
 * R3, driven by a source) with one resistor possibly faulted (open,
 * shorted, or off-value) — exact series/parallel Ohm's-law algebra, not a
 * physics engine. Distinct object set (resistors, source, probe points)
 * and interaction (probe a node's voltage/current) from every other
 * registered simulation. Nominal resistor values are given (the design
 * spec, exactly like beam_lab's given span/load); only the measured
 * probe readings are exposed — which resistor is actually faulted, and
 * how, is what the mission asks the student to diagnose.
 */

export const SIMULATION_TYPE = "circuit_bench"

function round(v, decimals = 4) {
  if (!Number.isFinite(v)) return v
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/**
 * @param {{ sourceVoltageV, r1Ohms, r2Ohms, r3Ohms }} params — r*Ohms may
 *   be `0` (short) or `Infinity` (open) to model a faulted resistor.
 * @returns {{ nodeBVoltageV, i1A, i2A, i3A }} the bench's actual electrical
 *   state — R1 in series with (R2 parallel R3).
 */
export function solveCircuit({ sourceVoltageV, r1Ohms, r2Ohms, r3Ohms }) {
  let rParallel
  let i2A, i3A
  const shortR2 = r2Ohms === 0, shortR3 = r3Ohms === 0

  if (shortR2 || shortR3) {
    rParallel = 0
  } else {
    rParallel = 1 / (1 / r2Ohms + 1 / r3Ohms)
  }

  const rTotal = r1Ohms + rParallel
  const i1A = rTotal === Infinity ? 0 : rTotal === 0 ? Infinity : sourceVoltageV / rTotal
  const nodeBVoltageV = Number.isFinite(i1A) ? i1A * rParallel : 0

  if (shortR2) { i2A = i1A; i3A = 0 }
  else if (shortR3) { i2A = 0; i3A = i1A }
  else { i2A = nodeBVoltageV / r2Ohms; i3A = nodeBVoltageV / r3Ohms }

  return {
    nodeBVoltageV: round(nodeBVoltageV),
    i1A: round(i1A, 6), i2A: round(i2A, 6), i3A: round(i3A, 6),
  }
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { sourceVoltageV, nominal: {r1Ohms,r2Ohms,r3Ohms}, actual: {r1Ohms,r2Ohms,r3Ohms} }
 *   `nominal` is the given design spec (public); `actual` is the bench's
 *   real, possibly-faulted state (never exposed directly — only its
 *   electrical CONSEQUENCE, the probe readings, is public).
 * @returns {object} PUBLIC simulation state: source voltage, nominal
 *   resistor labels/values, and the measured probe readings.
 */
export function generateCircuitBenchState(recipe) {
  const { sourceVoltageV, nominal, actual } = recipe
  const measured = solveCircuit({ sourceVoltageV, r1Ohms: actual.r1Ohms, r2Ohms: actual.r2Ohms, r3Ohms: actual.r3Ohms })
  return {
    simulationType: SIMULATION_TYPE,
    sourceVoltageV,
    nominal,
    probes: {
      nodeA: sourceVoltageV,
      nodeB: measured.nodeBVoltageV,
      ground: 0,
    },
    branchCurrentsA: { i1: measured.i1A, i2: measured.i2A, i3: measured.i3A },
  }
}
