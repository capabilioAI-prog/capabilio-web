/**
 * arenaCapability.test.js — Arena Capability Engine, Phase 2.
 *
 * Real Express app + a real HS256 JWT (same convention as
 * opsDashboardRouting.test.js) + `__ARENA_V2_TEST_SUPABASE_CLIENT__` (the
 * existing generic Supabase-mock seam in lib/supabase.js) standing in for
 * every table the route's real, unmocked call chain touches end to end.
 * Business-logic edge cases (dedup, ranking, degradation) are already
 * covered at the unit level in selectionEngine.test.js/taskHistory.test.js/
 * profileService.test.js — this file only proves the route wiring: auth is
 * required, query params are validated, and a real end-to-end call returns
 * the documented response contract.
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import jwt from "jsonwebtoken"
import express from "express"

const JWT_SECRET = "test-only-secret-not-real"
const USER_ID = "77777777-7777-7777-7777-777777777777"

function signToken(userId) {
  return jwt.sign({ sub: userId, email: `${userId}@test.local`, role: "authenticated" }, JWT_SECRET, {
    algorithm: "HS256", expiresIn: "1h",
  })
}

function makeFakeSupabase() {
  const STREAM = { id: "stream-1", name: "CSE", slug: "cse" }
  const EXPERIMENT = {
    id: "e1", title: "Task A", prompt: "Do the thing", difficulty: "easy", difficulty_score: null,
    elo_reward: 10, time_limit_minutes: 30, challenge_type: null, skill_graph_node_id: null, created_at: "2026-01-01",
  }
  function chain(table) {
    let lastEq = null
    const api = {
      select() { return api },
      eq(col, val) { lastEq = val; return api },
      in() { return api },
      order() { return api },
      async maybeSingle() {
        if (table === "streams") return { data: lastEq === STREAM.slug ? STREAM : null, error: null }
        return { data: null, error: null }
      },
      insert() {
        return { select: () => ({ single: async () => ({ data: { id: "ev1", generated_at: "2026-09-02T00:00:00Z" }, error: null }) }) }
      },
      then(resolve) {
        if (table === "semesters") return resolve({ data: [{ id: "sem-1" }], error: null })
        // Authoritative subject<->semester relationship (Checkpoint D-1/D-2)
        // — semester_subjects, NOT subjects.semester_id. This fixture used
        // to answer a direct "subjects" query, which loadCollegeStreamTasks/
        // contextResolution.js no longer make since D-2's fix; without this,
        // the real end-to-end call silently degrades to no_suitable_task
        // (a real regression Checkpoint E's fresh full-suite run caught).
        if (table === "semester_subjects") return resolve({ data: [{ subject_id: "sub-1" }], error: null })
        if (table === "units") return resolve({ data: [{ id: "unit-1" }], error: null })
        if (table === "experiments") return resolve({ data: [EXPERIMENT], error: null })
        return resolve({ data: [], error: null }) // college_submissions, skill_graph_nodes, memory_states, etc.
      },
    }
    return api
  }
  return { from: (table) => chain(table) }
}

let server, baseUrl

before(async () => {
  process.env.SUPABASE_JWT_SECRET = JWT_SECRET
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase()

  const arenaCapabilityRoutes = (await import("../arenaCapability.js")).default
  const app = express()
  app.use(express.json())
  app.use("/api/arena/capability", arenaCapabilityRoutes) // mirrors server.js's real mount path

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
  await new Promise((resolve) => server.close(resolve))
})

test("GET /api/arena/capability/next-task with no auth is rejected", async () => {
  const res = await fetch(`${baseUrl}/api/arena/capability/next-task?domain=college_stream&key=cse`)
  assert.equal(res.status, 401)
})

test("GET /api/arena/capability/next-task with auth but missing query params returns 400", async () => {
  const res = await fetch(`${baseUrl}/api/arena/capability/next-task`, {
    headers: { Authorization: `Bearer ${signToken(USER_ID)}` },
  })
  assert.equal(res.status, 400)
})

test("GET /api/arena/capability/next-task with an unknown domain value returns 400, not 500", async () => {
  const res = await fetch(`${baseUrl}/api/arena/capability/next-task?domain=nonsense&key=cse`, {
    headers: { Authorization: `Bearer ${signToken(USER_ID)}` },
  })
  assert.equal(res.status, 400)
})

test("GET /api/arena/capability/next-task with an unknown stream slug returns 404", async () => {
  const res = await fetch(`${baseUrl}/api/arena/capability/next-task?domain=college_stream&key=does-not-exist`, {
    headers: { Authorization: `Bearer ${signToken(USER_ID)}` },
  })
  assert.equal(res.status, 404)
})

test("GET /api/arena/capability/next-task happy path returns the full documented contract", async () => {
  const res = await fetch(`${baseUrl}/api/arena/capability/next-task?domain=college_stream&key=cse`, {
    headers: { Authorization: `Bearer ${signToken(USER_ID)}` },
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.taskSource, "existing_verified")
  assert.equal(body.task.id, "e1")
  assert.equal(body.domain, "college_stream")
  assert.equal(body.role, "cse")
  assert.ok(Array.isArray(body.targetedCompetencies))
  assert.ok(Array.isArray(body.avoidedTaskIds))
  assert.ok("selectionReason" in body)
  assert.ok("provenance" in body)
  // Never leak grading internals to the client.
  assert.equal(body.task.rubric, undefined)
  assert.equal(body.task.reference_solution, undefined)
})
