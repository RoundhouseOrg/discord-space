/**
 * Station market pricing engine (docs/12-economy.md). Pure game logic; must
 * never import from src/discord (enforced by eslint.config.mjs and
 * src/engine/layering.test.ts).
 *
 * Covers the doc's "Pricing model", "Tick (lazy, on read)", and the fuel /
 * repair rows of "Faucets and sinks". Not covered here (left for the
 * `/market` command's DB wiring): ship credits/cargo, the `ledger` table,
 * mining yield (docs/12 "Mining" — lands with the jobs engine per
 * docs/06-roadmap.md), the module/hull shop (fixed prices, no elasticity),
 * and station-type-driven initial stock (docs/12 "Sector signatures" —
 * content generation, not pricing).
 */
export {
  COMMODITIES,
  COMMODITIES_BY_ID,
  ELASTICITY_BY_TIER,
  TIERS,
  elasticityFor,
  getCommodity,
  type CommodityDef,
  type CommodityId,
  type Tier,
} from './commodities';
export type { CommodityMarketState, PriceQuote, StationMarketState } from './types';
export {
  price,
  quote,
  tick,
  tickCommodity,
} from './pricing';
export { applyTrade, type TradeError, type TradeOutcome, type TradeSide } from './trade';
export {
  FUEL_BASE_COST_CR,
  FUEL_REFERENCE_JUMP_MINUTES,
  MIN_FUEL_COST_CR,
  REPAIR_COST_FRACTION_OF_HULL_COST,
  fuelCost,
  repairCost,
} from './sinks';
