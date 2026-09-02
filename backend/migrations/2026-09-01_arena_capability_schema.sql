-- 2026-09-01_arena_capability_schema.sql
--
-- Arena Capability Engine, Phase 1 — new additive schema.
-- Approved architecture: see the "Arena Capability Engine" design report
-- (Phase B/C, this session). Every change below is additive: new nullable
-- columns, new tables, or a WIDENED check constraint. Nothing existing is
-- dropped, renamed, narrowed, or has its type changed. Verified against the
-- live schema (Supabase MCP, project capabilio) immediately before writing
-- this file — not assumed from the design report or prior audit notes.
--
-- Confirmed live before writing this file:
--   * skill_graph_nodes.node_type_check currently allows only
--     ('skill','concept') — 59 rows, all 'skill', zero 'concept' rows.
--   * skill_graph_edges currently has ZERO rows — widening its edge_type
--     check has no existing data to reconcile.
--   * experiments/domain_missions have no skill_graph_node_id or
--     difficulty_score column today; difficulty is the existing
--     text enum ('easy'/'medium'/'hard'), left untouched.
--   * domain_missions already has `source text not null check
--     (source in ('seeded','ai_generated'))` — 159/162 rows already
--     'ai_generated'. experiments has no equivalent column; mirrored below.
--   * memory_states.skill_graph_node_id is NOT NULL and FKs to
--     skill_graph_nodes(id) on delete cascade — the new columns here match
--     that exact target type (uuid -> skill_graph_nodes.id), nullable,
--     since not every existing task is tagged yet (see backfill script).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- FIXES APPLIED AFTER INDEPENDENT ADVERSARIAL REVIEW (2026-09-01):
--
--   Fix 1 (BLOCKER): domain_role_competencies, task_generation_events, and
--   task_content_fingerprints originally shipped with no Row Level Security.
--   Confirmed live: this project's default ACL grants `anon`/`authenticated`
--   full CRUD (arwdDxtm) on any new `public` table with no RLS — every
--   sibling table (experiments, domain_missions, skill_graph_nodes, etc.) has
--   RLS enabled specifically to close that hole, and these three did not.
--   Fixed below: RLS enabled, default-deny, zero client policies. Verified
--   safe for the backend: backend/server/lib/supabase.js's supabaseAdmin
--   authenticates with SUPABASE_SERVICE_KEY (the service_role key), which
--   bypasses RLS entirely per Postgres/PostgREST's own role model — so
--   backend access to these tables is completely unaffected. Confirmed no
--   frontend/browser code references any of these three tables (they are net
--   new in this migration) — there is no existing client access path that
--   default-deny could break.
--
--   Fix 4: task_generation_events gained an `outcome` column (not-null, no
--   default) so "served an existing verified task" vs. "had to generate one"
--   is a first-class, queryable fact rather than an inferred NULL-field
--   convention. The application must state it explicitly on every insert.
--   Widened (2026-09-02, before first apply) to 5 values instead of 2, so the
--   distinction the product actually needs is representable from day one
--   instead of requiring a later CHECK-widening migration once code already
--   depends on the narrower set: `served_existing` (Phase 2, this pass — an
--   existing verified task was ranked and served), `generated`/`regenerated`/
--   `fallback` (Phase 3 — a clean first-shot generation, a replacement after
--   a rejected attempt, and a degraded next-best-available serve, are three
--   different signals a selection-engine consumer needs, not one value doing
--   triple duty), and `historical_backfill` (this table's own backfill
--   script — see backfillHistoricalTaskProvenance.mjs — never overloads
--   `served_existing` for pre-engine content, so a historical row can never
--   be misread as something a live student was actually served today).
--
--   Fix 5: task_content_fingerprints' comment corrected — its
--   unique(task_type, task_id) is a one-record-per-task provenance
--   constraint, NOT a cross-task duplicate-content guarantee. See the
--   comment above that table for the actual dedup mechanism.
--
--   Fix 6: task_id on both new tables is intentionally FK-less (polymorphic
--   across experiments/domain_missions) and intentionally NOT cleaned up
--   when a task is deleted. See the comment above task_generation_events for
--   the analysis and decision (Option B — immutable historical record).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── A. Tag existing tasks with a competency (nullable — no backfill required to ship) ──

