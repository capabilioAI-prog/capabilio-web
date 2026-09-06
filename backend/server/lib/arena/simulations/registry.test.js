import { test } from "node:test"
import assert from "node:assert/strict"
import { SIMULATION_TYPES, isKnownSimulationType, validateSimulationCompatibility, getSimulationState } from "./registry.js"

test("registry lists exactly the two vertical-slice simulation types", () => {
  assert.deepEqual(new Set(SIMULATION_TYPES), new Set(["waveform_lab", "compression_lab"]))
})

test("isKnownSimulationType rejects anything not in the registry", () => {
  assert.ok(isKnownSimulationType("waveform_lab"))
  assert.ok(isKnownSimulationType("compression_lab"))
  assert.ok(!isKnownSimulationType("quantumOscilloscopeRocket"))
})

test("validateSimulationCompatibility passes null simulation_type through (non-simulation challenges)", () => {
  assert.deepEqual(validateSimulationCompatibility(null, { streamSlug: "cse", challengeType: "debugging" }), { ok: true })
})

test("validateSimulationCompatibility rejects an unknown simulation_type", () => {
  const result = validateSimulationCompatibility("quantumOscilloscopeRocket", { streamSlug: "ece", challengeType: "diagnosis" })
  assert.equal(result.ok, false)
})

test("validateSimulationCompatibility rejects a known simulation_type used on the wrong stream", () => {
  const result = validateSimulationCompatibility("waveform_lab", { streamSlug: "mechanical", challengeType: "diagnosis" })
  assert.equal(result.ok, false)
  assert.match(result.reason, /not supported for stream "mechanical"/)
})

test("validateSimulationCompatibility rejects a known simulation_type used with an unsupported challenge_type", () => {
  const result = validateSimulationCompatibility("waveform_lab", { streamSlug: "ece", challengeType: "calculation" })
  assert.equal(result.ok, false)
  assert.match(result.reason, /does not support challenge_type "calculation"/)
})

test("validateSimulationCompatibility accepts a correctly-paired simulation_type/stream/challenge_type", () => {
  assert.deepEqual(validateSimulationCompatibility("compression_lab", { streamSlug: "mechanical", challengeType: "diagnosis" }), { ok: true })
})

test("getSimulationState dispatches to the right generator", () => {
  const state = getSimulationState("waveform_lab", { sampleCount: 10, durationMs: 10, channel1: { frequencyHz: 100, amplitude: 1 }, channel2: { frequencyHz: 100, amplitude: 1 } })
  assert.equal(state.simulationType, "waveform_lab")
  assert.equal(state.channel1.samples.length, 10)
})

test("getSimulationState returns null for an unknown type or missing recipe, never throws", () => {
  assert.equal(getSimulationState("quantumOscilloscopeRocket", {}), null)
  assert.equal(getSimulationState("waveform_lab", null), null)
})
