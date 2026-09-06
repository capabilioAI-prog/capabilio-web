import { test } from "node:test"
import assert from "node:assert/strict"
import { SIMULATION_TYPES, isKnownSimulationType, validateSimulationCompatibility, validateSimulationConfigShape, getSimulationState } from "./registry.js"

test("registry lists exactly the five vertical-slice simulation types", () => {
  assert.deepEqual(new Set(SIMULATION_TYPES), new Set(["waveform_lab", "compression_lab", "rlc_lab", "beam_lab", "network_ops_lab"]))
})

test("isKnownSimulationType rejects anything not in the registry", () => {
  assert.ok(isKnownSimulationType("waveform_lab"))
  assert.ok(isKnownSimulationType("compression_lab"))
  assert.ok(isKnownSimulationType("rlc_lab"))
  assert.ok(isKnownSimulationType("beam_lab"))
  assert.ok(isKnownSimulationType("network_ops_lab"))
  assert.ok(!isKnownSimulationType("quantumOscilloscopeRocket"))
  assert.ok(!isKnownSimulationType("motor_fault_lab"), "roadmap types must not validate until they have a real generator")
  assert.ok(!isKnownSimulationType("operations_lab"), "MBA is removed from Arena — its simulation must not validate")
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

test("beam_lab is registered for civil diagnosis/investigation/calculation challenges only", () => {
  assert.deepEqual(validateSimulationCompatibility("beam_lab", { streamSlug: "civil", challengeType: "diagnosis" }), { ok: true })
  assert.equal(validateSimulationCompatibility("beam_lab", { streamSlug: "mechanical", challengeType: "diagnosis" }).ok, false)
})

test("getSimulationState dispatches beam_lab to its own generator", () => {
  const state = getSimulationState("beam_lab", { spanMm: 4000, loadN: 20000, loadPositionMm: 1500, modulusMPa: 200000, sectionWidthMm: 100, sectionHeightMm: 200, steps: 10 })
  assert.equal(state.simulationType, "beam_lab")
  assert.equal(state.points.length, 11)
})

test("network_ops_lab is registered for cse diagnosis/investigation challenges only", () => {
  assert.deepEqual(validateSimulationCompatibility("network_ops_lab", { streamSlug: "cse", challengeType: "diagnosis" }), { ok: true })
  assert.equal(validateSimulationCompatibility("network_ops_lab", { streamSlug: "mechanical", challengeType: "diagnosis" }).ok, false)
})

const NETWORK_RECIPE = {
  nodes: [{ id: "core", label: "Core", role: "router" }, { id: "a", label: "A", role: "host" }, { id: "b", label: "B", role: "host" }],
  links: [
    { id: "L1", from: "core", to: "a", ratedLatencyMs: 2, ratedCapacityMbps: 1000 },
    { id: "L2", from: "core", to: "b", ratedLatencyMs: 3, ratedCapacityMbps: 1000 },
  ],
  faultLinkId: "L2",
  faultType: "down",
}

test("getSimulationState dispatches network_ops_lab to its own generator", () => {
  const state = getSimulationState("network_ops_lab", NETWORK_RECIPE)
  assert.equal(state.simulationType, "network_ops_lab")
  assert.equal(state.links.length, 2)
})

test("network_ops_lab: a down link is unreachable end to end, an unaffected link stays at its rated latency", () => {
  const state = getSimulationState("network_ops_lab", NETWORK_RECIPE)
  const faulty = state.links.find((l) => l.id === "L2")
  assert.equal(faulty.observedLatencyMs, null)
  assert.equal(faulty.observedPacketLossPct, 100)
  assert.equal(state.routes.b.reachable, false)
  assert.equal(state.routes.a.reachable, true)
  assert.equal(state.routes.a.totalLatencyMs, 2)
})

test("network_ops_lab: a degraded link stays reachable at elevated latency with no packet loss", () => {
  const state = getSimulationState("network_ops_lab", { ...NETWORK_RECIPE, faultType: "degraded", faultSeverity: 4 })
  const faulty = state.links.find((l) => l.id === "L2")
  assert.equal(faulty.observedLatencyMs, 12)
  assert.equal(faulty.observedPacketLossPct, 0)
  assert.equal(state.routes.b.reachable, true)
  assert.equal(state.routes.b.totalLatencyMs, 12)
})

test("validateSimulationConfigShape rejects a config missing required keys for a given simulation_type", () => {
  const result = validateSimulationConfigShape("waveform_lab", { notAChannel: true })
  assert.equal(result.ok, false)
  assert.match(result.reason, /missing required key/)
})

test("validateSimulationConfigShape accepts a config declaring all required keys", () => {
  const result = validateSimulationConfigShape("beam_lab", { spanMm: 4000, loadN: 20000, loadPositionMm: 1500, modulusMPa: 200000, sectionWidthMm: 100, sectionHeightMm: 200 })
  assert.deepEqual(result, { ok: true })
})

test("validateSimulationConfigShape rejects an unknown simulation_type", () => {
  assert.equal(validateSimulationConfigShape("foo_lab", { anything: true }).ok, false)
})
