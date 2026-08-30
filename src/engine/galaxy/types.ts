/**
 * Shapes for the galaxy engine (docs/08-geography.md). `GuildFixture` and
 * friends are the pure, Discord-shaped-but-not-Discord input: a plain data
 * snapshot of a guild's categories/channels, not a discord.js object. This
 * keeps `src/engine/galaxy` importable and testable with zero Discord
 * dependency (docs/05-tech-stack.md layering rule).
 */

/**
 * Channel kinds we know about. Per docs/08-geography.md ("Threads / voice /
 * forum channels | Ignored in v1 (not zones)") only `text` channels become
 * zones; everything else is filtered out during derivation. Defaults to
 * `text` when omitted so minimal fixtures stay terse.
 */
export type ChannelKind = 'text' | 'voice' | 'thread' | 'forum';

export interface CategoryFixture {
  readonly id: string;
  /** Not used in derivation (only IDs are hashed) — kept for fixture readability. */
  readonly name: string;
}

export interface ChannelFixture {
  readonly id: string;
  /** Used only for the flavor-keyword bias on the *initial* zone-type roll. */
  readonly name: string;
  /** Absent/undefined = uncategorized -> lands in the sector's deep-space body. */
  readonly categoryId?: string | undefined;
  /** Defaults to `'text'`. */
  readonly kind?: ChannelKind;
  /**
   * Whether the bot can send messages here, i.e. Discord permissions.
   * Defaults to `true`. `false` produces a "no-signal" zone (docs/08:
   * "Zone exists on the map but is 'no-signal': visible, not enterable.").
   */
  readonly botCanSend?: boolean;
}

export interface GuildFixture {
  readonly guildId: string;
  /** Not used in derivation — kept for fixture readability only. */
  readonly name?: string;
  readonly categories?: readonly CategoryFixture[];
  readonly channels: readonly ChannelFixture[];
}

export const STAR_CLASSES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'] as const;
export type StarClass = (typeof STAR_CLASSES)[number];

export const SECURITY_LEVELS = ['high-sec', 'low-sec', 'null-sec'] as const;
export type SecurityLevel = (typeof SECURITY_LEVELS)[number];

export const RESOURCE_SIGNATURES = [
  'iron-rich',
  'gas-rich',
  'ice',
  'pirate-infested',
  'trade-hub',
  'crystalline',
  'organic-rich',
] as const;
export type ResourceSignature = (typeof RESOURCE_SIGNATURES)[number];

/** Body types a category can roll into; `'deep-space'` is reserved for the sector's implicit uncategorized body. */
export const CATEGORY_BODY_TYPES = ['planet', 'moon', 'asteroid-belt', 'star'] as const;
export type BodyType = (typeof CATEGORY_BODY_TYPES)[number] | 'deep-space';

export const ZONE_TYPES = [
  'station',
  'station-market',
  'station-cantina',
  'shipyard',
  'naval-base',
  'surface-colony',
  'orbit',
  'refinery',
  'wreck-field',
  'ruins',
  'nebula-pocket',
  'belt',
] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

export interface Zone {
  readonly channelId: string;
  readonly type: ZoneType;
  readonly name: string;
  /** Bot lacks send permission here: visible on the map, not enterable. */
  readonly noSignal: boolean;
  /** Beyond the per-body zone cap on huge servers: exists, but hidden until an admin promotes it. */
  readonly uncharted: boolean;
  /** The sector's guaranteed capital station (docs/08: "Guaranteed minimums"). */
  readonly isCapital: boolean;
}

export interface Body {
  /** `categoryId`, or the literal `'deep-space'` sentinel for the uncategorized body. */
  readonly id: string;
  readonly categoryId: string | undefined;
  readonly type: BodyType;
  readonly name: string;
  readonly zones: readonly Zone[];
}

export interface Sector {
  readonly guildId: string;
  readonly name: string;
  readonly starClass: StarClass;
  readonly securityLevel: SecurityLevel;
  readonly resourceSignature: ResourceSignature;
  readonly bodies: readonly Body[];
  /** Undefined only when the sector has zero eligible channels at all. */
  readonly capitalZoneChannelId: string | undefined;
}

export interface JumpEdge {
  readonly sectorA: string;
  readonly sectorB: string;
  /** Bounded, stable, symmetric (docs/08: "5 min – 6 h"). */
  readonly jumpMinutes: number;
  /** True when either endpoint is outside high-sec — pirate encounters can roll. */
  readonly lowSecurity: boolean;
  /** 0 when `lowSecurity` is false; otherwise a stable per-pair chance in [0.01, 0.4]. */
  readonly pirateEncounterChance: number;
}

export type JumpGraph = readonly JumpEdge[];
