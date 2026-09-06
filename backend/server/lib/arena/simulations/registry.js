/**
 * arena/simulations/registry.js — the canonical Arena simulation registry
 * (spec §5, §35, §37). A challenge's `simulation_type` must resolve here;
 * AI generation and seed content are both validated against this same
 * list (contentValidation.js) — nothing can invent an unsupported
 * simulation_type. Add a new micro-lab by adding one entry here plus its
 * generator module; nothing else in the validation/route layer changes.
 */
import { SIMULATION_TYPE as WAVEFORM_LAB, generateWaveformState } from "./waveformLab.js"
import { SIMULATION_TYPE as COMPRESSION_LAB, generateCompressionState } from "./compressionLab.js"
import { SIMULATION_TYPE as RLC_LAB, generateRlcState } from "./rlcLab.js"
import { SIMULATION_TYPE as BEAM_LAB, generateBeamState } from "./beamLab.js"
import { SIMULATION_TYPE as OPERATIONS_LAB, generateOperationsState } from "./operationsLab.js"

export const SIMULATION_REGISTRY = {
  [WAVEFORM_LAB]: {
    id: WAVEFORM_LAB,
    name: "Signal Lab",
    supportedStreams: ["ece"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateWaveformState,
    // Every generator here defaults missing recipe fields defensively (so
    // a malformed AI response degrades to SOME trace rather than a 500)
    // — which means "does it throw" alone can't detect a meaningless
    // config (spec: "renderer exists but no meaningful interaction
    // configuration"). requiredConfigKeys is the separate, explicit floor
    // contentValidation.js checks: an authored config missing these isn't
    // a real dual-channel scope, whatever the generator falls back to.
    requiredConfigKeys: ["channel1", "channel2"],
  },
  [COMPRESSION_LAB]: {
    id: COMPRESSION_LAB,
    name: "Materials Lab",
    supportedStreams: ["mechanical"],
    supportedChallengeTypes: ["diagnosis", "investigation", "decision_making"],
    generate: generateCompressionState,
    requiredConfigKeys: ["elasticModulusMPa", "yieldStrainPct", "ultimateStrainPct", "ultimateStressMPa"],
  },
  [RLC_LAB]: {
    id: RLC_LAB,
    name: "Electrical Circuit Lab",
    supportedStreams: ["eee"],
    supportedChallengeTypes: ["investigation", "diagnosis", "calculation"],
    generate: generateRlcState,
    requiredConfigKeys: ["resistanceOhms", "inductanceH", "capacitanceF", "sourceVoltageV", "freqMinHz", "freqMaxHz"],
  },
  [BEAM_LAB]: {
    id: BEAM_LAB,
    name: "Structures Lab",
    supportedStreams: ["civil"],
    supportedChallengeTypes: ["diagnosis", "investigation", "calculation"],
    generate: generateBeamState,
    requiredConfigKeys: ["spanMm", "loadN", "loadPositionMm", "modulusMPa", "sectionWidthMm", "sectionHeightMm"],
  },
  [OPERATIONS_LAB]: {
    id: OPERATIONS_LAB,
    name: "Business Lab",
    supportedStreams: ["mba"],
    supportedChallengeTypes: ["decision_making", "investigation", "diagnosis"],
    generate: generateOperationsState,
    requiredConfigKeys: ["demandLowUnits", "demandHighUnits", "unitHoldingCost", "unitStockoutCost"],
  },
}

// Roadmap (spec §20, §29-32) — additional simulation families this
// registry is designed to grow into next: EEE motor_fault_lab/
// power_factor_lab/control_response_lab/electrical_measurement_lab;
// Mechanical vibration_lab/pneumatic_lab/measurement_lab/manufacturing_lab/
// thermal_lab; Civil surveying_lab/soil_lab/hydraulics_lab; MBA
// finance_lab/marketing_lab/hr_lab/strategy_lab. Not registered yet — an
// unimplemented entry here would let content validation accept a
// simulation_type with no working generator, breaking the UI it renders
// into. Add each only alongside its own generator module, same as the six above.

export const SIMULATION_TYPES = Object.keys(SIMULATION_REGISTRY)

export function isKnownSimulationType(simulationType) {
  return Object.prototype.hasOwnProperty.call(SIMULATION_REGISTRY, simulationType)
}

/** Full compatibility check used by contentValidation.js (spec §37-38):
 *  an unsupported type, or a supported type used outside its declared
 *  stream/challenge_type, is rejected before persistence. */
export function validateSimulationCompatibility(simulationType, { streamSlug, challengeType }) {
  if (!simulationType) return { ok: true }
  const sim = SIMULATION_REGISTRY[simulationType]
  if (!sim) return { ok: false, reason: `simulation_type "${simulationType}" is not in the supported simulation registry` }
  if (!sim.supportedStreams.includes(streamSlug)) {
    return { ok: false, reason: `simulation_type "${simulationType}" is not supported for stream "${streamSlug}" (supports: ${sim.supportedStreams.join(", ")})` }
  }
  if (!sim.supportedChallengeTypes.includes(challengeType)) {
    return { ok: false, reason: `simulation_type "${simulationType}" does not support challenge_type "${challengeType}" (supports: ${sim.supportedChallengeTypes.join(", ")})` }
  }
  return { ok: true }
}

/** Checks a candidate simulation_config actually declares the fields that
 *  make this simulation type meaningful (spec §45: reject "a renderer
 *  exists but the challenge has no meaningful interaction configuration").
 *  Deliberately separate from getSimulationState — the generators default
 *  missing fields defensively, so "does it throw" can't catch this. */
export function validateSimulationConfigShape(simulationType, config) {
  const sim = SIMULATION_REGISTRY[simulationType]
  if (!sim) return { ok: false, reason: `simulation_type "${simulationType}" is not in the supported simulation registry` }
  const missing = (sim.requiredConfigKeys || []).filter((key) => config?.[key] === undefined)
  if (missing.length > 0) {
    return { ok: false, reason: `simulation_config for "${simulationType}" is missing required key(s): ${missing.join(", ")} — not a meaningful interactive configuration` }
  }
  return { ok: true }
}

/** Computes the PUBLIC simulation state from a challenge's hidden recipe.
 *  Called once per mission fetch (routes/arena.js) — deterministic, so a
 *  refresh always reproduces the identical trace (spec §20-21). Returns
 *  null for an unknown type/missing recipe rather than throwing, since a
 *  malformed challenge should degrade to "no simulation shown", not a
 *  500 for the student. */
export function getSimulationState(simulationType, recipe) {
  const sim = SIMULATION_REGISTRY[simulationType]
  if (!sim || !recipe) return null
  try {
    return sim.generate(recipe)
  } catch {
    return null
  }
}
