-- Down migration for 2026-09-08_arena_nonit_simulation_optional.sql —
-- re-retires the same 25 non-simulation Common Challenges for ece, eee,
-- mechanical, civil, and mba.

BEGIN;

UPDATE public.arena_challenges c
SET status = 'retired', updated_at = now()
FROM public.streams s
WHERE c.stream_id = s.id
  AND s.slug IN ('ece', 'eee', 'mechanical', 'civil', 'mba')
  AND c.simulation_type IS NULL
  AND c.status = 'active';

COMMIT;
