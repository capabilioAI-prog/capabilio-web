/**
 * arenaIngestion.js — Skill Studio's consumer of Arena V2's real
 * AssessmentCompletedEvent (docs/skill-studio-v2-production-spec-2026-07-29.md
 * §7, Phase 3 wiring).
 *
 * STATUS (corrected 2026-09-01 — this header previously described the code
 * below as live/wired-in; it was not, since at least commit c34d357
 * 2026-08-26): `submission-engine/service.js`, the file this was written to
 * be injected into, was deleted along with the rest of Arena V2. Nothing in
 * the rebuilt Arena (backend/server/routes/arenaCollegeStream.js,
 * arenaDomainRole.js) imports or calls `notifySkillStudio` below — confirmed
 * via grep, zero call sites outside this file and its own test. Re-wiring
 * this requires more than restoring a call site: `notifySkillStudio` and
 * `resolvePassed` are written against the `{ assessment, instance,
 * submission }` shape of Arena V2's own `av2_assessments`/
 * `av2_challenge_instances` tables, which no longer exist at all, and it
 * hard-requires `instance.skill` — a per-task skill tag neither live Arena
 * branch's content model carries today (both use a coarser `domain`/`role`
 * field instead, e.g. arenaDomainRole.js's `recordArenaHistory({ domain,
 * role })` — a plausible coarse-grained stand-in for a future fix, not
 * something this comment update invents unilaterally). See
 * routes/skillStudioV2.js's header for the corresponding GET /arena/
 * ingestion route note. The contract documented below still accurately
 * describes what this function does WHEN called — it is simply not called
 * by anything today.
 *
 * Original contract with the (now-deleted) Arena V2 pipeline (non-negotiable,
 * per the standing engineering rules and per service.js's own "fail loudly
 * vs. fail soft" distinction):
 *   - `notifySkillStudio` NEVER throws. Every code path returns a result
 *     object (`{ ok, ... }` or `{ ok: false, error }`). A Skill Studio bug
 *     must never turn into a 500 on a real Arena submission, and must never
 *     delay/duplicate grading, reward, or portfolio logic — those three
 *     already fail loudly on purpose (see service.js comments); this
 *     consumer is deliberately the one exception, because it's enrichment,
 *     not grading integrity.
 *   - Idempotent: guarded by a UNIQUE(assessment_id) constraint on
 *     arena_ingestion_records (2026-07-29_skill_studio_v2_loop_closure.sql).
 *     `av2_assessments.submission_id` is itself UNIQUE and one submission
 *     produces exactly one assessment, so assessment_id is a safe, stable
 *     idempotency key — a retried/duplicated call for the same assessment
 *     is a no-op after the first successful ingestion completes.
 *   - Does not read/write anything in arena_v2's own tables except an
 *     ADDITIVE read of the proof_objects row Arena's own portfolio pipeline
 *     already created (to set source_context), and it never touches
 *     ELO/reward rows at all — those stay exclusively owned by
 *     reward-engine/engine.js.
 */
import { supabaseAdmin } from "../supabase.js"
import { slugify, ensureSkillNode, getNodeBySlug } from "./graphService.js"
import { reinforce } from "./memoryEngine.js"
import { recordMistake } from "./mistakePatterns.js"
import { buildRecommendations } from "./recommendationEngine.js"

const INGESTION = "arena_ingestion_records"
const HANDOFFS = "arena_handoffs"

export const defaultDeps = {
  supabaseAdmin,
  ensureSkillNode,
  getNodeBySlug,
  reinforce,
  recordMistake,
  buildRecommendations,
}

/** Best available domain key from an av2_challenge_instances row. */
function resolveDomainKey(instance) {
  return instance.role || instance.career_family || instance.workstation || null
}

/**
 * Canonical pass/fail lives on submission.validator_result.passed — there is
 * NO assessment.passed column (confirmed against the live av2_assessments
 * schema before writing this). A score-threshold fallback only covers the
 * defensive case where validator_result is somehow absent.
 */
export function resolvePassed(assessment, submission) {
  if (submission?.validator_result && typeof submission.validator_result.passed === "boolean") {
    return submission.validator_result.passed
  }
  return (assessment?.final_score ?? 0) >= 70
}

/**
 * notifySkillStudio — the actual consumer. Given the SAME
 * AssessmentCompletedEvent object Reward Engine and Portfolio Engine already
 * consumed, updates Skill Studio's mastery/memory/mistake/evidence/
 * recommendation state for the matching skill. Returns a result object,
 * never throws.
 */
