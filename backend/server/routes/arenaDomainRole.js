/**
 * routes/arenaDomainRole.js — Arena rebuild, Phase 2 — Domain Role branch
 * ---------------------------------------------------------------------------
 * Config-driven (panel_types/domain_roles/evaluation_axes/domain_missions
 * tables), structurally separate from the College Stream branch (own
 * tables, own route file, own lib dir) per the rebuild spec.
 *
 * SQL Runner is the only panel type implemented in this phase (Data Analyst
 * is the reference role). Scoring is fully deterministic — see
 * lib/domainRole/sqlSandbox.js — no AI call anywhere in this file, and
 * `expected_result` is never sent to the client (would leak the answer).
 */
import { Router } from "express"
import { requireAuth, optionalAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { SqlSandboxError } from "../lib/domainRole/sqlSandbox.js"
import { executeMission } from "../lib/domainRole/executeMission.js"
import { evaluateMission } from "../lib/domainRole/evaluateMission.js"
import { logger } from "../lib/logger.js"
import { decodeCursor, encodeCursor } from "../lib/pagination.js"
import { sqlValidateLimiter } from "../lib/rateLimiters.js"
import { AIService } from "../lib/ai/aiService.js"
import { reinforceArenaSubmission } from "../lib/skillStudio/arenaReinforcement.js"

// Best-effort, non-fatal — feeds the same global profiles.elo_rating the
// header badge and Portfolio tier read (see arenaCollegeStream.js's fuller
// comment on increment_profile_elo for the "why atomic RPC not read-write").
async function bumpProfileElo(userId, delta) {
  const { error } = await supabaseAdmin.rpc("increment_profile_elo", { p_user_id: userId, p_delta: delta })
  if (error) logger.error("profile ELO increment failed (submission still recorded)", { err: error, userId, delta })
}

// arena_history — the shared, denormalized event ledger Aura's "ELO Rating
// History" timeline and Portfolio's task lists both read from. Reactivated
// 2026-08-16 (see arenaCollegeStream.js for the fuller "why this table"
// comment) — every Domain Role submission (pass or fail) is recorded here,
// unlike the College Stream branch which caps ELO gain but never skips the
// history row either. type: 'domain' distinguishes these from College
// Stream's 'academic' rows in Portfolio, without guessing from free text.
// skill_name/skill_category (2026-09-04 Arena evidence fix): populated from
// the mission's tagged skill_graph_nodes row when one exists (most roles
// today still only have a coarse per-role competency — see
// backfillSkillCompetencyGranularity.mjs — so this is frequently still the
// role-level label, not a regression, just not yet granular for every role).
// Previously always null regardless of what the mission was actually tagged
// with — Portfolio's Arena Evidence section couldn't show a skill label for
// any task.
async function recordArenaHistory({ user_id, task_id, title, domain, difficulty, type, score, elo_delta, skill_name = null, skill_category = null }) {
  const { error } = await supabaseAdmin.from("arena_history").insert({
    user_id, task_id, title, domain, difficulty, type, score, elo_delta, skill_name, skill_category,
    visible_in_portfolio: true, visible_in_aura: true,
  })
  if (error) logger.error("arena_history insert failed (submission still recorded)", { err: error, userId: user_id })
}

const router = Router()

// Daily task quota by profiles.subscription tier (the real field written by
// backend/server/routes/payments.js, values "free"/"pro"/"elite" on the
// student path — see PLAN_PRICES in lib/razorpay.js). Free users get 1
// concurrent Domain Role task, Pro 3, Elite 6.
const DAILY_QUOTA = { free: 1, pro: 3, elite: 6 }
const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000

// History pagination — same defaults as careerEventsV1.js's timeline
// endpoint, kept identical across the app rather than each endpoint
// choosing its own numbers.
const DEFAULT_HISTORY_LIMIT = 20
const MAX_HISTORY_LIMIT = 100

// ASSUMPTION (flagged for review): a wrong/failed attempt now costs ELO
// instead of the previous 0-delta, roughly half the pass reward per
// difficulty. Deterministic and rule-based — same as everything else here,
// never AI-decided. Adjust these three numbers if a different penalty
// curve is wanted; nothing else in the file depends on the exact values.
const ELO_FAIL_PENALTY = { easy: 2, medium: 3, hard: 5 }

// Bounded, cheap summary of a result set for the feedback prompt — column
// names + row count + up to 3 sample rows, never the full result. Keeps
// the prompt short regardless of how large a query's actual output is
// (token cost is a first-class constraint here, not an afterthought).
function summarizeRowsForFeedback(result, label) {
  if (!result || !Array.isArray(result.columns)) return `${label}: (not available)`
  const rowCount = Array.isArray(result.rows) ? result.rows.length : 0
  const sample = (result.rows || []).slice(0, 3).map(r => `(${r.join(", ")})`).join("; ")
  return `${label}: columns [${result.columns.join(", ")}], ${rowCount} row(s)${sample ? `, sample: ${sample}` : ""}`
}

// Best-effort AI *explanation* layered on top of the already-final,
// deterministic score/passed/elo_delta — never the other way around. Score,
// pass/fail, and ELO are all decided above this call and never revisited by
// it. If Groq errors, is slow, or isn't configured, this just returns null
// and the frontend falls back to the deterministic `insight`/`error` text
// already computed — a submission never fails or blocks on this.
//
// 2026-08-17: tightened for the Domain Role mission-generation feature's
// integrity requirements (applies to every submission through this route,
// seeded Data Analyst missions included, not just newly-generated ones,
// since this is the one shared feedback path both use). Two changes:
// (1) explicitly forbids an encouraging/ambiguous tone on a FAILED result
// — a wrong answer paired with feedback that reads positive is a bad
// signal to the student and to any recruiter later viewing it on the
// portfolio; (2) grounds the explanation in the actual values returned
// vs. expected (bounded sample, see summarizeRowsForFeedback), not just
// the short mismatch-type `reason` string alone.
async function generateAiFeedback({ prompt, sql, passed, score, reason, actual, expected }) {
  if (!process.env.GROQ_API_KEY) return null
  try {
    const { data: text } = await AIService.generateArenaFeedback({
      prompt, sql, passed, score, reason,
      actualSummary: summarizeRowsForFeedback(actual, "Actual output"),
      expectedSummary: summarizeRowsForFeedback(expected, "Expected output"),
    })
    return text?.trim() || null
  } catch (err) {
    logger.error("[arenaDomainRole] AI feedback generation failed (non-blocking)", { err })
    return null
  }
}

// Career Workspace refactor — code-execution panel types' (python_runner,
// node_runner) own feedback call, kept separate from generateAiFeedback
// (SQL-specific vars/wording) rather than overloading one function with
// two incompatible shapes. Same non-fatal contract: never blocks or
// changes a submission's already-final verdict. Renamed from
// generatePythonAiFeedback now that node_runner is the second real
// caller — the body never actually branched on language.
async function generateCodeAiFeedback({ prompt, code, passed, score, reason, actual }) {
  if (!process.env.GROQ_API_KEY) return null
  try {
    const { data: text } = await AIService.generateCodeMissionFeedback({
      prompt, code, passed, score, reason,
      stdout: actual?.stdout, stderr: actual?.stderr,
    })
    return text?.trim() || null
  } catch (err) {
    logger.error("[arenaDomainRole] Code AI feedback generation failed (non-blocking)", { err })
    return null
  }
}

// Vision Reset (2026-08-20) — frontend_runner's own feedback call.
// `actual` is checkCssRules()'s raw result ({parsed, parseError, results});
// checklistSummary is a plain-text render of it so the prompt doesn't need
// to reason about JSON structure itself.
async function generateFrontendAiFeedback({ prompt, css, passed, score, reason, actual }) {
  if (!process.env.GROQ_API_KEY) return null
  try {
    const checklistSummary = actual?.parsed
      ? actual.results.map(r => `${r.passed ? "✓" : "✗"} ${r.description}`).join("; ")
      : `CSS failed to parse: ${actual?.parseError}`
    const { data: text } = await AIService.generateFrontendMissionFeedback({
      prompt, css, passed, score, reason, checklistSummary,
    })
    return text?.trim() || null
  } catch (err) {
    logger.error("[arenaDomainRole] Frontend AI feedback generation failed (non-blocking)", { err })
    return null
  }
}

// GET /api/arena/domain-role/:roleId/next-mission
// Generic across ALL 44 seeded domain_roles, not just Data Analyst — this
// is what makes "design for every role at once" possible without a new
// route per role: it just walks whatever missions exist for the given
// role_id, in order, and returns the first one the caller hasn't passed
// yet. For the 43 roles with zero missions authored so far, it honestly
// returns mission: null / totalMissions: 0 rather than fabricating one.
//
// Quota model: rolling 24h window over the caller's OWN passed
// domain_submissions for this role (no new table). A slot frees up exactly
// 24h after the completion that occupied it, which is what makes "free
// users get a new task 24h after finishing" and "pro users can have 3
// going at once" the same rule at different slot counts — read entirely
// from existing data, so there's nothing here that can drift out of sync
// or be corrupted by a race (it's a pure read, not a mutable counter).
// An UNFINISHED task never rotates out on its own — the "first unpassed
// mission in order" lookup below is what makes it "remain until finished."
//
// optionalAuth — browsable logged out (returns the first mission overall,
// no quota applied since there's no user to gate); personalized + quota-
// gated when logged in.
router.get("/:roleId/next-mission", optionalAuth, async (req, res) => {
  try {
    const { data: role, error: roleErr } = await supabaseAdmin
      .from("domain_roles").select("id, label, primary_panel_type").eq("id", req.params.roleId).maybeSingle()
    if (roleErr) throw roleErr
    if (!role) return res.status(404).json({ error: "Domain role not found" })

    const { data: missions, error: missionsErr } = await supabaseAdmin
      .from("domain_missions")
      .select("id, title, difficulty, elo_reward, time_limit_minutes, panel_type, company, manager, sprint, estimated_minutes")
      .eq("domain_role_id", role.id)
      .order("created_at")
    if (missionsErr) throw missionsErr

    let passedIds = new Set()
    let quota = null
    if (req.user && missions.length > 0) {
      const { data: passed, error: passedErr } = await supabaseAdmin
        .from("domain_submissions")
        .select("mission_id, created_at")
        .eq("user_id", req.user.id)
        .eq("passed", true)
        .in("mission_id", missions.map(m => m.id))
        .order("created_at")
      if (passedErr) throw passedErr
      passedIds = new Set((passed || []).map(p => p.mission_id))

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles").select("subscription").eq("id", req.user.id).maybeSingle()
      if (profileErr) throw profileErr
      const limit = DAILY_QUOTA[profile?.subscription] ?? DAILY_QUOTA.free

      const windowStart = Date.now() - QUOTA_WINDOW_MS
      const inWindow = (passed || []).filter(p => new Date(p.created_at).getTime() >= windowStart)
      quota = { used: inWindow.length, limit }
      if (inWindow.length >= limit) {
        const oldestInWindow = inWindow[0] // sorted by created_at ascending
        quota.nextUnlockAt = new Date(new Date(oldestInWindow.created_at).getTime() + QUOTA_WINDOW_MS).toISOString()
      }
    }

    const next = missions.find(m => !passedIds.has(m.id)) || null
    const locked = !!(quota?.nextUnlockAt && next)

    res.json({
      role,
      mission: locked ? null : next,
      totalMissions: missions.length,
      completed: missions.length > 0 && next === null,
      locked,
      quota,
    })
  } catch (err) {
    console.error("[arenaDomainRole] GET /:roleId/next-mission", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/domain-role/:roleId/history
// Auth required — the caller's own submission history only (RLS on
// domain_submissions already restricts select-own, this route mirrors that
// intent explicitly rather than relying on RLS alone since it runs through
// supabaseAdmin, which bypasses RLS).
//
// Cursor-paginated (lib/pagination.js) and filterable by `passed` so the
// History tab can render two independently-scrolling "Passed"/"Failed"
// lists instead of fetching everything and filtering client-side. The
// previous unconditional `.limit(50)` silently truncated any user past
// their 50th attempt with no way to reach the rest — this replaces that
// with a real page boundary the client can advance past.
router.get("/:roleId/history", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(MAX_HISTORY_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_HISTORY_LIMIT))

    let cursor = null
    if (req.query.cursor) {
      cursor = decodeCursor(req.query.cursor)
      if (!cursor) return res.status(400).json({ error: "Invalid cursor" })
    }

    let passedFilter = null
    if (req.query.passed !== undefined) {
      if (req.query.passed !== "true" && req.query.passed !== "false") {
        return res.status(400).json({ error: 'Invalid passed filter — must be "true" or "false"' })
      }
      passedFilter = req.query.passed === "true"
    }

    const { data: missions, error: missionsErr } = await supabaseAdmin
      .from("domain_missions")
      .select("id, title, difficulty, prompt, company, manager, sprint")
      .eq("domain_role_id", req.params.roleId)
    if (missionsErr) throw missionsErr
    if (!missions.length) return res.json({ history: [], pagination: { hasMore: false, nextCursor: null } })

    // Full detail (scenario, submitted SQL, output, checklist/insight, ELO
    // delta) — everything needed to render a complete attempt record in the
    // History tab, sourced entirely from real stored/joined data. Older
    // rows written before result_json/checklist_json/insight existed will
    // just have those fields come back null — the frontend shows an honest
    // "not available for this attempt" rather than fabricating detail.
    let q = supabaseAdmin
      .from("domain_submissions")
      .select("id, mission_id, passed, score, elo_delta, sql_text, error, result_json, checklist_json, insight, ai_feedback, execution_time_ms, created_at")
      .eq("user_id", req.user.id)
      .in("mission_id", missions.map(m => m.id))
      .order("created_at", { ascending: false })
      .limit(limit + 1) // +1 lookahead row to compute hasMore without a separate count query

    if (passedFilter !== null) q = q.eq("passed", passedFilter)
    if (cursor) q = q.lt("created_at", cursor)

    const { data: submissions, error } = await q
    if (error) throw error

    const hasMore = submissions.length > limit
    const page = hasMore ? submissions.slice(0, limit) : submissions
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1], "created_at") : null

    const missionById = new Map(missions.map(m => [m.id, m]))
    const history = page.map(s => {
      const mission = missionById.get(s.mission_id)
      return {
        ...s,
        mission_title: mission?.title || "(deleted mission)",
        difficulty: mission?.difficulty || null,
        prompt: mission?.prompt || null,
        company: mission?.company || null,
        manager: mission?.manager || null,
        sprint: mission?.sprint || null,
      }
    })
    res.json({ history, pagination: { hasMore, nextCursor } })
  } catch (err) {
    logger.error("[arenaDomainRole] GET /:roleId/history failed", { err, userId: req.user?.id, roleId: req.params.roleId })
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/domain-role/:roleId/history/counts
// Auth required — passed/failed totals for the caller's own submissions on
// this role, used to label the History tab's "Passed (N)" / "Failed (N)"
// toggle buttons without fetching full history just to count it, and to
// decouple the Achievements tab's passed-count from the (now paginated,
// no-longer-complete-in-one-fetch) history list.
// Extended 2026-08-18 (Phase 2) with two achievement-only signals, both
// computed from real data already in domain_submissions — no schema
// change, no fabricated progress:
//   - hasCleanPass: some mission's very FIRST submission (by created_at)
//     was itself a pass — "No Wrong Attempts".
//   - hasFastPass: some own passed submission's execution_time_ms beats
//     that SAME mission's median passed execution_time_ms across ALL
//     students — "Fast Completion". Deliberately a peer comparison, not a
//     self-relative "my own fastest quartile" — the latter is degenerate
//     (a student's single fastest submission is always in their own
//     fastest quartile by definition, so it would reward nothing beyond
//     "have you passed anything," not actual speed).
// "Perfect Score" (a flawless record — zero failed attempts) needs no new
// field here: it's just failed === 0 && passed > 0 on the existing counts.
router.get("/:roleId/history/counts", requireAuth, async (req, res) => {
  try {
    const { data: missions, error: missionsErr } = await supabaseAdmin
      .from("domain_missions")
      .select("id")
      .eq("domain_role_id", req.params.roleId)
    if (missionsErr) throw missionsErr
    if (!missions.length) return res.json({ passed: 0, failed: 0, totalAttempts: 0, hasCleanPass: false, hasFastPass: false })

    const missionIds = missions.map(m => m.id)
    const [passedRes, failedRes, ownSubs, peerPassed] = await Promise.all([
      supabaseAdmin.from("domain_submissions").select("id", { count: "exact", head: true })
        .eq("user_id", req.user.id).in("mission_id", missionIds).eq("passed", true),
      supabaseAdmin.from("domain_submissions").select("id", { count: "exact", head: true })
        .eq("user_id", req.user.id).in("mission_id", missionIds).eq("passed", false),
      supabaseAdmin.from("domain_submissions").select("mission_id, passed, execution_time_ms, created_at")
        .eq("user_id", req.user.id).in("mission_id", missionIds).order("created_at", { ascending: true }),
      // Peer benchmark only — every passed submission (any user) on this
      // role's missions, used solely to compute each mission's median
      // execution time. No individual peer data is ever returned.
      supabaseAdmin.from("domain_submissions").select("mission_id, execution_time_ms")
        .in("mission_id", missionIds).eq("passed", true).not("execution_time_ms", "is", null),
    ])
    if (passedRes.error) throw passedRes.error
    if (failedRes.error) throw failedRes.error
    if (ownSubs.error) throw ownSubs.error
    if (peerPassed.error) throw peerPassed.error

    const firstByMission = new Map()
    for (const s of ownSubs.data || []) {
      if (!firstByMission.has(s.mission_id)) firstByMission.set(s.mission_id, s)
    }
    const hasCleanPass = [...firstByMission.values()].some(s => s.passed)

    const timesByMission = new Map()
    for (const s of peerPassed.data || []) {
      if (!timesByMission.has(s.mission_id)) timesByMission.set(s.mission_id, [])
      timesByMission.get(s.mission_id).push(Number(s.execution_time_ms))
    }
    const medianOf = arr => {
      const sorted = [...arr].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }
    let hasFastPass = false
    for (const s of ownSubs.data || []) {
      if (!s.passed || s.execution_time_ms == null) continue
      const peerTimes = timesByMission.get(s.mission_id) || []
      if (peerTimes.length < 3) continue // not enough peer data yet for a meaningful median
      if (Number(s.execution_time_ms) <= medianOf(peerTimes)) { hasFastPass = true; break }
    }

    const passed = passedRes.count || 0
    const failed = failedRes.count || 0
    res.json({ passed, failed, totalAttempts: passed + failed, hasCleanPass, hasFastPass })
  } catch (err) {
    logger.error("[arenaDomainRole] GET /:roleId/history/counts failed", { err, userId: req.user?.id, roleId: req.params.roleId })
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/domain-role/:roleId/leaderboard
// Public read (like the rest of the catalog) — ranks users by their total
// ELO earned within THIS role's missions specifically (sum of elo_delta
// across passed domain_submissions), not the global profile ELO, since
// this is a role-scoped leaderboard. Real, computed from actual submission
// data — no placeholder numbers.
//
// Privacy default (assumption, flagged for review): shows first name +
// last-initial only, never email or full profile. Change the `displayName`
// derivation below if a different display policy is wanted.
//
// Extended 2026-08-18 (Phase 2) with two optional, additive query params —
// response shape is unchanged, so this is backward compatible with every
// existing caller:
//   - window: "all_time" (default, unchanged) | "weekly" | "monthly" —
//     filters domain_submissions by created_at before aggregating.
//   - scope: "role" (default, unchanged, this role's missions only) |
//     "global" (every Domain Role mission, any role — a cross-role
//     ranking) | "college" — NOT implemented. Returns 501 with the real
//     reason: student->college membership is split across two
//     non-unified pre-existing tables (org_members vs
//     institution_students, see routes/college.js), which is exactly the
//     kind of schema debt this phase was told not to touch. Documented
//     extension point rather than a guess, per the Phase 1 precedent.
const LEADERBOARD_WINDOW_MS = { weekly: 7 * 24 * 60 * 60 * 1000, monthly: 30 * 24 * 60 * 60 * 1000 }
router.get("/:roleId/leaderboard", optionalAuth, async (req, res) => {
  try {
    const scope = req.query.scope === "global" || req.query.scope === "college" ? req.query.scope : "role"
    if (scope === "college") {
      return res.status(501).json({
        error: "College leaderboard isn't available yet — student-to-college membership is currently split across two separate, unmerged tables (org_members and institution_students), so this can't be scoped correctly without picking one arbitrarily. Flagged as a real extension point, not built on a guess.",
      })
    }
    const window = LEADERBOARD_WINDOW_MS[req.query.window] ? req.query.window : "all_time"

    let missionIds = null
    if (scope === "role") {
      const { data: missions, error: missionsErr } = await supabaseAdmin
        .from("domain_missions").select("id").eq("domain_role_id", req.params.roleId)
      if (missionsErr) throw missionsErr
      if (!missions.length) return res.json({ leaderboard: [] })
      missionIds = missions.map(m => m.id)
    }
    // scope === "global": no mission_id filter at all — every passed
    // domain_submissions row across every Domain Role mission counts.

    let query = supabaseAdmin.from("domain_submissions").select("user_id, elo_delta").eq("passed", true)
    if (missionIds) query = query.in("mission_id", missionIds)
    if (window !== "all_time") {
      query = query.gte("created_at", new Date(Date.now() - LEADERBOARD_WINDOW_MS[window]).toISOString())
    }
    const { data: submissions, error } = await query
    if (error) throw error

    const totals = new Map()
    for (const s of submissions) {
      totals.set(s.user_id, (totals.get(s.user_id) || 0) + (s.elo_delta || 0))
    }
    if (totals.size === 0) return res.json({ leaderboard: [] })

    const userIds = [...totals.keys()]
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles").select("id, name, display_name, elo_rating").in("id", userIds)
    if (profErr) throw profErr
    const profileById = new Map(profiles.map(p => [p.id, p]))

    const rows = userIds
      .map(id => {
        const profile = profileById.get(id)
        const fullName = profile?.display_name || profile?.name || "Student"
        const parts = fullName.trim().split(/\s+/)
        const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0]
        // roleElo = earned within this role's missions specifically (existing
        // ranking metric, unchanged). totalElo = the student's real profile-
        // wide ELO (profiles.elo_rating) — shown alongside, not used for
        // sort order, since this leaderboard is intentionally role-scoped.
        return { userId: id, displayName, roleElo: totals.get(id), totalElo: profile?.elo_rating ?? null }
      })
      .sort((a, b) => b.roleElo - a.roleElo)
      .slice(0, 50)
      .map((row, i) => ({ rank: i + 1, ...row, isYou: req.user ? row.userId === req.user.id : false }))

    res.json({ leaderboard: rows })
  } catch (err) {
    console.error("[arenaDomainRole] GET /:roleId/leaderboard", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/domain-role/:roleId/missions
// List view — omits `dataset`/`expected_result`, keeps the list payload
// light. optionalAuth — when logged in, each mission carries a real
// `passed` flag (from the caller's own domain_submissions) so the
// Workspace grid can show completed missions as locked; logged-out or no
// attempts yet, every mission just comes back `passed: false`.
router.get("/:roleId/missions", optionalAuth, async (req, res) => {
  try {
    const { data: role, error: roleErr } = await supabaseAdmin
      .from("domain_roles").select("id, label, primary_panel_type").eq("id", req.params.roleId).maybeSingle()
    if (roleErr) throw roleErr
    if (!role) return res.status(404).json({ error: "Domain role not found" })

    const { data: missions, error } = await supabaseAdmin
      .from("domain_missions")
      .select("id, title, difficulty, elo_reward, time_limit_minutes, panel_type")
      .eq("domain_role_id", role.id)
      .order("created_at")
    if (error) throw error

    let passedIds = new Set()
    if (req.user && missions.length) {
      const { data: passed, error: passedErr } = await supabaseAdmin
        .from("domain_submissions").select("mission_id")
        .eq("user_id", req.user.id).eq("passed", true).in("mission_id", missions.map(m => m.id))
      if (passedErr) throw passedErr
      passedIds = new Set((passed || []).map(p => p.mission_id))
    }

    res.json({ role, missions: missions.map(m => ({ ...m, passed: passedIds.has(m.id) })) })
  } catch (err) {
    console.error("[arenaDomainRole] GET /:roleId/missions", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/domain-role/missions/:id
// Full prompt + a preview of the seed dataset (so the student can see what
// they're querying). Deliberately excludes `expected_result` and the full
// `dataset` object (only a bounded preview) — never leaks the answer.
router.get("/missions/:id", async (req, res) => {
  try {
    const { data: mission, error } = await supabaseAdmin
      .from("domain_missions")
      .select("id, title, prompt, difficulty, elo_reward, time_limit_minutes, panel_type, domain_role_id, dataset, company, manager, sprint, estimated_minutes, rubric")
      .eq("id", req.params.id)
      .maybeSingle()
    if (error) throw error
    if (!mission) return res.status(404).json({ error: "Mission not found" })

    const preview = mission.dataset
      ? { columns: mission.dataset.columns, rows: (mission.dataset.rows || []).slice(0, 5) }
      : null

    res.json({
      mission: {
        id: mission.id,
        title: mission.title,
        prompt: mission.prompt,
        difficulty: mission.difficulty,
        elo_reward: mission.elo_reward,
        time_limit_minutes: mission.time_limit_minutes,
        panel_type: mission.panel_type,
        domain_role_id: mission.domain_role_id,
        dataset_preview: preview,
        company: mission.company,
        manager: mission.manager,
        sprint: mission.sprint,
        estimated_minutes: mission.estimated_minutes,
        // Ticket context only — never expected_stdout/expected_result/
        // timeout_ms, which would leak the grading answer to the client
        // (see this route's own header comment on dataset_preview above,
        // same discipline extended to rubric).
        starter_code: mission.rubric?.starter_code ?? null,
        starter_query: mission.rubric?.starter_query ?? null,
        requirements: mission.rubric?.requirements ?? null,
        acceptance_criteria: mission.rubric?.acceptance_criteria ?? null,
        // frontend_runner only — the FIXED HTML markup the student's CSS
        // renders against (never editable, never graded — only starter_code,
        // the CSS, is submitted/scored). See cssRuleChecker.js.
        html: mission.rubric?.html ?? null,
      },
    })
  } catch (err) {
    console.error("[arenaDomainRole] GET /missions/:id", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// POST /api/arena/domain-role/missions/:id/validate  (Phase 2, 2026-08-18)
// A genuine, non-scoring "Run" — the workspace previously had only one
// execution path (Submit), which is a real, scored, once-only attempt.
// This lets a student iterate against the sandbox before committing to a
// real Submit, the way any real query tool separates "run" from "commit."
//
// Reuses runAgainstDataset unchanged (same sandbox, same integrity
// discipline) but never loads expected_result/match_mode (same leak-
// prevention as GET /missions/:id below) and never writes anything —
// no domain_submissions row, no ELO, no quota consumption. Purely a
// read against the ephemeral sandbox, safe to call repeatedly.
router.post("/missions/:id/validate", optionalAuth, sqlValidateLimiter, async (req, res) => {
  try {
    const { sql } = req.body || {}
    if (!sql || typeof sql !== "string" || !sql.trim()) {
      return res.status(400).json({ error: "sql is required" })
    }

    const { data: mission, error: missionErr } = await supabaseAdmin
      .from("domain_missions")
      .select("id, dataset, panel_type")
      .eq("id", req.params.id)
      .maybeSingle()
    if (missionErr) throw missionErr
    if (!mission) return res.status(404).json({ error: "Mission not found" })

    let actual
    try {
      actual = await executeMission(mission, sql)
    } catch (err) {
      if (err.notImplemented) return res.status(400).json({ error: err.message })
      if (err instanceof SqlSandboxError) {
        return res.status(400).json({ error: err.message })
      }
      throw err
    }

    // Only real, mechanically-derived warnings — never a fabricated
    // "confidence" or "possible match" signal (the latter would require
    // comparing against expected_result, which this endpoint deliberately
    // never loads).
    const warnings = []
    if (!actual.rows || actual.rows.length === 0) warnings.push("Query returned 0 rows.")
    if (actual.executionTimeMs > 200) warnings.push(`Query took ${actual.executionTimeMs}ms — unusually slow for a dataset this small, check for an unintended cross join.`)

    const MAX_PREVIEW_ROWS = 50
    res.json({
      columns: actual.columns,
      rows: (actual.rows || []).slice(0, MAX_PREVIEW_ROWS),
      rowCount: (actual.rows || []).length,
      executionTimeMs: actual.executionTimeMs,
      warnings,
    })
  } catch (err) {
    console.error("[arenaDomainRole] POST /missions/:id/validate", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// POST /api/arena/domain-role/missions/:id/submit
// Auth required — writes a domain_submissions row under the caller's own
// user_id. Executes the submitted SQL in an ephemeral sandboxed in-memory
// database (never against real application tables), compares to
// expected_result server-side, persists score/passed/elo_delta in the same
// write — nothing here can drift out of sync.
router.post("/missions/:id/submit", requireAuth, async (req, res) => {
  try {
    // `sql` stays the field name every existing sql_runner caller
    // (SqlWorkspace.jsx) already posts — `code` is the generic name a new
    // python_runner (or future) workstation posts instead. Both resolve
    // to the same "candidate submission text" the execute/evaluate
    // registries receive; they don't care which field name it came from.
    const submittedText = req.body?.sql ?? req.body?.code
    if (!submittedText || typeof submittedText !== "string" || !submittedText.trim()) {
      return res.status(400).json({ error: "sql is required" })
    }
    const sql = submittedText

    // skill_graph_node_id + the embedded skill_graph_nodes(label) (2026-09-04
    // Arena evidence fix) — the only addition to this SELECT; every other
    // field is unchanged. Lets this route reinforce the correct skill
    // evidence and label arena_history with a real skill name, without
    // touching evaluation/scoring at all.
    const { data: mission, error: missionErr } = await supabaseAdmin
      .from("domain_missions")
      .select("id, title, prompt, dataset, expected_result, match_mode, rubric, reference_solution, elo_reward, difficulty, panel_type, domain_role_id, skill_graph_node_id, domain_roles(label), skill_graph_nodes(label)")
      .eq("id", req.params.id)
      .maybeSingle()
    if (missionErr) throw missionErr
    if (!mission) return res.status(404).json({ error: "Mission not found" })

    // Locked once passed — a completed task cannot be resubmitted. Checked
    // server-side (not just hidden client-side) since the client can't be
    // trusted to enforce this on its own.
    const { data: existingPass, error: passCheckErr } = await supabaseAdmin
      .from("domain_submissions")
      .select("id").eq("user_id", req.user.id).eq("mission_id", mission.id).eq("passed", true)
      .limit(1).maybeSingle()
    if (passCheckErr) throw passCheckErr
    if (existingPass) {
      return res.status(409).json({ error: "This mission is already completed and locked." })
    }

    // Daily quota, enforced here (not just at GET /next-mission, which is
    // display-only) — the Workspace tab now lets a student open ANY of
    // their role's missions directly, so quota has to be authoritative at
    // the point of submission or a client could bypass it entirely.
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles").select("subscription").eq("id", req.user.id).maybeSingle()
    if (profileErr) throw profileErr
    const limit = DAILY_QUOTA[profile?.subscription] ?? DAILY_QUOTA.free
    const { data: roleMissions, error: roleMissionsErr } = await supabaseAdmin
      .from("domain_missions").select("id").eq("domain_role_id", mission.domain_role_id)
    if (roleMissionsErr) throw roleMissionsErr
    const windowStart = new Date(Date.now() - QUOTA_WINDOW_MS).toISOString()
    const { data: recentPasses, error: recentErr } = await supabaseAdmin
      .from("domain_submissions").select("created_at")
      .eq("user_id", req.user.id).eq("passed", true)
      .in("mission_id", roleMissions.map(m => m.id))
      .gte("created_at", windowStart).order("created_at")
    if (recentErr) throw recentErr
    if ((recentPasses || []).length >= limit) {
      const nextUnlockAt = new Date(new Date(recentPasses[0].created_at).getTime() + QUOTA_WINDOW_MS).toISOString()
      return res.status(429).json({ error: "Daily task quota reached for this role.", nextUnlockAt })
    }

    let actual
    try {
      actual = await executeMission(mission, sql)
    } catch (err) {
      if (err.notImplemented) return res.status(400).json({ error: err.message })
      if (err instanceof SqlSandboxError) {
        const sandboxErr = err
        // Write the failed attempt too — a submission record should exist
        // for every attempt, not just passing ones, for the same
        // idempotent-audit-trail reason as the College Stream branch.
        const eloDelta = -(ELO_FAIL_PENALTY[mission.difficulty] ?? 2)
        const { data: submission, error: subErr } = await supabaseAdmin
          .from("domain_submissions")
          .insert({
            user_id: req.user.id, mission_id: mission.id, sql_text: sql,
            passed: false, score: 0, elo_delta: eloDelta, error: sandboxErr.message,
          })
          .select("id, score, passed, elo_delta")
          .single()
        if (subErr) throw subErr
        await bumpProfileElo(req.user.id, eloDelta)
        await recordArenaHistory({
          user_id: req.user.id, task_id: mission.id, title: mission.title || "Domain Challenge",
          domain: mission.domain_roles?.label || "domain", difficulty: mission.difficulty,
          type: "domain", score: 0, elo_delta: eloDelta,
          skill_name: mission.skill_graph_nodes?.label || null, skill_category: mission.panel_type || null,
        })
        // A sandbox error (e.g. invalid SQL) is still real, informative
        // evidence — the same category of signal Skill Studio's own quiz
        // mistakes already reinforce as "incorrect". Best-effort, never
        // blocks the response (see reinforceArenaSubmission's own contract).
        await reinforceArenaSubmission({
          userId: req.user.id, skillGraphNodeId: mission.skill_graph_node_id, domainKey: mission.domain_role_id,
          correct: false, score: 0, difficulty: mission.difficulty,
          submissionTable: "domain_submissions", submissionId: submission.id,
        })
        return res.json({ submission: { ...submission, feedback: sandboxErr.message } })
      }
      throw err
    }

    const comparison = evaluateMission(mission.panel_type, actual, mission)
    const { checklist, insight } = comparison
    const eloDelta = comparison.passed ? mission.elo_reward : -(ELO_FAIL_PENALTY[mission.difficulty] ?? 2)
    // Best-effort — never blocks the response, never changes score/passed/elo.
    // Branches on panel_type family: sql_runner's actual has
    // {columns,rows}; the code-execution panel types (python_runner,
    // node_runner) share {stdout,stderr}; frontend_runner has
    // {parsed,parseError,results} — three genuinely different shapes, not
    // something one prompt/vars set can honestly cover (see
    // generateCodeAiFeedback's header comment).
    const CODE_EXECUTION_PANEL_TYPES = new Set(["python_runner", "node_runner"])
    const isCodeExecution = CODE_EXECUTION_PANEL_TYPES.has(mission.panel_type)
    const isFrontendExecution = mission.panel_type === "frontend_runner"
    const aiFeedback = isFrontendExecution
      ? await generateFrontendAiFeedback({
          prompt: mission.prompt, css: sql, passed: comparison.passed, score: comparison.score, reason: comparison.reason, actual,
        })
      : isCodeExecution
      ? await generateCodeAiFeedback({
          prompt: mission.prompt, code: sql, passed: comparison.passed, score: comparison.score, reason: comparison.reason, actual,
        })
      : await generateAiFeedback({
          prompt: mission.prompt, sql, passed: comparison.passed, score: comparison.score, reason: comparison.reason,
          actual, expected: mission.expected_result,
        })

    // result_json shape also branches per panel_type family for the same
    // reason — stored as-attempted so History can render it later without
    // re-running the sandbox (which could drift if seed data/rubric is
    // ever edited — a record of what was true at submission time).
    const resultJson = isFrontendExecution
      ? { parsed: actual.parsed, parseError: actual.parseError, checks: actual.results }
      : isCodeExecution
      ? { stdout: actual.stdout, stderr: actual.stderr }
      : { columns: actual.columns, rows: actual.rows }

    const { data: submission, error: subErr } = await supabaseAdmin
      .from("domain_submissions")
      .insert({
        user_id: req.user.id,
        mission_id: mission.id,
        sql_text: sql,
        passed: comparison.passed,
        score: comparison.score,
        elo_delta: eloDelta,
        error: comparison.reason,
        result_json: resultJson,
        checklist_json: checklist,
        insight,
        execution_time_ms: actual.executionTimeMs,
        ai_feedback: aiFeedback,
      })
      .select("id, score, passed, elo_delta")
      .single()
    if (subErr) {
      // 23505 = unique_violation — DB-level backstop for the check-then-
      // insert race in the "already completed" SELECT above
      // (uq_domain_submissions_one_pass_per_user). Two near-simultaneous
      // requests can both pass that check; only one INSERT can win. The
      // loser gets the same 409 a sequential duplicate would.
      if (subErr.code === "23505") {
        return res.status(409).json({ error: "This mission is already completed and locked." })
      }
      throw subErr
    }

    await bumpProfileElo(req.user.id, eloDelta)
    await recordArenaHistory({
      user_id: req.user.id, task_id: mission.id, title: mission.title || "Domain Challenge",
      domain: mission.domain_roles?.label || "domain", difficulty: mission.difficulty,
      type: "domain", score: comparison.score, elo_delta: eloDelta,
      skill_name: mission.skill_graph_nodes?.label || null, skill_category: mission.panel_type || null,
    })
    // The actual fix: connect this result to skill evidence (memory_states)
    // and, through that, back to profiles.skill_graph/Aura's radar. See
    // arenaReinforcement.js's header for the full contract. Best-effort,
    // never blocks this response — same convention as the two calls above.
    await reinforceArenaSubmission({
      userId: req.user.id, skillGraphNodeId: mission.skill_graph_node_id, domainKey: mission.domain_role_id,
      correct: comparison.passed, score: comparison.score, difficulty: mission.difficulty,
      submissionTable: "domain_submissions", submissionId: submission.id,
    })

    res.json({
      submission: {
        ...submission,
        feedback: comparison.reason,
        ai_feedback: aiFeedback,
        result: resultJson,
        execution_time_ms: actual.executionTimeMs,
        checklist,
        insight,
      },
    })
  } catch (err) {
    console.error("[arenaDomainRole] POST /missions/:id/submit", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
