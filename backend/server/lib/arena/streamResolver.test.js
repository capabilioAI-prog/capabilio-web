/**
 * streamResolver.test.js — proves spec §4/§5: stream is resolved ONLY
 * from profiles.stream_id, and a student cannot set/change it once it is
 * already set (no self-service reroute onto a different stream's pool).
 */
import { test, before, after, beforeEach } from "node:test"
import assert from "node:assert/strict"

const STUDENT_WITH_STREAM = "s1"
const STUDENT_WITHOUT_STREAM = "s2"
const CSE_ID = "stream-cse"
const ECE_ID = "stream-ece"

function makeFakeSupabase(state) {
  function chain(table) {
    const s = { table, filters: {} }
    const api = {
      select() { return api },
      update(payload) { s.updatePayload = payload; return api },
      eq(col, val) { s.filters[col] = val; return api },
      is(col, val) { s.isFilters = { ...(s.isFilters || {}), [col]: val }; return api },
      order() { return api },
      maybeSingle() { return finish() },
      then(resolve) { return resolve(finish()) },
    }
    function finish() {
      if (table === "profiles") {
        const p = state.profiles[s.filters.id]
        if (s.updatePayload) {
          if (s.isFilters && s.isFilters.stream_id === null && p.stream_id !== null) {
            return Promise.resolve({ data: [], error: null }) // WHERE stream_id IS NULL excludes this row
          }
          Object.assign(p, s.updatePayload)
          return Promise.resolve({ data: [{ id: p.id }], error: null })
        }
        return Promise.resolve({ data: p ? { stream_id: p.stream_id } : null, error: null })
      }
      if (table === "streams") {
        if (s.filters.id) return Promise.resolve({ data: state.streams.find((st) => st.id === s.filters.id) || null, error: null })
        return Promise.resolve({ data: state.streams, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    }
    return api
  }
  return { from: (table) => chain(table) }
}

let resolveAuthoritativeStream, setStreamIfUnset
let state

beforeEach(() => {
  state = {
    profiles: {
      [STUDENT_WITH_STREAM]: { id: STUDENT_WITH_STREAM, stream_id: CSE_ID, year: 1, role: "backend", branch: "IT", target_role: "Backend Developer" },
      [STUDENT_WITHOUT_STREAM]: { id: STUDENT_WITHOUT_STREAM, stream_id: null },
    },
    streams: [{ id: CSE_ID, slug: "cse", name: "Computer Science Engineering" }, { id: ECE_ID, slug: "ece", name: "Electronics & Communication" }],
  }
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase(state)
})

before(async () => {
  ({ resolveAuthoritativeStream, setStreamIfUnset } = await import("./streamResolver.js"))
})

after(() => {
  delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
})

test("resolves the stream from profiles.stream_id when set", async () => {
  const stream = await resolveAuthoritativeStream(STUDENT_WITH_STREAM)
  assert.equal(stream.slug, "cse")
})

test("returns null (not a guess) when the student has no stream set yet", async () => {
  const stream = await resolveAuthoritativeStream(STUDENT_WITHOUT_STREAM)
  assert.equal(stream, null)
})

test("a student with no stream can self-select one, once", async () => {
  const result = await setStreamIfUnset(STUDENT_WITHOUT_STREAM, ECE_ID)
  assert.equal(result.ok, true)
  assert.equal(result.stream.slug, "ece")
  const resolved = await resolveAuthoritativeStream(STUDENT_WITHOUT_STREAM)
  assert.equal(resolved.slug, "ece")
})

test("a student who already has a stream cannot change it via the self-service endpoint", async () => {
  const result = await setStreamIfUnset(STUDENT_WITH_STREAM, ECE_ID)
  assert.equal(result.ok, false)
  assert.equal(result.reason, "stream_already_set")
  const stillCse = await resolveAuthoritativeStream(STUDENT_WITH_STREAM)
  assert.equal(stillCse.slug, "cse", "stream must remain unchanged after a rejected set attempt")
})

test("setting an invalid stream id is rejected", async () => {
  const result = await setStreamIfUnset(STUDENT_WITHOUT_STREAM, "not-a-real-stream")
  assert.equal(result.ok, false)
  assert.equal(result.reason, "invalid_stream")
})

test("changing year/role/branch/target_role never changes the resolved stream (spec §4/§6 — stream is the ONLY selector)", async () => {
  const before = await resolveAuthoritativeStream(STUDENT_WITH_STREAM)
  assert.equal(before.slug, "cse")

  // Simulate the student's year advancing, switching professional role,
  // and branch/target_role changing elsewhere in the product — none of
  // this touches profiles.stream_id, so resolution must be unaffected.
  const profile = state.profiles[STUDENT_WITH_STREAM]
  profile.year = 4
  profile.role = "devops"
  profile.branch = "ECE"
  profile.target_role = "Site Reliability Engineer"

  const after = await resolveAuthoritativeStream(STUDENT_WITH_STREAM)
  assert.equal(after.slug, "cse", "stream resolution must ignore year/role/branch/target_role entirely")
  assert.equal(after.streamId, before.streamId)
})

test("resolveAuthoritativeStream never reads year/role/branch/target_role columns at all", async () => {
  // If streamResolver.js ever started reading one of these columns to
  // infer a stream, this profiles-table select would have to widen beyond
  // "stream_id" — assert the exact select string stays narrow.
  let selectedColumns = null
  const spyState = { profiles: { [STUDENT_WITH_STREAM]: { id: STUDENT_WITH_STREAM, stream_id: CSE_ID } }, streams: state.streams }
  function chain(table) {
    const s = { table, filters: {} }
    const api = {
      select(cols) { if (table === "profiles") selectedColumns = cols; return api },
      eq(col, val) { s.filters[col] = val; return api },
      maybeSingle() {
        if (table === "profiles") return Promise.resolve({ data: { stream_id: spyState.profiles[s.filters.id]?.stream_id ?? null }, error: null })
        if (table === "streams") return Promise.resolve({ data: spyState.streams.find((st) => st.id === s.filters.id) || null, error: null })
        return Promise.resolve({ data: null, error: null })
      },
    }
    return api
  }
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = { from: (table) => chain(table) }
  await resolveAuthoritativeStream(STUDENT_WITH_STREAM)
  assert.equal(selectedColumns, "stream_id", "must select ONLY stream_id from profiles — never year/role/branch/target_role")
})
