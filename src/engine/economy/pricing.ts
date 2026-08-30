/**
 * Stock-based pricing and drift (docs/12-economy.md, "Pricing model").
 * Pure and lazy: nothing here schedules anything, callers pass `now` and get
 * back a new state / quote. A background sweep may call `tick` proactively
 * to pre-warm hot stations, but nothing depends on that for correctness.
 */
import { elasticityFor, getCommodity, type CommodityId } from './commodities';
import type { CommodityMarketState, PriceQuote, StationMarketState } from './types';
import { clamp, clampStock } from './util';

const MS_PER_HOUR = 60 * 60 * 1000;

/** docs/12-economy.md tick pseudocode: `stock += (equilibrium − stock) × (1 − 0.9^hours)` — relax 10%/h. */
const RELAX_PER_HOUR = 0.9;

/** docs/12-economy.md pricing pseudocode: `clamped to [0.4 × base, 2.5 × base]`. */
const PRICE_FLOOR_MULTIPLE_OF_BASE = 0.4;
const PRICE_CEILING_MULTIPLE_OF_BASE = 2.5;

/** docs/12-economy.md: `buy_price = price × 1.08`, `sell_price = price × 0.92`. */
const BUY_SPREAD = 1.08;
const SELL_SPREAD = 0.92;

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_HOUR);
}

/**
 * docs/12-economy.md, "Tick (lazy, on read)". Applies production/consumption
 * flow, then relaxes 10%/h toward equilibrium, then clamps to
 * `[0, 4 × equilibrium]` — in that order, matching the doc's pseudocode.
 * Pure: returns a new state, never mutates `state`.
 */
export function tickCommodity(state: CommodityMarketState, now: Date): CommodityMarketState {
  const hours = hoursBetween(state.lastUpdated, now);
  if (hours === 0) return state;

  let stock = state.stock + (state.production - state.consumption) * hours;
  stock += (state.equilibrium - stock) * (1 - RELAX_PER_HOUR ** hours);
  stock = clampStock(stock, state.equilibrium);

  return { ...state, stock, lastUpdated: now };
}

/**
 * Engine contract: `tick(stationState, now) → stationState`. Ticks every
 * commodity the station currently stocks.
 */
export function tick(station: StationMarketState, now: Date): StationMarketState {
  const next: Partial<Record<CommodityId, CommodityMarketState>> = {};
  for (const [commodityId, state] of Object.entries(station) as [CommodityId, CommodityMarketState][]) {
    next[commodityId] = tickCommodity(state, now);
  }
  return next;
}

/**
 * Pure price quote from an already-current `state` (no lazy tick — see
 * `price` for the engine-contract entry point that ticks first).
 */
export function quote(commodityId: CommodityId, state: CommodityMarketState): PriceQuote {
  const commodity = getCommodity(commodityId);
  const elasticity = elasticityFor(commodity.tier);
  const base = commodity.basePrice;

  // stock === 0 yields (eq / 0) === Infinity, which `clamp` correctly pins
  // to the ceiling below — no special-case needed.
  const raw = base * (state.equilibrium / state.stock) ** elasticity;
  const price = clamp(raw, PRICE_FLOOR_MULTIPLE_OF_BASE * base, PRICE_CEILING_MULTIPLE_OF_BASE * base);

  return {
    price,
    buy: price * BUY_SPREAD,
    sell: price * SELL_SPREAD,
    stock: state.stock,
    eq: state.equilibrium,
  };
}

/** Engine contract: `price(station, commodity, now) → { price, buy, sell, stock, eq }`. */
export function price(station: StationMarketState, commodityId: CommodityId, now: Date): PriceQuote {
  const state = station[commodityId];
  if (!state) throw new Error(`station does not stock ${commodityId}`);
  return quote(commodityId, tickCommodity(state, now));
}
