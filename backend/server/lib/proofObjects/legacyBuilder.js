/**
 * proofObjects/legacyBuilder.js
 * ---------------------------------------------------------------------------
 * Converts rows from the two legacy V1 tables (arena_history, arena_submissions)
 * into the same Proof Object shape produced by builder.js for the live Arena V2
 * pipeline. Used ONLY by the one-off backfill script — the live app never
 * writes to arena_history/arena_submissions going forward, so this is a
 * migration-time bridge, not an ongoing dual-write path.
 *
 * Kept separate from builder.js (which is for the real, currently-graded
 * pipeline) because the input shape and trust level are different: legacy
 * rows were graded by the old (pre-Arena-V2) pipeline, so they're tagged
 * trust_level "self-claimed" rather than "verified" — same distinction the
 * rest of the app already draws between AI/self-reported claims and
 * pipeline-verified ones (see CareerTimeline's verificationStatus badge).
 */
import { humanizeDomain } from "./domains.js"

/** @param {object} row an arena_history row */
export function buildProofObjectFromArenaHistory(row) {
  return {
    userId: row.user_id,
    source: "arena_v1",
    sourceRef: { table: "arena_history", id: row.id },

    domain: humanizeDomain(row.domain || row.skill_category),
    skill: row.skill_name || row.skill_id || null,
    skillsDemonstrated: row.skill_name ? [row.skill_name] : [],
    challengeType: row.challenge_type || row.type || null,
    workstation: row.workstation_type || null,
    role: null,
    industry: null,
    difficulty: row.difficulty || null,

    title: row.title || "Untitled Challenge",
    problemStatement: row.scenario || row.objective || "",
    finalSubmission: { answer: row.submitted_answer || row.user_answer || "" },
    snapshots: [],
    buildOutput: row.expected_output ? { expectedOutput: row.expected_output } : {},
    aiEvaluation: { summary: row.summary || row.feedback || "", grade: row.grade || null },
    validatorResult: {},
    artifacts: [],
    tags: [row.domain, row.difficulty, row.challenge_type].filter(Boolean),

    score: row.score ?? null,
    eloDelta: row.elo_delta ?? 0,
    timeTakenSecs: null,
    trustLevel: "self-claimed", // pre-Arena-V2 pipeline — not the new verified grading path

    publishState: row.visible_in_portfolio !== false ? "self_selected" : "not_applicable",
    isPortfolioVisible: row.visible_in_portfolio !== false,
    isRecruiterVisible: row.visible_in_portfolio !== false,

    completedAt: row.completed_at || new Date().toISOString(),
  }
}

/**
 * KEPT BUT UNUSED as of 2026-07-19 — scripts/backfillProofObjects.js no
 * longer calls this. Every arena_submissions row was found to duplicate an
 * arena_history row for the same user+title (same action written to both
 * legacy tables seconds apart), and arena_submissions.domain is the literal
 * string 'swe' for every row regardless of actual subject matter, which
 * produced Proof Objects mislabeled "Software Engineering" for
 * ECE/DevOps/Data challenges. Fixed below to source `domain` from
 * `row.category` first (the reliable field) rather than `row.domain` — if
 * this table is ever reintroduced as a source, keep that precedence.
 * @param {object} row an arena_submissions row
 */
export function buildProofObjectFromArenaSubmission(row) {
  const skillTags = Array.isArray(row.skill_tags) ? row.skill_tags : []
  return {
    userId: row.user_id,
    source: "arena_v1",
    sourceRef: { table: "arena_submissions", id: row.id },

    domain: humanizeDomain(row.category || row.domain_key || row.domain),
    skill: skillTags[0] || null,
    skillsDemonstrated: skillTags,
    challengeType: row.category || null,
    workstation: row.lang || null,
    role: null,
    industry: null,
    difficulty: row.difficulty || null,

    title: row.title || "Untitled Challenge",
    problemStatement: row.scenario || "",
    finalSubmission: { answer: row.submitted_answer || "", language: row.lang || null },
    snapshots: [],
    buildOutput: {},
    aiEvaluation: {
      summary: row.summary || "",
      grade: row.grade || null,
      strengths: row.strengths || [],
      improvements: row.improvements || [],
      tip: row.tip || null,
    },
    validatorResult: {},
    artifacts: [],
    tags: [row.domain, row.difficulty, row.category].filter(Boolean),

    score: row.score ?? null,
    eloDelta: row.elo_delta ?? 0,
    timeTakenSecs: null,
    trustLevel: "self-claimed",

    publishState: "self_selected",
    isPortfolioVisible: true,
    isRecruiterVisible: true,

    completedAt: row.submitted_at || new Date().toISOString(),
  }
}
