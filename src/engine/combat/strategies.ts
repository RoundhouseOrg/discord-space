/**
 * The three "simple strategies" from GitHub issue #4: always-Fire,
 * band-control, and mixed. These drive the *simulator's* decision-making —
 * they are not the docs/10 "NPC archetypes" flavour-text scripts (Raider
 * "always closes", Sniper "holds Long", ...); the archetypes here only
 * supply loadout/stats (see ships.ts), and any of the three strategies can
 * be paired with any archetype. That's a deliberate simplification so the
 * same three strategies are directly comparable across every matchup — see
 * docs/13-combat-simulation.md.
 */
import type { Action, RangeBand, ShipRuntimeState, WeaponTemplate } from './types';
import { RANGE_BANDS } from './types';
import type { Rng } from './rng';
import { pick } from './rng';

export interface SideView {
  readonly round: number;
  readonly band: RangeBand;
  readonly self: ShipRuntimeState;
  readonly enemy: ShipRuntimeState;
}

export type Strategy = (view: SideView, rng: Rng) => Action;

const BAND_INDEX: Record<RangeBand, number> = { LONG: 0, MEDIUM: 1, CLOSE: 2 };

/**
 * The band where this loadout's weapons do the most total damage. Ties
 * (e.g. Interdictor's missiles: 20 at Long, 20 at Medium, 0 at Close) go to
 * whichever band is scanned first, LONG -> MEDIUM -> CLOSE — a plain,
 * documented tie-break, not an attempt to reproduce each archetype's
 * individual flavour-text behaviour (that's out of scope; see file header).
 */
export function preferredBand(weapons: readonly WeaponTemplate[]): RangeBand {
  const totals = RANGE_BANDS.map((_, bandIdx) => weapons.reduce((sum, w) => sum + (w.damage[bandIdx] ?? 0), 0));
  let bestIdx = 0;
  for (let i = 1; i < totals.length; i++) {
    if ((totals[i] as number) > (totals[bestIdx] as number)) bestIdx = i;
  }
  return RANGE_BANDS[bestIdx] as RangeBand;
}

function moveToward(current: RangeBand, target: RangeBand): Action {
  if (target === current) return 'FIRE';
  return BAND_INDEX[target] > BAND_INDEX[current] ? 'CLOSE_IN' : 'PULL_BACK';
}

/** Random tactical action for the "deviation" noise below — never Jump out, so noise doesn't read as fleeing. */
const NOISE_ACTIONS: readonly Action[] = ['FIRE', 'EVADE', 'CLOSE_IN', 'PULL_BACK'];

/** The naive baseline the open question in docs/10 asks about: press Fire every round, nothing else. */
export const alwaysFireStrategy: Strategy = () => 'FIRE';

/**
 * Seeks its own best-damage band and fires once there. ~15% random
 * deviation, matching docs/10's "NPC archetypes... ~15% random deviation so
 * fights aren't fully predictable" flavour, applied generically here.
 */
export const BAND_CONTROL_NOISE = 0.15;

export const bandControlStrategy: Strategy = (view, rng) => {
  if (rng() < BAND_CONTROL_NOISE) return pick(rng, NOISE_ACTIONS);
  const target = preferredBand(view.self.template.weapons);
  return moveToward(view.band, target);
};

/**
 * band-control plus situational defense/escape: Evade when shields are
 * low, Jump out when hull is critical (and it's not round 1-2), otherwise
 * seek preferred band and fire. Same 15% noise as band-control.
 */
export const MIXED_NOISE = 0.15;
const MIXED_LOW_SHIELD_FRACTION = 0.2;
const MIXED_CRITICAL_HULL_FRACTION = 0.25;
const MIXED_MIN_ROUND_TO_FLEE = 3;

export const mixedStrategy: Strategy = (view, rng) => {
  if (rng() < MIXED_NOISE) return pick(rng, NOISE_ACTIONS);

  const hullFraction = view.self.hull / view.self.template.hullMax;
  if (hullFraction <= MIXED_CRITICAL_HULL_FRACTION && view.round >= MIXED_MIN_ROUND_TO_FLEE) {
    return 'JUMP_OUT';
  }

  const shieldMax = view.self.template.shieldMax;
  const shieldFraction = shieldMax > 0 ? view.self.shield / shieldMax : 1;
  if (shieldMax > 0 && shieldFraction <= MIXED_LOW_SHIELD_FRACTION) {
    return 'EVADE';
  }

  const target = preferredBand(view.self.template.weapons);
  return moveToward(view.band, target);
};

export const STRATEGIES = {
  alwaysFire: alwaysFireStrategy,
  bandControl: bandControlStrategy,
  mixed: mixedStrategy,
} satisfies Record<string, Strategy>;

export type StrategyName = keyof typeof STRATEGIES;
