import { test } from "node:test"
import assert from "node:assert/strict"
import { twoProportionZTest, generateExperimentAnalysisState } from "./experimentAnalysisRoom.js"

test("the same rate difference is significant at large sample size but not at small sample size", () => {
  const large = twoProportionZTest({ controlN: 10000, controlConversions: 1000, treatmentN: 10000, treatmentConversions: 1200 })
  const small = twoProportionZTest({ controlN: 50, controlConversions: 5, treatmentN: 50, treatmentConversions: 6 })
  assert.equal(large.diff, 0.02)
  assert.equal(small.diff, 0.02)
  assert.equal(large.significantAt95, true)
  assert.equal(small.significantAt95, false)
})

test("a significant result's confidence interval excludes zero; a non-significant result's includes it", () => {
  const large = twoProportionZTest({ controlN: 10000, controlConversions: 1000, treatmentN: 10000, treatmentConversions: 1200 })
  const small = twoProportionZTest({ controlN: 50, controlConversions: 5, treatmentN: 50, treatmentConversions: 6 })
  assert.ok(large.confidenceIntervalLower > 0)
  assert.ok(small.confidenceIntervalLower < 0 && small.confidenceIntervalUpper > 0)
})

test("identical control and treatment rates give a z-score of exactly 0", () => {
  const r = twoProportionZTest({ controlN: 1000, controlConversions: 100, treatmentN: 1000, treatmentConversions: 100 })
  assert.equal(r.zScore, 0)
  assert.equal(r.significantAt95, false)
})

test("a negative lift (treatment worse than control) produces a negative z-score", () => {
  const r = twoProportionZTest({ controlN: 5000, controlConversions: 600, treatmentN: 5000, treatmentConversions: 450 })
  assert.ok(r.zScore < 0)
  assert.ok(r.diff < 0)
})

test("generateExperimentAnalysisState evaluates every listed experiment and exposes the raw counts", () => {
  const state = generateExperimentAnalysisState({
    experiments: [
      { id: 1, label: "Checkout button color", controlN: 10000, controlConversions: 1000, treatmentN: 10000, treatmentConversions: 1200 },
      { id: 2, label: "Email subject line", controlN: 50, controlConversions: 5, treatmentN: 50, treatmentConversions: 6 },
    ],
  })
  assert.equal(state.simulationType, "experiment_analysis_room")
  assert.equal(state.results.length, 2)
  assert.equal(state.results[0].significantAt95, true)
  assert.equal(state.results[1].significantAt95, false)
})

test("is deterministic", () => {
  const recipe = { experiments: [{ id: 1, label: "X", controlN: 100, controlConversions: 10, treatmentN: 100, treatmentConversions: 15 }] }
  assert.deepEqual(generateExperimentAnalysisState(recipe), generateExperimentAnalysisState(recipe))
})
