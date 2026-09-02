/**
 * scripts/backfillProofObjects.js
 * ---------------------------------------------------------------------------
 * One-off migration script: converts existing arena_history rows into
 * proof_objects rows, so the redesigned Portfolio's Engineering Proofs tab
 * has real data to render for existing users instead of an empty state.
 * Safe to re-run — insertMany() upserts with ignoreDuplicates against the
 * UNIQUE(source, source_ref) constraint, so already-backfilled rows are
 * skipped, not duplicated.
 *
 * DELIBERATELY DOES NOT READ arena_submissions (2026-07-19 fix): every row
 * in that table was found to duplicate an arena_history row for the same
 * user+title, submitted seconds apart by the old V1 app writing the same
 * action to both tables. Worse, arena_submissions.domain is the literal
 * string 'swe' for every row regardless of actual subject matter (it isn't
 * a real domain field), which produced Proof Objects mislabeled
 * "Software Engineering" for ECE/DevOps/Data challenges — surfaced by a
 * user report on a live embedded-engineering portfolio showing a bogus
 * "Software Engineering" group. The 6 affected rows were deleted directly
 * (migration remove_duplicate_arena_submissions_proof_objects). If
 * arena_submissions is ever found to contain genuinely unique data in some
 * other environment, re-add it here with domain sourced from `category`,
 * never from `domain` — see proofObjects/legacyBuilder.js's
 * buildProofObjectFromArenaSubmission, kept but unused, for that shape.
 *
 * Run with:  node backend/scripts/backfillProofObjects.js
 */
// This script runs standalone (not through server.js), so it needs its own
// .env load — same resolve-from-project-root pattern server.js uses.
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"
import { buildProofObjectFromArenaHistory } from "../server/lib/proofObjects/legacyBuilder.js"
import * as proofRepo from "../server/lib/proofObjects/repository.js"

async function run() {
  console.log("[backfill] Fetching legacy arena_history rows…")
  const { data: historyRows, error: histErr } = await supabaseAdmin.from("arena_history").select("*")
  if (histErr) throw histErr

  const proofs = (historyRows || []).map(buildProofObjectFromArenaHistory)

  console.log(`[backfill] Built ${proofs.length} proof objects (from arena_history only — see header comment). Writing…`)

  const result = await proofRepo.insertMany(proofs)
  console.log(`[backfill] Done. Inserted/updated: ${result.inserted}`)
}

run().then(() => process.exit(0)).catch(err => {
  console.error("[backfill] Failed:", err)
  process.exit(1)
})
