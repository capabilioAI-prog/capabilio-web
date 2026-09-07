import { test } from "node:test"
import assert from "node:assert/strict"
import { computeSpectrum, generateVibrationRigState } from "./vibrationRig.js"

test("a healthy machine shows only a mild 1x running-speed peak", () => {
  const peaks = computeSpectrum({ rpm: 1800, loadPct: 50 })
  assert.equal(peaks.length, 1)
  assert.equal(peaks[0].order, 1)
  assert.equal(peaks[0].frequencyHz, 30) // 1800/60
})

test("imbalance amplifies the 1x peak and introduces no new frequency", () => {
  const healthy = computeSpectrum({ rpm: 1800, loadPct: 50 })
  const imbalanced = computeSpectrum({ rpm: 1800, loadPct: 50, faultType: "imbalance", faultSeverity: 2 })
  assert.equal(imbalanced.length, 1)
  assert.ok(Math.abs(imbalanced[0].amplitudeMmS - healthy[0].amplitudeMmS * 3) < 0.001)
})

test("misalignment adds a distinct 2x running-speed peak without changing the 1x peak", () => {
  const healthy = computeSpectrum({ rpm: 1800, loadPct: 50 })
  const misaligned = computeSpectrum({ rpm: 1800, loadPct: 50, faultType: "misalignment", faultSeverity: 1 })
  assert.equal(misaligned.length, 2)
  assert.equal(misaligned[0].amplitudeMmS, healthy[0].amplitudeMmS)
  assert.equal(misaligned[1].order, 2)
  assert.equal(misaligned[1].frequencyHz, 60)
})

test("a bearing defect adds a non-integer-order peak whose amplitude grows with load", () => {
  const lowLoad = computeSpectrum({ rpm: 1800, loadPct: 20, faultType: "bearing_defect", faultSeverity: 1 })
  const highLoad = computeSpectrum({ rpm: 1800, loadPct: 80, faultType: "bearing_defect", faultSeverity: 1 })
  assert.equal(lowLoad[1].order, 3.5)
  assert.ok(highLoad[1].amplitudeMmS > lowLoad[1].amplitudeMmS)
})

test("the three fault signatures are mutually distinguishable — no two produce the same peak set shape", () => {
  const imbalance = computeSpectrum({ rpm: 1800, loadPct: 50, faultType: "imbalance", faultSeverity: 1 })
  const misalignment = computeSpectrum({ rpm: 1800, loadPct: 50, faultType: "misalignment", faultSeverity: 1 })
  const bearing = computeSpectrum({ rpm: 1800, loadPct: 50, faultType: "bearing_defect", faultSeverity: 1 })
  assert.equal(imbalance.length, 1)
  assert.equal(misalignment.length, 2)
  assert.equal(bearing.length, 2)
  assert.notEqual(misalignment[1].order, bearing[1].order)
})

test("generateVibrationRigState computes a spectrum per listed condition and is deterministic", () => {
  const recipe = { conditions: [{ label: "Low speed", rpm: 900, loadPct: 30 }, { label: "Full speed", rpm: 1800, loadPct: 80 }], faultType: "bearing_defect", faultSeverity: 1.5 }
  const a = generateVibrationRigState(recipe)
  const b = generateVibrationRigState(recipe)
  assert.deepEqual(a, b)
  assert.equal(a.spectra.length, 2)
})
