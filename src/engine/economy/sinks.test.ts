import { describe, expect, it } from 'vitest';
import {
  FUEL_BASE_COST_CR,
  FUEL_REFERENCE_JUMP_MINUTES,
  MIN_FUEL_COST_CR,
  REPAIR_COST_FRACTION_OF_HULL_COST,
  fuelCost,
  repairCost,
} from './sinks';

describe('fuelCost (docs/12-economy.md: "Fuel per jump (30 cr base; scales with distance and hull)")', () => {
  it('costs the 30cr base at the reference jump length with a 1x hull', () => {
    expect(fuelCost(FUEL_REFERENCE_JUMP_MINUTES, 1)).toBe(FUEL_BASE_COST_CR);
  });

  it('defaults the hull multiplier to 1', () => {
    expect(fuelCost(FUEL_REFERENCE_JUMP_MINUTES)).toBe(FUEL_BASE_COST_CR);
  });

  it('scales up for a longer jump', () => {
    const short = fuelCost(FUEL_REFERENCE_JUMP_MINUTES);
    const long = fuelCost(FUEL_REFERENCE_JUMP_MINUTES * 4);
    expect(long).toBeGreaterThan(short);
  });

  it('scales down for a shorter jump', () => {
    const reference = fuelCost(FUEL_REFERENCE_JUMP_MINUTES);
    const short = fuelCost(FUEL_REFERENCE_JUMP_MINUTES / 3);
    expect(short).toBeLessThan(reference);
  });

  it('scales up with a heavier hull multiplier', () => {
    const light = fuelCost(FUEL_REFERENCE_JUMP_MINUTES, 1);
    const heavy = fuelCost(FUEL_REFERENCE_JUMP_MINUTES, 2);
    expect(heavy).toBeGreaterThan(light);
  });

  it('never charges below the 1cr floor, even for a near-instant hop', () => {
    expect(fuelCost(0.001, 0.001)).toBe(MIN_FUEL_COST_CR);
  });

  it('rounds to whole credits', () => {
    expect(Number.isInteger(fuelCost(17, 1.3))).toBe(true);
  });
});

describe('repairCost (docs/12-economy.md: "Repairs after combat (% of hull cost)")', () => {
  it('costs nothing at full hull', () => {
    expect(repairCost(1000, 0, 100)).toBe(0);
  });

  it('costs the full repair fraction of hull cost at zero hull', () => {
    expect(repairCost(1000, 100, 100)).toBe(1000 * REPAIR_COST_FRACTION_OF_HULL_COST);
  });

  it('scales linearly with the fraction of hull missing', () => {
    expect(repairCost(1000, 50, 100)).toBe(500 * REPAIR_COST_FRACTION_OF_HULL_COST);
  });

  it('clamps missing hull into [0, maxHull] instead of over/under-charging', () => {
    expect(repairCost(1000, 500, 100)).toBe(repairCost(1000, 100, 100));
    expect(repairCost(1000, -50, 100)).toBe(0);
  });

  it('returns 0 for a hull with no max HP instead of dividing by zero', () => {
    expect(repairCost(1000, 10, 0)).toBe(0);
  });

  it('rounds to whole credits', () => {
    expect(Number.isInteger(repairCost(1234, 37, 90))).toBe(true);
  });
});
