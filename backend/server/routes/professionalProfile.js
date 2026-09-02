/**
 * Professional Profile Routes
 * POST /api/pro/profile         — upsert professional profile data
 * GET  /api/pro/profile/:uid    — fetch own or public profile
 * POST /api/pro/photo           — upload profile / cover photo
 * POST /api/pro/epfo/submit     — submit EPFO/UAN verification request
 * GET  /api/pro/epfo/status     — get verification status
 * POST /api/pro/visibility      — update visibility mode
 * POST /api/pro/elo/recompute   — recompute all ELO signals
 * POST /api/pro/profile/summary/generate — AI-generate a summary from real skills/experience
 * POST /api/pro/profile/summary          — manual summary save
 */
import { Router } from "express"
import multer      from "multer"
import { supabaseAdmin } from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"
import { recomputeExperienceBonus } from "../lib/professionalElo/verifiedBonuses.js"
import { getTier } from "../lib/eloTiers.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ── Auth middleware ───────────────────────────────────────────────────────────

// ── DEPRECATED — legacy profile-completeness pseudo-ELO (Skill Rating v2) ────
// computeEloSignals() and everything it writes (profiles.role_elo/market_elo/
// proof_elo/mobility_elo/aura_score/profile_completeness) is FROZEN as of
// 2026-07-26. This is a legacy, profile-completeness-driven signal — it is
// NOT the Professional Skill Rating and must never be relabeled as such in
// any UI. It is kept (not deleted) only because existing surfaces may still
// read these columns for backward compatibility; no new code should write to
// them, and this file must NEVER import or call anything from
// backend/server/lib/professionalElo/verifiedBonuses.js's bonus-mutation
// path except through the one explicit call in the EPFO-verified branch
// below (recomputeExperienceBonus), which writes to a completely separate
// column (professional_elo_state.experience_bonus_elo), never to these
// legacy `profiles` columns. See docs/elo-engine-v2-architecture.md §D.
// Regression test: backend/server/lib/professionalElo/__tests__/isolation.test.js
function computeEloSignals(profile) {
  const skills       = profile.skill_graph || []
  const exps         = profile.experiences || []
  const vault        = profile.vault_files || []
  const epfo         = profile.epfo_verified || false
  const certs        = (profile.certifications || []).length
  const jobReady     = profile.job_readiness || 0
  const weakAreas    = (profile.weak_areas || []).length
  const elo          = profile.elo_rating || 800
  const bd           = profile.aura_score_breakdown || {}

  const roleElo = Math.min(1800, Math.max(400,
    800 + (skills.length * 12) + (exps.length * 40) + (bd.experienceDepth || 0) * 8
  ))
  const marketElo = Math.min(1600, Math.max(400,
    600 + (epfo ? 200 : 0) + (vault.length * 30) + ((profile.aura_score || 0) * 4) + (certs * 50)
  ))
  const proofElo = Math.min(1400, Math.max(200,
    300 + (epfo ? 350 : 0) + (vault.length * 40) + (certs * 80) + ((bd.projectQuality || 0) * 12)
  ))
  const mobilityElo = Math.min(1500, Math.max(200,
    400 + (jobReady * 8) - (weakAreas * 20) + (elo > 1000 ? 200 : 0) + (marketElo > 800 ? 150 : 0)
  ))

  const verScore    = epfo ? 30 : 0
  const skillScore  = Math.min(25, skills.length * 2)
  const expScore    = Math.min(20, exps.length * 5)
  const proofScore  = Math.min(15, vault.length * 5)
  const certScore   = Math.min(10, certs * 3)
  const auraScore   = verScore + skillScore + expScore + proofScore + certScore

  const completenessFields = [
    profile.name, profile.headline, profile.profile_photo_url,
    profile.current_company, profile.current_role_title, profile.profile_summary,
    skills.length > 0, exps.length > 0, epfo
  ]
  const profileCompleteness = Math.round(
    (completenessFields.filter(Boolean).length / completenessFields.length) * 100
  )

  return { roleElo, marketElo, proofElo, mobilityElo, auraScore, profileCompleteness }
}

