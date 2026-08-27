import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/capabilio';

// For migrations and one-time operations
export const migrationClient = postgres(connectionString, { max: 1, idle_timeout: 20, max_lifetime: 60 * 30 });

// For normal queries
const queryClient = postgres(connectionString, { idle_timeout: 20, max_lifetime: 60 * 30 });

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
