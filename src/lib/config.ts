import path from 'node:path';
function positive(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid configuration: ${name}`);
  return value;
}
export const config = {
  get dataDir() {
    return path.resolve(process.env.DATA_DIR || '.data');
  },
  get provider() {
    return process.env.AI_PROVIDER || 'groq';
  },
  get model() {
    return (
      process.env.AI_MODEL ||
      (this.provider === 'cloudflare' ? '@cf/qwen/qwen3-30b-a3b-fp8' : 'openai/gpt-oss-120b')
    );
  },
  get aiReady() {
    return (
      (this.provider === 'cloudflare'
        ? !!process.env.CLOUDFLARE_API_TOKEN && !!process.env.CLOUDFLARE_ACCOUNT_ID
        : !!process.env.GROQ_API_KEY) ||
      (process.env.AI_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production')
    );
  },
  get globalTokens() {
    return positive('GLOBAL_DAILY_TOKEN_LIMIT', 1_000_000);
  },
  get globalStorage() {
    return positive('GLOBAL_STORAGE_BYTES', 100 * 1024 * 1024);
  },
  get dailyRequests() {
    return positive('SESSION_DAILY_REQUESTS', 200);
  },
  fileBytes: 4 * 1024 * 1024,
  textChars: 100_000,
  totalChars: 500_000,
  pdfPages: 200,
  sources: 20,
  notebooks: 10,
  evidenceTokens: 4_000,
  outputTokens: 2000,
  leaseSeconds: 90,
};
export function checkProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.AI_TEST_MODE === 'true')
    throw new Error('AI_TEST_MODE is forbidden in production');
  if (!process.env.DATABASE_URL && process.env.ALLOW_LOCAL_DATABASE !== 'true')
    throw new Error(
      'Production requires DATABASE_URL (or explicit single-instance ALLOW_LOCAL_DATABASE=true)',
    );
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32 ||
    process.env.SESSION_SECRET.startsWith('change-')
  )
    throw new Error('Production requires a random SESSION_SECRET');
  if (
    !process.env.APP_ORIGIN ||
    !process.env.GLOBAL_DAILY_TOKEN_LIMIT ||
    !process.env.GLOBAL_STORAGE_BYTES
  )
    throw new Error('Production requires explicit origin and global quotas');
}
