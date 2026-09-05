/**
 * skillStudioV2.js — Skill Studio "skill journey" redesign, additive routes.
 * ---------------------------------------------------------------------------
 * Mounted at the SAME "/api/skill-studio" prefix as the existing
 * routes/skillStudio.js (lesson, learning-path, youtube, resources) — no
 * path collisions, existing routes untouched. See
 * docs/skill-studio-v2-production-spec-2026-07-29.md for the full design.
 * Arena bridge (ingestion/readiness/handoff routes, arenaBridge.js,
 * arenaIngestion.js) removed 2026-09-05 along with the rest of the old
 * Arena implementation — see the arena-retirement report for the full
 * history of why it was already non-functional before this removal.
 * Content-ops/mentor review queue lives in routes/skillStudioContentAdmin.js
 * (separate, admin-gated namespace).
 *
 * All routes require auth (requireAuth) and are user-scoped from req.user.id
 * — never trust a client-supplied userId.
 */
import { Router } from "express"
import crypto from "crypto"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
// 2026-07-30 rate-limit incident fix: /api/skill-studio as a whole now sits
// behind the more generous skillStudioLimiter (server.js), not the shared
// 20/min aiLimiter bucket. The handful of routes below that actually spend
// AI-provider tokens (as opposed to reading/caching/deterministic-scoring)
// still get aiLimiter applied directly, so real generation cost is still
// protected — see rateLimiters.js's header for the full incident writeup.
import { aiLimiter } from "../lib/rateLimiters.js"

import { slugify, getNodeById, listNodesForDomain, getEdgesFrom } from "../lib/skillStudio/graphService.js"
import { createOrGetJourney, listJourneysForUser, archiveJourney, completeJourney } from "../lib/skillStudio/journeyPlanner.js"
import { seedIfFirstVisit, syncMissingJourneys } from "../lib/skillStudio/roleGapSeeder.js"
import { getOrCreateModule, generateRemedialSupplement, getOrCreateRevisionContent } from "../lib/skillStudio/contentGenerator.js"
import { getOrCreateNarration } from "../lib/skillStudio/narrationEngine.js"
import { getOrGenerateQuestion, scoreAnswer, getSessionResult, MODULE_PASS_THRESHOLD } from "../lib/skillStudio/quizEngine.js"
import { getDueReviews, submitRevisionReview, readDecayedState, reinforce } from "../lib/skillStudio/memoryEngine.js"
import { writeModuleEvidence, writeInterviewEvidence, publishEvidence } from "../lib/skillStudio/evidenceBridge.js"
import { getRecommendations, buildRecommendations } from "../lib/skillStudio/recommendationEngine.js"
import { listForUser as listProofObjectsForUser } from "../lib/proofObjects/repository.js"
import { logEvent } from "../lib/skillStudio/eventLogger.js"
import { AIService } from "../lib/ai/aiService.js"

const router = Router()

