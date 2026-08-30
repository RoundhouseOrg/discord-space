/**
 * Job definitions and resolution (docs/05-tech-stack.md, "Jobs" mechanism;
 * docs/04-game-design.md, "Jobs (timed actions)"). Pure game logic; must
 * never import from src/discord (enforced by eslint.config.mjs and
 * src/engine/layering.test.ts).
 *
 * A job is: pick a job -> bot replies with an ETA -> player leaves -> on
 * return (any command) the job resolves and the reward is credited,
 * computed from DB timestamps, idempotently. This module only decides
 * *what* to do (durations, rewards, which jobs are finished); the db/ layer
 * owns *when* it runs (inside a transaction) and persistence.
 *
 * Only `mine` is implemented for now (docs/06-roadmap.md ships mine /
 * patrol / salvage / explore incrementally). Yield/duration numbers are
 * placeholders, as they are everywhere else in the design docs — full
 * mining formula (richness, mining module, cargo cap) lands with the
 * economy engine.
 */

export type JobType = 'mine';

/** What a finished job pays out. Extend with credits/loot as more job types land. */
export interface JobReward {
  readonly oreTonnes: number;
}

/** The shape of a job at the moment it is started. */
export interface JobPlan {
  readonly type: JobType;
  readonly durationMs: number;
  readonly reward: JobReward;
}

/** docs/04-game-design.md: mining is "10-30 min"; pick the midpoint as a v1 placeholder. */
export const MINING_JOB_DURATION_MS = 20 * 60 * 1000;

/** docs/12-economy.md: mining yield is a placeholder pending the full formula. */
export const MINING_JOB_YIELD_TONNES = 10;

export function planMiningJob(): JobPlan {
  return {
    type: 'mine',
    durationMs: MINING_JOB_DURATION_MS,
    reward: { oreTonnes: MINING_JOB_YIELD_TONNES },
  };
}

/**
 * Where to find the command reply that started a job, so the notification
 * sweep can edit it in place instead of DMing (issue #13). Set once the
 * Discord reply has actually been sent, which is after the job row is
 * created — see `JobsEngine.recordJobMessage`.
 */
export interface JobOriginMessage {
  readonly channelId: string;
  readonly messageId: string;
}

/** A persisted job, as read back from the db/ layer. */
export interface JobRecord {
  readonly id: number;
  readonly shipId: number;
  readonly type: JobType;
  readonly startedAt: Date;
  readonly endsAt: Date;
  readonly resolvedAt: Date | null;
  /**
   * When the background notification sweep told the player this job was
   * done (docs/05-tech-stack.md: "a background sweep can push 'job
   * complete' notifications as a convenience"). Entirely separate from
   * `resolvedAt` — notifying is a courtesy, resolving is what actually
   * credits the reward, and the two must never be conflated.
   */
  readonly notifiedAt: Date | null;
  /**
   * The message that announced this job started, if known (issue #13:
   * "edit the original message first, DM as fallback"). Null until the
   * Discord reply is sent and recorded, and forever null for jobs started
   * before this field existed.
   */
  readonly originMessage: JobOriginMessage | null;
  readonly reward: JobReward;
}

/** A job is finished once `now >= ends_at`; it is pending resolution until `resolved_at` is set. */
export function isFinished(job: JobRecord, now: Date): boolean {
  return job.endsAt.getTime() <= now.getTime();
}

export function isUnresolved(job: JobRecord): boolean {
  return job.resolvedAt === null;
}

/** Whether the background sweep has already told the player about this job. */
export function isNotified(job: JobRecord): boolean {
  return job.notifiedAt !== null;
}

/**
 * docs/05-tech-stack.md: "Any command from the player checks for
 * unresolved, finished jobs and resolves them inside a transaction." This
 * is the pure selection logic that decides which of a ship's jobs qualify;
 * the db/ layer calls it inside the actual transaction.
 */
export function selectFinishedUnresolvedJobs(jobs: readonly JobRecord[], now: Date): JobRecord[] {
  return jobs.filter((job) => isUnresolved(job) && isFinished(job, now));
}

/**
 * docs/05-tech-stack.md: "a background sweep can push 'job complete'
 * notifications as a convenience" on top of resolve-on-next-command. Pure
 * selection logic for which jobs the sweep should notify about: finished,
 * still unresolved (no point notifying about something already resolved by
 * a command that beat the sweep to it), and not already notified. The
 * sweep must never resolve jobs itself, so this deliberately never looks at
 * anything beyond selecting candidates.
 */
export function selectJobsToNotify(jobs: readonly JobRecord[], now: Date): JobRecord[] {
  return jobs.filter((job) => isUnresolved(job) && isFinished(job, now) && !isNotified(job));
}

/**
 * docs/05-tech-stack.md: "Idempotent rewards: every reward has a unique key
 * (... `job:<id>`); insert-or-ignore before credit."
 */
export function rewardKey(jobId: number): string {
  return `job:${jobId}`;
}
