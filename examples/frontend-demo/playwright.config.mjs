// Playwright configuration for the frontend demo. Runs locally against 127.0.0.1 only.
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT || '4173';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './test-results/results.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node server.mjs',
    url: `http://127.0.0.1:${PORT}/`,
    // Reuse a server already listening on PORT (for example the dev server the steering file keeps
    // running in the background). The Stop hook sets PW_REUSE_EXISTING_SERVER=1; plain CI runs start
    // their own server. Playwright only checks that the URL answers, so make sure the process on
    // PORT really is this demo.
    reuseExistingServer: process.env.PW_REUSE_EXISTING_SERVER === '1' || !process.env.CI,
    env: { PORT },
    timeout: 30_000,
  },
});
