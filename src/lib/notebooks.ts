import { randomUUID } from 'node:crypto';
import { database, type Sql } from './db';
import { ownedNotebook } from './auth';
import { config } from './config';
import { invariant } from './errors';
import type { Notebook, Source, Entry, Citation, Workspace } from './types';
export async function listNotebooks(owner: string) {
  return (await database()).query<Notebook>(
    `SELECT n.*,count(s.id) FILTER(WHERE s.status NOT IN ('deleted','deleting'))::int AS source_count FROM notebook n LEFT JOIN source s ON s.notebook_id=n.id WHERE n.owner_id=$1 GROUP BY n.id ORDER BY n.updated_at DESC`,
    [owner],
  );
}
export async function createNotebook(owner: string, title: string, emoji = 'book', color = 'blue') {
  const db = await database();
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.query('SELECT id FROM workspace_owner WHERE id=$1 FOR UPDATE', [owner]);
    const [n] = await tx.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM notebook WHERE owner_id=$1',
      [owner],
    );
    invariant(
      n.count < config.notebooks,
      'NOTEBOOK_LIMIT',
      `Du kannst bis zu ${config.notebooks} Notebooks anlegen. Lösche zuerst ein anderes.`,
      429,
    );
    await tx.query('INSERT INTO notebook(id,owner_id,title,emoji,color) VALUES($1,$2,$3,$4,$5)', [
      id,
      owner,
      title,
      emoji,
      color,
    ]);
  });
  return id;
}
export async function renameNotebook(owner: string, id: string, title: string) {
  const db = await database();
  await db.transaction(async (tx) => {
    await ownedNotebook(tx, owner, id, true);
    await tx.query('UPDATE notebook SET title=$1,updated_at=now() WHERE id=$2', [title, id]);
  });
}
export async function getWorkspace(owner: string, id: string): Promise<Workspace> {
  const db = await database();
  await ownedNotebook(db, owner, id);
  const notebook = (await listNotebooks(owner)).find((n) => n.id === id)!;
  const sources = await db.query<Source>(
    "SELECT id,notebook_id,title,mime,bytes,status,char_count,page_count,error_message,created_at FROM source WHERE notebook_id=$1 AND status NOT IN ('deleted','deleting') ORDER BY created_at",
    [id],
  );
  const entries = await db.query<Entry>(
    'SELECT id,notebook_id,operation_id,kind,title,body,unavailable_at,created_at FROM entry WHERE notebook_id=$1 ORDER BY created_at,id',
    [id],
  );
  const citations = await db.query<Citation & { entry_id: string }>(
    `SELECT c.entry_id,c.evidence_id,c.block_no,c.ordinal,e.source_id,s.title,ch.page_no FROM citation c JOIN evidence e ON e.id=c.evidence_id JOIN source s ON s.id=e.source_id LEFT JOIN chunk ch ON ch.id=e.chunk_id WHERE c.notebook_id=$1 ORDER BY c.block_no,c.ordinal`,
    [id],
  );
  for (const entry of entries) entry.citations = citations.filter((c) => c.entry_id === entry.id);
  const operations = await db.query<Workspace['operations'][number]>(
    "SELECT id,kind,state,error_message FROM operation WHERE notebook_id=$1 AND kind<>'ingest' AND (state='running' OR (state='failed' AND created_at>now()-interval '1 hour')) ORDER BY created_at DESC LIMIT 10",
    [id],
  );
  return { notebook, sources, entries, operations };
}
export async function invalidateSource(tx: Sql, source: string) {
  await tx.query(
    `UPDATE entry SET body=NULL,unavailable_at=now() WHERE kind<>'question' AND operation_id IN (SELECT operation_id FROM operation_source WHERE source_id=$1)`,
    [source],
  );
  await tx.query(
    'DELETE FROM citation WHERE operation_id IN (SELECT operation_id FROM operation_source WHERE source_id=$1)',
    [source],
  );
  await tx.query('UPDATE evidence SET chunk_id=NULL,unavailable_at=now() WHERE source_id=$1', [
    source,
  ]);
  await tx.query('DELETE FROM chunk WHERE source_id=$1', [source]);
  await tx.query('DELETE FROM source_blob WHERE source_id=$1', [source]);
  await tx.query(
    "UPDATE source SET status='deleted',title='Entfernte Quelle',storage_key=NULL,char_count=0,bytes=0,error_message=NULL,error_code=NULL,deleted_at=now(),attempt_token=NULL WHERE id=$1",
    [source],
  );
}
export async function deleteNotebook(owner: string, id: string) {
  const db = await database();
  await db.transaction(async (tx) => {
    await ownedNotebook(tx, owner, id, true);
    for (const source of await tx.query<{ id: string }>(
      'SELECT id FROM source WHERE notebook_id=$1',
      [id],
    ))
      await invalidateSource(tx, source.id);
    await tx.query('DELETE FROM notebook WHERE id=$1', [id]);
  });
}
