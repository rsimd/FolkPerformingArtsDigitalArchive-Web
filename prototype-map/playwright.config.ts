import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4176/",
    viewport: { width: 1600, height: 1000 },
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4176 --strictPort",
    url: "http://127.0.0.1:4176/",
    reuseExistingServer: !process.env.CI,
  },
});
