import type { Client } from 'discord.js';
import { createDiscordClient } from './client';

export { createDiscordClient };

/** Logs the bot in and returns the connected client. */
export async function startBot(token: string): Promise<Client> {
  const client = createDiscordClient();
  await client.login(token);
  return client;
}
