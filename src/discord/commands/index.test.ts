import type { ChatInputCommandInteraction } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { migrate, openDatabase, JobsEngine, SqliteShipsRepository, SqliteJobsRepository, SqliteJobRewardsRepository, SqliteStationMarketsRepository } from '../../db';
import { createCommands } from './index';

function buildDb() {
  const db = openDatabase({ path: ':memory:' });
  migrate(db);
  return db;
}

function buildEngine(db = buildDb()): JobsEngine {
  return new JobsEngine(
    db,
    new SqliteShipsRepository(db),
    new SqliteJobsRepository(db),
    new SqliteJobRewardsRepository(db),
  );
}

function buildCommands(engine: JobsEngine, db = buildDb()) {
  return createCommands(engine, new SqliteStationMarketsRepository(db));
}

describe('createCommands', () => {
  it('registers /launch, /mine, /status and /market', () => {
    const commands = buildCommands(buildEngine());
    expect(commands.map((command) => command.data.name).sort()).toEqual(['launch', 'market', 'mine', 'status']);
  });
});

interface ReplyPayload {
  content?: string;
  embeds: { toJSON(): { fields: { value: string }[] } }[];
}

describe('/status command', () => {
  function fakeInteraction(userId: string) {
    const replies: ReplyPayload[] = [];
    return {
      replies,
      interaction: {
        user: { id: userId },
        reply: async (r: ReplyPayload) => void replies.push(r),
      } as unknown as ChatInputCommandInteraction,
    };
  }

  it('tells a shipless player to /launch', async () => {
    const status = buildCommands(buildEngine()).find((c) => c.data.name === 'status')!;
    const { interaction, replies } = fakeInteraction('u1');
    await status.execute(interaction);
    expect(replies[0]!.content).toContain('/launch');
  });

  it('replies with an embed for a docked ship', async () => {
    const engine = buildEngine();
    engine.launch('u1', 'prospector', new Date());
    const status = buildCommands(engine).find((c) => c.data.name === 'status')!;
    const { interaction, replies } = fakeInteraction('u1');
    await status.execute(interaction);
    const embed = replies[0]!.embeds[0]!.toJSON();
    expect(embed.fields.map((f: { value: string }) => f.value).join('|')).toContain('Docked, no active job');
  });

  it('shows the active job ETA', async () => {
    const engine = buildEngine();
    engine.launch('u1', 'prospector', new Date());
    engine.startMining('u1', new Date());
    const status = buildCommands(engine).find((c) => c.data.name === 'status')!;
    const { interaction, replies } = fakeInteraction('u1');
    await status.execute(interaction);
    expect(JSON.stringify(replies[0]!.embeds[0]!.toJSON())).toContain('ETA');
  });
});

describe('/market command', () => {
  function fake(userId: string, guildId: string | null = 'g1') {
    const replies: ReplyPayload[] = [];
    return {
      replies,
      interaction: {
        user: { id: userId },
        guildId,
        reply: async (r: ReplyPayload) => void replies.push(r),
      } as unknown as ChatInputCommandInteraction,
    };
  }

  it('tells a shipless player to /launch', async () => {
    const market = buildCommands(buildEngine()).find((c) => c.data.name === 'market')!;
    const { interaction, replies } = fake('u1');
    await market.execute(interaction);
    expect(replies[0]!.content).toContain('/launch');
  });

  it('lists every commodity in one embed', async () => {
    const engine = buildEngine();
    engine.launch('u1', 'prospector', new Date());
    const market = buildCommands(engine).find((c) => c.data.name === 'market')!;
    const { interaction, replies } = fake('u1');
    await market.execute(interaction);
    expect(replies[0]!.embeds).toHaveLength(1);
    const json = replies[0]!.embeds[0]!.toJSON() as unknown as { fields: { name: string; value: string }[] };
    expect(json.fields).toHaveLength(10);
    expect(json.fields[0]!.name).toBe('Gas (raw)');
    expect(json.fields[0]!.value).toContain('Buy');
  });
});
