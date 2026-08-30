import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import type { JobsEngine } from '../../db/jobs-engine';
import { createLaunchCommand } from './launch';
import { createMineCommand } from './mine';

/**
 * `SlashCommandBuilder` narrows to `SlashCommandOptionsOnlyBuilder` once an
 * option is added (it drops subcommand methods that no longer apply); the
 * command contract accepts either so commands with options type-check.
 */
export type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

/** Contract every slash command implements. */
export interface Command {
  readonly data: CommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

/** Builds the registered slash commands, wired to the jobs engine (issue #3). */
export function createCommands(engine: JobsEngine): readonly Command[] {
  return [createLaunchCommand(engine), createMineCommand(engine)];
}
