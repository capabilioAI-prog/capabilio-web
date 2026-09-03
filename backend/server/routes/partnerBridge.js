/**
 * Partner Bridge — 2026-08-05
 * ---------------------------------------------------------------------------
 * Service-to-service integration for the standalone "capabilio-recruiter"
 * app, which lives in its own separate codebase and its own separate
 * Supabase project (recruiters there have no account or session here).
 *
 * Product decision (see conversation this was built in): rather than merge
 * the two Supabase projects or forge per-user JWTs across systems, this is a
 * narrow, explicit bridge. capabilio-recruiter's OWN backend calls these
 * routes server-to-server, authenticated by a shared secret (not a per-user
 * session) -- the shared secret never reaches any browser on either side.
 *
 * SECURITY:
 * - requirePartnerSecret fails CLOSED: if PARTNER_BRIDGE_SECRET isn't set in
 *   this app's env, every request here 503s rather than silently allowing
 *   unauthenticated access.
 * - GET /candidates reuses the exact same privacy-gated query as
 *   recruiterSearch.js (profiles.recruiter_discoverable = true AND
 *   employment_status <> 'active_hidden', same field whitelist -- never
 *   email/phone/vault/resume data). This is the same trust boundary as the
 *   in-app recruiter search, just reached from a different caller. Updated
 *   2026-08-06 (employment_status_recruiter_visibility migration) to add
 *   the employment_status gate alongside recruiter_discoverable -- see
 *   recruiterSearch.js's header comment for why both are required.
 * - GET /institutions lists only non-sensitive institution display info.
 * - GET/POST /company-invites lets a recruiter-side company READ the
 *   institution invites addressed to it (org_company_links, status=
 *   'invited') and ACCEPT/DECLINE them, without needing a profiles row in
 *   this app's Supabase project. This does NOT reuse company_user_id (which
 *   only ever points at a same-DB profiles.id) -- it writes a separate
 *   partner_company_ref/accepted_via pair added in
 *   org_company_links_partner_bridge_migration.sql. First-to-accept wins:
 *   a link already claimed via this app's own /company-invite/:token flow
 *   (company_user_id set) can't also be claimed here, and vice versa is
 *   enforced by the status='invited' guard on both paths.
 * - There is still NO endpoint for the reverse direction (a recruiter
 *   requesting a college that hasn't invited them) -- that has no UI on the
 *   institution side to action it yet. Real product gap, not faked here.
 *
 * UPDATED 2026-08-07 — raw ELO briefly stripped from GET /candidates, then
 * REVERSED same day: "i want recruiters to see the student ELO and student
 * choosen career, so then recruiters can see what student is proven" —
 * confirmed as a full reversal, same as recruiterSearch.js (see that file's
 * header for the full quote). role_elo/professional_elo/aura_score are back
 * in the response; performance_tier stays as an additive derived field.
 * performanceTier is imported from orgStudentVisibility.js (this file
 * already imports fetchLinkStudents from there) rather than duplicated,
 * since both are in the same app/deploy unit.
 */
import { Router } from "express"
import crypto from "crypto"
import { supabaseAdmin } from "../lib/supabase.js"
import { fetchLinkStudents, performanceTier, canonicalElo, resolveCareerBySlug, resolveCareerName } from "../lib/orgStudentVisibility.js"
import * as auditLog from "../lib/verification/auditLog.js"
import { buildCodeDnaRecruiterView } from "../lib/recruiterEvidence.js"

const router = Router()

// ─── Recruiter -> candidate messaging + interview scheduling (2026-08-07) ───
// Requested: "rather than email whenever recruiter likes candidate profile
// recruiter can send message to candidate and schedule a call for interview
// so remove email kind of thing... for students it doesn't work if recruiter
// wants to connect with student recruiter has to go through placement team
// only." Confirmed via AskUserQuestion: direct messaging once a student
// access request is approved (not always-3-way through placement cell), and
// scheduling carries time + notification only (no calendar/video integration
// in this pass).
//
// A capabilio-recruiter company has no profiles row in this Supabase
// project, so recruiter_messages.from_user_id / interview_schedules.
// recruiter_id (both real uuid columns, no FK enforced -- confirmed via
// information_schema) need a stand-in identity. partnerPseudoId derives a
// STABLE uuid from partnerCompanyId (same company always maps to the same
// id, so a thread/schedule list can be queried back), not a random one.
// This is a pseudo-identity for message threading only -- it is never
// treated as a real profiles.id anywhere (no join against profiles happens
// on these ids).
function partnerPseudoId(partnerCompanyId) {
  const hash = crypto.createHash("sha256").update(String(partnerCompanyId || "unknown-partner-company")).digest("hex")
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16), // version nibble forced to 5 (name-based), rest from the hash
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // variant bits forced to 10xx
    hash.slice(20, 32),
  ].join("-")
}

// Shared gate for contacting a STUDENT candidate: the recruiter must be
// messaging/scheduling through an active connection to the student's own
// college (linkId), and that specific student's access request on that
// link must already be "approved" by the college's placement cell (decided
// in college.js -- nothing in this file can self-approve). Professional-
// path candidates skip this gate entirely (open direct contact), per the
// confirmed product decision. Mirrors the existing request-access flow
// below (POST /company-links/:linkId/students/:studentId/request-access)
// rather than inventing a second approval concept.
async function checkStudentAccessGate(studentId, linkId) {
  if (!linkId) {
    return { status: 403, error: "This candidate is a student — contact requires an approved request through their college's placement team first." }
  }
  const { data: link } = await supabaseAdmin
    .from("org_company_links")
    .select("id, institution_org_id, status")
    .eq("id", linkId)
    .maybeSingle()
  if (!link || link.status !== "active") {
    return { status: 403, error: "This college connection is not active." }
  }
  const { data: member } = await supabaseAdmin
    .from("org_members")
    .select("id")
    .eq("org_id", link.institution_org_id)
    .eq("user_id", studentId)
    .eq("role", "student")
    .maybeSingle()
  if (!member) {
    return { status: 404, error: "This student isn't part of that college's roster." }
  }
  const { data: reqRow } = await supabaseAdmin
    .from("recruiter_student_access_requests")
    .select("status")
    .eq("org_company_link_id", linkId)
    .eq("student_id", studentId)
    .maybeSingle()
  if (reqRow?.status !== "approved") {
    return { status: 403, error: "Contacting this student requires placement-team approval first. Request access from the College Connections roster, then wait for it to be approved." }
  }
  return null
}

