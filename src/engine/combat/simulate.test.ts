import { describe, expect, it } from 'vitest';
import { NPC_ARCHETYPES } from './ships';
import { runEncounter, runMatchup } from './simulate';
import { alwaysFireStrategy, bandControlStrategy, mixedStrategy } from './strategies';
import { mulberry32 } from './rng';
import { MAX_ROUNDS } from './types';

describe('runEncounter', () => {
  it('always terminates within MAX_ROUNDS with a real outcome', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const result = runEncounter(
        NPC_ARCHETYPES.raider,
        alwaysFireStrategy,
        NPC_ARCHETYPES.sniper,
        bandControlStrategy,
        rng,
      );
      expect(result.rounds).toBeGreaterThanOrEqual(1);
      expect(result.rounds).toBeLessThanOrEqual(MAX_ROUNDS);
      expect([
        'A_WINS',
        'B_WINS',
        'MUTUAL_DISABLE',
        'A_ESCAPED',
        'B_ESCAPED',
        'BOTH_ESCAPED',
        'DISENGAGE',
      ]).toContain(result.outcome);
    }
  });
});

describe('runMatchup', () => {
  it('is deterministic for a fixed seed', () => {
    const runA = runMatchup(
      { name: 'Raider', template: NPC_ARCHETYPES.raider, strategyName: 'alwaysFire', strategy: alwaysFireStrategy },
      { name: 'Sniper', template: NPC_ARCHETYPES.sniper, strategyName: 'mixed', strategy: mixedStrategy },
      500,
      123,
    );
    const runB = runMatchup(
      { name: 'Raider', template: NPC_ARCHETYPES.raider, strategyName: 'alwaysFire', strategy: alwaysFireStrategy },
      { name: 'Sniper', template: NPC_ARCHETYPES.sniper, strategyName: 'mixed', strategy: mixedStrategy },
      500,
      123,
    );
    expect(runA).toEqual(runB);
  });

  it('outcome counts sum to the trial count and win rates are within [0, 1]', () => {
    const summary = runMatchup(
      { name: 'Raider', template: NPC_ARCHETYPES.raider, strategyName: 'alwaysFire', strategy: alwaysFireStrategy },
      { name: 'Brute', template: NPC_ARCHETYPES.brute, strategyName: 'bandControl', strategy: bandControlStrategy },
      1000,
      99,
    );
    const total = Object.values(summary.counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(1000);
    expect(summary.aWinRate).toBeGreaterThanOrEqual(0);
    expect(summary.aWinRate).toBeLessThanOrEqual(1);
    expect(summary.bWinRate).toBeGreaterThanOrEqual(0);
    expect(summary.bWinRate).toBeLessThanOrEqual(1);
    expect(summary.avgRounds).toBeGreaterThanOrEqual(1);
    expect(summary.avgRounds).toBeLessThanOrEqual(MAX_ROUNDS);
  });

  it('a like-for-like mirror matchup (same strategy both sides) is roughly symmetric', () => {
    const summary = runMatchup(
      { name: 'Raider', template: NPC_ARCHETYPES.raider, strategyName: 'mixed', strategy: mixedStrategy },
      { name: 'Raider', template: NPC_ARCHETYPES.raider, strategyName: 'mixed', strategy: mixedStrategy },
      2000,
      55,
    );
    // Identical ships and strategies on both sides: neither side should have a lopsided structural
    // advantage. Loose bound (not exactly 50/50) since band/turn order still breaks ties asymmetrically.
    expect(Math.abs(summary.aWinRate - summary.bWinRate)).toBeLessThan(0.1);
  });
});
