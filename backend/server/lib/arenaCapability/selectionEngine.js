/**
 * selectionEngine.js — Arena Capability Engine, Phase 2 + Phase 3 Checkpoints D-2/D-3.
 * ---------------------------------------------------------------------------
 * Orchestrates GET /api/arena/capability/next-task:
 *   loadTasksForDomain (branch-specific fetch) -> getExclusions +
 *   loadCapabilityState (parallel) -> filter out passed ->
 *   IF an eligible existing task remains: rank by gap, serve it,
 *     record outcome='served_existing' — generation is never attempted.
 *   IF none remain (zero tasks, or every task already passed): resolve a
 *     generation context (College Stream only — see contextResolution.js),
 *     attempt generation -> verification -> duplicate check -> persistence,
 *     up to 2 total attempts (generated / regenerated), else fall back to a
 *     safe already-existing task excluded from the primary ranking if one
 *     is available, else honestly report taskSource: "no_suitable_task".
 * Every task_generation_events insert is best-effort, non-fatal — never
 * blocks serving a task, same pattern arena_history inserts already use in
 * both existing route files.
 *
 * Sits ABOVE College Stream and Domain Role without merging them — each
 * branch's own tables/routes/business logic (arenaCollegeStream.js,
 * arenaDomainRole.js, and their lib/collegeStream, lib/domainRole modules)
 * are untouched. This file only reads the same tables those routes already
 * read (experiments/domain_missions, college_submissions/domain_submissions)
 * to rank across them uniformly; it never writes a submission or touches
 * evaluation logic.
 *
 * College Stream subject/unit resolution uses the same authoritative
 * `semester_subjects` many-to-many join as contextResolution.js and the
 * production arenaCollegeStream.js route — NOT `subjects.semester_id`
 * (stale/unreliable, see contextResolution.js's file header). Checkpoint D-1
 * flagged this file's prior use of `subjects.semester_id` as a latent bug;
 * fixed here so the selection and generation-context paths agree.
 */
import { supabaseAdmin } from "../supabase.js"
import { getExclusions as defaultGetExclusions } from "./taskHistory.js"
import { loadCapabilityState as defaultLoadCapabilityState } from "./profileService.js"
import { resolveCollegeStreamGenerationContext as defaultResolveCollegeStreamGenerationContext } from "./contextResolution.js"
import { generateArenaTask as defaultGenerateArenaTask } from "./taskGeneration.js"
import { verifyGeneratedTask as defaultVerifyGeneratedTask } from "./verification.js"
import { checkDuplicate as defaultCheckDuplicate, recordFingerprint as defaultRecordFingerprint } from "./dedup.js"
import { persistGeneratedTask as defaultPersistGeneratedTask } from "./persistence.js"
import { resolveFewShotContext as defaultResolveFewShotContext } from "./fewShot.js"
import { logger } from "../logger.js"
import { getTier } from "../eloTiers.js"

export const defaultDeps = {
  supabaseAdmin,
  getExclusions: defaultGetExclusions,
  loadCapabilityState: defaultLoadCapabilityState,
  resolveCollegeStreamGenerationContext: defaultResolveCollegeStreamGenerationContext,
  generateArenaTask: defaultGenerateArenaTask,
  verifyGeneratedTask: defaultVerifyGeneratedTask,
  checkDuplicate: defaultCheckDuplicate,
  recordFingerprint: defaultRecordFingerprint,
  persistGeneratedTask: defaultPersistGeneratedTask,
  resolveFewShotContext: defaultResolveFewShotContext,
  logger, // Checkpoint G-1: threaded through deps like every other collaborator
          // in this file, so diagnostic logging is injectable/testable the
          // same way generation/verification/dedup/persistence already are —
          // previously the only direct, non-DI'd import in this module.
}

// Generation is attempted at most this many times per request — bounded,
// never a loop.
const MAX_GENERATION_ATTEMPTS = 2

