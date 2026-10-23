import { getEncoding } from 'js-tiktoken';
const globals = globalThis as typeof globalThis & {
  sourceNoteEncoding?: ReturnType<typeof getEncoding>;
};
export function tokens(text: string) {
  return (globals.sourceNoteEncoding ??= getEncoding('o200k_base')).encode(text).length;
}
export function splitText(text: string, page: number | null) {
  const result: {
    text: string;
    tokens: number;
    page_no: number | null;
    char_start: number;
    char_end: number;
  }[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + 2200, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > start + 1000) end = space;
    }
    while (tokens(text.slice(start, end)) > 600 && end > start + 200)
      end = start + Math.floor((end - start) * 0.8);
    const value = text.slice(start, end);
    if (value.trim())
      result.push({
        text: value,
        tokens: tokens(value),
        page_no: page,
        char_start: start,
        char_end: end,
      });
    start = end;
  }
  return result;
}