alter table experiments
  add column if not exists skill_graph_node_id uuid references skill_graph_nodes(id),
  add column if not exists difficulty_score numeric,
  add column if not exists source text not null default 'seeded' check (source in ('seeded','ai_generated'));

alter table domain_missions
  add column if not exists skill_graph_node_id uuid references skill_graph_nodes(id),
  add column if not exists difficulty_score numeric;

create index if not exists idx_experiments_skill_graph_node on experiments(skill_graph_node_id);
create index if not exists idx_domain_missions_skill_graph_node on domain_missions(skill_graph_node_id);

-- ── FIX 7 — competency granularity safety gate (do not remove this note) ───
-- The Phase 1 backfill script (backfillTaskCompetencies.mjs) that populates
-- skill_graph_node_id above is DELIBERATELY coarse: one competency node per
-- College Stream `stream` and per Domain Role `domain_role`, not a real
-- per-topic taxonomy. That is fine as inert groundwork. It stops being fine
-- the moment something calls memoryEngine.reinforce() using one of these
-- coarse node ids — reinforce() is already live and called from 4 sites
-- elsewhere in this codebase (arenaIngestion.js, arenaBridge.js,
-- quizEngine.js, skillStudioV2.js), so this is not a hypothetical risk.
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ DO NOT wire memoryEngine.reinforce() to experiments/domain_missions'    │
-- │ skill_graph_node_id (i.e. do not implement Phase 5) until task-level    │
-- │ competency granularity and weighting have been reviewed. A wrong answer │
-- │ in one subject would otherwise pollute the mastery signal for every     │
-- │ other subject sharing the same coarse stream/role node.                 │
-- └─────────────────────────────────────────────────────────────────────────┘

-- ── B. Widen the skill graph's taxonomy to carry domain/competency levels ──
-- Additive: existing rows are all 'skill' or unused 'concept', both stay
-- valid. Only the allowed *set* grows.

alter table skill_graph_nodes drop constraint if exists skill_graph_nodes_node_type_check;
alter table skill_graph_nodes add constraint skill_graph_nodes_node_type_check
  check (node_type in ('skill','concept','domain','competency'));

alter table skill_graph_edges drop constraint if exists skill_graph_edges_edge_type_check;
alter table skill_graph_edges add constraint skill_graph_edges_edge_type_check
  check (edge_type in (
    'PREREQUISITE_OF','REQUIRES','REINFORCES','VALIDATES','PRODUCES_EVIDENCE',
    'UNLOCKS','PREPARES_FOR','RELATED_TO','WEAKENS','RECOVERS','RECOMMENDS_NEXT',
    'PART_OF'
  ));

