/**
 * scripts/backfillHistoricalTaskProvenance.mjs
 * ---------------------------------------------------------------------------
 * Arena Capability Engine, Phase 1 — historical task provenance backfill.
 *
 * Every pre-existing `experiments`/`domain_missions` row predates
 * task_generation_events (added by 2026-09-01_arena_capability_schema.sql)
 * and so has no provenance record at all. This script gives each of them
 * exactly one `outcome='historical_backfill'` row, so the new provenance model
 * has a complete, honest picture of "how did this task come to exist"
 * instead of a hole for everything created before 2026-09-01.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ DELIBERATE SCOPE LIMIT — read before extending this script:            │
 * │                                                                          │
 * │ This backfills TASK provenance (task_generation_events), one row per   │
 * │ pre-existing task. It does NOT backfill per-STUDENT capability state    │
 * │ (memory_states) from arena_history/college_submissions/domain_          │
 * │ submissions, and does not call memoryEngine.reinforce() at all.         │
 * │                                                                          │
 * │ Why: reconstructing "why did student X get task Y on date Z" for       │
 * │ historical activity would be dishonest — there was no capability       │
 * │ engine driving selection back then (it was sequential/first-unsolved), │
 * │ so any rationale we invented now would be fabricated, not recovered.   │
 * │ Separately, feeding historical results into memory_states would mean   │
 * │ reinforcing mastery against the SAME coarse per-stream/per-role        │
 * │ competency nodes backfillTaskCompetencies.mjs creates — exactly what   │
 * │ the safety gate in that script and in                                  │
 * │ 2026-09-01_arena_capability_schema.sql (search "FIX 7") says not to do │
 * │ until competency granularity/weighting is reviewed. This script does   │
 * │ not touch memory_states and does not lift that gate.                   │
 * │                                                                          │
 * │ If per-student historical capability backfill is wanted later, it is a │
 * │ separate, explicit decision — not a natural extension of this file.    │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Idempotent / safe to re-run: every inserted row's selection_rationale
 * carries {"backfill": "backfillHistoricalTaskProvenance"}; before inserting
 * for a given task, the script checks whether a row with that exact marker
 * already exists for that task_id and skips it if so. Re-running never
 * creates duplicate backfill rows. (task_generation_events intentionally has
 * no unique constraint on (task_type, task_id) — in normal, non-backfill
 * operation one task legitimately gets a new provenance row every time it's
 * served to a different student, per the approved Fig. 3 flow — so
 * uniqueness has to be enforced by this script's own marker check, not by
 * the schema.)
 *
 * Modes:
 *   node backend/scripts/backfillHistoricalTaskProvenance.mjs            (dry run — default)
 *   node backend/scripts/backfillHistoricalTaskProvenance.mjs --execute  (writes)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"

const EXECUTE = process.argv.includes("--execute")
const BACKFILL_MARKER = "backfillHistoricalTaskProvenance"
const CHUNK_SIZE = 200

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// 42P01/42703 = raw Postgres "undefined_table"/"undefined_column".
// PGRST205 = PostgREST's own "table not found in schema cache" (what
// supabase-js actually surfaces for a missing table, confirmed empirically —
// raw Postgres codes only show up for column-level errors on a table
// PostgREST *does* know about).
const SCHEMA_GATE_CODES = new Set(["42P01", "42703", "PGRST205"])

function explainSchemaGateError(err, context) {
  if (err && SCHEMA_GATE_CODES.has(err.code)) {
    return new Error(
      `[backfill] BLOCKED (${context}): required table/column does not exist yet. This means ` +
      "2026-09-01_arena_capability_schema.sql has not been applied to this database yet. " +
      `Apply that migration first, then re-run this script. Original error: ${err.message}`
    )
  }
  return err
}

/** Returns the set of task_ids (for the given task_type) that already have a
 *  backfill-marked provenance row, so re-runs never duplicate. */
