import { describe, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import { MINING_JOB_YIELD_TONNES, type JobRecord } from '../engine/jobs';
import type { JobNotification } from '../db/job-notification-sweep';
import { deliverJobNotification } from './job-notifications';

const OWNER = 'discord-user-1';

function job(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: 1,
    shipId: 1,
    type: 'mine',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    endsAt: new Date('2026-01-01T00:20:00Z'),
    resolvedAt: null,
    notifiedAt: new Date('2026-01-01T00:20:00Z'),
    originMessage: null,
    reward: { oreTonnes: MINING_JOB_YIELD_TONNES },
    ...overrides,
  };
}

function notification(overrides: Partial<JobNotification> = {}): JobNotification {
  return { ownerId: OWNER, job: job(), ...overrides };
}

/** Builds a fake discord.js `Client` exposing only what `deliverJobNotification` touches. */
function buildClient(options: {
  readonly channel?: unknown;
  readonly channelsFetch?: (id: string) => Promise<unknown>;
  readonly userSend?: ReturnType<typeof vi.fn>;
  readonly usersFetch?: (id: string) => Promise<unknown>;
} = {}): { client: Client; channelsFetch: ReturnType<typeof vi.fn>; usersFetch: ReturnType<typeof vi.fn> } {
  const channelsFetch =
    options.channelsFetch !== undefined
      ? vi.fn(options.channelsFetch)
      : vi.fn().mockResolvedValue(options.channel ?? null);
  const send = options.userSend ?? vi.fn().mockResolvedValue(undefined);
  const usersFetch =
    options.usersFetch !== undefined
      ? vi.fn(options.usersFetch)
      : vi.fn().mockResolvedValue({ send });
  const client = {
    channels: { fetch: channelsFetch },
    users: { fetch: usersFetch },
  } as unknown as Client;
  return { client, channelsFetch, usersFetch };
}

describe('deliverJobNotification', () => {
  it('edits the original message in place when it still exists, and never DMs', async () => {
    const edit = vi.fn().mockResolvedValue(undefined);
    const messagesFetch = vi.fn().mockResolvedValue({ edit });
    const channel = { isTextBased: () => true, messages: { fetch: messagesFetch } };
    const { client, usersFetch } = buildClient({ channel });

    const origin = { channelId: 'channel-1', messageId: 'message-1' };
    await deliverJobNotification(client, notification({ job: job({ originMessage: origin }) }));

    expect(messagesFetch).toHaveBeenCalledWith(origin.messageId);
    expect(edit).toHaveBeenCalledTimes(1);
    const [editedText] = edit.mock.calls[0] as [string];
    expect(editedText).toContain('Job complete');
    expect(usersFetch).not.toHaveBeenCalled();
  });

  it('DMs the player when the job has no recorded origin message', async () => {
    const { client, channelsFetch, usersFetch } = buildClient();

    await deliverJobNotification(client, notification({ job: job({ originMessage: null }) }));

    expect(channelsFetch).not.toHaveBeenCalled();
    expect(usersFetch).toHaveBeenCalledWith(OWNER);
  });

  it('falls back to a DM when the original message no longer exists', async () => {
    const messagesFetch = vi.fn().mockRejectedValue(new Error('Unknown Message'));
    const channel = { isTextBased: () => true, messages: { fetch: messagesFetch } };
    const send = vi.fn().mockResolvedValue(undefined);
    const { client, usersFetch } = buildClient({ channel, userSend: send });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const origin = { channelId: 'channel-1', messageId: 'gone' };
    await deliverJobNotification(client, notification({ job: job({ originMessage: origin }) }));

    expect(usersFetch).toHaveBeenCalledWith(OWNER);
    expect(send).toHaveBeenCalledTimes(1);
    const [dmText] = send.mock.calls[0] as [string];
    expect(dmText).toContain('Job complete');
    consoleError.mockRestore();
  });

  it('falls back to a DM when the original channel is gone or not editable', async () => {
    const { client, usersFetch } = buildClient({ channel: null });

    const origin = { channelId: 'deleted-channel', messageId: 'message-1' };
    await deliverJobNotification(client, notification({ job: job({ originMessage: origin }) }));

    expect(usersFetch).toHaveBeenCalledWith(OWNER);
  });

  it('never posts a new message, and swallows a DM failure without throwing', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Cannot send messages to this user'));
    const { client } = buildClient({ userSend: send, channel: null });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      deliverJobNotification(client, notification({ job: job({ originMessage: null }) })),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
