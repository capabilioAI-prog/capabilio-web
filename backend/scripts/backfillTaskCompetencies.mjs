/**
 * scripts/backfillTaskCompetencies.mjs
 * ---------------------------------------------------------------------------
 * Arena Capability Engine, Phase 1 — coarse competency backfill.
 *
 * Tags existing `experiments`/`domain_missions` rows with a `skill_graph_node_id`
 * (added by 2026-09-01_arena_capability_schema.sql) so the reinforce() call
 * added in Phase 5 has something to write mastery against, and the Phase 2
 * selection engine has something to rank by.
 *
 * Deliberately coarse: one `competency`-type skill_graph_nodes row per
 * College Stream `stream` (e.g. one node for all of "cse"), and one per
 * Domain Role `domain_role` (e.g. one node for all of "data_engineer")  —
 * not yet a real per-topic taxonomy. Finer-grained tagging (per subject/unit,
 * or a real domain->skill->competency tree with PART_OF edges) is left for a
 * later phase once the selection engine actually needs to discriminate at
 * that grain; building it now would be speculative, unconsumed structure.
 *
 * Idempotent / safe to re-run:
 *   - Node creation uses the SAME upsert-on-(node_type,slug) pattern already
 *     used in production by graphService.js's ensureSkillNode/ensureConceptNode
 *     (backend/server/lib/skillStudio/graphService.js:27-53) — re-running never
 *     creates duplicate nodes.
 *   - Row tagging only ever does
 *       UPDATE ... SET skill_graph_node_id = ? WHERE skill_graph_node_id IS NULL
 *     so a row tagged by a later, finer-grained pass is never clobbered by a
 *     re-run of this coarse pass.
 *
 * Modes:
 *   node backend/scripts/backfillTaskCompetencies.mjs            (dry run — default)
 *   node backend/scripts/backfillTaskCompetencies.mjs --execute  (writes)
 *
 * Dry run performs the exact same reads and the exact same grouping/planning
 * logic as a real run, and prints precisely what would be created/updated,
 * without calling .upsert()/.update() against Supabase.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ SAFETY GATE (Fix 7): this script populates skill_graph_node_id with   │
 * │ COARSE, one-per-stream/one-per-role nodes. Do NOT wire                │
 * │ memoryEngine.reinforce() (Phase 5) to these columns until task-level  │
 * │ competency granularity and weighting have been separately reviewed —  │
 * │ see the matching gate comment in 2026-09-01_arena_capability_schema.sql│
 * │ next to idx_experiments_skill_graph_node. Do not invent fake           │
 * │ fine-grained competencies here just to unblock Phase 5 sooner.        │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Fix 8 (operational safety, applied after independent review):
 *   - Prints the target SUPABASE_URL (never the service key) at startup.
 *   - .in() filters are chunked at 200 ids — moot at current scale (80/162
 *     rows total) but safe if this script is ever reused after the dataset
 *     grows well past a single stream/role's worth of untagged rows.
 *   - The first write in EXECUTE mode specifically detects a Postgres CHECK-
 *     violation (23514) on node_type and fails with a clear, actionable
 *     message instead of a raw stack trace, in case
 *     2026-09-01_arena_capability_schema.sql has not been applied yet.
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"

const EXECUTE = process.argv.includes("--execute")
const NODES = "skill_graph_nodes"
const CHUNK_SIZE = 200

function slugify(name = "") {
  return String(name).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

/** Splits an array into chunks of at most `size` — kept small and local
 *  rather than pulling in a dependency for one function. */
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

let schemaGateChecked = false

/** Mirrors graphService.js's ensureSkillNode exactly, but for node_type
 *  'competency' (only valid once 2026-09-01_arena_capability_schema.sql has
 *  run — its widened check constraint is what allows this value). */