export async function notifySkillStudio(assessmentCompletedEvent, deps = defaultDeps) {
  try {
    const { assessment, instance, submission } = assessmentCompletedEvent || {}
    if (!assessment?.id || !instance || !submission) {
      return { ok: false, error: "malformed AssessmentCompletedEvent (missing assessment/instance/submission)" }
    }
    if (!instance.skill) {
      // A common/non-domain challenge, or a template with no skill tag —
      // nothing for Skill Studio to attach mastery to. Not an error.
      return { ok: true, skipped: "no_skill_on_instance" }
    }

    const userId = assessment.user_id
    const slug = slugify(instance.skill)
    let node = await deps.getNodeBySlug(slug, "skill")
    if (!node) node = await deps.ensureSkillNode({ slug, label: instance.skill, domainKey: resolveDomainKey(instance) })

    // ── Idempotency gate ──────────────────────────────────────────────────
    // Insert-or-detect-duplicate on assessment_id. If the upsert is a no-op
    // (row already exists), `data` comes back null and we stop here —
    // replay-safe by construction, not by convention.
    const { data: ingestionRow, error: ingestErr } = await deps.supabaseAdmin
      .from(INGESTION)
      .upsert(
        {
          assessment_id: assessment.id, user_id: userId, skill_graph_node_id: node.id,
          instance_id: instance.id, submission_id: submission.id, status: "processing",
        },
        { onConflict: "assessment_id", ignoreDuplicates: true }
      )
      .select().maybeSingle()
    if (ingestErr) throw ingestErr
    if (!ingestionRow) return { ok: true, skipped: "already_ingested" }

    const passed = resolvePassed(assessment, submission)

    // ── Mastery / memory / decay — Arena is the highest-trust source ──────
    // (spec Principle #3); reinforce()'s source-weighted strength table
    // already reflects that ("arena" is the top tier).
    await deps.reinforce({ userId, skillGraphNodeId: node.id, source: "arena", correct: passed })

    // ── Mistake pattern update on a failed attempt ─────────────────────────
    if (!passed) {
      const diagnostic = submission?.validator_result?.diagnostics?.[0] || `arena_fail:${instance.challenge_type || "unknown"}`
      await deps.recordMistake({ userId, skillGraphNodeId: node.id, patternKey: String(diagnostic).slice(0, 200), source: "arena" })
    }

    // ── Link the Skill Studio handoff that requested this mission, if any ──
    // (learners can also reach Arena directly without a Skill Studio
    // handoff — that's a normal, unlinked path, not an error.)
    const { data: handoff } = await deps.supabaseAdmin
      .from(HANDOFFS).select("*")
      .eq("user_id", userId).eq("arena_instance_id", instance.id)
      .is("result_ingested_at", null)
      .order("requested_at", { ascending: false }).limit(1).maybeSingle()

    if (handoff) {
      await deps.supabaseAdmin.from(HANDOFFS).update({ result_ingested_at: new Date().toISOString() }).eq("id", handoff.id)
    }

    // ── Evidence linking — additive source_context only on the proof object
    // Arena's own portfolio pipeline already created; never touches
    // publish_state/score/anything grading-related. ──────────────────────
    let proofObjectLinked = false
    if (handoff) {
      const { data: proofObject } = await deps.supabaseAdmin
        .from("proof_objects").select("id, source_context")
        .eq("source", "arena_v2").contains("source_ref", { instanceId: instance.id }).maybeSingle()
      if (proofObject) {
        await deps.supabaseAdmin.from("proof_objects")
          .update({ source_context: { ...(proofObject.source_context || {}), skillJourneyId: handoff.skill_journey_id, arenaHandoffId: handoff.id } })
          .eq("id", proofObject.id)
        proofObjectLinked = true
      }
    }

    // ── Recommendation refresh — best-effort; a failure here must not undo
    // the mastery/memory work already committed above. ────────────────────
    try {
      await deps.buildRecommendations(userId)
    } catch (e) {
      console.error("[arenaIngestion] recommendation refresh failed (non-blocking):", e.message)
    }

    await deps.supabaseAdmin.from(INGESTION)
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", ingestionRow.id)

    return { ok: true, skillGraphNodeId: node.id, passed, handoffLinked: !!handoff, proofObjectLinked }
  } catch (e) {
    console.error("[arenaIngestion] notifySkillStudio failed (non-blocking, Arena response unaffected):", e.message)
    // Best-effort failure marker — if we at least got past the idempotency
    // insert, flip the row to 'failed' so it's visible for a retry job later
    // (retry_count is reserved for that future job; not incremented here
    // since this IS the first attempt).
    try {
      await deps.supabaseAdmin.from(INGESTION).update({ status: "failed", error: e.message }).eq("assessment_id", assessmentCompletedEvent?.assessment?.id)
    } catch { /* swallow — we're already in the outer catch's failure path */ }
    return { ok: false, error: e.message }
  }
}
