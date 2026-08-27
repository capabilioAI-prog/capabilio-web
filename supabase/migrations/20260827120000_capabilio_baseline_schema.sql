-- Capabilio production database — canonical baseline schema.
-- Generated from packages/db/src/schema/*.ts (Drizzle) via `drizzle-kit generate`,
-- then hand-curated: excludes career_history and evaluation_criteria_results
-- (see classification in the production database foundation report), and adds
-- the FK from public.users.id to auth.users.id (Supabase Auth is the sole
-- identity provider — see report Step 4).

-- ============================================================
-- ENUM TYPES
-- ============================================================
DO $$ BEGIN
 CREATE TYPE "public"."career_level" AS ENUM('student', 'entry', 'mid', 'senior', 'lead');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."career_timeline" AS ENUM('immediate', '3_months', '6_months', '1_year', '2_plus_years');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('student', 'professional', 'recruiter', 'admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role_level" AS ENUM('intern', 'junior', 'mid', 'senior', 'lead', 'principal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."measurement_method" AS ENUM('code_execution', 'test_cases', 'artifact_review', 'peer_review', 'ai_assessment', 'portfolio_evidence');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."skill_category" AS ENUM('technical', 'analytical', 'communication', 'leadership', 'domain', 'tooling');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."skill_evidence_source" AS ENUM('mission_completion', 'peer_review', 'certification', 'project');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mission_difficulty" AS ENUM('entry', 'mid', 'senior', 'lead');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."mission_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."evaluation_status" AS ENUM('pending', 'running', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."submission_status" AS ENUM('in_progress', 'submitted', 'evaluated', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."artifact_type" AS ENUM('code_submission', 'document', 'design', 'report', 'presentation', 'screenshot', 'certificate', 'resume');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."portfolio_visibility" AS ENUM('public', 'private', 'link_only');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'pro', 'elite', 'student', 'professional', 'enterprise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pulse_follow_target_type" AS ENUM('user', 'company', 'topic');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pulse_post_category" AS ENUM('sparks', 'architecture', 'incident', 'career_win', 'technical_news', 'evidence_share', 'question', 'insight');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."pulse_signal_type" AS ENUM('career_signal', 'tech_signal', 'trend_signal', 'network_signal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."aura_document_category" AS ENUM('resume', 'portfolio_artifact', 'project', 'certificate', 'arena_proof', 'interview_report', 'document');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."aura_interview_type" AS ENUM('technical', 'behavioral', 'system_design', 'role_specific');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."assessment_question_difficulty" AS ENUM('easy', 'applied', 'scenario', 'challenging');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."assessment_question_type" AS ENUM('MCQ', 'SCENARIO', 'DEBUGGING', 'OUTPUT_PREDICTION', 'SQL_QUERY', 'DATA_INTERPRETATION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."job_app_status" AS ENUM('applied', 'under_review', 'interview', 'selected', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('assessment_complete', 'mission_evaluated', 'elo_update', 'voucher_issued', 'job_applied', 'task_assigned', 'like', 'comment', 'follow');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ============================================================
-- TABLES (identity / users)
-- ============================================================
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"headline" text,
	"location" text,
	"website" text,
	"linkedin_url" text,
	"github_url" text,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"college_name" text,
	"stream" text,
	"department" text,
	"university_name" text,
	"graduation_year" text,
	"has_completed_career_onboarding" boolean DEFAULT false NOT NULL,
	"username" text,
	"profile_visibility" text DEFAULT 'public',
	"evidence_visibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "career_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_role_id" uuid NOT NULL,
	"timeline" "career_timeline" NOT NULL,
	"current_level" "career_level" NOT NULL,
	"motivation" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (roles / disciplines / skills)
-- ============================================================
CREATE TABLE IF NOT EXISTS "disciplines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"icon_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disciplines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipline_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"level" "role_level" DEFAULT 'mid' NOT NULL,
	"description" text NOT NULL,
	"icon_name" text,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"software" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"workflows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluation_methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"portfolio_evidence_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_knowledge_role_id_unique" UNIQUE("role_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" "skill_category" NOT NULL,
	"description" text NOT NULL,
	"measurement_method" "measurement_method" NOT NULL,
	"parent_skill_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"is_core" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"elo_score" integer DEFAULT 1000 NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"last_demonstrated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_skill_id" uuid NOT NULL,
	"submission_id" uuid,
	"elo_delta" integer NOT NULL,
	"source_type" "skill_evidence_source" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (missions)
-- ============================================================
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"industry" text NOT NULL,
	"size" text NOT NULL,
	"description" text NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"company_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"difficulty" "mission_difficulty" NOT NULL,
	"estimated_minutes" integer DEFAULT 60 NOT NULL,
	"status" "mission_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"manager_name" text NOT NULL,
	"manager_title" text NOT NULL,
	"department" text NOT NULL,
	"sprint" text NOT NULL,
	"business_context" text NOT NULL,
	"problem_statement" text NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluation_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"available_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_deliverable" text NOT NULL,
	"reference_documentation" text,
	"starter_code" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starter_files" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"test_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "missions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mission_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_mission_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" text NOT NULL,
	"track_type" text DEFAULT 'career' NOT NULL,
	"role_slug" text,
	"stream_slug" text,
	"title" text NOT NULL,
	"scenario_family" text,
	"score" integer NOT NULL,
	"elo_before" integer NOT NULL,
	"elo_change" integer NOT NULL,
	"elo_after" integer NOT NULL,
	"passed" boolean NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"deliverables" jsonb DEFAULT '{}'::jsonb,
	"mentor_feedback" text,
	"verification_hash" text,
	"is_locked" boolean DEFAULT true NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (submissions / evaluations)
-- ============================================================
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"status" "submission_status" DEFAULT 'in_progress' NOT NULL,
	"workspace_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"files" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"time_spent_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"status" "evaluation_status" DEFAULT 'pending' NOT NULL,
	"deterministic_score" real,
	"ai_score" real,
	"total_score" real,
	"passed" boolean,
	"criteria_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"test_results" jsonb,
	"code_execution_result" jsonb,
	"ai_feedback" jsonb,
	"elo_delta" integer,
	"evaluated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluations_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint

-- ============================================================
-- TABLES (ELO)
-- ============================================================
CREATE TABLE IF NOT EXISTS "elo_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"elo_score" integer DEFAULT 400 NOT NULL,
	"total_missions" integer DEFAULT 0 NOT NULL,
	"passed_missions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "elo_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"submission_id" uuid,
	"previous_elo" integer NOT NULL,
	"new_elo" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"difficulty" text NOT NULL,
	"passed" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stream_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stream_slug" text NOT NULL,
	"stream_name" text NOT NULL,
	"rating" integer DEFAULT 500 NOT NULL,
	"total_challenges" integer DEFAULT 0 NOT NULL,
	"passed_challenges" integer DEFAULT 0 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (portfolio)
-- ============================================================
CREATE TABLE IF NOT EXISTS "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "artifact_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"submission_id" uuid,
	"role_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"mission_title" text,
	"difficulty" text,
	"score" real,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"artifact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" "portfolio_visibility" DEFAULT 'private' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"headline" text,
	"about" text,
	"theme" text DEFAULT 'editorial' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"cta_text" text DEFAULT 'Contact Candidate',
	"cta_url" text,
	"featured_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured_skill_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enable_personal_brand" boolean DEFAULT true NOT NULL,
	"enable_video" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint

-- ============================================================
-- TABLES (achievements)
-- ============================================================
CREATE TABLE IF NOT EXISTS "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"badge_url" text,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (subscriptions / billing / audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"period" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "addon_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"addon_type" text NOT NULL,
	"price_inr" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (pulse / social)
-- ============================================================
CREATE TABLE IF NOT EXISTS "pulse_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"author_headline" text NOT NULL,
	"author_avatar_url" text,
	"author_role" text NOT NULL,
	"category" "pulse_post_category" DEFAULT 'insight' NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"domain" text DEFAULT 'software_engineering' NOT NULL,
	"signal_type" "pulse_signal_type",
	"signal_note" text,
	"code_snippet" jsonb,
	"evidence_data" jsonb,
	"action_prompt" jsonb,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"shares_count" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pulse_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"author_headline" text NOT NULL,
	"author_avatar_url" text,
	"content" text NOT NULL,
	"parent_id" uuid,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pulse_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pulse_saved" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pulse_follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" "pulse_follow_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"target_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pulse_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text NOT NULL,
	"trending_score" integer DEFAULT 100 NOT NULL,
	"growth_rate" text DEFAULT '+15%' NOT NULL,
	"description" text NOT NULL,
	"followers_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pulse_topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- ============================================================
-- TABLES (AURA — mentorship / interviews / vault / branding)
-- ============================================================
CREATE TABLE IF NOT EXISTS "aura_interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"interview_type" "aura_interview_type" DEFAULT 'technical' NOT NULL,
	"difficulty" text DEFAULT 'junior' NOT NULL,
	"duration_minutes" integer DEFAULT 15 NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"score" integer DEFAULT 85 NOT NULL,
	"communication_score" integer DEFAULT 80 NOT NULL,
	"technical_depth_score" integer DEFAULT 85 NOT NULL,
	"problem_solving_score" integer DEFAULT 90 NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"business_reasoning_score" integer DEFAULT 85,
	"role_relevance_score" integer DEFAULT 88,
	"readiness_score" integer DEFAULT 72,
	"verification_hash" text,
	"next_best_action" text,
	"task_data" jsonb DEFAULT '{}'::jsonb,
	"feedback" text,
	"interview_mode" text DEFAULT 'technical',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interview_skill_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid,
	"user_id" uuid NOT NULL,
	"skill_slug" text NOT NULL,
	"skill_name" text NOT NULL,
	"source" text DEFAULT 'AI_INTERVIEW' NOT NULL,
	"score_delta" integer NOT NULL,
	"proficiency_after" integer NOT NULL,
	"evidence_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aura_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "aura_document_category" DEFAULT 'document' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_name" text NOT NULL,
	"file_size_bytes" integer DEFAULT 1024 NOT NULL,
	"mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"file_url" text,
	"verified" boolean DEFAULT false NOT NULL,
	"verification_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aura_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"verification_id" text NOT NULL,
	"title" text NOT NULL,
	"issuer" text DEFAULT 'Capabilio Verified Capability Engine' NOT NULL,
	"elo_score" integer DEFAULT 1000 NOT NULL,
	"skills_verified" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_count" integer DEFAULT 1 NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aura_vouchers_verification_id_unique" UNIQUE("verification_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personal_branding_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"video_status" text DEFAULT 'draft' NOT NULL,
	"script_text" text NOT NULL,
	"video_url" text,
	"duration_seconds" integer DEFAULT 45 NOT NULL,
	"target_role_name" text NOT NULL,
	"top_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (assessment)
-- ============================================================
CREATE TABLE IF NOT EXISTS "career_assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_slug" text NOT NULL,
	"skill_slug" text NOT NULL,
	"skill_name" text NOT NULL,
	"difficulty" "assessment_question_difficulty" DEFAULT 'applied' NOT NULL,
	"question_type" "assessment_question_type" DEFAULT 'MCQ' NOT NULL,
	"question" text NOT NULL,
	"scenario" text,
	"code_snippet" text,
	"options" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL,
	"time_limit_seconds" integer DEFAULT 60 NOT NULL,
	"order_index" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "career_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"starting_elo" integer DEFAULT 400 NOT NULL,
	"final_elo" integer NOT NULL,
	"elo_change" integer NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer DEFAULT 25 NOT NULL,
	"accuracy" integer NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"skill_scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_feedback" jsonb NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- TABLES (hiring / launchpad)
-- ============================================================
CREATE TABLE IF NOT EXISTS "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" text NOT NULL,
	"company" text NOT NULL,
	"role_title" text NOT NULL,
	"salary_range" text,
	"status" text DEFAULT 'applied' NOT NULL,
	"match_score" integer DEFAULT 80 NOT NULL,
	"evidence_attached" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proof_package" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"timeline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" text NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" DEFAULT 'elo_update' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"company_name" text NOT NULL,
	"role_category" text NOT NULL,
	"difficulty" text DEFAULT 'Junior' NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"submission_note" text,
	"proof_hash" text,
	"due_days" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

-- Supabase Auth is the sole identity provider: public.users.id is both the
-- PK and a FK to auth.users.id. Deleting an auth user cascades through
-- public.users and, transitively, every user-owned table below.
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_knowledge" ADD CONSTRAINT "role_knowledge_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "roles_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_skills" ADD CONSTRAINT "role_skills_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_skills" ADD CONSTRAINT "role_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_user_skill_id_user_skills_id_fk" FOREIGN KEY ("user_skill_id") REFERENCES "public"."user_skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "missions" ADD CONSTRAINT "missions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "missions" ADD CONSTRAINT "missions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_skills" ADD CONSTRAINT "mission_skills_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mission_skills" ADD CONSTRAINT "mission_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_mission_attempts" ADD CONSTRAINT "user_mission_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "elo_records" ADD CONSTRAINT "elo_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "elo_records" ADD CONSTRAINT "elo_records_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "elo_changes" ADD CONSTRAINT "elo_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "elo_changes" ADD CONSTRAINT "elo_changes_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "elo_changes" ADD CONSTRAINT "elo_changes_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stream_ratings" ADD CONSTRAINT "stream_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portfolio_settings" ADD CONSTRAINT "portfolio_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addon_purchases" ADD CONSTRAINT "addon_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_posts" ADD CONSTRAINT "pulse_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_comments" ADD CONSTRAINT "pulse_comments_post_id_pulse_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pulse_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_comments" ADD CONSTRAINT "pulse_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_likes" ADD CONSTRAINT "pulse_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_likes" ADD CONSTRAINT "pulse_likes_post_id_pulse_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pulse_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_saved" ADD CONSTRAINT "pulse_saved_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_saved" ADD CONSTRAINT "pulse_saved_post_id_pulse_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pulse_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_follows" ADD CONSTRAINT "pulse_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aura_interviews" ADD CONSTRAINT "aura_interviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aura_interviews" ADD CONSTRAINT "aura_interviews_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview_skill_events" ADD CONSTRAINT "interview_skill_events_interview_id_aura_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."aura_interviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview_skill_events" ADD CONSTRAINT "interview_skill_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aura_documents" ADD CONSTRAINT "aura_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aura_vouchers" ADD CONSTRAINT "aura_vouchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aura_vouchers" ADD CONSTRAINT "aura_vouchers_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personal_branding_profiles" ADD CONSTRAINT "personal_branding_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personal_branding_profiles" ADD CONSTRAINT "personal_branding_profiles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "career_assessments" ADD CONSTRAINT "career_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "career_assessments" ADD CONSTRAINT "career_assessments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_tasks" ADD CONSTRAINT "company_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ============================================================
-- INDEXES
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_user_id_idx" ON "profiles" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "career_goals_user_id_idx" ON "career_goals" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "roles_slug_idx" ON "roles" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_discipline_id_idx" ON "roles" ("discipline_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "skills_slug_idx" ON "skills" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_skills_role_skill_idx" ON "role_skills" ("role_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_skills_role_id_idx" ON "role_skills" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_skills_user_skill_idx" ON "user_skills" ("user_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_skills_user_id_idx" ON "user_skills" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skill_evidence_user_skill_idx" ON "skill_evidence" ("user_skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "missions_slug_idx" ON "missions" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_role_id_idx" ON "missions" ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_company_id_idx" ON "missions" ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mission_skills_mission_skill_idx" ON "mission_skills" ("mission_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_skills_mission_id_idx" ON "mission_skills" ("mission_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_mission_attempts_user_mission_idx" ON "user_mission_attempts" ("user_id","mission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_mission_attempts_user_id_idx" ON "user_mission_attempts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_mission_attempts_track_idx" ON "user_mission_attempts" ("track_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_user_id_idx" ON "submissions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_mission_id_idx" ON "submissions" ("mission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "submissions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_user_mission_idx" ON "submissions" ("user_id","mission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evaluations_submission_id_idx" ON "evaluations" ("submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "elo_records_user_role_idx" ON "elo_records" ("user_id","role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_records_elo_score_idx" ON "elo_records" ("elo_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_changes_user_id_idx" ON "elo_changes" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_changes_user_role_idx" ON "elo_changes" ("user_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stream_ratings_user_stream_idx" ON "stream_ratings" ("user_id","stream_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stream_ratings_user_id_idx" ON "stream_ratings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artifacts_user_id_idx" ON "artifacts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artifacts_type_idx" ON "artifacts" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_items_user_id_idx" ON "portfolio_items" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_items_visibility_idx" ON "portfolio_items" ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_settings_user_id_idx" ON "portfolio_settings" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "addon_purchases_user_id_idx" ON "addon_purchases" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_user_feature_idx" ON "usage_logs" ("user_id","feature","period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_posts_user_id_idx" ON "pulse_posts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_posts_domain_idx" ON "pulse_posts" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_posts_category_idx" ON "pulse_posts" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_posts_created_at_idx" ON "pulse_posts" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_comments_post_id_idx" ON "pulse_comments" ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_comments_user_id_idx" ON "pulse_comments" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pulse_likes_user_post_idx" ON "pulse_likes" ("user_id","post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_likes_post_id_idx" ON "pulse_likes" ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pulse_saved_user_post_idx" ON "pulse_saved" ("user_id","post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_saved_user_id_idx" ON "pulse_saved" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pulse_follows_user_target_idx" ON "pulse_follows" ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_follows_user_id_idx" ON "pulse_follows" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aura_interviews_user_id_idx" ON "aura_interviews" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aura_interviews_role_id_idx" ON "aura_interviews" ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "interview_skill_events_user_id_idx" ON "interview_skill_events" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "interview_skill_events_interview_id_idx" ON "interview_skill_events" ("interview_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aura_documents_user_id_idx" ON "aura_documents" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aura_documents_category_idx" ON "aura_documents" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aura_vouchers_user_id_idx" ON "aura_vouchers" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aura_vouchers_verification_idx" ON "aura_vouchers" ("verification_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "personal_branding_user_role_idx" ON "personal_branding_profiles" ("user_id","role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_branding_user_id_idx" ON "personal_branding_profiles" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_role_slug_idx" ON "career_assessment_questions" ("role_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_skill_slug_idx" ON "career_assessment_questions" ("skill_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "career_assessments_user_id_idx" ON "career_assessments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "career_assessments_role_id_idx" ON "career_assessments" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_apps_user_job_idx" ON "job_applications" ("user_id","job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_apps_user_id_idx" ON "job_applications" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "saved_jobs_user_job_idx" ON "saved_jobs" ("user_id","job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_jobs_user_id_idx" ON "saved_jobs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_tasks_user_id_idx" ON "company_tasks" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_tasks_status_idx" ON "company_tasks" ("status");
