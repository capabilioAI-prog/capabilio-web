-- 2026-07-29_skill_studio_v2_loop_closure.sql
--
-- Closes the Skill Studio V2 learning loop: Arena result ingestion tracking
-- + the content/admin review queue. Additive only — no existing table's
-- shape changes. Verified against the live schema (list_tables) before
-- writing this file: none of these four table names collide with anything
-- already in the database.
--
-- Admin gating reuses the EXISTING profiles.is_admin flag (already live) via
-- requireAdmin.js — no second admin/role model introduced, per the same
-- "don't invent a parallel model" rule that shaped the rest of Skill
-- Studio V2.

-- ── 1. Arena ingestion tracking ─────────────────────────────────────────────
-- One row per av2_assessments.id ever ingested by Skill Studio. The UNIQUE
-- constraint on assessment_id IS the idempotency guard — arenaIngestion.js
-- upserts with ignoreDuplicates and treats "no row returned" as "already
-- processed, skip" (replay-safe by construction, not by convention).
create table if not exists arena_ingestion_records (
  id                  uuid primary key default gen_random_uuid(),
  assessment_id       uuid not null,
  user_id             uuid not null references profiles(id) on delete cascade,
  skill_graph_node_id uuid references skill_graph_nodes(id) on delete set null,
  instance_id         uuid,
  submission_id       uuid,
  status              text not null default 'processing' check (status in ('processing','completed','failed')),
  retry_count         integer not null default 0,
  error               text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz,
  unique (assessment_id)
);
create index if not exists idx_arena_ingestion_user on arena_ingestion_records(user_id, created_at desc);
create index if not exists idx_arena_ingestion_status on arena_ingestion_records(status) where status <> 'completed';

alter table arena_ingestion_records enable row level security;
drop policy if exists "own arena ingestion records" on arena_ingestion_records;
create policy "own arena ingestion records" on arena_ingestion_records for select using (auth.uid() = user_id);

-- ── 2. Content ingestion sources (mentor/creator uploads) ───────────────────
create table if not exists content_sources (
  id              uuid primary key default gen_random_uuid(),
  uploaded_by     uuid references profiles(id) on delete set null,
  source_type     text not null check (source_type in ('pdf','doc','url','transcript','manual')),
  file_ref        text,
  extracted_text  text,
  status          text not null default 'pending' check (status in ('pending','parsed','failed')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_content_sources_status on content_sources(status);

alter table content_sources enable row level security;
drop policy if exists "admin reads content sources" on content_sources;
create policy "admin reads content sources" on content_sources for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);
drop policy if exists "own content sources" on content_sources;
create policy "own content sources" on content_sources for select using (auth.uid() = uploaded_by);

-- ── 3. Generation job queue (module/quiz/visual/explanation drafts) ────────
create table if not exists generation_jobs (
  id                 uuid primary key default gen_random_uuid(),
  job_type           text not null check (job_type in ('module','quiz','visual','explanation','flashcards','practice_task')),
  content_source_id  uuid references content_sources(id) on delete set null,
  module_id          uuid references modules(id) on delete set null,
  requested_by       uuid references profiles(id) on delete set null,
  input_ref          jsonb not null default '{}'::jsonb,
  output_ref         jsonb,
  status             text not null default 'queued' check (status in ('queued','running','pending_review','approved','rejected','failed')),
  quality_flags      jsonb not null default '[]'::jsonb,
  error              text,
  version            integer not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create index if not exists idx_generation_jobs_status on generation_jobs(status, created_at desc);
create index if not exists idx_generation_jobs_module on generation_jobs(module_id);

alter table generation_jobs enable row level security;
drop policy if exists "admin manages generation jobs" on generation_jobs;
create policy "admin manages generation jobs" on generation_jobs for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
) with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- ── 4. Review decisions — append-only audit trail / version history ────────
create table if not exists generation_job_reviews (
  id                  uuid primary key default gen_random_uuid(),
  generation_job_id   uuid not null references generation_jobs(id) on delete cascade,
  reviewer_id         uuid references profiles(id) on delete set null,
  decision            text not null check (decision in ('approved','rejected','edited','regenerate_requested')),
  notes               text,
  edited_output       jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists idx_generation_job_reviews_job on generation_job_reviews(generation_job_id, created_at);

alter table generation_job_reviews enable row level security;
drop policy if exists "admin reads generation job reviews" on generation_job_reviews;
create policy "admin reads generation job reviews" on generation_job_reviews for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);
drop policy if exists "admin inserts generation job reviews" on generation_job_reviews;
create policy "admin inserts generation job reviews" on generation_job_reviews for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- All writes to these four tables happen server-side via supabaseAdmin
-- (service role bypasses RLS), same discipline as every other Skill Studio
-- V2 table — the policies above exist so a client-side Supabase call is
-- safe by default, not because direct client writes are expected.
