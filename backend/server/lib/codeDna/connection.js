// ─── GitHub canonical connection — identity + user-initiated scan state ──────
// Deliberately separate from lib/codeDna/repository.js: that module owns the
// rich analysis snapshot (proof_objects, unchanged); this module owns the
// small, indexed, queryable connection/scan state a JSONB blob can't serve
// efficiently. See the 2026-09-03 migration's header for the schema
// reasoning. Every write here is backend-only (no client RLS policy), so
// every function in this file is the actual authorization boundary —
// callers must already have verified the acting user via requireAuth.
//
// 2026-09-03 (revised): there is NO automatic background rescanning — no
// Render Cron Job, no GitHub Actions schedule, nothing polling this table on
// a timer. A scan only ever runs from a real user action: connecting GitHub
// for the first time, or clicking "Refresh Code DNA" (routes/github.js's
// POST /connect and POST /refresh — see tryStartManualScan below). The
// `next_scan_at` column is repurposed accordingly: it no longer means "an
// automatic scan is due at this time," it means "the earliest time this
// user is allowed to trigger another manual refresh" — a short abuse-
// prevention cooldown, not a scheduling deadline. The column/index were kept
// as-is (no migration needed) rather than dropped, since repurposing the
// existing field is the smallest safe change and nothing else in the schema
// depends on its old meaning.
import { supabaseAdmin } from "../supabase.js"

// How long a user must wait between manual "Refresh Code DNA" clicks —
// generous enough to stop accidental double-clicks/spam from burning through
// GitHub's rate limit, short enough that it never feels like the feature is
// unavailable. Applied after both a successful and a failed scan.
const REFRESH_COOLDOWN_MINUTES = 15

function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

export async function getConnection(userId) {
  const { data, error } = await supabaseAdmin
    .from("github_connections").select("*").eq("user_id", userId).maybeSingle()
  if (error) throw error
  return data
}

/** Creates or re-points the canonical identity (Settings/Career & Vault/
 *  Onboarding all funnel through this). Resets scan state for the new
 *  identity — a changed username is a different account, not a continuation
 *  of the old one's scan history. */
export async function upsertConnectionIdentity(userId, { username, profileUrl }) {
  const { data, error } = await supabaseAdmin
    .from("github_connections")
    .upsert({
      user_id: userId, username, profile_url: profileUrl,
      connection_method: "public_url",
      verification_state: "unverified",
      scan_status: "idle",
      consecutive_failures: 0,
      last_scan_error: null,
      disconnected_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select().single()
  if (error) throw error
  return data
}

export async function markVerified(userId) {
  const { error } = await supabaseAdmin
    .from("github_connections")
    .update({ verification_state: "verified", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
  if (error) throw error
}

export async function markDisconnected(userId) {
  // Deliberately does not delete the row or the underlying proof_objects
  // analysis — matches this codebase's existing account-deletion posture
  // (record the state change, don't destroy history the user may want back
  // if they reconnect) and the design report's documented choice. A
  // disconnected row is simply excluded from scanning (the partial index
  // above filters on disconnected_at IS NULL) and its status reads as
  // "not connected" everywhere.
  const { error } = await supabaseAdmin
    .from("github_connections")
    .update({ disconnected_at: new Date().toISOString(), scan_status: "idle", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
  if (error) throw error
}

export async function markScanning(userId) {
  const { error } = await supabaseAdmin
    .from("github_connections")
    .update({ scan_status: "scanning", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
  if (error) throw error
}

/** Successful scan: clears the failure counter, opens a short cooldown
 *  before the next manual refresh is allowed, and refreshes the
 *  denormalized summary columns every other surface (Career & Vault,
 *  Portfolio, Profile Strength) reads. */
export async function markScanCompleted(userId, { codeDnaScore, confidenceLevel, repositoriesAnalyzed }) {
  const { error } = await supabaseAdmin
    .from("github_connections")
    .update({
      scan_status: "idle",
      last_scan_error: null,
      consecutive_failures: 0,
      last_scanned_at: new Date().toISOString(),
      next_scan_at: minutesFromNow(REFRESH_COOLDOWN_MINUTES),
      code_dna_score: codeDnaScore ?? null,
      confidence_level: confidenceLevel ?? null,
      repositories_analyzed: repositoriesAnalyzed ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
  if (error) throw error
}

/** Failed scan: same short cooldown as a success (not a growing backoff —
 *  that only made sense for an automatic scheduler retrying unattended;
 *  here a human just clicked "Refresh" and failed, so there's no reason to
 *  lock them out longer than the normal abuse-prevention window). The
 *  denormalized score/confidence/repo-count columns are deliberately left
 *  untouched, so the previous successful result keeps showing everywhere.
 *  errorCategory must be one of a fixed, safe, internal vocabulary (never a
 *  raw provider message) so nothing provider-specific ever reaches a stored
 *  column a UI might render. */
const SAFE_ERROR_CATEGORIES = new Set(["not_found", "rate_limited", "network_error", "unknown"])
export async function markScanFailed(userId, { errorCategory = "unknown" } = {}) {
  const category = SAFE_ERROR_CATEGORIES.has(errorCategory) ? errorCategory : "unknown"
  const current = await getConnection(userId)
  const failures = (current?.consecutive_failures || 0) + 1
  const { error } = await supabaseAdmin
    .from("github_connections")
    .update({
      scan_status: "idle",
      last_scan_error: category,
      consecutive_failures: failures,
      last_scanned_at: new Date().toISOString(),
      next_scan_at: minutesFromNow(REFRESH_COOLDOWN_MINUTES),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
  if (error) throw error
}

/** The only place a scan is ever started. Atomically claims the row for
 *  scanning — UPDATE ... WHERE scan_status='idle' AND (no active cooldown)
 *  — so two overlapping requests from the same user (a double-click, two
 *  open tabs) can never both start a scan: exactly one UPDATE affects a row,
 *  the other affects zero and is told why. This is the single source of
 *  truth for "can this user refresh right now," used by both POST /connect
 *  (first-time analysis) and POST /refresh (user-initiated rescan). */
export async function tryStartManualScan(userId) {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from("github_connections")
    .update({ scan_status: "scanning", updated_at: nowIso })
    .eq("user_id", userId)
    .eq("scan_status", "idle")
    .is("disconnected_at", null)
    .or(`next_scan_at.is.null,next_scan_at.lte.${nowIso}`)
    .select("user_id, username, profile_url")
    .maybeSingle()
  if (error) throw error
  if (data) return { started: true, connection: data }

  // Not claimed — figure out why, so the route can return an accurate,
  // user-facing reason instead of a generic failure.
  const current = await getConnection(userId)
  if (!current || current.disconnected_at) return { started: false, reason: "not_connected" }
  if (current.scan_status !== "idle") return { started: false, reason: "in_progress" }
  if (current.next_scan_at && new Date(current.next_scan_at) > new Date()) {
    return {
      started: false,
      reason: "cooldown",
      retryAfterSeconds: Math.max(1, Math.ceil((new Date(current.next_scan_at) - new Date()) / 1000)),
    }
  }
  return { started: false, reason: "unknown" }
}
