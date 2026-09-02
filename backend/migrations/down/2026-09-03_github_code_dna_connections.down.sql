-- Down migration for 2026-09-03_github_code_dna_connections.sql
--
-- Drops the github_connections table and its policy/index. Does not touch
-- profiles.github_url or proof_objects (source='github_code_dna') — both
-- pre-existed this migration and are untouched by it.
--
-- Data-loss warning: drops any connection/scheduling state recorded since
-- the up-migration ran. The underlying Code DNA analysis in proof_objects
-- is NOT affected — only the connection/scheduling metadata is lost.

BEGIN;

DROP POLICY IF EXISTS "Users can view own github connection" ON public.github_connections;
DROP INDEX IF EXISTS idx_github_connections_next_scan;
DROP TABLE IF EXISTS public.github_connections;

COMMIT;
