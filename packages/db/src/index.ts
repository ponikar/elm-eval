import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema.js';

function getDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is required. Set it to your Neon Postgres connection string.',
    );
  }
  return url;
}

export function createDatabase(databaseUrl?: string) {
  const pool = new Pool({ connectionString: databaseUrl ?? getDatabaseUrl() });
  return drizzle(pool, { schema });
}

export const db = createDatabase();
export * from './comparison-store.js';
export * from './pipeline-store.js';
export * from './review-store.js';
