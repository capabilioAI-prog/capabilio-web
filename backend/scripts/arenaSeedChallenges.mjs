/**
 * scripts/arenaSeedChallenges.mjs — one-time (idempotent) loader for the
 * curated initial Arena challenge library (spec §59).
 *
 * Every entry goes through the SAME validateChallengeContent pipeline
 * AI-generated content does — no seed content is special-cased or exempt.
 * Safe to re-run: the (stream_id, content_fingerprint) unique constraint
 * plus the duplicate check in validateChallengeContent make a second run
 * a no-op for anything already inserted.
 *
 * Usage:
 *   node backend/scripts/arenaSeedChallenges.mjs            (dry run)
 *   node backend/scripts/arenaSeedChallenges.mjs --execute   (writes)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"
import { validateChallengeContent } from "../server/lib/arena/contentValidation.js"
import { insertChallenge } from "../server/lib/arena/challengeRepository.js"
import { SEED_CHALLENGES } from "./arenaSeedChallenges.data.mjs"

const EXECUTE = process.argv.includes("--execute")

async function run() {
  const targetHost = (() => {
    try { return new URL(process.env.SUPABASE_URL || "").host || "(SUPABASE_URL not set)" }
    catch { return "(SUPABASE_URL not set or invalid)" }
  })()
  console.log(`[arena-seed] Target Supabase project: ${targetHost}`)
  console.log(`[arena-seed] Mode: ${EXECUTE ? "*** EXECUTE — THIS WILL WRITE TO THE ABOVE PROJECT ***" : "DRY RUN (validate only, no writes)"}`)
  console.log(`[arena-seed] ${SEED_CHALLENGES.length} candidate challenges across ${new Set(SEED_CHALLENGES.map((c) => c.stream)).size} streams\n`)

  const { data: streams, error: streamsErr } = await supabaseAdmin.from("streams").select("id, slug")
  if (streamsErr) throw streamsErr
  const streamIdBySlug = new Map(streams.map((s) => [s.slug, s.id]))

  let accepted = 0, rejected = 0, alreadyExists = 0

  for (const entry of SEED_CHALLENGES) {
    const { stream: streamSlug, ...content } = entry
    const streamId = streamIdBySlug.get(streamSlug)
    if (!streamId) {
      console.log(`  [SKIP] "${content.title}" — unknown stream slug "${streamSlug}"`)
      rejected++
      continue
    }

    const validation = await validateChallengeContent(content, { streamId, streamSlug })
    if (!validation.ok) {
      if (validation.stage === "duplicate") {
        console.log(`  [EXISTS] "${content.title}" (${streamSlug}) — already seeded`)
        alreadyExists++
      } else {
        console.log(`  [REJECT] "${content.title}" (${streamSlug}) — ${validation.stage}: ${validation.reason}`)
        rejected++
      }
      continue
    }

    if (EXECUTE) {
      const persisted = await insertChallenge(validation.content, { streamId, fingerprint: validation.fingerprint, source: "seed" })
      console.log(`  [INSERTED] "${persisted.title}" (${streamSlug}, ${persisted.challenge_type}, ${persisted.workstation_type})`)
    } else {
      console.log(`  [WOULD INSERT] "${content.title}" (${streamSlug}, ${content.challenge_type}, ${content.workstation_type})`)
    }
    accepted++
  }

  console.log(`\n[arena-seed] ${EXECUTE ? "Done." : "Dry run complete — nothing was written."} Accepted: ${accepted}. Already existed: ${alreadyExists}. Rejected: ${rejected}.`)
  if (!EXECUTE) console.log("[arena-seed] Re-run with --execute to write accepted challenges.")

  return { accepted, alreadyExists, rejected }
}

run().then(() => process.exit(0)).catch((err) => {
  console.error("[arena-seed] Failed:", err)
  process.exit(1)
})
