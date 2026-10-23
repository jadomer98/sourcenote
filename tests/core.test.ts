import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { database, resetDatabaseForTests } from '../src/lib/db';
import { createNotebook, getWorkspace, deleteNotebook } from '../src/lib/notebooks';
import { addSource, previewSource, deleteSource, retrySource } from '../src/lib/sources';
import { generate, resolveCitation, saveNote } from '../src/lib/generation';
import { validateGenerated, type Provider } from '../src/lib/provider';
import { getOriginal } from '../src/lib/storage';
import { config } from '../src/lib/config';
const owner = randomUUID(),
  other = randomUUID();
let book: string, source: string;
const text =
  'Projekt Morgenlicht beginnt am 1. November 2026. Das genehmigte Budget beträgt 5.000 Euro. Mira Keller leitet das Projekt.';
const supported: Provider = async (_question, passages) => ({
  output: {
    outcome: 'answer',
    blocks: [{ text: 'Das Budget beträgt 5.000 Euro.', evidence_ids: [passages[0].id] }],
  },
  usage: 120,
});
beforeAll(async () => {
  process.env.TEST_DATABASE = 'memory';
  process.env.SESSION_SECRET = 'test-secret-is-long-enough-for-tests';
  const db = await database();
  for (const id of [owner, other])
    await db.query("INSERT INTO workspace_owner VALUES($1,$2,now(),now()+interval '7 days')", [
      id,
      randomUUID(),
    ]);
  book = await createNotebook(owner, 'Integrationstest');
  source = await addSource(
    owner,
    book,
    'Projektplan',
    Buffer.from(text),
    'text/plain',
    randomUUID(),
  );
});
afterAll(resetDatabaseForTests);
describe('durable source-to-citation workflow', () => {
  it('persists sources, splits text and retains the private original', async () => {
    const ws = await getWorkspace(owner, book);
    expect(ws.sources[0].status).toBe('ready');
    expect((await previewSource(owner, book, source)).chunks[0].text).toBe(text);
    expect((await getOriginal(source))?.toString()).toBe(text);
  });
  it('rejects a different workspace owner on read and mutation paths', async () => {
    await expect(getWorkspace(other, book)).rejects.toMatchObject({ status: 404 });
    await expect(previewSource(other, book, source)).rejects.toMatchObject({ status: 404 });
    await expect(deleteSource(other, book, source)).rejects.toMatchObject({ status: 404 });
  });
  it('rejects a source from another notebook', async () => {
    const second = await createNotebook(owner, 'Anderes Thema');
    await expect(
      generate(
        owner,
        second,
        [source],
        'Wie hoch ist das Budget?',
        'answer',
        randomUUID(),
        supported,
      ),
    ).rejects.toMatchObject({ code: 'SOURCE_SCOPE' });
    await deleteNotebook(owner, second);
  });
  it('produces stored citations, notes and an idempotent generation', async () => {
    const key = randomUUID();
    let calls = 0;
    const provider: Provider = async (...args) => {
      calls++;
      return supported(...args);
    };
    const result = await generate(
      owner,
      book,
      [source],
      'Wie hoch ist das Budget?',
      'answer',
      key,
      provider,
    );
    expect(
      (await generate(owner, book, [source], 'Wie hoch ist das Budget?', 'answer', key, provider))
        .id,
    ).toBe(result.id);
    expect(calls).toBe(1);
    const ws = await getWorkspace(owner, book);
    const answer = ws.entries.find((e) => e.kind === 'answer')!;
    expect(answer.citations).toHaveLength(1);
    const excerpt = await resolveCitation(owner, book, answer.id, answer.citations[0].evidence_id);
    expect(excerpt.text).toBe(text);
    expect(excerpt.page_no).toBeNull();
    await expect(
      resolveCitation(other, book, answer.id, answer.citations[0].evidence_id),
    ).rejects.toMatchObject({ status: 404 });
    await saveNote(owner, book, answer.id);
    expect((await getWorkspace(owner, book)).entries.some((e) => e.kind === 'note')).toBe(true);
    await expect(
      generate(owner, book, [source], 'Eine andere Frage', 'answer', key, provider),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY' });
  });
  it('does not expose sources excluded from the requested selection', async () => {
    const hidden = await addSource(
      owner,
      book,
      'Andere Quelle',
      Buffer.from(
        'Die geheime Kennzahl lautet ZEBRA-123. Diese Quelle darf nicht ausgewählt werden.',
      ),
      'text/plain',
      randomUUID(),
    );
    const provider: Provider = async (q, passages) => {
      expect(passages.map((p) => p.text).join()).not.toContain('ZEBRA');
      return supported(q, passages);
    };
    await generate(
      owner,
      book,
      [source],
      'Wie hoch ist das Budget?',
      'summary',
      randomUUID(),
      provider,
    );
    await deleteSource(owner, book, hidden);
  });
  it('persists an honest limitation without citations', async () => {
    const provider: Provider = async () => ({
      output: {
        outcome: 'insufficient',
        blocks: [{ text: 'Die Quellen enthalten keinen Strompreis.', evidence_ids: [] }],
      },
      usage: 100,
    });
    await generate(
      owner,
      book,
      [source],
      'Wie hoch ist der Strompreis?',
      'answer',
      randomUUID(),
      provider,
    );
    const ws = await getWorkspace(owner, book);
    const limitation = ws.entries.find((e) => e.body?.outcome === 'insufficient')!;
    expect(limitation.citations).toHaveLength(0);
  });
  it('enforces citation provenance with a composite SQL foreign key', async () => {
    const ws = await getWorkspace(owner, book);
    const answer = ws.entries.find((e) => e.kind === 'answer' && e.citations.length)!;
    const summary = ws.entries.find((e) => e.kind === 'summary' && e.citations.length)!;
    await expect(
      (await database()).query('INSERT INTO citation VALUES($1,$2,$3,$4,99,99)', [
        book,
        summary.operation_id,
        answer.id,
        summary.citations[0].evidence_id,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
  });
  it('admits only one in-flight generation for the same owner', async () => {
    let release!: () => void;
    let signal!: () => void;
    const started = new Promise<void>((resolve) => {
      signal = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider: Provider = async (...args) => {
      signal();
      await gate;
      return supported(...args);
    };
    const firstKey = randomUUID();
    const first = generate(owner, book, [source], 'Erste Anfrage', 'answer', firstKey, provider);
    await started;
    expect(
      (await generate(owner, book, [source], 'Erste Anfrage', 'answer', firstKey, provider)).state,
    ).toBe('running');
    try {
      await expect(
        generate(owner, book, [source], 'Zweite Anfrage', 'answer', randomUUID(), supported),
      ).rejects.toMatchObject({ code: 'BUSY' });
    } finally {
      release();
      await first;
    }
  });
  it('rejects fabricated citation IDs and leaves no unchecked answer', async () => {
    const provider: Provider = async () => ({
      output: { outcome: 'answer', blocks: [{ text: 'Erfunden.', evidence_ids: [randomUUID()] }] },
      usage: 50,
    });
    await expect(
      generate(owner, book, [source], 'Unbelegte Frage', 'answer', randomUUID(), provider),
    ).rejects.toMatchObject({ code: 'INVALID_CITATION' });
    expect(
      (await getWorkspace(owner, book)).entries.some((e) =>
        e.body?.blocks.some((b) => b.text === 'Erfunden.'),
      ),
    ).toBe(false);
  });
  it('does not automatically retry a provider timeout', async () => {
    let count = 0;
    const provider: Provider = async () => {
      count++;
      throw new Error('timeout');
    };
    await expect(
      generate(owner, book, [source], 'Timeout simulieren', 'answer', randomUUID(), provider),
    ).rejects.toMatchObject({ code: 'GENERATION' });
    expect(count).toBe(1);
  });
  it('blocks generation if a selected source is removed during the model call', async () => {
    const temp = await addSource(
      owner,
      book,
      'Temporär',
      Buffer.from(text),
      'text/plain',
      randomUUID(),
    );
    const provider: Provider = async (q, passages) => {
      await deleteSource(owner, book, temp);
      return supported(q, passages);
    };
    await expect(
      generate(owner, book, [temp], 'Budget?', 'answer', randomUUID(), provider),
    ).rejects.toMatchObject({ code: 'SOURCE_CHANGED' });
  });
  it('enforces the service-wide token cap before calling a provider', async () => {
    process.env.GLOBAL_DAILY_TOKEN_LIMIT = '1';
    let calls = 0;
    const provider: Provider = async (...args) => {
      calls++;
      return supported(...args);
    };
    await expect(
      generate(owner, book, [source], 'Budget?', 'answer', randomUUID(), provider),
    ).rejects.toMatchObject({ code: 'GLOBAL_LIMIT' });
    expect(calls).toBe(0);
    delete process.env.GLOBAL_DAILY_TOKEN_LIMIT;
  });
  it('validates signature and returns recoverable failed extraction without duplicate chunks', async () => {
    await expect(
      addSource(owner, book, 'Falsche PDF', Buffer.from(text), 'application/pdf', randomUUID()),
    ).rejects.toMatchObject({ code: 'PDF_SIGNATURE' });
    const failed = await addSource(
      owner,
      book,
      'Leer',
      Buffer.from('kurz'),
      'text/plain',
      randomUUID(),
    );
    await retrySource(owner, book, failed);
    const ws = await getWorkspace(owner, book);
    expect(ws.sources.find((s) => s.id === failed)?.status).toBe('failed');
    expect(
      (await (await database()).query('SELECT id FROM chunk WHERE source_id=$1', [failed])).length,
    ).toBe(0);
    await deleteSource(owner, book, failed);
  });
  it('extracts a real PDF and preserves its reliable page location', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    page.drawText('SourceNote PDF test. The budget is 5000 euros.', {
      x: 40,
      y: 750,
      size: 12,
      font: await pdf.embedFont(StandardFonts.Helvetica),
    });
    const id = await addSource(
      owner,
      book,
      'Echte PDF',
      Buffer.from(await pdf.save()),
      'application/pdf',
      randomUUID(),
    );
    const preview = await previewSource(owner, book, id);
    expect(preview.chunks[0].page_no).toBe(1);
    expect(preview.chunks[0].text).toContain('5000');
    await deleteSource(owner, book, id);
  });
  it('explains an empty/scanned PDF instead of marking it ready', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const id = await addSource(
      owner,
      book,
      'Kein Text',
      Buffer.from(await pdf.save()),
      'application/pdf',
      randomUUID(),
    );
    const failed = (await getWorkspace(owner, book)).sources.find((s) => s.id === id)!;
    expect(failed.status).toBe('failed');
    expect(failed.error_message).toContain('Textebene');
    await deleteSource(owner, book, id);
  });
  it('purges originals and evidence text, and redacts dependent historical outputs', async () => {
    const before = await getWorkspace(owner, book);
    const answer = before.entries.find((e) => e.kind === 'answer' && e.citations.length)!;
    const ref = answer.citations[0].evidence_id;
    await deleteSource(owner, book, source);
    expect(await getOriginal(source)).toBeNull();
    await expect(resolveCitation(owner, book, answer.id, ref)).rejects.toMatchObject({
      code: 'CITATION_UNAVAILABLE',
    });
    const after = await getWorkspace(owner, book);
    expect(
      after.entries
        .filter((e) => ['answer', 'note', 'summary'].includes(e.kind))
        .every((e) => e.body === null),
    ).toBe(true);
    await expect(
      generate(owner, book, [source], 'Budget?', 'answer', randomUUID(), supported),
    ).rejects.toMatchObject({ code: 'SOURCE_SCOPE' });
  });
  it('denies an expired owner before physical cleanup', async () => {
    const db = await database();
    await db.query("UPDATE workspace_owner SET expires_at=now()-interval '1 minute' WHERE id=$1", [
      owner,
    ]);
    await expect(getWorkspace(owner, book)).rejects.toMatchObject({ status: 404 });
  });
});
describe('grounding validation', () => {
  const p = [{ id: 'a', text: 'Fakt', title: 'Quelle', page: null }];
  it('rejects missing evidence and false references on limitations', () => {
    expect(() =>
      validateGenerated({ outcome: 'answer', blocks: [{ text: 'Fakt', evidence_ids: [] }] }, p),
    ).toThrow();
    expect(() =>
      validateGenerated(
        { outcome: 'insufficient', blocks: [{ text: 'Unklar', evidence_ids: ['a'] }] },
        p,
      ),
    ).toThrow();
  });
  it('fails closed when a provider has not been configured', () => {
    expect(config.aiReady).toBe(false);
  });
});
