-- Down migration for 2026-09-02_settings_security_v1.sql
--
-- Reverts every object that migration created: drops the four new tables
-- (notification_preferences, ai_preferences, user_mfa_recovery_codes,
-- security_events) and their indexes, restores the original profiles SELECT
-- policy, and drops the new profile_visibility check constraint. Does not
-- touch profile_visibility's column, data, or default (it pre-existed this
-- migration) or visibility_mode (a separate, unrelated feature).
--
-- Data-loss warning: dropping notification_preferences/ai_preferences/
-- user_mfa_recovery_codes/security_events discards any rows written since
-- the up-migration ran (user notification/AI settings, recovery codes, and
-- audit history). Confirm this is acceptable before running in an
-- environment with real user data.

BEGIN;

DROP FUNCTION IF EXISTS public.get_user_sessions_admin(uuid);

DROP POLICY IF EXISTS "Users can view own security events" ON public.security_events;
DROP TABLE IF EXISTS public.security_events;

DROP TABLE IF EXISTS public.user_mfa_recovery_codes;

DROP POLICY IF EXISTS "Users can insert own AI preferences" ON public.ai_preferences;
DROP POLICY IF EXISTS "Users can update own AI preferences" ON public.ai_preferences;
DROP POLICY IF EXISTS "Users can view own AI preferences" ON public.ai_preferences;
DROP TABLE IF EXISTS public.ai_preferences;

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
DROP TABLE IF EXISTS public.notification_preferences;

DROP POLICY IF EXISTS "Profile visibility controls read access" ON public.profiles;
CREATE POLICY "Verified profiles visible to all authenticated users"
  ON public.profiles FOR SELECT
  USING (
    (auth.uid() = id)
    OR ((verified = true) AND (auth.role() = 'authenticated'::text))
  );

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profile_visibility_check;

COMMIT;
