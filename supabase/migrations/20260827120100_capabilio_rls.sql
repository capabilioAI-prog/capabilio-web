-- Capabilio production database — Row Level Security.
--
-- Architecture note (see production database foundation report, Step 5):
-- every read/write from apps/api goes through Drizzle over a direct
-- Postgres connection (DATABASE_URL — the Supabase `postgres` role, which
-- has BYPASSRLS by default), never through PostgREST with the anon/
-- authenticated keys. So RLS is not today's live enforcement path — it is
-- defense-in-depth required by Supabase's own security posture, and a
-- guardrail if a client-side Supabase query is ever added later.
--
-- Design, uniformly applied:
--  - RLS is ENABLED on every table below (no table is left unprotected).
--  - No policy ever grants INSERT/UPDATE/DELETE to `anon` or `authenticated`.
--    All writes remain SERVER_ONLY, reachable only via the trusted
--    BYPASSRLS connection used by apps/api. This directly satisfies the
--    "sensitive data must not be forgeable from the browser" requirement —
--    ELO, scores, evaluations, admin/billing/audit data cannot be forged by
--    a client under any policy defined here, full stop.
--  - SELECT policies are granted only where a real product reason exists
--    (public catalog content, a user's own rows, or content the owner has
--    explicitly marked public/published). Everything else is SERVER_ONLY:
--    RLS enabled, zero policies, so anon/authenticated get nothing and only
--    the bypass-RLS server connection can read it.
--  - No table in this schema is organization/company-owned (the `companies`
--    table is virtual mission context, not a real multi-tenant account), so
--    no ORGANIZATION-classified policies appear here.
--  - Admin access (`users.role = 'admin'`) is enforced in application code
--    today (the same trusted server connection), not via RLS — there is no
--    admin-facing client-side Supabase usage to protect yet. If one is
--    added, introduce a dedicated `is_admin()` helper and ROLE/ADMIN
--    policies at that point rather than speculatively now.

-- ============================================================
-- ENABLE RLS — every canonical table
-- ============================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "career_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "disciplines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_knowledge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "missions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mission_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_mission_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evaluations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "elo_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "elo_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stream_ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addon_purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pulse_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pulse_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pulse_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pulse_saved" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pulse_follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pulse_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aura_interviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interview_skill_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aura_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aura_vouchers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "personal_branding_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "career_assessment_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "career_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_tasks" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC — readable by anyone (anon + authenticated), no writes.
-- Static/reference content with no PII.
-- ============================================================
CREATE POLICY "public_read" ON "disciplines" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "roles" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "role_knowledge" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "skills" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "role_skills" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "companies" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "mission_skills" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "achievements" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON "pulse_topics" FOR SELECT TO anon, authenticated USING (true);

-- Missions are intentionally NOT given a public/authenticated SELECT policy
-- (see SERVER_ONLY section below) — even a "published only" filter would
-- still expose the full row, including test_cases (with isHidden/
-- expectedOutput grading data) and evaluation_criteria. That's an answer-key
-- leak of exactly the same kind as career_assessment_questions.correct_answer.
-- apps/web never queries Supabase directly (confirmed: no supabase.from()
-- call anywhere in the app), so mission catalog browsing already works
-- entirely through the Next.js API, which is free to select only the safe
-- columns server-side. No RLS policy is needed for the app to keep working.

-- ============================================================
-- MIXED — public for rows the owner marked public/published,
-- owner-only for everything else.
-- ============================================================
CREATE POLICY "public_read_visible_profile" ON "profiles" FOR SELECT TO anon, authenticated
  USING (profile_visibility = 'public' OR (select auth.uid()) = user_id);

CREATE POLICY "public_read_visible_portfolio" ON "portfolio_items" FOR SELECT TO anon, authenticated
  USING (visibility IN ('public', 'link_only') OR (select auth.uid()) = user_id);

CREATE POLICY "public_read_visible_settings" ON "portfolio_settings" FOR SELECT TO anon, authenticated
  USING (is_public = true OR (select auth.uid()) = user_id);

CREATE POLICY "public_read_published_brand" ON "personal_branding_profiles" FOR SELECT TO anon, authenticated
  USING (is_published = true OR (select auth.uid()) = user_id);

-- ============================================================
-- AUTHENTICATED — any signed-in user (social content; not
-- sensitive, but not meant for anonymous scraping either).
-- ============================================================
CREATE POLICY "authenticated_read" ON "pulse_posts" FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON "pulse_comments" FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON "pulse_likes" FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON "pulse_follows" FOR SELECT TO authenticated USING (true);

-- ============================================================
-- OWNER_ONLY — a signed-in user may read only their own rows.
-- ============================================================
CREATE POLICY "owner_read" ON "users" FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "owner_read" ON "career_goals" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "user_skills" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "user_mission_attempts" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "submissions" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "elo_records" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "elo_changes" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "stream_ratings" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "artifacts" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "user_achievements" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "subscriptions" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "usage_logs" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "addon_purchases" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "pulse_saved" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "aura_interviews" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "interview_skill_events" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "aura_documents" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "aura_vouchers" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "career_assessments" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "job_applications" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "saved_jobs" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "notifications" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "owner_read" ON "company_tasks" FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- Owner-only via a join, for tables one hop from user_id:
CREATE POLICY "owner_read_via_user_skill" ON "skill_evidence" FOR SELECT TO authenticated
  USING ((select auth.uid()) = (SELECT us.user_id FROM "user_skills" us WHERE us.id = user_skill_id));

CREATE POLICY "owner_read_via_submission" ON "evaluations" FOR SELECT TO authenticated
  USING ((select auth.uid()) = (SELECT s.user_id FROM "submissions" s WHERE s.id = submission_id));

-- ============================================================
-- SERVER_ONLY — RLS enabled, deliberately zero anon/authenticated
-- policies. Only the trusted BYPASSRLS server connection can reach
-- these rows.
--   audit_logs                   — internal security/action log
--   career_assessment_questions  — contains correct_answer/explanation;
--                                   a client-readable policy would let
--                                   students read answers before testing
--   missions                     — test_cases carries isHidden/expectedOutput
--                                   grading data; a client-readable policy,
--                                   even filtered to status='published',
--                                   would still expose the full row and leak
--                                   the answer key submissions are graded
--                                   against. The mission catalog is served
--                                   through the Next.js API today, which can
--                                   safely project only the safe columns.
-- ============================================================
-- (no CREATE POLICY statements — RLS-enabled + zero policies = default deny)
