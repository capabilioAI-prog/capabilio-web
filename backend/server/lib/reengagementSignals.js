/**
 * lib/reengagementSignals.js
 * ---------------------------------------------------------------------------
 * 2026-08-05: the platform had no automated re-engagement mechanism at all —
 * confirmed by grep (no cron, no notification writer for anything but
 * reactive peer/recruiter events) before building this. Everything was
 * pull-based: a decaying ELO, a breaking streak, or a going-stale skill only
 * ever surfaced if the user happened to open the app and look.
 *
 * This module computes three signals, each grounded in a REAL existing rule
 * elsewhere in the codebase rather than an invented threshold:
 *   1. streak_break_risk — arena_streak/arena_last_active (existing Arena columns)
 *   2. elo_decay_risk    — the exact INACTIVITY_GRACE_DAYS=14 rule already
 *      enforced by lib/professionalElo/eloEngine.js's applyPendingDecay()
 *   3. skill_stale       — the exact week-boundaries already defined in
 *      lib/skillPulseV2/decay.js (Aging 4-7wk, At Risk 8-15wk, Decayed 16+wk),
 *      applied to skill_graph.last_proof_date
 *
 * Writes into the EXISTING `notifications` table (used today by
 * recruiterComms.js, pulseNexus.js — GET/POST /api/nexus/notifications,
 * rendered by Nexus.jsx's Notifications tab and (as of this date) the
 * platform-wide bell in components/Header.jsx). No new table, no new read
 * path — this only adds a new WRITER for signals nobody was generating.
 *
 * Dedupe: before inserting, checks for an existing notification of the same
 * (user_id, type) within the last 20 hours and skips if found — running this
 * job daily should not spam a user with the same "streak breaks tonight"
 * notification more than once a day even if the job is re-run.
 */
import { supabaseAdmin } from "./supabase.js"
import { sendEmail } from "./email.js"
import { INACTIVITY_GRACE_DAYS } from "./professionalElo/eloEngine.js"

const DEDUPE_WINDOW_HOURS = 20
const AT_RISK_MIN_WEEKS = 8   // lib/skillPulseV2/decay.js's "At Risk" boundary
const AT_RISK_WINDOW_DAYS = 7 // fire once, in the first week of entering At Risk

function daysBetween(a, b) {
  return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)
}

async function fetchEmailsByUserId(userIds) {
  const map = new Map()
  if (!userIds.length) return map
  const { data, error } = await supabaseAdmin.from("profiles").select("id, email").in("id", userIds)
  if (error) { console.error("[reengagement] email lookup failed:", error.message); return map }
  for (const row of data || []) if (row.email) map.set(row.id, row.email)
  return map
}

async function alreadyNotifiedRecently(userId, type) {
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", since)
    .limit(1)
  if (error) { console.error(`[reengagement] dedupe check failed for ${userId}/${type}:`, error.message); return true } // fail closed — don't spam on error
  return (data || []).length > 0
}

// Settings/Security redesign (2026-09-02): notification_preferences is real,
// dedicated storage (see that migration) — this is the one existing
// notification writer in the codebase, so it's the first real consumer of
// it. Each signal type maps to the closest real preference category; there
// isn't a 1:1 field for every signal, so elo_decay_risk (an Arena
// performance signal) shares arena_streak_reminders rather than inventing a
// fourth near-duplicate toggle nobody asked to see in Settings.
const PREFERENCE_KEY_BY_SIGNAL_TYPE = {
  streak_break_risk: "arena_streak_reminders",
  elo_decay_risk: "arena_streak_reminders",
  skill_stale: "career_recommendations",
}

async function getPreferences(userId) {
  const { data } = await supabaseAdmin
    .from("notification_preferences").select("*").eq("user_id", userId).maybeSingle()
  // No row yet = defaults apply (every category on except marketing) —
  // matches the column defaults in the 2026-09-02 migration exactly, so a
  // user who's never opened Notification Preferences still gets the same
  // behavior as if their row existed with its defaults.
  return data || {
    arena_streak_reminders: true, career_recommendations: true,
    channel_inapp: true, channel_email: true,
  }
}

async function notify(userId, { type, title, body, email }) {
  if (await alreadyNotifiedRecently(userId, type)) return { skipped: true }

  const prefs = await getPreferences(userId)
  const prefKey = PREFERENCE_KEY_BY_SIGNAL_TYPE[type]
  const categoryEnabled = prefKey ? prefs[prefKey] !== false : true
  if (!categoryEnabled) return { skipped: true, reason: "category_disabled" }

  if (prefs.channel_inapp !== false) {
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: userId, type, title, body,
    })
    if (error) console.error(`[reengagement] insert failed for ${userId}/${type}:`, error.message)
  }

  if (email?.to && prefs.channel_email !== false) {
    await sendEmail({
      to: email.to,
      subject: title,
      html: `<p>${body}</p><p><a href="https://capabilio.com">Open Capabilio →</a></p>`,
    }).catch(() => {}) // sendEmail already fails soft; this is belt-and-suspenders
  }

  return { notified: true }
}

