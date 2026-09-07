/**
 * arena/simulations/motorTestBench.js — the EEE "Motor Test Bench"
 * micro-simulation. A motor's nameplate rating (given, public) run across
 * several discrete operating conditions (load levels), with one optional
 * injected fault distorting the readings away from the expected baseline
 * — closed-form motor-characteristic curves, not a physics engine.
 * Distinct object set (nameplate rating, load levels, RPM/current/temp/
 * vibration readings) and interaction (switch operating condition,
 * measure) from every other registered simulation.
 */

export const SIMULATION_TYPE = "motor_test_bench"

function round(v, decimals = 2) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** The motor's expected (healthy) reading at a given load level, purely
 *  from its nameplate rating — a simplified but standard induction-motor
 *  characteristic (RPM droops with slip, current and I²-driven
 *  temperature rise with load, vibration mildly rises with load). */
export function computeBaselineReading(loadPct, rated) {
  const loadFrac = loadPct / 100
  return {
    rpm: rated.ratedRPM * (1 - 0.02 * loadFrac),
    currentA: rated.noLoadCurrentA + (rated.ratedCurrentA - rated.noLoadCurrentA) * loadFrac,
    tempC: rated.ambientC + rated.ratedTempRiseC * loadFrac ** 2,
    vibrationMmS: rated.baselineVibrationMmS * (1 + 0.1 * loadFrac),
  }
}

/** Distorts a baseline reading according to one injected fault type —
 *  each fault has a distinct, non-overlapping signature so the readings
 *  alone are enough to distinguish them. */
export function applyFault(baseline, faultType, severity = 1) {
  const reading = { ...baseline }
  switch (faultType) {
    case "bearing_wear":
      reading.vibrationMmS = baseline.vibrationMmS * (1 + severity)
      break
    case "winding_short":
      reading.currentA = baseline.currentA * (1 + severity)
      reading.tempC = baseline.tempC + severity * 20
      break
    case "supply_imbalance":
      reading.rpm = baseline.rpm * (1 - 0.05 * severity)
      reading.currentA = baseline.currentA * (1 + 0.15 * severity)
      break
    default:
      break
  }
  return reading
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { rated: {ratedRPM, ratedCurrentA, noLoadCurrentA, ambientC, ratedTempRiseC, baselineVibrationMmS},
 *     loadLevelsPct: number[], faultType?, faultSeverity? }
 * @returns {object} PUBLIC simulation state: the nameplate rating (given,
 *   public) plus the observed reading at each operating condition. The
 *   fault type/severity are never exposed — only their consequence on
 *   the readings — same honesty contract as network_ops_lab.
 */
export function generateMotorTestBenchState(recipe) {
  const { rated, loadLevelsPct, faultType, faultSeverity } = recipe
  const readings = loadLevelsPct.map((loadPct) => {
    const baseline = computeBaselineReading(loadPct, rated)
    const observed = applyFault(baseline, faultType, faultSeverity)
    return {
      loadPct,
      expected: { rpm: round(baseline.rpm), currentA: round(baseline.currentA), tempC: round(baseline.tempC), vibrationMmS: round(baseline.vibrationMmS) },
      observed: { rpm: round(observed.rpm), currentA: round(observed.currentA), tempC: round(observed.tempC), vibrationMmS: round(observed.vibrationMmS) },
    }
  })
  return {
    simulationType: SIMULATION_TYPE,
    nameplate: rated,
    readings,
  }
}
