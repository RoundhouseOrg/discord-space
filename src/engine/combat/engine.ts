/**
 * Encounter state machine: docs/10-combat.md's range bands, five actions,
 * and "Round resolution order". Pure functions, seeded RNG in, new state +
 * log out — no Discord imports (see src/engine/layering.test.ts).
 */
import { AMBUSH_ARCHETYPES } from './ships';
import type {
  Action,
  ApplyRoundResult,
  EncounterOutcome,
  EncounterState,
  RangeBand,
  ShipRuntimeState,
  ShipTemplate,
} from './types';
import { MAX_ROUNDS, RANGE_BANDS } from './types';
import type { Rng } from './rng';
import { uniform } from './rng';

const BAND_INDEX: Record<RangeBand, number> = { LONG: 0, MEDIUM: 1, CLOSE: 2 };

function bandFromIndex(index: number): RangeBand {
  const clamped = Math.max(0, Math.min(RANGE_BANDS.length - 1, index));
  return RANGE_BANDS[clamped] as RangeBand;
}

/** docs/10 "Escape": `band_mod` per range band. */
const ESCAPE_BAND_MOD: Record<RangeBand, number> = { LONG: 0.9, MEDIUM: 0.5, CLOSE: 0.2 };

function initialAmmo(template: ShipTemplate): number[] {
  return template.weapons.map((weapon) => weapon.ammo ?? Infinity);
}

function initialRuntime(template: ShipTemplate): ShipRuntimeState {
  return {
    template,
    hull: template.hullMax,
    shield: template.shieldMax,
    ammo: initialAmmo(template),
    escaped: false,
    disabled: false,
  };
}

export interface CreateEncounterOptions {
  /** Defaults to LONG, or MEDIUM if either template is an ambush archetype (docs/10). */
  readonly startBand?: RangeBand;
}

/** docs/10 "Engine contract": `createEncounter(shipA, shipB, opts) -> EncounterState`. */
export function createEncounter(
  templateA: ShipTemplate,
  templateB: ShipTemplate,
  options: CreateEncounterOptions = {},
): EncounterState {
  const isAmbush = AMBUSH_ARCHETYPES.has(templateA.name) || AMBUSH_ARCHETYPES.has(templateB.name);
  const startBand = options.startBand ?? (isAmbush ? 'MEDIUM' : 'LONG');
  return {
    round: 0,
    band: startBand,
    a: initialRuntime(templateA),
    b: initialRuntime(templateB),
    outcome: null,
  };
}

function moveDirection(action: Action): -1 | 0 | 1 {
  if (action === 'CLOSE_IN') return 1;
  if (action === 'PULL_BACK') return -1;
  return 0;
}

/** docs/10 "Contested movement". */
function resolveMovement(
  band: RangeBand,
  actionA: Action,
  actionB: Action,
  agilityA: number,
  agilityB: number,
  rng: Rng,
  log: string[],
): RangeBand {
  const dirA = moveDirection(actionA);
  const dirB = moveDirection(actionB);
  let delta: number;
  if (dirA !== 0 && dirA === dirB) {
    // Both close / both pull back -> two bands, clamped.
    delta = dirA * 2;
  } else if (dirA !== 0 && dirB !== 0 && dirA !== dirB) {
    // One closes, one pulls back -> higher agility wins (ties: random).
    const aWins = agilityA === agilityB ? rng() < 0.5 : agilityA > agilityB;
    delta = aWins ? dirA : dirB;
    log.push(aWins ? 'A wins the contested range change.' : 'B wins the contested range change.');
  } else {
    // One moves, other doesn't (or neither) -> mover's move succeeds.
    delta = dirA !== 0 ? dirA : dirB;
  }
  const newBand = bandFromIndex(BAND_INDEX[band] + delta);
  if (newBand !== band) log.push(`Range changes: ${band} -> ${newBand}.`);
  return newBand;
}

