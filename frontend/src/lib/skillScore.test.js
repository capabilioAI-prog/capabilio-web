import { test } from "node:test"
import assert from "node:assert/strict"
import { confidenceAdjustedScore } from "./skillScore.js"

test("1/1 correct does not render as 100% mastered", () => {
  const v = confidenceAdjustedScore(1, 1)
  assert.ok(v < 70, `expected a shrunk score under 70, got ${v}`)
  assert.ok(v > 50, `expected a shrunk score above the 50% prior, got ${v}`)
})

test("0/1 correct does not render as 0%", () => {
  const v = confidenceAdjustedScore(0, 1)
  assert.ok(v > 20 && v < 50, `expected a score between the floor and the prior, got ${v}`)
})

test("approaches the raw percentage as the sample size grows", () => {
  const small = confidenceAdjustedScore(1, 1)
  const large = confidenceAdjustedScore(20, 20)
  assert.ok(large > small, "more correct answers at scale should score higher than a single lucky guess")
  assert.ok(large >= 90, `expected a large all-correct sample to approach 100, got ${large}`)
})

test("total <= 0 returns 0 instead of dividing by zero", () => {
  assert.equal(confidenceAdjustedScore(0, 0), 0)
  assert.equal(confidenceAdjustedScore(5, 0), 0)
})

test("clamps correct to the [0, total] range", () => {
  assert.equal(confidenceAdjustedScore(-3, 5), confidenceAdjustedScore(0, 5))
  assert.equal(confidenceAdjustedScore(99, 5), confidenceAdjustedScore(5, 5))
})
