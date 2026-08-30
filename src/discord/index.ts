import { Events, type Client } from 'discord.js';
import { createDiscordClient } from './client';
import type { Command } from './commands';

export { createDiscordClient };
export type { Command } from './commands';
export { createCommands } from './commands';

/**
 * Logs the bot in, registers `commands`, and dispatches
 * `interactionCreate` to them by name. Registration is global (no guild
 * scoping yet); Discord can take up to an hour to propagate global command
 * updates, which is fine for a bot with no per-guild command needs yet.
 */
export async function startBot(token: string, commands: readonly Command[] = []): Promise<Client> {
  const client = createDiscordClient();

  client.once(Events.ClientReady, (readyClient) => {
    readyClient.application.commands.set(commands.map((command) => command.data)).catch((error: unknown) => {
      console.error('Failed to register slash commands:', error);
    });
  });

  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.find((candidate) => candidate.data.name === interaction.commandName);
    if (!command) return;

    command.execute(interaction).catch(async (error: unknown) => {
      console.error(`Error executing command /${interaction.commandName}:`, error);
      const failure = { content: 'Something went wrong running that command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(failure);
      } else {
        await interaction.reply(failure);
      }
    });
  });

  await client.login(token);
  return client;
}
