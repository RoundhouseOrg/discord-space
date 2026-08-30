/**
 * Deterministic PRNG for the combat engine. Deliberately a small, local
 * duplicate of src/engine/galaxy/rng.ts's mulberry32 rather than an import
 * from it: docs/10-combat.md's "Engine contract" says `engine/combat/`
 * exposes pure functions on its own, freestanding — it shouldn't reach into
 * the galaxy module for a coin flip.
 */

/** Same seed, same sequence forever. */
export type Rng = () => number;

/** mulberry32 — small, fast, deterministic PRNG. Yields floats in [0, 1). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in `[min, max)`. */
export function uniform(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Picks a deterministic element from a non-empty array. */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pick() requires a non-empty array.');
  }
  const index = Math.floor(rng() * items.length);
  return items[Math.min(index, items.length - 1)] as T;
}
