/**
 * Derives a sector (and its bodies and zones) from a guild fixture
 * (docs/08-geography.md). Pure and deterministic: same fixture in, same
 * `Sector` out, every time, with nothing stored.
 *
 * Decisions the doc leaves open, made here (called out per the issue):
 * - Body/zone *names* are generated independently of their *type*, seeded
 *   only by ID (and sector, for bodies). This lets us force a zone's type to
 *   satisfy a "guaranteed minimum" (see below) without discarding an
 *   otherwise-valid generated name.
 * - "Cap zones per body" (huge servers): capped zones aren't dropped, they're
 *   kept and flagged `uncharted: true` ("extras are 'uncharted' until an
 *   admin promoted them" — promotion is a stateful admin action out of scope
 *   for this pure derivation).
 * - Deterministic ordering (which zones are capped, which zone becomes
 *   capital) sorts by channel ID string. Real snowflakes sort correctly this
 *   way for practical purposes (mixed-width IDs only differ in fixtures);
 *   what matters is that the order is *stable*, not that it's chronological.
 * - Guaranteed minimums (docs/08: "every sector has at least one station...
 *   and one resource zone"): enforced by re-typing existing zones, chosen
 *   deterministically, when the sector doesn't already have one. A
 *   single-zone sector can only satisfy the capital guarantee — there's
 *   nowhere else to put a distinct resource zone. Candidates prefer
 *   signal-enabled zones (`noSignal: false`) over no-signal ones, since a
 *   capital nobody can actually reach doesn't satisfy "every server is
 *   playable alone" — falling back to no-signal only when nothing else
 *   is charted.
 * - Categories/the deep-space slot with zero eligible (text) channels don't
 *   produce a `Body` at all — an empty body isn't a place.
 */
import { generateBodyName, generateSectorName, generateZoneName } from './naming';
import { pick, rngFor } from './rng';
import type {
  Body,
  BodyType,
  ChannelFixture,
  GuildFixture,
  ResourceSignature,
  Sector,
  SecurityLevel,
  StarClass,
  Zone,
  ZoneType,
} from './types';
import { CATEGORY_BODY_TYPES, RESOURCE_SIGNATURES, SECURITY_LEVELS, STAR_CLASSES, ZONE_TYPES } from './types';

const DEEP_SPACE_BODY_ID = 'deep-space';

export const DEFAULT_MAX_ZONES_PER_BODY = 8;

export interface DeriveSectorOptions {
  /** Docs/08 edge case: "cap zones per body (e.g. 8); extras are 'uncharted'." */
  readonly maxZonesPerBody?: number;
}

/** Keyword bias for the *initial* zone-type roll (docs/08: "Flavor heuristics"). First match wins. */
const KEYWORD_ZONE_RULES: ReadonlyArray<{ pattern: RegExp; type: ZoneType }> = [
  { pattern: /mining|\bore\b/i, type: 'belt' },
  { pattern: /market|trade|shop/i, type: 'station-market' },
  { pattern: /lounge|\bbar\b/i, type: 'station-cantina' },
  { pattern: /dev|build/i, type: 'shipyard' },
  { pattern: /mod|admin|staff/i, type: 'naval-base' },
];

/** Zone types generated when no keyword matches. */
const GENERIC_ZONE_TYPES: readonly ZoneType[] = ZONE_TYPES.filter(
  (type) => !KEYWORD_ZONE_RULES.some((rule) => rule.type === type),
);

/** Zone types that count as a "station" for the capital guarantee. */
const STATION_ZONE_TYPES: ReadonlySet<ZoneType> = new Set(['station', 'station-market', 'station-cantina']);

/** Zone types that count as a "resource zone" for the resource guarantee. */
const RESOURCE_ZONE_TYPES: ReadonlySet<ZoneType> = new Set(['belt', 'refinery']);

function byChannelId<T extends { readonly channelId: string }>(a: T, b: T): number {
  return a.channelId.localeCompare(b.channelId);
}

function isEligibleChannel(channel: ChannelFixture): boolean {
  return (channel.kind ?? 'text') === 'text';
}

