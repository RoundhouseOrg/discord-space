/**
 * Systems, jump graph, travel time (docs/08-geography.md). Pure game logic;
 * must never import from src/discord (enforced by eslint.config.mjs and
 * src/engine/layering.test.ts).
 *
 * Given a plain-data snapshot of a guild's categories and channels
 * (`GuildFixture` — not a discord.js object), `deriveSector` produces the
 * deterministic sector/body/zone map, and `buildJumpGraph` produces the
 * pairwise jump properties between a set of derived sectors.
 */
export { deriveSector, DEFAULT_MAX_ZONES_PER_BODY } from './sector';
export type { DeriveSectorOptions } from './sector';
export { computeJumpEdge, buildJumpGraph } from './jump-graph';
export type {
  Body,
  BodyType,
  CategoryFixture,
  ChannelFixture,
  ChannelKind,
  GuildFixture,
  JumpEdge,
  JumpGraph,
  ResourceSignature,
  Sector,
  SecurityLevel,
  StarClass,
  Zone,
  ZoneType,
} from './types';
export {
  CATEGORY_BODY_TYPES,
  RESOURCE_SIGNATURES,
  SECURITY_LEVELS,
  STAR_CLASSES,
  ZONE_TYPES,
} from './types';
