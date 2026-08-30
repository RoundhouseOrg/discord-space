/**
 * Fuel and repair sinks (docs/12-economy.md, "Faucets and sinks"). Both
 * numbers the doc gives outright are kept as-is; where the doc only
 * describes a shape ("scales with distance and hull", "% of hull cost")
 * without a number, a middle-of-the-road constant is picked below and
 * called out, per this issue's instruction to pick and note it.
 */
import { clamp } from './util';

/** docs/12-economy.md faucets/sinks table: "Fuel per jump (30 cr base; scales with distance and hull)". */
export const FUEL_BASE_COST_CR = 30;

/**
 * docs/09-travel.md gives "10–20 min" for an adjacent-sector jump — the
 * ordinary jump docs/12's own worked example prices at the flat "30 cr/jump"
 * base. Picking that range's midpoint, 15 min, as the reference trip length
 * the base cost is calibrated against, so shorter/longer jumps scale
 * proportionally from there.
 */
export const FUEL_REFERENCE_JUMP_MINUTES = 15;

/** A jump should never be free (docs/09-travel.md: "Travel must be ... not free"). */
export const MIN_FUEL_COST_CR = 1;

/**
 * docs/12-economy.md: "Fuel per jump (30 cr base; scales with distance and
 * hull)". `jumpMinutes` scales cost proportionally to `FUEL_REFERENCE_JUMP_MINUTES`;
 * `hullFuelMultiplier` (default 1, i.e. a starter hull) is supplied by the
 * caller since per-hull fuel-efficiency numbers aren't defined yet
 * (docs/04-game-design.md's starter hulls don't have one). Rounded to whole
 * credits ("No fractional credits", docs/12-economy.md, "Currency").
 */
export function fuelCost(jumpMinutes: number, hullFuelMultiplier = 1): number {
  const scaled = FUEL_BASE_COST_CR * (jumpMinutes / FUEL_REFERENCE_JUMP_MINUTES) * hullFuelMultiplier;
  return Math.max(MIN_FUEL_COST_CR, Math.round(scaled));
}

/**
 * docs/12-economy.md faucets/sinks table: "Repairs after combat (% of hull
 * cost)" — the doc names the shape but not the percentage. Picking 50% of
 * hull cost as the price of a full (0 -> max hull) repair: a full write-off
 * costs as much as half a replacement hull, cheap enough that repairing
 * beats re-buying but real enough to be a sink. Scales linearly with the
 * fraction of hull missing (docs/10-combat.md: disabled ships are set to
 * "10%" hull and get "a repair bill").
 */
export const REPAIR_COST_FRACTION_OF_HULL_COST = 0.5;

/**
 * `hullCostCr` is the ship's hull replacement cost; `missingHull` /
 * `maxHull` describe current damage (e.g. `maxHull - currentHull`, `maxHull`
 * from docs/10-combat.md's hull HP stat). Rounded to whole credits.
 */
export function repairCost(hullCostCr: number, missingHull: number, maxHull: number): number {
  if (maxHull <= 0) return 0;
  const damageFraction = clamp(missingHull, 0, maxHull) / maxHull;
  return Math.round(hullCostCr * REPAIR_COST_FRACTION_OF_HULL_COST * damageFraction);
}