function rollZoneType(rng: () => number, channelName: string): ZoneType {
  const keywordMatch = KEYWORD_ZONE_RULES.find((rule) => rule.pattern.test(channelName));
  if (keywordMatch) return keywordMatch.type;
  return pick(rng, GENERIC_ZONE_TYPES);
}

/**
 * A zone's name is seeded independently from its type roll (separate `rngFor`
 * streams below) so that forcing a zone's *type* later (guaranteed minimums)
 * can regenerate a *matching* name from the same stable seed, instead of
 * leaving e.g. a forced-`station` zone stuck with a name generated for the
 * `belt` it almost was.
 */
function zoneNameFor(guildId: string, bodyId: string, channelId: string, type: ZoneType): string {
  const nameRng = rngFor(guildId, bodyId, channelId, 'name');
  return generateZoneName(nameRng, type);
}

function buildZone(
  channel: ChannelFixture,
  guildId: string,
  bodyId: string,
  maxIndexBeforeUncharted: number,
  indexInBody: number,
): Zone {
  const typeRng = rngFor(guildId, bodyId, channel.id, 'type');
  const type = rollZoneType(typeRng, channel.name);
  return {
    channelId: channel.id,
    type,
    name: zoneNameFor(guildId, bodyId, channel.id, type),
    noSignal: channel.botCanSend === false,
    uncharted: indexInBody >= maxIndexBeforeUncharted,
    isCapital: false,
  };
}

function buildBody(
  guildId: string,
  categoryId: string | undefined,
  bodyType: BodyType,
  channels: readonly ChannelFixture[],
  maxZonesPerBody: number,
): Body {
  const bodyId = categoryId ?? DEEP_SPACE_BODY_ID;
  const orderedChannels = [...channels].sort((a, b) => a.id.localeCompare(b.id));
  const zones = orderedChannels
    .map((channel, index) => buildZone(channel, guildId, bodyId, maxZonesPerBody, index))
    .sort(byChannelId);

  const bodyRng = rngFor(guildId, bodyId);
  return {
    id: bodyId,
    categoryId,
    type: bodyType,
    name: generateBodyName(bodyRng, bodyType),
    zones,
  };
}

/** Re-types `zone`, regenerating its name to match (see `zoneNameFor`) so the two never disagree. */
function withType(zone: Zone, type: ZoneType, guildId: string, bodyId: string): Zone {
  if (zone.type === type) return zone;
  return { ...zone, type, name: zoneNameFor(guildId, bodyId, zone.channelId, type) };
}

function withCapital(zone: Zone): Zone {
  return { ...zone, isCapital: true };
}

/**
 * Enforces docs/08's guaranteed minimums: at least one station (the
 * capital) and, when there's more than one charted zone to work with, at
 * least one resource zone. Mutates via structural copies, never the
 * original arrays.
 */
