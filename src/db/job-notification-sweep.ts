import { selectJobsToNotify, type JobRecord } from '../engine/jobs';
import type { SqliteDatabase } from './connection';
import type { JobsRepository } from './repositories/jobs-repository';
import type { ShipsRepository } from './repositories/ships-repository';

/** One finished job the sweep decided to notify about, plus who to tell. */
export interface JobNotification {
  readonly ownerId: string;
  readonly job: JobRecord;
}

/**
 * The background sweep from docs/05-tech-stack.md: "Any command from the
 * player checks for unresolved, finished jobs and resolves them inside a
 * transaction. No timers needed for correctness; a background sweep can
 * push 'job complete' notifications as a convenience."
 *
 * This is strictly a convenience layer on top of resolve-on-next-command:
 * - It never resolves jobs or credits rewards. That stays exactly as it is
 *   today — `JobsEngine.resolvePendingJobs`, inside a transaction, on the
 *   player's next command.
 * - It tracks its own `notified_at` timestamp, independent of
 *   `resolved_at`, so it cannot "double-resolve" a job: resolution is a
 *   completely separate write this code never performs.
 * - Marking a job notified happens in the same transaction as selecting
 *   it, so two overlapping sweep ticks can't both notify the same job.
 */
export class JobNotificationSweep {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly jobs: JobsRepository,
    private readonly ships: ShipsRepository,
  ) {}

  /**
   * Finds finished, unresolved jobs nobody has been notified about yet,
   * marks them notified, and returns them (with their ship's owner) for
   * the caller to actually deliver — e.g. edit the job's original message,
   * or DM the player if that's not possible (issue #13). A ship that no
   * longer exists (shouldn't happen; jobs reference ships via a foreign
   * key) is skipped rather than notified with no recipient.
   */
  sweep(now: Date): JobNotification[] {
    return this.db.transaction((): JobNotification[] => {
      const candidates = selectJobsToNotify(this.jobs.findUnnotifiedFinished(now), now);
      const notifications: JobNotification[] = [];
      for (const job of candidates) {
        const ship = this.ships.findById(job.shipId);
        // Mark notified regardless of whether the ship lookup succeeded, so
        // a missing ship can't make the sweep retry the same job forever.
        this.jobs.markNotified(job.id, now);
        if (!ship) continue;
        notifications.push({ ownerId: ship.ownerId, job });
      }
      return notifications;
    })();
  }
}
