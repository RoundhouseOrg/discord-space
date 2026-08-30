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

  it('defaults the job sweep interval to one minute', () => {
    const config = loadConfig({ DISCORD_TOKEN: 'test-token' });
    expect(config.jobSweepIntervalMs).toBe(60_000);
  });

  it('honors a JOB_SWEEP_INTERVAL_MS override', () => {
    const config = loadConfig({ DISCORD_TOKEN: 'test-token', JOB_SWEEP_INTERVAL_MS: '5000' });
    expect(config.jobSweepIntervalMs).toBe(5000);
  });

  it('rejects a non-positive JOB_SWEEP_INTERVAL_MS', () => {
    expect(() => loadConfig({ DISCORD_TOKEN: 'test-token', JOB_SWEEP_INTERVAL_MS: '0' })).toThrow(
      /JOB_SWEEP_INTERVAL_MS/,
    );
  });

  it('rejects a non-numeric JOB_SWEEP_INTERVAL_MS', () => {
    expect(() => loadConfig({ DISCORD_TOKEN: 'test-token', JOB_SWEEP_INTERVAL_MS: 'soon' })).toThrow(
      /JOB_SWEEP_INTERVAL_MS/,
    );
  });
});
