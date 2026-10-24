import nextEnv from '@next/env';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
async function main() {
  if (process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (new URL(connectionString).hostname.includes('-pooler.'))
      throw new Error('Migrations require DATABASE_URL_UNPOOLED. Run neon env pull.');
    const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
    try {
      await client.connect();
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(73826501)');
      await client.query(await readFile('migrations/001_initial.sql', 'utf8'));
      await client.query('COMMIT');
      const { rows } = await client.query('SELECT version FROM schema_version ORDER BY version');
      console.log(
        `PostgreSQL migration applied using direct connection. Schema versions: ${rows.map((r) => r.version).join(', ')}.`,
      );
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      await client.end();
    }
    return;
  }
  const { database } = await import('../src/lib/db');
  const db = await database();
  await db.query('SELECT 1');
  console.log('Database migration 001 applied.');
  await db.close();
}
main().catch(() => {
  console.error('Migration failed. Check database configuration.');
  process.exitCode = 1;
});
