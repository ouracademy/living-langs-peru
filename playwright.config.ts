import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";

// Saltapalabras and the photo gallery read Supabase on the *server*, so
// page.route cannot fake them. A tiny fake Supabase (tests/e2e/fake-supabase.mjs)
// runs first and the Next server under test points SUPABASE_URL at it
// (tasks/saltapalabras plan §3.2, tasks/edicion-fotos plan §8).
// The key is a fixed placeholder with no value anywhere.
const fakeSupabasePort = 54329;
const fakeSupabaseURL = `http://127.0.0.1:${fakeSupabasePort}`;

export default defineConfig({
  // Scoped so Playwright never collects the Vitest specs under tests/unit,
  // which use a different runner and fail outright if picked up here.
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/fake-supabase.mjs",
      url: `${fakeSupabaseURL}/`,
      env: { FAKE_SUPABASE_PORT: String(fakeSupabasePort) },
      reuseExistingServer: !process.env.CI,
      timeout: 10_000,
    },
    {
      // Runs against the production build rather than `next dev`. The
      // dictionary route is prerendered and reads ?palabra client-side via
      // useSearchParams; dev does not reproduce that split identically.
      command: "pnpm build && pnpm start",
      // Test-only values: /admin answers 401 (not 503) without credentials,
      // and the gallery and the game pack are read from the fake Supabase
      // above. None of them is a secret; set here, they win over a local
      // .env.local (Next does not override variables that already exist).
      env: {
        ADMIN_USER: "e2e-editor",
        ADMIN_PASSWORD: "e2e-not-a-secret",
        SUPABASE_URL: fakeSupabaseURL,
        SUPABASE_SERVICE_ROLE_KEY: "e2e-not-a-key",
      },
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
