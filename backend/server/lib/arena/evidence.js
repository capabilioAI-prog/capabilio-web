/**
 * arena/evidence.js — bridges a verified mission result into Capabilio's
 * EXISTING evidence/memory/skill-graph systems (spec §34-35). Never a
 * second, independent skill system — reuses memoryEngine.reinforce() (the
 * same "arena" source tier every prior Arena iteration used, still the
 * highest-trust tier) and skillGraphSync's materialized-projection sync,
 * plus a row in arena_history so Portfolio/Aura's existing evidence
 * timelines pick this up with no frontend changes.
 *
 * Best-effort and non-fatal by design, matching this codebase's
 * established convention (arenaReinforcement.js, recordArenaHistory):
 * a Skill Studio/Aura display bug must never roll back or block a
 * mission that already passed verification.
 */
import { supabaseAdmin } from "../supabase.js"
import { logger } from "../logger.js"
import { reinforce } from "../skillStudio/memoryEngine.js"
import { syncSkillGraphFromMemoryStates } from "../skillStudio/skillGraphSync.js"

export async function recordMissionEvidence({ userId, mission, challenge, verification, pointsAwarded }) {
  // 1. Skill graph / memory — only if this challenge resolved to a real node.
  if (challenge.skill_graph_node_id) {
    try {
      await reinforce({
        userId,
        skillGraphNodeId: challenge.skill_graph_node_id,
        source: "arena",
        correct: verification.passed,
      })
      const { data: node } = await supabaseAdmin
        .from("skill_graph_nodes").select("domain_key").eq("id", challenge.skill_graph_node_id).maybeSingle()
      if (node?.domain_key) {
        await syncSkillGraphFromMemoryStates({ userId, domainKey: node.domain_key })
      }
    } catch (e) {
      logger.error("[arena.evidence] skill graph reinforcement failed (mission result unaffected)", { userId, missionId: mission.id, error: e.message })
    }
  }

  // 2. arena_history — same table Portfolio/Aura's existing "Recent Proof"
  //    and ELO-history timelines already read, so this new Arena's
  //    completions show up there with zero frontend changes. Only on a
  //    PASS (spec §34-35: "high-trust demonstrated evidence") — a failed
  //    attempt still updates memory/skill-graph confidence above, but does
  //    not clutter a recruiter-facing evidence timeline with unresolved
  //    attempts. Reproduced live before this fix: 2 failed retries on the
  //    same mission before the passing submission each wrote their own
  //    arena_history row.
  if (!verification.passed) return
  try {
    await supabaseAdmin.from("arena_history").insert({
      user_id: userId,
      task_id: challenge.id,
      title: challenge.title,
      domain: challenge.competency_area,
      skill_name: challenge.skill,
      skill_category: challenge.competency_area,
      workstation_type: challenge.workstation_type,
      difficulty: challenge.difficulty,
      scenario: challenge.scenario,
      objective: challenge.mission,
      score: verification.score,
      elo_delta: 0, // Common Challenges award points, not ELO — see spec §44; ELO is a separate, unrelated system
      type: "domain",
      challenge_type: challenge.challenge_type,
      summary: `Completed — ${pointsAwarded} points`,
      visible_in_portfolio: true,
      visible_in_aura: true,
      completed_at: new Date().toISOString(),
    })
  } catch (e) {
    logger.error("[arena.evidence] arena_history write failed (mission result unaffected)", { userId, missionId: mission.id, error: e.message })
  }
}
