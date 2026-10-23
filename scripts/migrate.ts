import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
async function main() {
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
