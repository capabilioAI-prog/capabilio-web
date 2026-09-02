/**
 * Pulse (social feed) + Nexus (network) Routes
 *
 * Pulse:
 *   GET  /api/pulse/feed           — paginated feed
 *   GET  /api/pulse/proof-candidates — current user's shareable verified achievements
 *   POST /api/pulse/posts          — create post (post_type="proof" is server-verified, see resolveProofRef)
 *   PUT  /api/pulse/posts/:id      — edit post
 *   DELETE /api/pulse/posts/:id    — delete post
 *   POST /api/pulse/posts/:id/interact — acknowledge/signal/save/repost
 *   GET  /api/pulse/posts/:id/comments — get top-level comments (parent_id null)
 *   POST /api/pulse/posts/:id/comments — add comment or reply (parent_id)
 *   GET  /api/pulse/comments/:id/replies — get replies to a comment
 *   POST /api/pulse/comments/:id/like  — toggle like on a comment
 *   GET  /api/pulse/comments/:id/likers — who liked a comment
 *   GET  /api/pulse/posts/:id/likers   — who reacted (defaults to "acknowledge"/like)
 *   GET  /api/pulse/stories            — active (unexpired) stories, grouped by author
 *   POST /api/pulse/stories            — create a story (image upload or text)
 *   POST /api/pulse/stories/:id/view   — mark viewed by current user
 *   GET  /api/pulse/stories/:id/viewers — who viewed (author-only)
 *   DELETE /api/pulse/stories/:id      — owner-only early delete
 *
 * Nexus:
 *   GET  /api/nexus/search         — search professionals
 *   GET  /api/nexus/profile/:uid   — public profile
 *   POST /api/nexus/connect        — send connection request
 *   PUT  /api/nexus/connect/:id    — accept/reject connection
 *   POST /api/nexus/follow         — follow user
 *   DELETE /api/nexus/follow/:uid  — unfollow
 *   GET  /api/nexus/connections    — list connections
 *   GET  /api/nexus/notifications  — notifications
 *   POST /api/nexus/notifications/read — mark read
 *   GET  /api/pulse/market-insights   — AI market trends + tech news (Groq, source: "ai_estimate")
 *   GET  /api/pulse/trending-tags     — real tech_tags counts from recent posts
 */
import { Router }     from "express"
import multer         from "multer"
import { supabaseAdmin } from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ── Simple in-memory cache — market insights change slowly, no need to hit
//    Groq on every page load. Cache per domain for 2 hours.
const insightsCache = new Map()  // key: domain → { data, expiresAt }
const CACHE_TTL_MS  = 2 * 60 * 60 * 1000  // 2 hours

function optionalAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return next()
  supabaseAdmin.auth.getUser(token).then(({ data: { user } }) => { req.user = user; next() }).catch(() => next())
}

// ══════════════════════════════════════════
// PULSE
// ══════════════════════════════════════════

// ── Market Insights + Tech News (Groq) ──────────────────────────────────────
// Called by Pulse page for market trends and technology news.
// 2026-07-29: Groq-only, no live search grounding — this is an LLM estimate,
// not a real-time web search result. source: "ai_estimate" reflects that
// honestly to the frontend, which must never label this "Live".
// Cached per domain for 2 hours so we don't burn API quota on repeated page loads.
// NOTE: this route was previously defined TWICE in this file — a live bug.
// Express dispatches to whichever handler is registered first, so the older
// definition (which queried a "mentor_profiles" table that has never been
// migrated anywhere and always fell through to an empty list) silently won
// every time, and the version below — which has a real, working fallback to
// profiles.is_mentor — never ran. Removed the dead duplicate; see the
// surviving definition further down this file for the real implementation.

