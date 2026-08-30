import { describe, expect, it } from 'vitest';
import { MINING_JOB_DURATION_MS } from '../engine/jobs';
import { openDatabase, type SqliteDatabase } from './connection';
import { JobNotificationSweep } from './job-notification-sweep';
import { JobsEngine } from './jobs-engine';
import { migrate } from './migrate';
import { SqliteJobRewardsRepository } from './repositories/job-rewards-repository';
import { SqliteJobsRepository } from './repositories/jobs-repository';
import { SqliteShipsRepository } from './repositories/ships-repository';

function buildHarness(): { db: SqliteDatabase; engine: JobsEngine; sweep: JobNotificationSweep } {
  const db = openDatabase({ path: ':memory:' });
  migrate(db);
  const ships = new SqliteShipsRepository(db);
  const jobs = new SqliteJobsRepository(db);
  const engine = new JobsEngine(db, ships, jobs, new SqliteJobRewardsRepository(db));
  const sweep = new JobNotificationSweep(db, jobs, ships);
  return { db, engine, sweep };
}

const OWNER = 'discord-user-1';
const OTHER_OWNER = 'discord-user-2';
const T0 = new Date('2026-01-01T00:00:00Z');
const DONE = new Date(T0.getTime() + MINING_JOB_DURATION_MS);

describe('JobNotificationSweep.sweep', () => {
  it('finds nothing before any job has finished', () => {
    const { engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);

    const almostDone = new Date(DONE.getTime() - 1);
    expect(sweep.sweep(almostDone)).toEqual([]);
  });

  it('notifies the owner once a job has finished and is still unresolved', () => {
    const { engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    const started = engine.startMining(OWNER, T0);
    if (!started.ok) throw new Error('expected job to start');

    const notifications = sweep.sweep(DONE);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.ownerId).toBe(OWNER);
    expect(notifications[0]?.job.id).toBe(started.job.id);
  });

  it('does not notify twice for the same job on a later sweep tick', () => {
    const { engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);

    const first = sweep.sweep(DONE);
    expect(first).toHaveLength(1);

    const later = new Date(DONE.getTime() + 60_000);
    const second = sweep.sweep(later);
    expect(second).toEqual([]);
  });

  it('does not notify about a job the player already resolved via a command', () => {
    const { engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);

    // Player runs another command before the sweep gets to it; resolution
    // happens exactly as it always has, inside JobsEngine.
    engine.resolvePendingJobs(OWNER, DONE);

    expect(sweep.sweep(DONE)).toEqual([]);
  });

  it('never resolves the job or credits the reward itself', () => {
    const { db, engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);

    sweep.sweep(DONE);

    const row = db.prepare('SELECT resolved_at, notified_at FROM jobs ORDER BY id DESC LIMIT 1').get() as {
      resolved_at: number | null;
      notified_at: number | null;
    };
    expect(row.resolved_at).toBeNull();
    expect(row.notified_at).toBe(DONE.getTime());

    const ship = new SqliteShipsRepository(db).findByOwner(OWNER);
    expect(ship?.cargoOreTonnes).toBe(0);

    // The reward still lands the normal way, on the player's next command,
    // once the sweep has already (harmlessly) notified them.
    const resolved = engine.resolvePendingJobs(OWNER, DONE);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.credited).toBe(true);
    const shipAfter = new SqliteShipsRepository(db).findByOwner(OWNER);
    expect(shipAfter?.cargoOreTonnes).toBeGreaterThan(0);
  });

  it('surfaces the recorded origin message so the sweep can edit it in place (issue #13)', () => {
    const { engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    const started = engine.startMining(OWNER, T0);
    if (!started.ok) throw new Error('expected job to start');
    engine.recordJobMessage(started.job.id, { channelId: 'channel-1', messageId: 'message-1' });

    const notifications = sweep.sweep(DONE);

    expect(notifications[0]?.job.originMessage).toEqual({ channelId: 'channel-1', messageId: 'message-1' });
  });

  it('sweeps across every player, not just one', () => {
    const { engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);
    engine.launch(OTHER_OWNER, 'prospector', T0);
    engine.startMining(OTHER_OWNER, T0);

    const notifications = sweep.sweep(DONE);

    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.ownerId).sort()).toEqual([OWNER, OTHER_OWNER].sort());
  });

  it('ignores jobs that have not finished yet even when other jobs have', () => {
    const { engine, sweep } = buildHarness();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);
    engine.launch(OTHER_OWNER, 'prospector', DONE);
    engine.startMining(OTHER_OWNER, DONE);

    const notifications = sweep.sweep(DONE);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.ownerId).toBe(OWNER);
  });
});
