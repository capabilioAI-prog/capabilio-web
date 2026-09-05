-- 2026-09-05b_arena_submissions.sql
--
-- Gap found on review of 2026-09-05_arena_common_challenges.sql: that
-- migration preserves only the LATEST submission's evidence directly on
-- arena_weekly_missions (submission.js overwrites the `evidence` jsonb
-- column on every attempt). A student who fails twice, then passes, loses
-- the record of the two failed attempts — the mission row can only ever
-- show "what happened last," not "what happened."
--
-- arena_submissions is an append-only log: one row per submit call,
-- regardless of pass/fail, immutable once written (no UPDATE path exists
-- anywhere in application code — submission.js only ever INSERTs here).
-- arena_weekly_missions is unchanged and remains the authoritative
-- CURRENT-STATE summary (status/score/points_awarded/verification_status)
-- that the planner/allocation/leaderboard/history code already reads —
-- this migration is additive, nothing that already reads
-- arena_weekly_missions needs to change.

BEGIN;

create table if not exists public.arena_submissions (
  id                  uuid primary key default gen_random_uuid(),
  mission_id          uuid not null references public.arena_weekly_missions(id) on delete cascade,
  student_id          uuid not null references auth.users(id) on delete cascade,
  response            jsonb not null,
  verification_result jsonb not null,
  passed              boolean not null,
  score               numeric,
  points_awarded      int not null default 0,
  submitted_at        timestamptz not null default now()
);

create index if not exists idx_arena_submissions_mission
  on public.arena_submissions (mission_id, submitted_at desc);
create index if not exists idx_arena_submissions_student
  on public.arena_submissions (student_id, submitted_at desc);

alter table public.arena_submissions enable row level security;
drop policy if exists arena_submissions_own_read on public.arena_submissions;
create policy arena_submissions_own_read on public.arena_submissions
  for select to authenticated using (student_id = auth.uid());
-- No insert/update/delete policy for authenticated — every row is written
-- exclusively by submission.js via the service role, immediately after
-- real verification runs. student_id is stamped from the authenticated
-- caller server-side, never trusted from the request body.

COMMIT;
