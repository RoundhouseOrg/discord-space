import { describe, expect, it } from 'vitest';
import { formatMarketRow, marketRows, readMarket, seedStationMarket } from './market-view';

const now = new Date('2026-01-01T00:00:00Z');

describe('market view', () => {
  it('lists every commodity sorted by tier then name', () => {
    const rows = marketRows(seedStationMarket(now), now);
    expect(rows.map((r) => r.name)).toEqual([
      'Gas', 'Ice', 'Ore', 'Fuel', 'Metal', 'Water', 'Components', 'Electronics', 'Data cores', 'Salvage',
    ]);
  });

  it('prices buy above sell', () => {
    for (const r of marketRows(seedStationMarket(now), now)) expect(r.buy).toBeGreaterThan(r.sell);
  });

  it('formats a row', () => {
    expect(formatMarketRow({ id: 'ore', name: 'Ore', tier: 'raw', buy: 11, sell: 9, stock: 100 })).toBe(
      'Buy 11 cr · Sell 9 cr · Stock 100t',
    );
  });

  it('readMarket ticks lastUpdated to now', () => {
    const later = new Date(now.getTime() + 3600_000);
    expect(readMarket(seedStationMarket(now), later).state.ore?.lastUpdated).toEqual(later);
  });
});
