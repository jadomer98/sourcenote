// Match the extraction script's text order while retaining original item offsets.
// Never guess geometry from an AI answer: highlights refer to verified source text.
export type PdfTextItem = { str: string; hasEOL?: boolean };
export function pageText(items: PdfTextItem[]) {
  let raw = '';
  const ranges = items.map((item) => {
    const start = raw.length;
    raw += item.str.replace(/\r/g, '');
    const end = raw.length;
    raw += item.hasEOL ? '\n' : ' ';
    return { start, end };
  });
  const leading = raw.length - raw.trimStart().length;
  return {
    text: raw.trim(),
    ranges: ranges.map(({ start, end }) => ({ start: start - leading, end: end - leading })),
  };
}

function normalized(text: string) {
  let value = '';
  const offsets: number[] = [];
  for (let i = 0; i < text.length;) {
    const point = String.fromCodePoint(text.codePointAt(i)!);
    for (const char of point.normalize('NFKC')) {
      if (/\s/u.test(char)) {
        if (value && !value.endsWith(' ')) {
          value += ' ';
          offsets.push(i);
        }
      } else {
        value += char;
        for (let j = 0; j < char.length; j++) offsets.push(i);
      }
    }
    i += point.length;
  }
  return { value: value.trimEnd(), offsets };
}

export function findTextRange(text: string, excerpt: string, expectedStart?: number) {
  if (!excerpt.trim()) return null;
  if (
    Number.isInteger(expectedStart) &&
    expectedStart! >= 0 &&
    text.slice(expectedStart, expectedStart! + excerpt.length) === excerpt
  )
    return { start: expectedStart!, end: expectedStart! + excerpt.length };
  const source = normalized(text);
  const needle = normalized(excerpt).value;
  if (!needle) return null;
  const index = source.value.indexOf(needle);
  // Ambiguous text without a confirmed offset must not highlight the wrong occurrence.
  if (index < 0 || source.value.indexOf(needle, index + 1) !== -1) return null;
  const last = source.offsets[index + needle.length - 1];
  return {
    start: source.offsets[index],
    end: last + String.fromCodePoint(text.codePointAt(last)!).length,
  };
}
