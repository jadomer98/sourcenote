import { spawn } from 'node:child_process';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { AppError } from './errors';
export async function extract(
  file: string,
  mime: string,
): Promise<{ text: string; page: number | null }[]> {
  if (mime === 'text/plain') {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(file));
    } catch {
      throw new AppError('ENCODING', 'Bitte verwende eine UTF-8-Textdatei.');
    }
    text = text.replace(/\r\n?/g, '\n').replace(/\0/g, '').trim();
    if (text.length < 20)
      throw new AppError(
        'EMPTY',
        'Die Quelle enthält zu wenig lesbaren Text (mindestens 20 Zeichen).',
      );
    if (text.length > 100000)
      throw new AppError('TEXT_LIMIT', 'Die Quelle überschreitet 100.000 Zeichen. Bitte kürzen.');
    return [{ text, page: null }];
  }
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--max-old-space-size=128', path.join(process.cwd(), 'scripts/pdf-extract.mjs'), file],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          TEMP: process.env.TEMP,
          TMP: process.env.TMP,
        },
      },
    );
    let stdout = '',
      stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 20000);
    child.stdout.on('data', (data) => {
      stdout += data;
      if (stdout.length > 800000) child.kill();
    });
    child.stderr.on('data', (data) => {
      stderr = (stderr + data).slice(-3000);
    });
    child.on('error', () => {
      clearTimeout(timer);
      reject(new AppError('EXTRACTION', 'Die PDF-Verarbeitung konnte nicht gestartet werden.'));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout).pages);
        } catch {
          reject(new AppError('EXTRACTION', 'Die PDF konnte nicht gelesen werden.'));
        }
        return;
      }
      let message =
        'Diese PDF konnte nicht verarbeitet werden. Bitte eine gültige Text-PDF verwenden.';
      if (timedOut)
        message = 'Die Verarbeitung hat zu lange gedauert. Bitte eine kleinere PDF verwenden.';
      else if (stderr.includes('EMPTY_OR_SCANNED'))
        message =
          'Keine lesbare Textebene gefunden. Gescannte PDFs benötigen OCR und werden noch nicht unterstützt.';
      else if (stderr.includes('ENCRYPTED'))
        message = 'Diese PDF ist passwortgeschützt. Bitte eine ungeschützte Kopie hochladen.';
      else if (stderr.includes('PAGE_LIMIT'))
        message = 'Bitte eine PDF mit höchstens 200 Seiten verwenden.';
      else if (stderr.includes('TEXT_LIMIT'))
        message = 'Die PDF enthält mehr als 100.000 Zeichen. Bitte kürzen.';
      reject(new AppError('EXTRACTION', message));
    });
  });
}
