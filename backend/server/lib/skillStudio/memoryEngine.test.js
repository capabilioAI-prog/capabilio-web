import { test } from "node:test"
import assert from "node:assert/strict"
import { computeDecayedConfidence, halfLifeFromEase, bandFor, computeReinforcementDelta } from "./memoryEngine.js"

test("halfLifeFromEase is monotonic increasing and bounded", () => {
  const low = halfLifeFromEase(1.3)
  const mid = halfLifeFromEase(2.5)
  const high = halfLifeFromEase(3.2)
  assert.ok(low < mid && mid < high, "half-life should increase with ease factor")
  assert.ok(low >= 3, "half-life never below the 3-day floor")
  assert.ok(high <= 45, "half-life never above the 45-day ceiling")
})

test("computeDecayedConfidence returns original confidence with no prior reinforcement", () => {
  const result = computeDecayedConfidence({ confidence: 0.8, lastReinforcedAt: null, easeFactor: 2.5 })
  assert.equal(result, 0.8)
})

test("computeDecayedConfidence decays over time and never goes negative", () => {
  const now = new Date("2026-08-01T00:00:00Z")
  const reinforcedRecently = computeDecayedConfidence(
    { confidence: 0.9, lastReinforcedAt: "2026-07-31T00:00:00Z", easeFactor: 2.5 }, now
  )
  const reinforcedLongAgo = computeDecayedConfidence(
    { confidence: 0.9, lastReinforcedAt: "2026-01-01T00:00:00Z", easeFactor: 2.5 }, now
  )
  assert.ok(reinforcedRecently > reinforcedLongAgo, "less time elapsed should mean less decay")
  assert.ok(reinforcedLongAgo >= 0, "decay never produces a negative confidence")
  assert.ok(reinforcedRecently <= 0.9, "decay never increases confidence")
})

test("computeDecayedConfidence: higher ease factor decays slower over the same interval", () => {
  const now = new Date("2026-08-15T00:00:00Z")
  const lastReinforcedAt = "2026-08-01T00:00:00Z"
  const lowEase = computeDecayedConfidence({ confidence: 0.9, lastReinforcedAt, easeFactor: 1.3 }, now)
  const highEase = computeDecayedConfidence({ confidence: 0.9, lastReinforcedAt, easeFactor: 3.2 }, now)
  assert.ok(highEase > lowEase, "a skill with more successful reviews (higher ease) should retain more confidence")
})

test("bandFor thresholds match spec bands (high >=0.75, medium >=0.45, else low)", () => {
  assert.equal(bandFor(0.9), "high")
  assert.equal(bandFor(0.75), "high")
  assert.equal(bandFor(0.5), "medium")
  assert.equal(bandFor(0.45), "medium")
  assert.equal(bandFor(0.2), "low")
  assert.equal(bandFor(0), "low")
})

// ── computeReinforcementDelta (Arena evidence fix, 2026-09-04) ──────────────
// Extracted from reinforce() so the evidence-weighting arithmetic is
// unit-testable without a database — reinforce() itself just calls this.

test("computeReinforcementDelta: default multiplier (1) reproduces the exact pre-existing behavior for every non-Arena caller", () => {
  // Skill Studio quiz/interview/practice never pass strengthMultiplier —
  // this must be byte-identical to the old hardcoded formula.
  assert.equal(computeReinforcementDelta({ source: "quiz", correct: true }), 0.18)
  assert.equal(computeReinforcementDelta({ source: "quiz", correct: false }), -0.18 * 0.6)
  assert.equal(computeReinforcementDelta({ source: "arena", correct: true }), 0.35)
  assert.equal(computeReinforcementDelta({ source: "arena", correct: false }), -0.35 * 0.6)
})

test("computeReinforcementDelta: unknown source falls back to the module (lowest) strength", () => {
  assert.equal(computeReinforcementDelta({ source: "nonsense", correct: true }), 0.05)
})

test("computeReinforcementDelta: a higher multiplier (harder task, better score) produces a bigger positive delta", () => {
  const bare = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 0.9 })
  const strong = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 1.3 })
  assert.ok(strong > bare, "a stronger multiplier should reinforce more")
})

test("computeReinforcementDelta: multiplier is clamped — cannot exceed the bounded range even if a caller passes an extreme value", () => {
  const extreme = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 100 })
  const atCeiling = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 1.4 })
  assert.equal(extreme, atCeiling, "an out-of-range multiplier must clamp to the same ceiling, not scale unbounded")

  const extremeLow = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 0 })
  const atFloor = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 0.5 })
  assert.equal(extremeLow, atFloor, "an out-of-range multiplier must clamp to the same floor")
})

test("computeReinforcementDelta: even at the maximum multiplier, one event cannot jump a skill from near-zero to expert", () => {
  // Arena's own strength (0.35, the highest source tier) times the max
  // multiplier (1.4) is the largest possible single-event delta.
  const maxDelta = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 1.4 })
  assert.ok(maxDelta < 0.5, "a single reinforcement, even maximally weighted, stays well under the 0.75 'high confidence' band on its own")
})

test("computeReinforcementDelta: a failed attempt always produces a negative delta, softer than an equivalent pass", () => {
  const passDelta = computeReinforcementDelta({ source: "arena", correct: true, strengthMultiplier: 1 })
  const failDelta = computeReinforcementDelta({ source: "arena", correct: false, strengthMultiplier: 1 })
  assert.ok(failDelta < 0, "a failed attempt must reduce confidence")
  assert.ok(Math.abs(failDelta) < passDelta, "a failure should hit softer than an equivalent pass helps (asymmetric, matches existing *0.6 design)")
})
