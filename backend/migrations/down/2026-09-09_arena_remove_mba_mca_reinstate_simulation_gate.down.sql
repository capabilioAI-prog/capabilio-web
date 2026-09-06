-- Down migration for 2026-09-09_arena_remove_mba_mca_reinstate_simulation_gate.sql —
-- reactivates the mba/mca content and the generic ece/eee/mechanical/civil
-- content this migration retired. Reversible metadata flip only; no data
-- was ever deleted.

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN (
    'waveform_lab', 'compression_lab', 'rlc_lab', 'beam_lab', 'operations_lab', 'network_ops_lab'
  ));

UPDATE public.arena_challenges c
SET status = 'active', updated_at = now()
FROM public.streams s
WHERE c.stream_id = s.id
  AND s.slug IN ('mba', 'mca')
  AND c.status = 'retired';

UPDATE public.arena_challenges c
SET status = 'active', updated_at = now()
FROM public.streams s
WHERE c.stream_id = s.id
  AND s.slug IN ('ece', 'eee', 'mechanical', 'civil')
  AND c.simulation_type IS NULL
  AND c.status = 'retired';

COMMIT;
