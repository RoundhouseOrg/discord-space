import { findStarterHull } from '../progression';
import type { JobRecord } from './index';

/** The ship fields a status view needs (structurally satisfied by the db ShipRecord). */
export interface StatusShipInput {
  readonly hullId: string;
  readonly role: string;
  readonly credits: number;
  readonly cargoOreTonnes: number;
}

export interface ShipStatus {
  readonly hullName: string;
  readonly role: string;
  readonly credits: number;
  /** Commodities with a non-zero hold only. */
  readonly cargo: readonly { readonly commodity: string; readonly tonnes: number }[];
  readonly activeJob: {
    readonly type: string;
    readonly endsAt: Date;
    readonly remainingMs: number;
  } | null;
}

/** Shapes a ship and its active job (if any) into the /status view model. */
export function buildShipStatus(
  ship: StatusShipInput,
  activeJob: JobRecord | undefined | null,
  now: Date,
): ShipStatus {
  const cargo = ship.cargoOreTonnes > 0 ? [{ commodity: 'ore', tonnes: ship.cargoOreTonnes }] : [];
  return {
    hullName: findStarterHull(ship.hullId)?.name ?? ship.hullId,
    role: ship.role,
    credits: ship.credits,
    cargo,
    activeJob: activeJob
      ? {
          type: activeJob.type,
          endsAt: activeJob.endsAt,
          remainingMs: Math.max(activeJob.endsAt.getTime() - now.getTime(), 0),
        }
      : null,
  };
}
