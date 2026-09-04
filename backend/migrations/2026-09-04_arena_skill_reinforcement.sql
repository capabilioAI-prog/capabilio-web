-- 2026-09-04_arena_skill_reinforcement.sql
--
-- Wires Arena task completion into the existing Skill Studio memory/
-- capability engine (memoryEngine.reinforce(), skill_graph_nodes,
-- memory_states) — see the "Arena evidence/proficiency fix" implementation
-- report for the full root-cause trace.
--
-- This migration is purely additive: one new table, no changes to any
-- existing table, column, index, or RLS policy.
--
-- ── Lifts the FIX 7 safety gate ─────────────────────────────────────────────
-- 2026-09-01_arena_capability_schema.sql (see its "FIX 7" comment, next to
-- idx_experiments_skill_graph_node) explicitly blocked wiring
-- memoryEngine.reinforce() to experiments/domain_missions.skill_graph_node_id
-- until (a) task-level competency granularity and (b) evidence weighting had
-- been reviewed. That review is this work:
--   (a) backend/scripts/backfillSkillCompetencyGranularity.mjs corrects the
--       4 currently-seeded Domain Role roles (data/dba/frontend/fullstack)
--       from one coarse per-role node to their real, pre-existing granular
--       skill_graph_nodes (SQL (Advanced)/SQL (Expert)/CSS-Tailwind/
--       Node.js-Express) — verified against each role's actual mission
--       content, not guessed. Every other domain_role has no granular
--       taxonomy today and is deliberately left on its coarse node — no new
--       taxonomy is invented here.
--   (b) backend/server/lib/skillStudio/memoryEngine.js's reinforce() gained
--       an optional, bounded, backward-compatible strengthMultiplier so a
--       100/100 Hard pass and a 61/100 Easy pass no longer move a skill by
--       the identical amount.
--
-- ── Idempotency ledger ───────────────────────────────────────────────────────
-- Neither existing table can safely answer "has this specific Arena
-- submission already contributed reinforcement?":
--   - task_generation_events has no submission_id/score/passed columns —
--     it records generation outcomes, not reinforcement events. Repurposing
--     it would conflate two different meanings on one table.
--   - memory_states is a per-(user, skill) CURRENT-STATE row, not an event
--     log — it has no way to tell two distinct submissions apart.
--   - arena_ingestion_records is UNIQUE on assessment_id from the deleted
--     Arena V2 schema (av2_assessments) — wrong grain for the live
--     domain_submissions/college_submissions tables.
-- So: one new, minimal, single-purpose table. Written by both the live
-- submission routes and the historical backfill script, so the two can never
-- double-count the same submission regardless of run order.
create table if not exists public.arena_skill_reinforcements (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  submission_table     text not null check (submission_table in ('domain_submissions', 'college_submissions')),
  submission_id        uuid not null,
  skill_graph_node_id  uuid not null references public.skill_graph_nodes(id),
  source               text not null default 'arena',
  correct              boolean not null,
  score                numeric,
  difficulty           text,
  multiplier           numeric,
  confidence_after     numeric,
  backfilled           boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (submission_table, submission_id)
);

create index if not exists idx_arena_skill_reinforcements_user
  on public.arena_skill_reinforcements(user_id);

comment on table public.arena_skill_reinforcements is
  'Idempotency ledger + audit trail for Arena-driven memoryEngine.reinforce() calls. One row per (submission_table, submission_id) — the unique constraint is the idempotency mechanism itself, used identically by the live submission routes (arenaDomainRole.js/arenaCollegeStream.js, via lib/skillStudio/arenaReinforcement.js) and by the one-time historical backfill (scripts/backfillArenaSkillReinforcement.mjs), so neither path can ever reinforce the same submission twice regardless of run order. Service-role only (RLS enabled, no policies) — same convention as memory_states/task_generation_events.';

alter table public.arena_skill_reinforcements enable row level security;
-- No policies — service-role only, matching memory_states/task_generation_events.
