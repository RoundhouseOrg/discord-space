import { loadConfig } from './config';
import {
  JobNotificationSweep,
  JobsEngine,
  migrate,
  openDatabase,
  SqliteJobRewardsRepository,
  SqliteJobsRepository,
  SqliteShipsRepository,
} from './db';
import { createCommands, startBot, startJobNotificationSweep } from './discord';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase({ path: config.databasePath });
  migrate(db);

  const ships = new SqliteShipsRepository(db);
  const jobs = new SqliteJobsRepository(db);
  const jobsEngine = new JobsEngine(db, ships, jobs, new SqliteJobRewardsRepository(db));
  const commands = createCommands(jobsEngine);

  const client = await startBot(config.discordToken, commands);

  // docs/05-tech-stack.md: "a background sweep can push 'job complete'
  // notifications as a convenience" on top of resolve-on-next-command.
  const jobNotificationSweep = new JobNotificationSweep(db, jobs, ships);
  startJobNotificationSweep(client, jobNotificationSweep, config.jobSweepIntervalMs);

  console.log('discord-space bot started.');
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Fatal error starting discord-space:', error);
    process.exitCode = 1;
  });
}