router.get("/pulse/market-insights", optionalAuth, async (req, res) => {
  const domain = (req.query.domain || "technology").toLowerCase().trim()
  const role   = req.query.role   || "Professional"
  // Pulse redesign (2026-07-26): accept the user's own top skills so the
  // generated report is grounded in what THIS person actually knows, not
  // just their domain/role label — "a backend engineer with Go + gRPC
  // skills" gets a different (more specific) report than a generic
  // "Backend" domain query. Capped at 8 to keep the prompt bounded.
  // NOT part of the cache key (see below) — only used to steer the prompt.
  const skills = (req.query.skills || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 8)

  // Cache key is domain-only (not skills/role) — this is a deliberate trade,
  // not an oversight: caching per (domain × role × skills) combination would
  // fragment the cache across near-infinite keys and burn Groq quota
  // on every distinct user instead of sharing one fetch per domain per 2h.
  // The frontend compensates for this by re-ranking/highlighting the shared
  // report's items against the user's own skills client-side (see
  // Pulse.jsx) rather than requesting a uniquely personalized report here.
  const cacheKey = domain
  const cached = insightsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ...cached.data, cached: true })
  }

  try {
    const prompt = `You are a tech career market analyst for the Indian IT industry.
Provide a concise market intelligence report for: "${role}" / "${domain}" domain.
${skills.length ? `The audience's specific skills are: ${skills.join(", ")}. Where relevant, call out which trends/skills connect directly to these.` : ""}

Include:
1. Top 3 trending technologies RIGHT NOW in Indian tech companies (2025)
2. Top 5 companies actively hiring for this role in India (with approximate salary range)
3. Key skills in high demand vs. declining skills
4. 2-3 recent industry news items relevant to this domain (cite real events)
5. Job market outlook: is demand growing, stable, or declining?

Format as JSON:
{
  "trending_techs": [{ "name": "...", "reason": "1 sentence why trending", "demand": "High|Growing|Stable" }],
  "hiring_companies": [{ "company": "...", "roles": ["..."], "salary_lpa": "X-Y LPA" }],
  "skills": { "rising": ["..."], "declining": ["..."] },
  "news": [{ "headline": "...", "summary": "1 sentence", "date": "approx date" }],
  "market_outlook": "Growing|Stable|Declining",
  "outlook_reason": "1-2 sentences"
}`

    // Groq-only (2026-07-29): Gemini Search was removed from this path —
    // the deployed backend's GEMINI_API_KEY was unreliable/unset and every
    // call was throwing before it ever reached the Groq fallback below,
    // producing the "signals unavailable" state users were seeing. Groq has
    // no live Google Search grounding, so this is an LLM estimate, not a
    // real-time search result — the honest `source: "ai_estimate"` field
    // below (unconditional now) tells the frontend never to label this
    // "Live", same honesty requirement as the 2026-07-26 Pulse redesign.
    // NOTE: this file's `groq` import is a plain async function
    // groq(messages, opts) — not an OpenAI-SDK-style client. The original
    // version of this edit called groq.chat.completions.create(...), which
    // is the SDK shape, not this lib's shape; that threw "Cannot read
    // properties of undefined (reading 'completions')" on every request,
    // which is why this route kept reporting "unavailable" even after the
    // 403 route-shadowing bug (mentorMarketplaceAdmin.js) was fixed. Fixed
    // to call groq() the way every other route in this codebase (arena.js)
    // already does.
    const text = await Promise.race([
      groq([
        { role: "system", content: "You are a tech career market analyst for India. Respond ONLY with valid JSON, no markdown." },
        { role: "user",   content: prompt },
      ], { model: GROQ_FAST, max_tokens: 1500, temperature: 0.4, json: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Groq timeout")), 12000))
    ])

    // Extract JSON from response
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
    const data  = JSON.parse(match ? (match[1] || match[0]) : text)

    const payload = {
      domain, role, ...data,
      // Real, computed count (not a fabricated number) — the frontend used
      // to show a static hardcoded "open roles" figure per domain; this is
      // the honest replacement: however many companies the report actually
      // named.
      companies_hiring_count: Array.isArray(data.hiring_companies) ? data.hiring_companies.length : 0,
      source: "ai_estimate",
      generatedAt: new Date().toISOString(),
    }
    insightsCache.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS })

    console.log(`[pulse/market-insights] Generated for "${domain}" (source=${payload.source})`)
    return res.json(payload)
  } catch (e) {
    console.error("[pulse/market-insights]", e.message)
    // Return stale cache if available rather than a hard error
    if (cached) return res.json({ ...cached.data, cached: true, stale: true })
    // Last resort: empty but valid response, explicitly flagged as
    // unavailable so the frontend shows an honest empty state instead of
    // any fallback content.
    return res.json({ domain, role, trending_techs: [], hiring_companies: [], skills: { rising: [], declining: [] }, news: [], market_outlook: null, outlook_reason: null, companies_hiring_count: 0, source: "unavailable", generatedAt: new Date().toISOString(), _error: true })
  }
})

// ── Trending tech tags (real aggregation, not hardcoded hashtags) ──────────
// Pulse redesign (2026-07-26): replaces the frontend's hardcoded
// "#OpenAI / #SystemDesign / ..." list with an actual count of tech_tags
// used across recent real posts. Honest empty array if there isn't enough
// post activity yet — never backfilled with placeholder tags.
router.get("/pulse/trending-tags", optionalAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 20)
    // Bound the scan to the most recent public posts rather than the whole
    // table — trending should reflect recent activity, and this keeps the
    // query cheap regardless of how large pulse_posts grows.
    const { data: posts, error } = await supabaseAdmin
      .from("pulse_posts")
      .select("tech_tags")
      .eq("visibility", "public")
      .eq("is_moderated", false)
      .order("created_at", { ascending: false })
      .limit(500)
    if (error) throw error

    const counts = new Map()
    for (const p of posts || []) {
      for (const tag of (p.tech_tags || [])) {
        const key = tag.startsWith("#") ? tag : `#${tag}`
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }
    const tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }))

    res.json({ tags, sampledPosts: (posts || []).length, generatedAt: new Date().toISOString() })
  } catch (e) {
    res.status(500).json({ error: e.message, tags: [] })
  }
})

