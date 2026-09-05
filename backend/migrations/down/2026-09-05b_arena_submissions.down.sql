-- Down migration for 2026-09-05b_arena_submissions.sql
BEGIN;
drop table if exists public.arena_submissions;
COMMIT;
