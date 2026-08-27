import { migrationClient } from '../client';

async function run() {
  await migrationClient.unsafe(`
    CREATE TABLE IF NOT EXISTS portfolio_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      headline TEXT,
      about TEXT,
      theme TEXT NOT NULL DEFAULT 'editorial',
      is_public BOOLEAN NOT NULL DEFAULT true,
      cta_text TEXT DEFAULT 'Contact Candidate',
      cta_url TEXT,
      featured_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      featured_skill_slugs JSONB NOT NULL DEFAULT '[]'::jsonb,
      enable_personal_brand BOOLEAN NOT NULL DEFAULT true,
      enable_video BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ portfolio_settings table created successfully");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
