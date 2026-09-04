/**
 * routes/arenaCollegeStream.js — Arena rebuild, Phase 1 — College Stream branch
 * ---------------------------------------------------------------------------
 * Static, curriculum-aligned, rule-based. ZERO Groq/AI calls anywhere in
 * this file — evaluation runs entirely through
 * lib/collegeStream/evaluator.js's pure-function rubric checks.
 *
 * Structurally separate from the not-yet-built Domain Role branch (own
 * tables, own route file, mounted at its own prefix) per the rebuild spec —
 * the two branches must never share a code path.
 *
 * Curriculum reads (streams/semesters/subjects/units/experiments) are
 * public — same discipline as routes/proofs.js and routes/education.js's
 * GET /profile/:userId (no auth required to browse the curriculum tree).
 * Submitting an answer requires auth — a submission is tied to a real user
 * and awards real ELO.
 *
 * IMPORTANT: reference_solution is never sent to the client on curriculum
 * reads — only revealed (if ever) after a passing submission, and even then
 * not by this Phase yet. Leaking it in the experiment list/detail response
 * would let students see the answer before attempting.
 */
import { Router } from "express"
import { requireAuth, optionalAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { evaluate, EvaluatorError } from "../lib/collegeStream/evaluator.js"
import { evaluatePythonStdout, PythonSandboxError, PythonSandboxBusyError } from "../lib/collegeStream/pythonSandbox.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { codeExecutionLimiter } from "../lib/rateLimiters.js"
import { logger } from "../lib/logger.js"
// Generic list-pagination infrastructure, not evaluation/scoring logic —
// sharing this does not cross the branch-independence line the
// ELO_FAIL_PENALTY comment above draws; requireAuth/logger/supabaseAdmin
// are already shared the same way.
import { decodeCursor, encodeCursor } from "../lib/pagination.js"
import { reinforceArenaSubmission } from "../lib/skillStudio/arenaReinforcement.js"

const router = Router()

// Reverse of loadCollegeStreamTasks's forward stream->...->experiments walk
// (selectionEngine.js) — given one experiment's unit_id, resolve its stream
// slug, needed as the domainKey for syncSkillGraphFromMemoryStates after
// reinforcement (2026-09-04 Arena evidence fix). Uses the SAME authoritative
// semester_subjects many-to-many join contextResolution.js and
// selectionEngine.js already use — NOT subjects.semester_id, which is stale/
// unreliable (see contextResolution.js's file header for why). A single-row
// lookup on the submit path, not a hot loop, so 3 small sequential queries
// is the right tradeoff over a bulk-oriented join used elsewhere.
async function resolveStreamSlugForUnit(unitId) {
  const { data: unit } = await supabaseAdmin.from("units").select("subject_id").eq("id", unitId).maybeSingle()
  if (!unit) return null
  const { data: link } = await supabaseAdmin.from("semester_subjects").select("semester_id").eq("subject_id", unit.subject_id).limit(1).maybeSingle()
  if (!link) return null
  const { data: semester } = await supabaseAdmin.from("semesters").select("stream_id").eq("id", link.semester_id).maybeSingle()
  if (!semester) return null
  const { data: stream } = await supabaseAdmin.from("streams").select("slug").eq("id", semester.stream_id).maybeSingle()
  return stream?.slug || null
}

// Same deterministic fail-penalty scheme as the Domain Role branch (see
// ELO_FAIL_PENALTY in arenaDomainRole.js) — kept as its own copy rather than
// a shared import specifically because the two branches must stay
// structurally independent (never share an evaluation code path), even
// though the numbers happen to match right now.
const ELO_FAIL_PENALTY = { easy: 2, medium: 3, hard: 5 }

// History pagination — same defaults as careerEventsV1.js's timeline
// endpoint and arenaDomainRole.js's history route.
const DEFAULT_HISTORY_LIMIT = 20
const MAX_HISTORY_LIMIT = 100

// Common Challenge Framework — progression tiers (Phase 2). Experiments
// with tier = null are untiered/legacy and always unlocked, same as before
// this framework existed — nothing breaks for content that hasn't been
// migrated into a tier yet.
const TIER_ORDER = ["foundation", "core", "applied", "industry", "master"]

// ASSUMPTION (flagged for review): a tier unlocks once the student has
// passed at least half of the previous tier's experiments in that stream
// (rounded up, minimum 1). Deterministic and cheap to compute from data
// already being fetched — no external config needed yet. If a tier has
// zero experiments, it can't gate anything after it, so the next tier is
// treated as unlocked.
function computeTierLocks(tieredExperiments, passedIds) {
  const countsByTier = new Map()
  for (const e of tieredExperiments) {
    if (!e.tier) continue
    if (!countsByTier.has(e.tier)) countsByTier.set(e.tier, { total: 0, passed: 0 })
    const c = countsByTier.get(e.tier)
    c.total += 1
    if (passedIds.has(e.id)) c.passed += 1
  }
  const unlockedTiers = new Set([TIER_ORDER[0]])
  for (let i = 1; i < TIER_ORDER.length; i++) {
    const prevTier = TIER_ORDER[i - 1]
    const prevCounts = countsByTier.get(prevTier)
    if (!prevCounts || prevCounts.total === 0) {
      // Previous tier has no content seeded — can't gate on it.
      unlockedTiers.add(TIER_ORDER[i])
      continue
    }
    const required = Math.max(1, Math.ceil(prevCounts.total / 2))
    if (prevCounts.passed >= required) unlockedTiers.add(TIER_ORDER[i])
  }
  return unlockedTiers
}

// Best-effort AI *explanation* layered on top of the already-final,
// deterministic score/passed/elo_delta from the rubric evaluator — never
// the other way around. Returns null (silently) on any failure so a
// submission never blocks or errors on this.
// Settings/Security redesign (2026-09-02): AI Preferences' "Arena Feedback
// Style" previously wrote to a nonexistent column (see ai_preferences
// migration header) and was never read by anything — this is its first
// real consumer. feedbackStyle is looked up by the caller (ai_preferences
// table) and passed in; defaults to "detailed" (this function's original,
// unchanged behavior) when absent, so a user who's never touched AI
// Preferences sees no change at all.
const FEEDBACK_STYLE_INSTRUCTION = {
  concise: "In exactly 1 short sentence, explain the result plainly using ONLY the facts given.",
  detailed: "In 2-3 short sentences, explain the result plainly using ONLY the facts given.",
}

async function generateAiFeedback({ prompt, answer, passed, score, feedbackStyle = "detailed" }) {
  if (!process.env.GROQ_API_KEY) return null
  try {
    const styleInstruction = FEEDBACK_STYLE_INSTRUCTION[feedbackStyle] || FEEDBACK_STYLE_INSTRUCTION.detailed
    const text = await groq([
      {
        role: "system",
        content: `You coach students on curriculum experiment attempts. ${styleInstruction} Never invent a pass/fail verdict or a score; those are already decided and given to you as fact.`,
      },
      {
        role: "user",
        content: `Experiment prompt: ${prompt}\nSubmitted answer: ${typeof answer === "object" ? JSON.stringify(answer) : answer}\nResult: ${passed ? "PASSED" : "FAILED"} (score ${score}/100)`,
      },
    ], { model: GROQ_FAST, max_tokens: 150, temperature: 0.4 })
    return text?.trim() || null
  } catch (err) {
    console.error("[arenaCollegeStream] AI feedback generation failed (non-blocking)", err.message)
    return null
  }
}

// Resolves every subject taught under a given set of semesters — via the
// `semester_subjects` join table, NOT subjects.semester_id directly. A
// subject can be linked to more than one semester (e.g. Data Structures &
// Algorithms is one physical subject/unit/experiment set, shared across
// CSE/AI & Data Science/AI & Machine Learning/Cyber Security/MCA's own
// Semester 3 rows) — subjects.semester_id only ever reflected one arbitrary
// owner, so every route that lists subjects-for-a-semester goes through
// this helper now instead. Each returned subject carries the *calling*
// semester's own id (from the join row), not whatever semester the raw
// subjects row happens to point at — that's what keeps ordering/display
// correct per-stream.
async function getSubjectsForSemesters(semesterIds) {
  if (!semesterIds.length) return []
  const { data: links, error: linkErr } = await supabaseAdmin
    .from("semester_subjects").select("semester_id, subject_id").in("semester_id", semesterIds)
  if (linkErr) throw linkErr
  if (!links.length) return []

  const subjectIds = [...new Set(links.map(l => l.subject_id))]
  const { data: subjects, error: subErr } = await supabaseAdmin
    .from("subjects").select("id, name, slug").in("id", subjectIds)
  if (subErr) throw subErr
  const subjectById = new Map(subjects.map(s => [s.id, s]))

  return links
    .map(l => {
      const subject = subjectById.get(l.subject_id)
      return subject ? { ...subject, semester_id: l.semester_id } : null
    })
    .filter(Boolean)
}

// Shared by next-experiment/history/leaderboard/streak below — all four
// need "every experiment id under this stream" and would otherwise repeat
// the same semester -> subject -> unit -> experiment join four times.
// Walks unit -> subject -> semester -> stream to find which stream a given
// experiment belongs to. Needed at submit time because the submit route
// only has the experiment id, not its stream context.
async function getStreamIdForUnit(unitId) {
  if (!unitId) return null
  const { data: unit, error: unitErr } = await supabaseAdmin
    .from("units").select("subject_id").eq("id", unitId).maybeSingle()
  if (unitErr) throw unitErr
  if (!unit) return null

  const { data: link, error: linkErr } = await supabaseAdmin
    .from("semester_subjects").select("semester_id").eq("subject_id", unit.subject_id).limit(1).maybeSingle()
  if (linkErr) throw linkErr
  if (!link) return null

  const { data: semester, error: semErr } = await supabaseAdmin
    .from("semesters").select("stream_id").eq("id", link.semester_id).maybeSingle()
  if (semErr) throw semErr
  return semester?.stream_id || null
}

// Server-side tier gate check for a single submission — mirrors the same
// computeTierLocks logic used by GET /streams/:slug/all-experiments so the
// two never drift. Never trust the client's displayed lock state.
async function isExperimentTierLocked(experiment, userId) {
  if (!experiment.tier || experiment.tier === TIER_ORDER[0]) return false

  const streamId = await getStreamIdForUnit(experiment.unit_id)
  if (!streamId) return false // orphaned unit — fail open rather than block a legitimate attempt

  const experimentIds = await getStreamExperimentIds(streamId)
  if (!experimentIds.length) return false

  const { data: tieredExperiments, error: tierErr } = await supabaseAdmin
    .from("experiments").select("id, tier").in("id", experimentIds)
  if (tierErr) throw tierErr

  const { data: passed, error: passedErr } = await supabaseAdmin
    .from("college_submissions").select("experiment_id")
    .eq("user_id", userId).eq("passed", true).in("experiment_id", experimentIds)
  if (passedErr) throw passedErr
  const passedIds = new Set((passed || []).map(p => p.experiment_id))

  const unlockedTiers = computeTierLocks(tieredExperiments, passedIds)
  return !unlockedTiers.has(experiment.tier)
}

async function getStreamExperimentIds(streamId) {
  const { data: semesters, error: semErr } = await supabaseAdmin
    .from("semesters").select("id").eq("stream_id", streamId)
  if (semErr) throw semErr
  if (!semesters.length) return []

  const subjects = await getSubjectsForSemesters(semesters.map(s => s.id))
  if (!subjects.length) return []

  const { data: units, error: unitErr } = await supabaseAdmin
    .from("units").select("id").in("subject_id", subjects.map(s => s.id))
  if (unitErr) throw unitErr
  if (!units.length) return []

  const { data: experiments, error: expErr } = await supabaseAdmin
    .from("experiments").select("id").in("unit_id", units.map(u => u.id))
  if (expErr) throw expErr
  return (experiments || []).map(e => e.id)
}

// GET /api/arena/college-stream/streams/:slug/all-experiments
// Flat list of every experiment in this stream's curriculum (across all
// semesters/subjects/units), each carrying its curriculum breadcrumb
// (semester number, subject name, unit title) and — when logged in — a
// real `passed` flag. This is what the LeetCode-style Academic Workspace
// grid renders directly, instead of the semester -> subject -> unit
// drill-down. optionalAuth: browsable logged out, `passed` populated when
// logged in.
router.get("/streams/:slug/all-experiments", optionalAuth, async (req, res) => {
  try {
    const { data: stream, error: streamErr } = await supabaseAdmin
      .from("streams").select("id, name, slug").eq("slug", req.params.slug).maybeSingle()
    if (streamErr) throw streamErr
    if (!stream) return res.status(404).json({ error: "Stream not found" })

    const { data: categories, error: catErr } = await supabaseAdmin
      .from("stream_categories").select("name, sequence").eq("stream_id", stream.id).order("sequence")
    if (catErr) throw catErr
    const { data: workspaceConfig } = await supabaseAdmin
      .from("stream_workspace_config").select("workspace_type").eq("stream_id", stream.id).maybeSingle()
    const workspaceType = workspaceConfig?.workspace_type || "text_answer"

    const { data: semesters, error: semErr } = await supabaseAdmin
      .from("semesters").select("id, number").eq("stream_id", stream.id).order("number")
    if (semErr) throw semErr
    if (!semesters.length) return res.json({ stream, experiments: [], categories: categories || [], workspaceType })

    const subjects = await getSubjectsForSemesters(semesters.map(s => s.id))
    if (!subjects.length) return res.json({ stream, experiments: [], categories: categories || [], workspaceType })

    const { data: units, error: unitErr } = await supabaseAdmin
      .from("units").select("id, title, subject_id, sequence").in("subject_id", subjects.map(s => s.id)).order("sequence")
    if (unitErr) throw unitErr
    if (!units.length) return res.json({ stream, experiments: [], categories: categories || [], workspaceType })

    const { data: experiments, error: expErr } = await supabaseAdmin
      .from("experiments")
      .select("id, title, difficulty, elo_reward, time_limit_minutes, unit_id, tier, challenge_type, category")
      .in("unit_id", units.map(u => u.id))
      .order("created_at")
    if (expErr) throw expErr

    let passedIds = new Set()
    if (req.user && experiments.length) {
      const { data: passed, error: passedErr } = await supabaseAdmin
        .from("college_submissions").select("experiment_id")
        .eq("user_id", req.user.id).eq("passed", true).in("experiment_id", experiments.map(e => e.id))
      if (passedErr) throw passedErr
      passedIds = new Set((passed || []).map(p => p.experiment_id))
    }

    const semesterById = new Map(semesters.map(s => [s.id, s]))
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const unitById = new Map(units.map(u => [u.id, u]))
    const unlockedTiers = computeTierLocks(experiments, passedIds)

    const flat = experiments
      .map(e => {
        const unit = unitById.get(e.unit_id)
        const subject = subjectById.get(unit?.subject_id)
        const semester = semesterById.get(subject?.semester_id)
        const passed = passedIds.has(e.id)
        // Untiered (legacy) experiments are never tier-locked — same
        // behavior as before this framework existed.
        const tierLocked = !passed && !!e.tier && !unlockedTiers.has(e.tier)
        return {
          ...e,
          unit_title: unit?.title || null,
          subject_name: subject?.name || null,
          semester_number: semester?.number || null,
          passed,
          tierLocked,
        }
      })
      .sort((a, b) => (a.semester_number || 0) - (b.semester_number || 0) || (a.subject_name || "").localeCompare(b.subject_name || ""))

    res.json({ stream, experiments: flat, categories: categories || [], workspaceType })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /streams/:slug/all-experiments", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/streams/:slug/next-experiment
// Generic across ALL 10 seeded streams, not just CSE — walks whatever
// semester -> subject -> unit -> experiment tree exists for the given
// stream, in curriculum order, and returns the first experiment the
// caller hasn't passed yet. For the 9 streams with no content seeded past
// the bare stream row, this honestly returns experiment: null /
// totalExperiments: 0 instead of fabricating one.
// optionalAuth — browsable logged out (first experiment overall),
// personalized when logged in (skips experiments already passed).
router.get("/streams/:slug/next-experiment", optionalAuth, async (req, res) => {
  try {
    const { data: stream, error: streamErr } = await supabaseAdmin
      .from("streams").select("id, name, slug").eq("slug", req.params.slug).maybeSingle()
    if (streamErr) throw streamErr
    if (!stream) return res.status(404).json({ error: "Stream not found" })

    const { data: semesters, error: semErr } = await supabaseAdmin
      .from("semesters").select("id, number").eq("stream_id", stream.id).order("number")
    if (semErr) throw semErr
    if (!semesters.length) return res.json({ stream, next: null, totalExperiments: 0, completed: false })

    const subjects = (await getSubjectsForSemesters(semesters.map(s => s.id))).sort((a, b) => a.name.localeCompare(b.name))
    if (!subjects.length) return res.json({ stream, next: null, totalExperiments: 0, completed: false })

    const { data: units, error: unitErr } = await supabaseAdmin
      .from("units").select("id, title, subject_id, sequence").in("subject_id", subjects.map(s => s.id)).order("sequence")
    if (unitErr) throw unitErr
    if (!units.length) return res.json({ stream, next: null, totalExperiments: 0, completed: false })

    const { data: experiments, error: expErr } = await supabaseAdmin
      .from("experiments").select("id, title, difficulty, elo_reward, time_limit_minutes, unit_id").in("unit_id", units.map(u => u.id)).order("created_at")
    if (expErr) throw expErr
    if (!experiments.length) return res.json({ stream, next: null, totalExperiments: 0, completed: false })

    let passedIds = new Set()
    if (req.user) {
      const { data: passed, error: passedErr } = await supabaseAdmin
        .from("college_submissions")
        .select("experiment_id")
        .eq("user_id", req.user.id)
        .eq("passed", true)
        .in("experiment_id", experiments.map(e => e.id))
      if (passedErr) throw passedErr
      passedIds = new Set((passed || []).map(p => p.experiment_id))
    }

    const semesterById = new Map(semesters.map(s => [s.id, s]))
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const unitById = new Map(units.map(u => [u.id, u]))

    // Curriculum order: semester number -> subject name -> unit sequence ->
    // experiment created_at. Rebuild that order explicitly rather than
    // trusting the flat experiments array's incidental order.
    const orderedExperiments = [...experiments].sort((a, b) => {
      const unitA = unitById.get(a.unit_id), unitB = unitById.get(b.unit_id)
      const subA = subjectById.get(unitA?.subject_id), subB = subjectById.get(unitB?.subject_id)
      const semA = semesterById.get(subA?.semester_id), semB = semesterById.get(subB?.semester_id)
      if ((semA?.number || 0) !== (semB?.number || 0)) return (semA?.number || 0) - (semB?.number || 0)
      if ((subA?.name || "") !== (subB?.name || "")) return (subA?.name || "").localeCompare(subB?.name || "")
      return (unitA?.sequence || 0) - (unitB?.sequence || 0)
    })

    const next = orderedExperiments.find(e => !passedIds.has(e.id)) || null
    let context = null
    if (next) {
      const unit = unitById.get(next.unit_id)
      const subject = subjectById.get(unit?.subject_id)
      const semester = semesterById.get(subject?.semester_id)
      context = { experiment: next, unit, subject, semester }
    }

    res.json({
      stream,
      next: context,
      totalExperiments: experiments.length,
      completed: experiments.length > 0 && next === null,
    })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /streams/:slug/next-experiment", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/streams/:slug/history
// Auth required — the caller's own submission history only, for this
// stream's experiments.
//
// Cursor-paginated (lib/pagination.js) and filterable by `passed`, mirroring
// arenaDomainRole.js's history route exactly — same reasoning: the previous
// unconditional `.limit(50)` silently truncated any user past their 50th
// attempt with no way to reach the rest.
router.get("/streams/:slug/history", requireAuth, async (req, res) => {
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

    const { data: stream, error: streamErr } = await supabaseAdmin
      .from("streams").select("id, name, slug").eq("slug", req.params.slug).maybeSingle()
    if (streamErr) throw streamErr
    if (!stream) return res.status(404).json({ error: "Stream not found" })

    const experimentIds = await getStreamExperimentIds(stream.id)
    if (!experimentIds.length) return res.json({ history: [], pagination: { hasMore: false, nextCursor: null } })

    // `prompt` joined in for the "scenario given" view in History — the
    // rubric/reference_solution stay excluded (never leave the server),
    // same as GET /experiments/:id.
    const { data: experiments, error: expErr } = await supabaseAdmin
      .from("experiments").select("id, title, difficulty, prompt").in("id", experimentIds)
    if (expErr) throw expErr
    const experimentById = new Map(experiments.map(e => [e.id, e]))

    let q = supabaseAdmin
      .from("college_submissions")
      .select("id, experiment_id, passed, score, elo_delta, answer, ai_feedback, execution_output, submitted_at")
      .eq("user_id", req.user.id)
      .in("experiment_id", experimentIds)
      .order("submitted_at", { ascending: false })
      .limit(limit + 1) // +1 lookahead row to compute hasMore without a separate count query

    if (passedFilter !== null) q = q.eq("passed", passedFilter)
    if (cursor) q = q.lt("submitted_at", cursor)

    const { data: submissions, error } = await q
    if (error) throw error

    const hasMore = submissions.length > limit
    const page = hasMore ? submissions.slice(0, limit) : submissions
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1], "submitted_at") : null

    const history = page.map(s => {
      const experiment = experimentById.get(s.experiment_id)
      return {
        ...s,
        experiment_title: experiment?.title || "(deleted experiment)",
        difficulty: experiment?.difficulty || null,
        prompt: experiment?.prompt || null,
      }
    })
    res.json({ history, pagination: { hasMore, nextCursor } })
  } catch (err) {
    logger.error("[arenaCollegeStream] GET /streams/:slug/history failed", { err, userId: req.user?.id, slug: req.params.slug })
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/streams/:slug/history/counts
// Auth required — passed/failed totals for the caller's own submissions in
// this stream, used to label the History tab's "Passed (N)" / "Failed (N)"
// toggle buttons without fetching full history just to count it.
router.get("/streams/:slug/history/counts", requireAuth, async (req, res) => {
  try {
    const { data: stream, error: streamErr } = await supabaseAdmin
      .from("streams").select("id").eq("slug", req.params.slug).maybeSingle()
    if (streamErr) throw streamErr
    if (!stream) return res.status(404).json({ error: "Stream not found" })

    const experimentIds = await getStreamExperimentIds(stream.id)
    if (!experimentIds.length) return res.json({ passed: 0, failed: 0 })

    const [passedRes, failedRes] = await Promise.all([
      supabaseAdmin.from("college_submissions").select("id", { count: "exact", head: true })
        .eq("user_id", req.user.id).in("experiment_id", experimentIds).eq("passed", true),
      supabaseAdmin.from("college_submissions").select("id", { count: "exact", head: true })
        .eq("user_id", req.user.id).in("experiment_id", experimentIds).eq("passed", false),
    ])
    if (passedRes.error) throw passedRes.error
    if (failedRes.error) throw failedRes.error

    res.json({ passed: passedRes.count || 0, failed: failedRes.count || 0 })
  } catch (err) {
    logger.error("[arenaCollegeStream] GET /streams/:slug/history/counts failed", { err, userId: req.user?.id, slug: req.params.slug })
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/streams/:slug/leaderboard
// Public read — ranks users by total ELO earned within this stream's
// experiments specifically. Same privacy default as the Domain Role
// leaderboard: first name + last-initial only.
router.get("/streams/:slug/leaderboard", optionalAuth, async (req, res) => {
  try {
    const { data: stream, error: streamErr } = await supabaseAdmin
      .from("streams").select("id, name, slug").eq("slug", req.params.slug).maybeSingle()
    if (streamErr) throw streamErr
    if (!stream) return res.status(404).json({ error: "Stream not found" })

    const experimentIds = await getStreamExperimentIds(stream.id)
    if (!experimentIds.length) return res.json({ leaderboard: [] })

    const { data: submissions, error } = await supabaseAdmin
      .from("college_submissions")
      .select("user_id, elo_delta")
      .eq("passed", true)
      .in("experiment_id", experimentIds)
    if (error) throw error

    const totals = new Map()
    for (const s of submissions) totals.set(s.user_id, (totals.get(s.user_id) || 0) + (s.elo_delta || 0))
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
        return { userId: id, displayName, streamElo: totals.get(id), totalElo: profile?.elo_rating ?? null }
      })
      .sort((a, b) => b.streamElo - a.streamElo)
      .slice(0, 50)
      .map((row, i) => ({ rank: i + 1, ...row, isYou: req.user ? row.userId === req.user.id : false }))

    res.json({ leaderboard: rows })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /streams/:slug/leaderboard", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/streams
router.get("/streams", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("streams").select("id, name, slug").order("name")
    if (error) throw error
    res.json({ streams: data })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /streams", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/streams/:slug/semesters
router.get("/streams/:slug/semesters", async (req, res) => {
  try {
    const { data: stream, error: streamErr } = await supabaseAdmin
      .from("streams").select("id, name, slug").eq("slug", req.params.slug).maybeSingle()
    if (streamErr) throw streamErr
    if (!stream) return res.status(404).json({ error: "Stream not found" })

    const { data: semesters, error } = await supabaseAdmin
      .from("semesters").select("id, number").eq("stream_id", stream.id).order("number")
    if (error) throw error
    res.json({ stream, semesters })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /streams/:slug/semesters", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/semesters/:id/subjects
router.get("/semesters/:id/subjects", async (req, res) => {
  try {
    const subjects = (await getSubjectsForSemesters([req.params.id])).sort((a, b) => a.name.localeCompare(b.name))
    res.json({ subjects })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /semesters/:id/subjects", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/subjects/:id/units
router.get("/subjects/:id/units", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("units").select("id, title, sequence").eq("subject_id", req.params.id).order("sequence")
    if (error) throw error
    res.json({ units: data })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /subjects/:id/units", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/units/:id/experiments
// List view — omits `prompt`/`rubric`/`reference_solution` (full detail is
// GET /experiments/:id below), keeps the list payload light.
router.get("/units/:id/experiments", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("experiments")
      .select("id, title, difficulty, elo_reward, time_limit_minutes")
      .eq("unit_id", req.params.id)
      .order("created_at")
    if (error) throw error
    res.json({ experiments: data })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /units/:id/experiments", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/arena/college-stream/experiments/:id
// Full prompt for attempting the experiment. Deliberately excludes
// `rubric` and `reference_solution` — those are evaluator-only, never sent
// to the client (would leak the answer).
router.get("/experiments/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("experiments")
      .select("id, title, difficulty, prompt, elo_reward, time_limit_minutes, unit_id, tier, challenge_type, category, rubric")
      .eq("id", req.params.id)
      .maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: "Experiment not found" })
    // rubric never leaves the server (would leak expected_stdout/answer to
    // the client) — only a boolean signal for "does this need a code
    // editor UI" survives into the response.
    const { rubric, ...safe } = data
    res.json({ experiment: { ...safe, isCodeChallenge: rubric?.type === "python_stdout_match" } })
  } catch (err) {
    console.error("[arenaCollegeStream] GET /experiments/:id", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// POST /api/arena/college-stream/experiments/:id/submit
// Auth required — writes a real college_submissions row under the caller's
// own user_id (never trusts a client-supplied userId). Runs the pure
// rule-based evaluator server-side (rubric never leaves the server), then
// persists score/passed/elo_delta in the same insert — no separate
// evaluation write path, so there's nothing here to get out of sync.
router.post("/experiments/:id/submit", requireAuth, codeExecutionLimiter, async (req, res) => {
  try {
    const { answer } = req.body || {}
    if (answer === undefined || answer === null || answer === "") {
      return res.status(400).json({ error: "answer is required" })
    }

    const { data: experiment, error: expErr } = await supabaseAdmin
      .from("experiments")
      .select("id, title, prompt, rubric, elo_reward, difficulty, unit_id, tier, category, skill_graph_node_id, skill_graph_nodes(label)")
      .eq("id", req.params.id)
      .maybeSingle()
    if (expErr) throw expErr
    if (!experiment) return res.status(404).json({ error: "Experiment not found" })

    // Locked once passed — same rule as the Domain Role branch, enforced
    // server-side (not just hidden client-side).
    const { data: existingPass, error: passCheckErr } = await supabaseAdmin
      .from("college_submissions")
      .select("id").eq("user_id", req.user.id).eq("experiment_id", experiment.id).eq("passed", true)
      .limit(1).maybeSingle()
    if (passCheckErr) throw passCheckErr
    if (existingPass) {
      return res.status(409).json({ error: "This experiment is already completed and locked." })
    }

    // Common Challenge Framework progression gate — locked until the
    // previous tier is cleared, enforced server-side (never trust the
    // grid's displayed lock state alone).
    if (await isExperimentTierLocked(experiment, req.user.id)) {
      return res.status(403).json({ error: "This challenge's tier is still locked — clear more of the previous tier first." })
    }

    let result
    let executionOutput = null
    try {
      if (experiment.rubric?.type === "python_stdout_match") {
        // Code-execution branch — runs in the subprocess sandbox
        // (pythonSandbox.js). Still fully deterministic/rule-based: the
        // sandbox only runs the code and compares stdout, it never makes a
        // judgment call. See that file's header for the security model.
        const code = typeof answer === "string" ? answer : answer?.text ?? answer?.value ?? ""
        const pyResult = await evaluatePythonStdout(experiment.rubric, code)
        result = { score: pyResult.score, passed: pyResult.passed }
        executionOutput = { stdout: pyResult.stdout, stderr: pyResult.stderr, error: pyResult.error }
      } else {
        result = evaluate(experiment.rubric, answer)
      }
    } catch (evalErr) {
      if (evalErr instanceof PythonSandboxBusyError) {
        // Transient capacity issue, not a bug — 503 + Retry-After tells the
        // client (and any monitoring) this is expected backpressure, not a
        // broken submission.
        res.setHeader("Retry-After", "5")
        return res.status(503).json({ error: evalErr.message })
      }
      if (evalErr instanceof EvaluatorError || evalErr instanceof PythonSandboxError) {
        // A malformed rubric or an unavailable sandbox is a content/infra
        // bug, not a user error — surface it distinctly (500, not 400) so
        // it doesn't get silently treated as "you answered wrong."
        console.error("[arenaCollegeStream] evaluation failed for experiment", req.params.id, evalErr.message)
        return res.status(500).json({ error: evalErr.message || "This experiment couldn't be evaluated — not your answer's fault." })
      }
      throw evalErr
    }

    // Same deterministic fail-penalty scheme as Domain Role — see
    // ELO_FAIL_PENALTY in arenaDomainRole.js for the "why". Score/passed are
    // still decided entirely by the rule-based evaluator above.
    const rawEloDelta = result.passed ? experiment.elo_reward : -(ELO_FAIL_PENALTY[experiment.difficulty] ?? 2)

    // PRODUCT RULE (2026-08-16, explicit product decision): Academic
    // (college-stream) tasks only move ELO for the FIRST passing submission
    // of each calendar day, no matter how many different experiments the
    // student clears that day — grinding 20 Academic tasks in one sitting
    // earns the same ELO as clearing 1. This is deliberate: Domain Role
    // challenges (arenaDomainRole.js) are the ELO-growth engine and keep
    // uncapped per-task ELO; Academic tasks are meant to build the skill
    // graph/portfolio record without letting students farm ELO by volume on
    // the easier, more repetitive stream. Failing submissions are NOT
    // capped — a wrong answer still costs ELO even after today's pass is
    // already banked, so there's no free-grinding loophole via retries.
    // Boundary = calendar day at UTC midnight (matches how "today" is
    // computed elsewhere in the app), not a rolling 24h window.
    let eloDelta = rawEloDelta
    let eloCapped = false
    if (result.passed) {
      const todayStartUtc = new Date(); todayStartUtc.setUTCHours(0, 0, 0, 0)
      const { data: todaysPass, error: todaysPassErr } = await supabaseAdmin
        .from("college_submissions")
        .select("id")
        .eq("user_id", req.user.id)
        .eq("passed", true)
        .gt("elo_delta", 0)
        .gte("submitted_at", todayStartUtc.toISOString())
        .limit(1).maybeSingle()
      if (todaysPassErr) throw todaysPassErr
      if (todaysPass) { eloDelta = 0; eloCapped = true }
    }
    // Best-effort AI explanation layered on top — never blocks, never
    // changes score/passed/elo, which are already final by this point.
    const { data: aiPrefsRow } = await supabaseAdmin
      .from("ai_preferences").select("feedback_style").eq("user_id", req.user.id).maybeSingle()
    const aiFeedback = await generateAiFeedback({
      prompt: experiment.prompt, answer, passed: result.passed, score: result.score,
      feedbackStyle: aiPrefsRow?.feedback_style,
    })

    const { data: submission, error: subErr } = await supabaseAdmin
      .from("college_submissions")
      .insert({
        user_id: req.user.id,
        experiment_id: experiment.id,
        answer: typeof answer === "object" ? answer : { value: answer },
        score: result.score,
        passed: result.passed,
        elo_delta: eloDelta,
        ai_feedback: aiFeedback,
        execution_output: executionOutput,
      })
      .select("id, score, passed, elo_delta, submitted_at")
      .single()
    if (subErr) {
      // 23505 = unique_violation — the DB-level backstop for the
      // check-then-insert race above (uq_college_submissions_one_pass_per_user).
      // Two near-simultaneous requests can both pass the earlier SELECT
      // check; only one INSERT can win here. The loser gets the same 409 a
      // sequential duplicate would, not a 500 — this is an expected,
      // handled outcome, not a real error.
      if (subErr.code === "23505") {
        return res.status(409).json({ error: "This experiment is already completed and locked." })
      }
      throw subErr
    }

    // Feeds the same global profiles.elo_rating the header badge and
    // Portfolio's tier label already read — previously only
    // hardwareChallenges.js wrote this column, so Academic Workspace
    // activity never moved the ELO shown anywhere outside Arena itself.
    // Atomic single-statement increment (increment_profile_elo), not a
    // read-then-write, so concurrent submissions can't clobber each
    // other's read of "current" — same race-condition class already fixed
    // for double-submissions above. Logged but non-fatal on failure: the
    // submission record itself is the source of truth and must not be
    // rolled back over a secondary display-cache write failing.
    if (eloDelta !== 0) {
      const { error: eloErr } = await supabaseAdmin.rpc("increment_profile_elo", {
        p_user_id: req.user.id, p_delta: eloDelta,
      })
      if (eloErr) logger.error("profile ELO increment failed (submission still recorded)", { err: eloErr, userId: req.user.id, eloDelta })
    }

    // arena_history — the shared, denormalized event ledger Aura's "ELO
    // Rating History" timeline and Portfolio's task lists both read from.
    // Reactivated 2026-08-16: this table already existed with the right
    // schema/RLS/indexes and both frontends already fetch from it, but no
    // backend route had written to it since Arena V1 was decommissioned —
    // that's why Aura showed "No arena events yet" despite a real ELO.
    // Non-fatal on failure, same reasoning as the ELO RPC above: this is a
    // secondary display record, not the source of truth (college_submissions
    // is). type: 'academic' is how Portfolio tells this apart from Domain
    // Role rows (type: 'domain', see arenaDomainRole.js) without guessing
    // from the free-text domain/category string.
    const { error: histErr } = await supabaseAdmin.from("arena_history").insert({
      user_id: req.user.id,
      task_id: experiment.id,
      title: experiment.title || "Academic Challenge",
      domain: experiment.category || "academic",
      difficulty: experiment.difficulty,
      type: "academic",
      score: result.score,
      elo_delta: eloDelta,
      completed_at: submission.submitted_at,
      visible_in_portfolio: true,
      visible_in_aura: true,
      // skill_name/skill_category (2026-09-04 Arena evidence fix) — see the
      // matching comment in arenaDomainRole.js's recordArenaHistory.
      skill_name: experiment.skill_graph_nodes?.label || null,
      skill_category: experiment.category || null,
    })
    if (histErr) logger.error("arena_history insert failed (submission still recorded)", { err: histErr, userId: req.user.id })

    // The actual fix: connect this result to skill evidence. Best-effort,
    // never blocks this response — see arenaReinforcement.js's contract.
    // domainKey is the experiment's stream slug (College Stream's coarse
    // tagging is per-stream, not per-subject — see Fix 2's audit; no
    // granular taxonomy exists for streams today, so this reinforces at the
    // same grain the mission is actually tagged at, honestly).
    const streamSlug = await resolveStreamSlugForUnit(experiment.unit_id).catch(() => null)
    await reinforceArenaSubmission({
      userId: req.user.id, skillGraphNodeId: experiment.skill_graph_node_id, domainKey: streamSlug,
      correct: result.passed, score: result.score, difficulty: experiment.difficulty,
      submissionTable: "college_submissions", submissionId: submission.id,
    })

    res.json({ submission: { ...submission, ai_feedback: aiFeedback, execution_output: executionOutput, elo_capped: eloCapped } })
  } catch (err) {
    console.error("[arenaCollegeStream] POST /experiments/:id/submit", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
