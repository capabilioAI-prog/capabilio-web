/**
 * scripts/backfillArenaSkillReinforcement.mjs
 * ---------------------------------------------------------------------------
 * Arena evidence/proficiency fix (2026-09-04) — Fix 6.
 *
 * Processes every HISTORICAL Domain Role (domain_submissions) and College
 * Stream (college_submissions) submission through the exact same
 * reinforceArenaSubmission() orchestrator the live routes now call
 * (lib/skillStudio/arenaReinforcement.js) — never a second, parallel
 * scoring path — so a submission reinforced by this backfill and one
 * reinforced live are indistinguishable.
 *
 * Both pass AND fail submissions are processed. This matches the live
 * routes' own semantics (a failed attempt is real evidence too — the same
 * pattern Skill Studio quiz mistakes already use) and is NOT a change to
 * pass/fail behavior; see the audit report for the confirmed reasoning.
 *
 * Idempotency: relies entirely on arena_skill_reinforcements' own
 * unique(submission_table, submission_id) constraint, via
 * reinforceArenaSubmission()'s upsert-or-detect-duplicate. Running this
 * script twice, or running it after the live routes have already organically
 * reinforced a newer submission, is always safe — a submission already in
 * the ledger is skipped, never double-counted, regardless of order.
 *
 * Reinforced in per-user CHRONOLOGICAL order (oldest submission first) so
 * the ease-factor/decay progression this backfill produces matches what
 * would have happened if reinforcement had been live from day one.
 *
 * Safety:
 *   - Dry run by default; --execute to write.
 *   - --user=<uuid> restricts to a single user (use this to safely verify
 *     against one real account before running the full backfill).
 *   - A submission with no resolvable skill_graph_node_id on its mission/
 *     experiment is honestly skipped (reported, not silently dropped) — see
 *     Fix 2's audit: most domain_roles/streams still have no granular node
 *     available, and this script never invents one.
 *   - Never touches any user/table this backfill doesn't explicitly read.
 *
 * Modes:
 *   node backend/scripts/backfillArenaSkillReinforcement.mjs                      (dry run, all users)
 *   node backend/scripts/backfillArenaSkillReinforcement.mjs --user=<uuid>        (dry run, one user)
 *   node backend/scripts/backfillArenaSkillReinforcement.mjs --execute --user=<uuid>
 *   node backend/scripts/backfillArenaSkillReinforcement.mjs --execute           (all users, writes)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"
import { reinforceArenaSubmission } from "../server/lib/skillStudio/arenaReinforcement.js"
import { syncSkillGraphFromMemoryStates } from "../server/lib/skillStudio/skillGraphSync.js"

const EXECUTE = process.argv.includes("--execute")
const userArg = process.argv.find(a => a.startsWith("--user="))
const ONLY_USER_ID = userArg ? userArg.split("=")[1] : null

// Same authoritative semester_subjects join as arenaCollegeStream.js's own
// resolveStreamSlugForUnit (added alongside it in this fix) — duplicated
// here (not imported) because that function lives inside a route file not
// meant to export route-internal helpers; kept in sync by comment
// cross-reference rather than a shared module, since this is the only
// second caller and a shared-module extraction can follow later if a third
// one ever appears.
const streamSlugCache = new Map()
async function resolveStreamSlugForUnit(unitId) {
  if (streamSlugCache.has(unitId)) return streamSlugCache.get(unitId)
  const { data: unit } = await supabaseAdmin.from("units").select("subject_id").eq("id", unitId).maybeSingle()
  let slug = null
  if (unit) {
    const { data: link } = await supabaseAdmin.from("semester_subjects").select("semester_id").eq("subject_id", unit.subject_id).limit(1).maybeSingle()
    if (link) {
      const { data: semester } = await supabaseAdmin.from("semesters").select("stream_id").eq("id", link.semester_id).maybeSingle()
      if (semester) {
        const { data: stream } = await supabaseAdmin.from("streams").select("slug").eq("id", semester.stream_id).maybeSingle()
        slug = stream?.slug || null
      }
    }
  }
  streamSlugCache.set(unitId, slug)
  return slug
}

async function fetchAllRows(table, select, filterFn) {
  let query = supabaseAdmin.from(table).select(select)
  if (ONLY_USER_ID) query = query.eq("user_id", ONLY_USER_ID)
  const { data, error } = await query
  if (error) throw error
  return filterFn ? (data || []).filter(filterFn) : (data || [])
}

async function run() {
  const targetHost = (() => {
    try { return new URL(process.env.SUPABASE_URL || "").host || "(SUPABASE_URL not set)" }
    catch { return "(SUPABASE_URL not set or invalid)" }
  })()
  console.log(`[reinforcement-backfill] Target Supabase project: ${targetHost}`)
  console.log(`[reinforcement-backfill] Mode: ${EXECUTE ? "*** EXECUTE — THIS WILL WRITE TO THE ABOVE PROJECT ***" : "DRY RUN (read-only, no writes)"}${ONLY_USER_ID ? ` — restricted to user ${ONLY_USER_ID}` : ""}`)

  const [domainSubs, collegeSubs] = await Promise.all([
    fetchAllRows("domain_submissions", "id, user_id, mission_id, passed, score, elo_delta, created_at"),
    fetchAllRows("college_submissions", "id, user_id, experiment_id, passed, score, elo_delta, submitted_at"),
  ])

  const missionIds = [...new Set(domainSubs.map(s => s.mission_id))]
  const experimentIds = [...new Set(collegeSubs.map(s => s.experiment_id))]

  const [{ data: missions }, { data: experiments }] = await Promise.all([
    missionIds.length
      ? supabaseAdmin.from("domain_missions").select("id, skill_graph_node_id, difficulty, domain_role_id").in("id", missionIds)
      : Promise.resolve({ data: [] }),
    experimentIds.length
      ? supabaseAdmin.from("experiments").select("id, skill_graph_node_id, difficulty, unit_id").in("id", experimentIds)
      : Promise.resolve({ data: [] }),
  ])
  const missionById = new Map((missions || []).map(m => [m.id, m]))
  const experimentById = new Map((experiments || []).map(e => [e.id, e]))

  // Normalize both submission types into one shape, tagged with which table
  // they came from (arena_skill_reinforcements' idempotency key needs both
  // the table name and id), then group by user and sort chronologically.
  const events = [
    ...domainSubs.map(s => ({
      userId: s.user_id, submissionTable: "domain_submissions", submissionId: s.id,
      passed: s.passed, score: s.score, at: s.created_at, mission: missionById.get(s.mission_id),
    })),
    ...collegeSubs.map(s => ({
      userId: s.user_id, submissionTable: "college_submissions", submissionId: s.id,
      passed: s.passed, score: s.score, at: s.submitted_at, experiment: experimentById.get(s.experiment_id),
    })),
  ]

  const byUser = new Map()
  for (const e of events) {
    if (!byUser.has(e.userId)) byUser.set(e.userId, [])
    byUser.get(e.userId).push(e)
  }
  for (const list of byUser.values()) list.sort((a, b) => new Date(a.at) - new Date(b.at))

  let processed = 0, skippedNoSkillNode = 0, skippedAlreadyReinforced = 0
  const errors = []
  const domainKeysTouchedByUser = new Map()

  for (const [userId, userEvents] of byUser.entries()) {
    for (const e of userEvents) {
      const missionOrExperiment = e.mission || e.experiment
      if (!missionOrExperiment) { skippedNoSkillNode++; continue }
      const skillGraphNodeId = missionOrExperiment.skill_graph_node_id
      if (!skillGraphNodeId) { skippedNoSkillNode++; continue }

      let domainKey = null
      if (e.mission) {
        domainKey = e.mission.domain_role_id
      } else if (e.experiment) {
        domainKey = await resolveStreamSlugForUnit(e.experiment.unit_id).catch(() => null)
      }

      if (!EXECUTE) {
        // Dry run: report what WOULD happen without writing anything — does
        // not call reinforceArenaSubmission at all (that function always
        // writes when it runs; the dry-run gate lives here, one level up).
        processed++
        continue
      }

      const result = await reinforceArenaSubmission({
        userId, skillGraphNodeId, domainKey,
        correct: e.passed, score: e.score, difficulty: missionOrExperiment.difficulty,
        submissionTable: e.submissionTable, submissionId: e.submissionId,
        backfilled: true,
      })
      if (!result.ok) { errors.push({ userId, submissionId: e.submissionId, error: result.error }); continue }
      if (result.skipped === "already_reinforced") { skippedAlreadyReinforced++; continue }
      if (result.skipped === "no_skill_graph_node_id") { skippedNoSkillNode++; continue }
      processed++
      if (domainKey) {
        if (!domainKeysTouchedByUser.has(userId)) domainKeysTouchedByUser.set(userId, new Set())
        domainKeysTouchedByUser.get(userId).add(domainKey)
      }
    }
  }

  // One sync per (user, domainKey) actually touched — after ALL of that
  // user's reinforcements are applied, not per-submission, per the "smallest
  // reasonable number of database writes" requirement.
  let syncCount = 0
  if (EXECUTE) {
    for (const [userId, domainKeys] of domainKeysTouchedByUser.entries()) {
      for (const domainKey of domainKeys) {
        const syncResult = await syncSkillGraphFromMemoryStates({ userId, domainKey })
        if (!syncResult.ok) errors.push({ userId, domainKey, error: `sync failed: ${syncResult.error}` })
        else syncCount++
      }
    }
  }

  console.log(`\n[reinforcement-backfill] ${EXECUTE ? "Done." : "Dry run complete — nothing was written."}`)
  console.log(`[reinforcement-backfill] Users seen: ${byUser.size}`)
  console.log(`[reinforcement-backfill] Submissions ${EXECUTE ? "reinforced" : "that would be reinforced"}: ${processed}`)
  console.log(`[reinforcement-backfill] Skipped — no granular/coarse skill tag available on mission/experiment: ${skippedNoSkillNode}`)
  console.log(`[reinforcement-backfill] Skipped — already reinforced previously (idempotent no-op): ${skippedAlreadyReinforced}`)
  console.log(`[reinforcement-backfill] Skill-graph syncs performed: ${syncCount}`)
  console.log(`[reinforcement-backfill] Errors: ${errors.length}`)
  if (errors.length) {
    console.error("[reinforcement-backfill] Error detail:")
    for (const e of errors) console.error(`  - user=${e.userId} submission=${e.submissionId || "(n/a)"}: ${e.error}`)
  }
  if (!EXECUTE) console.log("[reinforcement-backfill] Re-run with --execute to apply (add --user=<uuid> to restrict to one account first).")

  return { processed, skippedNoSkillNode, skippedAlreadyReinforced, syncCount, errors }
}

run().then(({ errors }) => process.exit(errors.length ? 1 : 0)).catch(err => {
  console.error("[reinforcement-backfill] Failed:", err)
  process.exit(1)
})