// Re-verifies the same discoverability gate every other route in this file
// uses (recruiter_discoverable / employment_status / org_type) -- a message
// or schedule request must not be usable to reach a candidate who isn't
// actually visible to recruiters (e.g. an old cached id).
async function loadVisibleCandidate(id) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, username, path_type, recruiter_discoverable, employment_status, org_type")
    .eq("id", id)
    .eq("recruiter_discoverable", true)
    .neq("employment_status", "active_hidden")
    .is("org_type", null)
    .maybeSingle()
  return data || null
}

function requirePartnerSecret(req, res, next) {
  const expected = process.env.PARTNER_BRIDGE_SECRET
  if (!expected) {
    return res.status(503).json({ error: "Partner bridge not configured on this deployment." })
  }
  const provided = req.headers["x-partner-secret"]
  if (provided !== expected) {
    return res.status(401).json({ error: "Invalid partner credentials." })
  }
  next()
}

router.use(requirePartnerSecret)

// Identical field whitelist and privacy gate to recruiterSearch.js's
// GET /api/recruiter/search -- this is the same data, reached by a
// different (service-authenticated) caller, not a looser version of it.
// 2026-08-07: added elo_rating, keyword, career_track_slug -- role_elo/
// professional_elo/aura_score alone were never the real number a candidate's
// own Aura dashboard shows for the student path (see canonicalElo() in
// orgStudentVisibility.js for why), and target_role/domain are frequently
// null even when the student clearly has a chosen career via `keyword`
// (their onboarding role field) or career_track_slug.
const RESULT_FIELDS = [
  "id", "username", "display_name", "avatar_url",
  // 2026-08-08: avatar_url is empty on every real profile checked so far --
  // the actual upload flow (Aura.jsx's handleAvatarUpload -> db.js's
  // CAMEL_TO_SNAKE) writes to profile_photo_url, never avatar_url. Select
  // both and prefer whichever is actually populated (see enriched maps
  // below) instead of trusting avatar_url alone, which was the root cause
  // of the recruiter portal showing initials instead of the real photo for
  // every candidate.
  "profile_photo_url", "headline",
  "current_role_title", "current_company", "domain", "target_role",
  "path_type", "years_of_experience", "location",
  "role_elo", "professional_elo", "aura_score", "elo_rating", "keyword", "career_track_slug",
  "uan_verified", "education_verified",
  "employment_status", "notice_period_ends_at",
  // 2026-08-08: added for the Candidate Discovery card redesign (folding in
  // Talent Time Machine's card, which was removed -- it read from a
  // disconnected legacy Firestore collection and fabricated its ELO
  // history with Math.random(), not real data). These three are real,
  // already-tracked fields the student's own Aura dashboard shows.
  "arena_completed", "arena_streak", "job_readiness",
].join(", ")

