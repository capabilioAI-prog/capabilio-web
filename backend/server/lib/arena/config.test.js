/**
 * config.test.js — the wheel's outcome list is a hard product requirement
 * (exactly 8 segments, values 5-12, no duplicates) and the single source
 * of truth the frontend renders however many segments it returns, so it
 * is worth locking down directly rather than trusting it only via the
 * frontend wheel tests. Uses the same globalThis test-client hook
 * spin.test.js uses — no real Supabase project touched.
 */
import { test, after } from "node:test"
import assert from "node:assert/strict"
import { getWheelOutcomes } from "./config.js"

function makeFakeSupabase(row) {
  return {
    from(table) {
      assert.equal(table, "arena_config")
      return {
        select() { return this },
        eq(col, val) { assert.equal(col, "key"); assert.equal(val, "wheel_outcomes"); return this },
        maybeSingle: async () => ({ data: row, error: null }),
      }
    },
  }
}

after(() => { delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ })

test("getWheelOutcomes returns exactly 8 outcomes, values 5-12, no duplicates, when the DB row is well-formed", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({ value: [5, 6, 7, 8, 9, 10, 11, 12] })
  const outcomes = await getWheelOutcomes()
  assert.equal(outcomes.length, 8)
  assert.deepEqual(outcomes, [5, 6, 7, 8, 9, 10, 11, 12])
  assert.equal(new Set(outcomes).size, 8, "no duplicate outcome values")
  for (const v of outcomes) assert.ok(v >= 5 && v <= 12)
})

test("getWheelOutcomes falls back to the hard-coded default (still 8, 5-12, unique) when the row is missing", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(null)
  const outcomes = await getWheelOutcomes()
  assert.equal(outcomes.length, 8)
  assert.equal(new Set(outcomes).size, 8)
  for (const v of outcomes) assert.ok(v >= 5 && v <= 12)
})

test("getWheelOutcomes falls back to the default when the stored value is malformed (not an array)", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({ value: "not-an-array" })
  const outcomes = await getWheelOutcomes()
  assert.deepEqual(outcomes, [5, 6, 7, 8, 9, 10, 11, 12])
})

test("getWheelOutcomes never throws even if the query itself throws", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = {
    from() { return { select() { return this }, eq() { return this }, maybeSingle: async () => { throw new Error("boom") } } },
  }
  const outcomes = await getWheelOutcomes()
  assert.equal(outcomes.length, 8)
})
