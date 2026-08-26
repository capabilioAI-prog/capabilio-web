-- ═══════════════════════════════════════════════════════════════════════════
-- Protect legacy student ELO fields on `profiles` from client (anon/
-- authenticated) writes — P0 finding from the 2026-08-26 Arena system audit.
--
-- STATUS: APPLIED to live project `capabilio` (eybchcqwbizjmzyrviri) on
-- 2026-08-26 via mcp__Supabase__apply_migration, migration name
-- `protect_legacy_profile_elo_fields`. Verified post-apply (rolled-back
-- transaction, no production rows touched): anon and authenticated clients
-- are blocked from writing all 8 target columns and from un-completing
-- onboarding once true; cross-user updates remain blocked by existing RLS;
-- the onboarding-completion write path, increment_profile_elo() (service-
-- role), the existing Professional ELO trigger, and unrelated profile
-- field updates (e.g. display_name) all continue to work unmodified.
--
-- CONTEXT
-- ───────
-- profiles.elo_rating and 7 sibling legacy/duplicate columns (eloRating,
-- baseElo, initialElo, elo_score, eloHistory, eloDecayToday, eloDecayDate)
-- have full INSERT/UPDATE/SELECT grants for both anon and authenticated, and
-- the "Users can update own profile" RLS policy has no with_check beyond row
-- ownership (auth.uid() = id) — no column/value restriction. Any signed-in
-- user can call:
--   supabase.from('profiles').update({ elo_rating: 999999 }).eq('id', ownId)
-- directly via the public anon key and it succeeds today, bypassing every
-- server-side ELO formula entirely.
--
-- This is the SAME class of risk the existing protect_profile_trust_fields_
-- pc7_v1() trigger already closed for the NEWER Professional ELO columns
-- (role_elo, market_elo, proof_elo, mobility_elo, professional_elo,
-- blended_elo) — that fix was never backported to the original/student ELO
-- fields this migration covers.
--
-- A prior, narrower, INCOMPLETE attempt at this exists in the repo:
-- freeze_elo_columns_migration.sql (git-tracked, header says "DO NOT APPLY
-- YET"). It only covers elo_rating + arena_completed + arena_streak (misses
-- 7 of the 8 fields here), and has no onboarding-safe exception — applying
-- it as written would have broken onboarding's one legitimate client-side
-- ELO write (see below). Left as-is, superseded in intent by this file for
-- the 8 fields listed in the audit; not modified or deleted here since
-- deciding its fate is a separate call from this fix.
--
-- WHY NOT A BLANKET BLOCK (the onboarding exception)
-- ───────────────────────────────────────────────────
-- Traced live: frontend/src/pages/Onboarding.jsx's buildStudentSavePayload/
-- buildProfessionalSavePayload include eloRating/baseElo/initialElo in the
-- SAME payload as onboarding_complete:true, written via userDoc.set()
-- (lib/db.js) — a plain client-side (authenticated-role) upsert. Because
-- handle_new_user() already inserts a stub profiles row (elo_rating=400) at
-- signup (BEFORE INSERT ON auth.users), this upsert is always an UPDATE, not
-- an INSERT — so a blanket BEFORE UPDATE block would break onboarding for
-- every single new user, not just Arena.
--
-- The one legitimate case is exactly: the client sets these fields ONCE, in
-- the same statement that finishes onboarding, while the row's
-- onboarding_complete was not yet true. After that, every further ELO change
-- must go through arenaCollegeStream.js/arenaDomainRole.js's
-- increment_profile_elo(uid, delta) RPC, called via supabaseAdmin
-- (service_role) — confirmed as the only live, authoritative ELO-write path
-- for ArenaCollegeStream/Domain Role today.
--
-- Closing the obvious bypass: without also freezing onboarding_complete's
-- direction, a user could (1) PATCH onboarding_complete:false on their own
-- already-complete profile (nothing currently protects that field), then (2)
-- PATCH elo_rating + onboarding_complete:true together — OLD.onboarding_
-- complete would read false (from step 1) and the gate would wrongly reopen.
-- So this migration also makes onboarding_complete forward-only for anon/
-- authenticated: true is terminal, never settable back to false by a client.
-- Confirmed safe: every current onboarding_complete:false write in the repo
-- is an intermediate step during the wizard, before the row has ever been
-- marked complete (grep: 5 hits, all in Onboarding.jsx, all pre-completion) —
-- nothing legitimately resets a finished profile back to incomplete.
--
-- WHY NOT security definer / rewrite increment_profile_elo
-- ──────────────────────────────────────────────────────────
-- increment_profile_elo(p_user_id, p_delta) is already correct: called only
-- via supabaseAdmin (service_role, confirmed in backend/server/lib/
-- supabase.js — "service_role, never expose to frontend"), which is outside
-- ('anon','authenticated') and passes this trigger's guard unmodified, same
-- as it already passes protect_profile_trust_fields_pc7_v1(). No change
-- needed there.
--
-- SCOPE — exactly the 8 fields named in the audit, nothing else. Does NOT
-- touch arena_completed/arena_streak (flagged by the older, unapplied
-- freeze_elo_columns_migration.sql as a related but separate concern — left
-- for a follow-up decision, not folded into this fix).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.protect_profile_legacy_elo_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  protected_cols text[] := array[
    'elo_rating', 'eloRating', 'baseElo', 'initialElo',
    'elo_score', 'eloHistory', 'eloDecayToday', 'eloDecayDate'
  ];
  col text;
begin
  -- Backend (service_role) and DDL/maintenance roles may change anything —
  -- same convention as protect_profile_entitlements() and
  -- protect_profile_trust_fields_pc7_v1().
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- onboarding_complete is forward-only for clients: true is terminal. This
  -- closes the two-step bypass described above (flip false, write ELO +
  -- true in the same statement) and is itself a client-writable column
  -- today with no existing protection.
  if old.onboarding_complete is true and new.onboarding_complete is distinct from old.onboarding_complete then
    raise warning 'ELO-guard blocked: profile % attempted to un-complete onboarding (role=%)',
      new.id, current_user;
    raise exception 'profiles.onboarding_complete cannot be reset once true'
      using errcode = 'insufficient_privilege';
  end if;

  -- The one legitimate client write to the legacy ELO fields: onboarding
  -- completion, before onboarding_complete has ever been true.
  if old.onboarding_complete is not true then
    return new;
  end if;

  foreach col in array protected_cols loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise warning 'ELO-guard blocked: profile % attempted client-side write to profiles.% (role=%)',
        new.id, col, current_user;
      raise exception 'profiles.% can only be modified server-side', col
        using errcode = 'insufficient_privilege';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_legacy_elo_fields on public.profiles;
create trigger trg_protect_profile_legacy_elo_fields
  before update on public.profiles
  for each row execute function public.protect_profile_legacy_elo_fields();