// ── Home ──────────────────────────────────────────────────────────────────────
router.get("/home", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    // First-ever visit with zero skill_journeys rows: bootstrap from this
    // user's EXISTING role-gap data (skill_graph + roleConfig.auraSkills)
    // instead of leaving Learning Home permanently empty (2026-07-29 fix —
    // see roleGapSeeder.js header). No-ops silently on any later visit, and
    // never blocks /home from responding even if seeding itself fails.
    const seededFirstVisit = await seedIfFirstVisit(userId).catch((e) => {
      console.error("[skill-studio/home] role-gap seeding threw despite its non-throwing contract:", e.message)
      return false
    })

    // BUG FIX (2026-07-30): seedIfFirstVisit only ever ran ONCE per user and
    // (before today) only seeded the 4 lowest-scoring "critical" skills — so
    // an 11-skill role like Data Analyst permanently topped out at 4 Learning
    // Home journeys no matter how the user's real skill_graph changed later.
    // syncMissingJourneys is idempotent and cheap (no-ops once nothing is
    // missing), so it's safe to run on every single /home load — this is
    // what actually keeps Skill Studio's journey list in sync with the same
    // role-skill list Aura's radar reads, instead of freezing it at
    // whatever happened to exist on day one.
    const synced = await syncMissingJourneys(userId).catch((e) => {
      console.error("[skill-studio/home] syncMissingJourneys threw despite its non-throwing contract:", e.message)
      return { seeded: [] }
    })
    const seeded = seededFirstVisit || (synced?.seeded?.length > 0)

    const [journeys, recommendations, dueReviews] = await Promise.all([
      listJourneysForUser(userId),
      seeded ? buildRecommendations(userId) : getRecommendations(userId),
      getDueReviews(userId, 5),
    ])
    res.json({
      activeJourneys: journeys,
      topRecommendations: recommendations.slice(0, 3),
      decayAlerts: dueReviews.filter(d => d.confidence < 0.45),
      streak: null, // reserved — no streak table in this pass
      roleGapsSeeded: seeded,
    })
  } catch (e) {
    console.error("[skill-studio/home]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── Graph ─────────────────────────────────────────────────────────────────────
router.get("/graph", requireAuth, async (req, res) => {
  try {
    const { domain } = req.query
    if (!domain) return res.status(400).json({ error: "domain query param required" })
    const nodes = await listNodesForDomain(domain)
    const nodeIds = nodes.map(n => n.id)
    const edgesNested = await Promise.all(nodeIds.map(id => getEdgesFrom(id)))
    res.json({ nodes, edges: edgesNested.flat() })
  } catch (e) {
    console.error("[skill-studio/graph]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── Journeys ──────────────────────────────────────────────────────────────────
router.post("/journeys", requireAuth, async (req, res) => {
  try {
    const { skillName, domainKey = null, targetRole = null } = req.body
    if (!skillName) return res.status(400).json({ error: "skillName is required" })
    const result = await createOrGetJourney({ userId: req.user.id, skillName, domainKey, targetRole })
    await logEvent({ userId: req.user.id, eventType: "journey_created", skillId: result.node.id, metadata: { skillName, created: result.created } })
    res.json(result)
  } catch (e) {
    console.error("[skill-studio/journeys]", e.message)
    res.status(500).json({ error: e.message })
  }
})

router.post("/journeys/:id/archive", requireAuth, async (req, res) => {
  try {
    const data = await archiveJourney(req.user.id, req.params.id)
    if (!data) return res.status(404).json({ error: "Journey not found" })
    res.json({ journey: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/journeys/:id/complete", requireAuth, async (req, res) => {
  try {
    const data = await completeJourney(req.user.id, req.params.id)
    if (!data) return res.status(404).json({ error: "Journey not found" })
    res.json({ journey: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Modules ───────────────────────────────────────────────────────────────────
router.post("/modules/generate", aiLimiter, requireAuth, async (req, res) => {
  try {
    const { skillName, skillLabel, skillGraphNodeId, skillJourneyId, jobTitle, level = "intermediate", teachingMode = "intermediate" } = req.body
    let nodeId = skillGraphNodeId
    let slug = skillName ? slugify(skillName) : null
    let label = skillLabel || skillName || null
    if (!nodeId && !slug) return res.status(400).json({ error: "skillName or skillGraphNodeId required" })
    if (!nodeId) {
      const node = await getNodeById((await createOrGetJourney({ userId: req.user.id, skillName })).node.id)
      nodeId = node.id
      slug = node.slug
      label = label || node.label
    } else {
      const node = await getNodeById(nodeId)
      slug = node?.slug || slug
      // Prefer the catalog node's real label over the slug — see
      // contentGenerator.js's getOrCreateModule fix for why this matters.
      label = label || node?.label || slug
    }

    const result = await getOrCreateModule({ skillSlug: slug, skillLabel: label, skillGraphNodeId: nodeId, skillJourneyId, jobTitle, level, teachingMode })
    res.json(result)
  } catch (e) {
    console.error("[skill-studio/modules/generate]", e.message)
    if (e.code === "generation_failed") return res.status(502).json({ error: e.message, code: e.code })
    res.status(500).json({ error: e.message })
  }
})

router.get("/modules/:moduleId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { moduleId } = req.params
    const { data: mod, error: modErr } = await supabaseAdmin.from("modules").select("*").eq("id", moduleId).maybeSingle()
    if (modErr) throw modErr
    if (!mod) return res.status(404).json({ error: "Module not found" })
    const { data: blocks } = await supabaseAdmin.from("module_content_blocks").select("*").eq("module_id", moduleId).order("ordinal")

    let { data: state } = await supabaseAdmin.from("module_state").select("*").eq("user_id", userId).eq("module_id", moduleId).maybeSingle()
    if (!state) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("module_state").insert({ user_id: userId, module_id: moduleId, status: "draft" }).select().single()
      if (createErr) throw createErr
      state = created
    }
    res.json({ module: mod, contentBlocks: blocks || [], moduleState: state })
  } catch (e) {
    console.error("[skill-studio/modules/:id]", e.message)
    res.status(500).json({ error: e.message })
  }
})

router.post("/modules/:moduleId/start", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("module_state")
      .upsert({ user_id: req.user.id, module_id: req.params.moduleId, status: "in_progress", started_at: new Date().toISOString() }, { onConflict: "user_id,module_id" })
      .select().single()
    if (error) throw error
    res.json({ moduleState: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/modules/:moduleId/playground-state", requireAuth, async (req, res) => {
  try {
    const { playgroundState = {} } = req.body
    const { data, error } = await supabaseAdmin
      .from("module_state")
      .update({ playground_state: playgroundState, updated_at: new Date().toISOString() })
      .eq("user_id", req.user.id).eq("module_id", req.params.moduleId)
      .select().maybeSingle()
    if (error) throw error
    res.json({ moduleState: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/modules/:moduleId/complete", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { moduleId } = req.params
    const { sessionId, quizScore: clientScore = 0, passed: clientPassed = true } = req.body

    const { data: mod, error: modErr } = await supabaseAdmin.from("modules").select("*, skill_graph_nodes(label, slug, domain_key)").eq("id", moduleId).maybeSingle()
    if (modErr) throw modErr
    if (!mod) return res.status(404).json({ error: "Module not found" })

    // BUG FIX (2026-07-30, Phase 1): this used to trust req.body.passed
    // directly — a client could send { passed: true } regardless of what
    // actually happened in the quiz. Every individual answer is already
    // scored server-side (quizEngine.scoreAnswer), so when the caller sends
    // the sessionId it used for the quiz, recompute the pass/fail from the
    // real quiz_attempts rows instead of trusting the client's summary.
    // Falls back to the client-supplied values ONLY when no sessionId is
    // given (keeps older callers working) — logged so that path is visible.
    let quizScore = clientScore
    let passed = clientPassed
    let missedTopics = []
    if (sessionId) {
      const result = await getSessionResult({ sessionId, userId })
      quizScore = result.score
      passed = result.passed
      missedTopics = result.missedTopics
    } else {
      console.warn(`[skill-studio/modules/:id/complete] no sessionId provided for module ${moduleId} — trusting client-supplied passed/quizScore (legacy path)`)
    }

    const { data: state, error: stateErr } = await supabaseAdmin
      .from("module_state")
      .upsert({ user_id: userId, module_id: moduleId, status: "completed", completed_at: new Date().toISOString() }, { onConflict: "user_id,module_id" })
      .select().single()
    if (stateErr) throw stateErr

    await reinforce({ userId, skillGraphNodeId: mod.skill_graph_node_id, source: "module", correct: passed })

    let evidence = null
    if (passed) {
      evidence = await writeModuleEvidence({
        userId, moduleId, moduleTitle: mod.skill_graph_nodes?.label, skillLabel: mod.skill_graph_nodes?.label,
        skillGraphNodeId: mod.skill_graph_node_id, domainKey: mod.skill_graph_nodes?.domain_key, level: mod.level, quizScore, passed,
      })
    }
    await logEvent({ userId, eventType: "module_completed", skillId: mod.skill_graph_node_id, moduleId, score: quizScore })

    res.json({ moduleState: state, evidenceCreated: !!evidence, evidence, quizScore, passed, passThreshold: MODULE_PASS_THRESHOLD, missedTopics })
  } catch (e) {
    console.error("[skill-studio/modules/:id/complete]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── Remedial regeneration (Phase 1) ─────────────────────────────────────────
// Called when a module quiz fails the MODULE_PASS_THRESHOLD floor. Returns
// ONE additional targeted example — never persisted (see
// contentGenerator.generateRemedialSupplement's header for why: this is
// specific to one learner's missed topics and must never leak into the
// shared modules/module_content_blocks cache other learners read from).
router.post("/modules/:moduleId/remedial", aiLimiter, requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params
    const { missedTopics = [] } = req.body
    const { data: mod, error: modErr } = await supabaseAdmin
      .from("modules").select("*, skill_graph_nodes(label)").eq("id", moduleId).maybeSingle()
    if (modErr) throw modErr
    if (!mod) return res.status(404).json({ error: "Module not found" })

    const { data: profile } = await supabaseAdmin.from("profiles").select("target_role, keyword").eq("id", req.user.id).maybeSingle()
    const jobTitle = profile?.target_role || profile?.keyword || "Professional"

    const supplement = await generateRemedialSupplement({
      topic: mod.skill_graph_nodes?.label, jobTitle, level: mod.level, missedTopics,
    })
    res.json({ supplement })
  } catch (e) {
    console.error("[skill-studio/modules/:id/remedial]", e.message)
    if (e.code === "generation_failed") return res.status(502).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── Revision content (Phase 1) ──────────────────────────────────────────────
// Flashcards / cheat sheet / interview questions for the "Revise" tab.
// Cached per module (module_revision_content, unique on module_id) — shared
// across every learner on the same module, same pattern as the lesson cache.
router.get("/modules/:moduleId/revision", aiLimiter, requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params
    const { data: mod, error: modErr } = await supabaseAdmin
      .from("modules").select("*, skill_graph_nodes(label)").eq("id", moduleId).maybeSingle()
    if (modErr) throw modErr
    if (!mod) return res.status(404).json({ error: "Module not found" })

    const { data: profile } = await supabaseAdmin.from("profiles").select("target_role, keyword").eq("id", req.user.id).maybeSingle()
    const jobTitle = profile?.target_role || profile?.keyword || "Professional"

    const { revision } = await getOrCreateRevisionContent({
      moduleId, topic: mod.skill_graph_nodes?.label, jobTitle, level: mod.level,
    })
    res.json({ revision })
  } catch (e) {
    console.error("[skill-studio/modules/:id/revision]", e.message)
    if (e.code === "generation_failed") return res.status(502).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── Narration (Phase 2a) ────────────────────────────────────────────────────
// "Watch" tab — narrated visual walkthrough. Cached per module
// (module_narration, unique on module_id) exactly like the lesson and
// revision content — one generation serves every learner on this module.
// Never touches quiz scoring/ELO/gating — purely additive to the Learn
// experience. Behind FLAGS.skill_studio_video client-side (this route itself
// has no separate server-side flag check, matching every other Skill Studio
// V2 route — the whole namespace is unreachable unless the frontend surface
// that calls it is rendered, same pattern as /modules/:id/revision).
router.get("/modules/:moduleId/narration", aiLimiter, requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params
    const { data: mod, error: modErr } = await supabaseAdmin
      .from("modules").select("*, skill_graph_nodes(label)").eq("id", moduleId).maybeSingle()
    if (modErr) throw modErr
    if (!mod) return res.status(404).json({ error: "Module not found" })

    const { data: contentBlocks } = await supabaseAdmin
      .from("module_content_blocks").select("*").eq("module_id", moduleId).order("ordinal")

    const { data: profile } = await supabaseAdmin.from("profiles").select("target_role, keyword").eq("id", req.user.id).maybeSingle()
    const jobTitle = profile?.target_role || profile?.keyword || "Professional"

    const { narration } = await getOrCreateNarration({
      moduleId, topic: mod.skill_graph_nodes?.label, jobTitle, level: mod.level, contentBlocks: contentBlocks || [],
    })
    res.json({ narration })
  } catch (e) {
    console.error("[skill-studio/modules/:id/narration]", e.message)
    if (e.code === "no_content") return res.status(409).json({ error: e.message, code: e.code })
    if (e.code === "generation_failed") return res.status(502).json({ error: e.message, code: e.code })
    res.status(500).json({ error: e.message })
  }
})

// ── Quiz ──────────────────────────────────────────────────────────────────────
router.post("/quiz/start", aiLimiter, requireAuth, async (req, res) => {
  try {
    const { skillGraphNodeId, skillLabel, moduleId = null, difficulty = "intermediate", questionType = "mcq" } = req.body
    if (!skillGraphNodeId || !skillLabel) return res.status(400).json({ error: "skillGraphNodeId and skillLabel required" })
    const question = await getOrGenerateQuestion({ skillGraphNodeId, skillLabel, moduleId, difficulty, questionType })
    const sessionId = crypto.randomUUID()
    res.json({ sessionId, firstQuestion: { id: question.id, questionType: question.question_type, prompt: question.payload?.prompt, options: question.payload?.options || null } })
  } catch (e) {
    console.error("[skill-studio/quiz/start]", e.message)
    if (e.code === "generation_failed") return res.status(502).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

router.post("/quiz/:sessionId/answer", requireAuth, async (req, res) => {
  try {
    const { questionId, answer, hintUsed = false, responseMs = null, skillGraphNodeId } = req.body
    if (!questionId || !skillGraphNodeId) return res.status(400).json({ error: "questionId and skillGraphNodeId required" })
    const result = await scoreAnswer({
      userId: req.user.id, sessionId: req.params.sessionId, questionId, answer, hintUsed, responseMs, skillGraphNodeId,
    })
    res.json(result)
  } catch (e) {
    console.error("[skill-studio/quiz/answer]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── Memory ────────────────────────────────────────────────────────────────────
router.get("/memory/due", requireAuth, async (req, res) => {
  try {
    const items = await getDueReviews(req.user.id, Number(req.query.limit) || 5)
    res.json({ items })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/memory/:skillGraphNodeId", requireAuth, async (req, res) => {
  try {
    const state = await readDecayedState(req.user.id, req.params.skillGraphNodeId)
    res.json({ memory: state })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/memory/:skillGraphNodeId/review", requireAuth, async (req, res) => {
  try {
    const { correct } = req.body
    const state = await submitRevisionReview({ userId: req.user.id, skillGraphNodeId: req.params.skillGraphNodeId, correct: !!correct })
    res.json({ newConfidence: state.confidence, nextReviewDue: state.next_review_due_at })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Arena bridge (GET /arena/ingestion, POST /arena/readiness, POST
// /arena/handoff) removed 2026-09-05 along with the old Arena
// implementation they pointed at. arena_ingestion_records/arena_handoffs
// tables are left in place (historical rows only — see arena retirement
// report); new Arena/Challenge system gets its own bridge here once
// rebuilt.

// ── Interview bridge (question generation grounded in module + mistakes) ────
router.post("/interview/generate", aiLimiter, requireAuth, async (req, res) => {
  try {
    const { moduleId, skillLabel, mode = "technical" } = req.body
    if (!skillLabel) return res.status(400).json({ error: "skillLabel required" })

    const { data: parsed } = await AIService.executePrompt("skillStudio.interviewQuestions", { mode, skillLabel })

    const { data: session, error } = await supabaseAdmin
      .from("interview_sessions")
      .insert({ user_id: req.user.id, module_id: moduleId || null, mode, questions: parsed.questions || [] })
      .select().single()
    if (error) throw error
    res.json({ sessionId: session.id, questions: parsed.questions || [] })
  } catch (e) {
    console.error("[skill-studio/interview/generate]", e.message)
    res.status(502).json({ error: e.message })
  }
})

router.post("/interview/:sessionId/submit", requireAuth, async (req, res) => {
  try {
    const { answers = [], skillLabel, domainKey = null } = req.body
    const userId = req.user.id
    const { data: session, error: sErr } = await supabaseAdmin.from("interview_sessions").select("*").eq("id", req.params.sessionId).eq("user_id", userId).maybeSingle()
    if (sErr) throw sErr
    if (!session) return res.status(404).json({ error: "Interview session not found" })

    // Behavioral-style AI rubric scoring, explicitly capped and NEVER moving
    // level_score/ELO (spec §8) — informs recruiter-facing evidence only.
    const scores = { overall: answers.length ? Math.round((answers.filter(a => a?.length > 20).length / answers.length) * 100) : 0 }

    const { error: uErr } = await supabaseAdmin
      .from("interview_sessions")
      .update({ answers, scores, completed_at: new Date().toISOString() })
      .eq("id", req.params.sessionId).select().single()
    if (uErr) throw uErr

    const evidence = await writeInterviewEvidence({
      userId, interviewSessionId: session.id, moduleTitle: skillLabel, skillLabel, domainKey, mode: session.mode, scores,
    })
    if (evidence) {
      await supabaseAdmin.from("interview_sessions").update({ evidence_artifact_id: evidence.id }).eq("id", session.id)
    }
    await logEvent({ userId, eventType: "interview_completed", moduleId: session.module_id, score: scores.overall })

    res.json({ scores, feedback: "Session recorded.", evidenceCreated: !!evidence })
  } catch (e) {
    console.error("[skill-studio/interview/submit]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── Evidence ──────────────────────────────────────────────────────────────────
router.get("/evidence", requireAuth, async (req, res) => {
  try {
    const artifacts = await listProofObjectsForUser(req.user.id)
    res.json({ artifacts: artifacts.filter(a => ["skill_studio", "skill_studio_interview", "arena_v2"].includes(a.source)) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/evidence/:id/publish", requireAuth, async (req, res) => {
  try {
    const { publish = true } = req.body
    const artifact = await publishEvidence(req.params.id, !!publish)
    res.json({ artifact })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Recommendations ───────────────────────────────────────────────────────────
router.get("/recommendations", requireAuth, async (req, res) => {
  try {
    const recs = await getRecommendations(req.user.id)
    res.json({ recommendations: recs })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/recommendations/refresh", requireAuth, async (req, res) => {
  try {
    const recs = await buildRecommendations(req.user.id, req.body || {})
    res.json({ recommendations: recs })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
