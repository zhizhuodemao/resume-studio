import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5199',
    // Local runs use the installed Chrome; CI installs chromium instead.
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    headless: true,
    locale: 'zh-CN',
  },
  webServer: [
    {
      command: 'node --env-file-if-exists=.env server/index.js',
      url: 'http://localhost:8787/api/auth/me',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm run dev -- --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
})