async function ensureCompetencyNode({ slug, label, domainKey }) {
  if (!EXECUTE) return { id: `[dry-run:${slug}]`, slug, label, domain_key: domainKey }
  const { data, error } = await supabaseAdmin
    .from(NODES)
    .upsert(
      { node_type: "competency", slug, label, domain_key: domainKey, metadata: { source: "backfillTaskCompetencies" } },
      { onConflict: "node_type,slug", ignoreDuplicates: false }
    )
    .select()
    .single()
  if (error) {
    // Postgres CHECK-violation code — most likely cause is that
    // 2026-09-01_arena_capability_schema.sql's widened node_type constraint
    // hasn't been applied yet. Fail with a clear, actionable message on the
    // FIRST occurrence rather than a raw Postgres error on every node.
    if (!schemaGateChecked && error.code === "23514") {
      schemaGateChecked = true
      throw new Error(
        "[backfill] BLOCKED: inserting node_type='competency' violated a CHECK constraint. " +
        "This means 2026-09-01_arena_capability_schema.sql (which widens " +
        "skill_graph_nodes_node_type_check to allow 'competency') has not been applied " +
        "to this database yet. Apply that migration first, then re-run this script. " +
        `Original error: ${error.message}`
      )
    }
    throw error
  }
  return data
}

/** Chunked update — `.in("id", ids)` is safe at any size today (80/162 rows
 *  total across ALL streams/roles combined), but this keeps the script safe
 *  to reuse if the dataset grows past a single group's worth of ids. */
async function updateInChunks(table, ids, patch) {
  for (const idChunk of chunk(ids, CHUNK_SIZE)) {
    const { error } = await supabaseAdmin.from(table).update(patch).in("id", idChunk).is("skill_graph_node_id", null)
    if (error) throw error
  }
}