// Adaptive generation difficulty (Fix 5, 2026-09-04 Arena evidence fix) —
// replaces the previously hardcoded "easy" for every generated task
// (a deliberate Checkpoint D-2 simplification that this closes out).
// Deliberately conservative: Capabilio's users are primarily students/
// freshers/entry-level candidates, so this never jumps to "hard" off a high
// overall ELO alone — that only unlocks once there's real, demonstrated
// confidence (memory_states, via loadCapabilityState) in the SPECIFIC
// competency being targeted, not just a high rating from other skills.
// Reuses the canonical ELO_TIERS (eloTiers.js, already the single source of
// truth for the tier badge shown elsewhere) — no new tier taxonomy invented.
export function pickGenerationDifficulty({ eloRating, competencyConfidence }) {
  const tier = getTier(typeof eloRating === "number" ? eloRating : 0)
  const strongEvidence = typeof competencyConfidence === "number" && competencyConfidence >= 0.75
  if (tier.label === "Rookie" || tier.label === "Apprentice") return "easy"
  if (tier.label === "Practitioner" || tier.label === "Expert") return strongEvidence ? "medium" : "easy"
  // Master / Elite — still never "expert" from generation; that stays
  // reserved for hand-authored seeded content, not an AI-generated guess.
  return strongEvidence ? "hard" : "medium"
}

function badRequest(message) {
  const err = new Error(message)
  err.statusCode = 400
  return err
}
function notFound(message) {
  const err = new Error(message)
  err.statusCode = 404
  return err
}

// Never leak rubric/reference_solution/expected_result/dataset/match_mode —
// those are the answer. Only fields a student is meant to see.
const EXPERIMENT_FIELDS = "id, title, prompt, difficulty, difficulty_score, elo_reward, time_limit_minutes, challenge_type, skill_graph_node_id, created_at"
const MISSION_FIELDS = "id, title, prompt, difficulty, difficulty_score, elo_reward, time_limit_minutes, panel_type, skill_graph_node_id, created_at"

async function loadCollegeStreamTasks(streamSlug, deps) {
  const { data: stream, error: streamErr } = await deps.supabaseAdmin
    .from("streams").select("id, name, slug").eq("slug", streamSlug).maybeSingle()
  if (streamErr) throw streamErr
  if (!stream) return { context: null, tasks: [] }

  const { data: semesters, error: semErr } = await deps.supabaseAdmin
    .from("semesters").select("id").eq("stream_id", stream.id)
  if (semErr) throw semErr
  if (!semesters?.length) return { context: stream, tasks: [] }

  // Authoritative subject<->semester relationship (see contextResolution.js's
  // file header) — subjects are shared across semesters via this join table,
  // NOT via the stale/unreliable subjects.semester_id column.
  const { data: links, error: linkErr } = await deps.supabaseAdmin
    .from("semester_subjects").select("subject_id").in("semester_id", semesters.map((s) => s.id))
  if (linkErr) throw linkErr
  if (!links?.length) return { context: stream, tasks: [] }

  const subjectIds = [...new Set(links.map((l) => l.subject_id))]

  const { data: units, error: unitErr } = await deps.supabaseAdmin
    .from("units").select("id").in("subject_id", subjectIds)
  if (unitErr) throw unitErr
  if (!units?.length) return { context: stream, tasks: [] }

  const { data: experiments, error: expErr } = await deps.supabaseAdmin
    .from("experiments").select(EXPERIMENT_FIELDS).in("unit_id", units.map((u) => u.id)).order("created_at")
  if (expErr) throw expErr

  return { context: stream, tasks: experiments || [] }
}

async function loadDomainRoleTasks(roleId, deps) {
  const { data: role, error: roleErr } = await deps.supabaseAdmin
    .from("domain_roles").select("id, label, primary_panel_type").eq("id", roleId).maybeSingle()
  if (roleErr) throw roleErr
  if (!role) return { context: null, tasks: [] }

  const { data: missions, error: missionsErr } = await deps.supabaseAdmin
    .from("domain_missions").select(MISSION_FIELDS).eq("domain_role_id", role.id).order("created_at")
  if (missionsErr) throw missionsErr

  return { context: role, tasks: missions || [] }
}

/** Honest, evidence-based ranking: prefer the task whose tagged competency
 *  has the LOWEST recorded confidence (the biggest gap) first; a task with
 *  no tagged competency, or a student with no confidence reading for it yet,
 *  falls back to curriculum order (created_at, already the query order) —
 *  never a fabricated score. */
