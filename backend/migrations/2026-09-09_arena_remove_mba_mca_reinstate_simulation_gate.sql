-- Arena Final Stream Reset: MBA and MCA are removed from the Arena Common
-- Challenges domain entirely (streamTaxonomy.js/generation.js/
-- challengeRepository.js/simulations registry no longer know about
-- either slug). This migration retires (status='retired', never deleted)
-- every arena_challenges row for mba/mca so no future allocation can ever
-- select them, while leaving the `streams` table rows and all unrelated
-- historical data (profiles, submissions) untouched — there were zero
-- profiles/allocations on either stream at the time of this migration.
--
-- It also re-retires the generic (simulation_type IS NULL) Common
-- Challenges for ece/eee/mechanical/civil that 2026-09-08's migration had
-- reactivated — the simulation-only hard gate for these four non-IT
-- streams is reinstated by this session's code changes, and the eligible
-- pool for each is backfilled separately (arenaGenerateSimVariants.mjs +
-- new curated seed entries) so the reinstated gate does not starve the
-- weekly wheel (5-12 missions).

BEGIN;

-- 'operations_lab' stays in the allowlist even though the registry no
-- longer knows it (MBA is removed): the retired MBA challenge row below
-- still carries simulation_type='operations_lab', and a CHECK constraint
-- applies to every row regardless of status — dropping the old value here
-- would violate the constraint against that historical row.
ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN (
    'waveform_lab', 'compression_lab', 'rlc_lab', 'beam_lab', 'operations_lab', 'network_ops_lab'
  ));

UPDATE public.arena_challenges c
SET status = 'retired', updated_at = now()
FROM public.streams s
WHERE c.stream_id = s.id
  AND s.slug IN ('mba', 'mca')
  AND c.status = 'active';

UPDATE public.arena_challenges c
SET status = 'retired', updated_at = now()
FROM public.streams s
WHERE c.stream_id = s.id
  AND s.slug IN ('ece', 'eee', 'mechanical', 'civil')
  AND c.simulation_type IS NULL
  AND c.status = 'active';

COMMIT;
