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
 CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'student', 'professional', 'enterprise');
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
CREATE TABLE IF NOT EXISTS "career_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"department" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"is_current" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "role_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"is_core" boolean DEFAULT false NOT NULL
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
CREATE TABLE IF NOT EXISTS "mission_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
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
	"starter_files" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"test_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "missions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluation_criteria_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"criterion_id" text NOT NULL,
	"criterion_name" text NOT NULL,
	"passed" boolean NOT NULL,
	"score" real NOT NULL,
	"evidence" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS "elo_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"elo_score" integer DEFAULT 1000 NOT NULL,
	"total_missions" integer DEFAULT 0 NOT NULL,
	"passed_missions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
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
DO $$ BEGIN
 ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "career_history" ADD CONSTRAINT "career_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_user_skill_id_user_skills_id_fk" FOREIGN KEY ("user_skill_id") REFERENCES "public"."user_skills"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "evaluation_criteria_results" ADD CONSTRAINT "evaluation_criteria_results_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "career_goals_user_id_idx" ON "career_goals" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "career_history_user_id_idx" ON "career_history" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_user_id_idx" ON "profiles" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "roles_slug_idx" ON "roles" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roles_discipline_id_idx" ON "roles" ("discipline_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_skills_role_skill_idx" ON "role_skills" ("role_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "role_skills_role_id_idx" ON "role_skills" ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skill_evidence_user_skill_idx" ON "skill_evidence" ("user_skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "skills_slug_idx" ON "skills" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_skills_user_skill_idx" ON "user_skills" ("user_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_skills_user_id_idx" ON "user_skills" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mission_skills_mission_skill_idx" ON "mission_skills" ("mission_id","skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mission_skills_mission_id_idx" ON "mission_skills" ("mission_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "missions_slug_idx" ON "missions" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_role_id_idx" ON "missions" ("role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_status_idx" ON "missions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "missions_difficulty_idx" ON "missions" ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eval_criteria_evaluation_id_idx" ON "evaluation_criteria_results" ("evaluation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evaluations_submission_id_idx" ON "evaluations" ("submission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_user_id_idx" ON "submissions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_mission_id_idx" ON "submissions" ("mission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_status_idx" ON "submissions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_user_mission_idx" ON "submissions" ("user_id","mission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_changes_user_id_idx" ON "elo_changes" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_changes_user_role_idx" ON "elo_changes" ("user_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "elo_records_user_role_idx" ON "elo_records" ("user_id","role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "elo_records_elo_score_idx" ON "elo_records" ("elo_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artifacts_user_id_idx" ON "artifacts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artifacts_type_idx" ON "artifacts" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_items_user_id_idx" ON "portfolio_items" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_items_visibility_idx" ON "portfolio_items" ("visibility");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_user_id_idx" ON "user_achievements" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_logs_user_feature_idx" ON "usage_logs" ("user_id","feature","period");