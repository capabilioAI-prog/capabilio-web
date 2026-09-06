import { test } from "node:test"
import assert from "node:assert/strict"
import { computeOperatingPoint, sweepToPolyline, frequencyToX } from "./rlcMath.js"

const CIRCUIT = { resistanceOhms: 20, inductanceH: 0.02, capacitanceF: 50e-6, sourceVoltageV: 12 }

test("computeOperatingPoint matches the backend's series-RLC formula shape (impedance, current, phase)", () => {
  const point = computeOperatingPoint({ ...CIRCUIT, frequencyHz: 159 })
  assert.ok(point.impedanceOhms > 0)
  assert.ok(point.currentA > 0)
  assert.ok(Number.isFinite(point.phaseDeg))
})

test("current is maximal near resonance and drops off away from it", () => {
  const near = computeOperatingPoint({ ...CIRCUIT, frequencyHz: 159 })
  const far = computeOperatingPoint({ ...CIRCUIT, frequencyHz: 800 })
  assert.ok(near.currentA > far.currentA)
})

test("sweepToPolyline maps frequency/value pairs into the given viewbox", () => {
  const points = [
    { frequencyHz: 50, currentA: 0 },
    { frequencyHz: 500, currentA: 1 },
  ]
  const poly = sweepToPolyline(points, { width: 300, height: 150, field: "currentA", freqMinHz: 50, freqMaxHz: 500, maxValue: 1 })
  const [first, last] = poly.split(" ")
  assert.equal(first, "0.00,150.00")
  assert.equal(last, "300.00,0.00")
})

test("sweepToPolyline returns empty string for fewer than 2 points", () => {
  assert.equal(sweepToPolyline([{ frequencyHz: 50, currentA: 0 }], { width: 300, height: 150, field: "currentA", freqMinHz: 50, freqMaxHz: 500, maxValue: 1 }), "")
})

test("frequencyToX places the minimum frequency at x=0 and the maximum at x=width", () => {
  assert.equal(frequencyToX(50, { width: 300, freqMinHz: 50, freqMaxHz: 500 }), 0)
  assert.equal(frequencyToX(500, { width: 300, freqMinHz: 50, freqMaxHz: 500 }), 300)
})
