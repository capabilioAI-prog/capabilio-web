/**
 * routes/arena.js — the ONE canonical Arena route file (spec §46, §52).
 * Replaces the retired arenaCollegeStream.js/arenaDomainRole.js/
 * arenaActivity.js/arenaCapability.js (four separate route files) with a
 * single mount at /api/arena. Routing + auth + status-code mapping only —
 * all business logic lives in lib/arena/*.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { logger } from "../lib/logger.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { generalLimiter, strictLimiter, codeExecutionLimiter } from "../lib/rateLimiters.js"
import { resolveAuthoritativeStream, listStreams, setStreamIfUnset } from "../lib/arena/streamResolver.js"
import { getCurrentArenaWeek } from "../lib/arena/week.js"
import { getWheelOutcomes } from "../lib/arena/config.js"
import { spinOrGetAllocation, getCurrentAllocation, getAllocationForWeek } from "../lib/arena/spin.js"
import { getChallengeById } from "../lib/arena/challengeRepository.js"
import { getSimulationState } from "../lib/arena/simulations/registry.js"
import { submitMission } from "../lib/arena/submission.js"
import { getLeaderboard } from "../lib/arena/leaderboard.js"
import { getStudentHistoryWithRank } from "../lib/arena/history.js"

const router = Router()

// server.js's global request-timeout middleware fires its OWN 503 (and
// only if !res.headersSent) at 35s regardless of what a route is still
// doing — spin can legitimately take a while on a thin challenge library
// (parallel AI generation, see planner.js). Every response in this file
// goes through this helper instead of res.json()/res.status() directly so
// a handler that finishes just after the timeout already fired never
// throws ERR_HTTP_HEADERS_SENT (an unhandled rejection that previously
// crashed the whole process — reproduced live before this fix).
function send(res, status, body) {
  if (res.headersSent) return
  res.status(status).json(body)
}

router.get("/stream", requireAuth, async (req, res) => {
  try {
    const stream = await resolveAuthoritativeStream(req.user.id)
    if (stream) return send(res, 200, { resolved: true, stream })
    const streams = await listStreams()
    send(res, 200, { resolved: false, streams })
  } catch (e) {
    logger.error("[arena] GET /stream failed", { error: e.message })
    send(res, 500, { error: "Could not resolve stream." })
  }
})

router.post("/stream", requireAuth, generalLimiter, async (req, res) => {
  try {
    const { streamId } = req.body || {}
    if (!streamId) return send(res, 400, { error: "streamId required" })
    const result = await setStreamIfUnset(req.user.id, streamId)
    if (!result.ok) return send(res, 409, { error: result.reason })
    send(res, 200, { stream: result.stream })
  } catch (e) {
    logger.error("[arena] POST /stream failed", { error: e.message })
    send(res, 500, { error: "Could not set stream." })
  }
})

router.get("/week", requireAuth, (req, res) => {
  send(res, 200, getCurrentArenaWeek())
})

// Single source of truth for the wheel's possible outcomes — the frontend
// fetches this instead of hardcoding [5,6,7,8,9,10,11,12] itself, so the
// wheel always renders exactly as many segments as the backend actually
// supports (spec §4: "centralized configuration... consistent source").
router.get("/config", requireAuth, async (req, res) => {
  try {
    const wheelOutcomes = await getWheelOutcomes()
    send(res, 200, { wheelOutcomes })
  } catch (e) {
    logger.error("[arena] GET /config failed", { error: e.message })
    send(res, 500, { error: "Could not load config." })
  }
})

router.get("/allocation", requireAuth, async (req, res) => {
  try {
    const result = await getCurrentAllocation(req.user.id)
    send(res, 200, result)
  } catch (e) {
    logger.error("[arena] GET /allocation failed", { error: e.message })
    send(res, 500, { error: "Could not load allocation." })
  }
})

router.post("/spin", requireAuth, strictLimiter, async (req, res) => {
  try {
    const stream = await resolveAuthoritativeStream(req.user.id)
    if (!stream) return send(res, 409, { error: "no_stream_selected" })
    const result = await spinOrGetAllocation({ studentId: req.user.id, streamId: stream.streamId, streamSlug: stream.slug })
    send(res, 200, { ...result, stream })
  } catch (e) {
    logger.error("[arena] POST /spin failed", { error: e.message, code: e.code })
    if (e.code === "planning_failed") return send(res, 503, { error: "Could not assemble this week's challenges yet. Please try again shortly." })
    send(res, 500, { error: "Spin failed." })
  }
})

router.get("/missions/:missionId", requireAuth, async (req, res) => {
  try {
    // Ownership is enforced by RLS-equivalent logic in submission.js for
    // writes; for this read, verify the mission's allocation belongs to
    // the caller before returning challenge content.
    const { data: mission, error } = await supabaseAdmin
      .from("arena_weekly_missions")
      .select("id, status, position, score, points_awarded, verification_status, challenge_id, arena_weekly_allocations!inner(student_id)")
      .eq("id", req.params.missionId).maybeSingle()
    if (error) throw error
    if (!mission || mission.arena_weekly_allocations.student_id !== req.user.id) return send(res, 404, { error: "not_found" })

    const challenge = await getChallengeById(mission.challenge_id)
    if (!challenge) return send(res, 404, { error: "not_found" })

    // Compute the public simulation state (spec §20-21) BEFORE stripping
    // verification_definition — the hidden recipe lives there and must
    // never reach the client raw; only the deterministically-derived
    // rendered state (e.g. waveform samples) is safe to send.
    const safeChallenge = { ...challenge }
    if (challenge.simulation_type) {
      safeChallenge.simulation = getSimulationState(challenge.simulation_type, challenge.verification_definition?.simulation)
    }
    // Never leak verification_definition to the client — that's the answer key.
    delete safeChallenge.verification_definition
    send(res, 200, { mission: { id: mission.id, status: mission.status, position: mission.position, score: mission.score, pointsAwarded: mission.points_awarded, verificationStatus: mission.verification_status }, challenge: safeChallenge })
  } catch (e) {
    logger.error("[arena] GET /missions/:missionId failed", { error: e.message })
    send(res, 500, { error: "Could not load mission." })
  }
})

router.post("/missions/:missionId/submit", requireAuth, codeExecutionLimiter, async (req, res) => {
  try {
    const result = await submitMission({ userId: req.user.id, missionId: req.params.missionId, response: req.body?.response || {} })
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : result.reason === "already_completed" ? 409 : 400
      return send(res, status, { error: result.reason })
    }
    send(res, 200, result)
  } catch (e) {
    logger.error("[arena] POST /missions/:missionId/submit failed", { error: e.message })
    send(res, 500, { error: "Submission failed." })
  }
})

router.get("/leaderboard", requireAuth, async (req, res) => {
  try {
    const stream = await resolveAuthoritativeStream(req.user.id)
    const result = await getLeaderboard({ streamId: stream?.streamId })
    send(res, 200, result)
  } catch (e) {
    logger.error("[arena] GET /leaderboard failed", { error: e.message })
    send(res, 500, { error: "Could not load leaderboard." })
  }
})

router.get("/history", requireAuth, async (req, res) => {
  try {
    const stream = await resolveAuthoritativeStream(req.user.id)
    const result = await getStudentHistoryWithRank(req.user.id, stream?.streamId)
    send(res, 200, result)
  } catch (e) {
    logger.error("[arena] GET /history failed", { error: e.message })
    send(res, 500, { error: "Could not load history." })
  }
})

// Read-only: view a specific past week's allocation (spec §30 — "clicking
// a week opens that historical allocation"). Ownership-scoped by
// (req.user.id, weekStart) only — no allocation id is ever accepted from
// the client, so there's no way to probe another student's history.
router.get("/history/:weekStart", requireAuth, async (req, res) => {
  try {
    const allocation = await getAllocationForWeek(req.user.id, req.params.weekStart)
    if (!allocation) return send(res, 404, { error: "not_found" })
    send(res, 200, { allocation })
  } catch (e) {
    logger.error("[arena] GET /history/:weekStart failed", { error: e.message })
    send(res, 500, { error: "Could not load that week." })
  }
})

export default router
