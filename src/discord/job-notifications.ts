import type { Client } from 'discord.js';
import type { JobNotification, JobNotificationSweep } from '../db/job-notification-sweep';
import { formatDuration } from './commands/format';

/**
 * Delivers a single sweep notification by DM (docs/07-open-questions.md
 * leaves DM vs. edit-the-original-message open; DM is the only option that
 * needs no stored message reference, so it's the simplest default here).
 *
 * This is pure convenience: if the DM fails (closed DMs, user shares no
 * server with the bot anymore, etc.) nothing is lost — the job was already
 * marked notified by the sweep, and the reward still lands normally the
 * next time the player runs any command, per docs/05-tech-stack.md.
 */
export async function deliverJobNotification(client: Client, notification: JobNotification): Promise<void> {
  const { ownerId, job } = notification;
  const tookMs = job.endsAt.getTime() - job.startedAt.getTime();
  try {
    const user = await client.users.fetch(ownerId);
    await user.send(
      `Job complete: your ${job.type} run (${formatDuration(tookMs)}) has finished. ` +
        `Run any command to collect your reward.`,
    );
  } catch (error) {
    console.error(`Failed to deliver job-complete notification to ${ownerId}:`, error);
  }
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
