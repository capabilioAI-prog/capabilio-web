
import { migrationClient } from './client';

async function initTables() {
  console.log('Creating missing tables in PostgreSQL...');
  
  await migrationClient`
    CREATE TABLE IF NOT EXISTS user_mission_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mission_id TEXT NOT NULL,
      track_type TEXT NOT NULL DEFAULT 'career',
      role_slug TEXT,
      stream_slug TEXT,
      title TEXT NOT NULL,
      scenario_family TEXT,
      score INTEGER NOT NULL,
      elo_before INTEGER NOT NULL,
      elo_change INTEGER NOT NULL,
      elo_after INTEGER NOT NULL,
      passed BOOLEAN NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      skills JSONB NOT NULL DEFAULT '[]'::jsonb,
      deliverables JSONB NOT NULL DEFAULT '{}'::jsonb,
      mentor_feedback TEXT,
      verification_hash TEXT,
      is_locked BOOLEAN NOT NULL DEFAULT TRUE,
      locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  await migrationClient`
    CREATE UNIQUE INDEX IF NOT EXISTS user_mission_attempts_user_mission_idx 
    ON user_mission_attempts(user_id, mission_id);
  `;

  await migrationClient`
    CREATE TABLE IF NOT EXISTS stream_ratings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stream_slug TEXT NOT NULL,
      stream_name TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 500,
      total_challenges INTEGER NOT NULL DEFAULT 0,
      passed_challenges INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  await migrationClient`
    CREATE UNIQUE INDEX IF NOT EXISTS stream_ratings_user_stream_idx 
    ON stream_ratings(user_id, stream_slug);
  `;

  console.log('Successfully created user_mission_attempts and stream_ratings tables in PostgreSQL!');
  process.exit(0);
}

initTables().catch(err => {
  console.error('Error creating tables:', err);
  process.exit(1);
});
