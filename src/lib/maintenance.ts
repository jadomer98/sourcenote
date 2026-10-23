import { database } from './db';
import { invalidateSource } from './notebooks';
let last = 0;
export async function maintain() {
  if (Date.now() - last < 60_000) return;
  last = Date.now();
  const db = await database();
  await db.transaction(async (tx) => {
    await tx.query("INSERT INTO quota_bucket(key) VALUES('maintenance') ON CONFLICT DO NOTHING");
    await tx.query("SELECT key FROM quota_bucket WHERE key='maintenance' FOR UPDATE");
    await tx.query(
      "UPDATE source SET status='failed',error_code='INTERRUPTED',error_message='Die Verarbeitung wurde unterbrochen. Bitte erneut versuchen.',lease_until=NULL WHERE status IN ('pending','processing') AND lease_until<now()",
    );
    await tx.query(
      "UPDATE operation SET state='failed',error_code='INTERRUPTED',error_message='Die Anfrage wurde unterbrochen. Bitte erneut versuchen.' WHERE state='running' AND lease_until<now()",
    );
    const expired = await tx.query<{ id: string }>(
      'SELECT id FROM workspace_owner WHERE expires_at<now() LIMIT 10 FOR UPDATE',
    );
    for (const owner of expired) {
      const sources = await tx.query<{ id: string }>(
        'SELECT s.id FROM source s JOIN notebook n ON n.id=s.notebook_id WHERE n.owner_id=$1',
        [owner.id],
      );
      for (const source of sources) await invalidateSource(tx, source.id);
      await tx.query('DELETE FROM workspace_owner WHERE id=$1', [owner.id]);
    }
    await tx.query(
      "DELETE FROM quota_bucket WHERE updated_at<now()-interval '8 days' AND key NOT IN ('maintenance','storage','session-creation')",
    );
  });
}
