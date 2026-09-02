-- 2026-09-01_arena_capability_baseline_snapshot.sql
--
-- Arena Capability Engine, Phase 1 — baseline snapshot.
--
-- PURPOSE: these 12 tables exist live in production (project `capabilio`,
-- eybchcqwbizjmzyrviri) and DO have real, tracked history in Supabase's own
-- `supabase_migrations.schema_migrations` table (133 rows, confirmed via
-- direct query on 2026-09-01) — they were applied directly against the
-- database and Supabase tracks them fine. What was actually missing is a
-- matching .sql file in THIS git repository, so `backend/migrations/` had no
-- record of them. This file closes that repo-history gap.
--
-- Every statement below is `create table if not exists` — a no-op against
-- the live database, which already has every one of these tables in exactly
-- this shape (verified via direct information_schema/pg_constraint/pg_indexes
-- queries on 2026-09-01, not reconstructed from repo code or assumed from
-- prior audit notes). Nothing here alters, drops, or renames anything.
--
-- NO down migration is provided for this file: these tables hold real,
-- populated production data today (80 experiments, 162 domain_missions,
-- college/domain submissions, 28 arena_history rows). A "rollback" that
-- dropped them would be destructive to live student data, which the
-- project's safety rules explicitly forbid — this file's only job is to
-- give already-existing tables a repo-committed record, so there is nothing
-- for a rollback to safely undo.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- WHAT THIS FILE IS, AND WHAT IT IS NOT (added after independent review,
-- 2026-09-01 — see Fix 2 of the Phase 1 adversarial migration review):
--
--   THIS FILE IS:   a repository snapshot of table shapes that already exist
--                   in the live database. Its entire purpose is to give
--                   already-existing objects a committed record in THIS git
--                   repo. Applying it against the current live database is a
--                   verified no-op (every statement is `create table if not
--                   exists` against tables that already exist in this shape).
--
--   THIS FILE IS NOT a migration capable of provisioning a fresh/new
--                   database (a clean staging project, a local dev stack, a
--                   disaster-recovery restore) by itself. Confirmed gaps if
--                   used that way:
--                     1. Row Level Security is NOT reproduced. All 12 tables
--                        below have `relrowsecurity = true` and real policies
--                        live (13 policies total, e.g. `experiments_public_
--                        select`, `college_submissions_self_select`) — this
--                        file contains zero ENABLE ROW LEVEL SECURITY /
--                        CREATE POLICY statements. On a fresh database, this
--                        project's own default ACL grants `anon`/
--                        `authenticated` full CRUD on any new table with no
--                        RLS — running this file there would leave all 12
--                        tables, including student submission answers,
--                        completely unauthenticated-readable/writable.
--                     2. GRANTs are not reproduced.
--                     3. `arena_history.user_id` (line ~230) references
--                        `profiles(id)` — the `profiles` table is never
--                        created here or anywhere in this migration set. A
--                        fresh-database run fails at that statement unless
--                        `profiles` already exists from elsewhere.
--                     4. Table/column COMMENT metadata is only partially
--                        reproduced (see the `comment on table` statements
--                        added at the end of this file, Fix 9) — sequences,
--                        enum types, triggers, and functions are NOT present
--                        on any of these 12 tables today (confirmed empty),
--                        so there is nothing else missing on that front.
--
--   Do not repurpose this file as a fresh-environment provisioning migration
--   without separately designing and reviewing the RLS/policy/grant layer —
--   that is a different, larger piece of work than "give existing objects a
--   repo record," and conflating the two was flagged explicitly as a defect
--   in the original version of this file.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Deliberately NOT included here — already committed in
-- backend/migrations/2026-07-29_skill_studio_v2.sql /
-- 2026-07-29_skill_studio_v2_loop_closure.sql, confirmed by reading those
-- files directly:
--   skill_graph_nodes, skill_graph_edges, memory_states, arena_handoffs,
--   arena_ingestion_records
--
-- Confirmed NOT to exist in the live schema at all (not just uncommitted):
--   arena_submissions, arena_leaderboard, problems (a same-named table does
--   exist here but is written to by nothing in this codebase — see Phase A
--   audit; the actively-referenced legacy `problems` table lives on a
--   completely separate Supabase project per scripts/generate_arena_problems.py)
--
-- For traceability, the relevant tracked migration versions/names recovered
-- from supabase_migrations.schema_migrations (chronological, includes
-- superseded V1/V2 history for the historical record):
--   20260717200042 arena_v2_milestone1_schema            (superseded, dropped)
--   20260717200056 arena_v2_milestone2_admin_flag        (superseded, dropped)
--   20260722070144 college_path_foundation
--   20260728185917 create_domain_context_manifests
--   20260729065241 create_skill_graph_table              (already in repo, see above)
--   20260816053227 drop_arena_v1_and_v2_tables            (the V1/V2 deletion)
--   20260816061733 college_stream_schema                  (streams/semesters/subjects/units/experiments)
--   20260816061800 college_stream_seed_cse
--   20260816065418 domain_role_schema                     (domain_roles/panel_types/domain_missions)
--   20260816065627 domain_role_seed_data_analyst
--   20260816070756 domain_missions_add_workplace_context
--   20260816072356 domain_roles_seed_all_registry_roles
--   20260816074029 domain_missions_difficulty_timing_and_elo
--   20260816092010 experiments_difficulty_timing_and_elo
--   20260816095356 domain_submissions_add_result_detail
--   20260816100726 college_stream_shared_subjects
--   20260816101609 arena_submissions_ai_feedback          (table since removed — see above)
--   20260816110916 seed_stream_categories
--   20260816112524 college_submissions_execution_output
--   20260816121302 arena_elo_feeds_profile_rating
--   20260816153127 create_arena_history_table
--   20260817065053 add_domain_missions_source
--   20260817084313 fix_domain_submissions_execution_time_ms_type
--   20260819173711 domain_missions_add_rubric_reference_solution
--   20260826154402 protect_arena_submission_tables

