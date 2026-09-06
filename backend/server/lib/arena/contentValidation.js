/**
 * arena/contentValidation.js — the full validation pipeline a piece of
 * challenge content (seed or AI-generated) must pass before it is ever
 * persisted or shown to a student (spec §37, §39, §40).
 *
 * Order matters and mirrors spec §37: schema -> semantic stream ->
 * competency/skill alignment -> workstation/verification compatibility ->
 * duplicate detection. Each step is deterministic where the shape of the
 * check allows it; nothing here calls an LLM — semantic validation is a
 * rule-based floor (vocabulary + competency-area allowlist), which is
 * enough to reject the exact failure mode described in spec §14 (a
 * generic task with the stream's name pasted on) without adding a second,
 * non-deterministic AI call into the reject/accept path.
 */
import crypto from "crypto"
import { ChallengeContentSchema, validateWorkstationVerificationCompat } from "./contentSchema.js"
import { getStreamTaxonomy, isSimulationRequiredStream } from "./streamTaxonomy.js"
import { validateSimulationCompatibility, validateSimulationConfigShape, getSimulationState } from "./simulations/registry.js"
import { supabaseAdmin } from "../supabase.js"

/** Stable fingerprint: normalized title + scenario + mission, so trivial
 *  wording/whitespace/casing changes still collide (spec §40). */
export function computeContentFingerprint(content) {
  const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
  const basis = [normalize(content.title), normalize(content.scenario), normalize(content.mission)].join("|")
  return crypto.createHash("sha256").update(basis).digest("hex")
}

/** Rule-based semantic-stream floor: competency_area must be one this
 *  stream actually owns, AND the scenario+mission text must contain at
 *  least one term from the stream's required vocabulary. A generic
 *  "table has columns..." task renamed to a stream will fail this. */
function validateSemanticStream(content, streamSlug) {
  const taxonomy = getStreamTaxonomy(streamSlug)
  if (!taxonomy) return { ok: false, reason: `no taxonomy configured for stream "${streamSlug}"` }

  const areaMatch = taxonomy.competencyAreas.some((a) => a.toLowerCase() === content.competency_area.toLowerCase())
  if (!areaMatch) {
    return { ok: false, reason: `competency_area "${content.competency_area}" is not one of this stream's defined areas: ${taxonomy.competencyAreas.join(", ")}` }
  }

  const haystack = `${content.scenario} ${content.mission} ${content.instructions}`.toLowerCase()
  const vocabHit = taxonomy.vocabulary.some((term) => haystack.includes(term))
  if (!vocabHit) {
    return { ok: false, reason: `scenario/mission contains none of this stream's required vocabulary — looks generic, not genuinely ${taxonomy.name}-specific` }
  }

  return { ok: true }
}

async function checkDuplicate(streamId, fingerprint, { excludeChallengeId } = {}) {
  let query = supabaseAdmin.from("arena_challenges").select("id").eq("stream_id", streamId).eq("content_fingerprint", fingerprint)
  if (excludeChallengeId) query = query.neq("id", excludeChallengeId)
  const { data, error } = await query.limit(1)
  if (error) throw error
  return (data || []).length > 0
}

/**
 * Hard product rule: for non-IT/non-computing streams, a Common Challenge
 * is not eligible unless it declares a real, working simulation — a
 * plain text + answer-box challenge (simulation_type null), an empty/
 * missing simulation config, or a config the registered renderer can't
 * actually turn into simulation state are all rejected here, before the
 * content is ever persisted. This is the one gate both AI generation and
 * curated seed content must pass through — there is no separate "AI
 * fallback" path that skips it, so a thin non-IT pool can never silently
 * backfill with text-only content.
 */
function validateSimulationRequired(content, streamSlug) {
  if (!isSimulationRequiredStream(streamSlug)) return { ok: true }

  if (!content.simulation_type) {
    return { ok: false, reason: `stream "${streamSlug}" requires every Common Challenge to declare a simulation_type — plain text/answer-only challenges are not eligible for a non-IT stream` }
  }

  const simConfig = content.verification_definition?.simulation
  if (!simConfig || typeof simConfig !== "object" || Array.isArray(simConfig) || Object.keys(simConfig).length === 0) {
    return { ok: false, reason: `stream "${streamSlug}" requires a non-empty simulation configuration (verification_definition.simulation) — none was provided` }
  }

  const shapeCheck = validateSimulationConfigShape(content.simulation_type, simConfig)
  if (!shapeCheck.ok) return { ok: false, reason: shapeCheck.reason }

  const state = getSimulationState(content.simulation_type, simConfig)
  if (!state) {
    return { ok: false, reason: `simulation_config could not produce valid simulation state for "${content.simulation_type}" — not a meaningful interactive configuration` }
  }

  return { ok: true }
}

/**
 * @param {object} rawContent — candidate content, application-shaped (see contentSchema.js)
 * @param {{ streamId: string, streamSlug: string }} context
 * @returns {Promise<{ ok: true, content: object, fingerprint: string } | { ok: false, stage: string, reason: string }>}
 */
export async function validateChallengeContent(rawContent, { streamId, streamSlug }) {
  const parsed = ChallengeContentSchema.safeParse(rawContent)
  if (!parsed.success) {
    return { ok: false, stage: "schema", reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }
  }
  const content = parsed.data

  const semantic = validateSemanticStream(content, streamSlug)
  if (!semantic.ok) return { ok: false, stage: "semantic_stream", reason: semantic.reason }

  const compat = validateWorkstationVerificationCompat(content)
  if (!compat.ok) return { ok: false, stage: "workstation_verification_compat", reason: compat.reason }

  const simCompat = validateSimulationCompatibility(content.simulation_type, { streamSlug, challengeType: content.challenge_type })
  if (!simCompat.ok) return { ok: false, stage: "simulation_compat", reason: simCompat.reason }

  const simRequired = validateSimulationRequired(content, streamSlug)
  if (!simRequired.ok) return { ok: false, stage: "simulation_required", reason: simRequired.reason }

  const fingerprint = computeContentFingerprint(content)
  const isDuplicate = await checkDuplicate(streamId, fingerprint)
  if (isDuplicate) return { ok: false, stage: "duplicate", reason: "an existing challenge in this stream has the same normalized title/scenario/mission" }

  return { ok: true, content, fingerprint }
}
