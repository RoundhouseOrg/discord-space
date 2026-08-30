/** Shared numeric helper for the economy engine (docs/12-economy.md). */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * docs/12-economy.md tick pseudocode: `stock = clamp(stock, 0, 4 × equilibrium)`.
 * Shared by `tickCommodity` (drift) and `applyTrade` (buy/sell impact) so the
 * two never drift apart if this bound is retuned.
 */
export const MAX_STOCK_MULTIPLE_OF_EQUILIBRIUM = 4;

export function clampStock(stock: number, equilibrium: number): number {
  return clamp(stock, 0, MAX_STOCK_MULTIPLE_OF_EQUILIBRIUM * equilibrium);
}
