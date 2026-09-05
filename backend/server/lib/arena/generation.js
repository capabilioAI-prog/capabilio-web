/**
 * arena/generation.js — AI content-generation fallback (spec §36-38, §41).
 * Only ever invoked by the planner when reuse of existing eligible
 * challenges cannot fill the weekly count. Connects to the EXISTING
 * Capabilio AI abstraction (AIService.executePrompt) rather than a new
 * integration — see prompts/arenaChallenge.js for the registered prompt.
 */
import { AIService } from "../ai/aiService.js"
import { logger } from "../logger.js"
import { validateChallengeContent } from "./contentValidation.js"
import { insertChallenge } from "./challengeRepository.js"
import { getStreamTaxonomy } from "./streamTaxonomy.js"
import { CHALLENGE_TYPES, WORKSTATION_VERIFICATION_COMPAT } from "./contentSchema.js"

const MAX_ATTEMPTS = 2

/** Picks a workstation/verification pair the compatibility table actually
 *  allows, biased toward the stream's own reasonable defaults. Coding
 *  streams lean coding/sql; everything else leans structured_response/
 *  decision/calculation/log_investigation — never forces SQL onto a
 *  non-computing stream (spec §32). */
const STREAM_WORKSTATION_PREFERENCE = {
  cse: ["coding", "sql", "structured_response"],
  mca: ["coding", "sql", "structured_response"],
  it: ["structured_response", "log_investigation", "sql"],
  "ai-ml": ["structured_response", "calculation", "coding"],
  "ai-ds": ["structured_response", "calculation", "sql"],
  "cyber-security": ["log_investigation", "structured_response", "decision"],
  ece: ["calculation", "structured_response", "decision"],
  eee: ["calculation", "structured_response", "decision"],
  mechanical: ["calculation", "structured_response", "decision"],
  civil: ["calculation", "structured_response", "decision"],
  mba: ["decision", "structured_response", "calculation"],
}

function pickWorkstationType(streamSlug) {
  const prefs = STREAM_WORKSTATION_PREFERENCE[streamSlug] || ["structured_response"]
  return prefs[Math.floor(Math.random() * prefs.length)]
}

function pickVerificationType(workstationType) {
  const compat = WORKSTATION_VERIFICATION_COMPAT[workstationType] || ["rule_based"]
  return compat[0]
}

function pickChallengeType(excludeTypes = []) {
  const remaining = CHALLENGE_TYPES.filter((t) => !excludeTypes.includes(t))
  const pool = remaining.length > 0 ? remaining : CHALLENGE_TYPES
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * @param {{ streamId, streamSlug, existingTitles: string[], excludeChallengeTypes: string[] }} spec
 * @returns {Promise<{ ok: true, challenge: object } | { ok: false, reason: string }>}
 */
export async function generateChallenge({ streamId, streamSlug, existingTitles = [], excludeChallengeTypes = [] }) {
  const taxonomy = getStreamTaxonomy(streamSlug)
  if (!taxonomy) return { ok: false, reason: `no taxonomy configured for stream "${streamSlug}"` }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const competencyArea = taxonomy.competencyAreas[Math.floor(Math.random() * taxonomy.competencyAreas.length)]
    const challengeType = pickChallengeType(excludeChallengeTypes)
    const workstationType = pickWorkstationType(streamSlug)
    const verificationType = pickVerificationType(workstationType)

    logger.info("[arena.generation] requesting generation", { streamSlug, competencyArea, challengeType, workstationType, verificationType, attempt })

    let aiResult
    try {
      aiResult = await AIService.executePrompt("arena.generateChallenge", {
        streamName: taxonomy.name,
        competencyArea,
        skill: competencyArea,
        challengeType,
        difficulty: "easy",
        workstationType,
        verificationType,
        estimatedMinutes: 10,
        constraints: [
          "must not depend on professional experience",
          "must not be a generic renamed task",
          "must be solvable in a short session",
          "must produce assessable evidence",
        ],
        existingTitles,
      })
    } catch (e) {
      logger.error("[arena.generation] AI call failed", { streamSlug, attempt, error: e.message })
      continue // existing AI provider retry/fallback policy already ran inside executePrompt; try a fresh spec next loop
    }

    const validation = await validateChallengeContent(aiResult.data, { streamId, streamSlug })
    if (!validation.ok) {
      logger.info("[arena.generation] generation rejected", { streamSlug, attempt, stage: validation.stage, reason: validation.reason })
      continue
    }

    const persisted = await insertChallenge(validation.content, { streamId, fingerprint: validation.fingerprint, source: "ai_generated" })
    logger.info("[arena.generation] challenge allocated (generated)", { streamSlug, challengeId: persisted.id, challengeType: persisted.challenge_type })
    return { ok: true, challenge: persisted }
  }

  logger.error("[arena.generation] generation exhausted attempts", { streamSlug, attempts: MAX_ATTEMPTS })
  return { ok: false, reason: "generation_exhausted" }
}