async function alreadyBackfilled(taskType, taskIds) {
  const found = new Set()
  for (const idChunk of chunk(taskIds, CHUNK_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from("task_generation_events")
      .select("task_id, selection_rationale")
      .eq("task_type", taskType)
      .in("task_id", idChunk)
    if (error) throw explainSchemaGateError(error, "reading task_generation_events")
    for (const row of data || []) {
      if (row.selection_rationale?.backfill === BACKFILL_MARKER) found.add(row.task_id)
    }
  }
  return found
}

async function insertProvenanceRows(rows) {
  if (!EXECUTE) return
  for (const rowChunk of chunk(rows, CHUNK_SIZE)) {
    const { error } = await supabaseAdmin.from("task_generation_events").insert(rowChunk)
    if (error) throw explainSchemaGateError(error, "inserting task_generation_events")
  }
}

async function run() {
  const targetHost = (() => {
    try { return new URL(process.env.SUPABASE_URL || "").host || "(SUPABASE_URL not set)" }
    catch { return "(SUPABASE_URL not set or invalid)" }
  })()
  console.log(`[backfill] Target Supabase project: ${targetHost}`)
  console.log(`[backfill] Mode: ${EXECUTE ? "*** EXECUTE — THIS WILL WRITE TO THE ABOVE PROJECT ***" : "DRY RUN (read-only, no writes)"}`)

  const { data: experiments, error: expErr } = await supabaseAdmin
    .from("experiments").select("id, created_at")
  if (expErr) throw explainSchemaGateError(expErr, "reading experiments")

  const { data: missions, error: missErr } = await supabaseAdmin
    .from("domain_missions").select("id, created_at, source")
  if (missErr) throw explainSchemaGateError(missErr, "reading domain_missions")

  const expIds = (experiments || []).map(e => e.id)
  const missionIds = (missions || []).map(m => m.id)

  const [expDone, missionDone] = await Promise.all([
    alreadyBackfilled("experiment", expIds),
    alreadyBackfilled("domain_mission", missionIds),
  ])

  const expRows = (experiments || [])
    .filter(e => !expDone.has(e.id))
    .map(e => ({
      task_type: "experiment",
      task_id: e.id,
      outcome: "historical_backfill",
      generated_at: e.created_at || new Date().toISOString(),
      selection_rationale: {
        backfill: BACKFILL_MARKER,
        note: "Pre-existing seeded College Stream task, created before the Arena Capability Engine. Actual historical selection method (sequential/first-unsolved) predates this provenance model and is not reconstructed.",
      },
    }))

  const missionRows = (missions || [])
    .filter(m => !missionDone.has(m.id))
    .map(m => ({
      task_type: "domain_mission",
      task_id: m.id,
      outcome: "historical_backfill",
      generated_at: m.created_at || new Date().toISOString(),
      selection_rationale: {
        backfill: BACKFILL_MARKER,
        note: `Pre-existing Domain Role mission (source='${m.source}'), created before the Arena Capability Engine. Actual historical selection method predates this provenance model and is not reconstructed.`,
      },
    }))

  console.log(`[backfill] experiments: ${experiments?.length || 0} total, ${expDone.size} already backfilled, ${expRows.length} ${EXECUTE ? "to insert" : "would insert"}`)
  console.log(`[backfill] domain_missions: ${missions?.length || 0} total, ${missionDone.size} already backfilled, ${missionRows.length} ${EXECUTE ? "to insert" : "would insert"}`)

  await insertProvenanceRows(expRows)
  await insertProvenanceRows(missionRows)

  console.log(`[backfill] ${EXECUTE ? "Done." : "Dry run complete — nothing was written."} ` +
    `Provenance rows ${EXECUTE ? "inserted" : "that would be inserted"}: ${expRows.length + missionRows.length}. ` +
    `student_id left NULL on every row (see scope-limit note at top of file — no per-student history is reconstructed).`)
  if (!EXECUTE) console.log("[backfill] Re-run with --execute to apply.")
}

run().then(() => process.exit(0)).catch(err => {
  console.error("[backfill] Failed:", err)
  process.exit(1)
})
