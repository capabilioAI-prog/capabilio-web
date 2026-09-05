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
      [STUDENT_WITH_STREAM]: { id: STUDENT_WITH_STREAM, stream_id: CSE_ID },
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
