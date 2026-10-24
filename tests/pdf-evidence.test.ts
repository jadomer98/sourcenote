import { describe, expect, it } from 'vitest';
import { findTextRange, pageText } from '../src/lib/pdf-text';
import { validateGenerated } from '../src/lib/provider';
import { providerRetryAfter } from '../src/lib/rate-limit';
import { PDFDocument } from 'pdf-lib';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extract } from '../src/lib/extraction';

describe('PDF source highlights', () => {
  it('accepts PDFs above the old page cap and enforces the new bounded cap', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'sourcenote-pdf-limits-'));
    const file = path.join(directory, 'generated.pdf');
    try {
      const pdf = await PDFDocument.create();
      for (let i = 0; i < 51; i++)
        pdf.addPage().drawText('A readable document page with bounded text.');
      await writeFile(file, await pdf.save());
      expect(await extract(file, 'application/pdf')).toHaveLength(51);
      for (let i = 51; i < 201; i++) pdf.addPage();
      await writeFile(file, await pdf.save());
      await expect(extract(file, 'application/pdf')).rejects.toThrow('200 Seiten');
    } finally {
      await unlink(file).catch(() => {});
      await rmdir(directory);
    }
  });
  it('keeps extraction offsets across whitespace, line endings and text runs', () => {
    const mapped = pageText([
      { str: '  Heading', hasEOL: true },
      { str: 'Budget:\r' },
      { str: '5.000 Euro.', hasEOL: true },
    ]);
    expect(mapped.text).toBe('Heading\nBudget: 5.000 Euro.');
    const range = findTextRange(mapped.text, 'Budget: 5.000 Euro.');
    expect(range).toEqual({ start: 8, end: 27 });
    expect(mapped.ranges[1]).toEqual({ start: 8, end: 15 });
  });
  it('matches Unicode ligatures and wrapped lines, retaining real source offsets', () => {
    const text = 'Titel: Ofﬁcial\n  records 🏆 are listed.';
    const range = findTextRange(text, 'Official records 🏆');
    expect(text.slice(range!.start, range!.end)).toBe('Ofﬁcial\n  records 🏆');
  });
  it('uses verified offsets for repeated text and otherwise refuses ambiguous matches', () => {
    expect(findTextRange('Budget 5000. Budget 5000.', 'Budget 5000.')).toBeNull();
    expect(findTextRange('Budget 5000. Budget 5000.', 'Budget 5000.', 13)).toEqual({
      start: 13,
      end: 25,
    });
    expect(findTextRange('Budget 5000.', 'Budget 9000.')).toBeNull();
  });
  it('accepts exact source quotations and discards invented or misattributed highlight anchors', () => {
    const passages = [
      {
        id: 'a',
        text: 'Das Budget beträgt 5.000 Euro. Mira leitet das Projekt.',
        title: 'Plan',
        page: 1,
      },
    ];
    const output = (quote: string, id = 'a') => ({
      outcome: 'answer',
      blocks: [
        {
          text: 'Das Budget beträgt 5.000 Euro.',
          evidence_ids: ['a'],
          source_quotes: [{ evidence_id: id, text: quote }],
        },
      ],
    });
    expect(
      validateGenerated(output('Das Budget beträgt 5.000 Euro.'), passages).blocks[0].source_quotes,
    ).toHaveLength(1);
    expect(
      validateGenerated(output('Das Budget beträgt 9.999 Euro.'), passages).blocks[0].source_quotes,
    ).toEqual([]);
    expect(
      validateGenerated(output('Das Budget beträgt 5.000 Euro.', 'foreign'), passages).blocks[0]
        .source_quotes,
    ).toEqual([]);
    expect(
      validateGenerated(
        { outcome: 'answer', blocks: [{ text: 'Budget', evidence_ids: ['a'], source_quotes: [] }] },
        passages,
      ).blocks[0].source_quotes,
    ).toEqual([]);
    expect(
      validateGenerated(
        { outcome: 'answer', blocks: [{ text: 'Legacy answer', evidence_ids: ['a'] }] },
        passages,
      ).outcome,
    ).toBe('answer');
    const cards = validateGenerated(
      {
        outcome: 'answer',
        blocks: [0, 1].map((i) => ({
          ...output('Das Budget beträgt 9.999 Euro.').blocks[0],
          question: 'Budgetfrage ' + i,
        })),
      },
      passages,
      'flashcards',
    );
    expect(cards.blocks.every((block) => block.source_quotes?.length === 0)).toBe(true);
  });
});

describe('actual provider wait time', () => {
  it('prefers retry-after over illustrative provider reset windows', () => {
    expect(
      providerRetryAfter(
        new Headers({ 'retry-after': '2.2', 'x-ratelimit-reset-tokens': '1m30s' }),
      ),
    ).toBe(3);
  });
  it('distinguishes exhausted daily requests from token windows', () => {
    expect(providerRetryAfter(new Headers({ 'x-ratelimit-reset-tokens': '7.66s' }))).toBe(8);
    expect(
      providerRetryAfter(
        new Headers({
          'x-ratelimit-remaining-requests': '0',
          'x-ratelimit-reset-requests': '2h3m4.5s',
          'x-ratelimit-reset-tokens': '1s',
        }),
      ),
    ).toBe(7385);
    expect(providerRetryAfter(new Headers({ 'retry-after': 'nonsense' }))).toBe(60);
    expect(providerRetryAfter(new Headers({ 'retry-after': '0' }))).toBe(1);
  });
});
