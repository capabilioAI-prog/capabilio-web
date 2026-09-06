import { test } from "node:test"
import assert from "node:assert/strict"
import { computeMomentOfInertiaMm4, computeReactions, computeMomentAt, computeDeflectionAt, computeBeamResponse, generateBeamState } from "./beamLab.js"

const BEAM = { spanMm: 4000, loadN: 20000, loadPositionMm: 1500, modulusMPa: 200000, sectionWidthMm: 100, sectionHeightMm: 200 }

test("computeMomentOfInertiaMm4 matches the standard rectangular section formula b*h^3/12", () => {
  assert.equal(computeMomentOfInertiaMm4(100, 200), (100 * 200 ** 3) / 12)
})

test("reactions sum to the total applied load and are proportional to the opposite lever arm", () => {
  const { reactionLeftN, reactionRightN } = computeReactions(BEAM)
  assert.ok(Math.abs(reactionLeftN + reactionRightN - BEAM.loadN) < 1e-6)
  assert.ok(reactionLeftN > reactionRightN, "the reaction closer to the load's far side carries more load")
})

test("bending moment is zero at both supports and positive under the load", () => {
  assert.ok(Math.abs(computeMomentAt(0, BEAM)) < 1e-6)
  assert.ok(Math.abs(computeMomentAt(BEAM.spanMm, BEAM)) < 1e-6)
  assert.ok(computeMomentAt(BEAM.loadPositionMm, BEAM) > 0)
})

test("deflection is zero at both supports and positive (downward) under the load", () => {
  const I = computeMomentOfInertiaMm4(BEAM.sectionWidthMm, BEAM.sectionHeightMm)
  const cfg = { ...BEAM, momentOfInertiaMm4: I }
  assert.ok(Math.abs(computeDeflectionAt(0, cfg)) < 1e-6)
  assert.ok(Math.abs(computeDeflectionAt(BEAM.spanMm, cfg)) < 1e-6)
  assert.ok(computeDeflectionAt(BEAM.loadPositionMm, cfg) > 0)
})

test("computeBeamResponse matches hand-calculated values for a known 20kN load at 1.5m on a 4m span", () => {
  const response = computeBeamResponse(BEAM)
  // R1 = P*b/L = 20000*2500/4000 = 12500 N; M_max = R1*a = 12500*1500 = 18,750,000 N*mm
  assert.ok(Math.abs(response.maxMomentNmm - 18_750_000) < 1)
  // sigma = M*c/I = 18,750,000*100/66,666,667 ~= 28.125 MPa
  assert.ok(Math.abs(response.maxStressMPa - 28.125) < 0.01)
  // deflection at load ~= 1.758mm (closed-form point-load formula)
  assert.ok(Math.abs(response.deflectionAtLoadMm - 1.758) < 0.01)
})

test("doubling the load doubles moment, stress, and deflection (linear elastic response)", () => {
  const base = computeBeamResponse(BEAM)
  const doubled = computeBeamResponse({ ...BEAM, loadN: BEAM.loadN * 2 })
  assert.ok(Math.abs(doubled.maxMomentNmm / base.maxMomentNmm - 2) < 1e-6)
  assert.ok(Math.abs(doubled.maxStressMPa / base.maxStressMPa - 2) < 1e-6)
  assert.ok(Math.abs(doubled.deflectionAtLoadMm / base.deflectionAtLoadMm - 2) < 1e-6)
})

test("generateBeamState is deterministic and produces steps+1 points spanning the full beam", () => {
  const recipe = { ...BEAM, allowableStressMPa: 150, allowableDeflectionMm: 13.3, steps: 20 }
  const a = generateBeamState(recipe)
  const b = generateBeamState(recipe)
  assert.deepEqual(a, b)
  assert.equal(a.points.length, 21)
  assert.equal(a.points[0].xMm, 0)
  assert.equal(a.points.at(-1).xMm, BEAM.spanMm)
})

test("generateBeamState's public state exposes given geometry/material — legitimate bench info, not a hidden answer", () => {
  const state = generateBeamState({ ...BEAM, allowableStressMPa: 150, allowableDeflectionMm: 13.3 })
  assert.equal(state.spanMm, 4000)
  assert.equal(state.sectionWidthMm, 100)
  assert.equal(state.sectionHeightMm, 200)
})
