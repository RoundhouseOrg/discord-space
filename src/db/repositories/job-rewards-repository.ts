import type { SqliteDatabase } from '../connection';

/**
 * The insert-or-ignore idempotency ledger from docs/05-tech-stack.md:
 * "Idempotent rewards: every reward has a unique key (`vote:<user>:<ts>`,
 * `job:<id>`); insert-or-ignore before credit." A row existing for a key
 * means that reward was already credited; callers must only credit the
 * underlying balance when `claim` reports a first-time claim.
 */
export interface JobRewardsRepository {
  /** Returns true the first time `key` is claimed, false on every subsequent attempt. */
  claim(key: string, now: Date): boolean;
}

export class SqliteJobRewardsRepository implements JobRewardsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  claim(key: string, now: Date): boolean {
    const result = this.db
      .prepare('INSERT OR IGNORE INTO job_rewards (reward_key, credited_at) VALUES (?, ?)')
      .run(key, now.getTime());
    return result.changes > 0;
  }
}
