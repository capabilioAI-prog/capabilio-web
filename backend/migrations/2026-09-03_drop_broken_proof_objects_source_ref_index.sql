-- 2026-09-03_drop_broken_proof_objects_source_ref_index.sql
--
-- PRODUCTION BUG (discovered during live verification testing of the GitHub
-- identity/ownership-verification fix, not previously known): a legacy
-- unique index, `proof_objects_source_source_ref_key`, exists on
-- (source, source_ref) — where source_ref is the row's main JSONB payload
-- column. Postgres btree indexes have a hard per-row size limit (~2704
-- bytes on this database's page/btree version). Code DNA's source_ref blob
-- (full analysis: repos, languages, fingerprint text, collaboration data)
-- routinely exceeds that for any GitHub account with a non-trivial number of
-- repositories, so EVERY insert/update to that row silently failed with:
--
--   index row size NNNN exceeds btree version 4 maximum 2704 for index
--   "proof_objects_source_source_ref_key"
--
-- codeDnaRepo.upsertProfile() already catches and logs this (never breaks
-- the user-facing response — the analysis still displays), so it was
-- invisible from the outside: users saw a fully working Code DNA report
-- with no error, while the row silently never persisted to proof_objects.
-- Downstream effects, all now explained: score history never accumulated;
-- Portfolio/recruiter views (portfolioPublic.js, partnerBridge.js) showed no
-- Code DNA section at all for these users (codeDnaRow was simply absent,
-- not merely hidden); ownership verification's best-effort proof_objects
-- sync silently had nothing to update.
--
-- The CORRECT, actually-used constraint already exists and is untouched by
-- this migration: proof_objects_user_source_type_key, UNIQUE(user_id,
-- source, proof_type) — exactly what upsertProfile's
-- `onConflict: "user_id,source,proof_type"` targets. The broken index below
-- enforces no meaningful rule (two rows never being byte-for-byte identical
-- JSONB blobs is not a real business constraint) and nothing conflicts on
-- it intentionally anywhere in this codebase — it is pure dead weight that
-- actively breaks writes. Dropping an index never deletes data.

BEGIN;

ALTER TABLE public.proof_objects DROP CONSTRAINT IF EXISTS proof_objects_source_source_ref_key;

COMMIT;
