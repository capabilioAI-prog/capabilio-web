import { test } from "node:test"
import assert from "node:assert/strict"
import { generateCompressionState } from "./compressionLab.js"

const RECIPE = {
  steps: 40, maxStrainPct: 3, elasticModulusMPa: 20000,
  yieldStrainPct: 0.6, ultimateStrainPct: 1.8, ultimateStressMPa: 145,
  specimenLabel: "Specimen C-14",
}

test("is deterministic — the same recipe produces byte-identical output every time", () => {
  const a = generateCompressionState(RECIPE)
  const b = generateCompressionState(RECIPE)
  assert.deepEqual(a, b)
})

test("produces steps+1 points spanning 0 to maxStrainPct", () => {
  const state = generateCompressionState(RECIPE)
  assert.equal(state.points.length, 41)
  assert.equal(state.points[0].strainPct, 0)
  assert.equal(state.points.at(-1).strainPct, 3)
})

test("stress rises linearly (elastic) up to the yield strain", () => {
  const state = generateCompressionState(RECIPE)
  const elasticPoints = state.points.filter((p) => p.strainPct > 0 && p.strainPct <= RECIPE.yieldStrainPct)
  for (const p of elasticPoints) {
    const expected = RECIPE.elasticModulusMPa * (p.strainPct / 100)
    // Tolerance accounts for round2() rounding strainPct/stressMPa to 2
    // decimals independently — not a formula error, just reporting
    // precision (worst case ~1 MPa here given elasticModulusMPa=20000).
    assert.ok(Math.abs(p.stressMPa - expected) < 1.5)
  }
})

test("stress is monotonically non-decreasing through the elastic and plastic regions, then may soften past ultimate", () => {
  const state = generateCompressionState(RECIPE)
  const preUltimate = state.points.filter((p) => p.strainPct <= RECIPE.ultimateStrainPct)
  for (let i = 1; i < preUltimate.length; i++) {
    assert.ok(preUltimate[i].stressMPa >= preUltimate[i - 1].stressMPa - 0.01)
  }
})

test("reaches approximately ultimateStressMPa at ultimateStrainPct", () => {
  const state = generateCompressionState(RECIPE)
  const atUltimate = state.points.find((p) => Math.abs(p.strainPct - RECIPE.ultimateStrainPct) < 0.08)
  assert.ok(atUltimate, "expected a sampled point near ultimateStrainPct")
  assert.ok(Math.abs(atUltimate.stressMPa - RECIPE.ultimateStressMPa) < 5)
})

test("public state exposes yield/ultimate thresholds (legitimate lab-given info, not a hidden answer)", () => {
  const state = generateCompressionState(RECIPE)
  assert.equal(state.yieldStrainPct, 0.6)
  assert.equal(state.ultimateStrainPct, 1.8)
  assert.equal(state.specimenLabel, "Specimen C-14")
})
