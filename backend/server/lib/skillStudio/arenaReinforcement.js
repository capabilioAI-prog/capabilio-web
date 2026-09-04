/**
 * arenaReinforcement.js — the single orchestrator that connects an Arena
 * task result to skill evidence. Used by BOTH live submission routes
 * (arenaDomainRole.js, arenaCollegeStream.js) AND the one-time historical
 * backfill (scripts/backfillArenaSkillReinforcement.mjs), so the live path
 * and the backfill can never disagree about what "reinforcing a submission"
 * means, and can never double-count the same submission regardless of which
 * one runs first.
 * ---------------------------------------------------------------------------
 * Deliberately thin: reuses memoryEngine.reinforce() (the existing,
 * already-source-weighted, already-decaying evidence model) and
 * skillGraphSync.syncSkillGraphFromMemoryStates() (the existing→Aura bridge)
 * rather than building a second, competing skill-confidence system.
 *
 * Evidence-quality weighting (Fix 3): reinforce() itself is boolean
 * (correct/incorrect) — a 100/100 Hard pass and a bare 61/100 Easy pass would
 * otherwise move a skill by the exact same amount. computeEvidenceMultiplier
 * derives a small, bounded, deterministic multiplier from data already on
 * hand at submission time (score + task difficulty) — reusing the same
 * easy/medium/hard difficulty tiers ELO_FAIL_PENALTY already uses in both
 * route files, not a new taxonomy.
 */
import { supabaseAdmin } from "../supabase.js"
import { reinforce } from "./memoryEngine.js"
import { syncSkillGraphFromMemoryStates } from "./skillGraphSync.js"
import { logger } from "../logger.js"

export const defaultDeps = { supabaseAdmin, reinforce, syncSkillGraphFromMemoryStates, logger }

const LEDGER = "arena_skill_reinforcements"

// Same three tiers as ELO_FAIL_PENALTY (arenaDomainRole.js/arenaCollegeStream.js)
// — reused, not duplicated as a new taxonomy. A difficulty value outside this
// set (or missing) falls back to "medium" — a neutral middle, never the
// extremes, so unrecognized content can't over- or under-weight evidence.
const DIFFICULTY_WEIGHT = { easy: 0.9, medium: 1.0, hard: 1.15, expert: 1.3 }

const MIN_MULTIPLIER = 0.5
const MAX_MULTIPLIER = 1.4

/**
 * Pure, testable. Bounded to [MIN_MULTIPLIER, MAX_MULTIPLIER] — the same
 * bound memoryEngine.reinforce() re-clamps as defense in depth, so a single
 * near-perfect Hard-task pass can meaningfully outweigh a bare Easy pass
 * without ever being able to jump a skill from near-zero to "expert" in one
 * event (reinforce()'s own per-source strength cap, e.g. 0.35 for Arena,
 * still applies underneath this multiplier).
 */
export function computeEvidenceMultiplier({ score, difficulty }) {
  const difficultyWeight = DIFFICULTY_WEIGHT[difficulty] ?? DIFFICULTY_WEIGHT.medium
  // score is 0-100; clamp defensively (a malformed/negative score should
  // never invert the direction of the weighting).
  const s = Math.max(0, Math.min(100, typeof score === "number" ? score : 70))
  // Maps 0-100 score to a 0.85-1.1 band — score matters, but even a bare
  // pass still counts as real, meaningful evidence (never scaled toward 0).
  const scoreWeight = 0.85 + (s / 100) * 0.25
  const raw = difficultyWeight * scoreWeight
  return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, raw))
}

/**
 * reinforceArenaSubmission — call once, right after a submission row has
 * been successfully inserted (pass OR fail — a failed attempt is still real
 * evidence, same as Skill Studio quiz mistakes already are; see
 * memoryEngine.reinforce()'s `correct` handling). Never throws — this is a
 * secondary evidence write, the exact same "best-effort, logged, never
 * blocks the response" contract bumpProfileElo/recordArenaHistory already
 * use in both route files.
 *
 * Idempotent via the arena_skill_reinforcements unique(submission_table,
 * submission_id) constraint — a retried/duplicated call for the same
 * submission is a safe no-op after the first successful call, exactly the
 * "insert-or-detect-duplicate" pattern this codebase already established in
 * arenaIngestion.js's arena_ingestion_records upsert.
 *
 * @param {{ userId: string, skillGraphNodeId: string|null, domainKey: string|null,
 *   correct: boolean, score: number|null, difficulty: string|null,
 *   submissionTable: "domain_submissions"|"college_submissions",
 *   submissionId: string, backfilled?: boolean }} args
 */
export async function reinforceArenaSubmission(
  { userId, skillGraphNodeId, domainKey, correct, score, difficulty, submissionTable, submissionId, source = "arena", backfilled = false },
  deps = defaultDeps,
) {
  try {
    if (!userId || !submissionTable || !submissionId) {
      return { ok: false, error: "missing userId/submissionTable/submissionId" }
    }
    // Honest, not fabricated: a mission/experiment with no tagged competency
    // (most domain_roles today — see the audit) has nothing to reinforce.
    // Not an error — just nothing to do.
    if (!skillGraphNodeId) return { ok: true, skipped: "no_skill_graph_node_id" }

    const multiplier = computeEvidenceMultiplier({ score, difficulty })

    const { data: ledgerRow, error: ledgerErr } = await deps.supabaseAdmin
      .from(LEDGER)
      .upsert(
        {
          user_id: userId, submission_table: submissionTable, submission_id: submissionId,
          skill_graph_node_id: skillGraphNodeId, source, correct: !!correct,
          score: typeof score === "number" ? score : null, difficulty: difficulty || null,
          multiplier, backfilled,
        },
        { onConflict: "submission_table,submission_id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle()
    if (ledgerErr) throw ledgerErr
    // Upsert was a no-op — this exact submission was already reinforced
    // (live path already ran, or the backfill already processed it).
    if (!ledgerRow) return { ok: true, skipped: "already_reinforced" }

    const memoryState = await deps.reinforce({
      userId, skillGraphNodeId, source, correct: !!correct, strengthMultiplier: multiplier,
    })

    if (memoryState?.confidence != null) {
      await deps.supabaseAdmin.from(LEDGER).update({ confidence_after: memoryState.confidence }).eq("id", ledgerRow.id)
    }

    const sync = domainKey
      ? await deps.syncSkillGraphFromMemoryStates({ userId, domainKey })
      : null

    return { ok: true, skillGraphNodeId, multiplier, confidence: memoryState?.confidence ?? null, sync }
  } catch (err) {
    deps.logger.error("[arenaReinforcement] reinforceArenaSubmission failed (submission response unaffected)", {
      err, userId, submissionTable, submissionId,
    })
    return { ok: false, error: err.message }
  }
}
