import { test } from "node:test"
import assert from "node:assert/strict"
import { computeConfusionMatrix, generateModelDiagnosisState } from "./modelDiagnosisStudio.js"

const SCORES = [
  { id: 1, trueLabel: 1, score: 0.9 }, { id: 2, trueLabel: 1, score: 0.4 }, { id: 3, trueLabel: 0, score: 0.6 },
  { id: 4, trueLabel: 0, score: 0.2 }, { id: 5, trueLabel: 1, score: 0.7 }, { id: 6, trueLabel: 0, score: 0.3 },
]

test("computeConfusionMatrix produces the correct TP/FP/TN/FN split at a given threshold", () => {
  const m = computeConfusionMatrix(SCORES, 0.5)
  assert.deepEqual({ tp: m.tp, fp: m.fp, tn: m.tn, fn: m.fn }, { tp: 2, fp: 1, tn: 2, fn: 1 })
})

test("precision, recall, F1, and accuracy match their standard formulas", () => {
  const m = computeConfusionMatrix(SCORES, 0.5)
  assert.equal(m.precision, 0.6667)
  assert.equal(m.recall, 0.6667)
  assert.equal(m.accuracy, 0.6667)
})

test("raising the threshold can only decrease or hold recall (fewer positive predictions)", () => {
  const low = computeConfusionMatrix(SCORES, 0.3)
  const high = computeConfusionMatrix(SCORES, 0.8)
  assert.ok(high.recall <= low.recall)
})

test("errors lists exactly the misclassified examples at that threshold, with their predicted label attached", () => {
  const m = computeConfusionMatrix(SCORES, 0.5)
  assert.equal(m.errors.length, 2)
  assert.ok(m.errors.some((e) => e.id === 2 && e.predicted === 0))
  assert.ok(m.errors.some((e) => e.id === 3 && e.predicted === 1))
})

test("a threshold of 0 predicts everything positive — recall 1, precision equals the base rate", () => {
  const m = computeConfusionMatrix(SCORES, 0)
  assert.equal(m.recall, 1)
  assert.equal(m.fn, 0)
})

test("generateModelDiagnosisState evaluates every candidate threshold and exposes the full labeled set", () => {
  const state = generateModelDiagnosisState({ labeledScores: SCORES, thresholdOptions: [0.3, 0.5, 0.7] })
  assert.equal(state.simulationType, "model_diagnosis_studio")
  assert.equal(state.byThreshold.length, 3)
  assert.deepEqual(state.labeledScores, SCORES)
})
