-- Capabilio production database — functions & triggers.
--
-- Scope, deliberately minimal (see report Step 6): the app is server/API-
-- driven (Next.js routes over Drizzle), and that's where business logic
-- (ELO calculation, notification generation, profile creation on
-- registration) already lives and should stay. The one piece of database
-- logic added here is `updated_at` maintenance, because it is demonstrably
-- inconsistent today: several update call-sites (pulse like/comment
-- counters, notifications, interview/AURA evaluation writes) never set
-- updated_at manually, leaving it stale. A BEFORE UPDATE trigger fixes this
-- uniformly and is a no-op for call-sites that already set it themselves.
--
-- No trigger is added for profile creation on auth.users signup: the app
-- already creates users + profiles rows explicitly in
-- apps/api/src/app/api/auth/register/route.ts. Adding a competing
-- handle_new_user() trigger would create two code paths writing the same
-- rows. See report Security Findings for the gap this leaves (accounts
-- created outside that route, e.g. via future OAuth, get no profile row).

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tables with an updated_at column (18):
DROP TRIGGER IF EXISTS set_updated_at ON "users";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "profiles";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "career_goals";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "career_goals"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "role_knowledge";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "role_knowledge"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "user_skills";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "user_skills"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "missions";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "missions"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "submissions";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "submissions"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "evaluations";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "evaluations"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "elo_records";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "elo_records"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "stream_ratings";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "stream_ratings"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "portfolio_items";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "portfolio_items"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "portfolio_settings";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "portfolio_settings"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "subscriptions";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "usage_logs";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "usage_logs"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "pulse_posts";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "pulse_posts"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "personal_branding_profiles";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "personal_branding_profiles"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "job_applications";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "job_applications"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON "company_tasks";
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "company_tasks"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
