import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Native replacement for vite-tsconfig-paths: resolves the "@/*" alias
    // straight from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // Scoped to unit tests so Vitest never picks up the Playwright specs
    // under tests/e2e, which use a different runner and API.
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // lcov is what scripts/check-changed-coverage.ts reads; text-summary is
      // for the human running it.
      reporter: ["text-summary", "lcov"],
      // Every source file, not just the ones a test imported: a file no test
      // touches must show up as 0%, otherwise the number flatters us.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
    },
  },
});
