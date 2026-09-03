/**
 * Public Portfolio Lookup — CAREER OS TRANCHE 6 / PRIORITY 6A privacy fix
 *
 * GET /api/portfolio/lookup/:identifier
 *
 * Problem this replaces: frontend/src/pages/Portfolio.jsx previously did
 * `supabase.from("profiles").select("*")` directly from the browser across
 * 6 different lookup strategies (by UUID, by username, by display_name
 * ilike full/word, by auth-session fallback, by own-portfolio fallback).
 * The `profiles` table's RLS SELECT policy is row-level only
 * (`auth.uid() = id OR (verified = true AND auth.role() = 'authenticated')`)
 * — it cannot restrict which COLUMNS come back. `select("*")` on a ~180
 * column legacy table meant any authenticated user viewing any verified
 * user's portfolio also received that user's real `email` and `uan_number`
 * (a government ID column), regardless of any consent/visibility toggle.
 *
 * Fix: move the entire lookup server-side behind this one narrow route.
 * The server still queries `profiles.*` (via service role, needed to
 * replicate the multi-strategy fallback search), but the HTTP response is
 * built from an explicit field whitelist — only the fields Portfolio.jsx
 * actually renders. No `select("*")` result ever reaches the client.
 *
 * This intentionally mirrors the *existing* Portfolio.jsx lookup order and
 * ud-construction field list exactly (see load() in Portfolio.jsx) so
 * portfolio behavior is unchanged for legitimate users — only the transport
 * changed from "browser reads the row" to "server reads the row, browser
 * gets a filtered projection of it."
 *
 * Visibility rules enforced here (previously only client-side dead toggles,
 * see career_os_ws0_privacy_toggle_columns migration / Tranche 3):
 *   - Non-owner viewers only ever see a row where `verified === true`
 *     (mirrors what the old RLS policy would have allowed through).
 *   - `certificates`/`certifications` are omitted for non-owner viewers
 *     when `cert_visible === false`.
 *   - Owners (viewer.id === row.id) always see their own full portfolio
 *     regardless of verified/cert_visible.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { buildCodeDnaRecruiterView } from "../lib/recruiterEvidence.js"
import { SOURCE as CODE_DNA_SOURCE, PROOF_TYPE as CODE_DNA_PROOF_TYPE } from "../lib/codeDna/repository.js"
import { resolvePortfolioViewer, checkPortfolioAccess } from "../lib/portfolioVisibility.js"
import { logger } from "../lib/logger.js"

const router = Router()

const mkSlug = s => (s || "").toLowerCase().trim()
  .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

const isUUID = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

// Explicit allowlist — only fields Portfolio.jsx's ud={} construction reads.
// Deliberately excludes: email, uan_number, phone, subscription_order_id,
// epfo_uan, and every other column not on this list (of the ~180 on the
// live `profiles` table).
function toPortfolioSafeFields(row, { includeCerts }) {
  return {
    id:                 row.id,
    display_name:       row.display_name ?? null,
    displayName:        row.displayName ?? null,
    full_name:          row.full_name ?? null,
    name:               row.name ?? null,
    username:           row.username ?? null,
    path:               row.path ?? null,
    keyword:            row.keyword ?? null,
    elo_rating:         row.elo_rating ?? null,
    eloRating:          row.eloRating ?? null,
    arena_streak:       row.arena_streak ?? null,
    arenaStreak:        row.arenaStreak ?? null,
    arena_completed:    row.arena_completed ?? null,
    arenaCompleted:     row.arenaCompleted ?? null,
    job_readiness:      row.job_readiness ?? null,
    jobReadiness:       row.jobReadiness ?? null,
    skill_graph:        row.skill_graph ?? null,
    skillGraph:         row.skillGraph ?? null,
    skills:             row.skills ?? null,
    strengths:          row.strengths ?? null,
    weak_areas:         row.weak_areas ?? null,
    weakAreas:          row.weakAreas ?? null,
    profile_summary:    row.profile_summary ?? null,
    profileSummary:     row.profileSummary ?? null,
    experiences:        row.experiences ?? null,
    resumeProjects:     row.resumeProjects ?? null,
    resume_projects:    row.resume_projects ?? null,
    education:          row.education ?? null,
    githubUsername:     row.githubUsername ?? null,
    github_username:    row.github_username ?? null,
    linkedInUrl:        row.linkedInUrl ?? null,
    linkedin_url:       row.linkedin_url ?? null,
    githubUrl:          row.githubUrl ?? null,
    github_url:         row.github_url ?? null,
    profilePhotoURL:    row.profilePhotoURL ?? null,
    profile_photo_url:  row.profile_photo_url ?? null,
    avatarUrl:          row.avatarUrl ?? null,
    location:           row.location ?? null,
    city:               row.city ?? null,
    createdAt:          row.createdAt ?? null,
    created_at:         row.created_at ?? null,
    // certificates/certifications are the one field on this list gated by
    // an explicit consent toggle (cert_visible) rather than always shown —
    // see career_os_ws0_privacy_toggle_columns migration (Tranche 3).
    certificates:       includeCerts ? (row.certificates ?? null)   : null,
    certifications:     includeCerts ? (row.certifications ?? null) : null,
    testimonials:       row.testimonials ?? null,
    recommendations:    row.recommendations ?? null,
    portfolioUrl:        row.portfolioUrl ?? null,
    portfolio_url:      row.portfolio_url ?? null,
    websiteUrl:         row.websiteUrl ?? null,
    website_url:        row.website_url ?? null,
    job_role:           row.job_role ?? null,
    verified:           !!row.verified,
    // Professional-path recruiter signals (2026-07-26) — real, verification-
    // gated facts only. No raw ELO number is ever included in this
    // whitelist by design (product rule: portfolios never show a bare ELO
    // score to either students or professionals).
    uan_verified:            !!row.uan_verified,
    years_of_experience:     row.years_of_experience ?? null,
  }
}

router.get("/portfolio/lookup/:identifier", async (req, res) => {
  try {
    const raw = decodeURIComponent(req.params.identifier || "").trim()
    if (!raw) return res.status(400).json({ error: "Missing identifier" })
    const lower = raw.toLowerCase()

    // Resolve viewer (optional — portfolios are public pages, but we need
    // the viewer's identity for the owner-fallback strategies and for the
    // owner-bypass on the verified/cert_visible gates below).
    const viewer = await resolvePortfolioViewer(req)

    let row = null

    // 0. UUID in URL — direct ID lookup
    if (isUUID(raw)) {
      const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", raw).maybeSingle()
      if (data) row = data
    }

    // 1. Exact username column match
    if (!row) {
      const { data } = await supabaseAdmin.from("profiles").select("*").eq("username", lower).maybeSingle()
      if (data) row = data
    }

    // 2. display_name slug match
    if (!row) {
      const nameQuery = lower.replace(/-/g, " ")
      const { data, error } = await supabaseAdmin.from("profiles").select("*")
        .ilike("display_name", `%${nameQuery}%`).limit(20)
      if (!error && data?.length) {
        row = data.find(p => mkSlug(p.display_name || "") === lower)
          || (data.length === 1 ? data[0] : null)
      }
    }

    // 3. Per-word partial name match
    if (!row) {
      const words = lower.split("-").filter(w => w.length > 2)
      for (const word of words) {
        const { data } = await supabaseAdmin.from("profiles").select("*")
          .ilike("display_name", `%${word}%`).limit(30)
        if (data?.length) {
          const match = data.find(p => mkSlug(p.display_name || "") === lower)
          if (match) { row = match; break }
        }
      }
    }

    // 4. Auth session fallback — covers camelCase-only profiles for the
    // viewer's OWN portfolio (matching against real DB fields, not email —
    // email never needs to leave the DB for this comparison).
    if (!row && viewer?.id) {
      const { data: bySession } = await supabaseAdmin.from("profiles").select("*")
        .eq("id", viewer.id).maybeSingle()
      if (bySession) {
        const authMeta = viewer.user_metadata || {}
        const allNames = [
          bySession.display_name, bySession.displayName,
          bySession.username, bySession.name,
          authMeta.full_name, authMeta.name, authMeta.display_name,
        ].filter(Boolean)
        const slugs = allNames.map(mkSlug)
        const firstWord = lower.split("-")[0]
        const nameMatch = slugs.some(s => s === lower)
          || allNames.some(n => (n || "").toLowerCase().startsWith(firstWord))
        if (nameMatch || lower === viewer.id) row = bySession
      }
    }

    // 5. Last resort — session user's own portfolio, matched via their real
    // auth email (available on the viewer object, never read off the row).
    if (!row && viewer?.id) {
      const { data: mine } = await supabaseAdmin.from("profiles").select("*")
        .eq("id", viewer.id).maybeSingle()
      if (mine) {
        const authMeta = viewer.user_metadata || {}
        const emailUser = mkSlug((viewer.email || "").split("@")[0])
        const possibleSlugs = [
          mkSlug(mine.display_name || ""), mkSlug(mine.displayName || ""),
          mkSlug(mine.username || ""), emailUser, mine.id,
          mkSlug(authMeta.full_name || ""), mkSlug(authMeta.name || ""),
        ].filter(Boolean)
        if (possibleSlugs.some(s => lower.includes(s.slice(0, 5)) || s.includes(lower.slice(0, 5)))) {
          row = mine
        }
      }
    }

    if (!row) return res.status(404).json({ error: "Portfolio not found." })

    // Owner/institution-staff/verified visibility rule — see
    // lib/portfolioVisibility.js for the full rationale and fix history
    // (this used to be inline here; extracted so the Arena task-details
    // route below enforces the exact same rule, permanently in sync).
    const { allowed, isOwner, isInstitutionStaffViewer } = await checkPortfolioAccess(row, viewer)
    if (!allowed) {
      return res.status(404).json({ error: "Portfolio not found." })
    }

    const includeCerts = isOwner || isInstitutionStaffViewer || row.cert_visible !== false

    const safe = toPortfolioSafeFields(row, { includeCerts })

    // Verified certifications count (Skill Rating v2) — a real, verification-
    // gated count, not the unstructured self-reported `certificates` list.
    // Only counted, never named/detailed here, to keep this endpoint's
    // response narrow like everything else in this whitelist.
    if (includeCerts && row.path === "professional") {
      const { data: certs } = await supabaseAdmin
        .from("professional_certifications")
        .select("id")
        .eq("user_id", row.id)
        .eq("verification_status", "verified")
      safe.verified_certifications_count = (certs || []).length
    } else {
      safe.verified_certifications_count = null
    }

    // GitHub / Code DNA (2026-08-05) — recruiter-facing summary of the
    // candidate's GitHub verification status, capability signals, and AI
    // Repository Interview verdict. Reuses the SAME curated builder already
    // used by the internal recruiter evidence endpoint
    // (arenaV2Portfolio.js's /candidates/:userId/evidence), never a second,
    // independently-drifting presentation of the same underlying data. Per
    // that builder's own rule, raw GitHub analytics (repo names, star
    // counts, language %s) are never included — only plain-language
    // verification/capability signals, consistent with this whole
    // endpoint's field-whitelist discipline.
    //
    // Deliberately NOT gated on the portfolio's `verified` flag above —
    // GitHub verification is its own separate, real check (the bio-code
    // ownership proof in routes/github.js), independent of whatever
    // verified the rest of the profile. Only gated on the proof_objects
    // row's own `is_portfolio_visible` flag (true by default) or ownership.
    try {
      const { data: codeDnaRow } = await supabaseAdmin
        .from("proof_objects")
        .select("*")
        .eq("user_id", row.id)
        .eq("source", CODE_DNA_SOURCE)
        .eq("proof_type", CODE_DNA_PROOF_TYPE)
        .maybeSingle()
      if (codeDnaRow && (isOwner || codeDnaRow.is_portfolio_visible !== false)) {
        safe.codeDna = buildCodeDnaRecruiterView(codeDnaRow)

        // Canonical-identity summary (2026-09-03) — the same three headline
        // numbers Settings/Career & Vault already show, so the public
        // portfolio's "GitHub & Code DNA" card matches what the owner sees,
        // not a separately-derived presentation. Same visibility gate as
        // codeDna above (github_connections has no visibility flag of its
        // own — Code DNA's is_portfolio_visible is the one flag that
        // controls whether ANY of this shows publicly, by design, so there
        // is exactly one visibility switch to reason about, not two that
        // could disagree).
        const { data: connRow } = await supabaseAdmin
          .from("github_connections")
          .select("username, verification_state, code_dna_score, confidence_level, repositories_analyzed, last_scanned_at, disconnected_at")
          .eq("user_id", row.id)
          .maybeSingle()
        if (connRow && !connRow.disconnected_at) {
          safe.codeDna.username = connRow.username
          // PRODUCTION FIX (2026-09-03): this used to also set a separate
          // `verified` BOOLEAN here, sourced from github_connections,
          // alongside the `verification` STRING buildCodeDnaRecruiterView
          // already set above from proof_objects.trust_level — two
          // independently-sourced representations of the same fact, able to
          // disagree (verify-ownership updates both tables, but a persist
          // failure on one, or data from before that write existed, could
          // leave them out of sync). github_connections is now the
          // canonical identity/verification source of truth end-to-end, so
          // the ONE field every consumer actually reads (`verification`,
          // the string Portfolio.jsx renders) is overwritten here to match
          // it whenever a connection exists — no second field, no second
          // source, nothing left for the two to disagree about.
          if (connRow.verification_state === "verified") {
            safe.codeDna.verification = "Verified (GitHub ownership confirmed)"
          } else if (safe.codeDna.verification?.startsWith("Verified")) {
            // Canonical connection says unverified but the analysis record
            // still says verified (stale, pre-dates this fix, or the
            // connection was reset by an identity change) — canonical wins.
            safe.codeDna.verification = "Self-Selected (GitHub ownership unconfirmed)"
          }
          safe.codeDna.score = connRow.code_dna_score
          safe.codeDna.confidenceLevel = connRow.confidence_level
          safe.codeDna.repositoriesAnalyzed = connRow.repositories_analyzed
          safe.codeDna.lastScannedAt = connRow.last_scanned_at
        }
      }
    } catch (e) {
      console.error("[portfolio/lookup] codeDna fetch failed:", e.message)
    }

    res.json({ profile: safe })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Renders a domain_submissions.result_json ({columns, rows}) table as plain
// text for the portfolio modal's existing <pre> block — that block is a
// single text slot (see Portfolio.jsx's ChallengeDetailModal), not a table
// component, and porting a full table renderer into Portfolio.jsx wasn't
// warranted just for this. college_submissions' execution_output.stdout is
// already plain text and needs no such formatting.
function formatResultAsText(result) {
  if (!result || !Array.isArray(result.columns) || !Array.isArray(result.rows)) return ""
  if (result.rows.length === 0) return `${result.columns.join(" | ")}\n(no rows returned)`
  const lines = [result.columns.join(" | ")]
  for (const row of result.rows) lines.push(row.map(v => (v === null || v === undefined ? "null" : String(v))).join(" | "))
  return lines.join("\n")
}

const MAX_TASK_DETAIL_BATCH = 50

// POST /api/portfolio/:userId/task-details
// Body: { tasks: [{ taskId, type: "domain"|"academic" }, ...] }
//
// Full Arena challenge detail (problem statement, submitted code/answer,
// program output, AI feedback) for a batch of tasks the Portfolio page's
// Arena Challenges section already has score/ELO/title summaries for (from
// a client-side arena_history read — that table only stores the summary
// fields, not this detail). Joins domain_submissions/college_submissions —
// the same tables Arena's own History tab reads its expanded per-attempt
// view from (routes/arenaDomainRole.js, routes/arenaCollegeStream.js) —
// using the identical two-query-and-merge shape those routes already use,
// rather than a PostgREST embedded-join select (`table(column)`), matching
// this codebase's established convention for these tables.
//
// Public read, no requireAuth — mirrors this file's /lookup/:identifier
// route above: a recruiter viewing a shared portfolio isn't logged in.
// Access is gated by the SAME portfolio-visibility rule as
// /lookup/:identifier (lib/portfolioVisibility.js) — checked independently
// here rather than trusted from a prior /lookup call, since this route can
// be hit directly. On top of that, each requested (taskId, type) pair is
// only fulfilled if it matches a real arena_history row for this user with
// visible_in_portfolio = true — the caller's `type` claim is never trusted
// on its own to pick which table to query. Tasks that don't pass either
// check are silently omitted from the response rather than erroring the
// whole batch, since a portfolio can legitimately mix visible and
// not-yet-visible challenges.
router.post("/portfolio/:userId/task-details", async (req, res) => {
  try {
    const { userId } = req.params
    const { tasks } = req.body || {}

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "tasks must be a non-empty array" })
    }
    if (tasks.length > MAX_TASK_DETAIL_BATCH) {
      return res.status(400).json({ error: `tasks cannot exceed ${MAX_TASK_DETAIL_BATCH} items` })
    }
    const validated = []
    for (const t of tasks) {
      if (!t || typeof t.taskId !== "string" || !t.taskId.trim()) {
        return res.status(400).json({ error: "Each task requires a non-empty taskId" })
      }
      if (t.type !== "domain" && t.type !== "academic") {
        return res.status(400).json({ error: 'Each task requires type "domain" or "academic"' })
      }
      validated.push({ taskId: t.taskId.trim(), type: t.type })
    }

    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from("profiles").select("id, verified").eq("id", userId).maybeSingle()
    if (profileErr) throw profileErr
    if (!profileRow) return res.status(404).json({ error: "Not found" })

    const viewer = await resolvePortfolioViewer(req)
    const { allowed } = await checkPortfolioAccess(profileRow, viewer)
    if (!allowed) return res.status(404).json({ error: "Not found" })

    const { data: historyRows, error: historyErr } = await supabaseAdmin
      .from("arena_history")
      .select("task_id, type")
      .eq("user_id", userId)
      .eq("visible_in_portfolio", true)
      .in("task_id", validated.map(t => t.taskId))
    if (historyErr) throw historyErr

    const visibleKeys = new Set((historyRows || []).map(r => `${r.type}:${r.task_id}`))
    const domainIds   = validated.filter(t => t.type === "domain"   && visibleKeys.has(`domain:${t.taskId}`)).map(t => t.taskId)
    const academicIds = validated.filter(t => t.type === "academic" && visibleKeys.has(`academic:${t.taskId}`)).map(t => t.taskId)

    const details = {}

    if (domainIds.length) {
      const { data: missions, error: mErr } = await supabaseAdmin
        .from("domain_missions").select("id, prompt").in("id", domainIds)
      if (mErr) throw mErr
      const promptByMission = new Map(missions.map(m => [m.id, m.prompt]))

      const { data: submissions, error: sErr } = await supabaseAdmin
        .from("domain_submissions")
        .select("mission_id, sql_text, result_json, ai_feedback, created_at")
        .eq("user_id", userId)
        .in("mission_id", domainIds)
        .order("created_at", { ascending: false })
      if (sErr) throw sErr

      const seen = new Set()
      for (const s of submissions || []) {
        if (seen.has(s.mission_id)) continue // most recent attempt only — matches Portfolio's own one-entry-per-challenge dedup
        seen.add(s.mission_id)
        details[`domain:${s.mission_id}`] = {
          scenario: promptByMission.get(s.mission_id) || "",
          userAnswer: s.sql_text || "",
          output: formatResultAsText(s.result_json),
          feedback: s.ai_feedback || "",
        }
      }
    }

    if (academicIds.length) {
      const { data: experiments, error: eErr } = await supabaseAdmin
        .from("experiments").select("id, prompt").in("id", academicIds)
      if (eErr) throw eErr
      const promptByExperiment = new Map(experiments.map(e => [e.id, e.prompt]))

      const { data: submissions, error: sErr } = await supabaseAdmin
        .from("college_submissions")
        .select("experiment_id, answer, execution_output, ai_feedback, submitted_at")
        .eq("user_id", userId)
        .in("experiment_id", academicIds)
        .order("submitted_at", { ascending: false })
      if (sErr) throw sErr

      const seen = new Set()
      for (const s of submissions || []) {
        if (seen.has(s.experiment_id)) continue
        seen.add(s.experiment_id)
        const answer = s.answer && typeof s.answer === "object" ? (s.answer.value ?? JSON.stringify(s.answer)) : s.answer
        details[`academic:${s.experiment_id}`] = {
          scenario: promptByExperiment.get(s.experiment_id) || "",
          userAnswer: answer || "",
          output: s.execution_output?.stdout || "",
          feedback: s.ai_feedback || "",
        }
      }
    }

    res.json({ details })
  } catch (err) {
    logger.error("[portfolioPublic] POST /portfolio/:userId/task-details failed", { err, userId: req.params.userId })
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
