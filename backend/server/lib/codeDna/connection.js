// ─── GitHub canonical connection — identity + scheduling state ───────────────
// Deliberately separate from lib/codeDna/repository.js: that module owns the
// rich analysis snapshot (proof_objects, unchanged); this module owns the
// small, indexed, queryable "is this user due for a scan" state a JSONB blob
// can't serve efficiently. See the 2026-09-03 migration's header for the
// full reasoning. Every write here is backend-only (no client RLS policy),
// so every function in this file is the actual authorization boundary —
// callers must already have verified the acting user via requireAuth (or,
// for the batch scanner, be iterating server-selected rows, never a
// client-supplied id).
import { supabaseAdmin } from "../supabase.js"

const SCAN_INTERVAL_HOURS = 24
const MAX_CONSECUTIVE_FAILURES_BEFORE_LONG_BACKOFF = 3

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
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

/** Successful scan: clears failure backoff, schedules the next run exactly
 *  SCAN_INTERVAL_HOURS out, and refreshes the denormalized summary columns
 *  every other surface (Career & Vault, Portfolio, Profile Strength) reads. */
export async function markScanCompleted(userId, { codeDnaScore, confidenceLevel, repositoriesAnalyzed }) {
  const { error } = await supabaseAdmin
    .from("github_connections")
    .update({
      scan_status: "idle",
      last_scan_error: null,
      consecutive_failures: 0,
      last_scanned_at: new Date().toISOString(),
      next_scan_at: hoursFromNow(SCAN_INTERVAL_HOURS),
      code_dna_score: codeDnaScore ?? null,
      confidence_level: confidenceLevel ?? null,
      repositories_analyzed: repositoriesAnalyzed ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
  if (error) throw error
}

/** Failed scan: exponential-ish backoff so a user whose GitHub account was
 *  renamed/deleted, or who's hitting a persistent error, doesn't get
 *  retried every scan cycle forever — errorCategory must be one of a fixed,
 *  safe, internal vocabulary (never a raw provider message) so nothing
 *  provider-specific ever reaches a stored column a UI might render. */
const SAFE_ERROR_CATEGORIES = new Set(["not_found", "rate_limited", "network_error", "unknown"])
export async function markScanFailed(userId, { errorCategory = "unknown" } = {}) {
  const category = SAFE_ERROR_CATEGORIES.has(errorCategory) ? errorCategory : "unknown"
  const current = await getConnection(userId)
  const failures = (current?.consecutive_failures || 0) + 1
  // 1x, 1x, 1x normal interval for the first 3 failures, then double the
  // interval per additional failure (capped implicitly by scan_status
  // staying 'idle' and being re-evaluated every batch run, never literally
  // "stop forever") — a simple, real backoff, not a fixed retry-forever loop.
  const backoffMultiplier = failures <= MAX_CONSECUTIVE_FAILURES_BEFORE_LONG_BACKOFF ? 1 : Math.min(failures - MAX_CONSECUTIVE_FAILURES_BEFORE_LONG_BACKOFF + 1, 7)
  const { error } = await supabaseAdmin
    .from("github_connections")
    .update({
      scan_status: "idle",
      last_scan_error: category,
      consecutive_failures: failures,
      last_scanned_at: new Date().toISOString(),
      next_scan_at: hoursFromNow(SCAN_INTERVAL_HOURS * backoffMultiplier),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
  if (error) throw error
}

/** Selects up to `limit` connections due for a scan right now, and
 *  immediately marks them 'queued' (a real claim, not just a read) so two
 *  overlapping batch invocations can never double-process the same user —
 *  the UPDATE...WHERE scan_status='idle' only succeeds for rows still idle
 *  at the moment it runs. */
export async function claimEligibleForScan(limit = 20) {
  const { data: candidates, error: selectErr } = await supabaseAdmin
    .from("github_connections")
    .select("user_id, username")
    .eq("scan_status", "idle")
    .is("disconnected_at", null)
    .lte("next_scan_at", new Date().toISOString())
    .order("next_scan_at", { ascending: true })
    .limit(limit)
  if (selectErr) throw selectErr
  if (!candidates?.length) return []

  const claimed = []
  for (const c of candidates) {
    const { data, error } = await supabaseAdmin
      .from("github_connections")
      .update({ scan_status: "queued", updated_at: new Date().toISOString() })
      .eq("user_id", c.user_id)
      .eq("scan_status", "idle") // re-check at claim time, not just at select time
      .select("user_id, username")
      .maybeSingle()
    if (!error && data) claimed.push(data)
  }
  return claimed
}
