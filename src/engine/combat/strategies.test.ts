import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import { NPC_ARCHETYPES, STARTER_HULLS } from './ships';
import {
  alwaysFireStrategy,
  bandControlStrategy,
  mixedStrategy,
  preferredBand,
} from './strategies';
import type { ShipRuntimeState } from './types';

function runtimeFor(
  name: keyof typeof NPC_ARCHETYPES | keyof typeof STARTER_HULLS,
  overrides: Partial<Pick<ShipRuntimeState, 'hull' | 'shield'>> = {},
): ShipRuntimeState {
  const template: ShipRuntimeState['template'] | undefined =
    (NPC_ARCHETYPES as Record<string, ShipRuntimeState['template']>)[name] ??
    (STARTER_HULLS as Record<string, ShipRuntimeState['template']>)[name];
  if (!template) throw new Error(`unknown template ${name}`);
  return {
    template,
    hull: overrides.hull ?? template.hullMax,
    shield: overrides.shield ?? template.shieldMax,
    ammo: template.weapons.map((w) => w.ammo ?? Infinity),
    escaped: false,
    disabled: false,
  };
}

describe('preferredBand', () => {
  it('Raider (2x Autocannon) prefers CLOSE', () => {
    expect(preferredBand(NPC_ARCHETYPES.raider.weapons)).toBe('CLOSE');
  });

  it('Sniper (Railgun) prefers LONG', () => {
    expect(preferredBand(NPC_ARCHETYPES.sniper.weapons)).toBe('LONG');
  });

  it('Brute (2x Autocannon) prefers CLOSE', () => {
    expect(preferredBand(NPC_ARCHETYPES.brute.weapons)).toBe('CLOSE');
  });

  it('Prospector (Mining laser) prefers CLOSE', () => {
    expect(preferredBand(STARTER_HULLS.prospector.weapons)).toBe('CLOSE');
  });
});

describe('alwaysFireStrategy', () => {
  it('always returns FIRE, regardless of state or rng', () => {
    const self = runtimeFor('raider');
    const enemy = runtimeFor('sniper');
    const rng = mulberry32(1);
    for (let i = 0; i < 20; i++) {
      expect(alwaysFireStrategy({ round: i, band: 'LONG', self, enemy }, rng)).toBe('FIRE');
    }
  });
});

describe('bandControlStrategy', () => {
  it('moves toward its preferred band when not there yet (noise roll excluded)', () => {
    const self = runtimeFor('raider'); // prefers CLOSE
    const enemy = runtimeFor('sniper');
    // rng()=0.99 clears the 15% noise check (0.99 >= 0.15), so the deterministic branch runs.
    const rng = () => 0.99;
    expect(bandControlStrategy({ round: 1, band: 'LONG', self, enemy }, rng)).toBe('CLOSE_IN');
    expect(bandControlStrategy({ round: 1, band: 'MEDIUM', self, enemy }, rng)).toBe('CLOSE_IN');
  });

  it('fires once at its preferred band', () => {
    const self = runtimeFor('sniper'); // prefers LONG
    const enemy = runtimeFor('raider');
    const rng = () => 0.99;
    expect(bandControlStrategy({ round: 1, band: 'LONG', self, enemy }, rng)).toBe('FIRE');
  });

  it('pulls back when past its preferred band', () => {
    const self = runtimeFor('sniper'); // prefers LONG
    const enemy = runtimeFor('raider');
    const rng = () => 0.99;
    expect(bandControlStrategy({ round: 1, band: 'CLOSE', self, enemy }, rng)).toBe('PULL_BACK');
  });

  it('deviates onto a noise action within the noise probability', () => {
    const self = runtimeFor('sniper');
    const enemy = runtimeFor('raider');
    const rng = () => 0.0; // definitely below the 15% noise threshold
    const action = bandControlStrategy({ round: 1, band: 'LONG', self, enemy }, rng);
    expect(['FIRE', 'EVADE', 'CLOSE_IN', 'PULL_BACK']).toContain(action);
  });
});

describe('mixedStrategy', () => {
  it('jumps out when hull is critical past the minimum round', () => {
    const self = runtimeFor('raider', { hull: Math.floor(NPC_ARCHETYPES.raider.hullMax * 0.1) });
    const enemy = runtimeFor('sniper');
    const rng = () => 0.99; // clears noise
    expect(mixedStrategy({ round: 4, band: 'CLOSE', self, enemy }, rng)).toBe('JUMP_OUT');
  });

  it('does not flee before the minimum round even at critical hull', () => {
    const self = runtimeFor('raider', { hull: 1 });
    const enemy = runtimeFor('sniper');
    const rng = () => 0.99;
    expect(mixedStrategy({ round: 1, band: 'CLOSE', self, enemy }, rng)).not.toBe('JUMP_OUT');
  });

  it('evades when shields are low but hull is healthy', () => {
    const self = runtimeFor('sniper', { shield: 1 });
    const enemy = runtimeFor('raider');
    const rng = () => 0.99;
    expect(mixedStrategy({ round: 1, band: 'LONG', self, enemy }, rng)).toBe('EVADE');
  });

  it('otherwise seeks its preferred band and fires', () => {
    const self = runtimeFor('sniper'); // full hull/shield, prefers LONG
    const enemy = runtimeFor('raider');
    const rng = () => 0.99;
    expect(mixedStrategy({ round: 1, band: 'LONG', self, enemy }, rng)).toBe('FIRE');
  });
});
