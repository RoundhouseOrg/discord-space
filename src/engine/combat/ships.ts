/**
 * Loadouts for the simulator: docs/10-combat.md's "Starter weapons",
 * "Starter hulls", and "NPC archetypes" tables, translated into
 * `ShipTemplate`s.
 *
 * Two gaps the design doc leaves open, filled in here *only* so the
 * simulator has numbers to run with (not a design change — see docs/13):
 *
 * - **Accuracy** isn't in either table (docs/10 lists it as a ship stat but
 *   never gives per-hull values). Every template below uses the same
 *   `DEFAULT_ACCURACY`, so the simulation can't be accused of smuggling in
 *   an accuracy spread the doc never specified.
 * - **NPC archetype hull/shield/agility/drive numbers** aren't given either
 *   — docs/10 only describes archetypes by loadout + behaviour ("Raider:
 *   2x Autocannon, low shields... always closes"). The stats below are
 *   built from the closest starter hull the flavour text implies, nudged by
 *   the one-line description. Swarm is excluded: docs/10 flags it
 *   "(v2)... Multi-target rules needed", which is out of scope for a 1v1
 *   simulator.
 */
import type { ShipTemplate, WeaponTemplate } from './types';

/** Same accuracy for every template — see file header. */
export const DEFAULT_ACCURACY = 8;

export const WEAPONS = {
  railgun: { name: 'Railgun', damage: [25, 12, 4] } satisfies WeaponTemplate,
  autocannon: { name: 'Autocannon', damage: [5, 15, 30] } satisfies WeaponTemplate,
  missiles: { name: 'Missiles', damage: [20, 20, 0], ammo: 4 } satisfies WeaponTemplate,
  miningLaser: { name: 'Mining laser', damage: [0, 0, 12] } satisfies WeaponTemplate,
} as const;

/** docs/10 "Starter hulls (placeholder numbers)". */
export const STARTER_HULLS = {
  interceptor: {
    name: 'Interceptor',
    hullMax: 100,
    shieldMax: 60,
    shieldRegen: 10,
    agility: 6,
    drive: 5,
    accuracy: DEFAULT_ACCURACY,
    ecm: 0,
    weapons: [WEAPONS.autocannon, WEAPONS.railgun],
  },
  courier: {
    name: 'Courier',
    hullMax: 70,
    shieldMax: 40,
    shieldRegen: 8,
    agility: 9,
    drive: 8,
    accuracy: DEFAULT_ACCURACY,
    ecm: 0,
    weapons: [WEAPONS.autocannon],
  },
  freighter: {
    name: 'Freighter',
    hullMax: 160,
    shieldMax: 40,
    shieldRegen: 5,
    // "(+escape module)" in docs/10 — folded into a higher drive rather than
    // modelled as a separate fitting, since the sim has no fitting slots.
    agility: 3,
    drive: 5,
    accuracy: DEFAULT_ACCURACY,
    ecm: 0,
    weapons: [WEAPONS.autocannon],
  },
  prospector: {
    name: 'Prospector',
    hullMax: 110,
    shieldMax: 40,
    shieldRegen: 6,
    agility: 4,
    drive: 5,
    accuracy: DEFAULT_ACCURACY,
    ecm: 0,
    weapons: [WEAPONS.miningLaser],
  },
} satisfies Record<string, ShipTemplate>;

/**
 * docs/10 "NPC archetypes". Stat numbers are this file's own placeholders
 * (see header) built from the archetype's one-line flavour text; Swarm is
 * omitted (needs multi-target rules the engine doesn't have).
 */
export const NPC_ARCHETYPES = {
  raider: {
    name: 'Raider',
    hullMax: 90,
    // "low shields" per docs/10.
    shieldMax: 20,
    shieldRegen: 5,
    agility: 5,
    drive: 4,
    accuracy: DEFAULT_ACCURACY,
    ecm: 0,
    weapons: [WEAPONS.autocannon, WEAPONS.autocannon],
  },
  sniper: {
    name: 'Sniper',
    hullMax: 70,
    shieldMax: 30,
    shieldRegen: 6,
    // "high agility" per docs/10.
    agility: 9,
    drive: 6,
    accuracy: DEFAULT_ACCURACY,
    ecm: 0,
    weapons: [WEAPONS.railgun],
  },
  interdictor: {
    name: 'Interdictor',
    hullMax: 100,
    shieldMax: 50,
    shieldRegen: 6,
    agility: 5,
    drive: 4,
    accuracy: DEFAULT_ACCURACY,
    // "Missiles + ECM" per docs/10.
    ecm: 3,
    weapons: [WEAPONS.missiles],
  },
  brute: {
    name: 'Brute',
    // "Big hull... tanks" per docs/10.
    hullMax: 220,
    shieldMax: 60,
    shieldRegen: 5,
    // "Slow closer" per docs/10.
    agility: 2,
    drive: 2,
    accuracy: DEFAULT_ACCURACY,
    ecm: 0,
    weapons: [WEAPONS.autocannon, WEAPONS.autocannon],
  },
} satisfies Record<string, ShipTemplate>;

/** Archetypes docs/10 starts at Medium range (an ambush), not Long. */
export const AMBUSH_ARCHETYPES: ReadonlySet<string> = new Set([NPC_ARCHETYPES.interdictor.name]);
