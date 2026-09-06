-- 2026-09-07_arena_nonit_simulation_only.sql
--
-- Hard product rule: for non-IT streams (ece, eee, mechanical, civil,
-- mba), a Common Challenge is only eligible if it declares a real
-- simulation_type. This migration:
--   1. Expands the simulation_type allowlist to include the two new
--      vertical slices (beam_lab for Civil, operations_lab for MBA).
--   2. Retires (status = 'retired') every currently-active, non-IT
--      challenge that has no simulation_type — plain text/answer-box/
--      generic-worksheet content that is no longer eligible for
--      allocation to these streams. Retiring, not deleting, preserves
--      the audit trail for any past submissions/evidence referencing them.

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN (
    'waveform_lab', 'compression_lab', 'rlc_lab', 'beam_lab', 'operations_lab'
  ));

UPDATE public.arena_challenges c
SET status = 'retired', updated_at = now()
FROM public.streams s
WHERE c.stream_id = s.id
  AND s.slug IN ('ece', 'eee', 'mechanical', 'civil', 'mba')
  AND c.simulation_type IS NULL
  AND c.status = 'active';

COMMIT;
