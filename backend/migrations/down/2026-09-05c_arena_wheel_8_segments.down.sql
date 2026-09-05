-- Down migration for 2026-09-05c_arena_wheel_8_segments.sql
BEGIN;
update public.arena_config set value = '[5,7,9]'::jsonb, updated_at = now() where key = 'wheel_outcomes';
COMMIT;
