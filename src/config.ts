import 'dotenv/config';

/**
 * Runtime configuration for the bot process. Kept small and explicit so it's
 * easy to see everything the process depends on from the environment.
 */
export interface AppConfig {
  readonly discordToken: string;
  readonly databasePath: string;
}

const DEFAULT_DATABASE_PATH = './data/discord-space.sqlite';

/**
 * Reads configuration from environment variables. Accepts an explicit `env`
 * for testability; defaults to `process.env`.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const discordToken = env.DISCORD_TOKEN;
  if (!discordToken) {
    throw new Error('DISCORD_TOKEN environment variable is required.');
  }

  return {
    discordToken,
    databasePath: env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
  };
}
