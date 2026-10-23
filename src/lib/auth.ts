import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { database, type Sql } from './db';
import { invariant } from './errors';
export const COOKIE = 'sourcenote_session';
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function csrfFor(token: string) {
  return createHmac('sha256', process.env.SESSION_SECRET || 'local-development-only-secret')
    .update('csrf:' + token)
    .digest('hex');
}
export type Owner = { id: string; expires_at: string };
export async function session(request: NextRequest, create = false) {
  const db = await database();
  let token = request.cookies.get(COOKIE)?.value;
  let owner =
    token && /^[a-f0-9]{64}$/.test(token)
      ? (
          await db.query<Owner>(
            'SELECT id,expires_at FROM workspace_owner WHERE token_hash=$1 AND expires_at>now()',
            [hash(token)],
          )
        )[0]
      : undefined;
  let fresh = false;
  if (!owner && create) {
    token = randomBytes(32).toString('hex');
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO quota_bucket(key) VALUES('session-creation') ON CONFLICT DO NOTHING",
      );
      await tx.query("SELECT key FROM quota_bucket WHERE key='session-creation' FOR UPDATE");
      const [count] = await tx.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM workspace_owner WHERE created_at>now()-interval '1 hour'",
      );
      invariant(
        count.count < 200,
        'SESSION_LIMIT',
        'Der Demo-Zugang ist gerade ausgelastet. Bitte später erneut versuchen.',
        429,
      );
      await tx.query(
        "INSERT INTO workspace_owner(id,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')",
        [id, hash(token!)],
      );
    });
    owner = (
      await db.query<Owner>('SELECT id,expires_at FROM workspace_owner WHERE id=$1', [id])
    )[0];
    fresh = true;
  }
  invariant(
    owner && token,
    'SESSION_EXPIRED',
    'Dein Arbeitsbereich ist abgelaufen. Bitte lade die Seite neu.',
    401,
  );
  if (!['GET', 'HEAD'].includes(request.method)) {
    const expectedOrigin = process.env.APP_ORIGIN || new URL(request.url).origin;
    invariant(
      request.headers.get('origin') === expectedOrigin,
      'ORIGIN',
      'Diese Anfrage ist nicht erlaubt.',
      403,
    );
    const actual = request.headers.get('x-csrf-token') || '';
    const expected = csrfFor(token);
    invariant(
      /^[a-f0-9]{64}$/.test(actual) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)),
      'CSRF',
      'Sicherheitsprüfung fehlgeschlagen. Bitte Seite neu laden.',
      403,
    );
  }
  return { owner, token, fresh, csrf: csrfFor(token) };
}
export async function ownedNotebook(tx: Sql, ownerId: string, id: string, lock = false) {
  const [book] = await tx.query<{ id: string; title: string }>(
    `SELECT n.id,n.title FROM notebook n JOIN workspace_owner o ON o.id=n.owner_id WHERE n.id=$1 AND n.owner_id=$2 AND o.expires_at>now() ${lock ? 'FOR UPDATE OF n' : ''}`,
    [id, ownerId],
  );
  invariant(book, 'NOT_FOUND', 'Dieses Notebook wurde nicht gefunden.', 404);
  return book;
}
