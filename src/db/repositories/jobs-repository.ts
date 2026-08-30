import type { JobOriginMessage, JobPlan, JobRecord, JobType } from '../../engine/jobs';
import type { SqliteDatabase } from '../connection';

/**
 * Repository contract for jobs (docs/05-tech-stack.md: "jobs table with
 * started_at, ends_at, resolved_at"). Game code should depend on this
 * interface, not the concrete driver, so a Postgres implementation can slot
 * in later.
 */
export interface JobsRepository {
  /** The ship's current unresolved job, whether or not it has finished yet. */
  findActive(shipId: number): JobRecord | undefined;
  findUnresolvedFinished(shipId: number, now: Date): JobRecord[];
  /**
   * Across every ship: finished, unresolved jobs nobody has been notified
   * about yet. Feeds the background notification sweep (issue #6); unlike
   * `findUnresolvedFinished` this is not scoped to one ship, since the
   * sweep runs independently of any particular player's command.
   */
  findUnnotifiedFinished(now: Date): JobRecord[];
  create(shipId: number, plan: JobPlan, now: Date): JobRecord;
  markResolved(jobId: number, resolvedAt: Date): void;
  /** Records that the background sweep told the player about this job. Never touches resolved_at. */
  markNotified(jobId: number, notifiedAt: Date): void;
  /**
   * Records the command reply that started this job (issue #13), once it's
   * actually been sent — the job row is created before the Discord reply
   * exists, so this is a follow-up write rather than part of `create`.
   */
  setOriginMessage(jobId: number, origin: JobOriginMessage): void;
}

interface JobRow {
  readonly id: number;
  readonly ship_id: number;
  readonly type: string;
  readonly reward_ore_tonnes: number;
  readonly started_at: number;
  readonly ends_at: number;
  readonly resolved_at: number | null;
  readonly notified_at: number | null;
  readonly message_channel_id: string | null;
  readonly message_id: string | null;
}

function toRecord(row: JobRow): JobRecord {
  return {
    id: row.id,
    shipId: row.ship_id,
    type: row.type as JobType,
    startedAt: new Date(row.started_at),
    endsAt: new Date(row.ends_at),
    resolvedAt: row.resolved_at === null ? null : new Date(row.resolved_at),
    notifiedAt: row.notified_at === null ? null : new Date(row.notified_at),
    originMessage:
      row.message_channel_id === null || row.message_id === null
        ? null
        : { channelId: row.message_channel_id, messageId: row.message_id },
    reward: { oreTonnes: row.reward_ore_tonnes },
  };
}

export class SqliteJobsRepository implements JobsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findActive(shipId: number): JobRecord | undefined {
    const row = this.db
      .prepare('SELECT * FROM jobs WHERE ship_id = ? AND resolved_at IS NULL ORDER BY id LIMIT 1')
      .get(shipId) as JobRow | undefined;
    return row ? toRecord(row) : undefined;
  }

  findUnresolvedFinished(shipId: number, now: Date): JobRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM jobs WHERE ship_id = ? AND resolved_at IS NULL AND ends_at <= ? ORDER BY id`,
      )
      .all(shipId, now.getTime()) as JobRow[];
    return rows.map(toRecord);
  }

  findUnnotifiedFinished(now: Date): JobRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM jobs WHERE resolved_at IS NULL AND notified_at IS NULL AND ends_at <= ? ORDER BY id`,
      )
      .all(now.getTime()) as JobRow[];
    return rows.map(toRecord);
  }

  create(shipId: number, plan: JobPlan, now: Date): JobRecord {
    const endsAt = new Date(now.getTime() + plan.durationMs);
    const result = this.db
      .prepare(
        `INSERT INTO jobs (ship_id, type, reward_ore_tonnes, started_at, ends_at, resolved_at, notified_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
      )
      .run(shipId, plan.type, plan.reward.oreTonnes, now.getTime(), endsAt.getTime());
    return {
      id: Number(result.lastInsertRowid),
      shipId,
      type: plan.type,
      startedAt: now,
      endsAt,
      resolvedAt: null,
      notifiedAt: null,
      originMessage: null,
      reward: plan.reward,
    };
  }

  markResolved(jobId: number, resolvedAt: Date): void {
    this.db.prepare('UPDATE jobs SET resolved_at = ? WHERE id = ?').run(resolvedAt.getTime(), jobId);
  }

  markNotified(jobId: number, notifiedAt: Date): void {
    this.db.prepare('UPDATE jobs SET notified_at = ? WHERE id = ?').run(notifiedAt.getTime(), jobId);
  }

  setOriginMessage(jobId: number, origin: JobOriginMessage): void {
    this.db
      .prepare('UPDATE jobs SET message_channel_id = ?, message_id = ? WHERE id = ?')
      .run(origin.channelId, origin.messageId, jobId);
  }
}