function rankByGap(tasks, competencyByNodeId) {
  return [...tasks].sort((a, b) => {
    const confA = a.skill_graph_node_id ? competencyByNodeId.get(a.skill_graph_node_id)?.confidence : null
    const confB = b.skill_graph_node_id ? competencyByNodeId.get(b.skill_graph_node_id)?.confidence : null
    if (confA == null && confB == null) return 0
    if (confA == null) return 1
    if (confB == null) return -1
    return confA - confB
  })
}

function emptyResult({ domain, roleOrSlug, avoidedTaskIds = [], selectionReason }) {
  return {
    task: null,
    taskSource: "no_suitable_task",
    domain,
    role: roleOrSlug,
    difficulty: null,
    targetedCompetencies: [],
    avoidedTaskIds,
    selectionReason,
    provenance: null,
  }
}

function toSafeTaskShape({ id, title, prompt, difficulty, panelType, timeLimitMinutes }) {
  // Never leak rubric/reference_solution/expected_result/dataset/match_mode/
  // checks — those are the answer, regardless of whether the task came from
  // the existing table or was just generated. Same field allowlist as the
  // served_existing path (below), reused for generated/fallback results.
  return { id, title, prompt, difficulty, panelType: panelType || null, timeLimitMinutes }
}

/** Coarse competency targeting (see contextResolution.js's header — tagging
 *  is one node per whole stream/role, not per subject/unit): the lowest-
 *  confidence competency if any evidence exists, else the first (only, in
 *  practice) tagged node, else null. Never fabricates a target. */
function pickTargetCompetency(competencies) {
  if (!competencies.length) return null
  const withConfidence = competencies.filter((c) => c.confidence != null).sort((a, b) => a.confidence - b.confidence)
  return withConfidence[0] || competencies[0]
}

/**
 * A "safe fallback" candidate: an existing, already-verified task excluded
 * from the primary ranking for a reason OTHER than the hard, non-negotiable
 * history/duplicate rules (taskHistory.js's passed-task exclusion is never
 * bypassed — see the CRITICAL FIX note in the Checkpoint D-2 report). Given
 * today's ranking model (rankByGap sorts ALL eligible tasks; the only
 * exclusion is passedIds), `candidates` is the eligible set minus whatever
 * was already chosen — which, structurally, is only ever reached here with
 * elements when a caller passes candidates beyond the strict eligible set.
 * In production, `selectBestTask` only calls this once `eligible.length===0`,
 * so `candidates` is `[]` and this correctly returns null (never fabricated).
 * Exported standalone so the mechanism itself — "serve the first safe
 * candidate if one exists" — is directly testable without needing a data
 * shape the current hard exclusion rules make unreachable end-to-end.
 */
export function pickFallbackTask(candidates) {
  return candidates?.[0] || null
}

async function recordGenerationEvent({ taskType, taskId, outcome, userId, domain, key, competencyTarget, promptId, provider, selectionRationale }, deps) {
  try {
    const { data: inserted, error } = await deps.supabaseAdmin
      .from("task_generation_events")
      .insert({
        task_type: taskType,
        task_id: taskId,
        outcome,
        student_id: userId,
        provider: provider || null,
        // model_tier is CHECK-constrained to null|'fast'|'quality' — an
        // abstract tier, not a concrete model name. executePrompt/
        // generateArenaTask only ever return the resolved concrete model
        // string (never the tier it was resolved from), so there is no safe
        // value to put here without guessing; left null rather than
        // fabricating a tier from a raw model name.
        model_tier: null,
        prompt_id: promptId || null,
        target_competency_node_id: competencyTarget?.skillGraphNodeId || null,
        selection_rationale: { reason: selectionRationale, domain, key },
      })
      .select("id, generated_at")
      .single()
    if (error) throw error
    return { outcome, recordedAt: inserted.generated_at }
  } catch (err) {
    // Non-fatal — same "best-effort side record, never blocks the primary
    // response" contract arena_history inserts already use in both existing
    // route files.
    deps.logger.error("[arenaCapability] provenance write failed (task still served)", { err, userId, taskId, outcome })
    return null
  }
}

/**
 * @param {{ userId: string, domain: "college_stream"|"domain_role", key: string }} args
 */
