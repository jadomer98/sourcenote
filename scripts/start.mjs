import nextEnv from '@next/env';
import { cp, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Next's standalone server needs its static assets and the root environment when run locally.
process.env.NODE_ENV = 'production';
nextEnv.loadEnvConfig(process.cwd());
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
if (
  await access('public').then(
    () => true,
    () => false,
  )
)
  await cp('public', '.next/standalone/public', { recursive: true });
await import(pathToFileURL(path.resolve('.next/standalone/server.js')).href);
