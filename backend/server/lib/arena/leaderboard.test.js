/**
 * leaderboard.test.js — proves points/rank come only from persisted,
 * verified mission results, and that "streak" is a real computation from
 * actual weekly activity (never fabricated): consecutive most-recent
 * weeks, ending at the current Arena week, with >=1 verified completion.
 */
import { test, before, after } from "node:test"
import assert from "node:assert/strict"

const STREAM_CSE = "cccccccc-cccc-cccc-cccc-cccccccccccc"
const STUDENT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const STUDENT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const STUDENT_C = "cccccccc-1111-1111-1111-111111111111"

function isoDaysAgo(base, days) {
  const d = new Date(`${base}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function makeFakeSupabase({ missions, profiles, streams }) {
  return {
    from(table) {
      const state = { filters: {} }
      const api = {
        select() { return api },
        eq(col, val) { state.filters[col] = val; return api },
        in(col, vals) { state.filters[`${col}__in`] = vals; return api },
        then(resolve) {
          if (table === "arena_weekly_missions") {
            let rows = missions
            if (state.filters.status) rows = rows.filter((r) => r.status === state.filters.status)
            if (state.filters["arena_weekly_allocations.stream_id"]) {
              rows = rows.filter((r) => r.arena_weekly_allocations.stream_id === state.filters["arena_weekly_allocations.stream_id"])
            }
            return resolve({ data: rows, error: null })
          }
          if (table === "profiles") {
            let rows = profiles
            if (state.filters["id__in"]) rows = rows.filter((r) => state.filters["id__in"].includes(r.id))
            return resolve({ data: rows, error: null })
          }
          if (table === "streams") {
            return resolve({ data: streams, error: null })
          }
          return resolve({ data: [], error: null })
        },
      }
      return api
    },
  }
}

let getLeaderboard, getCurrentArenaWeek, currentWeekStart

before(async () => {
  ;({ getCurrentArenaWeek } = await import("./week.js"))
  currentWeekStart = getCurrentArenaWeek().weekStart
  ;({ getLeaderboard } = await import("./leaderboard.js"))
})

after(() => { delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ })

function mission(studentId, weekStart, points) {
  return { points_awarded: points, status: "completed", arena_weekly_allocations: { student_id: studentId, stream_id: STREAM_CSE, week_start: weekStart } }
}

test("points and completedMissions are summed correctly and sorted descending by points", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({
    missions: [mission(STUDENT_A, currentWeekStart, 10), mission(STUDENT_A, currentWeekStart, 15), mission(STUDENT_B, currentWeekStart, 50)],
    profiles: [{ id: STUDENT_A, display_name: "A", stream_id: null }, { id: STUDENT_B, display_name: "B", stream_id: null }],
    streams: [],
  })
  const { global } = await getLeaderboard({})
  assert.equal(global[0].studentId, STUDENT_B)
  assert.equal(global[0].points, 50)
  assert.equal(global[1].points, 25)
  assert.equal(global[1].completedMissions, 2)
})

test("streak counts consecutive weeks ending at the CURRENT week — a student active this week and the 2 prior weeks has streak 3", async () => {
  const weeks = [currentWeekStart, isoDaysAgo(currentWeekStart, 7), isoDaysAgo(currentWeekStart, 14)]
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({
    missions: weeks.map((w) => mission(STUDENT_A, w, 10)),
    profiles: [{ id: STUDENT_A, display_name: "A", stream_id: null }],
    streams: [],
  })
  const { global } = await getLeaderboard({})
  assert.equal(global[0].streak, 3)
})

test("a gap breaks the streak — active this week and 3 weeks ago (skipping last week) gives streak 1", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({
    missions: [mission(STUDENT_A, currentWeekStart, 10), mission(STUDENT_A, isoDaysAgo(currentWeekStart, 21), 10)],
    profiles: [{ id: STUDENT_A, display_name: "A", stream_id: null }],
    streams: [],
  })
  const { global } = await getLeaderboard({})
  assert.equal(global[0].streak, 1)
})

test("a student with no completion in the current week has streak 0, even with a long run just before it", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({
    missions: [mission(STUDENT_A, isoDaysAgo(currentWeekStart, 7), 10), mission(STUDENT_A, isoDaysAgo(currentWeekStart, 14), 10)],
    profiles: [{ id: STUDENT_A, display_name: "A", stream_id: null }],
    streams: [],
  })
  const { global } = await getLeaderboard({})
  assert.equal(global[0].streak, 0)
})

test("each entry is enriched with rank (by sorted position), displayName, and the student's authoritative stream", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({
    missions: [mission(STUDENT_A, currentWeekStart, 100), mission(STUDENT_B, currentWeekStart, 50)],
    profiles: [
      { id: STUDENT_A, display_name: "Alice", stream_id: "stream-cse-id" },
      { id: STUDENT_B, display_name: null, name: "Bob Fallback", stream_id: null },
    ],
    streams: [{ id: "stream-cse-id", slug: "cse", name: "Computer Science Engineering" }],
  })
  const { global } = await getLeaderboard({})
  assert.equal(global[0].rank, 1)
  assert.equal(global[0].displayName, "Alice")
  assert.deepEqual(global[0].stream, { slug: "cse", name: "Computer Science Engineering" })
  assert.equal(global[1].rank, 2)
  assert.equal(global[1].displayName, "Bob Fallback")
  assert.equal(global[1].stream, null)
})

test("getLeaderboard's myStream is scoped to the given streamId, global is not", async () => {
  const OTHER_STREAM = "dddddddd-dddd-dddd-dddd-dddddddddddd"
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({
    missions: [
      { points_awarded: 10, status: "completed", arena_weekly_allocations: { student_id: STUDENT_A, stream_id: STREAM_CSE, week_start: currentWeekStart } },
      { points_awarded: 20, status: "completed", arena_weekly_allocations: { student_id: STUDENT_C, stream_id: OTHER_STREAM, week_start: currentWeekStart } },
    ],
    profiles: [{ id: STUDENT_A, display_name: "A", stream_id: null }, { id: STUDENT_C, display_name: "C", stream_id: null }],
    streams: [],
  })
  const { global, myStream } = await getLeaderboard({ streamId: STREAM_CSE })
  assert.equal(global.length, 2)
  assert.equal(myStream.length, 1)
  assert.equal(myStream[0].studentId, STUDENT_A)
})

test("an incomplete (not 'completed') mission never contributes points", async () => {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = makeFakeSupabase({
    missions: [{ points_awarded: 999, status: "failed", arena_weekly_allocations: { student_id: STUDENT_A, stream_id: STREAM_CSE, week_start: currentWeekStart } }],
    profiles: [{ id: STUDENT_A, display_name: "A", stream_id: null }],
    streams: [],
  })
  const { global } = await getLeaderboard({})
  assert.equal(global.length, 0)
})
