import { describe, expect, it } from 'vitest';
import { openDatabase } from './connection';
import { migrate } from './migrate';
import { SqliteMetaRepository } from './repositories/meta-repository';

describe('SqliteMetaRepository', () => {
  it('stores and updates values behind the repository interface', () => {
    const db = openDatabase({ path: ':memory:' });
    migrate(db);
    const repo = new SqliteMetaRepository(db);

    expect(repo.get('schema_version')).toBeUndefined();

    repo.set('schema_version', '1');
    expect(repo.get('schema_version')).toBe('1');

    repo.set('schema_version', '2');
    expect(repo.get('schema_version')).toBe('2');

    db.close();
  });
});
