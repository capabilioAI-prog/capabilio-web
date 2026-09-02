/**
 * taskHistory.js — Arena Capability Engine, Phase 2.
 * ---------------------------------------------------------------------------
 * Explicit, per-state duplicate-prevention policy. Do not extend this file's
 * exclusion set without updating the table below — the whole point of this
 * module is that the policy is a visible decision, not an implicit side
 * effect of whatever query happens to be easy to write.
 *
 * ┌───────────────────┬───────────────────────────────────┬───────────────────────────────────────────┐
 * │ State              │ Data source                       │ Policy                                     │
 * ├───────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
 * │ passed             │ *_submissions.passed = true       │ Permanently excluded                       │
 * │ failed, unresolved │ a row exists, no later pass        │ NOT excluded — remains the "current" task, │
 * │                    │                                    │ matching arenaCollegeStream.js/             │
 * │                    │                                    │ arenaDomainRole.js's existing "first        │
 * │                    │                                    │ unpassed" convention (student finishes      │
 * │                    │                                    │ what they started, not skipped forward)     │
 * │ submitted (any)    │ a row exists in *_submissions      │ Tracked as evidence, not exclusion — same   │
 * │                    │                                    │ row set as above, read for a different      │
 * │                    │                                    │ purpose elsewhere (profileService)          │
 * │ abandoned/skipped  │ NONE — no session/attempt-start    │ NOT implementable today. Stated explicitly  │
 * │                    │ tracking exists in the live schema │ rather than silently assumed away.          │
 * │ generated, never   │ task_generation_events.outcome=    │ Not producible in Phase 2 (no generation    │
 * │ started            │ 'generated', no submission row     │ yet). Seam left for Phase 3, unused today.  │
 * │ historical/        │ task_generation_events.outcome=    │ NOT consulted for per-student exclusion at  │
 * │ backfilled         │ 'historical_backfill', student_id  │ all — it's task-origin provenance, not a    │
 * │                    │ IS NULL                            │ record of any specific student's exposure.  │
 * └───────────────────┴───────────────────────────────────┴───────────────────────────────────────────┘
 */
import { supabaseAdmin } from "../supabase.js"

export const defaultDeps = { supabaseAdmin }

const SUBMISSION_TABLE = { college_stream: "college_submissions", domain_role: "domain_submissions" }
const TASK_ID_COLUMN = { college_stream: "experiment_id", domain_role: "mission_id" }

/**
 * @param {{ userId: string, domain: "college_stream"|"domain_role", taskIds: string[] }} args
 * @returns {Promise<{ passedIds: Set<string> }>}
 */
export async function getExclusions({ userId, domain, taskIds }, deps = defaultDeps) {
  const table = SUBMISSION_TABLE[domain]
  const idColumn = TASK_ID_COLUMN[domain]
  if (!table) throw new Error(`taskHistory.getExclusions: unknown domain "${domain}"`)
  if (!taskIds.length) return { passedIds: new Set() }

  const { data: passed, error } = await deps.supabaseAdmin
    .from(table)
    .select(idColumn)
    .eq("user_id", userId)
    .eq("passed", true)
    .in(idColumn, taskIds)
  if (error) throw error

  return { passedIds: new Set((passed || []).map((r) => r[idColumn])) }
}
