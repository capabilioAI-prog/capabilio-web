-- 2026-09-03_profiles_leetcode_url.sql
--
-- PRODUCTION INCIDENT: Settings' "Proof & Portfolio" save was failing in
-- full ("Save failed — try again.") with PGRST204: Could not find the
-- 'leetcodeUrl' column of 'profiles' in the schema cache.
--
-- Root cause (verified against live schema before writing this): the
-- frontend collects a `leetcodeUrl` field (SettingsPanel.jsx's ProofSection)
-- but frontend/src/lib/db.js's CAMEL_TO_SNAKE mapping table — the ONLY place
-- camelCase form fields get translated to real column names before a
-- Supabase write — has no entry for it, and no leetcode-related column of
-- any name exists on profiles at all. The literal camelCase key reached
-- PostgREST unchanged, which rejects the ENTIRE update when it contains one
-- unknown column, not just that field. Every other field in the same save
-- payload (linkedin_url, github_url, portfolio_url, recruiter_discoverable,
-- employment_status) already has both a real column and a correct mapping
-- entry — this is the one field that was simply never given either.
--
-- This migration adds the real, single, snake_case column and nothing else.
-- Deliberately does NOT create a quoted "leetcodeUrl" camelCase column —
-- profiles already carries several such duplicate legacy columns (quoted
-- "linkedInUrl"/"linkedinUrl" alongside the real linkedin_url; quoted
-- "githubUrl" alongside the real github_url) from past instances of this
-- exact bug being patched at the schema level instead of the mapping level.
-- Not repeating that pattern here; those existing duplicates are explicitly
-- out of scope for this migration and are left untouched.

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leetcode_url text;

COMMIT;
