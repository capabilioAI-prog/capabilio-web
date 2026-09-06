import { test } from "node:test"
import assert from "node:assert/strict"
import { SIMULATION_TYPES, isKnownSimulationType, validateSimulationCompatibility, getSimulationState } from "./registry.js"

test("registry lists exactly the three vertical-slice simulation types", () => {
  assert.deepEqual(new Set(SIMULATION_TYPES), new Set(["waveform_lab", "compression_lab", "rlc_lab"]))
})

test("isKnownSimulationType rejects anything not in the registry", () => {
  assert.ok(isKnownSimulationType("waveform_lab"))
  assert.ok(isKnownSimulationType("compression_lab"))
  assert.ok(isKnownSimulationType("rlc_lab"))
  assert.ok(!isKnownSimulationType("quantumOscilloscopeRocket"))
  assert.ok(!isKnownSimulationType("motor_fault_lab"), "roadmap types must not validate until they have a real generator")
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

test("rlc_lab is registered for eee investigation/diagnosis/calculation challenges only", () => {
  assert.deepEqual(validateSimulationCompatibility("rlc_lab", { streamSlug: "eee", challengeType: "investigation" }), { ok: true })
  assert.equal(validateSimulationCompatibility("rlc_lab", { streamSlug: "ece", challengeType: "investigation" }).ok, false)
  assert.equal(validateSimulationCompatibility("rlc_lab", { streamSlug: "eee", challengeType: "debugging" }).ok, false)
})

test("getSimulationState dispatches rlc_lab to its own generator", () => {
  const state = getSimulationState("rlc_lab", { resistanceOhms: 20, inductanceH: 0.02, capacitanceF: 50e-6, sourceVoltageV: 12, freqMinHz: 50, freqMaxHz: 500, sweepSteps: 10 })
  assert.equal(state.simulationType, "rlc_lab")
  assert.equal(state.points.length, 11)
})
