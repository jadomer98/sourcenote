import { randomUUID } from 'node:crypto';
import { database } from './db';
import { ownedNotebook, hash } from './auth';
import { config } from './config';
import { invariant, AppError } from './errors';
import { extract } from './extraction';
import { extractionFile } from './storage';
import { splitText } from './tokenizer';
import { invalidateSource } from './notebooks';
import type { Source } from './types';

export async function addSource(
  owner: string,
  notebook: string,
  title: string,
  data: Buffer,
  mime: string,
  key: string,
) {
  invariant(
    data.length <= config.fileBytes,
    'FILE_SIZE',
    'Die Datei ist zu groß. Maximal 4 MiB pro Quelle.',
    413,
  );
  invariant(
    mime === 'text/plain' || mime === 'application/pdf',
    'FILE_TYPE',
    'Bitte eine PDF- oder UTF-8-Textdatei verwenden.',
  );
  if (mime === 'application/pdf')
    invariant(
      data.subarray(0, 5).toString() === '%PDF-',
      'PDF_SIGNATURE',
      'Die Datei hat keine gültige PDF-Signatur.',
    );
  const db = await database();
  const id = randomUUID();
  const operation = randomUUID();
  const requestHash = hash(title + mime + hash(data.toString('base64')));
  const existing = await db.transaction(async (tx) => {
    await tx.query("INSERT INTO quota_bucket(key) VALUES('storage') ON CONFLICT DO NOTHING");
    await tx.query("SELECT key FROM quota_bucket WHERE key='storage' FOR UPDATE");
    await ownedNotebook(tx, owner, notebook, true);
    const [previous] = await tx.query<{ request_hash: string; source_id: string }>(
      "SELECT o.request_hash,os.source_id FROM operation o JOIN operation_source os ON os.operation_id=o.id WHERE o.notebook_id=$1 AND o.kind='ingest' AND o.idempotency_key=$2",
      [notebook, key],
    );
    if (previous) {
      invariant(
        previous.request_hash === requestHash,
        'IDEMPOTENCY',
        'Dieser Vorgangsschlüssel wurde bereits anders verwendet.',
        409,
      );
      return previous.source_id;
    }
    const [count] = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM source WHERE notebook_id=$1 AND status NOT IN ('deleted','deleting')",
      [notebook],
    );
    invariant(
      count.count < config.sources,
      'SOURCE_LIMIT',
      `Maximal ${config.sources} Quellen pro Notebook. Entferne zuerst eine Quelle.`,
      429,
    );
    const [space] = await tx.query<{ bytes: string }>(
      'SELECT coalesce(sum(bytes),0) AS bytes FROM source',
    );
    invariant(
      Number(space.bytes) + data.length <= config.globalStorage,
      'STORAGE_LIMIT',
      'Der Demo-Speicher ist voll. Bitte später erneut versuchen.',
      429,
    );
    const hour = 'upload:' + owner + ':' + new Date().toISOString().slice(0, 13);
    await tx.query('INSERT INTO quota_bucket(key) VALUES($1) ON CONFLICT DO NOTHING', [hour]);
    const [rate] = await tx.query<{ requests: number }>(
      'UPDATE quota_bucket SET requests=requests+1 WHERE key=$1 RETURNING requests',
      [hour],
    );
    invariant(
      rate.requests <= 20,
      'UPLOAD_LIMIT',
      'Zu viele Uploads. Bitte in einer Stunde erneut versuchen.',
      429,
    );
    const [active] = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM source WHERE status='processing' AND lease_until>now()",
    );
    invariant(
      active.count < 1,
      'EXTRACTION_BUSY',
      'Eine andere Quelle wird gerade verarbeitet. Bitte gleich erneut versuchen.',
      429,
    );
    await tx.query(
      "INSERT INTO source(id,notebook_id,title,mime,bytes,status,storage_key) VALUES($1,$2,$3,$4,$5,'pending',$6)",
      [id, notebook, title, mime, data.length, id],
    );
    await tx.query('INSERT INTO source_blob(source_id,data) VALUES($1,$2)', [id, data]);
    await tx.query(
      "INSERT INTO operation(id,notebook_id,kind,state,idempotency_key,request_hash,lease_until) VALUES($1,$2,'ingest','running',$3,$4,now()+interval '90 seconds')",
      [operation, notebook, key, requestHash],
    );
    await tx.query(
      'INSERT INTO operation_source(notebook_id,operation_id,source_id,source_version) VALUES($1,$2,$3,1)',
      [notebook, operation, id],
    );
    // Reserve extraction before leaving the admission transaction.
    await tx.query(
      "UPDATE source SET status='processing',attempt_token=$2,lease_until=now()+interval '90 seconds' WHERE id=$1",
      [id, operation],
    );
    return null;
  });
  if (existing) return existing;
  await processSource(owner, notebook, id, operation, mime);
  return id;
}
async function processSource(
  owner: string,
  notebook: string,
  id: string,
  attempt: string,
  mime: string,
) {
  const db = await database();
  try {
    const pages = await extractionFile(id, (file) => extract(file, mime));
    const charCount = pages.reduce((sum, p) => sum + p.text.length, 0);
    await db.transaction(async (tx) => {
      await ownedNotebook(tx, owner, notebook, true);
      const [source] = await tx.query<{ attempt_token: string; status: string; valid: boolean }>(
        'SELECT attempt_token,status,lease_until>now() AS valid FROM source WHERE id=$1',
        [id],
      );
      invariant(
        source?.attempt_token === attempt && source.status === 'processing' && source.valid,
        'STALE_SOURCE',
        'Die Verarbeitung wurde unterbrochen. Bitte erneut versuchen.',
        409,
      );
      const [total] = await tx.query<{ count: string }>(
        `SELECT coalesce(sum(s.char_count),0) AS count FROM source s JOIN notebook n ON n.id=s.notebook_id WHERE n.owner_id=$1`,
        [owner],
      );
      invariant(
        Number(total.count) + charCount <= config.totalChars,
        'TEXT_QUOTA',
        'Dein Arbeitsbereich enthält zu viel Text. Entferne zuerst andere Quellen.',
        429,
      );
      await tx.query('DELETE FROM chunk WHERE source_id=$1', [id]);
      let ordinal = 0;
      for (const page of pages)
        for (const c of splitText(page.text, page.page))
          await tx.query(
            'INSERT INTO chunk(id,notebook_id,source_id,ordinal,text,tokens,page_no,char_start,char_end) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [
              randomUUID(),
              notebook,
              id,
              ordinal++,
              c.text,
              c.tokens,
              c.page_no,
              c.char_start,
              c.char_end,
            ],
          );
      await tx.query(
        "UPDATE source SET status='ready',char_count=$2,page_count=$3,error_message=NULL,error_code=NULL,lease_until=NULL WHERE id=$1",
        [id, charCount, mime === 'application/pdf' ? pages.length : null],
      );
      await tx.query("UPDATE operation SET state='succeeded' WHERE id=$1", [attempt]);
      await tx.query('UPDATE notebook SET updated_at=now() WHERE id=$1', [notebook]);
    });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : 'Die Verarbeitung ist fehlgeschlagen. Bitte erneut versuchen.';
    await db.query(
      "UPDATE source SET status='failed',error_code=$3,error_message=$4,lease_until=NULL WHERE id=$1 AND attempt_token=$2 AND status='processing'",
      [id, attempt, error instanceof AppError ? error.code : 'EXTRACTION', message],
    );
    await db.query(
      "UPDATE operation SET state='failed',error_code='EXTRACTION',error_message=$2 WHERE id=$1 AND state='running'",
      [attempt, message],
    );
  }
}
export async function retrySource(owner: string, notebook: string, id: string) {
  const db = await database();
  const attempt = randomUUID();
  const mime = await db.transaction(async (tx) => {
    await tx.query("INSERT INTO quota_bucket(key) VALUES('storage') ON CONFLICT DO NOTHING");
    await tx.query("SELECT key FROM quota_bucket WHERE key='storage' FOR UPDATE");
    await ownedNotebook(tx, owner, notebook, true);
    const [s] = await tx.query<Source>('SELECT * FROM source WHERE id=$1 AND notebook_id=$2', [
      id,
      notebook,
    ]);
    invariant(s, 'NOT_FOUND', 'Quelle nicht gefunden.', 404);
    invariant(
      s.status === 'failed',
      'SOURCE_STATE',
      'Diese Quelle kann gerade nicht erneut verarbeitet werden.',
      409,
    );
    const hour = 'upload:' + owner + ':' + new Date().toISOString().slice(0, 13);
    await tx.query('INSERT INTO quota_bucket(key) VALUES($1) ON CONFLICT DO NOTHING', [hour]);
    const [rate] = await tx.query<{ requests: number }>(
      'UPDATE quota_bucket SET requests=requests+1 WHERE key=$1 RETURNING requests',
      [hour],
    );
    invariant(
      rate.requests <= 20,
      'UPLOAD_LIMIT',
      'Zu viele Verarbeitungsversuche. Bitte in einer Stunde erneut versuchen.',
      429,
    );
    const [active] = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM source WHERE status='processing' AND lease_until>now()",
    );
    invariant(
      active.count < 1,
      'EXTRACTION_BUSY',
      'Eine Quelle wird gerade verarbeitet. Bitte kurz warten.',
      429,
    );
    await tx.query(
      "UPDATE source SET status='processing',attempt_token=$2,lease_until=now()+interval '90 seconds',error_message=NULL WHERE id=$1",
      [id, attempt],
    );
    await tx.query(
      "INSERT INTO operation(id,notebook_id,kind,state,idempotency_key,request_hash,lease_until) VALUES($1,$2,'ingest','running',$3,$3,now()+interval '90 seconds')",
      [attempt, notebook, attempt],
    );
    await tx.query('INSERT INTO operation_source VALUES($1,$2,$3,1)', [notebook, attempt, id]);
    return s.mime;
  });
  await processSource(owner, notebook, id, attempt, mime);
}
export async function previewSource(owner: string, notebook: string, id: string) {
  const db = await database();
  await ownedNotebook(db, owner, notebook);
  const [source] = await db.query<Source>(
    "SELECT * FROM source WHERE id=$1 AND notebook_id=$2 AND status='ready'",
    [id, notebook],
  );
  invariant(source, 'NOT_FOUND', 'Die Quelle ist nicht verfügbar.', 404);
  const chunks = await db.query<{ id: string; text: string; page_no: number | null }>(
    'SELECT id,text,page_no FROM chunk WHERE source_id=$1 ORDER BY ordinal',
    [id],
  );
  return { source, chunks };
}
export async function deleteSource(owner: string, notebook: string, id: string) {
  const db = await database();
  await db.transaction(async (tx) => {
    await ownedNotebook(tx, owner, notebook, true);
    const [s] = await tx.query('SELECT id FROM source WHERE id=$1 AND notebook_id=$2', [
      id,
      notebook,
    ]);
    invariant(s, 'NOT_FOUND', 'Quelle nicht gefunden.', 404);
    await invalidateSource(tx, id);
  });
}
