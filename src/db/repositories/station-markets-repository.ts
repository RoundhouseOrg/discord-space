import { seedStationMarket, tick, type StationMarketState } from '../../engine/economy';
import type { SqliteDatabase } from '../connection';

export interface StationMarketsRepository {
  /** Seeds the guild's default station on first read, ticks to `now`, persists and returns the state. */
  readAndTick(guildId: string, now: Date): StationMarketState;
}

interface Row {
  readonly state: string;
}

interface StoredCommodity {
  stock: number;
  equilibrium: number;
  production: number;
  consumption: number;
  lastUpdated: number;
}

function serialize(state: StationMarketState): string {
  const out: Record<string, StoredCommodity> = {};
  for (const [id, s] of Object.entries(state)) {
    if (!s) continue;
    out[id] = { ...s, lastUpdated: s.lastUpdated.getTime() };
  }
  return JSON.stringify(out);
}

function deserialize(json: string): StationMarketState {
  const parsed = JSON.parse(json) as Record<string, StoredCommodity>;
  const out: Record<string, StationMarketState[keyof StationMarketState]> = {};
  for (const [id, s] of Object.entries(parsed)) out[id] = { ...s, lastUpdated: new Date(s.lastUpdated) };
  return out as StationMarketState;
}

export class SqliteStationMarketsRepository implements StationMarketsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  readAndTick(guildId: string, now: Date): StationMarketState {
    const row = this.db.prepare('SELECT state FROM station_markets WHERE guild_id = ?').get(guildId) as
      | Row
      | undefined;
    const next = tick(row ? deserialize(row.state) : seedStationMarket(now), now);
    this.db
      .prepare(
        `INSERT INTO station_markets (guild_id, state) VALUES (?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET state = excluded.state`,
      )
      .run(guildId, serialize(next));
    return next;
  }
}
