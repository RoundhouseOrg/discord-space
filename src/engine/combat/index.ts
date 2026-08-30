/**
 * Encounter state machine (docs/05-tech-stack.md, docs/10-combat.md). Pure
 * game logic; must never import from src/discord (enforced by
 * eslint.config.mjs and src/engine/layering.test.ts).
 *
 * `render(state, viewerId) -> EmbedSpec + buttons` from docs/10's "Engine
 * contract" is not implemented here — that's Discord-bot UI wiring, out of
 * scope for GitHub issue #4 (headless balance simulation; see
 * docs/13-combat-simulation.md). `createEncounter` and `applyRound` are the
 * full, tested resolution engine; `simulate.ts` and `strategies.ts` are the
 * simulator built on top of them.
 */
export { createEncounter, applyRound } from './engine';
export type { CreateEncounterOptions } from './engine';
export { runEncounter, runMatchup } from './simulate';
export type { EncounterRunResult, MatchupSummary } from './simulate';
export { alwaysFireStrategy, bandControlStrategy, mixedStrategy, preferredBand, STRATEGIES } from './strategies';
export type { SideView, Strategy, StrategyName } from './strategies';
export { NPC_ARCHETYPES, STARTER_HULLS, WEAPONS, DEFAULT_ACCURACY, AMBUSH_ARCHETYPES } from './ships';
export * from './types';
