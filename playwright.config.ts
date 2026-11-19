import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";
const fakeGitHubPort = 3901;

// Saltapalabras reads its pack on the *server*, so page.route cannot fake it.
// A tiny fake Supabase (tests/e2e/fake-supabase.mjs) runs first and the Next
// server under test points SUPABASE_URL at it (tasks/saltapalabras plan §3.2).
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
      // Answers the GitHub reads of /admin/fotos so no test reaches the real
      // API. Read-only: saves are intercepted in the browser (page.route).
      command: `node tests/e2e/fake-github.mjs`,
      env: { FAKE_GITHUB_PORT: String(fakeGitHubPort) },
      url: `http://127.0.0.1:${fakeGitHubPort}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 10_000,
    },
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
      // the gallery is read from the fake GitHub and the game pack from the
      // fake Supabase above. None of them is a secret.
      env: {
        ADMIN_USER: "e2e-editor",
        ADMIN_PASSWORD: "e2e-not-a-secret",
        GITHUB_REPOSITORY: "ouracademy/living-langs-peru",
        GITHUB_BRANCH: "main",
        GITHUB_API_URL: `http://127.0.0.1:${fakeGitHubPort}`,
        // Set (empty) so a local .env.local never hands the test server a
        // real token: Next does not override variables that already exist.
        GITHUB_TOKEN: "",
        SUPABASE_URL: fakeSupabaseURL,
        SUPABASE_SERVICE_ROLE_KEY: "e2e-not-a-key",
      },
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
