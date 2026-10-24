import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = (process.env.SMOKE_URL || 'http://localhost:3000').replace(/\/$/, '');
const withAi = process.argv.includes('--ai');
const withPdf = process.argv.includes('--pdf');
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
  assert.equal(boot.testMode, false, 'A real-provider smoke test must not use deterministic AI');
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
    let source = await request(`notebooks/${id}/sources`, { method: 'POST', body });
    const ws = await request('notebooks/' + id);
    assert.equal(ws.sources[0].status, 'ready');
    assert.match((await request(`notebooks/${id}/sources/${source.id}`)).chunks[0].text, /5\.000/);
    if (withPdf) {
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.create();
      pdf.addPage().drawText('Genehmigtes Budget fuer Projekt Morgenlicht: 5.000 Euro.', {
        x: 40,
        y: 700,
        size: 12,
      });
      const bytes = await pdf.save();
      const form = new FormData();
      form.set('file', new File([bytes], 'smoke.pdf', { type: 'application/pdf' }));
      form.set('key', randomUUID());
      source = await request(`notebooks/${id}/sources`, { method: 'POST', body: form });
      const preview = await request(`notebooks/${id}/sources/${source.id}`);
      assert.equal(preview.chunks[0].page_no, 1);
      assert.match(preview.chunks[0].text, /5\.000/);
      const original = await fetch(base + `/api/notebooks/${id}/sources/${source.id}/download`, {
        headers,
      });
      assert.equal(original.status, 200);
      assert.deepEqual(new Uint8Array(await original.arrayBuffer()), bytes);
      console.log('PASS: binary PDF upload, page extraction and byte-exact original download.');
    }
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
      console.log('Live answer:', answer.body.blocks.map((b) => b.text).join(' '));
      const excerpt = await request(
        `notebooks/${id}/citations/${answer.id}/${answer.citations[0].evidence_id}`,
      );
      assert.match(excerpt.text, /5\.000/);
      const note = await request(`notebooks/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ entryId: answer.id }),
      });
      const reloaded = await request('notebooks/' + id);
      assert.deepEqual(reloaded.entries.find((e) => e.id === note.id)?.body, answer.body);
      await request(`notebooks/${id}/sources/${source.id}`, { method: 'DELETE' });
      const redacted = await request('notebooks/' + id);
      assert.equal(redacted.entries.find((e) => e.id === answer.id)?.body, null);
      assert.equal(redacted.entries.find((e) => e.id === note.id)?.body, null);
      assert.equal(
        (
          await fetch(
            base + `/api/notebooks/${id}/citations/${answer.id}/${answer.citations[0].evidence_id}`,
            { headers },
          )
        ).status,
        404,
      );
      console.log(
        'PASS: real-provider answer, stored citation, persisted note and deletion redaction.',
      );
    } else
      console.log(
        'AI check skipped: run with --ai only after a real free-provider key is configured.',
      );
    console.log(
      'PASS: HTTP health, isolated session, notebook, source, preview and cross-owner rejection.',
    );
  } finally {
    await request('notebooks/' + id, { method: 'DELETE' });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
