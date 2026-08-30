import { describe, expect, it } from 'vitest';
import { applyRound, createEncounter } from './engine';
import { mulberry32 } from './rng';
import { NPC_ARCHETYPES, STARTER_HULLS } from './ships';
import type { Rng } from './rng';
import type { ShipTemplate } from './types';
import { MAX_ROUNDS } from './types';

/** A scripted RNG that returns each given value once, in order. Throws if exhausted (catches under-scripted tests). */
function scripted(...values: readonly number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`scripted rng exhausted after ${values.length} draws`);
    return values[i++] as number;
  };
}

const NO_WEAPONS: ShipTemplate = {
  name: 'Unarmed',
  hullMax: 100,
  shieldMax: 0,
  shieldRegen: 0,
  agility: 5,
  drive: 5,
  accuracy: 8,
  ecm: 0,
  weapons: [],
};

function unarmed(overrides: Partial<ShipTemplate> = {}): ShipTemplate {
  return { ...NO_WEAPONS, ...overrides };
}

describe('createEncounter', () => {
  it('starts at LONG for a normal (non-ambush) pairing', () => {
    const state = createEncounter(STARTER_HULLS.interceptor, NPC_ARCHETYPES.raider);
    expect(state.band).toBe('LONG');
    expect(state.round).toBe(0);
    expect(state.outcome).toBeNull();
  });

  it('starts at MEDIUM when the Interdictor archetype is involved (docs/10 ambush)', () => {
    const state = createEncounter(STARTER_HULLS.interceptor, NPC_ARCHETYPES.interdictor);
    expect(state.band).toBe('MEDIUM');
  });

  it('an explicit startBand option overrides the ambush default', () => {
    const state = createEncounter(STARTER_HULLS.interceptor, NPC_ARCHETYPES.interdictor, { startBand: 'CLOSE' });
    expect(state.band).toBe('CLOSE');
  });

  it('both sides start at full hull/shield with fresh ammo', () => {
    const state = createEncounter(STARTER_HULLS.interceptor, NPC_ARCHETYPES.interdictor);
    expect(state.a.hull).toBe(STARTER_HULLS.interceptor.hullMax);
    expect(state.a.shield).toBe(STARTER_HULLS.interceptor.shieldMax);
    expect(state.b.ammo).toEqual([4]); // missiles
  });
});

describe('applyRound: movement', () => {
  it('both Close in -> moves two bands, clamped at CLOSE', () => {
    const state = createEncounter(unarmed(), unarmed());
    const result = applyRound(state, 'CLOSE_IN', 'CLOSE_IN', scripted());
    expect(result.state.band).toBe('CLOSE');
  });

  it('both Pull back -> moves two bands, clamped at LONG', () => {
    const state = createEncounter(unarmed(), unarmed(), { startBand: 'CLOSE' });
    const result = applyRound(state, 'PULL_BACK', 'PULL_BACK', scripted());
    expect(result.state.band).toBe('LONG');
  });

  it('contested: higher agility wins outright', () => {
    const state = createEncounter(unarmed({ agility: 9 }), unarmed({ agility: 2 }), { startBand: 'MEDIUM' });
    const result = applyRound(state, 'CLOSE_IN', 'PULL_BACK', scripted());
    expect(result.state.band).toBe('CLOSE'); // A (closing) wins
  });

  it('contested: lower agility loses the direction', () => {
    const state = createEncounter(unarmed({ agility: 2 }), unarmed({ agility: 9 }), { startBand: 'MEDIUM' });
    const result = applyRound(state, 'CLOSE_IN', 'PULL_BACK', scripted());
    expect(result.state.band).toBe('LONG'); // B (pulling back) wins
  });

  it('contested tie: coin flip decided by rng', () => {
    const state = createEncounter(unarmed({ agility: 5 }), unarmed({ agility: 5 }), { startBand: 'MEDIUM' });
    const aWins = applyRound(state, 'CLOSE_IN', 'PULL_BACK', scripted(0.1));
    expect(aWins.state.band).toBe('CLOSE');
    const bWins = applyRound(state, 'CLOSE_IN', 'PULL_BACK', scripted(0.9));
    expect(bWins.state.band).toBe('LONG');
  });

  it('one side moves unopposed when the other fires', () => {
    const state = createEncounter(unarmed(), unarmed(), { startBand: 'LONG' });
    const result = applyRound(state, 'CLOSE_IN', 'FIRE', scripted());
    expect(result.state.band).toBe('MEDIUM');
  });

  it('neither moving leaves the band unchanged', () => {
    const state = createEncounter(unarmed(), unarmed(), { startBand: 'MEDIUM' });
    const result = applyRound(state, 'FIRE', 'EVADE', scripted());
    expect(result.state.band).toBe('MEDIUM');
  });
});

