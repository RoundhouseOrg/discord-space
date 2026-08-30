import type { SqliteDatabase } from '../connection';

export interface ShipRecord {
  readonly id: number;
  readonly ownerId: string;
  readonly hullId: string;
  readonly role: string;
  readonly credits: number;
  readonly cargoOreTonnes: number;
  readonly createdAt: Date;
}

/**
 * Repository contract for ships (docs/01-vision.md: one ship per Discord
 * account). Game code should depend on this interface, not the concrete
 * driver, so a Postgres implementation can slot in later
 * (docs/05-tech-stack.md).
 */
export interface ShipsRepository {
  findByOwner(ownerId: string): ShipRecord | undefined;
  create(ownerId: string, hullId: string, role: string, startingCredits: number, now: Date): ShipRecord;
  creditOre(shipId: number, tonnes: number): void;
}

interface ShipRow {
  readonly id: number;
  readonly owner_id: string;
  readonly hull_id: string;
  readonly role: string;
  readonly credits: number;
  readonly cargo_ore_tonnes: number;
  readonly created_at: number;
}

function toRecord(row: ShipRow): ShipRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    hullId: row.hull_id,
    role: row.role,
    credits: row.credits,
    cargoOreTonnes: row.cargo_ore_tonnes,
    createdAt: new Date(row.created_at),
  };
}

export class SqliteShipsRepository implements ShipsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  findByOwner(ownerId: string): ShipRecord | undefined {
    const row = this.db.prepare('SELECT * FROM ships WHERE owner_id = ?').get(ownerId) as
      | ShipRow
      | undefined;
    return row ? toRecord(row) : undefined;
  }

  create(ownerId: string, hullId: string, role: string, startingCredits: number, now: Date): ShipRecord {
    const result = this.db
      .prepare(
        `INSERT INTO ships (owner_id, hull_id, role, credits, cargo_ore_tonnes, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
      )
      .run(ownerId, hullId, role, startingCredits, now.getTime());
    return {
      id: Number(result.lastInsertRowid),
      ownerId,
      hullId,
      role,
      credits: startingCredits,
      cargoOreTonnes: 0,
      createdAt: now,
    };
  }

  creditOre(shipId: number, tonnes: number): void {
    this.db
      .prepare('UPDATE ships SET cargo_ore_tonnes = cargo_ore_tonnes + ? WHERE id = ?')
      .run(tonnes, shipId);
  }
}
