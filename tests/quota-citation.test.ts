import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { database, resetDatabaseForTests } from '../src/lib/db';
import { createNotebook, getWorkspace } from '../src/lib/notebooks';
import { addSource } from '../src/lib/sources';
import { generate, resolveCitation, saveNote } from '../src/lib/generation';

beforeAll(() => {
  vi.stubEnv('TEST_DATABASE', 'memory');
  vi.stubEnv('SESSION_SECRET', 'isolated-quote-test-secret-long-enough');
  vi.stubEnv('GROQ_API_KEY', 'test-not-a-real-key');
  vi.stubEnv('AI_PROVIDER', 'groq');
  vi.stubEnv('AI_TEST_MODE', 'false');
});
afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await resetDatabaseForTests();
});

it('allows sequential provider-approved requests and resolves exact persisted quotes in answers and notes', async () => {
  const db = await database();
  const owner = randomUUID();
  await db.query("INSERT INTO workspace_owner VALUES($1,$2,now(),now()+interval '7 days')", [
    owner,
    randomUUID(),
  ]);
  const book = await createNotebook(owner, 'Quota and evidence');
  const text =
    'Einleitung. Das Budget beträgt 5.000 Euro. ' +
    'Ein Projekt mit klaren Zielen und dokumentierten Ergebnissen. '.repeat(65);
  const source = await addSource(
    owner,
    book,
    'Projektplan',
    Buffer.from(text),
    'text/plain',
    randomUUID(),
  );
  const mock = vi.fn(async (_url: string, request: RequestInit) => {
    const body = JSON.parse(String(request.body));
    const evidence = JSON.parse(body.messages[1].content).evidence[0].evidence_id;
    return Response.json({
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content: JSON.stringify({
              outcome: 'answer',
              blocks: [
                {
                  text: 'Das Budget beträgt 5.000 Euro.',
                  evidence_ids: [evidence],
                  source_quotes: [
                    { evidence_id: evidence, text: 'Das Budget beträgt 5.000 Euro.' },
                  ],
                },
              ],
            }),
          },
        },
      ],
      usage: { total_tokens: 100 },
    });
  });
  vi.stubGlobal('fetch', mock);
  for (let i = 0; i < 4; i++)
    await generate(owner, book, [source], 'Wie hoch ist das Budget?', 'answer', randomUUID());
  expect(mock).toHaveBeenCalledTimes(4);
  const answer = (await getWorkspace(owner, book)).entries.find((e) => e.kind === 'answer')!;
  const resolved = await resolveCitation(owner, book, answer.id, answer.citations[0].evidence_id);
  expect(resolved.precise).toBe(true);
  expect(resolved.highlight_text).toBe('Das Budget beträgt 5.000 Euro.');
  expect(text.slice(resolved.highlight_start, resolved.highlight_end)).toBe(
    resolved.highlight_text,
  );
  expect(resolved).not.toHaveProperty('body');
  const note = await saveNote(owner, book, answer.id);
  expect(
    (await resolveCitation(owner, book, note, answer.citations[0].evidence_id)).highlight_text,
  ).toBe(resolved.highlight_text);
  const [quota] = await db.query<{ tokens: string }>(
    'SELECT tokens FROM quota_bucket WHERE key=$1',
    ['global:' + new Date().toISOString().slice(0, 10)],
  );
  expect(Number(quota.tokens)).toBe(400);
  vi.stubGlobal('fetch', async (_url: string, request: RequestInit) => {
    const evidence = JSON.parse(JSON.parse(String(request.body)).messages[1].content).evidence[0]
      .evidence_id;
    return Response.json({
      choices: [
        {
          finish_reason: 'stop',
          message: {
            content: JSON.stringify({
              outcome: 'answer',
              blocks: [
                {
                  text: 'Das Budget beträgt 5.000 Euro.',
                  evidence_ids: [evidence],
                  source_quotes: [
                    { evidence_id: evidence, text: 'Das Budget beträgt 9.999 Euro.' },
                  ],
                },
              ],
            }),
          },
        },
      ],
      usage: { total_tokens: 100 },
    });
  });
  const fallback = await generate(owner, book, [source], 'Budget erneut?', 'answer', randomUUID());
  const entry = (await getWorkspace(owner, book)).entries.find(
    (e) => e.operation_id === fallback.id && e.kind === 'answer',
  )!;
  expect(entry.body!.blocks[0].source_quotes).toEqual([]);
  const fallbackCitation = await resolveCitation(
    owner,
    book,
    entry.id,
    entry.citations[0].evidence_id,
  );
  expect(fallbackCitation.precise).toBe(false);
  expect(fallbackCitation.highlight_text).toBe(fallbackCitation.text);
});
