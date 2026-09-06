/**
 * arena/leaderboard.js — server-computed ranking from persisted, verified
 * mission results only (spec §47). No client-submitted points ever reach
 * this aggregation — points_awarded is written exclusively by
 * submission.js after real verification.
 */
import { supabaseAdmin } from "../supabase.js"
import { getCurrentArenaWeek } from "./week.js"

async function aggregatePoints({ streamId } = {}) {
  let query = supabaseAdmin
    .from("arena_weekly_missions")
    .select("points_awarded, status, arena_weekly_allocations!inner(student_id, stream_id, week_start)")
    .eq("status", "completed")
  if (streamId) query = query.eq("arena_weekly_allocations.stream_id", streamId)

  const { data, error } = await query
  if (error) throw error

  const byStudent = new Map()
  const activeWeeksByStudent = new Map()
  for (const row of data || []) {
    const { student_id: studentId, week_start: weekStart } = row.arena_weekly_allocations
    const entry = byStudent.get(studentId) || { studentId, points: 0, completedMissions: 0 }
    entry.points += row.points_awarded || 0
    entry.completedMissions += 1
    byStudent.set(studentId, entry)

    if (!activeWeeksByStudent.has(studentId)) activeWeeksByStudent.set(studentId, new Set())
    activeWeeksByStudent.get(studentId).add(weekStart)
  }

  // Real streak, computed from actual persisted completions — never
  // fabricated: consecutive most-recent weeks (ending at the current
  // Arena week) with at least one verified completion. A student inactive
  // this week has a streak of 0, same as any broken-streak product.
  const { weekStart: currentWeekStart } = getCurrentArenaWeek()
  for (const entry of byStudent.values()) {
    const activeWeeks = activeWeeksByStudent.get(entry.studentId) || new Set()
    let streak = 0
    let cursor = new Date(`${currentWeekStart}T00:00:00Z`)
    while (activeWeeks.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 7)
    }
    entry.streak = streak
  }

  return [...byStudent.values()].sort((a, b) => b.points - a.points)
}

/** Attaches display name and authoritative stream (slug + name) to each
 *  leaderboard entry, and assigns rank by array position (server-sorted,
 *  never re-derived from client data). */
async function enrichEntries(entries) {
  if (entries.length === 0) return entries
  const ids = entries.map((e) => e.studentId)
  const [{ data: profiles }, { data: streams }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, display_name, name, stream_id").in("id", ids),
    supabaseAdmin.from("streams").select("id, slug, name"),
  ])
  const streamById = new Map((streams || []).map((s) => [s.id, { slug: s.slug, name: s.name }]))
  const profileById = new Map((profiles || []).map((p) => [p.id, p]))
  return entries.map((e, i) => {
    const profile = profileById.get(e.studentId)
    return {
      rank: i + 1,
      ...e,
      displayName: profile?.display_name || profile?.name || "Student",
      stream: (profile?.stream_id && streamById.get(profile.stream_id)) || null,
    }
  })
}

export async function getLeaderboard({ streamId, limit = 50 } = {}) {
  const [global, myStream] = await Promise.all([
    aggregatePoints(),
    streamId ? aggregatePoints({ streamId }) : Promise.resolve([]),
  ])
  return {
    global: (await enrichEntries(global)).slice(0, limit),
    myStream: (await enrichEntries(myStream)).slice(0, limit),
  }
}

export async function getStudentRank(studentId, { streamId } = {}) {
  const [global, myStream] = await Promise.all([
    aggregatePoints(),
    streamId ? aggregatePoints({ streamId }) : Promise.resolve([]),
  ])
  const findRank = (list) => {
    const idx = list.findIndex((e) => e.studentId === studentId)
    return idx === -1 ? null : { rank: idx + 1, points: list[idx].points, completedMissions: list[idx].completedMissions, total: list.length }
  }
  return { global: findRank(global), myStream: streamId ? findRank(myStream) : null }
}
