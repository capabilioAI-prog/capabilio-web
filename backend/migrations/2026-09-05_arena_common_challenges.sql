-- 2026-09-05_arena_common_challenges.sql
--
-- New canonical Arena: Student Stream Common Challenges.
--
-- Replaces the retired College Stream / Domain Role / Capability Engine
-- Arena (see chore(arena): retire old Arena implementation, PR #27) with a
-- single, stream-first, week-first, server-authoritative system.
--
-- DESIGN NOTES (read before touching this schema):
--
-- 1. STREAM TAXONOMY: reuses the EXISTING `streams` table (created for the
--    old College Stream branch, never dropped) rather than inventing a
--    second stream system. It already has 10 of the 11 required rows
--    (cse, ai-ml, ai-ds, cyber-security, ece, eee, mechanical, civil, mba,
--    mca) — this migration adds the missing `it` row only.
--
-- 2. AUTHORITATIVE STUDENT STREAM: profiles has no reliable existing field
--    for this. `branch` (free-text-ish onboarding dropdown: IT/ECE/EEE/
--    Mechanical/Civil/IoT/Pharmacy/MBA/"Other") is a DIFFERENT, coarser
--    taxonomy — no CSE/AI-ML/AI-DS/Cyber/MCA option exists in it at all,
--    so it cannot be trusted as-is. `roleConfig.js`'s ROLE_REGISTRY
--    "stream" field (IT/ECE/EEE/Mechanical/Civil/Medical) is the OLD
--    professional-role taxonomy — explicitly out of scope per this task's
--    product-boundary rules (a professional role must not drive Common
--    Challenges). Per instructions §5 ("do not create a second competing
--    stream system unless the existing architecture genuinely has no
--    usable canonical representation") — this is exactly that case for
--    the profile->stream *link*, even though the stream *taxonomy* itself
--    is reused as-is. This migration adds ONE new column, profiles.
--    stream_id, as the missing link, and best-effort backfills it from
--    `branch` only where the mapping is unambiguous (CSE/IT/ECE/EEE/
--    Mechanical/Civil/MBA). Everything else (IoT, Pharmacy, "Other",
--    unset) is left NULL, honestly — never guessed. A student with no
--    resolved stream is asked to pick one, once, via a dedicated
--    self-service endpoint (see backend/server/lib/arena/streamResolver.js)
--    — this is a first-time profile-completion action, not a per-request
--    client-supplied parameter, and never used as the source of truth for
--    an existing allocation.
--
-- 3. CHALLENGE vs WEEKLY ASSIGNMENT: kept separate per instructions §11.
--    arena_challenges is the reusable assessment-definition bank.
--    arena_weekly_allocations is one student's one spin result for one
--    week. arena_weekly_missions is the concrete assigned instance of a
--    challenge within that allocation. A week has no dedicated table —
--    it's a deterministic (Monday 00:00 ARENA_TIMEZONE) DATE computed in
--    application code (backend/server/lib/arena/week.js) and stored
--    directly on each allocation row, avoiding a redundant lookup table.
--
-- 4. NO CLIENT WRITES: arena_weekly_allocations/arena_weekly_missions have
--    RLS enabled with SELECT-only policies scoped to the owning student.
--    There is no INSERT/UPDATE/DELETE policy for the `authenticated` role
--    on either table — every write happens server-side via the service
--    role (supabaseAdmin), which bypasses RLS. This is what makes
--    "student cannot reroll / alter points / alter stream / mark complete"
--    structurally true, not just application-logic-enforced.
--
-- 5. ATOMICITY: UNIQUE(student_id, week_start) on arena_weekly_allocations
--    is the concurrency guarantee — two simultaneous spin requests race a
--    plain INSERT, the database rejects the loser with a unique-violation,
--    and the loser's request handler re-reads and returns the winner's row
--    (backend/server/lib/arena/spin.js). No advisory lock or stored
--    procedure needed for this shape of race.

BEGIN;

-- ── 1. Stream taxonomy: add the one missing row ─────────────────────────────
insert into public.streams (name, slug)
select 'Information Technology', 'it'
where not exists (select 1 from public.streams where slug = 'it');

-- ── 2. Authoritative student stream link ────────────────────────────────────
alter table public.profiles add column if not exists stream_id uuid references public.streams(id);

comment on column public.profiles.stream_id is
  'Authoritative academic stream for Arena Common Challenges and any other stream-scoped feature. Server-resolved/self-service-set-once only — never trust a stream value from a request body/query. NULL means the student has not yet selected a stream.';

-- Best-effort backfill from the old, coarser `branch` field. Deliberately
-- narrow: only maps values with an unambiguous 1:1 correspondence. Every
-- other branch value (IoT, Pharmacy, "Other", NULL) is left NULL — never
-- guessed at the value of an academic stream.
update public.profiles p
set stream_id = s.id
from public.streams s
where p.stream_id is null
  and p.branch is not null
  and lower(p.branch) = case lower(s.slug)
    when 'cse' then 'cse'
    when 'it' then 'it'
    when 'ece' then 'ece'
    when 'eee' then 'eee'
    when 'mechanical' then 'mechanical'
    when 'civil' then 'civil'
    when 'mba' then 'mba'
    else null
  end;

-- ── 3. Challenge bank (reusable assessment definitions) ─────────────────────
create table if not exists public.arena_challenges (
  id                      uuid primary key default gen_random_uuid(),
  stream_id               uuid not null references public.streams(id),
  competency_area         text not null,
  skill                   text not null,
  skill_graph_node_id     uuid references public.skill_graph_nodes(id),
  challenge_type          text not null check (challenge_type in (
                            'concept_application','scenario_analysis','calculation','diagnosis',
                            'data_interpretation','debugging','implementation','decision_making',
                            'design_choice','investigation','simulation','case_analysis'
                          )),
  title                   text not null,
  scenario                text not null,
  mission                 text not null,
  learning_objective      text,
  difficulty              text not null check (difficulty in ('easy','medium')),
  estimated_minutes       int not null check (estimated_minutes > 0 and estimated_minutes <= 30),
  instructions            text not null,
  inputs                  jsonb not null default '{}'::jsonb,
  expected_output         jsonb not null default '{}'::jsonb,
  workstation_type        text not null check (workstation_type in (
                            'coding','sql','structured_response','calculation','decision','log_investigation'
                          )),
  verification_type       text not null check (verification_type in (
                            'test_cases','sql_result','numeric_tolerance','rule_based','rubric'
                          )),
  verification_definition jsonb not null,
  points                  int not null default 10 check (points > 0),
  explanation             text,
  tags                    text[] not null default '{}',
  content_fingerprint     text not null,
  source                  text not null default 'seed' check (source in ('seed','ai_generated')),
  status                  text not null default 'active' check (status in ('active','retired')),
  version                 int not null default 1,
  metadata                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint arena_challenges_fingerprint_key unique (stream_id, content_fingerprint)
);

create index if not exists idx_arena_challenges_stream_active
  on public.arena_challenges (stream_id, status) where status = 'active';
create index if not exists idx_arena_challenges_stream_type
  on public.arena_challenges (stream_id, challenge_type);

alter table public.arena_challenges enable row level security;
drop policy if exists arena_challenges_read_authenticated on public.arena_challenges;
create policy arena_challenges_read_authenticated on public.arena_challenges
  for select to authenticated using (status = 'active');
-- No insert/update/delete policy for authenticated — content is authored
-- and validated server-side only (seed script or the generation pipeline),
-- both using the service role, which bypasses RLS entirely.

-- ── 4. Weekly allocation (one spin result per student per week) ─────────────
create table if not exists public.arena_weekly_allocations (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references auth.users(id) on delete cascade,
  week_start     date not null,
  stream_id      uuid not null references public.streams(id),
  spin_result    int not null check (spin_result > 0),
  spin_at        timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint arena_weekly_allocations_student_week_key unique (student_id, week_start)
);

create index if not exists idx_arena_weekly_allocations_student
  on public.arena_weekly_allocations (student_id, week_start desc);

alter table public.arena_weekly_allocations enable row level security;
drop policy if exists arena_weekly_allocations_own_read on public.arena_weekly_allocations;
create policy arena_weekly_allocations_own_read on public.arena_weekly_allocations
  for select to authenticated using (student_id = auth.uid());
-- No insert/update/delete policy for authenticated — spin allocation is
-- created exclusively by backend/server/lib/arena/spin.js via the service
-- role. This is what makes reroll-via-API-manipulation structurally
-- impossible, not just something the route handler happens to refuse.

-- ── 5. Weekly missions (the concrete assigned challenge instances) ──────────
create table if not exists public.arena_weekly_missions (
  id                  uuid primary key default gen_random_uuid(),
  allocation_id       uuid not null references public.arena_weekly_allocations(id) on delete cascade,
  challenge_id        uuid not null references public.arena_challenges(id),
  position            int not null check (position > 0),
  status              text not null default 'assigned' check (status in ('assigned','in_progress','completed','failed')),
  started_at          timestamptz,
  submitted_at        timestamptz,
  completed_at        timestamptz,
  score               numeric,
  points_awarded      int not null default 0,
  verification_status text not null default 'pending' check (verification_status in ('pending','passed','failed')),
  evidence            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint arena_weekly_missions_allocation_challenge_key unique (allocation_id, challenge_id),
  constraint arena_weekly_missions_allocation_position_key unique (allocation_id, position)
);

create index if not exists idx_arena_weekly_missions_allocation
  on public.arena_weekly_missions (allocation_id, position);

alter table public.arena_weekly_missions enable row level security;
drop policy if exists arena_weekly_missions_own_read on public.arena_weekly_missions;
create policy arena_weekly_missions_own_read on public.arena_weekly_missions
  for select to authenticated using (
    allocation_id in (select id from public.arena_weekly_allocations where student_id = auth.uid())
  );
-- No insert/update/delete policy for authenticated — mission status,
-- score, points, and verification_status are exclusively backend-written
-- (submission handler, service role) after real verification runs.

-- ── 6. Small server-only config (wheel outcomes etc.) ────────────────────────
create table if not exists public.arena_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into public.arena_config (key, value)
values ('wheel_outcomes', '[5, 7, 9]'::jsonb)
on conflict (key) do nothing;

alter table public.arena_config enable row level security;
-- Deliberately NO policies at all for `authenticated`/`anon` — this table
-- is read only by the backend via the service role. The frontend never
-- needs to read wheel outcomes directly; the spin response already
-- carries the authoritative chosen count.

COMMIT;
