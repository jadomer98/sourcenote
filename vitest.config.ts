import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve('src') } },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    fileParallelism: false,
    env: { DATABASE_URL: '', DATABASE_URL_UNPOOLED: '' },
  },
});
