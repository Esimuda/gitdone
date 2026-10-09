import { defineConfig, devices } from "@playwright/test";

const port = 3847;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL,
    // The CI image ships Playwright Chromium, not branded Chrome.
    channel: process.env.CI ? undefined : "chrome",
    ...devices["Desktop Chrome"],
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: `npx next start -p ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "smoke", testMatch: /smoke.spec.ts/ },
    { name: "capture", testMatch: /capture.spec.ts/ },
  ],
});
