import { describe, expect, it } from 'vitest';
import { fortyChannelServer } from './fixtures/forty-channel-server';
import { twoPersonServer } from './fixtures/two-person-server';
import { DEFAULT_MAX_ZONES_PER_BODY, deriveSector } from './sector';
import type { GuildFixture, Zone } from './types';
import { CATEGORY_BODY_TYPES, RESOURCE_SIGNATURES, SECURITY_LEVELS, STAR_CLASSES } from './types';

function allZones(bodies: ReturnType<typeof deriveSector>['bodies']): Zone[] {
  return bodies.flatMap((body) => body.zones);
}

describe('deriveSector: determinism', () => {
  it('produces byte-for-byte identical output across repeated calls (same fixture)', () => {
    const first = deriveSector(twoPersonServer);
    const second = deriveSector(twoPersonServer);
    expect(second).toEqual(first);
  });

  it('produces identical output for a fresh object with the same values (no identity leakage)', () => {
    const clone: GuildFixture = JSON.parse(JSON.stringify(twoPersonServer));
    expect(deriveSector(clone)).toEqual(deriveSector(twoPersonServer));
  });

  it('is stable for the larger fixture too', () => {
    expect(deriveSector(fortyChannelServer)).toEqual(deriveSector(fortyChannelServer));
  });

  it('renaming a channel does not change its zone (only the ID is hashed)', () => {
    const renamed: GuildFixture = {
      ...twoPersonServer,
      channels: twoPersonServer.channels.map((c) => (c.name === 'general' ? { ...c, name: 'general-chat' } : c)),
    };
    const before = allZones(deriveSector(twoPersonServer).bodies).find((z) => z.channelId === '100000000000000010');
    const after = allZones(deriveSector(renamed).bodies).find((z) => z.channelId === '100000000000000010');
    // Name/type are pinned to the ID, not the channel's current name.
    expect(after?.type).toBe(before?.type);
    expect(after?.name).toBe(before?.name);
  });

  it('two different guild IDs do not collide on sector identity', () => {
    const other = deriveSector({ ...twoPersonServer, guildId: '100000000000000002' });
    const original = deriveSector(twoPersonServer);
    expect(other.name === original.name && other.starClass === original.starClass).toBe(false);
  });
});

describe('deriveSector: 2-person server (few channels, no categories)', () => {
  const sector = deriveSector(twoPersonServer);

  it('rolls a sector identity from the allowed pools', () => {
    expect(STAR_CLASSES).toContain(sector.starClass);
    expect(SECURITY_LEVELS).toContain(sector.securityLevel);
    expect(RESOURCE_SIGNATURES).toContain(sector.resourceSignature);
    expect(sector.name.length).toBeGreaterThan(0);
  });

  it('puts every channel in the implicit deep-space body (no categories in the fixture)', () => {
    expect(sector.bodies).toHaveLength(1);
    expect(sector.bodies[0]!.type).toBe('deep-space');
    expect(sector.bodies[0]!.categoryId).toBeUndefined();
    expect(sector.bodies[0]!.zones).toHaveLength(twoPersonServer.channels.length);
  });

  it('guarantees a capital station even in a 2-channel sector', () => {
    expect(sector.capitalZoneChannelId).toBeDefined();
    const capital = allZones(sector.bodies).find((z) => z.channelId === sector.capitalZoneChannelId);
    expect(capital?.isCapital).toBe(true);
    expect(capital?.type).toBe('station');
  });

  it('guarantees a resource zone once there is more than one zone to work with', () => {
    const zones = allZones(sector.bodies);
    expect(zones.length).toBeGreaterThan(1);
    expect(zones.some((z) => z.type === 'belt' || z.type === 'refinery')).toBe(true);
  });

  it('exactly one zone is the capital', () => {
    expect(allZones(sector.bodies).filter((z) => z.isCapital)).toHaveLength(1);
  });
});

