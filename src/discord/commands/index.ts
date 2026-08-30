import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

/** Contract every slash command implements. */
export interface Command {
  readonly data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

/** Registered slash commands. Empty until gameplay commands land. */
export const commands: readonly Command[] = [];
