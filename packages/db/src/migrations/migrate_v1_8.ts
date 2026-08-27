import { migrationClient } from '../client';

async function run() {
  await migrationClient.unsafe(`
    -- Alter job_applications if needed
    ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS proof_package JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 80;
    ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE job_applications ALTER COLUMN status TYPE TEXT;
    
    -- Create saved_jobs if not exists
    CREATE TABLE IF NOT EXISTS saved_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, job_id)
    );
  `);
  console.log("✅ V1.8 Launchpad DB migrations applied successfully");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
