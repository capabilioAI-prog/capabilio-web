/**
 * arena/simulations/vibrationRig.js — the Mechanical "Machine Vibration
 * Rig" micro-simulation. A rotating machine's vibration SPECTRUM
 * (discrete frequency peaks tied to running speed) across a set of
 * operating conditions (RPM + load) — a standard, closed-form vibration-
 * diagnostics model (1x/2x/bearing-defect-order peaks), not a stress-
 * strain curve. Distinct object set (shaft, bearing, spectrum peaks) and
 * interaction (select an operating condition, inspect the spectrum) from
 * compression_lab's curve-stepping or any other registered simulation.
 */

export const SIMULATION_TYPE = "vibration_rig"

function round(v, decimals = 3) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** The spectrum's peaks at one operating condition. Each fault type has
 *  a non-overlapping signature (which peak it changes), matching how
 *  rotating-machinery diagnostics actually distinguishes fault classes:
 *  imbalance amplifies 1x running speed; misalignment adds a 2x peak;
 *  a bearing defect adds a peak at a non-integer multiple whose
 *  amplitude also grows with load. */
export function computeSpectrum({ rpm, loadPct, faultType, faultSeverity = 1 }) {
  const runningHz = rpm / 60
  const peaks = [{ order: 1, frequencyHz: round(runningHz), amplitudeMmS: round(0.5 + 0.3 * (loadPct / 100)) }]

  if (faultType === "imbalance") {
    peaks[0].amplitudeMmS = round(peaks[0].amplitudeMmS * (1 + faultSeverity))
  }
  if (faultType === "misalignment") {
    peaks.push({ order: 2, frequencyHz: round(runningHz * 2), amplitudeMmS: round(0.2 * (1 + faultSeverity)) })
  }
  if (faultType === "bearing_defect") {
    peaks.push({ order: 3.5, frequencyHz: round(runningHz * 3.5), amplitudeMmS: round(0.1 * (1 + faultSeverity) * (1 + loadPct / 100)) })
  }

  return peaks
}

/**
 * @param {object} recipe — hidden, server-only (verification_definition.simulation).
 *   { conditions: [{label, rpm, loadPct}], faultType?, faultSeverity? }
 * @returns {object} PUBLIC simulation state: the spectrum at every listed
 *   operating condition. The fault type/severity are never exposed
 *   directly — only their spectral signature — same honesty contract as
 *   network_ops_lab and motor_test_bench.
 */
export function generateVibrationRigState(recipe) {
  const { conditions, faultType, faultSeverity } = recipe
  const spectra = conditions.map((c) => ({
    label: c.label, rpm: c.rpm, loadPct: c.loadPct,
    peaks: computeSpectrum({ rpm: c.rpm, loadPct: c.loadPct, faultType, faultSeverity }),
  }))
  return {
    simulationType: SIMULATION_TYPE,
    spectra,
  }
}