function applyGuaranteedMinimums(
  guildId: string,
  bodies: readonly Body[],
): { bodies: Body[]; capitalZoneChannelId: string | undefined } {
  const chartedByChannelId = new Map<string, { bodyIndex: number; zoneIndex: number; zone: Zone }>();
  bodies.forEach((body, bodyIndex) => {
    body.zones.forEach((zone, zoneIndex) => {
      if (!zone.uncharted) chartedByChannelId.set(zone.channelId, { bodyIndex, zoneIndex, zone });
    });
  });

  const chartedInOrder = [...chartedByChannelId.values()].sort((a, b) => byChannelId(a.zone, b.zone));
  if (chartedInOrder.length === 0) {
    return { bodies: bodies.map((body) => ({ ...body, zones: [...body.zones] })), capitalZoneChannelId: undefined };
  }

  const mutableBodies = bodies.map((body) => ({ ...body, zones: [...body.zones] }));

  // A no-signal zone (bot can't send there) can't actually serve as the
  // "every server is playable alone" capital/resource guarantee, so prefer
  // signal-enabled zones for both roles. Only fall back to a no-signal zone
  // when literally nothing else is charted — a guarantee that can't be met
  // cleanly still shouldn't leave `capitalZoneChannelId` undefined.
  const usableInOrder = chartedInOrder.filter((entry) => !entry.zone.noSignal);
  const capitalCandidates = usableInOrder.length > 0 ? usableInOrder : chartedInOrder;

  const existingCapital = capitalCandidates.find((entry) => STATION_ZONE_TYPES.has(entry.zone.type));
  const capitalEntry = existingCapital ?? capitalCandidates[0]!;
  const capitalBody = mutableBodies[capitalEntry.bodyIndex]!;
  const capitalZone = capitalBody.zones[capitalEntry.zoneIndex]!;
  capitalBody.zones[capitalEntry.zoneIndex] = withCapital(withType(capitalZone, 'station', guildId, capitalBody.id));

  // Exclude the capital's own (pre-mutation) type here: if it was the only
  // resource-typed zone, it no longer counts once it's overwritten to
  // 'station' above.
  const hasResourceZone = chartedInOrder.some(
    (entry) => entry.zone.channelId !== capitalEntry.zone.channelId && RESOURCE_ZONE_TYPES.has(entry.zone.type),
  );
  const resourceCandidates = capitalCandidates.filter((entry) => entry.zone.channelId !== capitalEntry.zone.channelId);
  if (!hasResourceZone && resourceCandidates.length > 0) {
    const resourceEntry = resourceCandidates[0]!;
    const resourceBody = mutableBodies[resourceEntry.bodyIndex]!;
    const resourceZone = resourceBody.zones[resourceEntry.zoneIndex]!;
    resourceBody.zones[resourceEntry.zoneIndex] = withType(resourceZone, 'belt', guildId, resourceBody.id);
  }

  return { bodies: mutableBodies, capitalZoneChannelId: capitalEntry.zone.channelId };
}

function groupChannelsByCategory(
  channels: readonly ChannelFixture[],
): { categoryId: string | undefined; channels: ChannelFixture[] }[] {
  const groups = new Map<string | undefined, ChannelFixture[]>();
  for (const channel of channels) {
    if (!isEligibleChannel(channel)) continue;
    const key = channel.categoryId ?? undefined;
    const group = groups.get(key);
    if (group) group.push(channel);
    else groups.set(key, [channel]);
  }
  return [...groups.entries()].map(([categoryId, groupChannels]) => ({ categoryId, channels: groupChannels }));
}

/** Derives the deterministic sector — bodies, zones, capital — for one guild fixture. */
export function deriveSector(fixture: GuildFixture, options: DeriveSectorOptions = {}): Sector {
  const maxZonesPerBody = options.maxZonesPerBody ?? DEFAULT_MAX_ZONES_PER_BODY;
  const sectorRng = rngFor(fixture.guildId);
  const name = generateSectorName(sectorRng);
  const starClass = pick(sectorRng, STAR_CLASSES) as StarClass;
  const securityLevel = pick(sectorRng, SECURITY_LEVELS) as SecurityLevel;
  const resourceSignature = pick(sectorRng, RESOURCE_SIGNATURES) as ResourceSignature;

  // `fixture.categories` isn't consulted here: a category only becomes a
  // `Body` by virtue of channels pointing at its ID (docs/08 hashes IDs, and
  // only IDs — the categories array is fixture-readability metadata).
  const groups = groupChannelsByCategory(fixture.channels);

  const rawBodies = groups.map((group) => {
    if (group.categoryId === undefined) {
      return buildBody(fixture.guildId, undefined, 'deep-space', group.channels, maxZonesPerBody);
    }
    const bodyRng = rngFor(fixture.guildId, group.categoryId);
    const bodyType = pick(bodyRng, CATEGORY_BODY_TYPES);
    return buildBody(fixture.guildId, group.categoryId, bodyType, group.channels, maxZonesPerBody);
  });

  // Sort bodies deterministically: deep-space last, categorized bodies by category ID.
  rawBodies.sort((a, b) => {
    if (a.id === DEEP_SPACE_BODY_ID) return 1;
    if (b.id === DEEP_SPACE_BODY_ID) return -1;
    return a.id.localeCompare(b.id);
  });

  const { bodies, capitalZoneChannelId } = applyGuaranteedMinimums(fixture.guildId, rawBodies);

  return {
    guildId: fixture.guildId,
    name,
    starClass,
    securityLevel,
    resourceSignature,
    bodies,
    capitalZoneChannelId,
  };
}
