/**
 * profileService.js — Arena Capability Engine, Phase 2.
 * ---------------------------------------------------------------------------
 * Loads a student's per-competency capability state for a domain, sourced
 * entirely from Skill Studio's existing memory_states/skill_graph_nodes
 * tables (see memoryEngine.js) — no parallel scoring model.
 *
 * HONESTY CONTRACT: if a domain has no skill_graph_nodes (competency
 * tagging never ran for it) or a student has no memory_states row for a
 * given node (never reinforced), this returns an explicit null/empty
 * signal — it never fabricates a confidence value or a strength/weakness
 * label from nothing. Phase 1's backfill tags every current task with a
 * COARSE (per-stream/per-role) competency node; per-student `memory_states`
 * rows only start existing once something calls memoryEngine.reinforce()
 * against those nodes, which Phase 2 deliberately does not do (see the
 * "FIX 7" safety gate in 2026-09-01_arena_capability_schema.sql) — so today,
 * `hasData: false` is the expected, correct answer for every domain until a
 * later phase decides it's safe to start reinforcing against these nodes.
 */
import { supabaseAdmin } from "../supabase.js"

export const defaultDeps = { supabaseAdmin }

/**
 * @param {{ userId: string, domainKey: string }} args
 * @returns {Promise<{ competencies: Array<{skillGraphNodeId:string, slug:string, label:string, confidence:number|null, lastReinforcedAt:string|null}>, hasData: boolean }>}
 */
export async function loadCapabilityState({ userId, domainKey }, deps = defaultDeps) {
  const { data: nodes, error: nodesErr } = await deps.supabaseAdmin
    .from("skill_graph_nodes")
    .select("id, slug, label, node_type, domain_key")
    .eq("domain_key", domainKey)
  if (nodesErr) throw nodesErr

  if (!nodes || nodes.length === 0) {
    return { competencies: [], hasData: false }
  }

  const nodeIds = nodes.map((n) => n.id)
  const { data: states, error: statesErr } = await deps.supabaseAdmin
    .from("memory_states")
    .select("skill_graph_node_id, confidence, last_reinforced_at")
    .eq("user_id", userId)
    .in("skill_graph_node_id", nodeIds)
  if (statesErr) throw statesErr

  const stateByNode = new Map((states || []).map((s) => [s.skill_graph_node_id, s]))
  const competencies = nodes.map((n) => {
    const state = stateByNode.get(n.id)
    return {
      skillGraphNodeId: n.id,
      slug: n.slug,
      label: n.label,
      confidence: state ? state.confidence : null,
      lastReinforcedAt: state?.last_reinforced_at || null,
    }
  })

  return { competencies, hasData: (states || []).length > 0 }
}
