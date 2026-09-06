/**
 * arena/simulations/rlcLab.js — the EEE "Electrical Circuit / Measurement
 * Lab" micro-simulation, series-RLC family. Deterministic closed-form
 * circuit equations (no physics engine, per spec §6/§23): a real virtual
 * test bench where R, L, C, and source voltage are GIVEN, public circuit
 * parameters — not a hidden answer — exactly like a real bench has
 * labeled components. The mission is to find/verify the resonance
 * condition, which is a genuine calculation from those public values, so
 * nothing about the circuit itself needs to be concealed; only the
 * grading rules (resonance tolerance band + correct behavior/conclusion
 * classification) live server-side in verification_definition.
 */

export const SIMULATION_TYPE = "rlc_lab"

function round(v, decimals = 4) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Series-RLC resonance frequency in Hz: f0 = 1 / (2*pi*sqrt(L*C)). */
export function computeResonanceHz(inductanceH, capacitanceF) {
  return 1 / (2 * Math.PI * Math.sqrt(inductanceH * capacitanceF))
}

/**
 * The circuit's operating point at one frequency — reactances, impedance
 * magnitude, current, and phase for a series R-L-C driven by `sourceVoltageV`.
 */
export function computeOperatingPoint({ resistanceOhms, inductanceH, capacitanceF, sourceVoltageV, frequencyHz }) {
  const omega = 2 * Math.PI * frequencyHz
  const reactanceLOhms = omega * inductanceH
  const reactanceCOhms = capacitanceF > 0 && frequencyHz > 0 ? 1 / (omega * capacitanceF) : Infinity
  const netReactanceOhms = reactanceLOhms - reactanceCOhms
  const impedanceOhms = Math.sqrt(resistanceOhms ** 2 + netReactanceOhms ** 2)
  const currentA = impedanceOhms > 0 ? sourceVoltageV / impedanceOhms : 0
  const phaseDeg = (Math.atan2(netReactanceOhms, resistanceOhms) * 180) / Math.PI
  return {
    frequencyHz: round(frequencyHz, 2),
    reactanceLOhms: round(reactanceLOhms),
    reactanceCOhms: Number.isFinite(reactanceCOhms) ? round(reactanceCOhms) : null,
    impedanceOhms: round(impedanceOhms),
    currentA: round(currentA, 5),
    phaseDeg: round(phaseDeg, 2),
  }
}

/**
 * @param {object} recipe — { resistanceOhms, inductanceH, capacitanceF,
 *   sourceVoltageV, freqMinHz, freqMaxHz, sweepSteps? }. All values are
 *   legitimately public (given bench components), unlike waveform_lab's
 *   anomaly or compression_lab's classification.
 * @returns {object} PUBLIC simulation state: the component values plus a
 *   precomputed frequency-response sweep (current & impedance vs
 *   frequency) for the response graph's backdrop curve. The frontend
 *   also re-derives operating points live as the student drags the
 *   frequency control — safe, since none of these inputs are secret.
 */
export function generateRlcState(recipe) {
  const steps = recipe.sweepSteps ?? 60
  const { resistanceOhms, inductanceH, capacitanceF, sourceVoltageV, freqMinHz, freqMaxHz } = recipe
  const points = []
  for (let i = 0; i <= steps; i++) {
    const frequencyHz = freqMinHz + ((freqMaxHz - freqMinHz) * i) / steps
    points.push(computeOperatingPoint({ resistanceOhms, inductanceH, capacitanceF, sourceVoltageV, frequencyHz }))
  }
  return {
    simulationType: SIMULATION_TYPE,
    resistanceOhms, inductanceH, capacitanceF, sourceVoltageV,
    freqMinHz, freqMaxHz,
    points,
  }
}
