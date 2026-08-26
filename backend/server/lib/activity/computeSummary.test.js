import { test } from "node:test"
import assert from "node:assert/strict"
import { computeActivitySummary } from "./computeSummary.js"

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 7, 16, 12, 0, 0) // fixed "now" for determinism

function daysAgoIso(n) {
  return new Date(NOW - n * DAY_MS).toISOString()
}

test("empty events: zero streak, empty calendar counts, 84-day calendar length", () => {
  const summary = computeActivitySummary([], NOW)
  assert.equal(summary.calendar.length, 84)
  assert.ok(summary.calendar.every(c => c.count === 0))
  assert.deepEqual(summary.streak, { current: 0, longest: 0 })
  assert.deepEqual(summary.week, { missionsCompleted: 0, experimentsCompleted: 0, eloEarned: 0 })
})

test("current streak counts consecutive days ending today", () => {
  const events = [
    { date: daysAgoIso(0), elo: 5, branch: "domain" },
    { date: daysAgoIso(1), elo: 5, branch: "domain" },
    { date: daysAgoIso(2), elo: 5, branch: "domain" },
  ]
  const summary = computeActivitySummary(events, NOW)
  assert.equal(summary.streak.current, 3)
})

test("streak ending yesterday still counts (today not yet active doesn't break it)", () => {
  const events = [
    { date: daysAgoIso(1), elo: 5, branch: "domain" },
    { date: daysAgoIso(2), elo: 5, branch: "domain" },
  ]
  const summary = computeActivitySummary(events, NOW)
  assert.equal(summary.streak.current, 2)
})

test("a gap breaks the current streak", () => {
  const events = [
    { date: daysAgoIso(0), elo: 5, branch: "domain" },
    { date: daysAgoIso(2), elo: 5, branch: "domain" }, // gap at day 1
  ]
  const summary = computeActivitySummary(events, NOW)
  assert.equal(summary.streak.current, 1)
})

test("longest streak finds the best run even if it's not current", () => {
  const events = [
    daysAgoIso(0),
    daysAgoIso(10), daysAgoIso(11), daysAgoIso(12), daysAgoIso(13), daysAgoIso(14),
  ].map(d => ({ date: d, elo: 5, branch: "domain" }))
  const summary = computeActivitySummary(events, NOW)
  assert.equal(summary.streak.longest, 5)
  assert.equal(summary.streak.current, 1)
})

test("week stats split by branch and sum ELO correctly", () => {
  const events = [
    { date: daysAgoIso(1), elo: 5, branch: "domain" },
    { date: daysAgoIso(2), elo: 8, branch: "domain" },
    { date: daysAgoIso(3), elo: 3, branch: "college" },
    { date: daysAgoIso(10), elo: 100, branch: "domain" }, // outside the 7-day window
  ]
  const summary = computeActivitySummary(events, NOW)
  assert.equal(summary.week.missionsCompleted, 2)
  assert.equal(summary.week.experimentsCompleted, 1)
  assert.equal(summary.week.eloEarned, 16)
})

test("multiple events same day count as one calendar cell but multiple streak/week contributions", () => {
  const events = [
    { date: daysAgoIso(0), elo: 5, branch: "domain" },
    { date: daysAgoIso(0), elo: 8, branch: "college" },
  ]
  const summary = computeActivitySummary(events, NOW)
  const today = summary.calendar[summary.calendar.length - 1]
  assert.equal(today.count, 2)
  assert.equal(summary.week.eloEarned, 13)
})
