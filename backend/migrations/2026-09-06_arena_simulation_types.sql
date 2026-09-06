-- 2026-09-06_arena_simulation_types.sql
--
-- Arena "simulated college stream missions" architecture: a challenge can
-- now declare a `simulation_type`, an orthogonal dimension from
-- workstation_type that names which micro-lab renders above the response
-- panel (see backend/server/lib/arena/simulations/registry.js). Nullable —
-- coding/SQL/plain-decision challenges have no simulation and keep
-- rendering exactly as before.

BEGIN;

ALTER TABLE public.arena_challenges
  ADD COLUMN IF NOT EXISTS simulation_type text;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT arena_challenges_simulation_type_check
  CHECK (simulation_type IS NULL OR simulation_type IN ('waveform_lab', 'compression_lab'));

COMMIT;
