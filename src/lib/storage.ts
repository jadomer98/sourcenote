import { database } from './db';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
// Originals are small and capped. PostgreSQL bytea avoids a paid disk or bucket.
export async function putOriginal(sourceId: string, data: Buffer) {
  await (
    await database()
  ).query('INSERT INTO source_blob(source_id,data) VALUES($1,$2)', [sourceId, data]);
}
export async function getOriginal(sourceId: string) {
  const [row] = await (
    await database()
  ).query<{ data: Uint8Array }>('SELECT data FROM source_blob WHERE source_id=$1', [sourceId]);
  return row ? Buffer.from(row.data) : null;
}
export async function extractionFile<T>(sourceId: string, fn: (file: string) => Promise<T>) {
  const data = await getOriginal(sourceId);
  if (!data) throw new Error('Original unavailable');
  const dir = path.join(tmpdir(), 'sourcenote');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, sourceId + '-' + crypto.randomUUID());
  await writeFile(file, data, { flag: 'wx' });
  try {
    return await fn(file);
  } finally {
    await rm(file, { force: true });
  }
}
export async function removeOriginal(sourceId: string) {
  await (await database()).query('DELETE FROM source_blob WHERE source_id=$1', [sourceId]);
}
