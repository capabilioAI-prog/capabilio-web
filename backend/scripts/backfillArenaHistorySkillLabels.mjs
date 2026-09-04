/**
 * scripts/backfillArenaHistorySkillLabels.mjs
 * ---------------------------------------------------------------------------
 * Arena learning-loop audit follow-up (2026-09-04) — Phase 3.
 *
 * PR #23 added skill_name/skill_category to every NEW arena_history insert
 * (arenaDomainRole.js/arenaCollegeStream.js's recordArenaHistory), sourced
 * from the mission/experiment's tagged skill_graph_node_id. It never touched
 * rows written BEFORE that change — every arena_history row that predates
 * PR #23 still has skill_name/skill_category = null, even though the
 * underlying task is fully, correctly tagged today (Fix 2's granular
 * retagging, or the original coarse per-role tagging). This script closes
 * that gap for existing rows only — it does not change how any NEW
 * submission is recorded (that's already correct, live, untouched).
 *
 * Scope, precisely (confirmed live before writing this script):
 *   - 29 arena_history rows currently have skill_name IS NULL (25 type=domain,
 *     4 type=academic). Every single one predates PR #23's merge (2026-09-04
 *     ~14:54 UTC) — there are zero post-PR#23 rows with a missing label,
 *     confirmed by completed_at inspection, so this is purely a historical
 *     gap, not a live regression.
 *   - 24 of those 29 (20 domain + 4 academic) resolve to a real, valid
 *     skill_graph_node_id via their task_id -> domain_missions/experiments
 *     row -> skill_graph_nodes label. These are updated.
 *   - 5 domain rows do NOT resolve (their task_id no longer matches any
 *     domain_missions row at all — the mission was removed or belonged to an
 *     earlier content system). These are left null, honestly — the skill
 *     name is NEVER inferred from the row's own title/prompt text, per the
 *     explicit requirement. A future, separate initiative would need to
 *     decide what (if anything) to do with those 5; out of scope here.
 *
 * Updates ONLY skill_name and skill_category. Never touches score, elo_delta,
 * completed_at, visible_in_portfolio/visible_in_aura, memory_states,
 * profiles.skill_graph, domain_submissions/college_submissions, or any row
 * whose skill_name is already non-null (idempotent by construction — the
 * WHERE clause itself excludes already-filled rows, so a second run finds
 * nothing left to do and updates zero rows).
 *
 * Safety (mirrors this codebase's established backfill conventions —
 * backfillSkillCompetencyGranularity.mjs, backfillArenaSkillReinforcement.mjs):
 *   - Dry run by default; --execute to write.
 *   - Prints the exact candidate set (title, current NULL, proposed new
 *     values) before any write, and the exact skipped set with the reason.
 *   - Chunked by id for the actual UPDATE, safe at any scale.
 *
 * Modes:
 *   node backend/scripts/backfillArenaHistorySkillLabels.mjs            (dry run)
 *   node backend/scripts/backfillArenaHistorySkillLabels.mjs --execute  (writes)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"

const EXECUTE = process.argv.includes("--execute")

async function run() {
  const targetHost = (() => {
    try { return new URL(process.env.SUPABASE_URL || "").host || "(SUPABASE_URL not set)" }
    catch { return "(SUPABASE_URL not set or invalid)" }
  })()
  console.log(`[arena-history-label-backfill] Target Supabase project: ${targetHost}`)
  console.log(`[arena-history-label-backfill] Mode: ${EXECUTE ? "*** EXECUTE — THIS WILL WRITE TO THE ABOVE PROJECT ***" : "DRY RUN (read-only, no writes)"}`)

  const { data: missingRows, error: missingErr } = await supabaseAdmin
    .from("arena_history")
    .select("id, type, title, task_id, completed_at")
    .is("skill_name", null)
    .in("type", ["domain", "academic"])
  if (missingErr) throw missingErr

  const domainIds = missingRows.filter(r => r.type === "domain").map(r => r.task_id)
  const academicIds = missingRows.filter(r => r.type === "academic").map(r => r.task_id)

  const [{ data: missions }, { data: experiments }] = await Promise.all([
    domainIds.length
      ? supabaseAdmin.from("domain_missions").select("id, panel_type, skill_graph_node_id").in("id", domainIds)
      : Promise.resolve({ data: [] }),
    academicIds.length
      ? supabaseAdmin.from("experiments").select("id, category, skill_graph_node_id").in("id", academicIds)
      : Promise.resolve({ data: [] }),
  ])
  const missionById = new Map((missions || []).map(m => [m.id, m]))
  const experimentById = new Map((experiments || []).map(e => [e.id, e]))

  const nodeIds = [
    ...new Set([...(missions || []), ...(experiments || [])].map(m => m.skill_graph_node_id).filter(Boolean)),
  ]
  const { data: nodes, error: nodesErr } = nodeIds.length
    ? await supabaseAdmin.from("skill_graph_nodes").select("id, label").in("id", nodeIds)
    : { data: [] }
  if (nodesErr) throw nodesErr
  const labelByNodeId = new Map((nodes || []).map(n => [n.id, n.label]))

  const updates = []
  const skipped = []
  for (const row of missingRows) {
    const source = row.type === "domain" ? missionById.get(row.task_id) : experimentById.get(row.task_id)
    if (!source || !source.skill_graph_node_id) {
      skipped.push({ ...row, reason: !source ? "task no longer exists (mission/experiment row not found)" : "task has no skill_graph_node_id tagged" })
      continue
    }
    const label = labelByNodeId.get(source.skill_graph_node_id)
    if (!label) {
      skipped.push({ ...row, reason: "tagged skill_graph_node_id does not resolve to a real skill_graph_nodes row" })
      continue
    }
    updates.push({
      id: row.id,
      title: row.title,
      completed_at: row.completed_at,
      skill_name: label,
      skill_category: row.type === "domain" ? (source.panel_type || null) : (source.category || null),
    })
  }

  console.log(`\n[arena-history-label-backfill] ${missingRows.length} row(s) currently missing skill_name (type domain/academic).`)
  console.log(`[arena-history-label-backfill] ${updates.length} row(s) ${EXECUTE ? "will be updated" : "would be updated"}:`)
  for (const u of updates) console.log(`  - [${u.completed_at}] "${u.title}" -> skill_name="${u.skill_name}", skill_category="${u.skill_category}"`)

  console.log(`\n[arena-history-label-backfill] ${skipped.length} row(s) skipped (left null, honestly — never inferred from title/prompt):`)
  for (const s of skipped) console.log(`  - [${s.completed_at}] "${s.title}" (task_id=${s.task_id}) — ${s.reason}`)

  if (EXECUTE) {
    for (const u of updates) {
      // Scoped by id AND skill_name IS NULL at write time too — a concurrent
      // second run (or a real new submission that somehow reused this id,
      // which cannot happen — ids are generated, never reused) can only ever
      // turn this into a no-op, never a double-write or a clobber of a
      // legitimately-set value.
      const { error: updateErr } = await supabaseAdmin
        .from("arena_history")
        .update({ skill_name: u.skill_name, skill_category: u.skill_category })
        .eq("id", u.id)
        .is("skill_name", null)
      if (updateErr) throw updateErr
    }
  }

  console.log(`\n[arena-history-label-backfill] ${EXECUTE ? "Done." : "Dry run complete — nothing was written."} Updated: ${EXECUTE ? updates.length : 0}${EXECUTE ? "" : ` (would update ${updates.length})`}. Skipped: ${skipped.length}.`)
  if (!EXECUTE) console.log("[arena-history-label-backfill] Re-run with --execute to apply.")

  return { updated: updates.length, skipped: skipped.length }
}

run().then(() => process.exit(0)).catch(err => {
  console.error("[arena-history-label-backfill] Failed:", err)
  process.exit(1)
})
