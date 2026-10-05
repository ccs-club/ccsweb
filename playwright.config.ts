import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

process.env.CCS_TEST_DIRECTORY ??= path.join(os.tmpdir(), `ccs-browser-tests-${process.pid}`);

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1366, height: 900 } } },
    { name: "tablet", use: { browserName: "chromium", viewport: { width: 768, height: 1024 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "node scripts/start-test-server.mjs",
    url: "http://127.0.0.1:3100/api/admin/session",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
