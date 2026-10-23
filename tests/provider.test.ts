import { afterEach, describe, expect, it, vi } from 'vitest';
import { callProvider, validateGenerated } from '../src/lib/provider';
const passages = [
  {
    id: 'evidence-1',
    text: 'Das genehmigte Budget beträgt 5.000 Euro.',
    title: 'Projektplan',
    page: null,
  },
];
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GROQ_API_KEY;
  delete process.env.AI_PROVIDER;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_API_TOKEN;
});
describe('free-provider boundary', () => {
  it('sends a strict Groq schema without tools or previous messages', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const mock = vi.fn(async (_url: string, request: RequestInit) => {
      const body = JSON.parse(request.body as string);
      expect(body.model).toBe('openai/gpt-oss-120b');
      expect(body.response_format.json_schema.strict).toBe(true);
      expect(body.messages).toHaveLength(2);
      expect(body.tools).toBeUndefined();
      return Response.json({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: JSON.stringify({
                outcome: 'answer',
                blocks: [{ text: '5.000 Euro', evidence_ids: ['evidence-1'] }],
              }),
            },
          },
        ],
        usage: { total_tokens: 100 },
      });
    });
    vi.stubGlobal('fetch', mock);
    expect((await callProvider('Budget?', passages)).usage).toBe(100);
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('does not retry rate limits or switch to a paid provider', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const mock = vi.fn(async () => new Response('', { status: 429 }));
    vi.stubGlobal('fetch', mock);
    await expect(callProvider('Budget?', passages)).rejects.toMatchObject({
      code: 'PROVIDER_LIMIT',
      status: 429,
    });
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it('rejects truncated model output', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    vi.stubGlobal('fetch', async () =>
      Response.json({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }),
    );
    await expect(callProvider('Budget?', passages)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
  it('uses the Cloudflare schema convention when explicitly configured', async () => {
    process.env.AI_PROVIDER = 'cloudflare';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'a'.repeat(32);
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    vi.stubGlobal('fetch', async (_url: string, request: RequestInit) => {
      const body = JSON.parse(request.body as string);
      expect(body.response_format.json_schema.type).toBe('object');
      return Response.json({
        success: true,
        result: {
          response: {
            outcome: 'insufficient',
            blocks: [{ text: 'Nicht belegt.', evidence_ids: [] }],
          },
        },
      });
    });
    expect(
      validateGenerated((await callProvider('Budget?', passages)).output, passages).outcome,
    ).toBe('insufficient');
  });
  it('verifies explicit quotations against the actual cited source', () => {
    const wrap = (text: string) => ({
      outcome: 'answer',
      blocks: [{ text, evidence_ids: ['evidence-1'] }],
    });
    expect(
      validateGenerated(wrap('„Das genehmigte Budget beträgt 5.000 Euro.“'), passages).outcome,
    ).toBe('answer');
    expect(() =>
      validateGenerated(wrap('„Das genehmigte Budget beträgt 9.999 Euro.“'), passages),
    ).toThrow();
  });
});
