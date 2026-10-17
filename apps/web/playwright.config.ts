import { defineConfig, devices } from '@playwright/test';

const port = 3000;

/**
 * Placeholder Supabase project for e2e tests. Nothing listens there: the tests only
 * cover signed-out flows, which never need Supabase to answer. CI builds with the
 * same values (.github/workflows/ci.yml), since NEXT_PUBLIC_* are inlined at build.
 */
export const e2eSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-placeholder-key',
  NEXT_PUBLIC_DEMO_LOGIN: '1',
};

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    // Lets environments with a preinstalled Chromium skip `playwright install`.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    port,
    reuseExistingServer: !process.env.CI,
    env: e2eSupabaseEnv,
  },
});
