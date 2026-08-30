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
  // One ship per Discord account (docs/01-vision.md: "Your ship follows
  // your Discord account across every server"). owner_id is the Discord
  // user id.
  `CREATE TABLE IF NOT EXISTS ships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL UNIQUE,
    hull_id TEXT NOT NULL,
    role TEXT NOT NULL,
    credits INTEGER NOT NULL,
    cargo_ore_tonnes INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  // docs/05-tech-stack.md: "jobs table with started_at, ends_at,
  // resolved_at." Timestamps are epoch milliseconds so SQL comparisons
  // (`ends_at <= ?`) work without a date type. reward_ore_tonnes is fixed
  // at start time so resolution is deterministic no matter how late it runs.
  // notified_at tracks the background notification sweep (issue #6)
  // separately from resolved_at: it records when the player was told a job
  // was done, never when the reward was credited, so the sweep can never
  // double-resolve a job.
  `CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ship_id INTEGER NOT NULL REFERENCES ships(id),
    type TEXT NOT NULL,
    reward_ore_tonnes INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    resolved_at INTEGER,
    notified_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS jobs_ship_id_resolved_at_idx ON jobs (ship_id, resolved_at)`,
  // Global (no ship_id) index for the background sweep, which scans across
  // every ship for finished jobs nobody has been notified about yet.
  `CREATE INDEX IF NOT EXISTS jobs_notified_at_idx ON jobs (notified_at, resolved_at, ends_at)`,
  // docs/05-tech-stack.md: "Idempotent rewards: every reward has a unique
  // key (... `job:<id>`); insert-or-ignore before credit." This table is
  // that insert-or-ignore ledger: a row existing for a key means the reward
  // was already credited.
  `CREATE TABLE IF NOT EXISTS job_rewards (
    reward_key TEXT PRIMARY KEY,
    credited_at INTEGER NOT NULL
  )`,
];

export function migrate(db: SqliteDatabase): void {
  for (const statement of MIGRATIONS) {
    db.exec(statement);
  }
}
