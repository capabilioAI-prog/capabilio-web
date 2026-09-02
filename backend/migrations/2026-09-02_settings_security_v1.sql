-- 2026-09-02_settings_security_v1.sql
--
-- Settings/Security/Privacy redesign, Phase 1 — new additive schema.
-- Verified against the live schema (Supabase MCP, project capabilio,
-- eybchcqwbizjmzyrviri) immediately before writing this file:
--
--   * profiles.profile_visibility already exists (text, default 'public',
--     NO check constraint, all 10 existing rows already 'public') — added
--     at some earlier point but never wired into RLS or any route. This
--     migration adds the missing check constraint and RLS enforcement;
--     it does NOT rename or duplicate this column.
--   * profiles.visibility_mode is a SEPARATE, already-wired column (real
--     values: private/connections_only/matched_recruiters/notice_period/
--     open/return_to_work/layoff_recovery, written by
--     POST /api/pro/visibility in professionalProfile.js, read by
--     OrbitDashboard.jsx) — this is the Professional/Orbit path's
--     "career availability status" feature (LinkedIn "Open to Work"
--     equivalent), a different concept from general profile visibility.
--     Untouched by this migration.
--   * profiles.notif_prefs / profiles.ai_prefs / profiles.compact_mode do
--     NOT exist despite frontend/src/pages/SettingsPanel.jsx writing
--     userData.notifPrefs / aiPrefs / compactMode through
--     frontend/src/lib/db.js's userDoc.update() (camelCase -> snake_case
--     via toSnake()). Confirmed: this means every save from the current
--     Notifications, AI Preferences, and Appearance sections has been
--     failing server-side (PostgREST rejects unknown columns) with the
--     error only reaching the browser console (userDoc.update logs it,
--     per its 2026-07-18 fix comment) — the Settings UI still shows a
--     fake "Saved" confirmation regardless, since those three sections'
--     handleSave() never check save()'s return value (unlike
--     PrivacySection, which does). This migration adds real, dedicated
--     tables for both instead of guessing at a column name a second time.
--   * The live RLS SELECT policy on profiles is currently
--     `(auth.uid() = id) OR (verified = true AND auth.role() = 'authenticated')`
--     — it does not reference profile_visibility at all, so ANY logged-in
--     user can already read ANY verified user's full profile row directly,
--     regardless of that user's page_visibility/searchable settings (those
--     only affect the /api/nexus/search route, not raw table access or
--     /api/nexus/profile/:uid, which uses the service-role client and
--     bypasses RLS entirely). This migration replaces that policy.
--   * This project's default ACL grants anon/authenticated full CRUD on any
--     new public table with no RLS (confirmed by the 2026-09-01 migration's
--     own header comment) — every new table below has RLS enabled before
--     anything else happens to it, with explicit policies only where a
--     client actually needs direct access; user_mfa_recovery_codes gets
--     NO client policies at all (service-role/backend only), since a
--     recovery code must never be readable via the client's own anon key
--     even by its owner.
--   * This project's PostgREST config exposes only `public`/`graphql_public`
--     (confirmed live: a direct REST call for auth.sessions with an
--     `Accept-Profile: auth` header returns PGRST106 "Invalid schema: auth")
--     — so a plain `.schema("auth").from("sessions")` call from the backend
--     can never work. get_user_sessions_admin() below is a SECURITY DEFINER
--     function in `public` (PostgREST-exposed) that reads auth.sessions
--     internally; EXECUTE is revoked from PUBLIC/anon/authenticated and
--     granted only to service_role, so only this backend (which has
--     already verified the caller's JWT and passes their own, real
--     req.user.id) can call it — a regular client can never invoke it to
--     read another user's sessions.
--
-- Nothing existing is dropped, renamed, narrowed, or has its type changed.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── profiles.profile_visibility: add the missing constraint ────────────────
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_visibility_check
  CHECK (profile_visibility IN ('public', 'capabilio_users', 'private'));

