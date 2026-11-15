import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: process.env.ADMIN_E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.ADMIN_E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev -- --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: true },
});