describe('deriveSector: ~40-channel server with categories', () => {
  const sector = deriveSector(fortyChannelServer);

  it('derives one body per category that has at least one eligible (text) channel, plus deep-space', () => {
    // 5 categories in the fixture, all with text channels, plus the uncategorized group.
    expect(sector.bodies).toHaveLength(6);
    expect(sector.bodies.filter((b) => b.type === 'deep-space')).toHaveLength(1);
  });

  it('body types come from the category pool (never deep-space for a real category)', () => {
    for (const body of sector.bodies) {
      if (body.categoryId === undefined) continue;
      expect(CATEGORY_BODY_TYPES).toContain(body.type);
    }
  });

  it('ignores voice, thread, and forum channels entirely (docs/08 edge case: v1 only handles text)', () => {
    const devBody = sector.bodies.find((b) => b.categoryId === '200000000000000004')!;
    const zoneIds = devBody.zones.map((z) => z.channelId);
    expect(zoneIds).not.toContain('200000000000004005'); // dev-voice
    expect(zoneIds).not.toContain('200000000000004007'); // dev-forum
    expect(devBody.zones).toHaveLength(5);

    const staffBody = sector.bodies.find((b) => b.categoryId === '200000000000000005')!;
    const staffZoneIds = staffBody.zones.map((z) => z.channelId);
    expect(staffZoneIds).not.toContain('200000000000005005'); // staff-voice
    expect(staffZoneIds).not.toContain('200000000000005006'); // staff-threads
    expect(staffBody.zones).toHaveLength(4);
  });

  it('marks channels without send permission as no-signal', () => {
    const staffBody = sector.bodies.find((b) => b.categoryId === '200000000000000005')!;
    const modChat = staffBody.zones.find((z) => z.channelId === '200000000000005001')!;
    const adminOnly = staffBody.zones.find((z) => z.channelId === '200000000000005002')!;
    const staffAnnouncements = staffBody.zones.find((z) => z.channelId === '200000000000005003')!;
    expect(modChat.noSignal).toBe(true);
    expect(adminOnly.noSignal).toBe(true);
    expect(staffAnnouncements.noSignal).toBe(false);
  });

  it('caps zones per body and marks the overflow uncharted, deterministically by channel ID', () => {
    const miningBody = sector.bodies.find((b) => b.categoryId === '200000000000000002')!;
    expect(miningBody.zones).toHaveLength(9); // fixture has 9 eligible channels in this category
    const uncharted = miningBody.zones.filter((z) => z.uncharted);
    expect(uncharted).toHaveLength(9 - DEFAULT_MAX_ZONES_PER_BODY);
    // The overflow is the highest-sorted channel ID, not an arbitrary one.
    const sortedIds = [...miningBody.zones].map((z) => z.channelId).sort((a, b) => a.localeCompare(b));
    expect(uncharted.map((z) => z.channelId)).toEqual(sortedIds.slice(DEFAULT_MAX_ZONES_PER_BODY));
  });

  it('respects a custom zone-per-body cap', () => {
    const capped = deriveSector(fortyChannelServer, { maxZonesPerBody: 3 });
    const miningBody = capped.bodies.find((b) => b.categoryId === '200000000000000002')!;
    expect(miningBody.zones.filter((z) => z.uncharted)).toHaveLength(9 - 3);
  });

  it('applies keyword flavor bias on the initial roll', () => {
    const tradeBody = sector.bodies.find((b) => b.categoryId === '200000000000000003')!;
    const market = tradeBody.zones.find((z) => z.channelId === '200000000000003001')!; // "market"
    const shopFront = tradeBody.zones.find((z) => z.channelId === '200000000000003003')!; // "shop-front"
    const tradeBar = tradeBody.zones.find((z) => z.channelId === '200000000000003008')!; // "the-bar"
    expect(market.type).toBe('station-market');
    expect(shopFront.type).toBe('station-market');
    expect(tradeBar.type).toBe('station-cantina');

    const miningBody = sector.bodies.find((b) => b.categoryId === '200000000000000002')!;
    const miningTalk = miningBody.zones.find((z) => z.channelId === '200000000000002001')!; // "mining-talk"
    expect(miningTalk.type).toBe('belt');

    const devBody = sector.bodies.find((b) => b.categoryId === '200000000000000004')!;
    const buildLogs = devBody.zones.find((z) => z.channelId === '200000000000004002')!; // "build-logs"
    expect(buildLogs.type).toBe('shipyard');
  });

  it('puts only uncategorized channels in the deep-space body', () => {
    const deepSpace = sector.bodies.find((b) => b.type === 'deep-space')!;
    expect(deepSpace.zones).toHaveLength(6);
    const expectedIds = fortyChannelServer.channels
      .filter((c) => c.categoryId === undefined)
      .map((c) => c.id)
      .sort();
    expect(deepSpace.zones.map((z) => z.channelId).sort()).toEqual(expectedIds);
  });

  it('every eligible channel produces exactly one zone somewhere in the sector', () => {
    const eligibleChannelIds = fortyChannelServer.channels
      .filter((c) => (c.kind ?? 'text') === 'text')
      .map((c) => c.id)
      .sort();
    const zoneChannelIds = allZones(sector.bodies)
      .map((z) => z.channelId)
      .sort();
    expect(zoneChannelIds).toEqual(eligibleChannelIds);
  });

  it('guarantees exactly one capital station', () => {
    expect(allZones(sector.bodies).filter((z) => z.isCapital)).toHaveLength(1);
    expect(sector.capitalZoneChannelId).toBeDefined();
  });
});