/** docs/10 "Escape": `p_escape = clamp(drive/10 x band_mod - enemy_ecm x 0.1, 0.05, 0.95)`. */
function escapeChance(drive: number, band: RangeBand, enemyEcm: number): number {
  const raw = (drive / 10) * ESCAPE_BAND_MOD[band] - enemyEcm * 0.1;
  return Math.max(0.05, Math.min(0.95, raw));
}

/** docs/10 fire-step damage multiplier per chosen action. */
function actionDamageMod(action: Action): number {
  switch (action) {
    case 'FIRE':
      return 1;
    case 'EVADE':
      return 0.5;
    case 'CLOSE_IN':
    case 'PULL_BACK':
      return 0.75;
    case 'JUMP_OUT':
      // "Fail = take fire without firing" -- Jump out never lands hits.
      return 0;
  }
}

/** docs/10 "+3 evasion this round" for Evade; 0 otherwise. */
function actionEvasionBonus(action: Action): number {
  return action === 'EVADE' ? 3 : 0;
}

interface FireResult {
  readonly shield: number;
  readonly hull: number;
  readonly ammo: number[];
  readonly log: string[];
}

/**
 * Resolves one attacker's weapons against one defender. docs/10 "Round
 * resolution order" step 3: per weapon, `p_hit` then damage; shields absorb
 * first, overflow to hull. ECM (docs/10 "reduces enemy accuracy") is
 * modelled as subtracting the defender's ECM from the attacker's effective
 * accuracy before the doc's p_hit formula — the doc gives no explicit
 * formula for the ECM/accuracy interaction, only the qualitative effect.
 */
function resolveFire(
  attacker: ShipRuntimeState,
  attackerAction: Action,
  defender: ShipRuntimeState,
  defenderAction: Action,
  band: RangeBand,
  rng: Rng,
  attackerLabel: string,
): FireResult {
  let shield = defender.shield;
  let hull = defender.hull;
  const ammo = [...attacker.ammo];
  const log: string[] = [];
  const dmgMod = actionDamageMod(attackerAction);
  const bandIdx = BAND_INDEX[band];
  const defEvasion = defender.template.agility + actionEvasionBonus(defenderAction);
  const effAccuracy = attacker.template.accuracy - defender.template.ecm;

  if (dmgMod <= 0) return { shield, hull, ammo, log };

  attacker.template.weapons.forEach((weapon, index) => {
    if ((ammo[index] ?? 0) <= 0) return;
    if (ammo[index] !== Infinity) ammo[index] = (ammo[index] as number) - 1;

    const pHit = Math.max(0.2, Math.min(0.95, 0.75 + 0.05 * (effAccuracy - defEvasion)));
    if (rng() < pHit) {
      const raw = (weapon.damage[bandIdx] ?? 0) * dmgMod * uniform(rng, 0.8, 1.2);
      const dmg = Math.max(0, Math.round(raw));
      const absorbed = Math.min(shield, dmg);
      shield -= absorbed;
      hull -= dmg - absorbed;
      log.push(`${attackerLabel} fired ${weapon.name}: hit for ${dmg}.`);
    } else {
      log.push(`${attackerLabel} fired ${weapon.name}: missed.`);
    }
  });

  return { shield, hull, ammo, log };
}

function outcomeFor(a: ShipRuntimeState, b: ShipRuntimeState, round: number): EncounterOutcome | null {
  const aGone = a.escaped || a.disabled;
  const bGone = b.escaped || b.disabled;
  if (a.disabled && b.disabled) return 'MUTUAL_DISABLE';
  if (a.disabled) return 'B_WINS';
  if (b.disabled) return 'A_WINS';
  if (a.escaped && b.escaped) return 'BOTH_ESCAPED';
  if (a.escaped) return 'A_ESCAPED';
  if (b.escaped) return 'B_ESCAPED';
  if (!aGone && !bGone && round >= MAX_ROUNDS) return 'DISENGAGE';
  return null;
}