export async function selectBestTask({ userId, domain, key }, deps = defaultDeps) {
  if (domain !== "college_stream" && domain !== "domain_role") {
    throw badRequest(`Query param "domain" must be "college_stream" or "domain_role", got "${domain}"`)
  }
  if (!key) throw badRequest('Query param "key" is required (stream slug or domain role id)')

  const { context, tasks } = domain === "college_stream"
    ? await loadCollegeStreamTasks(key, deps)
    : await loadDomainRoleTasks(key, deps)

  if (!context) {
    throw notFound(`${domain === "college_stream" ? "Stream" : "Domain role"} "${key}" not found`)
  }

  const domainKey = domain === "college_stream" ? context.slug : context.id
  const roleOrSlug = domainKey
  const taskType = domain === "college_stream" ? "experiment" : "domain_mission"
  const panelTypeForGeneration = domain === "domain_role" ? context.primary_panel_type : null

  // Always loaded (even with zero tasks) — generation's competency
  // targeting and duplicate-exclusion set both need this regardless of
  // whether any existing task is currently loadable for this key.
  const [{ passedIds }, { competencies }] = await Promise.all([
    deps.getExclusions({ userId, domain, taskIds: tasks.map((t) => t.id) }, deps),
    deps.loadCapabilityState({ userId, domainKey }, deps),
  ])

  const eligible = tasks.filter((t) => !passedIds.has(t.id))

  // ── Path 1: a suitable existing task exists — serve it, never generate. ──
  if (eligible.length > 0) {
    const competencyByNodeId = new Map(competencies.map((c) => [c.skillGraphNodeId, c]))
    const ranked = rankByGap(eligible, competencyByNodeId)
    const chosen = ranked[0]
    const chosenCompetency = chosen.skill_graph_node_id ? competencyByNodeId.get(chosen.skill_graph_node_id) : null

    const selectionReason = chosenCompetency && chosenCompetency.confidence != null
      ? `Selected because your recorded confidence in "${chosenCompetency.label}" (${Math.round(chosenCompetency.confidence * 100)}%) is the lowest among your eligible tasks' tagged competencies.`
      : "Selected as the next task in curriculum order — no capability evidence recorded yet for its tagged competency."

    const provenance = await recordGenerationEvent({
      taskType, taskId: chosen.id, outcome: "served_existing", userId, domain, key,
      competencyTarget: chosen.skill_graph_node_id ? { skillGraphNodeId: chosen.skill_graph_node_id } : null,
      selectionRationale: selectionReason,
    }, deps)

    return {
      task: toSafeTaskShape({ id: chosen.id, title: chosen.title, prompt: chosen.prompt, difficulty: chosen.difficulty, panelType: chosen.panel_type, timeLimitMinutes: chosen.time_limit_minutes }),
      taskSource: "existing_verified",
      domain,
      role: roleOrSlug,
      difficulty: chosen.difficulty,
      targetedCompetencies: chosenCompetency
        ? [{ skillGraphNodeId: chosenCompetency.skillGraphNodeId, label: chosenCompetency.label, reason: "Tagged competency for this task" }]
        : [],
      avoidedTaskIds: [...passedIds],
      selectionReason,
      provenance,
    }
  }

  // ── Path 2: no suitable existing task — try generation, bounded retries. ──
  const noExistingReason = tasks.length
    ? "Every available task in this domain/role has already been passed."
    : "No tasks exist yet for this domain/role."
  const competencyTarget = pickTargetCompetency(competencies)

  // Adaptive difficulty (Fix 5, 2026-09-04) — replaces the previously
  // hardcoded "easy" for every generated task. Only fetched here, in the
  // generation branch, so the far more common "serve an existing task" path
  // (Path 1 above) gains no extra query. See pickGenerationDifficulty's own
  // header for why this stays conservative by design.
  const { data: profileForDifficulty } = await deps.supabaseAdmin
    .from("profiles").select("elo_rating").eq("id", userId).maybeSingle()
  const generationDifficulty = pickGenerationDifficulty({
    eloRating: profileForDifficulty?.elo_rating,
    competencyConfidence: competencyTarget?.confidence ?? null,
  })

  let generationContext = null
  if (domain === "college_stream") {
    const ctxResult = await deps.resolveCollegeStreamGenerationContext({ streamSlug: key, exclusions: passedIds }, deps)
    // College Stream Context Failure Rule: never call the AI provider
    // without a real subjectName/unitTitle — an ordinary inability to
    // generate for this path, not an error, and never fabricated.
    if (ctxResult.ok) {
      generationContext = {
        domain, panelType: null, difficulty: generationDifficulty,
        collegeStream: ctxResult.collegeStream, streamOrRole: context,
        competencyTarget: competencyTarget ? { skillGraphNodeId: competencyTarget.skillGraphNodeId, label: competencyTarget.label } : undefined,
        _collegeStreamMeta: { unitId: ctxResult.meta.unitId, subjectId: ctxResult.meta.subjectId, subjectName: ctxResult.collegeStream.subjectName },
      }
    }
  } else if (panelTypeForGeneration) {
    generationContext = {
      domain, panelType: panelTypeForGeneration, difficulty: generationDifficulty, streamOrRole: context,
      competencyTarget: competencyTarget ? { skillGraphNodeId: competencyTarget.skillGraphNodeId, label: competencyTarget.label } : undefined,
    }
  }

  // Checkpoint F: fills the one variable every registered generation prompt
  // already declares but this file never populated before — see fewShot.js's
  // header for why an empty fewShotBlock was the likely cause of the
  // near-duplicate rejections observed in Checkpoint E's live smoke tests.
  // Resolved once per request (not per attempt) — the example pool doesn't
  // change between bounded attempts within the same request.
  if (generationContext) {
    const { fewShotBlock } = await deps.resolveFewShotContext({
      domain, panelType: generationContext.panelType,
      unitId: generationContext._collegeStreamMeta?.unitId,
      subjectId: generationContext._collegeStreamMeta?.subjectId,
      roleId: domain === "domain_role" ? context.id : undefined,
      avoidedTaskIds: passedIds,
    }, deps)
    generationContext.fewShotBlock = fewShotBlock
  }

  let served = null
  let attemptNumber = 0
  while (generationContext && !served && attemptNumber < MAX_GENERATION_ATTEMPTS) {
    attemptNumber++
    const genResult = await deps.generateArenaTask(generationContext, deps)
    if (!genResult.ok) {
      // Checkpoint G-1: sanitized diagnostic only — reason/detail are
      // already short, human-authored, non-raw strings by generateArenaTask's
      // own contract (detail capped at 300 chars, never provider payload).
      // Never logs genResult.task (absent on failure anyway) or raw output.
      deps.logger.warn("[arenaCapability] generation rejected", { stage: "generation_rejected", reason: genResult.reason, detail: genResult.detail, promptId: genResult.promptId, attemptNumber })
      continue // provider/validation/missing-context failure — never a raw payload leaks past generateArenaTask's own normalization
    }

    const verifyResult = await deps.verifyGeneratedTask({ domain, panelType: generationContext.panelType, task: genResult.task }, deps)
    if (!verifyResult.ok) {
      // Sanitized diagnostic only — verification.js's own contract guarantees
      // reason/detail are short, deterministic, human-authored messages,
      // never raw stdout/stderr/dataset dumps. Deliberately excludes
      // verifyResult.task, which DOES carry the full generated content.
      deps.logger.warn("[arenaCapability] verification rejected", { stage: "verification_rejected", reason: verifyResult.reason, detail: verifyResult.detail, attemptNumber })
      continue // never return a generated task unless verification has passed
    }

    const dupResult = await deps.checkDuplicate({ taskType, task: genResult.task, compareAgainst: tasks }, deps)
    if (dupResult.isDuplicate) {
      // Sanitized diagnostic only — reason is one of 3 fixed enum strings;
      // hash is an opaque sha256 digest; matchedTaskId is just a UUID.
      // Deliberately excludes dupResult.normalized, which IS the full
      // normalized generated title+prompt text.
      deps.logger.warn("[arenaCapability] duplicate rejected", { stage: "duplicate_rejected", reason: dupResult.reason, matchedTaskId: dupResult.matchedTaskId, hash: dupResult.hash, attemptNumber })
      continue // never bypass fingerprint/duplicate protection
    }

    let persistResult
    try {
      persistResult = await deps.persistGeneratedTask({
        domain, panelType: generationContext.panelType, task: genResult.task, verification: verifyResult,
        difficulty: generationContext.difficulty, collegeStreamMeta: generationContext._collegeStreamMeta, domainRoleId: domain === "domain_role" ? context.id : undefined,
        skillGraphNodeId: competencyTarget?.skillGraphNodeId || null,
      }, deps)
    } catch (err) {
      deps.logger.error("[arenaCapability] generated task persistence threw (attempt discarded)", { err })
      continue
    }
    if (!persistResult?.ok) {
      deps.logger.error("[arenaCapability] generated task persistence failed (attempt discarded)", { error: persistResult?.error })
      continue
    }

    // Partial-write safety (Checkpoint D-3 review): this Supabase client has
    // no cross-table transaction available to the app layer (a plain
    // PostgREST client — wrapping these three writes would need a custom
    // database RPC function, a schema change out of scope here), so a fake
    // transaction is not attempted. Instead the writes are ordered by how
    // much they matter: persistence (above) is the only HARD gate — its
    // failure discards the whole attempt, nothing else runs. Fingerprinting
    // and the task_generation_events insert below are both intentionally
    // best-effort: once persistence succeeds, the row is a real, valid,
    // already-verified task — indistinguishable from hand-authored content —
    // so a downstream fingerprint/event failure never un-serves it or
    // reports failure to the student. The only residual risk is a persisted
    // task missing its fingerprint row, which just means a future duplicate
    // check can miss it (the same documented, pre-existing limitation
    // dedup.js's recordFingerprint already calls out), never an inconsistent
    // "task exists but nothing can find it" state — an unfingerprinted
    // College Stream/Domain Role row is still a perfectly normal row the
    // next selection cycle's loadCollegeStreamTasks/loadDomainRoleTasks will
    // find and serve like any other.
    try {
      await deps.recordFingerprint({ taskType, taskId: persistResult.taskId, task: genResult.task }, deps)
    } catch (err) {
      deps.logger.error("[arenaCapability] fingerprint recording failed (task still served)", { err, taskId: persistResult.taskId })
    }

    served = {
      task: toSafeTaskShape({
        id: persistResult.taskId, title: genResult.task.title, prompt: genResult.task.prompt,
        difficulty: generationContext.difficulty, panelType: generationContext.panelType, timeLimitMinutes: persistResult.row.time_limit_minutes,
      }),
      outcome: attemptNumber === 1 ? "generated" : "regenerated",
      promptId: genResult.promptId,
      provider: genResult.metadata?.provider,
    }
  }

  if (served) {
    const provenance = await recordGenerationEvent({
      taskType, taskId: served.task.id, outcome: served.outcome, userId, domain, key,
      competencyTarget, promptId: served.promptId, provider: served.provider,
      selectionRationale: `AI-generated task (${served.outcome}) — no suitable existing task was available for this domain/role.`,
    }, deps)

    return {
      task: served.task,
      taskSource: served.outcome, // "generated" | "regenerated"
      domain, role: roleOrSlug, difficulty: served.task.difficulty,
      targetedCompetencies: competencyTarget ? [{ skillGraphNodeId: competencyTarget.skillGraphNodeId, label: competencyTarget.label, reason: "Tagged competency for this task" }] : [],
      avoidedTaskIds: [...passedIds],
      selectionReason: "No suitable existing task was available; a new verified task was generated for your current gap.",
      provenance,
    }
  }

  // ── Path 3: generation unavailable/exhausted — safe fallback, else honest no_suitable_task. ──
  const fallbackTask = pickFallbackTask(eligible) // see pickFallbackTask's doc comment — eligible is [] here by construction, so this is honestly null today
  if (fallbackTask) {
    const provenance = await recordGenerationEvent({
      taskType, taskId: fallbackTask.id, outcome: "fallback", userId, domain, key,
      competencyTarget, selectionRationale: "Generation was unavailable; served the best available existing task as a fallback.",
    }, deps)

    return {
      task: toSafeTaskShape({ id: fallbackTask.id, title: fallbackTask.title, prompt: fallbackTask.prompt, difficulty: fallbackTask.difficulty, panelType: fallbackTask.panel_type, timeLimitMinutes: fallbackTask.time_limit_minutes }),
      taskSource: "fallback",
      domain, role: roleOrSlug, difficulty: fallbackTask.difficulty,
      targetedCompetencies: [],
      avoidedTaskIds: [...passedIds],
      selectionReason: "Generation was unavailable; served the best available existing task as a fallback.",
      provenance,
    }
  }

  return emptyResult({ domain, roleOrSlug, avoidedTaskIds: [...passedIds], selectionReason: noExistingReason })
}
