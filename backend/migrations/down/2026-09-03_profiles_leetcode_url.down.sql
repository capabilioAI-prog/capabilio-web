-- Down migration for 2026-09-03_profiles_leetcode_url.sql
--
-- Drops profiles.leetcode_url. Data-loss warning: any LeetCode URLs users
-- have saved since the up-migration ran are lost. Nothing else on profiles
-- is touched.

BEGIN;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS leetcode_url;

COMMIT;
