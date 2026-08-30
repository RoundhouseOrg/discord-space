import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { JobsEngine } from '../../db/jobs-engine';
import { findStarterHull, STARTER_HULLS } from '../../engine/progression';
import type { Command } from './index';
import { describeResolvedJobs } from './format';

/** docs/04-game-design.md: "/launch pick a starter hull + role." */
export function createLaunchCommand(engine: JobsEngine): Command {
  const data = new SlashCommandBuilder()
    .setName('launch')
    .setDescription('Pick a starter hull and launch your ship.')
    .addStringOption((option) => {
      option.setName('hull').setDescription('The starter hull to fly').setRequired(true);
      for (const hull of STARTER_HULLS) {
        option.addChoices({ name: `${hull.name} — ${hull.strength}`, value: hull.id });
      }
      return option;
    });

  return {
    data,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      const hullId = interaction.options.getString('hull', true);
      const result = engine.launch(interaction.user.id, hullId, new Date());
      const resolvedNote = describeResolvedJobs(result.resolved);

      if (!result.ok) {
        if (result.reason === 'already-launched') {
          await interaction.reply({
            content: `${resolvedNote}You already have a ship: the ${result.ship.hullId} (${result.ship.role}).`,
            ephemeral: true,
          });
          return;
        }
        await interaction.reply({
          content: `${resolvedNote}Unknown hull \`${hullId}\`. Pick one from the list.`,
          ephemeral: true,
        });
        return;
      }

      const hull = findStarterHull(result.ship.hullId);
      await interaction.reply(
        `${resolvedNote}Welcome aboard the **${hull?.name ?? result.ship.hullId}** ` +
          `(${result.ship.role}). Starting balance: ${result.ship.credits} cr. Try \`/mine\` to get to work.`,
      );
    },
  };
}
