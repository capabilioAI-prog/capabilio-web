/**
 * arena/planner.js — selects exactly N challenges for a weekly allocation
 * (spec §42-43). Stream is the only academic selector; year/semester/role/
 * experience are never consulted here (spec §4). Reuse-first (spec §41):
 * only calls into generation.js when eligible existing challenges can't
 * fill the count.
 *
 * Variety (spec §43): greedily avoids repeating a challenge_type already
 * picked this week as long as an eligible option of a different type
 * exists — a soft preference, not a hard-coded sequence.
 */
import { logger } from "../logger.js"
import { findEligibleChallenges } from "./challengeRepository.js"
import { generateChallenge } from "./generation.js"

export function pickWithVariety(pool, count) {
  const chosen = []
  const usedTypes = new Set()
  const remaining = [...pool]

  while (chosen.length < count && remaining.length > 0) {
    let idx = remaining.findIndex((c) => !usedTypes.has(c.challenge_type))
    if (idx === -1) idx = 0 // no fresh type left — repeat is acceptable rather than starve the count
    const [picked] = remaining.splice(idx, 1)
    chosen.push(picked)
    usedTypes.add(picked.challenge_type)
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
async function generateDeficit({ streamId, streamSlug, deficit, existingTitles, excludeTypesSoFar }) {
  const results = await Promise.all(
    Array.from({ length: deficit }, () =>
      generateChallenge({ streamId, streamSlug, existingTitles, excludeChallengeTypes: excludeTypesSoFar })
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

  for (let round = 1; round <= MAX_GENERATION_ROUNDS && chosen.length < count; round++) {
    const deficit = count - chosen.length
    const excludeTypesSoFar = [...new Set(chosen.map((c) => c.challenge_type))]
    const existingTitles = [...eligible, ...chosen].map((c) => c.title)
    logger.info("[arena.planner] generating deficit in parallel", { streamSlug, round, deficit })
    const generated = await generateDeficit({ streamId, streamSlug, deficit, existingTitles, excludeTypesSoFar })
    chosen = pickWithVariety([...chosen, ...generated], count)
    eligible.push(...generated) // immediately eligible for the rest of this same allocation
  }

  if (chosen.length < count) {
    return { ok: false, reason: "insufficient_valid_challenges", allocated: chosen.length, needed: count }
  }

  return { ok: true, challenges: chosen.slice(0, count) }
}
