/**
 * arena/challengeRepository.js — reusable challenge bank reads/writes.
 * Not a "Task Bank" product (spec §60) — just the minimum persistence
 * layer Arena itself needs: find eligible content, persist validated
 * content, look up one challenge for mission execution.
 */
import { supabaseAdmin } from "../supabase.js"
import { isSimulationRequiredStream } from "./streamTaxonomy.js"

const CHALLENGE_COLUMNS = "id, stream_id, competency_area, skill, skill_graph_node_id, challenge_type, title, scenario, mission, learning_objective, difficulty, estimated_minutes, instructions, inputs, expected_output, workstation_type, verification_type, verification_definition, simulation_type, points, explanation, tags, version"

/** Best-effort skill_graph_nodes match by label — same honesty contract as
 *  the rest of this codebase's skill-graph integrations: null, never
 *  fabricated, when nothing matches. */
async function findSkillGraphNodeId(skillLabel) {
  const { data } = await supabaseAdmin
    .from("skill_graph_nodes").select("id").ilike("label", skillLabel).limit(1).maybeSingle()
  return data?.id || null
}

/**
 * @param {{ streamId: string, streamSlug?: string, excludeChallengeIds?: string[], limit?: number }} params
 *   `streamSlug` is required to enforce the non-IT simulation-only rule
 *   (spec: "hard product rule") — omit it only for IT/computing streams,
 *   or for call sites (like submission's own challenge lookup) that
 *   don't need eligibility filtering at all.
 */
export async function findEligibleChallenges({ streamId, streamSlug, excludeChallengeIds = [], limit = 50 }) {
  let query = supabaseAdmin
    .from("arena_challenges").select(CHALLENGE_COLUMNS)
    .eq("stream_id", streamId).eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(limit)
  if (excludeChallengeIds.length > 0) query = query.not("id", "in", `(${excludeChallengeIds.join(",")})`)
  // Defense in depth beyond retiring old rows: even a stray active
  // non-simulation row for a non-IT stream can never be allocated,
  // enforced at the query itself, not just at content-creation time.
  if (streamSlug && isSimulationRequiredStream(streamSlug)) {
    query = query.not("simulation_type", "is", null)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getChallengeById(challengeId) {
  const { data, error } = await supabaseAdmin
    .from("arena_challenges").select(CHALLENGE_COLUMNS).eq("id", challengeId).maybeSingle()
  if (error) throw error
  return data
}

/**
 * Persists already-validated content (see contentValidation.js — call
 * this AFTER validateChallengeContent, never before).
 */
export async function insertChallenge(content, { streamId, fingerprint, source }) {
  const skillGraphNodeId = await findSkillGraphNodeId(content.skill)
  const { data, error } = await supabaseAdmin
    .from("arena_challenges")
    .insert({
      stream_id: streamId,
      competency_area: content.competency_area,
      skill: content.skill,
      skill_graph_node_id: skillGraphNodeId,
      challenge_type: content.challenge_type,
      title: content.title,
      scenario: content.scenario,
      mission: content.mission,
      learning_objective: content.learning_objective || null,
      difficulty: content.difficulty,
      estimated_minutes: content.estimated_minutes,
      instructions: content.instructions,
      inputs: content.inputs || {},
      expected_output: content.expected_output || {},
      workstation_type: content.workstation_type,
      verification_type: content.verification_type,
      verification_definition: content.verification_definition,
      simulation_type: content.simulation_type || null,
      points: content.points || 10,
      explanation: content.explanation || null,
      tags: content.tags || [],
      content_fingerprint: fingerprint,
      source,
    })
    .select(CHALLENGE_COLUMNS)
    .single()
  if (error) throw error
  return data
}
