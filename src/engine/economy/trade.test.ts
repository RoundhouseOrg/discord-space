import { describe, expect, it } from 'vitest';
import { getCommodity } from './commodities';
import { quote } from './pricing';
import { applyTrade } from './trade';
import type { CommodityMarketState, StationMarketState } from './types';

const T0 = new Date('2026-01-01T00:00:00Z');

function state(overrides: Partial<CommodityMarketState> = {}): CommodityMarketState {
  return {
    stock: 100,
    equilibrium: 100,
    production: 0,
    consumption: 0,
    lastUpdated: T0,
    ...overrides,
  };
}

describe('applyTrade', () => {
  it('buying removes qty from stock', () => {
    const station: StationMarketState = { ore: state({ stock: 100 }) };
    const result = applyTrade(station, 'ore', 10, 'buy', T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.station.ore?.stock).toBe(90);
  });

  it('selling adds qty to stock', () => {
    const station: StationMarketState = { ore: state({ stock: 100 }) };
    const result = applyTrade(station, 'ore', 10, 'sell', T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.station.ore?.stock).toBe(110);
  });

  it('prices a buy at the current buy quote (player pays the spread)', () => {
    const station: StationMarketState = { ore: state({ stock: 100, equilibrium: 100 }) };
    const q = quote('ore', state({ stock: 100, equilibrium: 100 }));
    const result = applyTrade(station, 'ore', 1, 'buy', T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unitPrice).toBeCloseTo(q.buy, 6);
  });

  it('prices a sell at the current sell quote (player receives less)', () => {
    const station: StationMarketState = { ore: state({ stock: 100, equilibrium: 100 }) };
    const q = quote('ore', state({ stock: 100, equilibrium: 100 }));
    const result = applyTrade(station, 'ore', 1, 'sell', T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unitPrice).toBeCloseTo(q.sell, 6);
  });

  it('rejects a buy larger than available stock', () => {
    const station: StationMarketState = { ore: state({ stock: 5 }) };
    const result = applyTrade(station, 'ore', 10, 'buy', T0);
    expect(result).toEqual({ ok: false, reason: 'insufficient-stock' });
  });

  it('rejects trading a commodity the station does not stock', () => {
    const station: StationMarketState = { ore: state() };
    const result = applyTrade(station, 'fuel', 10, 'buy', T0);
    expect(result).toEqual({ ok: false, reason: 'unknown-commodity' });
  });

  it('rounds total to whole credits ("No fractional credits")', () => {
    const station: StationMarketState = { ore: state({ stock: 100, equilibrium: 100 }) };
    const result = applyTrade(station, 'ore', 7, 'buy', T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Number.isInteger(result.total)).toBe(true);
  });

  it('ticks lazily before applying the trade', () => {
    // consumption drains stock to 82 by the 1h mark (see pricing.test.ts); a
    // sell should land on top of that, not the stale value.
    const station: StationMarketState = { ore: state({ stock: 100, consumption: 20 }) };
    const oneHourLater = new Date(T0.getTime() + 60 * 60 * 1000);
    const result = applyTrade(station, 'ore', 10, 'sell', oneHourLater);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.station.ore?.stock).toBeCloseTo(92, 6);
  });

  it('leaves the original station state untouched (pure)', () => {
    const station: StationMarketState = { ore: state({ stock: 100 }) };
    applyTrade(station, 'ore', 10, 'buy', T0);
    expect(station.ore?.stock).toBe(100);
  });

  it('does not carry buy/sell impact across other commodities', () => {
    const station: StationMarketState = { ore: state({ stock: 100 }), fuel: state({ stock: 50 }) };
    const result = applyTrade(station, 'ore', 10, 'buy', T0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.station.fuel?.stock).toBe(50);
  });

  describe('sustained pressure (docs/12-economy.md: "A 60t freighter dump moves price noticeably; five in a row tank it")', () => {
    it('sustained buying drives price up toward the 2.5x ceiling', () => {
      let station: StationMarketState = { ore: state({ stock: 500, equilibrium: 500 }) };
      const base = getCommodity('ore').basePrice;
      const prices: number[] = [];

      for (let i = 0; i < 8; i++) {
        const result = applyTrade(station, 'ore', 60, 'buy', T0);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        station = result.station;
        prices.push(quote('ore', station.ore!).price);
      }

      // Monotonically non-decreasing: each dump removes stock, which can only
      // push price up or hold it at the ceiling.
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]!);
      }
      expect(prices.at(-1)).toBeGreaterThan(prices[0]!);
      expect(prices.at(-1)).toBeCloseTo(2.5 * base, 6);
    });

    it('sustained selling drives price down toward the 0.4x floor', () => {
      // Uses electronics (elasticity 1.0): at elasticity 0.6 (ore) the floor
      // would need stock past the tick's own 4x-equilibrium cap to reach, so
      // it's structurally unreachable for raw commodities — see the ceiling
      // test above for ore instead.
      let station: StationMarketState = { electronics: state({ stock: 500, equilibrium: 500 }) };
      const base = getCommodity('electronics').basePrice;
      const prices: number[] = [];

      for (let i = 0; i < 20; i++) {
        const result = applyTrade(station, 'electronics', 60, 'sell', T0);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        station = result.station;
        prices.push(quote('electronics', station.electronics!).price);
      }

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]!);
      }
      expect(prices.at(-1)).toBeLessThan(prices[0]!);
      expect(prices.at(-1)).toBeCloseTo(0.4 * base, 6);
    });

    it('a hub station at 10x stock barely moves on the same dump', () => {
      const normalStation: StationMarketState = { ore: state({ stock: 500, equilibrium: 500 }) };
      const hubStation: StationMarketState = { ore: state({ stock: 5000, equilibrium: 5000 }) };

      const normalResult = applyTrade(normalStation, 'ore', 60, 'sell', T0);
      const hubResult = applyTrade(hubStation, 'ore', 60, 'sell', T0);
      expect(normalResult.ok).toBe(true);
      expect(hubResult.ok).toBe(true);
      if (!normalResult.ok || !hubResult.ok) return;

      const base = getCommodity('ore').basePrice;
      const normalDelta = base - quote('ore', normalResult.station.ore!).price;
      const hubDelta = base - quote('ore', hubResult.station.ore!).price;

      expect(normalDelta).toBeGreaterThan(0);
      expect(hubDelta).toBeGreaterThan(0);
      expect(hubDelta).toBeLessThan(normalDelta / 5);
    });
  });
});
