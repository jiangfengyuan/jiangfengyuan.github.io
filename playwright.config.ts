import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4330',
    headless: true,
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4330',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome' },
    },
    { name: 'webkit', testMatch: /spatial\.spec\.ts$/, use: { browserName: 'webkit' } },
    {
      name: 'firefox',
      testMatch: /spatial\.spec\.ts$/,
      use: {
        browserName: 'firefox',
        launchOptions: { executablePath: process.env.PLAYWRIGHT_FIREFOX_EXECUTABLE },
      },
    },
  ],
  reporter: 'list',
});
