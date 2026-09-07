import { test } from "node:test"
import assert from "node:assert/strict"
import { pickWithVariety } from "./planner.js"

function challenge(id, challenge_type) {
  return { id, challenge_type, title: `Challenge ${id}` }
}

test("picks distinct challenge_types before repeating, when enough variety exists (spec §43)", () => {
  const pool = [
    challenge(1, "debugging"), challenge(2, "debugging"), challenge(3, "debugging"),
    challenge(4, "calculation"), challenge(5, "diagnosis"),
  ]
  const chosen = pickWithVariety(pool, 3)
  const types = chosen.map((c) => c.challenge_type)
  assert.equal(new Set(types).size, 3, "should prefer 3 distinct types when 3 distinct types are available")
})

test("returns exactly N items when the pool has at least N", () => {
  const pool = [challenge(1, "debugging"), challenge(2, "calculation"), challenge(3, "diagnosis"), challenge(4, "coding")]
  const chosen = pickWithVariety(pool, 3)
  assert.equal(chosen.length, 3)
})

test("never picks the same challenge id twice", () => {
  const pool = [challenge(1, "debugging"), challenge(2, "debugging"), challenge(3, "debugging")]
  const chosen = pickWithVariety(pool, 3)
  const ids = chosen.map((c) => c.id)
  assert.equal(new Set(ids).size, ids.length)
})

test("falls back to repeating a type rather than starving the count when variety runs out", () => {
  const pool = [challenge(1, "debugging"), challenge(2, "debugging"), challenge(3, "debugging")]
  const chosen = pickWithVariety(pool, 3)
  assert.equal(chosen.length, 3) // all 3 are "debugging" — acceptable, count still met
})

test("returns fewer than N if the pool itself has fewer than N (caller's job to trigger generation)", () => {
  const pool = [challenge(1, "debugging")]
  const chosen = pickWithVariety(pool, 5)
  assert.equal(chosen.length, 1)
})

function simChallenge(id, simulationType, challengeType = "diagnosis") {
  return { id, challenge_type: challengeType, simulation_type: simulationType, title: `Challenge ${id}` }
}

test("diversifies by simulation_type (world), not just challenge_type — the real bug this fixes: 11 compression_lab entries and 1 vibration_rig all share challenge_type 'diagnosis', so challenge_type alone gives zero variety signal", () => {
  const pool = [
    ...Array.from({ length: 11 }, (_, i) => simChallenge(i, "compression_lab")),
    simChallenge(100, "vibration_rig"),
    simChallenge(101, "pneumatic_trainer"),
  ]
  const chosen = pickWithVariety(pool, 3)
  const worlds = new Set(chosen.map((c) => c.simulation_type))
  assert.equal(worlds.size, 3, "must surface all 3 distinct worlds when picking only 3, even though they all share challenge_type 'diagnosis'")
})

test("a spin large enough to need repeats still shows every distinct world at least once before repeating any", () => {
  const pool = [
    ...Array.from({ length: 11 }, (_, i) => simChallenge(i, "compression_lab")),
    simChallenge(100, "vibration_rig"),
    simChallenge(101, "pneumatic_trainer"),
  ]
  const chosen = pickWithVariety(pool, 5)
  const worldsInFirstThree = new Set(chosen.slice(0, 3).map((c) => c.simulation_type))
  assert.equal(worldsInFirstThree.size, 3, "the 3 distinct worlds must appear before any world repeats")
})

test("non-simulation content still diversifies by challenge_type exactly as before (back-compat)", () => {
  const pool = [challenge(1, "debugging"), challenge(2, "debugging"), challenge(3, "debugging"), challenge(4, "calculation"), challenge(5, "diagnosis")]
  const chosen = pickWithVariety(pool, 3)
  const types = chosen.map((c) => c.challenge_type)
  assert.equal(new Set(types).size, 3)
})
