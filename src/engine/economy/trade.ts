/**
 * Station-side stock impact of a buy/sell (docs/12-economy.md, "Player
 * impact": "buying removes from stock (price rises), selling adds (price
 * falls)"). This is the station half of the engine contract's
 * `trade(ship, station, commodity, qty, side, now) → { ship, station,
 * ledgerEntry }`: ship credits/cargo and the `ledger` row are DB-owned state
 * (docs/05-tech-stack.md: "db/ ... schema, migrations, repositories,
 * transactions"; docs/12: "All money moves go through one `ledger` table")
 * that doesn't exist as an engine-layer shape yet, so they're left for the
 * `/market` command's DB wiring. What's pure and testable today — the price
 * a trade clears at, and the resulting stock — lives here.
 */
import { tickCommodity, quote } from './pricing';
import type { CommodityId } from './commodities';
import type { CommodityMarketState, StationMarketState } from './types';
import { clampStock } from './util';

export type TradeSide = 'buy' | 'sell';

export interface TradeOutcome {
  readonly ok: true;
  readonly station: StationMarketState;
  /** Per-tonne price this trade cleared at (`quote.buy` or `quote.sell`). */
  readonly unitPrice: number;
  /** `unitPrice × qty`, rounded — "No fractional credits" (docs/12-economy.md, "Currency"). */
  readonly total: number;
}

export type TradeError =
  | { readonly ok: false; readonly reason: 'unknown-commodity' }
  | { readonly ok: false; readonly reason: 'insufficient-stock' };

/**
 * Applies one trade's stock impact, priced at the station's current
 * (lazily-ticked) quote — docs/12-economy.md, trade loop step 4: "paid at
 * *current* price, which may have moved." Buying requires enough stock on
 * hand; selling always succeeds (stock is clamped to `4 × equilibrium`
 * afterward, same as `tick`). Pure: returns a new station state, never
 * mutates `station`.
 */
export function applyTrade(
  station: StationMarketState,
  commodityId: CommodityId,
  qty: number,
  side: TradeSide,
  now: Date,
): TradeOutcome | TradeError {
  if (!(qty > 0)) throw new Error('qty must be positive');

  const current = station[commodityId];
  if (!current) return { ok: false, reason: 'unknown-commodity' };

  const ticked = tickCommodity(current, now);
  const q = quote(commodityId, ticked);

  if (side === 'buy' && ticked.stock < qty) {
    return { ok: false, reason: 'insufficient-stock' };
  }

  const delta = side === 'buy' ? -qty : qty;
  const stock = clampStock(ticked.stock + delta, ticked.equilibrium);
  const unitPrice = side === 'buy' ? q.buy : q.sell;

  const nextState: CommodityMarketState = { ...ticked, stock, lastUpdated: now };

  return {
    ok: true,
    station: { ...station, [commodityId]: nextState },
    unitPrice,
    total: Math.round(unitPrice * qty),
  };
}
