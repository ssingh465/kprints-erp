import { defineConfig, devices } from '@playwright/test';
import { loadTestEnv } from './helpers/load-env.js';

loadTestEnv();

const baseURL = process.env.E2E_BASE_URL?.trim() || 'http://localhost:4200';
const apiURL = process.env.E2E_API_BASE_URL?.trim() || 'http://localhost:8000/api';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'on-failure' }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'workflows',
      testMatch: /workflows\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run backend:dev',
      cwd: '..',
      url: `${apiURL.replace(/\/api$/, '')}/api/setup/status`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env },
    },
    {
      command: 'npm start',
      cwd: '../frontend',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { ...process.env },
    },
  ],
});
