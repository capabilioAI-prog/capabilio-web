/**
 * arena/submission.js — the mission submit orchestrator (spec §54-55).
 * Keeps the concerns spec §55 lists separate: this module only sequences
 * them — verification (verification/index.js), scoring/points (below,
 * server-only), evidence (evidence.js) — never collapses them into one
 * AI call.
 */
import { supabaseAdmin } from "../supabase.js"
import { logger } from "../logger.js"
import { getChallengeById } from "./challengeRepository.js"
import { verifyMission } from "./verification/index.js"
import { recordMissionEvidence } from "./evidence.js"

// Generic, category-level feedback for a failed attempt — deliberately
// never the challenge's own `explanation` text. Several rule_based/rubric
// challenges' explanation field states the correct answer outright (it's
// meant to be shown to a student who already PASSED, as the "why"); the
// original version of this function returned it on every outcome
// regardless of pass/fail, discovered while designing the failure-state
// UI — that let a failing student read the answer and resubmit it
// verbatim without ever demonstrating the reasoning Arena exists to
// verify. explanation is now attached only when passed === true.
const FAILURE_HINT_BY_VERIFICATION_TYPE = {
  test_cases: "Your code's output didn't match what this mission expects. Re-check your logic against the given example.",
  sql_result: "Your query's result didn't match the expected rows. Re-check your filter/aggregation conditions.",
  numeric_tolerance: "Your submitted value is outside the accepted range. Re-check your calculation.",
  rule_based: "Your answer didn't match what this mission expects. Re-read the scenario and try again.",
  rubric: "Your response didn't cover enough of what this mission is looking for. Try being more specific.",
}

function failureHint(verificationType) {
  return FAILURE_HINT_BY_VERIFICATION_TYPE[verificationType] || "Not yet verified — try again."
}

async function loadOwnedMission(userId, missionId) {
  const { data: mission, error } = await supabaseAdmin
    .from("arena_weekly_missions")
    .select("id, allocation_id, challenge_id, status, points_awarded, arena_weekly_allocations!inner(student_id)")
    .eq("id", missionId)
    .maybeSingle()
  if (error) throw error
  if (!mission || mission.arena_weekly_allocations.student_id !== userId) return null
  return mission
}

/**
 * @returns {Promise<{ ok: true, passed, score, pointsAwarded } | { ok: false, reason: string }>}
 */
export async function submitMission({ userId, missionId, response }) {
  const mission = await loadOwnedMission(userId, missionId)
  if (!mission) return { ok: false, reason: "not_found" }
  if (mission.status === "completed") return { ok: false, reason: "already_completed" }

  const challenge = await getChallengeById(mission.challenge_id)
  if (!challenge) return { ok: false, reason: "challenge_missing" }

  const now = new Date().toISOString()
  await supabaseAdmin.from("arena_weekly_missions")
    .update({ status: "in_progress", started_at: now, submitted_at: now })
    .eq("id", missionId).eq("status", "assigned")

  logger.info("[arena.submission] verifying", { userId, missionId, verificationType: challenge.verification_type })
  const verification = await verifyMission(challenge.verification_type, response, challenge.verification_definition)

  // Points are computed here, server-side, from the challenge's own base
  // points and the verification result only — never from the request body
  // (spec §44).
  const pointsAwarded = verification.passed ? challenge.points : 0

  const { error: updateErr } = await supabaseAdmin
    .from("arena_weekly_missions")
    .update({
      status: verification.passed ? "completed" : "failed",
      completed_at: now,
      score: verification.score,
      points_awarded: pointsAwarded,
      verification_status: verification.passed ? "passed" : "failed",
      evidence: { response, verificationDetail: verification.detail },
      updated_at: now,
    })
    .eq("id", missionId)
  if (updateErr) throw updateErr

  // Append-only audit trail of every attempt (arena_submissions,
  // 2026-09-05b) — arena_weekly_missions above only ever holds the LATEST
  // attempt's summary; a student who fails twice before passing would
  // otherwise leave no record those failed attempts ever happened.
  try {
    await supabaseAdmin.from("arena_submissions").insert({
      mission_id: missionId,
      student_id: userId,
      response,
      verification_result: { passed: verification.passed, score: verification.score, detail: verification.detail },
      passed: verification.passed,
      score: verification.score,
      points_awarded: pointsAwarded,
    })
  } catch (e) {
    logger.error("[arena.submission] arena_submissions audit insert failed (mission result unaffected)", { userId, missionId, error: e.message })
  }

  logger.info("[arena.submission] verified", { userId, missionId, passed: verification.passed, score: verification.score, pointsAwarded })

  await recordMissionEvidence({ userId, mission, challenge, verification, pointsAwarded })

  return {
    ok: true,
    passed: verification.passed,
    score: verification.score,
    pointsAwarded,
    // Never the same field on both branches: a pass reveals the authored
    // "why" (safe — the student already demonstrated it); a fail gets
    // only a generic, category-level hint, never the correct answer.
    explanation: verification.passed ? challenge.explanation : null,
    hint: verification.passed ? null : failureHint(challenge.verification_type),
  }
}