-- ── C. Role -> competency weighting (formalizes what roleConfig.js/roleGapSeeder.js ──
-- currently do via a hardcoded frontend array + fuzzy string match; additive,
-- doesn't touch that existing path)

create table if not exists domain_role_competencies (
  role_id              text not null references domain_roles(id) on delete cascade,
  competency_node_id   uuid not null references skill_graph_nodes(id) on delete cascade,
  weight               numeric not null default 1.0,
  created_at           timestamptz not null default now(),
  primary key (role_id, competency_node_id)
);
-- FIX 1: server-side/internal table — default deny. No frontend code
-- references this table (it is net new); the backend's supabaseAdmin uses
-- the service_role key, which bypasses RLS entirely, so this does not affect
-- any existing or planned backend access path.
alter table domain_role_competencies enable row level security;

-- ── D. Task-generation provenance (persists "why this task", per requirement) ──

-- FIX 6 — orphan provenance, analyzed and decided (Option B: immutable
-- historical/audit record).
--
-- task_id (below and on task_content_fingerprints) is polymorphic across
-- experiments/domain_missions depending on task_type, so it cannot carry a
-- normal single-target foreign key. Existing product behavior was checked
-- before deciding how to handle this: the domain_mission generator scripts
-- (scripts/generateDomainRoleMissions.mjs and 3 siblings) DO delete
-- domain_missions rows in real, exercised regeneration/dedup passes
-- (gated behind a DELETE_MISSION_IDS env var). Separately, this codebase's
-- existing closest analog to a provenance/history table — arena_history —
-- is itself never deleted or cleaned up when the experiments/domain_missions
-- rows it references are removed; it is treated as a permanent, immutable
-- ledger (see its table comment above: "Denormalized Arena event ledger").
-- Matching that existing, established convention: task_generation_events and
-- task_content_fingerprints rows are immutable historical/audit records.
-- Deleting a task does NOT delete or update the fact that it was generated
-- or served — task_id may become a dangling reference, and that is expected
-- and accepted, not a bug. No FK, no cascade, no cleanup job is added. If a
-- future reader needs to join back to a possibly-deleted task, they must
-- handle a missing row, the same way arena_history's own consumers already
-- have to.

create table if not exists task_generation_events (
  id                          uuid primary key default gen_random_uuid(),
  task_type                   text not null check (task_type in ('experiment','domain_mission')),
  task_id                     uuid not null,
  outcome                     text not null check (outcome in (
                                'served_existing','generated','regenerated','fallback','historical_backfill'
                              )),
  student_id                  uuid references profiles(id) on delete set null,
  provider                    text,
  model_tier                  text check (model_tier is null or model_tier in ('fast','quality')),
  prompt_id                   text,
  target_competency_node_id   uuid references skill_graph_nodes(id) on delete set null,
  target_difficulty           numeric,
  selection_rationale         jsonb,
  generated_at                timestamptz not null default now()
);
create index if not exists idx_task_generation_events_task on task_generation_events(task_type, task_id);
create index if not exists idx_task_generation_events_student on task_generation_events(student_id, generated_at desc);
-- FIX 1: server-side/internal table — default deny (see rationale above
-- domain_role_competencies's ENABLE ROW LEVEL SECURITY, same reasoning).
alter table task_generation_events enable row level security;

-- ── E. Content fingerprint lookup support (complements the existing offline ──
-- wordOverlapRatio near-duplicate check; does not replace it)
--
-- FIX 5 — corrected semantics (this table does NOT enforce duplicate
-- prevention by itself; the original comment overstated this):
--   * unique(task_type, task_id) below means "at most one fingerprint record
--     per task" — a one-to-one PROVENANCE constraint. It does NOT stop two
--     DIFFERENT tasks from sharing the same normalized_hash; nothing at the
--     database level guarantees content uniqueness across tasks.
--   * Cross-task exact-duplicate DETECTION is an application-level
--     responsibility: the planned runtime generation service (Phase 3,
--     runtimeGenerate.js) must run
--       SELECT 1 FROM task_content_fingerprints
--       WHERE task_type = $1 AND normalized_hash = $2
--     (using idx_task_content_fingerprints_hash below) BEFORE inserting a
--     newly generated task, and reject/retry on a hit. That lookup-before-
--     insert step is part of the approved Fig. 3 flow ("duplicate
--     detection" stage) and must actually be implemented in Phase 3 — this
--     table only makes that lookup possible and fast, it does not perform it.
--   * A global unique(normalized_hash) constraint is deliberately NOT added
--     here: that would require settling exact normalization semantics and a
--     collision policy across every task type first (e.g. should a SQL task
--     and a Python task ever be allowed to collide on hash?), which has not
--     been designed. Adding it speculatively now would be guessing.

create table if not exists task_content_fingerprints (
  id             uuid primary key default gen_random_uuid(),
  task_type      text not null check (task_type in ('experiment','domain_mission')),
  task_id        uuid not null,
  normalized_hash text not null,
  created_at     timestamptz not null default now(),
  unique (task_type, task_id)
);
create index if not exists idx_task_content_fingerprints_hash on task_content_fingerprints(normalized_hash);
-- FIX 1: server-side/internal table — default deny (same reasoning as
-- domain_role_competencies/task_generation_events above).
alter table task_content_fingerprints enable row level security;
