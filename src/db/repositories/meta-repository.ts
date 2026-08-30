import type { SqliteDatabase } from '../connection';

/**
 * Repository contract for simple key/value metadata (e.g. schema version,
 * feature flags). Game code should depend on interfaces like this one, not
 * on a concrete database driver, so a Postgres-backed implementation can
 * slot in later (docs/05-tech-stack.md) without touching callers.
 */
export interface MetaRepository {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

interface MetaRow {
  readonly value: string;
}

export class SqliteMetaRepository implements MetaRepository {
  constructor(private readonly db: SqliteDatabase) {}

  get(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM schema_meta WHERE key = ?').get(key) as
      | MetaRow
      | undefined;
    return row?.value;
  }

  set(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO schema_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }
}