async function run() {
  // Fix 8: identify the target by host only — never print SUPABASE_SERVICE_KEY.
  const targetHost = (() => {
    try { return new URL(process.env.SUPABASE_URL || "").host || "(SUPABASE_URL not set)" }
    catch { return "(SUPABASE_URL not set or invalid)" }
  })()
  console.log(`[backfill] Target Supabase project: ${targetHost}`)
  console.log(`[backfill] Mode: ${EXECUTE ? "*** EXECUTE — THIS WILL WRITE TO THE ABOVE PROJECT ***" : "DRY RUN (read-only, no writes)"}`)

  // ── College Stream: experiments -> unit -> subject -> semester -> stream ──
  const [{ data: streams, error: e1 }, { data: semesters, error: e2 }, { data: subjects, error: e3 },
         { data: units, error: e4 }, { data: experiments, error: e5 }] = await Promise.all([
    supabaseAdmin.from("streams").select("id, slug, name"),
    supabaseAdmin.from("semesters").select("id, stream_id"),
    supabaseAdmin.from("subjects").select("id, semester_id"),
    supabaseAdmin.from("units").select("id, subject_id"),
    supabaseAdmin.from("experiments").select("id, unit_id, skill_graph_node_id").is("skill_graph_node_id", null),
  ])
  for (const e of [e1, e2, e3, e4, e5]) {
    // Fix 8: this is the realistic first failure — even a dry run has to read
    // skill_graph_node_id to find untagged rows, so a schema not yet applied
    // fails HERE, not at the write step. 42703 = Postgres "undefined_column".
    if (e && e.code === "42703") {
      throw new Error(
        "[backfill] BLOCKED: a required column does not exist yet " +
        "(e.g. experiments.skill_graph_node_id). This means " +
        "2026-09-01_arena_capability_schema.sql has not been applied to this " +
        `database yet. Apply that migration first, then re-run this script. Original error: ${e.message}`
      )
    }
    if (e) throw e
  }

  const semesterToStream = new Map((semesters || []).map(s => [s.id, s.stream_id]))
  const subjectToSemester = new Map((subjects || []).map(s => [s.id, s.semester_id]))
  const unitToSubject = new Map((units || []).map(u => [u.id, u.subject_id]))
  const streamById = new Map((streams || []).map(s => [s.id, s]))

  function streamForUnit(unitId) {
    const subjectId = unitToSubject.get(unitId)
    const semesterId = subjectId ? subjectToSemester.get(subjectId) : null
    const streamId = semesterId ? semesterToStream.get(semesterId) : null
    return streamId ? streamById.get(streamId) : null
  }

  const experimentsByStream = new Map() // streamId -> { stream, experimentIds: [] }
  const unresolvedExperiments = []
  for (const exp of experiments || []) {
    const stream = streamForUnit(exp.unit_id)
    if (!stream) { unresolvedExperiments.push(exp.id); continue }
    if (!experimentsByStream.has(stream.id)) experimentsByStream.set(stream.id, { stream, experimentIds: [] })
    experimentsByStream.get(stream.id).experimentIds.push(exp.id)
  }

  // ── Domain Role: domain_missions -> domain_role ─────────────────────────
  const [{ data: roles, error: e6 }, { data: missions, error: e7 }] = await Promise.all([
    supabaseAdmin.from("domain_roles").select("id, label"),
    supabaseAdmin.from("domain_missions").select("id, domain_role_id, skill_graph_node_id").is("skill_graph_node_id", null),
  ])
  for (const e of [e6, e7]) {
    if (e && e.code === "42703") {
      throw new Error(
        "[backfill] BLOCKED: a required column does not exist yet " +
        "(e.g. domain_missions.skill_graph_node_id). This means " +
        "2026-09-01_arena_capability_schema.sql has not been applied to this " +
        `database yet. Apply that migration first, then re-run this script. Original error: ${e.message}`
      )
    }
    if (e) throw e
  }

  const roleById = new Map((roles || []).map(r => [r.id, r]))
  const missionsByRole = new Map() // roleId -> { role, missionIds: [] }
  const unresolvedMissions = []
  for (const m of missions || []) {
    const role = roleById.get(m.domain_role_id)
    if (!role) { unresolvedMissions.push(m.id); continue }
    if (!missionsByRole.has(role.id)) missionsByRole.set(role.id, { role, missionIds: [] })
    missionsByRole.get(role.id).missionIds.push(m.id)
  }

  console.log(`[backfill] College Stream: ${experiments?.length || 0} untagged experiments across ${experimentsByStream.size} streams` +
    (unresolvedExperiments.length ? ` (${unresolvedExperiments.length} could not be traced to a stream — left untagged)` : ""))
  console.log(`[backfill] Domain Role: ${missions?.length || 0} untagged missions across ${missionsByRole.size} roles` +
    (unresolvedMissions.length ? ` (${unresolvedMissions.length} reference an unknown domain_role_id — left untagged)` : ""))

  let nodesCreated = 0, experimentsTagged = 0, missionsTagged = 0

  for (const { stream, experimentIds } of experimentsByStream.values()) {
    const slug = `arena-college-stream-${stream.slug}`
    const node = await ensureCompetencyNode({ slug, label: `${stream.name} (College Stream)`, domainKey: stream.slug })
    nodesCreated++
    console.log(`[backfill] ${EXECUTE ? "upserted" : "would upsert"} competency node ${slug} -> id=${node.id}, tagging ${experimentIds.length} experiments`)
    if (EXECUTE) await updateInChunks("experiments", experimentIds, { skill_graph_node_id: node.id })
    experimentsTagged += experimentIds.length
  }

  for (const { role, missionIds } of missionsByRole.values()) {
    const slug = `arena-domain-role-${role.id}`
    const node = await ensureCompetencyNode({ slug, label: `${role.label} (Domain Role)`, domainKey: role.id })
    nodesCreated++
    console.log(`[backfill] ${EXECUTE ? "upserted" : "would upsert"} competency node ${slug} -> id=${node.id}, tagging ${missionIds.length} missions`)
    if (EXECUTE) await updateInChunks("domain_missions", missionIds, { skill_graph_node_id: node.id })
    missionsTagged += missionIds.length
  }

  console.log(`[backfill] ${EXECUTE ? "Done." : "Dry run complete — nothing was written."} ` +
    `Competency nodes: ${nodesCreated}, experiments tagged: ${experimentsTagged}, missions tagged: ${missionsTagged}.`)
  if (!EXECUTE) console.log("[backfill] Re-run with --execute to apply.")
}

run().then(() => process.exit(0)).catch(err => {
  console.error("[backfill] Failed:", err)
  process.exit(1)
})
