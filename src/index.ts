import { loadConfig } from './config';
import { migrate, openDatabase } from './db';
import { startBot } from './discord';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase({ path: config.databasePath });
  migrate(db);

  await startBot(config.discordToken);
  console.log('discord-space bot started.');
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Fatal error starting discord-space:', error);
    process.exitCode = 1;
  });
}
