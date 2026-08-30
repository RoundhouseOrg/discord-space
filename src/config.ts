import 'dotenv/config';

/**
 * Runtime configuration for the bot process. Kept small and explicit so it's
 * easy to see everything the process depends on from the environment.
 */
export interface AppConfig {
  readonly discordToken: string;
  readonly databasePath: string;
  /** How often the background job-notification sweep runs (docs/05-tech-stack.md, issue #6). */
  readonly jobSweepIntervalMs: number;
}

const DEFAULT_DATABASE_PATH = './data/discord-space.sqlite';
const DEFAULT_JOB_SWEEP_INTERVAL_MS = 60_000;

/**
 * Reads configuration from environment variables. Accepts an explicit `env`
 * for testability; defaults to `process.env`.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const discordToken = env.DISCORD_TOKEN;
  if (!discordToken) {
    throw new Error('DISCORD_TOKEN environment variable is required.');
  }

  const jobSweepIntervalMs = env.JOB_SWEEP_INTERVAL_MS
    ? Number(env.JOB_SWEEP_INTERVAL_MS)
    : DEFAULT_JOB_SWEEP_INTERVAL_MS;
  if (!Number.isFinite(jobSweepIntervalMs) || jobSweepIntervalMs <= 0) {
    throw new Error('JOB_SWEEP_INTERVAL_MS must be a positive number.');
  }

  return {
    discordToken,
    databasePath: env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
    jobSweepIntervalMs,
  };
}
