import { describe, expect, it } from 'vitest';
import { COMMODITIES, COMMODITIES_BY_ID, ELASTICITY_BY_TIER, elasticityFor, getCommodity } from './commodities';

describe('COMMODITIES', () => {
  it('has the v1 set of 10 commodities (docs/12-economy.md)', () => {
    expect(COMMODITIES).toHaveLength(10);
  });

  it('has unique ids', () => {
    const ids = COMMODITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches the doc table for a raw, a refined, a manufactured, and a special commodity', () => {
    expect(getCommodity('ore')).toMatchObject({ tier: 'raw', basePrice: 10 });
    expect(getCommodity('fuel')).toMatchObject({ tier: 'refined', basePrice: 25 });
    expect(getCommodity('electronics')).toMatchObject({ tier: 'manufactured', basePrice: 120 });
    expect(getCommodity('data_cores')).toMatchObject({ tier: 'special', basePrice: 200 });
  });

  it('is indexable by id via COMMODITIES_BY_ID', () => {
    for (const commodity of COMMODITIES) {
      expect(COMMODITIES_BY_ID[commodity.id]).toEqual(commodity);
    }
  });
});

describe('elasticityFor', () => {
  it('matches docs/12-economy.md: 0.6 raw, 0.8 refined, 1.0 manufactured/special', () => {
    expect(elasticityFor('raw')).toBe(0.6);
    expect(elasticityFor('refined')).toBe(0.8);
    expect(elasticityFor('manufactured')).toBe(1.0);
    expect(elasticityFor('special')).toBe(1.0);
  });

  it('covers every commodity tier', () => {
    for (const commodity of COMMODITIES) {
      expect(ELASTICITY_BY_TIER[commodity.tier]).toBeGreaterThan(0);
    }
  });
});
