/**
 * spin.test.js — proves the two hardest-to-get-right guarantees in the
 * whole spec: no reroll (spec §9) and no double-allocation under a
 * concurrent race (spec §8, §51). Uses the codebase's existing
 * globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ hook — no real Supabase
 * project touched, and the challenge pool is pre-seeded generously enough
 * that the planner never needs to fall through to AI generation (which
 * would make this test flaky/slow/networked).
 */
import { test, before, after, beforeEach } from "node:test"
import assert from "node:assert/strict"

const STUDENT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const STUDENT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const STREAM_CSE = "cccccccc-cccc-cccc-cccc-cccccccccccc"
const STREAM_ECE = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"

function makeChallenge(i, type, streamId = STREAM_CSE) {
  return {
    id: `challenge-${streamId}-${i}`, stream_id: streamId, status: "active", challenge_type: type,
    competency_area: "Algorithms", skill: "Test Skill", title: `Challenge ${i}`,
    scenario: "s", mission: "m", difficulty: "easy", estimated_minutes: 10, instructions: "i",
    inputs: {}, expected_output: {}, workstation_type: "coding", verification_type: "test_cases",
    verification_definition: {}, points: 10, explanation: null, tags: [], version: 1,
  }
}

function makeFakeSupabase(state) {
  function chain(table) {
    const s = { table, filters: {}, insertPayload: null, isFilters: {} }
    const api = {
      select() { return api },
      insert(payload) { s.insertPayload = payload; return api },
      update(payload) { s.updatePayload = payload; return api },
      delete() { s.isDelete = true; return api },
      eq(col, val) { s.filters[col] = val; return api },
      is(col, val) { s.isFilters[col] = val; return api },
      not() { return api },
      order() { return api },
      limit() { return api },
      single() { return finish() },
      maybeSingle() { return finish() },
      then(resolve) { return resolve(finish()) },
    }

    function finish() {
      if (table === "arena_weekly_allocations") {
        if (s.insertPayload) {
          const key = `${s.insertPayload.student_id}|${s.insertPayload.week_start}`
          if (state.allocations.has(key)) {
            return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } })
          }
          const row = { id: `alloc-${state.allocations.size + 1}`, ...s.insertPayload }
          state.allocations.set(key, row)
          return Promise.resolve({ data: row, error: null })
        }
        if (s.isDelete) {
          for (const [k, v] of state.allocations) if (v.id === s.filters.id) state.allocations.delete(k)
          return Promise.resolve({ data: null, error: null })
        }
        // read path
        const found = [...state.allocations.values()].find(
          (r) => (!s.filters.student_id || r.student_id === s.filters.student_id) &&
                 (!s.filters.week_start || r.week_start === s.filters.week_start) &&
                 (!s.filters.id || r.id === s.filters.id)
        )
        return Promise.resolve({ data: found || null, error: null })
      }
      if (table === "arena_weekly_missions") {
        if (s.insertPayload) {
          const rows = (Array.isArray(s.insertPayload) ? s.insertPayload : [s.insertPayload]).map((p, i) => ({ id: `mission-${state.missions.length + i + 1}`, ...p }))
          state.missions.push(...rows)
          return Promise.resolve({ data: rows, error: null })
        }
        const rows = state.missions.filter((m) => m.allocation_id === s.filters.allocation_id)
          .map((m) => ({ ...m, arena_challenges: state.challenges.find((c) => c.id === m.challenge_id) }))
        return Promise.resolve({ data: rows, error: null })
      }
      if (table === "arena_challenges") {
        return Promise.resolve({ data: state.challenges.filter((c) => c.stream_id === s.filters.stream_id && c.status === "active"), error: null })
      }
      if (table === "arena_config") {
        return Promise.resolve({ data: { value: [9] }, error: null }) // fixed wheel outcome for a deterministic test
      }
      return Promise.resolve({ data: null, error: null })
    }
    return api
  }
  return { from: (table) => chain(table) }
}

let spinOrGetAllocation

