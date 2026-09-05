/**
 * arena/spin.js — the one authoritative place a weekly allocation is ever
 * created (spec §8, §51, §53). The wheel animation is purely client-side
 * decoration; this is the only source of truth for the spin result.
 *
 * Atomicity: UNIQUE(student_id, week_start) on arena_weekly_allocations
 * (2026-09-05 migration) is what actually guarantees "one spin per student
 * per week" under concurrency — two simultaneous calls both attempt the
 * same INSERT, Postgres accepts exactly one, and the loser here simply
 * re-reads and returns the winner's row rather than erroring. No advisory
 * lock needed for this shape of race.
 */
import { logger } from "../logger.js"
import { supabaseAdmin } from "../supabase.js"
import { getCurrentArenaWeek } from "./week.js"
import { getWheelOutcomes } from "./config.js"
import { planWeeklyMissions } from "./planner.js"

const UNIQUE_VIOLATION = "23505"

async function getAllocationWithMissions(allocationId) {
  const { data: missions, error } = await supabaseAdmin
    .from("arena_weekly_missions")
    .select("id, challenge_id, position, status, score, points_awarded, verification_status, arena_challenges(title, challenge_type, skill, competency_area, difficulty, estimated_minutes, points, workstation_type)")
    .eq("allocation_id", allocationId)
    .order("position", { ascending: true })
  if (error) throw error
  return missions || []
}

async function loadExistingAllocation(studentId, weekStart) {
  const { data, error } = await supabaseAdmin
    .from("arena_weekly_allocations").select("id, stream_id, spin_result, spin_at, week_start")
    .eq("student_id", studentId).eq("week_start", weekStart).maybeSingle()
  if (error) throw error
  return data
}

/**
 * @param {{ studentId: string, streamId: string, streamSlug: string }} params
 * @returns {Promise<{ weekStart, weekEnd, streamId, spinResult, allocationId, missions, reused: boolean }>}
 */
export async function spinOrGetAllocation({ studentId, streamId, streamSlug }) {
  const { weekStart, weekEnd } = getCurrentArenaWeek()

  const existing = await loadExistingAllocation(studentId, weekStart)
  if (existing) {
    logger.info("[arena.spin] allocation already exists — returning existing (no reroll)", { studentId, weekStart })
    const missions = await getAllocationWithMissions(existing.id)
    return { weekStart, weekEnd, streamId: existing.stream_id, spinResult: existing.spin_result, allocationId: existing.id, missions, reused: true }
  }

  const wheelOutcomes = await getWheelOutcomes()
  const spinResult = wheelOutcomes[Math.floor(Math.random() * wheelOutcomes.length)]

  logger.info("[arena.spin] attempting new allocation", { studentId, weekStart, streamSlug, spinResult })

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from("arena_weekly_allocations")
    .insert({ student_id: studentId, week_start: weekStart, stream_id: streamId, spin_result: spinResult })
    .select("id, stream_id, spin_result, spin_at, week_start")
    .single()

  if (insertErr) {
    if (insertErr.code === UNIQUE_VIOLATION) {
      // Lost the race — someone else's concurrent request already created
      // this week's allocation. Return theirs; never create a second one.
      logger.info("[arena.spin] lost allocation race — returning the winning allocation", { studentId, weekStart })
      const winner = await loadExistingAllocation(studentId, weekStart)
      const missions = await getAllocationWithMissions(winner.id)
      return { weekStart, weekEnd, streamId: winner.stream_id, spinResult: winner.spin_result, allocationId: winner.id, missions, reused: true }
    }
    throw insertErr
  }

  const plan = await planWeeklyMissions({ streamId, streamSlug, count: spinResult })
  if (!plan.ok) {
    // Fail safely (spec §42, §56): never allocate generic/invalid content
    // just to reach the count. Roll back the allocation row itself so a
    // retry can cleanly attempt the whole thing again next request rather
    // than being stuck with an allocation that has fewer missions than its
    // own spin_result promised.
    logger.error("[arena.spin] planning failed — rolling back allocation", { studentId, weekStart, reason: plan.reason, allocated: plan.allocated, needed: plan.needed })
    await supabaseAdmin.from("arena_weekly_allocations").delete().eq("id", inserted.id)
    const err = new Error(`Could not assemble ${spinResult} valid challenges for stream "${streamSlug}" (got ${plan.allocated}).`)
    err.code = "planning_failed"
    throw err
  }

  const missionRows = plan.challenges.map((challenge, i) => ({
    allocation_id: inserted.id, challenge_id: challenge.id, position: i + 1,
  }))
  const { error: missionsErr } = await supabaseAdmin.from("arena_weekly_missions").insert(missionRows)
  if (missionsErr) throw missionsErr

  logger.info("[arena.spin] allocation created", { studentId, weekStart, streamSlug, spinResult, allocationId: inserted.id })

  const missions = await getAllocationWithMissions(inserted.id)
  return { weekStart, weekEnd, streamId: inserted.stream_id, spinResult: inserted.spin_result, allocationId: inserted.id, missions, reused: false }
}

export async function getCurrentAllocation(studentId) {
  const { weekStart, weekEnd } = getCurrentArenaWeek()
  const existing = await loadExistingAllocation(studentId, weekStart)
  if (!existing) return { weekStart, weekEnd, allocation: null }
  const missions = await getAllocationWithMissions(existing.id)
  return { weekStart, weekEnd, allocation: { allocationId: existing.id, streamId: existing.stream_id, spinResult: existing.spin_result, spinAt: existing.spin_at, missions } }
}
