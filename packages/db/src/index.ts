import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';

const { AUDIT_DB_PATH: auditDbPath } = process.env;
const workingDirectory = process.cwd();
const parentDirectory = path.basename(path.dirname(workingDirectory));
const workspaceRoot =
  parentDirectory === 'apps' || parentDirectory === 'packages'
    ? path.resolve(workingDirectory, '../..')
    : workingDirectory;

export function createDatabase(
  filename = auditDbPath ?? path.join(workspaceRoot, 'audit-reliability.db'),
) {
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  const database = drizzle(sqlite, { schema });
  migrate(database, {
    migrationsFolder: path.join(workspaceRoot, 'packages/db/drizzle'),
  });
  return database;
}

export const db = createDatabase();
export * from './pipeline-store.js';
export * from './review-store.js';
