/**
 * arena/week.js — server-authoritative Arena week boundary (spec §6).
 *
 * Week = Monday 00:00:00 through Sunday 23:59:59, in ARENA_TIMEZONE.
 * The browser's clock/timezone is never consulted. `week_start` is stored
 * as a plain DATE (no time component) — it is the allocation's stable,
 * comparable identity, not a moment in time.
 */
import { ARENA_TIMEZONE } from "./config.js"

const WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

/** {year, month (1-12), day, weekdayShort} for `at` (default now), as
 *  calendar fields in ARENA_TIMEZONE — never the server process's own TZ. */
function localDateParts(at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ARENA_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(at)
  const get = (type) => parts.find((p) => p.type === type)?.value
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekdayShort: get("weekday") }
}

function toISODate(utcMs) {
  return new Date(utcMs).toISOString().slice(0, 10)
}

/**
 * @param {Date} [at] — defaults to now. Exposed for tests only.
 * @returns {{ weekStart: string, weekEnd: string, timezone: string }}
 *   weekStart/weekEnd are 'YYYY-MM-DD' calendar dates (weekStart = Monday,
 *   weekEnd = the following Sunday) in ARENA_TIMEZONE.
 */
export function getCurrentArenaWeek(at = new Date()) {
  const { year, month, day, weekdayShort } = localDateParts(at)
  const daysSinceMonday = WEEKDAY_INDEX[weekdayShort] ?? 0
  // Treat (year, month, day) as a pure calendar date via Date.UTC — this is
  // arithmetic on calendar fields, not a real timezone-aware instant, which
  // is exactly what we want: "the Monday of this calendar week."
  const asUTCNoon = Date.UTC(year, month - 1, day, 12) // noon avoids any DST-edge day-shift from the subtraction below
  const mondayMs = asUTCNoon - daysSinceMonday * 86400000
  const sundayMs = mondayMs + 6 * 86400000
  return { weekStart: toISODate(mondayMs), weekEnd: toISODate(sundayMs), timezone: ARENA_TIMEZONE }
}
