import { describe, expect, it } from 'vitest';
import { migrate, openDatabase, SqliteStationMarketsRepository } from './index';

const t0 = new Date('2026-01-01T00:00:00Z');

function repo() {
  const db = openDatabase({ path: ':memory:' });
  migrate(db);
  return { db, repo: new SqliteStationMarketsRepository(db) };
}

describe('SqliteStationMarketsRepository', () => {
  it('seeds on first read and persists a row', () => {
    const { db, repo: r } = repo();
    const state = r.readAndTick('g1', t0);
    expect(Object.keys(state)).toHaveLength(10);
    expect(db.prepare('SELECT COUNT(*) AS n FROM station_markets').get()).toEqual({ n: 1 });
  });

  it('persists the ticked state after each read', () => {
    const { repo: r } = repo();
    r.readAndTick('g1', t0);
    const later = new Date(t0.getTime() + 3600_000);
    expect(r.readAndTick('g1', later).ore?.lastUpdated).toEqual(later);
    // third read earlier than persisted lastUpdated does not rewind
    expect(r.readAndTick('g1', t0).ore?.lastUpdated).toEqual(later);
  });

  it('keeps guilds separate', () => {
    const { db, repo: r } = repo();
    r.readAndTick('g1', t0);
    r.readAndTick('g2', t0);
    expect(db.prepare('SELECT COUNT(*) AS n FROM station_markets').get()).toEqual({ n: 2 });
  });
});
