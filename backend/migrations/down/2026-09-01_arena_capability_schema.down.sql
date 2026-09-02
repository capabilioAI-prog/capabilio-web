-- Down migration for 2026-09-01_arena_capability_schema.sql
--
-- ═══════════════════════════════════════════════════════════════════════════
-- RUNBOOK (Phase 1.1 rollback-safety repair — read before running this file)
--
-- WHAT THIS FILE DOES ON SUCCESS:
--   Reverts every object 2026-09-01_arena_capability_schema.sql created:
--   drops domain_role_competencies / task_generation_events /
--   task_content_fingerprints, restores skill_graph_nodes/skill_graph_edges'
--   original (narrower) CHECK constraints, drops the 2 new indexes, and drops
--   the 3 new columns on experiments/domain_missions. Pre-existing student
--   data (experiments/domain_missions rows themselves, all 12 baseline
--   tables from 2026-09-01_arena_capability_baseline_snapshot.sql) is never
--   touched — only objects THIS migration created are reverted.
--
-- ATOMICITY: the entire file is one transaction (BEGIN ... COMMIT). Postgres
-- DDL is transactional, so ANY statement failing anywhere below — including
-- the preflight guard — aborts the whole transaction. COMMIT after an
-- aborted transaction is itself a no-op in Postgres (the server refuses to
-- commit and rolls back instead), so this guarantee holds regardless of
-- which tool runs this file (psql, the Supabase SQL editor, or an MCP
-- apply_migration call) and independent of that tool's own error-handling
-- settings (e.g. psql's ON_ERROR_STOP is not required for this guarantee,
-- though it is still good practice to set it so a failure is reported
-- immediately rather than the client trying to run the remaining lines).
--
-- ROLLBACK PREFLIGHT (why it exists): 2026-09-01_arena_capability_schema.sql
-- widened skill_graph_nodes.node_type to also allow 'domain'/'competency',
-- and skill_graph_edges.edge_type to also allow 'PART_OF'. If
-- backfillTaskCompetencies.mjs (or anything else) has since inserted a row
-- using one of those new values, narrowing the CHECK constraint back would
-- fail with a 23514 violation. The preflight below runs FIRST — before the
-- table drops, before anything — and aborts the whole transaction with a
-- clear message if any such row exists, so that failure (if it's going to
-- happen) happens before ANY destructive statement runs, not partway through.
--
-- The rest of the file below the preflight deliberately PRESERVES the
-- original statement order this migration always had (table drops, then
-- constraint restores, then index drops, then column drops) — only the
-- BEGIN/COMMIT wrapper and the preflight guard are new. This is a deliberate
-- choice, not an oversight: because the whole file is one transaction,
-- Postgres's own transactional-DDL guarantee makes the relative order of the
-- drops/restores irrelevant to atomicity — ANY failure anywhere rolls back
-- everything before it in the same transaction regardless of order — so
-- there is no safety reason to reorder the original sequence, and preserving
-- it keeps this file's diff against its pre-fix version minimal and easy to
-- review.
--
-- A SHARE ROW EXCLUSIVE lock is taken on skill_graph_nodes/skill_graph_edges
-- before the preflight check specifically to close a check-then-act race:
-- without it, a concurrent session could insert a 'competency' row between
-- this file's preflight SELECT and its ALTER TABLE ... ADD CONSTRAINT,
-- causing the constraint restore to fail anyway. The lock blocks new
-- inserts/updates on these two tables for the rest of this transaction,
-- making the check-then-restore sequence race-free. Both tables are tiny
-- (59 and 0 rows at last count) so this lock is held briefly.
--
-- EXPECTED STATE AFTER A SUCCESSFUL ROLLBACK:
--   - domain_role_competencies, task_generation_events,
--     task_content_fingerprints: do not exist.
--   - skill_graph_nodes.node_type_check / skill_graph_edges.edge_type_check:
--     back to their original ('skill','concept') / 11-value definitions.
--   - experiments/domain_missions: skill_graph_node_id, difficulty_score,
--     (and experiments.source) columns do not exist; every other column and
--     every existing row is untouched.
--   - skill_graph_nodes contains ZERO rows with node_type IN
--     ('domain','competency') — GUARANTEED, not merely expected: the
--     preflight below refuses to run any DROP/ALTER at all if any such row
--     exists, rather than deleting them or silently leaving them behind.
--     (Re-review of Finding #5 from the prior audit: "competency nodes may
--     remain after rollback" was correctly flagged as undesirable. The fix
--     is NOT to have this migration silently delete data it didn't create —
--     these rows may be reused for something else — the fix is to make
--     "rollback succeeded" and "zero orphaned competency/domain nodes exist"
--     the same fact, by construction. If the guard fires, rollback simply
--     does not proceed; see WHEN NOT TO ROLL BACK below for what to do then.)
--
-- WHEN ROLLBACK SHOULD NOT BE ATTEMPTED (or will refuse to proceed):
--   - If backfillTaskCompetencies.mjs --execute has been run and you want to
--     KEEP its competency tagging: rolling back would require first deciding
--     what to do with those skill_graph_nodes rows (this file will not
--     decide for you — it aborts with a clear error instead; see the DO
--     block below for the exact cleanup snippet if you decide to discard
--     them).
--   - If backfillHistoricalTaskProvenance.mjs is either currently running or
--     might be concurrently invoked: that script's own idempotency is a
--     check-then-insert against task_generation_events with no DB-level
--     unique constraint (by design — real usage legitimately writes
--     multiple provenance rows per task over time). Run it from exactly one
--     process at a time. This is unrelated to whether ROLLBACK is safe
--     (dropping task_generation_events is safe regardless), but running the
--     backfill DURING a rollback could make either operation's output
--     confusing to reason about — don't run them concurrently.
--   - If you need to preserve any row in task_generation_events or
--     task_content_fingerprints for audit purposes: both are dropped
--     entirely by this rollback. Export/copy anything you need first.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── Preflight: lock, then check, BEFORE any destructive statement ─────────
-- Locking first closes the check-then-act race described above; the RAISE
-- EXCEPTION aborts the transaction immediately (nothing has been dropped or
-- altered yet at this point) with a message that tells the operator exactly
-- what to inspect, rather than surfacing a raw 23514 constraint-violation
-- error after other statements have already run.

