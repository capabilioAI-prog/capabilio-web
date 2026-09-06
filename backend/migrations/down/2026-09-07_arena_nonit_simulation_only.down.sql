-- Down migration for 2026-09-07_arena_nonit_simulation_only.sql
--
-- Restores the constraint to the prior 3-type allowlist. Does NOT
-- reactivate retired challenges — that status change was a genuine
-- content decision (spec: "retire from Non-IT Common Challenges"), not
-- a side effect to silently undo. Reactivate specific rows manually if
-- ever needed: UPDATE arena_challenges SET status='active' WHERE id IN (...).

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN ('waveform_lab', 'compression_lab', 'rlc_lab'));

COMMIT;
