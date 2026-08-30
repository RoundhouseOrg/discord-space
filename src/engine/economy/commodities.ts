/**
 * The v1 commodity table (docs/12-economy.md, "Commodities (v1: 10)"). The
 * doc calls its cr/t numbers placeholders ("tune in simulation"); they're
 * reproduced here verbatim rather than re-picked, since the doc doesn't give
 * them as a range.
 */

export type CommodityId =
  | 'ore'
  | 'ice'
  | 'gas'
  | 'metal'
  | 'fuel'
  | 'water'
  | 'components'
  | 'electronics'
  | 'data_cores'
  | 'salvage';

export const TIERS = ['raw', 'refined', 'manufactured', 'special'] as const;
export type Tier = (typeof TIERS)[number];

export interface CommodityDef {
  readonly id: CommodityId;
  readonly name: string;
  readonly tier: Tier;
  /** cr/t at equilibrium stock. */
  readonly basePrice: number;
  readonly source: string;
  readonly demand: string;
}

export const COMMODITIES: readonly CommodityDef[] = [
  { id: 'ore', name: 'Ore', tier: 'raw', basePrice: 10, source: 'Belt zones', demand: 'Refineries, industrial' },
  { id: 'ice', name: 'Ice', tier: 'raw', basePrice: 8, source: 'Ice zones', demand: 'Refineries (→ Water)' },
  { id: 'gas', name: 'Gas', tier: 'raw', basePrice: 12, source: 'Gas zones', demand: 'Refineries (→ Fuel)' },
  {
    id: 'metal',
    name: 'Metal',
    tier: 'refined',
    basePrice: 30,
    source: 'Refinery stations',
    demand: 'Industrial, shipyards',
  },
  {
    id: 'fuel',
    name: 'Fuel',
    tier: 'refined',
    basePrice: 25,
    source: 'Refinery stations',
    demand: 'Everyone (jump cost)',
  },
  { id: 'water', name: 'Water', tier: 'refined', basePrice: 15, source: 'Refinery stations', demand: 'Colonies' },
  {
    id: 'components',
    name: 'Components',
    tier: 'manufactured',
    basePrice: 80,
    source: 'Industrial stations',
    demand: 'Shipyards, colonies',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    tier: 'manufactured',
    basePrice: 120,
    source: 'Industrial stations',
    demand: 'Shipyards, research',
  },
  {
    id: 'data_cores',
    name: 'Data cores',
    tier: 'special',
    basePrice: 200,
    source: 'Exploration',
    demand: 'Research, hub',
  },
  {
    id: 'salvage',
    name: 'Salvage',
    tier: 'special',
    basePrice: 40,
    source: 'Wreck fields',
    demand: 'Industrial, hub',
  },
] as const;

export const COMMODITIES_BY_ID: Readonly<Record<CommodityId, CommodityDef>> = Object.fromEntries(
  COMMODITIES.map((commodity) => [commodity.id, commodity]),
) as Record<CommodityId, CommodityDef>;

export function getCommodity(id: CommodityId): CommodityDef {
  return COMMODITIES_BY_ID[id];
}

/** docs/12-economy.md, "Pricing model": `elasticity = 0.6 (raw) · 0.8 (refined) · 1.0 (manufactured/special)`. */
export const ELASTICITY_BY_TIER: Readonly<Record<Tier, number>> = {
  raw: 0.6,
  refined: 0.8,
  manufactured: 1.0,
  special: 1.0,
};

export function elasticityFor(tier: Tier): number {
  return ELASTICITY_BY_TIER[tier];
}
