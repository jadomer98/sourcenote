import { z } from 'zod';
import type { Generated, GenerationKind, StudioKind } from './types';
import { sourceQuotesSchema, sourceQuotesParsed } from './source-quotes';

export const studioTools = [
  { kind: 'summary', title: 'Quellenüberblick', description: 'Das Wesentliche auf einen Blick' },
  { kind: 'flashcards', title: 'Lernkarten', description: 'Wissen aufdecken und behalten' },
  { kind: 'quiz', title: 'Wissenscheck', description: 'Drei Fragen. Dein Wissen im Test.' },
  { kind: 'mindmap', title: 'Mindmap', description: 'Zusammenhänge sichtbar machen' },
  { kind: 'report', title: 'Bericht', description: 'Ein Briefing mit klaren Belegen' },
  { kind: 'table', title: 'Datentabelle', description: 'Fakten ordnen und als CSV nutzen' },
] as const;
export const studioInstructions: Record<StudioKind, string> = {
  flashcards:
    'Erstelle vier Lernkarten. question ist die kurze Vorderseite, text die präzise Antwort. Jede Antwort braucht Belege. Keine doppelten Fragen.',
  quiz: 'Erstelle drei Multiple-Choice-Fragen. question enthält die Frage, options genau vier unterschiedliche kurze Antwortmöglichkeiten, correct den nullbasierten Index der einzigen richtigen Option. text erklärt die richtige Antwort anhand der Belege. Ablenkantworten sind ausdrücklich falsche Optionen, keine zusätzlichen Fakten. Verrate die Lösung nicht in der Frage.',
  mindmap:
    'Erstelle eine Mindmap mit fünf bis acht kurzen Knoten. text ist die Knotenbeschriftung, parent ist der nullbasierte Index des Elternknotens. Der erste Knoten ist die Wurzel mit parent=-1. Alle anderen verweisen auf einen früheren Knoten. Höchstens vier Hierarchieebenen. Jeder Knoten braucht passende Belege.',
  report:
    'Erstelle einen sachlichen Bericht mit vier kurzen Markdown-Abschnitten: Kurzfassung, belegte Erkenntnisse, Widersprüche oder offene Fragen, Fazit. Jeder Abschnitt ist ein block mit einer Überschrift und Belegen. Erfinde weder Maßnahmen noch fehlende Daten.',
  table:
    'Extrahiere eine nützliche Datentabelle mit zwei bis fünf Spalten und zwei bis sechs Zeilen. columns sind kurze Spaltenüberschriften, cells die Zellen je Zeile. text fasst dieselbe Zeile in einem Satz zusammen. Unbekannte Werte als Nicht angegeben kennzeichnen. Keine unbelegten Zahlen oder berechneten Schätzwerte. Jede Zeile braucht Belege.',
};
export function isStudioKind(kind: GenerationKind): kind is StudioKind {
  return kind !== 'answer' && kind !== 'summary';
}
export function schemaForStudio(kind: StudioKind) {
  const properties: Record<string, object> = {
    text: { type: 'string' },
    evidence_ids: { type: 'array', items: { type: 'string' } },
    source_quotes: sourceQuotesSchema,
  };
  if (kind === 'flashcards' || kind === 'quiz') properties.question = { type: 'string' };
  if (kind === 'quiz') {
    properties.options = { type: 'array', items: { type: 'string' } };
    properties.correct = { type: 'integer' };
  }
  if (kind === 'mindmap') properties.parent = { type: 'integer' };
  if (kind === 'table') properties.cells = { type: 'array', items: { type: 'string' } };
  const root: Record<string, object> = {
    outcome: { type: 'string', enum: ['answer', 'insufficient'] },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties,
        required: Object.keys(properties),
      },
    },
  };
  if (kind === 'table') root.columns = { type: 'array', items: { type: 'string' } };
  return {
    type: 'object',
    additionalProperties: false,
    properties: root,
    required: Object.keys(root),
  };
}
export function parseStudio(value: unknown, kind: StudioKind): Generated {
  const block: Record<string, z.ZodType> = {
    text: z
      .string()
      .min(1)
      .max(kind === 'mindmap' ? 220 : 2500),
    evidence_ids: z.array(z.string()).max(12),
    source_quotes: sourceQuotesParsed,
  };
  if (kind === 'flashcards' || kind === 'quiz') block.question = z.string().min(4).max(350);
  if (kind === 'quiz') {
    block.options = z
      .array(z.string().min(1).max(220))
      .length(4)
      .refine((v) => new Set(v.map((s) => s.trim().toLocaleLowerCase())).size === 4);
    block.correct = z.number().int().min(0).max(3);
  }
  if (kind === 'mindmap') block.parent = z.number().int().min(-1).max(9);
  if (kind === 'table') block.cells = z.array(z.string().max(350)).min(2).max(5);
  const shape: Record<string, z.ZodType> = {
    outcome: z.enum(['answer', 'insufficient']),
    blocks: z.array(z.object(block).strict()).max(kind === 'mindmap' ? 10 : 6),
  };
  if (kind === 'table') shape.columns = z.array(z.string().min(1).max(100)).max(5);
  const output = z.object(shape).strict().parse(value) as Generated;
  if (output.outcome === 'answer') {
    if (kind === 'table' && output.columns!.length < 2) throw new Error('Missing columns');
    const min = kind === 'quiz' ? 3 : kind === 'report' ? 3 : 2;
    if (output.blocks.length < min || (kind === 'quiz' && output.blocks.length !== 3))
      throw new Error('Incomplete learning content');
    if (kind === 'mindmap') {
      const depths: number[] = [];
      output.blocks.forEach((b, i) => {
        if (i === 0 ? b.parent !== -1 : b.parent! < 0 || b.parent! >= i)
          throw new Error('Invalid tree');
        depths[i] = i === 0 ? 0 : depths[b.parent!] + 1;
        if (depths[i] > 3) throw new Error('Tree too deep');
      });
    }
    if (kind === 'table' && output.blocks.some((b) => b.cells!.length !== output.columns!.length))
      throw new Error('Unequal table columns');
  }
  return { ...output, format: kind };
}

// CSV is safe to open in spreadsheet apps: source text cannot become a formula.
export function csvCell(value: string) {
  const safe = /^[\s\uFEFF]*[=+@\-\t\r\n]/u.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
