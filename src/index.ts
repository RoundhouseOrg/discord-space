import { loadConfig } from './config';
import {
  JobsEngine,
  migrate,
  openDatabase,
  SqliteJobRewardsRepository,
  SqliteJobsRepository,
  SqliteShipsRepository,
} from './db';
import { createCommands, startBot } from './discord';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase({ path: config.databasePath });
  migrate(db);

  const jobsEngine = new JobsEngine(
    db,
    new SqliteShipsRepository(db),
    new SqliteJobsRepository(db),
    new SqliteJobRewardsRepository(db),
  );
  const commands = createCommands(jobsEngine);

  await startBot(config.discordToken, commands);
  console.log('discord-space bot started.');
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Fatal error starting discord-space:', error);
    process.exitCode = 1;
  });
}
