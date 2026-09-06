import { test } from "node:test"
import assert from "node:assert/strict"
import { windowSamples, movingAverage, samplesToPolyline, visiblePoints, pointsToPolyline } from "./labDisplay.js"

test("windowSamples returns the first windowPct% of samples", () => {
  const samples = Array.from({ length: 100 }, (_, i) => i)
  assert.equal(windowSamples(samples, 50).length, 50)
  assert.equal(windowSamples(samples, 100).length, 100)
  assert.deepEqual(windowSamples(samples, 10), samples.slice(0, 10))
})

test("windowSamples clamps to [1,100] and never returns fewer than 2 samples", () => {
  const samples = [1, 2, 3, 4];
  assert.equal(windowSamples(samples, 0).length, 2)
  assert.equal(windowSamples(samples, 500).length, 4)
})

test("movingAverage with windowSize <= 1 is a no-op passthrough", () => {
  const samples = [1, 5, 2, 8]
  assert.deepEqual(movingAverage(samples, 1), samples)
  assert.deepEqual(movingAverage(samples, 0), samples)
})

test("movingAverage smooths a noisy constant signal back toward the constant", () => {
  const noisy = [1, 1.5, 0.5, 1, 1.5, 0.5, 1, 1.5, 0.5, 1]
  const smoothed = movingAverage(noisy, 5)
  const variance = (arr) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  }
  assert.ok(variance(smoothed) < variance(noisy), "averaging must reduce variance, not increase it")
})

test("movingAverage does not shift the trace in time (same length, same start)", () => {
  const samples = [0, 1, 2, 3, 4, 5]
  const smoothed = movingAverage(samples, 3)
  assert.equal(smoothed.length, samples.length)
})

test("samplesToPolyline produces one coordinate pair per sample", () => {
  const poly = samplesToPolyline([0, 1, 0, -1], { width: 100, height: 50 })
  const pairs = poly.split(" ")
  assert.equal(pairs.length, 4)
  for (const pair of pairs) assert.match(pair, /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
})

test("samplesToPolyline returns empty string for fewer than 2 samples", () => {
  assert.equal(samplesToPolyline([1], { width: 100, height: 50 }), "")
  assert.equal(samplesToPolyline([], { width: 100, height: 50 }), "")
})

test("visiblePoints reveals proportionally more points as loadPct increases, always at least 1", () => {
  const points = Array.from({ length: 40 }, (_, i) => ({ strainPct: i, stressMPa: i * 2 }))
  assert.equal(visiblePoints(points, 0).length, 1)
  assert.equal(visiblePoints(points, 50).length, 20)
  assert.equal(visiblePoints(points, 100).length, 40)
})

test("pointsToPolyline maps strain/stress into the given viewbox with y flipped (origin bottom-left)", () => {
  const points = [{ strainPct: 0, stressMPa: 0 }, { strainPct: 3, stressMPa: 150 }]
  const poly = pointsToPolyline(points, { width: 300, height: 150, maxStrainPct: 3, maxStressMPa: 150 })
  const [first, last] = poly.split(" ")
  assert.equal(first, "0.00,150.00") // zero stress -> bottom of chart
  assert.equal(last, "300.00,0.00") // max stress -> top of chart
})
