import { findStarterHull, STARTER_CREDITS } from '../engine/progression';
import { planMiningJob, rewardKey, type JobRecord } from '../engine/jobs';
import type { SqliteDatabase } from './connection';
import type { JobRewardsRepository } from './repositories/job-rewards-repository';
import type { JobsRepository } from './repositories/jobs-repository';
import type { ShipRecord, ShipsRepository } from './repositories/ships-repository';

/** One job's resolution outcome, for building player-facing messages. */
export interface ResolvedJob {
  readonly job: JobRecord;
  /** False if this job's reward key was already claimed by an earlier resolution. */
  readonly credited: boolean;
}

export type LaunchResult =
  | { readonly ok: true; readonly ship: ShipRecord; readonly resolved: readonly ResolvedJob[] }
  | {
      readonly ok: false;
      readonly reason: 'already-launched';
      readonly ship: ShipRecord;
      readonly resolved: readonly ResolvedJob[];
    }
  | { readonly ok: false; readonly reason: 'unknown-hull'; readonly resolved: readonly ResolvedJob[] };

export type StartMiningResult =
  | { readonly ok: true; readonly job: JobRecord; readonly resolved: readonly ResolvedJob[] }
  | { readonly ok: false; readonly reason: 'no-ship'; readonly resolved: readonly ResolvedJob[] }
  | {
      readonly ok: false;
      readonly reason: 'job-in-progress';
      readonly job: JobRecord;
      readonly resolved: readonly ResolvedJob[];
    };

/**
 * The jobs engine (docs/05-tech-stack.md, "Key mechanisms" > Jobs): the
 * transactional glue between the pure logic in `engine/jobs` and the
 * repositories. Every public method here resolves the caller's finished,
 * unresolved jobs first, inside the same transaction as whatever else it
 * does — "any command from a player first resolves that player's finished,
 * unresolved jobs" (issue #3). No timers needed for correctness.
 */
export class JobsEngine {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly ships: ShipsRepository,
    private readonly jobs: JobsRepository,
    private readonly rewards: JobRewardsRepository,
  ) {}

  /**
   * Resolves every finished, unresolved job belonging to `ownerId`'s ship.
   * Idempotent: resolving the same job twice (e.g. two racing commands, or
   * a bug that calls this twice) credits its reward at most once, because
   * the reward key insert-or-ignore only succeeds the first time.
   */
  resolvePendingJobs(ownerId: string, now: Date): ResolvedJob[] {
    return this.db.transaction(() => {
      const ship = this.ships.findByOwner(ownerId);
      if (!ship) return [];
      return this.resolvePendingJobsForShip(ship, now);
    })();
  }

  /** Same as `resolvePendingJobs`, for a ship the caller has already loaded (avoids a repeat lookup). */
  private resolvePendingJobsForShip(ship: ShipRecord, now: Date): ResolvedJob[] {
    const finished = this.jobs.findUnresolvedFinished(ship.id, now);
    const resolved: ResolvedJob[] = [];
    for (const job of finished) {
      const credited = this.rewards.claim(rewardKey(job.id), now);
      if (credited) {
        this.ships.creditOre(ship.id, job.reward.oreTonnes);
      }
      this.jobs.markResolved(job.id, now);
      resolved.push({ job: { ...job, resolvedAt: now }, credited });
    }
    return resolved;
  }

  /** docs/04-game-design.md: "/launch pick a starter hull + role." */
  launch(ownerId: string, hullId: string, now: Date): LaunchResult {
    return this.db.transaction((): LaunchResult => {
      const existing = this.ships.findByOwner(ownerId);
      if (existing) {
        const resolved = this.resolvePendingJobsForShip(existing, now);
        return { ok: false, reason: 'already-launched', ship: existing, resolved };
      }

      const hull = findStarterHull(hullId);
      if (!hull) {
        return { ok: false, reason: 'unknown-hull', resolved: [] };
      }

      const ship = this.ships.create(ownerId, hull.id, hull.role, STARTER_CREDITS, now);
      return { ok: true, ship, resolved: [] };
    })();
  }

  /**
   * docs/04-game-design.md: "Mine ... 10-30 min" and "Only one active job
   * per ship."
   */
  startMining(ownerId: string, now: Date): StartMiningResult {
    return this.db.transaction((): StartMiningResult => {
      const ship = this.ships.findByOwner(ownerId);
      if (!ship) {
        return { ok: false, reason: 'no-ship', resolved: [] };
      }

      const resolved = this.resolvePendingJobsForShip(ship, now);

      const active = this.jobs.findActive(ship.id);
      if (active) {
        return { ok: false, reason: 'job-in-progress', job: active, resolved };
      }

      const job = this.jobs.create(ship.id, planMiningJob(), now);
      return { ok: true, job, resolved };
    })();
  }
}