-- ── College Stream curriculum tree ──────────────────────────────────────────

create table if not exists streams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  created_at  timestamptz default now(),
  constraint streams_slug_key unique (slug)
);

create table if not exists semesters (
  id          uuid primary key default gen_random_uuid(),
  stream_id   uuid references streams(id) on delete cascade,
  number      integer not null,
  created_at  timestamptz default now(),
  constraint semesters_stream_id_number_key unique (stream_id, number)
);
create index if not exists idx_semesters_stream on semesters(stream_id);

create table if not exists subjects (
  id           uuid primary key default gen_random_uuid(),
  semester_id  uuid references semesters(id) on delete cascade,
  name         text not null,
  slug         text not null,
  created_at   timestamptz default now(),
  constraint subjects_semester_id_slug_key unique (semester_id, slug)
);
create index if not exists idx_subjects_semester on subjects(semester_id);

create table if not exists units (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid references subjects(id) on delete cascade,
  title       text not null,
  sequence    integer not null,
  created_at  timestamptz default now()
);
create index if not exists idx_units_subject on units(subject_id);

create table if not exists experiments (
  id                   uuid primary key default gen_random_uuid(),
  unit_id              uuid references units(id) on delete cascade,
  title                text not null,
  difficulty           text not null check (difficulty in ('easy','medium','hard')),
  prompt               text not null,
  rubric               jsonb not null,
  reference_solution   text,
  elo_reward           integer not null,
  created_at           timestamptz default now(),
  time_limit_minutes   integer,
  tier                 text check (tier is null or tier in ('foundation','core','applied','industry','master')),
  challenge_type       text check (challenge_type is null or challenge_type in
                          ('coding','debug','case_study','simulation','design','data_analysis',
                           'optimization','scenario_response','report_writing','viva')),
  category             text,
  estimated_minutes    integer
);
create index if not exists idx_experiments_unit on experiments(unit_id);
create index if not exists idx_experiments_tier on experiments(tier);

-- ── Domain Role catalog ──────────────────────────────────────────────────────

