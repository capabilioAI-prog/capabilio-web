-- 2026-09-05c_arena_wheel_8_segments.sql
--
-- Frontend redesign spec: wheel changes from 3 outcomes ([5,7,9]) to an
-- 8-segment wheel with exact outcomes [5,6,7,8,9,10,11,12]. Updates the
-- one row config.js's getWheelOutcomes() reads — no code depends on the
-- OLD values being present, this is a pure content update, idempotent to
-- re-run.

BEGIN;

update public.arena_config
set value = '[5,6,7,8,9,10,11,12]'::jsonb, updated_at = now()
where key = 'wheel_outcomes';

COMMIT;