// ─── Signal 1: streak break risk ───────────────────────────────────────────
export async function computeStreakBreakSignals() {
  const { data: rows, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, arena_streak, arena_last_active, last_arena_date")
    .gt("arena_streak", 0)
    .limit(5000)
  if (error) throw new Error(`streak signal query failed: ${error.message}`)

  const now = new Date()
  const results = []
  for (const row of rows || []) {
    const lastActive = row.arena_last_active ? new Date(row.arena_last_active)
      : (row.last_arena_date ? new Date(row.last_arena_date) : null)
    if (!lastActive || isNaN(lastActive)) continue
    const days = daysBetween(lastActive, now)
    // Was active yesterday (roughly 20-32h ago), not yet today — the streak
    // breaks at midnight if they don't act. Outside that window either
    // they're already active today (nothing to warn about) or the streak
    // has likely already broken elsewhere in the system.
    if (days >= 0.85 && days < 1.4) {
      results.push(notify(row.id, {
        type: "streak_break_risk",
        title: `Your ${row.arena_streak}-day streak breaks tonight`,
        body: `You haven't done an Arena task today — complete one before midnight to keep your ${row.arena_streak}-day streak alive.`,
        email: row.email ? { to: row.email } : null,
      }))
    }
  }
  return Promise.allSettled(results)
}

// ─── Signal 2: professional ELO decay risk ─────────────────────────────────
export async function computeEloDecaySignals() {
  const { data: rows, error } = await supabaseAdmin
    .from("professional_elo_state")
    .select("user_id, elo, last_assessment_at, created_at, last_decay_applied_at")
    .limit(5000)
  if (error) throw new Error(`elo decay signal query failed: ${error.message}`)
  if (!rows?.length) return []

  // No FK constraint exists between professional_elo_state.user_id and
  // profiles.id (confirmed via information_schema before writing this) —
  // PostgREST embedding (`profiles!inner(...)`) isn't available, so emails
  // are fetched in a separate batched query instead.
  const emailByUser = await fetchEmailsByUserId(rows.map(r => r.user_id))

  const now = new Date()
  const results = []
  for (const row of rows) {
    const lastActivity = row.last_assessment_at ? new Date(row.last_assessment_at) : new Date(row.created_at)
    const lastDecayCheckpoint = row.last_decay_applied_at ? new Date(row.last_decay_applied_at) : lastActivity
    const since = lastDecayCheckpoint > lastActivity ? lastDecayCheckpoint : lastActivity
    const daysInactive = daysBetween(since, now)
    const daysUntilDecay = INACTIVITY_GRACE_DAYS - daysInactive
    // Warn once, in the 3-day window before decay actually starts (day 11-13
    // of the 14-day grace period) — early enough to act, late enough not to
    // nag every single day of the grace period.
    if (daysUntilDecay > 0 && daysUntilDecay <= 3) {
      const daysLabel = Math.ceil(daysUntilDecay)
      const email = emailByUser.get(row.user_id)
      results.push(notify(row.user_id, {
        type: "elo_decay_risk",
        title: `Your Professional ELO starts decaying in ${daysLabel} day${daysLabel === 1 ? "" : "s"}`,
        body: `No Skill Pulse activity in ${Math.floor(daysInactive)} days. Take this week's Skill Pulse to keep your ${row.elo} ELO from decaying.`,
        email: email ? { to: email } : null,
      }))
    }
  }
  return Promise.allSettled(results)
}

// ─── Signal 3: skill going stale ───────────────────────────────────────────
export async function computeSkillStaleSignals() {
  const { data: rows, error } = await supabaseAdmin
    .from("skill_graph")
    .select("user_id, skill_name, last_proof_date")
    .eq("is_current", true)
    .not("last_proof_date", "is", null)
    .limit(10000)
  if (error) throw new Error(`skill stale signal query failed: ${error.message}`)
  if (!rows?.length) return []

  const emailByUser = await fetchEmailsByUserId([...new Set(rows.map(r => r.user_id))])
  const now = new Date()
  const seenUsers = new Set() // at most one skill_stale nudge per user per run — avoid piling on
  const results = []
  for (const row of rows || []) {
    if (seenUsers.has(row.user_id)) continue
    const lastProof = new Date(row.last_proof_date)
    if (isNaN(lastProof)) continue
    const daysSince = daysBetween(lastProof, now)
    const weeksSince = daysSince / 7
    const enteredAtRiskDaysAgo = daysSince - (AT_RISK_MIN_WEEKS * 7)
    if (weeksSince >= AT_RISK_MIN_WEEKS && enteredAtRiskDaysAgo < AT_RISK_WINDOW_DAYS) {
      seenUsers.add(row.user_id)
      const email = emailByUser.get(row.user_id)
      results.push(notify(row.user_id, {
        type: "skill_stale",
        title: `${row.skill_name} is going stale`,
        body: `No verified activity on ${row.skill_name} in ${Math.floor(weeksSince)} weeks. A quick Arena task or Skill Pulse keeps it fresh on your profile.`,
        email: email ? { to: email } : null,
      }))
    }
  }
  return Promise.allSettled(results)
}

export async function runReengagementDigest() {
  const [streak, elo, skill] = await Promise.all([
    computeStreakBreakSignals().catch(err => { console.error("[reengagement] streak signal failed:", err.message); return [] }),
    computeEloDecaySignals().catch(err => { console.error("[reengagement] elo signal failed:", err.message); return [] }),
    computeSkillStaleSignals().catch(err => { console.error("[reengagement] skill signal failed:", err.message); return [] }),
  ])
  const count = (arr) => arr.filter(r => r.status === "fulfilled" && r.value?.notified).length
  return {
    streakNotified: count(streak),
    eloDecayNotified: count(elo),
    skillStaleNotified: count(skill),
  }
}
