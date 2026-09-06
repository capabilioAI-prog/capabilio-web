-- 2026-09-06b_arena_eee_rlc_lab.sql
--
-- Adds "rlc_lab" (EEE Electrical Circuit / Measurement Lab) to the
-- simulation_type allowlist introduced in 2026-09-06_arena_simulation_types.sql.

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN ('waveform_lab', 'compression_lab', 'rlc_lab'));

COMMIT;
