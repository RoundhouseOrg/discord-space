/**
 * Headless simulator (GitHub issue #4): run an encounter to completion
 * between two strategies, and aggregate many encounters into win rates per
 * matchup. Used by docs/13-combat-simulation.md's numbers.
 */
import { applyRound, createEncounter } from './engine';
import { mulberry32 } from './rng';
import type { Strategy, SideView } from './strategies';
import type { EncounterOutcome, EncounterState, ShipTemplate } from './types';
import { MAX_ROUNDS } from './types';

export interface EncounterRunResult {
  readonly outcome: EncounterOutcome;
  readonly rounds: number;
}

function viewFor(state: EncounterState, side: 'a' | 'b'): SideView {
  const self = side === 'a' ? state.a : state.b;
  const enemy = side === 'a' ? state.b : state.a;
  return { round: state.round, band: state.band, self, enemy };
}

/** Runs one encounter to a terminal outcome (or the docs/10 round-8 disengage cap). */
export function runEncounter(
  templateA: ShipTemplate,
  strategyA: Strategy,
  templateB: ShipTemplate,
  strategyB: Strategy,
  rng: () => number,
): EncounterRunResult {
  let state = createEncounter(templateA, templateB);
  // MAX_ROUNDS is also enforced inside applyRound's end check; this loop
  // bound is just a belt-and-suspenders guard against an infinite loop if
  // that invariant is ever broken.
  for (let i = 0; i < MAX_ROUNDS && state.outcome === null; i++) {
    const actionA = strategyA(viewFor(state, 'a'), rng);
    const actionB = strategyB(viewFor(state, 'b'), rng);
    state = applyRound(state, actionA, actionB, rng).state;
  }
  const outcome = state.outcome ?? 'DISENGAGE';
  return { outcome, rounds: state.round };
}

export interface MatchupSummary {
  readonly shipA: string;
  readonly shipB: string;
  readonly strategyA: string;
  readonly strategyB: string;
  readonly trials: number;
  readonly counts: Record<EncounterOutcome, number>;
  readonly aWinRate: number;
  readonly bWinRate: number;
  readonly avgRounds: number;
}

const EMPTY_COUNTS: Record<EncounterOutcome, number> = {
  A_WINS: 0,
  B_WINS: 0,
  MUTUAL_DISABLE: 0,
  A_ESCAPED: 0,
  B_ESCAPED: 0,
  BOTH_ESCAPED: 0,
  DISENGAGE: 0,
};

/**
 * Runs `trials` independent encounters for one matchup and aggregates
 * outcome counts + win rates. Deterministic for a given `seed` (one rng
 * stream, drawn from across all trials in sequence).
 */
export function runMatchup(
  shipA: { name: string; template: ShipTemplate; strategyName: string; strategy: Strategy },
  shipB: { name: string; template: ShipTemplate; strategyName: string; strategy: Strategy },
  trials: number,
  seed: number,
): MatchupSummary {
  const rng = mulberry32(seed);
  const counts: Record<EncounterOutcome, number> = { ...EMPTY_COUNTS };
  let totalRounds = 0;

  for (let i = 0; i < trials; i++) {
    const { outcome, rounds } = runEncounter(shipA.template, shipA.strategy, shipB.template, shipB.strategy, rng);
    counts[outcome] += 1;
    totalRounds += rounds;
  }

  return {
    shipA: shipA.name,
    shipB: shipB.name,
    strategyA: shipA.strategyName,
    strategyB: shipB.strategyName,
    trials,
    counts,
    aWinRate: counts.A_WINS / trials,
    bWinRate: counts.B_WINS / trials,
    avgRounds: totalRounds / trials,
  };
}