function makeState() {
  return {
    allocations: new Map(),
    missions: [],
    challenges: [
      ...Array.from({ length: 12 }, (_, i) => makeChallenge(i, i % 3 === 0 ? "debugging" : i % 3 === 1 ? "calculation" : "diagnosis", STREAM_CSE)),
      ...Array.from({ length: 12 }, (_, i) => makeChallenge(i, i % 3 === 0 ? "debugging" : i % 3 === 1 ? "calculation" : "diagnosis", STREAM_ECE)),
    ],
  }
}

let sharedState

beforeEach(() => {
  sharedState = makeState()
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(sharedState)
})

before(async () => {
  ({ spinOrGetAllocation } = await import("./spin.js"))
})

after(() => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
})

test("first spin creates a new allocation with exactly the wheel-selected mission count", async () => {
  const result = await spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" })
  assert.equal(result.reused, false)
  assert.equal(result.spinResult, 9)
  assert.equal(result.missions.length, 9)
})

test("a second spin call for the same student/week returns the SAME allocation — no reroll (spec §9)", async () => {
  const first = await spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" })
  const second = await spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" })
  assert.equal(second.allocationId, first.allocationId)
  assert.equal(second.spinResult, first.spinResult)
  assert.deepEqual(second.missions.map((m) => m.challenge_id).sort(), first.missions.map((m) => m.challenge_id).sort())
  assert.equal(second.reused, true)
})

test("a concurrent spin race (two calls with no allocation yet) never produces two allocations (spec §8, §51)", async () => {
  const [a, b] = await Promise.all([
    spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" }),
    spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" }),
  ])
  assert.equal(a.allocationId, b.allocationId, "both concurrent callers must land on the same single allocation")
})

test("assigned missions contain no duplicate challenge ids", async () => {
  const result = await spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" })
  const ids = result.missions.map((m) => m.challenge_id)
  assert.equal(new Set(ids).size, ids.length)
})

test("a CSE student receives ONLY CSE challenges, never ECE (stream is the only selector)", async () => {
  const result = await spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" })
  for (const m of result.missions) {
    const challenge = sharedState.challenges.find((c) => c.id === m.challenge_id)
    assert.equal(challenge.stream_id, STREAM_CSE, `mission ${m.challenge_id} must belong to CSE, not any other stream`)
  }
})

test("an ECE student receives ONLY ECE challenges, never CSE — same allocation engine, different stream", async () => {
  const result = await spinOrGetAllocation({ studentId: STUDENT_B, streamId: STREAM_ECE, streamSlug: "ece" })
  for (const m of result.missions) {
    const challenge = sharedState.challenges.find((c) => c.id === m.challenge_id)
    assert.equal(challenge.stream_id, STREAM_ECE, `mission ${m.challenge_id} must belong to ECE, not any other stream`)
  }
})

test("two students in different streams spinning the same week get independent allocations", async () => {
  const cse = await spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" })
  const ece = await spinOrGetAllocation({ studentId: STUDENT_B, streamId: STREAM_ECE, streamSlug: "ece" })
  assert.notEqual(cse.allocationId, ece.allocationId)
  assert.equal(cse.streamId, STREAM_CSE)
  assert.equal(ece.streamId, STREAM_ECE)
})

test("a new week produces a new allocation, and the previous week's allocation remains historical (spec §10)", async () => {
  // Seed a PAST week's allocation directly (as if the student spun last week).
  const pastWeekKey = `${STUDENT_A}|2020-01-06`
  sharedState.allocations.set(pastWeekKey, { id: "alloc-past-week", student_id: STUDENT_A, week_start: "2020-01-06", stream_id: STREAM_CSE, spin_result: 5 })

  const current = await spinOrGetAllocation({ studentId: STUDENT_A, streamId: STREAM_CSE, streamSlug: "cse" })

  assert.notEqual(current.allocationId, "alloc-past-week", "spinning now must not reuse or overwrite a past week's allocation")
  assert.equal(sharedState.allocations.get(pastWeekKey).id, "alloc-past-week", "the past week's allocation must still exist, completely unchanged")
  assert.equal(sharedState.allocations.get(pastWeekKey).spin_result, 5, "historical spin_result is immutable")
})
