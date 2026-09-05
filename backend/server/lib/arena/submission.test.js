/**
 * submission.test.js — proves the security/scoring guarantees spec §54-55
 * and §58 (SECURITY, VERIFICATION) require: a student cannot read/submit
 * another student's mission, and points/pass-fail are always computed
 * server-side from real verification — never from anything in the
 * request body, however it's smuggled in.
 */
import { test, before, after, beforeEach } from "node:test"
import assert from "node:assert/strict"

const OWNER = "11111111-1111-1111-1111-111111111111"
const ATTACKER = "22222222-2222-2222-2222-222222222222"
const ALLOCATION_ID = "alloc-1"
const MISSION_ID = "mission-1"
const CHALLENGE_ID = "challenge-1"

function baseState() {
  return {
    missions: {
      [MISSION_ID]: { id: MISSION_ID, allocation_id: ALLOCATION_ID, challenge_id: CHALLENGE_ID, status: "assigned", points_awarded: 0 },
    },
    allocations: { [ALLOCATION_ID]: { student_id: OWNER } },
    challenges: {
      [CHALLENGE_ID]: {
        id: CHALLENGE_ID, title: "Test challenge", points: 10, workstation_type: "calculation",
        verification_type: "numeric_tolerance", verification_definition: { expectedValue: 100, tolerance: 0 },
        skill_graph_node_id: null, competency_area: "Testing", skill: "Testing", scenario: "s", mission: "m",
        difficulty: "easy", challenge_type: "calculation", explanation: null,
      },
    },
    historyInserts: [],
    submissionInserts: [],
  }
}

function makeFakeSupabase(state) {
  function chain(table) {
    const s = { table, filters: {} }
    const api = {
      select() { return api },
      insert(payload) { s.insertPayload = payload; return api },
      update(payload) { s.updatePayload = payload; return api },
      eq(col, val) { s.filters[col] = val; return api },
      ilike() { return api },
      limit() { return api },
      single() { return finish() },
      maybeSingle() { return finish() },
      then(resolve) { return resolve(finish()) },
    }
    function finish() {
      if (table === "arena_weekly_missions" && s.filters.id) {
        const m = state.missions[s.filters.id]
        if (!m) return Promise.resolve({ data: null, error: null })
        if (s.updatePayload) { Object.assign(m, s.updatePayload); return Promise.resolve({ data: null, error: null }) }
        return Promise.resolve({ data: { ...m, arena_weekly_allocations: state.allocations[m.allocation_id] }, error: null })
      }
      if (table === "arena_challenges") {
        return Promise.resolve({ data: state.challenges[s.filters.id] || null, error: null })
      }
      if (table === "skill_graph_nodes") return Promise.resolve({ data: null, error: null })
      if (table === "arena_history") { state.historyInserts.push(s.insertPayload); return Promise.resolve({ data: null, error: null }) }
      if (table === "arena_submissions") { state.submissionInserts.push(s.insertPayload); return Promise.resolve({ data: null, error: null }) }
      return Promise.resolve({ data: null, error: null })
    }
    return api
  }
  return { from: (table) => chain(table) }
}

let submitMission
let state

beforeEach(() => {
  state = baseState()
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(state)
})

before(async () => {
  ({ submitMission } = await import("./submission.js"))
})

after(() => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
})

test("a student cannot submit to a mission belonging to another student's allocation", async () => {
  const result = await submitMission({ userId: ATTACKER, missionId: MISSION_ID, response: { value: 100 } })
  assert.equal(result.ok, false)
  assert.equal(result.reason, "not_found")
})

test("the owning student can submit and points are computed from real verification, not the request", async () => {
  const result = await submitMission({ userId: OWNER, missionId: MISSION_ID, response: { value: 100 } })
  assert.equal(result.ok, true)
  assert.equal(result.passed, true)
  assert.equal(result.pointsAwarded, 10) // the challenge's own points value, never client-supplied
})

test("a client cannot smuggle points/passed fields in the response body to force a pass", async () => {
  // Wrong value (50, not the expected 100) but the attacker also stuffs
  // fake points/passed fields into the response payload — verification.js
  // only ever reads `response.value` for numeric_tolerance; nothing here
  // can make a wrong answer pass or award points.
  const result = await submitMission({ userId: OWNER, missionId: MISSION_ID, response: { value: 50, points: 999, passed: true, pointsAwarded: 999 } })
  assert.equal(result.ok, true)
  assert.equal(result.passed, false)
  assert.equal(result.pointsAwarded, 0)
})

test("a mission that is already completed cannot be re-submitted for extra points", async () => {
  state.missions[MISSION_ID].status = "completed"
  const result = await submitMission({ userId: OWNER, missionId: MISSION_ID, response: { value: 100 } })
  assert.equal(result.ok, false)
  assert.equal(result.reason, "already_completed")
})

test("every attempt is preserved in the arena_submissions audit trail, not just the latest", async () => {
  await submitMission({ userId: OWNER, missionId: MISSION_ID, response: { value: 1 } })   // fail
  await submitMission({ userId: OWNER, missionId: MISSION_ID, response: { value: 50 } })  // fail
  await submitMission({ userId: OWNER, missionId: MISSION_ID, response: { value: 100 } }) // pass
  assert.equal(state.submissionInserts.length, 3, "all three attempts must each produce their own audit row")
  assert.deepEqual(state.submissionInserts.map((s) => s.passed), [false, false, true])
  assert.equal(state.submissionInserts[0].student_id, OWNER, "student_id is stamped server-side from the authenticated caller")
})
