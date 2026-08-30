import { describe, expect, it } from 'vitest';
import { getCommodity } from './commodities';
import { price, quote, tick, tickCommodity } from './pricing';
import type { CommodityMarketState, StationMarketState } from './types';

const T0 = new Date('2026-01-01T00:00:00Z');

function hoursLater(hours: number): Date {
  return new Date(T0.getTime() + hours * 60 * 60 * 1000);
}

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

describe('quote (docs/12-economy.md, "Pricing model")', () => {
  it('prices at exactly base when stock sits at equilibrium', () => {
    const base = getCommodity('ore').basePrice;
    const q = quote('ore', state({ stock: 100, equilibrium: 100 }));
    expect(q.price).toBeCloseTo(base, 6);
  });

  it('rises above base when stock is below equilibrium (scarce)', () => {
    const base = getCommodity('ore').basePrice;
    const q = quote('ore', state({ stock: 50, equilibrium: 100 }));
    expect(q.price).toBeGreaterThan(base);
  });

  it('falls below base when stock is above equilibrium (glut)', () => {
    const base = getCommodity('ore').basePrice;
    const q = quote('ore', state({ stock: 200, equilibrium: 100 }));
    expect(q.price).toBeLessThan(base);
  });

  it('matches the doc formula exactly for a raw commodity (elasticity 0.6)', () => {
    const base = getCommodity('ore').basePrice;
    const q = quote('ore', state({ stock: 40, equilibrium: 100 }));
    const expected = base * (100 / 40) ** 0.6;
    expect(q.price).toBeCloseTo(expected, 6);
  });

  it('matches the doc formula exactly for a manufactured commodity (elasticity 1.0)', () => {
    const base = getCommodity('electronics').basePrice;
    const q = quote('electronics', state({ stock: 40, equilibrium: 100 }));
    const expected = base * (100 / 40) ** 1.0;
    expect(q.price).toBeCloseTo(expected, 6);
  });

  it('clamps the ceiling to 2.5x base under extreme scarcity', () => {
    const base = getCommodity('ore').basePrice;
    const q = quote('ore', state({ stock: 1, equilibrium: 1000 }));
    expect(q.price).toBeCloseTo(2.5 * base, 6);
  });

  it('clamps at the ceiling even at zero stock (no divide-by-zero blowup)', () => {
    const base = getCommodity('ore').basePrice;
    const q = quote('ore', state({ stock: 0, equilibrium: 100 }));
    expect(q.price).toBeCloseTo(2.5 * base, 6);
    expect(Number.isFinite(q.price)).toBe(true);
  });

  it('clamps the floor to 0.4x base under extreme glut', () => {
    const base = getCommodity('ore').basePrice;
    const q = quote('ore', state({ stock: 100000, equilibrium: 100 }));
    expect(q.price).toBeCloseTo(0.4 * base, 6);
  });

  it('derives buy/sell from price with the doc spreads (1.08 / 0.92)', () => {
    const q = quote('ore', state({ stock: 100, equilibrium: 100 }));
    expect(q.buy).toBeCloseTo(q.price * 1.08, 6);
    expect(q.sell).toBeCloseTo(q.price * 0.92, 6);
    // spread means buy is always strictly above sell — that gap is the sink.
    expect(q.buy).toBeGreaterThan(q.sell);
  });

  it('passes stock and eq through unchanged for display', () => {
    const q = quote('ore', state({ stock: 73, equilibrium: 100 }));
    expect(q.stock).toBe(73);
    expect(q.eq).toBe(100);
  });
});

