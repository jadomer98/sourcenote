import { timingSafeEqual, createHash } from 'node:crypto';
import { database } from './db';
import { config } from './config';
import { invariant } from './errors';
import type { UsageData } from './types';

export function authorizeUsageOwner(token: string | null) {
  const expected = process.env.USAGE_ADMIN_TOKEN;
  const digest = (v: string) => createHash('sha256').update(v).digest();
  invariant(
    expected &&
      expected.length >= 32 &&
      token &&
      token.length <= 256 &&
      timingSafeEqual(digest(token), digest(expected)),
    'OWNER_ACCESS',
    'Der Eigentümer-Zugangscode ist ungültig.',
    403,
  );
}
export async function readUsage(owner: string, project = false): Promise<UsageData> {
  const db = await database();
  const day = new Date().toISOString().slice(0, 10);
  const scope = project ? '' : 'WHERE owner_id=$1';
  const params = project ? [] : [owner];
  const [aggregate] = await db.query<{
    requests: number;
    measured: number;
    input: number;
    output: number;
    unknown: number;
    failed: number;
    lifetime: number;
    since: string | null;
  }>(
    `SELECT count(*) FILTER(WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS requests,
    coalesce(sum(total_tokens) FILTER(WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0)::int AS measured,
    coalesce(sum(input_tokens) FILTER(WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0)::int AS input,
    coalesce(sum(output_tokens) FILTER(WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),0)::int AS output,
    count(*) FILTER(WHERE total_tokens IS NULL AND created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS unknown,
    count(*) FILTER(WHERE state NOT IN ('succeeded','pending') AND created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS failed,
    coalesce(sum(total_tokens),0)::bigint::text AS lifetime, min(created_at) AS since FROM ai_usage ${scope}`,
    params,
  );
  const [quota] = await db.query<{ requests: number; tokens: string }>(
    'SELECT requests,tokens FROM quota_bucket WHERE key=$1',
    [project ? 'global:' + day : 'session:' + owner + ':' + day],
  );
  const recent = await db.query<UsageData['recent'][number]>(
    `SELECT kind,state,total_tokens,created_at FROM ai_usage ${scope} ORDER BY created_at DESC LIMIT 12`,
    params,
  );
  const [snapshot] = project
    ? await db.query<{ provider_limits: Record<string, number | string>; created_at: string }>(
        "SELECT provider_limits,created_at FROM ai_usage WHERE provider=$1 AND model=$2 AND provider_limits IS NOT NULL AND provider_limits<>'{}'::jsonb ORDER BY created_at DESC LIMIT 1",
        [config.provider, config.model],
      )
    : [];
  return {
    scope: project ? 'project' : 'workspace',
    provider: config.provider,
    model: config.model,
    connected: config.aiReady,
    testMode: process.env.AI_TEST_MODE === 'true',
    day,
    refreshAt: new Date().toISOString(),
    today: { ...aggregate, lifetime: Number(aggregate.lifetime) },
    attempts: quota?.requests || 0,
    requestLimit: project ? null : config.dailyRequests,
    budget: project ? { charged: Number(quota?.tokens || 0), limit: config.globalTokens } : null,
    providerSnapshot: snapshot
      ? { at: snapshot.created_at, limits: snapshot.provider_limits }
      : null,
    recent,
    limits: {
      notebooks: config.notebooks,
      sources: config.sources,
      fileMiB: config.fileBytes / 1024 / 1024,
      pdfPages: 50,
      textChars: config.textChars,
      evidenceTokens: config.evidenceTokens,
      outputTokens: config.outputTokens,
      dailyRequests: config.dailyRequests,
      storageMiB: config.globalStorage / 1024 / 1024,
      retentionDays: 7,
    },
  };
}
