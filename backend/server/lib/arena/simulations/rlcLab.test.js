import { test } from "node:test"
import assert from "node:assert/strict"
import { computeResonanceHz, computeOperatingPoint, generateRlcState } from "./rlcLab.js"

const CIRCUIT = { resistanceOhms: 20, inductanceH: 0.02, capacitanceF: 50e-6, sourceVoltageV: 12 }

test("computeResonanceHz matches the standard series-RLC formula f0 = 1/(2*pi*sqrt(LC))", () => {
  const f0 = computeResonanceHz(CIRCUIT.inductanceH, CIRCUIT.capacitanceF)
  const expected = 1 / (2 * Math.PI * Math.sqrt(CIRCUIT.inductanceH * CIRCUIT.capacitanceF))
  assert.ok(Math.abs(f0 - expected) < 1e-9)
  assert.ok(Math.abs(f0 - 159.15) < 1) // sanity: known value for these components
})

test("at resonance, net reactance is ~0, impedance is minimal and equals R, current is maximal", () => {
  const f0 = computeResonanceHz(CIRCUIT.inductanceH, CIRCUIT.capacitanceF)
  const atResonance = computeOperatingPoint({ ...CIRCUIT, frequencyHz: f0 })
  assert.ok(Math.abs(atResonance.reactanceLOhms - atResonance.reactanceCOhms) < 0.5)
  assert.ok(Math.abs(atResonance.impedanceOhms - CIRCUIT.resistanceOhms) < 0.5)
  assert.ok(Math.abs(atResonance.phaseDeg) < 2)

  const below = computeOperatingPoint({ ...CIRCUIT, frequencyHz: f0 * 0.5 })
  const above = computeOperatingPoint({ ...CIRCUIT, frequencyHz: f0 * 1.5 })
  assert.ok(atResonance.currentA > below.currentA, "current must peak at resonance, not below it")
  assert.ok(atResonance.currentA > above.currentA, "current must peak at resonance, not above it")
})

test("below resonance the circuit is capacitive (negative phase), above it is inductive (positive phase)", () => {
  const f0 = computeResonanceHz(CIRCUIT.inductanceH, CIRCUIT.capacitanceF)
  const below = computeOperatingPoint({ ...CIRCUIT, frequencyHz: f0 * 0.5 })
  const above = computeOperatingPoint({ ...CIRCUIT, frequencyHz: f0 * 1.5 })
  assert.ok(below.phaseDeg < 0)
  assert.ok(above.phaseDeg > 0)
})

test("computeOperatingPoint never throws at frequency 0 (capacitive reactance would divide by zero)", () => {
  assert.doesNotThrow(() => computeOperatingPoint({ ...CIRCUIT, frequencyHz: 0 }))
})

test("generateRlcState is deterministic and produces sweepSteps+1 points spanning the given frequency range", () => {
  const recipe = { ...CIRCUIT, freqMinHz: 50, freqMaxHz: 500, sweepSteps: 40 }
  const a = generateRlcState(recipe)
  const b = generateRlcState(recipe)
  assert.deepEqual(a, b)
  assert.equal(a.points.length, 41)
  assert.equal(a.points[0].frequencyHz, 50)
  assert.equal(a.points.at(-1).frequencyHz, 500)
})

test("generateRlcState's public state exposes the given component values — legitimate bench info, not a hidden answer", () => {
  const state = generateRlcState({ ...CIRCUIT, freqMinHz: 50, freqMaxHz: 500 })
  assert.equal(state.resistanceOhms, 20)
  assert.equal(state.inductanceH, 0.02)
  assert.equal(state.capacitanceF, 50e-6)
  assert.equal(state.sourceVoltageV, 12)
})

test("current in the sweep peaks near the resonance frequency", () => {
  const f0 = computeResonanceHz(CIRCUIT.inductanceH, CIRCUIT.capacitanceF)
  const state = generateRlcState({ ...CIRCUIT, freqMinHz: 50, freqMaxHz: 500, sweepSteps: 200 })
  const peak = state.points.reduce((max, p) => (p.currentA > max.currentA ? p : max), state.points[0])
  assert.ok(Math.abs(peak.frequencyHz - f0) < 5)
})