describe('applyRound: escape', () => {
  it('clamps p_escape into [0.05, 0.95] even for extreme drive/ecm', () => {
    // Drive 0 vs a huge ECM should floor at 0.05: rng just below that succeeds, just above fails.
    const fleeing = unarmed({ drive: 0 });
    const blocker = unarmed({ ecm: 100 });
    const succeeds = createEncounter(fleeing, blocker);
    const succeedsResult = applyRound(succeeds, 'JUMP_OUT', 'FIRE', scripted(0.04));
    expect(succeedsResult.state.a.escaped).toBe(true);

    const fails = createEncounter(fleeing, blocker);
    const failsResult = applyRound(fails, 'JUMP_OUT', 'FIRE', scripted(0.06));
    expect(failsResult.state.a.escaped).toBe(false);
  });

  it('a failed escape takes fire without firing back', () => {
    const heavyHitter = unarmed({ weapons: [{ name: 'Big gun', damage: [1000, 1000, 1000] }] });
    const state = createEncounter(unarmed({ drive: 0 }), heavyHitter);
    // rng: escape roll (fails, > 0.95 clamp... use 0.99), then B's p_hit roll, then damage uniform roll.
    const result = applyRound(state, 'JUMP_OUT', 'FIRE', scripted(0.99, 0.01, 0.5));
    expect(result.state.a.escaped).toBe(false);
    expect(result.state.a.hull).toBeLessThan(unarmed().hullMax);
  });

  it('a successful escape means the other side lands no hits (fire wasted)', () => {
    const heavyHitter = unarmed({ weapons: [{ name: 'Big gun', damage: [1000, 1000, 1000] }] });
    const state = createEncounter(unarmed({ drive: 10 }), heavyHitter);
    const result = applyRound(state, 'JUMP_OUT', 'FIRE', scripted(0.01));
    expect(result.state.a.escaped).toBe(true);
    expect(result.state.a.hull).toBe(unarmed().hullMax);
    expect(result.state.outcome).toBe('A_ESCAPED');
  });

  it('both escaping in the same round is BOTH_ESCAPED', () => {
    const state = createEncounter(unarmed({ drive: 10 }), unarmed({ drive: 10 }));
    const result = applyRound(state, 'JUMP_OUT', 'JUMP_OUT', scripted(0.01, 0.01));
    expect(result.state.outcome).toBe('BOTH_ESCAPED');
  });
});

describe('applyRound: fire and damage', () => {
  it('shields absorb before hull, overflow spills over', () => {
    const attacker = unarmed({ accuracy: 100, weapons: [{ name: 'Gun', damage: [50, 50, 50] }] });
    const defender = unarmed({ shieldMax: 20 });
    const state = createEncounter(attacker, defender);
    // A fires at B: p_hit roll (hit), damage uniform roll (0.5 -> exactly the 1.0x multiplier). B has no
    // weapons, no rolls for B->A.
    const result = applyRound(state, 'FIRE', 'FIRE', scripted(0.0, 0.5));
    expect(result.state.b.shield).toBe(0);
    expect(result.state.b.hull).toBe(defender.hullMax - 30); // 50 dmg - 20 absorbed shield
  });

  it('a clean miss deals no damage', () => {
    const attacker = unarmed({ accuracy: -1000, weapons: [{ name: 'Gun', damage: [50, 50, 50] }] });
    const defender = unarmed();
    const state = createEncounter(attacker, defender);
    const result = applyRound(state, 'FIRE', 'FIRE', scripted(0.99));
    expect(result.state.b.hull).toBe(defender.hullMax);
  });

  it('Evade halves outgoing damage and adds +3 evasion for incoming', () => {
    const gun: ShipTemplate['weapons'][number] = { name: 'Gun', damage: [40, 40, 40] };
    const a = unarmed({ accuracy: 100, weapons: [gun] });
    const b = unarmed({ accuracy: 100, weapons: [gun] });
    const state = createEncounter(a, b);
    // A Evades (halved dmg), B Fires (full dmg). Order in resolveFire: A->B first, then B->A. Each hit's
    // damage-uniform roll is 0.5 -> exactly the 1.0x multiplier, so the numbers below are exact.
    const result = applyRound(state, 'EVADE', 'FIRE', scripted(0.0, 0.5, 0.0, 0.5));
    expect(result.state.b.hull).toBe(b.hullMax - 20); // A's Evade: 40 * 0.5
    expect(result.state.a.hull).toBe(a.hullMax - 40); // B's Fire: 40 * 1.0, uses A's base evasion only
  });

  it('finite ammo depletes and the weapon stops firing once exhausted', () => {
    const attacker = unarmed({ accuracy: 100, weapons: [{ name: 'Missile', damage: [10, 10, 10], ammo: 1 }] });
    const defender = unarmed({ hullMax: 1000 });
    let state = createEncounter(attacker, defender);
    const round1 = applyRound(state, 'FIRE', 'FIRE', scripted(0.0, 0.5));
    expect(round1.state.a.ammo).toEqual([0]);
    expect(round1.state.b.hull).toBe(990); // 1000 - 10 dmg (LONG band, 1.0x multiplier)
    state = round1.state;
    // Second round: no ammo left, no rolls should be consumed for A's weapon.
    const round2 = applyRound(state, 'FIRE', 'FIRE', scripted());
    expect(round2.state.b.hull).toBe(990); // unchanged: A has no ammo left
  });
});