// ── GET profile ───────────────────────────────────────────────────────────────
router.get("/pro/profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single()
    if (error) return res.status(404).json({ error: "Profile not found" })
    // Strip sensitive fields for public access
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
    let viewer = null
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      viewer = user
    }
    if (viewer?.id !== uid) {
      // NOTE: epfo_uan/phone/subscription_order_id are not real columns on
      // profiles (grepped the schema — no match under any naming
      // convention), so these three deletes have always been no-ops. Left
      // as-is; not touched in this pass. The two real, live consent toggles
      // below (Career OS Tranche 3, career_os_ws0_privacy_toggle_columns
      // migration) are the actual enforcement this route needed.
      delete data.epfo_uan; delete data.phone; delete data.subscription_order_id
      if (data.cert_visible === false) delete data.certifications
      if (data.vault_visible === false) delete data.vault_files
    }
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── UPSERT profile ────────────────────────────────────────────────────────────
router.post("/pro/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const updates = req.body

    // Recompute ELO if relevant fields changed
    const { data: existing } = await supabaseAdmin.from("profiles").select("*").eq("id", uid).single()
    const merged = { ...(existing || {}), ...updates }
    const signals = computeEloSignals(merged)

    const payload = {
      ...updates,
      role_elo:             signals.roleElo,
      market_elo:           signals.marketElo,
      proof_elo:            signals.proofElo,
      mobility_elo:         signals.mobilityElo,
      aura_score:           signals.auraScore,
      profile_completeness: signals.profileCompleteness,
      updated_at:           new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: uid, ...payload }, { onConflict: "id" })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, profile: data, signals })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Upload profile / cover photo ─────────────────────────────────────────────
router.post("/pro/photo", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    const uid      = req.user.id
    const type     = req.body.type || "profile"  // "profile" | "cover"
    const file     = req.file
    if (!file) return res.status(400).json({ error: "No file" })

    const ext      = file.mimetype.split("/")[1] || "jpg"
    const path     = `${uid}/${type}-${Date.now()}.${ext}`
    const bucket   = "profile-photos"

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true })

    if (uploadErr) return res.status(500).json({ error: uploadErr.message })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    const field = type === "cover" ? "cover_photo_url" : "profile_photo_url"

    await supabaseAdmin.from("profiles").update({ [field]: publicUrl }).eq("id", uid)
    res.json({ success: true, url: publicUrl })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── EPFO Submit ───────────────────────────────────────────────────────────────
