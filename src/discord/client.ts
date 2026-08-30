import { Client, GatewayIntentBits } from 'discord.js';

/** Builds the discord.js client. No handlers wired up yet — scaffold only. */
export function createDiscordClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds],
  });
}
