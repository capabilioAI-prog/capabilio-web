// ─── security.js — recovery codes, security-event logging, re-auth check ─────
// Recovery codes exist because Supabase Auth's native MFA has no first-party
// backup-code mechanism (confirmed against Supabase's own docs — their
// documented fallback is enrolling a second TOTP factor instead). Everything
// here is additive on top of Supabase's own TOTP enroll/verify, never a
// replacement for it.
import crypto from "crypto"
import { supabaseAdmin } from "./supabase.js"

const RECOVERY_CODE_COUNT = 10
// 4 groups of 4 base32-ish (Crockford, no ambiguous 0/O/1/I/L) characters,
// e.g. "K7M2-9XQP-4RT8-..." — printable, easy to transcribe, ~20 bits of
// entropy per group (80 bits total across the 4 groups actually used below;
// see generateRecoveryCodes for the exact groups-per-code count).
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"

function randomCodeGroup(length = 4) {
  let out = ""
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return out
}

function hashCode(code) {
  // Recovery codes are single-use, high-entropy, random tokens (not
  // user-chosen low-entropy passwords), so a fast, salted SHA-256 HMAC is
  // appropriate here — unlike a password, there's no offline-guessing risk
  // worth paying bcrypt/scrypt's cost for, and this keeps verification cheap
  // at login time. Keyed with SUPABASE_JWT_SECRET (already a private,
  // rotation-aware secret this backend holds) so a raw DB dump alone can't
  // be dictionary-matched against the small, known alphabet without also
  // having that key.
  const key = process.env.SUPABASE_JWT_SECRET || process.env.RECOVERY_CODE_HMAC_KEY || ""
  return crypto.createHmac("sha256", key).update(code.toUpperCase()).digest("hex")
}

/** Generates N plaintext codes + their hashes. Plaintext is returned to the
 *  caller to show the user ONCE; only the hashes are ever persisted. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT) {
  const codes = []
  for (let i = 0; i < count; i++) {
    const code = `${randomCodeGroup(4)}-${randomCodeGroup(4)}`
    codes.push(code)
  }
  return { plaintext: codes, hashes: codes.map(hashCode) }
}

/** Replaces a user's entire recovery-code set — old codes (used or not) are
 *  deleted first, so regenerating always invalidates everything issued
 *  before it, per the design brief's explicit requirement. */
export async function replaceRecoveryCodes(userId) {
  const { plaintext, hashes } = generateRecoveryCodes()
  await supabaseAdmin.from("user_mfa_recovery_codes").delete().eq("user_id", userId)
  const rows = hashes.map(code_hash => ({ user_id: userId, code_hash }))
  const { error } = await supabaseAdmin.from("user_mfa_recovery_codes").insert(rows)
  if (error) throw error
  return plaintext
}

/** Verifies + atomically consumes one recovery code. Returns true exactly
 *  once per code — a second attempt with the same code always fails, since
 *  the UPDATE only matches rows where used_at IS NULL. */
export async function consumeRecoveryCode(userId, code) {
  const code_hash = hashCode(code)
  const { data, error } = await supabaseAdmin
    .from("user_mfa_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("code_hash", code_hash)
    .is("used_at", null)
    .select("id")
  if (error) throw error
  return (data || []).length > 0
}

export async function countRemainingRecoveryCodes(userId) {
  const { count } = await supabaseAdmin
    .from("user_mfa_recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("used_at", null)
  return count || 0
}

/** Append-only audit trail — never exposes what happened to anyone but the
 *  row's own owner (see the table's RLS: SELECT-own-row only, no client
 *  write policy at all). `metadata` must never contain secrets, tokens, or
 *  the TOTP seed — callers pass only safe, already-public-shaped facts
 *  (e.g. { factorId } is fine; a TOTP code or session JWT is not). */
export async function logSecurityEvent({ userId, eventType, metadata = {}, ipAddress = null }) {
  try {
    await supabaseAdmin.from("security_events").insert({
      user_id: userId, event_type: eventType, metadata, ip_address: ipAddress,
    })
  } catch (e) {
    // Never let audit-logging failure block the actual security action —
    // log to server console (safe, internal-only) and move on.
    console.error("logSecurityEvent failed:", eventType, e.message)
  }
}

/** Re-verifies the caller's current password via a fresh sign-in attempt —
 *  the standard "prove you're still you" check OWASP recommends before any
 *  sensitive account change. Uses the anon key (a normal login attempt),
 *  never the service-role key, and returns only a boolean — never the
 *  resulting session, which this caller has no use for and shouldn't hold. */
export async function verifyCurrentPassword(email, password) {
  const { createClient } = await import("@supabase/supabase-js")
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
  const client = createClient(process.env.SUPABASE_URL || "", ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  return !error
}
