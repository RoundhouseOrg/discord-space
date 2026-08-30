import Database from 'better-sqlite3';

/** The concrete driver type used by the SQLite-backed repositories. */
export type SqliteDatabase = Database.Database;

export interface DatabaseConfig {
  /** Filesystem path to the SQLite file, or ':memory:' for an ephemeral database. */
  readonly path: string;
}

/**
 * Opens a SQLite database for local development (docs/05-tech-stack.md).
 * Callers should depend on the repository interfaces in
 * `src/db/repositories`, not on this connection directly, so a Postgres
 * implementation can slot in later without touching call sites.
 */
export function openDatabase(config: DatabaseConfig): SqliteDatabase {
  const db = new Database(config.path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
