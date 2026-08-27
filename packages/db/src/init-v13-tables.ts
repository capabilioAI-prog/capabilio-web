import { migrationClient } from './client';

async function initV13() {
  console.log('Applying V1.3 database migrations & schema enhancements...');
  
  await migrationClient`
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS university_name TEXT,
    ADD COLUMN IF NOT EXISTS graduation_year TEXT;
  `;

  console.log('Successfully updated profiles schema in PostgreSQL!');
  process.exit(0);
}

initV13().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