describe('deriveSector: edge cases', () => {
  it('handles a guild with zero channels', () => {
    const sector = deriveSector({ guildId: '900000000000000001', channels: [] });
    expect(sector.bodies).toHaveLength(0);
    expect(sector.capitalZoneChannelId).toBeUndefined();
  });

  it('does not create a body for a category with only non-text channels', () => {
    const fixture: GuildFixture = {
      guildId: '900000000000000002',
      categories: [{ id: 'cat-1', name: 'Voice Only' }],
      channels: [{ id: 'chan-1', name: 'general-voice', categoryId: 'cat-1', kind: 'voice' }],
    };
    const sector = deriveSector(fixture);
    expect(sector.bodies).toHaveLength(0);
  });

  it('a single-zone sector only guarantees the capital, not a separate resource zone', () => {
    const fixture: GuildFixture = {
      guildId: '900000000000000003',
      channels: [{ id: 'chan-1', name: 'general' }],
    };
    const sector = deriveSector(fixture);
    const zones = allZones(sector.bodies);
    expect(zones).toHaveLength(1);
    expect(zones[0]!.isCapital).toBe(true);
    expect(zones[0]!.type).toBe('station');
  });

  it('never picks a no-signal zone as capital when a signal-enabled zone is available, even if the no-signal zone sorts first', () => {
    const fixture: GuildFixture = {
      guildId: '900000000000000004',
      channels: [
        { id: 'chan-1', name: 'admin-vault', botCanSend: false }, // sorts first by channel ID
        { id: 'chan-2', name: 'general', botCanSend: true },
      ],
    };
    const sector = deriveSector(fixture);
    const zones = allZones(sector.bodies);
    const capital = zones.find((z) => z.isCapital)!;
    expect(capital.channelId).toBe('chan-2');
    expect(capital.noSignal).toBe(false);
  });

  it('falls back to a no-signal zone as capital when it is the only zone available', () => {
    const fixture: GuildFixture = {
      guildId: '900000000000000005',
      channels: [{ id: 'chan-1', name: 'locked-room', botCanSend: false }],
    };
    const sector = deriveSector(fixture);
    const zones = allZones(sector.bodies);
    expect(zones).toHaveLength(1);
    expect(zones[0]!.isCapital).toBe(true);
    expect(zones[0]!.noSignal).toBe(true);
    expect(sector.capitalZoneChannelId).toBe('chan-1');
  });

  it('does not credit the capital zone toward the resource-zone guarantee if it was resource-typed before being forced into a station', () => {
    // Two channels; force channel IDs so the mining-keyword one (which would
    // roll 'belt') sorts first and would normally be picked as capital.
    const fixture: GuildFixture = {
      guildId: '900000000000000006',
      channels: [
        { id: 'a-mining-ops', name: 'mining-ops' },
        { id: 'b-general', name: 'general' },
      ],
    };
    const sector = deriveSector(fixture);
    const zones = allZones(sector.bodies);
    const capital = zones.find((z) => z.isCapital)!;
    expect(capital.channelId).toBe('a-mining-ops');
    expect(capital.type).toBe('station');
    // The resource-zone guarantee must still be met by a *different* zone.
    expect(zones.some((z) => z.type === 'belt' || z.type === 'refinery')).toBe(true);
    expect(zones.filter((z) => z.type === 'belt' || z.type === 'refinery')).toHaveLength(1);
  });
});
