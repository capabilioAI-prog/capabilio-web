/**
 * arena/leaderboard.js — server-computed ranking from persisted, verified
 * mission results only (spec §47). No client-submitted points ever reach
 * this aggregation — points_awarded is written exclusively by
 * submission.js after real verification.
 */
import { supabaseAdmin } from "../supabase.js"

async function aggregatePoints({ streamId } = {}) {
  let query = supabaseAdmin
    .from("arena_weekly_missions")
    .select("points_awarded, status, arena_weekly_allocations!inner(student_id, stream_id)")
    .eq("status", "completed")
  if (streamId) query = query.eq("arena_weekly_allocations.stream_id", streamId)

  const { data, error } = await query
  if (error) throw error

  const byStudent = new Map()
  for (const row of data || []) {
    const studentId = row.arena_weekly_allocations.student_id
    const entry = byStudent.get(studentId) || { studentId, points: 0, completedMissions: 0 }
    entry.points += row.points_awarded || 0
    entry.completedMissions += 1
    byStudent.set(studentId, entry)
  }
  return [...byStudent.values()].sort((a, b) => b.points - a.points)
}

async function attachDisplayNames(entries) {
  if (entries.length === 0) return entries
  const { data: profiles } = await supabaseAdmin
    .from("profiles").select("id, display_name, name").in("id", entries.map((e) => e.studentId))
  const nameById = new Map((profiles || []).map((p) => [p.id, p.display_name || p.name || "Student"]))
  return entries.map((e, i) => ({ rank: i + 1, ...e, displayName: nameById.get(e.studentId) || "Student" }))
}

export async function getLeaderboard({ streamId, limit = 50 } = {}) {
  const [global, myStream] = await Promise.all([
    aggregatePoints(),
    streamId ? aggregatePoints({ streamId }) : Promise.resolve([]),
  ])
  return {
    global: (await attachDisplayNames(global)).slice(0, limit),
    myStream: (await attachDisplayNames(myStream)).slice(0, limit),
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
