/**
 * proofObjects/builder.js
 * ---------------------------------------------------------------------------
 * Pure function: AssessmentCompletedEvent (+ the portfolio decision already
 * computed by portfolio/decision.js) -> a `proof_objects` row shape.
 *
 * This is the "Proof Object" concept from the portfolio redesign: one compact,
 * self-contained record per completed challenge — metadata, final submission,
 * AI evaluation, ELO/time, linked skills, and a reserved (currently empty)
 * `snapshots` array for the future code-replay feature.
 *
 * Deliberately pure/no I/O so it's trivial to unit test and to reuse from the
 * backfill script (which has no AssessmentCompletedEvent, only legacy rows —
 * see proofObjects/legacyBuilder.js for that path).
 */

import { humanizeDomain } from "./domains.js"

// Phase 1A (Evidence System unification): maps a Portfolio Decision's
// `type` (portfolio/decision.js's DECISION_TYPES) onto the Proof Object's
// own publish_state. Every completed assessment gets a Proof Object now —
// this mapping only controls whether it's ever visible on the portfolio/to
// recruiters, not whether it exists as evidence.
const PUBLISH_STATE_BY_DECISION_TYPE = {
  auto_publish: "auto_published",
  pending_manual: "not_published", // draft — student can self-publish later
  not_qualifying: "not_applicable", // below threshold, no manual publish allowed — never eligible
  not_eligible: "not_applicable", // common/non-domain challenge, or no portfolio_decision configured
}

function synthesizeTitle(instance) {
  const role = instance.role || instance.challenge_type || "Challenge"
  const skill = instance.skill
  if (skill && role) return `${role} — ${skill}`
  return skill || role || "Untitled Challenge"
}

/**
 * @param {import("../events/assessmentCompletedEvent.js").AssessmentCompletedEvent} event
 * @param {{ publishState: string }} decision  the already-computed portfolio decision
 * @returns {object} a row ready for proofObjects/repository.js#insert
 */
export function buildProofObjectFromAssessment(event, decision) {
  const { instance, submission, assessment, rewardResult } = event

  const publishState = PUBLISH_STATE_BY_DECISION_TYPE[decision?.type] || "not_applicable"
  const isVisible = publishState === "auto_published"

  return {
    userId: assessment.user_id,
    source: "arena_v2",
    sourceRef: { instanceId: instance.id, submissionId: submission.id, assessmentId: assessment.id },

    domain: humanizeDomain(instance.career_family || instance.industry || instance.workstation),
    skill: instance.skill || null,
    skillsDemonstrated: instance.skill ? [instance.skill] : [],
    challengeType: instance.challenge_type || null,
    workstation: instance.workstation || null,
    role: instance.role || null,
    industry: instance.industry || null,
    difficulty: instance.difficulty || null,

    title: synthesizeTitle(instance),
    problemStatement: instance.payload?.scenario || instance.payload?.problemStatement || instance.payload?.brief || instance.payload?.prompt || "",
    finalSubmission: submission.submission_data || {},
    snapshots: [], // reserved — code-replay capture is a later phase, not built yet
    buildOutput: submission.validator_result ? { validatorDetail: submission.validator_result } : {},
    aiEvaluation: {
      validatorScore: assessment.validator_score,
      rubricScore: assessment.rubric_score,
      aiReviewScore: assessment.ai_review_score,
      aiReviewWeight: assessment.ai_review_weight,
      timingModifier: assessment.timing_modifier,
      codeQualityNotes: assessment.code_quality_notes || null,
      feedback: assessment.feedback || null,
    },
    validatorResult: submission.validator_result || {},
    artifacts: [],
    tags: [instance.industry, instance.role, instance.difficulty].filter(Boolean),

    score: assessment.final_score,
    eloDelta: rewardResult?.eloEntry?.delta ?? 0,
    timeTakenSecs: submission.time_taken_secs ?? null,
    trustLevel: "verified", // graded by the live Arena V2 pipeline, not self-reported

    publishState,
    isPortfolioVisible: !!isVisible,
    isRecruiterVisible: !!isVisible,

    completedAt: assessment.created_at || submission.submitted_at || new Date().toISOString(),
  }
}
