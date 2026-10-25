import { describe, expect, it } from 'vitest';
import { buildShipStatus } from './status';
import type { JobRecord } from './index';

const ship = { hullId: 'prospector', role: 'miner', credits: 500, cargoOreTonnes: 0 };
const now = new Date('2026-01-01T00:10:00Z');
const job: JobRecord = {
  id: 1,
  shipId: 1,
  type: 'mine',
  startedAt: new Date('2026-01-01T00:00:00Z'),
  endsAt: new Date('2026-01-01T00:20:00Z'),
  resolvedAt: null,
  notifiedAt: null,
  originMessage: null,
  reward: { oreTonnes: 10 },
};

describe('buildShipStatus', () => {
  it('reports docked with empty cargo when idle', () => {
    const s = buildShipStatus(ship, undefined, now);
    expect(s.hullName).toBe('Prospector');
    expect(s.cargo).toEqual([]);
    expect(s.activeJob).toBeNull();
  });

  it('lists cargo and the remaining time of the active job', () => {
    const s = buildShipStatus({ ...ship, cargoOreTonnes: 10 }, job, now);
    expect(s.cargo).toEqual([{ commodity: 'ore', tonnes: 10 }]);
    expect(s.activeJob?.remainingMs).toBe(10 * 60 * 1000);
  });

  it('clamps remaining time at zero', () => {
    const s = buildShipStatus(ship, job, new Date('2026-01-02T00:00:00Z'));
    expect(s.activeJob?.remainingMs).toBe(0);
  });
});
