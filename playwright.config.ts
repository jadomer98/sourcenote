import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    channel: process.env.CI || process.env.PLAYWRIGHT_CHROMIUM === 'true' ? undefined : 'chrome',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      AI_TEST_MODE: 'true',
      DATA_DIR: '.data/e2e',
      APP_ORIGIN: 'http://localhost:3100',
      GLOBAL_DAILY_TOKEN_LIMIT: '1000000',
    },
  },
});
