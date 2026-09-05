import { test } from "node:test"
import assert from "node:assert/strict"
import { getCurrentArenaWeek } from "./week.js"

test("week always starts on Monday and ends on Sunday, 6 days later", () => {
  // Wednesday 2026-09-02 12:00 UTC (~17:30 IST — safely mid-day in Asia/Kolkata too)
  const wed = new Date("2026-09-02T12:00:00Z")
  const { weekStart, weekEnd } = getCurrentArenaWeek(wed)
  assert.equal(weekStart, "2026-08-31") // the Monday of that week
  assert.equal(weekEnd, "2026-09-06")   // the following Sunday
})

test("a Monday maps to itself as weekStart", () => {
  const mon = new Date("2026-08-31T05:00:00Z")
  const { weekStart } = getCurrentArenaWeek(mon)
  assert.equal(weekStart, "2026-08-31")
})

test("a Sunday maps back to the Monday that started its week", () => {
  const sun = new Date("2026-09-06T18:00:00Z")
  const { weekStart, weekEnd } = getCurrentArenaWeek(sun)
  assert.equal(weekStart, "2026-08-31")
  assert.equal(weekEnd, "2026-09-06")
})

test("crossing into a new week (next Monday) produces a different weekStart", () => {
  const thisWeek = getCurrentArenaWeek(new Date("2026-09-02T12:00:00Z"))
  const nextWeek = getCurrentArenaWeek(new Date("2026-09-07T12:00:00Z")) // the following Monday
  assert.notEqual(thisWeek.weekStart, nextWeek.weekStart)
  assert.equal(nextWeek.weekStart, "2026-09-07")
})

test("timezone field is reported and stable across calls", () => {
  const a = getCurrentArenaWeek(new Date("2026-09-02T12:00:00Z"))
  const b = getCurrentArenaWeek(new Date("2026-09-03T12:00:00Z"))
  assert.equal(a.timezone, b.timezone)
  assert.ok(a.timezone.length > 0)
})
