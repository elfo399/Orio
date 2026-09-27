import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8080';
export default defineConfig({ testDir: './apps/web/e2e', timeout: 30_000, use: { baseURL, trace: 'on-first-retry' }, projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }] });
