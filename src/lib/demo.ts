import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createNotebook } from './notebooks';
import { addSource } from './sources';
export async function seedDemo(owner: string) {
  const id = await createNotebook(owner, 'Projekt Morgenlicht', 'sun', 'peach');
  for (const [file, title] of [
    ['demo-project.txt', 'Projektplan · Morgenlicht'],
    ['demo-meeting.txt', 'Besprechung · 20. Oktober'],
  ]) {
    await addSource(
      owner,
      id,
      title,
      await readFile(path.join(process.cwd(), 'fixtures', file)),
      'text/plain',
      randomUUID(),
    );
  }
  return id;
}
