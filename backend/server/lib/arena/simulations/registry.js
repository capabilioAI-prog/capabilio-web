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

export const SIMULATION_REGISTRY = {
  [WAVEFORM_LAB]: {
    id: WAVEFORM_LAB,
    name: "Signal Lab",
    supportedStreams: ["ece"],
    supportedChallengeTypes: ["diagnosis", "investigation"],
    generate: generateWaveformState,
  },
  [COMPRESSION_LAB]: {
    id: COMPRESSION_LAB,
    name: "Materials Lab",
    supportedStreams: ["mechanical"],
    supportedChallengeTypes: ["diagnosis", "investigation", "decision_making"],
    generate: generateCompressionState,
  },
}

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
