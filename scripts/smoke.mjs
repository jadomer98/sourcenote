import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = (process.env.SMOKE_URL || 'http://localhost:3000').replace(/\/$/, '');
const withAi = process.argv.includes('--ai');
async function main() {
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  const response = await fetch(base + '/api/bootstrap');
  assert.equal(response.status, 200);
  const boot = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  assert.ok(cookie, 'Use a fresh smoke session');
  assert.equal(boot.testMode, false, 'A production smoke test must not use deterministic AI');
  const headers = { Cookie: cookie, Origin: base, 'x-csrf-token': boot.csrf };
  async function request(path, options = {}) {
    const res = await fetch(base + '/api/' + path, {
      ...options,
      headers: {
        ...headers,
        ...(options.body instanceof FormData
          ? {}
          : options.body
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...options.headers,
      },
    });
    const data = await res.json();
    assert.ok(res.ok, `${path}: ${res.status} ${data.code || ''}`);
    return data;
  }
  const { id } = await request('notebooks', {
    method: 'POST',
    body: JSON.stringify({ title: 'Smoke ' + randomUUID().slice(0, 6) }),
  });
  try {
    const body = new FormData();
    body.set('title', 'Smoke source');
    body.set(
      'text',
      'Das Projekt Morgenlicht hat ein genehmigtes Budget von 5.000 Euro. Die Projektleitung übernimmt Mira Keller.',
    );
    body.set('key', randomUUID());
    const source = await request(`notebooks/${id}/sources`, { method: 'POST', body });
    const ws = await request('notebooks/' + id);
    assert.equal(ws.sources[0].status, 'ready');
    assert.match((await request(`notebooks/${id}/sources/${source.id}`)).chunks[0].text, /5\.000/);
    const otherResponse = await fetch(base + '/api/bootstrap');
    const otherCookie = otherResponse.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
    assert.equal(
      (await fetch(base + '/api/notebooks/' + id, { headers: { Cookie: otherCookie } })).status,
      404,
    );
    if (withAi) {
      assert.equal(boot.aiReady, true, 'A real provider key is required');
      await request(`notebooks/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          sourceIds: [source.id],
          question: 'Wie hoch ist das genehmigte Budget?',
          kind: 'answer',
          key: randomUUID(),
        }),
      });
      const answered = await request('notebooks/' + id);
      const answer = answered.entries.find((e) => e.kind === 'answer');
      assert.ok(answer?.citations.length, 'Answer must cite the smoke source');
      const excerpt = await request(
        `notebooks/${id}/citations/${answer.id}/${answer.citations[0].evidence_id}`,
      );
      assert.match(excerpt.text, /5\.000/);
      console.log(
        'PASS: real-provider answer and stored citation. Inspect semantic wording separately.',
      );
    } else
      console.log(
        'AI check skipped: run with --ai only after a real free-provider key is configured.',
      );
    console.log(
      'PASS: production HTTP health, isolated session, notebook, source, preview and cross-owner rejection.',
    );
  } finally {
    await request('notebooks/' + id, { method: 'DELETE' });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
