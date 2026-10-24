import nextEnv from '@next/env';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
async function main() {
  const { config } = await import('../src/lib/config');
  if (!config.aiReady || process.env.AI_TEST_MODE === 'true')
    throw new Error('A real free-provider credential is required. Test mode is not an evaluation.');
  const { callProvider, validateGenerated } = await import('../src/lib/provider');
  const cases = JSON.parse(await readFile('fixtures/evaluation.json', 'utf8'));
  const observed = [];
  for (const item of cases) {
    const passages = await Promise.all(
      item.sources.map(async (file: string) => ({
        id: randomUUID(),
        text: await readFile(path.join('fixtures', file), 'utf8'),
        title: file,
        page: null,
      })),
    );
    const started = Date.now();
    try {
      const response = await callProvider(item.question, passages);
      const output = validateGenerated(response.output, passages);
      observed.push({
        ...item,
        evidence: passages.map(({ id, title }) => ({ id, source: title })),
        output,
        elapsedMs: Date.now() - started,
        structuralValidation: 'passed',
        semanticReview: 'PENDING — inspect expected support manually',
      });
    } catch (error) {
      observed.push({ ...item, error: error instanceof Error ? error.message : 'Provider error' });
    }
    console.log(
      `${item.id}: ${observed.at(-1)?.error ? 'provider/validation error' : 'response recorded'}`,
    );
    // Free Groq quota is shared; use explicit pacing for this bounded evaluation.
    if (config.provider === 'groq' && item !== cases.at(-1))
      await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  await writeFile(
    'docs/evaluation-results.json',
    JSON.stringify(
      { date: new Date().toISOString(), provider: config.provider, model: config.model, observed },
      null,
      2,
    ),
  );
  console.log('Evaluation recorded. Inspect semantic support before marking it passed.');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
