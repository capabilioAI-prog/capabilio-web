-- 2026-09-08_arena_nonit_simulation_optional.sql
--
-- Reverses the 2026-09-07 "simulation-only for non-IT streams" hard rule
-- by product decision: simulation_type remains fully supported and used
-- (waveform_lab, compression_lab, rlc_lab, beam_lab, operations_lab all
-- stay as real, working content), but it is no longer REQUIRED — a
-- stream's Common Challenge pool can mix simulation and plain
-- structured-response/coding content again. Restores the 25 challenges
-- retired by that migration back to active; no schema change needed
-- (simulation_type was, and remains, nullable).

BEGIN;

UPDATE public.arena_challenges c
SET status = 'active', updated_at = now()
FROM public.streams s
WHERE c.stream_id = s.id
  AND s.slug IN ('ece', 'eee', 'mechanical', 'civil', 'mba')
  AND c.simulation_type IS NULL
  AND c.status = 'retired';

COMMIT;
