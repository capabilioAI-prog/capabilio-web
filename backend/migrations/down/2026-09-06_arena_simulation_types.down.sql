-- Down migration for 2026-09-06_arena_simulation_types.sql

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  DROP COLUMN IF EXISTS simulation_type;

COMMIT;
