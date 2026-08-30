import type { Client } from 'discord.js';
import type { JobOriginMessage } from '../engine/jobs';
import type { JobNotification, JobNotificationSweep } from '../db/job-notification-sweep';
import { formatDuration } from './commands/format';

function notificationText(notification: JobNotification): string {
  const { job } = notification;
  const tookMs = job.endsAt.getTime() - job.startedAt.getTime();
  return (
    `Job complete: your ${job.type} run (${formatDuration(tookMs)}) has finished. ` +
    `Run any command to collect your reward.`
  );
}

/**
 * Tries to edit the message that announced the job starting. Returns
 * whether it succeeded, so the caller can fall back to a DM. Any failure
 * (channel gone, message deleted, no permission to edit, etc.) is treated
 * as "couldn't edit" rather than thrown — the fallback handles it.
 */
async function tryEditOriginalMessage(client: Client, origin: JobOriginMessage, text: string): Promise<boolean> {
  try {
    const channel = await client.channels.fetch(origin.channelId);
    if (!channel || !channel.isTextBased()) return false;
    const message = await channel.messages.fetch(origin.messageId);
    await message.edit(text);
    return true;
  } catch (error) {
    console.error(
      `Failed to edit original message for job notification (channel ${origin.channelId}, message ${origin.messageId}):`,
      error,
    );
    return false;
  }
}

async function deliverByDm(client: Client, ownerId: string, text: string): Promise<void> {
  try {
    const user = await client.users.fetch(ownerId);
    await user.send(text);
  } catch (error) {
    console.error(`Failed to deliver job-complete notification to ${ownerId}:`, error);
  }
}

/**
 * Delivers a single sweep notification (issue #13, replacing the DM-only
 * v1 default from issue #6 — see docs/07-open-questions.md): edit the job's
 * original message in place when it still exists and can be edited, so the
 * completion note lands where the player already was instead of adding
 * channel noise. Falls back to a DM only when the original message is gone
 * or can't be edited. Never posts a new message to the channel.
 *
 * This is pure convenience either way: if both delivery paths fail (edit
 * fails and the DM also fails — closed DMs, user shares no server with the
 * bot anymore, etc.) nothing is lost — the job was already marked notified
 * by the sweep, and the reward still lands normally the next time the
 * player runs any command, per docs/05-tech-stack.md.
 */
export async function deliverJobNotification(client: Client, notification: JobNotification): Promise<void> {
  const { ownerId, job } = notification;
  const text = notificationText(notification);

  if (job.originMessage && (await tryEditOriginalMessage(client, job.originMessage, text))) {
    return;
  }

  await deliverByDm(client, ownerId, text);
}

/**
 * Runs `sweep` on an interval and delivers whatever it finds. Returns the
 * timer so callers can stop it (e.g. in tests, or on graceful shutdown).
 * Resolution semantics are untouched by any of this — see
 * `JobNotificationSweep`'s own docs for why the sweep can't double-resolve.
 */
export function startJobNotificationSweep(
  client: Client,
  sweep: JobNotificationSweep,
  intervalMs: number,
): NodeJS.Timeout {
  return setInterval(() => {
    let notifications: readonly JobNotification[];
    try {
      notifications = sweep.sweep(new Date());
    } catch (error) {
      console.error('Job notification sweep failed:', error);
      return;
    }
    for (const notification of notifications) {
      void deliverJobNotification(client, notification);
    }
  }, intervalMs);
}