/**
 * docs/10 "Engine contract": `applyRound(state, actionA, actionB, rng) ->
 * { state, log[] }`. Resolves one round in the doc's fixed order: movement,
 * escape checks, fire (simultaneous), shield regen, end check.
 */
export function applyRound(state: EncounterState, actionA: Action, actionB: Action, rng: Rng): ApplyRoundResult {
  if (state.outcome !== null) {
    return { state, log: ['Encounter already resolved.'] };
  }

  const round = state.round + 1;
  const log: string[] = [];

  // 1. Movement (contested by agility).
  const band = resolveMovement(
    state.band,
    actionA,
    actionB,
    state.a.template.agility,
    state.b.template.agility,
    rng,
    log,
  );

  // 2. Escape checks. An escaped ship is removed; the other side's fire is
  // wasted (there's nothing to hit fire against below since a gone side
  // takes/deals no damage).
  let aEscaped = state.a.escaped;
  let bEscaped = state.b.escaped;
  if (!aEscaped && actionA === 'JUMP_OUT') {
    const p = escapeChance(state.a.template.drive, band, state.b.template.ecm);
    aEscaped = rng() < p;
    log.push(aEscaped ? 'A escapes.' : 'A fails to escape.');
  }
  if (!bEscaped && actionB === 'JUMP_OUT') {
    const p = escapeChance(state.b.template.drive, band, state.a.template.ecm);
    bEscaped = rng() < p;
    log.push(bEscaped ? 'B escapes.' : 'B fails to escape.');
  }

  // 3. Fire, simultaneous: each side's outgoing damage is computed against
  // the other's pre-fire-step shield/hull, independent of the other side's
  // own weapons this round.
  let aShield = state.a.shield;
  let aHull = state.a.hull;
  let aAmmo = state.a.ammo;
  let bShield = state.b.shield;
  let bHull = state.b.hull;
  let bAmmo = state.b.ammo;

  if (!aEscaped && !bEscaped) {
    const bTakesFire = resolveFire(state.a, actionA, state.b, actionB, band, rng, 'A');
    bShield = bTakesFire.shield;
    bHull = bTakesFire.hull;
    aAmmo = bTakesFire.ammo;
    log.push(...bTakesFire.log);

    const aTakesFire = resolveFire(state.b, actionB, state.a, actionA, band, rng, 'B');
    aShield = aTakesFire.shield;
    aHull = aTakesFire.hull;
    bAmmo = aTakesFire.ammo;
    log.push(...aTakesFire.log);
  }

  // 4. Shield regen for both (sides still in the fight only).
  if (!aEscaped) aShield = Math.min(state.a.template.shieldMax, aShield + state.a.template.shieldRegen);
  if (!bEscaped) bShield = Math.min(state.b.template.shieldMax, bShield + state.b.template.shieldRegen);

  // 5. End check: hull <= 0 -> disabled; escaped; round MAX_ROUNDS -> disengage.
  const aDisabled = !aEscaped && aHull <= 0;
  const bDisabled = !bEscaped && bHull <= 0;
  if (aDisabled) log.push('A is disabled.');
  if (bDisabled) log.push('B is disabled.');

  const a: ShipRuntimeState = {
    template: state.a.template,
    hull: Math.max(0, aHull),
    shield: aShield,
    ammo: aAmmo,
    escaped: aEscaped,
    disabled: aDisabled,
  };
  const b: ShipRuntimeState = {
    template: state.b.template,
    hull: Math.max(0, bHull),
    shield: bShield,
    ammo: bAmmo,
    escaped: bEscaped,
    disabled: bDisabled,
  };

  const outcome = outcomeFor(a, b, round);
  if (outcome === 'DISENGAGE') log.push('Round cap reached: both sides disengage.');

  return { state: { round, band, a, b, outcome }, log };
}
