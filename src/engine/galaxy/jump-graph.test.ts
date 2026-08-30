import { describe, expect, it } from 'vitest';
import { fortyChannelServer } from './fixtures/forty-channel-server';
import { twoPersonServer } from './fixtures/two-person-server';
import { buildJumpGraph, computeJumpEdge } from './jump-graph';
import { deriveSector } from './sector';
import type { Sector } from './types';

const sectorA = deriveSector(twoPersonServer);
const sectorB = deriveSector(fortyChannelServer);
const sectorC = deriveSector({ guildId: '300000000000000001', channels: [{ id: 'c1', name: 'general' }] });

describe('computeJumpEdge', () => {
  it('is symmetric: order of arguments does not change the result', () => {
    expect(computeJumpEdge(sectorA, sectorB)).toEqual(computeJumpEdge(sectorB, sectorA));
  });

  it('is deterministic across repeated calls', () => {
    expect(computeJumpEdge(sectorA, sectorB)).toEqual(computeJumpEdge(sectorA, sectorB));
  });

  it('bounds jump time within docs/08\'s "5 min – 6 h" range', () => {
    const pairs: [Sector, Sector][] = [
      [sectorA, sectorB],
      [sectorA, sectorC],
      [sectorB, sectorC],
    ];
    for (const [x, y] of pairs) {
      const edge = computeJumpEdge(x, y);
      expect(edge.jumpMinutes).toBeGreaterThanOrEqual(5);
      expect(edge.jumpMinutes).toBeLessThanOrEqual(6 * 60);
    }
  });

  it('reports a pirate encounter chance of exactly 0 for a high-sec/high-sec pair', () => {
    const highSecA: Sector = { ...sectorA, securityLevel: 'high-sec' };
    const highSecB: Sector = { ...sectorB, securityLevel: 'high-sec' };
    const edge = computeJumpEdge(highSecA, highSecB);
    expect(edge.lowSecurity).toBe(false);
    expect(edge.pirateEncounterChance).toBe(0);
  });

  it('flags low security and a positive pirate chance when either side is low/null-sec', () => {
    const highSec: Sector = { ...sectorA, securityLevel: 'high-sec' };
    const lowSec: Sector = { ...sectorB, securityLevel: 'null-sec' };
    const edge = computeJumpEdge(highSec, lowSec);
    expect(edge.lowSecurity).toBe(true);
    expect(edge.pirateEncounterChance).toBeGreaterThan(0);
  });

  it('uses guild IDs, not sector names, as the edge identity (sorted, symmetric)', () => {
    const edge = computeJumpEdge(sectorA, sectorB);
    const [expectedA, expectedB] = [sectorA.guildId, sectorB.guildId].sort((x, y) => x.localeCompare(y));
    expect(edge.sectorA).toBe(expectedA);
    expect(edge.sectorB).toBe(expectedB);
  });
});

describe('buildJumpGraph', () => {
  it('produces one edge per unordered pair, order-independent', () => {
    const graphForward = buildJumpGraph([sectorA, sectorB, sectorC]);
    const graphReversed = buildJumpGraph([sectorC, sectorB, sectorA]);
    expect(graphForward).toHaveLength(3); // 3 choose 2
    expect(graphReversed).toEqual(graphForward);
  });

  it('returns an empty graph for fewer than two sectors', () => {
    expect(buildJumpGraph([sectorA])).toEqual([]);
    expect(buildJumpGraph([])).toEqual([]);
  });

  it('is stable across independent calls (determinism, not just object identity)', () => {
    const first = buildJumpGraph([deriveSector(twoPersonServer), deriveSector(fortyChannelServer)]);
    const second = buildJumpGraph([deriveSector(twoPersonServer), deriveSector(fortyChannelServer)]);
    expect(first).toEqual(second);
  });
});
