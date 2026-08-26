-- ═══════════════════════════════════════════════════════════════════════════
-- Remove client-side INSERT on arena_history / domain_submissions /
-- college_submissions — P0/P1 finding, follow-up to the 2026-08-26 Arena
-- audit and the legacy-ELO-fields fix (protect_legacy_profile_elo_fields).
--
-- STATUS: APPLIED to live project `capabilio` (eybchcqwbizjmzyrviri) on
-- 2026-08-26 via mcp__Supabase__apply_migration, migration name
-- `protect_arena_submission_tables`. Verified post-apply via a rolled-back
-- transaction (zero production rows touched, confirmed by re-query after):
-- anon blocked from inserting into all 3 tables; authenticated blocked
-- from forging its own score/passed/elo_delta on all 3, and blocked from
-- inserting for another user; a privileged (service_role-equivalent)
-- insert still succeeds on all 3 with the exact shape the live routes use;
-- SELECT on own rows is unaffected.
--
-- CONTEXT
-- ───────
-- All three tables' INSERT policies enforce row ownership only:
--   arena_history:        "Users can insert own arena history" — with_check (auth.uid() = user_id)
--   college_submissions:  "college_submissions_self_insert"    — with_check (auth.uid() = user_id)
--   domain_submissions:   "domain_submissions_insert_own"      — with_check (auth.uid() = user_id)
-- None validate VALUES — a signed-in client can insert a row for itself
-- with any score/passed/elo_delta/result it wants, e.g.:
--   supabase.from('domain_submissions').insert({
--     user_id: ownId, mission_id: anyMissionId,
--     score: 100, passed: true, elo_delta: 999,
--   })
-- and it succeeds today via the public anon key, completely bypassing
-- sqlSandbox.js/evaluateMission()/the College Stream evaluator.
--
-- AUTHORITATIVE COLUMNS (Step 4 — not just score/elo_delta)
-- ────────────────────────────────────────────────────────
-- arena_history:       score, elo_delta
-- college_submissions: score, passed, elo_delta, ai_feedback, execution_output
-- domain_submissions:  score, passed, elo_delta, result_json, checklist_json,
--                       insight, ai_feedback, execution_time_ms, error
-- (ai_feedback/execution_output/result_json etc. included because
-- arena_history and both submissions tables are portfolio-visible —
-- college_submissions/domain_submissions are read back into
-- portfolioPublic.js, and arena_history has a public "visible_in_portfolio"
-- SELECT policy — a forged "passed" record or fabricated execution output
-- is a trust/reputation problem for recruiters viewing a portfolio, not
-- just an ELO-farming problem.)
--
-- WHY FULL INSERT DENIAL, NOT A PER-COLUMN TRIGGER
-- ──────────────────────────────────────────────────
-- Traced every INSERT call site in the repo (git grep across frontend/src
-- and backend/server) before choosing a mechanism:
--   - domain_submissions / college_submissions: ZERO frontend references of
--     any kind (not even reads) — confirmed by grep, only two comments in
--     Portfolio.jsx mention the table names. 100% of writes come from
--     arenaCollegeStream.js (:743) and arenaDomainRole.js (:705, :761),
--     both via supabaseAdmin (service_role), both with score/passed/
--     elo_delta computed entirely server-side by the rule-based evaluators
--     (sqlSandbox.js / evaluateMission() / College Stream's evaluator)
--     before the insert is ever built — AI feedback is layered on
--     afterward and explicitly documented as never changing those fields.
--   - arena_history: two live writers, both supabaseAdmin + server-computed
--     (arenaCollegeStream.js:797, arenaDomainRole.js's recordArenaHistory()
--     helper). The only CLIENT-side writer is lib/db.js's
--     arenaDb.addSubmission() (trusts a caller-supplied score/elo_delta
--     outright) — called exclusively from Arena.jsx / ArenaCommonChallenges
--     .jsx / arena/ChallengeShell.jsx / arena/MissionDesk.jsx, all
--     unreachable from the live app today (no nav route renders them —
--     same finding as the broader Arena audit) and already slated for
--     removal in the separate, already-open arena-v2 removal PR.
--   - grading-worker.js also writes arena_history, but is not started by
--     backend/server.js ("startGradingWorker import removed 2026-08-16") —
--     dead code, never runs.
-- With zero legitimate client-originated INSERT anywhere — not "narrow it
-- to protect a few columns", full denial. This mirrors an existing pattern
-- already used in this project: question_bank has no client INSERT/UPDATE/
-- SELECT policy at all, documented via table comment, service_role-only.
-- Simpler and more idiomatic than a BEFORE INSERT trigger for a table with
-- no legitimate client-write case to preserve (contrast with the ELO-
-- fields fix, which needed a trigger specifically because onboarding DOES
-- have one legitimate client write to preserve).
--
-- WHAT STILL WORKS
-- ─────────────────
-- supabaseAdmin (service_role) bypasses RLS entirely, same as always — the
-- two live submission routes and increment_profile_elo() are unaffected.
-- SELECT policies (own rows + portfolio-visible) are untouched; users can
-- still read their own and others' portfolio-visible history exactly as
-- before. No UPDATE policy existed on any of these three tables before
-- this migration and none is added — already implicitly denied.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists "Users can insert own arena history" on public.arena_history;
drop policy if exists "college_submissions_self_insert" on public.college_submissions;
drop policy if exists "domain_submissions_insert_own" on public.domain_submissions;

comment on table public.arena_history is
  'Denormalized Arena event ledger (Aura ELO history timeline, Portfolio task lists). No client INSERT/UPDATE policy — every row is written server-side via supabaseAdmin after score/elo_delta are computed by a rule-based evaluator (arenaCollegeStream.js, arenaDomainRole.js). Clients may only SELECT their own rows or rows with visible_in_portfolio=true.';

comment on table public.college_submissions is
  'College Stream (Academic) submission results. No client INSERT/UPDATE policy — every row is written server-side via supabaseAdmin from backend/server/routes/arenaCollegeStream.js after the deterministic evaluator (lib/collegeStream/evaluator.js / pythonSandbox.js) has already decided score/passed/elo_delta. Clients may only SELECT their own rows.';

comment on table public.domain_submissions is
  'Domain Role submission results. No client INSERT/UPDATE policy — every row is written server-side via supabaseAdmin from backend/server/routes/arenaDomainRole.js after executeMission()/evaluateMission() (lib/domainRole/sqlSandbox.js) have already decided score/passed/elo_delta/result_json. Clients may only SELECT their own rows.';
