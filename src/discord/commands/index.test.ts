import { describe, expect, it } from 'vitest';
import { migrate, openDatabase, JobsEngine, SqliteShipsRepository, SqliteJobsRepository, SqliteJobRewardsRepository } from '../../db';
import { createCommands } from './index';

function buildEngine(): JobsEngine {
  const db = openDatabase({ path: ':memory:' });
  migrate(db);
  return new JobsEngine(
    db,
    new SqliteShipsRepository(db),
    new SqliteJobsRepository(db),
    new SqliteJobRewardsRepository(db),
  );
}

describe('createCommands', () => {
  it('registers /launch, /mine and /status', () => {
    const commands = createCommands(buildEngine());
    expect(commands.map((command) => command.data.name).sort()).toEqual(['launch', 'mine', 'status']);
  });
});

describe('/status command', () => {
  function fakeInteraction(userId: string) {
    const replies: any[] = [];
    return {
      replies,
      interaction: { user: { id: userId }, reply: async (r: any) => void replies.push(r) } as any,
    };
  }

  it('tells a shipless player to /launch', async () => {
    const status = createCommands(buildEngine()).find((c) => c.data.name === 'status')!;
    const { interaction, replies } = fakeInteraction('u1');
    await status.execute(interaction);
    expect(replies[0].content).toContain('/launch');
  });

  it('replies with an embed for a docked ship', async () => {
    const engine = buildEngine();
    engine.launch('u1', 'prospector', new Date());
    const status = createCommands(engine).find((c) => c.data.name === 'status')!;
    const { interaction, replies } = fakeInteraction('u1');
    await status.execute(interaction);
    const embed = replies[0].embeds[0].toJSON();
    expect(embed.fields.map((f: any) => f.value).join('|')).toContain('Docked, no active job');
  });

  it('shows the active job ETA', async () => {
    const engine = buildEngine();
    engine.launch('u1', 'prospector', new Date());
    engine.startMining('u1', new Date());
    const status = createCommands(engine).find((c) => c.data.name === 'status')!;
    const { interaction, replies } = fakeInteraction('u1');
    await status.execute(interaction);
    expect(JSON.stringify(replies[0].embeds[0].toJSON())).toContain('ETA');
  });
});
