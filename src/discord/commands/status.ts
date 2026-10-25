import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { JobsEngine } from '../../db/jobs-engine';
import type { Command } from './index';
import { describeResolvedJobs, formatDuration } from './format';

/** docs/04-game-design.md: "on return (/status or any command)". */
export function createStatusCommand(engine: JobsEngine): Command {
  const data = new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show your ship, cargo, credits and active job.');

  return {
    data,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      const result = engine.status(interaction.user.id, new Date());
      const resolvedNote = describeResolvedJobs(result.resolved);

      if (!result.ok) {
        await interaction.reply({
          content: `${resolvedNote}You don't have a ship yet. Run \`/launch\` first.`,
          ephemeral: true,
        });
        return;
      }

      const { status } = result;
      const cargo = status.cargo.length
        ? status.cargo.map((c) => `${c.commodity}: ${c.tonnes}t`).join('\n')
        : 'Empty';
      const job = status.activeJob
        ? `${status.activeJob.type} — ETA ${formatDuration(status.activeJob.remainingMs)}`
        : 'Docked, no active job';

      const embed = new EmbedBuilder()
        .setTitle('Ship status')
        .addFields(
          { name: 'Hull', value: `${status.hullName} (${status.role})`, inline: true },
          { name: 'Credits', value: String(status.credits), inline: true },
          { name: 'Cargo', value: cargo },
          { name: 'Active job', value: job },
        );

      await interaction.reply({
        ...(resolvedNote ? { content: resolvedNote.trimEnd() } : {}),
        embeds: [embed],
      });
    },
  };
}
