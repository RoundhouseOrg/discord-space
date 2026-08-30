/**
 * Inter-sector jump graph (docs/08-geography.md: "Inter-sector graph").
 *
 * Note on scope: the doc's *adjacency* rule ("two sectors are adjacent for a
 * player if they are in both servers") is about which player is in which
 * Discord guilds — that's stateful membership data the bot tracks, not
 * something derivable from a single guild's category/channel structure. So
 * this module takes the *set of sectors already known to be relevant*
 * (e.g. every server a given player shares with the bot) and computes the
 * deterministic jump properties between each pair. Hub-sector special-casing
 * ("always reachable... solves new player with no connected sectors") is a
 * routing/game-state decision layered on top of this graph, not a jump edge
 * itself, so it's left out of this pure derivation too.
 */
import { rngFor } from './rng';
import type { JumpEdge, JumpGraph, Sector, SecurityLevel } from './types';

const MIN_JUMP_MINUTES = 5;
const MAX_JUMP_MINUTES = 6 * 60;

const LOW_SECURITY_LEVELS: ReadonlySet<SecurityLevel> = new Set(['low-sec', 'null-sec']);

function isLowSecurity(level: SecurityLevel): boolean {
  return LOW_SECURITY_LEVELS.has(level);
}

/**
 * Computes the jump edge between two sectors. Symmetric: `computeJumpEdge(a,
 * b)` and `computeJumpEdge(b, a)` describe the same edge (same minutes,
 * same risk) because the seed is built from the sorted guild ID pair.
 */
export function computeJumpEdge(a: Sector, b: Sector): JumpEdge {
  const [sectorA, sectorB] = a.guildId.localeCompare(b.guildId) <= 0 ? [a.guildId, b.guildId] : [b.guildId, a.guildId];
  const rng = rngFor('jump', sectorA, sectorB);

  const jumpMinutes = Math.round(MIN_JUMP_MINUTES + rng() * (MAX_JUMP_MINUTES - MIN_JUMP_MINUTES));
  const lowSecurity = isLowSecurity(a.securityLevel) || isLowSecurity(b.securityLevel);
  // Stable per-pair roll in (0, 0.4]; only meaningful when the route is low-security.
  const pirateEncounterChance = lowSecurity ? Math.round(rng() * 0.4 * 100) / 100 || 0.01 : 0;

  return { sectorA, sectorB, jumpMinutes, lowSecurity, pirateEncounterChance };
}

/**
 * Builds every pairwise jump edge across `sectors`. Order-independent: the
 * same set of sectors, in any order, produces the same set of edges (each
 * unordered pair appears once, keyed by sorted guild ID).
 */
export function buildJumpGraph(sectors: readonly Sector[]): JumpGraph {
  const edges: JumpEdge[] = [];
  for (let i = 0; i < sectors.length; i++) {
    for (let j = i + 1; j < sectors.length; j++) {
      edges.push(computeJumpEdge(sectors[i]!, sectors[j]!));
    }
  }
  return edges.sort((x, y) => x.sectorA.localeCompare(y.sectorA) || x.sectorB.localeCompare(y.sectorB));
}
