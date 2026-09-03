-- Down migration for 2026-09-03_drop_broken_proof_objects_source_ref_index.sql
--
-- Recreates the legacy (source, source_ref) unique index. Not recommended —
-- this is the index that was silently breaking every Code DNA persist whose
-- analysis payload exceeded btree's row-size limit. Included only for
-- symmetry/rollback completeness.

BEGIN;

ALTER TABLE public.proof_objects
  ADD CONSTRAINT proof_objects_source_source_ref_key UNIQUE (source, source_ref);

COMMIT;
