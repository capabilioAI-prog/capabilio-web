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
