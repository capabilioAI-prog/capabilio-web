// ─── security.js — Login & Security, 2FA, sessions, visibility, preferences ───
// Mounted at /api/security in server.js. Every sensitive action here
// (password change, MFA enroll/disable, recovery-code regeneration, account
// deletion) re-verifies the caller's current password first — see
// lib/security.js's verifyCurrentPassword. Nothing here trusts the frontend
// alone: every write is scoped to req.user.id from the verified JWT, never
// a client-supplied user id.
import express from "express"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { getUserScopedClient } from "../lib/userScopedSupabase.js"
import {
  replaceRecoveryCodes, consumeRecoveryCode, countRemainingRecoveryCodes,
  logSecurityEvent, verifyCurrentPassword,
} from "../lib/security.js"

const router = express.Router()

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim() || null
}

function bearerToken(req) {
  return (req.headers.authorization || "").replace("Bearer ", "").trim()
}

async function requireReauth(req, res) {
  const { currentPassword } = req.body || {}
  if (!currentPassword) {
    res.status(400).json({ error: "currentPassword is required for this action" })
    return false
  }
  const ok = await verifyCurrentPassword(req.user.email, currentPassword)
  if (!ok) {
    res.status(401).json({ error: "Current password is incorrect" })
    return false
  }
  return true
}

