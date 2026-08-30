/**
 * Shapes for the combat engine (docs/10-combat.md). Pure data; no Discord
 * types, no rendering. `ShipTemplate` is the static loadout (a starter hull
 * or an NPC archetype); `ShipRuntimeState` is that loadout's mutable combat
 * state (current hull/shield/ammo) inside one `EncounterState`.
 */

/** `LONG` -> `MEDIUM` -> `CLOSE`, per docs/10 "Range bands". */
export const RANGE_BANDS = ['LONG', 'MEDIUM', 'CLOSE'] as const;
export type RangeBand = (typeof RANGE_BANDS)[number];

/** The five buttons in docs/10 "Actions". */
export const ACTIONS = ['FIRE', 'EVADE', 'CLOSE_IN', 'PULL_BACK', 'JUMP_OUT'] as const;
export type Action = (typeof ACTIONS)[number];

export interface WeaponTemplate {
  readonly name: string;
  /** Damage at `[LONG, MEDIUM, CLOSE]`, per docs/10 "Starter weapons". */
  readonly damage: readonly [number, number, number];
  /** Finite volleys (e.g. missiles: 4). `undefined` = unlimited ammo. */
  readonly ammo?: number;
}

/** A static loadout: a starter hull or an NPC archetype (docs/10). */
export interface ShipTemplate {
  readonly name: string;
  readonly hullMax: number;
  readonly shieldMax: number;
  readonly shieldRegen: number;
  readonly agility: number;
  readonly drive: number;
  /**
   * "From sensors/fittings; vs target evasion" (docs/10 "Ship stats"). The
   * starter-hull and NPC-archetype tables in docs/10 don't give per-ship
   * accuracy numbers, so every template here uses the same placeholder
   * (see ships.ts) — deliberately, so the simulation doesn't smuggle in an
   * accuracy spread the design doc never specified.
   */
  readonly accuracy: number;
  /** ECM fitting: reduces enemy accuracy and enemy escape chance. 0 if none. */
  readonly ecm: number;
  readonly weapons: readonly WeaponTemplate[];
}

/** One side's mutable state inside an `EncounterState`. */
export interface ShipRuntimeState {
  readonly template: ShipTemplate;
  readonly hull: number;
  readonly shield: number;
  /** Remaining ammo per `template.weapons` index; `Infinity` = unlimited. */
  readonly ammo: readonly number[];
  readonly escaped: boolean;
  readonly disabled: boolean;
}

/**
 * Terminal states for an encounter, named from a neutral (not "you")
 * perspective since the simulator runs archetype-vs-archetype. `A_WINS` =
 * B was disabled and A wasn't; `A_ESCAPED` = A got away (docs/10 "Escape:
 * keep everything, no reward") while B did not.
 */
export type EncounterOutcome =
  | 'A_WINS'
  | 'B_WINS'
  | 'MUTUAL_DISABLE'
  | 'A_ESCAPED'
  | 'B_ESCAPED'
  | 'BOTH_ESCAPED'
  | 'DISENGAGE';

export interface EncounterState {
  readonly round: number;
  readonly band: RangeBand;
  readonly a: ShipRuntimeState;
  readonly b: ShipRuntimeState;
  /** `null` while the fight is still going. */
  readonly outcome: EncounterOutcome | null;
}

export interface ApplyRoundResult {
  readonly state: EncounterState;
  readonly log: readonly string[];
}

/** Hard cap from docs/10: "Fights are 3-6 rounds typical, hard cap 8." */
export const MAX_ROUNDS = 8;
