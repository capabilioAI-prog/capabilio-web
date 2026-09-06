/**
 * challengeRepository.test.js — proves the hard non-IT eligibility rule
 * is enforced at the query level (defense in depth beyond retiring old
 * rows / rejecting new ones at content-validation time): a non-IT
 * stream's eligible pool can never include a challenge with a null
 * simulation_type, even if such a row is still `status = 'active'`.
 */
import { test, after } from "node:test"
import assert from "node:assert/strict"
import { findEligibleChallenges } from "./challengeRepository.js"

function makeRow(id, { simulation_type = null } = {}) {
  return { id, stream_id: "stream-1", status: "active", simulation_type }
}

function makeFakeSupabase(rows) {
  return {
    from(table) {
      assert.equal(table, "arena_challenges")
      const filters = { simulationTypeNotNull: false }
      const api = {
        select() { return api },
        eq() { return api },
        order() { return api },
        limit() { return api },
        not(col, op, val) {
          if (col === "simulation_type" && op === "is" && val === null) filters.simulationTypeNotNull = true
          return api
        },
        then(resolve) {
          const data = rows.filter((r) => !filters.simulationTypeNotNull || r.simulation_type !== null)
          return resolve({ data, error: null })
        },
      }
      return api
    },
  }
}

after(() => { delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ })

test("a non-IT streamSlug excludes rows with a null simulation_type, even if status is active", async () => {
  const rows = [makeRow(1, { simulation_type: "waveform_lab" }), makeRow(2, { simulation_type: null }), makeRow(3, { simulation_type: null })]
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(rows)
  const result = await findEligibleChallenges({ streamId: "stream-1", streamSlug: "ece" })
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 1)
})

test("an IT/computing streamSlug (e.g. cse) is not filtered by simulation_type — text/code challenges remain eligible", async () => {
  const rows = [makeRow(1, { simulation_type: "waveform_lab" }), makeRow(2, { simulation_type: null }), makeRow(3, { simulation_type: null })]
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(rows)
  const result = await findEligibleChallenges({ streamId: "stream-1", streamSlug: "cse" })
  assert.equal(result.length, 3)
})

test("omitting streamSlug entirely does not filter by simulation_type (back-compat for call sites that don't need eligibility filtering)", async () => {
  const rows = [makeRow(1, { simulation_type: "waveform_lab" }), makeRow(2, { simulation_type: null })]
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(rows)
  const result = await findEligibleChallenges({ streamId: "stream-1" })
  assert.equal(result.length, 2)
})

test("every declared non-IT stream (ece, eee, mechanical, civil, mba) is filtered", async () => {
  for (const slug of ["ece", "eee", "mechanical", "civil", "mba"]) {
    const rows = [makeRow(1, { simulation_type: "some_lab" }), makeRow(2, { simulation_type: null })]
    globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(rows)
    const result = await findEligibleChallenges({ streamId: "stream-1", streamSlug: slug })
    assert.equal(result.length, 1, `stream "${slug}" must filter out null-simulation_type rows`)
  }
})
