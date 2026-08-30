/**
 * Player/ship progression (docs/05-tech-stack.md). Pure game logic; must
 * never import from src/discord (enforced by eslint.config.mjs and
 * src/engine/layering.test.ts).
 *
 * For now this holds the four starter hulls from docs/04-game-design.md
 * ("Roles & starter hulls") and the starter credit balance from
 * docs/12-economy.md. Mid-tier hulls, skills, and XP curves land with the
 * rest of progression later.
 */

/** The four starting roles (docs/04-game-design.md). */
export type StarterRole = 'miner' | 'trader' | 'fighter' | 'scout';

export interface StarterHull {
  readonly id: string;
  readonly name: string;
  readonly role: StarterRole;
  readonly strength: string;
  readonly startingBias: string;
}

/**
 * docs/04-game-design.md, "Roles & starter hulls" table. Roles are a
 * starting bias, not a lock — any hull can do any job.
 */
export const STARTER_HULLS: readonly StarterHull[] = [
  {
    id: 'prospector',
    name: 'Prospector',
    role: 'miner',
    strength: 'Cargo + mining laser',
    startingBias: 'Mining yield',
  },
  {
    id: 'freighter',
    name: 'Freighter',
    role: 'trader',
    strength: 'Big cargo hold',
    startingBias: 'Buy/sell margins, hauling',
  },
  {
    id: 'interceptor',
    name: 'Interceptor',
    role: 'fighter',
    strength: 'Weapons + shields',
    startingBias: 'Patrol bounties, combat',
  },
  {
    id: 'courier',
    name: 'Courier',
    role: 'scout',
    strength: 'Speed + scanner',
    startingBias: 'Exploration, discovery bonuses',
  },
] as const;

export function findStarterHull(id: string): StarterHull | undefined {
  return STARTER_HULLS.find((hull) => hull.id === id);
}

/** docs/12-economy.md: "Currency ... Starter balance 500." */
export const STARTER_CREDITS = 500;
