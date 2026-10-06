import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4330',
    headless: true,
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4330',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
