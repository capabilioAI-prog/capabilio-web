-- Down migration for 2026-09-04_arena_skill_reinforcement.sql
--
-- Drops the reinforcement idempotency ledger. Not recommended once the
-- Arena evidence/proficiency fix is live — dropping this table removes the
-- only safeguard against double-counting a re-run of
-- scripts/backfillArenaSkillReinforcement.mjs. Included for rollback
-- completeness only.

begin;

drop table if exists public.arena_skill_reinforcements;

commit;
