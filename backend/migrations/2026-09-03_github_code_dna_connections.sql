-- 2026-09-03_github_code_dna_connections.sql
--
-- GitHub Code DNA — canonical identity + scheduling metadata, Phase 1.
-- Additive only. Verified against the live schema before writing this:
--
--   * profiles.github_url already exists and remains the single source of
--     truth for "what URL did the user type into a form" (Settings' and
--     Career & Vault's Profile Links form both already write here via
--     frontend/src/lib/db.js's toSnake()) — this migration does NOT
--     duplicate or replace it.
--   * The actual Code DNA ANALYSIS (scores, languages, top repos, AI
--     fingerprint, repo interview) already has real, working, RLS-backed
--     storage: proof_objects (source='github_code_dna'), managed by
--     backend/server/lib/codeDna/repository.js. This migration does not
--     touch or duplicate that either.
--   * What's genuinely missing is a place to track CONNECTION/SCHEDULING
--     state that isn't a good fit for either of the above:
--     verification_state, scan_status, last_scanned_at, next_scan_at,
--     backoff on repeated failures. proof_objects' JSONB source_ref is not
--     efficiently queryable/sortable for "which users are due for a scan
--     right now" across the whole table — a real, indexed column is the
--     correct tool for that specific job, which is the entire point of
--     this new table.
--   * This project's default ACL grants anon/authenticated full CRUD on
--     any new public table with no RLS (established pattern, confirmed
--     across prior migrations in this repo) — RLS is enabled before
--     anything else happens, with a read-only policy for the owning user;
--     all writes (connect/disconnect/scan-status updates) go through the
--     backend's service-role key, matching user_mfa_recovery_codes/
--     security_events' established access model from the prior Settings/
--     Security migration.
--
-- Nothing existing is dropped, renamed, narrowed, or has its type changed.

BEGIN;

CREATE TABLE public.github_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  profile_url text,
  -- Only 'public_url' today — the bio-verification method already built in
  -- github.js's /verify-ownership needs no OAuth app registration. A future
  -- 'github_app' value is a real, anticipated extension point (see the
  -- accompanying design report), not implemented here.
  connection_method text NOT NULL DEFAULT 'public_url'
    CHECK (connection_method IN ('public_url')),
  verification_state text NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified', 'verified')),
  scan_status text NOT NULL DEFAULT 'idle'
    CHECK (scan_status IN ('idle', 'queued', 'scanning', 'completed', 'failed')),
  -- Short, internal-only failure category (e.g. "rate_limited", "not_found")
  -- — never a raw provider error string or stack trace; see
  -- lib/codeDna/connection.js for the fixed vocabulary this is written from.
  last_scan_error text,
  consecutive_failures int NOT NULL DEFAULT 0,
  last_scanned_at timestamptz,
  next_scan_at timestamptz,
  -- Denormalized read-model of the LATEST scan's headline numbers, so
  -- Settings/Career & Vault/Portfolio/Profile Strength can all show a
  -- consistent score/confidence/repo-count without re-fetching or
  -- re-parsing the full proof_objects analysis blob just to render a
  -- summary card. The full analysis remains the single source of truth in
  -- proof_objects; these three columns are refreshed every successful scan.
  code_dna_score int,
  confidence_level text CHECK (confidence_level IN ('high', 'moderate', 'low')),
  repositories_analyzed int,
  disconnected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The one query this table exists to make efficient: "which connected,
-- non-disconnected, currently-idle users are due for their next scan."
CREATE INDEX idx_github_connections_next_scan
  ON public.github_connections (next_scan_at)
  WHERE scan_status = 'idle' AND disconnected_at IS NULL;

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own github connection"
  ON public.github_connections FOR SELECT USING (auth.uid() = user_id);
-- No client INSERT/UPDATE/DELETE policy: connect/disconnect/scan-status
-- transitions are all server-validated (URL/username resolution, ownership
-- verification, rate limiting) — never a raw client write.

COMMIT;
