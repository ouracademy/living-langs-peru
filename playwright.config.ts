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
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /bundle-publish\.spec\.ts/,
    },
    // Publishing a uro bundle changes what /diccionario/uro and both uro games
    // show, which other specs check while uro has no content. So it runs
    // after them all, never in parallel (gestor-lenguas plan, F2).
    {
      name: "chromium-publish",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /bundle-publish\.spec\.ts/,
      dependencies: ["chromium"],
    },
  ],
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
      // The data cache survives `next build` locally: a bundle published by a
      // previous run (bundle-publish.spec.ts) would come back without the fake
      // Supabase. Cleared first, so every run starts from an empty Supabase.
      command:
        "node -e \"require('fs').rmSync('.next/cache/fetch-cache',{recursive:true,force:true})\" && pnpm build && pnpm start",
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
