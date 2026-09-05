-- Down migration for 2026-09-05_arena_common_challenges.sql
--
-- Drops only what this migration created. Does NOT touch the pre-existing
-- `streams` table itself (only removes the 'it' row this migration added,
-- and only if it has no dependent rows) and does NOT drop
-- profiles.stream_id data destructively without an explicit decision —
-- see the guard below.

BEGIN;

drop table if exists public.arena_weekly_missions;
drop table if exists public.arena_weekly_allocations;
drop table if exists public.arena_challenges;
drop table if exists public.arena_config;

-- profiles.stream_id: dropping the column destroys the backfilled links.
-- Only drop it if you are certain no other feature has started depending
-- on it since this migration was applied.
alter table public.profiles drop column if exists stream_id;

delete from public.streams where slug = 'it';

COMMIT;