router.get("/candidates", async (req, res) => {
  try {
    const {
      // 2026-08-09: advanced search filters -- see the file-level note above
      // this route for what's DB-precise vs an intentional approximation.
      skill = "", domain = "", career = "", location = "",
      minElo, verifiedOnly, uanVerified, educationVerified,
      pathType, employmentStatus,
      minExperience, maxExperience, minTasks, minStreak, minJobReadiness,
      sortBy = "recent",
      limit: limitRaw, offset: offsetRaw,
      partnerName = "capabilio-recruiter",
    } = req.query

    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 50)
    const offset = Math.max(parseInt(offsetRaw, 10) || 0, 0)

    let matchingUserIds = null
    // Supports comma-separated skills ("React,PostgreSQL") as an OR match --
    // a candidate needs at least one of the listed skills, not all of them
    // (an AND requirement would need a per-skill intersection query, a
    // bigger change not needed for a first version of this).
    const skillTerms = skill.split(",").map((s) => s.trim()).filter(Boolean)
    if (skillTerms.length > 0) {
      const { data: skillRows, error: skillErr } = await supabaseAdmin
        .from("skill_graph")
        .select("user_id, skill_name, elo_value")
        .eq("is_current", true)
        .or(skillTerms.map((t) => `skill_name.ilike.%${t}%`).join(","))
        .limit(1000)
      if (skillErr) return res.status(500).json({ error: skillErr.message })
      matchingUserIds = [...new Set((skillRows || []).map((r) => r.user_id))]
      if (matchingUserIds.length === 0) return res.json({ candidates: [], total: 0, limit, offset })
    }

    let query = supabaseAdmin
      .from("profiles")
      .select(RESULT_FIELDS, { count: "exact" })
      .eq("recruiter_discoverable", true)
      .neq("employment_status", "active_hidden") // second mandatory gate — see file header
      .is("org_type", null)

    if (matchingUserIds) query = query.in("id", matchingUserIds)
    if (domain.trim()) query = query.ilike("domain", `%${domain.trim()}%`)
    // "career" matches either the student's onboarding role field (keyword)
    // or a professional's stated target role -- the two real free-text
    // fields a chosen career shows up in (career_track_slug is a fixed enum
    // slug, not useful for a free-text search box).
    if (career.trim()) {
      const c = career.trim()
      query = query.or(`keyword.ilike.%${c}%,target_role.ilike.%${c}%`)
    }
    if (location.trim()) query = query.ilike("location", `%${location.trim()}%`)
    if (pathType === "student" || pathType === "professional") query = query.eq("path_type", pathType)
    if (employmentStatus === "notice_period" || employmentStatus === "discoverable") {
      query = query.eq("employment_status", employmentStatus)
    }
    if (verifiedOnly === "true" || verifiedOnly === "1") {
      query = query.or("uan_verified.eq.true,education_verified.eq.true")
    }
    if (uanVerified === "true") query = query.eq("uan_verified", true)
    if (educationVerified === "true") query = query.eq("education_verified", true)
    const minExpNum = parseFloat(minExperience)
    if (Number.isFinite(minExpNum)) query = query.gte("years_of_experience", minExpNum)
    const maxExpNum = parseFloat(maxExperience)
    if (Number.isFinite(maxExpNum)) query = query.lte("years_of_experience", maxExpNum)
    const minTasksNum = parseInt(minTasks, 10)
    if (Number.isFinite(minTasksNum)) query = query.gte("arena_completed", minTasksNum)
    const minStreakNum = parseInt(minStreak, 10)
    if (Number.isFinite(minStreakNum)) query = query.gte("arena_streak", minStreakNum)
    // ELO min is an OR across every raw ELO-ish column, not the single
    // canonicalElo() value -- canonicalElo can only be computed after the
    // row is fetched (it picks the right column per path_type), so this is
    // a deliberate approximation: "qualifies if ANY of their raw ELO
    // numbers clears the bar." No maxElo filter is offered for the same
    // reason in reverse -- an OR-based upper bound would be backwards (it
    // would wrongly admit someone with one huge ELO field and one small
    // one), and there's no way to do a precise one without either a DB
    // view/computed column or filtering post-fetch and re-paginating in
    // memory. Left as a known gap rather than shipping a filter that lies.
    const minEloNum = parseInt(minElo, 10)
    if (Number.isFinite(minEloNum)) {
      query = query.or(`professional_elo.gte.${minEloNum},role_elo.gte.${minEloNum},aura_score.gte.${minEloNum},elo_rating.gte.${minEloNum}`)
    }

    const SORT_COLUMNS = {
      elo: "elo_rating",
      experience: "years_of_experience",
      tasks: "arena_completed",
      recent: "updated_at",
    }
    query = query.order(SORT_COLUMNS[sortBy] || "updated_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    const { data: candidatesRaw, count, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // job_readiness is stored as TEXT on profiles ("40", not 40), confirmed
    // via direct query -- a DB-level .gte() on it would compare
    // lexicographically ("9" > "10") and silently return wrong results.
    // Filtered here instead, in memory, on this already-paginated page.
    // Known limitation: this can return fewer than `limit` results on a
    // page even when more matches exist further in the total set (same
    // page-local constraint the existing minElo approximation already has
    // -- neither is exact across the full candidate pool without a
    // materialized/computed column, which is a bigger schema change).
    const minReadinessNum = parseFloat(minJobReadiness)
    const candidates = Number.isFinite(minReadinessNum)
      ? candidatesRaw.filter((c) => {
          const r = Number(c.job_readiness)
          return Number.isFinite(r) && r >= minReadinessNum
        })
      : candidatesRaw

    const ids = (candidates || []).map((c) => c.id)
    let skillsByUser = {}
    // 2026-08-08: kept alongside skillsByUser (plain skill_name strings,
    // unchanged shape -- existing consumers filter/render on it directly)
    // -- this one carries the real elo_value too, for the card's skill
    // bars (folded in from the removed Talent Time Machine page).
    let skillDetailsByUser = {}
    if (ids.length > 0) {
      const { data: skillRows } = await supabaseAdmin
        .from("skill_graph")
        .select("user_id, skill_name, elo_value")
        .in("user_id", ids)
        .eq("is_current", true)
        .order("elo_value", { ascending: false })
      for (const row of skillRows || []) {
        if (!skillsByUser[row.user_id]) skillsByUser[row.user_id] = []
        if (skillsByUser[row.user_id].length < 3) skillsByUser[row.user_id].push(row.skill_name)
        if (!skillDetailsByUser[row.user_id]) skillDetailsByUser[row.user_id] = []
        if (skillDetailsByUser[row.user_id].length < 3) {
          skillDetailsByUser[row.user_id].push({ skill_name: row.skill_name, elo_value: row.elo_value })
        }
      }
    }

    const trackNameBySlug = await resolveCareerBySlug((candidates || []).map((c) => c.career_track_slug))

    console.log(`[partner-bridge] ${partnerName} fetched ${candidates?.length || 0} candidates`)
    const enriched = (candidates || []).map((c) => {
      const elo = canonicalElo(c)
      const readiness = Number(c.job_readiness)
      return {
        ...c,
        avatar_url: c.avatar_url || c.profile_photo_url || null,
        elo,
        performance_tier: performanceTier(elo),
        career: resolveCareerName(c, trackNameBySlug),
        topSkills: skillsByUser[c.id] || [],
        topSkillsDetailed: skillDetailsByUser[c.id] || [],
        taskCount: c.arena_completed || 0,
        streak: c.arena_streak || 0,
        jobReadiness: Number.isFinite(readiness) ? readiness : null,
      }
    })
    res.json({ candidates: enriched, total: count ?? enriched.length, limit, offset })
  } catch (err) {
    console.error("[partner-bridge/candidates]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Recruiter: resolve a capabilio_username to a real verified profile (2026-08-09) ───
// Added for the dual-track resume+profile matching request: "add both Resume
// scoring and capabilio profile because everyone won't come straightaway to
// capabilio so in meanwhile capabilio can go with resume things and slowly i
// will remove resume from capabilio eco-system." The public apply form on
// capabilio-recruiter already collects capabilio_username but never used it
// for anything — this is the real lookup that lets it be linked to an actual
// verified profile, additively, alongside (never instead of) resume scoring.
//
// Same discoverability gate and field whitelist as GET /candidates — a
// candidate must have opted into recruiter_discoverable for this to resolve
// them at all; an applicant typing a private/non-discoverable username gets
// treated the same as "no matching profile" (404), not a partial leak.
// Exact, case-insensitive match only (no wildcards) — a username lookup is
// an identity claim, not a search.
router.get("/candidates/by-username/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim()
    if (!username) return res.status(400).json({ error: "username is required." })
    const safeUsername = username.replace(/[%_,()]/g, "") // keep the ilike filter well-formed / avoid unintended wildcard injection

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(RESULT_FIELDS)
      .ilike("username", safeUsername)
      .eq("recruiter_discoverable", true)
      .neq("employment_status", "active_hidden")
      .is("org_type", null)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!profile) return res.status(404).json({ error: "No verified Capabilio profile found for that username." })

    const { data: skillRows } = await supabaseAdmin
      .from("skill_graph")
      .select("skill_name, elo_value")
      .eq("user_id", profile.id)
      .eq("is_current", true)
      .order("elo_value", { ascending: false })
      .limit(5)

    const trackNameBySlug = await resolveCareerBySlug([profile.career_track_slug])
    const elo = canonicalElo(profile)

    console.log(`[partner-bridge] resolved capabilio_username -> profile ${profile.id}`)
    res.json({
      candidate: {
        ...profile,
        avatar_url: profile.avatar_url || profile.profile_photo_url || null,
        elo,
        performance_tier: performanceTier(elo),
        career: resolveCareerName(profile, trackNameBySlug),
        topSkills: (skillRows || []).map((r) => ({ skill_name: r.skill_name, elo_value: r.elo_value })),
      },
    })
  } catch (err) {
    console.error("[partner-bridge/candidates/by-username]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Grade bands — copied verbatim from frontend/src/pages/Portfolio.jsx's
// gradeFor() so a recruiter sees the exact same letter grade the candidate
// sees on their own portfolio for the same score. arena_history.grade
// exists as a column but is never actually written (confirmed null on
// every real row) — the UI has always computed this client-side, so we do
// the same here rather than trust an unpopulated column.
function gradeFor(score) {
  const s = score || 0
  if (s >= 90) return "A+"
  if (s >= 80) return "A"
  if (s >= 70) return "B+"
  if (s >= 60) return "B"
  if (s >= 50) return "C"
  return "D"
}

// 2026-08-08: skill percentages shown on a candidate's own Aura dashboard
// do NOT come from the `skill_graph` TABLE alone (that table is empty for
// plenty of real candidates who nonetheless have real Aura skill data) --
// they come from `profiles.skill_graph`, a separate JSONB column seeded
// from resume parsing at onboarding ([{label, value}, ...] or
// [{label, skill, score, value}, ...] shapes both appear in real rows).
// The `skill_graph` TABLE is where Arena/Forge write live, proof-backed,
// verified scores as a candidate actually does work (see arena.js's
// GET /skill-graph header comment). Recruiters should see whichever is
// higher per skill name, same as Aura.jsx's own
// Math.max(skillGraphScore, arenaEntry) merge -- a verified in-table score
// should never be shadowed by a stale resume estimate, but a candidate
// with real resume-estimated skills and no table rows yet (very common for
// new signups) shouldn't show "no skill data" either, which is what this
// endpoint was doing before this fix.
function mergeSkillSources(tableRows, profileSkillGraph) {
  const byLabel = new Map()
  for (const row of profileSkillGraph || []) {
    const label = (row.label || row.skill || "").trim()
    if (!label) continue
    const value = Math.round(row.value ?? row.score ?? 0)
    byLabel.set(label.toLowerCase(), { skill_name: label, elo_value: value, source: "resume", verification_state: "unverified" })
  }
  for (const row of tableRows || []) {
    const label = (row.skill_name || "").trim()
    if (!label) continue
    const key = label.toLowerCase()
    const existing = byLabel.get(key)
    // A verified/live table row always wins over a resume estimate for the
    // same skill name, even if its number happens to be lower -- it's
    // proof-backed, the resume number is a self-reported guess.
    if (!existing || existing.source === "resume") {
      byLabel.set(key, {
        skill_name: label, elo_value: row.elo_value, domain: row.domain,
        verification_state: row.verification_state, last_proof_date: row.last_proof_date, source: "arena",
      })
    }
  }
  return [...byLabel.values()].sort((a, b) => (b.elo_value || 0) - (a.elo_value || 0))
}

// Employment history has no dedicated table for the student path --
// profiles.experiences (jsonb) is it (same store recruiterComms.js's
// offer-accept flow writes to). There's no field distinguishing an
// internship from a regular job on this shape, so this infers it from the
// role/description text -- an honest heuristic, not a claim of certainty;
// the frontend should treat `employmentType` as a label, not verified fact
// (verificationStatus, already on each entry, is the actual trust signal).
function withEmploymentType(exp) {
  const hay = `${exp.role || ""} ${exp.description || ""}`.toLowerCase()
  return { ...exp, employmentType: /\bintern(ship)?\b/.test(hay) ? "internship" : "employment" }
}

// ─── Recruiter: full candidate portfolio (2026-08-07, evidence rebuild 2026-08-08) ───
// GET /candidates/:id was missing entirely -- capabilio-recruiter's
// Candidate Discovery card had no way to open a real profile at all (its
// only "profile" page was a legacy, disconnected Firestore-backed screen
// that never had data for a Supabase-sourced candidate). This is the real
// equivalent of capabilio-web's own Aura dashboard, reached by a recruiter.
//
// 2026-08-08: rebuilt per explicit request for "complete transparency ...
// with evidence and proof rather than claiming like resumes":
//   - `proofOfSkills` (was `careerTimeline`) -- each completed, portfolio-
//     visible Arena challenge now includes the FULL evidence trail: the
//     task scenario/objective the candidate was given, what they actually
//     submitted (user_answer), and the AI feedback explaining the score --
//     not just a title and a number. Same visible_in_portfolio gate as
//     before -- a recruiter is not a more-privileged viewer than the
//     public Portfolio page.
//   - `careerTimeline` now means what the name actually says: employment
//     history (and internships, inferred via withEmploymentType) from
//     profiles.experiences -- previously this key held Arena challenge
//     history, which was a mislabel this request called out directly.
//   - `codeDna` -- new. A candidate's GitHub-derived profile (from
//     proof_objects, source='github_code_dna'), gated on the SAME
//     is_recruiter_visible flag that column already exists for. Returns
//     null if the candidate never ran Code DNA or opted it out of
//     recruiter visibility -- never fabricated.
//   - `skills` now merges profiles.skill_graph (resume-seeded estimate)
//     with the skill_graph table (live, proof-backed) -- see
//     mergeSkillSources() above for why neither alone was sufficient.
//
// Re-applies the exact same discoverability gate as the list endpoint --
// knowing a candidate's id (e.g. from an old link) must not bypass
// recruiter_discoverable/employment_status/org_type.
router.get("/candidates/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(`${RESULT_FIELDS}, skill_graph, experiences, profile_summary`)
      .eq("id", id)
      .eq("recruiter_discoverable", true)
      .neq("employment_status", "active_hidden")
      .is("org_type", null)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!profile) return res.status(404).json({ error: "Candidate not found or not visible to recruiters." })

    const [
      { data: skillRows },
      { data: arenaRows },
      { data: interviewRows },
      { data: certRows },
      { data: artifactRows },
      { data: codeDnaRow },
    ] = await Promise.all([
      supabaseAdmin.from("skill_graph")
        .select("skill_name, domain, elo_value, verification_state, last_proof_date")
        .eq("user_id", id).eq("is_current", true).order("elo_value", { ascending: false }),
      supabaseAdmin.from("arena_history")
        .select("id, title, domain, skill_name, difficulty, score, elo_delta, type, challenge_type, summary, completed_at, scenario, objective, expected_output, user_answer, feedback")
        .eq("user_id", id).eq("visible_in_portfolio", true)
        .not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(50),
      supabaseAdmin.from("interview_sessions")
        .select("id, module_id, mode, completed_at")
        .eq("user_id", id).not("completed_at", "is", null).order("completed_at", { ascending: false }),
      supabaseAdmin.from("professional_certifications")
        .select("cert_name, cert_type, issuer, verification_status, verified_at")
        .eq("user_id", id).eq("verification_status", "verified").order("verified_at", { ascending: false }),
      supabaseAdmin.from("av2_portfolio_artifacts")
        .select("id, artifact_type, storage_url, created_at")
        .eq("user_id", id).eq("publish_state", "published").order("created_at", { ascending: false }),
      supabaseAdmin.from("proof_objects")
        .select("source_ref, score, completed_at, trust_level, title")
        .eq("user_id", id).eq("source", "github_code_dna").eq("proof_type", "code_dna_profile")
        .eq("is_recruiter_visible", true).maybeSingle(),
    ])

    const trackNameBySlug = await resolveCareerBySlug([profile.career_track_slug])
    const elo = canonicalElo(profile)
    const { skill_graph: profileSkillGraph, experiences, ...profileRest } = profile

    // 2026-09-03: this used to build its own inline object straight from
    // proof_objects.source_ref — username, avatar, bio, follower count,
    // exact commit count, the full languages[] array, and the ENTIRE raw
    // topRepos[] array (names, stars, forks, URLs) were sent straight to the
    // recruiter product. That directly contradicted recruiterEvidence.js's
    // own stated policy ("Recruiters must NEVER see raw GitHub analytics").
    // Now uses the same canonical, safe builder portfolioPublic.js uses —
    // one evidence contract, enforced in one place instead of stated in a
    // comment one of two call sites didn't follow. Also adds the candidate's
    // GitHub username separately (buildCodeDnaRecruiterView omits it, same
    // as it always has) since the recruiter product needs a "View on
    // GitHub" link, not because raw analytics should follow it.
    const codeDna = codeDnaRow ? { ...buildCodeDnaRecruiterView(codeDnaRow), username: codeDnaRow.source_ref?.username || null } : null

    res.json({
      candidate: {
        ...profileRest,
        avatar_url: profileRest.avatar_url || profileRest.profile_photo_url || null,
        elo,
        performance_tier: performanceTier(elo),
        career: resolveCareerName(profile, trackNameBySlug),
        // Same field the candidate's own public Portfolio page renders as its
        // "Bio summary" (Portfolio.jsx) -- either self-written or AI-generated
        // via Aura.jsx's ProfileSummaryCard, both writing profiles.profile_summary.
        professionalSummary: profileRest.profile_summary || null,
      },
      skills: mergeSkillSources(skillRows, profileSkillGraph),
      proofOfSkills: (arenaRows || []).map((r) => ({ ...r, grade: gradeFor(r.score) })),
      careerTimeline: (experiences || []).filter((e) => e && e.company).map(withEmploymentType),
      codeDna,
      interviewsCompleted: interviewRows || [],
      certifications: certRows || [],
      portfolioArtifacts: artifactRows || [],
    })
  } catch (err) {
    console.error("[partner-bridge/candidates/:id]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /candidates/:id/message — send a message to a candidate.
// Body: { partnerCompanyId, companyName, linkId (required for students),
//         subject, body }
router.post("/candidates/:id/message", async (req, res) => {
  try {
    const { id } = req.params
    const { partnerCompanyId, companyName, linkId, subject, body } = req.body || {}
    if (!partnerCompanyId) return res.status(400).json({ error: "partnerCompanyId is required." })
    if (!body || !String(body).trim()) return res.status(400).json({ error: "body is required." })

    const candidate = await loadVisibleCandidate(id)
    if (!candidate) return res.status(404).json({ error: "Candidate not found or not visible to recruiters." })

    if (candidate.path_type === "student") {
      const gateErr = await checkStudentAccessGate(id, linkId)
      if (gateErr) return res.status(gateErr.status).json({ error: gateErr.error })
    }

    const fromId = partnerPseudoId(partnerCompanyId)
    // sender_company_name (2026-08-09): from_user_id here is a synthetic
    // pseudo-uuid with no matching profiles row, so the candidate-side
    // Messages UI's from_user_id(...) embed can't resolve a real name for
    // it -- this column is the only way that UI can show "Acme Corp sent
    // you a message" instead of a bare id.
    const { data, error } = await supabaseAdmin.from("recruiter_messages").insert({
      from_user_id: fromId,
      to_user_id: id,
      message_type: "message",
      subject: subject ? String(subject).slice(0, 200) : null,
      body: String(body).trim(),
      sender_company_name: companyName ? String(companyName).slice(0, 200) : null,
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })

    // Best-effort — the message itself already succeeded above regardless
    // of whether the candidate's notification bell insert works.
    await supabaseAdmin.from("notifications").insert({
      user_id: id,
      type: "recruiter_message",
      title: "New Message",
      body: `${companyName || "A recruiter"} sent you a message${subject ? `: ${subject}` : ""}`,
      entity_id: data.id,
      entity_type: "recruiter_message",
    }).catch(() => {})

    console.log(`[partner-bridge] message sent to candidate ${id} from partner company ${partnerCompanyId}`)
    res.json({ success: true, message: data })
  } catch (err) {
    console.error("[partner-bridge/candidates/:id/message]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /candidates/:id/messages?partnerCompanyId=X — full thread with this candidate.
router.get("/candidates/:id/messages", async (req, res) => {
  try {
    const { id } = req.params
    const partnerCompanyId = String(req.query.partnerCompanyId || "").trim()
    if (!partnerCompanyId) return res.status(400).json({ error: "partnerCompanyId query param is required." })
    const fromId = partnerPseudoId(partnerCompanyId)

    const { data, error } = await supabaseAdmin
      .from("recruiter_messages")
      .select("id, from_user_id, to_user_id, subject, body, sender_company_name, created_at")
      .or(`and(from_user_id.eq.${fromId},to_user_id.eq.${id}),and(from_user_id.eq.${id},to_user_id.eq.${fromId})`)
      .order("created_at", { ascending: true })
      .limit(200)
    if (error) return res.status(500).json({ error: error.message })

    res.json({ messages: (data || []).map((m) => ({ ...m, direction: m.from_user_id === fromId ? "outgoing" : "incoming" })) })
  } catch (err) {
    console.error("[partner-bridge/candidates/:id/messages]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /candidates/:id/schedule — schedule an interview call with a candidate.
// Body: { partnerCompanyId, companyName, linkId (required for students),
//         scheduled_at, duration_mins, interview_type, meeting_link, title, description }
// Time + notification only in this pass (per confirmed scope) — no calendar
// invite or video-room provisioning.
router.post("/candidates/:id/schedule", async (req, res) => {
  try {
    const { id } = req.params
    const {
      partnerCompanyId, companyName, linkId,
      scheduled_at, duration_mins, interview_type, meeting_link, title, description,
    } = req.body || {}
    if (!partnerCompanyId) return res.status(400).json({ error: "partnerCompanyId is required." })
    if (!scheduled_at) return res.status(400).json({ error: "scheduled_at is required." })
    const when = new Date(scheduled_at)
    if (Number.isNaN(when.getTime())) return res.status(400).json({ error: "scheduled_at must be a valid date/time." })

    const candidate = await loadVisibleCandidate(id)
    if (!candidate) return res.status(404).json({ error: "Candidate not found or not visible to recruiters." })

    if (candidate.path_type === "student") {
      const gateErr = await checkStudentAccessGate(id, linkId)
      if (gateErr) return res.status(gateErr.status).json({ error: gateErr.error })
    }

    const recruiterId = partnerPseudoId(partnerCompanyId)
    const { data, error } = await supabaseAdmin.from("interview_schedules").insert({
      candidate_id: id,
      recruiter_id: recruiterId,
      interview_type: interview_type || "video",
      stage: "initial",
      title: title || `Interview call with ${companyName || "a recruiter"}`,
      description: description || null,
      scheduled_at: when.toISOString(),
      duration_mins: Number.isFinite(parseInt(duration_mins, 10)) ? parseInt(duration_mins, 10) : 45,
      meeting_link: meeting_link || null,
      status: "scheduled",
      candidate_status: "pending",
    }).select().single()
    if (error) return res.status(500).json({ error: error.message })

    await supabaseAdmin.from("notifications").insert({
      user_id: id,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      body: `${companyName || "A recruiter"} scheduled a call for ${when.toLocaleString("en-IN")}`,
      entity_id: data.id,
      entity_type: "interview_schedule",
    }).catch(() => {})

    console.log(`[partner-bridge] interview scheduled for candidate ${id} by partner company ${partnerCompanyId}`)
    res.json({ success: true, schedule: data })
  } catch (err) {
    console.error("[partner-bridge/candidates/:id/schedule]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /candidates/:id/schedules?partnerCompanyId=X — this company's schedules with this candidate.
router.get("/candidates/:id/schedules", async (req, res) => {
  try {
    const { id } = req.params
    const partnerCompanyId = String(req.query.partnerCompanyId || "").trim()
    if (!partnerCompanyId) return res.status(400).json({ error: "partnerCompanyId query param is required." })
    const recruiterId = partnerPseudoId(partnerCompanyId)

    const { data, error } = await supabaseAdmin
      .from("interview_schedules")
      .select("id, interview_type, stage, title, description, scheduled_at, duration_mins, meeting_link, status, candidate_status, created_at")
      .eq("candidate_id", id)
      .eq("recruiter_id", recruiterId)
      .order("scheduled_at", { ascending: true })
    if (error) return res.status(500).json({ error: error.message })

    res.json({ schedules: data || [] })
  } catch (err) {
    console.error("[partner-bridge/candidates/:id/schedules]", err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get("/institutions", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, org_name, name, updated_at")
      .eq("org_type", "institution")
      .order("org_name", { ascending: true })
      .limit(200)
    if (error) return res.status(500).json({ error: error.message })

    const institutions = (data || []).map((p) => ({
      id: p.id,
      name: p.org_name || p.name || "Unnamed institution",
    }))
    res.json({ institutions })
  } catch (err) {
    console.error("[partner-bridge/institutions]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Recruiter: list institution invites addressed to this company ─────────
// Matched by company_email (what the institution typed when inviting) OR
// partner_accepted_by (for invites this same bridge already accepted, so a
// re-fetch shows current status). Case-insensitive exact match, not a
// substring search -- ilike with no wildcards.
router.get("/company-invites", async (req, res) => {
  try {
    const email = (req.query.email || "").trim()
    if (!email) return res.status(400).json({ error: "email query param is required." })

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100)
    const safeEmail = email.replace(/[,()]/g, "") // keep the .or() filter string well-formed

    const { data, error } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, company_name, company_email, company_website, company_address, company_size, industry, notes, status, visibility, created_at, linked_at, accepted_via")
      .or(`company_email.ilike.${safeEmail},partner_accepted_by.ilike.${safeEmail}`)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) return res.status(500).json({ error: error.message })

    const orgIds = [...new Set((data || []).map((l) => l.institution_org_id))]
    let orgNames = {}
    if (orgIds.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, org_name, name").in("id", orgIds)
      orgNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.org_name || p.name || "An institution"]))
    }

    res.json({
      invites: (data || []).map((l) => ({ ...l, institution_name: orgNames[l.institution_org_id] || "An institution" })),
    })
  } catch (err) {
    console.error("[partner-bridge/company-invites]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Recruiter: accept an institution invite ────────────────────────────────
router.post("/company-invites/:id/accept", async (req, res) => {
  try {
    const partnerCompanyId = String(req.body?.partnerCompanyId || "").trim()
    const acceptedByEmail = String(req.body?.acceptedByEmail || "").trim()
    if (!partnerCompanyId)
      return res.status(400).json({ error: "partnerCompanyId is required." })

    const { data: link, error: fetchErr } = await supabaseAdmin
      .from("org_company_links")
      .select("id, status, company_user_id")
      .eq("id", req.params.id)
      .single()
    if (fetchErr || !link) return res.status(404).json({ error: "Invite not found." })
    if (link.company_user_id)
      return res.status(409).json({ error: "This invite was already accepted through a Capabilio company account." })
    if (link.status !== "invited")
      return res.status(409).json({ error: `This invite was already ${link.status}.` })

    // Re-assert status='invited' in the WHERE clause as an optimistic-
    // concurrency guard against two simultaneous accept calls racing on the
    // same row -- .single() on the result means "someone else already
    // claimed it between our SELECT and this UPDATE" surfaces as a 409, not
    // a silent double-accept.
    const { data: updated, error } = await supabaseAdmin
      .from("org_company_links")
      .update({
        status: "active",
        linked_at: new Date().toISOString(),
        nda_signed_at: new Date().toISOString(),
        partner_company_ref: partnerCompanyId,
        partner_accepted_by: acceptedByEmail || null,
        accepted_via: "partner_bridge",
      })
      .eq("id", req.params.id)
      .eq("status", "invited")
      .select()
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!updated) return res.status(409).json({ error: "This invite was just actioned by someone else — refresh and check its status." })

    console.log(`[partner-bridge] company-invite ${req.params.id} accepted (partner_company_ref=${partnerCompanyId})`)
    res.json({ success: true, link: updated })
  } catch (err) {
    console.error("[partner-bridge/company-invites/accept]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Recruiter: decline an institution invite ───────────────────────────────
router.post("/company-invites/:id/decline", async (req, res) => {
  try {
    const { data: link } = await supabaseAdmin
      .from("org_company_links")
      .select("id, status")
      .eq("id", req.params.id)
      .single()
    if (!link) return res.status(404).json({ error: "Invite not found." })
    if (link.status !== "invited")
      return res.status(409).json({ error: `This invite was already ${link.status}.` })

    const { data: updated, error } = await supabaseAdmin
      .from("org_company_links")
      .update({ status: "rejected" })
      .eq("id", req.params.id)
      .eq("status", "invited")
      .select()
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!updated) return res.status(409).json({ error: "This invite was just actioned by someone else — refresh and check its status." })

    res.json({ success: true })
  } catch (err) {
    console.error("[partner-bridge/company-invites/decline]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Recruiter -> connected-college roster + per-student access requests
// Added 2026-08-06 — closes the "reverse direction" gap noted in the file
// header above. A recruiter can now:
//   1. List its own ACTIVE college connections (GET /company-links)
//   2. View that college's tier-scoped aggregate roster (GET .../students)
//   3. Request contact access to ONE specific student (POST .../request-access)
//   4. Check the status of its own requests (GET .../access-requests)
// Approval itself happens on the college side (backend/server/routes/
// college.js's placement-cell decide route) — nothing here can self-approve.
// See recruiter_student_access_requests_migration.sql for the schema.
// ─────────────────────────────────────────────────────────────────────────────

// Matches the same email-based identity pattern as /company-invites above —
// a recruiter has no profiles row here, so "which links are mine" is
// resolved by matching the email they authenticate as on capabilio-recruiter
// against company_email (set at invite time) or partner_accepted_by (set
// when they accepted through this same bridge).
router.get("/company-links", async (req, res) => {
  try {
    const email = (req.query.email || "").trim()
    if (!email) return res.status(400).json({ error: "email query param is required." })
    const safeEmail = email.replace(/[,()]/g, "")

    const { data, error } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, company_name, status, visibility, linked_at")
      .or(`company_email.ilike.${safeEmail},partner_accepted_by.ilike.${safeEmail}`)
      .eq("status", "active")
      .order("linked_at", { ascending: false })
    if (error) return res.status(500).json({ error: error.message })

    const orgIds = [...new Set((data || []).map((l) => l.institution_org_id))]
    let orgNames = {}
    if (orgIds.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, org_name, name").in("id", orgIds)
      orgNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.org_name || p.name || "An institution"]))
    }

    res.json({ links: (data || []).map((l) => ({ ...l, institution_name: orgNames[l.institution_org_id] || "An institution" })) })
  } catch (err) {
    console.error("[partner-bridge/company-links]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Aggregate, tier-scoped roster — identical query/columns to the company-side
// /org/company-links/:id/students route, via the same fetchLinkStudents
// helper. No individual student is contactable from this data alone.
router.get("/company-links/:linkId/students", async (req, res) => {
  try {
    const { data: link } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, status, visibility")
      .eq("id", req.params.linkId)
      .single()
    if (!link) return res.status(404).json({ error: "Link not found." })
    if (link.status !== "active") return res.status(403).json({ error: "This connection is not active." })

    const { students, error } = await fetchLinkStudents(link)
    if (error) return res.status(500).json({ error })
    res.json({ students, visibility: link.visibility })
  } catch (err) {
    console.error("[partner-bridge/company-links/students]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /company-links/:linkId/students/:studentId/request-access
// Body: { partnerCompanyId, requestedByEmail, reason }
// Creates (or resets to pending, if previously denied) a per-student request.
// This does NOT grant anything by itself — decide happens on the college
// side. studentId is verified to actually belong to this link's institution
// before a row is created, so a recruiter can't request access to an
// arbitrary profiles.id unrelated to this college.
router.post("/company-links/:linkId/students/:studentId/request-access", async (req, res) => {
  try {
    const { data: link } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, status")
      .eq("id", req.params.linkId)
      .single()
    if (!link) return res.status(404).json({ error: "Link not found." })
    if (link.status !== "active") return res.status(403).json({ error: "This connection is not active." })

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("id, user_id")
      .eq("org_id", link.institution_org_id)
      .eq("user_id", req.params.studentId)
      .eq("role", "student")
      .maybeSingle()
    if (!member) return res.status(404).json({ error: "This student isn't part of that college's roster." })

    const partnerCompanyId = String(req.body?.partnerCompanyId || "").trim()
    const requestedByEmail = String(req.body?.requestedByEmail || "").trim()
    const reason = String(req.body?.reason || "").trim() || null

    const { data: upserted, error } = await supabaseAdmin
      .from("recruiter_student_access_requests")
      .upsert(
        {
          org_company_link_id: link.id,
          student_id: req.params.studentId,
          requested_by_partner_ref: partnerCompanyId || null,
          requested_by_email: requestedByEmail || null,
          reason,
          status: "pending",
          decided_by: null,
          decided_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_company_link_id,student_id" }
      )
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })

    res.json({ request: upserted })
  } catch (err) {
    console.error("[partner-bridge/request-access]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /company-links/:linkId/access-requests — a recruiter's own requests
// for this link, so the UI can show pending/approved/denied per student.
router.get("/company-links/:linkId/access-requests", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("recruiter_student_access_requests")
      .select("id, student_id, status, reason, created_at, decided_at")
      .eq("org_company_link_id", req.params.linkId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ requests: data || [] })
  } catch (err) {
    console.error("[partner-bridge/access-requests]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /access-requests/:studentId/status?linkId=X — single-row status check.
// Used by capabilio-recruiter-backend to gate task assignment: it must see
// status === "approved" here before it's allowed to insert into its own
// tasks_challenges table for this student. Returns "none" (not "denied")
// when no request row exists at all, so callers can tell "never asked"
// apart from "asked and refused".
router.get("/access-requests/:studentId/status", async (req, res) => {
  try {
    const linkId = String(req.query.linkId || "").trim()
    if (!linkId) return res.status(400).json({ error: "linkId query param is required." })

    const { data, error } = await supabaseAdmin
      .from("recruiter_student_access_requests")
      .select("status")
      .eq("org_company_link_id", linkId)
      .eq("student_id", req.params.studentId)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })

    res.json({ status: data?.status || "none" })
  } catch (err) {
    console.error("[partner-bridge/access-requests/status]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Instant-verify: recruiter-facing summary of real, verified claims ──────
// 2026-08-12 (resume-free hiring vision) — lets capabilio-recruiter show a
// candidate's REAL verification status inline (employment + certifications),
// backed by the same hash-chained verification_audit_log the candidate's own
// Vault/Trust Center reads (lib/verification/auditLog.js), instead of a
// recruiter having to trust an unverifiable resume claim. Read-only, no
// scoring/hiring decision is made here — see project rule against letting AI
// write authoritative outcomes; this only surfaces facts already established
// by deterministic, human-in-the-loop verification paths (EPFO match,
// employer attestation, certificate OCR).
//
// Deliberately does NOT run auditLog.verifyChainIntegrity() per request —
// that walks the ENTIRE global chain (all users), which is fine for an
// on-demand admin/candidate check but would be an unbounded, ever-growing
// cost on every recruiter candidate-view. getAuditLog(userId) is a plain
// indexed lookup instead. Full-chain integrity verification stays available
// via GET /api/verification/integrity for whoever needs the stronger check.
router.get("/candidates/:id/verification", async (req, res) => {
  try {
    const candidate = await loadVisibleCandidate(req.params.id)
    if (!candidate) return res.status(404).json({ error: "Candidate not found or not visible to recruiters." })

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("experiences, uan_verified, education_verified")
      .eq("id", candidate.id)
      .single()
    if (profileErr) return res.status(500).json({ error: profileErr.message })

    const experiences = Array.isArray(profile?.experiences) ? profile.experiences : []
    const verifiedEmployment = experiences
      .filter(e => e.verificationStatus === "verified")
      .map(e => ({
        company: e.company || e.displayCompany || null,
        role: e.role || e.title || null,
        startDate: e.startDate || null,
        endDate: e.endDate || null,
        isCurrent: !!e.isCurrent,
        verificationSource: e.verificationSource || null, // "AuthBridge/EPFO" | "Employer Attestation"
        verifiedAt: e.attestedAt || null,
      }))

    const { data: certRows, error: certErr } = await supabaseAdmin
      .from("professional_certifications")
      .select("cert_name, cert_type, issuer, verification_status, verified_at")
      .eq("user_id", candidate.id)
      .eq("verification_status", "verified")
    if (certErr) console.error("[partner-bridge/verification] cert lookup failed:", certErr.message)

    let auditTrail = []
    try {
      const entries = await auditLog.getAuditLog(candidate.id)
      // Redacted view: no `details` payload (may reference a specific
      // document/company-search context not meant for a third party) --
      // just enough for a recruiter to see WHAT was checked, by WHICH
      // provider, and the outcome, matching the candidate's own Vault view.
      auditTrail = entries.map(e => ({
        seq: e.seq,
        providerId: e.provider_id,
        capabilityUsed: e.capability_used,
        result: e.result,
        confidence: e.confidence,
        verifiedAt: e.created_at,
      }))
    } catch (auditErr) {
      console.error("[partner-bridge/verification] audit log read failed:", auditErr.message)
    }

    res.json({
      candidateId: candidate.id,
      summary: {
        verifiedEmploymentCount: verifiedEmployment.length,
        totalEmploymentCount: experiences.length,
        verifiedCertificationCount: certRows?.length || 0,
        auditEntryCount: auditTrail.length,
      },
      verifiedEmployment,
      verifiedCertifications: (certRows || []).map(c => ({
        certName: c.cert_name, certType: c.cert_type, issuer: c.issuer, verifiedAt: c.verified_at,
      })),
      auditTrail,
    })
  } catch (err) {
    console.error("[partner-bridge/candidates/:id/verification]", err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
