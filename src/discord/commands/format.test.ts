import { describe, expect, it } from 'vitest';
import type { ResolvedJob } from '../../db/jobs-engine';
import type { JobRecord } from '../../engine/jobs';
import { describeResolvedJobs, formatDuration } from './format';

function job(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: 1,
    shipId: 1,
    type: 'mine',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    endsAt: new Date('2026-01-01T00:20:00Z'),
    resolvedAt: new Date('2026-01-01T00:20:00Z'),
    notifiedAt: null,
    originMessage: null,
    reward: { oreTonnes: 10 },
    ...overrides,
  };
}

describe('describeResolvedJobs', () => {
  it('is empty when nothing resolved', () => {
    expect(describeResolvedJobs([])).toBe('');
  });

  it('reports the ore reward when the job was actually credited', () => {
    const resolved: ResolvedJob[] = [{ job: job(), credited: true }];
    expect(describeResolvedJobs(resolved)).toContain('+10t ore');
  });

  it('does not claim a reward was credited when it was not (idempotent double-resolve)', () => {
    const resolved: ResolvedJob[] = [{ job: job(), credited: false }];
    const message = describeResolvedJobs(resolved);
    expect(message).not.toContain('10t');
    expect(message).not.toContain('+');
    expect(message).toContain('Mining run complete.');
  });
});

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(20 * 60 * 1000)).toBe('20m');
  });

  it('formats whole hours', () => {
    expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(90 * 60 * 1000)).toBe('1h30m');
  });
});
