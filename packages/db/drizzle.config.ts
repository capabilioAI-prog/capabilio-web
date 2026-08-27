import type { Config } from 'drizzle-kit';

// The canonical, version-controlled migration history lives in
// supabase/migrations (applied via the Supabase CLI). `db:generate` writes
// new diffs directly there so there is exactly one migration history for
// this database, not a separate drizzle-kit one.
//
// ./migrations (this package's old drizzle-kit-only output directory) is
// superseded and no longer written to — see supabase/migrations for the
// current baseline and the production database foundation report for why.
export default {
  schema: './src/schema/index.ts',
  out: '../../supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
