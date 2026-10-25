import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { JobsEngine } from '../../db/jobs-engine';
import type { StationMarketsRepository } from '../../db/repositories/station-markets-repository';
import { formatMarketRow, marketRows } from '../../engine/economy';
import type { Command } from './index';
import { describeResolvedJobs } from './format';

/** docs/04-game-design.md: "/market — NPC station prices". Read-only; one default station per guild. */
export function createMarketCommand(engine: JobsEngine, markets: StationMarketsRepository): Command {
  const data = new SlashCommandBuilder()
    .setName('market')
    .setDescription("Show the station's commodity prices.");

  return {
    data,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      const now = new Date();
      const result = engine.status(interaction.user.id, now);
      const resolvedNote = describeResolvedJobs(result.resolved);

      if (!result.ok) {
        await interaction.reply({
          content: `${resolvedNote}You don't have a ship yet. Run \`/launch\` first.`,
          ephemeral: true,
        });
        return;
      }
      if (!interaction.guildId) {
        await interaction.reply({ content: 'Run `/market` in a server.', ephemeral: true });
        return;
      }

      const station = markets.readAndTick(interaction.guildId, now);
      const embed = new EmbedBuilder().setTitle('Station market').addFields(
        marketRows(station, now).map((row) => ({
          name: `${row.name} (${row.tier})`,
          value: formatMarketRow(row),
        })),
      );

      await interaction.reply({
        ...(resolvedNote ? { content: resolvedNote.trimEnd() } : {}),
        embeds: [embed],
      });
    },
  };
}
