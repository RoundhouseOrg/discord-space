import { COMMODITIES, TIERS, type CommodityDef } from './commodities';
import { price, tick } from './pricing';
import type { StationMarketState } from './types';

export interface MarketRow {
  readonly id: string;
  readonly name: string;
  readonly tier: string;
  readonly buy: number;
  readonly sell: number;
  readonly stock: number;
}

/** Default station seed: every commodity at equilibrium with a small steady flow. */
export function seedStationMarket(now: Date): StationMarketState {
  const out: Record<string, StationMarketState[keyof StationMarketState]> = {};
  for (const c of COMMODITIES) {
    out[c.id] = { stock: 100, equilibrium: 100, production: 5, consumption: 5, lastUpdated: now };
  }
  return out as StationMarketState;
}

/** One row per stocked commodity, sorted by tier (raw→special) then name. */
export function marketRows(station: StationMarketState, now: Date): MarketRow[] {
  const rows = COMMODITIES.filter((c: CommodityDef) => station[c.id]).map((c) => {
    const q = price(station, c.id, now);
    return {
      id: c.id,
      name: c.name,
      tier: c.tier,
      buy: Math.round(q.buy),
      sell: Math.round(q.sell),
      stock: Math.round(q.stock),
    };
  });
  const tierIndex = (t: string): number => (TIERS as readonly string[]).indexOf(t);
  return rows.sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier) || a.name.localeCompare(b.name));
}

/** Embed-field text for one row. */
export function formatMarketRow(row: MarketRow): string {
  return `Buy ${row.buy} cr · Sell ${row.sell} cr · Stock ${row.stock}t`;
}

/** Ticks the station to `now` (for persisting) and returns its display rows. */
export function readMarket(station: StationMarketState, now: Date) {
  const ticked = tick(station, now);
  return { state: ticked, rows: marketRows(ticked, now) };
}
