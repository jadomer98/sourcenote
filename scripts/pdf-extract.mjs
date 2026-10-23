import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
try {
  const data = new Uint8Array(await readFile(process.argv[2]));
  const task = getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
    standardFontDataUrl:
      path
        .join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts')
        .replaceAll('\\', '/') + '/',
  });
  const pdf = await task.promise;
  if (pdf.numPages > 50) throw new Error('PAGE_LIMIT');
  const pages = [];
  let length = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
      .join('')
      .replace(/\r/g, '')
      .trim();
    length += text.length;
    if (length > 100000) throw new Error('TEXT_LIMIT');
    pages.push({ text, page: n });
    page.cleanup();
  }
  await task.destroy();
  if (length < 20) throw new Error('EMPTY_OR_SCANNED');
  process.stdout.write(JSON.stringify({ pages }));
} catch (error) {
  process.stderr.write(
    error?.name === 'PasswordException' ? 'ENCRYPTED' : String(error?.message || 'MALFORMED'),
  );
  process.exitCode = 1;
}