create table if not exists panel_types (
  id          text primary key,
  label       text not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists domain_roles (
  id                  text primary key,
  label               text not null,
  primary_panel_type  text references panel_types(id),
  created_at          timestamptz default now()
);

create table if not exists evaluation_axes (
  id              uuid primary key default gen_random_uuid(),
  domain_role_id  text not null references domain_roles(id) on delete cascade,
  key             text not null,
  label           text not null,
  weight          numeric not null,
  created_at      timestamptz default now()
);

create table if not exists domain_missions (
  id                    uuid primary key default gen_random_uuid(),
  domain_role_id        text not null references domain_roles(id) on delete cascade,
  panel_type            text not null references panel_types(id),
  title                 text not null,
  prompt                text not null,
  difficulty            text not null check (difficulty in ('easy','medium','hard')),
  elo_reward            integer not null,
  dataset               jsonb,
  expected_result       jsonb,
  match_mode            text check (match_mode is null or match_mode in ('unordered_rows','ordered_rows')),
  created_at            timestamptz default now(),
  company               text,
  manager               text,
  sprint                text,
  estimated_minutes     integer,
  time_limit_minutes    integer,
  source                text not null check (source in ('seeded','ai_generated')),
  rubric                jsonb,
  reference_solution    text,
  constraint domain_missions_has_grading_shape check (
    ((dataset is not null) and (expected_result is not null) and (match_mode is not null))
    or ((rubric is not null) and (reference_solution is not null))
  )
);
create index if not exists idx_domain_missions_role on domain_missions(domain_role_id);

-- ── Submissions ──────────────────────────────────────────────────────────────

create table if not exists college_submissions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade,
  experiment_id      uuid references experiments(id),
  answer             jsonb not null,
  score              numeric,
  passed             boolean,
  elo_delta          integer,
  submitted_at       timestamptz default now(),
  ai_feedback        text,
  execution_output   jsonb
);
create index if not exists idx_college_submissions_user on college_submissions(user_id);
create index if not exists idx_college_submissions_experiment on college_submissions(experiment_id);
create unique index if not exists uq_college_submissions_one_pass_per_user
  on college_submissions(user_id, experiment_id) where (passed = true);

create table if not exists domain_submissions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  mission_id          uuid not null references domain_missions(id) on delete cascade,
  sql_text            text not null,
  passed              boolean not null,
  score               integer not null,
  elo_delta           integer not null,
  error               text,
  created_at          timestamptz default now(),
  result_json         jsonb,
  checklist_json      jsonb,
  insight             text,
  execution_time_ms   numeric,
  ai_feedback         text
);
create index if not exists idx_domain_submissions_user on domain_submissions(user_id);
create index if not exists idx_domain_submissions_mission on domain_submissions(mission_id);
create unique index if not exists uq_domain_submissions_one_pass_per_user
  on domain_submissions(user_id, mission_id) where (passed = true);

-- ── Cross-branch history ledger ──────────────────────────────────────────────

create table if not exists arena_history (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  task_id               text,
  title                 text not null default 'Arena Challenge',
  domain                text not null default 'swe',
  skill_id              text,
  skill_name            text,
  skill_category        text,
  workstation_type      text,
  difficulty            text default 'Medium',
  scenario              text,
  objective             text,
  expected_output       text,
  user_answer           text,
  feedback              text,
  score                 integer default 0,
  elo_delta             integer default 0,
  type                  text default 'dsa',
  challenge_type        text,
  summary               text,
  visible_in_portfolio  boolean default true,
  visible_in_aura       boolean default true,
  completed_at          timestamptz default now()
);
create index if not exists idx_arena_history_user on arena_history(user_id, completed_at desc);
create index if not exists idx_arena_history_task on arena_history(task_id);
create index if not exists idx_arena_history_domain on arena_history(domain);
create index if not exists idx_arena_history_type on arena_history(type);
create index if not exists idx_arena_history_portfolio on arena_history(user_id, visible_in_portfolio);

-- ── Fix 9 (optional schema fidelity) — reproduce live table comments ────────
-- Exact text re-queried live via obj_description() on 2026-09-01, not
-- reworded. Documentation only — no functional effect either way.

comment on table arena_history is
  'Denormalized Arena event ledger (Aura ELO history timeline, Portfolio task lists). No client INSERT/UPDATE policy — every row is written server-side via supabaseAdmin after score/elo_delta are computed by a rule-based evaluator (arenaCollegeStream.js, arenaDomainRole.js). Clients may only SELECT their own rows or rows with visible_in_portfolio=true.';

comment on table college_submissions is
  'College Stream (Academic) submission results. No client INSERT/UPDATE policy — every row is written server-side via supabaseAdmin from backend/server/routes/arenaCollegeStream.js after the deterministic evaluator (lib/collegeStream/evaluator.js / pythonSandbox.js) has already decided score/passed/elo_delta. Clients may only SELECT their own rows.';

comment on table domain_submissions is
  'Domain Role submission results. No client INSERT/UPDATE policy — every row is written server-side via supabaseAdmin from backend/server/routes/arenaDomainRole.js after executeMission()/evaluateMission() (lib/domainRole/sqlSandbox.js) have already decided score/passed/elo_delta/result_json. Clients may only SELECT their own rows.';
