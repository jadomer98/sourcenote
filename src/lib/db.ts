import { PGlite } from '@electric-sql/pglite';
import { Pool, type PoolClient } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { config, checkProductionConfig } from './config';

export interface Sql {
  query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}
type Database = Sql & {
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};
const globalDb = globalThis as typeof globalThis & { sourceNoteDb?: Promise<Database> };
async function connect(): Promise<Database> {
  checkProductionConfig();
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 5000,
    });
    attachDatabasePool(pool);
    // Idle connections can disappear when Neon suspends; pg replaces them on the next query.
    pool.on('error', () => console.error('An idle database connection was closed.'));
    const adapt = (client: Pool | PoolClient): Sql => ({
      query: async <T extends object>(sql: string, params: unknown[] = []) =>
        (await client.query(sql, params)).rows as T[],
    });
    const db: Database = {
      ...adapt(pool),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const result = await fn(adapt(c));
          await c.query('COMMIT');
          return result;
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        } finally {
          c.release();
        }
      },
      close: () => pool.end(),
    };
    try {
      const versions = await db.query('SELECT version FROM schema_version WHERE version = 1');
      if (!versions.length) throw new Error('Run npm run db:migrate before starting the app.');
    } catch (error) {
      await pool.end();
      throw error;
    }
    return db;
  }
  const migration = await readFile(path.join(process.cwd(), 'migrations/001_initial.sql'), 'utf8');
  await mkdir(config.dataDir, { recursive: true });
  const pg = new PGlite(
    process.env.TEST_DATABASE === 'memory' ? undefined : path.join(config.dataDir, 'postgres'),
  );
  await pg.waitReady;
  await pg.exec(migration);
  const adapt = (client: Pick<PGlite, 'query'>): Sql => ({
    query: async <T extends object>(sql: string, params: unknown[] = []) =>
      (await client.query<T>(sql, params)).rows,
  });
  return {
    ...adapt(pg),
    transaction: (fn) => pg.transaction((tx) => fn(adapt(tx))),
    close: () => pg.close(),
  };
}
export function database() {
  return (globalDb.sourceNoteDb ??= connect().catch((error) => {
    delete globalDb.sourceNoteDb;
    throw error;
  }));
}
export async function resetDatabaseForTests() {
  if (globalDb.sourceNoteDb) {
    await (await globalDb.sourceNoteDb).close();
    delete globalDb.sourceNoteDb;
  }
}
