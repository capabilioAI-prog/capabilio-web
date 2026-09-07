/**
 * arena/planner.js — selects exactly N challenges for a weekly allocation
 * (spec §42-43). Stream is the only academic selector; year/semester/role/
 * experience are never consulted here (spec §4). Reuse-first (spec §41):
 * only calls into generation.js when eligible existing challenges can't
 * fill the count.
 *
 * Variety: greedily avoids repeating a "world" already picked this week
 * as long as an eligible option from a different world exists — a soft
 * preference, not a hard-coded sequence. For a simulation-bearing
 * challenge, its world is its simulation_type: a stream backed by
 * several worlds (e.g. Mechanical's compression_lab + vibration_rig +
 * pneumatic_trainer) must actually surface more than one, not silently
 * hand back N copies of whichever world happens to have the deepest
 * seed pool. For plain (non-simulation) content, challenge_type is the
 * only variety signal available, same as before.
 */
import { logger } from "../logger.js"
import { findEligibleChallenges } from "./challengeRepository.js"
import { generateChallenge } from "./generation.js"
import { isSimulationRequiredStream } from "./streamTaxonomy.js"

function varietyKey(challenge) {
  return challenge.simulation_type || challenge.challenge_type
}

export function pickWithVariety(pool, count) {
  const chosen = []
  const usedKeys = new Set()
  const remaining = [...pool]

  while (chosen.length < count && remaining.length > 0) {
    let idx = remaining.findIndex((c) => !usedKeys.has(varietyKey(c)))
    if (idx === -1) idx = 0 // no fresh world/type left — repeat is acceptable rather than starve the count
    const [picked] = remaining.splice(idx, 1)
    chosen.push(picked)
    usedKeys.add(varietyKey(picked))
  }
  return chosen
}

const MAX_GENERATION_ROUNDS = 2

/**
 * Generates the current deficit IN PARALLEL, one Promise.all round at a
 * time, rather than one-at-a-time. A student's first spin against a thin
 * seed library can need several new challenges at once (spec §41-42) —
 * sequential generation at ~6-8s per AI call very easily exceeds this
 * server's global 35s request timeout (server.js), which would otherwise
 * either hang the request or (worse) let a late response collide with the
 * timeout middleware's own response. Parallel rounds keep total wall-clock
 * time roughly flat regardless of how many challenges are missing.
 */
async function generateDeficit({ streamId, streamSlug, deficit, existingTitles, excludeTypesSoFar, excludeWorkstationTypesSoFar }) {
  const results = await Promise.all(
    Array.from({ length: deficit }, () =>
      generateChallenge({ streamId, streamSlug, existingTitles, excludeChallengeTypes: excludeTypesSoFar, excludeWorkstationTypes: excludeWorkstationTypesSoFar })
    )
  )
  const generated = []
  for (const result of results) {
    if (result.ok) generated.push(result.challenge)
    else logger.error("[arena.planner] generation attempt failed", { streamSlug, reason: result.reason })
  }
  return generated
}

/**
 * @param {{ streamId, streamSlug, count: number, excludeChallengeIds?: string[] }} params
 * @returns {Promise<{ ok: true, challenges: object[] } | { ok: false, reason: string, allocated: number, needed: number }>}
 */
export async function planWeeklyMissions({ streamId, streamSlug, count, excludeChallengeIds = [] }) {
  const eligible = await findEligibleChallenges({ streamId, streamSlug, excludeChallengeIds, limit: Math.max(count * 5, 50) })
  logger.info("[arena.planner] eligible existing challenges found", { streamSlug, count, eligibleCount: eligible.length })

  let chosen = pickWithVariety(eligible, count)

  // AI generation never produces a valid simulation_type (spec: AI must not
  // invent simulation configs presented as physical truth) — for a
  // simulation-required stream every attempt would fail validateSimulation-
  // Required and just burn AI calls. Skip straight to "insufficient" so a
  // thin simulation pool surfaces as a real content gap, not a slow one.
  if (chosen.length < count && isSimulationRequiredStream(streamSlug)) {
    logger.info("[arena.planner] simulation-required stream short on eligible challenges — skipping AI generation", { streamSlug, eligibleCount: eligible.length, needed: count })
    return { ok: false, reason: "insufficient_valid_challenges", allocated: chosen.length, needed: count }
  }

  for (let round = 1; round <= MAX_GENERATION_ROUNDS && chosen.length < count; round++) {
    const deficit = count - chosen.length
    const excludeTypesSoFar = [...new Set(chosen.map((c) => c.challenge_type))]
    const excludeWorkstationTypesSoFar = [...new Set(chosen.map((c) => c.workstation_type))]
    const existingTitles = [...eligible, ...chosen].map((c) => c.title)
    logger.info("[arena.planner] generating deficit in parallel", { streamSlug, round, deficit })
    const generated = await generateDeficit({ streamId, streamSlug, deficit, existingTitles, excludeTypesSoFar, excludeWorkstationTypesSoFar })
    chosen = pickWithVariety([...chosen, ...generated], count)
    eligible.push(...generated) // immediately eligible for the rest of this same allocation
  }

  if (chosen.length < count) {
    return { ok: false, reason: "insufficient_valid_challenges", allocated: chosen.length, needed: count }
  }

  return { ok: true, challenges: chosen.slice(0, count) }
}
