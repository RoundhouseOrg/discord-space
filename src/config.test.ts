import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('throws when DISCORD_TOKEN is missing', () => {
    expect(() => loadConfig({})).toThrow(/DISCORD_TOKEN/);
  });

  it('applies the default database path when only the token is set', () => {
    const config = loadConfig({ DISCORD_TOKEN: 'test-token' });
    expect(config.discordToken).toBe('test-token');
    expect(config.databasePath).toBe('./data/discord-space.sqlite');
  });

  it('honors a DATABASE_PATH override', () => {
    const config = loadConfig({ DISCORD_TOKEN: 'test-token', DATABASE_PATH: '/tmp/discord-space.sqlite' });
    expect(config.databasePath).toBe('/tmp/discord-space.sqlite');
  });
});
