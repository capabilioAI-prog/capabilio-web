-- Down migration for 2026-09-09b_arena_stream_worlds_simulation_types.sql —
-- reverts the CHECK constraint to the pre-Part-B allowlist. Will fail if
-- any of the 17 new simulation_type rows still exist (by design — the
-- established convention here is a simple reversal, not a bulletproof
-- rollback against intervening data).

BEGIN;

ALTER TABLE public.arena_challenges
  DROP CONSTRAINT IF EXISTS arena_challenges_simulation_type_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN (
    'waveform_lab', 'compression_lab', 'rlc_lab', 'beam_lab', 'operations_lab', 'network_ops_lab'
  ));

COMMIT;
