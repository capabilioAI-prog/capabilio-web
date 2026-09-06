-- Down migration for 2026-09-06b_arena_eee_rlc_lab.sql — restores the
-- constraint to the prior (waveform_lab, compression_lab)-only allowlist.

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN ('waveform_lab', 'compression_lab'));

COMMIT;
