/**
 * Generates the numbers behind docs/13-combat-simulation.md (GitHub issue
 * #4). Not part of the app or the test suite — a one-off data-generation
 * script, run with `npx tsx src/engine/combat/report.ts`. Prints markdown
 * tables to stdout; the doc is a hand-written narrative around a pasted
 * copy of that output (see docs/13's own note on reproducing it).
 */
import { NPC_ARCHETYPES, STARTER_HULLS } from './ships';
import { runMatchup } from './simulate';
import { STRATEGIES } from './strategies';
import type { MatchupSummary } from './simulate';
import type { Strategy, StrategyName } from './strategies';
import type { ShipTemplate } from './types';

const TRIALS = 4000;

// One fixed seed per matchup label, so a re-run reproduces byte-identical output.
let seedCounter = 1000;
function nextSeed(): number {
  seedCounter += 1;
  return seedCounter;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function fmtRow(s: MatchupSummary): string {
  const other = 1 - s.aWinRate - s.bWinRate - s.counts.MUTUAL_DISABLE / s.trials;
  return `| ${s.shipA} (${s.strategyA}) vs ${s.shipB} (${s.strategyB}) | ${pct(s.aWinRate)} | ${pct(
    s.bWinRate,
  )} | ${pct(s.counts.MUTUAL_DISABLE / s.trials)} | ${pct(Math.max(0, other))} | ${s.avgRounds.toFixed(2)} |`;
}

function printTable(title: string, rows: MatchupSummary[]): void {
  console.log(`\n### ${title}\n`);
  console.log('| Matchup | A win | B win | Mutual disable | Escape/disengage | Avg rounds |');
  console.log('|---|---|---|---|---|---|');
  rows.forEach((row) => console.log(fmtRow(row)));
}

const ARCHETYPES: ReadonlyArray<{ name: string; template: ShipTemplate }> = [
  { name: 'Raider', template: NPC_ARCHETYPES.raider },
  { name: 'Sniper', template: NPC_ARCHETYPES.sniper },
  { name: 'Interdictor', template: NPC_ARCHETYPES.interdictor },
  { name: 'Brute', template: NPC_ARCHETYPES.brute },
];

const STRATEGY_NAMES: readonly StrategyName[] = ['alwaysFire', 'bandControl', 'mixed'];

function strategyPairs(): Array<[StrategyName, StrategyName]> {
  const pairs: Array<[StrategyName, StrategyName]> = [];
  for (let i = 0; i < STRATEGY_NAMES.length; i++) {
    for (let j = i; j < STRATEGY_NAMES.length; j++) {
      pairs.push([STRATEGY_NAMES[i] as StrategyName, STRATEGY_NAMES[j] as StrategyName]);
    }
  }
  return pairs;
}

function run(): void {
  console.log(`Trials per matchup: ${TRIALS}`);

  // Part 0: docs/10's literal open question names the Interceptor specifically ("does 3 bands x 5
  // actions collapse to always-Fire for the Interceptor?"). Same mirror-strategy-dominance shape as
  // Part 1, just for that one starter hull.
  const interceptorRows: MatchupSummary[] = [];
  for (const [nameA, nameB] of strategyPairs()) {
    const summary = runMatchup(
      { name: 'Interceptor', template: STARTER_HULLS.interceptor, strategyName: nameA, strategy: STRATEGIES[nameA] },
      { name: 'Interceptor', template: STARTER_HULLS.interceptor, strategyName: nameB, strategy: STRATEGIES[nameB] },
      TRIALS,
      nextSeed(),
    );
    interceptorRows.push(summary);
  }
  printTable('Interceptor mirror matchups (docs/10\'s literal "for the Interceptor" question)', interceptorRows);

  // Part 1: strategy dominance. Same archetype (mirror match) on both sides, every unique strategy
  // pairing, so the only variable is decision-making -- directly answers "does always-Fire dominate?"
  const strategyRows: MatchupSummary[] = [];
  for (const archetype of ARCHETYPES) {
    for (const [nameA, nameB] of strategyPairs()) {
      const summary = runMatchup(
        { name: archetype.name, template: archetype.template, strategyName: nameA, strategy: STRATEGIES[nameA] as Strategy },
        { name: archetype.name, template: archetype.template, strategyName: nameB, strategy: STRATEGIES[nameB] as Strategy },
        TRIALS,
        nextSeed(),
      );
      strategyRows.push(summary);
    }
  }
  printTable('Strategy dominance (mirror matchups: same archetype, both strategies compared)', strategyRows);

  // Part 2: archetype balance under the "mixed" strategy (most realistic AI) on both sides.
  const balanceRows: MatchupSummary[] = [];
  for (let i = 0; i < ARCHETYPES.length; i++) {
    for (let j = i + 1; j < ARCHETYPES.length; j++) {
      const a = ARCHETYPES[i] as { name: string; template: ShipTemplate };
      const b = ARCHETYPES[j] as { name: string; template: ShipTemplate };
      const summary = runMatchup(
        { name: a.name, template: a.template, strategyName: 'mixed', strategy: STRATEGIES.mixed },
        { name: b.name, template: b.template, strategyName: 'mixed', strategy: STRATEGIES.mixed },
        TRIALS,
        nextSeed(),
      );
      balanceRows.push(summary);
    }
  }
  printTable('Archetype balance (cross-matchups, both sides using "mixed")', balanceRows);

  // Sniper-specific: does it ever kill anything (docs/07/10 open question), across all three strategies.
  const sniperRows: MatchupSummary[] = [];
  for (const opponent of ARCHETYPES.filter((a) => a.name !== 'Sniper')) {
    for (const strategyName of STRATEGY_NAMES) {
      const summary = runMatchup(
        { name: 'Sniper', template: NPC_ARCHETYPES.sniper, strategyName, strategy: STRATEGIES[strategyName] },
        { name: opponent.name, template: opponent.template, strategyName: 'mixed', strategy: STRATEGIES.mixed },
        TRIALS,
        nextSeed(),
      );
      sniperRows.push(summary);
    }
  }
  printTable('Sniper win rate vs each archetype (mixed-AI opponent), by Sniper strategy', sniperRows);
}

if (require.main === module) {
  run();
}