-- ── Replace the profiles SELECT policy to respect profile_visibility ───────
DROP POLICY IF EXISTS "Verified profiles visible to all authenticated users" ON public.profiles;
CREATE POLICY "Profile visibility controls read access"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (profile_visibility = 'public')
    OR (profile_visibility = 'capabilio_users' AND auth.role() = 'authenticated')
  );
-- Note: the other two existing SELECT policies ("Users can view own profile"
-- / "Users can view their own profile", both `auth.uid() = id`) are
-- pre-existing duplicates of part of this policy's own first clause;
-- left untouched here since dropping them is unrelated to this migration's
-- purpose and Postgres OR-combines multiple permissive policies safely.

-- ── notification_preferences: one row per user, real dedicated storage ─────
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Security/account notifications are not user-disable-able — no column
  -- for them exists here at all; they are sent unconditionally by the
  -- application, matching "Do not allow users to disable essential
  -- security/account notifications" from the design brief.
  account_updates boolean NOT NULL DEFAULT true,
  career_recommendations boolean NOT NULL DEFAULT true,
  arena_mission_ready boolean NOT NULL DEFAULT true,
  arena_achievements boolean NOT NULL DEFAULT true,
  arena_streak_reminders boolean NOT NULL DEFAULT true,
  market_reports boolean NOT NULL DEFAULT true,
  launchpad_matches boolean NOT NULL DEFAULT true,
  weekly_digest boolean NOT NULL DEFAULT true,
  marketing_emails boolean NOT NULL DEFAULT false, -- opt-IN, never opt-out by default
  channel_email boolean NOT NULL DEFAULT true,
  channel_inapp boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── ai_preferences: one row per user ────────────────────────────────────────
CREATE TABLE public.ai_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  personalization_enabled boolean NOT NULL DEFAULT true,
  use_activity_for_recommendations boolean NOT NULL DEFAULT true,
  summary_tone text NOT NULL DEFAULT 'professional'
    CHECK (summary_tone IN ('professional', 'conversational', 'achievement', 'concise')),
  feedback_style text NOT NULL DEFAULT 'detailed'
    CHECK (feedback_style IN ('concise', 'detailed')),
  content_language text NOT NULL DEFAULT 'en'
    CHECK (content_language IN ('en', 'hi', 'ta', 'te')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own AI preferences"
  ON public.ai_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own AI preferences"
  ON public.ai_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI preferences"
  ON public.ai_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── user_mfa_recovery_codes: backend-only, never client-readable ───────────
-- One-time TOTP-recovery codes. Only the hash is ever stored; plaintext is
-- returned to the user exactly once, at generation time, in the API
-- response body, never persisted or logged. No RLS policy is defined for
-- anon/authenticated below — RLS is enabled with zero client policies,
-- which means PostgREST denies ALL access to anon/authenticated roles by
-- default; only the backend's service-role key (which bypasses RLS
-- entirely, per this project's own established pattern) can read or write
-- this table. This is intentional, not an oversight.
CREATE TABLE public.user_mfa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_mfa_recovery_codes_user_id ON public.user_mfa_recovery_codes(user_id);
ALTER TABLE public.user_mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- ── security_events: append-only audit trail, backend-write / user-read ────
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'mfa_enabled', 'mfa_disabled', 'mfa_challenge_failed',
    'recovery_codes_regenerated', 'recovery_code_used',
    'password_changed', 'session_revoked', 'all_sessions_revoked',
    'profile_visibility_changed', 'account_deletion_requested'
  )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id, created_at DESC);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own security events"
  ON public.security_events FOR SELECT USING (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE policy — only the backend's service-role
-- key writes here, so a client (even the row's own owner) cannot forge or
-- tamper with their own security history.

-- ── get_user_sessions_admin: the only path to list a user's real sessions ──
CREATE OR REPLACE FUNCTION public.get_user_sessions_admin(p_user_id uuid)
RETURNS TABLE (id uuid, created_at timestamptz, updated_at timestamptz, user_agent text, ip text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT s.id, s.created_at, s.updated_at, s.user_agent, s.ip::text
  FROM auth.sessions s
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_user_sessions_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_sessions_admin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_sessions_admin(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sessions_admin(uuid) TO service_role;

COMMIT;