lock table skill_graph_nodes in share row exclusive mode;
lock table skill_graph_edges in share row exclusive mode;

do $$
declare
  blocking_nodes int;
  blocking_edges int;
begin
  select count(*) into blocking_nodes
    from skill_graph_nodes where node_type in ('domain', 'competency');

  select count(*) into blocking_edges
    from skill_graph_edges where edge_type = 'PART_OF';

  if blocking_nodes > 0 or blocking_edges > 0 then
    raise exception
      'ROLLBACK BLOCKED: % skill_graph_nodes row(s) with node_type in (''domain'',''competency'') and % skill_graph_edges row(s) with edge_type = ''PART_OF'' exist. Restoring the original CHECK constraints would fail against this data. No DROP or ALTER has been run. To proceed, first decide what to do with these rows (see the down-migration''s header comment for a cleanup snippet), then re-run this rollback.',
      blocking_nodes, blocking_edges;
  end if;
end $$;

-- ── Step 1 — drop the 3 net-new tables (original order, preserved) ─────────
-- No FK from any pre-existing table points at these three, and none of the
-- three reference each other, so there is no forced order among them. The
-- preflight above guarantees this step cannot be reached while it would
-- leave the later constraint-restore below unable to succeed.

drop table if exists task_content_fingerprints;
drop table if exists task_generation_events;
drop table if exists domain_role_competencies;

-- ── Step 2 — restore the original, narrower CHECK constraints ─────────────
-- The preflight above guarantees no existing row can violate these, so
-- these statements cannot fail due to data — only due to something more
-- fundamental (e.g. a permissions problem), in which case the transaction
-- wrapper still rolls back Step 1's drops along with everything else.

alter table skill_graph_edges drop constraint if exists skill_graph_edges_edge_type_check;
alter table skill_graph_edges add constraint skill_graph_edges_edge_type_check
  check (edge_type in (
    'PREREQUISITE_OF','REQUIRES','REINFORCES','VALIDATES','PRODUCES_EVIDENCE',
    'UNLOCKS','PREPARES_FOR','RELATED_TO','WEAKENS','RECOVERS','RECOMMENDS_NEXT'
  ));

alter table skill_graph_nodes drop constraint if exists skill_graph_nodes_node_type_check;
alter table skill_graph_nodes add constraint skill_graph_nodes_node_type_check
  check (node_type in ('skill','concept'));

-- ── Step 3 — drop the 2 new indexes ─────────────────────────────────────────
-- Must precede dropping the columns they're built on (Postgres would drop
-- them automatically via the column drop's CASCADE-of-dependents behavior
-- for an index, but dropping them explicitly first keeps the intent
-- unambiguous rather than relying on that implicit behavior).

drop index if exists idx_domain_missions_skill_graph_node;
drop index if exists idx_experiments_skill_graph_node;

-- ── Step 4 — drop the new columns ───────────────────────────────────────────
-- No dependency between these two tables' new columns; order between them
-- doesn't matter. Pre-existing columns and all existing rows are untouched.

alter table domain_missions
  drop column if exists difficulty_score,
  drop column if exists skill_graph_node_id;

alter table experiments
  drop column if exists source,
  drop column if exists difficulty_score,
  drop column if exists skill_graph_node_id;

commit;

-- ── If you decided to discard backfilled competency tagging instead of ────
-- keeping it (see "WHEN ROLLBACK SHOULD NOT BE ATTEMPTED" above), this is
-- the manual cleanup that would unblock the preflight above. NOT run
-- automatically by this file — deleting data this migration didn't create
-- is a decision for the operator, not something a schema-rollback script
-- should do silently.
--
--   delete from skill_graph_edges where edge_type = 'PART_OF';
--   delete from skill_graph_nodes where node_type in ('domain', 'competency');
