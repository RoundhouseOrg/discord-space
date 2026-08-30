import type { SqliteDatabase } from './connection';

/**
 * Schema statements, applied in order. Intentionally minimal for now: no
 * gameplay tables yet, just the `schema_meta` table the db layer itself
 * uses. Real migrations (with versioning) can replace this once the engine
 * grows tables to manage.
 */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
];

export function migrate(db: SqliteDatabase): void {
  for (const statement of MIGRATIONS) {
    db.exec(statement);
  }
}
