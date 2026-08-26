import { test } from "node:test"
import assert from "node:assert/strict"
import { evaluate, EvaluatorError, SUPPORTED_RUBRIC_TYPES } from "./evaluator.js"

test("exact_match: correct answer passes, case/whitespace-insensitive by default", () => {
  const rubric = { type: "exact_match", answer: "O(log n)" }
  assert.deepEqual(evaluate(rubric, "o(log n)"), { score: 100, passed: true })
  assert.deepEqual(evaluate(rubric, "  O(LOG N)  "), { score: 100, passed: true })
})

test("exact_match: wrong answer fails with score 0", () => {
  const rubric = { type: "exact_match", answer: "O(log n)" }
  assert.deepEqual(evaluate(rubric, "O(n)"), { score: 0, passed: false })
})

test("exact_match: case_sensitive:true rejects a case mismatch", () => {
  const rubric = { type: "exact_match", answer: "LIFO", case_sensitive: true }
  assert.equal(evaluate(rubric, "lifo").passed, false)
  assert.equal(evaluate(rubric, "LIFO").passed, true)
})

test("exact_match: accepts {text} or {value} wrapped answers, not just raw strings", () => {
  const rubric = { type: "exact_match", answer: "LIFO" }
  assert.equal(evaluate(rubric, { text: "LIFO" }).passed, true)
})

test("numeric_tolerance: exact match passes", () => {
  const rubric = { type: "numeric_tolerance", answer: 3, tolerance: 0 }
  assert.deepEqual(evaluate(rubric, 3), { score: 100, passed: true })
})

test("numeric_tolerance: within tolerance passes, outside fails", () => {
  const rubric = { type: "numeric_tolerance", answer: 10, tolerance: 0.5 }
  assert.equal(evaluate(rubric, 10.4).passed, true)
  assert.equal(evaluate(rubric, 10.6).passed, false)
})

test("numeric_tolerance: non-numeric submitted answer is a legitimate fail, not a thrown error", () => {
  const rubric = { type: "numeric_tolerance", answer: 3, tolerance: 0 }
  assert.deepEqual(evaluate(rubric, "not a number"), { score: 0, passed: false })
})

test("throws EvaluatorError on missing rubric type", () => {
  assert.throws(() => evaluate({ answer: "x" }, "x"), EvaluatorError)
})

test("throws EvaluatorError on unknown rubric type", () => {
  assert.throws(() => evaluate({ type: "essay_review" }, "x"), EvaluatorError)
})

test("throws EvaluatorError on malformed exact_match rubric (non-string answer)", () => {
  assert.throws(() => evaluate({ type: "exact_match", answer: 42 }, "42"), EvaluatorError)
})

test("throws EvaluatorError on malformed numeric_tolerance rubric (non-numeric answer)", () => {
  assert.throws(() => evaluate({ type: "numeric_tolerance", answer: "3" }, 3), EvaluatorError)
})

test("SUPPORTED_RUBRIC_TYPES exposes exactly the two Phase 1 types", () => {
  assert.deepEqual(SUPPORTED_RUBRIC_TYPES.sort(), ["exact_match", "numeric_tolerance"])
})
