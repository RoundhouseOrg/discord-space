import { describe, expect, it } from 'vitest';
import {
  isFinished,
  MINING_JOB_DURATION_MS,
  MINING_JOB_YIELD_TONNES,
  planMiningJob,
  rewardKey,
  selectFinishedUnresolvedJobs,
  selectJobsToNotify,
  type JobRecord,
} from './index';

function job(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: 1,
    shipId: 1,
    type: 'mine',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    endsAt: new Date('2026-01-01T00:20:00Z'),
    resolvedAt: null,
    notifiedAt: null,
    originMessage: null,
    reward: { oreTonnes: MINING_JOB_YIELD_TONNES },
    ...overrides,
  };
}

describe('planMiningJob', () => {
  it('matches the docs/04 placeholder duration and docs/12 placeholder yield', () => {
    const plan = planMiningJob();
    expect(plan.type).toBe('mine');
    expect(plan.durationMs).toBe(MINING_JOB_DURATION_MS);
    expect(plan.reward.oreTonnes).toBe(MINING_JOB_YIELD_TONNES);
  });

  it('picks a duration within the docs/04 10-30 minute range', () => {
    expect(MINING_JOB_DURATION_MS).toBeGreaterThanOrEqual(10 * 60 * 1000);
    expect(MINING_JOB_DURATION_MS).toBeLessThanOrEqual(30 * 60 * 1000);
  });
});

describe('isFinished', () => {
  it('is false before ends_at', () => {
    const j = job({ endsAt: new Date('2026-01-01T00:20:00Z') });
    expect(isFinished(j, new Date('2026-01-01T00:19:59.999Z'))).toBe(false);
  });

  it('is true exactly at ends_at', () => {
    const j = job({ endsAt: new Date('2026-01-01T00:20:00Z') });
    expect(isFinished(j, new Date('2026-01-01T00:20:00Z'))).toBe(true);
  });

  it('is true well after ends_at', () => {
    const j = job({ endsAt: new Date('2026-01-01T00:20:00Z') });
    expect(isFinished(j, new Date('2026-01-02T00:20:00Z'))).toBe(true);
  });
});

describe('selectFinishedUnresolvedJobs', () => {
  const now = new Date('2026-01-01T01:00:00Z');

  it('selects jobs that are finished and unresolved', () => {
    const finished = job({ id: 1, endsAt: new Date('2026-01-01T00:20:00Z'), resolvedAt: null });
    expect(selectFinishedUnresolvedJobs([finished], now)).toEqual([finished]);
  });

  it('excludes jobs that are not finished yet', () => {
    const pending = job({ id: 2, endsAt: new Date('2026-01-01T02:00:00Z'), resolvedAt: null });
    expect(selectFinishedUnresolvedJobs([pending], now)).toEqual([]);
  });

  it('excludes jobs that are already resolved, even if finished', () => {
    const resolved = job({
      id: 3,
      endsAt: new Date('2026-01-01T00:20:00Z'),
      resolvedAt: new Date('2026-01-01T00:21:00Z'),
    });
    expect(selectFinishedUnresolvedJobs([resolved], now)).toEqual([]);
  });

  it('only returns the jobs that qualify out of a mixed list', () => {
    const finished = job({ id: 1, endsAt: new Date('2026-01-01T00:20:00Z'), resolvedAt: null });
    const pending = job({ id: 2, endsAt: new Date('2026-01-01T02:00:00Z'), resolvedAt: null });
    const resolved = job({
      id: 3,
      endsAt: new Date('2026-01-01T00:20:00Z'),
      resolvedAt: new Date('2026-01-01T00:21:00Z'),
    });
    expect(selectFinishedUnresolvedJobs([finished, pending, resolved], now)).toEqual([finished]);
  });
});

describe('selectJobsToNotify', () => {
  const now = new Date('2026-01-01T01:00:00Z');

  it('selects jobs that are finished, unresolved, and not yet notified', () => {
    const finished = job({ id: 1, endsAt: new Date('2026-01-01T00:20:00Z'), resolvedAt: null, notifiedAt: null });
    expect(selectJobsToNotify([finished], now)).toEqual([finished]);
  });

  it('excludes jobs that are not finished yet', () => {
    const pending = job({ id: 2, endsAt: new Date('2026-01-01T02:00:00Z'), resolvedAt: null, notifiedAt: null });
    expect(selectJobsToNotify([pending], now)).toEqual([]);
  });

  it('excludes jobs that are already resolved, even if unnotified', () => {
    const resolved = job({
      id: 3,
      endsAt: new Date('2026-01-01T00:20:00Z'),
      resolvedAt: new Date('2026-01-01T00:21:00Z'),
      notifiedAt: null,
    });
    expect(selectJobsToNotify([resolved], now)).toEqual([]);
  });

  it('excludes jobs that have already been notified, even if still unresolved', () => {
    const notified = job({
      id: 4,
      endsAt: new Date('2026-01-01T00:20:00Z'),
      resolvedAt: null,
      notifiedAt: new Date('2026-01-01T00:21:00Z'),
    });
    expect(selectJobsToNotify([notified], now)).toEqual([]);
  });

  it('only returns the jobs that qualify out of a mixed list', () => {
    const finished = job({ id: 1, endsAt: new Date('2026-01-01T00:20:00Z'), resolvedAt: null, notifiedAt: null });
    const pending = job({ id: 2, endsAt: new Date('2026-01-01T02:00:00Z'), resolvedAt: null, notifiedAt: null });
    const resolved = job({
      id: 3,
      endsAt: new Date('2026-01-01T00:20:00Z'),
      resolvedAt: new Date('2026-01-01T00:21:00Z'),
      notifiedAt: null,
    });
    const notified = job({
      id: 4,
      endsAt: new Date('2026-01-01T00:20:00Z'),
      resolvedAt: null,
      notifiedAt: new Date('2026-01-01T00:21:00Z'),
    });
    expect(selectJobsToNotify([finished, pending, resolved, notified], now)).toEqual([finished]);
  });
});

describe('rewardKey', () => {
  it('is namespaced by job id, per docs/05-tech-stack.md', () => {
    expect(rewardKey(42)).toBe('job:42');
  });

  it('is distinct per job id', () => {
    expect(rewardKey(1)).not.toBe(rewardKey(2));
  });
});