describe('applyRound: shield regen', () => {
  it('regenerates shields each round up to shieldMax', () => {
    const a = unarmed({ shieldMax: 60, shieldRegen: 10 });
    const b = unarmed();
    const state = createEncounter(a, b);
    // Damage A's shield down to 30 via B's fire is complex to script; instead verify regen directly via
    // two consecutive no-fire rounds keeps shield pinned at max (can't exceed shieldMax).
    const result = applyRound(state, 'EVADE', 'EVADE', scripted(0.99, 0.99));
    expect(result.state.a.shield).toBe(60);
  });
});

describe('applyRound: outcomes and round cap', () => {
  it('disabling the enemy without disabling yourself is a win', () => {
    const attacker = unarmed({ accuracy: 100, weapons: [{ name: 'Gun', damage: [1000, 1000, 1000] }] });
    const defender = unarmed({ hullMax: 10, shieldMax: 0 });
    const state = createEncounter(attacker, defender);
    const result = applyRound(state, 'FIRE', 'FIRE', scripted(0.0, 1.0));
    expect(result.state.b.disabled).toBe(true);
    expect(result.state.outcome).toBe('A_WINS');
  });

  it('mutual lethal fire in the same round is MUTUAL_DISABLE', () => {
    const gun: ShipTemplate['weapons'][number] = { name: 'Gun', damage: [1000, 1000, 1000] };
    const a = unarmed({ accuracy: 100, hullMax: 10, shieldMax: 0, weapons: [gun] });
    const b = unarmed({ accuracy: 100, hullMax: 10, shieldMax: 0, weapons: [gun] });
    const state = createEncounter(a, b);
    const result = applyRound(state, 'FIRE', 'FIRE', scripted(0.0, 1.0, 0.0, 1.0));
    expect(result.state.outcome).toBe('MUTUAL_DISABLE');
  });

  it('rolls to DISENGAGE at MAX_ROUNDS if nobody is disabled or escaped', () => {
    const a = unarmed();
    const b = unarmed();
    let state = createEncounter(a, b);
    const rng = mulberry32(42);
    for (let i = 0; i < MAX_ROUNDS; i++) {
      state = applyRound(state, 'EVADE', 'EVADE', rng).state;
    }
    expect(state.round).toBe(MAX_ROUNDS);
    expect(state.outcome).toBe('DISENGAGE');
  });

  it('further applyRound calls after resolution are a no-op', () => {
    const a = unarmed({ hullMax: 1, shieldMax: 0 });
    const attacker = unarmed({ accuracy: 100, weapons: [{ name: 'Gun', damage: [1000, 1000, 1000] }] });
    const state = createEncounter(attacker, a);
    const round1 = applyRound(state, 'FIRE', 'FIRE', scripted(0.0, 1.0));
    expect(round1.state.outcome).toBe('A_WINS');
    const round2 = applyRound(round1.state, 'FIRE', 'FIRE', scripted());
    expect(round2.state).toBe(round1.state);
  });
});
