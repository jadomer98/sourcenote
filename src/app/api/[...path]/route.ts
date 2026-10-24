import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { session, COOKIE, ownedNotebook } from '@/lib/auth';
import { config } from '@/lib/config';
import { database } from '@/lib/db';
import { AppError, invariant } from '@/lib/errors';
import {
  createNotebook,
  listNotebooks,
  getWorkspace,
  renameNotebook,
  deleteNotebook,
} from '@/lib/notebooks';
import { addSource, deleteSource, previewSource, retrySource } from '@/lib/sources';
import { generate, resolveCitation, saveNote } from '@/lib/generation';
import { seedDemo } from '@/lib/demo';
import { getOriginal } from '@/lib/storage';
import { maintain } from '@/lib/maintenance';
import { authorizeUsageOwner, readUsage } from '@/lib/usage';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const uuid = z.uuid();
const bookInput = z.object({
  title: z.string().trim().min(1).max(100),
  emoji: z.enum(['book', 'sun', 'leaf', 'lightbulb', 'flask']).optional(),
  color: z.enum(['blue', 'peach', 'green', 'purple']).optional(),
});
const generationInput = z.object({
  sourceIds: z.array(uuid).min(1).max(10),
  question: z.string().trim().min(2).max(1500),
  kind: z
    .enum(['answer', 'summary', 'quiz', 'flashcards', 'mindmap', 'report', 'table'])
    .default('answer'),
  key: uuid,
});
async function boundedBody(request: NextRequest) {
  const max = 4 * 1024 * 1024 + 65536;
  invariant(
    Number(request.headers.get('content-length') || 0) <= max,
    'BODY_SIZE',
    'Die Anfrage ist zu groß (maximal 4 MiB pro Datei).',
    413,
  );
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  if (reader)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) {
        await reader.cancel();
        throw new AppError('BODY_SIZE', 'Die Anfrage ist zu groß.', 413);
      }
      chunks.push(value);
    }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: Buffer.concat(chunks),
  });
}
async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const p = (await params).path;
    const method = request.method;
    if (p[0] === 'health' && method === 'GET') {
      await (await database()).query('SELECT 1');
      return NextResponse.json(
        { status: 'ok', version: '1.0.0' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const auth = await session(request, p[0] === 'bootstrap' && method === 'GET');
    const owner = auth.owner.id;
    if (method === 'GET' && p[0] === 'bootstrap') {
      await maintain();
      const [usage] = await (
        await database()
      ).query<{ requests: number }>('SELECT requests FROM quota_bucket WHERE key=$1', [
        'session:' + owner + ':' + new Date().toISOString().slice(0, 10),
      ]);
      const response = NextResponse.json(
        {
          csrf: auth.csrf,
          expiresAt: auth.owner.expires_at,
          aiReady: config.aiReady,
          model: config.model,
          provider: config.provider,
          notebooks: await listNotebooks(owner),
          usage: usage?.requests || 0,
          requestLimit: config.dailyRequests,
          testMode: process.env.AI_TEST_MODE === 'true',
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
      if (auth.fresh)
        response.cookies.set(COOKIE, auth.token, {
          httpOnly: true,
          secure: new URL(request.url).protocol === 'https:',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 3600,
        });
      return response;
    }
    let result: unknown;
    if (p[0] === 'usage' && p.length === 1 && method === 'GET') {
      result = await readUsage(owner);
    } else if (p[0] === 'usage' && p[1] === 'owner' && p.length === 2 && method === 'POST') {
      authorizeUsageOwner(request.headers.get('x-usage-token'));
      result = await readUsage(owner, true);
    } else if (p[0] === 'notebooks' && p.length === 1) {
      if (method === 'POST') {
        const data = bookInput.parse(await (await boundedBody(request)).json());
        result = { id: await createNotebook(owner, data.title, data.emoji, data.color) };
      } else if (method === 'GET') result = { notebooks: await listNotebooks(owner) };
    } else if (p[0] === 'demo' && method === 'POST') {
      result = { id: await seedDemo(owner) };
    } else if (p[0] === 'notebooks' && p[1]) {
      const notebook = uuid.parse(p[1]);
      if (p.length === 2) {
        if (method === 'GET') result = await getWorkspace(owner, notebook);
        else if (method === 'PATCH') {
          const data = bookInput
            .pick({ title: true })
            .parse(await (await boundedBody(request)).json());
          await renameNotebook(owner, notebook, data.title);
          result = { ok: true };
        } else if (method === 'DELETE') {
          await deleteNotebook(owner, notebook);
          result = { ok: true };
        }
      } else if (p[2] === 'sources') {
        if (p.length === 3 && method === 'POST') {
          const form = await (await boundedBody(request)).formData();
          const file = form.get('file');
          let data: Buffer;
          let mime: string;
          if (file instanceof File) {
            invariant(
              /\.(pdf|txt|md)$/i.test(file.name),
              'FILE_TYPE',
              'Bitte eine PDF-, TXT- oder Markdown-Datei hochladen.',
            );
            data = Buffer.from(await file.arrayBuffer());
            mime = /\.pdf$/i.test(file.name) ? 'application/pdf' : 'text/plain';
          } else {
            data = Buffer.from(z.string().min(20).max(100000).parse(form.get('text')), 'utf8');
            mime = 'text/plain';
          }
          const title = z
            .string()
            .trim()
            .min(1)
            .max(160)
            .parse(form.get('title') || (file instanceof File ? file.name : 'Textquelle'));
          const key = uuid.parse(form.get('key'));
          result = { id: await addSource(owner, notebook, title, data, mime, key) };
        } else if (p[3]) {
          const source = uuid.parse(p[3]);
          if (p[4] === 'retry' && method === 'POST') {
            await retrySource(owner, notebook, source);
            result = { ok: true };
          } else if (p[4] === 'download' && method === 'GET') {
            const { source: s } = await previewSource(owner, notebook, source);
            const data = await getOriginal(source);
            invariant(data, 'NOT_FOUND', 'Original nicht verfügbar.', 404);
            return new NextResponse(new Uint8Array(data), {
              headers: {
                'Content-Type': s.mime,
                'Content-Disposition': `attachment; filename="source.${s.mime === 'application/pdf' ? 'pdf' : 'txt'}"`,
                'Cache-Control': 'no-store',
              },
            });
          } else if (p.length === 4 && method === 'GET')
            result = await previewSource(owner, notebook, source);
          else if (p.length === 4 && method === 'DELETE') {
            await deleteSource(owner, notebook, source);
            result = { ok: true };
          }
        }
      } else if (p[2] === 'generate' && method === 'POST') {
        const input = generationInput.parse(await (await boundedBody(request)).json());
        result = await generate(
          owner,
          notebook,
          input.sourceIds,
          input.question,
          input.kind,
          input.key,
        );
      } else if (p[2] === 'citations' && p.length === 5 && method === 'GET')
        result = await resolveCitation(owner, notebook, uuid.parse(p[3]), uuid.parse(p[4]));
      else if (p[2] === 'notes' && method === 'POST') {
        const input = z.object({ entryId: uuid }).parse(await (await boundedBody(request)).json());
        result = { id: await saveNote(owner, notebook, input.entryId) };
      } else if (p[2] === 'entries' && p[3] && method === 'DELETE') {
        const db = await database();
        await ownedNotebook(db, owner, notebook);
        const rows = await db.query(
          "DELETE FROM entry WHERE id=$1 AND notebook_id=$2 AND kind IN ('note','summary','quiz','flashcards','mindmap','report','table') RETURNING id",
          [uuid.parse(p[3]), notebook],
        );
        invariant(rows.length, 'NOT_FOUND', 'Inhalt nicht gefunden.', 404);
        result = { ok: true };
      }
    }
    invariant(result !== undefined, 'NOT_FOUND', 'Diese Route wurde nicht gefunden.', 404);
    const status =
      typeof result === 'object' &&
      result !== null &&
      'state' in result &&
      result.state === 'running'
        ? 202
        : 200;
    return NextResponse.json(result, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Bitte Eingaben und Auswahl prüfen.', code: 'VALIDATION' },
        { status: 400 },
      );
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { error: 'Ein interner Fehler ist aufgetreten. Bitte erneut versuchen.', code: 'INTERNAL' },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
