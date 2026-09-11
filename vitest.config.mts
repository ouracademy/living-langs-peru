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
  },
});
