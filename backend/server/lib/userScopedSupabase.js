// ─── User-scoped Supabase client ──────────────────────────────────────────────
// Supabase's MFA API (auth.mfa.enroll/challenge/verify/unenroll) and
// auth.signInWithPassword() must run as the specific end user, not the
// service-role admin client (supabaseAdmin, backend/server/lib/supabase.js)
// — GoTrue scopes these calls to whichever session/access-token the client
// is carrying. The backend only ever has that user's ACCESS token (from the
// incoming Authorization header), never their refresh token, so a full
// `setSession()` isn't possible — instead, a client built with the public
// anon key and that access token forced onto every request's Authorization
// header is the standard, documented pattern for "act as this user" on a
// stateless server. This client is deliberately request-scoped (never
// cached/reused across users) and never uses the service-role key.
import { createClient } from "@supabase/supabase-js"

// Shared across both frontend (VITE_SUPABASE_ANON_KEY) and this backend —
// it's the public anon key, safe to read from either prefix; no separate
// backend-only env var exists or is needed for it.
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""

export function getUserScopedClient(accessToken) {
  return createClient(process.env.SUPABASE_URL || "", ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
