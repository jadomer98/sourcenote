import { randomUUID } from 'node:crypto';
import { database } from './db';
import { hash, ownedNotebook } from './auth';
import { config } from './config';
import { AppError, invariant } from './errors';
import { tokens } from './tokenizer';
import {
  callProvider,
  validateGenerated,
  promptFor,
  systemPrompt,
  outputSchema,
  type Passage,
  type Provider,
} from './provider';
import type { Generated, GenerationKind } from './types';
import { isStudioKind, schemaForStudio, studioInstructions, studioTools } from './studio';
import { findTextRange } from './pdf-text';
type Kind = GenerationKind;
type Selected = { id: string; version: number; status: string; title: string };
export async function generate(
  owner: string,
  notebook: string,
  sourceIds: string[],
  question: string,
  kind: Kind,
  key: string,
  provider: Provider = callProvider,
) {
  invariant(
    config.aiReady || provider !== callProvider,
    'AI_NOT_CONFIGURED',
    'Verbinde zuerst einen kostenlosen KI-Anbieter. Alle anderen Funktionen sind bereits nutzbar.',
    503,
  );
  const db = await database();
  const id = randomUUID();
  const requestHash = hash(JSON.stringify({ sourceIds: [...sourceIds].sort(), question, kind }));
  const passages: Passage[] = [];
  let selected: Selected[] = [];
  let reserved = 0;
  const quotaDay = new Date().toISOString().slice(0, 10);
  let measuredUsage: number | null = null;
  const existing = await db.transaction(async (tx) => {
    const day = quotaDay;
    const globalKey = 'global:' + day;
    await tx.query('INSERT INTO quota_bucket(key) VALUES($1) ON CONFLICT DO NOTHING', [globalKey]);
    await tx.query('SELECT key FROM quota_bucket WHERE key=$1 FOR UPDATE', [globalKey]);
    await tx.query('SELECT id FROM workspace_owner WHERE id=$1 FOR UPDATE', [owner]);
    await ownedNotebook(tx, owner, notebook, true);
    const [previous] = await tx.query<{
      id: string;
      request_hash: string;
      state: string;
      error_message: string | null;
    }>(
      'SELECT id,request_hash,state,error_message FROM operation WHERE notebook_id=$1 AND kind=$2 AND idempotency_key=$3',
      [notebook, kind, key],
    );
    if (previous) {
      invariant(
        previous.request_hash === requestHash,
        'IDEMPOTENCY',
        'Der Vorgangsschlüssel wurde bereits anders verwendet.',
        409,
      );
      return previous;
    }
    invariant(
      sourceIds.length > 0 && new Set(sourceIds).size === sourceIds.length,
      'NO_SOURCES',
      'Bitte mindestens eine fertige Quelle auswählen.',
    );
    selected = await tx.query<Selected>(
      'SELECT id,version,status,title FROM source WHERE notebook_id=$1 AND id=ANY($2::uuid[])',
      [notebook, sourceIds],
    );
    invariant(
      selected.length === sourceIds.length && selected.every((s) => s.status === 'ready'),
      'SOURCE_SCOPE',
      'Eine ausgewählte Quelle ist nicht mehr verfügbar. Bitte Auswahl aktualisieren.',
      409,
    );
    const chunks = await tx.query<{
      id: string;
      source_id: string;
      text: string;
      page_no: number | null;
      title: string;
    }>(
      `SELECT c.*,s.title FROM chunk c JOIN source s ON s.id=c.source_id WHERE c.notebook_id=$1 AND c.source_id=ANY($2::uuid[]) ORDER BY s.created_at,c.ordinal`,
      [notebook, sourceIds],
    );
    invariant(
      chunks.length > 0,
      'NO_EVIDENCE',
      'Keine lesbaren Belege gefunden. Bitte andere Quellen auswählen.',
    );
    for (const chunk of chunks)
      passages.push({
        id: randomUUID(),
        text: chunk.text,
        title: chunk.title,
        page: chunk.page_no,
      });
    invariant(
      tokens(chunks.map((c) => c.text).join('\n')) <= config.evidenceTokens,
      'CONTEXT_LIMIT',
      'Die Auswahl ist für den kostenlosen KI-Zugang zu groß. Bitte weniger oder kürzere Quellen auswählen.',
      413,
    );
    // A margin covers chat framing and tokenizer differences for open models.
    reserved =
      Math.ceil(
        tokens(
          systemPrompt +
            (isStudioKind(kind) ? studioInstructions[kind] : '') +
            promptFor(question, passages) +
            JSON.stringify(isStudioKind(kind) ? schemaForStudio(kind) : outputSchema),
        ) * 1.25,
      ) +
      config.outputTokens +
      200;
    invariant(
      reserved <= 8000,
      'CONTEXT_LIMIT',
      'Die Anfrage ist zu groß. Bitte Auswahl oder Frage kürzen.',
      413,
    );
    await tx.query(
      "UPDATE operation SET state='failed',error_code='INTERRUPTED',error_message='Die Anfrage wurde unterbrochen. Bitte erneut versuchen.' WHERE state='running' AND lease_until<now()",
    );
    const [active] = await tx.query<{ count: number; own: number }>(
      `SELECT count(*)::int AS count,count(*) FILTER(WHERE n.owner_id=$1)::int AS own FROM operation o JOIN notebook n ON n.id=o.notebook_id WHERE o.state='running' AND o.kind<>'ingest'`,
      [owner],
    );
    invariant(
      active.count < 3 && active.own < 1,
      'BUSY',
      'Eine KI-Anfrage läuft bereits. Bitte kurz warten.',
      429,
    );
    const sessionKey = 'session:' + owner + ':' + day;
    await tx.query('INSERT INTO quota_bucket(key) VALUES($1) ON CONFLICT DO NOTHING', [sessionKey]);
    const [usage] = await tx.query<{ requests: number }>(
      'SELECT requests FROM quota_bucket WHERE key=$1',
      [sessionKey],
    );
    invariant(
      usage.requests < config.dailyRequests,
      'DAILY_LIMIT',
      'Dein kostenloses Tageslimit ist erreicht. Morgen ist die KI wieder verfügbar.',
      429,
    );
    const [budget] = await tx.query<{ tokens: string }>(
      'SELECT tokens FROM quota_bucket WHERE key=$1',
      [globalKey],
    );
    invariant(
      Number(budget.tokens) + reserved <= config.globalTokens,
      'GLOBAL_LIMIT',
      'Das KI-Tagesbudget der Demo ist aufgebraucht. Bitte morgen erneut versuchen.',
      429,
    );
    // Groq's actual response headers govern its rolling rate window. A second fixed-minute
    // reservation bucket used to reject sequential requests even when cached/unused tokens
    // left provider capacity. Keep concurrency and daily reservations, not that duplicate gate.
    await tx.query(
      'UPDATE quota_bucket SET tokens=tokens+$2,requests=requests+1,updated_at=now() WHERE key=$1',
      [globalKey, reserved],
    );
    await tx.query('UPDATE quota_bucket SET requests=requests+1,updated_at=now() WHERE key=$1', [
      sessionKey,
    ]);
    await tx.query(
      "INSERT INTO operation(id,notebook_id,kind,state,idempotency_key,request_hash,lease_until,model,prompt_version,reserved_tokens) VALUES($1,$2,$3,'running',$4,$5,now()+interval '90 seconds',$6,'grounded-v2-quotes',$7)",
      [id, notebook, kind, key, requestHash, config.model, reserved],
    );
    await tx.query('INSERT INTO ai_usage(id,owner_id,provider,model,kind) VALUES($1,$2,$3,$4,$5)', [
      id,
      owner,
      process.env.AI_TEST_MODE === 'true' ? 'test' : config.provider,
      config.model,
      kind,
    ]);
    for (const s of selected)
      await tx.query('INSERT INTO operation_source VALUES($1,$2,$3,$4)', [
        notebook,
        id,
        s.id,
        s.version,
      ]);
    for (let i = 0; i < chunks.length; i++)
      await tx.query(
        'INSERT INTO evidence(id,notebook_id,operation_id,source_id,chunk_id,ordinal) VALUES($1,$2,$3,$4,$5,$6)',
        [passages[i].id, notebook, id, chunks[i].source_id, chunks[i].id, i],
      );
    if (kind === 'answer')
      await tx.query(
        "INSERT INTO entry(id,notebook_id,operation_id,kind,body) VALUES($1,$2,$3,'question',$4::jsonb)",
        [
          randomUUID(),
          notebook,
          id,
          JSON.stringify({ outcome: 'answer', blocks: [{ text: question, evidence_ids: [] }] }),
        ],
      );
    return null;
  });
  if (existing) {
    if (existing.state === 'failed')
      throw new AppError(
        'PREVIOUS_FAILURE',
        existing.error_message || 'Bitte eine neue Anfrage starten.',
        409,
      );
    return { id: existing.id, state: existing.state };
  }
  try {
    const response = await provider(question, passages, {
      kind,
      onTelemetry: async (data) => {
        measuredUsage = data.totalTokens;
        await db.query(
          'UPDATE ai_usage SET http_status=$2,input_tokens=$3,output_tokens=$4,total_tokens=$5,provider_limits=$6::jsonb WHERE id=$1',
          [
            id,
            data.httpStatus,
            data.inputTokens,
            data.outputTokens,
            data.totalTokens,
            JSON.stringify(data.limits),
          ],
        );
      },
    });
    measuredUsage = response.usage;
    await db.query('UPDATE ai_usage SET total_tokens=$2 WHERE id=$1', [id, response.usage]);
    const output = validateGenerated(response.output, passages, kind);
    await db.transaction(async (tx) => {
      await ownedNotebook(tx, owner, notebook, true);
      const [op] = await tx.query<{ state: string; valid: boolean }>(
        'SELECT state,lease_until>now() AS valid FROM operation WHERE id=$1',
        [id],
      );
      invariant(
        op?.state === 'running' && op.valid,
        'STALE_OPERATION',
        'Diese Anfrage wurde unterbrochen. Bitte erneut versuchen.',
        409,
      );
      const current = await tx.query<Selected>(
        'SELECT id,version,status FROM source WHERE id=ANY($1::uuid[])',
        [sourceIds],
      );
      invariant(
        current.length === selected.length &&
          current.every(
            (c) =>
              c.status === 'ready' && selected.find((s) => s.id === c.id)?.version === c.version,
          ),
        'SOURCE_CHANGED',
        'Die Quellen wurden während der Antwort geändert. Bitte erneut fragen.',
        409,
      );
      const entry = randomUUID();
      const title = studioTools.find((t) => t.kind === kind)?.title || null;
      await tx.query(
        'INSERT INTO entry(id,notebook_id,operation_id,kind,title,body) VALUES($1,$2,$3,$4,$5,$6::jsonb)',
        [entry, notebook, id, kind, title, JSON.stringify(output)],
      );
      for (let b = 0; b < output.blocks.length; b++)
        for (let c = 0; c < output.blocks[b].evidence_ids.length; c++)
          await tx.query('INSERT INTO citation VALUES($1,$2,$3,$4,$5,$6)', [
            notebook,
            id,
            entry,
            output.blocks[b].evidence_ids[c],
            b,
            c + 1,
          ]);
      await tx.query("UPDATE operation SET state='succeeded',usage=$2::jsonb WHERE id=$1", [
        id,
        JSON.stringify({ total_tokens: response.usage }),
      ]);
      await tx.query("UPDATE ai_usage SET state='succeeded' WHERE id=$1", [id]);
      if (response.usage !== null)
        await tx.query('UPDATE quota_bucket SET tokens=greatest(0,tokens-$2+$3) WHERE key=$1', [
          'global:' + quotaDay,
          reserved,
          response.usage,
        ]);
      await tx.query('UPDATE notebook SET updated_at=now() WHERE id=$1', [notebook]);
    });
    return { id, state: 'succeeded' };
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            'GENERATION',
            'Die Antwort konnte nicht erstellt werden. Bitte erneut versuchen.',
            502,
          );
    await db.query(
      "UPDATE operation SET state='failed',error_code=$2,error_message=$3 WHERE id=$1 AND state='running'",
      [id, appError.code, appError.message],
    );
    await db.query("UPDATE ai_usage SET state='failed' WHERE id=$1", [id]);
    if (measuredUsage !== null)
      await db.query('UPDATE quota_bucket SET tokens=greatest(0,tokens-$2+$3) WHERE key=$1', [
        'global:' + quotaDay,
        reserved,
        measuredUsage,
      ]);
    throw appError;
  }
}
export async function resolveCitation(
  owner: string,
  notebook: string,
  entry: string,
  evidence: string,
) {
  const db = await database();
  await ownedNotebook(db, owner, notebook);
  const [row] = await db.query<{
    text: string;
    page_no: number | null;
    char_start: number;
    char_end: number;
    source_id: string;
    title: string;
    mime: string;
    body: Generated;
    block_no: number;
  }>(
    `SELECT ch.text,ch.page_no,ch.char_start,ch.char_end,s.id AS source_id,s.title,s.mime,en.body,c.block_no FROM citation c JOIN evidence e ON e.id=c.evidence_id JOIN chunk ch ON ch.id=e.chunk_id JOIN source s ON s.id=ch.source_id JOIN entry en ON en.id=c.entry_id WHERE c.notebook_id=$1 AND c.entry_id=$2 AND c.evidence_id=$3 AND s.status='ready' AND e.unavailable_at IS NULL AND en.unavailable_at IS NULL`,
    [notebook, entry, evidence],
  );
  invariant(
    row,
    'CITATION_UNAVAILABLE',
    'Dieser Beleg ist nicht mehr verfügbar. Die Quelle wurde möglicherweise entfernt.',
    404,
  );
  const quote = row.body?.blocks[row.block_no]?.source_quotes?.find(
    (q) => q.evidence_id === evidence,
  );
  const range = quote && findTextRange(row.text, quote.text);
  return {
    text: row.text,
    page_no: row.page_no,
    char_start: row.char_start,
    char_end: row.char_end,
    source_id: row.source_id,
    title: row.title,
    mime: row.mime,
    highlight_text: range ? row.text.slice(range.start, range.end) : row.text,
    highlight_start: row.char_start + (range?.start || 0),
    highlight_end: range ? row.char_start + range.end : row.char_end,
    precise: !!range,
  };
}
export async function saveNote(owner: string, notebook: string, entryId: string) {
  const db = await database();
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await ownedNotebook(tx, owner, notebook, true);
    const [source] = await tx.query<{ operation_id: string; body: Generated }>(
      "SELECT operation_id,body FROM entry WHERE id=$1 AND notebook_id=$2 AND kind IN ('answer','summary','quiz') AND unavailable_at IS NULL",
      [entryId, notebook],
    );
    invariant(source?.body, 'NOT_FOUND', 'Dieser Inhalt ist nicht mehr verfügbar.', 404);
    const [count] = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM entry WHERE notebook_id=$1 AND kind='note'",
      [notebook],
    );
    invariant(count.count < 30, 'NOTE_LIMIT', 'Maximal 30 Notizen pro Notebook.', 429);
    await tx.query(
      "INSERT INTO entry(id,notebook_id,operation_id,parent_id,kind,title,body) VALUES($1,$2,$3,$4,'note',$5,$6::jsonb)",
      [
        id,
        notebook,
        source.operation_id,
        entryId,
        'Gespeicherte Erkenntnis',
        JSON.stringify(source.body),
      ],
    );
    await tx.query(
      'INSERT INTO citation(notebook_id,operation_id,entry_id,evidence_id,block_no,ordinal) SELECT notebook_id,operation_id,$1,evidence_id,block_no,ordinal FROM citation WHERE entry_id=$2',
      [id, entryId],
    );
  });
  return id;
}
