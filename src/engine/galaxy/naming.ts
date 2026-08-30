/**
 * Deterministic flavor-name generation (docs/08-geography.md mental model:
 * "Vega sector", "Kessler Station"). Word lists are intentionally modest —
 * this is a first pass at "own factions, station names... a consistent tone"
 * (docs/04-game-design.md); expanding the lists later never breaks
 * determinism for existing IDs, it just widens the pool going forward.
 */
import type { Rng } from './rng';
import { pick } from './rng';
import type { BodyType, ZoneType } from './types';

const SECTOR_NAME_WORDS = [
  'Vega',
  'Kessler',
  'Tau Ceti',
  'Orion',
  'Nyx',
  'Helix',
  'Cygnus',
  'Draco',
  'Lyra',
  'Halcyon',
  'Meridian',
  'Solace',
  'Ashen',
  'Ember',
  'Frost',
  'Umbra',
  'Zenith',
  'Corvus',
  'Aster',
  'Nova',
] as const;

const SECTOR_NAME_SUFFIXES = [
  'Prime',
  'Reach',
  'Expanse',
  'Drift',
  'Verge',
  'Hollow',
  'Cradle',
  'Span',
] as const;

const BODY_NAME_WORDS = [
  'Kessler',
  'Ashgate',
  'Rustwater',
  'Greywake',
  'Emberfall',
  'Coldharbor',
  'Farrow',
  'Thistledown',
  'Blackreach',
  'Hollowmere',
  'Wintervale',
  'Sablecrest',
] as const;

const BODY_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const;

const ZONE_NAME_WORDS = [
  'Kessler',
  'Ashgate',
  'Rustwater',
  'Greywake',
  'Emberfall',
  'Coldharbor',
  'Farrow',
  'Thistledown',
  'Blackreach',
  'Hollowmere',
  'Wintervale',
  'Sablecrest',
  'Driftholm',
  'Cinderpoint',
  'Longshadow',
  'Palewater',
] as const;

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  station: 'Station',
  'station-market': 'Market Station',
  'station-cantina': 'Cantina',
  shipyard: 'Shipyard',
  'naval-base': 'Naval Base',
  'surface-colony': 'Colony',
  orbit: 'Orbital Platform',
  refinery: 'Refinery',
  'wreck-field': 'Wreck Field',
  ruins: 'Ruins',
  'nebula-pocket': 'Nebula Pocket',
  belt: 'Belt',
};

const DEEP_SPACE_NAME = 'the Deep' as const;

export function generateSectorName(rng: Rng): string {
  return `${pick(rng, SECTOR_NAME_WORDS)} ${pick(rng, SECTOR_NAME_SUFFIXES)}`;
}

export function generateBodyName(rng: Rng, bodyType: BodyType): string {
  if (bodyType === 'deep-space') return DEEP_SPACE_NAME;
  return `${pick(rng, BODY_NAME_WORDS)} ${pick(rng, BODY_NUMERALS)}`;
}

export function generateZoneName(rng: Rng, zoneType: ZoneType): string {
  return `${pick(rng, ZONE_NAME_WORDS)} ${ZONE_TYPE_LABELS[zoneType]}`;
}
