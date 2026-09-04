/**
 * scripts/backfillSkillCompetencyGranularity.mjs
 * ---------------------------------------------------------------------------
 * Arena evidence/proficiency fix (2026-09-04) — Fix 2.
 *
 * Corrects the ONLY 4 currently-seeded Domain Role roles that have a real,
 * pre-existing granular skill_graph_nodes taxonomy available (data, dba,
 * frontend, fullstack — verified live: these are the only domain_keys with
 * node_type='skill' rows; every other domain_role has ONLY the coarse
 * per-role competency node and no granular alternative exists — those are
 * deliberately left untouched, not "fixed", because there is nothing more
 * granular to correct them to. No new taxonomy is invented anywhere in this
 * script — every target node below already existed before this fix.
 *
 * The mapping below was derived by reading each role's actual mission
 * content (not guessed):
 *   data       (sql_runner)      -> "SQL (Advanced)"    (data analysis SQL:
 *                                    "Orders from Mumbai", "Revenue by Product")
 *   dba        (sql_runner)      -> "SQL (Expert)"       (query-log/perf tasks:
 *                                    "Slow-Query Log...", "Count of successful...")
 *   frontend   (frontend_runner) -> "CSS/Tailwind"       (all 3 missions are
 *                                    responsive-layout CSS bugs, not JS logic)
 *   fullstack  (node_runner)     -> "Node.js / Express"  (backend bug-fix
 *                                    missions: cache bug, pagination helper)
 *
 * Safety (mirrors backfillTaskCompetencies.mjs's exact conventions):
 *   - Dry run by default; --execute to write.
 *   - ONLY retags a domain_missions row that is CURRENTLY pointing at the
 *     exact coarse node the original Phase 1 backfill created for that role
 *     (slug `arena-domain-role-<roleId>`) — a row already tagged to
 *     something else (a manual correction, a future finer pass) is left
 *     completely alone. This is checked by node id, not just node_type, so
 *     it can never touch a row it doesn't recognize.
 *   - Never creates a new skill_graph_nodes row — only looks up existing
 *     ones by slug and fails loudly (per role) if a mapped slug isn't found,
 *     rather than silently falling back to inventing one.
 *   - Idempotent: after a successful --execute run, no mission matches the
 *     "currently on the coarse node" filter anymore, so re-running finds
 *     nothing to do (prints 0 retagged) rather than erroring.
 *   - Prints the target Supabase host (never the service key), and a full
 *     before/after count per role.
 *
 * Modes:
 *   node backend/scripts/backfillSkillCompetencyGranularity.mjs            (dry run)
 *   node backend/scripts/backfillSkillCompetencyGranularity.mjs --execute  (writes)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"

const EXECUTE = process.argv.includes("--execute")

// role id -> { coarseSlug, targetSlug } — coarseSlug matches exactly what
// backfillTaskCompetencies.mjs generates (`arena-domain-role-${role.id}`);
// targetSlug is an EXISTING skill_graph_nodes row, verified live before
// writing this script (see the file header for the exact evidence).
const ROLE_TARGET_SLUG = {
  data: "sql-advanced",
  dba: "sql-expert",
  frontend: "csstailwind",
  fullstack: "nodejs--express",
}

async function run() {
  const targetHost = (() => {
    try { return new URL(process.env.SUPABASE_URL || "").host || "(SUPABASE_URL not set)" }
    catch { return "(SUPABASE_URL not set or invalid)" }
  })()
  console.log(`[granularity-backfill] Target Supabase project: ${targetHost}`)
  console.log(`[granularity-backfill] Mode: ${EXECUTE ? "*** EXECUTE — THIS WILL WRITE TO THE ABOVE PROJECT ***" : "DRY RUN (read-only, no writes)"}`)

  let totalRetagged = 0
  let totalSkippedAlreadyCorrect = 0
  const errors = []

  for (const [roleId, targetSlug] of Object.entries(ROLE_TARGET_SLUG)) {
    const coarseSlug = `arena-domain-role-${roleId}`

    const { data: coarseNode, error: coarseErr } = await supabaseAdmin
      .from("skill_graph_nodes").select("id, slug, label").eq("slug", coarseSlug).maybeSingle()
    if (coarseErr) { errors.push({ roleId, error: coarseErr.message }); continue }
    if (!coarseNode) {
      console.log(`[granularity-backfill] ${roleId}: no coarse node found (slug=${coarseSlug}) — nothing to retag, skipping.`)
      continue
    }

    const { data: targetNode, error: targetErr } = await supabaseAdmin
      .from("skill_graph_nodes").select("id, slug, label, node_type").eq("slug", targetSlug).maybeSingle()
    if (targetErr) { errors.push({ roleId, error: targetErr.message }); continue }
    if (!targetNode) {
      // Fail loudly per-role rather than silently skip — a missing expected
      // node means this script's own assumptions are stale and need review,
      // not a quiet no-op.
      errors.push({ roleId, error: `expected target node slug="${targetSlug}" does not exist — refusing to invent one` })
      continue
    }
    if (targetNode.node_type !== "skill") {
      errors.push({ roleId, error: `target node slug="${targetSlug}" is node_type="${targetNode.node_type}", expected "skill" — refusing to retag onto a non-granular node` })
      continue
    }

    // ONLY rows currently on the exact coarse node for this role — never a
    // broader "any untagged/any coarse" filter, so a manually-tagged or
    // already-corrected row is structurally impossible to touch here.
    const { data: missionsOnCoarse, error: missionsErr } = await supabaseAdmin
      .from("domain_missions").select("id, title, panel_type")
      .eq("domain_role_id", roleId).eq("skill_graph_node_id", coarseNode.id)
    if (missionsErr) { errors.push({ roleId, error: missionsErr.message }); continue }

    if (!missionsOnCoarse?.length) {
      console.log(`[granularity-backfill] ${roleId}: 0 missions currently on the coarse node (already retagged, or none exist) — nothing to do.`)
      totalSkippedAlreadyCorrect++
      continue
    }

    console.log(`[granularity-backfill] ${roleId}: ${EXECUTE ? "retagging" : "would retag"} ${missionsOnCoarse.length} mission(s) ` +
      `from "${coarseNode.label}" (${coarseNode.id}) to "${targetNode.label}" (${targetNode.id})`)
    for (const m of missionsOnCoarse) console.log(`  - ${m.title} (panel_type=${m.panel_type})`)

    if (EXECUTE) {
      const ids = missionsOnCoarse.map(m => m.id)
      // Re-scoped to the exact same (role, coarse-node) pair at write time —
      // a concurrent write between the read above and this update could only
      // ever move a row OFF the coarse node, never onto it, so this can't
      // clobber a race; worst case it retags 0 rows if one was already moved.
      const { error: updateErr } = await supabaseAdmin
        .from("domain_missions").update({ skill_graph_node_id: targetNode.id })
        .in("id", ids).eq("skill_graph_node_id", coarseNode.id)
      if (updateErr) { errors.push({ roleId, error: updateErr.message }); continue }
    }
    totalRetagged += missionsOnCoarse.length
  }

  console.log(`\n[granularity-backfill] ${EXECUTE ? "Done." : "Dry run complete — nothing was written."} ` +
    `Missions ${EXECUTE ? "retagged" : "that would be retagged"}: ${totalRetagged}. Roles already correct/untouched: ${totalSkippedAlreadyCorrect}. Errors: ${errors.length}.`)
  if (errors.length) {
    console.error("[granularity-backfill] Errors encountered:")
    for (const e of errors) console.error(`  - ${e.roleId}: ${e.error}`)
  }
  if (!EXECUTE) console.log("[granularity-backfill] Re-run with --execute to apply.")

  return { totalRetagged, totalSkippedAlreadyCorrect, errors }
}

run().then(({ errors }) => process.exit(errors.length ? 1 : 0)).catch(err => {
  console.error("[granularity-backfill] Failed:", err)
  process.exit(1)
})