// RETARGETED (see PROFESSIONAL_PATH_ARCHITECTURE.md §"schema fork"): this
// previously wrote to "epfo_verifications", a table that was never migrated
// anywhere — this endpoint has been throwing "relation does not exist" on
// every call. There's a real, RLS-enabled table for exactly this — epf_records
// (linked via professional_profiles, one row per user) — so this now targets
// that instead. It also previously wrote profiles.epfo_verified/epfo_uan,
// columns that don't exist either; the real columns are uan_verified/uan_number.
//
// STALE CLAIM CORRECTED: this comment previously said supabase/functions/
// verify-uan (Eko) was "the production-grade verification path, currently
// called directly from Orbit.jsx." That stopped being true as of the
// AuthBridge migration (see routes/verify.js's file header) — the Eko
// function was confirmed not working in practice and is no longer called
// from any frontend flow; it's dead code left deployed, not documentation
// of current behavior. The real, currently-live verification path is
// routes/verify.js's /epfo/search-company + /epfo/confirm (AuthBridge),
// called from Orbit.jsx and Aura.jsx. This endpoint remains a manual-
// fallback path for when a user wants to record a UAN without going
// through that flow — see the honest "in_progress, no auto-verify" behavior
// below; it does not and should not claim equivalence to a real AuthBridge
// match.
router.post("/pro/epfo/submit", requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id
    const { uan, employerList } = req.body
    if (!uan) return res.status(400).json({ error: "UAN is required" })

    const { data: pp, error: ppError } = await supabaseAdmin
      .from("professional_profiles")
      .upsert({ user_id: uid }, { onConflict: "user_id" })
      .select()
      .single()
    if (ppError) return res.status(500).json({ error: ppError.message })

    // BUG FIX (production audit): this used to run an async block that
    // auto-marked verification_status "verified" purely because the user had
    // ANY career_timeline row — i.e. self-reported, unvalidated data marking
    // itself as government-verified. That was also the ONLY code path that
    // could unlock the trust-gated experience_bonus_elo (verifiedBonuses.js
    // reads epf_records exclusively), while the real AuthBridge/EPFO
    // verification (routes/verify.js /epfo/confirm, called from Orbit.jsx)
    // never wrote to epf_records at all — a fabricated claim outranked a
    // real one. Fixed on both ends: /epfo/confirm now writes epf_records
    // correctly on a genuine AuthBridge match (see that route), and this
    // manual-submission fallback no longer self-verifies anything. It just
    // records the submission as "in_progress" — an honest, permanently-
    // pending state until either a real /epfo/confirm match happens for one
    // of the user's employers, or a genuine manual-review mechanism is
    // built. No profiles.uan_verified, no legacy ELO signals, no
    // experience_bonus_elo — none of that should fire without real evidence.
    const { data, error } = await supabaseAdmin
      .from("epf_records")
      .insert({
        professional_profile_id: pp.id,
        uan,
        verification_status:     "in_progress",
        source:                  "manual_document",
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    res.json({
      success: true,
      verification_id: data.id,
      status: "in_progress",
      message: "Your UAN has been recorded. This manual submission path can't independently confirm your employment yet — for an instant verified badge, use the EPFO lookup on an individual experience entry in your Career Timeline instead.",
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── EPFO Status ───────────────────────────────────────────────────────────────
router.get("/pro/epfo/status", requireAuth, async (req, res) => {
  try {
    const { data: pp } = await supabaseAdmin
      .from("professional_profiles").select("id").eq("user_id", req.user.id).single()
    if (!pp) return res.json({ status: "not_started" })

    const { data, error } = await supabaseAdmin
      .from("epf_records")
      .select("*")
      .eq("professional_profile_id", pp.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (error) return res.json({ status: "not_started" })

    // Recompute is idempotent (verifiedBonuses.js), so this is always a safe
    // no-op if nothing changed since the last check — cheap insurance in
    // case a /epfo/confirm call's own recompute (see routes/verify.js)
    // failed transiently and this status poll is the next chance to retry it.
    if (data.verification_status === "verified") {
      try {
        await recomputeExperienceBonus(supabaseAdmin, req.user.id)
      } catch (bonusErr) {
        console.error("[epfo status] experience bonus recompute failed", bonusErr.message)
      }
    }

    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Profile Summary — auto-generate from real profile data ────────────────────
// POST /api/pro/profile/summary/generate (2026-07-26; generalized to the
// student path 2026-08-17)
// Builds a 2-4 sentence recruiter-facing summary from the user's OWN real
// profile data — never invents credentials not present on the profile.
// Writes to profiles.profile_summary (same field the user can also
// hand-edit) — this is a user-triggered regenerate, not a silent
// background job, so a manual edit is never overwritten without the user
// explicitly asking for a fresh one AND confirming (frontend gate, see
// ProfileSummaryCard — this route trusts the client already got that
// confirmation; profile_summary_source records which kind of write this
// was so the frontend can enforce it).
//
// Despite the /pro/ prefix (this route predates the student path having
// this feature at all), it now branches on profile.path: the professional
// prompt is unchanged from 2026-07-26; students get a separate prompt
// grounded in Arena performance instead of work experience, since that's
// what's actually real and available for a student profile.
router.post("/pro/profile/summary/generate", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", uid).single()
    if (!profile) return res.status(404).json({ error: "Profile not found" })

    // Settings/Security redesign (2026-09-02): AI Preferences' "Profile
    // Summary Tone" / "Content Language" controls previously wrote to
    // columns (profiles.ai_prefs) that don't exist — every save silently
    // failed server-side (see the ai_preferences migration's header
    // comment) — so this generator has never actually read a user
    // preference before. ai_preferences is now real, dedicated storage;
    // this is its first real consumer. personalization_enabled is a hard
    // gate here (not a no-op toggle): this endpoint's entire purpose is
    // generating text FROM the user's own profile/Arena data, so "off"
    // means refuse rather than silently ignore the preference.
    const { data: aiPrefs } = await supabaseAdmin
      .from("ai_preferences").select("summary_tone, content_language, personalization_enabled").eq("user_id", uid).maybeSingle()
    if (aiPrefs && aiPrefs.personalization_enabled === false) {
      return res.status(403).json({ error: "AI personalization is turned off in Settings → AI Preferences. Enable it to generate a summary, or write your own." })
    }
    const TONE_INSTRUCTION = {
      professional: "professional and formal",
      conversational: "warm and conversational, while staying credible",
      achievement: "achievement-focused — lead with concrete results and numbers where available",
      concise: "concise and punchy — short sentences, no filler",
    }
    const LANGUAGE_NAME = { en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu" }
    const tone = TONE_INSTRUCTION[aiPrefs?.summary_tone] || TONE_INSTRUCTION.professional
    const language = LANGUAGE_NAME[aiPrefs?.content_language] || "English"

    const isStudent = profile.path !== "professional"
    let prompt

    if (isStudent) {
      const skills = (profile.skill_graph || profile.skills || []).map(s => (typeof s === "string" ? s : s.name)).filter(Boolean).slice(0, 8)
      const role = profile.keyword || profile.target_role || profile.job_role || profile.current_role_title || null
      const eloRating = Number(profile.elo_rating) || 0
      const tier = getTier(eloRating)

      // arena_history is the same summary ledger Portfolio.jsx's old
      // client-side template read from — reused here rather than a new
      // query pattern. Capped at 200 (matches that existing precedent);
      // this is a rough recent-performance stat for a prompt input, not a
      // figure that needs to be exact to the last submission.
      const { data: history } = await supabaseAdmin
        .from("arena_history").select("score").eq("user_id", uid).limit(200)
      const scores = (history || []).map(h => h.score).filter(s => typeof s === "number")
      const challengeCount = scores.length
      const avgScore = challengeCount ? Math.round(scores.reduce((a, b) => a + b, 0) / challengeCount) : null

      if (!role && skills.length === 0 && challengeCount === 0) {
        return res.status(400).json({ error: "Complete a few Arena challenges or add skills first — there's nothing real to summarize yet." })
      }

      prompt = `Write a first-person professional summary (2-4 sentences, no headers, no bullet points, no markdown) for a student's portfolio, based ONLY on these real facts — do not invent anything not listed:
- Target role: ${role || "not specified"}
- Current ELO tier: ${tier.label} (ELO ${eloRating || "not yet rated"})
- Arena challenges completed: ${challengeCount}
- Average challenge score: ${avgScore !== null ? `${avgScore}/100` : "not specified"}
- Strongest skills: ${skills.length ? skills.join(", ") : "not specified"}

Tone: ${tone}, concrete, recruiter-facing — no generic filler like "hardworking team player," no apologizing for being a student. Write the summary in ${language}. Return ONLY the summary text, nothing else.`
    } else {
      const skills = (profile.skill_graph || profile.skills || []).map(s => (typeof s === "string" ? s : s.name)).filter(Boolean).slice(0, 12)
      const experiences = profile.experiences || []
      const topExp = experiences[0] || {}
      const yearsExp = profile.years_of_experience || null
      const domain = profile.keyword || profile.target_role || topExp.title || topExp.role || null

      if (skills.length === 0 && experiences.length === 0 && !domain) {
        return res.status(400).json({ error: "Add some skills or experience first — there's nothing real to summarize yet." })
      }

      prompt = `Write a first-person professional summary (2-4 sentences, no headers, no bullet points, no markdown) for a job-seeking professional's portfolio, based ONLY on these real facts — do not invent anything not listed:
- Current/target role or domain: ${domain || "not specified"}
- Years of experience: ${yearsExp || "not specified"}
- Most recent role: ${topExp.title || topExp.role || "not specified"}${topExp.company ? ` at ${topExp.company}` : ""}
- Skills: ${skills.length ? skills.join(", ") : "not specified"}

Tone: ${tone}, concrete, recruiter-facing — no generic filler like "hardworking team player." Write the summary in ${language}. Return ONLY the summary text, nothing else.`
    }

    let generated = ""
    try {
      generated = (await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 220, temperature: 0.5 })).trim()
    } catch (aiErr) {
      return res.status(502).json({ error: "Couldn't generate a summary right now — try again shortly." })
    }
    if (!generated) return res.status(502).json({ error: "Couldn't generate a summary right now — try again shortly." })

    await supabaseAdmin.from("profiles").update({ profile_summary: generated, profile_summary_source: "ai" }).eq("id", uid)

    res.json({ success: true, summary: generated })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Manual save — the "user has an option to update as well" half of this
// feature. Simple direct write, no AI involved, always available.
router.post("/pro/profile/summary", requireAuth, async (req, res) => {
  try {
    const { summary } = req.body
    if (typeof summary !== "string") return res.status(400).json({ error: "summary is required" })
    if (summary.length > 1000) return res.status(400).json({ error: "Summary must be under 1000 characters" })
    await supabaseAdmin.from("profiles").update({ profile_summary: summary, profile_summary_source: "manual" }).eq("id", req.user.id)
    res.json({ success: true, summary })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Visibility ────────────────────────────────────────────────────────────────
router.post("/pro/visibility", requireAuth, async (req, res) => {
  try {
    const { mode } = req.body
    const VALID = ["private","connections_only","matched_recruiters","notice_period","open","return_to_work","layoff_recovery"]
    if (!VALID.includes(mode)) return res.status(400).json({ error: "Invalid mode" })
    await supabaseAdmin.from("profiles").update({ visibility_mode: mode }).eq("id", req.user.id)
    res.json({ success: true, mode })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Recompute ELO ─────────────────────────────────────────────────────────────
router.post("/pro/elo/recompute", requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", req.user.id).single()
    if (!profile) return res.status(404).json({ error: "Profile not found" })
    const signals = computeEloSignals(profile)
    await supabaseAdmin.from("profiles").update({
      role_elo:             signals.roleElo,
      market_elo:           signals.marketElo,
      proof_elo:            signals.proofElo,
      mobility_elo:         signals.mobilityElo,
      aura_score:           signals.auraScore,
      profile_completeness: signals.profileCompleteness,
    }).eq("id", req.user.id)
    res.json({ success: true, signals })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