router.get("/pulse/feed", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, tech_tag, role_tag, author_id, sort = "created_at" } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    // Map sort param → DB column
    const sortCol = sort === "discussed" ? "comment_count"
                  // "liked" is the current sort id (Pulse redesign — Signal
                  // was consolidated into the single Like/Acknowledge
                  // reaction). "signal"/"acknowledged" kept mapped for any
                  // stale client/bookmark still sending the old param names.
                  : sort === "liked"     ? "acknowledge_count"
                  : sort === "acknowledged" ? "acknowledge_count"
                  : sort === "signal"    ? "signal_count"
                  : "created_at"

    let q = supabaseAdmin.from("pulse_posts")
      .select("*, author:profiles!author_id(id,name,display_name,username,profile_photo_url,elo_rating,verification_state,path,keyword)", { count: "exact" })
      .eq("visibility", "public")
      .eq("is_moderated", false)
      .order(sortCol, { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (author_id) q = q.eq("author_id", author_id)
    if (tech_tag) q = q.contains("tech_tags", [tech_tag])
    if (role_tag) q = q.contains("role_tags", [role_tag])

    const { data: posts, error, count } = await q
    if (error) throw error

    // Inline verified-skill badge per author — Proof Posts feature. One
    // batched query per page (like the interactions query below), not
    // per-post, to avoid N+1. Picks each author's highest level_score
    // VERIFIED skill; visible to every viewer (not gated on req.user) since
    // it's about the post's author, not the current viewer.
    let enrichedPosts = posts || []
    const authorIds = [...new Set(enrichedPosts.map(p => p.author_id).filter(Boolean))]
    if (authorIds.length) {
      const { data: badgeSkills } = await supabaseAdmin.from("user_skills")
        .select("user_id,name,domain,level_score")
        .in("user_id", authorIds)
        .eq("verified", true)
        .order("level_score", { ascending: false })
      const badgeMap = {}
      ;(badgeSkills || []).forEach(s => { if (!badgeMap[s.user_id]) badgeMap[s.user_id] = s })
      enrichedPosts = enrichedPosts.map(p => ({
        ...p,
        author: p.author ? {
          ...p.author,
          verified_badge: badgeMap[p.author_id] ? { skill: badgeMap[p.author_id].name, domain: badgeMap[p.author_id].domain } : null,
        } : p.author,
      }))
    }

    // Add user's interaction state if authenticated
    if (req.user) {
      const postIds = enrichedPosts.map(p => p.id)
      if (postIds.length) {
        const { data: interactions } = await supabaseAdmin.from("post_interactions")
          .select("post_id,action").eq("user_id", req.user.id).in("post_id", postIds)
        const interactionMap = {}
        ;(interactions || []).forEach(i => {
          if (!interactionMap[i.post_id]) interactionMap[i.post_id] = []
          interactionMap[i.post_id].push(i.action)
        })
        enrichedPosts = enrichedPosts.map(p => ({ ...p, user_interactions: interactionMap[p.id] || [] }))
      }
    }

    res.json({ posts: enrichedPosts, total: count || 0, page: parseInt(page) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Re-fetches the real achievement a Proof Post claims to be about, keyed by
// (sourceType, sourceId) and scoped to the requesting user — this is the
// entire trust boundary of the feature. The client sends only a pointer
// ("I want to share proof_object #123"); every displayed fact (title, score,
// ELO delta, skill tags, verified-ness) is read back from the source table
// here, never taken from req.body. If the row doesn't exist or doesn't
// belong to this user, the post is rejected outright rather than falling
// back to unverified content.
async function resolveProofRef(userId, ref) {
  const sourceType = ref?.sourceType
  const sourceId   = ref?.sourceId
  if (!sourceType || !sourceId) return null

  if (sourceType === "proof_object") {
    const { data } = await supabaseAdmin.from("proof_objects")
      .select("id,title,domain,skill,skills_demonstrated,difficulty,score,elo_delta,trust_level,completed_at")
      .eq("id", sourceId).eq("user_id", userId).eq("is_portfolio_visible", true).maybeSingle()
    if (!data) return null
    return {
      sourceType, sourceId: data.id, title: data.title || "Completed Challenge",
      subtitle: [data.domain, data.skill].filter(Boolean).join(" · ") || null,
      score: data.score, eloDelta: data.elo_delta, skillTags: data.skills_demonstrated || [],
      difficulty: data.difficulty, verified: data.trust_level === "verified", verifiedAt: data.completed_at,
    }
  }
  if (sourceType === "elo_event") {
    const { data } = await supabaseAdmin.from("professional_elo_events")
      .select("id,delta,new_elo,reason,affected_skills,created_at")
      .eq("id", sourceId).eq("user_id", userId).maybeSingle()
    if (!data || !(data.delta > 0)) return null
    return {
      sourceType, sourceId: data.id, title: data.reason || "Skill Rating Improved",
      subtitle: `New rating: ${data.new_elo}`, score: null, eloDelta: data.delta,
      skillTags: data.affected_skills || [], difficulty: null, verified: true, verifiedAt: data.created_at,
    }
  }
  if (sourceType === "verified_skill") {
    const { data } = await supabaseAdmin.from("user_skills")
      .select("id,name,domain,level,level_score,verified,updated_at")
      .eq("id", sourceId).eq("user_id", userId).eq("verified", true).maybeSingle()
    if (!data) return null
    return {
      sourceType, sourceId: data.id, title: `${data.name} — Verified`,
      subtitle: [data.domain, data.level].filter(Boolean).join(" · ") || null,
      score: data.level_score, eloDelta: null, skillTags: [data.name],
      difficulty: null, verified: true, verifiedAt: data.updated_at,
    }
  }
  return null
}

// GET /pulse/proof-candidates — the current user's real, shareable
// achievements (recent verified proof_objects, positive Professional ELO
// events, and verified skills). This is what populates the "Share Proof"
// picker — the user only ever CHOOSES from this list, never types facts in.
router.get("/pulse/proof-candidates", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const [proofsRes, eloRes, skillsRes] = await Promise.all([
      supabaseAdmin.from("proof_objects")
        .select("id,title,domain,skill,skills_demonstrated,difficulty,score,elo_delta,trust_level,completed_at")
        .eq("user_id", uid).eq("is_portfolio_visible", true)
        .order("completed_at", { ascending: false }).limit(15),
      supabaseAdmin.from("professional_elo_events")
        .select("id,delta,new_elo,reason,affected_skills,created_at")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("user_skills")
        .select("id,name,domain,level,level_score,verified,updated_at")
        .eq("user_id", uid).eq("verified", true)
        .order("updated_at", { ascending: false }).limit(10),
    ])

    const proofCandidates = (proofsRes.data || []).map(p => ({
      sourceType: "proof_object", sourceId: p.id,
      title: p.title || "Completed Challenge",
      subtitle: [p.domain, p.skill].filter(Boolean).join(" · ") || null,
      score: p.score, eloDelta: p.elo_delta, skillTags: p.skills_demonstrated || [],
      difficulty: p.difficulty, verified: p.trust_level === "verified", date: p.completed_at,
    }))
    const eloCandidates = (eloRes.data || []).filter(e => (e.delta || 0) > 0).map(e => ({
      sourceType: "elo_event", sourceId: e.id,
      title: e.reason || "Skill Rating Improved", subtitle: `New rating: ${e.new_elo}`,
      score: null, eloDelta: e.delta, skillTags: e.affected_skills || [],
      difficulty: null, verified: true, date: e.created_at,
    }))
    const skillCandidates = (skillsRes.data || []).map(s => ({
      sourceType: "verified_skill", sourceId: s.id,
      title: `${s.name} — Verified`, subtitle: [s.domain, s.level].filter(Boolean).join(" · ") || null,
      score: s.level_score, eloDelta: null, skillTags: [s.name],
      difficulty: null, verified: true, date: s.updated_at,
    }))

    const candidates = [...proofCandidates, ...eloCandidates, ...skillCandidates]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
    res.json({ candidates })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pulse/posts", requireAuth, async (req, res) => {
  try {
    const { post_type = "text", content, media_urls = [], poll_data, event_data, type_data, tech_tags = [], role_tags = [], visibility = "public", proof_ref } = req.body

    let proofData = null
    if (post_type === "proof") {
      proofData = await resolveProofRef(req.user.id, proof_ref)
      if (!proofData) return res.status(400).json({ error: "Could not verify this achievement — it may not belong to you or no longer exists" })
    } else if (!content?.trim()) {
      return res.status(400).json({ error: "content required" })
    }

    // Structured per-type data (Win/Ask/Code) — light server-side validation
    // so a malformed client payload can't silently produce a broken card.
    let typeData = null
    if (post_type === "win") {
      if (!type_data?.metric?.trim() && !type_data?.result?.trim()) return res.status(400).json({ error: "Add what you achieved (metric or result)" })
      typeData = { metric: (type_data?.metric || "").trim() || null, result: (type_data?.result || "").trim() || null }
    } else if (post_type === "question") {
      typeData = { lookingFor: type_data?.lookingFor || null }
    } else if (post_type === "code") {
      if (!type_data?.code?.trim()) return res.status(400).json({ error: "Paste the code snippet" })
      typeData = { language: (type_data?.language || "text").trim(), code: type_data.code }
    }

    const { data, error } = await supabaseAdmin.from("pulse_posts").insert({
      author_id:  req.user.id,
      user_id:    req.user.id,   // satisfy NOT NULL on tables created with old schema
      post_type,
      content:    (content || "").trim(),  // proof posts allow an empty/optional caption — the evidence is the content
      media_urls,
      poll_data:  poll_data || null,
      event_data: event_data || null,
      proof_data: proofData,
      type_data:  typeData,
      tech_tags:  post_type === "proof" && !tech_tags.length ? (proofData.skillTags || []) : tech_tags,
      role_tags,
      visibility,
    }).select("*, author:profiles!author_id(id,name,display_name,username,profile_photo_url,elo_rating,verification_state,path,keyword)").single()
    if (error) throw error
    res.json({ success: true, post: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put("/pulse/posts/:id", requireAuth, async (req, res) => {
  try {
    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id, user_id").eq("id", req.params.id).single()
    const ownerId = post?.author_id || post?.user_id
    if (!post || ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    const { data, error } = await supabaseAdmin.from("pulse_posts")
      .update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, post: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete("/pulse/posts/:id", requireAuth, async (req, res) => {
  try {
    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id, user_id").eq("id", req.params.id).single()
    const ownerId = post?.author_id || post?.user_id
    if (!post || ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    await supabaseAdmin.from("pulse_posts").delete().eq("id", req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pulse/posts/:id/interact", requireAuth, async (req, res) => {
  try {
    const { action } = req.body
    const VALID_ACTIONS = ["acknowledge","signal","save","repost","ask_context","book_session"]
    if (!VALID_ACTIONS.includes(action)) return res.status(400).json({ error: "Invalid action" })

    const uid = req.user.id
    const postId = req.params.id

    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id,user_id,acknowledge_count,signal_count,repost_count,save_count").eq("id", postId).single()
    if (!post) return res.status(404).json({ error: "Post not found" })

    const postOwnerId = post.author_id || post.user_id  // handle both old (user_id) and new (author_id) schema

    // Toggle interaction
    const { data: existing } = await supabaseAdmin.from("post_interactions")
      .select("id").eq("post_id", postId).eq("user_id", uid).eq("action", action).single()

    const countField = { acknowledge: "acknowledge_count", signal: "signal_count", repost: "repost_count", save: "save_count" }[action]

    if (existing) {
      await supabaseAdmin.from("post_interactions").delete().eq("id", existing.id)
      if (countField) await supabaseAdmin.from("pulse_posts")
        .update({ [countField]: Math.max(0, (post[countField] || 1) - 1) }).eq("id", postId)
      return res.json({ success: true, active: false })
    } else {
      await supabaseAdmin.from("post_interactions").insert({ post_id: postId, user_id: uid, action })
      if (countField) await supabaseAdmin.from("pulse_posts")
        .update({ [countField]: (post[countField] || 0) + 1 }).eq("id", postId)

      // Notify author (use whichever owner column is populated)
      if (postOwnerId && postOwnerId !== uid && ["acknowledge","signal"].includes(action)) {
        await supabaseAdmin.from("notifications").insert({
          user_id:        postOwnerId,
          type:           `post_${action}`,
          actor_id:       uid,
          entity_id:      postId,
          entity_type:    "pulse_post",
        }).catch(() => {})
      }
      return res.json({ success: true, active: true })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Author select now also carries keyword (domain) + elo_rating so comment
// cards can show the same "name · domain · ELO" identity strip post cards
// already show — previously comments only showed a bare name, which is why
// "who is this person" wasn't answerable from the comment thread itself.
const COMMENT_AUTHOR_SELECT = "id,name,display_name,username,profile_photo_url,keyword,elo_rating"

router.get("/pulse/posts/:id/comments", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("post_comments")
      .select(`*, author:profiles!author_id(${COMMENT_AUTHOR_SELECT})`)
      .eq("post_id", req.params.id)
      .is("parent_id", null)
      .order("created_at", { ascending: true })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /pulse/comments/:id/replies — threaded replies to a top-level comment.
// Kept as a separate lazy-loaded call (not embedded in the comments payload)
// so a post with 200 comments and no expanded threads doesn't pull every
// reply on every load — same "load on demand" shape as the likers list.
router.get("/pulse/comments/:id/replies", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("post_comments")
      .select(`*, author:profiles!author_id(${COMMENT_AUTHOR_SELECT})`)
      .eq("parent_id", req.params.id)
      .order("created_at", { ascending: true })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pulse/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content, parent_id } = req.body
    if (!content?.trim()) return res.status(400).json({ error: "content required" })

    // A reply's parent_id must actually belong to this post — otherwise a
    // client could thread a "reply" onto an arbitrary comment on a
    // different post by just passing any comment id.
    if (parent_id) {
      const { data: parent } = await supabaseAdmin.from("post_comments")
        .select("id,post_id").eq("id", parent_id).single()
      if (!parent || parent.post_id !== req.params.id) {
        return res.status(400).json({ error: "invalid parent_id" })
      }
    }

    const { data, error } = await supabaseAdmin.from("post_comments").insert({
      post_id:   req.params.id,
      author_id: req.user.id,
      content:   content.trim(),
      parent_id: parent_id || null,
    }).select(`*, author:profiles!author_id(${COMMENT_AUTHOR_SELECT})`).single()
    if (error) throw error

    // Bump the parent comment's reply_count (same read-then-write pattern
    // as the post comment_count bump below — no .raw() / atomic increment
    // available on this client).
    if (parent_id) {
      const { data: parentRow } = await supabaseAdmin.from("post_comments")
        .select("reply_count").eq("id", parent_id).single()
      if (parentRow) {
        await supabaseAdmin.from("post_comments")
          .update({ reply_count: (parentRow.reply_count || 0) + 1 })
          .eq("id", parent_id).catch(() => {})
      }
    }

    // BUG FIX (production audit): `supabaseAdmin.raw(...)` doesn't exist on
    // the real @supabase/supabase-js client (supabaseAdmin is a thin proxy
    // over it, see lib/supabase.js) -- calling it threw synchronously while
    // building the .update() args, BEFORE the attached .catch() could ever
    // run, which escaped to the route's outer catch and 500'd the whole
    // request even though the comment row above had already been inserted
    // successfully. Read-then-write instead, same pattern already used for
    // acknowledge/signal counts in /nexus/interact above.
    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id,comment_count").eq("id", req.params.id).single()
    if (post) {
      await supabaseAdmin.from("pulse_posts")
        .update({ comment_count: (post.comment_count || 0) + 1 })
        .eq("id", req.params.id)
        .catch(() => {})
    }

    // Notify post author -- same real notifications schema (user_id, type,
    // actor_id, entity_id, entity_type) used by /nexus/interact above and
    // /nexus/connect/follow; this insert previously used title/reference_id/
    // reference_type, none of which exist on the notifications table, so
    // PostgREST silently rejected every comment notification even before
    // the .raw() bug above was hit.
    if (post?.author_id && post.author_id !== req.user.id) {
      await supabaseAdmin.from("notifications").insert({
        user_id:     post.author_id,
        type:        "post_comment",
        actor_id:    req.user.id,
        entity_id:   req.params.id,
        entity_type: "pulse_post",
      }).catch(() => {})
    }

    res.json({ success: true, comment: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /pulse/comments/:id/like — toggle like on a comment. Same
// insert-or-delete-by-unique-constraint toggle shape as /nexus/interact
// uses for posts (comment_likes has a UNIQUE(comment_id,user_id)), kept as
// its own small table rather than reusing post_interactions because that
// table's post_id FK points at pulse_posts, not post_comments.
router.post("/pulse/comments/:id/like", requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin.from("comment_likes")
      .select("id").eq("comment_id", req.params.id).eq("user_id", req.user.id).maybeSingle()

    const { data: comment } = await supabaseAdmin.from("post_comments")
      .select("id,like_count,author_id,post_id").eq("id", req.params.id).single()
    if (!comment) return res.status(404).json({ error: "comment not found" })

    let liked
    if (existing) {
      await supabaseAdmin.from("comment_likes").delete().eq("id", existing.id)
      await supabaseAdmin.from("post_comments")
        .update({ like_count: Math.max(0, (comment.like_count || 0) - 1) })
        .eq("id", req.params.id)
      liked = false
    } else {
      await supabaseAdmin.from("comment_likes").insert({ comment_id: req.params.id, user_id: req.user.id })
      await supabaseAdmin.from("post_comments")
        .update({ like_count: (comment.like_count || 0) + 1 })
        .eq("id", req.params.id)
      liked = true

      if (comment.author_id && comment.author_id !== req.user.id) {
        await supabaseAdmin.from("notifications").insert({
          user_id:     comment.author_id,
          type:        "comment_like",
          actor_id:    req.user.id,
          entity_id:   req.params.id,
          entity_type: "post_comment",
        }).catch(() => {})
      }
    }
    res.json({ success: true, liked })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /pulse/comments/:id/likers — who liked a comment, same "who liked
// this" pattern as the post-level likers endpoint.
router.get("/pulse/comments/:id/likers", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("comment_likes")
      .select(`created_at, user:profiles!user_id(${COMMENT_AUTHOR_SELECT})`)
      .eq("comment_id", req.params.id)
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) throw error
    res.json({ users: (data || []).map(r => r.user).filter(Boolean), total: (data || []).length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /pulse/posts/:id/likers — the list of users behind a reaction count
// (defaults to "acknowledge", i.e. the Like button), most recent first.
// Powers the "who liked this" list, same idea as tapping the like count on
// Instagram/Facebook/LinkedIn. Public (no auth required) since the reaction
// counts themselves are already public on the feed.
router.get("/pulse/posts/:id/likers", async (req, res) => {
  try {
    const action = ["acknowledge", "signal", "save", "repost"].includes(req.query.action) ? req.query.action : "acknowledge"
    const { data, error } = await supabaseAdmin.from("post_interactions")
      .select("created_at, user:profiles!user_id(id,name,display_name,username,profile_photo_url,elo_rating,verification_state,keyword)")
      .eq("post_id", req.params.id)
      .eq("action", action)
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) throw error
    res.json({ users: (data || []).map(r => r.user).filter(Boolean), total: (data || []).length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════
// PULSE — STORIES (24h, real feature)
// ══════════════════════════════════════════
// A story is either an uploaded image (+ optional caption) or a text-only
// card (content + background color), always expires 24h after creation
// (enforced both by the RLS policy on pulse_stories, "expires_at > now()",
// and by the WHERE clause below — belt and suspenders, no separate cleanup
// job needed since expired rows simply stop being selectable/visible).

// GET /pulse/stories — active stories from the viewer + people they follow +
// the same domain community (kept simple: everyone's active stories, same
// visibility model as the main feed — Pulse has no private-story concept).
// Grouped by author for the stories row UI.
router.get("/pulse/stories", optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("pulse_stories")
      .select("id,author_id,media_type,media_url,text_content,background_color,view_count,created_at,expires_at, author:profiles!author_id(id,name,display_name,username,profile_photo_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(300)
    if (error) throw error

    // Group into one entry per author, each holding their ordered stories —
    // this is what the story-ring row and the tap-to-advance viewer need.
    const byAuthor = new Map()
    for (const s of data || []) {
      if (!byAuthor.has(s.author_id)) byAuthor.set(s.author_id, { author: s.author, stories: [] })
      byAuthor.get(s.author_id).stories.push(s)
    }

    // Seen/unseen ring state for the current viewer.
    let seenStoryIds = new Set()
    if (req.user && data?.length) {
      const { data: views } = await supabaseAdmin.from("pulse_story_views")
        .select("story_id").eq("viewer_id", req.user.id).in("story_id", data.map(s => s.id))
      seenStoryIds = new Set((views || []).map(v => v.story_id))
    }

    const groups = [...byAuthor.values()].map(g => ({
      ...g,
      allSeen: g.stories.every(s => seenStoryIds.has(s.id)),
    }))
    res.json({ groups })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /pulse/stories — create a story. multipart/form-data with an optional
// "media" file (image story) or JSON body with text_content (text story).
router.post("/pulse/stories", requireAuth, upload.single("media"), async (req, res) => {
  try {
    const file = req.file
    const textContent = (req.body.text_content || "").trim()
    const backgroundColor = req.body.background_color || "#FF5701"

    if (!file && !textContent) return res.status(400).json({ error: "Add a photo or write something first" })

    let mediaUrl = null
    if (file) {
      const ext = (file.mimetype.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "")
      const path = `stories/${req.user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabaseAdmin.storage
        .from("pulse-media")
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: false })
      if (uploadErr) return res.status(500).json({ error: uploadErr.message })
      const { data: { publicUrl } } = supabaseAdmin.storage.from("pulse-media").getPublicUrl(path)
      mediaUrl = publicUrl
    }

    const { data, error } = await supabaseAdmin.from("pulse_stories").insert({
      author_id:        req.user.id,
      media_type:        file ? "image" : "text",
      media_url:         mediaUrl,
      text_content:      textContent || null,
      background_color:  backgroundColor,
    }).select("id,author_id,media_type,media_url,text_content,background_color,view_count,created_at,expires_at").single()
    if (error) throw error

    res.json({ success: true, story: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /pulse/stories/:id/view — mark viewed by the current user (idempotent
// via the UNIQUE(story_id, viewer_id) constraint) and bump view_count on
// first view only.
router.post("/pulse/stories/:id/view", requireAuth, async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("pulse_story_views")
      .insert({ story_id: req.params.id, viewer_id: req.user.id })
    // Unique violation = already viewed — not an error, just a no-op.
    if (error && error.code !== "23505") throw error
    if (!error) {
      const { data: story } = await supabaseAdmin.from("pulse_stories").select("view_count").eq("id", req.params.id).single()
      if (story) await supabaseAdmin.from("pulse_stories").update({ view_count: (story.view_count || 0) + 1 }).eq("id", req.params.id)
    }
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /pulse/stories/:id/viewers — who viewed this story, author-only.
router.get("/pulse/stories/:id/viewers", requireAuth, async (req, res) => {
  try {
    const { data: story } = await supabaseAdmin.from("pulse_stories").select("author_id").eq("id", req.params.id).single()
    if (!story || story.author_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    const { data, error } = await supabaseAdmin.from("pulse_story_views")
      .select("viewed_at, viewer:profiles!viewer_id(id,name,display_name,username,profile_photo_url)")
      .eq("story_id", req.params.id).order("viewed_at", { ascending: false })
    if (error) throw error
    res.json({ viewers: (data || []).map(v => ({ ...v.viewer, viewed_at: v.viewed_at })) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /pulse/stories/:id — owner-only early delete (before the 24h expiry).
router.delete("/pulse/stories/:id", requireAuth, async (req, res) => {
  try {
    const { data: story } = await supabaseAdmin.from("pulse_stories").select("author_id,media_url").eq("id", req.params.id).single()
    if (!story || story.author_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    await supabaseAdmin.from("pulse_stories").delete().eq("id", req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════
// NEXUS
// ══════════════════════════════════════════

router.get("/nexus/search", optionalAuth, async (req, res) => {
  try {
    const { q, role, domain, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = supabaseAdmin.from("profiles")
      .select("id,name,display_name,username,headline,keyword,elo_rating,profile_photo_url,current_company,current_role_title,verification_state,is_mentor,path,years_of_experience,skill_graph", { count: "exact" })
      .neq("path", "institution")
      // Career OS Tranche 3: enforce the Privacy section's "Appear in
      // Capabilio search" toggle (profiles.searchable, default true) here —
      // this is the actual live search surface it was always meant to
      // control (see career_os_ws0_privacy_toggle_columns migration; the
      // toggle previously wrote to a nonexistent column and did nothing).
      .eq("searchable", true)
      // Exclude profiles with no identity signal at all (display_name, name,
      // AND username all null — incomplete/abandoned signups). These were
      // rendering as a literal "User" card with no domain/role in Discover,
      // which isn't a useful discovery result for anyone. username is set
      // for every real onboarded account, so this is a safe, narrow filter.
      .not("username", "is", null)
      .range(offset, offset + parseInt(limit) - 1)

    // 2026-08-12 fix: a logged-in user's own profile was showing up in
    // their own Discover grid (never excluded), which is where some of the
    // "unwanted connections" came from.
    if (req.user?.id) query = query.neq("id", req.user.id)

    if (q) query = query.or(`name.ilike.%${q}%,display_name.ilike.%${q}%,username.ilike.%${q}%,headline.ilike.%${q}%,current_company.ilike.%${q}%,keyword.ilike.%${q}%`)
    if (role) query = query.ilike("current_role_title", `%${role}%`)
    if (domain) query = query.ilike("keyword", `%${domain}%`)

    const { data, error, count } = await query.order("elo_rating", { ascending: false })
    if (error) throw error
    res.json({ profiles: data || [], total: count || 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/nexus/profile/:uid", optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("profiles")
      .select("id,name,headline,profile_photo_url,cover_photo_url,current_company,current_role_title,profile_summary,skill_graph,experiences,certifications,education,aura_score,role_elo,market_elo,proof_elo,verification_state,is_mentor,path,linkedin_url,github_url,location,years_of_experience,profile_visibility")
      .eq("id", req.params.uid).single()
    if (error || !data) return res.status(404).json({ error: "Profile not found" })

    // Settings/Security redesign (2026-09-02): this route used to return the
    // full field set above for ANY profile id, unconditionally — it uses
    // supabaseAdmin (service role), which bypasses RLS entirely, so the
    // database-level "Profile visibility controls read access" policy never
    // applied here regardless of the RLS fix in that same migration. Fixed
    // by checking profile_visibility explicitly, same as RLS now does for
    // direct-client access. 404 (not 403) for a private/restricted profile
    // that isn't the requester's own, so a scan of ids can't distinguish
    // "private profile" from "no such profile".
    const isOwner = req.user?.id === req.params.uid
    const visibility = data.profile_visibility || "public"
    const allowed = isOwner
      || visibility === "public"
      || (visibility === "capabilio_users" && !!req.user)
    if (!allowed) return res.status(404).json({ error: "Profile not found" })
    delete data.profile_visibility // internal field, never part of the public response shape

    // Check connection status
    let connectionStatus = "none"
    if (req.user && req.user.id !== req.params.uid) {
      const { data: conn } = await supabaseAdmin.from("connections")
        .select("id,status,requester_id")
        .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)
        .or(`requester_id.eq.${req.params.uid},addressee_id.eq.${req.params.uid}`)
        .single()
      if (conn) connectionStatus = conn.status
    }

    // Follower count
    const { count: followerCount } = await supabaseAdmin.from("follows")
      .select("*", { count: "exact", head: true }).eq("following_id", req.params.uid)
    const { count: followingCount } = await supabaseAdmin.from("follows")
      .select("*", { count: "exact", head: true }).eq("follower_id", req.params.uid)

    let isFollowing = false
    if (req.user) {
      const { data: fol } = await supabaseAdmin.from("follows")
        .select("follower_id").eq("follower_id", req.user.id).eq("following_id", req.params.uid).single()
      isFollowing = !!fol
    }

    res.json({ ...data, connection_status: connectionStatus, follower_count: followerCount || 0, following_count: followingCount || 0, is_following: isFollowing })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/nexus/connect", requireAuth, async (req, res) => {
  try {
    const { addressee_id, message } = req.body
    if (!addressee_id || addressee_id === req.user.id)
      return res.status(400).json({ error: "Invalid addressee" })

    const { data, error } = await supabaseAdmin.from("connections").insert({
      requester_id: req.user.id,
      addressee_id,
      message: message || null,
      status: "pending",
    }).select().single()

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Request already sent" })
      throw error
    }

    const { data: requester } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
    // 2026-07-29 BUG FIX: was inserting `reference_id`/`reference_type`,
    // which don't exist on notifications (real columns are `entity_id`/
    // `entity_type` — see migration notes). Every notification insert here
    // was silently failing (PostgREST resolves an unknown-column insert as
    // a non-throwing {error}, not a rejection) — connection-request
    // notifications have never actually been created.
    await supabaseAdmin.from("notifications").insert({
      user_id:      addressee_id,
      type:         "connection_request",
      title:        "Connection Request",
      body:         `${requester?.name || "Someone"} wants to connect with you`,
      actor_id:     req.user.id,
      entity_id:    data.id,
      entity_type:  "connection",
    }).catch(() => {})

    res.json({ success: true, connection: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put("/nexus/connect/:id", requireAuth, async (req, res) => {
  try {
    const { status } = req.body  // "accepted" | "rejected"
    const { data: conn } = await supabaseAdmin.from("connections").select("addressee_id,requester_id").eq("id", req.params.id).single()
    if (!conn || conn.addressee_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin.from("connections")
      .update({ status, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single()
    if (error) throw error

    if (status === "accepted") {
      const { data: accepter } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
      await supabaseAdmin.from("notifications").insert({
        user_id:     conn.requester_id,
        type:        "connection_accepted",
        title:       "Connection Accepted",
        body:        `${accepter?.name || "Someone"} accepted your connection request`,
        actor_id:    req.user.id,
        entity_id:   data.id,
        entity_type: "connection",
      }).catch(() => {})
    }
    res.json({ success: true, connection: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/nexus/follow", requireAuth, async (req, res) => {
  try {
    const { following_id } = req.body
    if (!following_id || following_id === req.user.id) return res.status(400).json({ error: "Invalid" })

    const { error } = await supabaseAdmin.from("follows")
      .upsert({ follower_id: req.user.id, following_id }, { onConflict: "follower_id,following_id", ignoreDuplicates: true })
    if (error) throw error

    // Notify the followed user — matches the notification pattern already
    // used on /nexus/connect. Fire-and-forget: a notification failure must
    // never fail the follow action itself (same .catch(()=>{}) convention
    // used everywhere else in this file).
    const { data: follower } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
    await supabaseAdmin.from("notifications").insert({
      user_id:     following_id,
      type:        "new_follower",
      title:       "New Follower",
      body:        `${follower?.name || "Someone"} started following you`,
      actor_id:    req.user.id,
      entity_id:   req.user.id,
      entity_type: "follow",
    }).catch(() => {})

    res.json({ success: true, following: true })
  } catch (e) {
    // 2026-07-29: log the real error server-side — this route was
    // returning bare 500s with no trace in Render logs, making a genuine
    // failure indistinguishable from the network blip a client retry can't
    // tell apart either. Cheap insurance against the next silent failure.
    console.error("[nexus/follow]", e.message)
    res.status(500).json({ error: e.message })
  }
})

router.delete("/nexus/follow/:uid", requireAuth, async (req, res) => {
  try {
    await supabaseAdmin.from("follows").delete().match({ follower_id: req.user.id, following_id: req.params.uid })
    res.json({ success: true, following: false })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/nexus/connections", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data, error } = await supabaseAdmin.from("connections")
      .select("*, requester:requester_id(id,name,display_name,username,keyword,elo_rating,profile_photo_url,headline,current_role_title,path), addressee:addressee_id(id,name,display_name,username,keyword,elo_rating,profile_photo_url,headline,current_role_title,path)")
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order("updated_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Real Follow/Follower lists (the `follows` table) for the current user, with
// joined profile data — powers the Network tab's Following/Followers lists
// and sidebar counters. Previously the frontend had no way to read this back
// at all: it only ever wrote to `follows` (POST/DELETE /nexus/follow) and
// derived "Following"/"Followers" from the unrelated `connections` (Sparks)
// table instead, which is why the Follow button's state reset on every page
// refresh and followed users never actually showed up anywhere.
router.get("/nexus/follows", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const PROFILE_COLS = "id,name,display_name,username,keyword,elo_rating,profile_photo_url,headline,current_role_title,path"

    const [{ data: followingRows, error: e1 }, { data: followerRows, error: e2 }] = await Promise.all([
      supabaseAdmin.from("follows").select(`following:following_id(${PROFILE_COLS})`).eq("follower_id", uid),
      supabaseAdmin.from("follows").select(`follower:follower_id(${PROFILE_COLS})`).eq("following_id", uid),
    ])
    if (e1) throw e1
    if (e2) throw e2

    res.json({
      following: (followingRows || []).map(r => r.following).filter(Boolean),
      followers: (followerRows || []).map(r => r.follower).filter(Boolean),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/nexus/notifications", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("notifications")
      .select("*, actor:actor_id(id,name,profile_photo_url)")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/nexus/notifications/read", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body
    let q = supabaseAdmin.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", req.user.id)
    if (ids?.length) q = q.in("id", ids)
    else q = q.eq("is_read", false)
    await q
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── ELO-matched builders for the Pulse sidebar ──────────────────────────────
router.get("/pulse/builders", optionalAuth, async (req, res) => {
  try {
    const { domain = "", elo = 400, limit = 8 } = req.query
    const eloNum = parseInt(elo)
    const keyword = domain.split(" ")[0] // "Data" from "Data Analyst"

    let q = supabaseAdmin.from("profiles")
      .select("id, display_name, name, username, keyword, elo_rating, path, onboarding_complete")
      .eq("onboarding_complete", true)
      .gte("elo_rating", Math.max(0, eloNum - 600))
      .lte("elo_rating", eloNum + 600)
      .order("elo_rating", { ascending: false })
      .limit(parseInt(limit))

    if (keyword) q = q.ilike("keyword", `%${keyword}%`)
    if (req.user?.id) q = q.neq("id", req.user.id)

    const { data, error } = await q
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Active mentors for the Pulse sidebar ────────────────────────────────────
// Falls back to high-ELO profiles with is_mentor=true if mentor_profiles table
// doesn't exist yet (table is created by the mentorHub migration).
router.get("/pulse/mentors", optionalAuth, async (req, res) => {
  try {
    const { domain = "", limit = 5 } = req.query
    const keyword = domain.split(" ")[0]

    // Try dedicated mentor_profiles table first
    let q = supabaseAdmin.from("mentor_profiles")
      .select("id, user_id, display_name, headline, hourly_rate, rating, session_count, is_verified, specialties, profile:user_id(id, display_name, name, username, elo_rating, path, keyword)")
      .eq("is_verified", true)
      .order("rating", { ascending: false })
      .limit(parseInt(limit))

    if (keyword) q = q.ilike("specialties", `%${keyword}%`)

    const { data, error } = await q

    // If mentor_profiles table missing, fall back to top-ELO profiles with is_mentor flag
    if (error && (error.code === "42P01" || error.message?.includes("relation") || error.message?.includes("does not exist"))) {
      let fallback = supabaseAdmin.from("profiles")
        .select("id, display_name, name, username, elo_rating, keyword, headline, profile_photo_url")
        .eq("is_mentor", true)
        .order("elo_rating", { ascending: false })
        .limit(parseInt(limit))
      if (keyword) fallback = fallback.ilike("keyword", `%${keyword}%`)
      const { data: fb } = await fallback
      return res.json(fb || [])
    }

    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Feed from users the current user follows ────────────────────────────────
router.get("/pulse/following-feed", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 15, sort = "created_at" } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { data: follows } = await supabaseAdmin.from("follows")
      .select("following_id").eq("follower_id", req.user.id)

    if (!follows?.length) return res.json({ posts: [], total: 0, page: 1 })

    const followingIds = follows.map(f => f.following_id)
    const sortCol = sort === "discussed" ? "comment_count" : sort === "signal" ? "signal_count" : "created_at"

    const { data: posts, error, count } = await supabaseAdmin.from("pulse_posts")
      .select("*, author:profiles!author_id(id, display_name, name, username, elo_rating, path, keyword)", { count: "exact" })
      .in("author_id", followingIds)
      .eq("visibility", "public")
      .eq("is_moderated", false)
      .order(sortCol, { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (error) throw error

    // Enrich with user's interactions
    let enriched = posts || []
    if (enriched.length) {
      const postIds = enriched.map(p => p.id)
      const { data: interactions } = await supabaseAdmin.from("post_interactions")
        .select("post_id,action").eq("user_id", req.user.id).in("post_id", postIds)
      const iMap = {}
      ;(interactions || []).forEach(i => { if (!iMap[i.post_id]) iMap[i.post_id] = []; iMap[i.post_id].push(i.action) })
      enriched = enriched.map(p => ({ ...p, user_interactions: iMap[p.id] || [] }))
    }

    res.json({ posts: enriched, total: count || 0, page: parseInt(page) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Saved / Capsule posts ────────────────────────────────────────────────────
router.get("/pulse/saved", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { data: saves } = await supabaseAdmin.from("post_interactions")
      .select("post_id").eq("user_id", req.user.id).eq("action", "save")
      .order("created_at", { ascending: false }).range(offset, offset + parseInt(limit) - 1)

    if (!saves?.length) return res.json({ posts: [], total: 0 })

    const postIds = saves.map(s => s.post_id)
    const { data: posts, error, count } = await supabaseAdmin.from("pulse_posts")
      .select("*, author:profiles!author_id(id, display_name, name, username, elo_rating, path, keyword)", { count: "exact" })
      .in("id", postIds).eq("is_moderated", false)

    if (error) throw error

    const enriched = (posts || []).map(p => ({ ...p, user_interactions: ["save"] }))
    res.json({ posts: enriched, total: count || 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
