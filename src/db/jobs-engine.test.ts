import { describe, expect, it } from 'vitest';
import { MINING_JOB_DURATION_MS, MINING_JOB_YIELD_TONNES } from '../engine/jobs';
import { STARTER_CREDITS } from '../engine/progression';
import { openDatabase, type SqliteDatabase } from './connection';
import { JobsEngine } from './jobs-engine';
import { migrate } from './migrate';
import { SqliteJobRewardsRepository } from './repositories/job-rewards-repository';
import { SqliteJobsRepository } from './repositories/jobs-repository';
import { SqliteShipsRepository } from './repositories/ships-repository';

function buildEngine(): { db: SqliteDatabase; engine: JobsEngine } {
  const db = openDatabase({ path: ':memory:' });
  migrate(db);
  const engine = new JobsEngine(
    db,
    new SqliteShipsRepository(db),
    new SqliteJobsRepository(db),
    new SqliteJobRewardsRepository(db),
  );
  return { db, engine };
}

const OWNER = 'discord-user-1';
const T0 = new Date('2026-01-01T00:00:00Z');

describe('JobsEngine.launch', () => {
  it('creates a ship with the chosen starter hull, its role, and the starter balance', () => {
    const { engine } = buildEngine();
    const result = engine.launch(OWNER, 'prospector', T0);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.ship.hullId).toBe('prospector');
    expect(result.ship.role).toBe('miner');
    expect(result.ship.credits).toBe(STARTER_CREDITS);
    expect(result.ship.cargoOreTonnes).toBe(0);
  });

  it('refuses a second launch for the same owner', () => {
    const { engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    const result = engine.launch(OWNER, 'freighter', T0);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected refusal');
    expect(result.reason).toBe('already-launched');
  });

  it('rejects an unknown hull id', () => {
    const { engine } = buildEngine();
    const result = engine.launch(OWNER, 'death-star', T0);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected refusal');
    expect(result.reason).toBe('unknown-hull');
  });
});

describe('JobsEngine.startMining', () => {
  it('refuses to start without a ship', () => {
    const { engine } = buildEngine();
    const result = engine.startMining(OWNER, T0);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected refusal');
    expect(result.reason).toBe('no-ship');
  });

  it('starts a job ending durationMs after now, per docs/04-game-design.md', () => {
    const { engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    const result = engine.startMining(OWNER, T0);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.job.startedAt.getTime()).toBe(T0.getTime());
    expect(result.job.endsAt.getTime()).toBe(T0.getTime() + MINING_JOB_DURATION_MS);
    expect(result.job.resolvedAt).toBeNull();
  });

  it('refuses a second job while one is already active ("only one active job per ship")', () => {
    const { engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);
    const result = engine.startMining(OWNER, new Date(T0.getTime() + 1000));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected refusal');
    expect(result.reason).toBe('job-in-progress');
  });
});

describe('JobsEngine.resolvePendingJobs', () => {
  it('does nothing before the job ends', () => {
    const { engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);

    const almostDone = new Date(T0.getTime() + MINING_JOB_DURATION_MS - 1);
    const resolved = engine.resolvePendingJobs(OWNER, almostDone);
    expect(resolved).toEqual([]);
  });

  it('credits the reward once the job has finished', () => {
    const { db, engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);

    const done = new Date(T0.getTime() + MINING_JOB_DURATION_MS);
    const resolved = engine.resolvePendingJobs(OWNER, done);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.credited).toBe(true);
    expect(resolved[0]?.job.resolvedAt?.getTime()).toBe(done.getTime());

    const ship = new SqliteShipsRepository(db).findByOwner(OWNER);
    expect(ship?.cargoOreTonnes).toBe(MINING_JOB_YIELD_TONNES);
  });

  it('is safe to call from every subsequent command: a resolved job is not re-resolved', () => {
    const { engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);
    const done = new Date(T0.getTime() + MINING_JOB_DURATION_MS);

    engine.resolvePendingJobs(OWNER, done);
    const secondCall = engine.resolvePendingJobs(OWNER, done);

    expect(secondCall).toEqual([]);
  });

  it('does not double-credit even if the same job is resolved twice (idempotent reward key)', () => {
    const { db, engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    const started = engine.startMining(OWNER, T0);
    if (!started.ok) throw new Error('expected job to start');
    const jobId = started.job.id;
    const done = new Date(T0.getTime() + MINING_JOB_DURATION_MS);

    const first = engine.resolvePendingJobs(OWNER, done);
    expect(first).toHaveLength(1);
    expect(first[0]?.credited).toBe(true);

    // Simulate the job becoming "unresolved" again (e.g. a race between two
    // in-flight commands both reading the row before either wrote
    // resolved_at back). The reward ledger, not the resolved_at flag, is
    // what must prevent a second credit.
    db.prepare('UPDATE jobs SET resolved_at = NULL WHERE id = ?').run(jobId);

    const second = engine.resolvePendingJobs(OWNER, done);
    expect(second).toHaveLength(1);
    expect(second[0]?.credited).toBe(false);

    const ship = new SqliteShipsRepository(db).findByOwner(OWNER);
    expect(ship?.cargoOreTonnes).toBe(MINING_JOB_YIELD_TONNES);
  });

  it('lets a new job start after the previous one resolves', () => {
    const { engine } = buildEngine();
    engine.launch(OWNER, 'prospector', T0);
    engine.startMining(OWNER, T0);
    const done = new Date(T0.getTime() + MINING_JOB_DURATION_MS);

    // startMining itself resolves pending jobs first, so this should
    // succeed once the first job is finished.
    const result = engine.startMining(OWNER, done);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.resolved).toHaveLength(1);
  });
});

