import type { CommodityId } from './commodities';

/**
 * Per-station, per-commodity state (docs/12-economy.md, "Pricing model":
 * "Per station, per commodity: `stock`, `equilibrium`, `production`,
 * `consumption`, `last_updated`."). `production`/`consumption` are tonnes/h.
 */
export interface CommodityMarketState {
  readonly stock: number;
  readonly equilibrium: number;
  readonly production: number;
  readonly consumption: number;
  readonly lastUpdated: Date;
}

/**
 * A station only stocks the commodities its type deals in (docs/12:
 * "Station types by signature ... baseline production/consumption of
 * basics"), so this is a partial map, not a full 10-entry record.
 */
export type StationMarketState = Readonly<Partial<Record<CommodityId, CommodityMarketState>>>;

/** Engine contract: `price(...) → { price, buy, sell, stock, eq }`. */
export interface PriceQuote {
  readonly price: number;
  readonly buy: number;
  readonly sell: number;
  readonly stock: number;
  readonly eq: number;
}
