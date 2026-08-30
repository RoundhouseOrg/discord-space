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
  it('registers /launch and /mine (issue #3)', () => {
    const commands = createCommands(buildEngine());
    expect(commands.map((command) => command.data.name).sort()).toEqual(['launch', 'mine']);
  });
});
