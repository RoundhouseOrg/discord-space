import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { JobsEngine } from '../../db/jobs-engine';
import type { Command } from './index';
import { describeResolvedJobs, formatDuration } from './format';

/** docs/04-game-design.md: "Mine ... needs an asteroid field ... 10-30 min." */
export function createMineCommand(engine: JobsEngine): Command {
  const data = new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Start a mining run.');

  return {
    data,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      const result = engine.startMining(interaction.user.id, new Date());
      const resolvedNote = describeResolvedJobs(result.resolved);

      if (!result.ok) {
        if (result.reason === 'no-ship') {
          await interaction.reply({
            content: `${resolvedNote}You don't have a ship yet. Run \`/launch\` first.`,
            ephemeral: true,
          });
          return;
        }
        const remainingMs = result.job.endsAt.getTime() - Date.now();
        await interaction.reply({
          content: `${resolvedNote}Your ship is already on a job. ETA ${formatDuration(Math.max(remainingMs, 0))}.`,
          ephemeral: true,
        });
        return;
      }

      const eta = formatDuration(result.job.endsAt.getTime() - result.job.startedAt.getTime());
      await interaction.reply(
        `${resolvedNote}Mining laser online. ETA ${eta} — check back with any command once it's done.`,
      );
    },
  };
}