describe('tickCommodity (docs/12-economy.md, "Tick (lazy, on read)")', () => {
  it('is a no-op when no time has passed', () => {
    const s = state({ stock: 42 });
    expect(tickCommodity(s, T0)).toEqual(s);
  });

  it('applies net production over elapsed hours before relaxing toward equilibrium', () => {
    // production=10, consumption=0, no relax pull since stock starts at eq.
    const s = state({ stock: 100, equilibrium: 100, production: 10, consumption: 0 });
    const ticked = tickCommodity(s, hoursLater(1));
    // stock = 100 + 10*1 = 110, then relax: 110 + (100-110)*(1-0.9^1) = 110 - 1 = 109
    expect(ticked.stock).toBeCloseTo(109, 6);
  });

  it('net consumption lowers stock', () => {
    const s = state({ stock: 100, equilibrium: 100, production: 0, consumption: 20 });
    const ticked = tickCommodity(s, hoursLater(1));
    // stock = 100 - 20 = 80, then relax: 80 + (100-80)*0.1 = 82
    expect(ticked.stock).toBeCloseTo(82, 6);
  });

  it('relaxes 10%/h toward equilibrium with no production/consumption flow', () => {
    const s = state({ stock: 0, equilibrium: 100, production: 0, consumption: 0 });
    const ticked = tickCommodity(s, hoursLater(1));
    // stock = 0 + (100-0)*(1-0.9) = 10
    expect(ticked.stock).toBeCloseTo(10, 6);
  });

  it('drift pulls stock back toward baseline the longer it runs, converging on equilibrium', () => {
    const s = state({ stock: 10, equilibrium: 100, production: 0, consumption: 0 });
    const after1h = tickCommodity(s, hoursLater(1)).stock;
    const after10h = tickCommodity(s, hoursLater(10)).stock;
    const after100h = tickCommodity(s, hoursLater(100)).stock;
    expect(after1h).toBeGreaterThan(10);
    expect(after10h).toBeGreaterThan(after1h);
    expect(after100h).toBeGreaterThan(after10h);
    // 0.9^100 ~= 2.7e-5, so 100h still leaves a hair of the original 90-unit
    // gap — close, not exact.
    expect(after100h).toBeCloseTo(100, 2);
  });

  it('drift also pulls an above-equilibrium stock back down toward baseline', () => {
    const s = state({ stock: 500, equilibrium: 100, production: 0, consumption: 0 });
    const after1h = tickCommodity(s, hoursLater(1)).stock;
    const after200h = tickCommodity(s, hoursLater(200)).stock;
    expect(after1h).toBeLessThan(500);
    expect(after200h).toBeCloseTo(100, 2);
  });

  it('clamps stock to [0, 4 x equilibrium] even under sustained heavy production', () => {
    const s = state({ stock: 100, equilibrium: 100, production: 100000, consumption: 0 });
    const ticked = tickCommodity(s, hoursLater(1));
    expect(ticked.stock).toBe(400);
  });

  it('clamps stock to 0 under sustained heavy consumption', () => {
    const s = state({ stock: 100, equilibrium: 100, production: 0, consumption: 100000 });
    const ticked = tickCommodity(s, hoursLater(1));
    expect(ticked.stock).toBe(0);
  });

  it('advances lastUpdated to now', () => {
    const ticked = tickCommodity(state(), hoursLater(3));
    expect(ticked.lastUpdated).toEqual(hoursLater(3));
  });

  it('never mutates the input state', () => {
    const s = state({ stock: 100, production: 10 });
    const snapshot = { ...s };
    tickCommodity(s, hoursLater(5));
    expect(s).toEqual(snapshot);
  });
});

describe('tick (whole-station engine contract)', () => {
  it('ticks every commodity the station stocks', () => {
    const station: StationMarketState = {
      ore: state({ stock: 100, equilibrium: 100, production: 10 }),
      fuel: state({ stock: 100, equilibrium: 100, consumption: 10 }),
    };
    const ticked = tick(station, hoursLater(1));
    expect(ticked.ore?.stock).toBeGreaterThan(100);
    expect(ticked.fuel?.stock).toBeLessThan(100);
  });

  it('does not touch commodities the station does not stock', () => {
    const station: StationMarketState = { ore: state() };
    const ticked = tick(station, hoursLater(1));
    expect(ticked.fuel).toBeUndefined();
    expect(Object.keys(ticked)).toEqual(['ore']);
  });
});

describe('price (engine contract: lazy tick + quote)', () => {
  it('ticks the station forward before quoting', () => {
    const station: StationMarketState = {
      ore: state({ stock: 100, equilibrium: 100, production: 0, consumption: 20 }),
    };
    const q = price(station, 'ore', hoursLater(1));
    // stock ticks to 82 (see tickCommodity test above) before pricing.
    expect(q.stock).toBeCloseTo(82, 6);
    const base = getCommodity('ore').basePrice;
    expect(q.price).toBeCloseTo(base * (100 / 82) ** 0.6, 6);
  });

  it('throws for a commodity the station does not stock', () => {
    const station: StationMarketState = { ore: state() };
    expect(() => price(station, 'fuel', T0)).toThrow();
  });
});
