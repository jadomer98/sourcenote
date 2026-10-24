import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { database, resetDatabaseForTests } from '../src/lib/db';
import { createNotebook, deleteNotebook, getWorkspace } from '../src/lib/notebooks';
import { addSource, deleteSource } from '../src/lib/sources';
import { generate, resolveCitation } from '../src/lib/generation';
import { validateGenerated, type Provider } from '../src/lib/provider';
import { csvCell } from '../src/lib/studio';
import { authorizeUsageOwner, readUsage } from '../src/lib/usage';

const owner = randomUUID(),
  other = randomUUID();
const passage = {
  id: 'e1',
  title: 'Plan',
  text: 'Mira leitet das Projekt. Das Budget beträgt 5000 Euro.',
  page: 1,
};
let book: string, source: string;
beforeAll(async () => {
  process.env.TEST_DATABASE = 'memory';
  process.env.SESSION_SECRET = 'test-session-secret-is-long-enough';
  const db = await database();
  for (const id of [owner, other])
    await db.query("INSERT INTO workspace_owner VALUES($1,$2,now(),now()+interval '7 days')", [
      id,
      randomUUID(),
    ]);
  book = await createNotebook(owner, 'Studio');
  source = await addSource(
    owner,
    book,
    'Plan',
    Buffer.from(passage.text),
    'text/plain',
    randomUUID(),
  );
});
afterAll(async () => {
  delete process.env.USAGE_ADMIN_TOKEN;
  await resetDatabaseForTests();
});

describe('structured learning content', () => {
  it('rejects malformed quiz choices, invalid trees and uneven table rows', () => {
    const block = { text: 'Mira leitet das Projekt.', evidence_ids: ['e1'] };
    expect(() =>
      validateGenerated(
        {
          outcome: 'answer',
          blocks: Array(3).fill({
            ...block,
            question: 'Wer leitet?',
            options: ['Mira', 'Mira', 'A', 'B'],
            correct: 0,
          }),
        },
        [passage],
        'quiz',
      ),
    ).toThrow();
    expect(() =>
      validateGenerated(
        {
          outcome: 'answer',
          blocks: [
            { ...block, parent: -1 },
            { ...block, parent: 1 },
          ],
        },
        [passage],
        'mindmap',
      ),
    ).toThrow();
    expect(() =>
      validateGenerated(
        {
          outcome: 'answer',
          columns: ['A', 'B'],
          blocks: [
            { ...block, cells: ['A'] },
            { ...block, cells: ['B'] },
          ],
        },
        [passage],
        'table',
      ),
    ).toThrow();
  });
  it('rejects unknown evidence in flashcards and accepts safe insufficient results', () => {
    expect(() =>
      validateGenerated(
        {
          outcome: 'answer',
          blocks: Array(2).fill({
            text: 'Mira',
            question: 'Wer leitet?',
            evidence_ids: ['invented'],
          }),
        },
        [passage],
        'flashcards',
      ),
    ).toThrow();
    expect(
      validateGenerated({ outcome: 'insufficient', blocks: [] }, [passage], 'flashcards').outcome,
    ).toBe('insufficient');
  });
  it('stores interactive quiz metadata with real resolvable citations and idempotent usage', async () => {
    const key = randomUUID();
    let calls = 0;
    const provider: Provider = async (_q, passages) => {
      calls++;
      return {
        output: {
          outcome: 'answer',
          blocks: Array.from({ length: 3 }, (_, i) => ({
            question: 'Wer leitet? ' + i,
            options: ['Mira', 'Lina', 'Sara', 'Unbekannt'],
            correct: 0,
            text: 'Mira leitet das Projekt.',
            evidence_ids: [passages[0].id],
          })),
        },
        usage: 123,
      };
    };
    await generate(owner, book, [source], 'Quiz erstellen', 'quiz', key, provider);
    await generate(owner, book, [source], 'Quiz erstellen', 'quiz', key, provider);
    const quiz = (await getWorkspace(owner, book)).entries.find((e) => e.kind === 'quiz')!;
    expect(quiz.body?.format).toBe('quiz');
    expect(quiz.body?.blocks[0].options).toHaveLength(4);
    expect((await resolveCitation(owner, book, quiz.id, quiz.citations[0].evidence_id)).text).toBe(
      passage.text,
    );
    expect(calls).toBe(1);
    expect((await readUsage(owner)).today.measured).toBe(123);
    expect((await readUsage(other)).today.measured).toBe(0);
  });
  it('records real provider usage even when invalid output is rejected', async () => {
    const provider: Provider = async (_q, _p, options) => {
      await options!.onTelemetry!({
        inputTokens: 100,
        outputTokens: 25,
        totalTokens: 125,
        httpStatus: 200,
        limits: { 'remaining-tokens': 7000, 'limit-tokens': 8000 },
      });
      return {
        output: { outcome: 'answer', blocks: [{ text: 'Unbelegt', evidence_ids: ['bad'] }] },
        usage: 125,
      };
    };
    await expect(
      generate(owner, book, [source], 'Frage', 'answer', randomUUID(), provider),
    ).rejects.toMatchObject({ code: 'INVALID_CITATION' });
    const usage = await readUsage(owner);
    expect(usage.today.measured).toBe(248);
    expect(usage.today.failed).toBe(1);
    expect(usage.today.input).toBe(100);
    expect(usage.today.output).toBe(25);
    expect(usage.providerSnapshot).toBeNull();
    expect((await readUsage(owner, true)).providerSnapshot?.limits['remaining-tokens']).toBe(7000);
  });
  it('invalidates structured outputs on source deletion and keeps usage after notebook deletion', async () => {
    await deleteSource(owner, book, source);
    const quiz = (await getWorkspace(owner, book)).entries.find((e) => e.kind === 'quiz')!;
    expect(quiz.body).toBeNull();
    expect(quiz.citations).toEqual([]);
    await deleteNotebook(owner, book);
    expect((await readUsage(owner)).today.measured).toBe(248);
  });
  it('requires a separate owner code and prevents CSV formula execution', () => {
    process.env.USAGE_ADMIN_TOKEN = 'owner-only-'.repeat(5);
    expect(() => authorizeUsageOwner(null)).toThrow();
    expect(() => authorizeUsageOwner('wrong')).toThrow();
    expect(() => authorizeUsageOwner(process.env.USAGE_ADMIN_TOKEN!)).not.toThrow();
    expect(csvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
    expect(csvCell(' \t+cmd')).toContain("'");
    expect(csvCell('5000')).toBe('"5000"');
  });
});