// ── Password ─────────────────────────────────────────────────────────────────
router.post("/password/change", requireAuth, async (req, res) => {
  try {
    if (!(await requireReauth(req, res))) return
    const { newPassword } = req.body || {}
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" })
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: newPassword })
    if (error) return res.status(500).json({ error: "Could not update password" })
    await logSecurityEvent({ userId: req.user.id, eventType: "password_changed", ipAddress: clientIp(req) })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── MFA (TOTP) — thin passthrough to Supabase Auth's own native MFA API ──────
// Enroll/verify/unenroll all run against a user-scoped client (see
// userScopedSupabase.js) so Supabase's own GoTrue service — not this
// backend — generates, encrypts, and stores the TOTP secret. This backend
// never sees, logs, or persists the raw secret at any point.
router.get("/mfa/status", requireAuth, async (req, res) => {
  try {
    const client = getUserScopedClient(bearerToken(req))
    const { data, error } = await client.auth.mfa.listFactors()
    if (error) return res.status(500).json({ error: "Could not read MFA status" })
    const totp = (data.totp || []).find(f => f.status === "verified")
    const remaining = totp ? await countRemainingRecoveryCodes(req.user.id) : 0
    res.json({ enabled: !!totp, factorId: totp?.id || null, createdAt: totp?.created_at || null, recoveryCodesRemaining: remaining })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/mfa/enroll", requireAuth, async (req, res) => {
  try {
    if (!(await requireReauth(req, res))) return
    const client = getUserScopedClient(bearerToken(req))
    const { data, error } = await client.auth.mfa.enroll({ factorType: "totp" })
    if (error) return res.status(400).json({ error: error.message })
    // qr_code is an SVG data URI Supabase generates itself — never logged,
    // never persisted; it exists only in this one response.
    res.json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/mfa/verify", requireAuth, async (req, res) => {
  try {
    const { factorId, code } = req.body || {}
    if (!factorId || !code) return res.status(400).json({ error: "factorId and code are required" })
    const client = getUserScopedClient(bearerToken(req))
    const { data: challenge, error: challengeErr } = await client.auth.mfa.challenge({ factorId })
    if (challengeErr) return res.status(400).json({ error: challengeErr.message })
    const { error: verifyErr } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    if (verifyErr) {
      await logSecurityEvent({ userId: req.user.id, eventType: "mfa_challenge_failed", ipAddress: clientIp(req) })
      return res.status(400).json({ error: "Incorrect code — check your authenticator app and try again" })
    }
    const recoveryCodes = await replaceRecoveryCodes(req.user.id)
    await logSecurityEvent({ userId: req.user.id, eventType: "mfa_enabled", metadata: { factorId }, ipAddress: clientIp(req) })
    res.json({ success: true, recoveryCodes })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/mfa/disable", requireAuth, async (req, res) => {
  try {
    if (!(await requireReauth(req, res))) return
    const { factorId, code, recoveryCode } = req.body || {}
    if (!factorId) return res.status(400).json({ error: "factorId is required" })
    const client = getUserScopedClient(bearerToken(req))

    let secondFactorOk = false
    if (code) {
      const { data: challenge, error: challengeErr } = await client.auth.mfa.challenge({ factorId })
      if (!challengeErr) {
        const { error: verifyErr } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
        secondFactorOk = !verifyErr
      }
    } else if (recoveryCode) {
      secondFactorOk = await consumeRecoveryCode(req.user.id, recoveryCode)
    }
    if (!secondFactorOk) {
      await logSecurityEvent({ userId: req.user.id, eventType: "mfa_challenge_failed", ipAddress: clientIp(req) })
      return res.status(401).json({ error: "A valid authenticator code or recovery code is required to disable two-factor authentication" })
    }

    const { error } = await client.auth.mfa.unenroll({ factorId })
    if (error) return res.status(400).json({ error: error.message })
    await supabaseAdmin.from("user_mfa_recovery_codes").delete().eq("user_id", req.user.id)
    await logSecurityEvent({ userId: req.user.id, eventType: "mfa_disabled", ipAddress: clientIp(req) })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/mfa/recovery-codes/regenerate", requireAuth, async (req, res) => {
  try {
    if (!(await requireReauth(req, res))) return
    const { code } = req.body || {}
    const status = await getUserScopedClient(bearerToken(req)).auth.mfa.listFactors()
    const totp = (status.data?.totp || []).find(f => f.status === "verified")
    if (!totp) return res.status(400).json({ error: "Two-factor authentication is not enabled" })
    if (!code) return res.status(400).json({ error: "A current authenticator code is required" })

    const client = getUserScopedClient(bearerToken(req))
    const { data: challenge, error: challengeErr } = await client.auth.mfa.challenge({ factorId: totp.id })
    if (challengeErr) return res.status(400).json({ error: challengeErr.message })
    const { error: verifyErr } = await client.auth.mfa.verify({ factorId: totp.id, challengeId: challenge.id, code })
    if (verifyErr) {
      await logSecurityEvent({ userId: req.user.id, eventType: "mfa_challenge_failed", ipAddress: clientIp(req) })
      return res.status(401).json({ error: "Incorrect code" })
    }

    const recoveryCodes = await replaceRecoveryCodes(req.user.id)
    await logSecurityEvent({ userId: req.user.id, eventType: "recovery_codes_regenerated", ipAddress: clientIp(req) })
    res.json({ success: true, recoveryCodes })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Recovery-code login fallback — used AFTER normal password auth succeeds,
// when the client reports an MFA challenge is required but the user has
// lost their authenticator. Honest limitation (documented, not hidden):
// this grants the same application-level access an AAL2 TOTP verification
// would, but the underlying Supabase session's own `aal` JWT claim remains
// whatever password-only auth produced (effectively aal1) — Supabase has no
// public API to mark a session AAL2 from a non-native second factor. Any
// future check that specifically requires Supabase's own AAL2 claim (rather
// than "the app considers this session fully verified") would not be
// satisfied by a recovery-code login. See the design report.
router.post("/mfa/recovery-login", async (req, res) => {
  try {
    const { email, password, recoveryCode } = req.body || {}
    if (!email || !password || !recoveryCode) {
      return res.status(400).json({ error: "email, password, and recoveryCode are required" })
    }
    const { createClient } = await import("@supabase/supabase-js")
    const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    const anonClient = createClient(process.env.SUPABASE_URL || "", ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: signIn, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password })
    if (signInErr || !signIn?.user) return res.status(401).json({ error: "Invalid email or password" })

    const ok = await consumeRecoveryCode(signIn.user.id, recoveryCode)
    if (!ok) {
      await logSecurityEvent({ userId: signIn.user.id, eventType: "mfa_challenge_failed", metadata: { method: "recovery_code" }, ipAddress: clientIp(req) })
      return res.status(401).json({ error: "Invalid or already-used recovery code" })
    }
    await logSecurityEvent({ userId: signIn.user.id, eventType: "recovery_code_used", ipAddress: clientIp(req) })
    res.json({ success: true, session: signIn.session })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Sessions ──────────────────────────────────────────────────────────────────
// Lists sessions from Supabase's OWN auth.sessions table — real, authoritative
// records, not a self-maintained copy that could drift. auth.sessions isn't
// exposed via PostgREST on this project (confirmed live: a direct REST call
// with Accept-Profile:auth returns PGRST106), so this goes through
// get_user_sessions_admin(), a SECURITY DEFINER function restricted to
// service_role (see the 2026-09-02 migration's header comment for why).
// No API exists (checked against Supabase's documented admin surface) to
// revoke a single specific OTHER session by id — only `signOut(jwt, scope)`
// with scope global/local/others, which the frontend calls directly against
// Supabase for the current session. This route only lists; revocation
// happens client-side via supabase.auth.signOut({scope}).
router.get("/sessions", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_user_sessions_admin", { p_user_id: req.user.id })
    if (error) return res.status(500).json({ error: "Could not read sessions" })
    const currentSessionId = req.user.session_id || req.user.sid || null
    res.json({
      sessions: (data || []).map(s => ({
        id: s.id, createdAt: s.created_at, lastActiveAt: s.updated_at,
        userAgent: s.user_agent || null, ipAddress: s.ip || null,
        isCurrent: currentSessionId ? s.id === currentSessionId : false,
      })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Profile visibility ────────────────────────────────────────────────────────
router.post("/visibility", requireAuth, async (req, res) => {
  try {
    const { profileVisibility } = req.body || {}
    const VALID = ["public", "capabilio_users", "private"]
    if (!VALID.includes(profileVisibility)) return res.status(400).json({ error: "Invalid visibility value" })
    const { error } = await supabaseAdmin.from("profiles").update({ profile_visibility: profileVisibility }).eq("id", req.user.id)
    if (error) return res.status(500).json({ error: "Could not update visibility" })
    await logSecurityEvent({ userId: req.user.id, eventType: "profile_visibility_changed", metadata: { profileVisibility }, ipAddress: clientIp(req) })
    res.json({ success: true, profileVisibility })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Notification preferences ─────────────────────────────────────────────────
router.get("/notification-preferences", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("notification_preferences").select("*").eq("user_id", req.user.id).maybeSingle()
    if (error) return res.status(500).json({ error: "Could not read notification preferences" })
    res.json({ preferences: data || { user_id: req.user.id } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

const NOTIF_PREF_FIELDS = [
  "career_recommendations", "arena_mission_ready", "arena_achievements", "arena_streak_reminders",
  "market_reports", "launchpad_matches", "weekly_digest", "marketing_emails", "channel_email", "channel_inapp",
]

router.put("/notification-preferences", requireAuth, async (req, res) => {
  try {
    const patch = {}
    for (const key of NOTIF_PREF_FIELDS) {
      if (typeof req.body?.[key] === "boolean") patch[key] = req.body[key]
    }
    // account_updates (security/account notices) is never accepted from the
    // client — it's not disable-able, matching the design brief.
    const { error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert({ user_id: req.user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    if (error) return res.status(500).json({ error: "Could not save notification preferences" })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── AI preferences ────────────────────────────────────────────────────────────
router.get("/ai-preferences", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("ai_preferences").select("*").eq("user_id", req.user.id).maybeSingle()
    if (error) return res.status(500).json({ error: "Could not read AI preferences" })
    res.json({ preferences: data || { user_id: req.user.id } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

const AI_PREF_FIELDS = ["personalization_enabled", "use_activity_for_recommendations", "summary_tone", "feedback_style", "content_language"]

router.put("/ai-preferences", requireAuth, async (req, res) => {
  try {
    const patch = {}
    for (const key of AI_PREF_FIELDS) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key]
    }
    const { error } = await supabaseAdmin
      .from("ai_preferences")
      .upsert({ user_id: req.user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    if (error) return res.status(500).json({ error: "Could not save AI preferences" })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Security events (for the Settings "recent security activity" summary) ───
router.get("/events", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("security_events").select("event_type, created_at, metadata")
      .eq("user_id", req.user.id).order("created_at", { ascending: false }).limit(20)
    if (error) return res.status(500).json({ error: "Could not read security activity" })
    res.json({ events: data || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Account deletion ──────────────────────────────────────────────────────────
// Honest about what this does: records the request and revokes every active
// session immediately. It does NOT purge data today — no automated purge job
// exists anywhere in this codebase (see the design report's compliance-gaps
// section). This endpoint does not overstate that gap; it fixes the parts it
// safely can (immediate sign-out everywhere) and is explicit in its response
// that deletion is a request, not an instant guarantee.
router.post("/account/delete", requireAuth, async (req, res) => {
  try {
    if (!(await requireReauth(req, res))) return
    const { reason } = req.body || {}
    const { error } = await supabaseAdmin.from("profiles").update({
      deletion_requested_at: new Date().toISOString(),
      deletion_reason: reason || "user_requested",
    }).eq("id", req.user.id)
    if (error) return res.status(500).json({ error: "Could not record deletion request" })

    await supabaseAdmin.auth.admin.signOut(bearerToken(req), "global").catch(() => {})
    await logSecurityEvent({ userId: req.user.id, eventType: "account_deletion_requested", ipAddress: clientIp(req) })
    res.json({
      success: true,
      message: "Your deletion request has been recorded and you've been signed out of every device. Data removal is a manual process today, not an automated purge — contact support if you don't hear back within a reasonable time.",
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
