/**
 * arena/history.js — past weekly Arena cycles for one student (spec §48).
 * Immutable read of already-persisted allocations — no carryover logic
 * needed here since week_start is a hard partition already enforced at
 * allocation-creation time (spin.js only ever creates/reads the CURRENT
 * week's row).
 */
import { supabaseAdmin } from "../supabase.js"
import { getStudentRank } from "./leaderboard.js"

export async function getStudentHistory(studentId, { limit = 20 } = {}) {
  const { data: allocations, error } = await supabaseAdmin
    .from("arena_weekly_allocations")
    .select("id, week_start, spin_result, spin_at, streams(name, slug), arena_weekly_missions(status, points_awarded)")
    .eq("student_id", studentId)
    .order("week_start", { ascending: false })
    .limit(limit)
  if (error) throw error

  return (allocations || []).map((a) => {
    const missions = a.arena_weekly_missions || []
    const completed = missions.filter((m) => m.status === "completed").length
    const points = missions.reduce((sum, m) => sum + (m.points_awarded || 0), 0)
    return {
      weekStart: a.week_start,
      stream: a.streams ? { name: a.streams.name, slug: a.streams.slug } : null,
      spinResult: a.spin_result,
      spinAt: a.spin_at,
      missionsAssigned: missions.length,
      missionsCompleted: completed,
      points,
    }
  })
}

export async function getStudentHistoryWithRank(studentId, streamId) {
  const [history, rank] = await Promise.all([
    getStudentHistory(studentId),
    getStudentRank(studentId, { streamId }),
  ])
  return { history, rank }
}
